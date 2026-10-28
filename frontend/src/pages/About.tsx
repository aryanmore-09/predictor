import React from 'react'
import { ShieldCheck, Cpu, Database, Award } from 'lucide-react'
import { Card } from '../components/ui'

export default function AboutPage() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto py-4">
      {/* Hero Banner */}
      <Card className="p-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-100 border border-brand-200 text-brand-700 text-xs font-semibold mb-4 shadow-xs">
          <Award className="w-4 h-4 text-brand-600" /> Academic Research &amp; AI Innovation
        </div>
        <h1 className="text-3xl font-extrabold text-ink-900 mb-3 tracking-tight">
          About the Predictor Platform
        </h1>
        <p className="text-ink-700 leading-relaxed text-base">
          The Student Academic Performance &amp; Dropout Risk Predictor is developed for the{' '}
          <strong className="text-ink-900 font-semibold">MIT School of Computing, Department of Computer Science &amp; Engineering</strong>.
          It serves as an early-warning and proactive retention intelligence tool designed to detect early indicators of academic struggle,
          absenteeism, disengagement, and emotional stress.
        </p>
      </Card>

      {/* Feature Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card interactive className="p-6">
          <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center mb-4 shadow-xs">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-ink-900 mb-2">Predictive AI Engine</h3>
          <p className="text-sm text-ink-500 leading-relaxed">
            Compares 4 machine learning algorithms (Logistic Regression, Support Vector Machines, Random Forest, and Gradient Boosting)
            with isotonic calibration to achieve high sensitivity and trustworthy risk probabilities.
          </p>
        </Card>

        <Card interactive className="p-6">
          <div className="w-10 h-10 rounded-xl bg-accent-50 text-accent-600 flex items-center justify-center mb-4 shadow-xs">
            <Database className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-ink-900 mb-2">Holistic Signals</h3>
          <p className="text-sm text-ink-500 leading-relaxed">
            Synthesizes multimodal data points including attendance trends, 30-day attendance velocity, assignment turnaround,
            LMS activity frequency, quiz metrics, and student wellbeing surveys.
          </p>
        </Card>

        <Card interactive className="p-6">
          <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center mb-4 shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-ink-900 mb-2">Proactive Care</h3>
          <p className="text-sm text-ink-500 leading-relaxed">
            Enables faculty advisors to trigger targeted intervention messages, schedule mentoring sessions, and submit
            counselor referrals before academic risk escalates into attrition.
          </p>
        </Card>
      </div>
    </div>
  )
}
