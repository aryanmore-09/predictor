import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Calendar, BookOpen, TrendingUp, Sparkles, CheckCircle,
  AlertTriangle, ShieldAlert, ArrowRight, Award, Bell,
  FileCheck, FileText, Clock
} from 'lucide-react'
import { studentApi, testPaperApi, attendanceApi } from '../../api'
import type { TestPaper, AttendanceSummary } from '../../api'
import { Card, StatCard, RiskBadge, ProgressBar, Skeleton } from '../../components/ui'

export default function StudentDashboard() {
  const [data, setData] = useState<any>(null)
  const [recentPapers, setRecentPapers] = useState<TestPaper[]>([])
  const [attSummary, setAttSummary] = useState<AttendanceSummary | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const [dashRes, papersRes, attRes] = await Promise.all([
        studentApi.getDashboard(),
        testPaperApi.getMyPapers({ page: 1, page_size: 4 }).catch(() => ({ data: { items: [] } })),
        attendanceApi.getMySummary().catch(() => ({ data: null })),
      ])
      setData(dashRes.data)
      setRecentPapers(papersRes.data?.items || [])
      setAttSummary(attRes.data)
    } catch {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  const pred = data?.prediction
  const student = data?.student
  const risk = pred?.risk_level || 'low'

  return (
    <div className="space-y-6 py-2">
      {/* Top Banner */}
      <Card className="p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
              {student?.student_id}
            </span>
            <span className="text-xs text-ink-500 font-medium">Semester {student?.semester} • Year {student?.year}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900 tracking-tight">
            Welcome, {student?.full_name}
          </h1>
          <p className="text-xs text-ink-500 mt-1">{student?.department}</p>
        </div>

        {/* Risk Level Badge Box */}
        <div className="p-4 rounded-2xl bg-brand-50 border border-brand-200 flex items-center gap-4 shrink-0 shadow-xs">
          <div className="p-3 rounded-xl bg-white border border-brand-200 shadow-xs">
            {risk === 'high' ? (
              <ShieldAlert className="w-8 h-8 text-danger" />
            ) : risk === 'medium' ? (
              <AlertTriangle className="w-8 h-8 text-warning" />
            ) : (
              <CheckCircle className="w-8 h-8 text-brand-600" />
            )}
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Academic Standing</div>
            <div className="mt-0.5">
              <RiskBadge risk={risk} size="md" />
            </div>
            <div className="text-xs text-ink-500 mt-1 tabular-nums">
              Dropout Prob: {pred ? (pred.dropout_probability * 100).toFixed(1) : 0}%
            </div>
          </div>
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Predicted Grade Band"
          value={pred?.predicted_grade_band || 'B'}
          caption="Based on continuous performance model"
          icon={<Award className="w-4 h-4" />}
        />
        <StatCard
          label="Pass Probability"
          value={`${pred ? (pred.pass_probability * 100).toFixed(0) : 85}%`}
          caption="Course completion confidence"
          icon={<CheckCircle className="w-4 h-4" />}
          valueClassName="text-brand-600"
        />
        <StatCard
          label="Predicted Score"
          value={`${pred ? pred.predicted_score.toFixed(1) : 70.0}%`}
          caption="Expected semester continuous score"
          icon={<TrendingUp className="w-4 h-4" />}
          valueClassName="text-accent-600"
        />
        <StatCard
          label="Active Alerts"
          value={data?.alerts?.length || 0}
          caption={
            <Link to="/student/alerts" className="text-brand-600 hover:underline font-semibold flex items-center gap-1">
              View notifications →
            </Link>
          }
          icon={<Bell className="w-4 h-4" />}
          valueClassName="text-warning"
        />
      </div>

      {/* Grid: Attendance & Marks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Summary */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h3 className="text-base font-bold text-ink-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-600" /> Attendance by Subject
            </h3>
            <Link
              to="/student/attendance"
              className="text-xs text-brand-600 hover:underline font-semibold flex items-center gap-1"
            >
              Full Analytics <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {attSummary && (
            <div className="p-3 rounded-xl bg-mist border border-line flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center font-extrabold text-sm tabular-nums border ${
                    attSummary.overall_percentage >= 75
                      ? 'bg-brand-100 text-brand-700 border-brand-200'
                      : 'bg-danger-bg text-danger border-red-200'
                  }`}
                >
                  {attSummary.overall_percentage}%
                </div>
                <div>
                  <div className="font-bold text-xs text-ink-900">
                    {attSummary.status_label} Standing ({attSummary.attended_classes}/{attSummary.total_classes} Classes)
                  </div>
                  <div className="text-[11px] text-ink-500">
                    Mandatory Threshold: {attSummary.threshold_percentage}%
                  </div>
                </div>
              </div>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  attSummary.overall_percentage >= 75
                    ? 'bg-brand-50 text-brand-700 border border-brand-200'
                    : 'bg-danger-bg text-danger border border-red-200'
                }`}
              >
                {attSummary.overall_percentage >= 75 ? 'Safe' : 'Defaulter'}
              </span>
            </div>
          )}

          <div className="space-y-3.5">
            {data?.attendance_summary?.map((att: any, idx: number) => {
              const isLow = att.percentage < 75
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-ink-900">{att.subject}</span>
                    <span className={`tabular-nums ${isLow ? 'text-danger font-bold' : 'text-brand-700'}`}>
                      {att.percentage}% ({att.attended}/{att.total})
                    </span>
                  </div>
                  <ProgressBar
                    value={att.percentage}
                    variant={isLow ? 'high' : 'brand'}
                    height="md"
                  />
                </div>
              )
            })}
          </div>
        </Card>

        {/* Academic Performance */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h3 className="text-base font-bold text-ink-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-accent-500" /> Academic Scores &amp; Grades
            </h3>
            <span className="text-xs text-ink-500">Current Semester</span>
          </div>
          <div className="divide-y divide-line">
            {data?.marks_summary?.map((m: any, idx: number) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-ink-900">{m.subject}</div>
                  <div className="text-ink-500 text-[11px] tabular-nums">{m.marks} / {m.max} marks</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-brand-700 tabular-nums">{m.percentage}%</span>
                  <span className="px-2.5 py-0.5 rounded-md font-bold text-xs bg-brand-50 text-brand-700 border border-brand-200">
                    Grade {m.grade}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Test Papers & Continuous Evaluation */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <h3 className="text-base font-bold text-ink-900 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-brand-600" /> Recent Test Papers &amp; Continuous Evaluations
            </h3>
            <p className="text-xs text-ink-500 mt-0.5">
              Evaluations uploaded and verified against academic records
            </p>
          </div>
          <Link
            to="/student/test-papers"
            className="text-xs text-brand-600 hover:text-brand-700 hover:underline font-semibold flex items-center gap-1"
          >
            Manage All Papers <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentPapers.length === 0 ? (
          <div className="py-6 text-center text-xs text-ink-500">
            No test papers submitted yet.{' '}
            <Link to="/student/test-papers" className="text-brand-600 font-semibold hover:underline">
              Upload your first paper here
            </Link>
            .
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {recentPapers.map((paper) => (
              <div
                key={paper.id}
                className="p-3 rounded-xl bg-mist border border-line flex flex-col justify-between space-y-2 text-xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-ink-500 uppercase">{paper.exam_type}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        paper.status === 'Verified'
                          ? 'bg-brand-100 text-brand-700'
                          : paper.status === 'Rejected'
                          ? 'bg-danger-bg text-danger'
                          : 'bg-warning-bg text-warning'
                      }`}
                    >
                      {paper.status}
                    </span>
                  </div>
                  <div className="font-bold text-ink-900 mt-1 truncate" title={paper.subject}>
                    {paper.subject}
                  </div>
                </div>

                <div className="flex items-end justify-between pt-1 border-t border-line/60">
                  <div>
                    <span className="text-[11px] text-ink-500">Score: </span>
                    <span className="font-extrabold text-brand-700 tabular-nums">
                      {paper.marks_obtained}/{paper.max_marks}
                    </span>
                  </div>
                  <span className="font-bold text-xs text-ink-900 tabular-nums">
                    {paper.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Top Contributing Factors & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Factors */}
        <Card className="space-y-4">
          <div className="border-b border-line pb-3">
            <h3 className="text-base font-bold text-ink-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-600" /> Primary Influencing Factors
            </h3>
            <p className="text-xs text-ink-500 mt-0.5">
              Key drivers behind your current model prediction:
            </p>
          </div>
          <div className="space-y-2">
            {pred?.top_factors?.map((f: any, idx: number) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-mist border border-line flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-ink-900 capitalize">
                    {f.feature.replace(/_/g, ' ')}
                  </span>
                  <span className="text-ink-500 ml-2 font-mono">({f.value})</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    f.direction === 'negative'
                      ? 'bg-danger-bg text-danger border border-red-200'
                      : 'bg-brand-100 text-brand-700 border border-brand-200'
                  }`}
                >
                  {f.direction === 'negative' ? 'Attention Needed' : 'Good Standing'}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Personalized Recommendations Preview */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h3 className="text-base font-bold text-ink-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-warning" /> Actionable Recommendations
            </h3>
            <Link to="/student/recommendations" className="text-xs text-brand-600 hover:underline font-semibold flex items-center gap-1">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-2.5">
            {data?.recommendations?.slice(0, 4).map((rec: string, idx: number) => (
              <div key={idx} className="p-3 rounded-xl bg-mist border border-line text-xs text-ink-700 leading-relaxed">
                {rec}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
