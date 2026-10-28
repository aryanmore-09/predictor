import React from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  icon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-ink-700 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-500">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full bg-white border rounded-xl py-2 px-3.5 text-sm text-ink-900 placeholder:text-ink-300 transition outline-none ${
              icon ? 'pl-10' : ''
            } ${
              error
                ? 'border-danger focus:border-danger focus:ring-2 focus:ring-red-100'
                : 'border-line focus:border-accent-500 focus:ring-2 focus:ring-accent-100'
            } ${className}`}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-danger mt-1 font-medium">{error}</p>}
        {helperText && !error && <p className="text-xs text-ink-500 mt-1">{helperText}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

