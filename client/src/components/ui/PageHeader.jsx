import React from 'react';

export default function PageHeader({
  title,
  subtitle,
  badge,
  breadcrumbs,
  actions,
  className = '',
}) {
  return (
    <header className={`page-header ${className}`}>
      {breadcrumbs && <div className="page-header-breadcrumbs">{breadcrumbs}</div>}

      <div className="page-header-main">
        <div className="page-header-title-group">
          <div className="page-header-heading-row">
            <h1 className="page-header-title">{title}</h1>
            {badge && <div className="page-header-badge">{badge}</div>}
          </div>
          {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
        </div>

        {actions && <div className="page-header-actions">{actions}</div>}
      </div>
    </header>
  );
}
