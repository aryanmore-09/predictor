import React from 'react'
import { CheckCircle, AlertTriangle, ShieldAlert } from 'lucide-react'

export interface RiskBadgeProps {
  risk: 'low' | 'medium' | 'high' | string | null | undefined
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  className?: string
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  risk = 'low',
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const normalized = (risk || 'low').toLowerCase()

  const config = {
    high: {
      label: 'High Risk',
      classes: 'bg-danger-bg text-danger border border-red-200',
      icon: ShieldAlert,
    },
    medium: {
      label: 'Medium Risk',
      classes: 'bg-warning-bg text-warning border border-amber-200',
      icon: AlertTriangle,
    },
    low: {
      label: 'Low Risk',
      classes: 'bg-brand-100 text-brand-700 border border-brand-200',
      icon: CheckCircle,
    },
  }[normalized] || {
    label: normalized,
    classes: 'bg-brand-50 text-ink-700 border border-line',
    icon: CheckCircle,
  }

  const IconComponent = config.icon

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  }[size]

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }[size]

  return (
    <span
      className={`inline-flex items-center font-bold rounded-full uppercase tracking-wider ${config.classes} ${sizeClasses} ${className}`}
    >
      {showIcon && <IconComponent className={`${iconSizes} shrink-0`} />}
      <span>{config.label}</span>
    </span>
  )
}

