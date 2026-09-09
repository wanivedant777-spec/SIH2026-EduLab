import React from 'react';
import { BookOpen, Calendar, Clock, FileText, Plus } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

export default function FacultyAssignmentsSection({
  assignments = [],
  isLoading = false,
  onOpenCreateAssignment,
}) {
  if (isLoading && assignments.length === 0) {
    return (
      <div className="faculty-assignments-section">
        <div className="section-head-row">
          <div className="section-title-wrap">
            <FileText size={15} />
            <h3>Batch Assignments</h3>
          </div>
        </div>
        <div className="skeleton-pulse" style={{ height: '90px', borderRadius: '12px' }} />
      </div>
    );
  }

  return (
    <div className="faculty-assignments-section">
      <div className="section-head-row">
        <div className="section-title-wrap">
          <FileText size={15} />
          <h3>Batch Assignments</h3>
          <span className="section-count-tag">{assignments.length}</span>
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={Plus}
          onClick={onOpenCreateAssignment}
        >
          New Assignment
        </Button>
      </div>

      {assignments.length === 0 ? (
        <div className="faculty-empty-state-banner">
          <div className="empty-state-icon">
            <BookOpen size={20} />
          </div>
          <div className="empty-state-text">
            <strong>No Assignments Created</strong>
            <span>No assignments have been created for this batch yet.</span>
          </div>
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={onOpenCreateAssignment}
          >
            Create First Assignment
          </Button>
        </div>
      ) : (
        <div className="faculty-assignments-grid">
          {assignments.map((assign) => {
            const formattedCreated = assign.createdAt
              ? new Date(assign.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
              : 'Recently';
            const formattedDue = assign.dueAt
              ? new Date(assign.dueAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
              : 'No due date';

            return (
              <div key={assign.id} className="faculty-assignment-card">
                <div className="assignment-card-top">
                  <div className="assignment-header-left">
                    <span className="assignment-practical-badge">
                      {assign.practicalNumber ? `Practical 0${assign.practicalNumber}` : 'Practical Lab'}
                    </span>
                    <Badge variant={assign.status === 'active' ? 'success' : 'neutral'}>
                      {assign.status || 'Active'}
                    </Badge>
                  </div>
                  <div className="assignment-submissions-pill" title="Submissions received for this assignment">
                    <span className="submissions-count-num">{assign.submissionCount}</span>
                    <span className="submissions-count-lbl">Submissions</span>
                  </div>
                </div>

                <h4 className="assignment-card-title">{assign.title}</h4>
                <p className="assignment-practical-subtitle">{assign.practicalTitle}</p>

                <div className="assignment-card-footer">
                  <div className="assignment-meta-item">
                    <Calendar size={12} />
                    <span>Assigned: {formattedCreated}</span>
                  </div>
                  <div className="assignment-meta-item">
                    <Clock size={12} />
                    <span>Due: {formattedDue}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
