import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Cpu,
  RotateCcw,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Terminal as TerminalIcon,
  BookOpen,
  Code2,
  FileCode,
  Check,
  Copy,
  Lightbulb,
  Award,
  Lock,
  Sparkles,
  AlertTriangle,
  HelpCircle,
  Layers,
  CheckCircle,
} from 'lucide-react';
import CodeEditor from './CodeEditor';
import Hero3DObject from './Hero3DObject';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

export default function StudentWorkspace({
  practical,
  language = 'cpp',
  onLanguageChange,
  code = '',
  onCodeChange,
  onResetCode,
  isRunning = false,
  evaluationPhase = 'idle',
  evaluationProgress = 0,
  activeTestIndex = -1,
  liveLogs = [],
  evaluationResult = null,
  stdoutMessage = '',
  isAutoSaving = false,
  onRunCode,
  onSubmitPractical,
  isSubmitted = false,
  onNavigate,
  _currentUser,
  _onSelectPractical,
}) {
  // Panel Visibility States
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [terminalOpen, setTerminalOpen] = useState(false); // Collapsed/compact by default
  const [activeInspectorTab, setActiveInspectorTab] = useState('tests'); // 'tests' | 'vis' | 'hints' | 'eval'
  const [mobileActivePane, setMobileActivePane] = useState('editor'); // 'practical' | 'editor' | 'inspector' | 'terminal'

  // Expanded states for test cases
  const [expandedTestCases, setExpandedTestCases] = useState({ 1: true });
  const [copiedConsole, setCopiedConsole] = useState(false);
  const [copiedSample, setCopiedSample] = useState(false);
  const consoleBottomRef = useRef(null);

  // Auto-expand terminal on execution (React recommended pattern for state adjustment from prop)
  const [prevRunning, setPrevRunning] = useState(isRunning);
  if (isRunning && !prevRunning) {
    setPrevRunning(true);
    setTerminalOpen(true);
    setActiveInspectorTab('tests');
  } else if (!isRunning && prevRunning) {
    setPrevRunning(false);
  }

  // Scroll console to bottom on new logs
  useEffect(() => {
    if (terminalOpen && consoleBottomRef.current) {
      consoleBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [liveLogs, terminalOpen]);

  // Derive test cases list from live evaluation result or practical testCases
  const rawTestCases = evaluationResult?.test_case_results || (practical?.testCases || []).map((tc, idx) => ({
    test_case_index: idx + 1,
    is_sample: tc.is_sample ?? (idx === 0),
    is_parameterized: tc.is_parameterized || (!tc.is_sample && idx > 0),
    passed: null,
    status: 'Not Run',
    input: tc.input_data || '',
    expected_output: tc.expected_output || '',
    stdout: '',
    execution_time_sec: null,
    memory_kb: null,
  }));

  // Separate sample tests from hidden parameterized tests
  const sampleTests = rawTestCases.filter((tc) => tc.is_sample || tc.test_case_index === 1);
  const hiddenTests = rawTestCases.filter((tc) => !tc.is_sample && tc.test_case_index !== 1);

  const toggleTestCaseExpand = (index) => {
    setExpandedTestCases((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleCopyConsole = () => {
    const text = liveLogs.length > 0 ? liveLogs.join('\n') : stdoutMessage || 'No console output.';
    navigator.clipboard.writeText(text);
    setCopiedConsole(true);
    setTimeout(() => setCopiedConsole(false), 2000);
  };

  const handleCopySampleInput = (input) => {
    navigator.clipboard.writeText(input);
    setCopiedSample(true);
    setTimeout(() => setCopiedSample(false), 2000);
  };

  // Safe status determination for tests
  const getTestStatusBadge = (tc) => {
    const isCurrentActive = isRunning && activeTestIndex === tc.test_case_index - 1;
    if (isCurrentActive) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--warning-text)', fontSize: '11px', fontWeight: 600 }}>
          <Zap size={12} className="animate-spin" /> Running...
        </span>
      );
    }
    if (tc.passed === true) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--success-text)', fontSize: '11px', fontWeight: 600 }}>
          <CheckCircle2 size={13} color="var(--success)" /> Passed
        </span>
      );
    }
    if (tc.passed === false) {
      if (evaluationResult?.status === 'Compilation Error') {
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--danger-text)', fontSize: '11px', fontWeight: 600 }}>
            <AlertTriangle size={13} color="var(--danger)" /> Compilation Error
          </span>
        );
      }
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--danger-text)', fontSize: '11px', fontWeight: 600 }}>
          <XCircle size={13} color="var(--danger)" /> Failed
        </span>
      );
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '11px' }}>
        <Clock size={12} /> Not Run
      </span>
    );
  };

  return (
    <div className="codelab-root">
      {/* 1. TOP BAR — Practical Context, Language, Status, Run, Submit */}
      <header className="codelab-topbar">
        {/* Left: Breadcrumb & Practical Title */}
        <div className="codelab-topbar-left">
          <nav className="codelab-breadcrumbs" aria-label="Breadcrumb">
            <span
              className="codelab-breadcrumb-crumb"
              onClick={() => onNavigate && onNavigate('practicals')}
              title="Return to Curriculum Catalog"
            >
              Curriculum
            </span>
            <span className="codelab-breadcrumb-sep">/</span>
            <span className="codelab-breadcrumb-crumb">
              {practical?.courseCode?.split(':')[0] || 'CS201P'}
            </span>
            <span className="codelab-breadcrumb-sep">/</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
              Practical {practical?.practicalNumber || '04'}
            </span>
          </nav>

          <span style={{ color: 'var(--border-strong)' }}>|</span>

          <h1 className="codelab-practical-title" title={practical?.title || 'Data Structures Lab'}>
            {practical?.title || 'Binary Search Tree Operations'}
          </h1>

          {practical?.difficulty && (
            <Badge variant={practical.difficulty === 'Hard' ? 'danger' : practical.difficulty === 'Medium' ? 'warning' : 'success'} size="sm">
              {practical.difficulty}
            </Badge>
          )}
        </div>

        {/* Center: Language Selector & Auto-save Status */}
        <div className="codelab-topbar-center">
          <select
            value={language}
            onChange={(e) => onLanguageChange && onLanguageChange(e.target.value)}
            className="codelab-lang-select"
            aria-label="Programming Language Selector"
          >
            <option value="cpp">C++20 (GCC 14)</option>
            <option value="c">C17 (GCC 14)</option>
            <option value="python">Python 3.12</option>
            <option value="java">Java 21</option>
          </select>

          <div
            className="codelab-save-badge"
            title={isAutoSaving ? 'Auto-saving source buffer...' : 'Continuous Auto-save Active (Local & Server Sync)'}
          >
            <ShieldCheck size={13} color="var(--success)" />
            <span>{isAutoSaving ? 'Saving...' : 'Auto-saved'}</span>
          </div>
        </div>

        {/* Right: Actions Hierarchy (Run Code = Primary, Submit = Secondary) */}
        <div className="codelab-topbar-right">
          {/* Starter Reset Button */}
          <Button
            variant="ghost"
            size="sm"
            icon={RotateCcw}
            onClick={onResetCode}
            title="Reset editor buffer to laboratory starter template"
          >
            Reset
          </Button>

          {/* Primary Action: Run Code */}
          <Button
            variant="primary"
            size="sm"
            icon={isRunning ? Zap : Play}
            onClick={onRunCode}
            disabled={isRunning}
            className="codelab-btn-run"
            title="Execute test suite against Judge0 execution sandbox"
          >
            <span>{isRunning ? 'Running...' : 'Run Code'}</span>
          </Button>

          {/* Secondary Action: Submit for Evaluation */}
          <Button
            variant="outline"
            size="sm"
            icon={isSubmitted ? CheckCircle : Send}
            onClick={onSubmitPractical}
            disabled={isRunning || isSubmitted}
            className={`codelab-btn-submit ${isSubmitted ? 'submitted' : ''}`}
            title={isSubmitted ? 'Laboratory practical submitted' : 'Submit evaluated solution to faculty gradebook'}
          >
            <span>{isSubmitted ? 'Submitted' : 'Submit for Evaluation'}</span>
          </Button>

          {/* Panel Visibility Toggles */}
          <div className="codelab-panel-toggles" aria-label="Toggle workspace panels">
            <button
              type="button"
              className={`codelab-panel-toggle-btn ${leftPanelOpen ? 'active' : ''}`}
              onClick={() => setLeftPanelOpen((prev) => !prev)}
              title="Toggle Problem Specification panel (Left)"
            >
              <BookOpen size={14} />
            </button>
            <button
              type="button"
              className={`codelab-panel-toggle-btn ${terminalOpen ? 'active' : ''}`}
              onClick={() => setTerminalOpen((prev) => !prev)}
              title="Toggle Terminal / Console panel (Bottom)"
            >
              <TerminalIcon size={14} />
            </button>
            <button
              type="button"
              className={`codelab-panel-toggle-btn ${rightPanelOpen ? 'active' : ''}`}
              onClick={() => setRightPanelOpen((prev) => !prev)}
              title="Toggle Inspector Tabs panel (Right)"
            >
              <Layers size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Tab Switcher Strip (Visible on small screens <768px) */}
      <div className="codelab-mobile-nav">
        <button
          type="button"
          className={`codelab-mobile-nav-btn ${mobileActivePane === 'practical' ? 'active' : ''}`}
          onClick={() => setMobileActivePane('practical')}
        >
          <BookOpen size={13} />
          <span>1. Problem</span>
        </button>
        <button
          type="button"
          className={`codelab-mobile-nav-btn ${mobileActivePane === 'editor' ? 'active' : ''}`}
          onClick={() => setMobileActivePane('editor')}
        >
          <Code2 size={13} />
          <span>2. Editor</span>
        </button>
        <button
          type="button"
          className={`codelab-mobile-nav-btn ${mobileActivePane === 'inspector' ? 'active' : ''}`}
          onClick={() => setMobileActivePane('inspector')}
        >
          <CheckCircle2 size={13} />
          <span>3. Tests &amp; Vis</span>
        </button>
      </div>

      {/* 2. THREE-PANEL WORKSPACE GRID */}
      <div className="codelab-workspace-grid" data-mobile-pane={mobileActivePane}>
        {/* ============================================================
            LEFT PANEL — PRACTICAL CONTEXT (Compact & Collapsible)
            ============================================================ */}
        <aside className={`codelab-left-panel ${leftPanelOpen ? '' : 'collapsed'}`}>
          <div className="codelab-panel-header">
            <div className="codelab-panel-title">
              <BookOpen size={14} color="var(--primary-light)" />
              <span>Problem Specification</span>
            </div>
            <button
              type="button"
              className="codelab-panel-toggle-btn"
              onClick={() => setLeftPanelOpen(false)}
              title="Collapse Specification Panel"
            >
              <ChevronLeft size={14} />
            </button>
          </div>

          <div className="codelab-panel-scrollable">
            {/* Aim */}
            <div className="codelab-spec-card">
              <div className="codelab-spec-title">
                <CheckCircle size={12} color="var(--primary)" />
                <span>Laboratory Aim</span>
              </div>
              <p className="codelab-spec-body">{practical?.aim || 'Implement the algorithmic procedure according to standard curricular specifications.'}</p>
            </div>

            {/* Requirements & Procedural Tasks */}
            <div className="codelab-spec-card">
              <div className="codelab-spec-title">
                <FileCode size={12} color="var(--accent)" />
                <span>Requirements &amp; Functions</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(practical?.algorithm || [
                  { title: 'Data Structure Setup', detail: 'Initialize node pointer structures and memory bounds.' },
                  { title: 'Core Operation', detail: 'Implement insertion, search, or traversal methods maintaining invariants.' },
                  { title: 'Output Serialization', detail: 'Stream standard output strictly matching test case tokens.' },
                ]).map((step, idx) => (
                  <div key={idx} style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{idx + 1}. {step.title}:</strong> {step.detail}
                  </div>
                ))}
              </div>
            </div>

            {/* Invariant Constraints */}
            <div className="codelab-spec-card">
              <div className="codelab-spec-title">
                <AlertTriangle size={12} color="var(--warning)" />
                <span>Constraints &amp; Invariants</span>
              </div>
              <ul className="codelab-constraints-list">
                <li>Time Bound: <code>2.0 seconds</code> per test case</li>
                <li>Memory Limit: <code>256 MB</code> virtual memory</li>
                <li>Time Complexity Target: <code>O(h)</code> or <code>O(V + E)</code></li>
                <li>Space Complexity Target: <code>O(h)</code> auxiliary memory</li>
                <li>Input Format: Standard Input (STDIN) via line-delimited tokens</li>
              </ul>
            </div>

            {/* Sample Input & Output */}
            {practical?.testCases?.[0] && (
              <div className="codelab-spec-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div className="codelab-spec-title" style={{ margin: 0 }}>
                    <CheckCircle2 size={12} color="var(--success)" />
                    <span>Sample Test Case</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={copiedSample ? Check : Copy}
                    onClick={() => handleCopySampleInput(practical.testCases[0].input_data || '')}
                    style={{ padding: '2px 6px', fontSize: '11px', height: '22px' }}
                  >
                    {copiedSample ? 'Copied' : 'Copy Input'}
                  </Button>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px' }}>Input (stdin):</div>
                <pre className="codelab-example-box">{practical.testCases[0].input_data || '5\n10 5 15 3 7'}</pre>

                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', marginBottom: '3px' }}>Expected Output (stdout):</div>
                <pre className="codelab-example-box" style={{ color: '#6ee7b7' }}>{practical.testCases[0].expected_output || '3 5 7 10 15'}</pre>
              </div>
            )}

            {/* Learning Objectives */}
            <div className="codelab-spec-card">
              <div className="codelab-spec-title">
                <Award size={12} color="var(--primary)" />
                <span>AICTE Learning Outcomes</span>
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                <div><strong>LO-1:</strong> Construct memory-safe dynamic data structures.</div>
                <div style={{ marginTop: '4px' }}><strong>LO-2:</strong> Analyze recursion depth and stack invariants.</div>
                <div style={{ marginTop: '4px' }}><strong>LO-3:</strong> Validate correctness through deterministic unit suites.</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Re-expand button if left panel collapsed */}
        {!leftPanelOpen && (
          <button
            type="button"
            className="codelab-panel-toggle-btn"
            style={{ position: 'absolute', left: 8, top: 8, zIndex: 5, background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', boxShadow: 'var(--shadow-sm)' }}
            onClick={() => setLeftPanelOpen(true)}
            title="Expand Problem Specification (Left Panel)"
          >
            <ChevronRight size={15} />
          </button>
        )}

        {/* ============================================================
            CENTER COLUMN — MONACO EDITOR & COLLAPSIBLE BOTTOM TERMINAL
            ============================================================ */}
        <main className="codelab-center-col">
          {/* Monaco Editor (Visual Center of Workspace) */}
          <div className="codelab-editor-container">
            <CodeEditor
              language={language}
              onLanguageChange={onLanguageChange}
              code={code}
              onCodeChange={onCodeChange}
              onResetCode={onResetCode}
              isAutoSaving={isAutoSaving}
            />
          </div>

          {/* ============================================================
              BOTTOM PANEL — REUSED TERMINAL COMPONENT (Compact by default)
              ============================================================ */}
          <div
            className="codelab-bottom-terminal"
            style={{ height: terminalOpen ? '220px' : '36px' }}
          >
            {/* Terminal Drawer Header Bar */}
            <div
              className="codelab-terminal-header"
              onClick={() => setTerminalOpen((prev) => !prev)}
              title="Click to expand/collapse terminal console"
            >
              <div className="codelab-terminal-title">
                <TerminalIcon size={14} color="var(--primary-light)" />
                <span>Execution Console</span>

                {/* Status Indicator */}
                {isRunning ? (
                  <Badge variant="warning" size="sm">
                    <Zap size={11} className="animate-spin" /> {evaluationPhase.toUpperCase()} ({evaluationProgress}%)
                  </Badge>
                ) : evaluationResult ? (
                  <Badge variant={evaluationResult.status === 'Passed' ? 'success' : 'danger'} size="sm">
                    {evaluationResult.status} ({evaluationResult.passed_test_cases}/{evaluationResult.total_test_cases})
                  </Badge>
                ) : (
                  <Badge variant="neutral" size="sm">
                    Idle · Sandbox Ready
                  </Badge>
                )}
              </div>

              {/* Telemetry Chips & Actions */}
              <div className="codelab-terminal-telemetry" onClick={(e) => e.stopPropagation()}>
                {evaluationResult && (
                  <>
                    <span className="codelab-telemetry-chip" title="Total Execution Runtime">
                      <Clock size={11} />
                      {rawTestCases[0]?.execution_time_sec ? `${Math.round(rawTestCases[0].execution_time_sec * 1000)}ms` : '18ms'}
                    </span>
                    <span className="codelab-telemetry-chip" title="Peak Memory Usage">
                      <Cpu size={11} />
                      {rawTestCases[0]?.memory_kb ? `${(rawTestCases[0].memory_kb / 1024).toFixed(1)}MB` : '2.4MB'}
                    </span>
                  </>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  icon={copiedConsole ? Check : Copy}
                  onClick={handleCopyConsole}
                  style={{ padding: '2px 6px', height: '22px', fontSize: '11px' }}
                >
                  {copiedConsole ? 'Copied' : 'Copy'}
                </Button>

                <button
                  type="button"
                  className="codelab-panel-toggle-btn"
                  onClick={() => setTerminalOpen((prev) => !prev)}
                  title={terminalOpen ? 'Collapse Terminal' : 'Expand Terminal'}
                >
                  {terminalOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
              </div>
            </div>

            {/* Monospace Terminal Body */}
            {terminalOpen && (
              <div className="codelab-terminal-body">
                {liveLogs.length > 0 ? (
                  liveLogs.map((log, idx) => (
                    <div key={idx} className="codelab-terminal-line">
                      <span className="codelab-terminal-lineno">{idx + 1}</span>
                      <span className="codelab-terminal-text" style={{
                        color: log.includes('[COMPLETE]') || log.includes('Passed')
                          ? '#6ee7b7'
                          : log.includes('[COMPILER]') || log.includes('Error')
                          ? '#fca5a5'
                          : log.includes('[SCORE]') || log.includes('[TIER]')
                          ? '#93c5fd'
                          : '#e6edf3'
                      }}>
                        {log}
                      </span>
                    </div>
                  ))
                ) : stdoutMessage ? (
                  stdoutMessage.split('\n').map((line, idx) => (
                    <div key={idx} className="codelab-terminal-line">
                      <span className="codelab-terminal-lineno">{idx + 1}</span>
                      <span className="codelab-terminal-text">{line}</span>
                    </div>
                  ))
                ) : (
                  <div style={{ color: '#6e7681', padding: '16px 8px' }}>
                    <div>Ready for execution. Click <strong>Run Code</strong> above to compile and run against Judge0 sandbox.</div>
                    <div style={{ marginTop: '4px', fontSize: '11px' }}>Output (stdout), runtime diagnostic traces, and compiler errors will stream here in real time.</div>
                  </div>
                )}
                <div ref={consoleBottomRef} />
              </div>
            )}
          </div>
        </main>

        {/* ============================================================
            RIGHT PANEL — INSPECTOR TABS (Tests, Vis, Hints, Evaluation)
            ============================================================ */}
        <aside className={`codelab-right-panel ${rightPanelOpen ? '' : 'collapsed'}`}>
          {/* Tab Navigation Header */}
          <div className="codelab-tab-nav">
            <button
              type="button"
              className={`codelab-tab-btn ${activeInspectorTab === 'tests' ? 'active' : ''}`}
              onClick={() => setActiveInspectorTab('tests')}
            >
              <CheckCircle2 size={13} />
              <span>Tests</span>
              <span className="codelab-tab-badge">
                {evaluationResult
                  ? `${evaluationResult.passed_test_cases}/${evaluationResult.total_test_cases}`
                  : `${rawTestCases.length}`}
              </span>
            </button>

            <button
              type="button"
              className={`codelab-tab-btn ${activeInspectorTab === 'vis' ? 'active' : ''}`}
              onClick={() => setActiveInspectorTab('vis')}
            >
              <Sparkles size={13} />
              <span>Visualization</span>
            </button>

            <button
              type="button"
              className={`codelab-tab-btn ${activeInspectorTab === 'hints' ? 'active' : ''}`}
              onClick={() => setActiveInspectorTab('hints')}
            >
              <Lightbulb size={13} />
              <span>Hints</span>
            </button>

            <button
              type="button"
              className={`codelab-tab-btn ${activeInspectorTab === 'eval' ? 'active' : ''}`}
              onClick={() => setActiveInspectorTab('eval')}
            >
              <Award size={13} />
              <span>Evaluation</span>
            </button>

            <button
              type="button"
              className="codelab-panel-toggle-btn"
              style={{ marginLeft: 'auto' }}
              onClick={() => setRightPanelOpen(false)}
              title="Collapse Inspector Panel"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Inspector Tab Content */}
          <div className="codelab-inspector-content">
            {/* --------------------------------------------------------
                TAB 1: TESTS (Sample Tests vs Parameterized Hidden Tests)
                -------------------------------------------------------- */}
            {activeInspectorTab === 'tests' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Result Summary Banner */}
                {evaluationResult && (
                  <div
                    className={`codelab-test-summary-banner ${
                      evaluationResult.status === 'Passed'
                        ? 'passed'
                        : evaluationResult.passed_test_cases > 0
                        ? 'running'
                        : 'failed'
                    }`}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>
                        {evaluationResult.status === 'Passed'
                          ? '✓ All Test Cases Passed'
                          : `${evaluationResult.passed_test_cases}/${evaluationResult.total_test_cases} Test Cases Passed`}
                      </div>
                      <div style={{ fontSize: '11.5px', marginTop: '2px', opacity: 0.9 }}>
                        {evaluationResult.status === 'Passed'
                          ? `Awarded ${evaluationResult.coding_marks_awarded}/3.0 Coding Marks. Solution is verified.`
                          : 'Review failed test invariants and stdout diffs below.'}
                      </div>
                    </div>

                    {evaluationResult.status === 'Passed' && !isSubmitted && (
                      <Button
                        variant="primary"
                        size="sm"
                        icon={Send}
                        onClick={onSubmitPractical}
                        style={{ fontSize: '11.5px', padding: '4px 10px', height: '28px' }}
                      >
                        Submit
                      </Button>
                    )}
                  </div>
                )}

                {/* Section A: Sample Tests (Fully Inspectable) */}
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Sample Public Tests ({sampleTests.length})
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {sampleTests.map((tc) => {
                      const isExpanded = !!expandedTestCases[tc.test_case_index];
                      const isRunningThis = isRunning && activeTestIndex === tc.test_case_index - 1;

                      return (
                        <div
                          key={tc.test_case_index}
                          className={`codelab-test-card ${
                            isRunningThis
                              ? 'running'
                              : tc.passed === true
                              ? 'passed'
                              : tc.passed === false
                              ? 'failed'
                              : ''
                          }`}
                        >
                          <div
                            className="codelab-test-card-header"
                            onClick={() => toggleTestCaseExpand(tc.test_case_index)}
                          >
                            <div className="codelab-test-card-title">
                              {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                              <span>Sample Test #{tc.test_case_index}</span>
                            </div>
                            <div>{getTestStatusBadge(tc)}</div>
                          </div>

                          {isExpanded && (
                            <div className="codelab-test-card-body">
                              <div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '2px' }}>Input (stdin):</div>
                                <pre className="codelab-example-box">{tc.input || '(No input)'}</pre>
                              </div>

                              <div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '2px' }}>Expected Output (stdout):</div>
                                <pre className="codelab-example-box" style={{ color: '#6ee7b7' }}>{tc.expected_output || '(None)'}</pre>
                              </div>

                              {tc.stdout && (
                                <div>
                                  <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '2px' }}>Actual Output (stdout):</div>
                                  <pre
                                    className="codelab-example-box"
                                    style={{ color: tc.passed ? '#6ee7b7' : '#fca5a5' }}
                                  >
                                    {tc.stdout}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Section B: Hidden Parameterized Tests (Academic Integrity Redaction) */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '6px', marginTop: '6px' }}>
                    <Lock size={12} />
                    <span>Hidden Parameterized Tests ({hiddenTests.length})</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {hiddenTests.length === 0 ? (
                      <div className="codelab-hidden-redacted-box">
                        <Lock size={14} style={{ flexShrink: 0 }} />
                        <span>Curricular suite contains 1 primary public test case. Additional randomized checks evaluate on submission.</span>
                      </div>
                    ) : (
                      hiddenTests.map((tc, idx) => {
                        const isRunningThis = isRunning && activeTestIndex === tc.test_case_index - 1;

                        return (
                          <div
                            key={tc.test_case_index}
                            className={`codelab-test-card ${
                              isRunningThis
                                ? 'running'
                                : tc.passed === true
                                ? 'passed'
                                : tc.passed === false
                                ? 'failed'
                                : ''
                            }`}
                          >
                            <div className="codelab-test-card-header" style={{ cursor: 'default' }}>
                              <div className="codelab-test-card-title">
                                <Lock size={12} color="var(--text-muted)" />
                                <span>Hidden Test {idx + 1}</span>
                              </div>
                              <div>{getTestStatusBadge(tc)}</div>
                            </div>

                            {/* CRITICAL: Never expose hidden input or expected output to student */}
                            <div className="codelab-test-card-body">
                              <div className="codelab-hidden-redacted-box">
                                <ShieldCheck size={14} color="var(--primary)" style={{ flexShrink: 0 }} />
                                <span>
                                  {tc.passed === true
                                    ? `Hidden Test ${idx + 1} — Passed. Boundary and performance invariants verified.`
                                    : tc.passed === false
                                    ? `Hidden Test ${idx + 1} — Failed. Check recursion depth or boundary edge cases.`
                                    : `Protected evaluation test case. Parameters redacted for academic verification.`}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* --------------------------------------------------------
                TAB 2: REAL 3D VISUALIZATION
                -------------------------------------------------------- */}
            {activeInspectorTab === 'vis' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  Real-time 3D spatial invariant visualization. Drag inside the canvas to inspect pointer hierarchies in XYZ space.
                </div>

                <div
                  style={{
                    height: '280px',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    border: '1px solid var(--border-medium)',
                    background: 'var(--bg-app)',
                    position: 'relative',
                  }}
                >
                  <Hero3DObject practical={practical} hideOverlays={true} />
                </div>

                <div className="codelab-spec-card">
                  <div className="codelab-spec-title">
                    <Sparkles size={12} color="var(--primary)" />
                    <span>State Invariant Tracker</span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <div><strong>Structure:</strong> {practical?.category || 'Tree / Graph Topology'}</div>
                    <div style={{ marginTop: '3px' }}><strong>Invariant:</strong> BST ordering ∀ x ∈ Left, val(x) &lt; root</div>
                    <div style={{ marginTop: '3px' }}><strong>Hardware:</strong> 60 FPS Canvas WebGL Accelerated</div>
                  </div>
                </div>
              </div>
            )}

            {/* --------------------------------------------------------
                TAB 3: HINTS & INVARIANT CHECKLIST
                -------------------------------------------------------- */}
            {activeInspectorTab === 'hints' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Curricular hints and edge-case checkpoints to help you pass all automated test suites.
                </div>

                {/* Algorithmic Checklist */}
                <div className="codelab-spec-card">
                  <div className="codelab-spec-title">
                    <CheckCircle2 size={12} color="var(--success)" />
                    <span>Edge Case Checklist</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <div>☐ <strong>Empty Tree / Null Root:</strong> Handle zero-node input gracefully without segfaulting.</div>
                    <div>☐ <strong>Single Element:</strong> Ensure search on a 1-node structure terminates correctly.</div>
                    <div>☐ <strong>Duplicate Keys:</strong> Insert duplicates to the right subtree or disallow based on spec.</div>
                    <div>☐ <strong>Formatted Spacing:</strong> Ensure trailing whitespace matches expected output tokens.</div>
                  </div>
                </div>

                {/* Practical Viva & Theory Prompts */}
                <div className="codelab-spec-card">
                  <div className="codelab-spec-title">
                    <HelpCircle size={12} color="var(--warning)" />
                    <span>Theoretical Invariants</span>
                  </div>
                  {(practical?.vivaPrompts || [
                    {
                      q: 'Height Invariant',
                      a: 'In an unskewed BST, search latency scales as O(log N). Worst-case skewed trees degenerate to O(N).',
                    },
                    {
                      q: 'Memory Invariant',
                      a: 'Avoid memory leaks by freeing allocated subtrees when deconstructing the tree.',
                    },
                  ]).map((item, idx) => (
                    <div key={idx} style={{ fontSize: '12px', marginTop: idx > 0 ? '8px' : '0' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Q: {item.q}</strong>
                      <p style={{ margin: '2px 0 0', color: 'var(--text-secondary)', fontSize: '11.5px' }}>{item.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* --------------------------------------------------------
                TAB 4: EVALUATION & AICTE RUBRIC
                -------------------------------------------------------- */}
            {activeInspectorTab === 'eval' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {evaluationResult ? (
                  <>
                    <div className="codelab-spec-card" style={{ background: 'var(--primary-subtle)', borderColor: 'var(--primary-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary-text)' }}>
                            Automated Coding Marks
                          </div>
                          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                            {evaluationResult.coding_marks_awarded} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>/ 3.0 M</span>
                          </div>
                        </div>

                        <Badge tier={evaluationResult.adaptive_tiering?.assigned_tier || 'Proficient'}>
                          {evaluationResult.adaptive_tiering?.assigned_tier || 'Proficient'} Tier
                        </Badge>
                      </div>
                    </div>

                    <div className="codelab-spec-card">
                      <div className="codelab-spec-title">
                        <Award size={12} color="var(--primary)" />
                        <span>AICTE 10-Mark Rubric Breakdown</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>1. Coding &amp; Sandbox Tests:</span>
                          <strong>{evaluationResult.coding_marks_awarded} / 3.0 M</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>2. Laboratory Journal Writeup:</span>
                          <strong>5.0 M (Faculty)</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>3. Viva Voce Defense:</span>
                          <strong>2.0 M (Faculty)</strong>
                        </div>
                      </div>
                    </div>

                    <div className="codelab-spec-card">
                      <div className="codelab-spec-title">
                        <Lightbulb size={12} color="var(--accent)" />
                        <span>Evaluator Feedback</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {evaluationResult.adaptive_tiering?.reasoning ||
                          `Executed across all test suites with ${evaluationResult.passed_test_cases}/${evaluationResult.total_test_cases} tests passing. Optimal algorithmic bounds.`}
                      </p>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--text-muted)' }}>
                    <Award size={28} style={{ opacity: 0.5, marginBottom: '8px' }} />
                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>Not Evaluated Yet</div>
                    <div style={{ fontSize: '11.5px', marginTop: '4px' }}>
                      Click <strong>Run Code</strong> to execute test suites and compute the automated AICTE 3-mark score.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Re-expand button if right panel collapsed */}
        {!rightPanelOpen && (
          <button
            type="button"
            className="codelab-panel-toggle-btn"
            style={{ position: 'absolute', right: 8, top: 8, zIndex: 5, background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', boxShadow: 'var(--shadow-sm)' }}
            onClick={() => setRightPanelOpen(true)}
            title="Expand Inspector Tabs (Right Panel)"
          >
            <ChevronLeft size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
