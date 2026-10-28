import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { UploadCloud, FileSpreadsheet, Download, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react'
import { uploadApi } from '../../api'

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
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-white mb-1">Batch Data Ingestion & LMS Integration</h1>
        <p className="text-sm text-slate-400">
          Upload bulk student records, attendance sheets, exam marks, and simulate LMS engagement telemetry.
        </p>
      </div>

      {/* CSV / Excel Upload Card */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <UploadCloud className="w-5 h-5 text-blue-400" /> Upload CSV / Excel Records
        </h2>

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 uppercase font-semibold mb-1">Dataset Type</label>
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
              >
                <option value="attendance">Attendance Records</option>
                <option value="marks">Examination Marks</option>
                <option value="assignments">Assignment Submissions</option>
                <option value="quizzes">Quiz Results</option>
                <option value="students">Student Roster</option>
                <option value="lms">LMS Activity Telemetry</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 uppercase font-semibold mb-1">Download Template</label>
              <a
                href={`/api/upload/template/${uploadType}`}
                download
                className="w-full p-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl text-blue-400 flex items-center justify-center gap-2 text-xs font-semibold transition"
              >
                <Download className="w-3.5 h-3.5" /> Download {uploadType}.csv Template
              </a>
            </div>
          </div>

          {/* File Picker */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
              Select CSV or Excel (.xlsx, .xls)
            </label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-300 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer bg-slate-950 p-2 border border-slate-800 rounded-xl"
            />
          </div>

          <button
            type="submit"
            disabled={uploading || !file}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
          >
            {uploading ? 'Processing File...' : 'Upload and Ingest Records'}
          </button>
        </form>

        {/* Upload Result Feedback */}
        {result && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <CheckCircle className="w-4 h-4" /> Ingestion Status: {result.status}
            </div>
            <div className="text-slate-300">
              Rows Ingested: <strong>{result.rows_uploaded}</strong> • Rows Failed: <strong>{result.rows_failed}</strong>
            </div>
            {result.errors?.length > 0 && (
              <div className="text-red-400 space-y-1">
                <div className="font-bold">Errors encountered:</div>
                {result.errors.map((err: string, i: number) => (
                  <div key={i}>• {err}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mock LMS Real-Time Sync */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-purple-400" /> Simulate Real-Time LMS Engagement Sync
        </h2>
        <p className="text-xs text-slate-400">
          Simulate an active webhook or automated nightly sync from Moodle/Canvas LMS for an enrolled student.
        </p>

        <form onSubmit={handleLmsSync} className="flex gap-3 items-center">
          <input
            type="number"
            min="1"
            value={syncStudentId}
            onChange={(e) => setSyncStudentId(e.target.value)}
            placeholder="Student DB ID (e.g. 1)"
            className="w-48 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            disabled={syncing}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Sync Telemetry'}
          </button>
        </form>

        {syncResult && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1 text-slate-300">
            <div className="text-emerald-400 font-bold mb-1">✓ Telemetry Updated for Student #{syncResult.student_id}</div>
            <div>• Weekly Login Frequency: {syncResult.data.login_frequency_per_week} days</div>
            <div>• Time Spent: {syncResult.data.avg_time_spent_hours} hrs/week</div>
            <div>• Resource Views: {syncResult.data.resource_views}</div>
            <div>• Forum Posts: {syncResult.data.forum_posts}</div>
          </div>
        )}
      </div>
    </div>
  )
}
