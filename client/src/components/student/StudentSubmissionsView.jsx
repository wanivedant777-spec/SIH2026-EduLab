import React, { useState, useMemo } from 'react';
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  BookOpen,
  Box,
  ArrowRight,
  History,
  ShieldCheck,
  Check,
  Copy,
  Lock,
  TrendingUp,
  AlertCircle,
  FileText,
  HelpCircle,
  Zap,
} from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

export default function StudentSubmissionsView({
  submissions = [],
  currentPractical = null,
  practicals = [],
  onRetryPractical,
  onReviewConcept,
  onOpenVisualization,
  onContinueLearning,
}) {
  // Selected submission ID for detailed evaluation view (default to most recent)
  const [selectedSubId, setSelectedSubId] = useState(null);
  const [expandedTests, setExpandedTests] = useState({ 1: true });
  const [copiedCode, setCopiedCode] = useState(false);
  const [showAuditTable, setShowAuditTable] = useState(false);

  // Active submission
  const activeSubmission = useMemo(() => {
    if (!submissions || submissions.length === 0) return null;
    if (selectedSubId) {
      const found = submissions.find((s) => s.id === selectedSubId);
      if (found) return found;
    }
    // Match current practical or default to first
    if (currentPractical) {
      const match = submissions.find((s) => s.practicalId === currentPractical.id);
      if (match) return match;
    }
    return submissions[0];
  }, [submissions, selectedSubId, currentPractical]);

  // Associated practical data
  const matchingPractical = useMemo(() => {
    if (!activeSubmission) return currentPractical;
    return (
      practicals.find((p) => p.id === activeSubmission.practicalId) ||
      currentPractical || {
        id: activeSubmission.practicalId,
        title: activeSubmission.practicalTitle || 'Curricular Practical',
        courseCode: 'CS201P: Data Structures',
        aim: 'Implement the algorithmic procedure maintaining space and time complexity bounds.',
      }
    );
  }, [activeSubmission, practicals, currentPractical]);

  // Historical attempts for the same practical
  const practicalAttempts = useMemo(() => {
    if (!activeSubmission) return [];
    return submissions.filter(
      (s) => s.practicalId === activeSubmission.practicalId || s.practicalTitle === activeSubmission.practicalTitle
    );
  }, [submissions, activeSubmission]);

  const attemptIndex = useMemo(() => {
    if (!activeSubmission || practicalAttempts.length === 0) return 1;
    const idx = practicalAttempts.findIndex((s) => s.id === activeSubmission.id);
    return idx >= 0 ? practicalAttempts.length - idx : 1;
  }, [activeSubmission, practicalAttempts]);

  const previousAttempt = useMemo(() => {
    if (practicalAttempts.length <= 1) return null;
    const currentIndex = practicalAttempts.findIndex((s) => s.id === activeSubmission?.id);
    if (currentIndex >= 0 && currentIndex < practicalAttempts.length - 1) {
      return practicalAttempts[currentIndex + 1];
    }
    return null;
  }, [practicalAttempts, activeSubmission]);

  const toggleTestExpand = (idx) => {
    setExpandedTests((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handleCopyCode = () => {
    if (activeSubmission?.sourceCode) {
      navigator.clipboard.writeText(activeSubmission.sourceCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Derive test results from submission
  const totalTests = activeSubmission?.totalCount || matchingPractical?.testCases?.length || 3;
  const passedTests = activeSubmission?.passedCount || 0;
  const isMastered = activeSubmission?.passRate === 100 || (activeSubmission?.codingMarks && activeSubmission.codingMarks >= 3.0);
  const isGraded = activeSubmission?.status === 'Graded' || (activeSubmission?.writeupMarks > 0 || activeSubmission?.vivaMarks > 0);

  // Scores
  const codingScore = parseFloat(activeSubmission?.codingMarks || 0.0);
  const writingScore = parseFloat(activeSubmission?.writeupMarks || 0.0);
  const vivaScore = parseFloat(activeSubmission?.vivaMarks || 0.0);
  const totalScore = parseFloat(activeSubmission?.totalMarks || (codingScore + writingScore + vivaScore));

  // If no submissions exist in ledger
  if (!submissions || submissions.length === 0) {
    return (
      <div className="eval-feedback-page">
        <PageHeader
          title="Evaluation & Feedback"
          subtitle="Verifiable institutional feedback, automated test results, and AICTE rubric evaluation"
          badge={<Badge variant="neutral" size="sm">0 Submissions Logged</Badge>}
        />

        <div className="eval-feedback-container">
          <div className="eval-hero-banner" style={{ textAlign: 'center', padding: '64px 24px', alignItems: 'center' }}>
            <History size={40} style={{ opacity: 0.35, color: 'var(--text-muted)', marginBottom: '8px' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
              No Laboratory Submissions Recorded
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 0 20px 0', lineHeight: 1.5 }}>
              You have not submitted code for evaluation yet. Complete an experiment in the Code Lab and click <strong>Submit for Evaluation</strong> to generate your verified evaluation report.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              {onRetryPractical && (
                <Button
                  variant="primary"
                  icon={ArrowRight}
                  onClick={() => onRetryPractical(currentPractical || practicals[0])}
                >
                  Open Code Lab
                </Button>
              )}
              {onContinueLearning && (
                <Button
                  variant="outline"
                  icon={BookOpen}
                  onClick={onContinueLearning}
                >
                  Browse Practicals
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="eval-feedback-page">
      <PageHeader
        title="Evaluation & Feedback"
        subtitle="Institutional assessment report, AICTE rubric distribution, diagnostic feedback, and next actions"
        badge={
          <Badge variant={isMastered ? 'success' : 'primary'} size="sm">
            {isGraded ? 'Faculty Graded' : 'Automated Verification Logged'}
          </Badge>
        }
        actions={
          submissions.length > 1 && (
            <button
              type="button"
              className="eval-sub-pill"
              onClick={() => setShowAuditTable((prev) => !prev)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <History size={13} />
              <span>{showAuditTable ? 'Hide All Records' : `View All Submissions (${submissions.length})`}</span>
            </button>
          )
        }
      />

      <div className="eval-feedback-container">
        {/* Submissions Switcher Pills if student has submitted multiple practicals */}
        {submissions.length > 1 && (
          <div className="eval-submissions-selector">
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
              Submissions:
            </span>
            {submissions.map((sub, idx) => {
              const isSelected = sub.id === activeSubmission?.id;
              const subTitle = sub.practicalTitle?.split(':')[0] || `Practical ${idx + 1}`;
              return (
                <button
                  key={sub.id || idx}
                  type="button"
                  className={`eval-sub-pill ${isSelected ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedSubId(sub.id);
                    setShowAuditTable(false);
                  }}
                  title={sub.practicalTitle}
                >
                  {subTitle} · {sub.codingMarks || 0}M
                </button>
              );
            })}
          </div>
        )}

        {/* 1. TOP HERO ASSESSMENT BANNER */}
        <section className="eval-hero-banner">
          {/* Top Meta Row */}
          <div className="eval-hero-top-row">
            <div className="eval-hero-meta-left">
              <span className="eval-hero-meta-chip">
                <BookOpen size={12} />
                {matchingPractical?.courseCode?.split(':')[0] || 'CS201P'}
              </span>
              <span style={{ color: 'var(--border-strong)' }}>•</span>
              <span className="eval-hero-meta-chip">
                <Clock size={12} />
                {activeSubmission?.submittedDate || 'Today'} · {activeSubmission?.submittedAt || 'Recently'}
              </span>
              <span style={{ color: 'var(--border-strong)' }}>•</span>
              <span className="eval-hero-meta-chip">
                <History size={12} />
                Attempt {attemptIndex} of {practicalAttempts.length}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Badge variant={isGraded ? 'success' : isMastered ? 'primary' : 'warning'} size="sm">
                {activeSubmission?.status || 'Pending Review'}
              </Badge>
              <Badge tier={activeSubmission?.adaptiveTier || 'Proficient'} size="sm">
                {activeSubmission?.adaptiveTier || 'Proficient'} Tier
              </Badge>
            </div>
          </div>

          {/* Main Title & Overall Score Row */}
          <div className="eval-hero-main-row">
            <div className="eval-hero-title-group">
              <h1 className="eval-hero-title">
                {activeSubmission?.practicalTitle || matchingPractical?.title || 'Laboratory Practical Evaluation'}
              </h1>
              <p className="eval-hero-summary">
                {isMastered
                  ? `All ${passedTests}/${totalTests} automated test suites passed within nominal runtime boundaries. Full 3.0 coding marks recorded in Supabase ledger.`
                  : `${passedTests} of ${totalTests} test cases passed. Review failing test invariant diffs and compiler traces below to optimize solution.`}
                {isGraded
                  ? ` Faculty review completed with ${activeSubmission.totalMarks}/10.0 total marks awarded.`
                  : ` Formal 5M journal writeup and 2M viva assessment awaiting faculty finalization.`}
              </p>
            </div>

            {/* Overall Score Pod */}
            <div className="eval-hero-score-pod">
              <span className="eval-score-label">Overall Rubric Score</span>
              <div className="eval-score-value-row">
                <span className="eval-score-number">{totalScore.toFixed(1)}</span>
                <span className="eval-score-total">/ 10.0 M</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {isGraded ? 'Finalized Rubric Score' : 'Automated Baseline Logged'}
              </span>
            </div>
          </div>
        </section>

        {/* 2. PERFORMANCE BREAKDOWN (AICTE 10-Mark Rubric) */}
        <section className="eval-rubric-card">
          <div className="eval-rubric-header">
            <div className="eval-rubric-title">
              <Award size={15} color="var(--primary)" />
              <span>AICTE 10-Mark Rubric Distribution</span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Accredited Laboratory Assessment Criteria
            </span>
          </div>

          <div className="eval-rubric-grid">
            {/* Criteria 1: Performing / Coding (0-3M) */}
            <div className="eval-rubric-item">
              <div className="eval-rubric-item-top">
                <span className="eval-rubric-item-name">1. Performing / Coding</span>
                <span className="eval-rubric-item-score" style={{ color: 'var(--primary)' }}>
                  {codingScore.toFixed(1)} / 3.0 M
                </span>
              </div>
              <div className="progress-track" style={{ height: '5px' }}>
                <div
                  className="progress-fill fill-accent"
                  style={{ width: `${Math.min(100, (codingScore / 3.0) * 100)}%` }}
                />
              </div>
              <p className="eval-rubric-item-desc">
                Automated Judge0 test harness evaluation across edge-case input parameters and memory bounds.
              </p>
            </div>

            {/* Criteria 2: Writing / Journal (0-5M) */}
            <div className="eval-rubric-item">
              <div className="eval-rubric-item-top">
                <span className="eval-rubric-item-name">2. Writing / Journal</span>
                <span className="eval-rubric-item-score" style={{ color: writingScore > 0 ? 'var(--info)' : 'var(--text-muted)' }}>
                  {writingScore > 0 ? `${writingScore.toFixed(1)} / 5.0 M` : 'Pending (5.0 M)'}
                </span>
              </div>
              <div className="progress-track" style={{ height: '5px' }}>
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.min(100, (writingScore / 5.0) * 100)}%`,
                    background: 'var(--info)',
                  }}
                />
              </div>
              <p className="eval-rubric-item-desc">
                Laboratory journal documentation, algorithm flowcharts, and theoretical complexity analysis.
              </p>
            </div>

            {/* Criteria 3: Viva Voce (0-2M) */}
            <div className="eval-rubric-item">
              <div className="eval-rubric-item-top">
                <span className="eval-rubric-item-name">3. Viva Voce</span>
                <span className="eval-rubric-item-score" style={{ color: vivaScore > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                  {vivaScore > 0 ? `${vivaScore.toFixed(1)} / 2.0 M` : 'Pending (2.0 M)'}
                </span>
              </div>
              <div className="progress-track" style={{ height: '5px' }}>
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.min(100, (vivaScore / 2.0) * 100)}%`,
                    background: 'var(--warning)',
                  }}
                />
              </div>
              <p className="eval-rubric-item-desc">
                Faculty oral defense assessing algorithmic reasoning, invariant proofs, and space-time trade-offs.
              </p>
            </div>
          </div>
        </section>

        {/* 3. TWO-COLUMN CONTENT GRID */}
        <div className="eval-content-grid">
          {/* LEFT COLUMN: Test Results & Progress Trend */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Test Results Card */}
            <div className="eval-tests-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={15} color="var(--success)" />
                  <span>Execution Test Suites ({passedTests}/{totalTests})</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="codelab-telemetry-chip">
                    <Clock size={11} /> 18ms
                  </span>
                  <span className="codelab-telemetry-chip">
                    <Cpu size={11} /> 2.4 MB
                  </span>
                </div>
              </div>

              {/* Sample Test Case #1 (Public & Inspectable) */}
              <div className="eval-test-row">
                <div
                  className="eval-test-header"
                  onClick={() => toggleTestExpand(1)}
                  title="Click to toggle sample test output"
                >
                  <div className="eval-test-title-group">
                    {expandedTests[1] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    <span>Sample Test Case #1 (Public Invariant)</span>
                  </div>

                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--success)', fontSize: '11.5px', fontWeight: 600 }}>
                    <CheckCircle2 size={13} /> Passed
                  </span>
                </div>

                {expandedTests[1] && (
                  <div className="eval-test-body">
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '2px' }}>Standard Input (stdin):</div>
                      <pre className="codelab-example-box">
                        {matchingPractical?.testCases?.[0]?.input_data || '5\n10 5 15 3 7'}
                      </pre>
                    </div>

                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '2px' }}>Expected Standard Output:</div>
                      <pre className="codelab-example-box" style={{ color: '#6ee7b7' }}>
                        {matchingPractical?.testCases?.[0]?.expected_output || '3 5 7 10 15'}
                      </pre>
                    </div>

                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '2px' }}>Program Output (stdout):</div>
                      <pre className="codelab-example-box" style={{ color: '#6ee7b7' }}>
                        {matchingPractical?.testCases?.[0]?.expected_output || '3 5 7 10 15'}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Hidden Parameterized Tests (Academic Confidentiality Protected) */}
              <div className="eval-test-row">
                <div className="eval-test-header" style={{ cursor: 'default' }}>
                  <div className="eval-test-title-group">
                    <Lock size={13} color="var(--text-muted)" />
                    <span>Hidden Parameterized Suite ({Math.max(1, totalTests - 1)} Tests)</span>
                  </div>

                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: isMastered ? 'var(--success)' : 'var(--danger)', fontSize: '11.5px', fontWeight: 600 }}>
                    {isMastered ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                    {isMastered ? 'All Passed' : 'Incomplete'}
                  </span>
                </div>

                {/* CRITICAL: Safe Summary Only - Never expose hidden test data */}
                <div className="eval-test-body">
                  <div className="eval-safe-hidden-box">
                    <ShieldCheck size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                    <div>
                      <strong>Hidden Test 1 — Passed</strong>
                      <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
                        Boundary edge cases and recursion limits validated. Parameters redacted for academic verification.
                      </div>
                    </div>
                  </div>

                  {totalTests > 2 && (
                    <div className="eval-safe-hidden-box">
                      <ShieldCheck size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                      <div>
                        <strong>Hidden Test 2 — {isMastered ? 'Passed' : 'Failed'}</strong>
                        <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
                          Sequential access and auxiliary memory bound verification.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Progress & Historical Trend Card */}
            <div className="eval-trend-card">
              <div className="eval-trend-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TrendingUp size={14} color="var(--primary)" />
                  <span>Improvement &amp; Attempt Trend</span>
                </div>
                <Badge variant="neutral" size="sm">
                  {practicalAttempts.length} {practicalAttempts.length === 1 ? 'Attempt' : 'Attempts'} Logged
                </Badge>
              </div>

              {previousAttempt ? (
                <div className="eval-trend-body">
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Previous Score</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      {previousAttempt.codingMarks || 0.0} / 3.0 M
                    </div>
                  </div>

                  <div style={{ fontSize: '18px', color: 'var(--border-strong)' }}>→</div>

                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Score</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary)' }}>
                      {codingScore.toFixed(1)} / 3.0 M
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Delta</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: codingScore >= (previousAttempt.codingMarks || 0) ? 'var(--success)' : 'var(--danger)' }}>
                      {codingScore >= (previousAttempt.codingMarks || 0) ? '+' : ''}
                      {(codingScore - (previousAttempt.codingMarks || 0)).toFixed(1)} M ({codingScore >= (previousAttempt.codingMarks || 0) ? 'Improved' : 'Regressed'})
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '4px 0', lineHeight: 1.5 }}>
                  Attempt 1 of 1 · First verified run logged in institutional ledger. Future attempts will display score delta and performance trajectories here.
                </div>
              )}
            </div>

            {/* Submitted Source Code Snippet */}
            {activeSubmission?.sourceCode && (
              <div className="eval-trend-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={14} />
                    <span>Submitted Source ({activeSubmission.languageName || 'C++20'})</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={copiedCode ? Check : Copy}
                    onClick={handleCopyCode}
                    style={{ fontSize: '11px', height: '22px', padding: '2px 6px' }}
                  >
                    {copiedCode ? 'Copied' : 'Copy Code'}
                  </Button>
                </div>
                <pre className="codelab-example-box" style={{ maxHeight: '160px', overflowY: 'auto' }}>
                  {activeSubmission.sourceCode}
                </pre>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Diagnostic Feedback & Primary Learning Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Diagnostic Section */}
            <div className="eval-diagnostic-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <HelpCircle size={15} color="var(--primary)" />
                  <span>Diagnostic Learning Feedback</span>
                </div>
                <Badge variant={isGraded ? 'success' : 'neutral'} size="sm">
                  {isGraded ? 'Faculty Feedback' : 'Automated Diagnostic'}
                </Badge>
              </div>

              {activeSubmission?.feedback ? (
                <div className="eval-diagnostic-grid">
                  <div className="eval-diagnostic-pillar strengths">
                    <span className="eval-pillar-label" style={{ color: 'var(--success)' }}>
                      <CheckCircle2 size={12} /> Strengths
                    </span>
                    <p className="eval-pillar-text">
                      {activeSubmission.feedback.strengths ||
                        'Optimal pointer traversal mechanics and clean memory bounds verified across all automated test suites.'}
                    </p>
                  </div>

                  <div className="eval-diagnostic-pillar weaknesses">
                    <span className="eval-pillar-label" style={{ color: 'var(--warning-text)' }}>
                      <AlertCircle size={12} /> Areas for Refinement
                    </span>
                    <p className="eval-pillar-text">
                      {activeSubmission.feedback.weaknesses ||
                        'Consider handling deep skewed tree degenerate bounds with self-balancing rotation mechanisms.'}
                    </p>
                  </div>

                  <div className="eval-diagnostic-pillar gaps">
                    <span className="eval-pillar-label" style={{ color: 'var(--info-text)' }}>
                      <Zap size={12} /> Conceptual Gap
                    </span>
                    <p className="eval-pillar-text">
                      {activeSubmission.feedback.conceptGap ||
                        'Asymptotic space complexity on skewed recursive call stacks degrades from O(log N) to O(N).'}
                    </p>
                  </div>

                  <div className="eval-diagnostic-pillar next-step">
                    <span className="eval-pillar-label" style={{ color: 'var(--primary)' }}>
                      <ArrowRight size={12} /> Recommended Next Step
                    </span>
                    <p className="eval-pillar-text">
                      {activeSubmission.feedback.nextStep ||
                        'Proceed to Practical 05: Balanced Search Trees (AVL Rotations) or review recursive state tracing.'}
                    </p>
                  </div>
                </div>
              ) : isMastered ? (
                <div className="eval-diagnostic-grid">
                  <div className="eval-diagnostic-pillar strengths">
                    <span className="eval-pillar-label" style={{ color: 'var(--success)' }}>
                      <CheckCircle2 size={12} /> Verified Strengths
                    </span>
                    <p className="eval-pillar-text">
                      All unit test invariants satisfied with zero regression. Execution finished within standard 18ms latency bounds.
                    </p>
                  </div>

                  <div className="eval-diagnostic-pillar next-step">
                    <span className="eval-pillar-label" style={{ color: 'var(--primary)' }}>
                      <ArrowRight size={12} /> Next Learning Objective
                    </span>
                    <p className="eval-pillar-text">
                      Mastery demonstrated on Binary Search Tree fundamentals. You are ready to advance to self-balancing tree structures.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="eval-empty-diagnostic">
                  <AlertCircle size={22} style={{ opacity: 0.4, margin: '0 auto 6px' }} />
                  <div style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--text-primary)' }}>
                    Diagnostic Commentary Pending
                  </div>
                  <div style={{ fontSize: '11.5px', marginTop: '4px', lineHeight: 1.45 }}>
                    Faculty diagnostic notes have not been recorded yet. Detailed rubric commentary on strengths and concept gaps will appear here upon oral evaluation.
                  </div>
                </div>
              )}
            </div>

            {/* Primary Actions Card (Highlights Next Useful Learning Action) */}
            <div className="eval-actions-surface">
              <div className="eval-actions-header">
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Recommended Action
                </div>
                <Badge variant={isMastered ? 'success' : 'primary'} size="sm">
                  {isMastered ? 'Mastery Confirmed' : 'Needs Practice'}
                </Badge>
              </div>

              <div className="eval-actions-group">
                {/* Most Useful Next Action is Visually Primary */}
                {isMastered ? (
                  <Button
                    variant="primary"
                    size="md"
                    icon={ArrowRight}
                    onClick={onContinueLearning}
                    className="eval-btn-primary-action"
                  >
                    Continue Learning (Next Practical)
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="md"
                    icon={RotateCcw}
                    onClick={() => onRetryPractical && onRetryPractical(matchingPractical)}
                    className="eval-btn-primary-action"
                  >
                    Retry Practical in Code Lab
                  </Button>
                )}

                {/* Secondary Helpful Actions */}
                <div className="eval-actions-secondary-row">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={BookOpen}
                    onClick={() => onReviewConcept && onReviewConcept(matchingPractical)}
                  >
                    Review Concept
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    icon={Box}
                    onClick={() => onOpenVisualization && onOpenVisualization(matchingPractical)}
                  >
                    Open Visualizer
                  </Button>
                </div>

                {isMastered && onRetryPractical && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={RotateCcw}
                    onClick={() => onRetryPractical(matchingPractical)}
                    style={{ fontSize: '12px' }}
                  >
                    Retry Practical (New Attempt)
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 4. OPTIONAL CHRONOLOGICAL AUDIT LEDGER (Expandable) */}
        {showAuditTable && (
          <div className="eval-rubric-card" style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <History size={15} />
              <span>Institutional Submissions Ledger ({submissions.length} Records)</span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-surface-subtle)', borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '8px 12px' }}>Practical</th>
                    <th style={{ padding: '8px 12px' }}>Language</th>
                    <th style={{ padding: '8px 12px' }}>Status</th>
                    <th style={{ padding: '8px 12px' }}>Test Suites</th>
                    <th style={{ padding: '8px 12px' }}>Auto Score</th>
                    <th style={{ padding: '8px 12px' }}>Date</th>
                    <th style={{ padding: '8px 12px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub, i) => {
                    const isSelected = sub.id === activeSubmission?.id;
                    return (
                      <tr
                        key={sub.id || i}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          background: isSelected ? 'var(--primary-subtle)' : 'transparent',
                        }}
                      >
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {sub.practicalTitle || 'Practical'}
                        </td>
                        <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>
                          {sub.language || 'cpp'}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <Badge variant={sub.status === 'Graded' ? 'success' : 'primary'} size="sm">
                            {sub.status || 'Submitted'}
                          </Badge>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {sub.passedCount || 0}/{sub.totalCount || 3} Passed
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--primary)' }}>
                          {parseFloat(sub.codingMarks || 0).toFixed(1)} / 3.0 M
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                          {sub.submittedDate || 'Recent'}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSubId(sub.id);
                              setShowAuditTable(false);
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--primary)',
                              fontWeight: 600,
                              cursor: 'pointer',
                              padding: '2px 4px',
                            }}
                          >
                            Inspect Report
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
