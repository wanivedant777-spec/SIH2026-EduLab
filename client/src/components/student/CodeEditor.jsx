import { useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Code2, RotateCcw, ShieldCheck } from 'lucide-react';
import Button from '../ui/Button';

export default function CodeEditor({
  language,
  onLanguageChange,
  code,
  onCodeChange,
  onResetCode,
  isAutoSaving = false,
  showToolbar = false,
}) {
  const editorRef = useRef(null);

  const handleEditorChange = (value) => {
    onCodeChange(value ?? '');
  };

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };

  const getMonacoLanguage = (lang) => {
    if (lang === 'c' || lang === 'cpp') return 'cpp';
    if (lang === 'python') return 'python';
    if (lang === 'java') return 'java';
    return 'cpp';
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        position: 'relative',
        minHeight: 0,
        flex: 1,
      }}
    >
      {/* Editor Toolbar (Optional when integrated into workbench topbar) */}
      {showToolbar && (
        <div className="editor-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)' }}>
              <Code2 size={16} />
            </div>

            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="editor-lang-select"
            >
              <option value="cpp">C++20 (GCC 14 · Judge0 ID 54)</option>
              <option value="c">C (GCC 14 · Judge0 ID 50)</option>
              <option value="python">Python 3.12 (Judge0 ID 71)</option>
              <option value="java">Java 21 (Judge0 ID 62)</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              className="editor-autosave-indicator"
              title={isAutoSaving ? 'Auto-saving changes...' : 'Continuous Auto-save Active'}
            >
              <ShieldCheck size={14} color="var(--success)" />
              <span className="editor-autosave-text">
                {isAutoSaving ? 'Auto-saving...' : 'Continuous Auto-save'}
              </span>
            </div>

            <Button
              variant="glass"
              size="sm"
              icon={RotateCcw}
              onClick={onResetCode}
              title="Reset code editor to starter template"
            >
              <span className="btn-text-full">Reset</span>
            </Button>
          </div>
        </div>
      )}

      {/* Monaco Editor Surface */}
      <div
        className="editor-surface"
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          minHeight: 0,
          flex: 1,
          overflow: 'hidden',
        }}
      >
        <Editor
          width="100%"
          height="100%"
          language={getMonacoLanguage(language)}
          value={code}
          theme="vs-dark"
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            readOnly: false,
            domReadOnly: false,
            automaticLayout: true,
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            tabSize: 4,
            padding: { top: 12, bottom: 12 },
            bracketPairColorization: { enabled: true },
            wordWrap: 'on',
            renderWhitespace: 'selection',
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            contextmenu: true,
            accessibilitySupport: 'off',
          }}
        />
      </div>
    </div>
  );
}
