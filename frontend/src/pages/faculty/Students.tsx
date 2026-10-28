import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Search, Eye } from 'lucide-react'
import { facultyApi } from '../../api'
import { Card, Input, Select, Button, RiskBadge, Skeleton } from '../../components/ui'

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
      setStudents(res.data || [])
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
    <div className="space-y-6 py-2">
      <Card className="p-6">
        <h1 className="text-2xl font-bold text-ink-900 mb-1">Student Directory &amp; Roster</h1>
        <p className="text-sm text-ink-500">Search and filter departmental students by risk status and semester.</p>
      </Card>

      {/* Filter and Search Bar */}
      <Card className="p-4 flex flex-col md:flex-row items-center gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full">
          <Input
            type="text"
            placeholder="Search by student name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="text-xs"
          >
            <option value="">All Risk Tiers</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
          </Select>

          <Select
            value={semFilter}
            onChange={(e) => setSemFilter(e.target.value)}
            className="text-xs"
          >
            <option value="">All Semesters</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
              <option key={sem} value={sem}>Semester {sem}</option>
            ))}
          </Select>

          <Button
            variant="primary"
            size="md"
            onClick={fetchStudents}
          >
            Filter
          </Button>
        </div>
      </Card>

      {/* Students Table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-16 text-ink-500 text-sm">No students match current search or filter criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line text-ink-700 uppercase font-semibold bg-brand-50">
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
              <tbody className="divide-y divide-line text-ink-700">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-mist transition">
                    <td className="py-3 px-4 font-semibold text-ink-900">
                      <div>{s.full_name}</div>
                      <div className="text-[11px] text-ink-500 font-mono font-normal">{s.student_id}</div>
                    </td>
                    <td className="py-3 px-4 text-ink-500 font-mono">{s.email}</td>
                    <td className="py-3 px-4 text-ink-700">Sem {s.semester}</td>
                    <td className="py-3 px-4">
                      <RiskBadge risk={s.risk_level} size="sm" />
                    </td>
                    <td className="py-3 px-4 font-semibold text-ink-900 tabular-nums">
                      {s.dropout_probability ? (s.dropout_probability * 100).toFixed(1) + '%' : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-ink-700 tabular-nums">
                      <span className={s.attendance_percentage < 75 ? 'text-danger font-bold' : ''}>
                        {s.attendance_percentage ? s.attendance_percentage + '%' : 'N/A'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-ink-700 tabular-nums">
                      {s.avg_marks ? s.avg_marks + '%' : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/faculty/students/${s.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-semibold border border-brand-200 transition"
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
      </Card>
    </div>
  )
}
