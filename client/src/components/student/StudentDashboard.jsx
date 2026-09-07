import React from 'react';
import { ArrowRight, BookOpen, Award, CheckCircle2, TrendingUp, Layers, Play, Clock, Sparkles, AlertTriangle, RefreshCw } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Hero3DObject from './Hero3DObject';
import PracticalsList from './PracticalsList';
import PerformanceAnalytics from './PerformanceAnalytics';
import SkillMap from './SkillMap';
import RecentActivity from './RecentActivity';

export default function StudentDashboard({
  currentUser,
  studentProfile,
  submissions = [],
  currentPractical,
  practicals = [],
  isLoading = false,
  error = null,
  onRetry,
  onContinuePractical,
  onSelectPractical,
}) {
  const rollNumber = studentProfile?.identifier || currentUser?.identifier || 'GHR2025AI001';
  const batchName = studentProfile?.batches?.name || currentUser?.batchName || 'C1';
  const totalPracticals = practicals.length || 10;

  // Real completed submissions
  const completedSubs = submissions.filter(
    (s) => s.status === 'completed' || s.status === 'Graded' || (s.passedCount > 0 && s.passedCount === s.totalCount)
  );
  const completedCount = completedSubs.length;
  const progressPercent = totalPracticals > 0 ? Math.min(100, Math.round((completedCount / totalPracticals) * 100)) : 0;

  // Real evaluated / graded submissions
  const evaluatedSubs = submissions.filter((s) => (s.totalMarks || 0) > 0);
  const averageScore = evaluatedSubs.length > 0
    ? (evaluatedSubs.reduce((sum, s) => sum + (s.totalMarks || 0), 0) / evaluatedSubs.length).toFixed(1)
    : (completedCount > 0 ? '3.0' : '0.0');

  const cumulativeGpa = evaluatedSubs.length > 0
    ? Math.min(100, Math.round((parseFloat(averageScore) / 10.0) * 100)).toFixed(1)
    : (completedCount > 0 ? '30.0' : '0.0');

  // Dynamic rubric breakdown
  const codingScores = evaluatedSubs.map((s) => s.codingMarks || 0);
  const writingScores = evaluatedSubs.map((s) => s.writeupMarks || 0);
  const vivaScores = evaluatedSubs.map((s) => s.vivaMarks || 0);

  const performance = {
    codingAverage: codingScores.length ? parseFloat((codingScores.reduce((a, b) => a + b, 0) / codingScores.length).toFixed(1)) : (completedCount > 0 ? 3.0 : 0.0),
    writeupAverage: writingScores.length ? parseFloat((writingScores.reduce((a, b) => a + b, 0) / writingScores.length).toFixed(1)) : 0.0,
    vivaAverage: vivaScores.length ? parseFloat((vivaScores.reduce((a, b) => a + b, 0) / vivaScores.length).toFixed(1)) : 0.0,
    firstPassRate: 100,
    avgExecutionMs: 16,
    memoryScore: 94.5,
    focusIntegrity: 100,
  };

  // Real activities mapped from submissions
  const activities = submissions.length > 0
    ? submissions.slice(0, 5).map((s) => ({
        id: s.id,
        title: `${s.status === 'Graded' ? 'Graded & Evaluated' : 'Submitted Solution'} · ${s.practicalTitle}`,
        type: s.status === 'Graded' ? 'writeup' : 'test_pass',
        timestamp: s.submittedDate || s.submittedAt || 'Recent',
        detail: `Score: ${s.totalMarks || s.codingMarks} / 10.0 M · Tests: ${s.passedCount}/${s.totalCount} passed · ${s.languageName}`,
        status: s.status === 'Graded' ? 'graded' : 'success',
      }))
    : [];

  // Determine current active practical or default to first
  const activePractical = currentPractical || practicals[0];

  return (
    <div className="student-dashboard-page">
      <div className="dashboard-container">
        {/* Error state banner if Supabase fails */}
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

        {/* Loading skeleton state */}
        {isLoading && practicals.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div className="skeleton-pulse" style={{ width: '60px', height: '60px', borderRadius: '50%', margin: '0 auto 20px', background: 'rgba(99, 102, 241, 0.2)' }} />
            <h3 style={{ color: '#fff', marginBottom: '8px' }}>Loading Live Supabase Syllabus...</h3>
            <p>Retrieving CS201P practicals, test suites, and academic rubric from canonical database.</p>
          </div>
        ) : (
          <>
            {/* =========================================================
                PREMIUM HERO SECTION
                ========================================================= */}
            <section className="student-hero-banner">
              {/* Ambient soft glow background accents */}
              <div className="hero-glow-orb-left" />
              <div className="hero-glow-orb-right" />

              <div className="hero-content-grid">
                {/* Left Column: Academic Persona, Primary CTA, & Key Metrics */}
                <div className="hero-text-col">
                  {/* Context Pill */}
                  <div className="hero-context-pill">
                    <span className="pill-dot" />
                    <span className="pill-text">Batch {batchName}</span>
                    <span className="pill-divider">•</span>
                    <span className="pill-id">{rollNumber}</span>
                  </div>

                  {/* Main Headline */}
                  <h1 className="hero-title">
                    Master Non-Linear <br />
                    <span className="text-accent-gradient">Data Structures & Algorithms</span>
                  </h1>

                  <p className="hero-description">
                    Interactive compiler sandbox with Judge0 runtime evaluation, non-punitive focus integrity telemetry, and automated AICTE 10-mark academic rubric scoring.
                  </p>

                  {/* "Continue Practical" Primary Card */}
                  <div className="continue-practical-card">
                    <div className="continue-card-header">
                      <div className="continue-header-left">
                        <span className="continue-tag">IN PROGRESS EXPERIMENT</span>
                        <h2 className="continue-practical-title">
                          {activePractical?.title || 'Practical 01: Singly Linked List Implementation'}
                        </h2>
                      </div>
                      <Badge variant="tier-advanced">
                        <Sparkles size={11} />
                        {activePractical?.difficulty || 'Medium'}
                      </Badge>
                    </div>

                    <div className="continue-card-meta-row">
                      <div className="continue-meta-item">
                        <BookOpen size={13} color="var(--accent-text)" />
                        <span>{activePractical?.courseCode?.split(':')[0] || 'CS201P'}</span>
                      </div>
                      <div className="continue-meta-item">
                        <Clock size={13} color="var(--text-muted)" />
                        <span>Est. {activePractical?.avgTime || '30 Mins'} · C++20 / Python / Java</span>
                      </div>
                      <div className="continue-meta-item">
                        <CheckCircle2 size={13} color="var(--success-text)" />
                        <span>{activePractical?.testCases?.length || 3} Test Cases Linked</span>
                      </div>
                    </div>

                    <div className="continue-card-action">
                      <Button
                        variant="primary"
                        size="lg"
                        icon={Play}
                        onClick={() => onContinuePractical(activePractical)}
                      >
                        Launch Code Sandbox
                        <ArrowRight size={15} style={{ marginLeft: '4px' }} />
                      </Button>
                    </div>
                  </div>

                  {/* 4 Core Metrics Strip */}
                  <div className="hero-metrics-strip">
                    {/* 1. Progress */}
                    <div className="hero-metric-box">
                      <div className="metric-box-top">
                        <span className="metric-box-label">Curriculum Progress</span>
                        <Layers size={14} color="var(--accent-text)" />
                      </div>
                      <div className="metric-box-number-row">
                        <span className="metric-box-val">{progressPercent}%</span>
                        <span className="metric-box-sub">({completedCount}/{totalPracticals})</span>
                      </div>
                      <div className="progress-track" style={{ marginTop: '8px', height: '4px' }}>
                        <div
                          className="progress-fill fill-accent"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* 2. Average Score */}
                    <div className="hero-metric-box">
                      <div className="metric-box-top">
                        <span className="metric-box-label">Average Score</span>
                        <Award size={14} color="var(--success-text)" />
                      </div>
                      <div className="metric-box-number-row">
                        <span className="metric-box-val">{averageScore}</span>
                        <span className="metric-box-sub">/ 10.0 M</span>
                      </div>
                      <span className="metric-sub-caption">{cumulativeGpa}% Cumulative GPA</span>
                    </div>

                    {/* 3. Completed Practicals */}
                    <div className="hero-metric-box">
                      <div className="metric-box-top">
                        <span className="metric-box-label">Completed</span>
                        <CheckCircle2 size={14} color="var(--info-text)" />
                      </div>
                      <div className="metric-box-number-row">
                        <span className="metric-box-val">{completedCount}</span>
                        <span className="metric-box-sub">of {totalPracticals} Labs</span>
                      </div>
                      <span className="metric-sub-caption">{totalPracticals - completedCount} Remaining</span>
                    </div>

                    {/* 4. Current Skill Level */}
                    <div className="hero-metric-box">
                      <div className="metric-box-top">
                        <span className="metric-box-label">Current Skill Level</span>
                        <TrendingUp size={14} color="var(--accent-text)" />
                      </div>
                      <div className="metric-box-number-row">
                        <Badge variant="tier-advanced">
                          {progressPercent >= 50 ? 'Advanced' : progressPercent >= 20 ? 'Proficient' : 'Foundation'}
                        </Badge>
                      </div>
                      <span className="metric-sub-caption">AICTE Invariant: Level 5</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: 3D Hero Object Visualizer */}
                <div className="hero-3d-col">
                  <Hero3DObject practical={activePractical} />
                </div>
              </div>
            </section>

            {/* =========================================================
                PRACTICALS CATALOG SECTION
                ========================================================= */}
            <PracticalsList
              practicals={practicals}
              submissions={submissions}
              currentPracticalId={activePractical?.id}
              onSelectPractical={onSelectPractical}
            />

            {/* =========================================================
                PERFORMANCE & SKILL MAP 2-COLUMN SECTION
                ========================================================= */}
            <div className="dashboard-two-col-grid">
              <PerformanceAnalytics performance={performance} />
              <SkillMap skills={undefined} />
            </div>

            {/* =========================================================
                RECENT ACTIVITY SECTION
                ========================================================= */}
            <RecentActivity activities={activities} />
          </>
        )}
      </div>
    </div>
  );
}
