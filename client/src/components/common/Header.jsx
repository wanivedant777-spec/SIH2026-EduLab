import React, { useState, useEffect } from 'react';
import { Play, Send, Clock, Award, BookOpen, CheckCircle, Download, LayoutDashboard, Code2, ArrowRight, LogOut } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import RoleSwitcher from './RoleSwitcher';
import FocusTracker from './FocusTracker';

export default function Header({
  currentUser,
  onLogout,
  activeRole,
  onRoleChange,
  studentView = 'dashboard',
  onStudentViewChange,
  currentPractical,
  onOpenPracticalModal,
  onOpenAuditDrawer,
  onRunCode,
  onSubmitPractical,
  onExportGradebook,
  isRunning,
  isSubmitted,
}) {

  const [secondsElapsed, setSecondsElapsed] = useState(420);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <header className="app-header">
      {/* Brand & Practical Selector */}
      <div className="header-left">
        <div
          className="brand-badge"
          onClick={() => {
            if (activeRole === 'student' && onStudentViewChange) {
              onStudentViewChange('dashboard');
            }
          }}
          title="EduLab - Home Dashboard"
        >
          <div className="brand-logo-icon">E</div>
          <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>EduLab</span>
          <span className="brand-tag">v2.0</span>
        </div>

        {activeRole === 'student' && (
          <div className="header-view-segmented" role="tablist">
            <button
              type="button"
              className={`view-segmented-btn ${studentView === 'dashboard' ? 'active' : ''}`}
              onClick={() => onStudentViewChange && onStudentViewChange('dashboard')}
            >
              <LayoutDashboard size={13} />
              <span>Dashboard</span>
            </button>
            <button
              type="button"
              className={`view-segmented-btn ${studentView === 'workspace' ? 'active' : ''}`}
              onClick={() => onStudentViewChange && onStudentViewChange('workspace')}
            >
              <Code2 size={13} />
              <span>Workspace</span>
            </button>
          </div>
        )}

        {activeRole === 'student' && studentView === 'workspace' && currentPractical && (
          <div className="header-meta">
            <button
              type="button"
              className="practical-picker-btn"
              onClick={onOpenPracticalModal}
              title="Click to switch lab practical"
            >
              <BookOpen size={14} color="var(--primary-light)" />
              <span>{currentPractical.courseCode.split(':')[0]} · {currentPractical.title.split(':')[0]}</span>
            </button>

            <Badge variant="nep">
              <Award size={12} />
              NEP 2020
            </Badge>
          </div>
        )}
      </div>

      {/* Center: Rubric Pills & Session Timer */}
      <div className="header-center">
        {activeRole === 'student' ? (
          studentView === 'workspace' ? (
            <>
              <div className="rubric-pill">
                <span className="rubric-segment">
                  Performing <strong>3M</strong> (Auto)
                </span>
                <span style={{ color: 'var(--border-strong)' }}>•</span>
                <span className="rubric-segment">
                  Writing <strong>5M</strong> (Faculty)
                </span>
                <span style={{ color: 'var(--border-strong)' }}>•</span>
                <span className="rubric-segment">
                  Viva <strong>2M</strong>
                </span>
              </div>

              <div className="session-timer" title="Active Lab Practical Duration">
                <Clock size={13} color="var(--primary-light)" />
                <span>{formatTimer(secondsElapsed)}</span>
              </div>

              <FocusTracker onOpenLogs={onOpenAuditDrawer} />
            </>
          ) : (
            <div className="rubric-pill">
              <span className="rubric-segment">
                Academic Curriculum: <strong>CS204P Data Structures</strong>
              </span>
              <span style={{ color: 'var(--border-strong)' }}>•</span>
              <span className="rubric-segment">
                <strong>75% Completed</strong> (3 of 4)
              </span>
            </div>
          )
        ) : (
          <div className="rubric-pill">
            <span className="rubric-segment">
              Faculty Portal · <strong>Batch A (64 Students)</strong>
            </span>
            <span style={{ color: 'var(--border-strong)' }}>•</span>
            <span className="rubric-segment">
              10-Mark Rubric Console Active
            </span>
          </div>
        )}
      </div>

      {/* Right: Persona Switcher & Action Buttons */}
      <div className="header-right">
        <RoleSwitcher currentRole={activeRole} onRoleChange={onRoleChange} />

        {activeRole === 'student' ? (
          studentView === 'workspace' ? (
            <>
              <Button
                variant="secondary"
                icon={Play}
                onClick={onRunCode}
                loading={isRunning}
                disabled={isRunning}
              >
                {isRunning ? 'Compiling...' : 'Run Code'}
              </Button>

              <Button
                variant={isSubmitted ? 'glass' : 'success'}
                icon={isSubmitted ? CheckCircle : Send}
                onClick={onSubmitPractical}
                disabled={isRunning || isSubmitted}
              >
                {isSubmitted ? 'Submitted (3.0M)' : 'Submit Practical'}
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              size="sm"
              icon={Play}
              onClick={() => onStudentViewChange && onStudentViewChange('workspace')}
            >
              Continue Practical
              <ArrowRight size={13} style={{ marginLeft: '4px' }} />
            </Button>
          )
        ) : (
          <Button
            variant="glass"
            icon={Download}
            onClick={onExportGradebook}
            size="sm"
          >
            Export Gradebook
          </Button>
        )}

        {currentUser && (
          <Button
            variant="glass"
            icon={LogOut}
            onClick={onLogout}
            size="sm"
            title="Sign out of current account"
          >
            Logout
          </Button>
        )}
      </div>
    </header>
  );
}


