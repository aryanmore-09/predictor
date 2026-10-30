import React from 'react'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-xs font-semibold uppercase tracking-wider text-ink-700 mb-1.5">
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          className={`w-full bg-surface border rounded-xl p-3 text-sm text-ink-900 placeholder:text-ink-300 transition outline-none resize-y ${
            error
              ? 'border-danger focus:border-danger focus:ring-2 focus:ring-red-100'
              : 'border-line focus:border-accent-500 focus:ring-2 focus:ring-accent-100'
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-danger mt-1 font-medium">{error}</p>}
        {helperText && !error && <p className="text-xs text-ink-500 mt-1">{helperText}</p>}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

