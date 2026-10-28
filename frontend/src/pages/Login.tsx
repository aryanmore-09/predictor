import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { GraduationCap, ArrowRight, Sparkles } from 'lucide-react'
import { authApi } from '../api'
import { useAuthStore } from '../store/auth'
import { Button, Input } from '../components/ui'

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
    <div className="min-h-screen flex flex-col justify-between bg-mist text-ink-900 font-sans p-4 sm:p-8">
      {/* Top Header */}
      <header className="flex items-center justify-between max-w-6xl mx-auto w-full py-4 border-b border-line">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-xs">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-ink-900">
              MIT School of Computing
            </h1>
            <p className="text-xs text-ink-500">
              Dept. of Computer Science &amp; Engineering
            </p>
          </div>
        </div>
        <nav className="flex items-center gap-5 text-sm font-semibold">
          <Link to="/about" className="text-ink-500 hover:text-brand-600 transition">
            About System
          </Link>
          <Link to="/how-it-works" className="text-ink-500 hover:text-brand-600 transition">
            How It Works
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto w-full my-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center py-8">
        {/* Left Branding */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-brand-100 text-brand-700 border border-brand-200 shadow-xs">
            <Sparkles className="w-3.5 h-3.5" /> Early Intervention &amp; Dropout Prevention AI
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-ink-900 leading-tight">
            Student Academic Performance &amp; Dropout Risk Predictor
          </h2>

          <p className="text-base sm:text-lg leading-relaxed text-ink-700 max-w-xl">
            Leveraging machine learning to predict academic trajectories, detect early risk signals,
            and recommend proactive faculty interventions.
          </p>

          {/* Demo Credentials */}
          <div className="bg-white border border-line rounded-2xl p-5 shadow-sm space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-500">
              Quick Demo Access (Click to Fill)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              {[
                { label: 'Administrator', email: 'admin@mit.edu', pass: 'Admin@123' },
                { label: 'Faculty Mentor', email: 'prof.sharma@mit.edu', pass: 'Faculty@123' },
                { label: 'Student Portal', email: 'student1@mit.edu', pass: 'Student@123' },
              ].map(({ label, email: de, pass }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => fillDemo(de, pass)}
                  className="p-3 rounded-xl text-left bg-mist hover:bg-brand-50 border border-line hover:border-brand-500 transition duration-150 flex items-center justify-between cursor-pointer group shadow-xs"
                >
                  <div>
                    <div className="font-bold text-ink-900 group-hover:text-brand-700 transition">
                      {label}
                    </div>
                    <div className="text-[10px] text-ink-500 font-mono">{de}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-brand-500 group-hover:translate-x-0.5 transition" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sign-in Card */}
        <div className="lg:col-span-5">
          <div className="bg-white border border-line rounded-2xl p-8 shadow-md relative overflow-hidden">
            {/* Top brand accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-brand-600" />

            <div className="mb-6">
              <h3 className="text-2xl font-bold text-ink-900">
                Sign In
              </h3>
              <p className="text-sm text-ink-500 mt-1">
                Authenticate with your institutional credentials
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                label="Institutional Email"
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="username@mit.edu"
              />

              <Input
                label="Password"
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />

              <Button
                id="login-submit"
                type="submit"
                loading={loading}
                className="w-full py-2.5 mt-2"
                size="md"
              >
                Sign In to Portal
              </Button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto w-full text-center py-4 text-xs text-ink-500 border-t border-line">
        © 2026 MIT School of Computing — Department of Computer Science &amp; Engineering. All rights reserved.
      </footer>
    </div>
  )
}
