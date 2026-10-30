import React from 'react'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, children, className = '', id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold uppercase tracking-wider text-ink-700 mb-1.5">
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={`w-full bg-surface border rounded-xl py-2 px-3.5 text-sm min-h-[40px] text-ink-900 transition outline-none cursor-pointer ${
            error
              ? 'border-danger focus:border-danger focus:ring-2 focus:ring-red-100'
              : 'border-line focus:border-accent-500 focus:ring-2 focus:ring-accent-100'
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-xs text-danger mt-1 font-medium">{error}</p>}
        {helperText && !error && <p className="text-xs text-ink-500 mt-1">{helperText}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'

