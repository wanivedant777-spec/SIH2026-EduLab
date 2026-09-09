import React from 'react';

export default function Badge({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'outline' | 'nep'
  size = 'md',        // 'sm' | 'md'
  icon: Icon,
  dot = false,
  className = '',
  tier,
  ...props
}) {
  let badgeClass = `badge badge-${variant} badge-${size}`;

  if (tier) {
    const tierLower = tier.toLowerCase();
    badgeClass = `badge tier-badge tier-${tierLower} badge-${size}`;
  } else if (variant === 'nep') {
    badgeClass = `badge nep-badge badge-${size}`;
  }

  return (
    <span className={`${badgeClass} ${className}`} {...props}>
      {dot && <span className="badge-dot" aria-hidden="true" />}
      {Icon && <Icon size={size === 'sm' ? 10 : 12} className="badge-icon" />}
      <span>{children}</span>
    </span>
  );
}
