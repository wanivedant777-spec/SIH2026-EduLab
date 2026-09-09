import React from 'react';
import { Users, Check } from 'lucide-react';

export default function FacultyBatchSelector({
  batches = [],
  selectedBatch,
  onSelectBatch,
  isLoading = false,
}) {
  if (isLoading && batches.length === 0) {
    return (
      <div className="faculty-selector-skeleton-row">
        <div className="skeleton-pulse" style={{ height: '38px', width: '120px', borderRadius: '8px' }} />
        <div className="skeleton-pulse" style={{ height: '38px', width: '120px', borderRadius: '8px' }} />
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="faculty-empty-state-banner batch-empty">
        <div className="empty-state-icon">
          <Users size={16} />
        </div>
        <div className="empty-state-text">
          <span>No batches are currently allocated for this subject.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="faculty-batch-selector-wrap">
      <div className="selector-header-label">
        <Users size={13} />
        <span>SELECT ALLOCATED BATCH</span>
      </div>
      <div className="faculty-batch-chips-row" role="tablist">
        {batches.map((b) => {
          const isSelected = selectedBatch?.id === b.id;
          return (
            <button
              key={b.id}
              type="button"
              className={`faculty-batch-chip ${isSelected ? 'active' : ''}`}
              onClick={() => onSelectBatch(b)}
              role="tab"
              aria-selected={isSelected}
            >
              <span className="batch-chip-name">Batch {b.name}</span>
              {b.divisionName && <span className="batch-chip-meta">({b.divisionName})</span>}
              {isSelected && <Check size={13} className="batch-chip-check" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
