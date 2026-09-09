import React from 'react';
import { BookOpen, CheckCircle2 } from 'lucide-react';

export default function FacultySubjectSelector({
  subjects = [],
  selectedSubject,
  onSelectSubject,
  isLoading = false,
}) {
  if (isLoading && subjects.length === 0) {
    return (
      <div className="faculty-selector-skeleton-row">
        <div className="skeleton-pulse" style={{ height: '56px', borderRadius: '10px', flex: 1 }} />
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="faculty-empty-state-banner">
        <div className="empty-state-icon">
          <BookOpen size={20} />
        </div>
        <div className="empty-state-text">
          <strong>No Allocated Subjects</strong>
          <span>No subjects are currently allocated to your account.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="faculty-subject-selector-wrap">
      <div className="selector-header-label">
        <BookOpen size={14} />
        <span>SELECT ALLOCATED SUBJECT</span>
      </div>
      <div className="faculty-subject-grid">
        {subjects.map((subj) => {
          const isSelected = selectedSubject?.id === subj.id;
          return (
            <button
              key={subj.id}
              type="button"
              className={`faculty-subject-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectSubject(subj)}
            >
              <div className="subject-card-left">
                <div className="subject-code-badge">{subj.code}</div>
                <div className="subject-text-col">
                  <span className="subject-name">{subj.name}</span>
                  <span className="subject-meta">
                    {subj.semester ? `Semester ${subj.semester}` : 'Curricular Lab'}
                    {subj.batchCount ? ` · ${subj.batchCount} Allocated Cohorts` : ''}
                  </span>
                </div>
              </div>

              {isSelected && (
                <div className="subject-selected-indicator" title="Active Subject">
                  <CheckCircle2 size={16} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
