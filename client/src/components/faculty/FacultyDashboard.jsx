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
  TrendingUp,
  Eye,
  FileText,
  Activity,
  ChevronRight,
  Search,
  X,
  Filter,
  ArrowUpDown,
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

  // Students page filters
  const [studentsSearch, setStudentsSearch] = useState('');
  const [studentsPerformanceFilter, setStudentsPerformanceFilter] = useState('all');
  const [studentsStatusFilter, setStudentsStatusFilter] = useState('all');
  const [studentsSort, setStudentsSort] = useState('name');

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

  // Search filter (dashboard)
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return uniqueStudents;
    const q = searchQuery.toLowerCase();
    return uniqueStudents.filter(
      (st) =>
        (st.name || '').toLowerCase().includes(q) ||
        (st.prn || '').toLowerCase().includes(q)
    );
  }, [uniqueStudents, searchQuery]);

  // ── Enriched Students for Students Page ───────────────────────────────
  const enrichedStudents = useMemo(() => {
    const attentionMap = new Map();
    studentsNeedingAttention.forEach((st) => attentionMap.set(st.id, st.reasons));

    return uniqueStudents.map((st) => {
      const subs = st.submissions || [];
      const gradedSubs = subs.filter((s) => s.totalMarks != null);
      const avgScore = gradedSubs.length > 0
        ? (gradedSubs.reduce((acc, s) => acc + parseFloat(s.totalMarks), 0) / gradedSubs.length)
        : null;
      const avgCoding = subs.length > 0
        ? (subs.reduce((acc, s) => acc + (parseFloat(s.codingMarks) || 0), 0) / subs.length)
        : null;

      // Latest submission timestamp
      const sorted = [...subs].sort((a, b) =>
        new Date(b.submittedAt || b.createdAt) - new Date(a.submittedAt || a.createdAt)
      );
      const latestActivity = sorted[0]?.submittedAt || sorted[0]?.createdAt || null;
      const latestPractical = sorted[0]?.practicalTitle || sorted[0]?.assignmentTitle || null;

      // Determine learning status
      const reasons = attentionMap.get(st.id) || [];
      let learningStatus = 'on-track';
      if (reasons.length > 0) {
        learningStatus = 'needs-attention';
      } else if (avgScore != null && avgScore >= 7.0) {
        learningStatus = 'on-track';
      } else if (subs.length >= 2) {
        // Check trend: compare last 2 submissions
        const lastTwo = sorted.slice(0, 2);
        if (lastTwo.length === 2) {
          const s1 = parseFloat(lastTwo[0]?.codingMarks) || 0;
          const s0 = parseFloat(lastTwo[1]?.codingMarks) || 0;
          if (s1 > s0) learningStatus = 'improving';
        }
      }

      // Inactive detection
      if (latestActivity) {
        const daysSince = (Date.now() - new Date(latestActivity).getTime()) / 86400000;
        if (daysSince > 14 && subs.length < 2) learningStatus = 'inactive';
      }

      // Practical progress
      const completedPracticals = new Set(subs.map((s) => s.practicalId || s.assignmentId)).size;

      return {
        ...st,
        avgScore,
        avgCoding,
        latestActivity,
        latestPractical,
        learningStatus,
        reasons,
        completedPracticals,
      };
    });
  }, [uniqueStudents, studentsNeedingAttention]);

  // Students page overview metrics
  const studentsOverview = useMemo(() => {
    const total = enrichedStudents.length;
    const active = enrichedStudents.filter((s) => s.learningStatus !== 'inactive').length;
    const onTrack = enrichedStudents.filter((s) => s.learningStatus === 'on-track' || s.learningStatus === 'improving').length;
    const needsAttention = enrichedStudents.filter((s) => s.learningStatus === 'needs-attention').length;
    return { total, active, onTrack, needsAttention };
  }, [enrichedStudents]);

  // Filtered & sorted students for Students page
  const studentsPageList = useMemo(() => {
    let list = [...enrichedStudents];

    // Search
    if (studentsSearch.trim()) {
      const q = studentsSearch.toLowerCase();
      list = list.filter(
        (st) =>
          (st.name || '').toLowerCase().includes(q) ||
          (st.prn || '').toLowerCase().includes(q)
      );
    }

    // Performance filter
    if (studentsPerformanceFilter !== 'all') {
      if (studentsPerformanceFilter === 'excellent') {
        list = list.filter((st) => st.avgScore != null && st.avgScore >= 8.5);
      } else if (studentsPerformanceFilter === 'proficient') {
        list = list.filter((st) => st.avgScore != null && st.avgScore >= 7.0 && st.avgScore < 8.5);
      } else if (studentsPerformanceFilter === 'developing') {
        list = list.filter((st) => st.avgScore != null && st.avgScore < 7.0);
      } else if (studentsPerformanceFilter === 'ungraded') {
        list = list.filter((st) => st.avgScore == null);
      }
    }

    // Status filter
    if (studentsStatusFilter !== 'all') {
      list = list.filter((st) => st.learningStatus === studentsStatusFilter);
    }

    // Sort
    list.sort((a, b) => {
      switch (studentsSort) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'prn':
          return (a.prn || '').localeCompare(b.prn || '');
        case 'score-high':
          return (b.avgScore || -1) - (a.avgScore || -1);
        case 'score-low':
          return (a.avgScore || 999) - (b.avgScore || 999);
        case 'submissions':
          return b.submissionsCount - a.submissionsCount;
        case 'recent':
          return new Date(b.latestActivity || 0) - new Date(a.latestActivity || 0);
        case 'attention':
          return b.reasons.length - a.reasons.length;
        default:
          return 0;
      }
    });

    return list;
  }, [enrichedStudents, studentsSearch, studentsPerformanceFilter, studentsStatusFilter, studentsSort]);

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
            STUDENTS VIEW — Enriched Student Cohort
            ========================================================= */}
        {hasContext && activeNav === 'students' && (
          <section className="fs-root">
            {/* ── Page Header ──────────────────────────────────── */}
            <div className="fs-header">
              <div className="fs-header-text">
                <h2 className="fs-page-title">Students</h2>
                <p className="fs-page-desc">
                  {selectedSubject.code} · Batch {selectedBatch.name} — Find students, understand their status, and identify who needs attention.
                </p>
              </div>
            </div>

            {/* ── Filters & Search Bar ─────────────────────────── */}
            <div className="fs-toolbar">
              <div className="fs-search-wrap">
                <Search size={14} className="fs-search-icon" />
                <input
                  type="text"
                  className="fs-search-input"
                  placeholder="Search by name or PRN…"
                  value={studentsSearch}
                  onChange={(e) => setStudentsSearch(e.target.value)}
                />
                {studentsSearch && (
                  <button className="fs-search-clear" onClick={() => setStudentsSearch('')}>
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="fs-filters">
                <div className="fs-filter-group">
                  <Filter size={12} />
                  <select
                    className="fs-filter-select"
                    value={studentsPerformanceFilter}
                    onChange={(e) => setStudentsPerformanceFilter(e.target.value)}
                  >
                    <option value="all">All Performance</option>
                    <option value="excellent">Excellent (≥ 8.5)</option>
                    <option value="proficient">Proficient (7.0–8.4)</option>
                    <option value="developing">Developing (&lt; 7.0)</option>
                    <option value="ungraded">Not Yet Graded</option>
                  </select>
                </div>

                <div className="fs-filter-group">
                  <select
                    className="fs-filter-select"
                    value={studentsStatusFilter}
                    onChange={(e) => setStudentsStatusFilter(e.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="on-track">On Track</option>
                    <option value="improving">Improving</option>
                    <option value="needs-attention">Needs Attention</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="fs-filter-group">
                  <ArrowUpDown size={12} />
                  <select
                    className="fs-filter-select"
                    value={studentsSort}
                    onChange={(e) => setStudentsSort(e.target.value)}
                  >
                    <option value="name">Sort: Name</option>
                    <option value="prn">Sort: PRN</option>
                    <option value="score-high">Score: High → Low</option>
                    <option value="score-low">Score: Low → High</option>
                    <option value="submissions">Most Submissions</option>
                    <option value="recent">Most Recent</option>
                    <option value="attention">Needs Attention</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ── Overview Metrics ─────────────────────────────── */}
            <div className="fs-overview">
              <div className="fs-stat-card">
                <div className="fs-stat-icon-wrap fs-stat-icon-primary">
                  <Users size={14} />
                </div>
                <div className="fs-stat-content">
                  <span className="fs-stat-value">{studentsOverview.total}</span>
                  <span className="fs-stat-label">Total Students</span>
                </div>
              </div>
              <div className="fs-stat-card">
                <div className="fs-stat-icon-wrap fs-stat-icon-accent">
                  <Activity size={14} />
                </div>
                <div className="fs-stat-content">
                  <span className="fs-stat-value">{studentsOverview.active}</span>
                  <span className="fs-stat-label">Active</span>
                </div>
              </div>
              <div className="fs-stat-card">
                <div className="fs-stat-icon-wrap fs-stat-icon-success">
                  <CheckCircle size={14} />
                </div>
                <div className="fs-stat-content">
                  <span className="fs-stat-value">{studentsOverview.onTrack}</span>
                  <span className="fs-stat-label">On Track</span>
                </div>
              </div>
              <div className="fs-stat-card">
                <div className="fs-stat-icon-wrap fs-stat-icon-warning">
                  <AlertTriangle size={14} />
                </div>
                <div className="fs-stat-content">
                  <span className="fs-stat-value">{studentsOverview.needsAttention}</span>
                  <span className="fs-stat-label">Needs Attention</span>
                </div>
              </div>
            </div>

            {/* ── Results Count ────────────────────────────────── */}
            <div className="fs-results-bar">
              <span className="fs-results-count">
                {studentsPageList.length} student{studentsPageList.length !== 1 ? 's' : ''}
                {(studentsSearch || studentsPerformanceFilter !== 'all' || studentsStatusFilter !== 'all') && (
                  <> matching filters</>
                )}
              </span>
              {(studentsSearch || studentsPerformanceFilter !== 'all' || studentsStatusFilter !== 'all') && (
                <button
                  className="fs-clear-filters"
                  onClick={() => {
                    setStudentsSearch('');
                    setStudentsPerformanceFilter('all');
                    setStudentsStatusFilter('all');
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* ── Student List ─────────────────────────────────── */}
            {isLoadingItems ? (
              <div className="fs-loading">
                <RefreshCw size={20} className="fs-spinner" />
                <span>Loading student data…</span>
              </div>
            ) : studentsPageList.length === 0 ? (
              <div className="fs-empty">
                <Users size={32} style={{ opacity: 0.3 }} />
                <h3>{studentsSearch || studentsPerformanceFilter !== 'all' || studentsStatusFilter !== 'all'
                  ? 'No students match your filters'
                  : 'No Student Activity Yet'
                }</h3>
                <p>{studentsSearch
                  ? `No results for "${studentsSearch}"`
                  : 'Students will appear here once they begin submitting practicals.'
                }</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="fs-table-wrap">
                  <table className="fs-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Progress</th>
                        <th>Avg Score</th>
                        <th>Recent Activity</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentsPageList.map((st) => (
                        <tr key={st.id} className={st.learningStatus === 'needs-attention' ? 'fs-row-attention' : ''}>
                          <td>
                            <div className="fs-student-cell">
                              <span className="fs-student-name">{st.name}</span>
                              <span className="fs-student-prn">{st.prn}</span>
                            </div>
                          </td>
                          <td>
                            <div className="fs-progress-cell">
                              <span className="fs-progress-count">
                                {st.completedPracticals} of {practicalProgress.length || '—'}
                              </span>
                              <span className="fs-progress-label">practicals</span>
                            </div>
                          </td>
                          <td>
                            <div className="fs-score-cell">
                              {st.avgScore != null ? (
                                <>
                                  <span className="fs-score-value">{st.avgScore.toFixed(1)}</span>
                                  <span className="fs-score-unit">/ 10.0</span>
                                </>
                              ) : st.avgCoding != null ? (
                                <>
                                  <span className="fs-score-value">{st.avgCoding.toFixed(1)}</span>
                                  <span className="fs-score-unit">/ 3.0</span>
                                </>
                              ) : (
                                <span className="fs-score-na">—</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="fs-activity-cell">
                              {st.latestPractical && <span className="fs-activity-practical">{st.latestPractical}</span>}
                              <span className="fs-activity-time">{formatRelativeTime(st.latestActivity)}</span>
                            </div>
                          </td>
                          <td>
                            <div className="fs-status-cell">
                              <span className={`fs-status-badge fs-status-${st.learningStatus}`}>
                                {st.learningStatus === 'on-track' && <><CheckCircle size={10} /> On Track</>}
                                {st.learningStatus === 'improving' && <><TrendingUp size={10} /> Improving</>}
                                {st.learningStatus === 'needs-attention' && <><AlertTriangle size={10} /> Attention</>}
                                {st.learningStatus === 'inactive' && <><Clock size={10} /> Inactive</>}
                              </span>
                              {st.reasons.length > 0 && (
                                <span className="fs-attention-hint" title={st.reasons.map((r) => r.text).join('; ')}>
                                  {st.reasons[0].text}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <button
                              className="fs-view-btn"
                              onClick={() => onNavigate && onNavigate('submissions')}
                              title={`View submissions for ${st.name}`}
                            >
                              <Eye size={12} />
                              View Student
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="fs-cards-wrap">
                  {studentsPageList.map((st) => (
                    <div key={st.id} className={`fs-card ${st.learningStatus === 'needs-attention' ? 'fs-card-attention' : ''}`}>
                      <div className="fs-card-top">
                        <div className="fs-card-identity">
                          <span className="fs-card-name">{st.name}</span>
                          <span className="fs-card-prn">{st.prn}</span>
                        </div>
                        <span className={`fs-status-badge fs-status-${st.learningStatus}`}>
                          {st.learningStatus === 'on-track' && <><CheckCircle size={10} /> On Track</>}
                          {st.learningStatus === 'improving' && <><TrendingUp size={10} /> Improving</>}
                          {st.learningStatus === 'needs-attention' && <><AlertTriangle size={10} /> Attention</>}
                          {st.learningStatus === 'inactive' && <><Clock size={10} /> Inactive</>}
                        </span>
                      </div>

                      <div className="fs-card-stats">
                        <div className="fs-card-stat">
                          <span className="fs-card-stat-label">Progress</span>
                          <span className="fs-card-stat-value">{st.completedPracticals}/{practicalProgress.length || '—'}</span>
                        </div>
                        <div className="fs-card-stat">
                          <span className="fs-card-stat-label">Avg Score</span>
                          <span className="fs-card-stat-value">
                            {st.avgScore != null ? `${st.avgScore.toFixed(1)}/10` : st.avgCoding != null ? `${st.avgCoding.toFixed(1)}/3` : '—'}
                          </span>
                        </div>
                        <div className="fs-card-stat">
                          <span className="fs-card-stat-label">Last Active</span>
                          <span className="fs-card-stat-value">{formatRelativeTime(st.latestActivity)}</span>
                        </div>
                      </div>

                      {st.reasons.length > 0 && (
                        <div className="fs-card-reasons">
                          {st.reasons.slice(0, 2).map((r, i) => (
                            <span key={i} className={`fd-reason fd-reason-${r.type}`}>
                              {r.type === 'integrity' && <ShieldAlert size={10} />}
                              {r.type === 'performance' && <TrendingDown size={10} />}
                              {r.type === 'activity' && <Clock size={10} />}
                              {r.text}
                            </span>
                          ))}
                        </div>
                      )}

                      <button
                        className="fs-card-action"
                        onClick={() => onNavigate && onNavigate('submissions')}
                      >
                        <Eye size={12} />
                        View Student
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
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
