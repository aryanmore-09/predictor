import React from 'react'
import { FileSpreadsheet, Sparkles, AlertTriangle, MessageSquare, CheckCircle } from 'lucide-react'

export default function HowItWorks() {
  const steps = [
    {
      icon: FileSpreadsheet,
      title: "1. Data Ingestion & Integration",
      desc: "Attendance, midterm scores, LMS activity logs, and wellness survey inputs are collected via automated sync or batch CSV/Excel uploads.",
    },
    {
      icon: Sparkles,
      title: "2. Preprocessing & Feature Engineering",
      desc: "Data undergoes duplicate cleaning, median imputation, IQR bounds validation, and calculation of derived engagement indices.",
    },
    {
      icon: AlertTriangle,
      title: "3. ML Classification & Risk Scoring",
      desc: "Pre-trained models compute dropout probability and assign risk tiers (Low <35%, Medium 35-65%, High >65%) with explainable top contributing factors.",
    },
    {
      icon: MessageSquare,
      title: "4. Automated Alerts & Targeted Interventions",
      desc: "At-risk alerts notify both student and faculty advisors. Advisors initiate 1-on-1 counseling, remedial sessions, or counselor referrals.",
    },
    {
      icon: CheckCircle,
      title: "5. Tracking Progress & Continuous Learning",
      desc: "Intervention acknowledgments and updated student assessments re-evaluate risk profiles, verifying retention improvement over time.",
    },
  ]

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
        <h1 className="text-3xl font-extrabold text-white mb-2">How It Works</h1>
        <p className="text-slate-400 text-sm">
          An end-to-end overview of the early warning pipeline from raw educational telemetry to intervention delivery.
        </p>
      </div>

      <div className="space-y-4">
        {steps.map((s, idx) => {
          const Icon = s.icon
          return (
            <div key={idx} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">{s.title}</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
