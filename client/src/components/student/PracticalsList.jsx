import React from 'react';
import { BookOpen, ArrowUpRight, CheckCircle2, Clock, Play } from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';


export default function PracticalsList({ practicals, currentPracticalId, onSelectPractical }) {
  // Mock status mapping for catalog practicals
  const getPracticalMeta = (prac, index) => {
    if (prac.id === currentPracticalId) {
      return {
        status: 'In Progress',
        statusVariant: 'warning',
        score: '3.0 / 3.0 M (Auto)',
        tier: 'Advanced',
        isCurrent: true,
      };
    }
    if (index === 0) {
      return {
        status: 'Completed',
        statusVariant: 'success',
        score: '9.6 / 10.0 M',
        tier: 'Advanced',
        isCurrent: false,
      };
    }
    if (index === 1) {
      return {
        status: 'Completed',
        statusVariant: 'success',
        score: '9.8 / 10.0 M',
        tier: 'Advanced',
        isCurrent: false,
      };
    }
    if (index === 2) {
      return {
        status: 'Evaluated',
        statusVariant: 'success',
        score: '8.8 / 10.0 M',
        tier: 'Proficient',
        isCurrent: false,
      };
    }
    return {
      status: 'Ready',
      statusVariant: 'default',
      score: 'Pending',
      tier: 'Proficient',
      isCurrent: false,
    };
  };

  return (
    <div className="dashboard-section practicals-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">Curricular Practicals</h2>
          <p className="section-subtitle">
            AICTE & NEP 2020 Accredited Lab Syllabus · CS204P Data Structures
          </p>
        </div>
        <div className="section-meta-tag">
          <BookOpen size={13} color="var(--accent-text)" />
          <span>{practicals.length} Experiments Assigned</span>
        </div>
      </div>

      <div className="practicals-grid">
        {practicals.map((prac, idx) => {
          const meta = getPracticalMeta(prac, idx);
          const isCurrent = meta.isCurrent;

          return (
            <div
              key={prac.id}
              className={`practical-card ${isCurrent ? 'practical-card-current' : ''}`}
            >
              {/* Card Header */}
              <div className="practical-card-head">
                <div className="practical-badges">
                  <span className="practical-code">{prac.courseCode.split(':')[0]}</span>
                  <Badge
                    variant={
                      prac.difficulty === 'Easy'
                        ? 'success'
                        : prac.difficulty === 'Medium'
                        ? 'warning'
                        : 'danger'
                    }
                  >
                    {prac.difficulty}
                  </Badge>
                  <Badge variant={`tier-${meta.tier.toLowerCase()}`}>
                    {meta.tier}
                  </Badge>
                </div>

                <div className="practical-status-badge">
                  {meta.status === 'Completed' ? (
                    <span className="status-pill status-success">
                      <CheckCircle2 size={12} />
                      {meta.score}
                    </span>
                  ) : meta.status === 'In Progress' ? (
                    <span className="status-pill status-progress">
                      <Clock size={12} />
                      Current Session
                    </span>
                  ) : (
                    <span className="status-pill status-ready">
                      Ready
                    </span>
                  )}
                </div>
              </div>

              {/* Title & Aim */}
              <div className="practical-card-body">
                <h3 className="practical-card-title">{prac.title}</h3>
                <p className="practical-card-aim">{prac.aim}</p>
              </div>

              {/* Card Footer Info & Launch CTA */}
              <div className="practical-card-foot">
                <div className="practical-foot-meta">
                  <div className="foot-meta-item">
                    <span className="foot-meta-label">Est. Time</span>
                    <span className="foot-meta-val">{prac.avgTime || '35 Mins'}</span>
                  </div>
                  <div className="foot-meta-item">
                    <span className="foot-meta-label">NEP Level</span>
                    <span className="foot-meta-val">Level 5</span>
                  </div>
                </div>

                <Button
                  variant={isCurrent ? 'primary' : 'secondary'}
                  size="sm"
                  icon={isCurrent ? Play : ArrowUpRight}
                  onClick={() => onSelectPractical(prac)}
                >
                  {isCurrent ? 'Continue in IDE' : 'Open Workspace'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
