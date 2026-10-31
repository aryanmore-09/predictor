import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { adminApi } from '../../api'
import { Card, Skeleton, EmptyState } from '../../components/ui'

export default function AdminOutbox() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const res = await adminApi.getOutbox()
        setRows(res.data || [])
      } catch {
        toast.error('Failed to load outbox')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div className="space-y-6 py-2">
      <Card className="p-6">
        <h1 className="text-2xl font-bold text-ink-900 mb-1">Email Outbox</h1>
        <p className="text-sm text-ink-500">
          Every notification dispatched. When SMTP is not configured, emails are logged here instead.
        </p>
      </Card>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8">
            <EmptyState title="Outbox is empty" description="Escalation emails will appear here." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line text-ink-700 uppercase font-semibold bg-brand-50">
                  <th className="py-3.5 px-4">To</th>
                  <th className="py-3.5 px-4">Subject</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-ink-700">
                {rows.map((o) => (
                  <tr key={o.id} className="hover:bg-mist transition">
                    <td className="py-3 px-4 font-mono text-ink-500">{o.to_email}</td>
                    <td className="py-3 px-4 font-semibold text-ink-900">{o.subject}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          o.status === 'sent'
                            ? 'bg-brand-100 text-brand-700'
                            : o.status === 'failed'
                            ? 'bg-danger-bg text-danger'
                            : 'bg-warning-bg text-warning'
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-ink-500">
                      {o.created_at ? new Date(o.created_at).toLocaleString() : '-'}
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
