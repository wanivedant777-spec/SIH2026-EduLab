/* EduLab Nova - Unified Data Service (Supabase Real Source of Truth + Cache) */
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

/**
 * Fetch all practicals from Supabase canonical catalog.
 * Falls back to local catalog if table is empty or unauthenticated.
 */
export async function getPracticals() {
  try {
    const { data, error } = await supabase
      .from('practicals')
      .select('*')
      .order('practical_number', { ascending: true });

    if (!error && data && data.length > 0) {
      return data.map((p) => ({
        id: p.id,
        title: `Practical 0${p.practical_number}: ${p.title}`,
        courseCode: 'CS201P: Data Structures',
        subjectId: p.subject_id,
        aim: p.aim,
        maxCodingMarks: parseFloat(p.max_coding_marks || 3.0),
        maxWriteupMarks: parseFloat(p.max_writeup_marks || 5.0),
        maxVivaMarks: parseFloat(p.max_viva_marks || 2.0),
        starterCodes: p.starter_codes || PRACTICALS_CATALOG[0]?.starterCodes || {},
        theoryContent: p.theory_content || PRACTICALS_CATALOG[0]?.theoryContent || {},
        testCases: [],
      }));
    }
  } catch (err) {
    console.warn('Supabase practicals fetch note:', err.message);
  }
  return PRACTICALS_CATALOG;
}

/**
 * Fetch all submissions from Supabase as real source of truth.
 * Returns joined data with student profiles and 10-mark evaluations.
 */
export async function getSubmissions() {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        id,
        student_id,
        practical_id,
        language_id,
        source_code,
        total_test_cases,
        passed_test_cases,
        time_spent_seconds,
        attempt_count,
        status,
        created_at,
        profiles:student_id (identifier, full_name, role, batches(name)),
        practicals:practical_id (title, practical_number),
        evaluations (marks_performing, marks_writing, marks_viva, marks_total, faculty_feedback, graded_by, graded_at)
      `)
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((s) => {
        const ev = s.evaluations?.[0] || {};
        const profile = s.profiles || {};
        const practical = s.practicals || {};
        const coding = parseFloat(ev.marks_performing || (s.total_test_cases ? ((s.passed_test_cases / s.total_test_cases) * 3.0).toFixed(1) : 3.0));
        const writing = parseFloat(ev.marks_writing || 0.0);
        const viva = parseFloat(ev.marks_viva || 0.0);
        const total = ev.marks_total ? parseFloat(ev.marks_total) : coding;

        return {
          id: s.id, // Real database-generated UUID
          prn: profile.identifier || 'PRN2026CS000',
          studentId: s.student_id,
          studentName: profile.full_name || 'Student',
          rollNumber: profile.identifier ? profile.identifier.replace(/^[A-Z]+/, '22CS') : '22CS000',
          practicalId: s.practical_id,
          practicalTitle: practical.title ? `Practical 0${practical.practical_number || 1}: ${practical.title}` : 'Practical Lab',
          language: s.language_id === 71 ? 'python' : s.language_id === 62 ? 'java' : 'cpp',
          languageName: s.language_id === 71 ? 'Python 3.12' : s.language_id === 62 ? 'Java 21' : 'C++20',
          codingMarks: Math.min(3.0, coding),
          writeupMarks: Math.min(5.0, writing),
          vivaMarks: Math.min(2.0, viva),
          totalMarks: Math.min(10.0, total),
          passRate: s.total_test_cases ? Math.round((s.passed_test_cases / s.total_test_cases) * 100) : 100,
          passedCount: s.passed_test_cases || 0,
          totalCount: s.total_test_cases || 0,
          adaptiveTier: (s.passed_test_cases === s.total_test_cases) ? 'Advanced' : 'Proficient',
          timeSpentMin: Math.round((s.time_spent_seconds || 300) / 60),
          focusBlurEvents: 0,
          status: ev.marks_writing || ev.marks_viva ? 'Graded' : 'Pending Review',
          submittedAt: new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          feedback: ev.faculty_feedback || '',
          sourceCode: s.source_code,
        };
      });
    }
  } catch (err) {
    console.warn('Supabase submissions query note:', err.message);
  }

  return getLocalSubmissions();
}

/**
 * Submit student practical.
 * Persists to Supabase submissions table and captures the real database-generated UUID.
 * Never silently swallows write errors.
 */
export async function submitStudentPractical(subData) {
  let dbSubmission = null;
  let supabaseError = null;

  // 1. Attempt insert into Supabase as real source of truth
  try {
    const insertPayload = {
      student_id: subData.studentId,
      practical_id: subData.practicalId,
      language_id: subData.languageId || (subData.language === 'python' ? 71 : subData.language === 'java' ? 62 : 54),
      source_code: subData.sourceCode,
      total_test_cases: subData.totalCount || 3,
      passed_test_cases: subData.passedCount || 0,
      time_spent_seconds: subData.timeSpentSeconds || 300,
      attempt_count: subData.attemptCount || 1,
      status: 'attempted',
    };

    const { data, error } = await supabase
      .from('submissions')
      .insert(insertPayload)
      .select('id, created_at, status')
      .single();

    if (error) {
      supabaseError = error;
      console.error('❌ Supabase submission insert failed:', error.message, error.details);
    } else if (data) {
      dbSubmission = data;
    }
  } catch (err) {
    supabaseError = err;
    console.error('❌ Supabase submission exception:', err.message);
  }

  // 2. Use real database UUID if successfully inserted, else generate distinct client id with warning
  const realId = dbSubmission?.id || `sub_${Date.now().toString(36)}`;

  const newSub = {
    id: realId, // Real DB UUID when inserted, else client fallback id
    dbCommitted: Boolean(dbSubmission),
    dbError: supabaseError ? supabaseError.message : null,
    prn: subData.prn || 'PRN2026CS014',
    studentId: subData.studentId || 'std_2026_014',
    studentName: subData.studentName || 'Aarav Sharma',
    rollNumber: subData.rollNumber || '22CS014',
    practicalId: subData.practicalId,
    practicalTitle: subData.practicalTitle,
    language: subData.language,
    languageName: subData.language === 'cpp' ? 'C++20' : subData.language === 'c' ? 'C' : subData.language === 'python' ? 'Python 3.12' : 'Java 21',
    codingMarks: Math.min(3.0, parseFloat(subData.codingMarks || 0.0)),
    writeupMarks: 0.0,
    vivaMarks: 0.0,
    totalMarks: Math.min(3.0, parseFloat(subData.codingMarks || 0.0)),
    passRate: subData.passRate || 0,
    passedCount: subData.passedCount || 0,
    totalCount: subData.totalCount || 3,
    adaptiveTier: subData.adaptiveTier || 'Beginner',
    timeSpentMin: Math.round((subData.timeSpentSeconds || 300) / 60),
    focusBlurEvents: subData.focusBlurEvents || 0,
    status: 'Pending Review',
    submittedAt: 'Just now',
    feedback: '',
    sourceCode: subData.sourceCode,
  };

  // Sync to local state cache for instant reactivity
  const list = getLocalSubmissions();
  const updated = [newSub, ...list];
  setLocalSubmissions(updated);

  return newSub;
}

/**
 * Grade a student submission using the official 10-mark rubric:
 * Performing/Coding = 3M, Writing/Journal = 5M, Viva = 2M.
 * Upserts to canonical public.evaluations table.
 */
export async function gradeSubmission(submissionId, { writeupMarks, vivaMarks, feedback, gradedBy, codingMarks }) {
  let dbEvaluated = false;
  let supabaseError = null;

  const wMarks = Math.min(5.0, Math.max(0.0, parseFloat(writeupMarks || 0.0)));
  const vMarks = Math.min(2.0, Math.max(0.0, parseFloat(vivaMarks || 0.0)));
  const cMarks = Math.min(3.0, Math.max(0.0, parseFloat(codingMarks || 0.0)));
  const total = Math.min(10.0, Math.round((cMarks + wMarks + vMarks) * 10) / 10);

  // 1. Attempt upsert to canonical evaluations table
  try {
    // Only attempt Supabase write if submissionId looks like a valid UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(submissionId);

    if (isUuid) {
      const { data, error } = await supabase
        .from('evaluations')
        .upsert(
          {
            submission_id: submissionId,
            marks_performing: cMarks,
            marks_writing: wMarks,
            marks_viva: vMarks,
            faculty_feedback: feedback || '',
          },
          { onConflict: 'submission_id' }
        )
        .select()
        .single();

      if (error) {
        supabaseError = error;
        console.error('❌ Supabase evaluation upsert failed:', error.message, error.details);
      } else if (data) {
        dbEvaluated = true;
      }
    }
  } catch (err) {
    supabaseError = err;
    console.error('❌ Supabase evaluation exception:', err.message);
  }

  // 2. Update local state
  const list = getLocalSubmissions();
  const idx = list.findIndex((s) => s.id === submissionId);
  if (idx !== -1) {
    list[idx] = {
      ...list[idx],
      writeupMarks: wMarks,
      vivaMarks: vMarks,
      totalMarks: total,
      feedback: feedback || '',
      status: 'Graded',
      gradedBy: gradedBy || 'Faculty Evaluator',
      dbEvaluated,
      dbError: supabaseError ? supabaseError.message : null,
    };
    setLocalSubmissions(list);
  }

  return {
    submissions: list,
    dbEvaluated,
    error: supabaseError ? supabaseError.message : null,
  };
}

export async function getBatchMetrics() {
  return BATCH_METRICS;
}
