import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { UploadCloud, Download, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react'
import { uploadApi } from '../../api'
import { Card, Button, Input, Select } from '../../components/ui'

export default function AdminUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [uploadType, setUploadType] = useState('attendance')
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<any>(null)

  // LMS Mock Sync
  const [syncStudentId, setSyncStudentId] = useState('1')
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<any>(null)

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      toast.error('Please choose a file to upload')
      return
    }
    setUploading(true)
    setResult(null)
    try {
      const res = await uploadApi.uploadCsv(file, uploadType)
      setResult(res.data)
      toast.success(`Processed! ${res.data.rows_uploaded} rows saved.`)
      setFile(null)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleLmsSync = async (e: React.FormEvent) => {
    e.preventDefault()
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await uploadApi.syncLms(Number(syncStudentId))
      setSyncResult(res.data)
      toast.success('LMS telemetry synced for student!')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'LMS sync failed')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      <Card className="p-6">
        <h1 className="text-2xl font-bold text-ink-900 mb-1 flex items-center gap-2">
          <UploadCloud className="w-6 h-6 text-brand-600" /> Batch Data Ingestion &amp; LMS Integration
        </h1>
        <p className="text-sm text-ink-500">
          Upload bulk student records, attendance sheets, exam marks, and simulate LMS engagement telemetry.
        </p>
      </Card>

      {/* CSV / Excel Upload Card */}
      <Card className="p-6 space-y-6">
        <h2 className="text-base font-bold text-ink-900 flex items-center gap-2 border-b border-line pb-3">
          Upload CSV / Excel Records
        </h2>

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Dataset Type"
              value={uploadType}
              onChange={(e) => setUploadType(e.target.value)}
            >
              <option value="attendance">Attendance Records</option>
              <option value="marks">Examination Marks</option>
              <option value="assignments">Assignment Submissions</option>
              <option value="quizzes">Quiz Results</option>
              <option value="students">Student Roster</option>
              <option value="lms">LMS Activity Telemetry</option>
            </Select>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-700 mb-1.5">
                Download Template
              </label>
              <a
                href={`/api/upload/template/${uploadType}`}
                download
                className="w-full py-2 px-3.5 bg-white border border-line hover:border-brand-300 rounded-xl text-brand-600 hover:text-brand-700 flex items-center justify-center gap-2 text-xs font-semibold transition shadow-xs"
              >
                <Download className="w-3.5 h-3.5" /> Download {uploadType}.csv Template
              </a>
            </div>
          </div>

          {/* File Picker */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-700 mb-1.5">
              Select CSV or Excel (.xlsx, .xls)
            </label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-ink-700 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-600 file:text-white hover:file:bg-brand-700 cursor-pointer bg-mist p-2 border border-line rounded-xl"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={uploading}
            disabled={!file}
            className="w-full"
          >
            Upload and Ingest Records
          </Button>
        </form>

        {/* Upload Result Feedback */}
        {result && (
          <div className="p-4 rounded-xl bg-mist border border-line text-xs space-y-2">
            <div className="flex items-center gap-2 text-brand-600 font-bold">
              <CheckCircle className="w-4 h-4" /> Ingestion Status: {result.status}
            </div>
            <div className="text-ink-700">
              Rows Ingested: <strong className="text-ink-900 font-bold">{result.rows_uploaded}</strong> • Rows Failed: <strong className="text-ink-900 font-bold">{result.rows_failed}</strong>
            </div>
            {result.errors?.length > 0 && (
              <div className="text-danger space-y-1">
                <div className="font-bold">Errors encountered:</div>
                {result.errors.map((err: string, i: number) => (
                  <div key={i}>• {err}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Mock LMS Real-Time Sync */}
      <Card className="p-6 space-y-4">
        <h2 className="text-base font-bold text-ink-900 flex items-center gap-2 border-b border-line pb-3">
          <RefreshCw className="w-5 h-5 text-accent-500" /> Simulate Real-Time LMS Engagement Sync
        </h2>
        <p className="text-xs text-ink-500 leading-relaxed">
          Simulate an active webhook or automated nightly sync from Moodle/Canvas LMS for an enrolled student.
        </p>

        <form onSubmit={handleLmsSync} className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="w-full sm:w-48">
            <Input
              label="Student DB ID"
              type="number"
              min="1"
              value={syncStudentId}
              onChange={(e) => setSyncStudentId(e.target.value)}
              placeholder="e.g. 1"
            />
          </div>
          <Button
            type="submit"
            variant="accent"
            size="md"
            loading={syncing}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Sync Telemetry
          </Button>
        </form>

        {syncResult && (
          <div className="p-4 rounded-xl bg-mist border border-line text-xs space-y-1 text-ink-700">
            <div className="text-brand-600 font-bold mb-1 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" /> Telemetry Updated for Student #{syncResult.student_id}
            </div>
            <div>• Weekly Login Frequency: {syncResult.data.login_frequency_per_week} days</div>
            <div>• Time Spent: {syncResult.data.avg_time_spent_hours} hrs/week</div>
            <div>• Resource Views: {syncResult.data.resource_views}</div>
            <div>• Forum Posts: {syncResult.data.forum_posts}</div>
          </div>
        )}
      </Card>
    </div>
  )
}
