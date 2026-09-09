import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function AppShell({
  currentUser,
  activeNav,
  onNavigate,
  onLogout,
  currentPractical,
  onOpenPracticalModal,
  onOpenAuditDrawer,
  onRunCode,
  onSubmitPractical,
  onExportGradebook,
  isRunning,
  isSubmitted,
  metaCounts = {},
  breadcrumbs,
  children,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleToggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };

  const isWorkspace = activeNav === 'workspace';

  return (
    <div className={`app-shell-root ${isWorkspace ? 'app-shell-workspace' : ''}`}>
      {/* Global Sidebar Navigation */}
      <Sidebar
        currentUser={currentUser}
        activeNav={activeNav}
        onNavigate={onNavigate}
        onLogout={onLogout}
        isOpen={sidebarOpen}
        onClose={handleCloseSidebar}
        metaCounts={metaCounts}
      />

      {/* Main Experience Column */}
      <div className="app-shell-main-column">
        {/* Unified TopBar */}
        <TopBar
          currentUser={currentUser}
          activeNav={activeNav}
          onNavigate={onNavigate}
          onToggleSidebar={handleToggleSidebar}
          currentPractical={currentPractical}
          onOpenPracticalModal={onOpenPracticalModal}
          onOpenAuditDrawer={onOpenAuditDrawer}
          onRunCode={onRunCode}
          onSubmitPractical={onSubmitPractical}
          onExportGradebook={onExportGradebook}
          isRunning={isRunning}
          isSubmitted={isSubmitted}
          onLogout={onLogout}
          breadcrumbs={breadcrumbs}
        />

        {/* Dynamic Page Content */}
        <main className={`app-shell-content ${isWorkspace ? 'content-workspace-no-scroll' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
