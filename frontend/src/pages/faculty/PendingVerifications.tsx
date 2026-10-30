import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  CheckSquare, FileText, CheckCircle, XCircle, Clock, Eye, Download,
  Filter, AlertTriangle, Sparkles, User, Calendar, BookOpen
} from 'lucide-react'
import { testPaperApi } from '../../api'
import type { TestPaper } from '../../api'
import {
  Card, StatCard, Button, Modal, EmptyState, Skeleton, Textarea
} from '../../components/ui'

export default function FacultyPendingVerifications() {
  const [papers, setPapers] = useState<TestPaper[]>([])
  const [loading, setLoading] = useState(true)

  // Verification modal
  const [selectedPaper, setSelectedPaper] = useState<TestPaper | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [verifyStatus, setVerifyStatus] = useState<'Verified' | 'Rejected'>('Verified')
  const [correctedMarks, setCorrectedMarks] = useState<string>('')
  const [facultyComment, setFacultyComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Document preview in modal
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  const loadPending = async () => {
    try {
      setLoading(true)
      const res = await testPaperApi.getFacultyPending()
      setPapers(res.data)
    } catch {
      toast.error('Failed to load pending verifications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPending()
  }, [])

  // Open Review Modal
  const openReviewModal = async (paper: TestPaper) => {
    setSelectedPaper(paper)
    setVerifyStatus('Verified')
    setCorrectedMarks(String(paper.marks_obtained))
    setFacultyComment('')
    setModalOpen(true)

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

  const closeModal = () => {
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl)
      setPreviewBlobUrl(null)
    }
    setModalOpen(false)
    setSelectedPaper(null)
  }

  // Handle Submit Verification
  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPaper) return

    let finalMarks: number | undefined = undefined
    if (verifyStatus === 'Verified') {
      finalMarks = parseFloat(correctedMarks)
      if (isNaN(finalMarks) || finalMarks < 0) {
        toast.error('Please enter valid non-negative marks')
        return
      }
      if (finalMarks > selectedPaper.max_marks) {
        toast.error(`Marks cannot exceed max marks (${selectedPaper.max_marks})`)
        return
      }
    } else {
      if (!facultyComment.trim()) {
        toast.error('Please provide a reason or comment for rejection')
        return
      }
    }

    setSubmitting(true)
    try {
      await testPaperApi.verifyPaper(selectedPaper.id, {
        status: verifyStatus,
        faculty_comment: facultyComment.trim() || undefined,
        corrected_marks: verifyStatus === 'Verified' ? finalMarks : undefined,
      })

      toast.success(
        verifyStatus === 'Verified'
          ? 'Test paper approved & synced into academic records'
          : 'Test paper marked as rejected'
      )
      closeModal()
      loadPending()
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to update verification status'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
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

  // Calculate unique students
  const uniqueStudentsCount = new Set(papers.map((p) => p.student_id)).size
  const avgClaimedPercentage = papers.length > 0
    ? (papers.reduce((sum, p) => sum + p.percentage, 0) / papers.length).toFixed(1)
    : '0.0'

  return (
    <div className="space-y-6 py-2">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900 tracking-tight flex items-center gap-3">
            <span className="p-2 rounded-xl bg-brand-100 text-brand-700">
              <CheckSquare className="w-6 h-6" />
            </span>
            Pending Paper Verifications
          </h1>
          <p className="text-xs sm:text-sm text-ink-500 mt-1 max-w-2xl">
            Evaluate and verify student-submitted test papers. Approved marks are synchronized directly
            into continuous evaluation records, updating institutional risk scores automatically.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={loadPending}
          disabled={loading}
          className="shrink-0"
        >
          Refresh Queue
        </Button>
      </div>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Pending Queue"
          value={papers.length}
          icon={<Clock className="w-5 h-5 text-warning" />}
          caption="Submissions awaiting review"
        />
        <StatCard
          label="Students Pending"
          value={uniqueStudentsCount}
          icon={<User className="w-5 h-5 text-brand-600" />}
          caption="Distinct students with uploads"
        />
        <StatCard
          label="Average Claimed"
          value={`${avgClaimedPercentage}%`}
          icon={<BookOpen className="w-5 h-5 text-accent-500" />}
          caption="Across pending evaluations"
        />
      </div>

      {/* ── Papers Queue Table ── */}
      <Card className="overflow-hidden p-0 border border-line">
        <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-ink-900">Verification Queue</h2>
            <p className="text-xs text-ink-500">{papers.length} items awaiting faculty review</p>
          </div>
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
              title="All Caught Up!"
              description="There are currently no pending test papers requiring verification from your students."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-line bg-mist/60 text-ink-700 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Subject & Exam</th>
                  <th className="py-3 px-4">Exam Date</th>
                  <th className="py-3 px-4">Claimed Marks</th>
                  <th className="py-3 px-4">Score (%)</th>
                  <th className="py-3 px-4">Document</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {papers.map((p) => (
                  <tr key={p.id} className="hover:bg-brand-50/40 transition">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-ink-900">
                        {p.student_name || `Student #${p.student_id}`}
                      </div>
                      <div className="text-[11px] text-ink-500 font-mono">
                        {p.student_code || `ID: ${p.student_id}`}
                      </div>
                    </td>

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

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 max-w-[150px]">
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
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => openReviewModal(p)}
                        icon={<CheckCircle className="w-3.5 h-3.5" />}
                      >
                        Review & Verify
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Review & Verification Modal ── */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title="Review & Verify Test Paper"
        maxWidth="xl"
      >
        {selectedPaper && (
          <form onSubmit={handleSubmitVerification} className="space-y-4 text-xs">
            {/* Student & Paper Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-mist border border-line">
              <div>
                <div className="text-[10px] text-ink-500 uppercase font-bold">Student</div>
                <div className="font-bold text-ink-900 text-xs mt-0.5">
                  {selectedPaper.student_name || `ID: ${selectedPaper.student_id}`}
                </div>
                <div className="text-[10px] text-ink-500 font-mono">
                  {selectedPaper.student_code}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-ink-500 uppercase font-bold">Subject</div>
                <div className="font-bold text-ink-900 text-xs mt-0.5">{selectedPaper.subject}</div>
                <div className="text-[10px] text-ink-500">{selectedPaper.exam_type}</div>
              </div>
              <div>
                <div className="text-[10px] text-ink-500 uppercase font-bold">Claimed Marks</div>
                <div className="font-bold text-brand-700 text-xs mt-0.5">
                  {selectedPaper.marks_obtained} / {selectedPaper.max_marks}
                </div>
                <div className="text-[10px] text-ink-500">{selectedPaper.percentage}%</div>
              </div>
              <div>
                <div className="text-[10px] text-ink-500 uppercase font-bold">Exam Date</div>
                <div className="text-ink-900 text-xs mt-0.5 font-medium">
                  {new Date(selectedPaper.exam_date).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Student Remarks */}
            {selectedPaper.remarks && (
              <div className="p-2.5 rounded-xl bg-surface border border-line text-xs">
                <span className="font-bold text-ink-900">Student Remarks: </span>
                <span className="text-ink-700">{selectedPaper.remarks}</span>
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
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDownload(selectedPaper)}
                  icon={<Download className="w-3 h-3" />}
                >
                  Download
                </Button>
              </div>

              <div className="min-h-[260px] max-h-[380px] flex items-center justify-center p-2 bg-mist/30 overflow-auto">
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
                      className="max-h-[360px] max-w-full rounded-lg object-contain shadow-xs"
                    />
                  ) : (
                    <iframe
                      src={previewBlobUrl}
                      title="PDF Preview"
                      className="w-full h-[360px] rounded-lg border-0"
                    />
                  )
                ) : (
                  <div className="text-center p-8 text-ink-500 text-xs">
                    Preview not available directly in browser.
                    <div className="mt-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDownload(selectedPaper)}
                        icon={<Download className="w-3 h-3" />}
                      >
                        Download File
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Verification Decision */}
            <div className="p-3 rounded-xl bg-mist border border-line space-y-3">
              <label className="block font-bold text-ink-900 text-xs">Verification Action</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-ink-900">
                  <input
                    type="radio"
                    name="verifyStatus"
                    value="Verified"
                    checked={verifyStatus === 'Verified'}
                    onChange={() => setVerifyStatus('Verified')}
                    className="text-brand-600 focus:ring-brand-500"
                  />
                  <CheckCircle className="w-4 h-4 text-brand-600" />
                  Approve & Sync Marks
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-semibold text-ink-900">
                  <input
                    type="radio"
                    name="verifyStatus"
                    value="Rejected"
                    checked={verifyStatus === 'Rejected'}
                    onChange={() => setVerifyStatus('Rejected')}
                    className="text-danger focus:ring-danger"
                  />
                  <XCircle className="w-4 h-4 text-danger" />
                  Reject Submission
                </label>
              </div>

              {/* If verified, allow marks calibration */}
              {verifyStatus === 'Verified' ? (
                <div className="pt-2 border-t border-line">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-ink-700 mb-1">
                        Verified Marks Obtained *
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max={selectedPaper.max_marks}
                        value={correctedMarks}
                        onChange={(e) => setCorrectedMarks(e.target.value)}
                        required
                        className="w-full text-xs rounded-xl border border-line bg-surface px-3 py-2 text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <span className="text-[10px] text-ink-500 mt-0.5 block">
                        Edit if calculated marks on answer sheet differ.
                      </span>
                    </div>

                    <div>
                      <label className="block font-semibold text-ink-700 mb-1">Max Marks</label>
                      <input
                        type="number"
                        disabled
                        value={selectedPaper.max_marks}
                        className="w-full text-xs rounded-xl border border-line bg-mist/60 px-3 py-2 text-ink-500 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Faculty comments */}
              <div>
                <label className="block font-semibold text-ink-700 mb-1">
                  Faculty Comment / Feedback {verifyStatus === 'Rejected' && '*'}
                </label>
                <Textarea
                  rows={2}
                  value={facultyComment}
                  onChange={(e) => setFacultyComment(e.target.value)}
                  placeholder={
                    verifyStatus === 'Verified'
                      ? 'e.g. Verified answer key against marks awarded.'
                      : 'e.g. Uploaded paper is missing page 2; marks tally does not match.'
                  }
                  required={verifyStatus === 'Rejected'}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <Button type="button" variant="secondary" size="sm" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant={verifyStatus === 'Verified' ? 'primary' : 'danger'}
                size="sm"
                loading={submitting}
                icon={verifyStatus === 'Verified' ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              >
                {verifyStatus === 'Verified' ? 'Confirm & Approve' : 'Reject Submission'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
