import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Search, Filter, Eye, ShieldAlert, AlertTriangle, CheckCircle } from 'lucide-react'
import { facultyApi } from '../../api'

export default function FacultyStudents() {
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [riskFilter, setRiskFilter] = useState('')
  const [semFilter, setSemFilter] = useState('')

  const fetchStudents = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (search) params.search = search
      if (riskFilter) params.risk_level = riskFilter
      if (semFilter) params.semester = semFilter
      const res = await facultyApi.getStudents(params)
      setStudents(res.data)
    } catch {
      toast.error('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [riskFilter, semFilter])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchStudents()
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-white mb-1">Student Directory & Roster</h1>
        <p className="text-sm text-slate-400">Search and filter departmental students by risk status and semester.</p>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by student name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Risk Tiers</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
          </select>

          <select
            value={semFilter}
            onChange={(e) => setSemFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Semesters</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
              <option key={sem} value={sem}>Semester {sem}</option>
            ))}
          </select>

          <button
            onClick={fetchStudents}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold"
          >
            Filter
          </button>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-slate-400 text-sm">Loading student directory...</div>
        ) : students.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-sm">No students match current criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold bg-slate-950/40">
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Semester</th>
                  <th className="py-3.5 px-4">Risk Tier</th>
                  <th className="py-3.5 px-4">Dropout Prob</th>
                  <th className="py-3.5 px-4">Attendance</th>
                  <th className="py-3.5 px-4">Avg Marks</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-semibold text-white">
                      <div>{s.full_name}</div>
                      <div className="text-[11px] text-slate-400 font-normal">{s.student_id}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{s.email}</td>
                    <td className="py-3 px-4 text-slate-300">Sem {s.semester}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        s.risk_level === 'high'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                          : s.risk_level === 'medium'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {s.risk_level || 'unassessed'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      {s.dropout_probability ? (s.dropout_probability * 100).toFixed(1) + '%' : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <span className={s.attendance_percentage < 75 ? 'text-red-400 font-bold' : ''}>
                        {s.attendance_percentage ? s.attendance_percentage + '%' : 'N/A'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {s.avg_marks ? s.avg_marks + '%' : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/faculty/students/${s.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-semibold border border-blue-500/30 transition"
                      >
                        <Eye className="w-3.5 h-3.5" /> Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
