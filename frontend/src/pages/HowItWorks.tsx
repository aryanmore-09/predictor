import React from 'react'
import { FileSpreadsheet, Sparkles, AlertTriangle, MessageSquare, CheckCircle, ArrowDown } from 'lucide-react'
import { Card } from '../components/ui'

export default function HowItWorks() {
  const steps = [
    {
      icon: FileSpreadsheet,
      title: "1. Data Ingestion & Integration",
      desc: "Attendance, midterm scores, LMS activity logs, and wellness survey inputs are collected via automated sync or batch CSV/Excel uploads.",
      tag: "Ingestion",
    },
    {
      icon: Sparkles,
      title: "2. Preprocessing & Feature Engineering",
      desc: "Data undergoes duplicate cleaning, median imputation, IQR bounds validation, and calculation of derived engagement indices like 30-day velocity.",
      tag: "Pipeline",
    },
    {
      icon: AlertTriangle,
      title: "3. ML Classification & Risk Scoring",
      desc: "Pre-trained models compute calibrated dropout probability and assign risk tiers (Low <35%, Medium 35-65%, High >65%) with explainable top factors.",
      tag: "Inference",
    },
    {
      icon: MessageSquare,
      title: "4. Automated Alerts & Targeted Interventions",
      desc: "At-risk alerts notify both student and faculty advisors. Advisors initiate 1-on-1 counseling, remedial sessions, or counselor referrals.",
      tag: "Intervention",
    },
    {
      icon: CheckCircle,
      title: "5. Tracking Progress & Continuous Learning",
      desc: "Intervention acknowledgments and updated student assessments re-evaluate risk profiles, verifying retention improvement over time.",
      tag: "Verification",
    },
  ]

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-4">
      {/* Header Banner */}
      <Card className="p-8">
        <h1 className="text-3xl font-extrabold text-ink-900 mb-2 tracking-tight">
          How It Works
        </h1>
        <p className="text-sm text-ink-500 leading-relaxed max-w-2xl">
          An end-to-end overview of the institutional early warning pipeline from raw educational telemetry to targeted intervention delivery.
        </p>
      </Card>

      {/* Pipeline Diagram & Steps */}
      <div className="space-y-4 relative">
        {steps.map((s, idx) => {
          const Icon = s.icon
          const isLast = idx === steps.length - 1

          return (
            <React.Fragment key={idx}>
              <Card interactive className="p-6 flex items-start gap-5 relative">
                <div className="w-12 h-12 rounded-2xl bg-brand-100 text-brand-600 flex items-center justify-center shrink-0 shadow-xs border border-brand-200">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <h3 className="text-base font-bold text-ink-900">{s.title}</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent-50 text-accent-700 border border-accent-100">
                      {s.tag}
                    </span>
                  </div>
                  <p className="text-sm text-ink-700 leading-relaxed">{s.desc}</p>
                </div>
              </Card>

              {!isLast && (
                <div className="flex justify-center -my-1">
                  <div className="w-8 h-8 rounded-full bg-surface border border-line flex items-center justify-center text-brand-500 shadow-xs">
                    <ArrowDown className="w-4 h-4" />
                  </div>
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
