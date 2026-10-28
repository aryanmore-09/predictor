import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Cpu, RefreshCw, Award, CheckCircle, BarChart3, Clock } from 'lucide-react'
import { predictionApi } from '../../api'

export default function AdminModels() {
  const [modelInfo, setModelInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [training, setTraining] = useState(false)

  const fetchModelInfo = async () => {
    try {
      const res = await predictionApi.getModelInfo()
      setModelInfo(res.data)
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
    return <div className="text-center py-20 text-slate-400">Loading model registry & benchmarks...</div>
  }

  const current = modelInfo?.current_model
  const history = modelInfo?.history || []
  const allMetrics = current?.all_metrics || {}
  const importance = current?.feature_importance || []

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">ML Model Registry & Benchmarks</h1>
          <p className="text-sm text-slate-400">Track algorithm performance, ROC-AUC comparisons, and feature importance rankings.</p>
        </div>
        <button
          onClick={handleRetrain}
          disabled={training}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${training ? 'animate-spin' : ''}`} />
          {training ? 'Evaluating Algorithms...' : 'Retrain All Models'}
        </button>
      </div>

      {/* Algorithm Benchmark Comparison */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" /> Multi-Algorithm Cross-Validation Benchmark
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(allMetrics).map(([algo, metrics]: [string, any]) => {
            const isWinner = algo === current?.best_algorithm
            return (
              <div
                key={algo}
                className={`p-4 rounded-xl border relative ${
                  isWinner ? 'bg-purple-950/20 border-purple-500/40 shadow-lg' : 'bg-slate-950 border-slate-800'
                }`}
              >
                {isWinner && (
                  <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Deployed
                  </span>
                )}
                <div className="font-bold text-sm text-white">{algo}</div>
                <div className="mt-3 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>ROC-AUC:</span>
                    <span className="font-bold text-blue-400">{metrics.roc_auc.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>F1 Score:</span>
                    <span className="font-bold text-purple-400">{metrics.f1_score.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Accuracy:</span>
                    <span className="font-bold text-emerald-400">{(metrics.accuracy * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Precision:</span>
                    <span className="font-bold text-slate-200">{(metrics.precision * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Feature Importance Rankings */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-400" /> Predictive Feature Weights & Importance
        </h2>
        <div className="space-y-2.5">
          {importance.map((f: any, idx: number) => {
            const width = Math.max(8, Math.round(f.importance * 100 * 3.5))
            return (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 capitalize font-medium">{f.feature.replace(/_/g, ' ')}</span>
                  <span className="text-slate-400 font-mono">{f.importance}</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(width, 100)}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Model History Registry */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-400" /> Model Version Registry
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                <th className="py-2.5 px-3">Version</th>
                <th className="py-2.5 px-3">Algorithm</th>
                <th className="py-2.5 px-3">Accuracy</th>
                <th className="py-2.5 px-3">ROC-AUC</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Trained On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {history.map((h: any) => (
                <tr key={h.id}>
                  <td className="py-2.5 px-3 font-mono text-slate-300">{h.version}</td>
                  <td className="py-2.5 px-3 font-semibold text-white">{h.algorithm}</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-semibold">{(h.accuracy * 100).toFixed(1)}%</td>
                  <td className="py-2.5 px-3 text-blue-400 font-semibold">{h.roc_auc.toFixed(4)}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      h.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'text-slate-500'
                    }`}>
                      {h.is_active ? 'Active' : 'Archived'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">{new Date(h.trained_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
