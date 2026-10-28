import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { UserPlus, UserCheck, Shield } from 'lucide-react'
import { adminApi } from '../../api'
import { Card, Button, Input, Select, Badge, Skeleton } from '../../components/ui'

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // New user form state
  const [showAdd, setShowAdd] = useState(false)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('faculty')
  const [password, setPassword] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchUsers = async () => {
    try {
      const res = await adminApi.getUsers()
      setUsers(res.data || [])
    } catch {
      toast.error('Failed to load user accounts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      await adminApi.createUser({ email, full_name: fullName, role, password })
      toast.success('Account created successfully')
      setShowAdd(false)
      setEmail('')
      setFullName('')
      setPassword('')
      fetchUsers()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create user')
    } finally {
      setCreating(false)
    }
  }

  const handleToggleActive = async (id: number) => {
    try {
      const res = await adminApi.toggleUserActive(id)
      setUsers(users.map(u => u.id === id ? { ...u, is_active: res.data.is_active } : u))
      toast.success('User status updated')
    } catch {
      toast.error('Failed to update status')
    }
  }

  return (
    <div className="space-y-6 py-2">
      <Card className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 mb-1">User &amp; Role Management</h1>
          <p className="text-sm text-ink-500">Manage administrator, faculty advisor, and student user accounts.</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowAdd(!showAdd)}
          icon={<UserPlus className="w-4 h-4" />}
        >
          {showAdd ? 'Close Form' : 'New User Account'}
        </Button>
      </Card>

      {/* Add User Modal / Form */}
      {showAdd && (
        <Card className="p-6 space-y-4">
          <h2 className="text-base font-bold text-ink-900">Create New Institutional Account</h2>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Dr. Anand Verma"
              />
              <Input
                label="Email Address"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="username@mit.edu"
              />
              <Select
                label="System Role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="student">Student</option>
                <option value="faculty">Faculty Advisor</option>
                <option value="admin">Administrator</option>
              </Select>
              <Input
                label="Initial Password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAdd(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={creating}
              >
                Save User Account
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Users Table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line text-ink-700 uppercase font-semibold bg-brand-50">
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-ink-700">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-mist transition">
                    <td className="py-3 px-4 font-semibold text-ink-900">{u.full_name}</td>
                    <td className="py-3 px-4 text-ink-500 font-mono">{u.email}</td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={u.role === 'admin' ? 'brand' : u.role === 'faculty' ? 'accent' : 'neutral'}
                        size="sm"
                      >
                        {u.role}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.is_active
                            ? 'bg-brand-50 text-brand-700 border border-brand-200'
                            : 'bg-danger-bg text-danger border border-red-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-brand-500' : 'bg-danger'}`} />
                        {u.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant={u.is_active ? 'secondary' : 'primary'}
                        size="sm"
                        onClick={() => handleToggleActive(u.id)}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
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
