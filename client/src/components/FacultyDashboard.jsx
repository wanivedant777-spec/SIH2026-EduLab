import React, { useState } from 'react';
import { Users, Filter, CheckCircle, AlertTriangle, Search, Save, Award, BookOpen, Clock, FileText } from 'lucide-react';

const SAMPLE_SUBMISSIONS = [
  {
    id: 'sub_001',
    studentId: 'GHR2025AI001',
    studentName: 'Student 001',
    batch: 'C1',
    practicalTitle: 'BST Insertion & Inorder Traversal',
    submittedAt: '10 Mins ago',
    passPercentage: 100,
    marksPerforming: 3.0,
    marksWriting: 4.5,
    marksViva: 2.0,
    status: 'evaluated',
    tabSwitches: 1,
  },
  {
    id: 'sub_002',
    studentId: 'GHR2025AI002',
    studentName: 'Student 002',
    batch: 'C1',
    practicalTitle: 'BST Insertion & Inorder Traversal',
    submittedAt: '25 Mins ago',
    passPercentage: 100,
    marksPerforming: 3.0,
    marksWriting: 5.0,
    marksViva: 1.5,
    status: 'evaluated',
    tabSwitches: 0,
  },
  {
    id: 'sub_003',
    studentId: 'GHR2025AI021',
    studentName: 'Student 021',
    batch: 'C2',
    practicalTitle: 'BST Insertion & Inorder Traversal',
    submittedAt: '1 Hour ago',
    passPercentage: 66.7,
    marksPerforming: 2.0,
    marksWriting: 3.5,
    marksViva: 1.0,
    status: 'pending_review',
    tabSwitches: 6, // High focus-loss alert!
  },
  {
    id: 'sub_004',
    studentId: 'GHR2025AI041',
    studentName: 'Student 041',
    batch: 'C3',
    practicalTitle: 'BST Insertion & Inorder Traversal',
    submittedAt: 'Just now',
    passPercentage: 100,
    marksPerforming: 3.0,
    marksWriting: 0,
    marksViva: 0,
    status: 'pending_review',
    tabSwitches: 2,
  },
];

export default function FacultyDashboard({ user }) {
  const [selectedBatch, setSelectedBatch] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [submissions, setSubmissions] = useState(SAMPLE_SUBMISSIONS);
  const [successNotice, setSuccessNotice] = useState('');

  const handleMarkChange = (id, field, value) => {
    const num = Math.max(0, parseFloat(value) || 0);
    setSubmissions((prev) =>
      prev.map((sub) => {
        if (sub.id === id) {
          return { ...sub, [field]: num };
        }
        return sub;
      })
    );
  };

  const handleSaveMarks = (id) => {
    setSubmissions((prev) =>
      prev.map((sub) => (sub.id === id ? { ...sub, status: 'evaluated' } : sub))
    );
    setSuccessNotice(`Saved 10-mark evaluation for submission ${id}!`);
    setTimeout(() => setSuccessNotice(''), 3500);
  };

  const filteredSubmissions = submissions.filter((sub) => {
    const matchesBatch = selectedBatch === 'ALL' || sub.batch === selectedBatch;
    const matchesSearch =
      sub.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.studentName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesBatch && matchesSearch;
  });

  return (
    <div className="dashboard-container">
      {/* Faculty Profile Banner */}
      <div className="faculty-profile-banner">
        <div className="profile-banner-left">
          <div className="avatar-circle faculty-avatar">
            <span>{user.name?.charAt(0) || 'F'}</span>
          </div>
          <div>
            <h1 className="student-name">{user.name || 'Faculty Member'}</h1>
            <div className="student-tags">
              <span className="badge badge-primary">{user.identifier}</span>
              <span className="badge badge-faculty">FACULTY</span>
              <span className="badge badge-outline">Subject: Data Structures (CS201P)</span>
              <span className="badge badge-outline">Division C (Batches C1, C2, C3)</span>
            </div>
          </div>
        </div>

        <div className="profile-banner-right">
          <div className="academic-stat">
            <span className="stat-label">Total Division Capacity</span>
            <span className="stat-value">60 Students</span>
          </div>
          <div className="academic-stat">
            <span className="stat-label">Evaluations Done</span>
            <span className="stat-value text-accent">
              {submissions.filter((s) => s.status === 'evaluated').length} / {submissions.length}
            </span>
          </div>
        </div>
      </div>

      {successNotice && <div className="alert-box alert-info">{successNotice}</div>}

      {/* Batch Selector & Search Controls */}
      <div className="dashboard-controls-bar">
        <div className="batch-filter-pills">
          {['ALL', 'C1', 'C2', 'C3'].map((batch) => (
            <button
              key={batch}
              type="button"
              className={`filter-pill ${selectedBatch === batch ? 'active' : ''}`}
              onClick={() => setSelectedBatch(batch)}
            >
              {batch === 'ALL' ? 'All Batches (C1, C2, C3)' : `Batch ${batch}`}
            </button>
          ))}
        </div>

        <div className="search-box-wrapper">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by PRN or Student Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Grading Queue Table */}
      <div className="dashboard-content-card">
        <div className="section-header">
          <div>
            <h2 className="section-title">Practical Grading Queue</h2>
            <p className="section-subtitle">
              Official 10-Mark Rubric: Auto-calculated Performing (3M) + Writing Journal (5M) + Viva (2M).
            </p>
          </div>
        </div>

        <div className="table-responsive">
          <table className="grading-table">
            <thead>
              <tr>
                <th>Student (PRN)</th>
                <th>Batch</th>
                <th>Practical</th>
                <th>Performing (3M Auto)</th>
                <th>Writing (5M)</th>
                <th>Viva (2M)</th>
                <th>Total (10M)</th>
                <th>Focus Audit</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.map((sub) => {
                const total = Math.min(
                  10,
                  (sub.marksPerforming || 0) + (sub.marksWriting || 0) + (sub.marksViva || 0)
                );
                const hasHighFocusLoss = sub.tabSwitches >= 5;

                return (
                  <tr key={sub.id} className={hasHighFocusLoss ? 'row-flagged' : ''}>
                    <td>
                      <div className="student-cell">
                        <strong>{sub.studentId}</strong>
                        <span>{sub.studentName}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-accent">{sub.batch}</span>
                    </td>
                    <td>{sub.practicalTitle}</td>
                    <td>
                      <span className="marks-display auto">
                        {sub.marksPerforming.toFixed(1)} / 3.0
                      </span>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        step="0.5"
                        className="mark-input"
                        value={sub.marksWriting}
                        onChange={(e) => handleMarkChange(sub.id, 'marksWriting', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max="2"
                        step="0.5"
                        className="mark-input"
                        value={sub.marksViva}
                        onChange={(e) => handleMarkChange(sub.id, 'marksViva', e.target.value)}
                      />
                    </td>
                    <td>
                      <strong className="total-score-badge">{total.toFixed(1)} / 10</strong>
                    </td>
                    <td>
                      {hasHighFocusLoss ? (
                        <span className="audit-alert-tag">
                          <AlertTriangle size={12} />
                          {sub.tabSwitches} Blurs (Review)
                        </span>
                      ) : (
                        <span className="audit-ok-tag">
                          <CheckCircle size={12} />
                          {sub.tabSwitches} Blur
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn-save-evaluation"
                        onClick={() => handleSaveMarks(sub.id)}
                      >
                        <Save size={13} />
                        <span>Save</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
