import React, { useState } from 'react';
import { Terminal as TerminalIcon, CheckCircle, XCircle, Clock, Zap, Cpu, Sparkles } from 'lucide-react';

export default function Terminal({ evaluationResult, isRunning, stdoutMessage }) {
  const [activeTab, setActiveTab] = useState('testcases');

  return (
    <div className="terminal-panel">
      {/* Header Tabs */}
      <div className="terminal-header">
        <div className="terminal-tabs">
          <button
            className={`term-tab ${activeTab === 'testcases' ? 'active' : ''}`}
            onClick={() => setActiveTab('testcases')}
          >
            <CheckCircle size={14} color="#10b981" />
            Test Cases & Evaluation
          </button>
          <button
            className={`term-tab ${activeTab === 'console' ? 'active' : ''}`}
            onClick={() => setActiveTab('console')}
          >
            <TerminalIcon size={14} color="#818cf8" />
            Console Output
          </button>
        </div>

        {evaluationResult && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Auto-Graded Coding Score:</span>
            <span style={{ color: '#10b981', fontWeight: 700 }}>
              {evaluationResult.coding_marks_awarded} / {evaluationResult.total_possible_marks} Marks
            </span>
          </div>
        )}
      </div>

      {/* Body Content */}
      <div className="terminal-body">
        {isRunning && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '20px 0', color: '#818cf8' }}>
            <Zap size={18} className="animate-spin" />
            <span>Structuring Judge0 payload & compiling sandbox execution...</span>
          </div>
        )}

        {!isRunning && activeTab === 'testcases' && (
          <div>
            {/* Adaptive Tiering Banner */}
            {evaluationResult?.adaptive_tiering && (
              <div className="eval-result-banner">
                <div className="eval-banner-left">
                  <div className="score-circle">
                    {evaluationResult.coding_marks_awarded}
                    <small>/5.0</small>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, color: '#fff' }}>
                        Submission Result: {evaluationResult.status} ({evaluationResult.passed_test_cases}/{evaluationResult.total_test_cases} Passed)
                      </span>
                      <span className={`tier-tag tier-${evaluationResult.adaptive_tiering.assigned_tier.toLowerCase()}`}>
                        <Sparkles size={11} />
                        Tier: {evaluationResult.adaptive_tiering.assigned_tier}
                      </span>
                    </div>
                    <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      {evaluationResult.adaptive_tiering.reasoning}
                    </p>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Next Challenge
                  </span>
                  <div style={{ fontWeight: 600, color: '#f59e0b', fontSize: '12px' }}>
                    {evaluationResult.adaptive_tiering.recommended_difficulty} Level
                  </div>
                </div>
              </div>
            )}

            {/* Test Case List */}
            <div className="test-cases-grid">
              {(evaluationResult?.test_case_results || [
                {
                  test_case_index: 1,
                  is_sample: true,
                  passed: true,
                  status: 'Passed',
                  expected_output: '5 10 15 20',
                  stdout: '5 10 15 20',
                  execution_time_sec: 0.018,
                  memory_kb: 1240,
                },
                {
                  test_case_index: 2,
                  is_sample: false,
                  passed: true,
                  status: 'Passed',
                  expected_output: '10 20 25 30 40',
                  stdout: '10 20 25 30 40',
                  execution_time_sec: 0.021,
                  memory_kb: 1280,
                },
                {
                  test_case_index: 3,
                  is_sample: false,
                  passed: true,
                  status: 'Passed',
                  expected_output: '42',
                  stdout: '42',
                  execution_time_sec: 0.015,
                  memory_kb: 1190,
                },
              ]).map((tc) => (
                <div
                  key={tc.test_case_index}
                  className={`test-case-item ${tc.passed ? 'passed' : 'failed'}`}
                >
                  <div className="tc-header">
                    <div className="tc-title">
                      {tc.passed ? (
                        <CheckCircle size={14} color="#10b981" />
                      ) : (
                        <XCircle size={14} color="#ef4444" />
                      )}
                      Test Case #{tc.test_case_index} {tc.is_sample && '(Sample)'}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={tc.passed ? 'badge-passed' : 'badge-failed'}>
                        {tc.status}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Clock size={10} />
                        {tc.execution_time_sec}s
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Cpu size={10} />
                        {tc.memory_kb} KB
                      </span>
                    </div>
                  </div>

                  <div className="tc-details">
                    <div className="tc-box">
                      <div className="tc-box-label">Expected Output</div>
                      <code style={{ color: '#93c5fd' }}>{tc.expected_output}</code>
                    </div>
                    <div className="tc-box">
                      <div className="tc-box-label">Program Output</div>
                      <code style={{ color: tc.passed ? '#86efac' : '#fca5a5' }}>
                        {tc.stdout || '(No Output)'}
                      </code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isRunning && activeTab === 'console' && (
          <div className="terminal-stdout">
            {stdoutMessage ||
              `[Judge0 Execution Daemon Ready]
Environment: Sandboxed Linux Container (cgroup v2)
Compilation Flag: -O3 -std=c++20
Click "Run Code" above to execute and evaluate test cases.`}
          </div>
        )}
      </div>
    </div>
  );
}
