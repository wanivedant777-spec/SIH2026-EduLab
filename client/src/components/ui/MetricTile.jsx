import React from 'react';

export default function MetricTile({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}) {

  return (
    <div className="metric-tile">
      <div className="metric-header">
        <span>{title}</span>
        {Icon && (
          <div
            style={{
              padding: '4px',
              borderRadius: 'var(--radius-xs)',
              background: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              display: 'flex',
            }}
          >
            <Icon size={14} />
          </div>
        )}
      </div>

      <div className="metric-value">{value}</div>

      {(subtitle || trend) && (
        <div className="metric-footer">
          {trend && (
            <span style={{ color: trend.startsWith('+') ? 'var(--success)' : 'var(--warning)' }}>
              {trend}
            </span>
          )}
          <span>{subtitle}</span>
        </div>
      )}
    </div>
  );
}
