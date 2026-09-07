import React from 'react';
import { Award, Zap, Cpu, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function PerformanceAnalytics({ performance }) {
  const hasData = Boolean(performance && (performance.hasData || (performance.totalSubmissions || 0) > 0));

  const p = performance || {
    codingAverage: 0.0,
    writeupAverage: 0.0,
    vivaAverage: 0.0,
    firstPassRate: 0,
    avgExecutionMs: null,
    memoryScore: null,
    focusIntegrity: 100,
    totalSubmissions: 0,
    completedSubmissions: 0,
  };

  const codingAvg = parseFloat(p.codingAverage || 0).toFixed(1);
  const writeupAvg = parseFloat(p.writeupAverage || 0).toFixed(1);
  const vivaAvg = parseFloat(p.vivaAverage || 0).toFixed(1);
  const totalScore = (parseFloat(codingAvg) + parseFloat(writeupAvg) + parseFloat(vivaAvg)).toFixed(1);

  return (
    <div className="dashboard-section performance-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">Performance &amp; Rubric Breakdown</h2>
          <p className="section-subtitle">
            AICTE 10-Mark Academic Evaluation (3M Automated Coding + 5M Faculty Journal + 2M Faculty Viva)
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
                <span className="rubric-category">1. Performing / Coding (Automated Test Suites)</span>
                <span className="rubric-points">
                  <strong>{codingAvg}</strong> / 3.0 M
                </span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill fill-accent"
                  style={{ width: `${Math.min(100, (parseFloat(codingAvg) / 3) * 100)}%` }}
                />
              </div>
              <span className="rubric-caption">
                Automated runtime evaluation: tests passed within Judge0 sandbox.
              </span>
            </div>

            {/* Writing / Journal (5M) */}
            <div className="rubric-bar-item">
              <div className="rubric-bar-label-row">
                <span className="rubric-category">2. Writing / Lab Journal (Faculty Evaluated)</span>
                <span className="rubric-points">
                  <strong>{writeupAvg}</strong> / 5.0 M
                </span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill fill-success"
                  style={{ width: `${Math.min(100, (parseFloat(writeupAvg) / 5) * 100)}%` }}
                />
              </div>
              <span className="rubric-caption">
                Evaluated by faculty: Aim, Algorithm, Pseudocode, and Complexity Analysis.
              </span>
            </div>

            {/* Viva (2M) */}
            <div className="rubric-bar-item">
              <div className="rubric-bar-label-row">
                <span className="rubric-category">3. Viva Voce Defense (Faculty Evaluated)</span>
                <span className="rubric-points">
                  <strong>{vivaAvg}</strong> / 2.0 M
                </span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill fill-info"
                  style={{ width: `${Math.min(100, (parseFloat(vivaAvg) / 2) * 100)}%` }}
                />
              </div>
              <span className="rubric-caption">
                Oral questioning by lab faculty on algorithmic invariants and complexity.
              </span>
            </div>
          </div>
        </div>

        {/* Runtime & Sandbox Telemetry Cards */}
        <div className="performance-telemetry-cards">
          {/* Test Pass Rate */}
          <div className="telemetry-card">
            <div className="telemetry-card-top">
              <span className="telemetry-title">Test Pass Rate</span>
              <CheckCircle2 size={16} color="var(--success-text)" />
            </div>
            <div className="telemetry-val-row">
              <span className="telemetry-number">{hasData ? `${p.firstPassRate}%` : '0%'}</span>
              <span className="telemetry-badge badge-neutral">
                {hasData ? `${p.completedSubmissions || 0} completed` : 'No runs yet'}
              </span>
            </div>
            <p className="telemetry-desc">
              {hasData
                ? `Percentage of submitted practical test suites passed successfully.`
                : 'Submit code in the compiler sandbox to record test pass rates.'}
            </p>
          </div>

          {/* Execution Latency */}
          <div className="telemetry-card">
            <div className="telemetry-card-top">
              <span className="telemetry-title">Execution Latency</span>
              <Zap size={16} color="var(--accent-text)" />
            </div>
            <div className="telemetry-val-row">
              <span className="telemetry-number">
                {p.avgExecutionMs !== null && p.avgExecutionMs !== undefined ? `${p.avgExecutionMs} ms` : '—'}
              </span>
              <span className="telemetry-badge badge-neutral">
                {p.avgExecutionMs !== null ? 'Live Runtime' : 'Awaiting Run'}
              </span>
            </div>
            <p className="telemetry-desc">
              Wall-clock execution time measured under Judge0 sandbox CPU limits.
            </p>
          </div>

          {/* Memory Footprint */}
          <div className="telemetry-card">
            <div className="telemetry-card-top">
              <span className="telemetry-title">Memory Allocation</span>
              <Cpu size={16} color="var(--warning-text)" />
            </div>
            <div className="telemetry-val-row">
              <span className="telemetry-number">
                {p.memoryScore !== null && p.memoryScore !== undefined ? `${p.memoryScore} KB` : '—'}
              </span>
              <span className="telemetry-badge badge-neutral">
                {p.memoryScore !== null ? 'Peak RSS' : 'Awaiting Run'}
              </span>
            </div>
            <p className="telemetry-desc">
              Peak resident set size memory utilization tracked during execution.
            </p>
          </div>

          {/* Focus Integrity */}
          <div className="telemetry-card">
            <div className="telemetry-card-top">
              <span className="telemetry-title">Academic Integrity Index</span>
              <ShieldCheck size={16} color="var(--success-text)" />
            </div>
            <div className="telemetry-val-row">
              <span className="telemetry-number">
                {hasData ? `${p.focusIntegrity}%` : '100%'}
              </span>
              <span className="telemetry-badge badge-positive">
                {p.focusIntegrity === 100 ? 'Verified Clean' : 'Audit Logged'}
              </span>
            </div>
            <p className="telemetry-desc">
              Non-punitive focus telemetry: continuous window blur event audit trail.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
