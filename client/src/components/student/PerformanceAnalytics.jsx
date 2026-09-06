import React from 'react';
import { Award, Zap, Cpu, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function PerformanceAnalytics({ performance }) {
  const p = performance || {
    codingAverage: 4.9,
    writeupAverage: 2.8,
    vivaAverage: 1.9,
    firstPassRate: 96.8,
    avgExecutionMs: 14,
    memoryScore: 94.5,
    focusIntegrity: 100,
  };

  const totalScore = (p.codingAverage + p.writeupAverage + p.vivaAverage).toFixed(1);

  return (
    <div className="dashboard-section performance-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">Performance & Rubric Breakdown</h2>
          <p className="section-subtitle">
            Cumulative 10-Mark Academic Evaluation across all completed lab modules
          </p>
        </div>
        <div className="section-score-summary">
          <span className="score-summary-label">Cumulative GPA:</span>
          <span className="score-summary-val">{totalScore} / 10.0 M</span>
        </div>
      </div>

      <div className="performance-grid">
        {/* Rubric Breakdown Card */}
        <div className="performance-rubric-card">
          <div className="rubric-card-header">
            <Award size={15} color="var(--accent-text)" />
            <span>AICTE 10-Mark Evaluation Criteria</span>
          </div>

          <div className="rubric-bars-stack">
            {/* Coding / Performing (3M) */}
            <div className="rubric-bar-item">
              <div className="rubric-bar-label-row">
                <span className="rubric-category">1. Performing / Coding (Auto-Graded)</span>
                <span className="rubric-points">
                  <strong>{p.codingAverage}</strong> / 3.0 M
                </span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill fill-accent"
                  style={{ width: `${Math.min(100, (p.codingAverage / 3) * 100)}%` }}
                />
              </div>
              <span className="rubric-caption">
                Evaluated by test cases & algorithmic edge invariants.
              </span>
            </div>

            {/* Writing / Journal (5M) */}
            <div className="rubric-bar-item">
              <div className="rubric-bar-label-row">
                <span className="rubric-category">2. Writing / Lab Journal & Documentation</span>
                <span className="rubric-points">
                  <strong>{p.writeupAverage}</strong> / 5.0 M
                </span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill fill-success"
                  style={{ width: `${Math.min(100, (p.writeupAverage / 5) * 100)}%` }}
                />
              </div>
              <span className="rubric-caption">
                Verified by faculty: Aim, Algorithm, Pseudocode, and Complexity Analysis.
              </span>
            </div>

            {/* Viva (2M) */}
            <div className="rubric-bar-item">
              <div className="rubric-bar-label-row">
                <span className="rubric-category">3. Viva Voce Defense & Conceptual Invariants</span>
                <span className="rubric-points">
                  <strong>{p.vivaAverage}</strong> / 2.0 M
                </span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill fill-info"
                  style={{ width: `${(p.vivaAverage / 2) * 100}%` }}
                />
              </div>
              <span className="rubric-caption">
                Oral questioning by lab faculty on tree invariants, worst-case heights, and pointers.
              </span>
            </div>
          </div>
        </div>

        {/* Runtime & Sandbox Telemetry Cards */}
        <div className="performance-telemetry-cards">
          {/* Test Pass Rate */}
          <div className="telemetry-card">
            <div className="telemetry-card-top">
              <span className="telemetry-title">First-Try Pass Rate</span>
              <CheckCircle2 size={16} color="var(--success-text)" />
            </div>
            <div className="telemetry-val-row">
              <span className="telemetry-number">{p.firstPassRate}%</span>
              <span className="telemetry-badge badge-positive">+4.2% vs Batch Avg</span>
            </div>
            <p className="telemetry-desc">
              11 of 12 total test suites passed without compiler runtime errors.
            </p>
          </div>

          {/* Execution Latency */}
          <div className="telemetry-card">
            <div className="telemetry-card-top">
              <span className="telemetry-title">Avg Execution Latency</span>
              <Zap size={16} color="var(--accent-text)" />
            </div>
            <div className="telemetry-val-row">
              <span className="telemetry-number">{p.avgExecutionMs} ms</span>
              <span className="telemetry-badge badge-neutral">Top 5% speed</span>
            </div>
            <p className="telemetry-desc">
              C++20 -O3 compiler optimization ensures sub-20ms execution in Judge0.
            </p>
          </div>

          {/* Memory Footprint */}
          <div className="telemetry-card">
            <div className="telemetry-card-top">
              <span className="telemetry-title">Memory Allocation Score</span>
              <Cpu size={16} color="var(--warning-text)" />
            </div>
            <div className="telemetry-val-row">
              <span className="telemetry-number">{p.memoryScore}%</span>
              <span className="telemetry-badge badge-positive">Optimal Heap</span>
            </div>
            <p className="telemetry-desc">
              Zero memory leaks detected; dynamic structs deallocated gracefully.
            </p>
          </div>

          {/* Focus Integrity */}
          <div className="telemetry-card">
            <div className="telemetry-card-top">
              <span className="telemetry-title">Academic Integrity Index</span>
              <ShieldCheck size={16} color="var(--success-text)" />
            </div>
            <div className="telemetry-val-row">
              <span className="telemetry-number">{p.focusIntegrity}%</span>
              <span className="telemetry-badge badge-positive">Verified Clean</span>
            </div>
            <p className="telemetry-desc">
              Zero tab-blur or unfocused background events during active compilation windows.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
