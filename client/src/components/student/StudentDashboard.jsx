import React from 'react';
import { ArrowRight, BookOpen, Award, CheckCircle2, TrendingUp, Layers, Play, Clock, Sparkles } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Hero3DObject from './Hero3DObject';
import PracticalsList from './PracticalsList';
import PerformanceAnalytics from './PerformanceAnalytics';
import SkillMap from './SkillMap';
import RecentActivity from './RecentActivity';
import { STUDENT_PROFILE } from '../../services/mockData';

export default function StudentDashboard({
  currentPractical,
  practicals,
  onContinuePractical,
  onSelectPractical,
}) {
  const profile = STUDENT_PROFILE;

  return (
    <div className="student-dashboard-page">
      <div className="dashboard-container">
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
                <span className="pill-text">{profile.batch}</span>
                <span className="pill-divider">•</span>
                <span className="pill-id">{profile.rollNumber}</span>
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
                      {currentPractical?.title || 'Practical 04: Binary Search Tree & Traversal'}
                    </h2>
                  </div>
                  <Badge variant="tier-advanced">
                    <Sparkles size={11} />
                    Tier 1 (Advanced)
                  </Badge>
                </div>

                <div className="continue-card-meta-row">
                  <div className="continue-meta-item">
                    <BookOpen size={13} color="var(--accent-text)" />
                    <span>{currentPractical?.courseCode?.split(':')[0] || 'CS204P'}</span>
                  </div>
                  <div className="continue-meta-item">
                    <Clock size={13} color="var(--text-muted)" />
                    <span>Est. 30 Mins · C++20 / Python / Java</span>
                  </div>
                  <div className="continue-meta-item">
                    <CheckCircle2 size={13} color="var(--success-text)" />
                    <span>Auto-Save & Test Suites Ready</span>
                  </div>
                </div>

                <div className="continue-card-action">
                  <Button
                    variant="primary"
                    size="lg"
                    icon={Play}
                    onClick={() => onContinuePractical(currentPractical)}
                  >
                    Continue Practical
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
                    <span className="metric-box-val">{profile.progressPercent}%</span>
                    <span className="metric-box-sub">({profile.completedCount}/{profile.totalPracticals})</span>
                  </div>
                  <div className="progress-track" style={{ marginTop: '8px', height: '4px' }}>
                    <div
                      className="progress-fill fill-accent"
                      style={{ width: `${profile.progressPercent}%` }}
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
                    <span className="metric-box-val">{profile.averageScore}</span>
                    <span className="metric-box-sub">/ 10.0 M</span>
                  </div>
                  <span className="metric-sub-caption">92.0% Cumulative GPA</span>
                </div>

                {/* 3. Completed Practicals */}
                <div className="hero-metric-box">
                  <div className="metric-box-top">
                    <span className="metric-box-label">Completed</span>
                    <CheckCircle2 size={14} color="var(--info-text)" />
                  </div>
                  <div className="metric-box-number-row">
                    <span className="metric-box-val">{profile.completedCount}</span>
                    <span className="metric-box-sub">of {profile.totalPracticals} Labs</span>
                  </div>
                  <span className="metric-sub-caption">1 Active Session</span>
                </div>

                {/* 4. Current Skill Level */}
                <div className="hero-metric-box">
                  <div className="metric-box-top">
                    <span className="metric-box-label">Current Skill Level</span>
                    <TrendingUp size={14} color="var(--accent-text)" />
                  </div>
                  <div className="metric-box-number-row">
                    <Badge variant="tier-advanced">{profile.skillLevel}</Badge>
                  </div>
                  <span className="metric-sub-caption">AICTE Invariant: Level 5</span>
                </div>
              </div>
            </div>

            {/* Right Column: 3D Hero Object Visualizer */}
            <div className="hero-3d-col">
              <Hero3DObject practical={currentPractical} />
            </div>
          </div>
        </section>

        {/* =========================================================
            PRACTICALS CATALOG SECTION
            ========================================================= */}
        <PracticalsList
          practicals={practicals}
          currentPracticalId={currentPractical?.id}
          onSelectPractical={onSelectPractical}
        />

        {/* =========================================================
            PERFORMANCE & SKILL MAP 2-COLUMN SECTION
            ========================================================= */}
        <div className="dashboard-two-col-grid">
          <PerformanceAnalytics performance={profile.performance} />
          <SkillMap skills={profile.skills} />
        </div>

        {/* =========================================================
            RECENT ACTIVITY SECTION
            ========================================================= */}
        <RecentActivity activities={profile.activities} />
      </div>
    </div>
  );
}
