import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Bell, Check, ShieldAlert, AlertTriangle, Info, MessageSquare } from 'lucide-react'
import { studentApi } from '../../api'
import { Card, Button, EmptyState, Skeleton } from '../../components/ui'

export default function StudentAlerts() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [interventions, setInterventions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const [alertsRes, intvRes] = await Promise.all([
        studentApi.getAlerts(),
        studentApi.getInterventions(),
      ])
      setAlerts(alertsRes.data || [])
      setInterventions(intvRes.data || [])
    } catch {
      toast.error('Failed to load alerts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const markRead = async (id: number) => {
    try {
      await studentApi.markAlertRead(id)
      setAlerts(alerts.map(a => a.id === id ? { ...a, is_read: true } : a))
      toast.success('Alert marked as read')
    } catch {
      toast.error('Failed to update alert')
    }
  }

  const acknowledgeIntervention = async (id: number) => {
    try {
      await studentApi.acknowledgeIntervention(id)
      setInterventions(interventions.map(i => i.id === id ? { ...i, is_acknowledged: true } : i))
      toast.success('Intervention acknowledged')
    } catch {
      toast.error('Failed to acknowledge')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-4">
      <Card className="p-6">
        <h1 className="text-2xl font-bold text-ink-900 mb-1 flex items-center gap-2">
          <Bell className="w-6 h-6 text-brand-600" /> Alerts &amp; Faculty Messages
        </h1>
        <p className="text-sm text-ink-500">
          Important academic updates, attendance warnings, and faculty mentor messages.
        </p>
      </Card>

      {/* Faculty Interventions */}
      {interventions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-bold text-ink-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-accent-500" /> Faculty Interventions &amp; Mentoring Notes
          </h2>
          <div className="space-y-3">
            {interventions.map((intv) => (
              <div
                key={intv.id}
                className="p-5 rounded-2xl bg-surface border border-accent-100 shadow-sm flex items-start justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-accent-700 uppercase tracking-wider">
                    Mentor Communication • {new Date(intv.created_at).toLocaleDateString()}
                  </div>
                  <p className="text-sm text-ink-900 font-medium leading-relaxed">{intv.message}</p>
                </div>
                {!intv.is_acknowledged ? (
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={() => acknowledgeIntervention(intv.id)}
                    className="shrink-0"
                  >
                    Acknowledge
                  </Button>
                ) : (
                  <span className="text-xs font-semibold text-brand-600 flex items-center gap-1 shrink-0 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-200">
                    <Check className="w-3.5 h-3.5" /> Acknowledged
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Alerts */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-ink-900">System Alerts</h2>
        {alerts.length === 0 ? (
          <EmptyState
            icon={<Check className="w-6 h-6 text-brand-600" />}
            title="All clear! No active alerts."
            description="Your academic performance and attendance are in good standing."
          />
        ) : (
          <div className="space-y-2.5">
            {alerts.map((alert) => {
              const isHigh = alert.severity === 'high'
              const isMed = alert.severity === 'medium'

              const iconBoxClasses = isHigh
                ? 'bg-danger-bg text-danger border border-red-200'
                : isMed
                  ? 'bg-warning-bg text-warning border border-amber-200'
                  : 'bg-brand-50 text-brand-600 border border-brand-200'

              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition shadow-xs ${alert.is_read
                      ? 'bg-surface border-line opacity-60'
                      : 'bg-surface border-line hover:border-brand-300'
                    }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`p-2.5 rounded-xl shrink-0 ${iconBoxClasses}`}>
                      {isHigh ? (
                        <ShieldAlert className="w-5 h-5" />
                      ) : isMed ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : (
                        <Info className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold capitalize text-ink-900">
                        {alert.alert_type?.replace(/_/g, ' ')}
                      </div>
                      <div className="text-xs text-ink-500 mt-0.5">{alert.message}</div>
                    </div>
                  </div>

                  {!alert.is_read && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => markRead(alert.id)}
                      className="shrink-0"
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
