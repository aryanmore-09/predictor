import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { ClipboardList, Send, Smile, Frown, HelpCircle } from 'lucide-react'
import { studentApi } from '../../api'

export default function StudentSurvey() {
  const [stress, setStress] = useState(3)
  const [workload, setWorkload] = useState(3)
  const [motivation, setMotivation] = useState(3)
  const [studyHours, setStudyHours] = useState(3.0)
  const [supportNeeded, setSupportNeeded] = useState(false)
  const [supportType, setSupportType] = useState('Academic Tutoring')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await studentApi.submitSurvey({
        stress_level: stress,
        workload_level: workload,
        motivation_level: motivation,
        study_hours_per_day: studyHours,
        support_needed: supportNeeded,
        support_type: supportNeeded ? supportType : null,
      })
      toast.success('Survey submitted successfully! Your feedback updates your support profile.')
    } catch {
      toast.error('Failed to submit survey')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-blue-400" /> Wellbeing & Academic Check-in
        </h1>
        <p className="text-sm text-slate-400">
          Your responses remain confidential and help our AI engine and academic mentors provide proactive support tailored to your workload and stress levels.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        {/* Stress Level */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-slate-200">Current Stress Level (1 = Calm, 5 = Severe)</label>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-blue-400">{stress} / 5</span>
          </div>
          <input
            type="range"
            min="1"
            max="5"
            value={stress}
            onChange={(e) => setStress(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>

        {/* Workload Level */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-slate-200">Course Workload (1 = Light, 5 = Overwhelming)</label>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-blue-400">{workload} / 5</span>
          </div>
          <input
            type="range"
            min="1"
            max="5"
            value={workload}
            onChange={(e) => setWorkload(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>

        {/* Motivation Level */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-slate-200">Study Motivation (1 = Low, 5 = High)</label>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-blue-400">{motivation} / 5</span>
          </div>
          <input
            type="range"
            min="1"
            max="5"
            value={motivation}
            onChange={(e) => setMotivation(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>

        {/* Daily Study Hours */}
        <div>
          <label className="block text-sm font-semibold text-slate-200 mb-1.5">
            Average Independent Study Hours Per Day
          </label>
          <input
            type="number"
            step="0.5"
            min="0"
            max="16"
            value={studyHours}
            onChange={(e) => setStudyHours(Number(e.target.value))}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Support Needed */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={supportNeeded}
              onChange={(e) => setSupportNeeded(e.target.checked)}
              className="w-4 h-4 accent-blue-500 rounded"
            />
            <span className="text-sm font-semibold text-slate-200">
              I would like to request academic mentoring or counseling support
            </span>
          </label>

          {supportNeeded && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                Type of Support Preferred
              </label>
              <select
                value={supportType}
                onChange={(e) => setSupportType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="Academic Tutoring">Academic Tutoring & Revision</option>
                <option value="Stress & Wellness Counseling">Stress & Wellness Counseling</option>
                <option value="Time Management & Study Habits">Time Management & Study Habits</option>
                <option value="Career Guidance">Career Guidance</option>
              </select>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 disabled:opacity-50"
        >
          <Send className="w-4 h-4" /> {submitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>
    </div>
  )
}
