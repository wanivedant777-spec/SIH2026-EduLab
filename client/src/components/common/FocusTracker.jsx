import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertCircle } from 'lucide-react';
import { focusTracker } from '../../services/focusService';

export default function FocusTracker({ onOpenLogs }) {
  const [focusState, setFocusState] = useState(focusTracker.getState());

  useEffect(() => {
    focusTracker.start();
    const unsubscribe = focusTracker.subscribe(setFocusState);
    return () => {
      unsubscribe();
    };
  }, []);

  const hasBlur = focusState.blurEventsCount > 0;

  return (
    <button
      type="button"
      onClick={onOpenLogs}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--bg-surface)',
        border: `1px solid ${hasBlur ? 'var(--warning-border)' : 'var(--border-subtle)'}`,
        color: hasBlur ? 'var(--warning-light)' : 'var(--text-secondary)',
        fontSize: '11.5px',
        cursor: 'pointer',
        transition: 'all var(--transition-fast)',
      }}
      title="Non-punitive integrity telemetry: Click to view tab blur audit log"
    >
      <div
        style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          background: hasBlur ? 'var(--warning)' : 'var(--success)',
          boxShadow: hasBlur ? '0 0 8px var(--warning)' : '0 0 8px var(--success)',
        }}
      />
      {hasBlur ? <AlertCircle size={13} /> : <ShieldCheck size={13} color="var(--success)" />}
      <span>
        {hasBlur
          ? `${focusState.blurEventsCount} Focus Alert${focusState.blurEventsCount > 1 ? 's' : ''}`
          : 'Session Verified'}
      </span>
    </button>
  );
}
