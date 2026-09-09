import React from 'react';

export default function Button({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'glass'
  size = 'md',        // 'xs' | 'sm' | 'md' | 'lg'
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  disabled = false,
  fullWidth = false,
  className = '',
  onClick,
  type = 'button',
  title,
  ...props
}) {
  const sizeClass = size === 'xs' ? 'btn-xs' : size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';
  const variantClass = `btn-${variant}`;
  const widthClass = fullWidth ? 'btn-full-width' : '';

  return (
    <button
      type={type}
      className={`btn ${variantClass} ${sizeClass} ${widthClass} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      title={title}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <span className="btn-spinner" aria-hidden="true" />
      ) : Icon ? (
        <Icon size={size === 'xs' ? 12 : size === 'sm' ? 13 : size === 'lg' ? 17 : 15} className="btn-icon" />
      ) : null}
      
      {children && <span className="btn-label">{children}</span>}

      {!loading && IconRight && (
        <IconRight size={size === 'xs' ? 12 : size === 'sm' ? 13 : size === 'lg' ? 17 : 15} className="btn-icon-right" />
      )}
    </button>
  );
}
