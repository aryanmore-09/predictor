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
      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-blue-500/20 bg-blue-950/20 text-blue-200/90 text-xs shadow-sm ${className}`}
    >
      <Info className="w-4 h-4 text-blue-400 shrink-0" />
      <span className={compact ? 'text-[11px] leading-tight' : 'leading-relaxed'}>
        <strong>Advisory:</strong> This system supports mentors and does not make decisions on its own. Predictions are estimates, not facts.
      </span>
    </div>
  )
}
