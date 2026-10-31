import React, { useEffect, useRef } from 'react'

export const AuthBackground: React.FC = () => {
  const bgRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const isTouch = window.matchMedia('(pointer: coarse)').matches

    const handlePointerMove = (e: PointerEvent) => {
      if (motionQuery.matches || isTouch) return
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        if (bgRef.current) {
          bgRef.current.style.setProperty('--mx', `${e.clientX}px`)
          bgRef.current.style.setProperty('--my', `${e.clientY}px`)
        }
      })
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div
      ref={bgRef}
      className="pointer-events-none fixed inset-0 overflow-hidden -z-10"
      aria-hidden="true"
    >
      {/* 1. Animated Spotlight following pointer (or fixed fallback on touch/reduced motion) */}
      <div className="absolute inset-0 login-spotlight" />

      {/* 2. Radial-masked subtle dot grid texture */}
      <div className="absolute inset-0 login-dot-grid" />

      {/* 3. Blurred mesh gradient blobs drifting with staggered keyframes */}
      <div className="absolute -top-32 -left-20 w-[480px] h-[480px] rounded-full bg-brand-200/50 blur-3xl animate-blob-1 will-change-transform" />
      <div className="absolute top-1/4 -right-24 w-[520px] h-[520px] rounded-full bg-accent-100/60 blur-3xl animate-blob-2 will-change-transform" />
      <div className="absolute -bottom-28 left-1/4 w-[440px] h-[440px] rounded-full bg-brand-300/40 blur-3xl animate-blob-3 will-change-transform" />
      <div className="absolute top-1/3 left-1/3 w-[460px] h-[460px] rounded-full bg-white/70 blur-3xl animate-blob-4 will-change-transform" />
    </div>
  )
}
