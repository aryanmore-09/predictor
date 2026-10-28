import React from 'react'
import { GraduationCap, ShieldCheck, Cpu, Database, Award } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto py-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/30 border border-blue-500/30 text-blue-400 text-xs font-semibold mb-4">
          <Award className="w-4 h-4" /> Academic Research & AI Innovation
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-3">About the Predictor Platform</h1>
        <p className="text-slate-300 leading-relaxed text-base">
          The Student Academic Performance & Dropout Risk Predictor is developed for the <strong>MIT School of Computing, Department of Computer Science & Engineering</strong>. It serves as an early-warning and proactive retention intelligence tool designed to detect early indicators of academic struggle, absenteeism, disengagement, and emotional stress.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center mb-4">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Predictive AI Engine</h3>
          <p className="text-sm text-slate-400">
            Compares 4 machine learning algorithms (Logistic Regression, Support Vector Machines, Random Forest, and Gradient Boosting) to achieve high sensitivity on dropout risk classification.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center mb-4">
            <Database className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Holistic Signals</h3>
          <p className="text-sm text-slate-400">
            Synthesizes multimodal data points including attendance trends, assignment turnaround, LMS activity frequency, quiz metrics, and student wellbeing surveys.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center mb-4">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Proactive Care</h3>
          <p className="text-sm text-slate-400">
            Enables faculty advisors to trigger targeted intervention messages, schedule mentoring sessions, and submit counselor referrals before risk escalates.
          </p>
        </div>
      </div>
    </div>
  )
}
