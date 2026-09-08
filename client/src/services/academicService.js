import { supabase } from '../supabaseClient';

export async function getSubjectsForStudent(userId) {
  if (!userId) return [];

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('batch_id, departments(subjects(id, code, name))')
    .eq('id', userId)
    .single();

  if (profileError) throw new Error('Failed to load academic subjects: ' + profileError.message);

  const { data: practicalSubjects, error } = await supabase
    .from('practicals')
    .select('subject_id, subjects(id, code, name)')
    .order('practical_number');

  if (error) throw new Error('Failed to load practical subjects: ' + error.message);

  const map = new Map();
  (practicalSubjects || []).forEach((row) => {
    const subject = Array.isArray(row.subjects) ? row.subjects[0] : row.subjects;
    if (!subject) return;
    const current = map.get(subject.id) || { ...subject, practicalCount: 0 };
    current.practicalCount += 1;
    map.set(subject.id, current);
  });

  return [...map.values()].filter((subject) => subject.practicalCount > 0);
}

export async function getPracticalsBySubject(subjectId) {
  if (!subjectId) return [];

  const { data, error } = await supabase
    .from('practicals')
    .select(`
      id, subject_id, practical_number, title, aim, theory_content,
      flowchart_url, video_url, starter_codes,
      max_coding_marks, max_writeup_marks, max_viva_marks,
      subjects(id, code, name),
      test_cases(id, input_data, expected_output, is_sample, is_parameterized)
    `)
    .eq('subject_id', subjectId)
    .order('practical_number', { ascending: true });

  if (error) throw new Error('Failed to load subject practicals: ' + error.message);

  return (data || []).map((p) => {
    const subject = Array.isArray(p.subjects) ? p.subjects[0] : p.subjects;
    return {
      id: p.id,
      practicalNumber: p.practical_number,
      title: p.title.startsWith('Practical') ? p.title : 'Practical ' + String(p.practical_number).padStart(2, '0') + ': ' + p.title,
      subjectId: p.subject_id,
      subjectCode: subject?.code || 'Subject',
      subjectName: subject?.name || 'Subject',
      aim: p.aim,
      theory: p.theory_content || {},
      starterCodes: p.starter_codes || {},
      testCases: (p.test_cases || []).map((tc) => ({
        id: tc.id, input_data: tc.input_data, expected_output: tc.expected_output,
        is_sample: tc.is_sample, is_parameterized: tc.is_parameterized,
      })),
      maxCodingMarks: Number(p.max_coding_marks || 3),
      maxWriteupMarks: Number(p.max_writeup_marks || 5),
      maxVivaMarks: Number(p.max_viva_marks || 2),
    };
  });
}

export async function createAssignment({ facultyId, subjectId, batchId, practicalId, title }) {
  const { data, error } = await supabase
    .from('assignments')
    .insert({
      faculty_id: facultyId,
      subject_id: subjectId,
      batch_id: batchId,
      practical_id: practicalId,
      title,
    })
    .select()
    .single();

  if (error) throw new Error('Failed to create assignment: ' + error.message);
  return data;
}
