import React from 'react';
import { ChevronRight } from 'lucide-react';

export default function Breadcrumbs({
  items = [],
  separator = ChevronRight,
  className = '',
}) {
  const SeparatorIcon = separator;

  return (
    <nav aria-label="Breadcrumb" className={`breadcrumbs ${className}`}>
      <ol className="breadcrumbs-list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const Icon = item.icon;

          return (
            <li key={index} className="breadcrumb-item">
              {index > 0 && (
                <span className="breadcrumb-separator" aria-hidden="true">
                  <SeparatorIcon size={12} />
                </span>
              )}

              {item.onClick && !isLast ? (
                <button
                  type="button"
                  onClick={item.onClick}
                  className="breadcrumb-link"
                >
                  {Icon && <Icon size={12} className="breadcrumb-icon" />}
                  <span>{item.label}</span>
                </button>
              ) : item.href && !isLast ? (
                <a href={item.href} className="breadcrumb-link">
                  {Icon && <Icon size={12} className="breadcrumb-icon" />}
                  <span>{item.label}</span>
                </a>
              ) : (
                <span
                  className={`breadcrumb-current ${isLast ? 'active' : ''}`}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {Icon && <Icon size={12} className="breadcrumb-icon" />}
                  <span>{item.label}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
