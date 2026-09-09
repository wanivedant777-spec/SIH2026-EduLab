import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Box,
  Code2,
  History,
  TrendingUp,
  Users,
  Inbox,
  Award,
  BarChart3,
  LogOut,
  X,
  ShieldCheck,
} from 'lucide-react';
import Badge from '../ui/Badge';

export default function Sidebar({
  currentUser,
  activeNav,
  onNavigate,
  onLogout,
  isOpen = false,
  onClose,
  metaCounts = {},
}) {
  const isStudent = currentUser?.role === 'student';

  const studentNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'practicals', label: 'My Practicals', icon: BookOpen, badge: metaCounts.practicals },
    { id: 'learning', label: 'Learning', icon: GraduationCap },
    { id: 'visualizations', label: 'Visualizations', icon: Box },
    { id: 'workspace', label: 'Code Lab', icon: Code2, highlight: true },
    { id: 'submissions', label: 'Submissions', icon: History, badge: metaCounts.submissions },
    { id: 'progress', label: 'Progress', icon: TrendingUp },
  ];

  const facultyNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'practicals', label: 'Practicals', icon: BookOpen, badge: metaCounts.practicals },
    { id: 'submissions', label: 'Submissions', icon: Inbox, badge: metaCounts.submissions },
    { id: 'evaluations', label: 'Evaluations', icon: Award, badge: metaCounts.pendingEvaluations },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const navItems = isStudent ? studentNavItems : facultyNavItems;

  const handleItemClick = (id) => {
    onNavigate(id);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`app-sidebar ${isOpen ? 'sidebar-mobile-open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-brand-header">
          <div
            className="sidebar-brand"
            onClick={() => handleItemClick('dashboard')}
            role="button"
            tabIndex={0}
            title="EduLab - Home Dashboard"
          >
            <div className="sidebar-logo-icon">E</div>
            <div className="sidebar-brand-text">
              <span className="brand-title">EduLab</span>
              <span className="brand-subtitle">Curricular Platform</span>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close navigation sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Role Context Pill */}
        <div className="sidebar-context-section">
          <div className="sidebar-context-card">
            <div className="context-card-top">
              <span className="context-label">PORTAL</span>
              <Badge variant={isStudent ? 'primary' : 'warning'} size="sm">
                {isStudent ? 'Student' : 'Faculty'}
              </Badge>
            </div>
            <div className="context-card-batch">
              <ShieldCheck size={12} className="context-shield-icon" />
              <span>{isStudent ? (currentUser?.batchName ? `Batch ${currentUser.batchName}` : 'Enrolled') : 'Evaluator Console'}</span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="sidebar-nav" aria-label="Main Navigation">
          <div className="sidebar-nav-group-label">NAVIGATION</div>
          <ul className="sidebar-nav-list">
            {navItems.map((item) => {
              const isActive = activeNav === item.id;
              const Icon = item.icon;

              return (
                <li key={item.id} className="sidebar-nav-li">
                  <button
                    type="button"
                    className={`sidebar-nav-item ${isActive ? 'active' : ''} ${item.highlight ? 'nav-item-highlight' : ''}`}
                    onClick={() => handleItemClick(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="sidebar-nav-icon-wrap">
                      <Icon size={16} />
                    </span>
                    <span className="sidebar-nav-text">{item.label}</span>
                    {item.badge !== undefined && item.badge !== null && item.badge > 0 && (
                      <span className="sidebar-nav-badge">{item.badge}</span>
                    )}
                    {isActive && <span className="sidebar-nav-indicator" aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom User Profile Section */}
        <div className="sidebar-footer">
          <div className="sidebar-user-card">
            <div className="sidebar-user-avatar">
              {(currentUser?.name || currentUser?.identifier || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name" title={currentUser?.name || currentUser?.identifier}>
                {currentUser?.name || currentUser?.identifier}
              </div>
              <div className="sidebar-user-role">
                {currentUser?.identifier || (isStudent ? 'Student' : 'Faculty')}
              </div>
            </div>
            <button
              type="button"
              className="sidebar-logout-btn"
              onClick={onLogout}
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
