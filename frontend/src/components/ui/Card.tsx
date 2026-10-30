import React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
}

export const Card: React.FC<CardProps> = ({
  children,
  interactive = false,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`bg-surface border border-line rounded-2xl shadow-sm p-6 ${
        interactive ? 'hover:shadow-md hover:border-brand-300 transition duration-150' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

