import React from 'react'
import { Inbox } from 'lucide-react'

export interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`bg-white border border-line rounded-2xl p-10 text-center flex flex-col items-center justify-center ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 mb-3 border border-brand-100">
        {icon || <Inbox className="w-6 h-6 text-brand-500" />}
      </div>
      <h3 className="text-base font-bold text-ink-900 mb-1">{title}</h3>
      {description && <p className="text-xs text-ink-500 max-w-sm mb-4">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  )
}

