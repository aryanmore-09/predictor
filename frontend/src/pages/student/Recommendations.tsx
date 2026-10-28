import React, { useEffect, useState } from 'react'
import { Sparkles, BookOpen, Clock, HeartHandshake } from 'lucide-react'
import { studentApi } from '../../api'
import { Card, Skeleton } from '../../components/ui'

export default function StudentRecommendations() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRecs = async () => {
      try {
        const res = await studentApi.getDashboard()
        setData(res.data)
      } finally {
        setLoading(false)
      }
    }
    fetchRecs()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    )
  }

  const recs = data?.recommendations || []

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-4">
      <Card className="p-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warning-bg text-warning text-xs font-semibold mb-3 border border-amber-200 shadow-xs">
          <Sparkles className="w-3.5 h-3.5" /> AI Guidance Engine
        </div>
        <h1 className="text-2xl font-bold text-ink-900 mb-1">Personalized Recommendations</h1>
        <p className="text-sm text-ink-500 leading-relaxed">
          Tailored suggestions generated from your attendance patterns, assignment punctuality, LMS usage, and continuous assessment results.
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-4">
        {recs.map((rec: string, idx: number) => (
          <Card
            key={idx}
            interactive
            className="p-5 flex items-start gap-4"
          >
            <div className="w-9 h-9 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-sm border border-brand-200">
              #{idx + 1}
            </div>
            <div>
              <p className="text-sm sm:text-base text-ink-900 leading-relaxed font-medium">{rec}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Suggested Next Actions */}
      <Card className="p-6 space-y-4">
        <h2 className="text-base font-bold text-ink-900">Recommended Institutional Resources</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-mist border border-line">
            <BookOpen className="w-5 h-5 text-brand-600 mb-2" />
            <h3 className="text-xs font-bold text-ink-900 mb-1">DSA Revision Notes</h3>
            <p className="text-[11px] text-ink-500 leading-relaxed">Review departmental lecture repositories &amp; slide decks.</p>
          </div>
          <div className="p-4 rounded-xl bg-mist border border-line">
            <Clock className="w-5 h-5 text-accent-500 mb-2" />
            <h3 className="text-xs font-bold text-ink-900 mb-1">Tutoring Lab Hours</h3>
            <p className="text-[11px] text-ink-500 leading-relaxed">Walk-in peer tutoring Monday–Thursday from 4 PM to 7 PM.</p>
          </div>
          <div className="p-4 rounded-xl bg-mist border border-line">
            <HeartHandshake className="w-5 h-5 text-brand-700 mb-2" />
            <h3 className="text-xs font-bold text-ink-900 mb-1">Student Counseling</h3>
            <p className="text-[11px] text-ink-500 leading-relaxed">Confidential counseling services available via appointment.</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
