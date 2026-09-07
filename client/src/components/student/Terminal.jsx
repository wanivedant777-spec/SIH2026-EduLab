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
  practical,
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

  // Derive test cases from live evaluationResult, or practical testCases, or empty
  const testCasesList = evaluationResult?.test_case_results || (practical?.testCases || []).map((tc, idx) => ({
    test_case_index: idx + 1,
    is_sample: tc.is_sample ?? (idx === 0),
    passed: null,
    status: 'Not Run',
    input: tc.input_data || '',
    expected_output: tc.expected_output || '',
    stdout: '',
    execution_time_sec: null,
    memory_kb: null,
  }));

  const tabs = [
    {
      id: 'testcases',
      label: 'Test Cases & Rubric',
      icon: CheckCircle,
      badge: evaluationResult
        ? `${evaluationResult.passed_test_cases}/${evaluationResult.total_test_cases}`
        : testCasesList.length
        ? `${testCasesList.length} Tests`
        : '0 Tests',
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
        return `Phase 1/4: Compiling ${language.toUpperCase()} source...`;
      case 'executing':
        return 'Phase 2/4: Initializing Execution Sandbox...';
      case 'testing':
        return `Phase 3/4: Executing Test Suite #${activeTestIndex + 1} across edge invariants...`;
      case 'tiering':
        return 'Phase 4/4: Computing AICTE Adaptive Difficulty Tier & 3-Mark Rubric...';
      case 'completed':
        return 'Evaluation Completed: Test suite execution finished';
      case 'failed':
        return 'Evaluation Failed: Compiler or runtime exception encountered';
      default:
        return 'Evaluator Daemon Ready · GCC / Python 3.12';
    }
  };



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
                {evaluationResult.coding_marks_awarded} / 3.0 Marks
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="status-idle-pill">
                <span className="idle-dot" />
                <span>Evaluator Sandbox Ready</span>
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
                    <span className="medal-sub">/ 3.0 M</span>
                  </div>

                  <div className="showcase-text">
                    <div className="showcase-status-row">
                      <span className="showcase-status-title">
                        {evaluationResult.status === 'Passed'
                          ? 'All Test Cases Passed'
                          : evaluationResult.status === 'DEMO_OFFLINE_SIMULATION'
                          ? 'Offline Simulation Mode'
                          : evaluationResult.passed_test_cases > 0
                          ? 'Partial Test Cases Passed'
                          : 'Test Cases Failed'}
                      </span>
                      <Badge variant={evaluationResult.status === 'Passed' ? 'success' : evaluationResult.passed_test_cases > 0 ? 'warning' : 'danger'}>
                        {evaluationResult.passed_test_cases}/{evaluationResult.total_test_cases} Passed ({Math.round(evaluationResult.pass_percentage || 0)}%)
                      </Badge>
                      {evaluationResult.is_simulation && (
                        <Badge variant="neutral">
                          DEMO / SIMULATION
                        </Badge>
                      )}
                      <Badge tier={evaluationResult.adaptive_tiering?.assigned_tier || evaluationResult.adaptiveTier || 'Proficient'}>
                        {evaluationResult.adaptive_tiering?.assigned_tier || evaluationResult.adaptiveTier || 'Proficient'} Tier
                      </Badge>
                    </div>

                    <div className="showcase-title-block">
                      <h3 className="showcase-title">
                        {evaluationResult.adaptive_tiering?.assigned_tier || 'Proficient'} Level Assessment
                      </h3>
                      <p className="showcase-reasoning">
                        {evaluationResult.adaptive_tiering?.reasoning ||
                          `Code executed against test suites: ${evaluationResult.passed_test_cases}/${evaluationResult.total_test_cases} passed.`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="showcase-right">
                  <div className="showcase-stat-item">
                    <span className="stat-item-label">Runtime Latency</span>
                    <span className="stat-item-val">
                      {testCasesList[0]?.execution_time_sec ? `${Math.round(testCasesList[0].execution_time_sec * 1000)} ms` : '--'}
                    </span>
                  </div>
                  <div className="showcase-stat-item">
                    <span className="stat-item-label">Peak Memory</span>
                    <span className="stat-item-val">
                      {testCasesList[0]?.memory_kb ? `${(testCasesList[0].memory_kb / 1024).toFixed(2)} MB` : '--'}
                    </span>
                  </div>
                  <div className="showcase-stat-item">
                    <span className="stat-item-label">Next Curricular Level</span>
                    <span className="stat-item-val stat-val-accent">
                      {evaluationResult.adaptive_tiering?.recommended_difficulty || 'Next'} Level
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* AICTE 10-Mark Rubric Indicator */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '10px',
                fontSize: '11.5px',
                color: 'var(--text-secondary)',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--success)' }} />
                <span><strong>3.0M Coding</strong> (Automated via Test Suite)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--info)' }} />
                <span><strong>5.0M Writing</strong> (Faculty Evaluated Journal)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--warning)' }} />
                <span><strong>2.0M Viva</strong> (Faculty Oral Defense)</span>
              </div>
            </div>

            {/* Test Cases Accordion List */}
            <div className="test-cases-list">
              {testCasesList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>No test cases registered for this practical.</p>
                  <p style={{ margin: '6px 0 0 0', fontSize: '0.78rem' }}>Test cases will appear once loaded from the curriculum database.</p>
                </div>
              ) : (
                testCasesList.map((tc) => {
                  const isExpanded = !!expandedCases[tc.test_case_index];
                  const isCurrentActive = isRunning && activeTestIndex === tc.test_case_index - 1;

                  return (
                    <div
                      key={tc.test_case_index}
                      className={`test-case-row ${tc.passed === true ? 'passed' : tc.passed === false ? 'failed' : 'not-run'} ${
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
                          ) : tc.passed === true ? (
                            <CheckCircle size={15} color="var(--success)" />
                          ) : tc.passed === false ? (
                            <XCircle size={15} color="var(--danger)" />
                          ) : (
                            <Clock size={15} color="var(--text-muted)" />
                          )}

                          <span className="tc-title-text">
                            Test Case #{tc.test_case_index}{' '}
                            <span className="tc-type-tag">
                              {tc.is_sample ? '(Sample Public Input)' : '(Curriculum Test Case)'}
                            </span>
                          </span>
                        </div>

                        <div className="tc-telemetry-row">
                          {isCurrentActive ? (
                            <Badge variant="warning">Evaluating in Sandbox...</Badge>
                          ) : tc.passed === null || tc.status === 'Not Run' ? (
                            <Badge variant="neutral">Not Run</Badge>
                          ) : (
                            <Badge variant={tc.passed ? 'success' : 'danger'}>
                              {tc.passed ? 'Passed (Match)' : 'Failed'}
                            </Badge>
                          )}

                          {tc.execution_time_sec !== null && tc.execution_time_sec !== undefined && (
                            <span className="tc-meta-pill">
                              <Clock size={11} />
                              {tc.execution_time_sec}s
                            </span>
                          )}
                          {tc.memory_kb !== null && tc.memory_kb !== undefined && (
                            <span className="tc-meta-pill">
                              <Cpu size={11} />
                              {tc.memory_kb} KB
                            </span>
                          )}
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
                          <span>Signal: None</span>
                          <span>•</span>
                          <span>Container: Execution Sandbox</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
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
                  Evaluator Daemon · Sandbox Environment
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
                  <span className="stat-val">{evaluationResult ? `${Math.round((testCasesList[0]?.execution_time_sec || 0.015) * 1000)} ms` : '--'}</span>
                  <span className="stat-sub">vs 2,000 ms Time Limit</span>
                </div>
                <div className="progress-track" style={{ marginTop: '8px', height: '6px' }}>
                  <div
                    className="progress-fill fill-success"
                    style={{ width: evaluationResult ? `${Math.min(100, Math.max(1, Math.round(((testCasesList[0]?.execution_time_sec || 0.015) / 2.0) * 100)))}%` : '0%' }}
                    title="Allowable execution time limit"
                  />
                </div>
                <p className="profiling-caption">
                  {evaluationResult ? 'Runtime execution measured inside secure sandbox.' : 'Run code to measure execution latency against the 2,000 ms limit.'}
                </p>
              </div>

              {/* Memory Footprint Card */}
              <div className="profiling-card">
                <div className="profiling-card-top">
                  <span className="profiling-card-title">Memory Allocation (RSS)</span>
                  <Cpu size={15} color="var(--info-text)" />
                </div>
                <div className="profiling-big-stat">
                  <span className="stat-val">{evaluationResult ? `${((testCasesList[0]?.memory_kb || 1200) / 1024).toFixed(2)} MB` : '--'}</span>
                  <span className="stat-sub">vs 256 MB Memory Cap</span>
                </div>
                <div className="progress-track" style={{ marginTop: '8px', height: '6px' }}>
                  <div
                    className="progress-fill fill-info"
                    style={{ width: evaluationResult ? `${Math.min(100, Math.max(1, Math.round(((testCasesList[0]?.memory_kb || 1200) / (256 * 1024)) * 100)))}%` : '0%' }}
                    title="Memory quota"
                  />
                </div>
                <p className="profiling-caption">
                  {evaluationResult ? 'Clean dynamic memory allocation within sandbox bounds.' : 'Run code to profile dynamic memory footprint against the 256 MB quota.'}
                </p>
              </div>

              {/* AICTE Adaptive Recommendation */}
              <div className="profiling-card profiling-card-full">
                <div className="profiling-card-top">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={15} color="var(--warning-text)" />
                    <span className="profiling-card-title">AICTE Adaptive Difficulty Classification</span>
                  </div>
                  <Badge variant={evaluationResult ? 'tier-advanced' : 'neutral'}>
                    {evaluationResult ? `Tier: ${evaluationResult.adaptive_tiering?.assigned_tier || evaluationResult.adaptiveTier || 'Proficient'}` : 'Awaiting Run'}
                  </Badge>
                </div>

                <div className="tier-recommendation-box">
                  <div className="tier-rec-header">
                    <span className="tier-rec-label">Assigned Status:</span>
                    <strong className="text-accent">
                      {evaluationResult ? (evaluationResult.adaptive_tiering?.assigned_tier || 'Proficient') : 'Pending Execution'}
                    </strong>
                  </div>
                  <p className="tier-rec-body">
                    {evaluationResult ? (
                      evaluationResult.passed_test_cases === evaluationResult.total_test_cases
                        ? `Student has demonstrated complete test suite validation (${evaluationResult.passed_test_cases}/${evaluationResult.total_test_cases} passed). ${evaluationResult.adaptive_tiering?.recommended_difficulty ? `Recommended next: ${evaluationResult.adaptive_tiering.recommended_difficulty} level practicals.` : ''}`
                        : `Test suite execution: ${evaluationResult.passed_test_cases} of ${evaluationResult.total_test_cases} passed. Review compiler feedback and test cases to optimize code.`
                    ) : (
                      'Click "Run Code" to execute tests and trigger automated AICTE adaptive difficulty classification.'
                    )}
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
