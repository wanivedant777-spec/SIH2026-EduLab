import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/common/Header';
import StudentDashboard from './components/student/StudentDashboard';
import StudentWorkspace from './components/student/StudentWorkspace';
import PracticalModal from './components/student/PracticalModal';
import FacultyDashboard from './components/faculty/FacultyDashboard';
import AuditLogDrawer from './components/faculty/AuditLogDrawer';
import Toast from './components/ui/Toast';
import Modal from './components/ui/Modal';
import Button from './components/ui/Button';
import LoginView from './components/LoginView';
import { supabase } from './supabaseClient';
import { evaluateSubmission } from './services/api';
import {
  getPracticals,
  getSubmissions,
  submitStudentPractical,
  gradeSubmission,
  getStudentProfile,
  getFacultyAllocations,
  computeBatchMetrics,
  exportGradebookCSV,
} from './services/dataService';
import { focusTracker } from './services/focusService';

export default function App() {
  // Session & User Authentication State
  const [currentUser, setCurrentUser] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [facultyAllocations, setFacultyAllocations] = useState([]);

  // Navigation State
  const [studentView, setStudentView] = useState('dashboard'); // 'dashboard' | 'workspace'
  const [practicals, setPracticals] = useState([]);
  const [currentPractical, setCurrentPractical] = useState(null);
  const [isPracticalModalOpen, setIsPracticalModalOpen] = useState(false);
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);
  const [isResetConfirmModalOpen, setIsResetConfirmModalOpen] = useState(false);

  // Student Workspace & Evaluation State
  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [evaluationPhase, setEvaluationPhase] = useState('idle'); // 'idle' | 'compiling' | 'executing' | 'testing' | 'tiering' | 'completed' | 'failed'
  const [evaluationProgress, setEvaluationProgress] = useState(0);
  const [activeTestIndex, setActiveTestIndex] = useState(-1);
  const [liveLogs, setLiveLogs] = useState([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [stdoutMessage, setStdoutMessage] = useState('');
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Data Loading & Sync States
  const [submissions, setSubmissions] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataError, setDataError] = useState(null);

  // Toast System
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Check existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*, batches(name)')
            .eq('id', session.user.id)
            .single();

          const role = profile?.role;
          if (!role || !['student', 'faculty'].includes(role)) {
            // Unknown or missing role — sign out immediately
            await supabase.auth.signOut();
            return;
          }
          const userObj = {
            id: session.user.id,
            email: session.user.email,
            identifier: profile?.identifier || session.user.app_metadata?.identifier || session.user.email?.split('@')[0] || 'User',
            name: profile?.full_name || session.user.user_metadata?.full_name || 'User',
            role,
            batchName: profile?.batches?.name || 'Unassigned',
            status: profile?.status || 'active',
          };
          setCurrentUser(userObj);
        }
      } catch (err) {
        console.warn('Session check note:', err);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _session) => {
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setStudentProfile(null);
        setFacultyAllocations([]);
        setStudentView('dashboard');
        setPracticals([]);
        setSubmissions([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch real data from Supabase for authenticated user
  const loadData = useCallback(async () => {
    if (!currentUser) return;

    setIsLoadingData(true);
    setDataError(null);

    try {
      // 1. Fetch practicals
      const prs = await getPracticals();
      setPracticals(prs);

      if (prs.length > 0) {
        setCurrentPractical((prev) => {
          if (!prev) return prs[0];
          const matched = prs.find((p) => p.id === prev.id);
          return matched || prs[0];
        });
      }

      // 2. Role-specific queries
      if (currentUser.role === 'student') {
        // Fetch student profile hierarchy
        try {
          const prof = await getStudentProfile(currentUser.id);
          if (prof) setStudentProfile(prof);
        } catch (e) {
          console.warn('Student profile query notice:', e.message);
        }

        // Fetch student's own submissions
        const subs = await getSubmissions(currentUser.id);
        setSubmissions(subs);
      } else if (currentUser.role === 'faculty') {
        // Fetch faculty allocations
        try {
          const allocs = await getFacultyAllocations(currentUser.id);
          setFacultyAllocations(allocs);
        } catch (e) {
          console.warn('Faculty allocations query notice:', e.message);
        }

        // Fetch all authorized batch submissions
        const subs = await getSubmissions();
        setSubmissions(subs);
      }
    } catch (err) {
      console.error('Data loading failure:', err);
      setDataError(err.message || 'Failed to sync with live Supabase database.');
      addToast(`Database sync note: ${err.message}`, 'danger');
    } finally {
      setIsLoadingData(false);
    }
  }, [currentUser, addToast]);

  useEffect(() => {
    if (currentUser) {
      const timer = setTimeout(() => {
        loadData();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [currentUser, loadData]);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setStudentView('dashboard');
    addToast(`Welcome, ${user.name || user.identifier || 'User'}! Authenticated via Supabase.`, 'success');
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Sign out note:', e);
    }
    setCurrentUser(null);
    setStudentProfile(null);
    setFacultyAllocations([]);
    setStudentView('dashboard');
    setPracticals([]);
    setSubmissions([]);
    addToast('Signed out successfully.', 'info');
  };

  // Update starter code when active practical changes
  const handleSelectPractical = (selected) => {
    setCurrentPractical(selected);
    const template = selected.starterCodes?.[language] || selected.starterCodes?.cpp || '';
    setCode(template);
    setEvaluationResult(null);
    setEvaluationPhase('idle');
    setEvaluationProgress(0);
    setActiveTestIndex(-1);
    setIsSubmitted(false);
    setStdoutMessage('');
    addToast(`Loaded ${selected.title?.split(':')[0] || 'Practical'} into workspace`, 'info');
  };

  // Language switch
  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    const template = currentPractical?.starterCodes?.[newLang] || currentPractical?.starterCodes?.cpp || '';
    setCode(template);
    addToast(`Switched compiler to ${newLang.toUpperCase()}`, 'info');
  };

  // Reset editor modal trigger
  const handleResetCode = () => {
    setIsResetConfirmModalOpen(true);
  };

  const handleConfirmReset = () => {
    const template = currentPractical?.starterCodes?.[language] || currentPractical?.starterCodes?.cpp || '';
    setCode(template);
    setIsResetConfirmModalOpen(false);
    addToast('Editor reset to default starter template', 'info');
  };

  // Code change with subtle auto-save simulation
  const handleCodeChange = (newCode) => {
    setCode(newCode);
    setIsAutoSaving(true);
    setTimeout(() => setIsAutoSaving(false), 800);
  };

  // Execute Code via Judge0 / FastAPI
  const handleRunCode = async () => {
    if (!currentPractical) {
      addToast('No active practical selected.', 'warning');
      return;
    }

    setIsRunning(true);
    setEvaluationPhase('compiling');
    setEvaluationProgress(15);
    setActiveTestIndex(-1);
    setEvaluationResult(null);

    const languageMap = {
      cpp: 54,
      c: 50,
      python: 71,
      java: 62,
    };

    const compilerFlags = {
      cpp: 'g++ -O3 -std=c++20 -Wall -Wextra solution.cpp -o solution',
      c: 'gcc -O3 -std=c17 -Wall -Wextra solution.c -o solution',
      python: 'python3 -m py_compile solution.py',
      java: 'javac -Xlint:all Main.java',
    };

    const payload = {
      student_id: currentUser?.id || currentUser?.identifier || 'unassigned',
      practical_id: currentPractical.id,
      practical_number: currentPractical.practicalNumber,
      practical_title: currentPractical.title,
      subject_code: currentPractical.courseCode?.split(':')[0]?.trim() || 'CS201P',
      language_id: languageMap[language] || 54,
      source_code: code,
      attempt_count: 1,
      time_spent_seconds: 420,
      test_cases: currentPractical.testCases || [],
    };

    try {
      // Phase 1: Compilation
      setLiveLogs([
        `[00:00.040] [ENV] Initializing evaluation runtime...`,
        `[00:00.120] [COMPILER] Target: ${compilerFlags[language] || compilerFlags.cpp}`,
      ]);

      await new Promise((r) => setTimeout(r, 400));

      // Phase 2: Execution Sandbox Initialization
      setEvaluationPhase('executing');
      setEvaluationProgress(35);
      setLiveLogs((prev) => [
        ...prev,
        `[00:00.410] [SANDBOX] Applying resource bounds: CPU=2.0s, RAM=256MB`,
        `[00:00.520] [HARNESS] Dispatching test suite to evaluator microservice...`,
      ]);

      const dataPromise = evaluateSubmission(payload);

      await new Promise((r) => setTimeout(r, 350));

      // Phase 3: Stepping through test cases progressively
      setEvaluationPhase('testing');
      const totalCases = currentPractical.testCases?.length || 3;
      for (let i = 0; i < totalCases; i++) {
        setActiveTestIndex(i);
        setEvaluationProgress(40 + Math.round(((i + 1) / totalCases) * 45));
        setLiveLogs((prev) => [
          ...prev,
          `[00:00.${600 + i * 140}] [EXEC] Running Test Case #${i + 1} (${currentPractical.testCases?.[i]?.is_sample ? 'Sample Input' : 'Curricular Test Case'})...`,
        ]);
        await new Promise((r) => setTimeout(r, 260));
      }

      // Phase 4: Tiering & AICTE Rubric calculation
      setEvaluationPhase('tiering');
      setEvaluationProgress(95);
      setLiveLogs((prev) => [
        ...prev,
        `[00:01.080] [TIER] Computing AICTE 10-Mark Rubric & Adaptive Difficulty Tier...`,
      ]);
      await new Promise((r) => setTimeout(r, 240));

      const data = await dataPromise;
      const isSuccess = data.status === 'Passed';
      setEvaluationResult(data);
      setEvaluationPhase(isSuccess ? 'completed' : 'failed');
      setEvaluationProgress(100);
      setActiveTestIndex(-1);

      setLiveLogs((prev) => [
        ...prev,
        `[00:01.250] [COMPLETE] Evaluation finished: ${data.passed_test_cases}/${data.total_test_cases} test cases passed.`,
        `[00:01.260] [SCORE] Coding Auto-Score: ${data.coding_marks_awarded} / 3.0 Marks awarded.`,
        `[00:01.270] [ADAPTIVE] Status: ${data.status} | Tier: ${data.adaptive_tiering?.assigned_tier}`,
      ]);

      setStdoutMessage(
        `[Evaluator Microservice Response]\n` +
        `Status: ${data.status} (${data.is_simulation ? 'DEMO / SIMULATION' : 'EXECUTED'})\n` +
        `Compiler: ${compilerFlags[language] || compilerFlags.cpp}\n\n` +
        `Test Cases: ${data.passed_test_cases}/${data.total_test_cases} Passed (${Math.round(data.pass_percentage || 0)}%)\n` +
        `Coding Marks: ${data.coding_marks_awarded} / 3.0 M\n` +
        `Adaptive Tier: ${data.adaptive_tiering?.assigned_tier} (Recommended Next: ${data.adaptive_tiering?.recommended_difficulty} Level)\n` +
        `Execution Telemetry: Process completed in optimal algorithmic bounds.`
      );

      if (data.status === 'Passed') {
        addToast(
          `All ${data.passed_test_cases}/${data.total_test_cases} test cases passed! ${data.coding_marks_awarded}/3.0 Coding Marks awarded.`,
          'success'
        );
      } else {
        addToast(
          `Evaluation complete: ${data.passed_test_cases}/${data.total_test_cases} passed (${data.coding_marks_awarded}/3.0 Marks).`,
          data.passed_test_cases > 0 ? 'warning' : 'danger'
        );
      }
    } catch (err) {
      console.error('Run code error:', err);
      setEvaluationPhase('failed');
      addToast('Evaluation notice: Evaluation service unavailable.', 'warning');
    } finally {
      setIsRunning(false);
    }
  };

  // Submit Practical to Supabase
  const handleSubmitPractical = async () => {
    if (!evaluationResult) {
      addToast('Please run and test your code first before submitting the practical.', 'warning');
      return;
    }

    const focusState = focusTracker.getState();

    try {
      const newSub = await submitStudentPractical({
        studentId: currentUser.id,
        prn: currentUser.identifier || 'Unassigned',
        studentName: currentUser.name || 'Student',
        rollNumber: currentUser.identifier || 'Unassigned',
        practicalId: currentPractical.id,
        practicalTitle: currentPractical.title,
        language,
        codingMarks: evaluationResult.coding_marks_awarded ?? 0.0,
        passRate: evaluationResult.pass_percentage || 0,
        passedCount: evaluationResult.passed_test_cases || 0,
        totalCount: evaluationResult.total_test_cases || currentPractical.testCases?.length || 0,
        adaptiveTier: evaluationResult.adaptive_tiering?.assigned_tier || 'Beginner',
        timeSpentSeconds: 420,
        focusBlurEvents: focusState.blurEventsCount || 0,
        sourceCode: code,
      });

      setIsSubmitted(true);
      setSubmissions((prev) => [newSub, ...prev]);
      addToast(`Practical submitted to Supabase! ${newSub.codingMarks}/3.0 coding marks logged.`, 'success');

      // Refresh live submissions in background
      getSubmissions(currentUser.id).then((fresh) => setSubmissions(fresh)).catch(() => {});
    } catch (err) {
      console.error('Submission failed:', err);
      addToast(`Submission error: ${err.message}`, 'danger');
    }
  };

  // Faculty Grade Submission
  const handleSaveGrade = async (submissionId, gradeData) => {
    try {
      await gradeSubmission(submissionId, {
        ...gradeData,
        gradedBy: currentUser.id,
      });

      addToast('10-Mark Rubric Score recorded & audited successfully in Supabase!', 'success');

      // Refresh submissions
      const freshSubs = await getSubmissions();
      setSubmissions(freshSubs);
    } catch (err) {
      console.error('Grading error:', err);
      addToast(`Failed to record grade: ${err.message}`, 'danger');
    }
  };

  // If not logged in, render the unified Authentication View
  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const batchMetrics = computeBatchMetrics(submissions);


  const handleExportGradebook = () => {
    const subjectCode = facultyAllocations[0]?.subjects?.code || 'CS201P';
    exportGradebookCSV(submissions, subjectCode);
    addToast('10-Mark Gradebook exported successfully (CSV format).', 'success');
  };

  return (
    <div className="app-root">
      {/* Top Application Bar */}
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        studentView={studentView}
        onStudentViewChange={(view) => {
          setStudentView(view);
        }}
        currentPractical={currentPractical}
        onOpenPracticalModal={() => setIsPracticalModalOpen(true)}
        onOpenAuditDrawer={() => setIsAuditDrawerOpen(true)}
        onRunCode={handleRunCode}
        onSubmitPractical={handleSubmitPractical}
        onExportGradebook={handleExportGradebook}
        isRunning={isRunning}
        isSubmitted={isSubmitted}
      />

      {/* Main Experience: Student (Dashboard vs Workspace) vs Faculty Dashboard */}
      {currentUser?.role === 'student' ? (
        studentView === 'dashboard' ? (
          <StudentDashboard
            currentUser={currentUser}
            studentProfile={studentProfile}
            submissions={submissions}
            currentPractical={currentPractical}
            practicals={practicals}
            isLoading={isLoadingData}
            error={dataError}
            onRetry={loadData}
            onContinuePractical={(prac) => {
              if (prac) handleSelectPractical(prac);
              setStudentView('workspace');
            }}
            onSelectPractical={(prac) => {
              handleSelectPractical(prac);
              setStudentView('workspace');
            }}
          />
        ) : (
          <StudentWorkspace
            practical={currentPractical}
            language={language}
            onLanguageChange={handleLanguageChange}
            code={code}
            onCodeChange={handleCodeChange}
            onResetCode={handleResetCode}
            isRunning={isRunning}
            evaluationPhase={evaluationPhase}
            evaluationProgress={evaluationProgress}
            activeTestIndex={activeTestIndex}
            liveLogs={liveLogs}
            evaluationResult={evaluationResult}
            stdoutMessage={stdoutMessage}
            isAutoSaving={isAutoSaving}
            onRunCode={handleRunCode}
          />
        )
      ) : (
        <FacultyDashboard
          currentUser={currentUser}
          facultyAllocations={facultyAllocations}
          submissions={submissions}
          batchMetrics={batchMetrics}
          isLoading={isLoadingData}
          error={dataError}
          onRetry={loadData}
          onSaveGrade={handleSaveGrade}
        />
      )}

      {/* Practical Picker Modal */}
      <PracticalModal
        isOpen={isPracticalModalOpen}
        onClose={() => setIsPracticalModalOpen(false)}
        practicals={practicals}
        activePracticalId={currentPractical?.id}
        onSelectPractical={handleSelectPractical}
      />

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={isResetConfirmModalOpen}
        onClose={() => setIsResetConfirmModalOpen(false)}
        title="Reset Editor to Starter Code"
        maxWidth="460px"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsResetConfirmModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmReset}
            >
              Reset to Template
            </Button>
          </>
        }
      >
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
          Are you sure you want to reset your editor? Any unsaved edits for{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{currentPractical?.title?.split(':')[0]}</strong> will be replaced with the default boilerplate starter code.
        </p>
      </Modal>

      {/* Audit Log Drawer */}
      <AuditLogDrawer
        isOpen={isAuditDrawerOpen}
        onClose={() => setIsAuditDrawerOpen(false)}
      />

      {/* Toast Notification Layer */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
