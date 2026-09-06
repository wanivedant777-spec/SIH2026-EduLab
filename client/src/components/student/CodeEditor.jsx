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
}) {
  const handleEditorChange = (value) => {
    onCodeChange(value || '');
  };

  const getMonacoLanguage = (lang) => {
    if (lang === 'c' || lang === 'cpp') return 'cpp';
    if (lang === 'python') return 'python';
    if (lang === 'java') return 'java';
    return 'cpp';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Editor Toolbar */}
      <div className="editor-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary-light)' }}>
            <Code2 size={16} />
          </div>

          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            style={{
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-medium)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-xs)',
              fontSize: '12px',
              fontFamily: 'var(--font-sans)',
              fontWeight: 500,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="cpp">C++20 (GCC 14 · Judge0 ID 54)</option>
            <option value="c">C (GCC 14 · Judge0 ID 50)</option>
            <option value="python">Python 3.12 (Judge0 ID 71)</option>
            <option value="java">Java 21 (Judge0 ID 62)</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              color: isAutoSaving ? 'var(--cyan-light)' : 'var(--text-muted)',
            }}
          >
            <ShieldCheck size={14} color="var(--success)" />
            <span>{isAutoSaving ? 'Auto-saving changes...' : 'Continuous Auto-save Active'}</span>
          </div>

          <Button
            variant="glass"
            size="sm"
            icon={RotateCcw}
            onClick={onResetCode}
            title="Reset code editor to starter template"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Monaco Editor Surface */}
      <div className="editor-surface">
        <Editor
          height="100%"
          language={getMonacoLanguage(language)}
          value={code}
          theme="vs-dark"
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            padding: { top: 12, bottom: 12 },
            bracketPairColorization: { enabled: true },
            wordWrap: 'on',
            renderWhitespace: 'selection',
            smoothScrolling: true,
            cursorBlinking: 'smooth',
          }}
        />
      </div>
    </div>
  );
}
