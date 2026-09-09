import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Award,
  ShieldAlert,
  Download,
  AlertTriangle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
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
            5. ASSIGNMENTS SECTION
            ========================================================= */}
        {selectedSubject && selectedBatch && (
          <section className="faculty-workflow-step">
            <FacultyAssignmentsSection
              assignments={assignments}
              isLoading={isLoadingItems}
              onOpenCreateAssignment={() => setIsCreateAssignmentOpen(true)}
            />
          </section>
        )}

        {/* =========================================================
            6. SUBMISSIONS & 10M EVALUATION QUEUE
            ========================================================= */}
        {selectedSubject && selectedBatch && (
          <section className="faculty-workflow-step">
            <div className="section-head-row" style={{ marginBottom: '14px' }}>
              <div className="section-title-wrap">
                <Award size={15} />
                <h3>Student Submissions · Batch {selectedBatch.name}</h3>
                <span className="section-count-tag">{submissions.length}</span>
              </div>
            </div>

            <SubmissionsQueue
              submissions={submissions}
              onOpenGrading={handleOpenGrading}
              onOpenAuditLogs={handleOpenAuditLogs}
            />
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
