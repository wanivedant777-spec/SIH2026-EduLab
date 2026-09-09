import React, { useState, useMemo } from 'react';
import {
  Play,
  BookOpen,
  CheckCircle2,
  Clock,
  Search,
  Sparkles,
  Inbox,
  AlertTriangle,
  RefreshCw,
  Layers,
  Award,
} from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Card from '../ui/Card';

export default function StudentPracticalsView({
  subjects = [],
  selectedSubject,
  onSelectSubject,
  assignments = [],
  practicals = [],
  currentPractical,
  submissions = [],
  onSelectPractical,
  isLoading = false,
  error = null,
  onRetry,
  studentBatchName = 'Your Batch',
}) {
  // Filter and Sort states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState(selectedSubject?.id || 'all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [sortBy, setSortBy] = useState('number-asc');

  // Normalize practical items from assignments or raw practicals
  const allPracticals = useMemo(() => {
    if (assignments && assignments.length > 0) {
      return assignments.map((a, idx) => {
        const p = a.practical || {};
        return {
          ...p,
          id: p.id || a.practicalId || a.id || `prac-${idx + 1}`,
          assignmentId: a.id,
          practicalNumber: p.practicalNumber || a.practicalNumber || idx + 1,
          title: p.title || a.title || `Practical ${idx + 1}`,
          aim: p.aim || a.aim || 'Implement the core algorithm and verify all test cases under resource bounds.',
          topic: p.topic || p.courseCode || a.courseCode || selectedSubject?.name || 'Computer Science',
          subjectCode: p.subjectCode || a.subjectCode || selectedSubject?.code || 'CS201P',
          subjectId: a.subjectId || p.subjectId || selectedSubject?.id,
          difficulty: p.difficulty || 'Medium',
          dueDate: a.dueDate || p.dueDate,
          maxCodingMarks: p.maxCodingMarks || 3.0,
          rawPractical: p,
          assignment: a,
        };
      });
    }

    if (practicals && practicals.length > 0) {
      return practicals.map((p, idx) => ({
        ...p,
        id: p.id || `prac-${idx + 1}`,
        practicalNumber: p.practicalNumber || idx + 1,
        title: p.title || `Practical ${idx + 1}`,
        aim: p.aim || 'Implement the core algorithm and verify all test cases under resource bounds.',
        topic: p.topic || p.courseCode || selectedSubject?.name || 'Computer Science',
        subjectCode: p.subjectCode || selectedSubject?.code || 'CS201P',
        subjectId: p.subjectId || selectedSubject?.id,
        difficulty: p.difficulty || 'Medium',
        maxCodingMarks: p.maxCodingMarks || 3.0,
        rawPractical: p,
      }));
    }

    return [];
  }, [assignments, practicals, selectedSubject]);

  // Enrich each practical with real submission/evaluation status and action mapping
  const enrichedPracticals = useMemo(() => {
    return allPracticals.map((p) => {
      // Find matching submission
      const sub = submissions.find(
        (s) => s.practicalId === p.id || s.assignmentId === p.assignmentId
      );

      const isCurrent = currentPractical?.id === p.id;

      // Status determination: Not Started | In Progress | Submitted | Evaluated | Mastered
      let statusKey = 'Not Started';
      let statusLabel = 'Not Started';
      let statusVariant = 'neutral';
      let actionLabel = 'Start Practical';
      let actionVariant = 'secondary';
      let ActionIcon = Play;
      let scoreText = '—';
      let lastActivity = 'Not started yet';

      if (sub) {
        // Timestamp formatting
        const rawDate = sub.submitted_at || sub.created_at || sub.updated_at || sub.timestamp;
        if (rawDate) {
          try {
            const dateObj = new Date(rawDate);
            lastActivity = dateObj.toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
            });
          } catch {
            lastActivity = 'Recent';
          }
        } else {
          lastActivity = 'Submitted';
        }

        const isFullyMastered =
          (sub.passedCount && sub.totalCount && sub.passedCount === sub.totalCount) ||
          parseFloat(sub.codingMarks) >= 2.8 ||
          sub.isMastered;

        const isEvaluated =
          sub.status === 'evaluated' ||
          sub.status === 'graded' ||
          sub.codingMarks !== undefined ||
          sub.feedback;

        if (isFullyMastered) {
          statusKey = 'Mastered';
          statusLabel = 'Mastered';
          statusVariant = 'success';
          actionLabel = 'Review';
          actionVariant = 'ghost';
          ActionIcon = BookOpen;
          scoreText = `${sub.codingMarks ? `${sub.codingMarks}M` : '100%'} (Mastery)`;
        } else if (isEvaluated) {
          statusKey = 'Evaluated';
          statusLabel = 'Evaluated';
          statusVariant = 'info';
          actionLabel = 'View Evaluation';
          actionVariant = 'secondary';
          ActionIcon = CheckCircle2;
          scoreText = sub.codingMarks ? `${sub.codingMarks} / 3.0 M` : 'Graded';
        } else {
          statusKey = 'Submitted';
          statusLabel = 'Submitted';
          statusVariant = 'warning';
          actionLabel = 'View Submission';
          actionVariant = 'outline';
          ActionIcon = Clock;
          scoreText = sub.passedCount !== undefined ? `${sub.passedCount}/${sub.totalCount || 3} Passed` : 'Under Review';
        }
      } else if (isCurrent) {
        statusKey = 'In Progress';
        statusLabel = 'In Progress';
        statusVariant = 'primary';
        actionLabel = 'Continue';
        actionVariant = 'primary';
        ActionIcon = Play;
        scoreText = 'Draft saved';
        lastActivity = 'Active Session';
      }

      return {
        ...p,
        submission: sub,
        isCurrent,
        statusKey,
        statusLabel,
        statusVariant,
        actionLabel,
        actionVariant,
        ActionIcon,
        scoreText,
        lastActivity,
      };
    });
  }, [allPracticals, submissions, currentPractical]);

  // Determine the most relevant recommended practical
  const recommendedPractical = useMemo(() => {
    if (enrichedPracticals.length === 0) return null;

    // 1. Current practical if set
    if (currentPractical) {
      const found = enrichedPracticals.find((p) => p.id === currentPractical.id);
      if (found) return found;
    }

    // 2. First In Progress practical
    const inProgress = enrichedPracticals.find((p) => p.statusKey === 'In Progress');
    if (inProgress) return inProgress;

    // 3. First Not Started practical
    const notStarted = enrichedPracticals.find((p) => p.statusKey === 'Not Started');
    if (notStarted) return notStarted;

    // 4. Fallback to the first practical
    return enrichedPracticals[0];
  }, [enrichedPracticals, currentPractical]);

  // Filtering & Sorting
  const filteredPracticals = useMemo(() => {
    let list = [...enrichedPracticals];

    // Subject Filter
    if (selectedSubjectId !== 'all') {
      list = list.filter(
        (p) => String(p.subjectId) === String(selectedSubjectId) || p.subjectCode === selectedSubjectId
      );
    }

    // Status Filter
    if (statusFilter !== 'all') {
      list = list.filter((p) => p.statusKey === statusFilter);
    }

    // Difficulty Filter
    if (difficultyFilter !== 'all') {
      list = list.filter(
        (p) => p.difficulty?.toLowerCase() === difficultyFilter.toLowerCase()
      );
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.topic?.toLowerCase().includes(q) ||
          p.aim?.toLowerCase().includes(q) ||
          `p${p.practicalNumber}`.toLowerCase().includes(q) ||
          `prac-${p.practicalNumber}`.toLowerCase().includes(q)
      );
    }

    // Sorting
    list.sort((a, b) => {
      switch (sortBy) {
        case 'number-desc':
          return (b.practicalNumber || 0) - (a.practicalNumber || 0);
        case 'title-asc':
          return (a.title || '').localeCompare(b.title || '');
        case 'difficulty': {
          const rank = { Easy: 1, Medium: 2, Hard: 3 };
          return (rank[a.difficulty] || 2) - (rank[b.difficulty] || 2);
        }
        case 'activity':
          return (b.submission ? 1 : 0) - (a.submission ? 1 : 0);
        case 'number-asc':
        default:
          return (a.practicalNumber || 0) - (b.practicalNumber || 0);
      }
    });

    return list;
  }, [enrichedPracticals, selectedSubjectId, statusFilter, difficultyFilter, searchQuery, sortBy]);

  // Subject selector handler
  const handleSubjectChange = (e) => {
    const val = e.target.value;
    setSelectedSubjectId(val);
    if (val !== 'all' && onSelectSubject && subjects.length > 0) {
      const match = subjects.find(
        (s) => String(s.id) === String(val) || s.code === val
      );
      if (match) onSelectSubject(match);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedSubjectId('all');
    setStatusFilter('all');
    setDifficultyFilter('all');
    setSortBy('number-asc');
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedSubjectId !== 'all' ||
    statusFilter !== 'all' ||
    difficultyFilter !== 'all' ||
    sortBy !== 'number-asc';

  return (
    <div className="student-practicals-page" id="student-practicals-root">
      {/* Page Header */}
      <PageHeader
        title="My Practicals"
        subtitle={`Structured laboratory curriculum, milestone practicals, and coding assignments allocated to ${studentBatchName}.`}
        badge={
          <Badge variant="primary" size="sm">
            {allPracticals.length} Curriculum Practicals
          </Badge>
        }
      />

      <div className="practicals-page-content">
        {/* Error notification banner if applicable */}
        {error && (
          <div
            className="db-error-banner"
            style={{
              background: 'var(--danger-subtle)',
              border: '1px solid var(--danger-border)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertTriangle size={18} color="var(--danger-text)" />
              <div>
                <strong style={{ color: 'var(--text-primary)', fontSize: '13px', display: 'block' }}>
                  Laboratory Syllabus Sync Notice
                </strong>
                <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{error}</span>
              </div>
            </div>
            {onRetry && (
              <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRetry}>
                Retry Sync
              </Button>
            )}
          </div>
        )}

        {/* 1. FILTER & SEARCH TOOLBAR */}
        <Card surface="white" className="practicals-toolbar-card">
          <div className="practicals-toolbar-main">
            {/* Search Input */}
            <div className="practicals-search-wrap">
              <Input
                placeholder="Search practicals by title, topic, or aim..."
                icon={Search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
                size="md"
              />
            </div>

            {/* Filter Controls Row */}
            <div className="practicals-filters-row">
              {/* Subject Filter */}
              {subjects.length > 0 && (
                <div className="practicals-filter-select-group">
                  <span className="practicals-filter-label">Course:</span>
                  <select
                    className="practicals-select-control font-mono"
                    value={selectedSubjectId}
                    onChange={handleSubjectChange}
                    aria-label="Filter by course subject"
                  >
                    <option value="all">All Courses ({subjects.length})</option>
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.code || sub.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status Filter */}
              <div className="practicals-filter-select-group">
                <span className="practicals-filter-label">Status:</span>
                <select
                  className="practicals-select-control"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter by practical status"
                >
                  <option value="all">All Statuses</option>
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Evaluated">Evaluated</option>
                  <option value="Mastered">Mastered</option>
                </select>
              </div>

              {/* Difficulty Filter */}
              <div className="practicals-filter-select-group">
                <span className="practicals-filter-label">Difficulty:</span>
                <select
                  className="practicals-select-control"
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  aria-label="Filter by practical difficulty"
                >
                  <option value="all">All Difficulties</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              {/* Sort Selector */}
              <div className="practicals-filter-select-group">
                <span className="practicals-filter-label">Sort:</span>
                <select
                  className="practicals-select-control"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  aria-label="Sort practicals list"
                >
                  <option value="number-asc">Practical # (1 → N)</option>
                  <option value="number-desc">Practical # (N → 1)</option>
                  <option value="title-asc">Title (A → Z)</option>
                  <option value="difficulty">Difficulty (Easy → Hard)</option>
                  <option value="activity">Recent Activity</option>
                </select>
              </div>
            </div>
          </div>

          {/* Active Filter Summary / Clear Action */}
          {hasActiveFilters && (
            <div className="practicals-active-filter-summary">
              <div className="practicals-filter-tags-wrap">
                <span>Showing {filteredPracticals.length} of {allPracticals.length} practicals</span>
                {statusFilter !== 'all' && (
                  <Badge variant="primary" size="xs">
                    Status: {statusFilter}
                  </Badge>
                )}
                {difficultyFilter !== 'all' && (
                  <Badge variant="neutral" size="xs">
                    Difficulty: {difficultyFilter}
                  </Badge>
                )}
                {searchQuery.trim() && (
                  <Badge variant="neutral" size="xs">
                    &quot;{searchQuery}&quot;
                  </Badge>
                )}
              </div>
              <button
                type="button"
                className="practicals-reset-btn"
                onClick={handleClearFilters}
              >
                Reset Filters
              </button>
            </div>
          )}
        </Card>

        {/* 2. RECOMMENDED PRACTICAL MILESTONE BANNER */}
        {recommendedPractical && (
          <section aria-label="Recommended Practical Milestone">
            <div className="recommended-practical-banner">
              <div className="recommended-banner-top">
                <div className="recommended-tag-group">
                  <span className="recommended-badge-highlight">
                    <Sparkles size={13} />
                    Current Recommended Milestone
                  </span>
                  <span className="recommended-course-pill font-mono">
                    {recommendedPractical.subjectCode} · Batch {studentBatchName}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Badge variant={recommendedPractical.statusVariant} size="sm" dot={recommendedPractical.statusKey === 'In Progress'}>
                    {recommendedPractical.statusLabel}
                  </Badge>
                  <Badge
                    variant={
                      recommendedPractical.difficulty?.toLowerCase() === 'hard'
                        ? 'danger'
                        : recommendedPractical.difficulty?.toLowerCase() === 'easy'
                        ? 'neutral'
                        : 'warning'
                    }
                    size="sm"
                  >
                    {recommendedPractical.difficulty}
                  </Badge>
                </div>
              </div>

              <div className="recommended-banner-main">
                <div className="recommended-details-col">
                  <div className="recommended-title-row">
                    <span className="recommended-prac-num font-mono">
                      P{String(recommendedPractical.practicalNumber).padStart(2, '0')}
                    </span>
                    <h2 className="recommended-prac-title">{recommendedPractical.title}</h2>
                  </div>
                  <p className="recommended-prac-aim">{recommendedPractical.aim}</p>
                  
                  <div className="recommended-meta-chips">
                    <span className="recommended-meta-chip">
                      <Layers size={13} color="var(--primary)" />
                      <strong>Topic:</strong> {recommendedPractical.topic}
                    </span>
                    <span className="recommended-meta-chip">
                      <Award size={13} color="var(--primary)" />
                      <strong>Max Rubric:</strong> {recommendedPractical.maxCodingMarks || 3.0}M Code / 10M Total
                    </span>
                    {recommendedPractical.scoreText !== '—' && (
                      <span className="recommended-meta-chip font-mono">
                        <strong>Standing:</strong> {recommendedPractical.scoreText}
                      </span>
                    )}
                  </div>
                </div>

                <div className="recommended-action-col">
                  <Button
                    variant={recommendedPractical.statusKey === 'In Progress' ? 'primary' : recommendedPractical.actionVariant}
                    size="lg"
                    icon={recommendedPractical.ActionIcon}
                    onClick={() => onSelectPractical && onSelectPractical(recommendedPractical.rawPractical || recommendedPractical)}
                  >
                    {recommendedPractical.actionLabel}
                  </Button>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    Direct Code Lab test harness integration
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 3. PRACTICAL LIST: STRUCTURED LIST/TABLE HYBRID */}
        <section aria-label="Curriculum Practicals Catalog">
          <div className="practicals-table-card">
            <div className="practicals-table-header-bar">
              <div className="practicals-table-title-group">
                <BookOpen size={16} color="var(--primary)" />
                <h3 className="practicals-table-title">Syllabus Practicals</h3>
                <Badge variant="neutral" size="xs">
                  {filteredPracticals.length} {filteredPracticals.length === 1 ? 'Milestone' : 'Milestones'}
                </Badge>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Click any row to inspect code and compiler verification
              </span>
            </div>

            <div className="practicals-table-grid">
              {/* Table Column Headers (Desktop) */}
              <div className="practicals-table-row table-head-row">
                <div className="table-cell cell-num">#</div>
                <div className="table-cell cell-title">Practical &amp; Topic</div>
                <div className="table-cell cell-difficulty">Difficulty</div>
                <div className="table-cell cell-status">Status</div>
                <div className="table-cell cell-score">Score / Progress</div>
                <div className="table-cell cell-activity">Last Activity</div>
                <div className="table-cell cell-action" style={{ textAlign: 'right' }}>Action</div>
              </div>

              {/* Rows or State handling */}
              {isLoading ? (
                // Skeleton loading rows
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="practicals-skeleton-row">
                    <div className="skeleton-cell-bar" style={{ width: '36px' }} />
                    <div className="skeleton-cell-bar" style={{ width: '80%' }} />
                    <div className="skeleton-cell-bar" style={{ width: '60px' }} />
                    <div className="skeleton-cell-bar" style={{ width: '70px' }} />
                    <div className="skeleton-cell-bar" style={{ width: '50px' }} />
                    <div className="skeleton-cell-bar" style={{ width: '65px' }} />
                    <div className="skeleton-cell-bar" style={{ width: '85px', marginLeft: 'auto' }} />
                  </div>
                ))
              ) : filteredPracticals.length === 0 ? (
                // Empty state box
                <div className="practicals-empty-state-box">
                  <div className="practicals-empty-icon-wrap">
                    <Inbox size={26} />
                  </div>
                  <h4 className="practicals-empty-heading">
                    {hasActiveFilters ? 'No Matching Practicals Found' : 'No Practicals Allocated'}
                  </h4>
                  <p className="practicals-empty-subtext">
                    {hasActiveFilters
                      ? 'No practical milestones match your selected filters. Try broadening your search or resetting filters.'
                      : `Laboratory practicals for ${studentBatchName} will appear here once allocated by course faculty.`}
                  </p>
                  {hasActiveFilters && (
                    <Button variant="secondary" size="sm" onClick={handleClearFilters}>
                      Reset All Filters
                    </Button>
                  )}
                </div>
              ) : (
                // Real practical items
                filteredPracticals.map((prac) => {
                  const isRec = recommendedPractical?.id === prac.id;

                  return (
                    <div
                      key={prac.id}
                      className={`practicals-table-row ${isRec ? 'row-is-recommended' : ''}`}
                      id={`practical-row-${prac.id}`}
                    >
                      {/* Mobile Top Header Line */}
                      <div className="practicals-mobile-top-line" style={{ display: 'none' }}>
                        <span className="prac-num-badge font-mono">
                          P{String(prac.practicalNumber).padStart(2, '0')}
                        </span>
                        <Badge variant={prac.statusVariant} size="sm" dot={prac.statusKey === 'In Progress'}>
                          {prac.statusLabel}
                        </Badge>
                      </div>

                      {/* Number Column */}
                      <div className="table-cell cell-num font-mono">
                        P{String(prac.practicalNumber).padStart(2, '0')}
                      </div>

                      {/* Title & Topic Column */}
                      <div className="table-cell cell-title">
                        <span className="cell-practical-title-text" title={prac.aim}>
                          {prac.title}
                        </span>
                        <div className="cell-practical-meta-sub">
                          <span className="cell-practical-topic">
                            <Layers size={11} color="var(--primary)" />
                            {prac.topic}
                          </span>
                          {isRec && (
                            <span className="cell-recommended-marker">
                              <Sparkles size={9} />
                              Current
                            </span>
                          )}
                          <span className="cell-inline-activity font-mono" style={{ display: 'none' }}>
                            · {prac.lastActivity}
                          </span>
                        </div>
                      </div>

                      {/* Difficulty Column */}
                      <div className="table-cell cell-difficulty">
                        <Badge
                          variant={
                            prac.difficulty?.toLowerCase() === 'hard'
                              ? 'danger'
                              : prac.difficulty?.toLowerCase() === 'easy'
                              ? 'neutral'
                              : 'warning'
                          }
                          size="xs"
                        >
                          {prac.difficulty}
                        </Badge>
                      </div>

                      {/* Status Column */}
                      <div className="table-cell cell-status">
                        <Badge variant={prac.statusVariant} size="sm" dot={prac.statusKey === 'In Progress'}>
                          {prac.statusLabel}
                        </Badge>
                      </div>

                      {/* Score / Progress Column */}
                      <div className="table-cell cell-score">
                        {prac.scoreText}
                      </div>

                      {/* Last Activity Column */}
                      <div className="table-cell cell-activity font-mono">
                        {prac.lastActivity}
                      </div>

                      {/* Primary Action Button Column */}
                      <div className="table-cell cell-action">
                        <Button
                          variant={prac.actionVariant}
                          size="sm"
                          icon={prac.ActionIcon}
                          onClick={() => onSelectPractical && onSelectPractical(prac.rawPractical || prac)}
                        >
                          {prac.actionLabel}
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
