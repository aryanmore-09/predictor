import React from 'react'
import { motion } from 'framer-motion'

export interface SpotlightProps {
  className?: string
  fill?: string
}

/**
 * Aceternity-style Spotlight component.
 * Renders an ambient, soft-focused radiant spotlight cone using SVG filters and framer-motion.
 */
export const Spotlight: React.FC<SpotlightProps> = ({
  className = '',
  fill = 'currentColor',
}) => {
  return (
    <motion.svg
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
      className={`pointer-events-none absolute z-0 h-[169%] w-[138%] lg:w-[84%] ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 3787 2842"
      fill="none"
    >
      <g filter="url(#spotlight-filter)">
        <ellipse
          cx="1924.71"
          cy="273.501"
          rx="1924.71"
          ry="273.501"
          transform="matrix(-0.822377 -0.568943 -0.568943 0.822377 3631.88 2291.09)"
          fill={fill}
          fillOpacity="0.25"
        />
      </g>
      <defs>
        <filter
          id="spotlight-filter"
          x="0.860352"
          y="0.838989"
          width="3785.16"
          height="2840.26"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feGaussianBlur
            stdDeviation="151"
            result="effect1_foregroundBlur_1065_8"
          />
        </filter>
      </defs>
    </motion.svg>
  )
}

/**
 * Aceternity-style Background Beams component.
 * Renders subtle floating, pulsing luminous light beams and an ambient grid mask.
 */
export const BackgroundBeams: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {/* Subtle coordinate grid illuminated by the beams */}
      <svg
        className="absolute inset-0 h-full w-full stroke-ink-300/15 dark:stroke-ink-700/10 [mask-image:radial-gradient(ellipse_at_center,white,transparent_75%)]"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="hero-beams-grid"
            width="44"
            height="44"
            patternUnits="userSpaceOnUse"
          >
            <path d="M.5 44V.5H44" fill="none" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" strokeWidth="0" fill="url(#hero-beams-grid)" />
      </svg>

      {/* Floating Animated Beams */}
      <motion.div
        initial={{ opacity: 0, y: -20, rotate: -35 }}
        animate={{
          opacity: [0.15, 0.45, 0.15],
          y: [0, 18, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-40 left-1/4 h-[420px] w-[550px] rounded-full bg-gradient-to-r from-brand-500/25 via-emerald-400/30 to-transparent blur-3xl filter"
      />
      <motion.div
        initial={{ opacity: 0, y: 25, rotate: 20 }}
        animate={{
          opacity: [0.12, 0.38, 0.12],
          y: [0, -22, 0],
          scale: [1, 1.08, 1],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute top-1/4 -right-24 h-[380px] w-[500px] rounded-full bg-gradient-to-l from-teal-500/20 via-brand-400/25 to-transparent blur-3xl filter"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{
          opacity: [0.2, 0.5, 0.2],
          scale: [0.95, 1.05, 0.95],
        }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        className="absolute top-1/2 left-1/3 h-64 w-[600px] -rotate-12 rounded-full bg-gradient-to-r from-brand-600/15 via-accent-500/20 to-transparent blur-3xl filter"
      />
    </div>
  )
}

