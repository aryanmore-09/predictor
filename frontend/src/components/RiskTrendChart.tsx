import React, { useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import { TrendingUp, Calendar, AlertCircle } from 'lucide-react'
import { predictionApi } from '../api'
import type { PredictionHistoryItem } from '../api'
import { Card, Skeleton, RiskBadge, EmptyState } from './ui'
import { CHART_GRID_COLOR, CHART_AXIS_COLOR, chartTooltipStyle } from '../utils/chartColors'

interface RiskTrendChartProps {
  studentId: number
  title?: string
}

export default function RiskTrendChart({ studentId, title = 'Risk Trend Over Time' }: RiskTrendChartProps) {
  const [history, setHistory] = useState<PredictionHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const fetchHistory = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await predictionApi.getStudentHistory(studentId)
        if (!isMounted) return
        const data = Array.isArray(res.data) ? res.data : (res.data as any)?.history || []
        setHistory(data)
      } catch (err: any) {
        if (!isMounted) return
        setError(err.response?.data?.detail || 'Failed to load historical risk records.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    if (studentId) {
      fetchHistory()
    }

    return () => {
      isMounted = false
    }
  }, [studentId])

  if (loading) {
    return (
      <Card className="space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="h-64 sm:h-72 w-full" />
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="space-y-4">
        <div className="border-b border-line pb-3">
          <h3 className="text-base font-bold text-ink-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-600" /> {title}
          </h3>
        </div>
        <EmptyState
          icon={<AlertCircle className="w-6 h-6 text-danger" />}
          title="Risk History Unavailable"
          description={error}
        />
      </Card>
    )
  }

  // Format chart data
  const chartData = history.map((item, idx) => {
    let label = `Pt ${idx + 1}`
    if (item.created_at) {
      const dt = new Date(item.created_at)
      label = dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }
    return {
      name: label,
      rawDate: item.created_at,
      probability: Number((item.dropout_probability * 100).toFixed(1)),
      risk_level: item.risk_level,
      grade_band: item.predicted_grade_band || '-',
      pass_prob: item.pass_probability ? Number((item.pass_probability * 100).toFixed(1)) : null,
      score: item.predicted_score,
    }
  })

  if (chartData.length === 0) {
    return (
      <Card className="space-y-4">
        <div className="border-b border-line pb-3">
          <h3 className="text-base font-bold text-ink-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-600" /> {title}
          </h3>
          <p className="text-xs text-ink-500 mt-0.5">
            Historical trajectory of dropout probability evaluated across past academic milestones
          </p>
        </div>
        <EmptyState
          icon={<TrendingUp className="w-6 h-6 text-brand-500" />}
          title="No Risk History Recorded"
          description="Historical checkpoints will be graphed as evaluations accumulate."
        />
      </Card>
    )
  }

  // Trend direction
  const firstProb = chartData[0].probability
  const lastProb = chartData[chartData.length - 1].probability
  const delta = lastProb - firstProb
  const isImproving = delta < -1
  const isWorsening = delta > 1

  return (
    <Card className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <h3 className="text-base font-bold text-ink-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-600" /> {title}
          </h3>
          <p className="text-xs text-ink-500 mt-0.5">
            Historical trajectory of dropout probability evaluated across past academic milestones
          </p>
        </div>

        {chartData.length > 1 && (
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                isImproving
                  ? 'bg-brand-50 text-brand-700 border-brand-200'
                  : isWorsening
                  ? 'bg-danger-bg text-danger border-red-200'
                  : 'bg-mist text-ink-700 border-line'
              }`}
            >
              {isImproving
                ? `Improving (↓ ${Math.abs(delta).toFixed(1)}%)`
                : isWorsening
                ? `Worsening (↑ ${delta.toFixed(1)}%)`
                : 'Stable Trend'}
            </span>
            <span className="text-xs text-ink-500 font-medium hidden md:inline">
              {chartData.length} checkpoints
            </span>
          </div>
        )}
      </div>

      {/* Chart Canvas */}
      <div className="h-60 sm:h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 15, right: 15, left: -15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} vertical={false} />
            <XAxis
              dataKey="name"
              stroke={CHART_AXIS_COLOR}
              tick={{ fill: CHART_AXIS_COLOR, fontSize: 11 }}
              tickLine={{ stroke: CHART_GRID_COLOR }}
            />
            <YAxis
              domain={[0, 100]}
              unit="%"
              stroke={CHART_AXIS_COLOR}
              tick={{ fill: CHART_AXIS_COLOR, fontSize: 11 }}
              tickLine={{ stroke: CHART_GRID_COLOR }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload
                  return (
                    <div
                      style={chartTooltipStyle}
                      className="p-3 border rounded-xl shadow-md min-w-[160px] space-y-1.5"
                    >
                      <div className="text-[11px] font-bold text-ink-500 border-b border-line pb-1 flex items-center justify-between">
                        <span>{data.name}</span>
                        <span className="text-[10px] uppercase font-bold text-ink-500">
                          Grade {data.grade_band}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ink-500 font-medium">Dropout Risk:</span>
                        <span className="font-extrabold text-ink-900 tabular-nums">
                          {data.probability}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-ink-500">Risk Tier:</span>
                        <RiskBadge risk={data.risk_level} size="sm" />
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />

            {/* Risk Tier Threshold Guidelines */}
            <ReferenceLine
              y={65}
              stroke="#B42318"
              strokeDasharray="4 4"
              label={{ value: 'High Risk (65%)', fill: '#B42318', fontSize: 10, position: 'insideTopRight' }}
            />
            <ReferenceLine
              y={35}
              stroke="#B7791F"
              strokeDasharray="4 4"
              label={{ value: 'Medium Risk (35%)', fill: '#B7791F', fontSize: 10, position: 'insideTopRight' }}
            />

            <Line
              type="monotone"
              dataKey="probability"
              stroke="#0F766E"
              strokeWidth={3}
              dot={{ r: 4, fill: '#0F766E', stroke: '#FFFFFF', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: '#0B5F59', stroke: '#FFFFFF', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Footer */}
      <div className="pt-2 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between text-xs text-ink-500 gap-2">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-brand-600" />
          <span>
            First Recorded: <b className="text-ink-700">{chartData[0].name}</b> ({chartData[0].probability}%)
          </span>
          <span className="mx-1">•</span>
          <span>
            Latest: <b className="text-ink-900">{chartData[chartData.length - 1].name}</b> ({chartData[chartData.length - 1].probability}%)
          </span>
        </div>
        <div className="text-[11px] text-ink-500">
          Thresholds: High ≥ 65% | Medium 35–64% | Low &lt; 35%
        </div>
      </div>
    </Card>
  )
}
