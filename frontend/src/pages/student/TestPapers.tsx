import React, { useEffect, useState, useRef } from 'react'
import toast from 'react-hot-toast'
import {
  FileText, Upload, Plus, CheckCircle, Clock, XCircle, AlertCircle,
  Eye, Edit3, Trash2, Download, BarChart2, TrendingUp, Sparkles,
  ExternalLink, FileCheck, Award
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine
} from 'recharts'
import { testPaperApi } from '../../api'
import type { TestPaper, TestPaperSummary } from '../../api'
import {
  Card, StatCard, Button, Input, Select, Textarea, Modal, EmptyState, Skeleton
} from '../../components/ui'
import {
  CHART_PALETTE, CHART_GRID_COLOR, CHART_AXIS_COLOR, chartTooltipStyle
} from '../../utils/chartColors'

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

const EXAM_TYPE_OPTIONS = [
  'Unit Test',
  'Midterm',
  'Quiz',
  'Assignment',
  'Endterm',
]

export default function StudentTestPapers() {
  const [papers, setPapers] = useState<TestPaper[]>([])
  const [summary, setSummary] = useState<TestPaperSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Filters
  const [filterSubject, setFilterSubject] = useState('')
  const [filterExamType, setFilterExamType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  // Selected paper
  const [selectedPaper, setSelectedPaper] = useState<TestPaper | null>(null)
  const [paperToDelete, setPaperToDelete] = useState<TestPaper | null>(null)

  // Form states for Upload
  const [file, setFile] = useState<File | null>(null)
  const [uploadSubject, setUploadSubject] = useState(SUBJECT_OPTIONS[0])
  const [uploadExamType, setUploadExamType] = useState('Midterm')
  const [uploadExamDate, setUploadExamDate] = useState(new Date().toISOString().split('T')[0])
  const [uploadMarks, setUploadMarks] = useState<string>('')
  const [uploadMaxMarks, setUploadMaxMarks] = useState<string>('50')
  const [uploadRemarks, setUploadRemarks] = useState('')
  const [submittingUpload, setSubmittingUpload] = useState(false)
  const [extractingMarks, setExtractingMarks] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form states for Edit
  const [editMarks, setEditMarks] = useState<string>('')
  const [editMaxMarks, setEditMaxMarks] = useState<string>('')
  const [editRemarks, setEditRemarks] = useState('')
  const [submittingEdit, setSubmittingEdit] = useState(false)

  // Preview blob url
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const params: Record<string, unknown> = {
        page,
        page_size: pageSize,
      }
      if (filterSubject) params.subject = filterSubject
      if (filterExamType) params.exam_type = filterExamType
      if (filterStatus) params.status = filterStatus

      const [papersRes, summaryRes] = await Promise.all([
        testPaperApi.getMyPapers(params),
        testPaperApi.getMySummary(),
      ])

      setPapers(papersRes.data.items)
      setTotal(papersRes.data.total)
      setSummary(summaryRes.data)
    } catch {
      toast.error('Failed to load test papers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [page, filterSubject, filterExamType, filterStatus])

  // Handle File select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0]
      const ext = selected.name.split('.').pop()?.toLowerCase() || ''
      if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext)) {
        toast.error('Only PDF, JPG, JPEG, and PNG files are allowed')
        return
      }
      if (selected.size > 5 * 1024 * 1024) {
        toast.error('File size exceeds maximum limit of 5 MB')
        return
      }
      setFile(selected)
    }
  }

  // Auto-extract marks heuristic
  const handleAutoExtract = async () => {
    if (!file) {
      toast.error('Please choose a file first')
      return
    }
    setExtractingMarks(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await testPaperApi.extractMarks(form)
      if (res.data.marks_obtained !== undefined) {
        setUploadMarks(String(res.data.marks_obtained))
      }
      if (res.data.max_marks !== undefined) {
        setUploadMaxMarks(String(res.data.max_marks))
      }
      toast.success(res.data.message || 'Suggested marks extracted from paper')
    } catch {
      toast.error('Could not auto-extract marks from document')
    } finally {
      setExtractingMarks(false)
    }
  }

  // Handle Submit Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      toast.error('Please select a test paper document')
      return
    }
    const obtained = parseFloat(uploadMarks)
    const max = parseFloat(uploadMaxMarks)
    if (isNaN(obtained) || isNaN(max)) {
      toast.error('Please enter valid numeric marks')
      return
    }
    if (obtained < 0 || max <= 0) {
      toast.error('Marks must be non-negative and max marks greater than 0')
      return
    }
    if (obtained > max) {
      toast.error(`Marks obtained (${obtained}) cannot exceed max marks (${max})`)
      return
    }

    setSubmittingUpload(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('subject', uploadSubject)
      form.append('exam_type', uploadExamType)
      form.append('exam_date', uploadExamDate)
      form.append('marks_obtained', String(obtained))
      form.append('max_marks', String(max))
      if (uploadRemarks.trim()) {
        form.append('remarks', uploadRemarks.trim())
      }

      await testPaperApi.upload(form)
      toast.success('Test paper uploaded successfully! Pending faculty verification.')
      setUploadModalOpen(false)
      // reset form
      setFile(null)
      setUploadMarks('')
      setUploadRemarks('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      loadData()
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to upload test paper'
      toast.error(msg)
    } finally {
      setSubmittingUpload(false)
    }
  }

  // Open Edit Modal
  const openEditModal = (paper: TestPaper) => {
    setSelectedPaper(paper)
    setEditMarks(String(paper.marks_obtained))
    setEditMaxMarks(String(paper.max_marks))
    setEditRemarks(paper.remarks || '')
    setEditModalOpen(true)
  }

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPaper) return
    const obtained = parseFloat(editMarks)
    const max = parseFloat(editMaxMarks)
    if (isNaN(obtained) || isNaN(max)) {
      toast.error('Please enter valid numeric marks')
      return
    }
    if (obtained < 0 || max <= 0) {
      toast.error('Marks must be non-negative and max marks greater than 0')
      return
    }
    if (obtained > max) {
      toast.error(`Marks obtained (${obtained}) cannot exceed max marks (${max})`)
      return
    }

    setSubmittingEdit(true)
    try {
      await testPaperApi.updatePaper(selectedPaper.id, {
        marks_obtained: obtained,
        max_marks: max,
        remarks: editRemarks.trim() || undefined,
      })
      toast.success('Test paper updated successfully')
      setEditModalOpen(false)
      setSelectedPaper(null)
      loadData()
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to update test paper'
      toast.error(msg)
    } finally {
      setSubmittingEdit(false)
    }
  }

  // Delete Paper
  const handleDelete = async () => {
    if (!paperToDelete) return
    try {
      await testPaperApi.deletePaper(paperToDelete.id)
      toast.success('Test paper deleted')
      setDeleteModalOpen(false)
      setPaperToDelete(null)
      loadData()
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to delete test paper'
      toast.error(msg)
    }
  }

  // Open Preview Modal
  const openPreviewModal = async (paper: TestPaper) => {
    setSelectedPaper(paper)
    setPreviewModalOpen(true)
    setLoadingPreview(true)
    try {
      const res = await testPaperApi.downloadFile(paper.id)
      const blob = new Blob([res.data], { type: paper.file_type })
      const url = URL.createObjectURL(blob)
      setPreviewBlobUrl(url)
    } catch {
      toast.error('Failed to load file preview')
    } finally {
      setLoadingPreview(false)
    }
  }

  const closePreviewModal = () => {
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl)
      setPreviewBlobUrl(null)
    }
    setPreviewModalOpen(false)
    setSelectedPaper(null)
  }

  // Download authenticated
  const handleDownload = async (paper: TestPaper) => {
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
      toast.success('File downloaded')
    } catch {
      toast.error('Failed to download file')
    }
  }

  // Calc live percentage
  const livePercentage = () => {
    const ob = parseFloat(uploadMarks)
    const mx = parseFloat(uploadMaxMarks)
    if (!isNaN(ob) && !isNaN(mx) && mx > 0) {
      return ((ob / mx) * 100).toFixed(1)
    }
    return null
  }

  return (
    <div className="space-y-6 py-2">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900 tracking-tight flex items-center gap-3">
            <span className="p-2 rounded-xl bg-brand-100 text-brand-700">
              <FileCheck className="w-6 h-6" />
            </span>
            My Test Papers & Marks
          </h1>
          <p className="text-xs sm:text-sm text-ink-500 mt-1 max-w-2xl">
            Upload your evaluated exam papers, quizzes, and midterms. Once verified by your faculty,
            marks synchronize directly with continuous evaluation records and ML dropout models.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setUploadModalOpen(true)}
          icon={<Plus className="w-4 h-4" />}
          className="shadow-sm shrink-0"
        >
          Upload Test Paper
        </Button>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Uploaded"
          value={summary?.total_uploaded ?? 0}
          icon={<FileText className="w-5 h-5 text-brand-600" />}
          caption="Evaluation submissions"
        />
        <StatCard
          label="Pending Review"
          value={summary?.pending_count ?? 0}
          icon={<Clock className="w-5 h-5 text-warning" />}
          caption="Awaiting faculty sign-off"
        />
        <StatCard
          label="Verified Papers"
          value={summary?.verified_count ?? 0}
          icon={<CheckCircle className="w-5 h-5 text-brand-600" />}
          caption="Synchronized to records"
        />
        <StatCard
          label="Average Score"
          value={`${summary?.overall_avg_percentage ?? 0}%`}
          icon={<Award className="w-5 h-5 text-accent-500" />}
          caption={
            summary?.best_subject
              ? `Best: ${summary.best_subject.subject.split(' ')[0]}`
              : 'Continuous evaluation'
          }
        />
      </div>

      {/* ── Analytics Visualizations ── */}
      {summary && summary.total_uploaded > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Subject-Wise Performance Bar Chart */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-ink-900 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-brand-600" /> Subject-Wise Average Marks (%)
                </h3>
                <p className="text-xs text-ink-500 mt-0.5">Average score achieved in verified submissions</p>
              </div>
            </div>
            {summary.subject_averages.length > 0 ? (
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.subject_averages} margin={{ top: 10, right: 20, left: -10, bottom: 35 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} vertical={false} />
                    <XAxis
                      dataKey="subject"
                      stroke={CHART_AXIS_COLOR}
                      tick={{ fontSize: 10 }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      tickFormatter={(val) => val.length > 14 ? val.substring(0, 12) + '...' : val}
                    />
                    <YAxis
                      stroke={CHART_AXIS_COLOR}
                      domain={[0, 100]}
                      tick={{ fontSize: 11 }}
                      unit="%"
                    />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      formatter={(val: any) => [`${val}%`, 'Avg Score']}
                      labelFormatter={(label) => `Subject: ${label}`}
                    />
                    <ReferenceLine y={75} stroke="#2E7D32" strokeDasharray="4 4" label={{ value: 'Target 75%', fill: '#2E7D32', fontSize: 10 }} />
                    <Bar dataKey="avg_percentage" fill={CHART_PALETTE[0]} radius={[6, 6, 0, 0]} maxBarSize={45} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-ink-500 py-12 text-center">No subject averages available yet.</p>
            )}
          </Card>

          {/* Marks Trend Over Time */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-ink-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-accent-500" /> Performance Progression
                </h3>
                <p className="text-xs text-ink-500 mt-0.5">Chronological score trajectory across assessments</p>
              </div>
            </div>
            {summary.trends.length > 0 ? (
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={summary.trends.map((t) => ({
                      ...t,
                      dateStr: new Date(t.exam_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                    }))}
                    margin={{ top: 10, right: 20, left: -10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} vertical={false} />
                    <XAxis dataKey="dateStr" stroke={CHART_AXIS_COLOR} tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} stroke={CHART_AXIS_COLOR} tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      formatter={(val: any) => [`${val}%`, 'Score']}
                      labelFormatter={(_label, payload) => {
                        const item = payload?.[0]?.payload
                        return item ? `${item.subject} (${item.exam_type})` : ''
                      }}
                    />
                    <ReferenceLine y={60} stroke="#D69E2E" strokeDasharray="3 3" />
                    <Line
                      type="monotone"
                      dataKey="percentage"
                      stroke={CHART_PALETTE[1]}
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: CHART_PALETTE[1], stroke: '#fff', strokeWidth: 1.5 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-ink-500 py-12 text-center">No trend data available yet.</p>
            )}
          </Card>
        </div>
      )}

      {/* ── Filter Bar & Search ── */}
      <Card className="p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1">Filter by Subject</label>
            <select
              value={filterSubject}
              onChange={(e) => {
                setFilterSubject(e.target.value)
                setPage(1)
              }}
              className="w-full text-xs rounded-xl border border-line bg-surface px-3 py-2 text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Subjects</option>
              {SUBJECT_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1">Filter by Exam Type</label>
            <select
              value={filterExamType}
              onChange={(e) => {
                setFilterExamType(e.target.value)
                setPage(1)
              }}
              className="w-full text-xs rounded-xl border border-line bg-surface px-3 py-2 text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Exam Types</option>
              {EXAM_TYPE_OPTIONS.map((et) => (
                <option key={et} value={et}>{et}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1">Verification Status</label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value)
                setPage(1)
              }}
              className="w-full text-xs rounded-xl border border-line bg-surface px-3 py-2 text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending Verification</option>
              <option value="Verified">Verified</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>
      </Card>

      {/* ── Test Papers Table / List ── */}
      <Card className="overflow-hidden p-0 border border-line">
        <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-ink-900">Submitted Papers & Evaluations</h2>
            <p className="text-xs text-ink-500">Showing {papers.length} of {total} test paper records</p>
          </div>
          {(filterSubject || filterExamType || filterStatus) && (
            <button
              onClick={() => {
                setFilterSubject('')
                setFilterExamType('')
                setFilterStatus('')
                setPage(1)
              }}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : papers.length === 0 ? (
          <div className="py-12">
            <EmptyState
              title="No Test Papers Found"
              description={
                filterSubject || filterExamType || filterStatus
                  ? "No test papers matched your selected filters."
                  : "You haven't uploaded any test papers yet. Click 'Upload Test Paper' above to submit your first paper."
              }
              action={
                <Button variant="primary" size="sm" onClick={() => setUploadModalOpen(true)}>
                  Upload First Paper
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-line bg-mist/60 text-ink-700 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Subject & Exam</th>
                  <th className="py-3 px-4">Exam Date</th>
                  <th className="py-3 px-4">Marks Obtained</th>
                  <th className="py-3 px-4">Score (%)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Document</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {papers.map((p) => {
                  const isPending = p.status === 'Pending'
                  const isVerified = p.status === 'Verified'
                  const isRejected = p.status === 'Rejected'

                  return (
                    <tr key={p.id} className="hover:bg-brand-50/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-ink-900">{p.subject}</div>
                        <div className="text-[11px] text-ink-500 font-medium">{p.exam_type}</div>
                      </td>

                      <td className="py-3.5 px-4 text-ink-700 whitespace-nowrap">
                        {new Date(p.exam_date).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-ink-900 tabular-nums">
                          {p.marks_obtained}
                        </span>
                        <span className="text-ink-500 text-[11px]"> / {p.max_marks}</span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`font-extrabold tabular-nums px-2 py-0.5 rounded-md text-[11px] ${
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

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isPending && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-warning-bg text-warning border border-yellow-200">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                        {isVerified && (
                          <div>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-brand-100 text-brand-700 border border-brand-200">
                              <CheckCircle className="w-3 h-3" /> Verified
                            </span>
                            {p.verifier_name && (
                              <div className="text-[10px] text-ink-500 mt-0.5">
                                By {p.verifier_name}
                              </div>
                            )}
                          </div>
                        )}
                        {isRejected && (
                          <div>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-danger-bg text-danger border border-red-200">
                              <XCircle className="w-3 h-3" /> Rejected
                            </span>
                            {p.faculty_comment && (
                              <div className="text-[10px] text-danger max-w-[150px] truncate mt-0.5">
                                {p.faculty_comment}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 max-w-[160px]">
                          <FileText className="w-3.5 h-3.5 text-accent-500 shrink-0" />
                          <span className="truncate text-ink-700 font-medium" title={p.original_filename}>
                            {p.original_filename}
                          </span>
                        </div>
                        <div className="text-[10px] text-ink-500">
                          {(p.file_size / 1024).toFixed(0)} KB
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openPreviewModal(p)}
                            className="p-1.5 rounded-lg text-ink-700 hover:text-brand-600 hover:bg-brand-50 transition"
                            title="View paper details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDownload(p)}
                            className="p-1.5 rounded-lg text-ink-700 hover:text-accent-500 hover:bg-accent-50 transition"
                            title="Download document"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {isPending && (
                            <>
                              <button
                                onClick={() => openEditModal(p)}
                                className="p-1.5 rounded-lg text-ink-700 hover:text-brand-600 hover:bg-brand-50 transition"
                                title="Edit details"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => {
                                  setPaperToDelete(p)
                                  setDeleteModalOpen(true)
                                }}
                                className="p-1.5 rounded-lg text-ink-700 hover:text-danger hover:bg-red-50 transition"
                                title="Delete submission"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > pageSize && (
          <div className="p-4 border-t border-line flex items-center justify-between text-xs text-ink-500">
            <span>
              Page {page} of {Math.ceil(total / pageSize)}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= Math.ceil(total / pageSize)}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Upload Modal ── */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload Test Paper & Marks"
        maxWidth="lg"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
          {/* File Picker & Dropzone */}
          <div>
            <label className="block font-semibold text-ink-700 mb-1.5">
              Select Exam Document (PDF, PNG, JPG, JPEG — max 5MB) *
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition ${
                file
                  ? 'border-brand-500 bg-brand-50/60'
                  : 'border-line hover:border-brand-400 bg-mist/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className={`w-8 h-8 mx-auto mb-2 ${file ? 'text-brand-600' : 'text-ink-300'}`} />
              {file ? (
                <div>
                  <div className="font-bold text-brand-700 text-sm truncate max-w-xs mx-auto">
                    {file.name}
                  </div>
                  <div className="text-ink-500 text-[11px] mt-0.5">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB • Click to replace
                  </div>
                </div>
              ) : (
                <div>
                  <div className="font-semibold text-ink-900 text-xs">
                    Click to browse or drop test paper here
                  </div>
                  <div className="text-ink-500 text-[11px] mt-0.5">
                    Scanned answer sheet, screenshot, or digital PDF
                  </div>
                </div>
              )}
            </div>

            {/* Heuristic auto-extract helper */}
            {file && (
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleAutoExtract}
                  disabled={extractingMarks}
                  className="inline-flex items-center gap-1.5 text-[11px] text-accent-500 hover:text-accent-700 font-semibold transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {extractingMarks ? 'Scanning document...' : 'Auto-suggest marks from file'}
                </button>
              </div>
            )}
          </div>

          {/* Subject & Exam Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Subject *</label>
              <select
                value={uploadSubject}
                onChange={(e) => setUploadSubject(e.target.value)}
                required
                className="w-full text-xs rounded-xl border border-line bg-surface px-3 py-2 text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {SUBJECT_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-ink-700 mb-1">Exam Type *</label>
              <select
                value={uploadExamType}
                onChange={(e) => setUploadExamType(e.target.value)}
                required
                className="w-full text-xs rounded-xl border border-line bg-surface px-3 py-2 text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {EXAM_TYPE_OPTIONS.map((et) => (
                  <option key={et} value={et}>{et}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Exam Date */}
          <div>
            <label className="block font-semibold text-ink-700 mb-1">Exam Date *</label>
            <input
              type="date"
              value={uploadExamDate}
              onChange={(e) => setUploadExamDate(e.target.value)}
              required
              className="w-full text-xs rounded-xl border border-line bg-surface px-3 py-2 text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Marks Obtained & Max Marks */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Marks Obtained *</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={uploadMarks}
                onChange={(e) => setUploadMarks(e.target.value)}
                placeholder="e.g. 42.5"
                required
                className="w-full text-xs rounded-xl border border-line bg-surface px-3 py-2 text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink-700 mb-1">Max Marks *</label>
              <input
                type="number"
                step="1"
                min="1"
                value={uploadMaxMarks}
                onChange={(e) => setUploadMaxMarks(e.target.value)}
                placeholder="e.g. 50"
                required
                className="w-full text-xs rounded-xl border border-line bg-surface px-3 py-2 text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Live Percentage Preview */}
          {livePercentage() !== null && (
            <div className="p-2.5 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-between">
              <span className="text-ink-700 font-semibold">Calculated Score:</span>
              <span className="text-sm font-extrabold text-brand-700">
                {livePercentage()}%
              </span>
            </div>
          )}

          {/* Remarks */}
          <div>
            <label className="block font-semibold text-ink-700 mb-1">Remarks / Notes (Optional)</label>
            <Textarea
              rows={2}
              value={uploadRemarks}
              onChange={(e) => setUploadRemarks(e.target.value)}
              placeholder="e.g. Question 4 was awarded bonus marks; verified by TA."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-line">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setUploadModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={submittingUpload}
              icon={<Upload className="w-3.5 h-3.5" />}
            >
              Submit Paper
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Modal ── */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Test Paper Submission"
        maxWidth="md"
      >
        {selectedPaper && (
          <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-mist border border-line space-y-1">
              <div className="font-bold text-ink-900">{selectedPaper.subject}</div>
              <div className="text-ink-500 text-[11px]">
                {selectedPaper.exam_type} • {new Date(selectedPaper.exam_date).toLocaleDateString()}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-ink-700 mb-1">Marks Obtained *</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={editMarks}
                  onChange={(e) => setEditMarks(e.target.value)}
                  required
                  className="w-full text-xs rounded-xl border border-line bg-surface px-3 py-2 text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-700 mb-1">Max Marks *</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={editMaxMarks}
                  onChange={(e) => setEditMaxMarks(e.target.value)}
                  required
                  className="w-full text-xs rounded-xl border border-line bg-surface px-3 py-2 text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-ink-700 mb-1">Remarks</label>
              <Textarea
                rows={2}
                value={editRemarks}
                onChange={(e) => setEditRemarks(e.target.value)}
                placeholder="Add or modify notes"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={submittingEdit}
              >
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── View / Preview Modal ── */}
      <Modal
        isOpen={previewModalOpen}
        onClose={closePreviewModal}
        title="Test Paper Details & Document"
        maxWidth="xl"
      >
        {selectedPaper && (
          <div className="space-y-4 text-xs">
            {/* Header meta */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-mist border border-line">
              <div>
                <div className="text-[10px] text-ink-500 uppercase font-bold">Subject</div>
                <div className="font-bold text-ink-900 text-xs mt-0.5">{selectedPaper.subject}</div>
              </div>
              <div>
                <div className="text-[10px] text-ink-500 uppercase font-bold">Exam Type</div>
                <div className="font-semibold text-ink-900 text-xs mt-0.5">{selectedPaper.exam_type}</div>
              </div>
              <div>
                <div className="text-[10px] text-ink-500 uppercase font-bold">Score</div>
                <div className="font-bold text-brand-700 text-xs mt-0.5">
                  {selectedPaper.marks_obtained} / {selectedPaper.max_marks} ({selectedPaper.percentage}%)
                </div>
              </div>
              <div>
                <div className="text-[10px] text-ink-500 uppercase font-bold">Status</div>
                <div className="mt-0.5">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      selectedPaper.status === 'Verified'
                        ? 'bg-brand-100 text-brand-700'
                        : selectedPaper.status === 'Rejected'
                        ? 'bg-danger-bg text-danger'
                        : 'bg-warning-bg text-warning'
                    }`}
                  >
                    {selectedPaper.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Remarks / Faculty Comments */}
            {selectedPaper.remarks && (
              <div className="p-3 rounded-xl bg-surface border border-line text-xs">
                <span className="font-bold text-ink-900">Your Remarks: </span>
                <span className="text-ink-700">{selectedPaper.remarks}</span>
              </div>
            )}

            {selectedPaper.faculty_comment && (
              <div
                className={`p-3 rounded-xl border text-xs ${
                  selectedPaper.status === 'Rejected'
                    ? 'bg-danger-bg/40 border-red-200 text-danger'
                    : 'bg-brand-50 border-brand-200 text-brand-800'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Faculty Feedback from {selectedPaper.verifier_name || 'Evaluator'}:
                </div>
                <div>{selectedPaper.faculty_comment}</div>
              </div>
            )}

            {/* Document Viewer Frame */}
            <div className="border border-line rounded-xl overflow-hidden bg-surface">
              <div className="p-2.5 bg-mist border-b border-line flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate max-w-sm">
                  <FileText className="w-4 h-4 text-accent-500 shrink-0" />
                  <span className="font-medium text-ink-900 truncate">
                    {selectedPaper.original_filename}
                  </span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDownload(selectedPaper)}
                  icon={<Download className="w-3 h-3" />}
                >
                  Download
                </Button>
              </div>

              <div className="min-h-[300px] max-h-[460px] flex items-center justify-center p-2 bg-mist/30 overflow-auto">
                {loadingPreview ? (
                  <div className="p-8 text-center text-ink-500 space-y-2">
                    <Skeleton className="w-48 h-4 mx-auto" />
                    <div>Loading document preview...</div>
                  </div>
                ) : previewBlobUrl ? (
                  selectedPaper.file_type.startsWith('image/') ? (
                    <img
                      src={previewBlobUrl}
                      alt="Test Paper"
                      className="max-h-[440px] max-w-full rounded-lg object-contain shadow-xs"
                    />
                  ) : (
                    <iframe
                      src={previewBlobUrl}
                      title="PDF Preview"
                      className="w-full h-[440px] rounded-lg border-0"
                    />
                  )
                ) : (
                  <div className="text-center p-8 text-ink-500 text-xs">
                    Preview not available directly in browser.
                    <div className="mt-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDownload(selectedPaper)}
                        icon={<Download className="w-3.5 h-3.5" />}
                      >
                        Download File
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" size="sm" onClick={closePreviewModal}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Delete Confirmation Modal ── */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Test Paper Submission"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-ink-700">
            Are you sure you want to delete this pending submission for{' '}
            <strong className="text-ink-900">{paperToDelete?.subject}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-line">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              icon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Delete Submission
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
