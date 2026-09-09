import React from 'react';

export default function Tabs({
  tabs = [],
  activeTab,
  onChange,
  variant = 'segmented', // 'segmented' | 'underline'
  size = 'md',          // 'sm' | 'md'
  className = '',
  style = {},
}) {
  const variantClass = variant === 'underline' ? 'tab-bar-underline' : 'tab-bar-segmented';
  const sizeClass = size === 'sm' ? 'tab-bar-sm' : '';

  return (
    <div
      className={`tab-bar ${variantClass} ${sizeClass} ${className}`}
      style={style}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`tab-item ${isActive ? 'active' : ''}`}
            onClick={() => onChange(tab.id)}
            disabled={tab.disabled}
          >
            {Icon && <Icon size={size === 'sm' ? 12 : 14} className="tab-icon" />}
            <span className="tab-label">{tab.label}</span>
            {tab.badge !== undefined && tab.badge !== null && (
              <span className={`tab-badge ${isActive ? 'tab-badge-active' : ''}`}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
