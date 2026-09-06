import React, { useState } from 'react';
import { Award, Code2, BookOpen, MessageSquare, Save, Sparkles, User } from 'lucide-react';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

export default function GradingModal({
  isOpen,
  onClose,
  submission,
  onSaveGrade,
}) {
  const [writeupMarks, setWriteupMarks] = useState(submission?.writeupMarks || 4.5);
  const [vivaMarks, setVivaMarks] = useState(submission?.vivaMarks || 1.5);
  const [feedback, setFeedback] = useState(submission?.feedback || '');
  const [checklist, setChecklist] = useState({
    aim: true,
    algorithm: true,
    pseudocode: true,
    complexity: false,
  });

  if (!submission) return null;

  const codingMarks = Math.min(3.0, submission.codingMarks !== undefined ? submission.codingMarks : 3.0);
  const currentTotal = Math.min(10.0, Math.round((parseFloat(codingMarks) + parseFloat(writeupMarks) + parseFloat(vivaMarks)) * 10) / 10);

  const handleSave = () => {
    onSaveGrade(submission.id, {
      codingMarks,
      writeupMarks,
      vivaMarks,
      feedback,
      gradedBy: 'Dr. Radhika Sen',
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`10-Mark Rubric Evaluation · ${submission.studentName} (${submission.rollNumber})`}
      icon={Award}
      maxWidth="780px"
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Final Score:</span>
            <span
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {currentTotal} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/ 10.0</span>
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" onClick={onClose} size="sm">
              Cancel
            </Button>
            <Button variant="success" icon={Save} onClick={handleSave} size="sm">
              Submit Grade
            </Button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Student & Practical Context Header */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'var(--primary-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary-light)',
              }}
            >
              <User size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#ffffff' }}>
                {submission.studentName}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                Roll: {submission.rollNumber} • Practical: {submission.practicalTitle}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Badge tier={submission.adaptiveTier}>
              <Sparkles size={11} />
              {submission.adaptiveTier}
            </Badge>
            <Badge variant="cyan">{submission.languageName}</Badge>
          </div>
        </div>

        {/* 1. Component: Performing / Coding Performance (Auto 3M) */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '13px', color: '#ffffff' }}>
              <Code2 size={16} color="var(--primary-light)" />
              1. Performing / Coding (Auto-Graded)
            </div>
            <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--success-light)', fontFamily: 'var(--font-mono)' }}>
              {codingMarks} / 3.0 Marks
            </div>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
            Evaluated against test cases: {submission.passedCount || 3}/{submission.totalCount || 3} passed ({submission.passRate || 100}%).
            Solved in {submission.timeSpentMin || 20} minutes with {submission.focusBlurEvents || 0} window blur interruptions.
          </p>

          <div
            style={{
              background: '#070a12',
              borderRadius: 'var(--radius-xs)',
              padding: '10px 12px',
              border: '1px solid var(--border-subtle)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--text-code)',
              maxHeight: '100px',
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
            }}
          >
            {submission.sourceCode || '// C++20 Verified solution submitted by student'}
          </div>
        </div>

        {/* 2. Component: Write-Up Journal (5M) */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '13px', color: '#ffffff' }}>
              <BookOpen size={16} color="var(--purple-light)" />
              2. Lab Write-Up / Journal Completeness (Faculty Graded)
            </div>
            <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--purple-light)', fontFamily: 'var(--font-mono)' }}>
              {writeupMarks} / 5.0 Marks
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '10px 0' }}>
            <input
              type="range"
              min="0"
              max="5"
              step="0.5"
              value={writeupMarks}
              onChange={(e) => setWriteupMarks(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, minWidth: '40px', fontSize: '12.5px' }}>
              {writeupMarks} M
            </span>
          </div>

          {/* Checklist */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '10px' }}>
            {[
              { key: 'aim', label: 'Aim & Theoretical Prerequisites' },
              { key: 'algorithm', label: 'Step-by-step Algorithm' },
              { key: 'pseudocode', label: 'Flowchart & Pseudocode' },
              { key: 'complexity', label: 'Space & Time Complexity Analysis' },
            ].map((item) => (
              <label
                key={item.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11.5px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={checklist[item.key]}
                  onChange={(e) => setChecklist({ ...checklist, [item.key]: e.target.checked })}
                  style={{ accentColor: 'var(--accent)' }}
                />
                {item.label}
              </label>
            ))}
          </div>
        </div>

        {/* 3. Component: Viva Examination (2M) */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '13px', color: '#ffffff' }}>
              <MessageSquare size={15} color="var(--accent-text)" />
              3. Viva Voce Examination (Faculty Graded)
            </div>
            <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--accent-text)', fontFamily: 'var(--font-mono)' }}>
              {vivaMarks} / 2.0 Marks
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '10px 0' }}>
            <input
              type="range"
              min="0"
              max="2"
              step="0.5"
              value={vivaMarks}
              onChange={(e) => setVivaMarks(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, minWidth: '40px', fontSize: '12.5px' }}>
              {vivaMarks} M
            </span>
          </div>

          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', background: 'rgba(245, 158, 11, 0.08)', padding: '8px 12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--warning-border)' }}>
            Suggested prompt: <em>"Explain worst-case time complexity of BST insertion vs AVL balancing rotations."</em>
          </div>
        </div>

        {/* Feedback Area */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Faculty Feedback & Audit Note
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Add specific remarks on algorithmic efficiency, write-up clarity, or viva performance..."
            rows={2}
            style={{
              width: '100%',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-sm)',
              color: '#ffffff',
              padding: '10px',
              fontFamily: 'var(--font-sans)',
              fontSize: '12px',
              resize: 'vertical',
              outline: 'none',
            }}
          />
        </div>
      </div>
    </Modal>
  );
}
