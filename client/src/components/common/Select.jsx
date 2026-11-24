import React, { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

export const Select = forwardRef(
  (
    {
      label,
      options = [],
      value,
      onChange,
      placeholder = 'Select an option',
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

        <select
          ref={ref}
          {...(value !== undefined ? { value } : {})}
          {...(onChange ? { onChange } : {})}
          disabled={disabled}
          required={required}
          className={`block w-full rounded-lg border py-2.5 px-3 text-sm transition focus:outline-none focus:ring-2 ${
            error
              ? 'border-rose-300 text-rose-900 focus:border-rose-500 focus:ring-rose-200'
              : 'border-slate-300 text-slate-900 focus:border-brand-600 focus:ring-brand-100'
          } ${disabled ? 'bg-slate-50 cursor-not-allowed opacity-75' : 'bg-white'} ${className}`}
          {...props}
        >
          {placeholder !== null && <option value="">{placeholder}</option>}
          {options.map((opt) => {
            const val = typeof opt === 'object' ? opt.value : opt;
            const lbl = typeof opt === 'object' ? opt.label : opt;
            return (
              <option key={val} value={val}>
                {lbl}
              </option>
            );
          })}
        </select>

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

Select.displayName = 'Select';

export default Select;
