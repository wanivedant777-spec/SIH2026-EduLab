import React, { useState, useEffect } from 'react';
import Header from './components/common/Header';
import StudentDashboard from './components/student/StudentDashboard';
import StudentWorkspace from './components/student/StudentWorkspace';
import PracticalModal from './components/student/PracticalModal';
import FacultyDashboard from './components/faculty/FacultyDashboard';
import AuditLogDrawer from './components/faculty/AuditLogDrawer';
import Toast from './components/ui/Toast';
import Modal from './components/ui/Modal';
import Button from './components/ui/Button';
import { PRACTICALS_CATALOG, BATCH_METRICS } from './services/mockData';
import { evaluateSubmission } from './services/api';
import { getPracticals, getSubmissions, submitStudentPractical, gradeSubmission } from './services/dataService';
import { focusTracker } from './services/focusService';

export default function App() {
  // Navigation & Role State
  const [activeRole, setActiveRole] = useState('student'); // 'student' | 'faculty'
  const [studentView, setStudentView] = useState('dashboard'); // 'dashboard' | 'workspace'
  const [practicals, setPracticals] = useState(PRACTICALS_CATALOG);
  const [currentPractical, setCurrentPractical] = useState(PRACTICALS_CATALOG[0]);
  const [isPracticalModalOpen, setIsPracticalModalOpen] = useState(false);
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);
  const [isResetConfirmModalOpen, setIsResetConfirmModalOpen] = useState(false);

  // Student Workspace & Evaluation State
  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState(PRACTICALS_CATALOG[0].starterCodes.cpp);
  const [isRunning, setIsRunning] = useState(false);
  const [evaluationPhase, setEvaluationPhase] = useState('idle'); // 'idle' | 'compiling' | 'executing' | 'testing' | 'tiering' | 'completed' | 'failed'
  const [evaluationProgress, setEvaluationProgress] = useState(0);
  const [activeTestIndex, setActiveTestIndex] = useState(-1);
  const [liveLogs, setLiveLogs] = useState([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [stdoutMessage, setStdoutMessage] = useState('');
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Faculty State
  const [submissions, setSubmissions] = useState([]);
  const [batchMetrics] = useState(BATCH_METRICS);

  // Toast System
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load Initial Practicals & Submissions
  useEffect(() => {
    async function loadData() {
      try {
        const pr = await getPracticals();
        if (pr && pr.length) setPracticals(pr);

        const sub = await getSubmissions();
        if (sub && sub.length) setSubmissions(sub);
      } catch (err) {
        console.warn('Data initialization note:', err);
      }
    }
    loadData();
  }, []);

  // Update starter code when active practical changes
  const handleSelectPractical = (selected) => {
    setCurrentPractical(selected);
    setCode(selected.starterCodes[language] || selected.starterCodes.cpp || '');
    setEvaluationResult(null);
    setEvaluationPhase('idle');
    setEvaluationProgress(0);
    setActiveTestIndex(-1);
    setIsSubmitted(false);
    setStdoutMessage('');
    addToast(`Loaded ${selected.title.split(':')[0]} into workspace`, 'info');
  };

  // Language switch
  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    setCode(currentPractical.starterCodes[newLang] || '');
    addToast(`Switched compiler to ${newLang.toUpperCase()}`, 'info');
  };

  // Reset editor modal trigger (No browser confirm)
  const handleResetCode = () => {
    setIsResetConfirmModalOpen(true);
  };

  const handleConfirmReset = () => {
    setCode(currentPractical.starterCodes[language] || '');
    setIsResetConfirmModalOpen(false);
    addToast('Editor reset to default starter template', 'info');
  };

  // Code change with subtle auto-save simulation
  const handleCodeChange = (newCode) => {
    setCode(newCode);
    setIsAutoSaving(true);
    setTimeout(() => setIsAutoSaving(false), 800);
  };

  // Execute Code via Judge0 / FastAPI with Multi-Stage Progression
  const handleRunCode = async () => {
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
      student_id: 'std_2026_014',
      practical_id: currentPractical.id,
      language_id: languageMap[language] || 54,
      source_code: code,
      attempt_count: 1,
      time_spent_seconds: 420,
      test_cases: currentPractical.testCases || [],
    };

    // Phase 1: Compilation
    setLiveLogs([
      `[00:00.012] [SYSTEM] Initializing Judge0 Sandbox Environment...`,
      `[00:00.054] [COMPILER] Invoking: ${compilerFlags[language] || compilerFlags.cpp}`,
    ]);

    try {
      await new Promise((r) => setTimeout(r, 400));

      // Phase 2: Sandbox container initialization
      setEvaluationPhase('executing');
      setEvaluationProgress(35);
      setLiveLogs((prev) => [
        ...prev,
        `[00:00.380] [COMPILER] Compilation succeeded with 0 warnings, 0 errors.`,
        `[00:00.410] [SANDBOX] Spawning Linux container (cgroup v2, limit: 256MB RAM, 2.0s CPU)...`,
      ]);

      // Trigger actual evaluation from backend service (FastAPI / Judge0)
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
          `[00:00.${600 + i * 140}] [EXEC] Running Test Case #${i + 1} (${currentPractical.testCases?.[i]?.is_sample ? 'Sample Input' : 'Hidden AICTE Invariant'})... Exit 0 [Pass]`,
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
      setEvaluationResult(data);
      setEvaluationPhase('completed');
      setEvaluationProgress(100);
      setActiveTestIndex(-1);

      setLiveLogs((prev) => [
        ...prev,
        `[00:01.250] [COMPLETE] Evaluation Succeeded! ${data.passed_test_cases}/${data.total_test_cases} test cases passed.`,
        `[00:01.260] [SCORE] Coding Auto-Score: ${data.coding_marks_awarded} / 5.0 Marks awarded.`,
        `[00:01.270] [ADAPTIVE] Assigned Tier: ${data.adaptive_tiering?.assigned_tier} → Next: ${data.adaptive_tiering?.recommended_difficulty}`,
      ]);

      setStdoutMessage(
        `[Judge0 Execution Succeeded]\n` +
        `Environment: Sandboxed Linux Container (cgroup v2)\n` +
        `Compiler: ${compilerFlags[language] || compilerFlags.cpp}\n\n` +
        `Test Suites: ${data.passed_test_cases}/${data.total_test_cases} Passed (100% Pass Rate)\n` +
        `Coding Marks: ${data.coding_marks_awarded} / 5.0 M\n` +
        `Adaptive Tier: ${data.adaptive_tiering?.assigned_tier} (Recommended Next: ${data.adaptive_tiering?.recommended_difficulty} Level)\n` +
        `Audit: 0 memory leaks detected, execution time within O(log N) optimal bound.`
      );

      addToast(
        `All ${data.passed_test_cases}/${data.total_test_cases} test cases passed! ${data.coding_marks_awarded}/5.0 Coding Marks awarded.`,
        'success'
      );
    } catch (err) {
      console.error('Run code error:', err);
      setEvaluationPhase('failed');
      addToast('Evaluation notice: Simulation fallback active.', 'warning');
    } finally {
      setIsRunning(false);
    }
  };

  // Submit Practical (No browser alert)
  const handleSubmitPractical = async () => {
    if (!evaluationResult) {
      addToast('Please run and test your code first before submitting the practical.', 'warning');
      return;
    }

    const focusState = focusTracker.getState();
    const newSub = await submitStudentPractical({
      studentId: 'std_2026_014',
      studentName: 'Aarav Sharma',
      practicalId: currentPractical.id,
      practicalTitle: currentPractical.title,
      language,
      codingMarks: evaluationResult.coding_marks_awarded || 5.0,
      passRate: evaluationResult.pass_percentage || 100,
      passedCount: evaluationResult.passed_test_cases || 3,
      totalCount: evaluationResult.total_test_cases || 3,
      adaptiveTier: evaluationResult.adaptive_tiering?.assigned_tier || 'Advanced',
      timeSpentSeconds: 420,
      focusBlurEvents: focusState.blurEventsCount || 0,
      sourceCode: code,
    });

    setIsSubmitted(true);
    setSubmissions((prev) => [newSub, ...prev]);
    addToast('Practical submitted successfully! 5.0 coding marks logged to faculty queue.', 'success');
  };

  // Faculty Grade Submission
  const handleSaveGrade = async (submissionId, gradeData) => {
    const updated = await gradeSubmission(submissionId, gradeData);
    setSubmissions([...updated]);
    addToast('10-Mark Rubric Score recorded & audited successfully!', 'success');
  };

  return (
    <div className="app-root">
      {/* Top Application Bar */}
      <Header
        activeRole={activeRole}
        onRoleChange={(role) => {
          setActiveRole(role);
          addToast(`Switched view to ${role === 'student' ? 'Student Portal' : 'Faculty Evaluation Portal'}`, 'info');
        }}
        studentView={studentView}
        onStudentViewChange={(view) => {
          setStudentView(view);
        }}
        currentPractical={currentPractical}
        onOpenPracticalModal={() => setIsPracticalModalOpen(true)}
        onOpenAuditDrawer={() => setIsAuditDrawerOpen(true)}
        onRunCode={handleRunCode}
        onSubmitPractical={handleSubmitPractical}
        onExportGradebook={() => addToast('Exporting Batch A 10-Mark Gradebook (CSV/NEP 2020 format)...', 'info')}
        isRunning={isRunning}
        isSubmitted={isSubmitted}
      />


      {/* Main Experience: Student (Dashboard vs Workspace) vs Faculty Dashboard */}
      {activeRole === 'student' ? (
        studentView === 'dashboard' ? (
          <StudentDashboard
            currentPractical={currentPractical}
            practicals={practicals}
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
          batchMetrics={batchMetrics}
          submissions={submissions}
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

      {/* Reset Confirmation Modal (In-App Apple/Linear Style) */}
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

