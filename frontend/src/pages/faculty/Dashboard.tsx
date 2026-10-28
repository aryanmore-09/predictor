import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Users, AlertTriangle, ShieldAlert, CheckCircle, RefreshCw, Download, ArrowRight, Eye } from 'lucide-react'
import { facultyApi, predictionApi, reportApi } from '../../api'

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
    return <div className="text-center py-20 text-slate-400">Loading faculty cohort data...</div>
  }

  const dist = data?.risk_distribution || {}
  const total = data?.total_students || 1

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Faculty Advisor Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">Cohort monitoring, dropout risk analytics, and intervention management.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-2 border border-slate-700 transition"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={handlePredictAll}
            disabled={predicting}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${predicting ? 'animate-spin' : ''}`} />
            {predicting ? 'Running...' : 'Re-run Cohort Predictions'}
          </button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-1">Total Enrolled Students</div>
          <div className="text-3xl font-extrabold text-white">{data?.total_students}</div>
          <div className="text-xs text-slate-500 mt-1">Active departmental cohort</div>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-1">High Risk Students</div>
          <div className="text-3xl font-extrabold text-red-400">{dist.high || 0}</div>
          <div className="text-xs text-slate-500 mt-1">{((dist.high || 0) / total * 100).toFixed(1)}% of cohort</div>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-1">Cohort Avg Attendance</div>
          <div className="text-3xl font-extrabold text-blue-400">{data?.class_avg_attendance}%</div>
          <div className="text-xs text-slate-500 mt-1">Classwide average</div>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-1">Cohort Avg Marks</div>
          <div className="text-3xl font-extrabold text-purple-400">{data?.class_avg_marks}%</div>
          <div className="text-xs text-slate-500 mt-1">Continuous assessment mean</div>
        </div>
      </div>

      {/* Risk Distribution Breakdown */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h2 className="text-lg font-bold text-white">Cohort Risk Distribution Breakdown</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase text-red-400">High Risk (&gt;65% dropout prob)</div>
              <div className="text-2xl font-extrabold text-red-300 mt-1">{dist.high || 0} students</div>
            </div>
            <ShieldAlert className="w-8 h-8 text-red-400" />
          </div>
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase text-amber-400">Medium Risk (35%–65%)</div>
              <div className="text-2xl font-extrabold text-amber-300 mt-1">{dist.medium || 0} students</div>
            </div>
            <AlertTriangle className="w-8 h-8 text-amber-400" />
          </div>
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase text-emerald-400">Low Risk (&lt;35%)</div>
              <div className="text-2xl font-extrabold text-emerald-300 mt-1">{dist.low || 0} students</div>
            </div>
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Priority At-Risk Table */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Priority Students Needing Proactive Attention</h2>
            <p className="text-xs text-slate-400">Ranked by calculated dropout probability</p>
          </div>
          <Link to="/faculty/students" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
            View All Students <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                <th className="py-3 px-3">Student</th>
                <th className="py-3 px-3">Semester</th>
                <th className="py-3 px-3">Risk Tier</th>
                <th className="py-3 px-3">Dropout Prob</th>
                <th className="py-3 px-3">Attendance</th>
                <th className="py-3 px-3">Avg Marks</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {data?.at_risk_students?.slice(0, 10).map((s: any) => (
                <tr key={s.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3 px-3">
                    <div className="font-semibold text-white">{s.full_name}</div>
                    <div className="text-[11px] text-slate-400">{s.student_id}</div>
                  </td>
                  <td className="py-3 px-3 text-slate-300">Sem {s.semester}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      s.risk_level === 'high'
                        ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    }`}>
                      {s.risk_level}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-200">
                    {s.dropout_probability ? (s.dropout_probability * 100).toFixed(1) + '%' : 'N/A'}
                  </td>
                  <td className="py-3 px-3 text-slate-300">
                    <span className={s.attendance_percentage < 75 ? 'text-red-400 font-bold' : ''}>
                      {s.attendance_percentage ? s.attendance_percentage + '%' : 'N/A'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-300">
                    {s.avg_marks ? s.avg_marks + '%' : 'N/A'}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <Link
                      to={`/faculty/students/${s.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-semibold border border-blue-500/30 transition"
                    >
                      <Eye className="w-3.5 h-3.5" /> Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
