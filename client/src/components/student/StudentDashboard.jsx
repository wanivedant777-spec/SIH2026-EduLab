import React, { useState, useMemo } from 'react';
import {
  Play,
  BookOpen,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  AlertTriangle,
  RefreshCw,
  Hash,
  Building,
  Calendar,
  Mail,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Compass,
  ArrowRight,
  Inbox,
  ShieldCheck,
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import StudentSubjectSelector from './StudentSubjectSelector';
import Hero3DObject from './Hero3DObject';

export default function StudentDashboard({
  currentUser,
  studentProfile,
  subjects = [],
  selectedSubject = null,
  onSelectSubject,
  assignments = [],
  practicals = [],
  currentPractical = null,
  submissions = [],
  evaluationResult = null,
  isLoading = false,
  isLoadingSubjects = false,
  error = null,
  onRetry,
  onContinuePractical,
  onSelectPractical,
}) {
  const [showInstitutionalDetails, setShowInstitutionalDetails] = useState(false);

  // Student Identity & Institutional Data
  const fullName = studentProfile?.full_name || currentUser?.name || 'Student';
  const prn = studentProfile?.identifier || currentUser?.identifier || 'Not Assigned';
  const email = studentProfile?.email || currentUser?.email || '—';
  const collegeName = studentProfile?.colleges?.name || studentProfile?.collegeName || 'Institutional College';
  const departmentName = studentProfile?.departments?.name || studentProfile?.departmentName || 'Computer Engineering';
  const divisionName = studentProfile?.divisions?.name || studentProfile?.divisionName || 'Division A';
  const batchName = studentProfile?.batches?.name || currentUser?.batchName || 'Your Batch';
  const academicYear = studentProfile?.divisions?.academic_year || studentProfile?.academicYear || '2025-2026';
  const semesterDisplay = studentProfile?.divisions?.semester ? `Semester ${studentProfile.divisions.semester}` : 'Semester 4';

  // Active Practical Resolution
  const activePractical = useMemo(() => {
    if (currentPractical) return currentPractical;
    if (assignments.length > 0 && assignments[0].practical) return assignments[0].practical;
    if (practicals.length > 0) return practicals[0];
    return null;
  }, [currentPractical, assignments, practicals]);

  // Submission for active practical (if attempted)
  const activePracticalSubmission = useMemo(() => {
    if (!activePractical) return null;
    return submissions.find((s) => s.practicalId === activePractical.id) || null;
  }, [activePractical, submissions]);

  // Curriculum Progress Calculations (Real Data)
  const totalAssignmentsCount = assignments.length || practicals.length;
  const completedAssignmentsCount = useMemo(() => {
    if (assignments.length > 0) {
      return assignments.filter((a) => submissions.some((s) => s.practicalId === a.practicalId)).length;
    }
    return submissions.length;
  }, [assignments, submissions]);

  const progressPercentage = totalAssignmentsCount > 0
    ? Math.min(100, Math.round((completedAssignmentsCount / totalAssignmentsCount) * 100))
    : 0;

  const averageCodingMarks = useMemo(() => {
    if (submissions.length === 0) return '0.0';
    const sum = submissions.reduce((acc, s) => acc + (parseFloat(s.codingMarks) || 0), 0);
    return (sum / submissions.length).toFixed(1);
  }, [submissions]);

  // Recent Submissions (Latest 3)
  const recentSubmissions = useMemo(() => {
    return [...submissions].slice(0, 3);
  }, [submissions]);

  // Diagnostic Mentor Data (Real rule-based reasoning from evaluationResult or latest submission)
  const diagnosticData = useMemo(() => {
    if (evaluationResult?.adaptive_tiering) {
      return {
        hasData: true,
        source: 'compiler_evaluation',
        assignedTier: evaluationResult.adaptive_tiering.assigned_tier || 'Proficient',
        recommendedDifficulty: evaluationResult.adaptive_tiering.recommended_difficulty || 'Medium',
        reasoning: evaluationResult.adaptive_tiering.reasoning || '',
        testPasses: `${evaluationResult.passed_test_cases}/${evaluationResult.total_test_cases}`,
        codingMarks: evaluationResult.coding_marks_awarded,
      };
    }

    if (submissions.length > 0) {
      const latest = submissions[0];
      if (latest.adaptiveTier || latest.feedback) {
        return {
          hasData: true,
          source: 'submission_record',
          assignedTier: latest.adaptiveTier || 'Proficient',
          recommendedDifficulty: latest.adaptiveTier === 'Advanced' ? 'Hard' : latest.adaptiveTier === 'Beginner' ? 'Easy' : 'Medium',
          reasoning: latest.feedback || `Evaluated on ${latest.language?.toUpperCase() || 'compiler'} test harness with ${latest.passedCount || 0}/${latest.totalCount || 3} verified passes.`,
          testPasses: `${latest.passedCount || 0}/${latest.totalCount || 3}`,
          codingMarks: latest.codingMarks,
        };
      }
    }

    return { hasData: false };
  }, [evaluationResult, submissions]);

  // Topic Competency Matrix (Derived from real practicals & submissions)
  const topicCompetencies = useMemo(() => {
    const topics = [
      { id: 'linear', name: 'Linear Structures & Arrays', keyword: 'array' },
      { id: 'trees', name: 'Hierarchical Trees & BST', keyword: 'tree' },
      { id: 'graphs', name: 'Graph Traversal & Shortest Path', keyword: 'graph' },
      { id: 'complexity', name: 'Algorithmic Bounds & Invariants', keyword: 'invariants' },
    ];

    return topics.map((t) => {
      // Check if student has submitted a practical related to this topic
      const relatedSub = submissions.find(
        (s) =>
          s.practicalTitle?.toLowerCase().includes(t.keyword) ||
          s.language?.toLowerCase().includes(t.keyword)
      );

      if (relatedSub) {
        const isMastered = (relatedSub.passRate || 0) >= 100;
        return {
          ...t,
          status: isMastered ? 'Verified Mastery' : 'In Progress',
          variant: isMastered ? 'success' : 'warning',
          score: `${relatedSub.codingMarks || 0}/3.0 M`,
        };
      }

      // Check if practical is assigned
      const isAssigned = assignments.some(
        (a) =>
          a.title?.toLowerCase().includes(t.keyword) ||
          a.practical?.title?.toLowerCase().includes(t.keyword)
      );

      return {
        ...t,
        status: isAssigned ? 'Assigned' : 'Curriculum Pending',
        variant: 'neutral',
        score: 'Not Attempted',
      };
    });
  }, [submissions, assignments]);

  return (
    <div className="student-dashboard-page" id="student-dashboard-root">
      <div className="dashboard-container">
        {/* Error state banner with retry */}
        {error && (
          <div
            className="db-error-banner"
            style={{
              background: 'var(--danger-subtle)',
              border: '1px solid var(--danger-border)',
              borderRadius: 'var(--radius-md)',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertTriangle size={20} color="var(--danger-text)" />
              <div>
                <strong style={{ color: 'var(--text-primary)', fontSize: '13.5px', display: 'block' }}>
                  Database Synchronization Notice
                </strong>
                <span style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}>{error}</span>
              </div>
            </div>
            {onRetry && (
              <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRetry}>
                Retry Sync
              </Button>
            )}
          </div>
        )}

        {/* =========================================================
            1. WELCOME / CURRENT LEARNING STATE
            ========================================================= */}
        <section className="dashboard-welcome-section" aria-label="Student Learning Status">
          <div className="welcome-banner-card">
            <div className="welcome-banner-top">
              <div className="welcome-greeting-group">
                <div className="welcome-badge-row">
                  <span className="welcome-portal-tag">STUDENT LEARNING CONSOLE</span>
                  <Badge variant="primary" size="sm" dot>
                    Active Session
                  </Badge>
                  <span className="welcome-batch-pill font-mono">
                    <Layers size={11} />
                    {batchName}
                  </span>
                </div>
                <h1 className="welcome-title">
                  Welcome back, <span className="welcome-name-highlight">{fullName}</span>
                </h1>
                <p className="welcome-subtitle">
                  Enrolled in <strong style={{ color: 'var(--text-primary)' }}>{selectedSubject?.name || 'Curricular Laboratory'}</strong> ({selectedSubject?.code || 'CS201P'}) · AICTE &amp; NEP 2020 Accredited
                </p>
              </div>

              {/* Collapsible Institutional Details Trigger */}
              <button
                type="button"
                className="institutional-toggle-btn"
                onClick={() => setShowInstitutionalDetails((prev) => !prev)}
                title="Toggle verified institutional credentials"
              >
                <ShieldCheck size={14} color="var(--primary)" />
                <span>PRN: <strong className="font-mono">{prn}</strong></span>
                {showInstitutionalDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            {/* Expandable Institutional Credentials Strip */}
            {showInstitutionalDetails && (
              <div className="institutional-details-drawer">
                <div className="inst-meta-grid">
                  <div className="inst-meta-item">
                    <Hash size={12} className="inst-meta-icon" />
                    <span className="inst-meta-label">PRN:</span>
                    <span className="inst-meta-val font-mono">{prn}</span>
                  </div>
                  <div className="inst-meta-item">
                    <Building size={12} className="inst-meta-icon" />
                    <span className="inst-meta-label">College:</span>
                    <span className="inst-meta-val" title={collegeName}>{collegeName}</span>
                  </div>
                  <div className="inst-meta-item">
                    <BookOpen size={12} className="inst-meta-icon" />
                    <span className="inst-meta-label">Dept:</span>
                    <span className="inst-meta-val">{departmentName}</span>
                  </div>
                  <div className="inst-meta-item">
                    <Layers size={12} className="inst-meta-icon" />
                    <span className="inst-meta-label">Div / Batch:</span>
                    <span className="inst-meta-val">{divisionName} · {batchName}</span>
                  </div>
                  <div className="inst-meta-item">
                    <Calendar size={12} className="inst-meta-icon" />
                    <span className="inst-meta-label">Term:</span>
                    <span className="inst-meta-val">{academicYear} · {semesterDisplay}</span>
                  </div>
                  <div className="inst-meta-item">
                    <Mail size={12} className="inst-meta-icon" />
                    <span className="inst-meta-label">Email:</span>
                    <span className="inst-meta-val font-mono" title={email}>{email}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* =========================================================
            2. CURRENT PRACTICAL / CONTINUE LEARNING
            (Primary Call-to-Action: Continue Practical / Open in Code Lab)
            ========================================================= */}
        {activePractical && (
          <section className="dashboard-current-practical-section" aria-label="Current Practical">
            <Card surface="white" className="current-practical-hero-card">
              <div className="current-practical-inner">
                <div className="current-practical-header-row">
                  <div className="current-practical-tag">
                    <span className="pulse-blue-dot" />
                    <span>CURRENT PRACTICAL · IN PROGRESS</span>
                  </div>
                  <div className="current-practical-badges">
                    <Badge tier={activePractical.difficulty === 'Hard' ? 'Advanced' : 'Proficient'} size="sm">
                      {activePractical.difficulty === 'Hard' ? 'Advanced Tier' : 'Proficient Tier'}
                    </Badge>
                    <Badge variant="nep" size="sm">
                      AICTE 10-Mark Model
                    </Badge>
                  </div>
                </div>

                <div className="current-practical-content">
                  <div className="current-practical-info">
                    <div className="current-practical-course-code">
                      {activePractical.courseCode?.split(':')[0] || 'CS201P'} · {selectedSubject?.name || 'Laboratory Experiment'}
                    </div>
                    <h2 className="current-practical-title">
                      {activePractical.title}
                    </h2>
                    <p className="current-practical-description">
                      {activePractical.aim || activePractical.description || 'Implement algorithmic operations satisfying curricular time and space invariants with automated test suite validation.'}
                    </p>

                    {/* Test Suite & Rubric Telemetry */}
                    <div className="current-practical-telemetry-row">
                      <div className="telemetry-pill">
                        <CheckCircle2 size={13} color="var(--primary)" />
                        <span>
                          {activePracticalSubmission
                            ? `Latest Pass: ${activePracticalSubmission.passedCount}/${activePracticalSubmission.totalCount} Test Cases (${activePracticalSubmission.codingMarks}/3.0 M)`
                            : `${activePractical.testCases?.length || 3} Curricular Test Suites Configured`}
                        </span>
                      </div>
                      <div className="telemetry-pill">
                        <Clock size={13} color="var(--text-muted)" />
                        <span>Curricular Term Allocation</span>
                      </div>
                    </div>
                  </div>

                  {/* PROMINENT PRIMARY ACTION BUTTON */}
                  <div className="current-practical-action-wrap">
                    <Button
                      variant="primary"
                      size="lg"
                      icon={Play}
                      className="btn-continue-practical"
                      onClick={() => onContinuePractical && onContinuePractical(activePractical)}
                    >
                      Continue Practical / Open in Code Lab
                    </Button>
                    <span className="action-helper-caption">
                      Direct compiler execution with live test cases
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </section>
        )}

        {/* =========================================================
            3. OVERALL CURRICULUM PROGRESS
            ========================================================= */}
        <section className="dashboard-progress-section" aria-label="Curriculum Progress">
          <div className="section-head-row">
            <div className="section-title-wrap">
              <TrendingUp size={16} color="var(--primary)" />
              <h2 className="dashboard-section-heading">Curriculum Progress &amp; Standing</h2>
            </div>
            <span className="section-meta-text">
              Batch {batchName} Completion Metrics
            </span>
          </div>

          <div className="progress-metric-grid">
            <Card surface="white" className="progress-metric-card">
              <span className="progress-card-label">Syllabus Completion</span>
              <div className="progress-card-val-row">
                <span className="progress-card-percentage">{progressPercentage}%</span>
                <span className="progress-card-count font-mono">
                  {completedAssignmentsCount} / {totalAssignmentsCount} Practicals
                </span>
              </div>
              <div className="progress-track" style={{ height: '5px', marginTop: '10px' }}>
                <div
                  className="progress-fill"
                  style={{ width: `${progressPercentage}%`, background: 'var(--primary)' }}
                />
              </div>
              <span className="progress-card-footnote">
                {totalAssignmentsCount - completedAssignmentsCount > 0
                  ? `${totalAssignmentsCount - completedAssignmentsCount} practicals remaining for term completion`
                  : 'All assigned practicals completed!'}
              </span>
            </Card>

            <Card surface="white" className="progress-metric-card">
              <span className="progress-card-label">Auto-Score Average</span>
              <div className="progress-card-val-row">
                <span className="progress-card-score">{averageCodingMarks}</span>
                <span className="progress-card-denom">/ 3.0 M</span>
              </div>
              <span className="progress-card-sublabel">
                Across {submissions.length} automated compiler runs
              </span>
              <span className="progress-card-footnote">
                Judge0 execution with resource bounds: 2.0s CPU, 256MB RAM
              </span>
            </Card>

            <Card surface="white" className="progress-metric-card">
              <span className="progress-card-label">Active Course</span>
              <div className="progress-card-val-row">
                <span className="progress-card-code font-mono">
                  {selectedSubject?.code || 'CS201P'}
                </span>
              </div>
              <span className="progress-card-sublabel" title={selectedSubject?.name}>
                {selectedSubject?.name || 'Data Structures & Algorithms'}
              </span>
              <span className="progress-card-footnote">
                Allocated to Division {divisionName} · Batch {batchName}
              </span>
            </Card>
          </div>
        </section>

        {/* =========================================================
            4. CURRICULUM PRACTICALS
            ========================================================= */}
        <section className="dashboard-practicals-section" aria-label="Curriculum Practicals">
          <div className="section-head-row">
            <div className="section-title-wrap">
              <BookOpen size={16} color="var(--primary)" />
              <h2 className="dashboard-section-heading">Curriculum Practicals</h2>
              <span className="section-count-tag font-mono">{assignments.length}</span>
            </div>
            <span className="section-meta-text">
              Click any practical to load starter template into Code Lab
            </span>
          </div>

          {/* Subject Switcher */}
          <StudentSubjectSelector
            subjects={subjects}
            selectedSubjectId={selectedSubject?.id}
            onSelectSubject={onSelectSubject}
            isLoading={isLoadingSubjects}
          />

          {/* Real Practicals Grid */}
          {isLoading ? (
            <div className="assignments-loading-state">
              <div className="skeleton-assignment-card" />
              <div className="skeleton-assignment-card" />
            </div>
          ) : assignments.length === 0 ? (
            <div className="practicals-empty-state">
              <Inbox size={28} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                No Practicals Assigned Yet
              </h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                When experiments are allocated to Batch {batchName}, they will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="curriculum-practicals-cards-grid">
              {assignments.map((assignment, idx) => {
                const prac = assignment.practical || {};
                const sub = submissions.find((s) => s.practicalId === (assignment.practicalId || prac.id));
                const isCurrent = activePractical?.id === (assignment.practicalId || prac.id);
                const isCompleted = Boolean(sub);

                return (
                  <div
                    key={assignment.id || prac.id || idx}
                    className={`curricular-practical-item ${isCurrent ? 'item-current-active' : ''}`}
                    onClick={() => onSelectPractical && onSelectPractical(prac)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="prac-item-header">
                      <span className="prac-num-tag font-mono">
                        P{prac.practicalNumber || idx + 1}
                      </span>
                      <Badge
                        variant={isCompleted ? 'success' : isCurrent ? 'primary' : 'neutral'}
                        size="sm"
                      >
                        {isCompleted ? 'Completed' : isCurrent ? 'In Progress' : 'Ready'}
                      </Badge>
                    </div>

                    <h3 className="prac-item-title">
                      {prac.title || assignment.title}
                    </h3>

                    <p className="prac-item-aim">
                      {prac.aim || prac.description || 'Implement algorithmic operations satisfying curricular invariants.'}
                    </p>

                    <div className="prac-item-footer">
                      <div className="prac-meta-tags">
                        <span className="prac-diff-tag">
                          {prac.difficulty || 'Medium'}
                        </span>
                        {sub && (
                          <span className="prac-score-tag font-mono">
                            {sub.codingMarks}/3.0 M
                          </span>
                        )}
                      </div>
                      <span className="prac-open-link">
                        <span>Open Lab</span>
                        <ArrowRight size={12} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* =========================================================
            5. RECENT SUBMISSIONS
            ========================================================= */}
        <section className="dashboard-submissions-section" aria-label="Recent Submissions">
          <div className="section-head-row">
            <div className="section-title-wrap">
              <CheckCircle2 size={16} color="var(--primary)" />
              <h2 className="dashboard-section-heading">Recent Submissions</h2>
              <span className="section-count-tag font-mono">{submissions.length}</span>
            </div>
            <span className="section-meta-text">
              Compiler telemetry &amp; auto-evaluated performing scores
            </span>
          </div>

          <Card surface="white" style={{ overflow: 'hidden' }}>
            {recentSubmissions.length === 0 ? (
              <div className="submissions-graceful-empty">
                <Inbox size={28} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  No Submissions Recorded Yet
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '4px 0 12px' }}>
                  Execute code and pass test suites in the Code Lab to generate verified submission records.
                </p>
                {activePractical && onContinuePractical && (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Play}
                    onClick={() => onContinuePractical(activePractical)}
                  >
                    Open Code Lab to Begin
                  </Button>
                )}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="dashboard-data-table">
                  <thead>
                    <tr>
                      <th>Practical</th>
                      <th>Compiler</th>
                      <th>Status</th>
                      <th>Test Passes</th>
                      <th>Auto-Score</th>
                      <th>Adaptive Tier</th>
                      <th>Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSubmissions.map((sub, i) => {
                      const isGraded = sub.status === 'Graded';
                      const dateStr = sub.submittedAt
                        ? new Date(sub.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : 'Recently';

                      return (
                        <tr key={sub.id || i}>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {sub.practicalTitle || 'Curricular Practical'}
                          </td>
                          <td className="font-mono" style={{ textTransform: 'uppercase', fontSize: '11.5px' }}>
                            {sub.language || 'cpp'}
                          </td>
                          <td>
                            <Badge variant={isGraded ? 'success' : 'primary'} size="sm">
                              {sub.status || 'Submitted'}
                            </Badge>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600, color: sub.passRate === 100 ? 'var(--success)' : 'var(--text-primary)' }}>
                              {sub.passedCount || 0}/{sub.totalCount || 3}
                            </span>{' '}
                            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                              ({Math.round(sub.passRate || 0)}%)
                            </span>
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                            {parseFloat(sub.codingMarks || 0).toFixed(1)} / 3.0 M
                          </td>
                          <td>
                            <Badge tier={sub.adaptiveTier || 'Proficient'} size="sm">
                              {sub.adaptiveTier || 'Proficient'}
                            </Badge>
                          </td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>
                            {dateStr}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </section>

        {/* =========================================================
            6. DIAGNOSTIC MENTOR
            (Rule-Based Learning Invariants & Gap Feedback)
            ========================================================= */}
        <section className="dashboard-mentor-section" aria-label="Diagnostic Mentor">
          <div className="section-head-row">
            <div className="section-title-wrap">
              <Compass size={16} color="var(--primary)" />
              <h2 className="dashboard-section-heading">Diagnostic Mentor</h2>
            </div>
            <span className="section-meta-text">
              Rule-based curriculum diagnostics &amp; learning-tier invariants
            </span>
          </div>

          <Card surface="white" className="diagnostic-mentor-card">
            {diagnosticData.hasData ? (
              <div className="diagnostic-content-wrap">
                <div className="diagnostic-badge-row">
                  <Badge tier={diagnosticData.assignedTier} size="sm">
                    {diagnosticData.assignedTier} Tier
                  </Badge>
                  <span className="diagnostic-rec-tag">
                    Recommended Next Challenge: <strong>{diagnosticData.recommendedDifficulty} Difficulty</strong>
                  </span>
                  <span className="diagnostic-marks-tag font-mono">
                    Latest Performing Auto-Score: {diagnosticData.codingMarks}/3.0 M ({diagnosticData.testPasses} passed)
                  </span>
                </div>

                <div className="diagnostic-body">
                  <h3 className="diagnostic-heading">
                    Algorithmic Evaluation &amp; Curriculum Diagnostics
                  </h3>
                  <p className="diagnostic-reasoning">
                    {diagnosticData.reasoning}
                  </p>
                </div>
              </div>
            ) : (
              <div className="diagnostic-empty-wrap">
                <div className="diagnostic-empty-icon">
                  <Compass size={22} color="var(--primary)" />
                </div>
                <div className="diagnostic-empty-text">
                  <h3 style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 3px' }}>
                    Diagnostic Evaluation Ready
                  </h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                    No compiler evaluations or faculty feedback logged for the current term yet. Run and submit your laboratory practical in the Code Lab to generate rule-based curriculum invariants and difficulty tier guidance.
                  </p>
                </div>
              </div>
            )}
          </Card>
        </section>

        {/* =========================================================
            7. TOPIC COMPETENCY
            ========================================================= */}
        <section className="dashboard-competency-section" aria-label="Topic Competency">
          <div className="section-head-row">
            <div className="section-title-wrap">
              <Sparkles size={16} color="var(--primary)" />
              <h2 className="dashboard-section-heading">Topic Competency</h2>
            </div>
            <span className="section-meta-text">
              Curricular syllabus domains mapped to verified compiler passes
            </span>
          </div>

          <div className="competency-cards-grid">
            {topicCompetencies.map((comp) => (
              <Card surface="white" key={comp.id} className="competency-card">
                <div className="competency-card-top">
                  <span className="competency-domain-tag">SYLLABUS INVARIANT</span>
                  <Badge variant={comp.variant} size="sm">
                    {comp.status}
                  </Badge>
                </div>

                <h3 className="competency-name">
                  {comp.name}
                </h3>

                <div className="competency-score-row">
                  <span className="competency-score-label">Evaluating Record:</span>
                  <span className="competency-score-val font-mono">{comp.score}</span>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* =========================================================
            8. ALGORITHM VISUALIZER
            ========================================================= */}
        {activePractical && (
          <section className="dashboard-visualizer-section" aria-label="Algorithm Visualizer">
            <div className="section-head-row">
              <div className="section-title-wrap">
                <Layers size={16} color="var(--primary)" />
                <h2 className="dashboard-section-heading">Algorithm Visualizer</h2>
              </div>
              <span className="section-meta-text">
                3D WebGL spatial state machine for {activePractical.title}
              </span>
            </div>

            <Card surface="white" className="dashboard-visualizer-card">
              <CardHeader style={{ padding: '14px 20px 10px' }}>
                <div>
                  <CardTitle as="h3" style={{ fontSize: '14px' }}>
                    {activePractical.title} · Spatial State Structure
                  </CardTitle>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                    Drag cursor to inspect tree and graph invariants across 3D coordinates.
                  </p>
                </div>
                <Badge variant="primary" size="sm">
                  Active Practical Invariant
                </Badge>
              </CardHeader>
              <CardContent style={{ padding: 0, height: '360px', background: 'var(--bg-app)', position: 'relative' }}>
                <Hero3DObject practical={activePractical} />
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </div>
  );
}
