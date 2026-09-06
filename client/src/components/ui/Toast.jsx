import React from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export default function Toast({ toasts = [], onDismiss }) {
  if (!toasts.length) return null;

  const iconMap = {
    success: <CheckCircle size={16} color="var(--success)" />,
    info: <Info size={16} color="var(--primary-light)" />,
    warning: <AlertTriangle size={16} color="var(--warning)" />,
    danger: <AlertCircle size={16} color="var(--danger)" />,
  };

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast-item toast-${toast.type || 'info'}`}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {iconMap[toast.type] || iconMap.info}
          </div>
          <div style={{ flex: 1 }}>{toast.message}</div>
          {onDismiss && (
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                padding: '2px',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
