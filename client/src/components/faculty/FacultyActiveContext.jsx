import React from 'react';
import { Plus } from 'lucide-react';
import Button from '../ui/Button';

export default function FacultyActiveContext({
  subject,
  batch,
  assignmentsCount = 0,
  submissionsCount = 0,
  onOpenCreateAssignment,
}) {
  if (!subject || !batch) return null;

  return (
    <div className="faculty-active-context-banner">
      <div className="active-context-left">
        <div className="active-context-tag">
          <span className="context-indicator-dot" />
          <span>ACTIVE ACADEMIC CONTEXT</span>
        </div>
        <div className="active-context-headline">
          <span className="context-subject-name">{subject.name}</span>
          <span className="context-divider">·</span>
          <span className="context-subject-code">{subject.code}</span>
          <span className="context-divider">·</span>
          <span className="context-batch-name">Batch {batch.name}</span>
        </div>
        <div className="active-context-subtext">
          <span>{subject.semester ? `Semester ${subject.semester}` : 'Curricular Lab'}</span>
          <span className="bullet-sep">•</span>
          <span>AICTE 10-Mark Rubric Assessment</span>
          {batch.divisionName && (
            <>
              <span className="bullet-sep">•</span>
              <span>Division {batch.divisionName}</span>
            </>
          )}
        </div>
      </div>

      <div className="active-context-right">
        <div className="active-context-stats">
          <div className="context-stat-item">
            <span className="context-stat-val">{assignmentsCount}</span>
            <span className="context-stat-lbl">Assignments</span>
          </div>
          <div className="context-stat-divider" />
          <div className="context-stat-item">
            <span className="context-stat-val">{submissionsCount}</span>
            <span className="context-stat-lbl">Submissions</span>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={onOpenCreateAssignment}
          title="Create a new practical assignment for this batch"
        >
          Assign Practical
        </Button>
      </div>
    </div>
  );
}
