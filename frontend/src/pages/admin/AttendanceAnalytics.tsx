import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  CalendarCheck, BarChart2, TrendingUp, Users, AlertTriangle,
  Award, ShieldAlert, Sliders, Send
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine
} from 'recharts'
import { attendanceApi } from '../../api'
import type { AttendanceAnalytics, DefaulterStudent } from '../../api'
import { Card, StatCard, Button, Skeleton } from '../../components/ui'
import {
  CHART_PALETTE, CHART_GRID_COLOR, CHART_AXIS_COLOR, chartTooltipStyle
} from '../../utils/chartColors'

export default function AdminAttendanceAnalytics() {
  const [analytics, setAnalytics] = useState<AttendanceAnalytics | null>(null)
  const [defaulters, setDefaulters] = useState<DefaulterStudent[]>([])
  const [thresholdInput, setThresholdInput] = useState<string>('75')
  const [loading, setLoading] = useState(true)
  const [updatingThreshold, setUpdatingThreshold] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const [anRes, defRes] = await Promise.all([
        attendanceApi.getAdminAnalytics(),
        attendanceApi.getDefaulters(),
      ])
      setAnalytics(anRes.data)
      setDefaulters(defRes.data)
      setThresholdInput(String(anRes.data.threshold))
    } catch {
      toast.error('Failed to load institutional attendance analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleUpdateThreshold = async (e: React.FormEvent) => {
    e.preventDefault()
    const val = parseFloat(thresholdInput)
    if (isNaN(val) || val <= 0 || val > 100) {
      toast.error('Threshold must be a valid number between 1 and 100')
      return
    }
    setUpdatingThreshold(true)
    try {
      await attendanceApi.updateThreshold(val)
      toast.success(`Attendance threshold updated to ${val}%`)
      loadData()
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to update threshold'
      toast.error(msg)
    } finally {
      setUpdatingThreshold(false)
    }
  }

  const handleSendReminder = async (studentId: number) => {
    try {
      await attendanceApi.sendReminder(studentId)
      toast.success('Advisory notice sent to student portal')
    } catch {
      toast.error('Failed to send advisory')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 py-2">
        <Skeleton className="h-28 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </div>
    )
  }

  const activeThreshold = analytics?.threshold ?? 75

  return (
    <div className="space-y-6 py-2">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900 tracking-tight flex items-center gap-3">
            <span className="p-2 rounded-xl bg-brand-100 text-brand-700">
              <CalendarCheck className="w-6 h-6" />
            </span>
            Campus Attendance Analytics
          </h1>
          <p className="text-xs sm:text-sm text-ink-500 mt-1 max-w-2xl">
            Institutional overview of student class participation, class-level comparisons,
            and compliance with university attendance regulations.
          </p>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Institutional Average"
          value={`${analytics?.institutional_average ?? 0}%`}
          icon={<Award className="w-5 h-5 text-brand-600" />}
          caption="Campus-wide student rate"
        />
        <StatCard
          label="Total Classes Held"
          value={analytics?.total_classes_held ?? 0}
          icon={<CalendarCheck className="w-5 h-5 text-accent-500" />}
          caption="Conducted course sessions"
        />
        <StatCard
          label="Total Records"
          value={analytics?.total_records_marked ?? 0}
          icon={<Users className="w-5 h-5 text-ink-500" />}
          caption="Individual entries evaluated"
        />
        <StatCard
          label="Defaulters Count"
          value={analytics?.defaulters_count ?? 0}
          icon={<AlertTriangle className="w-5 h-5 text-danger" />}
          caption={`Below ${activeThreshold}% threshold`}
        />
      </div>

      {/* ── Configurable Policy Settings ── */}
      <Card className="p-4 sm:p-5 border border-line">
        <form onSubmit={handleUpdateThreshold} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="font-bold text-sm text-ink-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-brand-600" /> Mandatory Attendance Policy Threshold
            </div>
            <p className="text-xs text-ink-500">
              Students falling below this threshold are flagged in reports and receive proactive dropout risk advisories.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-32">
              <input
                type="number"
                step="0.5"
                min="50"
                max="95"
                value={thresholdInput}
                onChange={(e) => setThresholdInput(e.target.value)}
                className="w-full text-xs font-bold rounded-xl border border-line bg-white pl-3 pr-7 py-2 text-ink-900"
              />
              <span className="absolute right-3 top-2 text-xs font-bold text-ink-500">%</span>
            </div>
            <Button variant="primary" size="sm" type="submit" loading={updatingThreshold}>
              Save Policy
            </Button>
          </div>
        </form>
      </Card>

      {/* ── Visual Analytics ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class / Division Comparison */}
        <Card className="space-y-4">
          <div className="border-b border-line pb-3">
            <h3 className="text-base font-bold text-ink-900 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-brand-600" /> Class &amp; Division Performance
            </h3>
            <p className="text-xs text-ink-500 mt-0.5">Average attendance percentages by semester division</p>
          </div>
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.class_averages || []} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} vertical={false} />
                <XAxis dataKey="division" stroke={CHART_AXIS_COLOR} tick={{ fontSize: 11 }} />
                <YAxis domain={[50, 100]} stroke={CHART_AXIS_COLOR} tick={{ fontSize: 11 }} unit="%" />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(val: any) => [`${val}%`, 'Average Attendance']} />
                <ReferenceLine y={activeThreshold} stroke="#2E7D32" strokeDasharray="4 4" label={{ value: `Threshold ${activeThreshold}%`, fill: '#2E7D32', fontSize: 10 }} />
                <Bar dataKey="average" fill={CHART_PALETTE[0]} radius={[6, 6, 0, 0]} maxBarSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Monthly Trend Progression */}
        <Card className="space-y-4">
          <div className="border-b border-line pb-3">
            <h3 className="text-base font-bold text-ink-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent-500" /> Institutional Monthly Attendance Trend
            </h3>
            <p className="text-xs text-ink-500 mt-0.5">Semester attendance tracking across months</p>
          </div>
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics?.monthly_trend || []} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} vertical={false} />
                <XAxis dataKey="month" stroke={CHART_AXIS_COLOR} tick={{ fontSize: 11 }} />
                <YAxis domain={[60, 100]} stroke={CHART_AXIS_COLOR} tick={{ fontSize: 11 }} unit="%" />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(val: any) => [`${val}%`, 'Institutional Rate']} />
                <ReferenceLine y={activeThreshold} stroke="#2E7D32" strokeDasharray="4 4" />
                <Line
                  type="monotone"
                  dataKey="attendance"
                  stroke={CHART_PALETTE[1]}
                  strokeWidth={2.5}
                  dot={{ r: 5, fill: CHART_PALETTE[1], stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* ── Defaulters Roster Table ── */}
      <Card className="p-0 overflow-hidden border border-line">
        <div className="p-4 sm:p-5 border-b border-line flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-ink-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-danger" /> Institutional Defaulter Roster
            </h2>
            <p className="text-xs text-ink-500 mt-0.5">
              Students requiring intervention due to attendance falling below {activeThreshold}%
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-danger-bg text-danger border border-red-200">
            {defaulters.length} Defaulters
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-line bg-mist/60 text-ink-700 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Semester</th>
                <th className="py-3 px-4">Attendance Rate</th>
                <th className="py-3 px-4">Weakest Course</th>
                <th className="py-3 px-4">Required Classes</th>
                <th className="py-3 px-4">Risk Level</th>
                <th className="py-3 px-4 text-right">Advisory</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {defaulters.map((d) => (
                <tr key={d.student_id} className="hover:bg-brand-50/40 transition">
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="font-bold text-ink-900">{d.full_name}</div>
                    <div className="text-[11px] text-ink-500 font-mono">{d.student_code}</div>
                  </td>

                  <td className="py-3 px-4 text-ink-700 whitespace-nowrap">
                    Semester {d.semester}
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="font-extrabold text-danger text-xs tabular-nums">
                      {d.overall_attendance}%
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-semibold text-ink-900 truncate max-w-[150px]">{d.weakest_subject}</div>
                    <div className="text-[10px] text-danger">{d.weakest_subject_pct}%</div>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap font-semibold text-ink-700">
                    +{d.classes_needed} sessions
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        d.risk_level === 'high'
                          ? 'bg-danger-bg text-danger'
                          : 'bg-warning-bg text-warning'
                      }`}
                    >
                      {d.risk_level?.toUpperCase()}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleSendReminder(d.student_id)}
                      icon={<Send className="w-3.5 h-3.5" />}
                    >
                      Send Advisory
                    </Button>
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
