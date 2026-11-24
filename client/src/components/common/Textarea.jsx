import React, { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

export const Textarea = forwardRef(
  (
    {
      label,
      name,
      value,
      onChange,
      placeholder,
      rows = 3,
      error,
      helperText,
      required = false,
      disabled = false,
      className = '',
      ...props
    },
    ref
  ) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          name={name}
          {...(value !== undefined ? { value } : {})}
          {...(onChange ? { onChange } : {})}
          rows={rows}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`block w-full rounded-lg border py-2.5 px-3 text-sm transition focus:outline-none focus:ring-2 ${
            error
              ? 'border-rose-300 text-rose-900 focus:border-rose-500 focus:ring-rose-200'
              : 'border-slate-300 text-slate-900 focus:border-brand-600 focus:ring-brand-100'
          } ${disabled ? 'bg-slate-50 cursor-not-allowed opacity-75' : 'bg-white'} ${className}`}
          {...props}
        />

        {error ? (
          <p className="flex items-center text-xs text-rose-600 mt-1 font-medium">
            <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
            {error}
          </p>
        ) : helperText ? (
          <p className="text-xs text-slate-500 mt-1">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;
