import React from 'react';
import { Target, CheckCircle } from 'lucide-react';
import Badge from '../ui/Badge';


export default function SkillMap({ skills }) {
  const defaultSkills = [
    { name: 'Tree & Graph Algorithms', category: 'Data Structures', level: 94, tier: 'Advanced', milestone: 'Mastered AVL & BST Rotations' },
    { name: 'Pointers & Memory Mgmt', category: 'Systems', level: 92, tier: 'Advanced', milestone: 'Zero memory leaks in Valgrind' },
    { name: 'Complexity Analysis (Big-O)', category: 'Theory', level: 89, tier: 'Advanced', milestone: 'O(log N) optimal traversal proofs' },
    { name: 'Greedy & Graph Routing', category: 'Algorithms', level: 85, tier: 'Proficient', milestone: 'Dijkstra priority queue optimization' },
    { name: 'System & Concurrency', category: 'Operating Systems', level: 78, tier: 'Proficient', milestone: 'Round Robin preemptive scheduling' },
  ];

  const skillList = skills && skills.length ? skills : defaultSkills;

  // Radar Chart Calculations for SVG Polygon
  const center = 110;
  const radius = 75;
  const numAxes = skillList.length;

  // Generate radar polygon points from skill levels
  const radarPoints = skillList
    .map((s, idx) => {
      const angle = (idx / numAxes) * Math.PI * 2 - Math.PI / 2;
      const r = (s.level / 100) * radius;
      const x = center + Math.cos(angle) * r;
      const y = center + Math.sin(angle) * r;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

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
          <span>Adaptive Tier 1 Competency</span>
        </div>
      </div>

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
                const ringPoints = skillList
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
              {skillList.map((_, idx) => {
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
              {skillList.map((s, idx) => {
                const angle = (idx / numAxes) * Math.PI * 2 - Math.PI / 2;
                const r = (s.level / 100) * radius;
                const x = center + Math.cos(angle) * r;
                const y = center + Math.sin(angle) * r;
                return (
                  <circle
                    key={idx}
                    cx={x}
                    cy={y}
                    r="4"
                    fill="var(--accent-text)"
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
              <span className="radar-status-val">Trees & Graph Traversals</span>
            </div>
            <div className="radar-status-item">
              <span className="radar-status-label">Next AICTE Target</span>
              <span className="radar-status-val">AVL Self-Balancing</span>
            </div>
          </div>
        </div>

        {/* Competency List Items */}
        <div className="skill-details-list">
          {skillList.map((skill, i) => (
            <div key={i} className="skill-detail-card">
              <div className="skill-detail-top">
                <div className="skill-name-wrap">
                  <span className="skill-name">{skill.name}</span>
                  <span className="skill-cat">{skill.category}</span>
                </div>
                <div className="skill-tier-wrap">
                  <Badge variant={`tier-${skill.tier.toLowerCase()}`}>
                    {skill.tier}
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
                <span className="skill-milestone-text">{skill.milestone}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
