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
  FileCheck2
} from 'lucide-react';
import SubmissionsQueue from './SubmissionsQueue';
import GradingModal from './GradingModal';
import AuditLogDrawer from './AuditLogDrawer';
import Button from '../ui/Button';

export default function FacultyDashboard({
  batchMetrics,
  submissions = [],
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

  const tierBreakdown = batchMetrics?.tierBreakdown || {
    advanced: 42,
    proficient: 45,
    beginner: 13,
  };

  const rubricAverages = batchMetrics?.rubricAverages || {
    coding: 4.7,
    writing: 2.4,
    viva: 1.5,
  };

  const pendingCount = submissions.filter((s) => s.status !== 'Graded').length;
  const flaggedCount = submissions.filter((s) => (s.focusBlurEvents || 0) > 0).length;

  const handleExportCSV = () => {
    // Generate simple NEP 2020 Gradebook CSV
    const headers = ['PRN', 'Student Name', 'Roll Number', 'Practical', 'Coding (5M)', 'Writing (3M)', 'Viva (2M)', 'Total (10M)', 'Adaptive Tier', 'Integrity Status'];
    const rows = submissions.map((s) => [
      s.prn || 'PRN2026CS000',
      s.studentName,
      s.rollNumber,
      s.practicalTitle,
      s.codingMarks || 0,
      s.writeupMarks || 0,
      s.vivaMarks || 0,
      s.totalMarks || 0,
      s.adaptiveTier || 'Proficient',
      s.focusBlurEvents > 0 ? `${s.focusBlurEvents} Blurs (Flagged)` : 'Verified Clean',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EduLab_BatchA_10Mark_Gradebook_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="faculty-portal-root">
      <div className="faculty-portal-container">
        {/* =========================================================
            FACULTY COMMAND HEADER
            ========================================================= */}
        <header className="faculty-command-header">
          <div className="command-header-left">
            <div className="faculty-context-tag">
              <span className="context-dot" />
              <span>FACULTY ACADEMIC CONSOLE · BATCH A</span>
            </div>
            <h1 className="faculty-command-title">
              Lab Evaluation &amp; Analytics Command Center
            </h1>
            <p className="faculty-command-subtitle">
              CS204P Data Structures Lab · Academic Year 2026-27 (Sem III) · AICTE &amp; NEP 2020 10-Mark Rubric Assessment
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
              <span className="metric-card-label">Total Students</span>
              <div className="metric-icon-wrap icon-primary">
                <Users size={15} />
              </div>
            </div>
            <div className="metric-card-number-row">
              <span className="metric-card-val">{batchMetrics?.totalStudents || 64}</span>
              <span className="metric-card-unit">Enrolled</span>
            </div>
            <div className="metric-card-subtext">
              <span>Batch A · 100% Active Cohort</span>
            </div>
          </div>

          {/* 2. Completion Rate */}
          <div className="faculty-metric-card">
            <div className="metric-card-top">
              <span className="metric-card-label">Completion Rate</span>
              <div className="metric-icon-wrap icon-success">
                <CheckCircle2 size={15} />
              </div>
            </div>
            <div className="metric-card-number-row">
              <span className="metric-card-val">{batchMetrics?.completionRate || 90.6}%</span>
              <span className="metric-card-unit">({batchMetrics?.submissionsCount || 58}/64)</span>
            </div>
            <div className="progress-track" style={{ height: '4px', marginTop: '6px' }}>
              <div
                className="progress-fill fill-success"
                style={{ width: `${batchMetrics?.completionRate || 90.6}%` }}
              />
            </div>
            <div className="metric-card-subtext" style={{ marginTop: '6px' }}>
              <span className="text-success">+8 Submissions today</span>
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
              <span className="metric-card-val">{batchMetrics?.averagePerformance || '8.6 / 10'}</span>
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
              <span className="metric-card-val">{pendingCount || batchMetrics?.pendingEvaluations || 14}</span>
              <span className="metric-card-unit">Submissions</span>
            </div>
            <div className="metric-card-subtext">
              <span className="text-warning">Awaiting 3M Write-up / 2M Viva verification</span>
            </div>
          </div>

          {/* 5. Flagged Submissions */}
          <div
            className="faculty-metric-card metric-card-interactive"
            onClick={() => {
              setActiveQueueFilter('flagged');
            }}
            title="Click to filter flagged submissions in the queue"
          >
            <div className="metric-card-top">
              <span className="metric-card-label">Flagged Submissions</span>
              <div className="metric-icon-wrap icon-danger">
                <ShieldAlert size={15} />
              </div>
            </div>
            <div className="metric-card-number-row">
              <span className="metric-card-val text-danger">{flaggedCount || batchMetrics?.flaggedSubmissions || 3}</span>
              <span className="metric-card-unit">Integrity Alerts</span>
            </div>
            <div className="metric-card-subtext">
              <span className="text-danger">&gt; 2 Tab Blurs · Requires faculty oral review</span>
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
              <span className="panel-head-tag">Rule-Based Machine Classifier</span>
            </div>

            <div className="tier-dist-bars">
              {/* Advanced */}
              <div className="tier-dist-item">
                <div className="tier-dist-label-row">
                  <span className="tier-name">Advanced Tier (Hard / Optimal Height Invariants)</span>
                  <span className="tier-pct">{tierBreakdown.advanced}% (27 Students)</span>
                </div>
                <div className="progress-track" style={{ height: '5px' }}>
                  <div className="progress-fill fill-accent" style={{ width: `${tierBreakdown.advanced}%` }} />
                </div>
              </div>

              {/* Proficient */}
              <div className="tier-dist-item">
                <div className="tier-dist-label-row">
                  <span className="tier-name">Proficient Tier (Standard Curricular Pace)</span>
                  <span className="tier-pct">{tierBreakdown.proficient}% (29 Students)</span>
                </div>
                <div className="progress-track" style={{ height: '5px' }}>
                  <div className="progress-fill fill-success" style={{ width: `${tierBreakdown.proficient}%` }} />
                </div>
              </div>

              {/* Beginner */}
              <div className="tier-dist-item">
                <div className="tier-dist-label-row">
                  <span className="tier-name">Beginner Tier (Needs Theory Scaffolding)</span>
                  <span className="tier-pct">{tierBreakdown.beginner}% (8 Students)</span>
                </div>
                <div className="progress-track" style={{ height: '5px' }}>
                  <div className="progress-fill fill-warning" style={{ width: `${tierBreakdown.beginner}%` }} />
                </div>
              </div>
            </div>

            <div className="tier-remediation-callout">
              <Sparkles size={13} color="var(--warning-text)" />
              <span>
                <strong>Remediation Recommendation:</strong> 8 students flagged in Beginner tier require assisted pseudocode walkthrough before next AVL balancing rotation practical.
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
              <span className="panel-head-tag">Credit Deposited</span>
            </div>

            <p className="panel-card-desc">
              Every completed 10-mark lab module auto-validates institutional credit criteria under NEP 2020 framework.
            </p>

            <div className="nep-credits-list">
              <div className="nep-credit-item">
                <span className="credit-code">CS204P.1</span>
                <span className="credit-title">Non-Linear Trees &amp; BST Invariants (Level 5)</span>
                <span className="credit-status">2 Credits</span>
              </div>
              <div className="nep-credit-item">
                <span className="credit-code">CS204P.2</span>
                <span className="credit-title">Valgrind Memory Allocation &amp; Pointer Hierarchy</span>
                <span className="credit-status">1 Credit</span>
              </div>
              <div className="nep-credit-item">
                <span className="credit-code">CS204P.3</span>
                <span className="credit-title">Judge0 Sandboxed Linux Compilation Integrity</span>
                <span className="credit-status">1 Credit</span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            SEARCHABLE & FILTERABLE EVALUATION QUEUE
            ========================================================= */}
        <section className="faculty-queue-section">
          <SubmissionsQueue
            submissions={submissions}
            onOpenGrading={handleOpenGrading}
            onOpenAuditLogs={handleOpenAuditLogs}
            initialFilter={activeQueueFilter}
          />
        </section>

        {/* Modals & Drawers */}
        <GradingModal
          isOpen={isGradingOpen}
          onClose={() => setIsGradingOpen(false)}
          submission={selectedSubmission}
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
