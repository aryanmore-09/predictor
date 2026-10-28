import React, { useState, useEffect } from 'react'
import { Shield, Eye, Lock, FileText, Download, Trash2, Clock, CheckCircle, AlertTriangle, UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi } from '../api'
import { useAuthStore } from '../store/auth'
import { pluralize } from '../utils/format'

export default function PrivacyPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const [students, setStudents] = useState<any[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (isAdmin) {
      loadAdminDsrData()
    }
  }, [isAdmin])

  const loadAdminDsrData = async () => {
    try {
      const [stuRes, logsRes] = await Promise.all([
        adminApi.getStudents(),
        adminApi.getAuditLogs()
      ])
      setStudents(stuRes.data || [])
      setAuditLogs(logsRes.data || [])
      if (stuRes.data?.length > 0 && !selectedStudentId) {
        setSelectedStudentId(String(stuRes.data[0].id))
      }
    } catch {
      // Non-critical if background fetch fails
    }
  }

  const handleExportDsr = async () => {
    if (!selectedStudentId) return
    setExporting(true)
    try {
      const res = await adminApi.exportDsr(Number(selectedStudentId))
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res.data, null, 2))
      const downloadAnchor = document.createElement('a')
      downloadAnchor.setAttribute('href', dataStr)
      downloadAnchor.setAttribute('download', `dsar_export_student_${selectedStudentId}.json`)
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()
      downloadAnchor.remove()
      toast.success('Data Subject Access Request (DSAR) dossier exported successfully!')
      loadAdminDsrData()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to export student data')
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteDsr = async () => {
    if (!selectedStudentId) return
    setDeleting(true)
    try {
      const res = await adminApi.deleteDsr(Number(selectedStudentId))
      toast.success(res.data.message || 'Student data purged successfully.')
      setShowDeleteConfirm(false)
      loadAdminDsrData()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to purge student data')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Shield className="w-3.5 h-3.5" /> FERPA &amp; Academic Data Governance Policy
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Privacy &amp; Institutional Data Use
          </h1>
          <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
            The Student Academic Performance &amp; Dropout Risk Predictor is engineered with strict privacy safeguards, role-based boundaries, and non-punitive decision support principles. Learn how data is collected, protected, and how students retain full control over their records.
          </p>
        </div>
      </div>

      {/* Grid: 4 Core Policy Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Data Collected */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" /> 1. What Data We Collect
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Only data strictly necessary to estimate early academic risk and provide timely mentoring interventions is processed:
          </p>
          <ul className="text-xs text-slate-300 space-y-2.5">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Academic Performance:</strong> Continuous internal assessments, semester exams, grade bands, and active backlog counts.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Attendance Records &amp; 30-Day Velocity:</strong> Subject attendance rates and dated attendance velocity entries tracking rate-of-change over the last 30 days.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Digital Learning Telemetry (LMS):</strong> Weekly login frequency, learning resource views, and average hours spent on courseware.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Wellness &amp; Workload Surveys:</strong> Optional self-reported study hours, perceived stress, and motivation scores (collected with explicit student consent).</span>
            </li>
          </ul>
        </div>

        {/* 2. Purpose of Use */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-purple-400" /> 2. Purpose &amp; Non-Punitive Use
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Data is leveraged exclusively to foster proactive student success and personalized retention support:
          </p>
          <div className="space-y-3 text-xs text-slate-300">
            <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-800/30">
              <strong className="text-purple-300 block mb-1">Empowering Mentors:</strong>
              Facilitating 1-on-1 faculty counseling, tutoring recommendations, and institutional counseling referrals before students fall critically behind.
            </div>
            <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/30">
              <strong className="text-emerald-300 block mb-1">Empowering Students:</strong>
              Providing transparent, explainable recommendations and self-diagnostic visibility into their personal academic trajectory.
            </div>
            <div className="p-3 rounded-xl bg-red-950/20 border border-red-800/30">
              <strong className="text-red-300 block mb-1">Strict Prohibition Against Punitive Actions:</strong>
              Risk estimates are NEVER used for disciplinary actions, grading penalties, academic probation, or automated administrative disqualification.
            </div>
          </div>
        </div>

        {/* 3. Role-Based Visibility */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-amber-400" /> 3. Who Can See What (Per Role)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                  <th className="py-2 px-2.5">Role</th>
                  <th className="py-2 px-2.5">Scope of Access</th>
                  <th className="py-2 px-2.5">Restrictions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                <tr>
                  <td className="py-2.5 px-2.5 font-bold text-blue-400">Student</td>
                  <td className="py-2.5 px-2.5">Own profile, grades, self-survey, personal risk tier, and tailored recommendations.</td>
                  <td className="py-2.5 px-2.5 text-slate-500">Zero access to peer records.</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-2.5 font-bold text-purple-400">Faculty Mentor</td>
                  <td className="py-2.5 px-2.5">Assigned cohort students, subject marks, attendance rates, top risk factors, and mentoring notes.</td>
                  <td className="py-2.5 px-2.5 text-slate-500">Cannot alter institutional weights or access other departments.</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-2.5 font-bold text-emerald-400">Administrator</td>
                  <td className="py-2.5 px-2.5">Aggregated analytics, ML model registry, data upload pipelines, and data subject request workflows.</td>
                  <td className="py-2.5 px-2.5 text-slate-500">All data exports and erasures are immutably logged to audit trails.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Retention & Student Rights */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" /> 4. Retention &amp; Erasure Rights
          </h2>
          <div className="space-y-3 text-xs text-slate-300">
            <p>
              <strong>Data Retention Window:</strong> Records are maintained for the active duration of the student's degree program plus <strong>one academic year</strong> following matriculation or graduation, after which personal telemetries are archived or pseudonymized.
            </p>
            <p>
              <strong>Right to Rectification:</strong> If a student notices discrepancies in their recorded attendance or internal test scores, they can notify their departmental mentor or registrar for immediate correction.
            </p>
            <p>
              <strong>Right to Erasure (Data Subject Requests):</strong> Under institutional privacy guidelines, students may request complete export or permanent deletion of their predictive telemetry, survey responses, and personal profile by contacting the Academic Registrar.
            </p>
          </div>
        </div>
      </div>

      {/* Admin Data Subject Request (DSR) & Audit Trail */}
      {isAdmin && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-400" /> Data Subject Request (DSR) Management Console
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Execute Data Subject Access Requests (DSAR exports) and Right to Erasure requests with automated audit logging.
              </p>
            </div>
            <div className="text-xs text-slate-400 font-medium">
              Logged in as Admin: <span className="text-slate-200">{user?.email}</span>
            </div>
          </div>

          {/* DSR Action Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                Select Student for Data Subject Request
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-blue-500 focus:outline-none"
              >
                {students.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.student_id} — {s.full_name} ({s.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleExportDsr}
                disabled={exporting || !selectedStudentId}
                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {exporting ? 'Exporting...' : 'Export Full Dossier'}
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleting || !selectedStudentId}
                className="px-4 py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Purge
              </button>
            </div>
          </div>

          {/* Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-600/50 space-y-3">
              <div className="flex items-center gap-2 text-red-300 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-red-400" /> Confirm Permanent Data Erasure
              </div>
              <p className="text-xs text-red-200/90 leading-relaxed">
                Are you sure you want to permanently purge all records for student ID #{selectedStudentId}? This action cascades and deletes all academic marks, attendance entries, surveys, predictions, alerts, and login credentials. This action CANNOT be undone and will be written to the institutional audit log.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteDsr}
                  disabled={deleting}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-500 transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {deleting ? 'Purging...' : 'Confirm Permanent Erasure'}
                </button>
              </div>
            </div>
          )}

          {/* Audit Logs Table */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" /> Recent Institutional DSR Audit Trail ({pluralize(auditLogs.length, 'event')})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                    <th className="py-2 px-3">Timestamp</th>
                    <th className="py-2 px-3">Action</th>
                    <th className="py-2 px-3">Target</th>
                    <th className="py-2 px-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-slate-500">
                        No administrative DSR events recorded yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.slice(0, 5).map((log: any) => (
                      <tr key={log.id} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.action === 'DSR_DELETE'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">
                          Student #{log.target_id}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 truncate max-w-xs">
                          {log.details}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
