import React, { useState, useEffect } from 'react';
import {
  Menu,
  Play,
  Send,
  Clock,
  BookOpen,
  CheckCircle,
  Download,
  LogOut,
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Breadcrumbs from '../ui/Breadcrumbs';
import FocusTracker from './FocusTracker';

export default function TopBar({
  currentUser,
  activeNav = 'dashboard',
  onNavigate,
  onToggleSidebar,
  currentPractical,
  onOpenPracticalModal,
  onOpenAuditDrawer,
  onRunCode,
  onSubmitPractical,
  onExportGradebook,
  isRunning = false,
  isSubmitted = false,
  onLogout,
  breadcrumbs = [],
}) {
  const isStudent = currentUser?.role === 'student';
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

  // Construct default breadcrumbs if none provided
  const navTitles = {
    dashboard: 'Dashboard',
    practicals: 'My Practicals',
    learning: 'Learning & Theory',
    visualizations: 'Visualizations',
    workspace: 'Code Lab',
    submissions: 'Submissions',
    progress: 'Progress & Analytics',
    students: 'Students',
    evaluations: 'Evaluations',
    analytics: 'Analytics',
  };

  const defaultBreadcrumbs = [
    { label: isStudent ? 'Student Portal' : 'Faculty Console', onClick: () => onNavigate && onNavigate('dashboard') },
    { label: navTitles[activeNav] || 'Overview' },
  ];

  const crumbsToRender = breadcrumbs.length > 0 ? breadcrumbs : defaultBreadcrumbs;

  return (
    <header className="topbar-root">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="topbar-left">
        <button
          type="button"
          className="topbar-menu-toggle"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
        >
          <Menu size={18} />
        </button>

        <Breadcrumbs items={crumbsToRender} />

        {/* Practical Picker Chip in Workspace */}
        {isStudent && activeNav === 'workspace' && currentPractical && (
          <button
            type="button"
            className="topbar-practical-chip"
            onClick={onOpenPracticalModal}
            title="Switch lab practical"
          >
            <BookOpen size={13} className="practical-chip-icon" />
            <span className="practical-chip-title">
              {currentPractical.courseCode?.split(':')[0]} · {currentPractical.title?.split(':')[0]}
            </span>
          </button>
        )}
      </div>

      {/* Center: Rubric / Session Context */}
      <div className="topbar-center">
        {isStudent ? (
          activeNav === 'workspace' ? (
            <div className="topbar-workspace-telemetry">
              <div className="topbar-rubric-pill" title="AICTE Standard Evaluation Distribution">
                <span className="rubric-item"><strong>3M</strong> Performing</span>
                <span className="rubric-separator">•</span>
                <span className="rubric-item"><strong>5M</strong> Journal</span>
                <span className="rubric-separator">•</span>
                <span className="rubric-item"><strong>2M</strong> Viva</span>
              </div>

              <div className="topbar-timer-chip" title="Active Lab Session Duration">
                <Clock size={12} />
                <span className="timer-value">{formatTimer(secondsElapsed)}</span>
              </div>

              {onOpenAuditDrawer && <FocusTracker onOpenLogs={onOpenAuditDrawer} />}
            </div>
          ) : (
            <div className="topbar-context-badge">
              <span className="context-dot" />
              <span>AICTE &amp; NEP 2020 Accredited Curricular Environment</span>
            </div>
          )
        ) : (
          <div className="topbar-context-badge">
            <span className="context-dot" />
            <span>AICTE 10-Mark Rubric Evaluation Console</span>
          </div>
        )}
      </div>

      {/* Right: Action Buttons & User Status */}
      <div className="topbar-right">
        {/* Workspace specific action buttons */}
        {isStudent && activeNav === 'workspace' && (
          <div className="topbar-workspace-actions">
            <Button
              variant="secondary"
              size="sm"
              icon={Play}
              onClick={onRunCode}
              loading={isRunning}
              disabled={isRunning}
            >
              {isRunning ? 'Running...' : 'Run Code'}
            </Button>

            <Button
              variant={isSubmitted ? 'outline' : 'primary'}
              size="sm"
              icon={isSubmitted ? CheckCircle : Send}
              onClick={onSubmitPractical}
              disabled={isRunning || isSubmitted}
            >
              {isSubmitted ? 'Submitted' : 'Submit Practical'}
            </Button>
          </div>
        )}

        {/* Faculty specific action button */}
        {!isStudent && onExportGradebook && (
          <Button
            variant="outline"
            size="sm"
            icon={Download}
            onClick={onExportGradebook}
          >
            Export Gradebook
          </Button>
        )}

        {/* User Chip */}
        {currentUser && (
          <div className="topbar-user-chip" title={`${currentUser.name || currentUser.identifier} (${currentUser.role})`}>
            <span className="user-chip-name">{currentUser.name || currentUser.identifier}</span>
            <Badge variant={isStudent ? 'primary' : 'warning'} size="sm">
              {isStudent ? 'Student' : 'Faculty'}
            </Badge>
          </div>
        )}

        {/* Logout */}
        <Button
          variant="ghost"
          size="sm"
          icon={LogOut}
          onClick={onLogout}
          title="Sign out"
          className="topbar-logout-btn"
        >
          Logout
        </Button>
      </div>
    </header>
  );
}
