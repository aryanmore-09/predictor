import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Users, Cpu, Download, RefreshCw, Upload, ShieldAlert, CheckCircle,
  AlertTriangle, BookOpen, Building2, ArrowRight
} from 'lucide-react'
import { adminApi, predictionApi, reportApi } from '../../api'

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null)
  const [deptData, setDeptData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [retraining, setRetraining] = useState(false)

  const loadDashboard = async () => {
    try {
      const [dashRes, deptRes] = await Promise.all([
        adminApi.getDashboard(),
        adminApi.getDeptComparison(),
      ])
      setData(dashRes.data)
      setDeptData(deptRes.data)
    } catch {
      toast.error('Failed to load admin analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadDashboard() }, [])

  const handleRetrain = async () => {
    setRetraining(true)
    try {
      const res = await predictionApi.triggerTraining()
      toast.success(`Retrained! Best algorithm: ${res.data.best_algorithm}`)
      loadDashboard()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Training failed')
    } finally {
      setRetraining(false)
    }
  }

  const handleExportInstitutional = async () => {
    try {
      const res = await reportApi.exportInstitutionalCsv()
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `institutional_risk_report_${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Institutional report exported')
    } catch {
      toast.error('Failed to export report')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner" />
      </div>
    )
  }

  const dist = data?.risk_distribution || {}
  const model = data?.model_info
  const total = data?.total_students || 1

  return (
    <div className="space-y-6">
      {/* ── Page Banner ── */}
      <div className="page-banner">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold">Institutional Administration</h1>
          <p>MIT School of Computing • Dept. of CSE System Overview</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExportInstitutional} className="btn-banner-outline text-xs">
            <Download className="w-4 h-4" /> Export Institutional CSV
          </button>
          <button
            onClick={handleRetrain}
            disabled={retraining}
            className="btn-banner-cta text-xs"
          >
            <RefreshCw className={`w-4 h-4 ${retraining ? 'animate-spin' : ''}`} />
            {retraining ? 'Retraining...' : 'Trigger Model Retraining'}
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-muted)' }}>Total Students</div>
          <div className="text-3xl font-extrabold" style={{ color: 'var(--color-heading)' }}>{data?.total_students}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>{data?.total_faculty} Faculty Advisors</div>
        </div>
        <div className="stat-card">
          <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-muted)' }}>At-Risk Total</div>
          <div className="text-3xl font-extrabold text-risk-high">{data?.at_risk_count}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
            {((data?.at_risk_count / total) * 100).toFixed(1)}% of student body
          </div>
        </div>
        <div className="stat-card">
          <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-muted)' }}>Institution Avg Attendance</div>
          <div className="text-3xl font-extrabold" style={{ color: 'var(--color-heading)' }}>{data?.overall_avg_attendance}%</div>
          <div className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Cross-semester average</div>
        </div>
        <div className="stat-card">
          <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-muted)' }}>Institution Avg Marks</div>
          <div className="text-3xl font-extrabold" style={{ color: 'var(--color-heading)' }}>{data?.overall_avg_marks}%</div>
          <div className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Overall academic performance</div>
        </div>
      </div>

      {/* ── ML Model Status & Risk Distribution ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active ML Model */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--color-heading)' }}>
              <Cpu className="w-5 h-5" style={{ color: 'var(--color-primary)' }} /> Active Machine Learning Model
            </h2>
            <Link
              to="/admin/models"
              className="text-xs font-semibold hover:underline"
              style={{ color: 'var(--color-accent)' }}
            >
              Model History →
            </Link>
          </div>

          {model ? (
            <div className="space-y-3">
              <div className="inner-panel grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="font-bold uppercase tracking-wider text-[10px] mb-0.5" style={{ color: 'var(--color-muted)' }}>Algorithm</div>
                  <div className="font-extrabold text-sm" style={{ color: 'var(--color-heading)' }}>{model.algorithm}</div>
                </div>
                <div>
                  <div className="font-bold uppercase tracking-wider text-[10px] mb-0.5" style={{ color: 'var(--color-muted)' }}>Version</div>
                  <div className="font-mono text-xs" style={{ color: 'var(--color-heading)' }}>{model.version}</div>
                </div>
                <div>
                  <div className="font-bold uppercase tracking-wider text-[10px] mb-0.5" style={{ color: 'var(--color-muted)' }}>Accuracy</div>
                  <div className="font-extrabold text-sm" style={{ color: 'var(--color-primary)' }}>{(model.accuracy * 100).toFixed(1)}%</div>
                </div>
                <div>
                  <div className="font-bold uppercase tracking-wider text-[10px] mb-0.5" style={{ color: 'var(--color-muted)' }}>ROC-AUC</div>
                  <div className="font-extrabold text-sm" style={{ color: 'var(--color-primary)' }}>{model.roc_auc.toFixed(4)}</div>
                </div>
              </div>
              <div className="text-[11px]" style={{ color: 'var(--color-muted)' }}>
                Trained at: {new Date(model.trained_at).toLocaleString()}
              </div>
            </div>
          ) : (
            <div className="inner-panel text-xs" style={{ color: 'var(--color-muted)' }}>
              No active model detected. Trigger training to deploy.
            </div>
          )}
        </div>

        {/* Risk Distribution */}
        <div className="card p-6 space-y-4">
          <h2 className="text-base font-bold" style={{ color: 'var(--color-heading)' }}>Cohort Distribution</h2>
          <div className="space-y-4">
            {/* High Risk */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="flex items-center gap-2 font-medium" style={{ color: 'var(--color-heading)' }}>
                  <ShieldAlert className="w-4 h-4 text-risk-high" /> High Risk
                </span>
                <span className="font-bold text-risk-high">{dist.high || 0} students</span>
              </div>
              <div className="progress-bar">
                <div className="fill-risk-high progress-fill" style={{ width: `${((dist.high || 0) / total) * 100}%` }} />
              </div>
            </div>
            {/* Medium Risk */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="flex items-center gap-2 font-medium" style={{ color: 'var(--color-heading)' }}>
                  <AlertTriangle className="w-4 h-4 text-risk-medium" /> Medium Risk
                </span>
                <span className="font-bold text-risk-medium">{dist.medium || 0} students</span>
              </div>
              <div className="progress-bar">
                <div className="fill-risk-medium progress-fill" style={{ width: `${((dist.medium || 0) / total) * 100}%` }} />
              </div>
            </div>
            {/* Low Risk */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="flex items-center gap-2 font-medium" style={{ color: 'var(--color-heading)' }}>
                  <CheckCircle className="w-4 h-4 text-risk-low" /> Low Risk
                </span>
                <span className="font-bold text-risk-low">{dist.low || 0} students</span>
              </div>
              <div className="progress-bar">
                <div className="fill-risk-low progress-fill" style={{ width: `${((dist.low || 0) / total) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Department Breakdown Table ── */}
      <div className="card p-6 space-y-4">
        <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--color-heading)' }}>
          <Building2 className="w-5 h-5" style={{ color: 'var(--color-primary)' }} /> Academic Stream Breakdown
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="table-header-row">
                <th className="py-3 px-3 font-semibold uppercase rounded-tl-lg">Department</th>
                <th className="py-3 px-3 font-semibold uppercase">Enrolled</th>
                <th className="py-3 px-3 font-semibold uppercase">High Risk Count</th>
                <th className="py-3 px-3 font-semibold uppercase rounded-tr-lg">Avg Marks</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {deptData.map((d, idx) => (
                <tr key={idx} className="table-row transition-colors">
                  <td className="py-3 px-3 font-semibold" style={{ color: 'var(--color-heading)' }}>{d.department}</td>
                  <td className="py-3 px-3" style={{ color: 'var(--color-muted)' }}>{d.total}</td>
                  <td className="py-3 px-3 font-bold text-risk-high">{d.high_risk}</td>
                  <td className="py-3 px-3" style={{ color: 'var(--color-muted)' }}>{d.avg_marks}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
