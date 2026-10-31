import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  GraduationCap,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Users,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react'
import { authApi } from '../api'
import { useAuthStore } from '../store/auth'
import { AuthBackground, ShieldMotif } from '../components/auth'

export default function Login() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [capsLockActive, setCapsLockActive] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    toast.dismiss()
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
      if (!err.response) {
        const msg = 'Cannot reach the server. Is the backend running?'
        setErrorMessage(msg)
        toast.error(msg)
      } else {
        const detail = err.response?.data?.detail
        const msg = typeof detail === 'string' ? detail : 'Invalid credentials'
        setErrorMessage(msg)
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail)
    setPassword(demoPass)
    setErrorMessage(null)
  }

  const handlePasswordKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLockActive(e.getModifierState('CapsLock'))
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-mist text-ink-900 font-sans px-4 sm:px-6 lg:px-8 selection:bg-brand-100 selection:text-brand-900 overflow-x-hidden">
      {/* Animated light background with spotlight & mesh blobs */}
      <AuthBackground />

      {/* Top Header */}
      <header className="relative z-10 flex items-center justify-between max-w-7xl mx-auto w-full py-5 border-b border-line/60">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center shadow-xs ring-1 ring-white/60">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-base sm:text-lg tracking-tight text-ink-900 leading-tight">
              MIT School of Computing
            </div>
            <p className="text-xs text-ink-500 font-medium leading-tight">
              Dept. of Computer Science &amp; Engineering
            </p>
          </div>
        </div>
        <nav className="flex items-center gap-6 text-sm font-semibold">
          <Link
            to="/about"
            className="text-ink-500 hover:text-brand-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-md px-1 py-0.5"
          >
            About System
          </Link>
          <Link
            to="/how-it-works"
            className="text-ink-500 hover:text-brand-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-md px-1 py-0.5"
          >
            How It Works
          </Link>
        </nav>
      </header>

      {/* Main Content (Natural DOM tab order: nav -> demo cards -> email -> password -> toggle -> submit) */}
      <main className="relative z-10 max-w-7xl mx-auto w-full my-auto py-8 sm:py-12">
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          {/* LEFT Column: Hero (in DOM first for tab order, visually below card on mobile) */}
          <div className="order-2 lg:order-1 flex flex-col space-y-6 w-full">
            {/* Pill Badge */}
            <div className="animate-fade-up [animation-delay:80ms] opacity-0 [animation-fill-mode:forwards] inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-brand-100/90 text-brand-700 border border-brand-200/80 shadow-xs w-fit">
              <Sparkles className="w-3.5 h-3.5 text-brand-600 shrink-0" />
              <span>Early Intervention &amp; Dropout Prevention AI</span>
            </div>

            {/* H1 Heading */}
            <h1 className="animate-fade-up [animation-delay:160ms] opacity-0 [animation-fill-mode:forwards] text-4xl lg:text-6xl font-extrabold tracking-tight text-ink-900 leading-[1.12]">
              Student Academic Performance &amp;{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-accent-500">
                Dropout Risk
              </span>{' '}
              Predictor
            </h1>

            {/* Subtext */}
            <p className="animate-fade-up [animation-delay:240ms] opacity-0 [animation-fill-mode:forwards] text-base sm:text-lg text-ink-700 leading-relaxed max-w-xl">
              Machine learning that spots early risk signals and recommends timely, supportive interventions for every student.
            </p>

            {/* Three Trust Chips */}
            <div className="animate-fade-up [animation-delay:320ms] opacity-0 [animation-fill-mode:forwards] flex flex-wrap gap-2.5 pt-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-white/75 backdrop-blur-xs border border-line/80 text-ink-700 shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                <span>Explainable predictions</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-white/75 backdrop-blur-xs border border-line/80 text-ink-700 shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                <span>Privacy-first by design</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-white/75 backdrop-blur-xs border border-line/80 text-ink-700 shadow-xs">
                <Users className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                <span>Built for faculty and students</span>
              </div>
            </div>

            {/* Floating Shield & Check Motif */}
            <div className="animate-fade-up [animation-delay:400ms] opacity-0 [animation-fill-mode:forwards] hidden sm:flex flex-col items-center lg:items-start pt-2 pb-2">
              <ShieldMotif />
            </div>

            {/* Quick Demo Access Cards */}
            <div className="animate-fade-up [animation-delay:480ms] opacity-0 [animation-fill-mode:forwards] w-full space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-ink-500">
                  Quick Demo Access (Click to Fill)
                </p>
                <span className="text-[11px] text-ink-500 font-medium hidden sm:inline">
                  One-click institutional testing
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Administrator', email: 'admin@mit.edu', pass: 'Admin@123' },
                  { label: 'Faculty Mentor', email: 'prof.sharma@mit.edu', pass: 'Faculty@123' },
                  { label: 'Student Portal', email: 'student1@mit.edu', pass: 'Student@123' },
                ].map(({ label, email: de, pass }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => fillDemo(de, pass)}
                    className="p-3.5 rounded-2xl text-left bg-white/70 backdrop-blur-sm border border-line/90 hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <span className="font-bold text-sm text-ink-900 group-hover:text-brand-700 transition-colors">
                        {label}
                      </span>
                      <ArrowRight className="w-4 h-4 text-brand-500 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <div className="text-[11px] text-ink-500 font-mono truncate">{de}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT Column: Glassmorphism Sign-In Card (in DOM second, visually first on mobile) */}
          <div className="order-1 lg:order-2 flex justify-center w-full">
            <div className="animate-fade-up w-full max-w-md bg-white/90 supports-[backdrop-filter]:bg-white/60 backdrop-blur-xl border border-white/70 rounded-3xl shadow-[0_20px_60px_-15px_rgba(27,107,58,0.25)] p-8 ring-1 ring-inset ring-white/60 relative overflow-hidden">
              {/* Thin top accent bar gradient from brand-500 to accent-500 */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-500 to-accent-500" />

              {/* Card Header */}
              <div className="mb-6">
                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 mb-3.5 ring-4 ring-brand-50">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-ink-900">
                  Sign In
                </h2>
                <p className="text-sm text-ink-500 mt-1">
                  Authenticate with your institutional credentials
                </p>
              </div>

              {/* Single Inline Error Banner */}
              {errorMessage && (
                <div
                  role="alert"
                  className="mb-5 p-3 rounded-xl bg-danger-bg text-danger border border-red-200/80 text-sm flex items-start gap-2.5 animate-fade-up"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-danger" />
                  <span className="font-medium leading-snug">{errorMessage}</span>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-4.5">
                {/* Institutional Email Field */}
                <div>
                  <label
                    htmlFor="login-email"
                    className="block uppercase tracking-wide text-xs font-semibold text-ink-700 mb-1.5"
                  >
                    Institutional Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="login-email"
                      name="email"
                      type="email"
                      required
                      autoComplete="username"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        if (errorMessage) setErrorMessage(null)
                      }}
                      placeholder="username@mit.edu"
                      className="w-full h-12 bg-white/80 border border-line rounded-xl pl-10 pr-4 text-sm text-ink-900 placeholder:text-ink-300 transition-all outline-none focus:border-accent-500 focus:ring-4 focus:ring-accent-100"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label
                    htmlFor="login-password"
                    className="block uppercase tracking-wide text-xs font-semibold text-ink-700 mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="login-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        if (errorMessage) setErrorMessage(null)
                      }}
                      onKeyDown={handlePasswordKey}
                      onKeyUp={handlePasswordKey}
                      placeholder="••••••••"
                      className="w-full h-12 bg-white/80 border border-line rounded-xl pl-10 pr-11 text-sm text-ink-900 placeholder:text-ink-300 transition-all outline-none focus:border-accent-500 focus:ring-4 focus:ring-accent-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-ink-500 hover:text-ink-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded-lg cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Caps Lock Detection Hint */}
                  {capsLockActive && (
                    <div className="flex items-center gap-1.5 text-xs text-warning mt-1.5 font-medium animate-fade-up">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-warning" />
                      <span>Caps Lock is on</span>
                    </div>
                  )}
                </div>

                {/* Primary Submit Button */}
                <button
                  id="login-submit"
                  type="submit"
                  disabled={loading}
                  className="group relative w-full h-12 mt-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:to-brand-600 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                >
                  {/* Subtle shine sweep on hover */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform ease-in-out pointer-events-none" />

                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Signing in…</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Portal</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              {/* Data Protection Line & Link to /privacy */}
              <div className="mt-5 text-center">
                <Link
                  to="/privacy"
                  className="inline-flex items-center justify-center gap-1.5 text-xs text-ink-500 hover:text-brand-700 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-md py-0.5 px-1"
                >
                  <Lock className="w-3.5 h-3.5 text-ink-500 group-hover:text-brand-600 transition-colors" />
                  <span>Your data is protected. Predictions are a support signal, not a verdict.</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto w-full text-center py-5 text-xs text-ink-500 border-t border-line/60">
        © 2026 MIT School of Computing — Department of Computer Science &amp; Engineering. All rights reserved.
      </footer>
    </div>
  )
}
