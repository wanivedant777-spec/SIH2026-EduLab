import React from 'react';
import { History, CheckCircle2, Award, Terminal, FileText, Sparkles } from 'lucide-react';


export default function RecentActivity({ activities }) {
  const defaultActivities = [
    {
      id: 'act_01',
      title: 'Passed 3/3 Test Cases · Practical 04: BST',
      type: 'test_pass',
      timestamp: 'Just now',
      detail: 'Runtime 18ms · Memory 4.2 MB · 5.0 / 5.0 Coding Marks awarded',
      status: 'success',
    },
    {
      id: 'act_02',
      title: 'Viva Voce Verified · Dr. S. Rao',
      type: 'viva',
      timestamp: '2 hours ago',
      detail: 'Oral defense on Inorder Traversal & BST invariants · 2.0 / 2.0 Marks',
      status: 'verified',
    },
    {
      id: 'act_03',
      title: 'Submitted Practical 03: Queue Implementations',
      type: 'submission',
      timestamp: 'Yesterday',
      detail: 'Total 9.2 / 10.0 M · Graded by Lab Instructor · Feedback: Excellent circular buffer design',
      status: 'graded',
    },
    {
      id: 'act_04',
      title: 'Earned "Tier 1: Advanced Algorithmist" Badge',
      type: 'badge',
      timestamp: '2 days ago',
      detail: 'NEP 2020 Level 5 Skill Criteria Met · 100% hidden test pass rate across 3 practicals',
      status: 'achievement',
    },
    {
      id: 'act_05',
      title: 'Journal Write-up Approved',
      type: 'writeup',
      timestamp: '4 days ago',
      detail: 'Aim, Algorithm, Pseudocode, and Complexity analysis verified · 2.8 / 3.0 M',
      status: 'verified',
    },
  ];

  const items = activities && activities.length ? activities : defaultActivities;

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
          <h2 className="section-title">Recent Activity & Audit Trail</h2>
          <p className="section-subtitle">
            Chronological log of compiler executions, rubric grades, and verified milestones
          </p>
        </div>
        <div className="section-meta-tag">
          <History size={13} color="var(--accent-text)" />
          <span>Real-Time Event Stream</span>
        </div>
      </div>

      <div className="activity-timeline">
        {items.map((act) => (
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
    </div>
  );
}
