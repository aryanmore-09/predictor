import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Cpu, RefreshCw, Award, CheckCircle, BarChart3, Clock,
  Target, Activity
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine
} from 'recharts'
import { predictionApi } from '../../api'
import { Card, Button, Skeleton } from '../../components/ui'
import {
  CHART_PALETTE,
  CHART_GRID_COLOR,
  CHART_AXIS_COLOR,
  chartTooltipStyle
} from '../../utils/chartColors'

// ─── Type helpers ─────────────────────────────────────────────────────────────
interface CalibrationCurve {
  fraction_of_positives: number[]
  mean_predicted_value: number[]
  brier_score: number
  n_bins: number
}
interface PRCurve {
  precision: number[]
  recall: number[]
  avg_precision: number
}
interface ModelInfo {
  current_model: {
    version: string
    best_algorithm: string
    feature_columns: string[]
    metrics: Record<string, number>
    all_metrics: Record<string, Record<string, number>>
    feature_importance: { feature: string; importance: number }[]
    trained_at: string
    calibration_method?: string
  } | null
  pr_curve: PRCurve | null
  calibration_curve: CalibrationCurve | null
  brier_score: number | null
  cv_roc_auc_mean: number | null
  cv_roc_auc_std: number | null
  history: {
    id: number
    version: string
    algorithm: string
    accuracy: number
    roc_auc: number
    is_active: boolean
    trained_at: string
  }[]
}

// ─── Metric row ──────────────────────────────────────────────────────────────
function MetricRow({ label, value, colorClass = 'text-ink-900' }: { label: string; value: string; colorClass?: string }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-ink-500 font-medium">{label}</span>
      <span className={`font-bold tabular-nums ${colorClass}`}>{value}</span>
    </div>
  )
}

// ─── Custom Recharts Tooltip ──────────────────────────────────────────────────
function CustomChartTooltip({ active, payload, label, labelKey }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={chartTooltipStyle} className="p-3">
      <p className="font-bold text-ink-900 mb-1">
        {labelKey}: {typeof label === 'number' ? label.toFixed(3) : label}
      </p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-semibold text-xs">
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(4) : p.value}
        </p>
      ))}
    </div>
  )
}

// ─── Calibration Chart ────────────────────────────────────────────────────────
function CalibrationChart({ data, brierScore }: { data: CalibrationCurve; brierScore: number }) {
  const chartData = data.mean_predicted_value.map((x, i) => ({
    predicted: parseFloat(x.toFixed(3)),
    actual: parseFloat((data.fraction_of_positives[i] ?? 0).toFixed(3)),
  }))

  const isGood = brierScore < 0.15
  const isMed = brierScore < 0.25

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-4 border-b border-line pb-3">
        <div>
          <h2 className="text-base font-bold text-ink-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-brand-600" />
            Calibration Curve (Isotonic)
          </h2>
          <p className="text-xs text-ink-500 mt-0.5">
            Reliability diagram showing predicted probabilities vs observed empirical frequency.
          </p>
        </div>
        <div className="text-right shrink-0 bg-mist p-2.5 rounded-xl border border-line">
          <div className="text-[10px] uppercase font-bold tracking-wider text-ink-500">Brier Score</div>
          <div
            className={`text-lg font-extrabold tabular-nums ${
              isGood ? 'text-brand-600' : isMed ? 'text-warning' : 'text-danger'
            }`}
          >
            {brierScore.toFixed(4)}
          </div>
          <div className="text-[10px] text-ink-500">lower = better</div>
        </div>
      </div>

      <div className="w-full h-60">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} />
            <XAxis
              dataKey="predicted"
              type="number"
              domain={[0, 1]}
              tickCount={6}
              tick={{ fontSize: 10, fill: CHART_AXIS_COLOR }}
              label={{ value: 'Mean Predicted Prob.', position: 'insideBottom', offset: -4, fontSize: 10, fill: CHART_AXIS_COLOR }}
            />
            <YAxis
              domain={[0, 1]}
              tickCount={6}
              tick={{ fontSize: 10, fill: CHART_AXIS_COLOR }}
              label={{ value: 'Fraction Positives', angle: -90, position: 'insideLeft', fontSize: 10, fill: CHART_AXIS_COLOR }}
            />
            <Tooltip content={<CustomChartTooltip labelKey="Predicted" />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine
              segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]}
              stroke={CHART_AXIS_COLOR}
              strokeDasharray="4 4"
              label={{ value: 'Ideal Calibration', position: 'insideTopLeft', fontSize: 9, fill: CHART_AXIS_COLOR }}
            />
            <Line
              dataKey="actual"
              name="Calibrated Model"
              stroke={CHART_PALETTE[0]}
              strokeWidth={2.5}
              dot={{ r: 4, fill: CHART_PALETTE[0] }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

// ─── PR-Curve Chart ───────────────────────────────────────────────────────────
function PRCurveChart({ data }: { data: PRCurve }) {
  const chartData = data.recall.map((r, i) => ({
    recall: parseFloat(r.toFixed(3)),
    precision: parseFloat((data.precision[i] ?? 0).toFixed(3)),
  }))

  const isHigh = data.avg_precision > 0.75
  const isMed = data.avg_precision > 0.55

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-4 border-b border-line pb-3">
        <div>
          <h2 className="text-base font-bold text-ink-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-accent-500" />
            Precision-Recall Curve
          </h2>
          <p className="text-xs text-ink-500 mt-0.5">
            Shows trade-off between precision and recall across all classification decision thresholds.
          </p>
        </div>
        <div className="text-right shrink-0 bg-mist p-2.5 rounded-xl border border-line">
          <div className="text-[10px] uppercase font-bold tracking-wider text-ink-500">Avg Precision</div>
          <div
            className={`text-lg font-extrabold tabular-nums ${
              isHigh ? 'text-brand-600' : isMed ? 'text-warning' : 'text-danger'
            }`}
          >
            {data.avg_precision.toFixed(4)}
          </div>
          <div className="text-[10px] text-ink-500">Area under PR curve</div>
        </div>
      </div>

      <div className="w-full h-60">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} />
            <XAxis
              dataKey="recall"
              type="number"
              domain={[0, 1]}
              tickCount={6}
              tick={{ fontSize: 10, fill: CHART_AXIS_COLOR }}
              label={{ value: 'Recall', position: 'insideBottom', offset: -4, fontSize: 10, fill: CHART_AXIS_COLOR }}
            />
            <YAxis
              domain={[0, 1]}
              tickCount={6}
              tick={{ fontSize: 10, fill: CHART_AXIS_COLOR }}
              label={{ value: 'Precision', angle: -90, position: 'insideLeft', fontSize: 10, fill: CHART_AXIS_COLOR }}
            />
            <Tooltip content={<CustomChartTooltip labelKey="Recall" />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              dataKey="precision"
              name="Precision"
              stroke={CHART_PALETTE[1]}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: CHART_PALETTE[1] }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

// ─── CV summary badge ─────────────────────────────────────────────────────────
function CVBadge({ mean, std, label }: { mean: number; std: number; label: string }) {
  return (
    <div className="flex flex-col items-center bg-mist border border-line rounded-xl p-3 text-center">
      <div className="text-[10px] uppercase font-bold tracking-wider text-ink-500 mb-0.5">{label}</div>
      <div className="text-base font-extrabold text-brand-700 tabular-nums">{mean.toFixed(4)}</div>
      <div className="text-[10px] text-ink-500 tabular-nums font-mono">± {std.toFixed(4)}</div>
    </div>
  )
}

export default function AdminModels() {
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [training, setTraining] = useState(false)

  const fetchModelInfo = async () => {
    try {
      const res = await predictionApi.getModelInfo()
      setModelInfo(res.data as ModelInfo)
    } catch {
      toast.error('Failed to load model registry')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchModelInfo()
  }, [])

  const handleRetrain = async () => {
    setTraining(true)
    try {
      const res = await predictionApi.triggerTraining()
      toast.success(`Training complete! Best algorithm: ${res.data.best_algorithm}`)
      fetchModelInfo()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Training failed')
    } finally {
      setTraining(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 py-2">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
      </div>
    )
  }

  const current = modelInfo?.current_model
  const history = modelInfo?.history ?? []
  const allMetrics = current?.all_metrics ?? {}
  const importance = current?.feature_importance ?? []
  const metrics = current?.metrics ?? {}
  const prCurve = modelInfo?.pr_curve
  const calCurve = modelInfo?.calibration_curve
  const brier = modelInfo?.brier_score ?? calCurve?.brier_score ?? null
  const cvMean = modelInfo?.cv_roc_auc_mean ?? metrics.cv_roc_auc_mean ?? null
  const cvStd = modelInfo?.cv_roc_auc_std ?? metrics.cv_roc_auc_std ?? null

  return (
    <div className="space-y-6 py-2">
      {/* Header */}
      <Card className="p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900 tracking-tight">
            ML Model Registry &amp; Benchmarks
          </h1>
          <p className="text-sm text-ink-500 mt-1">
            Track multi-algorithm cross-validation benchmarks, probability calibration, and feature importance.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={handleRetrain}
          loading={training}
          icon={<RefreshCw className="w-4 h-4" />}
        >
          {training ? 'Evaluating Algorithms...' : 'Retrain All Models'}
        </Button>
      </Card>

      {/* CV Summary row */}
      {cvMean !== null && cvStd !== null && (
        <Card className="p-5">
          <h2 className="text-sm font-bold text-ink-900 flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-brand-600" />
            5-Fold Stratified Cross-Validation (Champion Model)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <CVBadge mean={cvMean} std={cvStd} label="ROC-AUC" />
            {['accuracy', 'precision', 'recall', 'f1'].map((m) => {
              const mean = metrics[`cv_${m}_mean`]
              const std = metrics[`cv_${m}_std`]
              if (mean == null) return null
              return <CVBadge key={m} mean={mean} std={std ?? 0} label={m.toUpperCase()} />
            })}
          </div>
        </Card>
      )}

      {/* Multi-Algorithm Benchmark Comparison */}
      <Card className="space-y-4">
        <h2 className="text-base font-bold text-ink-900 flex items-center gap-2 border-b border-line pb-3">
          <Award className="w-5 h-5 text-warning" /> Multi-Algorithm Cross-Validation Benchmark
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(allMetrics).map(([algo, m]: [string, any]) => {
            const isWinner = algo === current?.best_algorithm
            return (
              <div
                key={algo}
                className={`p-4 rounded-xl border transition relative ${
                  isWinner
                    ? 'bg-brand-50 border-brand-500 shadow-xs'
                    : 'bg-white border-line'
                }`}
              >
                {isWinner && (
                  <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-brand-600 text-white shadow-xs">
                    Deployed
                  </span>
                )}
                <div className="font-bold text-sm text-ink-900 mb-3">{algo}</div>
                <div className="space-y-1.5">
                  <MetricRow
                    label="Holdout AUC"
                    value={m.roc_auc != null ? m.roc_auc.toFixed(4) : '—'}
                    colorClass="text-brand-700"
                  />
                  <MetricRow
                    label="CV AUC"
                    value={
                      m.cv_roc_auc_mean != null
                        ? `${m.cv_roc_auc_mean.toFixed(3)} ±${m.cv_roc_auc_std?.toFixed(3)}`
                        : '—'
                    }
                    colorClass="text-accent-600"
                  />
                  <MetricRow
                    label="F1 Score"
                    value={m.f1_score != null ? m.f1_score.toFixed(4) : '—'}
                    colorClass="text-ink-900"
                  />
                  <MetricRow
                    label="Accuracy"
                    value={m.accuracy != null ? `${(m.accuracy * 100).toFixed(1)}%` : '—'}
                    colorClass="text-brand-600"
                  />
                  <MetricRow
                    label="Precision"
                    value={m.precision != null ? `${(m.precision * 100).toFixed(1)}%` : '—'}
                  />
                  <MetricRow
                    label="Recall"
                    value={m.recall != null ? `${(m.recall * 100).toFixed(1)}%` : '—'}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Calibration + PR curve side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {calCurve && brier !== null ? (
          <CalibrationChart data={calCurve} brierScore={brier} />
        ) : (
          <Card className="p-8 text-center text-ink-500 text-sm flex items-center justify-center">
            Retrain models to generate calibration curve
          </Card>
        )}

        {prCurve ? (
          <PRCurveChart data={prCurve} />
        ) : (
          <Card className="p-8 text-center text-ink-500 text-sm flex items-center justify-center">
            Retrain models to generate Precision-Recall curve
          </Card>
        )}
      </div>

      {/* Feature Importance Rankings */}
      <Card className="space-y-4">
        <h2 className="text-base font-bold text-ink-900 flex items-center gap-2 border-b border-line pb-3">
          <BarChart3 className="w-5 h-5 text-brand-600" />
          Predictive Feature Weights &amp; Relative Importance
        </h2>
        <div className="space-y-3">
          {importance.map((f, idx) => {
            const maxImp = importance[0]?.importance ?? 1
            const width = Math.max(5, Math.round((f.importance / maxImp) * 100))
            return (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-ink-900 capitalize font-medium">
                    {f.feature.replace(/_/g, ' ')}
                  </span>
                  <span className="text-ink-500 font-mono font-semibold tabular-nums">{f.importance}</span>
                </div>
                <div className="w-full bg-brand-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-600 transition-all duration-300"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Model History Registry */}
      <Card className="space-y-4">
        <h2 className="text-base font-bold text-ink-900 flex items-center gap-2 border-b border-line pb-3">
          <Clock className="w-5 h-5 text-ink-500" /> Model Version Registry
        </h2>
        <div className="overflow-x-auto border border-line rounded-xl">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-line bg-brand-50 text-ink-700 uppercase font-semibold">
                <th className="py-2.5 px-3">Version</th>
                <th className="py-2.5 px-3">Algorithm</th>
                <th className="py-2.5 px-3">Accuracy</th>
                <th className="py-2.5 px-3">ROC-AUC</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Trained On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink-700">
              {history.map((h) => (
                <tr key={h.id} className="hover:bg-mist transition">
                  <td className="py-2.5 px-3 font-mono text-ink-900 font-medium">{h.version}</td>
                  <td className="py-2.5 px-3 font-semibold text-ink-900">{h.algorithm}</td>
                  <td className="py-2.5 px-3 font-semibold text-brand-600 tabular-nums">
                    {(h.accuracy * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-brand-700 tabular-nums">
                    {h.roc_auc.toFixed(4)}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        h.is_active
                          ? 'bg-brand-50 text-brand-700 border border-brand-200'
                          : 'bg-mist text-ink-500'
                      }`}
                    >
                      {h.is_active ? 'Active' : 'Archived'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-ink-500 font-mono text-[11px]">
                    {new Date(h.trained_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
