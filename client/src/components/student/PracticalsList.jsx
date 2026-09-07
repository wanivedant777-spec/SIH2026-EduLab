import React from 'react';
import { BookOpen, ArrowUpRight, CheckCircle2, Clock, Play, AlertCircle } from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

export default function PracticalsList({ practicals = [], submissions = [], currentPracticalId, onSelectPractical }) {
  const getPracticalMeta = (prac) => {
    const isCurrent = prac.id === currentPracticalId;
    const sub = submissions.find((s) => s.practicalId === prac.id);

    if (sub) {
      const isGraded = sub.status === 'Graded';
      return {
        status: isGraded ? 'Evaluated' : 'Completed',
        statusVariant: 'success',
        score: isGraded ? `${sub.totalMarks} / 10.0 M` : `${sub.codingMarks} / 3.0 M`,
        tier: sub.adaptiveTier || 'Proficient',
        isCurrent,
      };
    }

    if (isCurrent) {
      return {
        status: 'In Progress',
        statusVariant: 'warning',
        score: 'Active',
        tier: prac.difficulty === 'Hard' ? 'Advanced' : 'Proficient',
        isCurrent: true,
      };
    }

    return {
      status: 'Ready',
      statusVariant: 'default',
      score: 'Not Attempted',
      tier: prac.difficulty === 'Hard' ? 'Advanced' : 'Proficient',
      isCurrent: false,
    };
  };

  return (
    <div className="dashboard-section practicals-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">Curricular Practicals</h2>
          <p className="section-subtitle">
            AICTE &amp; NEP 2020 Accredited Lab Syllabus · CS201P Data Structures &amp; Algorithms
          </p>
        </div>
        <div className="section-meta-tag">
          <BookOpen size={13} color="var(--accent-text)" />
          <span>{practicals.length} Experiments Linked</span>
        </div>
      </div>

      {practicals.length === 0 ? (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '16px',
          border: '1px dashed rgba(255, 255, 255, 0.1)',
        }}>
          <AlertCircle size={32} color="var(--accent-text)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ color: '#fff', marginBottom: '6px' }}>No Practicals Found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            No curricular practicals are linked for this subject in the live database.
          </p>
        </div>
      ) : (
        <div className="practicals-grid">
          {practicals.map((prac) => {
            const meta = getPracticalMeta(prac);
            const isCurrent = meta.isCurrent;
            const coursePrefix = (prac.courseCode || 'CS201P').split(':')[0];

            return (
              <div
                key={prac.id}
                className={`practical-card ${isCurrent ? 'practical-card-current' : ''}`}
              >
                {/* Card Header */}
                <div className="practical-card-head">
                  <div className="practical-badges">
                    <span className="practical-code">{coursePrefix}</span>
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
                    {meta.status === 'Completed' || meta.status === 'Evaluated' ? (
                      <span className="status-pill status-success">
                        <CheckCircle2 size={12} />
                        {meta.score}
                      </span>
                    ) : meta.status === 'In Progress' ? (
                      <span className="status-pill status-progress">
                        <Clock size={12} />
                        Current
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
                      <span className="foot-meta-val">{prac.avgTime || '30 Mins'}</span>
                    </div>
                    <div className="foot-meta-item">
                      <span className="foot-meta-label">NEP Level</span>
                      <span className="foot-meta-val">{prac.nepLevel?.split('(')[0] || 'Level 5'}</span>
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
      )}
    </div>
  );
}
