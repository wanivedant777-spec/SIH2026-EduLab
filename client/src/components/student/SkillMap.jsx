import React from 'react';
import { Target, CheckCircle, AlertCircle } from 'lucide-react';
import Badge from '../ui/Badge';

export default function SkillMap({ skills = [] }) {
  const hasData = Array.isArray(skills) && skills.length > 0;

  return (
    <div className="dashboard-section skill-map-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">Algorithmic Skill Map</h2>
          <p className="section-subtitle">
            Competency matrix aligned with NEP 2020 Level 5 Curriculum Invariants
          </p>
        </div>
        <div className="section-meta-tag">
          <Target size={13} color="var(--accent-text)" />
          <span>{hasData ? `${skills.length} Competencies Assessed` : 'Awaiting Evaluations'}</span>
        </div>
      </div>

      {!hasData ? (
        <div
          className="skill-map-empty-state"
          style={{
            padding: '50px 24px',
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '16px',
            border: '1px dashed rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '280px',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            <AlertCircle size={26} color="var(--accent-text)" />
          </div>
          <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
            No Evaluation Data Yet
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '420px', lineHeight: 1.6, margin: 0 }}>
            Algorithmic competencies and difficulty tiers are computed dynamically from your live compiler test passes and faculty-verified rubric scores. Complete practicals to generate your skill radar.
          </p>
        </div>
      ) : (
        (() => {
          const center = 110;
          const radius = 75;

          // Pad with canonical syllabus competencies if fewer than 3 skills assessed
          const canonicalPads = [
            { name: 'Linear Data Structures', category: 'Stacks & Queues', level: 0, tier: 'Pending', milestone: 'Next Lab in Syllabus' },
            { name: 'Algorithmic Invariants', category: 'Complexity Analysis', level: 0, tier: 'Pending', milestone: 'Next Lab in Syllabus' },
            { name: 'Sorting & Searching', category: 'Algorithms', level: 0, tier: 'Pending', milestone: 'Next Lab in Syllabus' },
          ];

          const radarSkills = [...skills];
          for (let i = 0; radarSkills.length < 3 && i < canonicalPads.length; i++) {
            if (!radarSkills.some((s) => s.name.toLowerCase().includes(canonicalPads[i].name.toLowerCase()))) {
              radarSkills.push(canonicalPads[i]);
            }
          }

          const numAxes = radarSkills.length;

          const radarPoints = radarSkills
            .map((s, idx) => {
              const angle = (idx / numAxes) * Math.PI * 2 - Math.PI / 2;
              // Minimum 5% radius for vertex visibility even if level is 0
              const r = Math.max(4, ((s.level || 0) / 100) * radius);
              const x = center + Math.cos(angle) * r;
              const y = center + Math.sin(angle) * r;
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(' ');

          return (
            <div className="skill-map-grid">
              {/* Visual Radar Widget */}
              <div className="skill-radar-container">
                <div className="radar-canvas-wrap">
                  <svg
                    className="skill-radar-svg"
                    viewBox="0 0 220 220"
                    width="220"
                    height="220"
                  >
                    {/* Concentric Guide Polygons */}
                    {[0.25, 0.5, 0.75, 1.0].map((level, i) => {
                      const ringPoints = radarSkills
                        .map((_, idx) => {
                          const angle = (idx / numAxes) * Math.PI * 2 - Math.PI / 2;
                          const r = level * radius;
                          const x = center + Math.cos(angle) * r;
                          const y = center + Math.sin(angle) * r;
                          return `${x.toFixed(1)},${y.toFixed(1)}`;
                        })
                        .join(' ');
                      return (
                        <polygon
                          key={i}
                          points={ringPoints}
                          fill="none"
                          stroke="rgba(255, 255, 255, 0.07)"
                          strokeWidth="1"
                        />
                      );
                    })}

                    {/* Axis Spoke Lines */}
                    {radarSkills.map((_, idx) => {
                      const angle = (idx / numAxes) * Math.PI * 2 - Math.PI / 2;
                      const x2 = center + Math.cos(angle) * radius;
                      const y2 = center + Math.sin(angle) * radius;
                      return (
                        <line
                          key={idx}
                          x1={center}
                          y1={center}
                          x2={x2}
                          y2={y2}
                          stroke="rgba(255, 255, 255, 0.08)"
                          strokeWidth="1"
                        />
                      );
                    })}

                    {/* Shaded Area Polygon */}
                    <polygon
                      points={radarPoints}
                      fill="rgba(94, 106, 210, 0.22)"
                      stroke="var(--accent)"
                      strokeWidth="2"
                    />

                    {/* Radar Data Vertex Dots */}
                    {radarSkills.map((s, idx) => {
                      const angle = (idx / numAxes) * Math.PI * 2 - Math.PI / 2;
                      const r = Math.max(4, ((s.level || 0) / 100) * radius);
                      const x = center + Math.cos(angle) * r;
                      const y = center + Math.sin(angle) * r;
                      return (
                        <circle
                          key={idx}
                          cx={x}
                          cy={y}
                          r={s.level > 0 ? '4' : '2.5'}
                          fill={s.level > 0 ? 'var(--accent-text)' : 'var(--text-muted)'}
                          stroke="#101216"
                          strokeWidth="1.5"
                        />
                      );
                    })}
                  </svg>
                </div>

                <div className="radar-meta-box">
                  <div className="radar-status-item">
                    <span className="radar-status-label">Dominant Vector</span>
                    <span className="radar-status-val">{skills[0]?.name || 'Data Structures'}</span>
                  </div>
                  <div className="radar-status-item">
                    <span className="radar-status-label">Assessed Topics</span>
                    <span className="radar-status-val">{skills.length} Evaluated</span>
                  </div>
                </div>
              </div>

              {/* Competency List Items */}
              <div className="skill-details-list">
                {skills.map((skill, i) => (
                  <div key={i} className="skill-detail-card">
                    <div className="skill-detail-top">
                      <div className="skill-name-wrap">
                        <span className="skill-name">{skill.name}</span>
                        <span className="skill-cat">{skill.category}</span>
                      </div>
                      <div className="skill-tier-wrap">
                        <Badge variant={`tier-${(skill.tier || 'proficient').toLowerCase()}`}>
                          {skill.tier || 'Proficient'}
                        </Badge>
                        <span className="skill-percentage">{skill.level}%</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="progress-track" style={{ marginTop: '8px', height: '5px' }}>
                      <div
                        className="progress-fill fill-accent"
                        style={{ width: `${skill.level}%` }}
                      />
                    </div>

                    <div className="skill-milestone-row">
                      <CheckCircle size={12} color="var(--success-text)" />
                      <span className="skill-milestone-text">{skill.milestone || 'Verified in Compiler'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}
