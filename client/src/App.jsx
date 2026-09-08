import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/common/Header';
import StudentDashboard from './components/student/StudentDashboard';
import StudentWorkspace from './components/student/StudentWorkspace';
import PracticalModal from './components/student/PracticalModal';
import FacultyDashboard from './components/faculty/FacultyDashboard';
import CreateAssignmentModal from './components/faculty/CreateAssignmentModal';
import AuditLogDrawer from './components/faculty/AuditLogDrawer';
import Toast from './components/ui/Toast';
import Modal from './components/ui/Modal';
import Button from './components/ui/Button';
import LoginView from './components/LoginView';
import { supabase } from './supabaseClient';
import { evaluateSubmission } from './services/api';
import {
  getSubmissions,
  submitStudentPractical,
  gradeSubmission,
  getStudentProfile,
  getFacultyAllocations,
  computeBatchMetrics,
  exportGradebookCSV,
} from './services/dataService';
import { getSubjectsForStudent, getPracticalsBySubject, createAssignment } from './services/academicService';
import { focusTracker } from './services/focusService';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [facultyAllocations, setFacultyAllocations] = useState([]);
  const [studentSubjects, setStudentSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [studentView, setStudentView] = useState('dashboard');
  const [practicals, setPracticals] = useState([]);
  const [currentPractical, setCurrentPractical] = useState(null);
  const [isPracticalModalOpen, setIsPracticalModalOpen] = useState(false);
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);
  const [isResetConfirmModalOpen, setIsResetConfirmModalOpen] = useState(false);
  const [assignmentContext, setAssignmentContext] = useState(null);

  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [evaluationPhase, setEvaluationPhase] = useState('idle');
  const [evaluationProgress, setEvaluationProgress] = useState(0);
  const [activeTestIndex, setActiveTestIndex] = useState(-1);
  const [liveLogs, setLiveLogs] = useState([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [stdoutMessage, setStdoutMessage] = useState('');
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  const [submissions, setSubmissions] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataError, setDataError] = useState(null);
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 4500);
  }, []);

  const dismissToast = (id) => setToasts((prev) => prev.filter((toast) => toast.id !== id));

  const buildUserFromSession = useCallback(async (session) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*, batches(name)')
      .eq('id', session.user.id)
      .single();

    if (error || !profile) throw new Error('Your institutional profile could not be loaded.');

    return {
      id: session.user.id,
      email: session.user.email,
      identifier: profile.identifier,
      name: profile.full_name,
      role: profile.role,
      batchName: profile.batches?.name || 'Unassigned',
      status: profile.status,
    };
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) setCurrentUser(await buildUserFromSession(session));
      } catch (error) {
        console.warn('Session restore failed:', error.message);
      }
    };

    restoreSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setStudentProfile(null);
        setFacultyAllocations([]);
        setStudentSubjects([]);
        setSelectedSubject(null);
        setPracticals([]);
        setCurrentPractical(null);
        setSubmissions([]);
      }
      if (event === 'SIGNED_IN' && session?.user) {
        try { setCurrentUser(await buildUserFromSession(session)); } catch (_) {}
      }
    });

    return () => subscription.unsubscribe();
  }, [buildUserFromSession]);

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    setIsLoadingData(true);
    setDataError(null);

    try {
      if (currentUser.role === 'student') {
        const [profile, subjects, ownSubmissions] = await Promise.all([
          getStudentProfile(currentUser.id),
          getSubjectsForStudent(currentUser.id),
          getSubmissions(currentUser.id),
        ]);
        setStudentProfile(profile);
        setStudentSubjects(subjects);
        setSubmissions(ownSubmissions);
      } else if (currentUser.role === 'faculty') {
        const [allocations, authorizedSubmissions] = await Promise.all([
          getFacultyAllocations(currentUser.id),
          getSubmissions(),
        ]);
        setFacultyAllocations(allocations);
        setSubmissions(authorizedSubmissions);
        const subjectIds = [...new Set(allocations.map((a) => a.subject_id))];
        const groups = await Promise.all(subjectIds.map((id) => getPracticalsBySubject(id)));
        setPracticals(groups.flat());
      }
    } catch (error) {
      setDataError(error.message || 'Failed to synchronize with the database.');
    } finally {
      setIsLoadingData(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) loadData();
  }, [currentUser, loadData]);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setStudentView('dashboard');
    addToast('Signed in successfully.', 'success');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleSelectSubject = async (subject) => {
    try {
      setIsLoadingData(true);
      const subjectPracticals = await getPracticalsBySubject(subject.id);
      setSelectedSubject(subject);
      setPracticals(subjectPracticals);
      setCurrentPractical(subjectPracticals[0] || null);
      setStudentView('dashboard');
    } catch (error) {
      addToast(error.message, 'danger');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleSelectPractical = (practical) => {
    setCurrentPractical(practical);
    setCode(practical.starterCodes?.[language] || practical.starterCodes?.cpp || '');
    setEvaluationResult(null);
    setEvaluationPhase('idle');
    setEvaluationProgress(0);
    setActiveTestIndex(-1);
    setIsSubmitted(false);
    setStdoutMessage('');
  };

  const handleLanguageChange = (nextLanguage) => {
    setLanguage(nextLanguage);
    setCode(currentPractical?.starterCodes?.[nextLanguage] || currentPractical?.starterCodes?.cpp || '');
  };

  const handleCodeChange = (nextCode) => {
    setCode(nextCode);
    setIsAutoSaving(true);
    setTimeout(() => setIsAutoSaving(false), 600);
  };

  const handleRunCode = async () => {
    if (!currentPractical || !currentUser) return;
    setIsRunning(true);
    setEvaluationPhase('executing');
    setEvaluationProgress(20);
    setEvaluationResult(null);

    try {
      const languageMap = { cpp: 54, c: 50, python: 71, java: 62 };
      const result = await evaluateSubmission({
        student_id: currentUser.id,
        practical_id: currentPractical.id,
        language_id: languageMap[language] || 54,
        source_code: code,
        attempt_count: 1,
        time_spent_seconds: 0,
        test_cases: currentPractical.testCases || [],
      });

      setEvaluationResult(result);
      setEvaluationPhase(result.status === 'Passed' ? 'completed' : 'failed');
      setEvaluationProgress(100);
      setStdoutMessage('Status: ' + result.status + '\nTest cases: ' + result.passed_test_cases + '/' + result.total_test_cases);
    } catch (error) {
      setEvaluationPhase('failed');
      setStdoutMessage('Evaluation failed: ' + error.message);
      addToast(error.message || 'Evaluation service is unavailable.', 'danger');
    } finally {
      setIsRunning(false);
      setActiveTestIndex(-1);
    }
  };

  const handleSubmitPractical = async () => {
    if (!evaluationResult || !currentPractical) {
      addToast('Run the practical before submitting it.', 'warning');
      return;
    }

    try {
      const focusState = focusTracker.getState();
      const newSubmission = await submitStudentPractical({
        studentId: currentUser.id,
        prn: currentUser.identifier,
        studentName: currentUser.name,
        rollNumber: currentUser.identifier,
        practicalId: currentPractical.id,
        practicalTitle: currentPractical.title,
        language,
        codingMarks: evaluationResult.coding_marks_awarded || 0,
        passedCount: evaluationResult.passed_test_cases || 0,
        totalCount: evaluationResult.total_test_cases || 0,
        timeSpentSeconds: 0,
        focusBlurEvents: focusState.blurEventsCount || 0,
        sourceCode: code,
      });
      setSubmissions((prev) => [newSubmission, ...prev]);
      setIsSubmitted(true);
      addToast('Practical submitted successfully.', 'success');
    } catch (error) {
      addToast(error.message, 'danger');
    }
  };

  const handleSaveGrade = async (submissionId, gradeData) => {
    try {
      await gradeSubmission(submissionId, { ...gradeData, gradedBy: currentUser.id });
      setSubmissions(await getSubmissions());
      addToast('Evaluation saved successfully.', 'success');
    } catch (error) {
      addToast(error.message, 'danger');
    }
  };

  const handleCreateAssignment = async ({ title, practicalId }) => {
    if (!assignmentContext || !currentUser) return;
    try {
      await createAssignment({
        facultyId: currentUser.id,
        subjectId: assignmentContext.subject.id,
        batchId: assignmentContext.batchId,
        practicalId,
        title,
      });
      setAssignmentContext(null);
      addToast('Assignment created successfully.', 'success');
    } catch (error) {
      addToast(error.message, 'danger');
    }
  };

  if (!currentUser) return <LoginView onLoginSuccess={handleLoginSuccess} />;

  const batchMetrics = computeBatchMetrics(submissions);

  return (
    <div className="app-root">
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        studentView={studentView}
        onStudentViewChange={setStudentView}
        currentPractical={currentPractical}
        onOpenPracticalModal={() => setIsPracticalModalOpen(true)}
        onOpenAuditDrawer={() => setIsAuditDrawerOpen(true)}
        onRunCode={handleRunCode}
        onSubmitPractical={handleSubmitPractical}
        onExportGradebook={() => exportGradebookCSV(submissions, selectedSubject?.code || facultyAllocations[0]?.subjects?.code || 'EduLab')}
        isRunning={isRunning}
        isSubmitted={isSubmitted}
      />

      {currentUser.role === 'student' ? (
        studentView === 'dashboard' ? (
          <StudentDashboard
            currentUser={currentUser}
            studentProfile={studentProfile}
            submissions={submissions}
            currentPractical={currentPractical}
            practicals={practicals}
            subjects={studentSubjects}
            onSelectSubject={handleSelectSubject}
            isLoading={isLoadingData}
            error={dataError}
            onRetry={loadData}
            onContinuePractical={(practical) => { if (practical) handleSelectPractical(practical); setStudentView('workspace'); }}
            onSelectPractical={(practical) => { handleSelectPractical(practical); setStudentView('workspace'); }}
          />
        ) : (
          <StudentWorkspace
            practical={currentPractical}
            language={language}
            onLanguageChange={handleLanguageChange}
            code={code}
            onCodeChange={handleCodeChange}
            onResetCode={() => setIsResetConfirmModalOpen(true)}
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
          practicals={practicals}
          batchMetrics={batchMetrics}
          isLoading={isLoadingData}
          error={dataError}
          onRetry={loadData}
          onSaveGrade={handleSaveGrade}
          onCreateAssignment={(context) => {
            const batch = context.subject.allocations.find((a) => a.batch_id === context.batchId)?.batches;
            setAssignmentContext({ ...context, batchName: batch?.name || 'Selected' });
          }}
        />
      )}

      <PracticalModal
        isOpen={isPracticalModalOpen}
        onClose={() => setIsPracticalModalOpen(false)}
        practicals={practicals}
        activePracticalId={currentPractical?.id}
        onSelectPractical={handleSelectPractical}
      />

      <CreateAssignmentModal
        isOpen={Boolean(assignmentContext)}
        onClose={() => setAssignmentContext(null)}
        context={assignmentContext}
        onCreate={handleCreateAssignment}
      />

      <Modal
        isOpen={isResetConfirmModalOpen}
        onClose={() => setIsResetConfirmModalOpen(false)}
        title="Reset Editor"
        footer={<><Button variant="secondary" onClick={() => setIsResetConfirmModalOpen(false)}>Cancel</Button><Button variant="danger" onClick={() => { handleSelectPractical(currentPractical); setIsResetConfirmModalOpen(false); }}>Reset</Button></>}
      >
        <p>Reset the editor to the practical's starter code?</p>
      </Modal>

      <AuditLogDrawer isOpen={isAuditDrawerOpen} onClose={() => setIsAuditDrawerOpen(false)} />
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
