import React from 'react';
import { BookOpen, CheckCircle2, ArrowRight, Layers } from 'lucide-react';
import Button from '../ui/Button';

export default function StudentSubjectSelector({
  subjects = [],
  selectedSubjectId = null,
  onSelectSubject,
  isLoading = false,
}) {
  return (
    <section className="student-subject-selector-section" id="student-subject-selector">
      <div className="section-header">
        <div>
          <h2 className="section-title">Your Subjects</h2>
          <p className="section-subtitle">
            Curricular laboratory courses backed by active institutional practical records.
          </p>
        </div>
        <div className="section-meta-tag">
          <BookOpen size={13} color="var(--accent-text)" />
          <span>{subjects.length} Active {subjects.length === 1 ? 'Subject' : 'Subjects'}</span>
        </div>
      </div>

      {isLoading ? (
        <div className="subject-cards-loading">
          <div className="skeleton-card" />
          <div className="skeleton-card" />
        </div>
      ) : subjects.length === 0 ? (
        <div className="subject-empty-state">
          <Layers size={32} color="var(--accent-text)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '4px', fontSize: '15px' }}>
            No Active Subjects Available
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
            No laboratory courses with active practical experiments were found in the database.
          </p>
        </div>
      ) : (
        <div className="subject-cards-grid">
          {subjects.map((subj) => {
            const isSelected = subj.id === selectedSubjectId;

            return (
              <div
                key={subj.id}
                id={`subject-card-${subj.code}`}
                className={`subject-card ${isSelected ? 'subject-card-selected' : ''}`}
                onClick={() => {
                  if (onSelectSubject) onSelectSubject(subj);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (onSelectSubject) onSelectSubject(subj);
                  }
                }}
              >
                {/* Top Badge Row */}
                <div className="subject-card-top">
                  <div className="subject-code-tag">
                    <span className="code-text">{subj.code}</span>
                  </div>

                  <div className="subject-meta-badges">
                    {subj.semester && (
                      <span className="semester-pill">Semester {subj.semester}</span>
                    )}
                    <span className="practical-count-pill">
                      <Layers size={11} />
                      {subj.practicalCount} {subj.practicalCount === 1 ? 'Practical' : 'Practicals'}
                    </span>
                  </div>
                </div>

                {/* Subject Title */}
                <div className="subject-card-body">
                  <h3 className="subject-name">{subj.name}</h3>
                  <p className="subject-summary">
                    {subj.practicalCount} curriculum-accredited practical {subj.practicalCount === 1 ? 'module' : 'modules'} with live compiler sandbox and AICTE rubric grading.
                  </p>
                </div>

                {/* Bottom CTA Action */}
                <div className="subject-card-footer">
                  {isSelected ? (
                    <div className="selected-indicator-row">
                      <span className="selected-pill">
                        <CheckCircle2 size={13} />
                        Active Selection
                      </span>
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={ArrowRight}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectSubject) onSelectSubject(subj);
                      }}
                    >
                      Select Subject
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
