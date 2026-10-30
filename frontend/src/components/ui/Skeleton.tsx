import React from 'react'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', ...props }) => {
  return <div className={`bg-brand-100/60 dark:bg-brand-100/30 animate-pulse rounded-xl ${className}`} {...props} />
}
