/* EduLab Nova - Unified Data Service (Supabase + Local State Cache) */
import { supabase } from '../supabaseClient';
import { PRACTICALS_CATALOG, SAMPLE_SUBMISSIONS, BATCH_METRICS } from './mockData';

const SUBMISSIONS_KEY = 'edulab_submissions_store';

function getLocalSubmissions() {
  const cached = localStorage.getItem(SUBMISSIONS_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // ignore
    }
  }
  return [...SAMPLE_SUBMISSIONS];
}

function setLocalSubmissions(submissions) {
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
}

export async function getPracticals() {
  try {
    const { data, error } = await supabase.from('practicals').select('*');
    if (error || !data || !data.length) throw error;
    return data;
  } catch {
    return PRACTICALS_CATALOG;
  }
}

export async function getSubmissions() {
  try {
    const { data, error } = await supabase.from('submissions').select('*');
    if (error || !data || !data.length) throw error;
    return data;
  } catch {
    return getLocalSubmissions();
  }
}

export async function submitStudentPractical(subData) {
  const newSub = {
    id: `sub_${Date.now().toString(36)}`,
    prn: subData.prn || 'PRN2026CS014',
    studentId: subData.studentId || 'std_2026_014',
    studentName: subData.studentName || 'Aarav Sharma',
    rollNumber: '22CS014',

    practicalId: subData.practicalId,
    practicalTitle: subData.practicalTitle,
    language: subData.language,
    languageName: subData.language === 'cpp' ? 'C++20' : subData.language === 'c' ? 'C' : subData.language === 'python' ? 'Python 3.12' : 'Java 21',
    codingMarks: subData.codingMarks || 5.0,
    writeupMarks: 0,
    vivaMarks: 0,
    totalMarks: subData.codingMarks || 5.0,
    passRate: subData.passRate || 100,
    passedCount: subData.passedCount || 3,
    totalCount: subData.totalCount || 3,
    adaptiveTier: subData.adaptiveTier || 'Advanced',
    timeSpentMin: Math.round((subData.timeSpentSeconds || 400) / 60),
    focusBlurEvents: subData.focusBlurEvents || 0,
    status: 'Pending Review',
    submittedAt: 'Just now',
    feedback: '',
    sourceCode: subData.sourceCode,
  };

  const list = getLocalSubmissions();
  const updated = [newSub, ...list];
  setLocalSubmissions(updated);

  try {
    await supabase.from('submissions').insert({
      student_id: newSub.studentId,
      practical_id: newSub.practicalId,
      language_id: subData.languageId || 54,
      source_code: subData.sourceCode,
      total_test_cases: newSub.totalCount,
      passed_test_cases: newSub.passedCount,
      pass_percentage: newSub.passRate,
      coding_marks: newSub.codingMarks,
      adaptive_tier: newSub.adaptiveTier,
      status: 'submitted',
    });
  } catch {
    // Supabase fallback handled
  }

  return newSub;
}

export async function gradeSubmission(submissionId, { writeupMarks, vivaMarks, feedback, gradedBy }) {
  const list = getLocalSubmissions();
  const idx = list.findIndex((s) => s.id === submissionId);
  if (idx !== -1) {
    const sub = list[idx];
    const total = parseFloat(sub.codingMarks) + parseFloat(writeupMarks) + parseFloat(vivaMarks);
    list[idx] = {
      ...sub,
      writeupMarks: parseFloat(writeupMarks),
      vivaMarks: parseFloat(vivaMarks),
      totalMarks: Math.min(10.0, Math.round(total * 10) / 10),
      feedback: feedback || '',
      status: 'Graded',
      gradedBy: gradedBy || 'Prof. Radhika Sen',
    };
    setLocalSubmissions(list);
  }

  try {
    await supabase.from('faculty_evaluations').upsert({
      submission_id: submissionId,
      writeup_marks: writeupMarks,
      viva_marks: vivaMarks,
      faculty_feedback: feedback,
    });
  } catch {
    // Supabase fallback handled
  }

  return list;
}

export async function getBatchMetrics() {
  return BATCH_METRICS;
}
