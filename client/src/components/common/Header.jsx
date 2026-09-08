import React, { useState, useEffect } from 'react';
import { Play, Send, Clock, BookOpen, CheckCircle, Download, LayoutDashboard, Code2, ArrowRight, LogOut, UserCircle } from 'lucide-react';
import Button from '../ui/Button';
import FocusTracker from './FocusTracker';

export default function Header({ currentUser, onLogout, studentView = 'dashboard', onStudentViewChange, currentPractical, onOpenPracticalModal, onOpenAuditDrawer, onRunCode, onSubmitPractical, onExportGradebook, isRunning, isSubmitted }) {
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const isStudent = currentUser?.role === 'student';
  const isFaculty = currentUser?.role === 'faculty';

  useEffect(() => {
    if (!isStudent || studentView !== 'workspace') return undefined;
    const timer = setInterval(() => setSecondsElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [isStudent, studentView]);

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return m + ':' + s;
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <button type="button" className="brand-badge" onClick={() => isStudent && onStudentViewChange?.('dashboard')} title="EduLab Home">
          <div className="brand-logo-icon">E</div>
          <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>EduLab</span>
        </button>

        {isStudent && (
          <div className="header-view-segmented" role="tablist">
            <button type="button" className={'view-segmented-btn ' + (studentView === 'dashboard' ? 'active' : '')} onClick={() => onStudentViewChange?.('dashboard')}>
              <LayoutDashboard size={13} /><span>Dashboard</span>
            </button>
            <button type="button" className={'view-segmented-btn ' + (studentView === 'workspace' ? 'active' : '')} onClick={() => onStudentViewChange?.('workspace')}>
              <Code2 size={13} /><span>Workspace</span>
            </button>
          </div>
        )}

        {isStudent && studentView === 'workspace' && currentPractical && (
          <div className="header-meta">
            <button type="button" className="practical-picker-btn" onClick={onOpenPracticalModal}>
              <BookOpen size={14} color="var(--primary-light)" />
              <span>{currentPractical.subjectCode || 'Subject'} · {currentPractical.title.split(':')[0]}</span>
            </button>
          </div>
        )}
      </div>

      <div className="header-center">
        {isStudent && studentView === 'workspace' ? (
          <>
            <div className="rubric-pill">
              <span className="rubric-segment">Coding <strong>3M</strong></span>
              <span>•</span>
              <span className="rubric-segment">Journal <strong>5M</strong></span>
              <span>•</span>
              <span className="rubric-segment">Viva <strong>2M</strong></span>
            </div>
            <div className="session-timer"><Clock size={13} color="var(--primary-light)" /><span>{formatTimer(secondsElapsed)}</span></div>
            <FocusTracker onOpenLogs={onOpenAuditDrawer} />
          </>
        ) : (
          <div className="rubric-pill">
            <span className="rubric-segment">{isFaculty ? 'Faculty Academic Workspace' : 'Batch: ' + (currentUser?.batchName || 'Unassigned')}</span>
          </div>
        )}
      </div>

      <div className="header-right">
        {isStudent && studentView === 'workspace' ? (
          <>
            <Button variant="secondary" icon={Play} onClick={onRunCode} loading={isRunning} disabled={isRunning}>Run Code</Button>
            <Button variant={isSubmitted ? 'glass' : 'success'} icon={isSubmitted ? CheckCircle : Send} onClick={onSubmitPractical} disabled={isRunning || isSubmitted}>
              {isSubmitted ? 'Submitted' : 'Submit Practical'}
            </Button>
          </>
        ) : isFaculty ? (
          <Button variant="glass" icon={Download} onClick={onExportGradebook} size="sm">Export Gradebook</Button>
        ) : (
          <Button variant="primary" size="sm" icon={Play} onClick={() => onStudentViewChange?.('workspace')}>Continue Practical <ArrowRight size={13} /></Button>
        )}

        {currentUser && <div className="header-user"><UserCircle size={18} /><span className="header-user-name">{currentUser.name || currentUser.identifier}</span></div>}
        <Button variant="glass" icon={LogOut} onClick={onLogout} size="sm" title="Sign out">Logout</Button>
      </div>
    </header>
  );
}
