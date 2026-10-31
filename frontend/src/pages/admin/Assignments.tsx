import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Search } from 'lucide-react'
import { adminApi } from '../../api'
import { Card, Input, Select, Skeleton, EmptyState, RiskBadge } from '../../components/ui'

export default function AdminAssignments() {
  const [students, setStudents] = useState<any[]>([])
  const [faculty, setFaculty] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [sRes, fRes] = await Promise.all([adminApi.getStudents(), adminApi.getFaculty()])
      setStudents(sRes.data || [])
      setFaculty(fRes.data || [])
    } catch {
      toast.error('Failed to load assignments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleAssign = async (studentId: number, value: string) => {
    const mentorId = value ? Number(value) : null
    try {
      await adminApi.assignMentor(studentId, mentorId)
      setStudents((prev) => prev.map((s) => (s.id === studentId ? { ...s, mentor_id: mentorId } : s)))
      toast.success('Mentor updated')
    } catch {
      toast.error('Failed to update mentor')
    }
  }

  const filtered = students.filter(
    (s) =>
      !search ||
      s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.student_id?.includes(search)
  )

  return (
    <div className="space-y-6 py-2">
      <Card className="p-6">
        <h1 className="text-2xl font-bold text-ink-900 mb-1">Mentor Assignments</h1>
        <p className="text-sm text-ink-500">
          Assign each student to a faculty mentor. Faculty only see and act on their own mentees.
        </p>
      </Card>

      <Card className="p-4">
        <Input
          type="text"
          placeholder="Search by name or roll number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search className="w-4 h-4" />}
        />
      </Card>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8">
            <EmptyState title="No students found" description="Try a different search." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line text-ink-700 uppercase font-semibold bg-brand-50">
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Semester</th>
                  <th className="py-3.5 px-4">Risk</th>
                  <th className="py-3.5 px-4">Assigned Mentor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-ink-700">
                {filtered.slice(0, 150).map((s) => (
                  <tr key={s.id} className="hover:bg-mist transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-ink-900">{s.full_name}</div>
                      <div className="text-[11px] text-ink-500 font-mono">{s.student_id}</div>
                    </td>
                    <td className="py-3 px-4">Sem {s.semester}</td>
                    <td className="py-3 px-4">
                      <RiskBadge risk={s.risk_level} size="sm" />
                    </td>
                    <td className="py-3 px-4">
                      <Select
                        value={s.mentor_id ?? ''}
                        onChange={(e) => handleAssign(s.id, e.target.value)}
                        className="text-xs"
                      >
                        <option value="">Unassigned</option>
                        {faculty.map((f) => (
                          <option key={f.id} value={f.id}>{f.full_name}</option>
                        ))}
                      </Select>
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
