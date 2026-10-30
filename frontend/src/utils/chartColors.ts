import React from 'react'

/**
 * Consistent institutional chart color tokens for Recharts
 */
export const CHART_PALETTE = [
  '#0F766E', // teal-600 (brand)
  '#3B82F6', // blue
  '#B7791F', // amber
  '#64748B', // slate
  '#0B5F59', // teal-700
  '#5BB7BF', // light teal
]

export const RISK_CHART_COLORS = {
  low: '#2E7D32',
  medium: '#D69E2E',
  high: '#D64545',
}

export const CHART_GRID_COLOR = 'var(--color-line, #CFE5D5)'
export const CHART_AXIS_COLOR = 'var(--color-ink-500, #5F8A6D)'

export const chartTooltipStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-surface, #FFFFFF)',
  borderColor: 'var(--color-line, #CFE5D5)',
  borderRadius: '0.75rem',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
  color: 'var(--color-ink-900, #1F3D2B)',
  fontSize: '0.75rem',
}

export function isDarkMode(): boolean {
  if (typeof document === 'undefined') return false
  return document.documentElement.classList.contains('dark')
}
