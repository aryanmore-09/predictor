import React from 'react'
import { BarChart3, GraduationCap, Bell, UserCheck } from 'lucide-react'

export const ShieldMotif: React.FC = () => {
  return (
    <div
      className="relative w-[130px] md:w-[220px] flex flex-col items-center select-none"
      aria-hidden="true"
    >
      {/* Expanding pulse ring behind shield */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 md:w-48 md:h-48 rounded-full border border-brand-400/40 bg-brand-200/20 animate-pulse-ring pointer-events-none -z-10" />

      {/* Floating shield container */}
      <div className="animate-shield-float relative w-full flex justify-center items-center">
        <svg
          viewBox="0 0 200 230"
          className="w-full h-auto drop-shadow-md"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#149088" />
              <stop offset="100%" stopColor="#0B5F59" />
            </linearGradient>
            <linearGradient id="shieldGloss" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Shield Body */}
          <path
            d="M 100 16 C 138 16 178 24 186 38 C 186 112 154 176 100 208 C 46 176 14 112 14 38 C 22 24 62 16 100 16 Z"
            fill="url(#shieldGrad)"
            stroke="rgba(255, 255, 255, 0.55)"
            strokeWidth="2.5"
          />

          {/* Glossy Top Highlight */}
          <path
            d="M 100 20 C 135 20 171 27 178 39 C 178 96 150 126 100 126 C 50 126 22 96 22 39 C 29 27 65 20 100 20 Z"
            fill="url(#shieldGloss)"
          />

          {/* Inner subtle stroke accent */}
          <path
            d="M 100 26 C 132 26 166 33 173 45 C 173 108 144 163 100 192 C 56 163 27 108 27 45 C 34 33 68 26 100 26 Z"
            fill="none"
            stroke="rgba(255, 255, 255, 0.18)"
            strokeWidth="1.5"
          />

          {/* Bold Checkmark with draw-in animation */}
          <path
            d="M 66 108 L 92 134 L 140 82"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="checkmark-path"
          />
        </svg>

        {/* Orbiting accents (hidden below md) */}
        <div className="hidden md:flex absolute -top-3 -left-14 animate-chip-1 bg-white/70 backdrop-blur-md border border-white/80 shadow-xs rounded-xl px-2.5 py-1.5 items-center gap-2 text-xs font-semibold text-ink-900 pointer-events-none select-none z-10">
          <div className="w-5 h-5 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600">
            <BarChart3 className="w-3.5 h-3.5" />
          </div>
          <span>Risk Metrics</span>
        </div>

        <div className="hidden md:flex absolute top-4 -right-16 animate-chip-2 bg-white/70 backdrop-blur-md border border-white/80 shadow-xs rounded-xl px-2.5 py-1.5 items-center gap-2 text-xs font-semibold text-ink-900 pointer-events-none select-none z-10">
          <div className="w-5 h-5 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600">
            <GraduationCap className="w-3.5 h-3.5" />
          </div>
          <span>Academic Path</span>
        </div>

        <div className="hidden md:flex absolute -bottom-2 -left-12 animate-chip-3 bg-white/70 backdrop-blur-md border border-white/80 shadow-xs rounded-xl px-2.5 py-1.5 items-center gap-2 text-xs font-semibold text-ink-900 pointer-events-none select-none z-10">
          <div className="w-5 h-5 rounded-lg bg-accent-50 flex items-center justify-center text-accent-600">
            <Bell className="w-3.5 h-3.5" />
          </div>
          <span>Early Alert</span>
        </div>

        <div className="hidden md:flex absolute bottom-4 -right-14 animate-chip-4 bg-white/70 backdrop-blur-md border border-white/80 shadow-xs rounded-xl px-2.5 py-1.5 items-center gap-2 text-xs font-semibold text-ink-900 pointer-events-none select-none z-10">
          <div className="w-5 h-5 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600">
            <UserCheck className="w-3.5 h-3.5" />
          </div>
          <span>Interventions</span>
        </div>
      </div>

      {/* Soft Elliptical Shadow synchronized with shield elevation */}
      <div className="w-20 md:w-36 h-3 md:h-3.5 mx-auto rounded-[100%] bg-brand-900/20 blur-md animate-shield-shadow mt-2.5 pointer-events-none" />
    </div>
  )
}

