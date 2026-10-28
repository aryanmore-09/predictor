import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { GraduationCap, ArrowRight, Sparkles } from 'lucide-react'
import { authApi } from '../api'
import { useAuthStore } from '../store/auth'

export default function Login() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await authApi.login(email, password)
      const data = res.data
      setAuth(
        {
          user_id: data.user_id,
          email,
          full_name: data.full_name,
          role: data.role,
          student_id: data.student_id,
          faculty_id: data.faculty_id,
        },
        data.access_token
      )
      toast.success(`Welcome back, ${data.full_name}!`)
      if (data.role === 'admin') navigate('/admin')
      else if (data.role === 'faculty') navigate('/faculty')
      else navigate('/student')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Invalid login credentials')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail)
    setPassword(demoPass)
  }

  return (
    <div
      className="min-h-screen flex flex-col justify-between p-4 sm:p-8"
      style={{ background: 'var(--color-bg)', color: 'var(--color-heading)', fontFamily: 'Inter, sans-serif' }}
    >
      {/* Top Header */}
      <div
        className="flex items-center justify-between max-w-6xl mx-auto w-full py-4"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--color-tint)', border: '1px solid var(--color-border)' }}
          >
            <GraduationCap className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-wide" style={{ color: 'var(--color-heading)' }}>
              MIT School of Computing
            </h1>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
              Dept. of Computer Science &amp; Engineering
            </p>
          </div>
        </div>
        <div className="flex items-center gap-5 text-sm font-medium">
          <Link to="/about" style={{ color: 'var(--color-muted)' }} className="hover:underline">
            About System
          </Link>
          <Link to="/how-it-works" style={{ color: 'var(--color-muted)' }} className="hover:underline">
            How it Works
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto w-full my-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center py-8">
        {/* Left Branding */}
        <div className="lg:col-span-7 space-y-6">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: 'var(--color-tint)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-primary)',
            }}
          >
            <Sparkles className="w-3.5 h-3.5" /> Early Intervention &amp; Dropout Prevention AI
          </div>

          <h2
            className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight"
            style={{ color: 'var(--color-heading)', fontFamily: 'Outfit, sans-serif' }}
          >
            Student Academic Performance &amp; Dropout Risk Predictor
          </h2>

          <p className="text-base sm:text-lg leading-relaxed max-w-xl" style={{ color: 'var(--color-muted)' }}>
            Leveraging machine learning to predict academic trajectories, detect early risk signals,
            and recommend proactive faculty interventions.
          </p>

          {/* Demo Credentials */}
          <div
            className="p-5 rounded-2xl space-y-3"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 1px 4px rgba(23,49,46,0.07)',
            }}
          >
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
              Quick Demo Access (Click to Fill)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              {[
                { label: 'Administrator', email: 'admin@mit.edu', pass: 'Admin@123' },
                { label: 'Faculty Mentor', email: 'prof.sharma@mit.edu', pass: 'Faculty@123' },
                { label: 'Student Portal', email: 'student1@mit.edu', pass: 'Student@123' },
              ].map(({ label, email: de, pass }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => fillDemo(de, pass)}
                  className="p-2.5 rounded-xl text-left transition flex items-center justify-between"
                  style={{ background: 'var(--color-tint)', border: '1px solid var(--color-border)', cursor: 'pointer' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-primary)'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)'
                  }}
                >
                  <div>
                    <div className="font-semibold" style={{ color: 'var(--color-heading)' }}>{label}</div>
                    <div style={{ color: 'var(--color-muted)' }} className="text-[10px]">{de}</div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sign-in Card */}
        <div className="lg:col-span-5">
          <div
            className="p-8 rounded-2xl relative overflow-hidden"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 2px 12px rgba(23,49,46,0.09)',
            }}
          >
            {/* Banner bar */}
            <div
              className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
              style={{ background: 'var(--color-primary)' }}
            />
            <div className="mb-6">
              <h3
                className="text-2xl font-bold"
                style={{ color: 'var(--color-heading)', fontFamily: 'Outfit, sans-serif' }}
              >
                Sign In
              </h3>
              <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
                Authenticate to access your dashboard
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-muted)' }}>
                  Institutional Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="username@mit.edu"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-muted)' }}>
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input"
                />
              </div>

              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-3 mt-2"
                style={{ width: '100%' }}
              >
                {loading ? 'Authenticating...' : 'Sign In to Portal'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="max-w-6xl mx-auto w-full text-center py-4 text-xs"
        style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-muted)' }}
      >
        © 2026 MIT School of Computing — Department of Computer Science &amp; Engineering. All rights reserved.
      </div>
    </div>
  )
}
