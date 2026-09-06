import React from 'react';

export default function Card({
  children,
  className = '',
  interactive = false,
  glow,
  style = {},
  ...props
}) {
  let cardClass = 'glass-card';
  if (interactive) cardClass += ' glass-card-interactive';
  if (glow === 'primary') cardClass += ' glow-border-primary';
  if (glow === 'cyan') cardClass += ' glow-border-cyan';
  if (glow === 'success') cardClass += ' glow-border-success';

  return (
    <div className={`${cardClass} ${className}`} style={style} {...props}>
      {children}
    </div>
  );
}
