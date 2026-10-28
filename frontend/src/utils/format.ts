/**
 * Pluralization and formatting utilities.
 */

export function pluralize(count: number, singular: string, plural?: string): string {
  const noun = count === 1 ? singular : (plural || `${singular}s`)
  return `${count} ${noun}`
}

export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}
