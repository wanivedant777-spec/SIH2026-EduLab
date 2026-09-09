import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Award,
  ShieldAlert,
  Download,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Users,
  BookOpen,
  Clock,
  CheckCircle,
  BarChart3,
  TrendingDown,
  Eye,
  FileText,
  Activity,
  ChevronRight,
  Search,
  X,
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

// ── Helpers ──────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getFacultyDisplayName(user) {
  if (!user) return 'Faculty';
  return user.name || user.identifier || 'Faculty';
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return '—';
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return then.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ── Component ────────────────────────────────────────────────────────────
export default function FacultyDashboard({
  currentUser,
  activeNav = 'dashboard',
  facultyAllocations: _initialAllocations = [],
  isLoading: _initialLoading = false,
  error: parentError = null,
  onRetry: parentRetry,
  onSaveGrade: parentSaveGrade,
  onNavigate,
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
  const [searchQuery, setSearchQuery] = useState('');

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

  // ── Computed Metrics ───────────────────────────────────────────────────
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
          submissions: [s],
          latestScore: s.totalMarks !== undefined && s.totalMarks !== null ? `${s.totalMarks} / 10.0 M` : `${s.codingMarks || 0} / 3.0 M`,
          status: s.status || 'Submitted',
        });
      } else {
        const item = map.get(key);
        item.submissionsCount += 1;
        item.submissions.push(s);
      }
    });
    return Array.from(map.values());
  }, [submissions]);

  const flaggedCount = useMemo(
    () => submissions.filter((s) => (s.focusBlurEvents || 0) > 0).length,
    [submissions]
  );

  const gradedSubmissionsCount = useMemo(
    () => submissions.filter((s) => s.status === 'Graded').length,
    [submissions]
  );

  const pendingSubmissions = useMemo(
    () => submissions.filter((s) => s.status !== 'Graded'),
    [submissions]
  );

  const avgBatchCodingMarks = useMemo(() => {
    if (submissions.length === 0) return '0.0';
    const sum = submissions.reduce((acc, s) => acc + (parseFloat(s.codingMarks) || 0), 0);
    return (sum / submissions.length).toFixed(1);
  }, [submissions]);

  const avgTotalMarks = useMemo(() => {
    const graded = submissions.filter((s) => s.totalMarks != null);
    if (graded.length === 0) return null;
    const sum = graded.reduce((acc, s) => acc + parseFloat(s.totalMarks), 0);
    return (sum / graded.length).toFixed(1);
  }, [submissions]);

  // Practical-level progress
  const practicalProgress = useMemo(() => {
    const practicalMap = new Map();

    // Build from assignments
    assignments.forEach((a) => {
      const key = a.practicalId || a.id;
      if (!practicalMap.has(key)) {
        practicalMap.set(key, {
          id: key,
          title: a.title || a.practicalTitle || `Practical`,
          practicalNumber: a.practicalNumber || null,
          dueAt: a.dueAt,
          totalStudents: uniqueStudents.length,
          submittedCount: 0,
          gradedCount: 0,
        });
      }
    });

    // Count submissions per practical
    submissions.forEach((s) => {
      const pKey = s.practicalId || s.assignmentId;
      if (pKey && practicalMap.has(pKey)) {
        const p = practicalMap.get(pKey);
        p.submittedCount += 1;
        if (s.status === 'Graded') p.gradedCount += 1;
      } else if (pKey) {
        practicalMap.set(pKey, {
          id: pKey,
          title: s.practicalTitle || s.assignmentTitle || `Practical`,
          practicalNumber: s.practicalNumber || null,
          dueAt: null,
          totalStudents: uniqueStudents.length,
          submittedCount: 1,
          gradedCount: s.status === 'Graded' ? 1 : 0,
        });
      }
    });

    return Array.from(practicalMap.values()).sort((a, b) => {
      if (a.practicalNumber && b.practicalNumber) return a.practicalNumber - b.practicalNumber;
      return 0;
    });
  }, [assignments, submissions, uniqueStudents.length]);

  // Performance distribution
  const performanceDistribution = useMemo(() => {
    const brackets = {
      excellent: { label: 'Excellent', range: '≥ 8.5', count: 0 },
      proficient: { label: 'Proficient', range: '7.0 – 8.4', count: 0 },
      developing: { label: 'Developing', range: '< 7.0', count: 0 },
      inactive: { label: 'Not Submitted', range: '—', count: 0 },
    };

    // Students with at least one graded submission
    const studentScores = new Map();
    submissions.forEach((s) => {
      const key = s.studentId || s.prn || s.studentName;
      if (s.totalMarks != null) {
        const current = studentScores.get(key);
        const score = parseFloat(s.totalMarks);
        if (!current || score > current) studentScores.set(key, score);
      }
    });

    studentScores.forEach((score) => {
      if (score >= 8.5) brackets.excellent.count++;
      else if (score >= 7.0) brackets.proficient.count++;
      else brackets.developing.count++;
    });

    // Students with submissions but no grades
    const noGradeStudents = uniqueStudents.filter(
      (st) => !studentScores.has(st.id)
    );
    brackets.inactive.count = noGradeStudents.length;

    return brackets;
  }, [submissions, uniqueStudents]);

  // Students needing attention
  const studentsNeedingAttention = useMemo(() => {
    const attention = [];

    uniqueStudents.forEach((st) => {
      const reasons = [];
      const studentSubs = st.submissions || [];

      // Check focus/blur flags
      const blurSubs = studentSubs.filter((s) => (s.focusBlurEvents || 0) > 0);
      if (blurSubs.length > 0) {
        reasons.push({
          type: 'integrity',
          text: `${blurSubs.length} submission${blurSubs.length > 1 ? 's' : ''} with focus/blur events`,
        });
      }

      // Check for low coding scores
      const lowScoreSubs = studentSubs.filter(
        (s) => s.codingMarks != null && parseFloat(s.codingMarks) < 1.5
      );
      if (lowScoreSubs.length > 0) {
        reasons.push({
          type: 'performance',
          text: `Low auto-code score on ${lowScoreSubs.length} practical${lowScoreSubs.length > 1 ? 's' : ''}`,
        });
      }

      // Check if only 1 submission while others have multiple
      if (uniqueStudents.length > 1) {
        const avgSubs = submissions.length / uniqueStudents.length;
        if (st.submissionsCount < avgSubs * 0.5 && avgSubs >= 2) {
          reasons.push({
            type: 'activity',
            text: `Only ${st.submissionsCount} submission${st.submissionsCount === 1 ? '' : 's'} (batch average: ${Math.round(avgSubs)})`,
          });
        }
      }

      if (reasons.length > 0) {
        attention.push({ ...st, reasons });
      }
    });

    return attention;
  }, [uniqueStudents, submissions]);

  // Learning gaps
  const learningGaps = useMemo(() => {
    const gaps = [];
    practicalProgress.forEach((p) => {
      if (p.submittedCount > 0) {
        // Check for practicals with low average coding scores
        const pracSubs = submissions.filter(
          (s) => (s.practicalId || s.assignmentId) === p.id
        );
        if (pracSubs.length > 0) {
          const avgCoding = pracSubs.reduce((acc, s) => acc + (parseFloat(s.codingMarks) || 0), 0) / pracSubs.length;
          const passRate = pracSubs.filter((s) => parseFloat(s.codingMarks) >= 1.5).length / pracSubs.length;

          if (passRate < 0.7 || avgCoding < 1.5) {
            gaps.push({
              practical: p.title,
              practicalNumber: p.practicalNumber,
              avgScore: avgCoding.toFixed(1),
              passRate: Math.round(passRate * 100),
              submissionsCount: pracSubs.length,
              recommendation: avgCoding < 1.0
                ? 'Consider re-teaching core concepts before next practical'
                : 'Review edge cases and boundary conditions with batch',
            });
          }
        }
      }
    });
    return gaps;
  }, [practicalProgress, submissions]);

  // Recent activity
  const recentActivity = useMemo(() => {
    return [...submissions]
      .sort((a, b) => new Date(b.submittedAt || b.createdAt) - new Date(a.submittedAt || a.createdAt))
      .slice(0, 8)
      .map((s) => ({
        id: s.id,
        studentName: s.studentName || 'Student',
        prn: s.prn || s.rollNumber || '—',
        practical: s.practicalTitle || s.assignmentTitle || 'Practical',
        practicalNumber: s.practicalNumber,
        time: s.submittedAt || s.createdAt,
        status: s.status,
        codingMarks: s.codingMarks,
        totalMarks: s.totalMarks,
      }));
  }, [submissions]);

  // Search filter
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return uniqueStudents;
    const q = searchQuery.toLowerCase();
    return uniqueStudents.filter(
      (st) =>
        (st.name || '').toLowerCase().includes(q) ||
        (st.prn || '').toLowerCase().includes(q)
    );
  }, [uniqueStudents, searchQuery]);

  // ── Predicates ─────────────────────────────────────────────────────────
  const isDashboard = activeNav === 'dashboard';
  const hasContext = selectedSubject && selectedBatch;

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
            FACULTY GREETING & ACADEMIC CONTEXT
            ========================================================= */}
        <header className="faculty-command-header compact-header">
          <div className="command-header-left">
            <div className="faculty-context-tag">
              <span className="context-dot" />
              <span>ACADEMIC INTELLIGENCE WORKSPACE</span>
            </div>
            <h1 className="faculty-command-title">
              {getGreeting()}, {getFacultyDisplayName(currentUser)}
            </h1>
            <p className="faculty-command-subtitle">
              {selectedSubject
                ? `${selectedSubject.code} · ${selectedSubject.name}`
                : 'Select a subject to begin'
              }
              {selectedBatch ? ` · Batch ${selectedBatch.name}` : ''}
              {' · '}AICTE 10-Mark Rubric Model
            </p>
          </div>

          <div className="command-header-actions">
            {/* Search */}
            {hasContext && isDashboard && (
              <div className="fd-search-wrap">
                <Search size={14} className="fd-search-icon" />
                <input
                  type="text"
                  className="fd-search-input"
                  placeholder="Search students…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="fd-search-clear" onClick={() => setSearchQuery('')}>
                    <X size={12} />
                  </button>
                )}
              </div>
            )}

            <Button
              variant="secondary"
              size="sm"
              icon={ShieldAlert}
              onClick={() => setIsAuditOpen(true)}
              title="Open focus and blur integrity telemetry"
            >
              Audit ({flaggedCount})
            </Button>

            <Button
              variant="primary"
              size="sm"
              icon={Download}
              onClick={handleExportCSV}
              title="Export complete 10-Mark Rubric Gradebook for active batch"
              disabled={submissions.length === 0}
            >
              Export Gradebook
            </Button>
          </div>
        </header>

        {/* =========================================================
            SUBJECT & BATCH SELECTORS
            ========================================================= */}
        <section className="faculty-workflow-step">
          <FacultySubjectSelector
            subjects={subjects}
            selectedSubject={selectedSubject}
            onSelectSubject={handleSelectSubject}
            isLoading={isLoadingContext}
          />
        </section>

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
            DASHBOARD VIEW — Academic Intelligence
            ========================================================= */}
        {hasContext && isDashboard && (
          <>
            {/* ── Overview Metrics ────────────────────────────────── */}
            <section className="fd-overview-section">
              <div className="faculty-metrics-banner" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                {/* Active Students */}
                <div className="faculty-metric-card">
                  <div className="metric-card-top">
                    <span className="metric-card-label">Active Students</span>
                    <div className="metric-icon-wrap icon-primary">
                      <Users size={14} />
                    </div>
                  </div>
                  <div className="metric-card-number-row">
                    <span className="metric-card-val">{uniqueStudents.length}</span>
                    <span className="metric-card-unit">enrolled</span>
                  </div>
                  <span className="metric-card-subtext">
                    Batch {selectedBatch.name}
                  </span>
                </div>

                {/* Practical Completion */}
                <div className="faculty-metric-card">
                  <div className="metric-card-top">
                    <span className="metric-card-label">Practical Completion</span>
                    <div className="metric-icon-wrap icon-success">
                      <CheckCircle size={14} />
                    </div>
                  </div>
                  <div className="metric-card-number-row">
                    <span className="metric-card-val">{submissions.length}</span>
                    <span className="metric-card-unit">
                      across {practicalProgress.length} practical{practicalProgress.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className="metric-card-subtext">
                    {gradedSubmissionsCount} evaluated · {submissions.length - gradedSubmissionsCount} pending
                  </span>
                </div>

                {/* Pending Evaluations */}
                <div
                  className={`faculty-metric-card ${pendingSubmissions.length > 0 ? 'metric-card-interactive' : ''}`}
                  onClick={() => {
                    if (pendingSubmissions.length > 0 && onNavigate) onNavigate('evaluations');
                  }}
                >
                  <div className="metric-card-top">
                    <span className="metric-card-label">Pending Evaluations</span>
                    <div className={`metric-icon-wrap ${pendingSubmissions.length > 0 ? 'icon-warning' : 'icon-success'}`}>
                      <Clock size={14} />
                    </div>
                  </div>
                  <div className="metric-card-number-row">
                    <span className="metric-card-val" style={{ color: pendingSubmissions.length > 0 ? 'var(--warning-text)' : undefined }}>
                      {pendingSubmissions.length}
                    </span>
                    <span className="metric-card-unit">awaiting review</span>
                  </div>
                  <span className="metric-card-subtext">
                    {pendingSubmissions.length > 0 ? 'Click to open evaluation queue' : 'All evaluations complete'}
                  </span>
                </div>

                {/* Average Performance */}
                <div className="faculty-metric-card">
                  <div className="metric-card-top">
                    <span className="metric-card-label">Average Performance</span>
                    <div className="metric-icon-wrap icon-cyan">
                      <BarChart3 size={14} />
                    </div>
                  </div>
                  <div className="metric-card-number-row">
                    <span className="metric-card-val">
                      {avgTotalMarks || avgBatchCodingMarks}
                    </span>
                    <span className="metric-card-unit">
                      / {avgTotalMarks ? '10.0 M' : '3.0 M'}
                    </span>
                  </div>
                  <span className="metric-card-subtext">
                    {avgTotalMarks ? 'Full 10-Mark Rubric average' : 'Auto-coding score average'}
                  </span>
                </div>
              </div>
            </section>

            {/* ── Two Column: Practical Progress + Performance ──── */}
            <section className="fd-two-col">
              {/* Section 1: Practical Progress */}
              <div className="fd-section-card">
                <div className="fd-section-header">
                  <div className="fd-section-title-row">
                    <BookOpen size={15} />
                    <h3>Practical Progress</h3>
                    <span className="fd-section-count">{practicalProgress.length}</span>
                  </div>
                  {assignments.length > 0 && (
                    <button
                      className="fd-link-btn"
                      onClick={() => onNavigate && onNavigate('practicals')}
                    >
                      View all <ChevronRight size={12} />
                    </button>
                  )}
                </div>

                <div className="fd-section-body">
                  {practicalProgress.length === 0 ? (
                    <div className="fd-empty-state">
                      <BookOpen size={24} style={{ opacity: 0.4 }} />
                      <p>No practicals assigned to this batch yet.</p>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsCreateAssignmentOpen(true)}
                      >
                        Assign Practical
                      </Button>
                    </div>
                  ) : (
                    <div className="fd-practical-list">
                      {practicalProgress.map((p) => {
                        const completionPct = p.totalStudents > 0
                          ? Math.round((p.submittedCount / p.totalStudents) * 100)
                          : 0;
                        return (
                          <div key={p.id} className="fd-practical-item">
                            <div className="fd-practical-info">
                              <span className="fd-practical-num">
                                {p.practicalNumber ? `P${String(p.practicalNumber).padStart(2, '0')}` : '—'}
                              </span>
                              <div className="fd-practical-detail">
                                <span className="fd-practical-title">{p.title}</span>
                                <span className="fd-practical-meta">
                                  {p.submittedCount} submitted · {p.gradedCount} graded
                                  {p.dueAt && ` · Due ${new Date(p.dueAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                                </span>
                              </div>
                            </div>
                            <div className="fd-practical-progress">
                              <div className="fd-progress-bar">
                                <div
                                  className="fd-progress-fill"
                                  style={{ width: `${completionPct}%` }}
                                />
                              </div>
                              <span className="fd-progress-pct">{completionPct}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: Student Performance Distribution */}
              <div className="fd-section-card">
                <div className="fd-section-header">
                  <div className="fd-section-title-row">
                    <BarChart3 size={15} />
                    <h3>Performance Distribution</h3>
                  </div>
                </div>

                <div className="fd-section-body">
                  {uniqueStudents.length === 0 ? (
                    <div className="fd-empty-state">
                      <BarChart3 size={24} style={{ opacity: 0.4 }} />
                      <p>No student data available yet.</p>
                    </div>
                  ) : (
                    <div className="fd-distribution">
                      {Object.entries(performanceDistribution).map(([key, bracket]) => {
                        const total = uniqueStudents.length;
                        const pct = total > 0 ? Math.round((bracket.count / total) * 100) : 0;
                        return (
                          <div key={key} className="fd-dist-row">
                            <div className="fd-dist-label">
                              <span className={`fd-dist-dot fd-dist-dot-${key}`} />
                              <span className="fd-dist-name">{bracket.label}</span>
                              <span className="fd-dist-range">{bracket.range}</span>
                            </div>
                            <div className="fd-dist-bar-wrap">
                              <div className="fd-dist-bar">
                                <div
                                  className={`fd-dist-fill fd-dist-fill-${key}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="fd-dist-count">
                                {bracket.count} <span className="fd-dist-pct">({pct}%)</span>
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ── Section 3: Students Needing Attention ────────── */}
            {studentsNeedingAttention.length > 0 && (
              <section className="fd-section-card fd-attention-section">
                <div className="fd-section-header">
                  <div className="fd-section-title-row">
                    <AlertTriangle size={15} style={{ color: 'var(--warning-text)' }} />
                    <h3>Students Needing Attention</h3>
                    <span className="fd-section-count fd-count-warning">{studentsNeedingAttention.length}</span>
                  </div>
                  <button
                    className="fd-link-btn"
                    onClick={() => onNavigate && onNavigate('students')}
                  >
                    View roster <ChevronRight size={12} />
                  </button>
                </div>

                <div className="fd-attention-list">
                  {studentsNeedingAttention.slice(0, 5).map((st) => (
                    <div key={st.id} className="fd-attention-item">
                      <div className="fd-attention-student">
                        <span className="fd-attention-name">{st.name}</span>
                        <span className="fd-attention-prn">{st.prn}</span>
                      </div>
                      <div className="fd-attention-reasons">
                        {st.reasons.map((r, i) => (
                          <div key={i} className={`fd-reason fd-reason-${r.type}`}>
                            {r.type === 'integrity' && <ShieldAlert size={11} />}
                            {r.type === 'performance' && <TrendingDown size={11} />}
                            {r.type === 'activity' && <Clock size={11} />}
                            <span>{r.text}</span>
                          </div>
                        ))}
                      </div>
                      <button
                        className="fd-attention-action"
                        onClick={() => onNavigate && onNavigate('students')}
                      >
                        <Eye size={12} />
                        View
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Section 4: Pending Evaluations ──────────────── */}
            {pendingSubmissions.length > 0 && (
              <section className="fd-section-card">
                <div className="fd-section-header">
                  <div className="fd-section-title-row">
                    <Award size={15} style={{ color: 'var(--accent-text)' }} />
                    <h3>Pending Evaluations</h3>
                    <span className="fd-section-count fd-count-warning">{pendingSubmissions.length}</span>
                  </div>
                  <button
                    className="fd-link-btn"
                    onClick={() => onNavigate && onNavigate('evaluations')}
                  >
                    Open evaluation queue <ChevronRight size={12} />
                  </button>
                </div>

                <div className="fd-pending-list">
                  {pendingSubmissions.slice(0, 5).map((s) => (
                    <div key={s.id} className="fd-pending-item">
                      <div className="fd-pending-info">
                        <span className="fd-pending-student">{s.studentName || 'Student'}</span>
                        <span className="fd-pending-prn">{s.prn || s.rollNumber || '—'}</span>
                      </div>
                      <div className="fd-pending-practical">
                        <FileText size={12} />
                        <span>{s.practicalTitle || s.assignmentTitle || 'Practical'}</span>
                      </div>
                      <div className="fd-pending-score">
                        <span className="fd-pending-code-score">
                          {s.codingMarks != null ? `${s.codingMarks}/3.0` : '—'}
                        </span>
                        <span className="fd-pending-time">{formatRelativeTime(s.submittedAt || s.createdAt)}</span>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenGrading(s)}
                      >
                        Review &amp; Grade
                      </Button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Two Column: Learning Gaps + Recent Activity ── */}
            <section className="fd-two-col">
              {/* Section 5: Learning Gaps */}
              <div className="fd-section-card">
                <div className="fd-section-header">
                  <div className="fd-section-title-row">
                    <TrendingDown size={15} style={{ color: 'var(--danger-text)' }} />
                    <h3>Learning Gaps</h3>
                  </div>
                </div>

                <div className="fd-section-body">
                  {learningGaps.length === 0 ? (
                    <div className="fd-empty-state fd-empty-positive">
                      <CheckCircle size={24} style={{ color: 'var(--success-text)', opacity: 0.6 }} />
                      <p>No significant learning gaps detected.</p>
                      <span className="fd-empty-sub">All practicals are performing within expected ranges.</span>
                    </div>
                  ) : (
                    <div className="fd-gaps-list">
                      {learningGaps.map((gap, i) => (
                        <div key={i} className="fd-gap-item">
                          <div className="fd-gap-header">
                            <span className="fd-gap-practical">
                              {gap.practicalNumber ? `P${String(gap.practicalNumber).padStart(2, '0')} · ` : ''}
                              {gap.practical}
                            </span>
                            <Badge variant="danger" size="sm">{gap.passRate}% pass rate</Badge>
                          </div>
                          <div className="fd-gap-stats">
                            <span>Avg coding: {gap.avgScore}/3.0</span>
                            <span>·</span>
                            <span>{gap.submissionsCount} submissions</span>
                          </div>
                          <p className="fd-gap-recommendation">{gap.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Section 6: Recent Activity */}
              <div className="fd-section-card">
                <div className="fd-section-header">
                  <div className="fd-section-title-row">
                    <Activity size={15} />
                    <h3>Recent Activity</h3>
                  </div>
                </div>

                <div className="fd-section-body">
                  {recentActivity.length === 0 ? (
                    <div className="fd-empty-state">
                      <Activity size={24} style={{ opacity: 0.4 }} />
                      <p>No recent activity in this batch.</p>
                    </div>
                  ) : (
                    <div className="fd-activity-list">
                      {recentActivity.map((a) => (
                        <div key={a.id} className="fd-activity-item">
                          <div className="fd-activity-dot-line">
                            <span className={`fd-activity-dot ${a.status === 'Graded' ? 'fd-dot-graded' : 'fd-dot-submitted'}`} />
                            {/* Line connector rendered by CSS */}
                          </div>
                          <div className="fd-activity-content">
                            <div className="fd-activity-main">
                              <span className="fd-activity-name">{a.studentName}</span>
                              <span className="fd-activity-action">
                                {a.status === 'Graded' ? 'evaluated' : 'submitted'}
                              </span>
                              <span className="fd-activity-practical">
                                {a.practicalNumber ? `P${String(a.practicalNumber).padStart(2, '0')}` : a.practical}
                              </span>
                            </div>
                            <div className="fd-activity-meta">
                              <span className="fd-activity-time">{formatRelativeTime(a.time)}</span>
                              {a.totalMarks != null && (
                                <Badge variant="success" size="sm">{a.totalMarks}/10.0</Badge>
                              )}
                              {a.totalMarks == null && a.codingMarks != null && (
                                <Badge variant="neutral" size="sm">{a.codingMarks}/3.0</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ── Empty Dashboard State ─────────────────────────── */}
            {submissions.length === 0 && assignments.length === 0 && !isLoadingItems && (
              <section className="fd-section-card fd-empty-dashboard">
                <div className="fd-empty-state fd-empty-hero">
                  <BookOpen size={32} style={{ opacity: 0.3 }} />
                  <h3>No Activity in Batch {selectedBatch.name}</h3>
                  <p>Assign practicals to this batch to begin tracking student progress and evaluation.</p>
                  <Button
                    variant="primary"
                    icon={BookOpen}
                    onClick={() => setIsCreateAssignmentOpen(true)}
                  >
                    Assign First Practical
                  </Button>
                </div>
              </section>
            )}
          </>
        )}

        {/* =========================================================
            STUDENTS VIEW: Batch Student Roster
            ========================================================= */}
        {hasContext && activeNav === 'students' && (
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
                  {filteredStudents.length} Active Students
                </Badge>
              </CardHeader>
              <CardContent style={{ padding: '0' }}>
                {filteredStudents.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Users size={28} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>
                      {searchQuery ? 'No students match your search' : 'No Student Submissions Yet'}
                    </h3>
                    <p style={{ fontSize: '12.5px', margin: 0 }}>
                      {searchQuery
                        ? `No results for "${searchQuery}"`
                        : `Students enrolled in Batch ${selectedBatch.name} will be cataloged here once practicals are attempted.`
                      }
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
                      {filteredStudents.map((st) => (
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
        {hasContext && activeNav === 'practicals' && (
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
        {hasContext && (activeNav === 'submissions' || activeNav === 'evaluations') && (
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
                  Click &quot;Grade 10M Rubric&quot; to evaluate performing, journal, and viva marks
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
        {hasContext && activeNav === 'analytics' && (
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
