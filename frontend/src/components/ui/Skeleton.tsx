import React from 'react'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', ...props }) => {
  return <div className={`bg-brand-100 animate-pulse rounded-xl ${className}`} {...props} />
}

