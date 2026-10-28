import React from 'react'
import { Info } from 'lucide-react'

interface PredictionDisclaimerProps {
  className?: string
  compact?: boolean
}

export default function PredictionDisclaimer({ className = '', compact = false }: PredictionDisclaimerProps) {
  return (
    <div
      role="note"
      aria-label="Prediction Advisory"
      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-accent-100 bg-accent-50 text-accent-700 text-xs shadow-xs ${className}`}
    >
      <Info className="w-4 h-4 text-accent-500 shrink-0" />
      <span className={compact ? 'text-[11px] leading-tight' : 'leading-relaxed'}>
        <strong>Advisory:</strong> This system supports mentors and does not make automated decisions. Predictions are estimates to facilitate proactive academic support.
      </span>
    </div>
  )
}
