import React, { useEffect, useState } from 'react'
import { Sparkles, ArrowRight, BookOpen, Clock, HeartHandshake } from 'lucide-react'
import { studentApi } from '../../api'

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
    return <div className="text-center py-20 text-slate-400">Loading recommendations...</div>
  }

  const recs = data?.recommendations || []
  const pred = data?.prediction

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold mb-3 border border-amber-500/20">
          <Sparkles className="w-3.5 h-3.5" /> AI Guidance Engine
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">Personalized Recommendations</h1>
        <p className="text-sm text-slate-400">
          Tailored suggestions generated from your attendance patterns, assignment punctuality, LMS usage, and midterm results.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {recs.map((rec: string, idx: number) => (
          <div
            key={idx}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex items-start gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
              <span className="font-bold text-sm">#{idx + 1}</span>
            </div>
            <div>
              <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-medium">{rec}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Suggested Next Actions */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-white">Recommended Resources</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <BookOpen className="w-5 h-5 text-blue-400 mb-2" />
            <h3 className="text-xs font-bold text-white mb-1">DSA Revision Notes</h3>
            <p className="text-[11px] text-slate-400">Review departmental lecture repositories & slide decks.</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <Clock className="w-5 h-5 text-purple-400 mb-2" />
            <h3 className="text-xs font-bold text-white mb-1">Tutoring Lab Hours</h3>
            <p className="text-[11px] text-slate-400">Walk-in peer tutoring Monday–Thursday from 4 PM to 7 PM.</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <HeartHandshake className="w-5 h-5 text-emerald-400 mb-2" />
            <h3 className="text-xs font-bold text-white mb-1">Student Counseling</h3>
            <p className="text-[11px] text-slate-400">Confidential counseling services available via appointment.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
