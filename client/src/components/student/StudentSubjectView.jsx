import React from 'react';
import { BookOpen, Layers, Inbox } from 'lucide-react';
import StudentPracticalCard from './StudentPracticalCard';

export default function StudentSubjectView({
  selectedSubject,
  studentBatchName = 'Your Batch',
  assignments = [],
  currentPracticalId = null,
  onSelectPractical,
  isLoading = false,
}) {
  if (!selectedSubject) return null;

  const subjectHeading = `${selectedSubject.code ? selectedSubject.code + ': ' : ''}${selectedSubject.name || 'Subject'}`;
  const countLabel = `${assignments.length} ${assignments.length === 1 ? 'Assigned Practical' : 'Assigned Practicals'}`;

  return (
    <div className="student-subject-view" id="student-subject-view">
      {/* Header Bar */}
      <div className="subject-view-header">
        <div className="subject-view-title-group">
          <div className="subject-context-badge">
            <BookOpen size={13} className="subject-context-icon" />
            <span>Curricular Laboratory Course</span>
          </div>
          <h2 className="subject-view-title">{subjectHeading}</h2>
          <p className="subject-view-subtitle">
            Curricular practical assignments allocated to <span className="highlight-batch-name">{studentBatchName}</span>
          </p>
        </div>

        <div className="subject-view-badges">
          <span className="batch-context-pill">
            <Layers size={12} />
            <span>{studentBatchName}</span>
          </span>
          <span className="assignments-count-tag font-mono">
            {countLabel}
          </span>
        </div>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="assignments-loading-state">
          <div className="skeleton-assignment-card" />
          <div className="skeleton-assignment-card" />
        </div>
      ) : assignments.length === 0 ? (
        <div className="assignments-empty-state" id="assignments-empty-state">
          <div className="empty-state-icon-circle">
            <Inbox size={26} color="var(--accent-text)" />
          </div>
          <h3 className="empty-state-title">No Practicals Assigned</h3>
          <p className="empty-state-text">
            No laboratory practicals have been assigned to <strong>{studentBatchName}</strong> for{' '}
            <strong>{selectedSubject.name || selectedSubject.code}</strong> yet.
          </p>
          <span className="empty-state-hint">
            When your course instructor assigns experiments to your batch, they will appear here automatically.
          </span>
        </div>
      ) : (
        <div className="assigned-practicals-grid">
          {assignments.map((assignment) => {
            const isCurrent = assignment.practicalId === currentPracticalId;

            return (
              <StudentPracticalCard
                key={assignment.assignmentId || assignment.practicalId}
                assignment={assignment}
                isCurrent={isCurrent}
                onSelectPractical={onSelectPractical}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
