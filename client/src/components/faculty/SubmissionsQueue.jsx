import React, { useState, useMemo } from 'react';
import {
  Search,
  ShieldAlert,
  ShieldCheck,
  Filter,
  ArrowUpDown,
  BookOpen,
  Code2,
  FileText,
  MessageSquare
} from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

export default function SubmissionsQueue({
  submissions = [],
  onOpenGrading,
  onOpenAuditLogs,
  initialFilter = 'all',
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialFilter); // 'all' | 'pending' | 'graded' | 'flagged'
  const [practicalFilter, setPracticalFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [sortBy, setSortBy] = useState('time'); // 'time' | 'total' | 'prn' | 'integrity'
  const [sortOrder, setSortOrder] = useState('desc');

  // Filter & Search Logic
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      const q = searchQuery.toLowerCase().trim();
      const prn = (sub.prn || '').toLowerCase();
      const name = (sub.studentName || '').toLowerCase();
      const roll = (sub.rollNumber || '').toLowerCase();
      const prac = (sub.practicalTitle || '').toLowerCase();

      const matchesSearch = !q || prn.includes(q) || name.includes(q) || roll.includes(q) || prac.includes(q);

      // Status filter
      let matchesStatus = true;
      if (statusFilter === 'pending') {
        matchesStatus = sub.status !== 'Graded';
      } else if (statusFilter === 'graded') {
        matchesStatus = sub.status === 'Graded';
      } else if (statusFilter === 'flagged') {
        matchesStatus = (sub.focusBlurEvents || 0) > 0;
      }

      // Practical filter
      const matchesPractical =
        practicalFilter === 'all' || (sub.practicalId && sub.practicalId.includes(practicalFilter));

      // Tier filter
      const matchesTier =
        tierFilter === 'all' || (sub.adaptiveTier && sub.adaptiveTier.toLowerCase() === tierFilter.toLowerCase());

      return matchesSearch && matchesStatus && matchesPractical && matchesTier;
    });
  }, [submissions, searchQuery, statusFilter, practicalFilter, tierFilter]);

  // Sort logic
  const sortedSubmissions = useMemo(() => {
    return [...filteredSubmissions].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'total') {
        comparison = (a.totalMarks || 0) - (b.totalMarks || 0);
      } else if (sortBy === 'prn') {
        comparison = (a.prn || '').localeCompare(b.prn || '');
      } else if (sortBy === 'integrity') {
        comparison = (a.focusBlurEvents || 0) - (b.focusBlurEvents || 0);
      } else {
        // default time / id
        comparison = (a.id || '').localeCompare(b.id || '');
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredSubmissions, sortBy, sortOrder]);

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const pendingCount = submissions.filter((s) => s.status !== 'Graded').length;
  const gradedCount = submissions.filter((s) => s.status === 'Graded').length;
  const flaggedCount = submissions.filter((s) => (s.focusBlurEvents || 0) > 0).length;

  return (
    <div className="faculty-queue-card">
      {/* Queue Toolbar: Search, Filters & Stats */}
      <div className="queue-toolbar">
        <div className="queue-title-wrap">
          <div className="queue-title-row">
            <h2 className="queue-title">Evaluation &amp; Submissions Queue</h2>
            <span className="queue-count-badge">
              {sortedSubmissions.length} of {submissions.length} Records
            </span>
          </div>
          <p className="queue-subtitle">
            Permanent Registration Number (PRN) verified queue with 10-mark AICTE rubric assessment
          </p>
        </div>

        <div className="queue-controls-cluster">
          {/* Search Box */}
          <div className="queue-search-box">
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search PRN, student, roll, or practical..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="queue-search-input"
            />
          </div>

          {/* Practical Filter Dropdown */}
          <select
            value={practicalFilter}
            onChange={(e) => setPracticalFilter(e.target.value)}
            className="queue-select-filter"
            title="Filter by assigned practical"
          >
            <option value="all">All Experiments</option>
            <option value="bst">Practical 04: BST &amp; Traversal</option>
            <option value="avl">Practical 05: AVL Balancing</option>
            <option value="dijkstra">Practical 06: Dijkstra Routing</option>
            <option value="scheduling">Practical 02: CPU Scheduling</option>
          </select>

          {/* Tier Filter Dropdown */}
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="queue-select-filter"
            title="Filter by adaptive difficulty tier"
          >
            <option value="all">All Tiers</option>
            <option value="advanced">Advanced Tier</option>
            <option value="proficient">Proficient Tier</option>
            <option value="beginner">Beginner Tier</option>
          </select>
        </div>
      </div>

      {/* Segmented Status Pill Bar */}
      <div className="queue-status-bar">
        <div className="status-pills-group">
          <button
            type="button"
            className={`queue-pill-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All Submissions ({submissions.length})
          </button>
          <button
            type="button"
            className={`queue-pill-btn ${statusFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setStatusFilter('pending')}
          >
            Pending Evaluations ({pendingCount})
          </button>
          <button
            type="button"
            className={`queue-pill-btn ${statusFilter === 'graded' ? 'active' : ''}`}
            onClick={() => setStatusFilter('graded')}
          >
            Graded ({gradedCount})
          </button>
          <button
            type="button"
            className={`queue-pill-btn pill-flagged ${statusFilter === 'flagged' ? 'active' : ''}`}
            onClick={() => setStatusFilter('flagged')}
          >
            Flagged Integrity ({flaggedCount})
          </button>
        </div>

        <div className="sort-hint">
          <Filter size={12} color="var(--text-muted)" />
          <span>Showing {sortedSubmissions.length} results</span>
        </div>
      </div>

      {/* Main Table View */}
      <div className="queue-table-container">
        <table className="faculty-queue-table">
          <thead>
            <tr>
              <th onClick={() => toggleSort('prn')} className="sortable-th" style={{ width: '135px' }}>
                <div className="th-content">
                  <span>PRN</span>
                  <ArrowUpDown size={11} />
                </div>
              </th>
              <th>Student</th>
              <th>Practical</th>
              <th style={{ textAlign: 'center', width: '100px' }}>
                <div className="th-content center">
                  <Code2 size={12} color="var(--primary-light)" />
                  <span>Coding (5M)</span>
                </div>
              </th>
              <th style={{ textAlign: 'center', width: '90px' }}>
                <div className="th-content center">
                  <FileText size={12} color="var(--cyan-light)" />
                  <span>Writing (3M)</span>
                </div>
              </th>
              <th style={{ textAlign: 'center', width: '85px' }}>
                <div className="th-content center">
                  <MessageSquare size={12} color="var(--warning-light)" />
                  <span>Viva (2M)</span>
                </div>
              </th>
              <th onClick={() => toggleSort('total')} className="sortable-th" style={{ textAlign: 'center', width: '105px' }}>
                <div className="th-content center">
                  <span>Total (10M)</span>
                  <ArrowUpDown size={11} />
                </div>
              </th>
              <th onClick={() => toggleSort('integrity')} className="sortable-th" style={{ width: '130px' }}>
                <div className="th-content">
                  <span>Integrity</span>
                  <ArrowUpDown size={11} />
                </div>
              </th>
              <th style={{ textAlign: 'right', width: '120px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedSubmissions.length === 0 ? (
              <tr>
                <td colSpan={9} className="queue-empty-cell">
                  <div className="queue-empty-state">
                    <BookOpen size={24} color="var(--text-muted)" />
                    <span className="empty-title">No submissions match the current filters</span>
                    <span className="empty-desc">Try clearing your search query or switching status filters</span>
                  </div>
                </td>
              </tr>
            ) : (
              sortedSubmissions.map((sub) => {
                const isGraded = sub.status === 'Graded';
                const hasFlags = (sub.focusBlurEvents || 0) > 0;
                const initials = (sub.studentName || 'Student')
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <tr key={sub.id} className={`queue-table-row ${hasFlags ? 'row-flagged' : ''}`}>
                    {/* 1. PRN */}
                    <td className="cell-prn">
                      <span className="prn-badge">{sub.prn || 'PRN2026CS000'}</span>
                    </td>

                    {/* 2. Student */}
                    <td className="cell-student">
                      <div className="student-profile-row">
                        <div className="student-avatar-circle">{initials}</div>
                        <div className="student-meta-col">
                          <span className="student-name-text">{sub.studentName}</span>
                          <span className="student-roll-text">{sub.rollNumber}</span>
                        </div>
                      </div>
                    </td>

                    {/* 3. Practical */}
                    <td className="cell-practical">
                      <div className="practical-title-col">
                        <span className="practical-title-text">{sub.practicalTitle}</span>
                        <div className="practical-sub-tags">
                          <span className="tag-lang">{sub.languageName || 'C++20'}</span>
                          <Badge tier={sub.adaptiveTier} size="xs">
                            {sub.adaptiveTier}
                          </Badge>
                        </div>
                      </div>
                    </td>

                    {/* 4. Coding (5M) */}
                    <td className="cell-metric" style={{ textAlign: 'center' }}>
                      <div className="metric-pill pill-coding">
                        <span className="metric-val">{sub.codingMarks?.toFixed(1)}</span>
                        <span className="metric-denom">/ 5.0</span>
                      </div>
                    </td>

                    {/* 5. Writing (3M) */}
                    <td className="cell-metric" style={{ textAlign: 'center' }}>
                      {isGraded ? (
                        <div className="metric-pill pill-writing">
                          <span className="metric-val">{sub.writeupMarks?.toFixed(1)}</span>
                          <span className="metric-denom">/ 3.0</span>
                        </div>
                      ) : (
                        <span className="metric-pending-dash" title="Awaiting Faculty Review">—</span>
                      )}
                    </td>

                    {/* 6. Viva (2M) */}
                    <td className="cell-metric" style={{ textAlign: 'center' }}>
                      {isGraded ? (
                        <div className="metric-pill pill-viva">
                          <span className="metric-val">{sub.vivaMarks?.toFixed(1)}</span>
                          <span className="metric-denom">/ 2.0</span>
                        </div>
                      ) : (
                        <span className="metric-pending-dash" title="Awaiting Oral Defense">—</span>
                      )}
                    </td>

                    {/* 7. Total (10M) */}
                    <td className="cell-metric" style={{ textAlign: 'center' }}>
                      {isGraded ? (
                        <div className="metric-total-box">
                          <span className="total-val">{sub.totalMarks?.toFixed(1)}</span>
                          <span className="total-denom">/ 10</span>
                        </div>
                      ) : (
                        <span className="status-tag tag-pending">Pending</span>
                      )}
                    </td>

                    {/* 8. Integrity */}
                    <td className="cell-integrity">
                      {hasFlags ? (
                        <button
                          type="button"
                          className="integrity-pill pill-warning-btn"
                          onClick={() => onOpenAuditLogs && onOpenAuditLogs(sub)}
                          title="Click to view tab switch audit log"
                        >
                          <ShieldAlert size={12} />
                          <span>{sub.focusBlurEvents} Blurs</span>
                        </button>
                      ) : (
                        <span className="integrity-pill pill-clean">
                          <ShieldCheck size={12} />
                          <span>Verified</span>
                        </span>
                      )}
                    </td>

                    {/* 9. Action */}
                    <td className="cell-action" style={{ textAlign: 'right' }}>
                      <Button
                        variant={isGraded ? 'glass' : 'primary'}
                        size="sm"
                        onClick={() => onOpenGrading(sub)}
                      >
                        {isGraded ? 'Edit Rubric' : 'Grade (10M)'}
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
