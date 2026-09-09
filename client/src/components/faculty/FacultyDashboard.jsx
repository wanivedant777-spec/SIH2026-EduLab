import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Award,
  ShieldAlert,
  Download,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Users,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import FacultySubjectSelector from './FacultySubjectSelector';
import FacultyBatchSelector from './FacultyBatchSelector';
import FacultyActiveContext from './FacultyActiveContext';
import FacultyAssignmentsSection from './FacultyAssignmentsSection';
import CreateAssignmentModal from './CreateAssignmentModal';
import SubmissionsQueue from './SubmissionsQueue';
import GradingModal from './GradingModal';
import AuditLogDrawer from './AuditLogDrawer';
import Button from '../ui/Button';
import {
  getFacultySubjects,
  getFacultyBatchesForSubject,
  getFacultyAssignments,
  getFacultySubmissionsForBatch,
  createFacultyAssignment,
  getPracticalsBySubject,
  gradeSubmission,
  exportGradebookCSV,
} from '../../services/dataService';

export default function FacultyDashboard({
  currentUser,
  activeNav = 'dashboard',
  facultyAllocations: _initialAllocations = [],
  isLoading: _initialLoading = false,
  error: parentError = null,
  onRetry: parentRetry,
  onSaveGrade: parentSaveGrade,
}) {
  // Navigation & context state
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);

  // Academic items state
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [subjectPracticals, setSubjectPracticals] = useState([]);

  // UI state
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [error, setError] = useState(parentError);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [isGradingOpen, setIsGradingOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isCreateAssignmentOpen, setIsCreateAssignmentOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showNotification = useCallback((text) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  const facultyId = currentUser?.id;
  const currentSubjectId = selectedSubject?.id;
  const currentBatchId = selectedBatch?.id;

  // 1. Load allocated subjects when faculty user logs in
  const loadAllocatedSubjects = useCallback(async () => {
    if (!facultyId) return;
    setIsLoadingContext(true);
    setError(null);
    try {
      const subjs = await getFacultySubjects(facultyId);
      setSubjects(subjs);

      // Default to first subject if none selected
      setSelectedSubject((prev) => {
        if (prev && subjs.some((s) => s.id === prev.id)) return prev;
        return subjs.length > 0 ? subjs[0] : null;
      });
    } catch (err) {
      console.error('Failed to load faculty subjects:', err);
      setError(err.message || 'Failed to load allocated subjects from Supabase.');
    } finally {
      setIsLoadingContext(false);
    }
  }, [facultyId]);

  useEffect(() => {
    if (facultyId) {
      loadAllocatedSubjects();
    }
  }, [facultyId, loadAllocatedSubjects]);

  // 2. Load allocated batches when selected subject changes
  useEffect(() => {
    let isMounted = true;
    async function loadBatchesForSubject() {
      if (!facultyId || !currentSubjectId) {
        if (isMounted) {
          setBatches([]);
          setSelectedBatch(null);
        }
        return;
      }
      if (isMounted) setIsLoadingContext(true);
      try {
        const allocatedBatches = await getFacultyBatchesForSubject(facultyId, currentSubjectId);
        if (!isMounted) return;
        setBatches(allocatedBatches);

        // Default to first batch
        setSelectedBatch((prev) => {
          if (prev && allocatedBatches.some((b) => b.id === prev.id)) return prev;
          return allocatedBatches.length > 0 ? allocatedBatches[0] : null;
        });

        // Also fetch practicals cataloged for this subject for assignment creation
        const pracs = await getPracticalsBySubject(currentSubjectId);
        if (isMounted) setSubjectPracticals(pracs);
      } catch (err) {
        console.error('Failed to load batches for subject:', err);
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setIsLoadingContext(false);
      }
    }

    loadBatchesForSubject();
    return () => {
      isMounted = false;
    };
  }, [facultyId, currentSubjectId]);

  // 3. Load assignments and submissions strictly for the active subject + batch
  const loadBatchAcademicItems = useCallback(async () => {
    if (!facultyId || !currentSubjectId || !currentBatchId) {
      setAssignments([]);
      setSubmissions([]);
      return;
    }

    setIsLoadingItems(true);
    try {
      const [assigns, subs] = await Promise.all([
        getFacultyAssignments(facultyId, currentSubjectId, currentBatchId),
        getFacultySubmissionsForBatch(currentSubjectId, currentBatchId),
      ]);
      setAssignments(assigns);
      setSubmissions(subs);
    } catch (err) {
      console.error('Failed to load batch assignments/submissions:', err);
      setError(err.message);
    } finally {
      setIsLoadingItems(false);
    }
  }, [facultyId, currentSubjectId, currentBatchId]);

  useEffect(() => {
    if (facultyId && currentSubjectId && currentBatchId) {
      loadBatchAcademicItems();
    }
  }, [facultyId, currentSubjectId, currentBatchId, loadBatchAcademicItems]);

  // Handle subject change
  const handleSelectSubject = (subj) => {
    if (subj?.id === selectedSubject?.id) return;
    setSelectedSubject(subj);
  };

  // Handle batch change
  const handleSelectBatch = (batch) => {
    if (batch?.id === selectedBatch?.id) return;
    setSelectedBatch(batch);
  };

  // Create Assignment
  const handleCreateAssignment = async ({ practicalId, title, dueAt }) => {
    if (!currentUser?.id || !selectedSubject?.id || !selectedBatch?.id) {
      throw new Error('Active faculty subject and batch context required.');
    }

    const created = await createFacultyAssignment({
      facultyId: currentUser.id,
      subjectId: selectedSubject.id,
      batchId: selectedBatch.id,
      practicalId,
      title,
      dueAt,
    });

    setAssignments((prev) => [created, ...prev]);
    showNotification(`Assigned "${created.title}" to Batch ${selectedBatch.name}!`);
    return created;
  };

  // Open Grading Modal
  const handleOpenGrading = (sub) => {
    setSelectedSubmission(sub);
    setIsGradingOpen(true);
  };

  // Save 10M Rubric Grade
  const handleSaveGradeInternal = async (submissionId, gradeData) => {
    try {
      if (parentSaveGrade) {
        await parentSaveGrade(submissionId, gradeData);
      } else {
        await gradeSubmission(submissionId, {
          ...gradeData,
          gradedBy: currentUser?.name || currentUser?.identifier || 'Faculty Evaluator',
        });
      }

      showNotification('10-Mark Rubric Score recorded in Supabase!');
      // Reload items to update grades in table
      await loadBatchAcademicItems();
    } catch (err) {
      console.error('Error saving grade:', err);
      setError(`Failed to record grade: ${err.message}`);
    }
  };

  // Open Audit Drawer
  const handleOpenAuditLogs = (_sub) => {
    setIsAuditOpen(true);
  };

  // Export Batch Gradebook
  const handleExportCSV = () => {
    if (!selectedSubject || !selectedBatch) return;
    exportGradebookCSV(submissions, `${selectedSubject.code}_Batch_${selectedBatch.name}`);
    showNotification(`Exported Gradebook for Batch ${selectedBatch.name} (CSV format)`);
  };

  const flaggedCount = useMemo(
    () => submissions.filter((s) => (s.focusBlurEvents || 0) > 0).length,
    [submissions]
  );

  const uniqueStudents = useMemo(() => {
    const map = new Map();
    submissions.forEach((s) => {
      const key = s.studentId || s.prn || s.studentName;
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name: s.studentName || 'Student',
          prn: s.prn || s.rollNumber || '—',
          submissionsCount: 1,
          latestScore: s.totalMarks !== undefined && s.totalMarks !== null ? `${s.totalMarks} / 10.0 M` : `${s.codingMarks || 0} / 3.0 M`,
          status: s.status || 'Submitted',
        });
      } else {
        const item = map.get(key);
        item.submissionsCount += 1;
      }
    });
    return Array.from(map.values());
  }, [submissions]);

  const gradedSubmissionsCount = useMemo(
    () => submissions.filter((s) => s.status === 'Graded').length,
    [submissions]
  );

  const avgBatchCodingMarks = useMemo(() => {
    if (submissions.length === 0) return '0.0';
    const sum = submissions.reduce((acc, s) => acc + (parseFloat(s.codingMarks) || 0), 0);
    return (sum / submissions.length).toFixed(1);
  }, [submissions]);

  return (
    <div className="faculty-portal-root">
      <div className="faculty-portal-container">
        {/* Floating Notification Toast */}
        {toastMessage && (
          <div className="faculty-action-toast">
            <Sparkles size={14} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Database Notice Banner */}
        {error && (
          <div className="db-error-banner" style={{
            background: 'var(--danger-subtle)',
            border: '1px solid var(--danger-border)',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={18} color="var(--danger-text)" />
              <div>
                <strong style={{ color: 'var(--text-primary)', fontSize: '13.5px', display: 'block' }}>
                  Database Synchronization Notice
                </strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '12.5px' }}>{error}</span>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={() => {
                setError(null);
                loadAllocatedSubjects();
                loadBatchAcademicItems();
                if (parentRetry) parentRetry();
              }}
            >
              Retry
            </Button>
          </div>
        )}

        {/* =========================================================
            1. FACULTY HEADER
            ========================================================= */}
        <header className="faculty-command-header compact-header">
          <div className="command-header-left">
            <div className="faculty-context-tag">
              <span className="context-dot" />
              <span>FACULTY ACADEMIC CONSOLE</span>
            </div>
            <h1 className="faculty-command-title">
              Lab Practical Evaluation &amp; Grading
            </h1>
            <p className="faculty-command-subtitle">
              {currentUser?.name || currentUser?.identifier} · Authorized Faculty Evaluator · AICTE 10-Mark Rubric Model
            </p>
          </div>

          <div className="command-header-actions">
            <Button
              variant="secondary"
              size="sm"
              icon={ShieldAlert}
              onClick={() => setIsAuditOpen(true)}
              title="Open focus and blur integrity telemetry"
            >
              Audit Telemetry ({flaggedCount})
            </Button>

            <Button
              variant="primary"
              size="sm"
              icon={Download}
              onClick={handleExportCSV}
              title="Export complete 10-Mark Rubric Gradebook for active batch"
              disabled={submissions.length === 0}
            >
              Export Batch Gradebook
            </Button>
          </div>
        </header>

        {/* =========================================================
            2. SUBJECT SELECTOR
            ========================================================= */}
        <section className="faculty-workflow-step">
          <FacultySubjectSelector
            subjects={subjects}
            selectedSubject={selectedSubject}
            onSelectSubject={handleSelectSubject}
            isLoading={isLoadingContext}
          />
        </section>

        {/* =========================================================
            3. BATCH SELECTOR (Shows only when subject is selected)
            ========================================================= */}
        {selectedSubject && (
          <section className="faculty-workflow-step">
            <FacultyBatchSelector
              batches={batches}
              selectedBatch={selectedBatch}
              onSelectBatch={handleSelectBatch}
              isLoading={isLoadingContext}
            />
          </section>
        )}

        {/* =========================================================
            4. ACTIVE CONTEXT BANNER
            ========================================================= */}
        {selectedSubject && selectedBatch && (
          <section className="faculty-workflow-step">
            <FacultyActiveContext
              subject={selectedSubject}
              batch={selectedBatch}
              assignmentsCount={assignments.length}
              submissionsCount={submissions.length}
              onOpenCreateAssignment={() => setIsCreateAssignmentOpen(true)}
            />
          </section>
        )}

        {/* =========================================================
            STUDENTS VIEW: Batch Student Roster
            ========================================================= */}
        {selectedSubject && selectedBatch && activeNav === 'students' && (
          <section className="faculty-workflow-step">
            <Card surface="white">
              <CardHeader>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={16} color="var(--primary)" />
                  <CardTitle as="h2" style={{ fontSize: '15px' }}>
                    Student Roster · Batch {selectedBatch.name}
                  </CardTitle>
                </div>
                <Badge variant="primary" size="sm">
                  {uniqueStudents.length} Active Students
                </Badge>
              </CardHeader>
              <CardContent style={{ padding: '0' }}>
                {uniqueStudents.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Users size={28} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>
                      No Student Submissions Yet
                    </h3>
                    <p style={{ fontSize: '12.5px', margin: 0 }}>
                      Students enrolled in Batch {selectedBatch.name} will be cataloged here once practicals are attempted.
                    </p>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-app)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <th style={{ padding: '10px 16px', fontWeight: 600 }}>PRN / Identifier</th>
                        <th style={{ padding: '10px 16px', fontWeight: 600 }}>Student Name</th>
                        <th style={{ padding: '10px 16px', fontWeight: 600 }}>Submissions</th>
                        <th style={{ padding: '10px 16px', fontWeight: 600 }}>Latest Evaluation</th>
                        <th style={{ padding: '10px 16px', fontWeight: 600 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uniqueStudents.map((st) => (
                        <tr key={st.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--primary)' }}>
                            {st.prn}
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {st.name}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <Badge variant="neutral" size="sm">
                              {st.submissionsCount} Practical{st.submissionsCount === 1 ? '' : 's'}
                            </Badge>
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                            {st.latestScore}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <Badge variant={st.status === 'Graded' ? 'success' : 'warning'} size="sm">
                              {st.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {/* =========================================================
            PRACTICALS & ASSIGNMENTS VIEW
            ========================================================= */}
        {selectedSubject && selectedBatch && (activeNav === 'dashboard' || activeNav === 'practicals') && (
          <section className="faculty-workflow-step">
            <FacultyAssignmentsSection
              assignments={assignments}
              isLoading={isLoadingItems}
              onOpenCreateAssignment={() => setIsCreateAssignmentOpen(true)}
            />
          </section>
        )}

        {/* =========================================================
            SUBMISSIONS & EVALUATION QUEUE VIEW
            ========================================================= */}
        {selectedSubject && selectedBatch && (activeNav === 'dashboard' || activeNav === 'submissions' || activeNav === 'evaluations') && (
          <section className="faculty-workflow-step">
            <div className="section-head-row" style={{ marginBottom: '14px' }}>
              <div className="section-title-wrap">
                <Award size={15} />
                <h3>
                  {activeNav === 'evaluations' ? 'Evaluation & Grading Console' : 'Student Submissions'} · Batch {selectedBatch.name}
                </h3>
                <span className="section-count-tag">{submissions.length}</span>
              </div>
              {activeNav === 'evaluations' && (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Click "Grade 10M Rubric" to evaluate performing, journal, and viva marks
                </span>
              )}
            </div>

            <SubmissionsQueue
              submissions={submissions}
              onOpenGrading={handleOpenGrading}
              onOpenAuditLogs={handleOpenAuditLogs}
            />
          </section>
        )}

        {/* =========================================================
            ANALYTICS VIEW
            ========================================================= */}
        {selectedSubject && selectedBatch && activeNav === 'analytics' && (
          <section className="faculty-workflow-step">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
                marginBottom: '20px',
              }}
            >
              <Card surface="white" style={{ padding: '18px 20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Total Batch Submissions
                </div>
                <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {submissions.length}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Batch {selectedBatch.name} · {selectedSubject.code}
                </div>
              </Card>

              <Card surface="white" style={{ padding: '18px 20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  10-Mark Rubrics Evaluated
                </div>
                <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--success)', marginTop: '4px' }}>
                  {gradedSubmissionsCount}{' '}
                  <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)' }}>
                    / {submissions.length}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {submissions.length > 0 ? `${Math.round((gradedSubmissionsCount / submissions.length) * 100)}% graded` : 'No submissions'}
                </div>
              </Card>

              <Card surface="white" style={{ padding: '18px 20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Avg Auto-Coding Score
                </div>
                <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--primary)', marginTop: '4px' }}>
                  {avgBatchCodingMarks}{' '}
                  <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)' }}>
                    / 3.0 M
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Judge0 automated pass average
                </div>
              </Card>

              <Card surface="white" style={{ padding: '18px 20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Focus / Blur Telemetry Flags
                </div>
                <div style={{ fontSize: '26px', fontWeight: 700, color: flaggedCount > 0 ? 'var(--warning)' : 'var(--text-primary)', marginTop: '4px' }}>
                  {flaggedCount}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Integrity blur events logged
                </div>
              </Card>
            </div>

            <Card surface="white" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    AICTE Institutional Gradebook Export
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                    Generate official CSV format gradebook including Student PRN, Name, 3M Auto-Code, 5M Journal, and 2M Viva marks.
                  </p>
                </div>
                <Button
                  variant="primary"
                  icon={Download}
                  onClick={handleExportCSV}
                  disabled={submissions.length === 0}
                >
                  Download CSV Gradebook
                </Button>
              </div>
            </Card>
          </section>
        )}

        {/* =========================================================
            MODALS & DRAWERS
            ========================================================= */}
        {/* Create Assignment Modal */}
        <CreateAssignmentModal
          isOpen={isCreateAssignmentOpen}
          onClose={() => setIsCreateAssignmentOpen(false)}
          subject={selectedSubject}
          batch={selectedBatch}
          practicals={subjectPracticals}
          onSubmitAssignment={handleCreateAssignment}
        />

        {/* 10-Mark Rubric Evaluation Modal */}
        <GradingModal
          key={selectedSubmission?.id || 'grading-modal'}
          isOpen={isGradingOpen}
          onClose={() => setIsGradingOpen(false)}
          submission={selectedSubmission}
          currentUser={currentUser}
          onSaveGrade={handleSaveGradeInternal}
        />

        {/* Focus / Blur Telemetry Drawer */}
        <AuditLogDrawer
          isOpen={isAuditOpen}
          onClose={() => setIsAuditOpen(false)}
        />
      </div>
    </div>
  );
}
