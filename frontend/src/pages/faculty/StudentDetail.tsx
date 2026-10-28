import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowLeft, RefreshCw, Send, UserCheck, ShieldAlert, AlertTriangle,
  CheckCircle, Calendar, BookOpen, MessageSquare, Download
} from 'lucide-react'
import { facultyApi, predictionApi, reportApi } from '../../api'

export default function FacultyStudentDetail() {
  const { id } = useParams<{ id: string }>()
  const studentId = Number(id)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Intervention modal / input
  const [interventionMsg, setInterventionMsg] = useState('')
  const [sendingIntv, setSendingIntv] = useState(false)

  // Referral
  const [referralReason, setReferralReason] = useState('')
  const [referring, setReferring] = useState(false)

  const loadData = async () => {
    try {
      const res = await facultyApi.getStudentDetail(studentId)
      setData(res.data)
    } catch {
      toast.error('Failed to load student details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [studentId])

  const handleRePredict = async () => {
    setRefreshing(true)
    try {
      await predictionApi.predictStudent(studentId)
      toast.success('Generated fresh prediction for student')
      loadData()
    } catch {
      toast.error('Failed to regenerate prediction')
    } finally {
      setRefreshing(false)
    }
  }

  const handleSendIntervention = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!interventionMsg.trim()) return
    setSendingIntv(true)
    try {
      await facultyApi.sendIntervention(studentId, interventionMsg)
      toast.success('Intervention sent to student portal')
      setInterventionMsg('')
      loadData()
    } catch {
      toast.error('Failed to send intervention')
    } finally {
      setSendingIntv(false)
    }
  }

  const handleSendReferral = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!referralReason.trim()) return
    setReferring(true)
    try {
      await facultyApi.createReferral(studentId, referralReason)
      toast.success('Counselor referral created')
      setReferralReason('')
      loadData()
    } catch {
      toast.error('Failed to create referral')
    } finally {
      setReferring(false)
    }
  }

  const handleExportCsv = async () => {
    try {
      const res = await reportApi.exportStudentDetailCsv(studentId)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `student_${studentId}_report.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Student report downloaded')
    } catch {
      toast.error('Failed to export report')
    }
  }

  if (loading) {
    return <div className="text-center py-20 text-slate-400">Loading student file...</div>
  }

  const student = data?.student
  const pred = data?.prediction
  const risk = pred?.risk_level || 'low'

  return (
    <div className="space-y-6">
      {/* Back and Action Nav */}
      <div className="flex items-center justify-between">
        <Link to="/faculty/students" className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition">
          <ArrowLeft className="w-4 h-4" /> Back to Roster
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5" /> Export Report
          </button>
          <button
            onClick={handleRePredict}
            disabled={refreshing}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Evaluating...' : 'Recalculate Risk'}
          </button>
        </div>
      </div>

      {/* Student Overview Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {student?.student_id}
            </span>
            <span className="text-xs text-slate-400">Semester {student?.semester} • {student?.department}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{student?.full_name}</h1>
          <p className="text-xs text-slate-400 mt-1">{student?.email}</p>
        </div>

        {/* Risk Card */}
        <div className={`p-4 rounded-xl border flex items-center gap-4 ${
          risk === 'high' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
          risk === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
          'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
        }`}>
          <div>
            <div className="text-xs font-bold uppercase">Calculated Risk Tier</div>
            <div className="text-2xl font-extrabold capitalize">{risk}</div>
            <div className="text-xs opacity-80">Dropout Prob: {pred ? (pred.dropout_probability * 100).toFixed(1) : 0}%</div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 uppercase font-semibold">Predicted Grade Band</div>
          <div className="text-2xl font-extrabold text-white mt-1">{pred?.predicted_grade_band || 'N/A'}</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 uppercase font-semibold">Pass Probability</div>
          <div className="text-2xl font-extrabold text-emerald-400 mt-1">
            {pred?.pass_probability ? (pred.pass_probability * 100).toFixed(0) + '%' : 'N/A'}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 uppercase font-semibold">Predicted Final Score</div>
          <div className="text-2xl font-extrabold text-blue-400 mt-1">
            {pred?.predicted_score ? pred.predicted_score.toFixed(1) + '%' : 'N/A'}
          </div>
        </div>
      </div>

      {/* Action Tabs / Forms: Send Intervention & Counselor Referral */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Intervention Box */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-400" /> Send Faculty Intervention Message
          </h3>
          <p className="text-xs text-slate-400">
            This message appears in the student's dashboard with an acknowledgment prompt.
          </p>
          <form onSubmit={handleSendIntervention} className="space-y-3">
            <textarea
              rows={3}
              value={interventionMsg}
              onChange={(e) => setInterventionMsg(e.target.value)}
              placeholder="e.g. Noticed your attendance in DBMS has fallen below 75%. Please come see me during office hours tomorrow."
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={sendingIntv}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" /> {sendingIntv ? 'Sending...' : 'Send Intervention'}
            </button>
          </form>

          {/* Past Interventions */}
          {data?.interventions?.length > 0 && (
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <div className="text-xs font-bold text-slate-300">Previous Interventions:</div>
              {data.interventions.slice(0, 3).map((it: any) => (
                <div key={it.id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                  <div className="text-slate-300">{it.message}</div>
                  <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                    <span>{new Date(it.created_at).toLocaleDateString()}</span>
                    <span>{it.is_acknowledged ? 'Acknowledged' : 'Pending Ack'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Counselor Referral Box */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-purple-400" /> Refer Student to Counselor
          </h3>
          <p className="text-xs text-slate-400">
            Escalate for institutional guidance counseling or mental health wellness follow-up.
          </p>
          <form onSubmit={handleSendReferral} className="space-y-3">
            <textarea
              rows={3}
              value={referralReason}
              onChange={(e) => setReferralReason(e.target.value)}
              placeholder="e.g. Student self-reported severe exam stress and personal challenges affecting attendance."
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={referring}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <UserCheck className="w-3.5 h-3.5" /> {referring ? 'Submitting...' : 'Submit Referral'}
            </button>
          </form>

          {/* Past Referrals */}
          {data?.referrals?.length > 0 && (
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <div className="text-xs font-bold text-slate-300">Active Referrals:</div>
              {data.referrals.map((rf: any) => (
                <div key={rf.id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                  <div className="text-slate-300">{rf.reason}</div>
                  <div className="text-[10px] text-purple-400 mt-1">Status: {rf.status}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Attendance & Marks Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-400" /> Attendance Breakdown
          </h3>
          <div className="space-y-2">
            {data?.attendance_summary?.map((att: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-slate-950">
                <span className="text-slate-300">{att.subject}</span>
                <span className={`font-semibold ${att.percentage < 75 ? 'text-red-400' : 'text-slate-200'}`}>
                  {att.percentage}% ({att.attended}/{att.total})
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-400" /> Academic Grades
          </h3>
          <div className="space-y-2">
            {data?.marks_summary?.map((m: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-slate-950">
                <span className="text-slate-300">{m.subject}</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-200 font-semibold">{m.percentage}%</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-blue-400 text-[10px] font-bold">Grade {m.grade}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
