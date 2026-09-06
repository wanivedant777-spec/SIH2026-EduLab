import React, { useState, useEffect } from 'react';
import { ShieldAlert, Clock, AlertTriangle, CheckCircle, RotateCcw } from 'lucide-react';
import Drawer from '../ui/Drawer';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { focusTracker } from '../../services/focusService';

export default function AuditLogDrawer({ isOpen, onClose }) {
  const [focusState, setFocusState] = useState(focusTracker.getState());

  useEffect(() => {
    const unsub = focusTracker.subscribe(setFocusState);
    return () => unsub();
  }, []);

  const logs = focusState.eventLogs;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Student Integrity & Focus Telemetry Log"
      icon={ShieldAlert}
      width="520px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Anti-cheat banner */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Badge variant="cyan">NEP 2020 Integrity Audit</Badge>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Non-Punitive Telemetry</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            EduLab logs window focus and tab switches as audit metadata for faculty review.
            Unlike legacy software, code is never wiped out or auto-penalized.
          </p>
        </div>

        {/* Telemetry Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px',
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Focus Interruptions</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: focusState.blurEventsCount > 0 ? 'var(--warning-light)' : 'var(--success-light)', marginTop: '4px' }}>
              {focusState.blurEventsCount}
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px',
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Distraction Time</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--cyan-light)', marginTop: '4px' }}>
              {focusState.totalBlurDurationSeconds}s
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Event Stream
          </span>
          <Button
            variant="ghost"
            size="sm"
            icon={RotateCcw}
            onClick={() => focusTracker.reset()}
          >
            Clear Telemetry
          </Button>
        </div>

        {/* Event List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {logs.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '36px 20px',
                color: 'var(--text-muted)',
                fontSize: '13px',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <CheckCircle size={28} color="var(--success)" style={{ margin: '0 auto 8px auto', display: 'block' }} />
              No focus interruptions recorded. Continuous student engagement verified.
            </div>
          ) : (
            logs.map((ev) => {
              const isBlur = ev.type === 'window_blur';

              return (
                <div
                  key={ev.id}
                  style={{
                    background: 'var(--bg-surface)',
                    border: `1px solid ${isBlur ? 'var(--warning-border)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {isBlur ? (
                      <AlertTriangle size={15} color="var(--warning-light)" />
                    ) : (
                      <CheckCircle size={15} color="var(--cyan-light)" />
                    )}
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff' }}>
                        {isBlur ? 'Window Blur (Tab Switch)' : 'Focus Restored'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {ev.note}
                      </div>
                    </div>
                  </div>

                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Clock size={11} /> {ev.timestamp}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Drawer>
  );
}
