import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ShieldAlert, CheckCircle, TrendingUp, AlertTriangle, BookOpen,
  Calendar, Award, ArrowUpRight, MessageSquare, Sparkles
} from 'lucide-react'
import { studentApi } from '../../api'

export default function StudentDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const res = await studentApi.getDashboard()
      setData(res.data)
    } catch (err: any) {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return <div className="text-center py-20 text-slate-400">Loading student analytics...</div>
  }

  const pred = data?.prediction
  const student = data?.student
  const risk = pred?.risk_level || 'low'

  const riskBadgeColor =
    risk === 'high'
      ? 'bg-red-500/10 text-red-400 border-red-500/30'
      : risk === 'medium'
      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {student?.student_id}
            </span>
            <span className="text-xs text-slate-400">Semester {student?.semester} • Year {student?.year}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Welcome, {student?.full_name}</h1>
          <p className="text-sm text-slate-400 mt-1">{student?.department}</p>
        </div>

        {/* Risk Level Badge */}
        <div className={`p-4 rounded-xl border flex items-center gap-4 ${riskBadgeColor}`}>
          <div className="p-3 rounded-lg bg-black/20">
            {risk === 'high' ? (
              <ShieldAlert className="w-8 h-8 text-red-400" />
            ) : risk === 'medium' ? (
              <AlertTriangle className="w-8 h-8 text-amber-400" />
            ) : (
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            )}
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider">Academic Risk Standing</div>
            <div className="text-xl font-extrabold capitalize">{risk} Risk Tier</div>
            <div className="text-xs opacity-80">
              Dropout Prob: {pred ? (pred.dropout_probability * 100).toFixed(1) : 0}%
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-1">Predicted Grade Band</div>
          <div className="text-3xl font-extrabold text-white">{pred?.predicted_grade_band || 'B'}</div>
          <div className="text-xs text-slate-500 mt-1">Based on performance regression</div>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-1">Pass Probability</div>
          <div className="text-3xl font-extrabold text-emerald-400">
            {pred ? (pred.pass_probability * 100).toFixed(0) : 85}%
          </div>
          <div className="text-xs text-slate-500 mt-1">Course completion confidence</div>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-1">Predicted Score</div>
          <div className="text-3xl font-extrabold text-blue-400">
            {pred ? pred.predicted_score.toFixed(1) : 70.0}%
          </div>
          <div className="text-xs text-slate-500 mt-1">Expected semester average</div>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-1">Active Alerts</div>
          <div className="text-3xl font-extrabold text-amber-400">{data?.alerts?.length || 0}</div>
          <div className="text-xs text-slate-500 mt-1">
            <Link to="/student/alerts" className="text-blue-400 hover:underline">View notifications →</Link>
          </div>
        </div>
      </div>

      {/* Grid: Attendance & Marks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Summary */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-400" /> Attendance by Subject
            </h3>
            <span className="text-xs text-slate-400">Req: 75%</span>
          </div>
          <div className="space-y-3">
            {data?.attendance_summary?.map((att: any, idx: number) => {
              const isLow = att.percentage < 75
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-300">{att.subject}</span>
                    <span className={isLow ? 'text-red-400 font-bold' : 'text-slate-300'}>
                      {att.percentage}% ({att.attended}/{att.total})
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isLow ? 'bg-red-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min(att.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Academic Performance */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-400" /> Academic Scores & Grades
            </h3>
          </div>
          <div className="divide-y divide-slate-800">
            {data?.marks_summary?.map((m: any, idx: number) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-200">{m.subject}</div>
                  <div className="text-slate-400 text-[11px]">{m.marks} / {m.max} marks</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-200">{m.percentage}%</span>
                  <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-800 text-blue-400 border border-slate-700">
                    Grade {m.grade}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Contributing Factors & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Factors */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-400" /> Primary Influencing Factors
          </h3>
          <p className="text-xs text-slate-400">
            Key factors driving your current risk calculation:
          </p>
          <div className="space-y-2">
            {pred?.top_factors?.map((f: any, idx: number) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-200 capitalize">
                    {f.feature.replace(/_/g, ' ')}
                  </span>
                  <span className="text-slate-400 ml-2">({f.value})</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  f.direction === 'negative' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                }`}>
                  {f.direction === 'negative' ? 'Attention Needed' : 'Good Standing'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Personalized Recommendations Preview */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" /> Actionable Recommendations
            </h3>
            <Link to="/student/recommendations" className="text-xs text-blue-400 hover:underline">
              View All →
            </Link>
          </div>
          <div className="space-y-2.5">
            {data?.recommendations?.slice(0, 4).map((rec: string, idx: number) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300">
                {rec}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
