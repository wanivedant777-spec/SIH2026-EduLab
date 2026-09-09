import React from 'react';

export default function Card({
  children,
  className = '',
  interactive = false,
  surface = 'white', // 'white' | 'subtle' | 'borderless'
  glow,
  style = {},
  onClick,
  ...props
}) {
  let cardClass = 'ui-card';
  if (surface === 'white') cardClass += ' ui-card-white';
  if (surface === 'subtle') cardClass += ' ui-card-subtle';
  if (interactive || onClick) cardClass += ' ui-card-interactive';
  if (glow === 'primary') cardClass += ' glow-border-primary';
  if (glow === 'success') cardClass += ' glow-border-success';
  if (glow === 'cyan') cardClass += ' glow-border-cyan';

  return (
    <div
      className={`${cardClass} ${className}`}
      style={style}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', style = {}, ...props }) {
  return (
    <div className={`ui-card-header ${className}`} style={style} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', style = {}, as: Tag = 'h3', ...props }) {
  return (
    <Tag className={`ui-card-title ${className}`} style={style} {...props}>
      {children}
    </Tag>
  );
}

export function CardDescription({ children, className = '', style = {}, ...props }) {
  return (
    <p className={`ui-card-description ${className}`} style={style} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = '', style = {}, ...props }) {
  return (
    <div className={`ui-card-content ${className}`} style={style} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '', style = {}, ...props }) {
  return (
    <div className={`ui-card-footer ${className}`} style={style} {...props}>
      {children}
    </div>
  );
}
