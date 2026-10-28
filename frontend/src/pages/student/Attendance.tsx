import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Calendar as CalendarIcon, CheckCircle, XCircle, Clock, Award,
  TrendingUp, BarChart2, Calculator, Plus, Download, FileText,
  ChevronLeft, ChevronRight, HelpCircle, ShieldAlert, Sparkles, Filter
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine
} from 'recharts'
import { attendanceApi } from '../../api'
import type {
  AttendanceSummary,
  SubjectAttendance,
  CalendarDayItem,
  AttendanceTrendPoint,
  AttendanceRecordDetail,
  LeaveRequestItem
} from '../../api'
import {
  Card, StatCard, Button, Modal, EmptyState, Skeleton, Textarea
} from '../../components/ui'
import {
  CHART_PALETTE, CHART_GRID_COLOR, CHART_AXIS_COLOR, chartTooltipStyle
} from '../../utils/chartColors'

export default function StudentAttendance() {
  const [summary, setSummary] = useState<AttendanceSummary | null>(null)
  const [subjects, setSubjects] = useState<SubjectAttendance[]>([])
  const [calendarDays, setCalendarDays] = useState<CalendarDayItem[]>([])
  const [trend, setTrend] = useState<AttendanceTrendPoint[]>([])
  const [records, setRecords] = useState<AttendanceRecordDetail[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestItem[]>([])
  const [loading, setLoading] = useState(true)

  // Calendar month state (YYYY-MM)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<CalendarDayItem | null>(null)

  // Records filters & pagination
  const [filterSubject, setFilterSubject] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [recordPage, setRecordPage] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const pageSize = 10

  // "What If" Simulator State
  const [simSubject, setSimSubject] = useState<string>('')
  const [simMissCount, setSimMissCount] = useState<number>(0)
  const [simAttendCount, setSimAttendCount] = useState<number>(0)

  // Leave Request Modal
  const [leaveModalOpen, setLeaveModalOpen] = useState(false)
  const [leaveStart, setLeaveStart] = useState('')
  const [leaveEnd, setLeaveEnd] = useState('')
  const [leaveReason, setLeaveReason] = useState('')
  const [leaveFile, setLeaveFile] = useState<File | null>(null)
  const [submittingLeave, setSubmittingLeave] = useState(false)

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'calendar' | 'simulator' | 'records' | 'leaves'>('overview')

  const monthString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`

  const loadAllData = async () => {
    try {
      setLoading(true)
      const [sumRes, subjRes, calRes, trendRes, leaveRes] = await Promise.all([
        attendanceApi.getMySummary(),
        attendanceApi.getMySubjects(),
        attendanceApi.getMyCalendar(monthString),
        attendanceApi.getMyTrend(),
        attendanceApi.getMyLeaveRequests(),
      ])
      setSummary(sumRes.data)
      setSubjects(subjRes.data)
      setCalendarDays(calRes.data)
      setTrend(trendRes.data)
      setLeaveRequests(leaveRes.data)

      if (subjRes.data.length > 0 && !simSubject) {
        setSimSubject(subjRes.data[0].subject)
      }
    } catch {
      toast.error('Failed to load attendance information')
    } finally {
      setLoading(false)
    }
  }

  const loadRecords = async () => {
    try {
      const res = await attendanceApi.getMyRecords({
        page: recordPage,
        page_size: pageSize,
        subject: filterSubject || undefined,
        status: filterStatus || undefined,
      })
      setRecords(res.data.items)
      setTotalRecords(res.data.total)
    } catch {
      toast.error('Failed to load daily attendance records')
    }
  }

  useEffect(() => {
    loadAllData()
  }, [monthString])

  useEffect(() => {
    loadRecords()
  }, [recordPage, filterSubject, filterStatus])

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  // Export CSV
  const handleExportCsv = async () => {
    try {
      const res = await attendanceApi.exportCsv()
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `my_attendance_${monthString}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Attendance CSV downloaded')
    } catch {
      toast.error('Failed to export attendance CSV')
    }
  }

  // Submit Leave Request
  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!leaveStart || !leaveEnd || !leaveReason.trim()) {
      toast.error('Please fill in start date, end date, and reason')
      return
    }

    setSubmittingLeave(true)
    try {
      const form = new FormData()
      form.append('start_date', leaveStart)
      form.append('end_date', leaveEnd)
      form.append('reason', leaveReason.trim())
      if (leaveFile) {
        form.append('document', leaveFile)
      }
      await attendanceApi.submitLeaveRequest(form)
      toast.success('Leave request submitted. Awaiting faculty review.')
      setLeaveModalOpen(false)
      setLeaveStart('')
      setLeaveEnd('')
      setLeaveReason('')
      setLeaveFile(null)
      loadAllData()
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to submit leave request'
      toast.error(msg)
    } finally {
      setSubmittingLeave(false)
    }
  }

  // Simulator Calculation
  const selectedSimSubjectObj = subjects.find((s) => s.subject === simSubject)
  const calculateSimulatedPct = () => {
    if (!selectedSimSubjectObj) return null
    const currentAttended = selectedSimSubjectObj.attended_classes
    const currentTotal = selectedSimSubjectObj.total_classes
    const newAttended = currentAttended + Number(simAttendCount || 0)
    const newTotal = currentTotal + Number(simAttendCount || 0) + Number(simMissCount || 0)
    if (newTotal === 0) return 100
    return ((newAttended / newTotal) * 100).toFixed(1)
  }

  // Calendar Helpers
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayIndex = new Date(year, month, 1).getDay() // 0 = Sun

  const calendarMap = new Map<string, CalendarDayItem>()
  calendarDays.forEach((d) => calendarMap.set(d.date, d))

  const overallPct = summary?.overall_percentage ?? 100
  const thresholdPct = summary?.threshold_percentage ?? 75

  // Circular progress stroke calculation
  const circleRadius = 38
  const circumference = 2 * Math.PI * circleRadius
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, overallPct)) / 100) * circumference

  return (
    <div className="space-y-6 py-2">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900 tracking-tight flex items-center gap-3">
            <span className="p-2 rounded-xl bg-brand-100 text-brand-700">
              <CalendarIcon className="w-6 h-6" />
            </span>
            Attendance &amp; Participation
          </h1>
          <p className="text-xs sm:text-sm text-ink-500 mt-1 max-w-2xl">
            Monitor subject attendance, explore calendar patterns, simulate future absences,
            and submit excuse requests for medical or extracurricular events.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Export Report
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setLeaveModalOpen(true)}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Request Leave
          </Button>
        </div>
      </div>

      {/* ── Top KPI Banner with Progress Ring ── */}
      <Card className="p-5 sm:p-6 bg-white border border-line">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
          {/* Circular Ring Column */}
          <div className="flex items-center gap-4 border-b md:border-b-0 md:border-r border-line pb-4 md:pb-0 md:pr-4">
            <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 96 96">
                <circle
                  cx="48"
                  cy="48"
                  r={circleRadius}
                  className="text-brand-100"
                  strokeWidth="8"
                  stroke="currentColor"
                  fill="transparent"
                />
                <circle
                  cx="48"
                  cy="48"
                  r={circleRadius}
                  className={
                    overallPct >= thresholdPct
                      ? 'text-brand-600'
                      : overallPct >= thresholdPct - 10
                      ? 'text-warning'
                      : 'text-danger'
                  }
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-xl font-extrabold text-ink-900 tabular-nums">
                  {overallPct}%
                </span>
                <span className="text-[10px] font-semibold text-ink-500 uppercase">Overall</span>
              </div>
            </div>

            <div>
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  summary?.status_label === 'Safe'
                    ? 'bg-brand-100 text-brand-700'
                    : summary?.status_label === 'Warning'
                    ? 'bg-warning-bg text-warning'
                    : 'bg-danger-bg text-danger'
                }`}
              >
                {summary?.status_label} Standing
              </span>
              <p className="text-xs text-ink-500 mt-1 leading-snug">
                {overallPct >= thresholdPct
                  ? "Great job! You're safely above the university 75% threshold."
                  : `You are currently ${summary?.status_label?.toLowerCase()} standing. Check subject suggestions below.`}
              </p>
            </div>
          </div>

          {/* Attended Stat */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-ink-500 uppercase">
              <CheckCircle className="w-4 h-4 text-brand-600" /> Attended Classes
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-ink-900 tabular-nums">
              {summary?.attended_classes ?? 0}
            </div>
            <div className="text-[11px] text-ink-500">Total sessions present or late</div>
          </div>

          {/* Missed Stat */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-ink-500 uppercase">
              <XCircle className="w-4 h-4 text-danger" /> Missed Classes
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-danger tabular-nums">
              {summary?.missed_classes ?? 0}
            </div>
            <div className="text-[11px] text-ink-500">Unexcused absence records</div>
          </div>

          {/* Excused & Threshold Stat */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-ink-500 uppercase">
              <Award className="w-4 h-4 text-accent-500" /> Target Threshold
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-brand-700 tabular-nums">
              {thresholdPct}%
            </div>
            <div className="text-[11px] text-ink-500">
              {summary?.excused_classes ?? 0} approved excused leaves
            </div>
          </div>
        </div>
      </Card>

      {/* ── Navigation Tabs ── */}
      <div className="flex border-b border-line gap-2 overflow-x-auto text-xs font-semibold">
        {[
          { id: 'overview', label: 'Subject Breakdown', icon: BarChart2 },
          { id: 'calendar', label: 'Calendar Heatmap', icon: CalendarIcon },
          { id: 'simulator', label: 'Absence Calculator', icon: Calculator },
          { id: 'records', label: 'Class History', icon: FileText },
          { id: 'leaves', label: `Leave Requests (${leaveRequests.length})`, icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 px-3.5 flex items-center gap-2 border-b-2 whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? 'border-brand-600 text-brand-700 font-bold'
                  : 'border-transparent text-ink-500 hover:text-ink-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── TAB 1: Overview & Subject Breakdown ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Subject Breakdown Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subjects.map((s) => {
              const isBelow = s.percentage < thresholdPct
              return (
                <Card key={s.subject} className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-mono text-ink-500">{s.code || 'CORE'}</div>
                      <h3 className="font-bold text-sm text-ink-900">{s.subject}</h3>
                    </div>
                    <span
                      className={`text-xs font-extrabold tabular-nums px-2.5 py-0.5 rounded-full ${
                        s.percentage >= thresholdPct
                          ? 'bg-brand-100 text-brand-700'
                          : s.percentage >= thresholdPct - 10
                          ? 'bg-warning-bg text-warning'
                          : 'bg-danger-bg text-danger'
                      }`}
                    >
                      {s.percentage}%
                    </span>
                  </div>

                  {/* Visual Progress Bar with 75% marker */}
                  <div className="space-y-1">
                    <div className="relative w-full h-3 bg-mist rounded-full overflow-hidden border border-line">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          s.percentage >= thresholdPct
                            ? 'bg-brand-500'
                            : s.percentage >= thresholdPct - 10
                            ? 'bg-warning'
                            : 'bg-danger'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, s.percentage))}%` }}
                      />
                      {/* 75% indicator line */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-ink-900/60 z-10"
                        style={{ left: `${thresholdPct}%` }}
                        title="75% Minimum Required Threshold"
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-ink-500">
                      <span>{s.attended_classes} of {s.total_classes} classes attended</span>
                      <span>Target: {thresholdPct}%</span>
                    </div>
                  </div>

                  {/* Supportive Non-Judgmental Milestone Hint */}
                  <div
                    className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                      isBelow
                        ? 'bg-brand-50 border border-brand-200 text-brand-800'
                        : 'bg-mist border border-line text-ink-700'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                    <span>
                      {isBelow
                        ? `You're ${s.classes_needed_for_threshold} classes away from reaching your 75% goal.`
                        : s.classes_can_miss > 0
                        ? `You can safely miss up to ${s.classes_can_miss} classes while staying above 75%.`
                        : "You're right on track at the 75% mark!"}
                    </span>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Visual Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Subject Comparison Bar Chart */}
            <Card className="space-y-4">
              <div className="border-b border-line pb-3">
                <h3 className="text-sm sm:text-base font-bold text-ink-900 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-brand-600" /> Subject Attendance Comparison
                </h3>
                <p className="text-xs text-ink-500 mt-0.5">Real-time attendance % across enrolled courses</p>
              </div>
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjects} margin={{ top: 10, right: 20, left: -10, bottom: 35 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} vertical={false} />
                    <XAxis
                      dataKey="subject"
                      stroke={CHART_AXIS_COLOR}
                      tick={{ fontSize: 10 }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      tickFormatter={(val) => val.length > 12 ? val.substring(0, 10) + '...' : val}
                    />
                    <YAxis stroke={CHART_AXIS_COLOR} domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip contentStyle={chartTooltipStyle} formatter={(val: any) => [`${val}%`, 'Attendance']} />
                    <ReferenceLine y={thresholdPct} stroke="#1B6B3A" strokeDasharray="4 4" label={{ value: `Target ${thresholdPct}%`, fill: '#1B6B3A', fontSize: 10 }} />
                    <Bar dataKey="percentage" fill={CHART_PALETTE[0]} radius={[6, 6, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Weekly Trend Line Chart */}
            <Card className="space-y-4">
              <div className="border-b border-line pb-3">
                <h3 className="text-sm sm:text-base font-bold text-ink-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-accent-500" /> Weekly Participation Trend
                </h3>
                <p className="text-xs text-ink-500 mt-0.5">Progression of weekly attendance percentage</p>
              </div>
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} vertical={false} />
                    <XAxis dataKey="period" stroke={CHART_AXIS_COLOR} tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} stroke={CHART_AXIS_COLOR} tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip contentStyle={chartTooltipStyle} formatter={(val: any) => [`${val}%`, 'Attendance Rate']} />
                    <ReferenceLine y={thresholdPct} stroke="#1B6B3A" strokeDasharray="4 4" />
                    <Line
                      type="monotone"
                      dataKey="attendance_percentage"
                      stroke={CHART_PALETTE[1]}
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: CHART_PALETTE[1], stroke: '#fff', strokeWidth: 1.5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── TAB 2: Calendar Heatmap ── */}
      {activeTab === 'calendar' && (
        <Card className="p-5 sm:p-6 space-y-5">
          {/* Calendar Header with Month Switcher */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-line pb-4">
            <div>
              <h2 className="text-base font-bold text-ink-900 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-brand-600" />
                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h2>
              <p className="text-xs text-ink-500 mt-0.5">
                Click any day to inspect class sessions and attendance statuses
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={prevMonth} icon={<ChevronLeft className="w-4 h-4" />}>
                Prev
              </Button>
              <Button variant="secondary" size="sm" onClick={nextMonth} icon={<ChevronRight className="w-4 h-4" />}>
                Next
              </Button>
            </div>
          </div>

          {/* Heatmap Legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-ink-700">
            <span className="font-semibold text-ink-500">Legend:</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-brand-500" /> Present
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-danger" /> Absent
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-warning" /> Late
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-accent-500" /> Excused Leave
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-brand-200 border border-brand-400" /> Mixed
            </span>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="font-bold text-ink-500 py-1 uppercase text-[11px]">
                {d}
              </div>
            ))}

            {/* Empty offset days */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="h-16 rounded-xl bg-mist/30 border border-transparent" />
            ))}

            {/* Days of current month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1
              const dayKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
              const dayData = calendarMap.get(dayKey)
              const hasData = !!dayData

              let colorClass = 'bg-mist/60 text-ink-500 border-line hover:border-brand-400'
              if (dayData) {
                if (dayData.status === 'Present') colorClass = 'bg-brand-100 text-brand-800 border-brand-300 font-bold hover:ring-2 hover:ring-brand-500'
                else if (dayData.status === 'Absent') colorClass = 'bg-danger-bg text-danger border-red-200 font-bold hover:ring-2 hover:ring-danger'
                else if (dayData.status === 'Late') colorClass = 'bg-warning-bg text-warning border-yellow-200 font-bold hover:ring-2 hover:ring-warning'
                else if (dayData.status === 'Excused') colorClass = 'bg-accent-50 text-accent-700 border-accent-100 font-bold hover:ring-2 hover:ring-accent-500'
                else if (dayData.status === 'Mixed') colorClass = 'bg-yellow-50 text-ink-900 border-yellow-300 font-bold hover:ring-2 hover:ring-yellow-400'
              }

              return (
                <div
                  key={dayKey}
                  onClick={() => dayData && setSelectedDay(dayData)}
                  className={`h-16 p-1.5 rounded-xl border flex flex-col justify-between transition cursor-pointer ${colorClass}`}
                >
                  <div className="text-right text-[11px] font-semibold">{dayNum}</div>
                  {dayData && (
                    <div className="text-left text-[10px] leading-tight truncate">
                      {dayData.status} ({dayData.sessions.length})
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Selected Day Drawer / Modal */}
          <Modal
            isOpen={!!selectedDay}
            onClose={() => setSelectedDay(null)}
            title={`Classes on ${selectedDay?.date}`}
            maxWidth="md"
          >
            {selectedDay && (
              <div className="space-y-3 text-xs">
                <div className="flex gap-2">
                  <span className="px-2.5 py-0.5 rounded-full font-bold bg-mist border border-line text-ink-700">
                    Day Status: {selectedDay.status}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full font-semibold bg-brand-50 text-brand-700 border border-brand-200">
                    {selectedDay.present_count} Present
                  </span>
                  {selectedDay.absent_count > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full font-semibold bg-danger-bg text-danger border border-red-200">
                      {selectedDay.absent_count} Absent
                    </span>
                  )}
                </div>

                <div className="divide-y divide-line border border-line rounded-xl overflow-hidden">
                  {selectedDay.sessions.map((sess) => (
                    <div key={sess.id} className="p-3 bg-white flex justify-between items-center text-xs">
                      <div>
                        <div className="font-bold text-ink-900">{sess.subject}</div>
                        <div className="text-[11px] text-ink-500">{sess.start_time} - {sess.end_time}</div>
                        {sess.remarks && (
                          <div className="text-[10px] text-ink-700 italic mt-0.5">Note: {sess.remarks}</div>
                        )}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                          sess.status === 'Present'
                            ? 'bg-brand-100 text-brand-700'
                            : sess.status === 'Late'
                            ? 'bg-warning-bg text-warning'
                            : sess.status === 'Excused'
                            ? 'bg-accent-50 text-accent-700'
                            : 'bg-danger-bg text-danger'
                        }`}
                      >
                        {sess.status}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end pt-2">
                  <Button variant="secondary" size="sm" onClick={() => setSelectedDay(null)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </Modal>
        </Card>
      )}

      {/* ── TAB 3: "What If" Simulator ── */}
      {activeTab === 'simulator' && (
        <Card className="p-5 sm:p-6 space-y-6">
          <div className="border-b border-line pb-3">
            <h2 className="text-base font-bold text-ink-900 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-accent-500" /> "What If I Miss Classes?" Calculator
            </h2>
            <p className="text-xs text-ink-500 mt-0.5">
              Simulate how missing or attending future classes will impact your final attendance percentage.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Controls */}
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-ink-700 mb-1">Select Subject</label>
                <select
                  value={simSubject}
                  onChange={(e) => setSimSubject(e.target.value)}
                  className="w-full text-xs rounded-xl border border-line bg-white px-3 py-2 text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {subjects.map((s) => (
                    <option key={s.subject} value={s.subject}>
                      {s.subject} (Current: {s.percentage}%)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ink-700 mb-1">
                    Upcoming Classes to Miss:
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={simMissCount}
                    onChange={(e) => setSimMissCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full text-xs rounded-xl border border-line bg-white px-3 py-2 text-ink-900 focus:outline-none focus:ring-2 focus:ring-danger"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-700 mb-1">
                    Upcoming Classes to Attend:
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={simAttendCount}
                    onChange={(e) => setSimAttendCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full text-xs rounded-xl border border-line bg-white px-3 py-2 text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-mist border border-line text-xs text-ink-700 leading-relaxed">
                <strong>How it works:</strong> The simulator recalculates your projected score based on:
                <br />
                <code>(Attended + Additional Attended) / (Total + Additional Classes)</code>
              </div>
            </div>

            {/* Results Display */}
            {selectedSimSubjectObj && (
              <div className="p-5 rounded-2xl bg-brand-50/60 border border-brand-200 flex flex-col justify-between space-y-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-brand-800">
                    Projected Outcome for {selectedSimSubjectObj.subject}
                  </div>
                  <div className="mt-3 flex items-baseline gap-4">
                    <div>
                      <div className="text-[11px] text-ink-500 font-semibold">Current Attendance:</div>
                      <div className="text-2xl font-bold text-ink-900">{selectedSimSubjectObj.percentage}%</div>
                    </div>
                    <div className="text-2xl text-ink-300">→</div>
                    <div>
                      <div className="text-[11px] text-ink-500 font-semibold">Simulated Attendance:</div>
                      <div
                        className={`text-3xl font-extrabold tabular-nums ${
                          Number(calculateSimulatedPct()) >= thresholdPct
                            ? 'text-brand-700'
                            : 'text-danger'
                        }`}
                      >
                        {calculateSimulatedPct()}%
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={`p-3 rounded-xl text-xs font-medium border ${
                    Number(calculateSimulatedPct()) >= thresholdPct
                      ? 'bg-white border-brand-300 text-brand-800'
                      : 'bg-danger-bg border-red-200 text-danger'
                  }`}
                >
                  {Number(calculateSimulatedPct()) >= thresholdPct ? (
                    <span className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-brand-600 shrink-0" />
                      Status remains Safe! You remain comfortably eligible for semester examinations.
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-danger shrink-0" />
                      Caution: This simulation drops your attendance below the mandatory {thresholdPct}% threshold.
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── TAB 4: Daily Records Table ── */}
      {activeTab === 'records' && (
        <Card className="overflow-hidden p-0 border border-line">
          {/* Filter Bar */}
          <div className="p-4 bg-mist/50 border-b border-line grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-ink-700 font-semibold mb-1">Subject</label>
              <select
                value={filterSubject}
                onChange={(e) => {
                  setFilterSubject(e.target.value)
                  setRecordPage(1)
                }}
                className="w-full rounded-xl border border-line bg-white px-3 py-1.5 text-xs text-ink-900"
              >
                <option value="">All Subjects</option>
                {subjects.map((s) => (
                  <option key={s.subject} value={s.subject}>{s.subject}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-ink-700 font-semibold mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value)
                  setRecordPage(1)
                }}
                className="w-full rounded-xl border border-line bg-white px-3 py-1.5 text-xs text-ink-900"
              >
                <option value="">All Statuses</option>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Late">Late</option>
                <option value="Excused">Excused</option>
              </select>
            </div>

            <div className="flex items-end">
              {(filterSubject || filterStatus) && (
                <button
                  onClick={() => {
                    setFilterSubject('')
                    setFilterStatus('')
                    setRecordPage(1)
                  }}
                  className="text-xs font-semibold text-brand-600 hover:underline"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          {records.length === 0 ? (
            <div className="py-12">
              <EmptyState title="No Records Found" description="No daily attendance records matched your filters." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-line bg-mist/80 text-ink-700 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Date &amp; Time</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Division</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-brand-50/40 transition">
                      <td className="py-3 px-4 whitespace-nowrap text-ink-900 font-medium">
                        {new Date(r.session_date).toLocaleDateString()}
                        <span className="text-[11px] text-ink-500 ml-1.5">
                          {r.start_time} - {r.end_time}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-ink-900">{r.subject}</td>
                      <td className="py-3 px-4 text-ink-700">{r.class_division}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                            r.status === 'Present'
                              ? 'bg-brand-100 text-brand-700'
                              : r.status === 'Late'
                              ? 'bg-warning-bg text-warning'
                              : r.status === 'Excused'
                              ? 'bg-accent-50 text-accent-700'
                              : 'bg-danger-bg text-danger'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-ink-500 text-[11px]">
                        {r.remarks || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalRecords > pageSize && (
            <div className="p-3 border-t border-line flex items-center justify-between text-xs text-ink-500">
              <span>Page {recordPage} of {Math.ceil(totalRecords / pageSize)}</span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={recordPage <= 1}
                  onClick={() => setRecordPage(recordPage - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={recordPage >= Math.ceil(totalRecords / pageSize)}
                  onClick={() => setRecordPage(recordPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ── TAB 5: Leave Requests ── */}
      {activeTab === 'leaves' && (
        <Card className="p-0 overflow-hidden border border-line">
          <div className="p-4 sm:p-5 border-b border-line flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-ink-900">Excused Absence &amp; Leave Requests</h2>
              <p className="text-xs text-ink-500">Approved leaves are excluded from your attendance denominator</p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setLeaveModalOpen(true)}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Submit Request
            </Button>
          </div>

          {leaveRequests.length === 0 ? (
            <div className="py-12">
              <EmptyState
                title="No Leave Requests"
                description="You haven't submitted any excused leave requests."
                action={
                  <Button variant="primary" size="sm" onClick={() => setLeaveModalOpen(true)}>
                    Create First Request
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-line bg-mist/60 text-ink-700 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Date Range</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Document</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Faculty Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {leaveRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-brand-50/40 transition">
                      <td className="py-3 px-4 whitespace-nowrap font-bold text-ink-900">
                        {new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-ink-700 max-w-xs">{req.reason}</td>
                      <td className="py-3 px-4">
                        {req.original_filename ? (
                          <span className="flex items-center gap-1.5 text-accent-700 font-semibold truncate max-w-[140px]">
                            <FileText className="w-3.5 h-3.5 shrink-0" />
                            {req.original_filename}
                          </span>
                        ) : (
                          <span className="text-ink-400">None</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                            req.status === 'Approved'
                              ? 'bg-brand-100 text-brand-700'
                              : req.status === 'Rejected'
                              ? 'bg-danger-bg text-danger'
                              : 'bg-warning-bg text-warning'
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-ink-500 text-[11px]">
                        {req.faculty_comment ? (
                          <div>
                            <span className="font-semibold text-ink-900">{req.reviewer_name || 'Faculty'}: </span>
                            {req.faculty_comment}
                          </div>
                        ) : (
                          'Awaiting evaluation'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── Leave Request Modal ── */}
      <Modal
        isOpen={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        title="Submit Excused Leave Request"
        maxWidth="md"
      >
        <form onSubmit={handleSubmitLeave} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Start Date *</label>
              <input
                type="date"
                value={leaveStart}
                onChange={(e) => setLeaveStart(e.target.value)}
                required
                className="w-full text-xs rounded-xl border border-line bg-white px-3 py-2 text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-ink-700 mb-1">End Date *</label>
              <input
                type="date"
                value={leaveEnd}
                onChange={(e) => setLeaveEnd(e.target.value)}
                required
                className="w-full text-xs rounded-xl border border-line bg-white px-3 py-2 text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-ink-700 mb-1">Reason for Absence *</label>
            <Textarea
              rows={3}
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              placeholder="e.g. Hospitalized for fever; medical certificate attached."
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-ink-700 mb-1">
              Supporting Document (Optional — PDF, JPG, PNG up to 5MB)
            </label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => e.target.files && setLeaveFile(e.target.files[0])}
              className="w-full text-xs text-ink-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
            />
          </div>

          <div className="p-3 rounded-xl bg-brand-50 border border-brand-200 text-ink-700 text-[11px] leading-relaxed">
            <strong>Policy note:</strong> When approved by faculty, all class sessions falling within your approved leave dates are recorded as <em>Excused</em> and deducted from the attendance percentage denominator.
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-line">
            <Button variant="secondary" size="sm" type="button" onClick={() => setLeaveModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={submittingLeave}>
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
