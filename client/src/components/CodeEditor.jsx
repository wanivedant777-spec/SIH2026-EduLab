import React from 'react';
import Editor from '@monaco-editor/react';
import { Code2, RotateCcw, ShieldCheck } from 'lucide-react';

export default function CodeEditor({
  language,
  onLanguageChange,
  code,
  onCodeChange,
  onResetCode,
  isAutoSaving,
}) {
  const handleEditorChange = (value) => {
    onCodeChange(value || '');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Editor Toolbar */}
      <div className="editor-toolbar">
        <div className="toolbar-left">
          <Code2 size={16} color="#818cf8" />
          <select
            className="lang-select"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
          >
            <option value="cpp">C++ (GCC 14 / Judge0 ID 54)</option>
            <option value="c">C (GCC 14 / Judge0 ID 50)</option>
            <option value="python">Python 3.12 (Judge0 ID 71)</option>
            <option value="java">Java 21 (Judge0 ID 62)</option>
          </select>
        </div>

        <div className="toolbar-right">
          <div className="autosave-pill">
            <ShieldCheck size={14} color="#10b981" />
            <span>{isAutoSaving ? 'Auto-saving...' : 'Continuous Auto-save Active'}</span>
          </div>

          <button
            className="btn btn-secondary"
            onClick={onResetCode}
            style={{ padding: '3px 8px', fontSize: '11px' }}
            title="Reset to starter template"
          >
            <RotateCcw size={12} />
            Reset
          </button>
        </div>
      </div>

      {/* Monaco Editor Container */}
      <div className="monaco-wrapper">
        <Editor
          height="100%"
          language={language === 'c' ? 'c' : language === 'cpp' ? 'cpp' : language}
          value={code}
          theme="vs-dark"
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', Consolas, 'Courier New', monospace",
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            padding: { top: 12, bottom: 12 },
            bracketPairColorization: { enabled: true },
            wordWrap: 'on',
          }}
        />
      </div>
    </div>
  );
}
