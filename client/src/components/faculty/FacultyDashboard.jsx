import React, { useState, useMemo } from 'react';
import { Users, BookOpen, Plus, ClipboardList, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import SubmissionsQueue from './SubmissionsQueue';
import GradingModal from './GradingModal';
import Button from '../ui/Button';

export default function FacultyDashboard({ currentUser, facultyAllocations = [], submissions = [], practicals = [], isLoading = false, error = null, onRetry, onSaveGrade, onCreateAssignment }) {
  const [selectedAllocationKey, setSelectedAllocationKey] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [isGradingOpen, setIsGradingOpen] = useState(false);

  const subjects = useMemo(() => {
    const map = new Map();
    facultyAllocations.forEach((allocation) => {
      const subject = allocation.subjects;
      if (!subject) return;
      if (!map.has(subject.id)) map.set(subject.id, { ...subject, allocations: [] });
      map.get(subject.id).allocations.push(allocation);
    });
    return [...map.values()];
  }, [facultyAllocations]);

  const selectedSubject = subjects.find((subject) => subject.id === selectedAllocationKey) || null;
  const batches = selectedSubject?.allocations.map((a) => a.batches).filter(Boolean) || [];
  const [selectedBatchId, setSelectedBatchId] = useState('');

  const allocationReady = selectedSubject && selectedBatchId;
  const scopedPracticals = selectedSubject ? practicals.filter((p) => p.subjectId === selectedSubject.id) : [];
  const scopedSubmissions = submissions.filter((submission) => {
    if (!selectedSubject || !selectedBatchId) return false;
    return submission.batchId === selectedBatchId && submission.subjectId === selectedSubject.id;
  });

  const openGrading = (submission) => {
    setSelectedSubmission(submission);
    setIsGradingOpen(true);
  };

  if (isLoading && facultyAllocations.length === 0) {
    return <div className="dashboard-container"><div className="empty-state">Loading your assigned academic workspace…</div></div>;
  }

  return (
    <div className="faculty-portal-root">
      <div className="faculty-portal-container">
        {error && (
          <div className="db-error-banner">
            <div><strong>Unable to synchronize data.</strong><span>{error}</span></div>
            <Button variant="secondary" onClick={onRetry}>Retry</Button>
          </div>
        )}

        <header className="faculty-command-header">
          <div>
            <p className="section-kicker">Faculty Workspace</p>
            <h1 className="faculty-command-title">Assignments & Evaluation</h1>
            <p className="faculty-command-subtitle">Select one of your allocated subjects and then choose the batch you want to manage.</p>
          </div>
        </header>

        <section className="faculty-selection-panel">
          <div className="selection-step">
            <span className="selection-label">1. Subject</span>
            <div className="faculty-choice-grid">
              {subjects.map((subject) => (
                <button key={subject.id} type="button" className={'faculty-choice-card ' + (selectedSubject?.id === subject.id ? 'selected' : '')}
                  onClick={() => { setSelectedAllocationKey(subject.id); setSelectedBatchId(''); }}>
                  <BookOpen size={20} />
                  <div><strong>{subject.code}</strong><span>{subject.name}</span></div>
                  <ArrowRight size={16} />
                </button>
              ))}
            </div>
          </div>

          {selectedSubject && (
            <div className="selection-step">
              <span className="selection-label">2. Batch</span>
              <div className="batch-choice-row">
                {batches.map((batch) => (
                  <button key={batch.id} type="button" className={'batch-choice ' + (selectedBatchId === batch.id ? 'selected' : '')}
                    onClick={() => setSelectedBatchId(batch.id)}>{batch.name}</button>
                ))}
              </div>
            </div>
          )}
        </section>

        {allocationReady ? (
          <>
            <section className="faculty-workspace-summary">
              <div>
                <p className="section-kicker">Active Context</p>
                <h2>{selectedSubject.code} · {selectedSubject.name}</h2>
                <p>Batch {batches.find((batch) => batch.id === selectedBatchId)?.name}</p>
              </div>
              <Button variant="primary" icon={Plus} onClick={() => onCreateAssignment?.({ subject: selectedSubject, batchId: selectedBatchId, practicals: scopedPracticals })}>
                Create Assignment
              </Button>
            </section>

            <section className="faculty-metrics-banner">
              <div className="faculty-metric-card"><Users size={18} /><span>Students with submissions</span><strong>{new Set(scopedSubmissions.map((s) => s.studentId)).size}</strong></div>
              <div className="faculty-metric-card"><ClipboardList size={18} /><span>Submissions</span><strong>{scopedSubmissions.length}</strong></div>
              <div className="faculty-metric-card"><Clock size={18} /><span>Pending review</span><strong>{scopedSubmissions.filter((s) => s.status !== 'Graded').length}</strong></div>
              <div className="faculty-metric-card"><CheckCircle2 size={18} /><span>Graded</span><strong>{scopedSubmissions.filter((s) => s.status === 'Graded').length}</strong></div>
            </section>

            <SubmissionsQueue submissions={scopedSubmissions} onOpenGrading={openGrading} />
          </>
        ) : (
          <div className="faculty-empty-context"><BookOpen size={28} /><h3>Select a subject and batch</h3><p>Only your allocated subjects and batches can be managed from this workspace.</p></div>
        )}

        <GradingModal isOpen={isGradingOpen} onClose={() => setIsGradingOpen(false)} submission={selectedSubmission} onSave={onSaveGrade} />
      </div>
    </div>
  );
}
