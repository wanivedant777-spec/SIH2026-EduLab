import React from 'react';
import { History, CheckCircle2, Award, Terminal, FileText, Sparkles, Inbox } from 'lucide-react';

export default function RecentActivity({ activities = [] }) {
  const hasActivities = Array.isArray(activities) && activities.length > 0;

  const getActivityIcon = (type) => {
    switch (type) {
      case 'test_pass':
        return <Terminal size={14} color="var(--success-text)" />;
      case 'viva':
        return <Award size={14} color="var(--accent-text)" />;
      case 'badge':
        return <Sparkles size={14} color="var(--warning-text)" />;
      case 'writeup':
        return <FileText size={14} color="var(--info-text)" />;
      default:
        return <CheckCircle2 size={14} color="var(--accent-text)" />;
    }
  };

  return (
    <div className="dashboard-section activity-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">Recent Activity &amp; Audit Trail</h2>
          <p className="section-subtitle">
            Chronological log of compiler executions, rubric grades, and verified milestones
          </p>
        </div>
        <div className="section-meta-tag">
          <History size={13} color="var(--accent-text)" />
          <span>{hasActivities ? `${activities.length} Recorded Events` : 'Real-Time Event Stream'}</span>
        </div>
      </div>

      {!hasActivities ? (
        <div
          className="activity-empty-state"
          style={{
            padding: '40px 20px',
            textAlign: 'center',
            background: 'var(--bg-surface-subtle)',
            borderRadius: '16px',
            border: '1px dashed var(--border-medium)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'var(--accent-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px',
            }}
          >
            <Inbox size={22} color="var(--accent-text)" />
          </div>
          <h4 style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>
            No Activity Recorded Yet
          </h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '380px', margin: 0, lineHeight: 1.5 }}>
            Your compiler test executions, code submissions, and faculty evaluations will appear here in chronological order.
          </p>
        </div>
      ) : (
        <div className="activity-timeline">
          {activities.map((act) => (
            <div key={act.id} className="timeline-item">
              {/* Timeline Icon Node */}
              <div className={`timeline-icon-node node-${act.type || 'default'}`}>
                {getActivityIcon(act.type)}
              </div>

              {/* Timeline Content */}
              <div className="timeline-content-card">
                <div className="timeline-content-head">
                  <span className="timeline-item-title">{act.title}</span>
                  <span className="timeline-timestamp">{act.timestamp}</span>
                </div>
                <p className="timeline-item-detail">{act.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
