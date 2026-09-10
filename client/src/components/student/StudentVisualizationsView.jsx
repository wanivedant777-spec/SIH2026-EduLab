import React, { useState } from 'react';
import { Sparkles, Info, Code2, ArrowRight } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import Hero3DObject from './Hero3DObject';

export default function StudentVisualizationsView({
  practical,
  practicals = [],
  onSelectPractical,
  onGoToWorkspace,
}) {
  const [selectedPrac, setSelectedPrac] = useState(practical || practicals[0] || null);

  const activePractical = selectedPrac || practical;

  const handleSelect = (p) => {
    setSelectedPrac(p);
    if (onSelectPractical) onSelectPractical(p);
  };

  return (
    <div className="student-visualizations-view" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="Algorithmic Visualizations"
        subtitle="Interactive 3D spatial representations of data structures and algorithmic state invariants for curricular experiments"
        badge={
          <Badge variant="primary" size="sm" icon={Sparkles}>
            Interactive Canvas
          </Badge>
        }
        actions={
          activePractical && onGoToWorkspace ? (
            <Button
              variant="primary"
              size="sm"
              icon={Code2}
              iconRight={ArrowRight}
              onClick={() => onGoToWorkspace(activePractical)}
            >
              Open in Code Lab
            </Button>
          ) : null
        }
      />

      <div className="dashboard-container" style={{ paddingTop: '20px' }}>
        {/* Structure Selector */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Data Structure:
          </span>
          {practicals.map((p) => {
            const isSelected = p.id === activePractical?.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelect(p)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: isSelected ? '1px solid var(--primary-border)' : '1px solid var(--border-subtle)',
                  background: isSelected ? 'var(--primary-subtle)' : 'var(--bg-surface)',
                  color: isSelected ? 'var(--primary-text)' : 'var(--text-secondary)',
                  fontWeight: isSelected ? 600 : 500,
                  fontSize: '12px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {p.title?.split(':')[0] || p.title}
              </button>
            );
          })}
        </div>

        {/* 3D Canvas Card */}
        <Card surface="white" style={{ overflow: 'hidden' }}>
          <CardHeader>
            <div>
              <CardTitle as="h2" style={{ fontSize: '15px' }}>
                {activePractical?.title || 'Algorithmic State Machine'}
              </CardTitle>
              <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                Drag with cursor to rotate 3D geometry in XYZ planes. Invariants update in real time.
              </p>
            </div>
            <Badge variant="neutral" size="sm">
              60 FPS WebGL Engine
            </Badge>
          </CardHeader>
          <CardContent style={{ padding: '0', height: '440px', background: 'var(--bg-app)', position: 'relative' }}>
            <Hero3DObject practical={activePractical} />
          </CardContent>
        </Card>

        {/* Educational Note */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '14px 18px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <Info size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'block' }}>
              Spatial Pedagogical Representation: {activePractical?.title || 'Data Structure Topology'}
            </strong>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {activePractical?.aim
                ? `Algorithmic procedure: ${activePractical.aim}. Use this 3D visualization to observe spatial state transitions and verify invariants before running automated test cases in Code Lab.`
                : 'The 3D state visualizer projects memory structures and relational invariants into 3-space coordinates. Use this visualization to trace invariant bounds before stepping through test suites in the Code Lab.'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
