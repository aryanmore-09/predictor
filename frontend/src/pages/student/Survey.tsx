import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { ClipboardList, Send, Smile, Frown, HelpCircle } from 'lucide-react'
import { studentApi } from '../../api'
import { Card, Button, Input, Select } from '../../components/ui'

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
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      <Card className="p-6">
        <h1 className="text-2xl font-bold text-ink-900 mb-1 flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-brand-600" /> Wellbeing &amp; Academic Check-in
        </h1>
        <p className="text-sm text-ink-500 leading-relaxed">
          Your responses remain confidential and help our AI engine and academic mentors provide proactive support tailored to your workload and stress levels.
        </p>
      </Card>

      <form onSubmit={handleSubmit} className="bg-white border border-line rounded-2xl shadow-sm p-6 space-y-6">
        {/* Stress Level */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-ink-900">
              Current Stress Level (1 = Calm, 5 = Severe)
            </label>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
              {stress} / 5
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="5"
            value={stress}
            onChange={(e) => setStress(Number(e.target.value))}
            className="w-full accent-brand-600 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-ink-500 mt-1">
            <span className="flex items-center gap-1"><Smile className="w-3.5 h-3.5 text-brand-500" /> Minimal stress</span>
            <span className="flex items-center gap-1"><Frown className="w-3.5 h-3.5 text-danger" /> Severe strain</span>
          </div>
        </div>

        {/* Workload Level */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-ink-900">
              Course Workload (1 = Light, 5 = Overwhelming)
            </label>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
              {workload} / 5
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="5"
            value={workload}
            onChange={(e) => setWorkload(Number(e.target.value))}
            className="w-full accent-brand-600 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-ink-500 mt-1">
            <span>Manageable</span>
            <span>Overwhelming</span>
          </div>
        </div>

        {/* Motivation Level */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-ink-900">
              Study Motivation (1 = Low, 5 = High)
            </label>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
              {motivation} / 5
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="5"
            value={motivation}
            onChange={(e) => setMotivation(Number(e.target.value))}
            className="w-full accent-brand-600 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-ink-500 mt-1">
            <span>Low energy</span>
            <span>Highly motivated</span>
          </div>
        </div>

        {/* Daily Study Hours */}
        <div>
          <Input
            label="Average Independent Study Hours Per Day"
            type="number"
            step="0.5"
            min="0"
            max="16"
            value={studyHours}
            onChange={(e) => setStudyHours(Number(e.target.value))}
            helperText="Include self-study, homework, and assignment preparation"
          />
        </div>

        {/* Support Needed */}
        <div className="space-y-3 pt-3 border-t border-line">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={supportNeeded}
              onChange={(e) => setSupportNeeded(e.target.checked)}
              className="w-4 h-4 accent-brand-600 rounded text-brand-600 cursor-pointer"
            />
            <span className="text-sm font-semibold text-ink-900">
              I would like to request academic mentoring or counseling support
            </span>
          </label>

          {supportNeeded && (
            <div className="pt-2">
              <Select
                label="Type of Support Preferred"
                value={supportType}
                onChange={(e) => setSupportType(e.target.value)}
              >
                <option value="Academic Tutoring">Academic Tutoring &amp; Revision</option>
                <option value="Stress &amp; Wellness Counseling">Stress &amp; Wellness Counseling</option>
                <option value="Time Management &amp; Study Habits">Time Management &amp; Study Habits</option>
                <option value="Career Guidance">Career Guidance</option>
              </Select>
            </div>
          )}
        </div>

        <Button
          type="submit"
          loading={submitting}
          icon={<Send className="w-4 h-4" />}
          className="w-full py-3"
          size="md"
        >
          Submit Feedback
        </Button>
      </form>
    </div>
  )
}
