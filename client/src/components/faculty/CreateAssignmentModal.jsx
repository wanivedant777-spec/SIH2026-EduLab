import React, { useState } from 'react';
import { PlusCircle, AlertCircle } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

export default function CreateAssignmentModal({
  isOpen,
  onClose,
  subject,
  batch,
  practicals = [],
  onSubmitAssignment,
}) {
  const [selectedPracticalId, setSelectedPracticalId] = useState(
    practicals.length > 0 ? practicals[0].id : ''
  );
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Update title suggestion when practical changes
  const handlePracticalChange = (e) => {
    const pracId = e.target.value;
    setSelectedPracticalId(pracId);
    const matched = practicals.find((p) => p.id === pracId);
    if (matched && !title) {
      setTitle(matched.title || '');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!selectedPracticalId) {
      setFormError('Please select a practical to assign.');
      return;
    }

    const matched = practicals.find((p) => p.id === selectedPracticalId);
    const finalTitle = title.trim() || matched?.title || 'Practical Assignment';

    setIsSubmitting(true);
    try {
      await onSubmitAssignment({
        practicalId: selectedPracticalId,
        title: finalTitle,
        dueAt: dueDate ? new Date(dueDate).toISOString() : null,
      });
      setTitle('');
      setDueDate('');
      onClose();
    } catch (err) {
      setFormError(err.message || 'Failed to create assignment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Batch Practical Assignment"
      icon={PlusCircle}
      maxWidth="580px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting} size="sm">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting || practicals.length === 0}
            size="sm"
          >
            Assign to Batch {batch?.name}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="create-assignment-form">
        {formError && (
          <div className="form-error-callout" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--danger-subtle)',
            border: '1px solid var(--danger-border)',
            borderRadius: '8px',
            padding: '10px 14px',
            color: 'var(--danger-text)',
            fontSize: '12.5px',
            marginBottom: '16px',
          }}>
            <AlertCircle size={15} />
            <span>{formError}</span>
          </div>
        )}

        {/* Locked Academic Context (Read-only) */}
        <div className="assignment-form-context-box" style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          padding: '12px 14px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
              Target Subject &amp; Cohort
            </span>
            <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>
              {subject?.code}: {subject?.name}
            </strong>
          </div>
          <div style={{
            background: 'var(--primary-soft)',
            color: 'var(--primary-light)',
            padding: '4px 10px',
            borderRadius: '6px',
            fontWeight: 700,
            fontSize: '12.5px',
          }}>
            Batch {batch?.name}
          </div>
        </div>

        {/* Practical Selector */}
        <div className="form-field-group" style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Select Practical <span style={{ color: 'var(--danger-text)' }}>*</span>
          </label>
          {practicals.length === 0 ? (
            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', padding: '8px 0' }}>
              No practicals cataloged for this subject yet.
            </div>
          ) : (
            <select
              value={selectedPracticalId}
              onChange={handlePracticalChange}
              style={{
                width: '100%',
                padding: '9px 12px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-medium)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
              }}
              required
            >
              {practicals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.practicalNumber ? `Practical 0${p.practicalNumber}: ` : ''}{p.title}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Assignment Title */}
        <div className="form-field-group" style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Assignment Title (Optional override)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Practical 01: Find Largest Element (Graded Lab)"
            style={{
              width: '100%',
              padding: '9px 12px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-medium)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none',
            }}
          />
        </div>

        {/* Due Date */}
        <div className="form-field-group" style={{ marginBottom: '8px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Due Date (Optional)
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-medium)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
