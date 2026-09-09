import React, { useState, useMemo } from 'react';
import { History, Search } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Badge from '../ui/Badge';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import Input from '../ui/Input';
import RecentActivity from './RecentActivity';

export default function StudentSubmissionsView({
  submissions = [],
  onContinuePractical: _onContinuePractical,
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSubmissions = useMemo(() => {
    if (!searchQuery.trim()) return submissions;
    const q = searchQuery.toLowerCase();
    return submissions.filter(
      (s) =>
        s.practicalTitle?.toLowerCase().includes(q) ||
        s.language?.toLowerCase().includes(q) ||
        s.status?.toLowerCase().includes(q)
    );
  }, [submissions, searchQuery]);

  const totalSubs = submissions.length;
  const gradedSubs = submissions.filter((s) => s.status === 'Graded').length;
  const avgCodingMarks =
    totalSubs > 0
      ? (
          submissions.reduce((acc, s) => acc + (parseFloat(s.codingMarks) || 0), 0) /
          totalSubs
        ).toFixed(1)
      : '0.0';

  return (
    <div className="student-submissions-view" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="Submissions & Audit Log"
        subtitle="Verifiable institutional record of compiler executions, rubric marks, and focus integrity"
        badge={
          <Badge variant="primary" size="sm">
            {totalSubs} Logged
          </Badge>
        }
        actions={
          <div style={{ width: '240px' }}>
            <Input
              placeholder="Search submissions..."
              icon={Search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
              size="sm"
            />
          </div>
        }
      />

      <div className="dashboard-container" style={{ paddingTop: '20px' }}>
        {/* Metric Summary Strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
          }}
        >
          <Card surface="white" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Submissions
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
              {totalSubs}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Recorded in Supabase ledger
            </div>
          </Card>

          <Card surface="white" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Avg Auto-Coding Score
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)', marginTop: '4px' }}>
              {avgCodingMarks} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)' }}>/ 3.0 M</span>
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Judge0 Automated Test Suites
            </div>
          </Card>

          <Card surface="white" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Faculty Graded
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--success)', marginTop: '4px' }}>
              {gradedSubs}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              10-Mark Rubrics Finalized
            </div>
          </Card>
        </div>

        {/* Submissions Data Table */}
        <Card surface="white" style={{ overflow: 'hidden' }}>
          <CardHeader>
            <CardTitle as="h2" style={{ fontSize: '15px' }}>
              Submission History
            </CardTitle>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Showing {filteredSubmissions.length} of {totalSubs} records
            </span>
          </CardHeader>
          <CardContent style={{ padding: '0' }}>
            {filteredSubmissions.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <History size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>
                  No Submissions Found
                </h3>
                <p style={{ fontSize: '12.5px', margin: 0 }}>
                  {totalSubs === 0
                    ? 'You have not submitted any laboratory practicals yet. Run code and submit from the Code Lab.'
                    : 'No submissions match your search query.'}
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-app)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <th style={{ padding: '10px 16px', fontWeight: 600 }}>Practical</th>
                      <th style={{ padding: '10px 16px', fontWeight: 600 }}>Compiler</th>
                      <th style={{ padding: '10px 16px', fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '10px 16px', fontWeight: 600 }}>Pass Rate</th>
                      <th style={{ padding: '10px 16px', fontWeight: 600 }}>Coding Marks</th>
                      <th style={{ padding: '10px 16px', fontWeight: 600 }}>Adaptive Tier</th>
                      <th style={{ padding: '10px 16px', fontWeight: 600 }}>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubmissions.map((sub, i) => {
                      const isGraded = sub.status === 'Graded';
                      const dateStr = sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

                      return (
                        <tr
                          key={sub.id || i}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            transition: 'background var(--transition-fast)',
                          }}
                        >
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {sub.practicalTitle || 'Practical'}
                          </td>
                          <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', fontSize: '11.5px' }}>
                            {sub.language || 'cpp'}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <Badge variant={isGraded ? 'success' : 'primary'} size="sm">
                              {sub.status || 'Submitted'}
                            </Badge>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ fontWeight: 600, color: sub.passRate === 100 ? 'var(--success)' : 'var(--text-primary)' }}>
                              {sub.passedCount || 0}/{sub.totalCount || 3}
                            </span>{' '}
                            <span style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>
                              ({Math.round(sub.passRate || 0)}%)
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--primary)' }}>
                            {parseFloat(sub.codingMarks || 0).toFixed(1)} / 3.0 M
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <Badge tier={sub.adaptiveTier || 'Proficient'} size="sm">
                              {sub.adaptiveTier || 'Proficient'}
                            </Badge>
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11.5px' }}>
                            {dateStr}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chronological Activity Feed */}
        <RecentActivity
          activities={submissions.map((s) => ({
            id: s.id,
            title: s.practicalTitle || 'Code Lab Execution',
            description: `${s.passedCount || 0}/${s.totalCount || 3} test cases passed · ${s.codingMarks || 0}/3.0 Marks awarded`,
            timestamp: s.submittedAt ? new Date(s.submittedAt).toLocaleTimeString() : 'Recently',
            type: s.passRate === 100 ? 'test_pass' : 'writeup',
          }))}
        />
      </div>
    </div>
  );
}
