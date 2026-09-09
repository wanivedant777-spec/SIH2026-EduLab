import React, { forwardRef } from 'react';
import { X } from 'lucide-react';

const Input = forwardRef(function Input(
  {
    type = 'text',
    value,
    onChange,
    onClear,
    placeholder,
    icon: Icon,
    iconRight: IconRight,
    error,
    disabled = false,
    size = 'md', // 'sm' | 'md' | 'lg'
    className = '',
    style = {},
    ...props
  },
  ref
) {
  const sizeClass = size === 'sm' ? 'input-sm' : size === 'lg' ? 'input-lg' : '';
  const errorClass = error ? 'input-error' : '';

  return (
    <div className={`input-wrapper ${sizeClass} ${errorClass} ${className}`} style={style}>
      {Icon && (
        <span className="input-icon-prefix" aria-hidden="true">
          <Icon size={size === 'sm' ? 13 : 15} />
        </span>
      )}

      <input
        ref={ref}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="input-field"
        {...props}
      />

      {onClear && value && !disabled ? (
        <button
          type="button"
          onClick={onClear}
          className="input-clear-btn"
          aria-label="Clear input"
        >
          <X size={13} />
        </button>
      ) : IconRight ? (
        <span className="input-icon-suffix" aria-hidden="true">
          <IconRight size={size === 'sm' ? 13 : 15} />
        </span>
      ) : null}

      {error && <span className="input-error-msg">{error}</span>}
    </div>
  );
});

export default Input;
