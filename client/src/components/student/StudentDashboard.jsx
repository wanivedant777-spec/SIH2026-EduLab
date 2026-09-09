import React from 'react';
import { AlertTriangle, RefreshCw, Layers } from 'lucide-react';
import Button from '../ui/Button';
import StudentProfileCard from './StudentProfileCard';
import StudentSubjectSelector from './StudentSubjectSelector';
import StudentSubjectView from './StudentSubjectView';

export default function StudentDashboard({
  currentUser,
  studentProfile,
  subjects = [],
  selectedSubject = null,
  onSelectSubject,
  assignments = [],
  currentPractical = null,
  isLoading = false,
  isLoadingSubjects = false,
  error = null,
  onRetry,
  onSelectPractical,
}) {
  const studentBatchName = studentProfile?.batchName || currentUser?.batchName || 'Your Batch';

  return (
    <div className="student-dashboard-page" id="student-dashboard-root">
      <div className="dashboard-container">
        {/* Error state banner if Supabase sync fails */}
        {error && (
          <div
            className="db-error-banner"
            style={{
              background: 'var(--danger-subtle)',
              border: '1px solid var(--danger-border)',
              borderRadius: 'var(--radius-md)',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertTriangle size={20} color="var(--danger-text)" />
              <div>
                <strong style={{ color: 'var(--text-primary)', fontSize: '13.5px', display: 'block' }}>
                  Database Synchronization Notice
                </strong>
                <span style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}>{error}</span>
              </div>
            </div>
            {onRetry && (
              <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRetry}>
                Retry Sync
              </Button>
            )}
          </div>
        )}

        {/* 1. Read-Only Institutional Profile */}
        <StudentProfileCard
          profile={studentProfile}
          currentUser={currentUser}
        />

        {/* 2. Subject-First Flow: "Your Subjects" */}
        <StudentSubjectSelector
          subjects={subjects}
          selectedSubjectId={selectedSubject?.id}
          onSelectSubject={onSelectSubject}
          isLoading={isLoadingSubjects}
        />

        {/* 3. Batch-Assigned Practicals View */}
        {selectedSubject ? (
          <StudentSubjectView
            selectedSubject={selectedSubject}
            studentBatchName={studentBatchName}
            assignments={assignments}
            currentPracticalId={currentPractical?.id}
            onSelectPractical={onSelectPractical}
            isLoading={isLoading}
          />
        ) : (
          <div className="subject-selection-prompt">
            <Layers size={28} color="var(--text-muted)" style={{ margin: '0 auto 10px' }} />
            <h3 style={{ color: 'var(--text-primary)', fontSize: '14.5px', marginBottom: '4px' }}>
              No Subject Selected
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
              {subjects.length > 0
                ? 'Select a subject from "Your Subjects" above to view its allocated laboratory practicals.'
                : 'No data available yet.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
