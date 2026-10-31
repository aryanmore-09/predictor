import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { adminApi } from '../../api'
import { Card, Select, Button, Skeleton, EmptyState } from '../../components/ui'

const ACTIONS = [
  '', 'LOGIN', 'VIEW_STUDENT', 'CREATE_INTERVENTION', 'UPDATE_INTERVENTION',
  'CREATE_REFERRAL', 'UPDATE_REFERRAL', 'RETRAIN_MODEL', 'CREATE_USER',
  'TOGGLE_USER', 'ASSIGN_MENTOR', 'DSR_EXPORT', 'DSR_DELETE',
]

export default function AdminAuditLog() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (action) params.action = action
      if (start) params.start_date = start
      if (end) params.end_date = end
      const res = await adminApi.getAuditLogs(params)
      setLogs(res.data || [])
    } catch {
      toast.error('Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-6 py-2">
      <Card className="p-6">
        <h1 className="text-2xl font-bold text-ink-900 mb-1">Audit Log</h1>
        <p className="text-sm text-ink-500">Security and administrative actions across the platform.</p>
      </Card>

      <Card className="p-4 flex flex-col md:flex-row gap-3">
        <Select value={action} onChange={(e) => setAction(e.target.value)} className="text-xs">
          {ACTIONS.map((a) => (
            <option key={a} value={a}>{a || 'All actions'}</option>
          ))}
        </Select>
        <input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink-900"
        />
        <input
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink-900"
        />
        <Button variant="primary" size="sm" onClick={load}>Apply</Button>
      </Card>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8">
            <EmptyState title="No audit entries" description="Actions will appear here as users interact with the system." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line text-ink-700 uppercase font-semibold bg-brand-50">
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Entity</th>
                  <th className="py-3.5 px-4">IP</th>
                  <th className="py-3.5 px-4">Details</th>
                  <th className="py-3.5 px-4">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-ink-700">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-mist transition">
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-200">
                        {l.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-ink-500">{l.user_id ?? '-'}</td>
                    <td className="py-3 px-4 text-ink-500">{l.target_type} #{l.target_id}</td>
                    <td className="py-3 px-4 font-mono text-ink-500">{l.ip_address || '-'}</td>
                    <td className="py-3 px-4 text-ink-500 max-w-[240px] truncate" title={l.details || ''}>{l.details || '-'}</td>
                    <td className="py-3 px-4 text-ink-500">
                      {l.timestamp ? new Date(l.timestamp).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
