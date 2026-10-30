import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowLeft, RefreshCw, Send, UserCheck, Calendar, BookOpen, MessageSquare, Download, CheckCircle, Award, TrendingUp,
  FileText, Eye, Clock, XCircle
} from 'lucide-react'
import { facultyApi, predictionApi, reportApi, testPaperApi, attendanceApi } from '../../api'
import type { TestPaper, AttendanceSummary, SubjectAttendance, CalendarDayItem } from '../../api'
import { Card, StatCard, Button, RiskBadge, Textarea, Skeleton, Modal, EmptyState } from '../../components/ui'
import WhatIfSimulator from '../../components/WhatIfSimulator'
import RiskTrendChart from '../../components/RiskTrendChart'

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

  // Student Test Papers
  const [papers, setPapers] = useState<TestPaper[]>([])
  const [loadingPapers, setLoadingPapers] = useState(false)
  const [previewPaper, setPreviewPaper] = useState<TestPaper | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Attendance Drilldown
  const [attSummary, setAttSummary] = useState<AttendanceSummary | null>(null)
  const [attSubjects, setAttSubjects] = useState<SubjectAttendance[]>([])
  const [attCalendar, setAttCalendar] = useState<CalendarDayItem[]>([])

  const loadData = async () => {
    try {
      const [resDetail, resPapers, resSum, resSubjs, resCal] = await Promise.all([
        facultyApi.getStudentDetail(studentId),
        testPaperApi.getStudentPapers(studentId).catch(() => ({ data: [] })),
        attendanceApi.getStudentDrilldownSummary(studentId).catch(() => ({ data: null })),
        attendanceApi.getStudentDrilldownSubjects(studentId).catch(() => ({ data: [] })),
        attendanceApi.getStudentDrilldownCalendar(studentId).catch(() => ({ data: [] })),
      ])
      setData(resDetail.data)
      setPapers(resPapers.data || [])
      setAttSummary(resSum.data)
      setAttSubjects(resSubjs.data || [])
      setAttCalendar(resCal.data || [])
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

  const [downloadingPdf, setDownloadingPdf] = useState(false)

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true)
      const res = await reportApi.exportStudentPdf(studentId)
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `student_${student?.student_id || studentId}_report.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Student PDF report downloaded')
    } catch {
      toast.error('Failed to download PDF report')
    } finally {
      setDownloadingPdf(false)
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

  const handleOpenPaperPreview = async (paper: TestPaper) => {
    setPreviewPaper(paper)
    try {
      const res = await testPaperApi.downloadFile(paper.id)
      const blob = new Blob([res.data], { type: paper.file_type })
      setPreviewUrl(URL.createObjectURL(blob))
    } catch {
      toast.error('Failed to load file preview')
    }
  }

  const handleClosePaperPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    setPreviewPaper(null)
  }

  const handleDownloadPaper = async (paper: TestPaper) => {
    try {
      const res = await testPaperApi.downloadFile(paper.id)
      const blob = new Blob([res.data], { type: paper.file_type })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = paper.original_filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Paper downloaded')
    } catch {
      toast.error('Failed to download paper')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 py-2">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  const student = data?.student
  const pred = data?.prediction
  const risk = pred?.risk_level || 'low'

  return (
    <div className="space-y-6 py-2">
      {/* Back and Action Nav */}
      <div className="flex items-center justify-between">
        <Link
          to="/faculty/students"
          className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1.5 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Student Roster
        </Link>
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadPdf}
            loading={downloadingPdf}
            icon={<FileText className="w-3.5 h-3.5" />}
          >
            Download PDF
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Export CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleRePredict}
            loading={refreshing}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Recalculate Risk
          </Button>
        </div>
      </div>

      {/* Student Overview Header */}
      <Card className="p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
              {student?.student_id}
            </span>
            <span className="text-xs text-ink-500 font-medium">Semester {student?.semester} • {student?.department}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900 tracking-tight">{student?.full_name}</h1>
          <p className="text-xs text-ink-500 font-mono mt-1">{student?.email}</p>
        </div>

        {/* Risk Card */}
        <div className="p-4 rounded-2xl bg-brand-50 border border-brand-200 flex items-center gap-4 shrink-0 shadow-xs">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Calculated Risk Tier</div>
            <div className="mt-1">
              <RiskBadge risk={risk} size="md" />
            </div>
            <div className="text-xs text-ink-500 mt-1 tabular-nums">
              Dropout Prob: {pred ? (pred.dropout_probability * 100).toFixed(1) : 0}%
            </div>
          </div>
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Predicted Grade Band"
          value={pred?.predicted_grade_band || 'N/A'}
          caption="Continuous performance projection"
          icon={<Award className="w-4 h-4" />}
        />
        <StatCard
          label="Pass Probability"
          value={pred?.pass_probability ? (pred.pass_probability * 100).toFixed(0) + '%' : 'N/A'}
          caption="Course completion likelihood"
          icon={<CheckCircle className="w-4 h-4" />}
          valueClassName="text-brand-600"
        />
        <StatCard
          label="Predicted Final Score"
          value={pred?.predicted_score ? pred.predicted_score.toFixed(1) + '%' : 'N/A'}
          caption="Semester marks expectation"
          icon={<TrendingUp className="w-4 h-4" />}
          valueClassName="text-accent-600"
        />
      </div>

      {/* Risk Trend Over Time */}
      <RiskTrendChart studentId={studentId} />

      {/* What-If Simulator */}
      <WhatIfSimulator studentId={studentId} studentName={student?.full_name} />

      {/* Action Forms: Send Intervention & Counselor Referral */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Intervention Box */}
        <Card className="space-y-4">
          <div className="border-b border-line pb-3">
            <h3 className="text-base font-bold text-ink-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-brand-600" /> Send Faculty Intervention Message
            </h3>
            <p className="text-xs text-ink-500 mt-0.5">
              This message appears in the student's dashboard with an acknowledgment prompt.
            </p>
          </div>
          <form onSubmit={handleSendIntervention} className="space-y-3">
            <Textarea
              rows={3}
              value={interventionMsg}
              onChange={(e) => setInterventionMsg(e.target.value)}
              placeholder="e.g. Noticed your attendance in DBMS has fallen below 75%. Please come see me during office hours tomorrow."
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={sendingIntv}
              icon={<Send className="w-3.5 h-3.5" />}
            >
              Send Intervention
            </Button>
          </form>

          {/* Past Interventions */}
          {data?.interventions?.length > 0 ? (
            <div className="pt-3 border-t border-line space-y-2">
              <div className="text-xs font-bold text-ink-700 uppercase tracking-wider">Previous Interventions:</div>
              {data.interventions.slice(0, 3).map((it: any) => (
                <div key={it.id} className="p-3 rounded-xl bg-mist border border-line text-xs">
                  <div className="text-ink-900 font-medium">{it.message}</div>
                  <div className="text-[10px] text-ink-500 mt-1 flex justify-between">
                    <span>{new Date(it.created_at).toLocaleDateString()}</span>
                    <span className={it.is_acknowledged ? 'text-brand-600 font-bold' : 'text-warning font-semibold'}>
                      {it.is_acknowledged ? 'Acknowledged' : 'Pending Ack'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="pt-3 border-t border-line">
              <EmptyState
                icon={<MessageSquare className="w-5 h-5 text-brand-500" />}
                title="No Interventions Sent"
                description="No previous intervention messages have been logged for this student."
                className="py-6"
              />
            </div>
          )}
        </Card>

        {/* Counselor Referral Box */}
        <Card className="space-y-4">
          <div className="border-b border-line pb-3">
            <h3 className="text-base font-bold text-ink-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-accent-500" /> Refer Student to Counselor
            </h3>
            <p className="text-xs text-ink-500 mt-0.5">
              Escalate for institutional guidance counseling or mental health wellness follow-up.
            </p>
          </div>
          <form onSubmit={handleSendReferral} className="space-y-3">
            <Textarea
              rows={3}
              value={referralReason}
              onChange={(e) => setReferralReason(e.target.value)}
              placeholder="e.g. Student self-reported severe exam stress and personal challenges affecting attendance."
            />
            <Button
              type="submit"
              variant="accent"
              size="sm"
              loading={referring}
              icon={<UserCheck className="w-3.5 h-3.5" />}
            >
              Submit Referral
            </Button>
          </form>

          {/* Past Referrals */}
          {data?.referrals?.length > 0 && (
            <div className="pt-3 border-t border-line space-y-2">
              <div className="text-xs font-bold text-ink-700 uppercase tracking-wider">Active Referrals:</div>
              {data.referrals.map((rf: any) => (
                <div key={rf.id} className="p-3 rounded-xl bg-mist border border-line text-xs">
                  <div className="text-ink-900 font-medium">{rf.reason}</div>
                  <div className="text-[10px] text-accent-700 font-semibold mt-1">Status: {rf.status}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Attendance & Marks Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="space-y-3">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h3 className="text-base font-bold text-ink-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-600" /> Attendance Participation
            </h3>
            {attSummary && (
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  attSummary.overall_percentage >= attSummary.threshold_percentage
                    ? 'bg-brand-100 text-brand-700'
                    : 'bg-danger-bg text-danger'
                }`}
              >
                {attSummary.overall_percentage}% ({attSummary.status_label})
              </span>
            )}
          </div>

          {attSummary && (
            <div className="p-3 rounded-xl bg-mist border border-line flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-ink-900">Total Classes: </span>
                <span className="text-ink-700 font-bold">{attSummary.total_classes}</span>
                <span className="text-ink-400 mx-2">•</span>
                <span className="font-semibold text-brand-700">Attended: {attSummary.attended_classes}</span>
                <span className="text-ink-400 mx-2">•</span>
                <span className="font-semibold text-danger">Missed: {attSummary.missed_classes}</span>
              </div>
              <span className="text-[11px] text-ink-500 font-mono">
                Req: {attSummary.threshold_percentage}%
              </span>
            </div>
          )}

          <div className="space-y-2">
            {attSubjects.length > 0
              ? attSubjects.map((att, idx) => (
                  <div key={idx} className="flex flex-col gap-1 text-xs p-3 rounded-xl bg-mist border border-line">
                    <div className="flex justify-between items-center">
                      <span className="text-ink-900 font-semibold">{att.subject}</span>
                      <span className={`font-bold tabular-nums ${att.percentage < (attSummary?.threshold_percentage ?? 75) ? 'text-danger' : 'text-brand-700'}`}>
                        {att.percentage}% ({att.attended_classes}/{att.total_classes})
                      </span>
                    </div>
                    <div className="text-[10px] text-ink-500">
                      {att.percentage < (attSummary?.threshold_percentage ?? 75)
                        ? `Shortage: needs +${att.classes_needed_for_threshold} consecutive sessions to reach threshold`
                        : `Safe: can miss ${att.classes_can_miss} sessions without shortage`}
                    </div>
                  </div>
                ))
              : data?.attendance_summary?.map((att: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-xs p-3 rounded-xl bg-mist border border-line">
                    <span className="text-ink-900 font-medium">{att.subject}</span>
                    <span className={`font-semibold tabular-nums ${att.percentage < 75 ? 'text-danger font-bold' : 'text-brand-700'}`}>
                      {att.percentage}% ({att.attended}/{att.total})
                    </span>
                  </div>
                ))}
          </div>
        </Card>

        <Card className="space-y-3">
          <h3 className="text-base font-bold text-ink-900 flex items-center gap-2 border-b border-line pb-3">
            <BookOpen className="w-4 h-4 text-accent-500" /> Academic Continuous Grades
          </h3>
          <div className="space-y-2">
            {data?.marks_summary?.map((m: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center text-xs p-3 rounded-xl bg-mist border border-line">
                <span className="text-ink-900 font-medium">{m.subject}</span>
                <div className="flex items-center gap-2">
                  <span className="text-ink-900 font-semibold tabular-nums">{m.percentage}%</span>
                  <span className="px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 border border-brand-200 text-[10px] font-bold">
                    Grade {m.grade}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Uploaded Test Papers Section */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <h3 className="text-base font-bold text-ink-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-600" /> Student Test Papers & Evaluations
            </h3>
            <p className="text-xs text-ink-500 mt-0.5">
              Verified and pending evaluation submissions uploaded by this student
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-mist border border-line text-ink-700">
            {papers.length} Papers
          </span>
        </div>

        {papers.length === 0 ? (
          <div className="py-6 text-center text-xs text-ink-500">
            No test papers uploaded by this student yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-line bg-mist/60 text-ink-700 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3">Exam Type</th>
                  <th className="py-2.5 px-3">Exam Date</th>
                  <th className="py-2.5 px-3">Marks</th>
                  <th className="py-2.5 px-3">Percentage</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {papers.map((p) => (
                  <tr key={p.id} className="hover:bg-brand-50/40 transition">
                    <td className="py-2.5 px-3 font-semibold text-ink-900">{p.subject}</td>
                    <td className="py-2.5 px-3 text-ink-700">{p.exam_type}</td>
                    <td className="py-2.5 px-3 text-ink-700 whitespace-nowrap">
                      {new Date(p.exam_date).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-ink-900">
                      {p.marks_obtained} / {p.max_marks}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                          p.percentage >= 75
                            ? 'bg-brand-100 text-brand-700'
                            : p.percentage >= 50
                            ? 'bg-warning-bg text-warning'
                            : 'bg-danger-bg text-danger'
                        }`}
                      >
                        {p.percentage}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {p.status === 'Verified' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700">
                          <CheckCircle className="w-3 h-3" /> Verified
                        </span>
                      )}
                      {p.status === 'Pending' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-warning">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      )}
                      {p.status === 'Rejected' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-danger">
                          <XCircle className="w-3 h-3" /> Rejected
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenPaperPreview(p)}
                          className="p-1 rounded text-ink-700 hover:text-brand-600 hover:bg-brand-50"
                          title="Preview paper"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDownloadPaper(p)}
                          className="p-1 rounded text-ink-700 hover:text-accent-500 hover:bg-accent-50"
                          title="Download document"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Paper Preview Modal */}
      <Modal
        isOpen={!!previewPaper}
        onClose={handleClosePaperPreview}
        title="Student Test Paper Document"
        maxWidth="xl"
      >
        {previewPaper && (
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center p-3 rounded-xl bg-mist border border-line">
              <div>
                <span className="font-bold text-ink-900">{previewPaper.subject}</span> ({previewPaper.exam_type})
                <div className="text-ink-500 text-[11px] mt-0.5">
                  Exam Date: {new Date(previewPaper.exam_date).toLocaleDateString()}
                </div>
              </div>
              <div className="text-right">
                <span className="font-bold text-brand-700 text-sm">
                  {previewPaper.marks_obtained} / {previewPaper.max_marks} ({previewPaper.percentage}%)
                </span>
                <div className="text-[10px] text-ink-500 mt-0.5 font-semibold">
                  Status: {previewPaper.status}
                </div>
              </div>
            </div>

            {previewPaper.remarks && (
              <div className="p-2.5 rounded-lg bg-surface border border-line">
                <span className="font-bold text-ink-900">Student Remarks: </span>
                <span className="text-ink-700">{previewPaper.remarks}</span>
              </div>
            )}

            {previewPaper.faculty_comment && (
              <div className="p-2.5 rounded-lg bg-brand-50 border border-brand-200 text-brand-800">
                <span className="font-bold">Faculty Comment: </span>
                <span>{previewPaper.faculty_comment}</span>
              </div>
            )}

            <div className="border border-line rounded-xl overflow-hidden bg-surface min-h-[280px] max-h-[420px] flex items-center justify-center p-2">
              {previewUrl ? (
                previewPaper.file_type.startsWith('image/') ? (
                  <img src={previewUrl} alt="Paper" className="max-h-[400px] object-contain rounded" />
                ) : (
                  <iframe src={previewUrl} title="Paper PDF" className="w-full h-[400px] rounded border-0" />
                )
              ) : (
                <div className="text-ink-500">Loading document preview...</div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleDownloadPaper(previewPaper)}
                icon={<Download className="w-3.5 h-3.5" />}
              >
                Download File
              </Button>
              <Button variant="secondary" size="sm" onClick={handleClosePaperPreview}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
