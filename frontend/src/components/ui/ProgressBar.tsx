import React from 'react'

export interface ProgressBarProps {
  value: number // 0 to 100
  max?: number
  variant?: 'brand' | 'accent' | 'low' | 'medium' | 'high'
  className?: string
  height?: 'sm' | 'md' | 'lg'
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  variant = 'brand',
  className = '',
  height = 'md',
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  }[height]

  const variantClasses = {
    brand: 'bg-brand-500',
    accent: 'bg-accent-500',
    low: 'bg-brand-500',
    medium: 'bg-warning',
    high: 'bg-danger',
  }[variant]

  return (
    <div className={`w-full bg-brand-100 rounded-full overflow-hidden ${heightClasses} ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-300 ${variantClasses}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

