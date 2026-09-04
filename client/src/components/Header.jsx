import React, { useState, useEffect } from 'react';
import { Play, Send, Clock, User, Award, CheckCircle } from 'lucide-react';

export default function Header({
  onRunCode,
  onSubmitPractical,
  isRunning,
  isSubmitted,
}) {
  const [secondsElapsed, setSecondsElapsed] = useState(412); // Sample ongoing lab time

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

  return (
    <header className="app-header">
      {/* Brand & Practical Identity */}
      <div className="header-left">
        <div className="brand-badge">
          <span>🧪 SmartLabs</span>
        </div>
        <div className="header-meta">
          <span className="practical-badge">CS204P · Practical 04</span>
          <span className="nep-tag">
            <Award size={12} />
            NEP 2020
          </span>
        </div>
      </div>

      {/* Marks Rubric & Session Timer */}
      <div className="header-center">
        <div className="marks-breakdown-pill">
          <span className="marks-item">
            Coding <strong>5M</strong> (Auto)
          </span>
          <span style={{ color: 'var(--border-strong)' }}>•</span>
          <span className="marks-item">
            Write-up <strong>3M</strong> (Faculty)
          </span>
          <span style={{ color: 'var(--border-strong)' }}>•</span>
          <span className="marks-item">
            Viva <strong>2M</strong>
          </span>
        </div>

        <div className="session-timer">
          <Clock size={13} color="#818cf8" />
          <span>{formatTimer(secondsElapsed)}</span>
        </div>
      </div>

      {/* User Status & Action Buttons */}
      <div className="header-right">
        <div className="student-chip">
          <div className="status-dot" />
          <User size={13} />
          <span>std_2026_014</span>
        </div>

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
      </div>
    </header>
  );
}
