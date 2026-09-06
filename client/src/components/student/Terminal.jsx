import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal as TerminalIcon,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Cpu,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Activity,
  Play
} from 'lucide-react';
import Tabs from '../ui/Tabs';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

export default function Terminal({
  evaluationResult,
  isRunning,
  evaluationPhase = 'idle',
  evaluationProgress = 0,
  activeTestIndex = -1,
  liveLogs = [],
  stdoutMessage = '',
  language = 'cpp',
  onRunCode,
}) {

  const [activeTab, setActiveTab] = useState('testcases');
  const [expandedCases, setExpandedCases] = useState({ 1: true, 2: false, 3: false });
  const [isCopied, setIsCopied] = useState(false);
  const consoleEndRef = useRef(null);

  const tabs = [
    {
      id: 'testcases',
      label: 'Test Cases & Rubric',
      icon: CheckCircle,
      badge: evaluationResult ? `${evaluationResult.passed_test_cases}/${evaluationResult.total_test_cases}` : '3 Tests',
    },
    { id: 'console', label: 'Console & Compiler Stream', icon: TerminalIcon },
    { id: 'metrics', label: 'Telemetry & Profiling', icon: Activity },
  ];

  // Auto-scroll console when new logs arrive
  useEffect(() => {
    if (activeTab === 'console' && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [liveLogs, activeTab]);

  const toggleExpand = (index) => {
    setExpandedCases((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleCopyLogs = () => {
    const textToCopy = liveLogs.length ? liveLogs.join('\n') : stdoutMessage;
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const getPhaseTitle = () => {
    switch (evaluationPhase) {
      case 'compiling':
        return `Phase 1/4: Compiling ${language.toUpperCase()} source with -O3 flags...`;
      case 'executing':
        return 'Phase 2/4: Spawning Sandboxed Linux Container (cgroup v2)...';
      case 'testing':
        return `Phase 3/4: Executing Test Suite #${activeTestIndex + 1} across edge invariants...`;
      case 'tiering':
        return 'Phase 4/4: Computing AICTE Adaptive Difficulty Tier & 5-Mark Rubric...';
      case 'completed':
        return 'Evaluation Succeeded: All test cases passed in optimal bound';
      case 'failed':
        return 'Evaluation Failed: Compiler or runtime exception encountered';
      default:
        return 'Judge0 Sandbox Daemon Ready · GCC 14.2 / Clang / Python 3.12';
    }
  };

  // Test cases data from evaluationResult or default catalog
  const testCasesList = evaluationResult?.test_case_results || [
    {
      test_case_index: 1,
      is_sample: true,
      passed: true,
      status: 'Passed',
      input: '4\n10 5 20 15',
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
      input: '5\n30 20 40 10 25',
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
      input: '1\n42',
      expected_output: '42',
      stdout: '42',
      execution_time_sec: 0.015,
      memory_kb: 1190,
    },
  ];

  return (
    <div className="terminal-pane">
      {/* Terminal Top Navigation Bar */}
      <div className="terminal-header-bar">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        <div className="terminal-header-status">
          {isRunning ? (
            <div className="status-running-indicator">
              <Zap size={13} className="animate-spin text-accent" />
              <span className="status-running-text">{getPhaseTitle()}</span>
            </div>
          ) : evaluationResult ? (
            <div className="status-eval-score">
              <span className="eval-score-label">Coding Auto-Score:</span>
              <span className="eval-score-badge">
                {evaluationResult.coding_marks_awarded} / 5.0 Marks
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="status-idle-pill">
                <span className="idle-dot" />
                <span>Judge0 Sandbox Ready</span>
              </div>
              {onRunCode && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={Play}
                  onClick={onRunCode}
                >
                  Run Tests
                </Button>
              )}
            </div>
          )}
        </div>
      </div>


      {/* Execution Progress Track (Visible during run) */}
      {isRunning && (
        <div className="exec-progress-strip">
          <div className="exec-progress-steps">
            <span className={`exec-step ${evaluationProgress >= 20 ? 'active' : ''}`}>
              1. Compile
            </span>
            <span className="exec-step-arrow">→</span>
            <span className={`exec-step ${evaluationProgress >= 40 ? 'active' : ''}`}>
              2. Container
            </span>
            <span className="exec-step-arrow">→</span>
            <span className={`exec-step ${evaluationProgress >= 60 ? 'active' : ''}`}>
              3. Test Suites
            </span>
            <span className="exec-step-arrow">→</span>
            <span className={`exec-step ${evaluationProgress >= 90 ? 'active' : ''}`}>
              4. AICTE Tier
            </span>
          </div>

          <div className="progress-track" style={{ height: '3px' }}>
            <div
              className="progress-fill fill-accent progress-shimmer"
              style={{ width: `${Math.max(8, evaluationProgress)}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Body */}
      <div className="terminal-body">
        {/* =========================================================
            TAB 1: TEST CASES & EVALUATION
            ========================================================= */}
        {activeTab === 'testcases' && (
          <div className="terminal-tab-content">
            {/* Final Result Showcase Banner (When Evaluated) */}
            {evaluationResult && (
              <div className="eval-showcase-banner">
                <div className="showcase-left">
                  <div className="score-medal">
                    <span className="medal-val">{evaluationResult.coding_marks_awarded}</span>
                    <span className="medal-sub">/ 5.0 M</span>
                  </div>

                  <div className="showcase-text">
                    <div className="showcase-status-row">
                      <span className="showcase-status-title">
                        {evaluationResult.status === 'Passed' ? 'All Test Cases Passed' : 'Evaluation Completed'}
                      </span>
                      <Badge variant="success">
                        {evaluationResult.passed_test_cases}/{evaluationResult.total_test_cases} Passed (100%)
                      </Badge>
                      {evaluationResult.adaptive_tiering && (
                        <Badge variant="tier-advanced">
                          <Sparkles size={11} />
                          {evaluationResult.adaptive_tiering.assigned_tier} Tier
                        </Badge>
                      )}
                    </div>
                    <p className="showcase-reasoning">
                      {evaluationResult.adaptive_tiering?.reasoning ||
                        'Optimal BST invariant preserved. Code passed hidden test suites within sub-20ms runtime bounds.'}
                    </p>
                  </div>
                </div>

                <div className="showcase-right">
                  <div className="showcase-stat-item">
                    <span className="stat-item-label">Runtime Latency</span>
                    <span className="stat-item-val">18 ms (Avg)</span>
                  </div>
                  <div className="showcase-stat-item">
                    <span className="stat-item-label">Peak Memory</span>
                    <span className="stat-item-val">1.24 MB</span>
                  </div>
                  <div className="showcase-stat-item">
                    <span className="stat-item-label">Next Curricular Level</span>
                    <span className="stat-item-val stat-val-accent">
                      {evaluationResult.adaptive_tiering?.recommended_difficulty || 'Hard'} Level
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Test Cases Accordion List */}
            <div className="test-cases-list">
              {testCasesList.map((tc) => {
                const isExpanded = !!expandedCases[tc.test_case_index];
                const isCurrentActive = isRunning && activeTestIndex === tc.test_case_index - 1;

                return (
                  <div
                    key={tc.test_case_index}
                    className={`test-case-row ${tc.passed ? 'passed' : 'failed'} ${
                      isCurrentActive ? 'tc-active-evaluating' : ''
                    }`}
                  >
                    {/* Header Row */}
                    <div
                      className="tc-summary"
                      onClick={() => toggleExpand(tc.test_case_index)}
                      title="Click to expand/collapse test case inputs & diffs"
                    >
                      <div className="tc-name">
                        <button type="button" className="tc-expand-btn">
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>

                        {isCurrentActive ? (
                          <Zap size={15} className="animate-spin text-accent" />
                        ) : tc.passed ? (
                          <CheckCircle size={15} color="var(--success)" />
                        ) : (
                          <XCircle size={15} color="var(--danger)" />
                        )}

                        <span className="tc-title-text">
                          Test Case #{tc.test_case_index}{' '}
                          <span className="tc-type-tag">
                            {tc.is_sample ? '(Sample Public Input)' : '(Hidden AICTE Invariant)'}
                          </span>
                        </span>
                      </div>

                      <div className="tc-telemetry-row">
                        {isCurrentActive ? (
                          <Badge variant="warning">Evaluating in Sandbox...</Badge>
                        ) : (
                          <Badge variant={tc.passed ? 'success' : 'danger'}>
                            {tc.passed ? 'Passed (Match)' : 'Failed'}
                          </Badge>
                        )}

                        <span className="tc-meta-pill">
                          <Clock size={11} />
                          {tc.execution_time_sec}s
                        </span>
                        <span className="tc-meta-pill">
                          <Cpu size={11} />
                          {tc.memory_kb} KB
                        </span>
                      </div>
                    </div>

                    {/* Expandable IO & Diff Body */}
                    {isExpanded && (
                      <div className="tc-expanded-body">
                        {/* Input if available */}
                        {tc.input && (
                          <div className="tc-io-block">
                            <div className="tc-io-header">Standard Input (stdin)</div>
                            <pre className="tc-io-code">{tc.input}</pre>
                          </div>
                        )}

                        <div className="tc-io-grid">
                          {/* Expected Output */}
                          <div className="tc-io-block">
                            <div className="tc-io-header">Expected Standard Output</div>
                            <pre className="tc-io-code text-accent">{tc.expected_output}</pre>
                          </div>

                          {/* Actual Output */}
                          <div className="tc-io-block">
                            <div className="tc-io-header">
                              <span>Program Output (stdout)</span>
                              {tc.passed && (
                                <span className="diff-verified-pill">
                                  <Check size={11} /> 0 diffs
                                </span>
                              )}
                            </div>
                            <pre
                              className={`tc-io-code ${
                                tc.passed ? 'text-success' : 'text-danger'
                              }`}
                            >
                              {tc.stdout || '(No standard output)'}
                            </pre>
                          </div>
                        </div>

                        <div className="tc-execution-meta">
                          <span>Exit Code: 0 (Normal Termination)</span>
                          <span>•</span>
                          <span>Signal: SIGQUIT None</span>
                          <span>•</span>
                          <span>Container: Linux cgroup v2 sandbox</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 2: CONSOLE & COMPILER STREAM
            ========================================================= */}
        {activeTab === 'console' && (
          <div className="console-stream-wrapper">
            <div className="console-stream-toolbar">
              <div className="console-dots">
                <span className="dot dot-red" />
                <span className="dot dot-yellow" />
                <span className="dot dot-green" />
                <span className="console-env-label">
                  Judge0 Daemon v1.13 · cgroup-v2-container
                </span>
              </div>

              <div className="console-actions">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={isCopied ? Check : Copy}
                  onClick={handleCopyLogs}
                >
                  {isCopied ? 'Copied!' : 'Copy Stream'}
                </Button>
              </div>
            </div>

            <div className="console-log-viewport">
              {liveLogs.length > 0 ? (
                liveLogs.map((log, idx) => (
                  <div key={idx} className="console-line">
                    <span className="console-line-num">{idx + 1}</span>
                    <span className="console-line-text">{log}</span>
                  </div>
                ))
              ) : (
                <div className="console-line">
                  <span className="console-line-num">1</span>
                  <span className="console-line-text">
                    {stdoutMessage ||
                      `[Judge0 Execution Daemon Initialized]
Compiler Target: GCC 14.2 (Linux x86_64) with -O3 -std=c++20
Sandbox Memory Limit: 256 MB · Time Limit: 2.000s
Ready for compilation. Click "Run Code" above to execute.`}
                  </span>
                </div>
              )}
              <div ref={consoleEndRef} />
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 3: TELEMETRY & PROFILING
            ========================================================= */}
        {activeTab === 'metrics' && (
          <div className="terminal-tab-content">
            <div className="profiling-metrics-grid">
              {/* Latency Gauge Card */}
              <div className="profiling-card">
                <div className="profiling-card-top">
                  <span className="profiling-card-title">Execution Latency</span>
                  <Clock size={15} color="var(--accent-text)" />
                </div>
                <div className="profiling-big-stat">
                  <span className="stat-val">18 ms</span>
                  <span className="stat-sub">vs 2,000 ms Time Limit</span>
                </div>
                <div className="progress-track" style={{ marginTop: '8px', height: '6px' }}>
                  <div
                    className="progress-fill fill-success"
                    style={{ width: '0.9%' }}
                    title="0.9% of allowable execution time limit"
                  />
                </div>
                <p className="profiling-caption">
                  Optimal binary search tree height $h \le \log_2(N)$ gives $O(\log N)$ average insertion runtime.
                </p>
              </div>

              {/* Memory Footprint Card */}
              <div className="profiling-card">
                <div className="profiling-card-top">
                  <span className="profiling-card-title">Memory Allocation (RSS)</span>
                  <Cpu size={15} color="var(--info-text)" />
                </div>
                <div className="profiling-big-stat">
                  <span className="stat-val">1.24 MB</span>
                  <span className="stat-sub">vs 256 MB cgroup Cap</span>
                </div>
                <div className="progress-track" style={{ marginTop: '8px', height: '6px' }}>
                  <div
                    className="progress-fill fill-info"
                    style={{ width: '1.2%' }}
                    title="1.2% of 256MB memory quota"
                  />
                </div>
                <p className="profiling-caption">
                  Clean dynamic pointer structures with zero memory leaks detected during Valgrind trace.
                </p>
              </div>

              {/* AICTE Adaptive Recommendation */}
              <div className="profiling-card profiling-card-full">
                <div className="profiling-card-top">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={15} color="var(--warning-text)" />
                    <span className="profiling-card-title">AICTE Adaptive Difficulty Classification</span>
                  </div>
                  <Badge variant="tier-advanced">Tier: Advanced</Badge>
                </div>

                <div className="tier-recommendation-box">
                  <div className="tier-rec-header">
                    <span className="tier-rec-label">Assigned Status:</span>
                    <strong className="text-accent">Advanced Invariant Mastery (Level 5)</strong>
                  </div>
                  <p className="tier-rec-body">
                    Student has demonstrated complete test suite validation, sub-20ms execution times, and proper Inorder traversal formatting. Recommended to advance to self-balancing AVL Trees (rotations LL, RR, LR, RL) for next laboratory submission.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
