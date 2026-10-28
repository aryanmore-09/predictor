import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  CalendarCheck, Plus, CheckCircle, XCircle, Clock, AlertTriangle,
  Upload, Download, Search, Send, FileText, Filter, Users, Sparkles
} from 'lucide-react'
import { attendanceApi } from '../../api'
import type {
  ClassSessionItem,
  SessionStudentItem,
  DefaulterStudent,
  LeaveRequestItem
} from '../../api'
import {
  Card, StatCard, Button, Modal, EmptyState, Skeleton, Textarea
} from '../../components/ui'

const SUBJECT_OPTIONS = [
  'Data Structures & Algorithms',
  'Object-Oriented Programming',
  'Database Management Systems',
  'Computer Networks',
  'Operating Systems',
  'Discrete Mathematics',
  'Software Engineering',
  'Artificial Intelligence',
]

export default function FacultyAttendanceManagement() {
  const [activeTab, setActiveTab] = useState<'mark' | 'reports' | 'leaves'>('mark')
  const [sessions, setSessions] = useState<ClassSessionItem[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null)
  const [roster, setRoster] = useState<SessionStudentItem[]>([])
  const [defaulters, setDefaulters] = useState<DefaulterStudent[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [savingAttendance, setSavingAttendance] = useState(false)

  // Search filter in roster
  const [searchQuery, setSearchQuery] = useState('')

  // New session modal
  const [newSessionOpen, setNewSessionOpen] = useState(false)
  const [newSubject, setNewSubject] = useState(SUBJECT_OPTIONS[0])
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0])
  const [newStart, setNewStart] = useState('09:00')
  const [newEnd, setNewEnd] = useState('10:00')
  const [newDivision, setNewDivision] = useState('CSE-A')
  const [newRoom, setNewRoom] = useState('Room 401')
  const [newTopic, setNewTopic] = useState('')
  const [creatingSession, setCreatingSession] = useState(false)

  // CSV upload modal
  const [csvModalOpen, setCsvModalOpen] = useState(false)
  const [csvSubject, setCsvSubject] = useState(SUBJECT_OPTIONS[0])
  const [csvDate, setCsvDate] = useState(new Date().toISOString().split('T')[0])
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [uploadingCsv, setUploadingCsv] = useState(false)

  // Review leave modal
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequestItem | null>(null)
  const [reviewStatus, setReviewStatus] = useState<'Approved' | 'Rejected'>('Approved')
  const [reviewComment, setReviewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  const loadInitialData = async () => {
    try {
      setLoading(true)
      const [sessRes, defRes, leaveRes] = await Promise.all([
        attendanceApi.getFacultySessions(),
        attendanceApi.getDefaulters(),
        attendanceApi.getFacultyLeaveRequests(),
      ])
      setSessions(sessRes.data)
      setDefaulters(defRes.data)
      setLeaveRequests(leaveRes.data)

      if (sessRes.data.length > 0 && !selectedSessionId) {
        setSelectedSessionId(sessRes.data[0].id)
      }
    } catch {
      toast.error('Failed to load faculty attendance data')
    } finally {
      setLoading(false)
    }
  }

  const loadRoster = async (sessionId: number) => {
    try {
      const res = await attendanceApi.getSessionStudents(sessionId)
      setRoster(res.data)
    } catch {
      toast.error('Failed to load student roster for session')
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (selectedSessionId) {
      loadRoster(selectedSessionId)
    }
  }, [selectedSessionId])

  // Handle Mark All Present
  const handleMarkAllPresent = () => {
    setRoster((prev) =>
      prev.map((s) => ({
        ...s,
        current_status: 'Present',
      }))
    )
    toast.success('Marked all students as Present')
  }

  // Toggle individual status
  const handleStatusChange = (studentId: number, newStatus: 'Present' | 'Absent' | 'Late' | 'Excused') => {
    setRoster((prev) =>
      prev.map((s) =>
        s.student_id === studentId ? { ...s, current_status: newStatus } : s
      )
    )
  }

  // Save attendance
  const handleSaveAttendance = async () => {
    if (!selectedSessionId) return
    setSavingAttendance(true)
    try {
      const recordsToSave = roster.map((s) => ({
        student_id: s.student_id,
        status: s.current_status,
        remarks: s.remarks,
      }))
      const res = await attendanceApi.markSession(selectedSessionId, recordsToSave)
      toast.success(res.data.message || 'Attendance saved and synchronized successfully!')
      loadInitialData()
      loadRoster(selectedSessionId)
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to save attendance'
      toast.error(msg)
    } finally {
      setSavingAttendance(false)
    }
  }

  // Create new session
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingSession(true)
    try {
      const res = await attendanceApi.createSession({
        subject: newSubject,
        session_date: newDate,
        start_time: newStart,
        end_time: newEnd,
        class_division: newDivision,
        room: newRoom,
        topic: newTopic || undefined,
      })
      toast.success('Class session created!')
      setNewSessionOpen(false)
      await loadInitialData()
      setSelectedSessionId(res.data.id)
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to create session'
      toast.error(msg)
    } finally {
      setCreatingSession(false)
    }
  }

  // Upload CSV
  const handleUploadCsv = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!csvFile) {
      toast.error('Please choose a CSV file')
      return
    }
    setUploadingCsv(true)
    try {
      const form = new FormData()
      form.append('subject', csvSubject)
      form.append('session_date', csvDate)
      form.append('file', csvFile)
      const res = await attendanceApi.uploadCsv(form)
      toast.success(`Processed ${res.data.processed_rows} rows from CSV`)
      setCsvModalOpen(false)
      setCsvFile(null)
      await loadInitialData()
      setSelectedSessionId(res.data.session_id)
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to upload CSV attendance'
      toast.error(msg)
    } finally {
      setUploadingCsv(false)
    }
  }

  // Send reminder
  const handleSendReminder = async (studentId: number) => {
    try {
      const res = await attendanceApi.sendReminder(studentId)
      toast.success(res.data.message || 'Reminder sent')
    } catch {
      toast.error('Failed to dispatch reminder')
    }
  }

  // Submit Leave Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLeave) return
    setSubmittingReview(true)
    try {
      const form = new FormData()
      form.append('status', reviewStatus)
      if (reviewComment.trim()) {
        form.append('faculty_comment', reviewComment.trim())
      }
      await attendanceApi.reviewLeaveRequest(selectedLeave.id, form)
      toast.success(`Leave request marked as ${reviewStatus}`)
      setReviewModalOpen(false)
      setSelectedLeave(null)
      loadInitialData()
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to review leave request'
      toast.error(msg)
    } finally {
      setSubmittingReview(false)
    }
  }

  // Live Counts for selected session
  const presentCount = roster.filter((s) => s.current_status === 'Present').length
  const absentCount = roster.filter((s) => s.current_status === 'Absent').length
  const lateCount = roster.filter((s) => s.current_status === 'Late').length
  const excusedCount = roster.filter((s) => s.current_status === 'Excused').length

  const filteredRoster = roster.filter(
    (s) =>
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedSessionObj = sessions.find((s) => s.id === selectedSessionId)

  return (
    <div className="space-y-6 py-2">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900 tracking-tight flex items-center gap-3">
            <span className="p-2 rounded-xl bg-brand-100 text-brand-700">
              <CalendarCheck className="w-6 h-6" />
            </span>
            Attendance Management
          </h1>
          <p className="text-xs sm:text-sm text-ink-500 mt-1 max-w-2xl">
            Mark daily class session attendance, review student excuse requests, and track students
            requiring attendance advisories.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCsvModalOpen(true)}
            icon={<Upload className="w-3.5 h-3.5" />}
          >
            Import CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setNewSessionOpen(true)}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Schedule Session
          </Button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b border-line gap-2 overflow-x-auto text-xs font-semibold">
        {[
          { id: 'mark', label: 'Mark Session Attendance', icon: CalendarCheck },
          { id: 'reports', label: `Defaulter Reports (${defaulters.length})`, icon: AlertTriangle },
          { id: 'leaves', label: `Excuse Requests (${leaveRequests.length})`, icon: Clock },
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

      {/* ── TAB 1: Mark Attendance ── */}
      {activeTab === 'mark' && (
        <div className="space-y-5">
          {/* Session Selector & Controls Bar */}
          <Card className="p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">
                  Select Class Session
                </label>
                <select
                  value={selectedSessionId || ''}
                  onChange={(e) => setSelectedSessionId(Number(e.target.value))}
                  className="w-full text-xs rounded-xl border border-line bg-white px-3 py-2 text-ink-900 font-medium"
                >
                  {sessions.map((sess) => (
                    <option key={sess.id} value={sess.id}>
                      {sess.subject} — {new Date(sess.session_date).toLocaleDateString()} ({sess.start_time})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">Search Student</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-ink-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or roll number..."
                    className="w-full text-xs rounded-xl border border-line bg-white pl-8 pr-3 py-2 text-ink-900"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleMarkAllPresent}
                  icon={<CheckCircle className="w-3.5 h-3.5" />}
                  className="flex-1"
                >
                  Mark All Present
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveAttendance}
                  loading={savingAttendance}
                  className="flex-1 shadow-sm"
                >
                  Save Attendance
                </Button>
              </div>
            </div>

            {/* Live Counts Indicator */}
            {selectedSessionObj && (
              <div className="pt-3 border-t border-line flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="text-ink-700">
                  <span className="font-bold text-ink-900">{selectedSessionObj.subject}</span> •{' '}
                  {selectedSessionObj.class_division} •{' '}
                  {new Date(selectedSessionObj.session_date).toLocaleDateString()} ({selectedSessionObj.start_time} - {selectedSessionObj.end_time})
                </div>

                <div className="flex items-center gap-3 font-semibold tabular-nums text-[11px]">
                  <span className="px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 border border-brand-200">
                    Present: {presentCount}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-danger-bg text-danger border border-red-200">
                    Absent: {absentCount}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-warning-bg text-warning border border-yellow-200">
                    Late: {lateCount}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-accent-50 text-accent-700 border border-accent-100">
                    Excused: {excusedCount}
                  </span>
                </div>
              </div>
            )}
          </Card>

          {/* Student Roster Table */}
          <Card className="overflow-hidden p-0 border border-line">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-line bg-mist/60 text-ink-700 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Subject Standing</th>
                    <th className="py-3 px-4 text-center">Attendance Status</th>
                    <th className="py-3 px-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredRoster.map((s) => (
                    <tr key={s.student_id} className="hover:bg-brand-50/30 transition">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-ink-900">{s.full_name}</div>
                        <div className="text-[11px] text-ink-500 font-mono">{s.student_code}</div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`font-extrabold tabular-nums px-2 py-0.5 rounded-md text-[11px] ${
                            s.current_attendance_pct >= 75
                              ? 'bg-brand-100 text-brand-700'
                              : s.current_attendance_pct >= 65
                              ? 'bg-warning-bg text-warning'
                              : 'bg-danger-bg text-danger'
                          }`}
                        >
                          {s.current_attendance_pct}%
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex rounded-xl p-1 bg-mist border border-line gap-1">
                          {(['Present', 'Absent', 'Late', 'Excused'] as const).map((st) => {
                            const isSelected = s.current_status === st
                            let selectedClass = 'bg-brand-600 text-white'
                            if (st === 'Absent') selectedClass = 'bg-danger text-white'
                            if (st === 'Late') selectedClass = 'bg-warning text-white'
                            if (st === 'Excused') selectedClass = 'bg-accent-500 text-white'

                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => handleStatusChange(s.student_id, st)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                                  isSelected
                                    ? selectedClass
                                    : 'text-ink-700 hover:bg-white hover:text-ink-900'
                                }`}
                              >
                                {st}
                              </button>
                            )
                          })}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={s.remarks || ''}
                          onChange={(e) => {
                            const val = e.target.value
                            setRoster((prev) =>
                              prev.map((item) =>
                                item.student_id === s.student_id ? { ...item, remarks: val } : item
                              )
                            )
                          }}
                          placeholder="Add note..."
                          className="w-full text-xs bg-transparent border-0 border-b border-transparent hover:border-line focus:border-brand-500 focus:outline-none py-1 text-ink-900"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB 2: Reports & Defaulters ── */}
      {activeTab === 'reports' && (
        <Card className="p-0 overflow-hidden border border-line space-y-4">
          <div className="p-4 sm:p-5 border-b border-line flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-ink-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" /> Students Below 75% Mandatory Attendance
              </h2>
              <p className="text-xs text-ink-500 mt-0.5">
                Students requiring academic follow-up or counseling to avoid examination debarment
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-danger-bg text-danger border border-red-200">
              {defaulters.length} At-Risk Students
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-line bg-mist/60 text-ink-700 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Department &amp; Sem</th>
                  <th className="py-3 px-4">Overall %</th>
                  <th className="py-3 px-4">Weakest Course</th>
                  <th className="py-3 px-4">Classes Needed</th>
                  <th className="py-3 px-4 text-right">Action</th>
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
                      {d.department} (Sem {d.semester})
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

                    <td className="py-3 px-4 whitespace-nowrap text-ink-700 font-semibold">
                      +{d.classes_needed} classes
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleSendReminder(d.student_id)}
                        icon={<Send className="w-3.5 h-3.5" />}
                      >
                        Send Reminder
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── TAB 3: Leave Requests Queue ── */}
      {activeTab === 'leaves' && (
        <Card className="p-0 overflow-hidden border border-line">
          <div className="p-4 sm:p-5 border-b border-line">
            <h2 className="text-base font-bold text-ink-900">Student Absence &amp; Leave Requests</h2>
            <p className="text-xs text-ink-500 mt-0.5">
              Approved requests automatically mark corresponding class dates as Excused (excluded from denominator).
            </p>
          </div>

          {leaveRequests.length === 0 ? (
            <div className="py-12">
              <EmptyState title="No Leave Requests" description="All caught up! No student excuse requests pending review." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-line bg-mist/60 text-ink-700 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Requested Dates</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Document</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Review Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {leaveRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-brand-50/40 transition">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-ink-900">{req.student_name}</div>
                        <div className="text-[11px] text-ink-500 font-mono">{req.student_code}</div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-ink-900 font-medium">
                        {new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4 text-ink-700 max-w-xs">{req.reason}</td>

                      <td className="py-3 px-4">
                        {req.original_filename ? (
                          <span className="inline-flex items-center gap-1.5 text-accent-700 font-semibold truncate max-w-[140px]">
                            <FileText className="w-3.5 h-3.5" />
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

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {req.status === 'Pending' ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setSelectedLeave(req)
                              setReviewStatus('Approved')
                              setReviewComment('')
                              setReviewModalOpen(true)
                            }}
                          >
                            Review
                          </Button>
                        ) : (
                          <span className="text-[11px] text-ink-500 italic">
                            Reviewed ({req.status})
                          </span>
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

      {/* ── Schedule Class Session Modal ── */}
      <Modal
        isOpen={newSessionOpen}
        onClose={() => setNewSessionOpen(false)}
        title="Schedule Class Session"
        maxWidth="md"
      >
        <form onSubmit={handleCreateSession} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-ink-700 mb-1">Subject *</label>
            <select
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              required
              className="w-full text-xs rounded-xl border border-line bg-white px-3 py-2 text-ink-900"
            >
              {SUBJECT_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Session Date *</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                required
                className="w-full text-xs rounded-xl border border-line bg-white px-3 py-2 text-ink-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Division *</label>
              <input
                type="text"
                value={newDivision}
                onChange={(e) => setNewDivision(e.target.value)}
                required
                className="w-full text-xs rounded-xl border border-line bg-white px-3 py-2 text-ink-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Start Time *</label>
              <input
                type="time"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                required
                className="w-full text-xs rounded-xl border border-line bg-white px-3 py-2 text-ink-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-ink-700 mb-1">End Time *</label>
              <input
                type="time"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
                required
                className="w-full text-xs rounded-xl border border-line bg-white px-3 py-2 text-ink-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-ink-700 mb-1">Topic / Lecture Agenda</label>
            <input
              type="text"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              placeholder="e.g. Graph Traversals (BFS & DFS)"
              className="w-full text-xs rounded-xl border border-line bg-white px-3 py-2 text-ink-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-line">
            <Button variant="secondary" size="sm" type="button" onClick={() => setNewSessionOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={creatingSession}>
              Create Session
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── CSV Upload Modal ── */}
      <Modal
        isOpen={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        title="Import Attendance from CSV"
        maxWidth="md"
      >
        <form onSubmit={handleUploadCsv} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-ink-700 mb-1">Subject *</label>
            <select
              value={csvSubject}
              onChange={(e) => setCsvSubject(e.target.value)}
              required
              className="w-full text-xs rounded-xl border border-line bg-white px-3 py-2 text-ink-900"
            >
              {SUBJECT_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-ink-700 mb-1">Session Date *</label>
            <input
              type="date"
              value={csvDate}
              onChange={(e) => setCsvDate(e.target.value)}
              required
              className="w-full text-xs rounded-xl border border-line bg-white px-3 py-2 text-ink-900"
            />
          </div>

          <div>
            <label className="block font-semibold text-ink-700 mb-1">CSV File *</label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => e.target.files && setCsvFile(e.target.files[0])}
              required
              className="w-full text-xs text-ink-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
            />
            <p className="text-[11px] text-ink-500 mt-1">
              File must include columns for <code>student_id</code> (or roll number) and <code>status</code> (Present / Absent / Late / Excused).
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-line">
            <Button variant="secondary" size="sm" type="button" onClick={() => setCsvModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={uploadingCsv}>
              Upload &amp; Process
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Review Leave Request Modal ── */}
      <Modal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title="Review Student Leave Request"
        maxWidth="md"
      >
        {selectedLeave && (
          <form onSubmit={handleSubmitReview} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-mist border border-line space-y-1">
              <div className="font-bold text-ink-900">{selectedLeave.student_name} ({selectedLeave.student_code})</div>
              <div className="text-[11px] text-ink-500">
                Dates: {new Date(selectedLeave.start_date).toLocaleDateString()} to {new Date(selectedLeave.end_date).toLocaleDateString()}
              </div>
              <div className="text-ink-700 text-xs mt-1">
                <strong>Reason: </strong>{selectedLeave.reason}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-ink-700 mb-1.5">Decision</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-ink-900">
                  <input
                    type="radio"
                    name="revStatus"
                    value="Approved"
                    checked={reviewStatus === 'Approved'}
                    onChange={() => setReviewStatus('Approved')}
                    className="text-brand-600 focus:ring-brand-500"
                  />
                  <CheckCircle className="w-4 h-4 text-brand-600" />
                  Approve (Exclude from Denominator)
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-ink-900">
                  <input
                    type="radio"
                    name="revStatus"
                    value="Rejected"
                    checked={reviewStatus === 'Rejected'}
                    onChange={() => setReviewStatus('Rejected')}
                    className="text-danger focus:ring-danger"
                  />
                  <XCircle className="w-4 h-4 text-danger" />
                  Reject
                </label>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-ink-700 mb-1">Faculty Comment / Feedback</label>
              <Textarea
                rows={2}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="e.g. Valid medical documentation verified."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <Button variant="secondary" size="sm" type="button" onClick={() => setReviewModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant={reviewStatus === 'Approved' ? 'primary' : 'danger'}
                size="sm"
                type="submit"
                loading={submittingReview}
              >
                Confirm {reviewStatus}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
