import React from 'react';
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
  return (
    <main className="workspace-container">
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
  );
}

