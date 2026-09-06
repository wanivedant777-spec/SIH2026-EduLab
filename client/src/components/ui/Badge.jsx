import React from 'react';

export default function Badge({
  children,
  variant = 'primary',
  icon: Icon,
  className = '',
  tier,
  ...props
}) {
  let badgeClass = `badge badge-${variant}`;

  if (tier) {
    const tierLower = tier.toLowerCase();
    badgeClass = `tier-badge tier-${tierLower}`;
  } else if (variant === 'nep') {
    badgeClass = 'nep-badge';
  }

  return (
    <span className={`${badgeClass} ${className}`} {...props}>
      {Icon && <Icon size={12} />}
      {children}
    </span>
  );
}
