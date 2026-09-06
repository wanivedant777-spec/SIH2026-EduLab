import { User, GraduationCap } from 'lucide-react';

export default function RoleSwitcher({ currentRole, onRoleChange }) {
  const isStudent = currentRole === 'student';

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'var(--bg-app)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-sm)',
        padding: '2px',
        gap: '2px',
        height: '28px',
      }}
    >
      <button
        type="button"
        onClick={() => onRoleChange('student')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          padding: '0 8px',
          height: '22px',
          borderRadius: 'var(--radius-xs)',
          fontSize: '11.5px',
          fontWeight: isStudent ? 600 : 500,
          border: isStudent ? '1px solid var(--border-medium)' : '1px solid transparent',
          cursor: 'pointer',
          background: isStudent ? 'var(--bg-surface)' : 'transparent',
          color: isStudent ? 'var(--text-primary)' : 'var(--text-muted)',
          boxShadow: isStudent ? 'var(--shadow-sm)' : 'none',
          transition: 'all var(--transition-fast)',
        }}
        title="Switch to Student Lab Workspace view"
      >
        <User size={12} />
        <span>Student</span>
      </button>

      <button
        type="button"
        onClick={() => onRoleChange('faculty')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          padding: '0 8px',
          height: '22px',
          borderRadius: 'var(--radius-xs)',
          fontSize: '11.5px',
          fontWeight: !isStudent ? 600 : 500,
          border: !isStudent ? '1px solid var(--border-medium)' : '1px solid transparent',
          cursor: 'pointer',
          background: !isStudent ? 'var(--bg-surface)' : 'transparent',
          color: !isStudent ? 'var(--text-primary)' : 'var(--text-muted)',
          boxShadow: !isStudent ? 'var(--shadow-sm)' : 'none',
          transition: 'all var(--transition-fast)',
        }}
        title="Switch to Faculty Evaluation & Batch Dashboard view"
      >
        <GraduationCap size={13} />
        <span>Faculty</span>
      </button>
    </div>
  );
}
