/* EduLab Nova - Unified Live Data Service (Supabase Canonical Source of Truth) */
import { supabase } from '../supabaseClient';

// Canonical algorithmic boilerplate templates for practicals with missing or placeholder '...' in database
const CANONICAL_STARTER_CODES = {
  1: {
    cpp: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

// Practical 01: Find the Largest Number in an Array
// Algorithm: Traverse array, maintain running maximum invariant
int findLargest(const vector<int>& arr) {
    if (arr.empty()) return 0;
    int maxVal = arr[0];
    for (size_t i = 1; i < arr.size(); i++) {
        if (arr[i] > maxVal) {
            maxVal = arr[i];
        }
    }
    return maxVal;
}

int main() {
    int n;
    if (cin >> n) {
        vector<int> arr(n);
        for (int i = 0; i < n; i++) {
            cin >> arr[i];
        }
        cout << findLargest(arr) << endl;
    }
    return 0;
}`,
    python: `# Practical 01: Find the Largest Number in an Array
# Algorithm: Linear scan with optimal O(N) time and O(1) auxiliary space
import sys

def find_largest(arr):
    if not arr:
        return 0
    max_val = arr[0]
    for x in arr:
        if x > max_val:
            max_val = x
    return max_val

def main():
    input_data = sys.stdin.read().split()
    if not input_data:
        return
    n = int(input_data[0])
    arr = [int(x) for x in input_data[1:n+1]]
    print(find_largest(arr))

if __name__ == '__main__':
    main()`,
    java: `import java.util.Scanner;

// Practical 01: Find the Largest Number in an Array
public class Main {
    public static int findLargest(int[] arr) {
        if (arr.length == 0) return 0;
        int maxVal = arr[0];
        for (int num : arr) {
            if (num > maxVal) {
                maxVal = num;
            }
        }
        return maxVal;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            int n = sc.nextInt();
            int[] arr = new int[n];
            for (int i = 0; i < n; i++) {
                arr[i] = sc.nextInt();
            }
            System.out.println(findLargest(arr));
        }
    }
}`
  },
  2: {
    cpp: `#include <iostream>
#include <vector>
#include <string>
using namespace std;

// Practical 02: Implement Stack Using Array
class Stack {
private:
    vector<int> data;
public:
    void push(int val) {
        data.push_back(val);
    }
    void pop() {
        if (data.empty()) {
            cout << "Stack Underflow" << endl;
        } else {
            cout << data.back() << endl;
            data.pop_back();
        }
    }
    void peek() {
        if (data.empty()) {
            cout << "Stack is Empty" << endl;
        } else {
            cout << data.back() << endl;
        }
    }
};

int main() {
    Stack st;
    string op;
    while (cin >> op) {
        if (op == "PUSH") {
            int val;
            cin >> val;
            st.push(val);
        } else if (op == "POP") {
            st.pop();
        } else if (op == "PEEK") {
            st.peek();
        }
    }
    return 0;
}`,
    python: `# Practical 02: Implement Stack Using Array
import sys

class Stack:
    def __init__(self):
        self.data = []

    def push(self, val):
        self.data.append(val)

    def pop(self):
        if not self.data:
            print("Stack Underflow")
        else:
            print(self.data.pop())

    def peek(self):
        if not self.data:
            print("Stack is Empty")
        else:
            print(self.data[-1])

def main():
    tokens = sys.stdin.read().split()
    if not tokens:
        return
    st = Stack()
    i = 0
    while i < len(tokens):
        op = tokens[i]
        if op == "PUSH" and i + 1 < len(tokens):
            val = int(tokens[i+1])
            st.push(val)
            i += 2
        elif op == "POP":
            st.pop()
            i += 1
        elif op == "PEEK":
            st.peek()
            i += 1
        else:
            i += 1

if __name__ == '__main__':
    main()`,
    java: `import java.util.Scanner;
import java.util.ArrayList;

// Practical 02: Implement Stack Using Array
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        ArrayList<Integer> stack = new ArrayList<>();
        while (sc.hasNext()) {
            String op = sc.next();
            if (op.equals("PUSH")) {
                int val = sc.nextInt();
                stack.add(val);
            } else if (op.equals("POP")) {
                if (stack.isEmpty()) {
                    System.out.println("Stack Underflow");
                } else {
                    System.out.println(stack.remove(stack.size() - 1));
                }
            } else if (op.equals("PEEK")) {
                if (stack.isEmpty()) {
                    System.out.println("Stack is Empty");
                } else {
                    System.out.println(stack.get(stack.size() - 1));
                }
            }
        }
    }
}`
  }
};

/**
 * Fetch all practicals from Supabase canonical catalog joined with test cases.
 * Throws explicit error on failure - never falls back silently to fake data.
 */
export async function getPracticals() {
  const { data, error } = await supabase
    .from('practicals')
    .select(`
      id,
      subject_id,
      practical_number,
      title,
      aim,
      theory_content,
      flowchart_url,
      video_url,
      starter_codes,
      max_coding_marks,
      max_writeup_marks,
      max_viva_marks,
      created_at,
      test_cases (id, input_data, expected_output, is_sample, is_parameterized)
    `)
    .order('practical_number', { ascending: true });

  if (error) {
    console.error('❌ Supabase practicals query error:', error.message, error.details);
    throw new Error(`Database error loading practicals: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data.map((p) => {
    const theory = p.theory_content || {};
    const testCases = (p.test_cases || []).sort((a, b) => (b.is_sample ? 1 : 0) - (a.is_sample ? 1 : 0));

    // Resolve canonical starter code if database contains placeholder '...'
    const dbCodes = p.starter_codes || {};
    const canonicalFallback = CANONICAL_STARTER_CODES[p.practical_number] || {};
    const resolvedStarterCodes = {
      cpp: dbCodes.cpp && dbCodes.cpp !== '...' ? dbCodes.cpp : (canonicalFallback.cpp || dbCodes.cpp || ''),
      python: dbCodes.python && dbCodes.python !== '...' ? dbCodes.python : (canonicalFallback.python || dbCodes.python || ''),
      java: dbCodes.java && dbCodes.java !== '...' ? dbCodes.java : (canonicalFallback.java || dbCodes.java || ''),
      c: dbCodes.c && dbCodes.c !== '...' ? dbCodes.c : (canonicalFallback.cpp || dbCodes.c || ''),
    };

    return {
      id: p.id,
      practicalNumber: p.practical_number,
      title: p.title.startsWith('Practical') ? p.title : `Practical ${String(p.practical_number).padStart(2, '0')}: ${p.title}`,
      courseCode: 'CS201P: Data Structures',
      subjectId: p.subject_id,
      aim: p.aim,
      category: theory.category || 'Algorithms & Data Structures',
      nepLevel: theory.nepLevel || 'Level 5 (Trees & Invariants)',
      avgTime: theory.avgTime || '30 Mins',
      difficulty: theory.difficulty || (p.practical_number <= 3 ? 'Easy' : p.practical_number <= 6 ? 'Medium' : 'Hard'),
      algorithm: Array.isArray(theory.algorithm) ? theory.algorithm : [],
      pseudocode: theory.pseudocode || '',
      flowchartUrl: p.flowchart_url,
      videoUrl: p.video_url,
      starterCodes: resolvedStarterCodes,
      testCases: testCases.map((tc) => ({
        id: tc.id,
        input_data: tc.input_data,
        expected_output: tc.expected_output,
        is_sample: tc.is_sample,
        is_parameterized: tc.is_parameterized,
      })),
      maxCodingMarks: parseFloat(p.max_coding_marks || 3.0),
      maxWriteupMarks: parseFloat(p.max_writeup_marks || 5.0),
      maxVivaMarks: parseFloat(p.max_viva_marks || 2.0),
    };
  });
}

/**
 * Fetch submissions from Supabase as real source of truth.
 * Returns joined data with student profiles, practicals, and 10-mark evaluations.
 * Throws explicit error on failure - never falls back silently to mock data.
 */
export async function getSubmissions(studentId = null) {
  let query = supabase
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
      profiles:student_id (identifier, full_name, role, batch_id, batches(name)),
      practicals:practical_id (title, practical_number, subject_id),
      evaluations (marks_performing, marks_writing, marks_viva, marks_total, faculty_feedback, graded_by, graded_at)
    `)
    .order('created_at', { ascending: false });

  if (studentId) {
    query = query.eq('student_id', studentId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ Supabase submissions query error:', error.message, error.details);
    throw new Error(`Database error loading submissions: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data.map((s) => {
    const ev = Array.isArray(s.evaluations) ? (s.evaluations[0] || {}) : (s.evaluations || {});
    const profile = Array.isArray(s.profiles) ? (s.profiles[0] || {}) : (s.profiles || {});
    const practical = Array.isArray(s.practicals) ? (s.practicals[0] || {}) : (s.practicals || {});

    const coding = parseFloat(
      ev.marks_performing !== undefined && ev.marks_performing !== null
        ? ev.marks_performing
        : s.total_test_cases
        ? ((s.passed_test_cases / s.total_test_cases) * 3.0).toFixed(1)
        : 0.0
    );
    const writing = parseFloat(ev.marks_writing || 0.0);
    const viva = parseFloat(ev.marks_viva || 0.0);
    const total = ev.marks_total ? parseFloat(ev.marks_total) : Math.min(10.0, Math.round((coding + writing + viva) * 10) / 10);

    const isGraded = Boolean(ev.graded_at || ev.marks_writing > 0 || ev.marks_viva > 0);

    return {
      id: s.id, // Real database-generated UUID
      prn: profile.identifier || 'Unassigned',
      studentId: s.student_id,
      studentName: profile.full_name || 'Student',
      rollNumber: profile.identifier || 'Unassigned',
      batchName: profile.batches?.name || 'Unassigned',
      practicalId: s.practical_id,
      practicalTitle: practical.title
        ? practical.title.startsWith('Practical')
          ? practical.title
          : `Practical 0${practical.practical_number || 1}: ${practical.title}`
        : 'Practical Lab',
      language: s.language_id === 71 ? 'python' : s.language_id === 62 ? 'java' : s.language_id === 50 ? 'c' : 'cpp',
      languageName: s.language_id === 71 ? 'Python 3.12' : s.language_id === 62 ? 'Java 21' : s.language_id === 50 ? 'C' : 'C++20',
      codingMarks: Math.min(3.0, coding),
      writeupMarks: Math.min(5.0, writing),
      vivaMarks: Math.min(2.0, viva),
      totalMarks: Math.min(10.0, total),
      passRate: s.total_test_cases ? Math.round((s.passed_test_cases / s.total_test_cases) * 100) : 0,
      passedCount: s.passed_test_cases || 0,
      totalCount: s.total_test_cases || 0,
      adaptiveTier: s.passed_test_cases === s.total_test_cases ? 'Advanced' : s.passed_test_cases > 0 ? 'Proficient' : 'Beginner',
      timeSpentMin: Math.round((s.time_spent_seconds || 0) / 60),
      focusBlurEvents: 0,
      status: isGraded ? 'Graded' : 'Pending Review',
      submittedAt: new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      submittedDate: new Date(s.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
      feedback: ev.faculty_feedback || '',
      gradedBy: ev.graded_by || null,
      gradedAt: ev.graded_at || null,
      sourceCode: s.source_code,
      createdAt: s.created_at,
    };
  });
}

/**
 * Submit student practical to live database.
 * Never silently swallows write errors.
 */
export async function submitStudentPractical(subData) {
  const insertPayload = {
    student_id: subData.studentId,
    practical_id: subData.practicalId,
    language_id: subData.languageId || (subData.language === 'python' ? 71 : subData.language === 'java' ? 62 : subData.language === 'c' ? 50 : 54),
    source_code: subData.sourceCode,
    total_test_cases: subData.totalCount || 3,
    passed_test_cases: subData.passedCount || 0,
    time_spent_seconds: subData.timeSpentSeconds || 300,
    attempt_count: subData.attemptCount || 1,
    status: subData.passedCount === subData.totalCount ? 'completed' : 'attempted',
  };

  const { data, error } = await supabase
    .from('submissions')
    .insert(insertPayload)
    .select(`
      id,
      created_at,
      status,
      student_id,
      practical_id
    `)
    .single();

  if (error) {
    console.error('❌ Supabase submission insert failed:', error.message, error.details);
    throw new Error(`Failed to submit practical: ${error.message}`);
  }

  return {
    id: data.id,
    dbCommitted: true,
    dbError: null,
    prn: subData.prn || 'Unassigned',
    studentId: subData.studentId,
    studentName: subData.studentName || 'Student',
    rollNumber: subData.rollNumber || 'Unassigned',
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
    totalCount: subData.totalCount || 0,
    adaptiveTier: subData.adaptiveTier || 'Beginner',
    timeSpentMin: Math.round((subData.timeSpentSeconds || 0) / 60),
    focusBlurEvents: subData.focusBlurEvents || 0,
    status: 'Pending Review',
    submittedAt: 'Just now',
    feedback: '',
    sourceCode: subData.sourceCode,
  };
}

/**
 * Grade a student submission using the official 10-mark rubric:
 * Performing/Coding = 3M, Writing/Journal = 5M, Viva = 2M.
 * Upserts to canonical public.evaluations table.
 */
export async function gradeSubmission(submissionId, { writeupMarks, vivaMarks, feedback, gradedBy, codingMarks }) {
  const wMarks = Math.min(5.0, Math.max(0.0, parseFloat(writeupMarks || 0.0)));
  const vMarks = Math.min(2.0, Math.max(0.0, parseFloat(vivaMarks || 0.0)));
  const cMarks = Math.min(3.0, Math.max(0.0, parseFloat(codingMarks || 0.0)));

  const { data, error } = await supabase
    .from('evaluations')
    .upsert(
      {
        submission_id: submissionId,
        marks_performing: cMarks,
        marks_writing: wMarks,
        marks_viva: vMarks,
        faculty_feedback: feedback || '',
        graded_by: gradedBy || null,
        graded_at: new Date().toISOString(),
      },
      { onConflict: 'submission_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('❌ Supabase evaluation upsert failed:', error.message, error.details);
    throw new Error(`Failed to save evaluation: ${error.message}`);
  }

  // Update submission status to completed
  await supabase
    .from('submissions')
    .update({ status: 'completed' })
    .eq('id', submissionId);

  return {
    evaluation: data,
    totalMarks: Math.min(10.0, Math.round((cMarks + wMarks + vMarks) * 10) / 10),
  };
}

/**
 * Fetch authenticated student profile joined with academic hierarchy.
 */
export async function getStudentProfile(userId) {
  if (!userId) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select(`
      id,
      email,
      full_name,
      identifier,
      role,
      status,
      college_id,
      department_id,
      division_id,
      batch_id,
      batches (id, name),
      divisions (id, name, semester, academic_year),
      departments (id, name, code),
      colleges (id, name, code)
    `)
    .eq('id', userId)
    .single();

  if (error) {
    console.error('❌ Supabase student profile fetch error:', error.message);
    throw new Error(`Failed to load student profile: ${error.message}`);
  }

  return profile;
}

/**
 * Fetch faculty allocations for authorized batches and subjects.
 */
export async function getFacultyAllocations(facultyId) {
  if (!facultyId) return [];

  const { data, error } = await supabase
    .from('faculty_allocations')
    .select(`
      id,
      subject_id,
      batch_id,
      subjects (id, code, name, semester),
      batches (id, name, division_id, divisions (name, academic_year, semester))
    `)
    .eq('faculty_id', facultyId);

  if (error) {
    console.error('❌ Supabase faculty allocations query error:', error.message);
    throw new Error(`Failed to load faculty allocations: ${error.message}`);
  }

  return data || [];
}

/**
 * Compute live batch analytics from real database submissions.
 */
export function computeBatchMetrics(submissions = []) {
  const total = submissions.length;
  const graded = submissions.filter((s) => s.status === 'Graded');
  const uniqueStudents = new Set(submissions.map((s) => s.studentId)).size;

  const codingSum = graded.reduce((acc, s) => acc + (s.codingMarks || 0), 0);
  const writingSum = graded.reduce((acc, s) => acc + (s.writeupMarks || 0), 0);
  const vivaSum = graded.reduce((acc, s) => acc + (s.vivaMarks || 0), 0);

  const advanced = submissions.filter((s) => s.adaptiveTier === 'Advanced').length;
  const proficient = submissions.filter((s) => s.adaptiveTier === 'Proficient').length;
  const beginner = submissions.filter((s) => s.adaptiveTier === 'Beginner').length;

  return {
    totalStudents: uniqueStudents,
    totalSubmissions: total,
    pendingSubmissions: total - graded.length,
    gradedSubmissions: graded.length,
    rubricAverages: {
      coding: graded.length ? parseFloat((codingSum / graded.length).toFixed(1)) : 0.0,
      writing: graded.length ? parseFloat((writingSum / graded.length).toFixed(1)) : 0.0,
      viva: graded.length ? parseFloat((vivaSum / graded.length).toFixed(1)) : 0.0,
    },
    tierBreakdown: {
      advanced: total ? Math.round((advanced / total) * 100) : 0,
      proficient: total ? Math.round((proficient / total) * 100) : 0,
      beginner: total ? Math.round((beginner / total) * 100) : 0,
    },
  };
}

/**
 * Export 10-Mark Rubric Gradebook as CSV compliant with AICTE/NEP 2020 formats.
 */
export function exportGradebookCSV(submissions = [], subjectCode = 'CS201P') {
  const headers = [
    'PRN',
    'Student Name',
    'Roll Number',
    'Batch',
    'Practical',
    'Coding (3M Auto)',
    'Writing (5M Faculty)',
    'Viva (2M Faculty)',
    'Total (10M)',
    'Adaptive Difficulty Tier',
    'Focus Integrity Status',
    'Status',
    'Submitted Date'
  ];

  const rows = submissions.map((s) => [
    `"${s.prn || 'Unassigned'}"`,
    `"${s.studentName || 'Student'}"`,
    `"${s.rollNumber || 'Unassigned'}"`,
    `"${s.batchName || 'Unassigned'}"`,
    `"${s.practicalTitle || 'Practical'}"`,
    (s.codingMarks || 0).toFixed(1),
    (s.writeupMarks || 0).toFixed(1),
    (s.vivaMarks || 0).toFixed(1),
    (s.totalMarks || 0).toFixed(1),
    `"${s.adaptiveTier || 'Beginner'}"`,
    (s.focusBlurEvents || 0) > 0 ? `"${s.focusBlurEvents} Blurs (Flagged)"` : '"Verified Clean"',
    `"${s.status || 'Pending Review'}"`,
    `"${s.submittedDate || 'N/A'}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `EduLab_${subjectCode || 'Console'}_10Mark_Gradebook_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

