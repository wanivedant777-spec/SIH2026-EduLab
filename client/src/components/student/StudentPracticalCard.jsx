import React from 'react';
import { Play, ArrowUpRight, CheckCircle2, Clock, FileCheck2, Search, Calendar } from 'lucide-react';
import Button from '../ui/Button';

export default function StudentPracticalCard({
  assignment,
  isCurrent = false,
  onSelectPractical,
}) {
  const practical = assignment?.practical;
  if (!practical) return null;

  const state = assignment.state || 'Not Started';
  const score = assignment.score; // Only non-null if graded
  const practicalNumber = practical.practicalNumber;
  const courseCode = practical.subjectCode || assignment.subjectCode || 'LAB';

  // Format Due Date
  const dueDateDisplay = assignment.dueDate
    ? `Due: ${new Date(assignment.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`
    : 'No deadline set';

  // Lifecycle State Badge Config
  const getStateBadge = () => {
    switch (state) {
      case 'Graded':
        return (
          <span className="lifecycle-badge badge-graded">
            <CheckCircle2 size={12} />
            <span>Graded {score ? `· ${score}` : ''}</span>
          </span>
        );
      case 'Under Review':
        return (
          <span className="lifecycle-badge badge-under-review">
            <Search size={12} />
            <span>Under Review</span>
          </span>
        );
      case 'Submitted':
        return (
          <span className="lifecycle-badge badge-submitted">
            <FileCheck2 size={12} />
            <span>Submitted</span>
          </span>
        );
      case 'In Progress':
        return (
          <span className="lifecycle-badge badge-in-progress">
            <Clock size={12} />
            <span>In Progress</span>
          </span>
        );
      case 'Not Started':
      default:
        return (
          <span className="lifecycle-badge badge-not-started">
            <span className="lifecycle-dot" />
            <span>Not Started</span>
          </span>
        );
    }
  };

  return (
    <div
      className={`student-practical-card ${isCurrent ? 'practical-card-active' : ''}`}
      id={`practical-card-${practical.id}`}
    >
      {/* Top Meta Bar */}
      <div className="practical-card-top">
        <div className="practical-code-row">
          <span className="practical-code-pill font-mono">
            {courseCode} · P{String(practicalNumber).padStart(2, '0')}
          </span>
          <span className={`difficulty-pill difficulty-${(practical.difficulty || 'Medium').toLowerCase()}`}>
            {practical.difficulty || 'Medium'}
          </span>
        </div>

        {/* State Badge */}
        <div className="practical-state-container">
          {getStateBadge()}
        </div>
      </div>

      {/* Main Details */}
      <div className="practical-card-content">
        <h3 className="practical-title">{practical.title}</h3>
        <p className="practical-aim">{practical.aim}</p>
      </div>

      {/* Footer Info & Workspace CTA */}
      <div className="practical-card-bottom">
        <div className="practical-footer-meta">
          <div className="footer-meta-due">
            <Calendar size={12} className="meta-icon" />
            <span>{dueDateDisplay}</span>
          </div>
          <div className="footer-meta-rubric">
            <span>Max Rubric: {practical.maxCodingMarks || 3.0}M Code / 10M Total</span>
          </div>
        </div>

        <Button
          variant={isCurrent ? 'primary' : 'secondary'}
          size="sm"
          icon={isCurrent ? Play : ArrowUpRight}
          onClick={() => {
            if (onSelectPractical) onSelectPractical(practical);
          }}
        >
          {isCurrent
            ? 'Continue in IDE'
            : state === 'Not Started'
            ? 'Open Workspace'
            : state === 'In Progress'
            ? 'Resume Code'
            : 'View Workspace'}
        </Button>
      </div>
    </div>
  );
}
