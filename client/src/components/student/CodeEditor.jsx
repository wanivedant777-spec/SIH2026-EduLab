import { useRef, useEffect } from 'react';
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
  onPasteBlocked,
  onCopyBlocked,
  academicIntegrity = true,
}) {
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const onPasteBlockedRef = useRef(onPasteBlocked);
  const onCopyBlockedRef = useRef(onCopyBlocked);

  // Keep callback refs synchronized to avoid stale closures
  useEffect(() => {
    onPasteBlockedRef.current = onPasteBlocked;
  }, [onPasteBlocked]);

  useEffect(() => {
    onCopyBlockedRef.current = onCopyBlocked;
  }, [onCopyBlocked]);

  const handleEditorChange = (value) => {
    onCodeChange(value ?? '');
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    if (academicIntegrity) {
      // 1. Monaco Command Overrides (KeyMod.CtrlCmd maps to Cmd on macOS and Ctrl on Windows/Linux)
      // Block Cmd/Ctrl + V
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {
        if (onPasteBlockedRef.current) {
          onPasteBlockedRef.current();
        }
      });

      // Block Shift + Insert (Alternative paste keybinding)
      editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Insert, () => {
        if (onPasteBlockedRef.current) {
          onPasteBlockedRef.current();
        }
      });

      // Block Cmd/Ctrl + C (Copy solution code)
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC, () => {
        if (onCopyBlockedRef.current) {
          onCopyBlockedRef.current();
        }
      });

      // Block Cmd/Ctrl + X (Cut solution code)
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX, () => {
        if (onCopyBlockedRef.current) {
          onCopyBlockedRef.current();
        }
      });

      // 2. Monaco KeyDown Interceptor for macOS Chrome and cross-platform events
      editor.onKeyDown((e) => {
        const isCtrlOrCmd = e.ctrlKey || e.metaKey;
        const keyChar = (e.browserEvent?.key || '').toLowerCase();
        const isV = e.code === 'KeyV' || keyChar === 'v';
        const isC = e.code === 'KeyC' || keyChar === 'c';
        const isX = e.code === 'KeyX' || keyChar === 'x';
        const isShiftInsert = e.shiftKey && (e.code === 'Insert' || e.browserEvent?.key === 'Insert');

        // Prevent Paste
        if ((isCtrlOrCmd && isV) || isShiftInsert) {
          e.preventDefault();
          e.stopPropagation();
          if (e.browserEvent) {
            e.browserEvent.preventDefault();
            e.browserEvent.stopImmediatePropagation();
          }
          if (onPasteBlockedRef.current) {
            onPasteBlockedRef.current();
          }
          return;
        }

        // Prevent Copy / Cut
        if (isCtrlOrCmd && (isC || isX)) {
          e.preventDefault();
          e.stopPropagation();
          if (e.browserEvent) {
            e.browserEvent.preventDefault();
            e.browserEvent.stopImmediatePropagation();
          }
          if (onCopyBlockedRef.current) {
            onCopyBlockedRef.current();
          }
          return;
        }
      });

      // 3. Block Monaco Context Menu
      editor.onContextMenu((e) => {
        e.event.preventDefault();
        e.event.stopPropagation();
      });

      // 4. Attach capture-phase DOM listeners directly to editor DOM node and its inputarea textarea
      const editorDom = editor.getDomNode();
      if (editorDom) {
        const handleDirectPaste = (e) => {
          e.preventDefault();
          e.stopImmediatePropagation();
          e.stopPropagation();
          if (onPasteBlockedRef.current) onPasteBlockedRef.current();
          return false;
        };

        const handleDirectCopyCut = (e) => {
          e.preventDefault();
          e.stopImmediatePropagation();
          e.stopPropagation();
          if (onCopyBlockedRef.current) onCopyBlockedRef.current();
          return false;
        };

        editorDom.addEventListener('paste', handleDirectPaste, true);
        editorDom.addEventListener('copy', handleDirectCopyCut, true);
        editorDom.addEventListener('cut', handleDirectCopyCut, true);

        const textarea = editorDom.querySelector('textarea');
        if (textarea) {
          textarea.addEventListener('paste', handleDirectPaste, true);
          textarea.addEventListener('copy', handleDirectCopyCut, true);
          textarea.addEventListener('cut', handleDirectCopyCut, true);
        }
      }
    }
  };

  // 5. Container-level capturing listeners for DOM paste, copy, cut, contextmenu, drag & drop
  useEffect(() => {
    if (!academicIntegrity) return;
    const container = containerRef.current;
    if (!container) return;

    // Suppress browser context menu inside the code editor
    const handleContextMenu = (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      e.stopPropagation();
      return false;
    };

    // Block native paste
    const handlePaste = (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      e.stopPropagation();
      if (onPasteBlockedRef.current) {
        onPasteBlockedRef.current();
      }
      return false;
    };

    // Block native copy and cut
    const handleCopyCut = (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      e.stopPropagation();
      if (onCopyBlockedRef.current) {
        onCopyBlockedRef.current();
      }
      return false;
    };

    // Block drag and drop code insertion into editor
    const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'none';
      }
    };

    const handleDrop = (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      e.stopPropagation();
      if (onPasteBlockedRef.current) {
        onPasteBlockedRef.current();
      }
      return false;
    };

    // Attach in capture phase (true) so events are stopped before reaching inner elements
    container.addEventListener('contextmenu', handleContextMenu, true);
    container.addEventListener('paste', handlePaste, true);
    container.addEventListener('copy', handleCopyCut, true);
    container.addEventListener('cut', handleCopyCut, true);
    container.addEventListener('dragover', handleDragOver, true);
    container.addEventListener('drop', handleDrop, true);

    return () => {
      container.removeEventListener('contextmenu', handleContextMenu, true);
      container.removeEventListener('paste', handlePaste, true);
      container.removeEventListener('copy', handleCopyCut, true);
      container.removeEventListener('cut', handleCopyCut, true);
      container.removeEventListener('dragover', handleDragOver, true);
      container.removeEventListener('drop', handleDrop, true);
    };
  }, [academicIntegrity]);

  const getMonacoLanguage = (lang) => {
    if (lang === 'c' || lang === 'cpp') return 'cpp';
    if (lang === 'python') return 'python';
    if (lang === 'java') return 'java';
    return 'cpp';
  };

  return (
    <div
      ref={containerRef}
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
            contextmenu: false, // Disables Monaco's right-click context menu
            dragAndDrop: false, // Disables dragging selections inside editor
            dropIntoEditor: { enabled: false }, // Disables dropping external text into Monaco
            accessibilitySupport: 'off',
          }}
        />
      </div>
    </div>
  );
}
