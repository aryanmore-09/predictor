import React, { useState, useEffect } from 'react'
import { Shield, Eye, Lock, FileText, Download, Trash2, Clock, CheckCircle, AlertTriangle, UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi } from '../api'
import { useAuthStore } from '../store/auth'
import { pluralize } from '../utils/format'
import { Card, Button, Select, Modal, Badge } from '../components/ui'

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
    <div className="max-w-5xl mx-auto space-y-8 pb-12 py-4">
      {/* Header Banner */}
      <Card className="p-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-brand-100 text-brand-700 border border-brand-200 shadow-xs">
            <Shield className="w-3.5 h-3.5 text-brand-600" /> FERPA &amp; Academic Data Governance Policy
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900 tracking-tight">
            Privacy &amp; Institutional Data Use
          </h1>
          <p className="text-sm text-ink-700 max-w-3xl leading-relaxed">
            The Student Academic Performance &amp; Dropout Risk Predictor is engineered with strict privacy safeguards, role-based boundaries, and non-punitive decision support principles. Learn how data is collected, protected, and how students retain full control over their records.
          </p>
        </div>
      </Card>

      {/* Grid: 4 Core Policy Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Data Collected */}
        <Card className="space-y-4">
          <h2 className="text-base font-bold text-ink-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent-50 text-accent-600 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            1. What Data We Collect
          </h2>
          <p className="text-xs text-ink-500 leading-relaxed">
            Only data strictly necessary to estimate early academic risk and provide timely mentoring interventions is processed:
          </p>
          <ul className="text-xs text-ink-700 space-y-2.5">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
              <span><strong className="text-ink-900 font-semibold">Academic Performance:</strong> Continuous internal assessments, semester exams, grade bands, and active backlog counts.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
              <span><strong className="text-ink-900 font-semibold">Attendance Records &amp; 30-Day Velocity:</strong> Subject attendance rates and dated attendance velocity entries tracking rate-of-change over the last 30 days.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
              <span><strong className="text-ink-900 font-semibold">Digital Learning Telemetry (LMS):</strong> Weekly login frequency, learning resource views, and average hours spent on courseware.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
              <span><strong className="text-ink-900 font-semibold">Wellness &amp; Workload Surveys:</strong> Optional self-reported study hours, perceived stress, and motivation scores (collected with explicit student consent).</span>
            </li>
          </ul>
        </Card>

        {/* 2. Purpose of Use */}
        <Card className="space-y-4">
          <h2 className="text-base font-bold text-ink-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            2. Purpose &amp; Non-Punitive Use
          </h2>
          <p className="text-xs text-ink-500 leading-relaxed">
            Data is leveraged exclusively to foster proactive student success and personalized retention support:
          </p>
          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-brand-50 border border-brand-200">
              <strong className="text-brand-800 block mb-1 font-bold">Empowering Mentors:</strong>
              <span className="text-ink-700">Facilitating 1-on-1 faculty counseling, tutoring recommendations, and institutional counseling referrals before students fall critically behind.</span>
            </div>
            <div className="p-3.5 rounded-xl bg-accent-50 border border-accent-100">
              <strong className="text-accent-700 block mb-1 font-bold">Empowering Students:</strong>
              <span className="text-ink-700">Providing transparent, explainable recommendations and self-diagnostic visibility into their personal academic trajectory.</span>
            </div>
            <div className="p-3.5 rounded-xl bg-danger-bg border border-red-200">
              <strong className="text-danger block mb-1 font-bold">Strict Prohibition Against Punitive Actions:</strong>
              <span className="text-ink-700">Risk estimates are NEVER used for disciplinary actions, grading penalties, academic probation, or automated administrative disqualification.</span>
            </div>
          </div>
        </Card>

        {/* 3. Role-Based Visibility */}
        <Card className="space-y-4">
          <h2 className="text-base font-bold text-ink-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center shrink-0">
              <Eye className="w-4 h-4" />
            </div>
            3. Who Can See What (Per Role)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-brand-50 text-ink-700 uppercase font-semibold">
                  <th className="py-2.5 px-3 rounded-tl-lg">Role</th>
                  <th className="py-2.5 px-3">Scope of Access</th>
                  <th className="py-2.5 px-3 rounded-tr-lg">Restrictions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-ink-700">
                <tr className="hover:bg-mist transition">
                  <td className="py-2.5 px-3 font-bold text-brand-700">Student</td>
                  <td className="py-2.5 px-3">Own profile, grades, self-survey, personal risk tier, and tailored recommendations.</td>
                  <td className="py-2.5 px-3 text-ink-500">Zero access to peer records.</td>
                </tr>
                <tr className="hover:bg-mist transition">
                  <td className="py-2.5 px-3 font-bold text-accent-700">Faculty Mentor</td>
                  <td className="py-2.5 px-3">Assigned cohort students, subject marks, attendance rates, top risk factors, and mentoring notes.</td>
                  <td className="py-2.5 px-3 text-ink-500">Cannot alter institutional weights or access other departments.</td>
                </tr>
                <tr className="hover:bg-mist transition">
                  <td className="py-2.5 px-3 font-bold text-brand-800">Administrator</td>
                  <td className="py-2.5 px-3">Aggregated analytics, ML model registry, data upload pipelines, and data subject request workflows.</td>
                  <td className="py-2.5 px-3 text-ink-500">All data exports and erasures are immutably logged to audit trails.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* 4. Retention & Student Rights */}
        <Card className="space-y-4">
          <h2 className="text-base font-bold text-ink-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent-50 text-accent-600 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            4. Retention &amp; Erasure Rights
          </h2>
          <div className="space-y-3 text-xs text-ink-700">
            <p>
              <strong className="text-ink-900 font-semibold">Data Retention Window:</strong> Records are maintained for the active duration of the student's degree program plus <strong className="text-ink-900 font-semibold">one academic year</strong> following matriculation or graduation, after which personal telemetries are archived or pseudonymized.
            </p>
            <p>
              <strong className="text-ink-900 font-semibold">Right to Rectification:</strong> If a student notices discrepancies in their recorded attendance or internal test scores, they can notify their departmental mentor or registrar for immediate correction.
            </p>
            <p>
              <strong className="text-ink-900 font-semibold">Right to Erasure (Data Subject Requests):</strong> Under institutional privacy guidelines, students may request complete export or permanent deletion of their predictive telemetry, survey responses, and personal profile by contacting the Academic Registrar.
            </p>
          </div>
        </Card>
      </div>

      {/* Admin Data Subject Request (DSR) & Audit Trail */}
      {isAdmin && (
        <Card className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-line pb-4">
            <div>
              <h2 className="text-base font-bold text-ink-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-brand-600" /> Data Subject Request (DSR) Management Console
              </h2>
              <p className="text-xs text-ink-500 mt-0.5">
                Execute Data Subject Access Requests (DSAR exports) and Right to Erasure requests with automated audit logging.
              </p>
            </div>
            <div className="text-xs text-ink-500 font-medium">
              Logged in as Admin: <span className="text-ink-900 font-semibold">{user?.email}</span>
            </div>
          </div>

          {/* DSR Action Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="sm:col-span-2">
              <Select
                label="Select Student for Data Subject Request"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
              >
                {students.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.student_id} — {s.full_name} ({s.email})
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                variant="primary"
                onClick={handleExportDsr}
                loading={exporting}
                disabled={!selectedStudentId}
                icon={<Download className="w-4 h-4" />}
                className="flex-1"
                size="md"
              >
                Export Dossier
              </Button>

              <Button
                variant="danger"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleting || !selectedStudentId}
                icon={<Trash2 className="w-4 h-4" />}
                size="md"
              >
                Purge
              </Button>
            </div>
          </div>

          {/* Delete Confirmation Modal */}
          <Modal
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            title="Confirm Permanent Data Erasure"
            maxWidth="md"
          >
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-danger-bg border border-red-200">
                <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                <p className="text-xs text-danger font-medium leading-relaxed">
                  Are you sure you want to permanently purge all records for student ID #{selectedStudentId}? This action cascades and deletes all academic marks, attendance entries, surveys, predictions, alerts, and login credentials. This action CANNOT be undone and will be written to the institutional audit log.
                </p>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setShowDeleteConfirm(false)}
                  size="sm"
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDeleteDsr}
                  loading={deleting}
                  size="sm"
                  icon={<Trash2 className="w-4 h-4" />}
                >
                  Confirm Permanent Erasure
                </Button>
              </div>
            </div>
          </Modal>

          {/* Audit Logs Table */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-ink-500 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-600" /> Recent Institutional DSR Audit Trail ({pluralize(auditLogs.length, 'event')})
            </h3>
            <div className="overflow-x-auto border border-line rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line bg-brand-50 text-ink-700 uppercase font-semibold">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Target</th>
                    <th className="py-2.5 px-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-ink-700">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-ink-500">
                        No administrative DSR events recorded yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.slice(0, 5).map((log: any) => (
                      <tr key={log.id} className="hover:bg-mist transition">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-ink-500">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant={log.action === 'DSR_DELETE' ? 'danger' : 'accent'} size="sm">
                            {log.action}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-ink-900 font-medium">
                          Student #{log.target_id}
                        </td>
                        <td className="py-2.5 px-3 text-ink-500 truncate max-w-xs">
                          {log.details}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
