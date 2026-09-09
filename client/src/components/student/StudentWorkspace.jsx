import React, { useState, useEffect } from 'react';
import { BookOpen, Code2, Terminal as TerminalIcon } from 'lucide-react';
import TheoryPanel from './TheoryPanel';
import CodeEditor from './CodeEditor';
import Terminal from './Terminal';

export default function StudentWorkspace({
  practical,
  language,
  onLanguageChange,
  code,
  onCodeChange,
  onResetCode,
  isRunning,
  evaluationPhase,
  evaluationProgress,
  activeTestIndex,
  liveLogs,
  evaluationResult,
  stdoutMessage,
  isAutoSaving,
  onRunCode,
}) {
  const [activePane, setActivePane] = useState('editor'); // 'theory' | 'editor' | 'terminal'

  // Auto-switch to terminal tab on tablet/mobile when execution starts
  useEffect(() => {
    if (isRunning) {
      const timer = setTimeout(() => {
        setActivePane('terminal');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isRunning]);

  return (
    <div className="workspace-wrapper" style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', overflow: 'hidden' }}>
      {/* Responsive pane navigation bar for tablets & mobile (<1024px) */}
      <div className="workspace-mobile-nav">
        <button
          type="button"
          className={`workspace-mobile-tab-btn ${activePane === 'theory' ? 'active' : ''}`}
          onClick={() => setActivePane('theory')}
        >
          <BookOpen size={13} />
          <span className="tab-text-full">1. Theory &amp; Algorithm</span>
          <span className="tab-text-compact">1. Theory</span>
        </button>

        <button
          type="button"
          className={`workspace-mobile-tab-btn ${activePane === 'editor' ? 'active' : ''}`}
          onClick={() => setActivePane('editor')}
        >
          <Code2 size={13} />
          <span className="tab-text-full">2. Code Editor</span>
          <span className="tab-text-compact">2. Editor</span>
        </button>

        <button
          type="button"
          className={`workspace-mobile-tab-btn ${activePane === 'terminal' ? 'active' : ''}`}
          onClick={() => setActivePane('terminal')}
        >
          <TerminalIcon size={13} />
          <span className="tab-text-full">3. Terminal &amp; Rubric</span>
          <span className="tab-text-compact">3. Terminal</span>
        </button>
      </div>

      <main className="workspace-container" data-active-pane={activePane}>
        {/* Left Pane: Theory & Pedagogy */}
        <TheoryPanel practical={practical} />

        {/* Right Pane: Code Editor & Execution Terminal */}
        <div className="editor-pane">
          <CodeEditor
            language={language}
            onLanguageChange={onLanguageChange}
            code={code}
            onCodeChange={onCodeChange}
            onResetCode={onResetCode}
            isAutoSaving={isAutoSaving}
          />

          <Terminal
            practical={practical}
            evaluationResult={evaluationResult}
            isRunning={isRunning}
            evaluationPhase={evaluationPhase}
            evaluationProgress={evaluationProgress}
            activeTestIndex={activeTestIndex}
            liveLogs={liveLogs}
            stdoutMessage={stdoutMessage}
            language={language}
            onRunCode={onRunCode}
          />
        </div>
      </main>
    </div>
  );
}

