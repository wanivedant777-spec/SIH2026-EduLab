import React, { useState } from 'react';
import {
  Users,
  CheckCircle2,
  Award,
  Clock,
  ShieldAlert,
  Download,
  Layers,
  Sparkles,
  FileCheck2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import SubmissionsQueue from './SubmissionsQueue';
import GradingModal from './GradingModal';
import AuditLogDrawer from './AuditLogDrawer';
import Button from '../ui/Button';

export default function FacultyDashboard({
  currentUser,
  facultyAllocations = [],
  submissions = [],
  batchMetrics: _batchMetrics,
  isLoading = false,
  error = null,
  onRetry,
  onSaveGrade,
}) {
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [isGradingOpen, setIsGradingOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [activeQueueFilter, setActiveQueueFilter] = useState('all');

  const handleOpenGrading = (sub) => {
    setSelectedSubmission(sub);
    setIsGradingOpen(true);
  };

  const handleOpenAuditLogs = (_sub) => {
    setIsAuditOpen(true);
  };

  // Derive allocated batches and subject info - NEVER invent C1/C2/C3 when empty
  const batchNames = facultyAllocations.map((a) => a.batches?.name).filter(Boolean);
  const hasAllocations = batchNames.length > 0;
  const batchesText = hasAllocations ? batchNames.join(', ') : 'None';
  const subjectCode = facultyAllocations[0]?.subjects?.code || '';
  const subjectName = facultyAllocations[0]?.subjects?.name || '';

  // Live calculated stats
  const totalSubmissions = submissions.length;
  const gradedSubmissions = submissions.filter((s) => s.status === 'Graded');
  const pendingCount = submissions.filter((s) => s.status !== 'Graded').length;
  const flaggedCount = submissions.filter((s) => (s.focusBlurEvents || 0) > 0).length;
  const uniqueStudents = new Set(submissions.map((s) => s.studentId || s.prn)).size;

  const codingSum = gradedSubmissions.reduce((acc, s) => acc + (s.codingMarks || 0), 0);
  const writingSum = gradedSubmissions.reduce((acc, s) => acc + (s.writeupMarks || 0), 0);
  const vivaSum = gradedSubmissions.reduce((acc, s) => acc + (s.vivaMarks || 0), 0);
  const totalMarksSum = gradedSubmissions.reduce((acc, s) => acc + (s.totalMarks || 0), 0);

  const rubricAverages = {
    coding: gradedSubmissions.length ? (codingSum / gradedSubmissions.length).toFixed(1) : '0.0',
    writing: gradedSubmissions.length ? (writingSum / gradedSubmissions.length).toFixed(1) : '0.0',
    viva: gradedSubmissions.length ? (vivaSum / gradedSubmissions.length).toFixed(1) : '0.0',
  };

  const averagePerformance = gradedSubmissions.length
    ? `${(totalMarksSum / gradedSubmissions.length).toFixed(1)} / 10`
    : '0.0 / 10';

  const completionRate = totalSubmissions
    ? Math.round((gradedSubmissions.length / totalSubmissions) * 100)
    : 0;

  // Live tier distribution from real submissions
  const advancedCount = submissions.filter((s) => s.adaptiveTier === 'Advanced').length;
  const proficientCount = submissions.filter((s) => s.adaptiveTier === 'Proficient').length;
  const beginnerCount = submissions.filter((s) => s.adaptiveTier === 'Beginner').length;

  const tierBreakdown = {
    advanced: totalSubmissions ? Math.round((advancedCount / totalSubmissions) * 100) : 0,
    proficient: totalSubmissions ? Math.round((proficientCount / totalSubmissions) * 100) : 0,
    beginner: totalSubmissions ? Math.round((beginnerCount / totalSubmissions) * 100) : 0,
  };

  const handleExportCSV = () => {
    const headers = ['PRN', 'Student Name', 'Roll Number', 'Batch', 'Practical', 'Coding (3M Auto)', 'Writing (5M Faculty)', 'Viva (2M Faculty)', 'Total (10M)', 'Adaptive Tier', 'Integrity Status', 'Status'];
    const rows = submissions.map((s) => [
      s.prn || 'N/A',
      s.studentName,
      s.rollNumber,
      s.batchName || 'Unassigned',
      s.practicalTitle,
      s.codingMarks || 0,
      s.writeupMarks || 0,
      s.vivaMarks || 0,
      s.totalMarks || 0,
      s.adaptiveTier || 'Beginner',
      s.focusBlurEvents > 0 ? `${s.focusBlurEvents} Blurs (Flagged)` : 'Verified Clean',
      s.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EduLab_${subjectCode || 'Console'}_10Mark_Gradebook_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="faculty-portal-root">
      <div className="faculty-portal-container">
        {/* Database error banner */}
        {error && (
          <div className="db-error-banner" style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertTriangle size={20} color="var(--danger-text, #ef4444)" />
              <div>
                <strong style={{ color: '#fff', fontSize: '14px', display: 'block' }}>Database Synchronization Notice</strong>
                <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '13px' }}>{error}</span>
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
            FACULTY COMMAND HEADER
            ========================================================= */}
        <header className="faculty-command-header">
          <div className="command-header-left">
            <div className="faculty-context-tag">
              <span className="context-dot" />
              <span>
                {hasAllocations
                  ? `FACULTY ACADEMIC CONSOLE · BATCHES ${batchesText}`
                  : 'FACULTY ACADEMIC CONSOLE · AWAITING BATCH ALLOCATION'}
              </span>
            </div>
            <h1 className="faculty-command-title">
              Lab Evaluation &amp; Analytics Command Center
            </h1>
            <p className="faculty-command-subtitle">
              {hasAllocations
                ? `${subjectCode}: ${subjectName} · Academic Year 2025-26 (Sem IV) · AICTE 10-Mark Rubric Assessment`
                : 'Awaiting Department Batch & Subject Allocations · AICTE 10-Mark Rubric Console'}
            </p>
          </div>

          <div className="command-header-actions">
            <Button
              variant="secondary"
              size="sm"
              icon={ShieldAlert}
              onClick={() => setIsAuditOpen(true)}
              title="Open real-time window blur and tab focus telemetry"
            >
              Audit Telemetry ({flaggedCount})
            </Button>

            <Button
              variant="primary"
              size="sm"
              icon={Download}
              onClick={handleExportCSV}
              title="Export complete 10-Mark Rubric Gradebook in CSV format"
              disabled={submissions.length === 0}
            >
              Export NEP Gradebook
            </Button>
          </div>
        </header>

        {/* =========================================================
            5 CORE ANALYTICS METRICS DASHBOARD
            ========================================================= */}
        <section className="faculty-metrics-banner">
          {/* 1. Total Students */}
          <div className="faculty-metric-card">
            <div className="metric-card-top">
              <span className="metric-card-label">Allocated Students</span>
              <div className="metric-icon-wrap icon-primary">
                <Users size={15} />
              </div>
            </div>
            <div className="metric-card-number-row">
              <span className="metric-card-val">{uniqueStudents}</span>
              <span className="metric-card-unit">Students</span>
            </div>
            <div className="metric-card-subtext">
              <span>{hasAllocations ? `Batches ${batchesText}` : 'No active cohorts'}</span>
            </div>
          </div>

          {/* 2. Completion Rate */}
          <div className="faculty-metric-card">
            <div className="metric-card-top">
              <span className="metric-card-label">Evaluation Rate</span>
              <div className="metric-icon-wrap icon-success">
                <CheckCircle2 size={15} />
              </div>
            </div>
            <div className="metric-card-number-row">
              <span className="metric-card-val">{completionRate}%</span>
              <span className="metric-card-unit">({gradedSubmissions.length}/{totalSubmissions})</span>
            </div>
            <div className="progress-track" style={{ height: '4px', marginTop: '6px' }}>
              <div
                className="progress-fill fill-success"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <div className="metric-card-subtext" style={{ marginTop: '6px' }}>
              <span className={pendingCount > 0 ? 'text-warning' : 'text-success'}>
                {pendingCount} pending grading
              </span>
            </div>
          </div>

          {/* 3. Average Performance */}
          <div className="faculty-metric-card">
            <div className="metric-card-top">
              <span className="metric-card-label">Average Performance</span>
              <div className="metric-icon-wrap icon-cyan">
                <Award size={15} />
              </div>
            </div>
            <div className="metric-card-number-row">
              <span className="metric-card-val">{averagePerformance}</span>
              <span className="metric-card-unit">GPA</span>
            </div>
            <div className="metric-card-subtext">
              <span>Coding: {rubricAverages.coding}M · Writing: {rubricAverages.writing}M · Viva: {rubricAverages.viva}M</span>
            </div>
          </div>

          {/* 4. Pending Evaluations */}
          <div className="faculty-metric-card">
            <div className="metric-card-top">
              <span className="metric-card-label">Pending Evaluations</span>
              <div className="metric-icon-wrap icon-warning">
                <Clock size={15} />
              </div>
            </div>
            <div className="metric-card-number-row">
              <span className="metric-card-val">{pendingCount}</span>
              <span className="metric-card-unit">Submissions</span>
            </div>
            <div className="metric-card-subtext">
              <span className="text-warning">
                {pendingCount > 0 ? 'Awaiting 5M Journal / 2M Viva verification' : 'All submissions evaluated'}
              </span>
            </div>
          </div>

          {/* 5. Flagged Submissions */}
          <div
            className="faculty-metric-card metric-card-interactive"
            onClick={() => setActiveQueueFilter('flagged')}
            title="Click to filter flagged submissions in the queue"
          >
            <div className="metric-card-top">
              <span className="metric-card-label">Flagged Submissions</span>
              <div className="metric-icon-wrap icon-danger">
                <ShieldAlert size={15} />
              </div>
            </div>
            <div className="metric-card-number-row">
              <span className="metric-card-val text-danger">{flaggedCount}</span>
              <span className="metric-card-unit">Integrity Alerts</span>
            </div>
            <div className="metric-card-subtext">
              <span className="text-danger">
                {flaggedCount > 0 ? `${flaggedCount} requires faculty review` : 'Zero focus violations'}
              </span>
            </div>
          </div>
        </section>

        {/* =========================================================
            SECONDARY TELEMETRY: TIER BREAKDOWN & NEP CREDITS
            ========================================================= */}
        <section className="faculty-secondary-grid">
          {/* Adaptive Tier Breakdown */}
          <div className="faculty-panel-card">
            <div className="panel-card-head">
              <div className="panel-head-title">
                <Layers size={14} color="var(--accent-text)" />
                <span>AICTE Adaptive Difficulty Distribution</span>
              </div>
              <span className="panel-head-tag">Live Submissions</span>
            </div>

            <div className="tier-dist-bars">
              {/* Advanced */}
              <div className="tier-dist-item">
                <div className="tier-dist-label-row">
                  <span className="tier-name">Advanced Tier (Hard / Optimal Height Invariants)</span>
                  <span className="tier-pct">{tierBreakdown.advanced}% ({advancedCount} Students)</span>
                </div>
                <div className="progress-track" style={{ height: '5px' }}>
                  <div className="progress-fill fill-accent" style={{ width: `${tierBreakdown.advanced}%` }} />
                </div>
              </div>

              {/* Proficient */}
              <div className="tier-dist-item">
                <div className="tier-dist-label-row">
                  <span className="tier-name">Proficient Tier (Standard Curricular Pace)</span>
                  <span className="tier-pct">{tierBreakdown.proficient}% ({proficientCount} Students)</span>
                </div>
                <div className="progress-track" style={{ height: '5px' }}>
                  <div className="progress-fill fill-success" style={{ width: `${tierBreakdown.proficient}%` }} />
                </div>
              </div>

              {/* Beginner */}
              <div className="tier-dist-item">
                <div className="tier-dist-label-row">
                  <span className="tier-name">Beginner Tier (Needs Theory Scaffolding)</span>
                  <span className="tier-pct">{tierBreakdown.beginner}% ({beginnerCount} Students)</span>
                </div>
                <div className="progress-track" style={{ height: '5px' }}>
                  <div className="progress-fill fill-warning" style={{ width: `${tierBreakdown.beginner}%` }} />
                </div>
              </div>
            </div>

            <div className="tier-remediation-callout">
              <Sparkles size={13} color="var(--warning-text)" />
              <span>
                <strong>Remediation Recommendation:</strong>{' '}
                {totalSubmissions === 0
                  ? 'No submissions to evaluate yet. Adaptive difficulty recommendations will appear dynamically as students submit code.'
                  : beginnerCount > 0
                  ? `${beginnerCount} student(s) in Beginner tier recommended for assisted pseudocode walkthrough.`
                  : 'All evaluated submissions performing in Proficient/Advanced bands.'}
              </span>
            </div>
          </div>

          {/* NEP 2020 Credit Deposits */}
          <div className="faculty-panel-card">
            <div className="panel-card-head">
              <div className="panel-head-title">
                <FileCheck2 size={14} color="var(--cyan-light)" />
                <span>NEP 2020 Institutional Credit Mapping</span>
              </div>
              <span className="panel-head-tag">Canonical Syllabus</span>
            </div>

            <p className="panel-card-desc">
              Every completed 10-mark lab module auto-validates institutional credit criteria under NEP 2020 framework.
            </p>

            <div className="nep-credits-list">
              <div className="nep-credit-item">
                <span className="credit-code">CS201P.1</span>
                <span className="credit-title">Dynamic Memory Allocation &amp; Linked Lists (Level 4)</span>
                <span className="credit-status">2 Credits</span>
              </div>
              <div className="nep-credit-item">
                <span className="credit-code">CS201P.4</span>
                <span className="credit-title">Binary Search Tree Invariants &amp; Traversals (Level 5)</span>
                <span className="credit-status">2 Credits</span>
              </div>
              <div className="nep-credit-item">
                <span className="credit-code">CS201P.7</span>
                <span className="credit-title">Dijkstra Shortest Path &amp; Greedy Optimization (Level 6)</span>
                <span className="credit-status">2 Credits</span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            SEARCHABLE & FILTERABLE EVALUATION QUEUE
            ========================================================= */}
        <section className="faculty-queue-section">
          {isLoading && submissions.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div className="skeleton-pulse" style={{ width: '40px', height: '40px', borderRadius: '50%', margin: '0 auto 16px', background: 'rgba(99, 102, 241, 0.2)' }} />
              <p>Loading authorized submissions for Batches {batchesText}...</p>
            </div>
          ) : (
            <SubmissionsQueue
              submissions={submissions}
              onOpenGrading={handleOpenGrading}
              onOpenAuditLogs={handleOpenAuditLogs}
              initialFilter={activeQueueFilter}
            />
          )}
        </section>

        {/* Modals & Drawers */}
        <GradingModal
          key={selectedSubmission?.id || 'modal'}
          isOpen={isGradingOpen}
          onClose={() => setIsGradingOpen(false)}
          submission={selectedSubmission}
          currentUser={currentUser}
          onSaveGrade={onSaveGrade}
        />

        <AuditLogDrawer
          isOpen={isAuditOpen}
          onClose={() => setIsAuditOpen(false)}
        />
      </div>
    </div>
  );
}
