import React, { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

export default function CreateAssignmentModal({ isOpen, onClose, context, onCreate }) {
  const [title, setTitle] = useState('');
  const [practicalId, setPracticalId] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setPracticalId(context?.practicals?.[0]?.id || '');
    }
  }, [isOpen, context]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Assignment"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!title.trim() || !practicalId} onClick={() => onCreate({ title: title.trim(), practicalId })}>Create</Button></>}
    >
      <div className="assignment-form">
        <p>{context?.subject?.code} · {context?.subject?.name} · Batch {context?.batchName}</p>
        <label>Assignment title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter assignment title" />
        <label>Practical</label>
        <select value={practicalId} onChange={(e) => setPracticalId(e.target.value)}>
          {(context?.practicals || []).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
      </div>
    </Modal>
  );
}
