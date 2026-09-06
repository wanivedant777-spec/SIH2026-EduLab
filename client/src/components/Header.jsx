import React, { useState, useEffect } from 'react';
import { Play, Send, Clock, User, Award, CheckCircle, LogOut, ArrowLeft, ShieldCheck, GraduationCap } from 'lucide-react';

export default function Header({
  currentUser,
  currentView,
  onNavigate,
  onLogout,
  onRunCode,
  onSubmitPractical,
  isRunning,
  isSubmitted,
}) {
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const isFaculty = currentUser?.role === 'faculty';

  return (
    <header className="app-header">
      {/* Brand & Practical Identity */}
      <div className="header-left">
        <div className="brand-badge" onClick={() => onNavigate('dashboard')} style={{ cursor: 'pointer' }}>
          <span>🧪 SmartLabs</span>
        </div>

        {currentView === 'ide' && (
          <button
            className="btn-back-dashboard"
            onClick={() => onNavigate('dashboard')}
            title="Back to Dashboard"
          >
            <ArrowLeft size={14} />
            <span>Dashboard</span>
          </button>
        )}

        <div className="header-meta">
          <span className="practical-badge">
            {currentView === 'ide' ? 'CS201P · Practical 04' : 'Division C · CSE-AI'}
          </span>
          <span className="nep-tag">
            <Award size={12} />
            NEP 2020
          </span>
        </div>
      </div>

      {/* Official 10-Mark Rubric & Session Timer */}
      <div className="header-center">
        <div className="marks-breakdown-pill">
          <span className="marks-item">
            Performing <strong>3M</strong> (Auto)
          </span>
          <span style={{ color: 'var(--border-strong)' }}>•</span>
          <span className="marks-item">
            Writing <strong>5M</strong> (Faculty)
          </span>
          <span style={{ color: 'var(--border-strong)' }}>•</span>
          <span className="marks-item">
            Viva <strong>2M</strong>
          </span>
        </div>

        {currentView === 'ide' && (
          <div className="session-timer">
            <Clock size={13} color="#818cf8" />
            <span>{formatTimer(secondsElapsed)}</span>
          </div>
        )}
      </div>

      {/* User Status, Action Buttons & Logout */}
      <div className="header-right">
        {currentUser && (
          <div className="student-chip">
            <div className="status-dot" />
            {isFaculty ? <ShieldCheck size={13} /> : <GraduationCap size={13} />}
            <span>
              <strong>{currentUser.identifier}</strong>
              {currentUser.batchName ? ` (${currentUser.batchName})` : ''}
            </span>
          </div>
        )}

        {currentView === 'ide' && (
          <>
            <button
              className="btn btn-secondary"
              onClick={onRunCode}
              disabled={isRunning}
            >
              <Play size={13} fill="#fff" />
              {isRunning ? 'Executing...' : 'Run Code'}
            </button>

            <button
              className="btn btn-success"
              onClick={onSubmitPractical}
              disabled={isRunning || isSubmitted}
            >
              {isSubmitted ? (
                <>
                  <CheckCircle size={14} />
                  Submitted
                </>
              ) : (
                <>
                  <Send size={13} />
                  Submit Practical
                </>
              )}
            </button>
          </>
        )}

        {currentUser && (
          <button
            className="btn-logout"
            onClick={onLogout}
            title="Sign out of current account"
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        )}
      </div>
    </header>
  );
}
