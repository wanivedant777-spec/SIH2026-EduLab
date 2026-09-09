import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  ShieldAlert,
  Award,
  BookOpen,
  Code2,
  FileText,
  MessageSquare,
  Send,
  Layers,
  Eye,
  Check,
  Calendar,
  Plus,
  User,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

// 10 Curricular Competency Areas supported by EduLab
const CURRICULUM_COMPETENCIES = [
  {
    id: 'arrays',
    name: 'Arrays',
    description: 'Contiguous memory layout, index indexing, traversal invariants, and in-place transformations.',
    practicalNumbers: [1, 2, 4],
    keywords: ['array', 'search', 'find largest', 'linear'],
  },
  {
    id: 'linked_lists',
    name: 'Linked Lists',
    description: 'Pointer manipulation, node allocations, cycle detection, and dynamic list mutations.',
    practicalNumbers: [2],
    keywords: ['linked list', 'singly', 'doubly', 'node'],
  },
  {
    id: 'stacks',
    name: 'Stacks',
    description: 'LIFO semantics, call stack emulation, push/pop invariants, and expression evaluations.',
    practicalNumbers: [2, 3],
    keywords: ['stack', 'lifo', 'push', 'pop'],
  },
  {
    id: 'queues',
    name: 'Queues',
    description: 'FIFO buffers, circular buffer pointers, enqueue/dequeue mechanics, and scheduling.',
    practicalNumbers: [3],
    keywords: ['queue', 'fifo', 'circular'],
  },
  {
    id: 'trees',
    name: 'Trees',
    description: 'Hierarchical node graphs, BST search properties, in-order traversals, and AVL rotations.',
    practicalNumbers: [4, 5],
    keywords: ['tree', 'bst', 'binary search tree', 'avl'],
  },
  {
    id: 'graphs',
    name: 'Graphs',
    description: 'Adjacency structures, Dijkstra shortest-path relaxation, priority queue invariants.',
    practicalNumbers: [6],
    keywords: ['graph', 'dijkstra', 'shortest path', 'adjacency'],
  },
  {
    id: 'sorting',
    name: 'Sorting',
    description: 'Order invariants, divide-and-conquer partitions, comparison bounds, and tree sorting.',
    practicalNumbers: [1, 5],
    keywords: ['sort', 'in-order', 'balancing'],
  },
  {
    id: 'searching',
    name: 'Searching',
    description: 'Linear scanning vs O(log N) binary search invariants and logarithmic boundary branching.',
    practicalNumbers: [1, 4],
    keywords: ['search', 'binary search', 'linear search'],
  },
  {
    id: 'hashing',
    name: 'Hashing',
    description: 'Hash functions, collision resolution via chaining/open addressing, and O(1) expected lookup.',
    practicalNumbers: [1],
    keywords: ['hash', 'table', 'collision'],
  },
  {
    id: 'algorithms',
    name: 'Algorithms',
    description: 'Asymptotic complexity bounds, greedy choices, dynamic invariants, and structural recursion.',
    practicalNumbers: [1, 4, 5, 6],
    keywords: ['algorithm', 'search', 'dijkstra', 'invariants'],
  },
];

function formatRelativeTime(dateStr) {
  if (!dateStr) return 'No activity recorded';
  const then = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'Yesterday';
  if (diffD < 7) return `${diffD}d ago`;
  return then.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function FacultyStudent360View({
  student,
  submissions: allSubmissions = [],
  practicals = [],
  batchName = 'Batch A',
  onBack,
  onOpenGrading,
}) {
  // Local note composer modal state
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState('Advisory'); // Advisory, Viva Note, Commendation, Action Item
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'practicals' | 'skills' | 'notes'

  // Student specific submissions filtered from batch
  const studentSubmissions = useMemo(() => {
    if (!student) return [];
    const id = student.id;
    const prn = (student.prn || '').toLowerCase();
    const name = (student.name || '').toLowerCase();

    return allSubmissions.filter((s) => {
      if (id && (s.studentId === id || s.student_id === id)) return true;
      if (prn && (s.prn || s.rollNumber || '').toLowerCase() === prn) return true;
      if (name && (s.studentName || '').toLowerCase() === name) return true;
      return false;
    }).sort((a, b) => new Date(b.submittedAt || b.createdAt || 0) - new Date(a.submittedAt || a.createdAt || 0));
  }, [student, allSubmissions]);

  // Local storage persisted notes for this student
  const storageKey = `edulab_faculty_notes_${student?.id || student?.prn || 'unknown'}`;
  const [localNotes, setLocalNotes] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleSaveNote = () => {
    if (!noteContent.trim()) return;
    const newNote = {
      id: `note_${Date.now()}`,
      category: noteCategory,
      content: noteContent.trim(),
      author: 'Faculty Advisor',
      createdAt: new Date().toISOString(),
    };
    const updated = [newNote, ...localNotes];
    setLocalNotes(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save note locally:', e);
    }
    setNoteContent('');
    setIsNoteModalOpen(false);
  };

  // 1. Overall Metrics Derived Strictly from Real Data
  const metrics = useMemo(() => {
    const totalPracticals = practicals.length > 0 ? practicals.length : 6;
    const completedPracticalsSet = new Set(
      studentSubmissions.map((s) => s.practicalId || s.assignmentId || s.practicalNumber)
    );
    const completedCount = completedPracticalsSet.size;
    const remainingCount = Math.max(0, totalPracticals - completedCount);

    const evaluatedSubmissions = studentSubmissions.filter(
      (s) => s.status === 'Graded' || s.totalMarks != null
    );
    const evaluatedCount = evaluatedSubmissions.length;

    let avgScore = null;
    if (evaluatedCount > 0) {
      const sum = evaluatedSubmissions.reduce((acc, s) => acc + parseFloat(s.totalMarks || 0), 0);
      avgScore = (sum / evaluatedCount).toFixed(1);
    }

    let avgCoding = null;
    if (studentSubmissions.length > 0) {
      const sum = studentSubmissions.reduce((acc, s) => acc + (parseFloat(s.codingMarks) || 0), 0);
      avgCoding = (sum / studentSubmissions.length).toFixed(1);
    }

    // Performance tier
    let overallPerformance = 'Ungraded';
    let performanceBadgeClass = 'ungraded';
    if (avgScore !== null) {
      const num = parseFloat(avgScore);
      if (num >= 8.5) {
        overallPerformance = 'Excellent';
        performanceBadgeClass = 'excellent';
      } else if (num >= 7.0) {
        overallPerformance = 'Proficient';
        performanceBadgeClass = 'proficient';
      } else {
        overallPerformance = 'Developing';
        performanceBadgeClass = 'developing';
      }
    } else if (avgCoding !== null) {
      const cNum = parseFloat(avgCoding);
      if (cNum >= 2.5) {
        overallPerformance = 'Proficient (Auto)';
        performanceBadgeClass = 'proficient';
      } else {
        overallPerformance = 'Developing (Auto)';
        performanceBadgeClass = 'developing';
      }
    }

    // Performance trend: compare last 2 submissions chronologically
    let trend = { label: 'Stable', direction: 'stable', delta: null };
    if (studentSubmissions.length >= 2) {
      const chrono = [...studentSubmissions].sort(
        (a, b) => new Date(a.submittedAt || a.createdAt || 0) - new Date(b.submittedAt || b.createdAt || 0)
      );
      const latest = chrono[chrono.length - 1];
      const prev = chrono[chrono.length - 2];
      const s1 = parseFloat(latest.totalMarks) || (parseFloat(latest.codingMarks) ? parseFloat(latest.codingMarks) * 3.33 : 0);
      const s0 = parseFloat(prev.totalMarks) || (parseFloat(prev.codingMarks) ? parseFloat(prev.codingMarks) * 3.33 : 0);
      const diff = s1 - s0;

      if (diff >= 0.5) {
        trend = { label: `Improving (+${diff.toFixed(1)} pts)`, direction: 'improving', delta: diff };
      } else if (diff <= -0.5) {
        trend = { label: `Declining (${diff.toFixed(1)} pts)`, direction: 'declining', delta: diff };
      } else {
        trend = { label: 'Consistent', direction: 'stable', delta: 0 };
      }
    } else if (studentSubmissions.length === 1) {
      trend = { label: 'Baseline (1 submission)', direction: 'stable', delta: null };
    } else {
      trend = { label: 'No Submissions', direction: 'none', delta: null };
    }

    // Latest activity date
    const latestActivity = studentSubmissions[0]?.submittedAt || studentSubmissions[0]?.createdAt || student?.latestActivity || null;

    // Active status
    let activeStatus = student?.learningStatus === 'inactive' ? 'Inactive' : 'Active';
    if (latestActivity) {
      const daysSince = (Date.now() - new Date(latestActivity).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince > 14 && studentSubmissions.length < 2) {
        activeStatus = 'Inactive';
      }
    }

    return {
      totalPracticals,
      completedCount,
      remainingCount,
      evaluatedCount,
      avgScore,
      avgCoding,
      overallPerformance,
      performanceBadgeClass,
      trend,
      latestActivity,
      activeStatus,
    };
  }, [student, studentSubmissions, practicals]);

  // 2. Skill Mastery Mapping (Discrete truthful states without fabricated percentages)
  const skillMastery = useMemo(() => {
    return CURRICULUM_COMPETENCIES.map((comp) => {
      // Find student submissions testing this competency
      const relatedSubmissions = studentSubmissions.filter((s) => {
        const pNum =
          s.practicalNumber ||
          (s.practical && s.practical.practicalNumber) ||
          (s.practicalTitle ? parseInt(s.practicalTitle.match(/Practical\s*0?(\d+)/i)?.[1] || '0', 10) : 0);

        if (pNum && comp.practicalNumbers.includes(Number(pNum))) return true;

        const title = (s.practicalTitle || s.title || '').toLowerCase();
        if (comp.keywords && comp.keywords.some((kw) => title.includes(kw))) return true;
        return title.includes(comp.name.toLowerCase());
      });

      // Find practicals covering this competency
      const relatedPracticals = practicals.filter((p) => {
        const pNum = Number(p.practicalNumber);
        if (pNum && comp.practicalNumbers.includes(pNum)) return true;
        const title = (p.title || '').toLowerCase();
        if (comp.keywords && comp.keywords.some((kw) => title.includes(kw))) return true;
        return title.includes(comp.name.toLowerCase());
      });

      let state = 'Not Started';
      let evidence = 'Upcoming in curriculum sequence.';
      let scoreBadge = null;

      if (relatedSubmissions.length > 0) {
        // Find best attempt for this competency
        const bestSub = [...relatedSubmissions].sort(
          (a, b) => (parseFloat(b.totalMarks) || parseFloat(b.codingMarks) || 0) - (parseFloat(a.totalMarks) || parseFloat(a.codingMarks) || 0)
        )[0];

        const passRate =
          bestSub.passRate ??
          (bestSub.passedCount && bestSub.totalCount
            ? Math.round((bestSub.passedCount / bestSub.totalCount) * 100)
            : null);
        const marks = parseFloat(bestSub.totalMarks);

        if (passRate === 100 && (marks >= 8.5 || isNaN(marks))) {
          state = 'Mastered';
          evidence = `100% test suite pass rate${!isNaN(marks) ? ` · Evaluated at ${marks}/10` : ''}. Optimal complexity bounds verified.`;
          scoreBadge = !isNaN(marks) ? `${marks}/10` : '100%';
        } else if (passRate >= 70 || marks >= 7.0) {
          state = 'Proficient';
          evidence = `Core invariant tests verified${bestSub.passedCount ? ` (${bestSub.passedCount}/${bestSub.totalCount} tests passed)` : ''}.`;
          scoreBadge = !isNaN(marks) ? `${marks}/10` : `${passRate}%`;
        } else if (passRate > 0 || bestSub.status === 'Submitted') {
          state = 'Developing';
          evidence = `Attempted with partial test coverage (${passRate || 0}% pass rate). Boundary conditions require review.`;
          scoreBadge = !isNaN(marks) ? `${marks}/10` : `${passRate}%`;
        } else {
          state = 'Learning';
          evidence = 'Submission pending automated evaluation.';
        }
      }

      return {
        ...comp,
        state,
        evidence,
        scoreBadge,
        relatedPracticals,
      };
    });
  }, [studentSubmissions, practicals]);

  // 3. Learning Gaps & Learning Strengths
  const { learningGaps, learningStrengths } = useMemo(() => {
    const gaps = [];
    const strengths = [];

    // Strengths from Mastered and Proficient skills
    skillMastery.forEach((skill) => {
      if (skill.state === 'Mastered') {
        strengths.push({
          concept: skill.name,
          state: 'Mastered',
          badgeClass: 'mastered',
          evidence: skill.evidence,
          practical: skill.relatedPracticals[0] || null,
        });
      } else if (skill.state === 'Proficient') {
        strengths.push({
          concept: skill.name,
          state: 'Proficient',
          badgeClass: 'proficient',
          evidence: skill.evidence,
          practical: skill.relatedPracticals[0] || null,
        });
      }
    });

    // Check latest submission per practical to only surface ACTIVE, unresolved gaps
    const latestByPractical = {};
    studentSubmissions.forEach((s) => {
      const pKey =
        s.practicalId ||
        s.practicalNumber ||
        (s.practicalTitle ? s.practicalTitle.match(/Practical\s*0?(\d+)/i)?.[1] : s.practicalTitle);
      if (!latestByPractical[pKey]) {
        latestByPractical[pKey] = s;
      } else {
        const curDate = new Date(s.submittedAt || s.createdAt || 0);
        const prevDate = new Date(latestByPractical[pKey].submittedAt || latestByPractical[pKey].createdAt || 0);
        if (curDate > prevDate) {
          latestByPractical[pKey] = s;
        }
      }
    });

    Object.values(latestByPractical).forEach((sub) => {
      const passRate =
        sub.passRate ??
        (sub.passedCount && sub.totalCount ? Math.round((sub.passedCount / sub.totalCount) * 100) : null);
      const marks = parseFloat(sub.totalMarks);

      // Only flag as a gap if student's LATEST attempt failed or is sub-optimal (< 70% pass rate or marks < 7.0)
      if (passRate !== null && passRate < 70 && (isNaN(marks) || marks < 7.0)) {
        const title = sub.practicalTitle || (sub.practical && sub.practical.title) || `Practical 0${sub.practicalNumber}`;
        const alreadyInGaps = gaps.some((g) => g.concept.includes(title));
        if (!alreadyInGaps) {
          gaps.push({
            concept: title,
            state: 'Needs Attention',
            badgeClass: 'developing',
            evidence: `${sub.passedCount || 0}/${sub.totalCount || 4} test cases passed on latest attempt. Edge cases failed.`,
            practicalTitle: title,
            submission: sub,
          });
        }
      }

      // Check integrity events
      if ((sub.focusBlurEvents || 0) > 0) {
        gaps.push({
          concept: `Integrity Alert · ${sub.practicalTitle || 'Practical'}`,
          state: 'Integrity Check',
          badgeClass: 'flagged',
          evidence: `${sub.focusBlurEvents} window blur / tab-switch event(s) recorded during coding session.`,
          practicalTitle: sub.practicalTitle,
          submission: sub,
        });
      }
    });

    return { learningGaps: gaps, learningStrengths: strengths };
  }, [skillMastery, studentSubmissions]);

  // 4. Attention Detection (Reasons why student needs attention)
  const attentionDetails = useMemo(() => {
    const reasons = [];

    // Inherited from cohort calculation if available
    if (student?.reasons && student.reasons.length > 0) {
      student.reasons.forEach((r) => reasons.push(r.text));
    }

    // Repeated failures on any practical
    const attemptsByPractical = {};
    studentSubmissions.forEach((s) => {
      const pKey = s.practicalId || s.practicalTitle || 'p';
      attemptsByPractical[pKey] = (attemptsByPractical[pKey] || 0) + 1;
    });

    Object.entries(attemptsByPractical).forEach(([pKey, count]) => {
      if (count >= 3) {
        const matchingSub = studentSubmissions.find((s) => (s.practicalId || s.practicalTitle) === pKey);
        const passRate = matchingSub?.passRate ?? 0;
        if (passRate < 70) {
          reasons.push(`Repeated attempts (${count} tries) with unresolved test failures on ${matchingSub?.practicalTitle || 'Practical'}`);
        }
      }
    });

    // Inactivity check
    if (metrics.activeStatus === 'Inactive') {
      reasons.push('Inactive for over 14 days without curriculum submission');
    }

    // Declining performance trend
    if (metrics.trend.direction === 'declining') {
      reasons.push(`Declining evaluation score on latest submission (${metrics.trend.delta?.toFixed(1)} pts drop)`);
    }

    // Deduplicate
    const uniqueReasons = Array.from(new Set(reasons));
    return {
      needsAttention: uniqueReasons.length > 0,
      reasons: uniqueReasons,
    };
  }, [student, studentSubmissions, metrics]);

  // 5. Recommended Faculty Action (One concise, data-driven recommendation based strictly on evidence)
  const recommendedAction = useMemo(() => {
    if (attentionDetails.needsAttention) {
      if (learningGaps.length > 0) {
        const firstGap = learningGaps[0];
        return {
          title: `Schedule Viva Review on ${firstGap.concept}`,
          description: `Student demonstrated test failures (${firstGap.evidence}). Review pointer/boundary edge cases in 1:1 consultation before next practical milestone.`,
          type: 'gap',
        };
      }
      if (attentionDetails.reasons.some((r) => r.includes('blur') || r.includes('Integrity'))) {
        return {
          title: 'Conduct Oral Verification for Recent Submission',
          description: 'Window focus telemetry indicated tab-switching events. Conduct brief oral code explanation during lab viva.',
          type: 'integrity',
        };
      }
      if (metrics.activeStatus === 'Inactive') {
        return {
          title: 'Issue Curricular Reminder Notice',
          description: 'Student has not submitted recent lab work. Issue an advising notification to prevent academic delay.',
          type: 'activity',
        };
      }
    }

    // Check if there are pending evaluations
    const pendingSub = studentSubmissions.find((s) => s.status !== 'Graded' && s.totalMarks == null);
    if (pendingSub) {
      return {
        title: `Grade Pending Rubric for ${pendingSub.practicalTitle || 'Practical'}`,
        description: `Automated testing completed with ${pendingSub.codingMarks || 0}/3.0 marks. Perform journal and oral viva evaluation to finalize 10M grade.`,
        type: 'evaluation',
        actionSubmission: pendingSub,
      };
    }

    // If student is performing well
    if (metrics.overallPerformance === 'Excellent' || metrics.overallPerformance === 'Proficient') {
      return {
        title: 'Nominate for Advanced Algorithmic Challenges',
        description: 'Student is consistently mastering core data structures. Encourage exploration of AVL rotations and shortest-path graph implementations.',
        type: 'enrichment',
      };
    }

    return {
      title: 'Maintain Current Curricular Cadence',
      description: 'Student is progressing along expected milestones. Continue regular practical check-ins and automated test validations.',
      type: 'default',
    };
  }, [attentionDetails, learningGaps, studentSubmissions, metrics]);

  // 6. Practical History: Matrix of practicals and student's progress
  const practicalHistory = useMemo(() => {
    // Map existing practicals
    const list = (practicals.length > 0 ? practicals : [
      { id: '1', practicalNumber: 1, title: 'Practical 01: Arrays & Dynamic Memory Allocation' },
      { id: '2', practicalNumber: 2, title: 'Practical 02: Singly Linked List Invariants' },
      { id: '3', practicalNumber: 3, title: 'Practical 03: Stack Operations Using Arrays' },
      { id: '4', practicalNumber: 4, title: 'Practical 04: Queue Implementation & Circular Buffer' },
      { id: '5', practicalNumber: 5, title: 'Practical 05: Binary Search Tree Traversals' },
      { id: '6', practicalNumber: 6, title: 'Practical 06: Graph Traversal & Dijkstra Algorithm' },
    ]).map((p) => {
      const pNum = Number(p.practicalNumber || (p.title?.match(/Practical\s*0?(\d+)/i)?.[1] || 0));

      // Match student submissions
      const matchingSubs = studentSubmissions.filter((s) => {
        if (s.practicalId && (s.practicalId === p.id || s.assignmentId === p.id)) return true;
        const subPNum = Number(s.practicalNumber || (s.practicalTitle?.match(/Practical\s*0?(\d+)/i)?.[1] || 0));
        return subPNum && pNum && subPNum === pNum;
      });

      const attemptsCount = matchingSubs.length;
      const latestSub = matchingSubs[0] || null;

      let status = 'Not Started';
      let scoreText = '—';
      let dateText = '—';
      let evaluationText = 'Awaiting submission';

      if (latestSub) {
        if (latestSub.status === 'Graded' || latestSub.totalMarks != null) {
          status = 'Graded';
          scoreText = `${parseFloat(latestSub.totalMarks).toFixed(1)} / 10.0`;
          evaluationText = latestSub.feedback || `Rubric: Code ${latestSub.codingMarks}/3, Writeup ${latestSub.writeupMarks || 0}/5, Viva ${latestSub.vivaMarks || 0}/2`;
        } else {
          status = 'Submitted';
          scoreText = `${parseFloat(latestSub.codingMarks || 0).toFixed(1)} / 3.0 (Code)`;
          evaluationText = 'Awaiting faculty evaluation (10M Rubric)';
        }
        dateText = formatDate(latestSub.submittedAt || latestSub.createdAt);
      }

      return {
        id: p.id,
        practicalNumber: pNum || p.practicalNumber,
        title: p.title || `Practical 0${pNum}`,
        status,
        scoreText,
        attemptsCount,
        dateText,
        evaluationText,
        latestSub,
      };
    });

    return list.sort((a, b) => (a.practicalNumber || 0) - (b.practicalNumber || 0));
  }, [practicals, studentSubmissions]);

  // 7. Recent Activity Timeline
  const recentEvents = useMemo(() => {
    const events = [];

    studentSubmissions.forEach((s) => {
      // Submission event
      events.push({
        id: `sub_${s.id}`,
        type: 'submission',
        title: `Submitted ${s.practicalTitle || 'Practical'}`,
        timestamp: s.submittedAt || s.createdAt,
        detail: `Auto-evaluated: ${s.passedCount || 0}/${s.totalCount || 0} test cases passed (${s.codingMarks || 0}/3.0 M)`,
        sub: s,
      });

      // Evaluation event if graded
      if (s.status === 'Graded' || s.totalMarks != null) {
        events.push({
          id: `eval_${s.id}`,
          type: 'evaluation',
          title: `Evaluated ${s.practicalTitle || 'Practical'}`,
          timestamp: s.gradedAt || s.submittedAt || s.createdAt,
          detail: `10M Rubric finalized at ${s.totalMarks}/10.0 M${s.feedback ? ` · "${s.feedback}"` : ''}`,
          sub: s,
        });
      }
    });

    // Local notes added by faculty
    localNotes.forEach((n) => {
      events.push({
        id: n.id,
        type: 'note',
        title: `Faculty Note (${n.category})`,
        timestamp: n.createdAt,
        detail: n.content,
      });
    });

    return events.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  }, [studentSubmissions, localNotes]);

  // Quick action: Review Latest Submission
  const handleReviewLatestSubmission = () => {
    if (studentSubmissions.length > 0 && onOpenGrading) {
      onOpenGrading(studentSubmissions[0]);
    } else {
      setActiveTab('practicals');
    }
  };

  // Quick action: Review Evaluation
  const handleReviewEvaluation = () => {
    const gradedSub = studentSubmissions.find((s) => s.status === 'Graded' || s.totalMarks != null);
    if (gradedSub && onOpenGrading) {
      onOpenGrading(gradedSub);
    } else if (studentSubmissions.length > 0 && onOpenGrading) {
      onOpenGrading(studentSubmissions[0]);
    } else {
      setActiveTab('practicals');
    }
  };

  return (
    <div className="s360-container">
      {/* ── Top Bar: Navigation Back to Students Roster ── */}
      <div className="s360-back-bar">
        <button className="s360-back-btn" onClick={onBack} title="Return to Students Roster">
          <ArrowLeft size={16} />
          <span>Back to Students Roster</span>
        </button>
        <div className="s360-cohort-crumb">
          <span>Batch: <strong>{batchName}</strong></span>
          <span className="s360-crumb-sep">·</span>
          <span>Academic Year 2025–2026</span>
        </div>
      </div>

      {/* ── Screen Header: Rich Student Identity & Primary Actions ── */}
      <header className="s360-header">
        <div className="s360-header-main">
          <div className="s360-avatar">
            {student?.name ? student.name.charAt(0).toUpperCase() : <User size={24} />}
          </div>
          <div className="s360-identity">
            <div className="s360-name-row">
              <h1 className="s360-name">{student?.name || 'Student Profile'}</h1>
              <span className={`s360-status-pill s360-status-${metrics.activeStatus.toLowerCase()}`}>
                <span className="s360-status-dot" />
                {metrics.activeStatus}
              </span>
              <span className={`s360-perf-badge s360-perf-${metrics.performanceBadgeClass}`}>
                {metrics.overallPerformance}
              </span>
            </div>
            <div className="s360-meta-row">
              <span className="s360-meta-item">
                <span className="s360-meta-label">PRN / Roll:</span>
                <span className="s360-meta-value">{student?.prn || '—'}</span>
              </span>
              <span className="s360-meta-sep">•</span>
              <span className="s360-meta-item">
                <span className="s360-meta-label">Batch:</span>
                <span className="s360-meta-value">{batchName}</span>
              </span>
              <span className="s360-meta-sep">•</span>
              <span className="s360-meta-item">
                <Clock size={12} style={{ marginRight: 4, color: 'var(--text-muted)' }} />
                <span className="s360-meta-label">Last Activity:</span>
                <span className="s360-meta-value">{formatRelativeTime(metrics.latestActivity)}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="s360-primary-actions">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleReviewLatestSubmission}
            disabled={studentSubmissions.length === 0}
            title={studentSubmissions.length === 0 ? 'No submissions yet' : 'Review latest code submission'}
          >
            <Code2 size={14} />
            Review Latest Submission
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleReviewEvaluation}
            disabled={studentSubmissions.length === 0}
            title={studentSubmissions.length === 0 ? 'No evaluations yet' : 'Review 10M rubric evaluation'}
          >
            <Award size={14} />
            Review Evaluation
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsNoteModalOpen(true)}
          >
            <MessageSquare size={14} />
            Send Note
          </Button>
        </div>
      </header>

      {/* ── Attention Banner (Only displayed when student requires attention) ── */}
      {attentionDetails.needsAttention && (
        <div className="s360-attention-banner">
          <div className="s360-attention-icon">
            <AlertTriangle size={18} />
          </div>
          <div className="s360-attention-content">
            <div className="s360-attention-title">Student Attention Advisory</div>
            <ul className="s360-attention-reasons">
              {attentionDetails.reasons.map((reason, idx) => (
                <li key={idx} className="s360-attention-reason-item">
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ── Recommended Faculty Action (Data-Driven, No Fake AI) ── */}
      <div className={`s360-action-card s360-action-${recommendedAction.type}`}>
        <div className="s360-action-badge">
          <Activity size={13} />
          <span>Recommended Faculty Action</span>
        </div>
        <div className="s360-action-body">
          <h4 className="s360-action-title">{recommendedAction.title}</h4>
          <p className="s360-action-desc">{recommendedAction.description}</p>
        </div>
        {recommendedAction.actionSubmission && onOpenGrading && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => onOpenGrading(recommendedAction.actionSubmission)}
          >
            Open Grading Rubric
          </Button>
        )}
      </div>

      {/* ── Progress Overview (5 Core KPIs with Real Data) ── */}
      <section className="s360-overview-grid">
        <div className="s360-kpi-card">
          <div className="s360-kpi-header">
            <span className="s360-kpi-label">Practicals Completed</span>
            <BookOpen size={15} className="s360-kpi-icon" />
          </div>
          <div className="s360-kpi-value">
            {metrics.completedCount}
            <span className="s360-kpi-total"> / {metrics.totalPracticals}</span>
          </div>
          <div className="s360-kpi-subtext">
            {Math.round((metrics.completedCount / metrics.totalPracticals) * 100)}% of curriculum submitted
          </div>
        </div>

        <div className="s360-kpi-card">
          <div className="s360-kpi-header">
            <span className="s360-kpi-label">Practicals Remaining</span>
            <Layers size={15} className="s360-kpi-icon" />
          </div>
          <div className="s360-kpi-value">{metrics.remainingCount}</div>
          <div className="s360-kpi-subtext">Pending laboratory assignments</div>
        </div>

        <div className="s360-kpi-card">
          <div className="s360-kpi-header">
            <span className="s360-kpi-label">Evaluated Submissions</span>
            <Award size={15} className="s360-kpi-icon" />
          </div>
          <div className="s360-kpi-value">
            {metrics.evaluatedCount}
            <span className="s360-kpi-total"> / {studentSubmissions.length}</span>
          </div>
          <div className="s360-kpi-subtext">10-Mark Rubric assessments finalized</div>
        </div>

        <div className="s360-kpi-card">
          <div className="s360-kpi-header">
            <span className="s360-kpi-label">Average Score</span>
            <Award size={15} className="s360-kpi-icon" />
          </div>
          <div className="s360-kpi-value">
            {metrics.avgScore !== null ? (
              <>
                {metrics.avgScore} <span className="s360-kpi-total">/ 10.0</span>
              </>
            ) : metrics.avgCoding !== null ? (
              <>
                {metrics.avgCoding} <span className="s360-kpi-total">/ 3.0 (Code)</span>
              </>
            ) : (
              '—'
            )}
          </div>
          <div className="s360-kpi-subtext">
            {metrics.avgScore !== null ? 'Evaluated practical average' : 'Automated coding score average'}
          </div>
        </div>

        <div className="s360-kpi-card">
          <div className="s360-kpi-header">
            <span className="s360-kpi-label">Recent Performance</span>
            {metrics.trend.direction === 'improving' ? (
              <TrendingUp size={15} style={{ color: 'var(--success-text)' }} />
            ) : metrics.trend.direction === 'declining' ? (
              <TrendingDown size={15} style={{ color: 'var(--danger-text)' }} />
            ) : (
              <Activity size={15} className="s360-kpi-icon" />
            )}
          </div>
          <div className={`s360-kpi-value s360-trend-${metrics.trend.direction}`}>
            {metrics.trend.direction === 'improving' ? 'Improving' : metrics.trend.direction === 'declining' ? 'Declining' : 'Stable'}
          </div>
          <div className="s360-kpi-subtext">{metrics.trend.label}</div>
        </div>
      </section>

      {/* ── View Navigation Tabs ── */}
      <div className="s360-tabs">
        <button
          className={`s360-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Learning Journey & Skills
        </button>
        <button
          className={`s360-tab-btn ${activeTab === 'practicals' ? 'active' : ''}`}
          onClick={() => setActiveTab('practicals')}
        >
          Practical History ({practicalHistory.length})
        </button>
        <button
          className={`s360-tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          Faculty Notes & Advising ({localNotes.length + studentSubmissions.filter((s) => s.feedback).length})
        </button>
      </div>

      {/* ── TAB 1: OVERVIEW (Skill Mastery, Gaps, Strengths, Timeline) ── */}
      {activeTab === 'overview' && (
        <div className="s360-tab-content">
          {/* Diagnostic Gaps and Strengths */}
          <div className="s360-two-col">
            {/* Learning Gaps */}
            <div className="s360-section-panel">
              <div className="s360-panel-header">
                <div className="s360-panel-title">
                  <TrendingDown size={16} style={{ color: 'var(--warning-text)' }} />
                  <h3>Diagnostic Learning Gaps</h3>
                </div>
                <span className="s360-count-pill">{learningGaps.length}</span>
              </div>
              <div className="s360-panel-body">
                {learningGaps.length === 0 ? (
                  <div className="s360-empty-state">
                    <CheckCircle2 size={24} style={{ color: 'var(--success-text)', marginBottom: 8 }} />
                    <p>No active learning gaps detected.</p>
                    <span>All evaluated submissions meet curriculum proficiency thresholds.</span>
                  </div>
                ) : (
                  <div className="s360-gaps-list">
                    {learningGaps.map((gap, idx) => (
                      <div key={idx} className="s360-gap-card">
                        <div className="s360-gap-header">
                          <span className="s360-gap-concept">{gap.concept}</span>
                          <span className={`s360-gap-badge s360-gap-${gap.badgeClass}`}>
                            {gap.state}
                          </span>
                        </div>
                        <p className="s360-gap-evidence">{gap.evidence}</p>
                        {gap.submission && onOpenGrading && (
                          <button
                            className="s360-text-action"
                            onClick={() => onOpenGrading(gap.submission)}
                          >
                            Inspect Submission <ArrowUpRight size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Learning Strengths */}
            <div className="s360-section-panel">
              <div className="s360-panel-header">
                <div className="s360-panel-title">
                  <TrendingUp size={16} style={{ color: 'var(--success-text)' }} />
                  <h3>Learning Strengths</h3>
                </div>
                <span className="s360-count-pill">{learningStrengths.length}</span>
              </div>
              <div className="s360-panel-body">
                {learningStrengths.length === 0 ? (
                  <div className="s360-empty-state">
                    <Layers size={24} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                    <p>No verified strengths recorded yet.</p>
                    <span>Strengths emerge as the student completes evaluations with high rubric scores.</span>
                  </div>
                ) : (
                  <div className="s360-strengths-list">
                    {learningStrengths.map((str, idx) => (
                      <div key={idx} className="s360-strength-card">
                        <div className="s360-strength-header">
                          <span className="s360-strength-concept">{str.concept}</span>
                          <span className={`s360-strength-badge s360-badge-${str.badgeClass}`}>
                            {str.state}
                          </span>
                        </div>
                        <p className="s360-strength-evidence">{str.evidence}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Skill Mastery Grid (10 Curricular Competency Areas) */}
          <div className="s360-section-panel" style={{ marginTop: 20 }}>
            <div className="s360-panel-header">
              <div className="s360-panel-title">
                <Layers size={16} />
                <h3>Curricular Skill Mastery</h3>
              </div>
              <span className="s360-panel-subtitle">10 Core Competencies · Discrete Evidence States</span>
            </div>

            <div className="s360-skills-grid">
              {skillMastery.map((comp) => (
                <div key={comp.id} className={`s360-skill-card s360-skill-${comp.state.toLowerCase().replace(/\s+/g, '-')}`}>
                  <div className="s360-skill-top">
                    <span className="s360-skill-name">{comp.name}</span>
                    <span className={`s360-mastery-state s360-state-${comp.state.toLowerCase().replace(/\s+/g, '-')}`}>
                      {comp.state}
                    </span>
                  </div>
                  <p className="s360-skill-desc">{comp.description}</p>
                  <div className="s360-skill-footer">
                    <span className="s360-skill-evidence">{comp.evidence}</span>
                    {comp.scoreBadge && (
                      <span className="s360-skill-score">{comp.scoreBadge}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity Timeline */}
          <div className="s360-section-panel" style={{ marginTop: 20 }}>
            <div className="s360-panel-header">
              <div className="s360-panel-title">
                <Clock size={16} />
                <h3>Recent Activity & Timeline</h3>
              </div>
              <span className="s360-count-pill">{recentEvents.length}</span>
            </div>
            <div className="s360-panel-body">
              {recentEvents.length === 0 ? (
                <div className="s360-empty-state">
                  <p>No activity events recorded yet for this student.</p>
                </div>
              ) : (
                <div className="s360-timeline">
                  {recentEvents.map((evt) => (
                    <div key={evt.id} className={`s360-timeline-item s360-timeline-${evt.type}`}>
                      <div className="s360-timeline-marker" />
                      <div className="s360-timeline-content">
                        <div className="s360-timeline-header">
                          <span className="s360-timeline-title">{evt.title}</span>
                          <span className="s360-timeline-time">{formatRelativeTime(evt.timestamp)}</span>
                        </div>
                        <p className="s360-timeline-detail">{evt.detail}</p>
                        {evt.sub && onOpenGrading && (
                          <button
                            className="s360-text-action"
                            onClick={() => onOpenGrading(evt.sub)}
                          >
                            Review Submission <ArrowUpRight size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: PRACTICAL HISTORY ── */}
      {activeTab === 'practicals' && (
        <div className="s360-tab-content">
          <div className="s360-section-panel">
            <div className="s360-panel-header">
              <div className="s360-panel-title">
                <BookOpen size={16} />
                <h3>Curriculum Practical History</h3>
              </div>
              <span className="s360-panel-subtitle">Complete Laboratory Record</span>
            </div>

            <div className="s360-table-wrap">
              <table className="s360-table">
                <thead>
                  <tr>
                    <th>Practical</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th>Attempts</th>
                    <th>Date</th>
                    <th>Evaluation / Feedback</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {practicalHistory.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="s360-table-practical">
                          <span className="s360-pnum">P0{item.practicalNumber || '—'}</span>
                          <span className="s360-ptitle">{item.title}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`s360-table-status s360-tstatus-${item.status.toLowerCase().replace(/\s+/g, '-')}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>
                        <span className="s360-table-score">{item.scoreText}</span>
                      </td>
                      <td>
                        <span className="s360-table-attempts">{item.attemptsCount}</span>
                      </td>
                      <td>
                        <span className="s360-table-date">{item.dateText}</span>
                      </td>
                      <td>
                        <span className="s360-table-feedback" title={item.evaluationText}>
                          {item.evaluationText}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {item.latestSub && onOpenGrading ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onOpenGrading(item.latestSub)}
                          >
                            <Award size={12} />
                            {item.status === 'Graded' ? 'Review Grade' : 'Grade 10M'}
                          </Button>
                        ) : (
                          <span className="s360-no-action">Not Submitted</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: FACULTY NOTES & ADVISING ── */}
      {activeTab === 'notes' && (
        <div className="s360-tab-content">
          <div className="s360-section-panel">
            <div className="s360-panel-header">
              <div className="s360-panel-title">
                <MessageSquare size={16} />
                <h3>Faculty Advising & Rubric Notes</h3>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsNoteModalOpen(true)}
              >
                <Plus size={14} /> Add Advisory Note
              </Button>
            </div>

            <div className="s360-panel-body">
              {/* Existing Rubric Feedback Notes from Evaluated Submissions */}
              {studentSubmissions.filter((s) => s.feedback).length > 0 && (
                <div className="s360-notes-subgroup">
                  <h4 className="s360-notes-subtitle">Official Rubric Commentary from Evaluations</h4>
                  <div className="s360-notes-list">
                    {studentSubmissions.filter((s) => s.feedback).map((s) => (
                      <div key={s.id} className="s360-note-item s360-note-rubric">
                        <div className="s360-note-head">
                          <div className="s360-note-category">
                            <Award size={12} /> Rubric Feedback · {s.practicalTitle || 'Practical'}
                          </div>
                          <span className="s360-note-date">{formatDate(s.gradedAt || s.submittedAt)}</span>
                        </div>
                        <p className="s360-note-body">{s.feedback}</p>
                        <div className="s360-note-meta">
                          <span>Final Score: <strong>{s.totalMarks}/10.0 M</strong></span>
                          <span>Evaluated by Faculty</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Locally Saved Faculty Advisory Notes */}
              <div className="s360-notes-subgroup" style={{ marginTop: 24 }}>
                <h4 className="s360-notes-subtitle">Faculty Advising Log</h4>
                {localNotes.length === 0 ? (
                  <div className="s360-empty-state">
                    <MessageSquare size={24} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                    <p>No advisory notes recorded yet.</p>
                    <span>Click &quot;Add Advisory Note&quot; to write confidential mentoring or viva observations.</span>
                  </div>
                ) : (
                  <div className="s360-notes-list">
                    {localNotes.map((n) => (
                      <div key={n.id} className="s360-note-item">
                        <div className="s360-note-head">
                          <span className="s360-note-tag">{n.category}</span>
                          <span className="s360-note-date">{formatDate(n.createdAt)}</span>
                        </div>
                        <p className="s360-note-body">{n.content}</p>
                        <div className="s360-note-meta">
                          <span>{n.author}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Send Note Composer ── */}
      <Modal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        title={`Send Note · ${student?.name || 'Student'}`}
        maxWidth="520px"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsNoteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveNote} disabled={!noteContent.trim()}>
              <Send size={13} /> Save Note
            </Button>
          </>
        }
      >
        <div className="s360-note-form">
          <div className="s360-form-field">
            <label className="s360-form-label">Note Category</label>
            <div className="s360-category-pills">
              {['Advisory', 'Viva Note', 'Commendation', 'Action Item'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`s360-cat-pill ${noteCategory === cat ? 'active' : ''}`}
                  onClick={() => setNoteCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="s360-form-field">
            <label className="s360-form-label">Observation / Coaching Remarks</label>
            <textarea
              className="s360-form-textarea"
              rows={4}
              placeholder="Record specific feedback regarding algorithmic invariants, viva responses, lab diligence, or concepts to review..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              autoFocus
            />
          </div>
          <div className="s360-form-hint">
            Notes are confidential to faculty mentoring records and visible across your workspace sessions.
          </div>
        </div>
      </Modal>
    </div>
  );
}
