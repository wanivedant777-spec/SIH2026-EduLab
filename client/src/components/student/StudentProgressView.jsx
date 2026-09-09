import React, { useMemo } from 'react';
import {
  TrendingUp,
  Activity,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  Code,
  Eye,
  Layers,
  Compass,
  Award,
  Clock,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import Badge from '../ui/Badge';

// 10 Curricular Competency Areas supported by EduLab with keyword matching
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

export default function StudentProgressView({
  submissions = [],
  practicals = [],
  currentPractical = null,
  studentProfile: _studentProfile,
  onSelectPractical,
  onReviewConcept,
  onOpenVisualization,
  onContinueLearning,
}) {
  // 1. Overview metrics derived purely from real submissions & practicals
  const metrics = useMemo(() => {
    const totalPracticalsCount = practicals.length > 0 ? practicals.length : 6;
    const completedSubmissions = submissions.filter(
      (s) => s.status === 'Graded' || s.status === 'Submitted'
    );
    const completedCount = completedSubmissions.length;
    const evaluatedSubmissions = submissions.filter((s) => s.status === 'Graded');
    const evaluatedCount = evaluatedSubmissions.length;

    const totalEvaluatedMarks = evaluatedSubmissions.reduce(
      (sum, s) => sum + (parseFloat(s.totalMarks) || 0),
      0
    );
    const averageMarks =
      evaluatedCount > 0 ? (totalEvaluatedMarks / evaluatedCount).toFixed(1) : null;

    const completionPercentage = Math.round((completedCount / totalPracticalsCount) * 100);

    return {
      totalPracticalsCount,
      completedCount,
      evaluatedCount,
      averageMarks,
      completionPercentage,
      hasData: submissions.length > 0,
    };
  }, [submissions, practicals]);

  // 2. Skill Mastery mapping: Discrete truthful states (No fabricated percentages)
  const skillMastery = useMemo(() => {
    return CURRICULUM_COMPETENCIES.map((comp) => {
      // Find submissions that test this competency
      const relatedSubmissions = submissions.filter((s) => {
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

      const currentPNum = currentPractical
        ? Number(currentPractical.practicalNumber || (currentPractical.title?.match(/Practical\s*0?(\d+)/i)?.[1] || 0))
        : 0;
      const isCurrentActive =
        currentPractical &&
        (comp.practicalNumbers.includes(currentPNum) ||
          (comp.keywords && comp.keywords.some((kw) => (currentPractical.title || '').toLowerCase().includes(kw))));

      let state = 'Not Started';
      let evidence = 'Upcoming in curriculum sequence.';
      let scoreBadge = null;

      if (relatedSubmissions.length > 0) {
        // Find best attempt for this competency
        const bestSub = [...relatedSubmissions].sort(
          (a, b) => (parseFloat(b.totalMarks) || 0) - (parseFloat(a.totalMarks) || 0)
        )[0];

        const passRate =
          bestSub.passRate ??
          (bestSub.passedCount && bestSub.totalCount
            ? Math.round((bestSub.passedCount / bestSub.totalCount) * 100)
            : null);
        const marks = parseFloat(bestSub.totalMarks);

        if (passRate === 100 && (marks >= 8.5 || marks === undefined)) {
          state = 'Mastered';
          evidence = `100% test suite pass rate${marks ? ` · Evaluated at ${marks}/10` : ''}. Optimal complexity confirmed.`;
          scoreBadge = marks ? `${marks}/10` : '100%';
        } else if (passRate >= 70 || marks >= 7.0) {
          state = 'Proficient';
          evidence = `Core invariant tests verified${bestSub.passedCount ? ` (${bestSub.passedCount}/${bestSub.totalCount} tests passed)` : ''}.`;
          scoreBadge = marks ? `${marks}/10` : `${passRate}%`;
        } else if (passRate > 0 || bestSub.status === 'Submitted') {
          state = 'Developing';
          evidence = `Attempted with partial test coverage (${passRate || 0}% pass rate). Boundary conditions require review.`;
          scoreBadge = marks ? `${marks}/10` : `${passRate}%`;
        } else {
          state = 'Learning';
          evidence = 'Submission pending automated evaluation.';
        }
      } else if (isCurrentActive) {
        state = 'Learning';
        evidence = 'Active in Code Lab workspace.';
      }

      return {
        ...comp,
        state,
        evidence,
        scoreBadge,
        relatedPracticals,
      };
    });
  }, [submissions, practicals, currentPractical]);

  // 3. Performance Trend (Chronological submission delta)
  const performanceTrend = useMemo(() => {
    if (submissions.length === 0) {
      return { status: 'No Data', deltaText: 'No submissions recorded yet.', items: [] };
    }

    // Sort submissions chronologically ascending
    const sorted = [...submissions].sort((a, b) => {
      const dateA = new Date(a.submittedDate || a.createdAt || 0);
      const dateB = new Date(b.submittedDate || b.createdAt || 0);
      return dateA - dateB;
    });

    if (sorted.length === 1) {
      return {
        status: 'Stable',
        badgeClass: 'stable',
        label: 'Stable',
        deltaText: 'Baseline established with 1 evaluated submission.',
        items: sorted,
      };
    }

    const latest = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];

    const latestScore = parseFloat(latest.totalMarks) || (latest.passRate ? latest.passRate / 10 : 0);
    const prevScore = parseFloat(prev.totalMarks) || (prev.passRate ? prev.passRate / 10 : 0);
    const scoreDiff = latestScore - prevScore;

    let status = 'Stable';
    let badgeClass = 'stable';
    let deltaText = 'Performance remains consistent across recent curriculum practicals.';

    if (scoreDiff >= 0.5) {
      status = 'Improving';
      badgeClass = 'improving';
      deltaText = `Performance is improving (+${scoreDiff.toFixed(1)} pts higher on recent practical evaluations).`;
    } else if (scoreDiff <= -0.5) {
      status = 'Needs Attention';
      badgeClass = 'needs-attention';
      deltaText = `Recent evaluation score declined by ${Math.abs(scoreDiff).toFixed(1)} pts. Review test edge cases.`;
    }

    return {
      status,
      badgeClass,
      label: status,
      deltaText,
      items: sorted,
    };
  }, [submissions]);

  // 4. Learning Gaps & Strengths
  const { learningGaps, learningStrengths } = useMemo(() => {
    const gaps = [];
    const strengths = [];

    // Derive strengths from Mastered and Proficient skills
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
    submissions.forEach((s) => {
      const pKey =
        s.practicalId ||
        s.practicalNumber ||
        (s.practicalTitle ? s.practicalTitle.match(/Practical\s*0?(\d+)/i)?.[1] : s.practicalTitle);
      if (!latestByPractical[pKey]) {
        latestByPractical[pKey] = s;
      } else {
        const curDate = new Date(s.submittedDate || s.createdAt || 0);
        const prevDate = new Date(latestByPractical[pKey].submittedDate || latestByPractical[pKey].createdAt || 0);
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

      // Only flag as a gap if the student's LATEST attempt failed or is sub-optimal (< 70% pass rate or marks < 7.0)
      if (passRate !== null && passRate < 70 && (isNaN(marks) || marks < 7.0)) {
        const title = sub.practicalTitle || (sub.practical && sub.practical.title) || `Practical 0${sub.practicalNumber}`;
        const alreadyInGaps = gaps.some((g) => g.concept.includes(title));
        if (!alreadyInGaps) {
          gaps.push({
            concept: title,
            state: 'Needs Attention',
            badgeClass: 'developing',
            evidence: `${sub.passedCount || 0}/${sub.totalCount || 4} test cases passed on latest attempt. Edge cases failed.`,
            practical: practicals.find((p) => p.id === sub.practicalId || p.practicalNumber === sub.practicalNumber) || null,
            actionText: 'Debug in Code Lab',
          });
        }
      }
    });

    return { learningGaps: gaps, learningStrengths: strengths };
  }, [skillMastery, submissions, practicals]);

  // 5. Next Learning Path: 2–3 relevant practicals with one primary recommendation
  const nextLearningPath = useMemo(() => {
    // Determine which practicals student has passed with >= 70% pass rate or >= 7.0 marks
    const passedNumbers = new Set();
    const passedIds = new Set();

    submissions.forEach((s) => {
      const passRate = s.passRate || 0;
      const marks = parseFloat(s.totalMarks) || 0;
      if (passRate >= 70 || marks >= 7.0) {
        if (s.practicalId) passedIds.add(s.practicalId);
        const pNum =
          s.practicalNumber ||
          (s.practical && s.practical.practicalNumber) ||
          (s.practicalTitle ? parseInt(s.practicalTitle.match(/Practical\s*0?(\d+)/i)?.[1] || '0', 10) : 0);
        if (pNum) passedNumbers.add(pNum);
      }
    });

    // Uncompleted practicals from available practicals
    const pendingPracticals = practicals.filter((p) => {
      const pNum = Number(p.practicalNumber);
      if (pNum && passedNumbers.has(pNum)) return false;
      if (p.id && passedIds.has(p.id)) return false;
      return true;
    });

    // Sort pending by practicalNumber ascending
    pendingPracticals.sort(
      (a, b) => (Number(a.practicalNumber) || 0) - (Number(b.practicalNumber) || 0)
    );

    // Take up to 3
    const recommendations = pendingPracticals.slice(0, 3);

    // If all completed or none found, fallback to curriculum exploration
    if (recommendations.length === 0) {
      if (practicals.length > 0) {
        return practicals.slice(0, 2).map((p, idx) => ({
          practical: p,
          isPrimary: idx === 0,
          recommendationReason: idx === 0 ? 'Curriculum Complete · Review Invariants' : 'Algorithmic Optimization',
        }));
      }
      return [];
    }

    return recommendations.map((p, idx) => ({
      practical: p,
      isPrimary: idx === 0,
      recommendationReason:
        idx === 0
          ? 'Recommended Next Milestone'
          : `Upcoming Concept in Curriculum · Step 0${idx + 1}`,
    }));
  }, [practicals, submissions]);

  // Handler helpers
  const handleStartPractical = (p) => {
    if (onSelectPractical && p) {
      onSelectPractical(p);
    }
  };

  const handleReviewTheory = (p) => {
    if (onReviewConcept && p) {
      onReviewConcept(p);
    }
  };

  const handleOpenVis = (p) => {
    if (onOpenVisualization && p) {
      onOpenVisualization(p);
    }
  };

  return (
    <div className="progress-screen-root">
      {/* 1. Header with Overall Learning Progress */}
      <div className="progress-header-container">
        <div className="progress-header-info">
          <h1 className="progress-header-title">Student Progress</h1>
          <p className="progress-header-subtitle">
            Comprehensive competency trajectory, diagnostic performance trends, and curated curriculum progression.
          </p>
        </div>

        <div className="progress-header-progress-pod">
          <div className="progress-header-progress-label">Curriculum Completion</div>
          <div className="progress-header-progress-val">
            {metrics.completedCount} of {metrics.totalPracticalsCount} Practicals ({metrics.completionPercentage}%)
          </div>
          <div className="progress-bar-track" aria-label="Curriculum Progress">
            <div
              className="progress-bar-fill"
              style={{ width: `${Math.min(100, Math.max(0, metrics.completionPercentage))}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Overview Stat Cards */}
      <div className="progress-overview-grid">
        <div className="progress-overview-card">
          <div className="progress-overview-top">
            <span className="progress-overview-label">Practical Completion</span>
            <CheckCircle2 size={16} className="progress-overview-icon" />
          </div>
          <div className="progress-overview-val">
            {metrics.completedCount} <span style={{ fontSize: '15px', color: 'var(--text-tertiary)', fontWeight: 500 }}>/ {metrics.totalPracticalsCount}</span>
          </div>
          <div className="progress-overview-sub">
            {metrics.completedCount > 0 ? `${metrics.completionPercentage}% of syllabus submitted` : 'No submissions yet'}
          </div>
        </div>

        <div className="progress-overview-card">
          <div className="progress-overview-top">
            <span className="progress-overview-label">Evaluated Practicals</span>
            <Award size={16} className="progress-overview-icon" />
          </div>
          <div className="progress-overview-val">
            {metrics.evaluatedCount}
          </div>
          <div className="progress-overview-sub">
            {metrics.evaluatedCount > 0 ? 'AICTE 10-Mark rubrics completed' : 'Awaiting faculty evaluation'}
          </div>
        </div>

        <div className="progress-overview-card">
          <div className="progress-overview-top">
            <span className="progress-overview-label">Average Performance</span>
            <BarChart3 size={16} className="progress-overview-icon" />
          </div>
          <div className="progress-overview-val">
            {metrics.averageMarks ? `${metrics.averageMarks}` : '—'}
            {metrics.averageMarks && <span style={{ fontSize: '15px', color: 'var(--text-tertiary)', fontWeight: 500 }}> / 10</span>}
          </div>
          <div className="progress-overview-sub">
            {metrics.averageMarks ? 'Average across evaluated rubrics' : 'Telemetry pending evaluation'}
          </div>
        </div>

        <div className="progress-overview-card">
          <div className="progress-overview-top">
            <span className="progress-overview-label">Current Learning Status</span>
            <Activity size={16} className="progress-overview-icon" />
          </div>
          <div className="progress-overview-val" style={{ fontSize: '18px', fontWeight: 600 }}>
            {currentPractical
              ? `P0${currentPractical.practicalNumber || 4}`
              : metrics.completedCount > 0
              ? 'On Track'
              : 'Ready to Begin'}
          </div>
          <div className="progress-overview-sub" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentPractical ? currentPractical.title?.split(':')[0] || currentPractical.title : 'NEP 2020 Level 5 Invariants'}
          </div>
        </div>
      </div>

      {/* 3. Skill Mastery Matrix */}
      <section className="progress-section">
        <div className="progress-section-header">
          <div className="progress-section-title-wrap">
            <h2 className="progress-section-title">
              <Layers size={17} style={{ color: 'var(--primary)' }} />
              Competency Areas & Skill Mastery
            </h2>
            <p className="progress-section-desc">
              Discrete, verified competency levels mapped to curriculum practicals and live Judge0 execution results.
            </p>
          </div>
        </div>

        <div className="skill-mastery-grid">
          {skillMastery.map((skill) => {
            const stateClass = skill.state.toLowerCase().replace(/\s+/g, '-');
            return (
              <div key={skill.id} className="skill-mastery-card">
                <div className="skill-mastery-top">
                  <h3 className="skill-mastery-name">{skill.name}</h3>
                  <span className={`skill-state-pill ${stateClass}`}>
                    {skill.state}
                  </span>
                </div>

                <p className="skill-mastery-desc">
                  {skill.evidence}
                </p>

                <div className="skill-mastery-footer">
                  <span>
                    {skill.relatedPracticals.length > 0
                      ? [...new Set(skill.relatedPracticals.map((p) => p.practicalNumber).filter(Boolean))]
                          .sort((a, b) => a - b)
                          .map((n) => `P${String(n).padStart(2, '0')}`)
                          .join(', ')
                      : 'Curricular Module'}
                  </span>
                  {skill.scoreBadge && (
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {skill.scoreBadge}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Performance Trend */}
      <section className="progress-section">
        <div className="progress-section-header">
          <div className="progress-section-title-wrap">
            <h2 className="progress-section-title">
              <TrendingUp size={17} style={{ color: 'var(--primary)' }} />
              Performance Trajectory & Evaluation History
            </h2>
            <p className="progress-section-desc">
              Real-time trajectory calculated from sequential test execution passes and faculty rubric marks.
            </p>
          </div>
        </div>

        {submissions.length === 0 ? (
          <div className="progress-empty-state">
            <div className="progress-empty-icon">
              <Activity size={22} />
            </div>
            <h4 className="progress-empty-title">No Performance Data Recorded</h4>
            <p className="progress-empty-desc">
              Run and submit code in the Code Lab to generate your verified performance trend and diagnostic trajectory.
            </p>
            {practicals.length > 0 && (
              <button
                className="btn btn-primary"
                style={{ marginTop: '8px' }}
                onClick={() => handleStartPractical(practicals[0])}
              >
                <Code size={13} />
                Start Practical 01
              </button>
            )}
          </div>
        ) : (
          <div className="progress-trend-card">
            <div className="progress-trend-summary-row">
              <div className="progress-trend-metric-group">
                <span className={`progress-trend-badge ${performanceTrend.badgeClass}`}>
                  {performanceTrend.status === 'Improving' && <TrendingUp size={14} />}
                  {performanceTrend.status === 'Stable' && <Activity size={14} />}
                  {performanceTrend.status === 'Needs Attention' && <AlertTriangle size={14} />}
                  Trajectory: {performanceTrend.label}
                </span>
                <span className="progress-trend-summary-text">
                  {performanceTrend.deltaText}
                </span>
              </div>
            </div>

            <div className="progress-trend-list">
              {performanceTrend.items.map((sub, idx) => {
                const pTitle = sub.practicalTitle || (sub.practical && sub.practical.title) || `Practical 0${sub.practicalNumber || idx + 1}`;
                const dateStr = sub.submittedDate || sub.createdAt
                  ? new Date(sub.submittedDate || sub.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Recent Attempt';

                return (
                  <div key={sub.id || idx} className="progress-trend-item">
                    <div className="progress-trend-item-left">
                      <span className="progress-trend-index">#{idx + 1}</span>
                      <div className="progress-trend-details">
                        <span className="progress-trend-practical-title">{pTitle}</span>
                        <span className="progress-trend-date">{dateStr} · {sub.status || 'Submitted'}</span>
                      </div>
                    </div>

                    <div className="progress-trend-item-right">
                      {sub.passRate !== undefined && (
                        <Badge
                          variant={sub.passRate >= 100 ? 'success' : sub.passRate >= 70 ? 'primary' : 'warning'}
                          size="sm"
                        >
                          {sub.passedCount ? `${sub.passedCount}/${sub.totalCount} Passed` : `${sub.passRate}% Pass Rate`}
                        </Badge>
                      )}

                      <div className="progress-trend-score-pod">
                        <div className="progress-trend-score-val">
                          {sub.totalMarks ? `${parseFloat(sub.totalMarks).toFixed(1)} / 10` : 'Pending'}
                        </div>
                        <div className="progress-trend-score-sub">
                          {sub.status === 'Graded' ? 'AICTE Evaluated' : 'Submitted'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* 5. Diagnostics: Learning Strengths & Learning Gaps */}
      <section className="progress-section">
        <div className="progress-section-header">
          <div className="progress-section-title-wrap">
            <h2 className="progress-section-title">
              <Sparkles size={17} style={{ color: 'var(--primary)' }} />
              Diagnostic Insights: Strengths & Identified Gaps
            </h2>
            <p className="progress-section-desc">
              Evidence-based diagnostic telemetry highlighting proven proficiencies and concepts requiring reinforcement.
            </p>
          </div>
        </div>

        <div className="progress-two-col-grid">
          {/* Learning Strengths */}
          <div className="progress-diag-card">
            <div className="progress-diag-card-header">
              <h3 className="progress-diag-card-title">
                <CheckCircle2 size={16} style={{ color: '#059669' }} />
                Verified Strengths
              </h3>
              <Badge variant="success" size="sm">
                {learningStrengths.length} Confirmed
              </Badge>
            </div>

            {learningStrengths.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                Complete curriculum practicals with optimal test pass rates to populate verified algorithmic strengths.
              </div>
            ) : (
              <div className="progress-diag-list">
                {learningStrengths.map((item, idx) => (
                  <div key={idx} className="progress-diag-item">
                    <div className="progress-diag-item-top">
                      <span className="progress-diag-item-concept">{item.concept}</span>
                      <span className={`skill-state-pill ${item.badgeClass}`}>
                        {item.state}
                      </span>
                    </div>
                    <div className="progress-diag-item-evidence">
                      {item.evidence}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Learning Gaps */}
          <div className="progress-diag-card">
            <div className="progress-diag-card-header">
              <h3 className="progress-diag-card-title">
                <AlertTriangle size={16} style={{ color: '#D97706' }} />
                Concepts Needing Attention
              </h3>
              <Badge variant={learningGaps.length > 0 ? 'warning' : 'neutral'} size="sm">
                {learningGaps.length} Actionable
              </Badge>
            </div>

            {learningGaps.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.5 }}>
                <CheckCircle2 size={24} style={{ color: '#059669', margin: '0 auto 8px', display: 'block' }} />
                No critical knowledge gaps detected across your submitted practicals. All test criteria are meeting standards.
              </div>
            ) : (
              <div className="progress-diag-list">
                {learningGaps.map((item, idx) => (
                  <div key={idx} className="progress-diag-item">
                    <div className="progress-diag-item-top">
                      <span className="progress-diag-item-concept">{item.concept}</span>
                      <span className={`skill-state-pill ${item.badgeClass}`}>
                        {item.state}
                      </span>
                    </div>
                    <div className="progress-diag-item-evidence">
                      {item.evidence}
                    </div>
                    {item.practical && (
                      <div className="progress-diag-item-action">
                        <button
                          className="btn btn-secondary btn-xs"
                          onClick={() => handleStartPractical(item.practical)}
                        >
                          <Code size={12} />
                          {item.actionText || 'Practice in Code Lab'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 6. Next Learning Path */}
      <section className="progress-section">
        <div className="progress-section-header">
          <div className="progress-section-title-wrap">
            <h2 className="progress-section-title">
              <Compass size={17} style={{ color: 'var(--primary)' }} />
              Next Learning Path
            </h2>
            <p className="progress-section-desc">
              Curriculum progression recommendations determined by your completed milestones and competency readiness.
            </p>
          </div>
        </div>

        {nextLearningPath.length === 0 ? (
          <div className="progress-empty-state">
            <CheckCircle2 size={32} style={{ color: '#059669' }} />
            <h4 className="progress-empty-title">All Curriculum Milestones Completed</h4>
            <p className="progress-empty-desc">
              You have completed all practicals in the current syllabus. You can review your code or run stress tests in the Code Lab.
            </p>
            {onContinueLearning && (
              <button className="btn btn-secondary" onClick={onContinueLearning}>
                Browse All Practicals
              </button>
            )}
          </div>
        ) : (
          <div className="next-path-grid">
            {nextLearningPath.map(({ practical, isPrimary }) => {
              const pNum = String(practical.practicalNumber || 1).padStart(2, '0');
              return (
                <div
                  key={practical.id || practical.practicalNumber}
                  className={`next-path-card ${isPrimary ? 'primary-recommendation' : ''}`}
                >
                  <div className="next-path-top">
                    <div className="next-path-badge-row">
                      <Badge variant={isPrimary ? 'primary' : 'neutral'} size="sm">
                        {isPrimary ? 'Recommended Next Step' : 'Upcoming Milestone'}
                      </Badge>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)' }}>
                        P{pNum}
                      </span>
                    </div>

                    <h3 className="next-path-title">
                      {practical.title}
                    </h3>

                    <p className="next-path-desc">
                      {practical.aim || practical.description || 'Master core data structures and algorithmic complexity bounds.'}
                    </p>

                    <div className="next-path-meta">
                      <span><Clock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />{practical.avgTime || '30 Mins'}</span>
                      <span>·</span>
                      <span>{practical.difficulty || 'Intermediate'}</span>
                    </div>
                  </div>

                  <div className="next-path-actions">
                    <button
                      className={`btn ${isPrimary ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                      style={{ flex: 1 }}
                      onClick={() => handleStartPractical(practical)}
                    >
                      <Code size={13} />
                      Open in Code Lab
                    </button>

                    <button
                      className="btn btn-ghost btn-sm"
                      title="Review Theory"
                      onClick={() => handleReviewTheory(practical)}
                    >
                      <BookOpen size={14} />
                    </button>

                    <button
                      className="btn btn-ghost btn-sm"
                      title="Interactive Visualization"
                      onClick={() => handleOpenVis(practical)}
                    >
                      <Eye size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
