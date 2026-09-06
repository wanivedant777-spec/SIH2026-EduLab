import React from 'react';
import { BookOpen, Award, Check, Clock, Zap } from 'lucide-react';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

export default function PracticalModal({
  isOpen,
  onClose,
  practicals = [],
  activePracticalId,
  onSelectPractical,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assigned Lab Practicals (Curricular Syllabus)"
      icon={BookOpen}
      maxWidth="740px"
      footer={
        <Button variant="secondary" onClick={onClose} size="sm">
          Close
        </Button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '4px' }}>
          Select an assigned practical to load its pedagogical theory, starter templates, and parameterized test cases.
        </p>

        {practicals.map((prac) => {
          const isSelected = prac.id === activePracticalId;

          return (
            <div
              key={prac.id}
              onClick={() => {
                onSelectPractical(prac);
                onClose();
              }}
              style={{
                background: isSelected ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
                boxShadow: isSelected ? '0 0 16px var(--primary-glow)' : 'none',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
              className="glass-card-interactive"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                    {prac.courseCode}
                  </span>
                  <Badge variant="cyan">{prac.category}</Badge>
                  <Badge variant="nep">
                    <Award size={11} />
                    {prac.nepLevel}
                  </Badge>
                </div>

                {isSelected ? (
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--success-light)',
                    }}
                  >
                    <Check size={14} /> Active In Editor
                  </span>
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--primary-light)', fontWeight: 600 }}>
                    Load Practical →
                  </span>
                )}
              </div>

              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>
                {prac.title}
              </h3>

              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                {prac.aim}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} /> {prac.avgTime}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Zap size={12} color="var(--warning-light)" /> {prac.difficulty}
                </span>
                <span style={{ color: 'var(--primary-light)', fontWeight: 500 }}>
                  Rubric: 3 Performing + 5 Writing + 2 Viva
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
