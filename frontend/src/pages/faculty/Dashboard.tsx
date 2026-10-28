import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Users, AlertTriangle, ShieldAlert, CheckCircle, RefreshCw, Download, ArrowRight, Eye, Calendar, Award } from 'lucide-react'
import { facultyApi, predictionApi, reportApi } from '../../api'
import { Card, StatCard, Button, RiskBadge, Skeleton } from '../../components/ui'

export default function FacultyDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [predicting, setPredicting] = useState(false)

  const loadData = async () => {
    try {
      const res = await facultyApi.getDashboard()
      setData(res.data)
    } catch {
      toast.error('Failed to load faculty dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handlePredictAll = async () => {
    setPredicting(true)
    try {
      const res = await predictionApi.predictAll()
      toast.success(`Evaluated ${res.data.successful} students!`)
      loadData()
    } catch {
      toast.error('Batch prediction failed')
    } finally {
      setPredicting(false)
    }
  }

  const handleExportCsv = async () => {
    try {
      const res = await reportApi.exportStudentsCsv()
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `students_risk_report_${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Report downloaded')
    } catch {
      toast.error('Failed to download report')
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
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  const dist = data?.risk_distribution || {}
  const total = data?.total_students || 1

  return (
    <div className="space-y-6 py-2">
      {/* Top Header */}
      <Card className="p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900 tracking-tight">
            Faculty Advisor Dashboard
          </h1>
          <p className="text-sm text-ink-500 mt-1">
            Cohort monitoring, dropout risk analytics, and intervention management.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            icon={<Download className="w-4 h-4" />}
          >
            Export CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handlePredictAll}
            loading={predicting}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Re-run Cohort Predictions
          </Button>
        </div>
      </Card>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Enrolled Students"
          value={data?.total_students}
          caption="Active departmental cohort"
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          label="High Risk Students"
          value={dist.high || 0}
          caption={`${(((dist.high || 0) / total) * 100).toFixed(1)}% of cohort`}
          icon={<ShieldAlert className="w-4 h-4" />}
          valueClassName="text-danger"
        />
        <StatCard
          label="Cohort Avg Attendance"
          value={`${data?.class_avg_attendance}%`}
          caption="Classwide continuous average"
          icon={<Calendar className="w-4 h-4" />}
          valueClassName="text-accent-600"
        />
        <StatCard
          label="Cohort Avg Marks"
          value={`${data?.class_avg_marks}%`}
          caption="Continuous assessment mean"
          icon={<Award className="w-4 h-4" />}
          valueClassName="text-brand-600"
        />
      </div>

      {/* Risk Distribution Breakdown */}
      <Card className="space-y-4">
        <h2 className="text-base font-bold text-ink-900">Cohort Risk Distribution Breakdown</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-danger-bg border border-red-200 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-danger">High Risk (&gt;65% dropout)</div>
              <div className="text-2xl font-extrabold text-danger mt-1 tabular-nums">{dist.high || 0} students</div>
            </div>
            <ShieldAlert className="w-8 h-8 text-danger shrink-0" />
          </div>

          <div className="p-4 rounded-xl bg-warning-bg border border-amber-200 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-warning">Medium Risk (35%–65%)</div>
              <div className="text-2xl font-extrabold text-warning mt-1 tabular-nums">{dist.medium || 0} students</div>
            </div>
            <AlertTriangle className="w-8 h-8 text-warning shrink-0" />
          </div>

          <div className="p-4 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-brand-700">Low Risk (&lt;35%)</div>
              <div className="text-2xl font-extrabold text-brand-700 mt-1 tabular-nums">{dist.low || 0} students</div>
            </div>
            <CheckCircle className="w-8 h-8 text-brand-600 shrink-0" />
          </div>
        </div>
      </Card>

      {/* Priority At-Risk Table */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <h2 className="text-base font-bold text-ink-900">Priority Students Needing Proactive Attention</h2>
            <p className="text-xs text-ink-500">Ranked by calculated dropout probability</p>
          </div>
          <Link to="/faculty/students" className="text-xs text-brand-600 hover:underline font-semibold flex items-center gap-1">
            View All Students <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto border border-line rounded-xl">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-line bg-brand-50 text-ink-700 uppercase font-semibold">
                <th className="py-3 px-3.5">Student</th>
                <th className="py-3 px-3.5">Semester</th>
                <th className="py-3 px-3.5">Risk Tier</th>
                <th className="py-3 px-3.5">Dropout Prob</th>
                <th className="py-3 px-3.5">Attendance</th>
                <th className="py-3 px-3.5">Avg Marks</th>
                <th className="py-3 px-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink-700">
              {data?.at_risk_students?.slice(0, 10).map((s: any) => (
                <tr key={s.id} className="hover:bg-mist transition">
                  <td className="py-3 px-3.5 font-semibold text-ink-900">
                    <div>{s.full_name}</div>
                    <div className="text-[11px] text-ink-500 font-mono font-normal">{s.student_id}</div>
                  </td>
                  <td className="py-3 px-3.5 text-ink-700">Sem {s.semester}</td>
                  <td className="py-3 px-3.5">
                    <RiskBadge risk={s.risk_level} size="sm" />
                  </td>
                  <td className="py-3 px-3.5 font-semibold text-ink-900 tabular-nums">
                    {s.dropout_probability ? (s.dropout_probability * 100).toFixed(1) + '%' : 'N/A'}
                  </td>
                  <td className="py-3 px-3.5 tabular-nums">
                    <span className={s.attendance_percentage < 75 ? 'text-danger font-bold' : 'text-ink-700'}>
                      {s.attendance_percentage ? s.attendance_percentage + '%' : 'N/A'}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 text-ink-700 tabular-nums">
                    {s.avg_marks ? s.avg_marks + '%' : 'N/A'}
                  </td>
                  <td className="py-3 px-3.5 text-right">
                    <Link
                      to={`/faculty/students/${s.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-semibold border border-brand-200 transition"
                    >
                      <Eye className="w-3.5 h-3.5" /> Details
                    </Link>
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
