import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Bell, Check, ShieldAlert, AlertTriangle, Info } from 'lucide-react'
import { studentApi } from '../../api'

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
      setAlerts(alertsRes.data)
      setInterventions(intvRes.data)
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
    return <div className="text-center py-20 text-slate-400">Loading alerts & interventions...</div>
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-white mb-1">Alerts & Faculty Messages</h1>
        <p className="text-sm text-slate-400">Important academic updates, attendance warnings, and faculty mentor messages.</p>
      </div>

      {/* Faculty Interventions */}
      {interventions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white">Faculty Interventions & Mentoring Notes</h2>
          <div className="space-y-3">
            {interventions.map((intv) => (
              <div key={intv.id} className="p-5 rounded-2xl bg-blue-950/20 border border-blue-500/30 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-blue-400 uppercase tracking-wide">
                    Mentor Communication • {new Date(intv.created_at).toLocaleDateString()}
                  </div>
                  <p className="text-sm text-slate-200">{intv.message}</p>
                </div>
                {!intv.is_acknowledged ? (
                  <button
                    onClick={() => acknowledgeIntervention(intv.id)}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shrink-0 transition"
                  >
                    Acknowledge
                  </button>
                ) : (
                  <span className="text-xs font-medium text-emerald-400 flex items-center gap-1 shrink-0">
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
        <h2 className="text-lg font-bold text-white">System Alerts</h2>
        {alerts.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-slate-900 rounded-2xl border border-slate-800 text-sm">
            No active alerts on your account. Good job!
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => {
              const isHigh = alert.severity === 'high'
              const isMed = alert.severity === 'medium'
              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition ${
                    alert.is_read ? 'bg-slate-950/40 border-slate-800 opacity-60' : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-800 shrink-0">
                      {isHigh ? (
                        <ShieldAlert className="w-5 h-5 text-red-400" />
                      ) : isMed ? (
                        <AlertTriangle className="w-5 h-5 text-amber-400" />
                      ) : (
                        <Info className="w-5 h-5 text-blue-400" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold capitalize text-slate-200">
                        {alert.alert_type?.replace(/_/g, ' ')}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{alert.message}</div>
                    </div>
                  </div>

                  {!alert.is_read && (
                    <button
                      onClick={() => markRead(alert.id)}
                      className="text-xs text-blue-400 hover:text-blue-300 font-medium shrink-0 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700"
                    >
                      Mark read
                    </button>
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
