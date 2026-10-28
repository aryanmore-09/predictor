import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Users, Cpu, Download, RefreshCw, ShieldAlert, CheckCircle,
  AlertTriangle, Building2, Calendar, Award
} from 'lucide-react'
import { adminApi, predictionApi, reportApi } from '../../api'
import { Card, StatCard, Button, ProgressBar, Skeleton } from '../../components/ui'

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
      setDeptData(deptRes.data || [])
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
      <div className="space-y-6 py-2">
        <Skeleton className="h-28 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const dist = data?.risk_distribution || {}
  const model = data?.model_info
  const total = data?.total_students || 1

  return (
    <div className="space-y-6 py-2">
      {/* Page Banner */}
      <Card className="p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900 tracking-tight">
            Institutional Administration
          </h1>
          <p className="text-sm text-ink-500 mt-1">
            MIT School of Computing • Dept. of CSE System Overview
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportInstitutional}
            icon={<Download className="w-4 h-4" />}
          >
            Export Institutional CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleRetrain}
            loading={retraining}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Trigger Model Retraining
          </Button>
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Students"
          value={data?.total_students}
          caption={`${data?.total_faculty} Faculty Advisors`}
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          label="At-Risk Total"
          value={data?.at_risk_count}
          caption={`${(((data?.at_risk_count || 0) / total) * 100).toFixed(1)}% of student body`}
          icon={<ShieldAlert className="w-4 h-4" />}
          valueClassName="text-danger"
        />
        <StatCard
          label="Institution Avg Attendance"
          value={`${data?.overall_avg_attendance}%`}
          caption="Cross-semester average"
          icon={<Calendar className="w-4 h-4" />}
          valueClassName="text-accent-600"
        />
        <StatCard
          label="Institution Avg Marks"
          value={`${data?.overall_avg_marks}%`}
          caption="Overall academic performance"
          icon={<Award className="w-4 h-4" />}
          valueClassName="text-brand-600"
        />
      </div>

      {/* ML Model Status & Risk Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active ML Model */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h2 className="text-base font-bold text-ink-900 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-brand-600" /> Active Machine Learning Model
            </h2>
            <Link
              to="/admin/models"
              className="text-xs font-semibold text-brand-600 hover:underline"
            >
              Model History →
            </Link>
          </div>

          {model ? (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-mist border border-line grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="font-bold uppercase tracking-wider text-[10px] text-ink-500 mb-0.5">Algorithm</div>
                  <div className="font-extrabold text-sm text-ink-900">{model.algorithm}</div>
                </div>
                <div>
                  <div className="font-bold uppercase tracking-wider text-[10px] text-ink-500 mb-0.5">Version</div>
                  <div className="font-mono text-xs text-ink-900 font-semibold">{model.version}</div>
                </div>
                <div>
                  <div className="font-bold uppercase tracking-wider text-[10px] text-ink-500 mb-0.5">Accuracy</div>
                  <div className="font-extrabold text-sm text-brand-700 tabular-nums">{(model.accuracy * 100).toFixed(1)}%</div>
                </div>
                <div>
                  <div className="font-bold uppercase tracking-wider text-[10px] text-ink-500 mb-0.5">ROC-AUC</div>
                  <div className="font-extrabold text-sm text-brand-700 tabular-nums">{model.roc_auc.toFixed(4)}</div>
                </div>
              </div>
              <div className="text-[11px] text-ink-500">
                Trained at: {new Date(model.trained_at).toLocaleString()}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-mist border border-line text-xs text-ink-500">
              No active model detected. Trigger training to deploy.
            </div>
          )}
        </Card>

        {/* Risk Distribution */}
        <Card className="space-y-4">
          <h2 className="text-base font-bold text-ink-900 border-b border-line pb-3">Cohort Distribution</h2>
          <div className="space-y-4">
            {/* High Risk */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1.5 font-semibold">
                <span className="flex items-center gap-2 text-danger">
                  <ShieldAlert className="w-4 h-4" /> High Risk
                </span>
                <span className="font-bold text-danger tabular-nums">{dist.high || 0} students</span>
              </div>
              <ProgressBar
                value={dist.high || 0}
                max={total}
                variant="high"
                height="md"
              />
            </div>
            {/* Medium Risk */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1.5 font-semibold">
                <span className="flex items-center gap-2 text-warning">
                  <AlertTriangle className="w-4 h-4" /> Medium Risk
                </span>
                <span className="font-bold text-warning tabular-nums">{dist.medium || 0} students</span>
              </div>
              <ProgressBar
                value={dist.medium || 0}
                max={total}
                variant="medium"
                height="md"
              />
            </div>
            {/* Low Risk */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1.5 font-semibold">
                <span className="flex items-center gap-2 text-brand-700">
                  <CheckCircle className="w-4 h-4" /> Low Risk
                </span>
                <span className="font-bold text-brand-700 tabular-nums">{dist.low || 0} students</span>
              </div>
              <ProgressBar
                value={dist.low || 0}
                max={total}
                variant="low"
                height="md"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Department Breakdown Table */}
      <Card className="space-y-4">
        <h2 className="text-base font-bold text-ink-900 flex items-center gap-2 border-b border-line pb-3">
          <Building2 className="w-5 h-5 text-brand-600" /> Academic Stream Breakdown
        </h2>
        <div className="overflow-x-auto border border-line rounded-xl">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-line bg-brand-50 text-ink-700 uppercase font-semibold">
                <th className="py-3 px-3.5">Department</th>
                <th className="py-3 px-3.5">Enrolled</th>
                <th className="py-3 px-3.5">High Risk Count</th>
                <th className="py-3 px-3.5">Avg Marks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink-700">
              {deptData.map((d, idx) => (
                <tr key={idx} className="hover:bg-mist transition">
                  <td className="py-3 px-3.5 font-semibold text-ink-900">{d.department}</td>
                  <td className="py-3 px-3.5 tabular-nums text-ink-700">{d.total}</td>
                  <td className="py-3 px-3.5 font-bold text-danger tabular-nums">{d.high_risk}</td>
                  <td className="py-3 px-3.5 tabular-nums text-ink-700">{d.avg_marks}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
