import React, { useState, useEffect, useRef } from 'react'
import {
  Sliders, RotateCcw, TrendingDown, TrendingUp, Minus,
  Sparkles, CheckCircle, Clock, BookOpen, Brain, Activity, HelpCircle
} from 'lucide-react'
import { predictionApi } from '../api'
import type { SimulationResponse, SimulationResult } from '../api'
import { Card, RiskBadge, Button, Skeleton, EmptyState } from './ui'

interface WhatIfSimulatorProps {
  studentId?: number
  studentName?: string
}

interface SliderConfig {
  key: 'attendance_percentage' | 'avg_marks' | 'assignment_submission_rate' | 'study_hours' | 'stress_score' | 'motivation_score'
  label: string
  min: number
  max: number
  step: number
  unit: string
  icon: React.ReactNode
  description: string
}

const SLIDER_CONFIGS: SliderConfig[] = [
  {
    key: 'attendance_percentage',
    label: 'Class Attendance',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    icon: <Clock className="w-4 h-4 text-brand-600" />,
    description: 'Lecture and lab presence percentage across enrolled subjects',
  },
  {
    key: 'avg_marks',
    label: 'Average Score',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    icon: <BookOpen className="w-4 h-4 text-accent-500" />,
    description: 'Weighted continuous assessment and examination score',
  },
  {
    key: 'assignment_submission_rate',
    label: 'Assignment Submission',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    icon: <CheckCircle className="w-4 h-4 text-brand-600" />,
    description: 'Percentage of scheduled course assignments submitted',
  },
  {
    key: 'study_hours',
    label: 'Daily Study Hours',
    min: 0,
    max: 16,
    step: 0.5,
    unit: 'h/day',
    icon: <Brain className="w-4 h-4 text-warning" />,
    description: 'Self-directed study and revision time per day outside lectures',
  },
  {
    key: 'stress_score',
    label: 'Perceived Stress Score',
    min: 1,
    max: 5,
    step: 1,
    unit: '/ 5',
    icon: <Activity className="w-4 h-4 text-danger" />,
    description: 'Self-reported stress level (1 = Very Low Stress, 5 = Severe Stress)',
  },
  {
    key: 'motivation_score',
    label: 'Academic Motivation',
    min: 1,
    max: 5,
    step: 1,
    unit: '/ 5',
    icon: <Sparkles className="w-4 h-4 text-warning" />,
    description: 'Academic drive and engagement (1 = Disengaged, 5 = Highly Driven)',
  },
]

export default function WhatIfSimulator({ studentId, studentName }: WhatIfSimulatorProps) {
  const [loading, setLoading] = useState(true)
  const [simulating, setSimulating] = useState(false)
  const [baseValues, setBaseValues] = useState<Record<string, number>>({})
  const [sliderValues, setSliderValues] = useState<Record<string, number>>({})
  const [originalResult, setOriginalResult] = useState<SimulationResult | null>(null)
  const [simulatedResult, setSimulatedResult] = useState<SimulationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Timer ref for 400ms debounce
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Initial load to retrieve baseline features & model score
  useEffect(() => {
    let isMounted = true
    const initBaseline = async () => {
      setLoading(true)
      setError(null)
      try {
        const payload = studentId ? { student_id: studentId } : {}
        const res = await predictionApi.simulate(payload)
        if (!isMounted) return
        const data: SimulationResponse = res.data

        const initialSliders: Record<string, number> = {
          attendance_percentage: data.base_features?.attendance_percentage ?? 75,
          avg_marks: data.base_features?.avg_marks ?? 60,
          assignment_submission_rate: data.base_features?.assignment_submission_rate ?? 80,
          study_hours: data.base_features?.study_hours ?? 4,
          stress_score: data.base_features?.stress_score ?? 3,
          motivation_score: data.base_features?.motivation_score ?? 3,
        }

        setBaseValues(initialSliders)
        setSliderValues(initialSliders)
        setOriginalResult(data.original)
        setSimulatedResult(data.simulated)
      } catch (err: any) {
        if (!isMounted) return
        setError(err.response?.data?.detail || 'Failed to initialize simulation model.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    initBaseline()
    return () => {
      isMounted = false
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [studentId])

  // Debounced simulation handler (400 ms)
  const runDebouncedSimulation = (newSliders: Record<string, number>) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    setSimulating(true)
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const payload = {
          student_id: studentId,
          ...newSliders,
        }
        const res = await predictionApi.simulate(payload)
        setSimulatedResult(res.data.simulated)
        if (!originalResult) {
          setOriginalResult(res.data.original)
        }
      } catch (err: any) {
        console.error('Simulation error:', err)
      } finally {
        setSimulating(false)
      }
    }, 400)
  }

  const handleSliderChange = (key: string, value: number) => {
    const updated = { ...sliderValues, [key]: value }
    setSliderValues(updated)
    runDebouncedSimulation(updated)
  }

  const handleReset = () => {
    setSliderValues(baseValues)
    runDebouncedSimulation(baseValues)
  }

  if (loading) {
    return (
      <Card className="space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="space-y-4">
        <div className="border-b border-line pb-3">
          <h3 className="text-base font-bold text-ink-900 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-brand-600" /> What-If Simulator
          </h3>
        </div>
        <EmptyState
          icon={<Sliders className="w-6 h-6 text-brand-500" />}
          title="Simulation Unavailable"
          description={error}
          action={
            <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
              Reload Simulator
            </Button>
          }
        />
      </Card>
    )
  }

  const origProb = originalResult ? originalResult.dropout_probability * 100 : 0
  const simProb = simulatedResult ? simulatedResult.dropout_probability * 100 : 0
  const delta = simProb - origProb
  const isReduced = delta < -0.05
  const isIncreased = delta > 0.05

  const hasModifications = Object.keys(baseValues).some(
    (k) => sliderValues[k] !== baseValues[k]
  )

  return (
    <Card className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-ink-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-brand-600" /> What-If Simulator
            </h3>
            {simulating && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-50 text-accent-700 border border-accent-100 animate-pulse">
                Evaluating...
              </span>
            )}
          </div>
          <p className="text-xs text-ink-500 mt-0.5">
            Adjust hypothetical performance, engagement, and wellness indicators to preview expected model outcomes in real time without altering records.
          </p>
        </div>

        {hasModifications && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleReset}
            icon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Reset to Baseline
          </Button>
        )}
      </div>

      {/* Before / After Comparison Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Baseline (Current) */}
        <div className="p-4 rounded-xl bg-mist border border-line flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
              Current Baseline
            </span>
            <span className="text-[10px] font-medium text-ink-500">From Records</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div>
              <div className="text-xs text-ink-500 font-medium">Risk Level</div>
              <div className="mt-1">
                <RiskBadge risk={(originalResult?.risk_level as any) || 'low'} size="md" />
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-ink-500 font-medium">Dropout Probability</div>
              <div className="text-lg font-extrabold text-ink-900 tabular-nums">
                {origProb.toFixed(1)}%
              </div>
            </div>
          </div>
          <div className="pt-2 border-t border-line/60 flex items-center justify-between text-xs text-ink-500">
            <span>Predicted Grade: <b>{originalResult?.grade_band || 'B'}</b></span>
            {originalResult?.predicted_score && (
              <span className="tabular-nums">Avg: {originalResult.predicted_score.toFixed(1)}%</span>
            )}
          </div>
        </div>

        {/* Delta Indicator */}
        <div className="p-4 rounded-xl bg-surface border border-brand-200/80 flex flex-col justify-center items-center text-center space-y-2 shadow-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
            Simulated Risk Delta
          </div>
          <div className="flex items-center gap-1.5">
            {isReduced ? (
              <span className="p-2 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                <TrendingDown className="w-5 h-5 text-brand-600" />
              </span>
            ) : isIncreased ? (
              <span className="p-2 rounded-full bg-danger-bg text-danger border border-red-200">
                <TrendingUp className="w-5 h-5 text-danger" />
              </span>
            ) : (
              <span className="p-2 rounded-full bg-mist text-ink-500 border border-line">
                <Minus className="w-5 h-5" />
              </span>
            )}
            <span
              className={`text-2xl font-black tabular-nums ${
                isReduced
                  ? 'text-brand-700'
                  : isIncreased
                  ? 'text-danger'
                  : 'text-ink-700'
              }`}
            >
              {delta > 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`}
            </span>
          </div>
          <p className="text-[11px] text-ink-500 max-w-[200px] leading-tight">
            {isReduced
              ? 'Projected improvement in student retention and academic standing.'
              : isIncreased
              ? 'Warning: Simulated scenario increases risk of academic attrition.'
              : 'Simulated parameters result in identical risk band outcome.'}
          </p>
        </div>

        {/* Simulated (Projected) */}
        <div className="p-4 rounded-xl bg-brand-50/60 border border-brand-200 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-800">
              Simulated Projection
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-200 text-brand-800">
              What-If Model
            </span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div>
              <div className="text-xs text-brand-800 font-medium">Projected Risk</div>
              <div className="mt-1">
                <RiskBadge risk={(simulatedResult?.risk_level as any) || 'low'} size="md" />
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-brand-800 font-medium">Projected Dropout</div>
              <div className="text-lg font-extrabold text-brand-900 tabular-nums">
                {simProb.toFixed(1)}%
              </div>
            </div>
          </div>
          <div className="pt-2 border-t border-brand-200/60 flex items-center justify-between text-xs text-brand-800">
            <span>Projected Grade: <b>{simulatedResult?.grade_band || 'B'}</b></span>
            {simulatedResult?.predicted_score && (
              <span className="tabular-nums">Avg: {simulatedResult.predicted_score.toFixed(1)}%</span>
            )}
          </div>
        </div>
      </div>

      {/* Sliders Grid */}
      <div className="pt-2">
        <div className="text-xs font-bold text-ink-900 uppercase tracking-wider mb-3">
          Interactive Parameter Overrides
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SLIDER_CONFIGS.map((cfg) => {
            const currentVal = sliderValues[cfg.key] ?? cfg.min
            const baselineVal = baseValues[cfg.key] ?? cfg.min
            const isModified = currentVal !== baselineVal

            return (
              <div
                key={cfg.key}
                className={`p-3.5 rounded-xl border transition-all ${
                  isModified
                    ? 'bg-brand-50/40 border-brand-300 ring-1 ring-brand-200'
                    : 'bg-mist border-line'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-ink-900">
                    {cfg.icon}
                    <span>{cfg.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-ink-900 tabular-nums px-2 py-0.5 rounded-md bg-surface border border-line shadow-2xs">
                      {currentVal} {cfg.unit}
                    </span>
                  </div>
                </div>

                <div className="text-[10px] text-ink-500 mb-2 truncate" title={cfg.description}>
                  {cfg.description}
                </div>

                {/* Slider input */}
                <input
                  type="range"
                  min={cfg.min}
                  max={cfg.max}
                  step={cfg.step}
                  value={currentVal}
                  onChange={(e) => handleSliderChange(cfg.key, parseFloat(e.target.value))}
                  className="w-full accent-[#0F766E] cursor-pointer"
                />

                <div className="flex justify-between items-center text-[10px] text-ink-500 mt-1">
                  <span>{cfg.min} {cfg.unit}</span>
                  <span className="text-[9px] font-semibold text-brand-700">
                    Baseline: {baselineVal} {cfg.unit}
                  </span>
                  <span>{cfg.max} {cfg.unit}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

