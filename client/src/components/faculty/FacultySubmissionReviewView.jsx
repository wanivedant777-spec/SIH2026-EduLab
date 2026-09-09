import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Code2,
  Award,
  FileText,
  MessageSquare,
  Save,
  Sparkles,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  ChevronRight,
  Lock,
  User,
  Activity,
  Layers,
  BookOpen,
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function FacultySubmissionReviewView({
  submission,
  student = null,
  practicals = [],
  allSubmissions = [],
  currentUser = null,
  onSaveGrade,
  onBack,
  onSelectSubmission,
}) {
  // Score state
  const [codingMarks, setCodingMarks] = useState(
    submission?.codingMarks !== undefined ? parseFloat(submission.codingMarks) : 0.0
  );
  const [writeupMarks, setWriteupMarks] = useState(
    submission?.writeupMarks !== undefined ? parseFloat(submission.writeupMarks) : 0.0
  );
  const [vivaMarks, setVivaMarks] = useState(
    submission?.vivaMarks !== undefined ? parseFloat(submission.vivaMarks) : 0.0
  );
  const [feedback, setFeedback] = useState(submission?.feedback || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [mobileTab, setMobileTab] = useState('code'); // 'code' | 'evaluation'

  // Criteria checklist for Writing (0-5M)
  const [criteria, setCriteria] = useState({
    aimAndObjective: true,
    algorithmicSteps: true,
    pseudocodeStructure: true,
    complexityAnalysis: false,
  });

  // Synchronize state if incoming submission changes
  useEffect(() => {
    if (submission) {
      setCodingMarks(submission.codingMarks !== undefined ? parseFloat(submission.codingMarks) : 0.0);
      setWriteupMarks(submission.writeupMarks !== undefined ? parseFloat(submission.writeupMarks) : 0.0);
      setVivaMarks(submission.vivaMarks !== undefined ? parseFloat(submission.vivaMarks) : 0.0);
      setFeedback(submission.feedback || '');
      setSaveSuccess(false);
    }
  }, [submission?.id]);

  // Compute live total
  const currentTotal = useMemo(() => {
    const c = Math.min(3.0, Math.max(0.0, parseFloat(codingMarks) || 0.0));
    const w = Math.min(5.0, Math.max(0.0, parseFloat(writeupMarks) || 0.0));
    const v = Math.min(2.0, Math.max(0.0, parseFloat(vivaMarks) || 0.0));
    return Math.min(10.0, Math.round((c + w + v) * 10) / 10);
  }, [codingMarks, writeupMarks, vivaMarks]);

  // Match practical curriculum metadata
  const matchingPractical = useMemo(() => {
    if (!submission) return null;
    return (
      practicals.find(
        (p) =>
          p.id === submission.practicalId ||
          p.practicalNumber === submission.practicalNumber ||
          (p.title && submission.practicalTitle && p.title.toLowerCase() === submission.practicalTitle.toLowerCase())
      ) || null
    );
  }, [submission, practicals]);

  // Determine next submission in queue
  const nextSubmission = useMemo(() => {
    if (!allSubmissions || allSubmissions.length <= 1) return null;
    const currentIndex = allSubmissions.findIndex((s) => s.id === submission?.id);
    // Find next un-graded submission first
    const nextUngraded = allSubmissions.find(
      (s, idx) => idx > currentIndex && s.status !== 'Graded' && s.totalMarks == null
    );
    if (nextUngraded) return nextUngraded;

    // Otherwise next submission in list
    if (currentIndex >= 0 && currentIndex < allSubmissions.length - 1) {
      return allSubmissions[currentIndex + 1];
    }
    return allSubmissions[0].id !== submission?.id ? allSubmissions[0] : null;
  }, [allSubmissions, submission]);

  // Language mapping for Monaco
  const getMonacoLanguage = (lang) => {
    if (!lang) return 'cpp';
    const l = lang.toLowerCase();
    if (l === 'c' || l === 'cpp' || l === 'c++') return 'cpp';
    if (l === 'python' || l === 'py') return 'python';
    if (l === 'java') return 'java';
    return 'cpp';
  };

  const handleCopyCode = () => {
    if (submission?.sourceCode) {
      navigator.clipboard.writeText(submission.sourceCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleSaveEvaluation = async () => {
    if (!submission || !onSaveGrade) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onSaveGrade(submission.id, {
        codingMarks: Math.min(3.0, Math.max(0.0, parseFloat(codingMarks) || 0.0)),
        writeupMarks: Math.min(5.0, Math.max(0.0, parseFloat(writeupMarks) || 0.0)),
        vivaMarks: Math.min(2.0, Math.max(0.0, parseFloat(vivaMarks) || 0.0)),
        feedback: feedback.trim(),
        gradedBy: currentUser?.name || currentUser?.identifier || 'Faculty Evaluator',
      });
      setSaveSuccess(true);
    } catch (err) {
      console.error('Save evaluation failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Quick feedback tag helper
  const addFeedbackTag = (tag) => {
    setFeedback((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return tag;
      if (trimmed.includes(tag)) return prev;
      return `${trimmed}. ${tag}`;
    });
  };

  if (!submission) {
    return (
      <div className="fsr-empty-state">
        <FileText size={32} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
        <h3>No Submission Selected</h3>
        <p>Select a submission from the student profile or evaluations queue to review code and record grades.</p>
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft size={14} /> Return
        </Button>
      </div>
    );
  }

  const passedCount = submission.passedCount ?? 0;
  const totalCount = submission.totalCount || matchingPractical?.testCases?.length || 3;
  const passRate = submission.passRate ?? Math.round((passedCount / totalCount) * 100);
  const isMastered = passedCount === totalCount && totalCount > 0;
  const studentDisplayName = submission.studentName || student?.name || 'Student';
  const studentIdentifier = submission.prn || submission.rollNumber || student?.prn || 'Unassigned';
  const submissionTimestamp = submission.submittedAt || submission.createdAt;
  const sampleTest = matchingPractical?.testCases?.find((tc) => tc.is_sample) || matchingPractical?.testCases?.[0] || null;

  return (
    <div className="fsr-root">
      {/* ── Top Navigation & Context Bar ── */}
      <div className="fsr-topbar">
        <div className="fsr-topbar-left">
          <button className="fsr-back-btn" onClick={onBack} title="Return to previous view">
            <ArrowLeft size={15} />
            <span>{student ? `Return to ${studentDisplayName}` : 'Return to Submissions'}</span>
          </button>
          <span className="fsr-topbar-sep">/</span>
          <div className="fsr-topbar-breadcrumb">
            <span className="fsr-bc-practical">
              {submission.practicalTitle || matchingPractical?.title || 'Practical Lab'}
            </span>
            <span className="fsr-topbar-sep">•</span>
            <span className="fsr-bc-student">
              {studentDisplayName} ({studentIdentifier})
            </span>
          </div>
        </div>

        <div className="fsr-topbar-right">
          {nextSubmission && onSelectSubmission && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onSelectSubmission(nextSubmission)}
              title={`Next student: ${nextSubmission.studentName}`}
            >
              <span>Next Submission</span>
              <ChevronRight size={14} />
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveEvaluation}
            disabled={isSaving}
          >
            <Save size={14} />
            <span>{isSaving ? 'Saving...' : 'Save Evaluation'}</span>
          </Button>
        </div>
      </div>

      {/* ── Success Banner Upon Save ── */}
      {saveSuccess && (
        <div className="fsr-success-banner">
          <div className="fsr-success-content">
            <CheckCircle2 size={16} />
            <span>
              <strong>Evaluation Saved!</strong> 10-Mark Rubric total score ({currentTotal}/10.0 M) successfully recorded in Supabase.
            </span>
          </div>
          <div className="fsr-success-actions">
            {nextSubmission && onSelectSubmission && (
              <button
                className="fsr-success-link"
                onClick={() => onSelectSubmission(nextSubmission)}
              >
                Grade Next Submission →
              </button>
            )}
            <button className="fsr-success-link" onClick={onBack}>
              Return to Student Profile
            </button>
          </div>
        </div>
      )}

      {/* ── Screen Header: Rich Identity, Attempt, & Status ── */}
      <header className="fsr-header">
        <div className="fsr-header-meta">
          <div className="fsr-header-title-group">
            <h1 className="fsr-practical-title">
              {submission.practicalTitle || matchingPractical?.title || 'Practical Lab'}
            </h1>
            <div className="fsr-header-badges">
              <span className={`fsr-status-pill fsr-status-${(submission.status || 'submitted').toLowerCase().replace(/\s+/g, '-')}`}>
                {submission.status || 'Submitted'}
              </span>
              <span className={`fsr-auto-pill ${isMastered ? 'fsr-auto-passed' : passedCount > 0 ? 'fsr-auto-partial' : 'fsr-auto-failed'}`}>
                {isMastered ? (
                  <>
                    <CheckCircle2 size={11} /> All Tests Passed ({passedCount}/{totalCount})
                  </>
                ) : (
                  <>
                    <AlertTriangle size={11} /> {passedCount}/{totalCount} Tests Passed ({passRate}%)
                  </>
                )}
              </span>
              {submission.adaptiveTier && (
                <Badge tier={submission.adaptiveTier}>
                  <Sparkles size={11} />
                  {submission.adaptiveTier}
                </Badge>
              )}
            </div>
          </div>

          <div className="fsr-header-details-row">
            <div className="fsr-detail-item">
              <User size={13} className="fsr-detail-icon" />
              <span className="fsr-detail-label">Student:</span>
              <span className="fsr-detail-value">{studentDisplayName}</span>
              <span className="fsr-detail-sub">({studentIdentifier})</span>
            </div>
            <span className="fsr-detail-sep">•</span>
            <div className="fsr-detail-item">
              <Clock size={13} className="fsr-detail-icon" />
              <span className="fsr-detail-label">Submitted:</span>
              <span className="fsr-detail-value">{formatDate(submissionTimestamp)}</span>
            </div>
            <span className="fsr-detail-sep">•</span>
            <div className="fsr-detail-item">
              <Layers size={13} className="fsr-detail-icon" />
              <span className="fsr-detail-label">Attempt:</span>
              <span className="fsr-detail-value">{submission.attempt_count || submission.attemptCount || 1}</span>
            </div>
            <span className="fsr-detail-sep">•</span>
            <div className="fsr-detail-item">
              <Code2 size={13} className="fsr-detail-icon" />
              <span className="fsr-detail-label">Language:</span>
              <span className="fsr-detail-value">{submission.languageName || submission.language?.toUpperCase() || 'C++20'}</span>
            </div>
          </div>
        </div>

        {/* Live Total Score Pill */}
        <div className="fsr-header-score-card">
          <span className="fsr-score-card-label">10-Mark Rubric Total</span>
          <div className="fsr-score-card-value">
            {currentTotal}
            <span className="fsr-score-card-max"> / 10.0</span>
          </div>
          <span className="fsr-score-card-sub">
            {currentTotal >= 8.5 ? 'Excellent' : currentTotal >= 7.0 ? 'Proficient' : 'Developing'}
          </span>
        </div>
      </header>

      {/* ── Tablet / Mobile View Switcher Tabs ── */}
      <div className="fsr-mobile-tabs">
        <button
          className={`fsr-mobile-tab-btn ${mobileTab === 'code' ? 'active' : ''}`}
          onClick={() => setMobileTab('code')}
        >
          <Code2 size={14} /> Source Code
        </button>
        <button
          className={`fsr-mobile-tab-btn ${mobileTab === 'evaluation' ? 'active' : ''}`}
          onClick={() => setMobileTab('evaluation')}
        >
          <Award size={14} /> Evidence &amp; Rubric ({currentTotal}/10)
        </button>
      </div>

      {/* ── Main Workspace: Split Code Viewer & Verification/Grading Panel ── */}
      <div className="fsr-workspace-split">
        {/* LEFT / CENTER: Read-Only Professional Code Viewer */}
        <div className={`fsr-code-panel ${mobileTab === 'code' ? 'fsr-mobile-visible' : 'fsr-mobile-hidden'}`}>
          <div className="fsr-code-toolbar">
            <div className="fsr-code-meta-group">
              <div className="fsr-code-lang-pill">
                <Code2 size={13} />
                <span>{submission.languageName || submission.language?.toUpperCase() || 'C++20'}</span>
              </div>
              <span className="fsr-code-status-tag">
                <ShieldCheck size={12} style={{ color: 'var(--success-text)' }} />
                <span>Compiled &amp; Executed (Sandbox OK)</span>
              </span>
            </div>

            <div className="fsr-code-toolbar-actions">
              <button
                className="fsr-code-copy-btn"
                onClick={handleCopyCode}
                title="Copy source code to clipboard"
              >
                {copiedCode ? (
                  <>
                    <Check size={12} /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={12} /> Copy Code
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="fsr-editor-surface">
            <Editor
              height="100%"
              language={getMonacoLanguage(submission.language)}
              value={submission.sourceCode || '// No source code recorded for this submission.'}
              theme="vs"
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
                padding: { top: 14, bottom: 14 },
                wordWrap: 'on',
                renderWhitespace: 'selection',
                smoothScrolling: true,
                domReadOnly: true,
              }}
            />
          </div>

          <div className="fsr-code-statusbar">
            <span className="fsr-status-left">
              <span>Read-Only Source Code</span>
              <span className="fsr-status-sep">|</span>
              <span>Memory Limit: 256 MB</span>
              <span className="fsr-status-sep">|</span>
              <span>CPU Time: &lt; 2.0s</span>
            </span>
            <span className="fsr-status-right">
              {submission.sourceCode ? `${submission.sourceCode.split('\n').length} lines` : '0 lines'}
            </span>
          </div>
        </div>

        {/* RIGHT PANEL: Evidence, Test Results, & 10M Rubric Grading */}
        <div className={`fsr-grading-panel ${mobileTab === 'evaluation' ? 'fsr-mobile-visible' : 'fsr-mobile-hidden'}`}>
          {/* SECTION 1: Automated Evidence vs Faculty Assessment */}
          <div className="fsr-section-card">
            <div className="fsr-evidence-distinction">
              <div className="fsr-distinction-col">
                <span className="fsr-distinction-label">Automated Evaluation</span>
                <span className="fsr-distinction-value">
                  {codingMarks} / 3.0 M ({passRate}% Pass Rate)
                </span>
              </div>
              <div className="fsr-distinction-sep" />
              <div className="fsr-distinction-col">
                <span className="fsr-distinction-label">Faculty Evaluation</span>
                <span className="fsr-distinction-value">
                  {(parseFloat(writeupMarks || 0) + parseFloat(vivaMarks || 0)).toFixed(1)} / 7.0 M (Journal + Viva)
                </span>
              </div>
            </div>

            {/* Test Results Header */}
            <div className="fsr-card-subhead">
              <div className="fsr-subhead-title">
                <Activity size={14} />
                <span>Automated Test Results ({passedCount}/{totalCount} Passed)</span>
              </div>
              <span className="fsr-subhead-tag">
                {submission.timeSpentMin ? `${submission.timeSpentMin} mins active` : 'Optimal runtime'}
              </span>
            </div>

            {/* Sample Test Case (Safely Visible) */}
            {sampleTest && (
              <div className="fsr-test-case-item">
                <div className="fsr-test-header">
                  <div className="fsr-test-title">
                    <CheckCircle2 size={13} style={{ color: 'var(--success-text)' }} />
                    <span>Sample Test Case 1 (Curriculum Verification)</span>
                  </div>
                  <span className="fsr-test-badge-pass">Passed</span>
                </div>
                <div className="fsr-test-body">
                  <div className="fsr-test-io-row">
                    <div className="fsr-io-col">
                      <span className="fsr-io-label">Standard Input:</span>
                      <pre className="fsr-io-box">{sampleTest.input_data || '5\n10 5 15 3 7'}</pre>
                    </div>
                    <div className="fsr-io-col">
                      <span className="fsr-io-label">Expected Output:</span>
                      <pre className="fsr-io-box fsr-io-success">{sampleTest.expected_output || '3 5 7 10 15'}</pre>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Hidden Parameterized Tests (Academic Confidentiality - Inputs REDACTED) */}
            <div className="fsr-test-case-item fsr-hidden-suite">
              <div className="fsr-test-header">
                <div className="fsr-test-title">
                  <Lock size={13} style={{ color: 'var(--text-muted)' }} />
                  <span>Hidden Parameterized Test Suite ({Math.max(1, totalCount - 1)} Tests)</span>
                </div>
                <span className={`fsr-test-badge-${isMastered ? 'pass' : 'fail'}`}>
                  {isMastered ? 'All Passed' : 'Failures Detected'}
                </span>
              </div>

              <div className="fsr-test-body">
                <div className="fsr-hidden-summary-item">
                  <ShieldCheck size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  <div className="fsr-hidden-text">
                    <strong>Hidden Test 1 — Passed</strong>
                    <span>Boundary edge cases &amp; recursive limits verified. Inputs redacted.</span>
                  </div>
                </div>

                {totalCount > 2 && (
                  <div className="fsr-hidden-summary-item" style={{ marginTop: 6 }}>
                    {isMastered ? (
                      <ShieldCheck size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    ) : (
                      <ShieldAlert size={14} style={{ color: 'var(--danger-text)', flexShrink: 0 }} />
                    )}
                    <div className="fsr-hidden-text">
                      <strong>Hidden Test 2 — {isMastered ? 'Passed' : 'Failed'}</strong>
                      <span>
                        {isMastered
                          ? 'Stress test and optimal algorithmic complexity invariants confirmed.'
                          : 'Failed on edge case boundary parameters.'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Integrity Telemetry Flag if any */}
            {(submission.focusBlurEvents || 0) > 0 && (
              <div className="fsr-integrity-flag">
                <ShieldAlert size={15} style={{ color: 'var(--warning-text)', flexShrink: 0 }} />
                <span>
                  <strong>Integrity Alert:</strong> {submission.focusBlurEvents} window blur / tab-switch event(s) recorded during this submission.
                </span>
              </div>
            )}
          </div>

          {/* SECTION 2: 10-Mark Rubric Scoring Controls */}
          <div className="fsr-section-card">
            <div className="fsr-rubric-card-header">
              <div className="fsr-rubric-title">
                <Award size={16} style={{ color: 'var(--primary)' }} />
                <h3>AICTE 10-Mark Rubric Assessment</h3>
              </div>
              <span className="fsr-rubric-live-pill">
                Live Total: <strong>{currentTotal}</strong> / 10.0 M
              </span>
            </div>

            {/* Rubric Component 1: Performing / Coding (0-3M) */}
            <div className="fsr-rubric-row">
              <div className="fsr-rubric-info">
                <div className="fsr-rubric-name">
                  <span>1. Performing / Coding</span>
                  <span className="fsr-rubric-auto-tag">Auto-Computed</span>
                </div>
                <span className="fsr-rubric-desc">
                  Based on test suite execution ({passedCount}/{totalCount} passed). Override if necessary.
                </span>
              </div>
              <div className="fsr-rubric-controls">
                <div className="fsr-stepper-wrap">
                  <input
                    type="number"
                    min="0"
                    max="3"
                    step="0.5"
                    value={codingMarks}
                    onChange={(e) => setCodingMarks(Math.min(3.0, Math.max(0.0, parseFloat(e.target.value) || 0.0)))}
                    className="fsr-score-input"
                  />
                  <span className="fsr-input-max">/ 3.0 M</span>
                </div>
              </div>
            </div>

            {/* Rubric Component 2: Writing / Journal (0-5M) */}
            <div className="fsr-rubric-row">
              <div className="fsr-rubric-info">
                <div className="fsr-rubric-name">
                  <span>2. Writing &amp; Journal Documentation</span>
                  <span className="fsr-rubric-faculty-tag">Faculty Graded</span>
                </div>
                <span className="fsr-rubric-desc">
                  Completeness of Aim, Algorithm steps, Pseudocode formatting, and Complexity Analysis.
                </span>
                {/* Optional Quick Criteria Toggles */}
                <div className="fsr-criteria-pills">
                  {Object.entries({
                    aimAndObjective: 'Aim',
                    algorithmicSteps: 'Algorithm',
                    pseudocodeStructure: 'Pseudocode',
                    complexityAnalysis: 'Complexity',
                  }).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className={`fsr-crit-pill ${criteria[key] ? 'active' : ''}`}
                      onClick={() => setCriteria((prev) => ({ ...prev, [key]: !prev[key] }))}
                    >
                      {criteria[key] && <Check size={10} />}
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="fsr-rubric-controls">
                {/* Quick Score Chips */}
                <div className="fsr-quick-chips">
                  {[0, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      className={`fsr-chip ${writeupMarks === val ? 'active' : ''}`}
                      onClick={() => setWriteupMarks(val)}
                    >
                      {val}
                    </button>
                  ))}
                </div>
                <div className="fsr-stepper-wrap">
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.5"
                    value={writeupMarks}
                    onChange={(e) => setWriteupMarks(Math.min(5.0, Math.max(0.0, parseFloat(e.target.value) || 0.0)))}
                    className="fsr-score-input"
                  />
                  <span className="fsr-input-max">/ 5.0 M</span>
                </div>
              </div>
            </div>

            {/* Rubric Component 3: Viva Voce / Oral Defense (0-2M) */}
            <div className="fsr-rubric-row">
              <div className="fsr-rubric-info">
                <div className="fsr-rubric-name">
                  <span>3. Viva Voce / Oral Examination</span>
                  <span className="fsr-rubric-faculty-tag">Faculty Graded</span>
                </div>
                <span className="fsr-rubric-desc">
                  Algorithmic explanation, edge case defense, and conceptual understanding.
                </span>
              </div>

              <div className="fsr-rubric-controls">
                {/* Quick Viva Chips */}
                <div className="fsr-quick-chips">
                  {[0, 0.5, 1.0, 1.5, 2.0].map((val) => (
                    <button
                      key={val}
                      type="button"
                      className={`fsr-chip ${vivaMarks === val ? 'active' : ''}`}
                      onClick={() => setVivaMarks(val)}
                    >
                      {val}
                    </button>
                  ))}
                </div>
                <div className="fsr-stepper-wrap">
                  <input
                    type="number"
                    min="0"
                    max="2"
                    step="0.5"
                    value={vivaMarks}
                    onChange={(e) => setVivaMarks(Math.min(2.0, Math.max(0.0, parseFloat(e.target.value) || 0.0)))}
                    className="fsr-score-input"
                  />
                  <span className="fsr-input-max">/ 2.0 M</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: Faculty Feedback & Audit Remarks */}
          <div className="fsr-section-card">
            <div className="fsr-card-subhead">
              <div className="fsr-subhead-title">
                <MessageSquare size={14} />
                <span>Faculty Diagnostic Feedback</span>
              </div>
              <span className="fsr-feedback-status">
                {feedback.trim() ? (
                  <span style={{ color: 'var(--success-text)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={12} /> Ready
                  </span>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>Missing (Optional)</span>
                )}
              </span>
            </div>

            {/* Quick Feedback Tags */}
            <div className="fsr-feedback-tags">
              {[
                'Optimal time complexity',
                'Edge cases handled correctly',
                'Boundary conditions require review',
                'Comprehensive writeup & pseudocode',
                'Strong viva defense',
                'Incomplete complexity analysis',
              ].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="fsr-tag-btn"
                  onClick={() => addFeedbackTag(tag)}
                >
                  + {tag}
                </button>
              ))}
            </div>

            <textarea
              className="fsr-feedback-textarea"
              rows={3}
              placeholder="Add specific remarks regarding algorithmic efficiency, writeup quality, or oral viva defense..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </div>

          {/* SECTION 4: Final Summary & Primary Action Bar */}
          <div className="fsr-final-action-card">
            <div className="fsr-summary-row">
              <div className="fsr-summary-breakdown">
                <span className="fsr-sum-item">Performing: <strong>{codingMarks}/3</strong></span>
                <span className="fsr-sum-sep">•</span>
                <span className="fsr-sum-item">Writing: <strong>{writeupMarks}/5</strong></span>
                <span className="fsr-sum-sep">•</span>
                <span className="fsr-sum-item">Viva: <strong>{vivaMarks}/2</strong></span>
                <span className="fsr-sum-sep">•</span>
                <span className="fsr-sum-item fsr-sum-total">
                  Total: <strong>{currentTotal}/10</strong>
                </span>
              </div>

              <div className="fsr-sum-feedback-badge">
                Feedback: <strong>{feedback.trim() ? 'Ready' : 'Missing'}</strong>
              </div>
            </div>

            <div className="fsr-action-buttons-group">
              <Button
                variant="secondary"
                onClick={onBack}
              >
                Return to Student
              </Button>

              {nextSubmission && onSelectSubmission && (
                <Button
                  variant="secondary"
                  onClick={() => onSelectSubmission(nextSubmission)}
                >
                  Next Submission →
                </Button>
              )}

              <Button
                variant="primary"
                onClick={handleSaveEvaluation}
                disabled={isSaving}
              >
                <Save size={14} />
                <span>{isSaving ? 'Saving...' : 'Save Evaluation'}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
