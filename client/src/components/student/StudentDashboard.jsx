import React from 'react';
import { ArrowRight, BookOpen, Award, CheckCircle2, TrendingUp, Layers, Play, Clock, Sparkles, AlertTriangle, RefreshCw } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Hero3DObject from './Hero3DObject';
import PracticalsList from './PracticalsList';
import PerformanceAnalytics from './PerformanceAnalytics';
import SkillMap from './SkillMap';
import RecentActivity from './RecentActivity';
import StudentProfileCard from './StudentProfileCard';
import SubjectSelector from './SubjectSelector';

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
  subjects = [],
  onSelectSubject,
}) {
  const rollNumber = studentProfile?.identifier || currentUser?.identifier || 'Not Assigned';
  const batchName = studentProfile?.batches?.name || currentUser?.batchName || 'Unassigned';
  const totalPracticals = practicals.length || 0;

  // Real completed submissions
  const completedSubs = submissions.filter(
    (s) => s.status === 'completed' || s.status === 'Graded' || (s.passedCount > 0 && s.passedCount === s.totalCount)
  );
  const completedCount = completedSubs.length;
  const progressPercent = totalPracticals > 0 ? Math.min(100, Math.round((completedCount / totalPracticals) * 100)) : 0;

  // Real evaluated / graded submissions with marks
  const evaluatedSubs = submissions.filter((s) => (s.totalMarks || 0) > 0);
  const averageScore = evaluatedSubs.length > 0
    ? (evaluatedSubs.reduce((sum, s) => sum + (s.totalMarks || 0), 0) / evaluatedSubs.length).toFixed(1)
    : '0.0';

  const cumulativeGpa = evaluatedSubs.length > 0
    ? Math.min(100, Math.round((parseFloat(averageScore) / 10.0) * 100)).toFixed(1)
    : '0.0';

  // Dynamic rubric breakdown from real evaluations
  const codingScores = evaluatedSubs.map((s) => s.codingMarks || 0);
  const writingScores = evaluatedSubs.map((s) => s.writeupMarks || 0);
  const vivaScores = evaluatedSubs.map((s) => s.vivaMarks || 0);

  const totalRuns = submissions.length;
  const totalPassedAll = submissions.filter((s) => s.passedCount > 0 && s.passedCount === s.totalCount).length;
  const firstPassRate = totalRuns > 0 ? Math.round((totalPassedAll / totalRuns) * 100) : 0;

  const performance = {
    hasData: totalRuns > 0 || evaluatedSubs.length > 0,
    totalSubmissions: totalRuns,
    completedSubmissions: completedCount,
    codingAverage: codingScores.length ? parseFloat((codingScores.reduce((a, b) => a + b, 0) / codingScores.length).toFixed(1)) : 0.0,
    writeupAverage: writingScores.length ? parseFloat((writingScores.reduce((a, b) => a + b, 0) / writingScores.length).toFixed(1)) : 0.0,
    vivaAverage: vivaScores.length ? parseFloat((vivaScores.reduce((a, b) => a + b, 0) / vivaScores.length).toFixed(1)) : 0.0,
    firstPassRate,
    avgExecutionMs: null,
    memoryScore: null,
    focusIntegrity: 100,
  };

  // Compute honest skill map competencies from real completed practicals
  const derivedSkills = (() => {
    if (submissions.length === 0) return [];

    const categoryMap = {};
    submissions.forEach((s) => {
      const cat = s.practicalTitle?.split(':')[1]?.trim() || 'Data Structures';
      if (!categoryMap[cat]) {
        categoryMap[cat] = { total: 0, passed: 0, marks: 0, count: 0 };
      }
      categoryMap[cat].total += s.totalCount || 1;
      categoryMap[cat].passed += s.passedCount || 0;
      categoryMap[cat].marks += s.totalMarks || s.codingMarks || 0;
      categoryMap[cat].count += 1;
    });

    return Object.entries(categoryMap).map(([cat, data]) => {
      const level = Math.min(100, Math.round((data.passed / data.total) * 100));
      return {
        name: cat,
        category: 'Algorithms',
        level,
        tier: level >= 80 ? 'Advanced' : level >= 50 ? 'Proficient' : 'Beginner',
        milestone: `${data.count} Practical Solution(s) Verified`,
      };
    });
  })();

  // Real activities mapped from submissions
  const activities = submissions.length > 0
    ? submissions.slice(0, 5).map((s) => ({
        id: s.id,
        title: `${s.status === 'Graded' ? 'Faculty Evaluated' : 'Compiler Run & Submission'} · ${s.practicalTitle}`,
        type: s.status === 'Graded' ? 'writeup' : 'test_pass',
        timestamp: s.submittedDate || s.submittedAt || 'Recent',
        detail: `Score: ${s.totalMarks || s.codingMarks} / 10.0 M · Tests: ${s.passedCount}/${s.totalCount} passed · ${s.languageName}`,
        status: s.status === 'Graded' ? 'graded' : 'success',
      }))
    : [];

  const activePractical = currentPractical || practicals[0];

  const skillLevel = completedCount >= 5 ? 'Advanced' : completedCount >= 2 ? 'Proficient' : completedCount >= 1 ? 'Foundation' : 'Not Assessed';
  const skillCaption = completedCount > 0 ? `Assessed across ${completedCount} completed lab(s)` : 'Awaiting first completed practical';

  return (
    <div className="student-dashboard-page">
      <div className="dashboard-container">
        <StudentProfileCard profile={studentProfile} currentUser={currentUser} />

        <SubjectSelector subjects={subjects} onSelect={(subject) => onSelectSubject && onSelectSubject(subject)} />

        {/* Error state banner if Supabase fails */}
        {error && (
          <div className="db-error-banner" style={{
            background: 'var(--danger-subtle)',
            border: '1px solid var(--danger-border)',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertTriangle size={20} color="var(--danger-text)" />
              <div>
                <strong style={{ color: 'var(--text-primary)', fontSize: '14px', display: 'block' }}>Database Synchronization Notice</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{error}</span>
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
            <div className="skeleton-pulse" style={{ width: '60px', height: '60px', borderRadius: '50%', margin: '0 auto 20px', background: 'var(--accent-subtle)' }} />
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>Loading Live Supabase Syllabus...</h3>
            <p>Retrieving practicals, test suites, and academic rubric from canonical database.</p>
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
                    <span className="text-accent-gradient">Data Structures &amp; Algorithms</span>
                  </h1>

                  <p className="hero-description">
                    Interactive compiler sandbox with Judge0 runtime evaluation, non-punitive focus integrity telemetry, and faculty-verified AICTE 10-mark academic rubric assessment (3M Coding + 5M Journal + 2M Viva).
                  </p>

                  {/* "Continue Practical" Primary Card */}
                  <div className="continue-practical-card">
                    <div className="continue-card-header">
                      <div className="continue-header-left">
                        <span className="continue-tag">ACTIVE LAB EXPERIMENT</span>
                        <h2 className="continue-practical-title">
                          {activePractical?.title || 'No practical selected'}
                        </h2>
                      </div>
                      <Badge variant={activePractical?.difficulty === 'Hard' ? 'tier-advanced' : 'neutral'}>
                        <Sparkles size={11} />
                        {activePractical?.difficulty || 'Standard'}
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
                        <span>{activePractical?.testCases?.length || 0} Test Cases Linked</span>
                      </div>
                    </div>

                    <div className="continue-card-action">
                      <Button
                        variant="primary"
                        size="lg"
                        icon={Play}
                        onClick={() => onContinuePractical(activePractical)}
                        disabled={!activePractical}
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
                      <span className="metric-sub-caption">
                        {evaluatedSubs.length > 0 ? `${cumulativeGpa}% Cumulative GPA` : 'No Evaluated Labs Yet'}
                      </span>
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
                      <span className="metric-sub-caption">
                        {totalPracticals > completedCount ? `${totalPracticals - completedCount} Remaining` : 'All Labs Completed'}
                      </span>
                    </div>

                    {/* 4. Current Skill Level */}
                    <div className="hero-metric-box">
                      <div className="metric-box-top">
                        <span className="metric-box-label">Current Skill Level</span>
                        <TrendingUp size={14} color="var(--accent-text)" />
                      </div>
                      <div className="metric-box-number-row">
                        <Badge variant={completedCount >= 5 ? 'tier-advanced' : completedCount >= 1 ? 'tier-proficient' : 'neutral'}>
                          {skillLevel}
                        </Badge>
                      </div>
                      <span className="metric-sub-caption">{skillCaption}</span>
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
              <SkillMap skills={derivedSkills} />
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
