import React from 'react';
import { Code2, ArrowRight } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import TheoryPanel from './TheoryPanel';

export default function StudentLearningView({
  practical,
  practicals = [],
  onSelectPractical,
  onGoToWorkspace,
  selectedSubject: _selectedSubject,
}) {
  return (
    <div className="student-learning-view" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="Learning & Algorithmic Theory"
        subtitle="Curricular syllabus invariants, algorithmic specifications, pseudocode, and viva examination prep"
        badge={
          <Badge variant="primary" size="sm">
            AICTE / NEP 2020
          </Badge>
        }
        actions={
          practical && onGoToWorkspace ? (
            <Button
              variant="primary"
              size="sm"
              icon={Code2}
              iconRight={ArrowRight}
              onClick={() => onGoToWorkspace(practical)}
            >
              Open in Code Lab
            </Button>
          ) : null
        }
      />

      <div className="dashboard-container" style={{ paddingTop: '20px' }}>
        {/* Practical Picker Bar */}
        {practicals.length > 0 && (
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
              Select Experiment:
            </span>
            {practicals.map((p) => {
              const isSelected = p.id === practical?.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectPractical && onSelectPractical(p)}
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
                  {p.courseCode?.split(':')[0]} · {p.title?.split(':')[0]}
                </button>
              );
            })}
          </div>
        )}

        {/* Theory & Pedagogy Panel */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-xs)',
            minHeight: '520px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <TheoryPanel practical={practical} />
        </div>
      </div>
    </div>
  );
}
