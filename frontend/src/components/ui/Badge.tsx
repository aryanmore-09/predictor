import React from 'react'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'brand' | 'accent' | 'neutral' | 'warning' | 'danger'
  size?: 'sm' | 'md'
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'brand',
  size = 'md',
  className = '',
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-0.5 text-xs',
  }[size]

  const variantClasses = {
    brand: 'bg-brand-100 text-brand-700 border border-brand-200',
    accent: 'bg-accent-50 text-accent-700 border border-accent-100',
    neutral: 'bg-brand-50 text-ink-700 border border-line',
    warning: 'bg-warning-bg text-warning border border-amber-200',
    danger: 'bg-danger-bg text-danger border border-red-200',
  }[variant]

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-full uppercase tracking-wider ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}

