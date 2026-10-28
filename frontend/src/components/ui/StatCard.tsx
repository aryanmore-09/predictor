import React from 'react'

export interface StatCardProps {
  label: string
  value: React.ReactNode
  caption?: React.ReactNode
  icon?: React.ReactNode
  className?: string
  valueClassName?: string
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  caption,
  icon,
  className = '',
  valueClassName = '',
}) => {
  return (
    <div
      className={`bg-white border border-line rounded-2xl shadow-sm p-5 hover:shadow-md hover:border-brand-300 transition duration-150 flex flex-col justify-between ${className}`}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">{label}</span>
        {icon && (
          <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 shrink-0">
            {icon}
          </div>
        )}
      </div>
      <div>
        <div className={`text-3xl font-extrabold text-brand-700 tracking-tight tabular-nums ${valueClassName}`}>
          {value}
        </div>
        {caption && <div className="text-xs text-ink-500 mt-1">{caption}</div>}
      </div>
    </div>
  )
}

