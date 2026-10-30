import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { studentApi } from '../api'
import {
  LayoutDashboard, Bell, ClipboardList, Star, Users, GraduationCap,
  Upload, Brain, LogOut, Menu, X, Info, HelpCircle, Shield,
  ChevronDown, FileText, CheckSquare, CalendarCheck, Sun, Moon
} from 'lucide-react'
import { useQuery } from '../hooks/useQuery'

const navConfig = {
  student: [
    { to: '/student', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/student/attendance', icon: CalendarCheck, label: 'Attendance' },
    { to: '/student/test-papers', icon: FileText, label: 'Test Papers' },
    { to: '/student/alerts', icon: Bell, label: 'My Alerts' },
    { to: '/student/survey', icon: ClipboardList, label: 'Wellness Survey' },
    { to: '/student/recommendations', icon: Star, label: 'Recommendations' },
  ],
  faculty: [
    { to: '/faculty', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/faculty/attendance', icon: CalendarCheck, label: 'Attendance' },
    { to: '/faculty/students', icon: Users, label: 'My Students' },
    { to: '/faculty/verifications', icon: CheckSquare, label: 'Verifications' },
    { to: '/admin/upload', icon: Upload, label: 'Upload Data' },
  ],
  admin: [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/attendance', icon: CalendarCheck, label: 'Attendance' },
    { to: '/admin/users', icon: Users, label: 'User Management' },
    { to: '/admin/models', icon: Brain, label: 'AI Models' },
    { to: '/faculty/verifications', icon: CheckSquare, label: 'Verifications' },
    { to: '/admin/upload', icon: Upload, label: 'Data Upload' },
    { to: '/faculty/students', icon: GraduationCap, label: 'All Students' },
  ],
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  // Dark Mode State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light'
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (saved === 'dark' || saved === 'light') return saved
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  })

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  const nav = navConfig[user?.role || 'student']

  const { data: notifData } = useQuery(
    user?.role === 'student' ? studentApi.getNotifications : null,
    { refreshInterval: 30000 }
  )
  const unreadCount = (notifData || []).filter((n: { is_read: boolean }) => !n.is_read).length

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-mist text-ink-900 font-sans">
      {/* ── Mobile Sidebar Backdrop ── */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 bg-ink-900/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile Off-Canvas Drawer (<768px) ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-surface border-r border-line shadow-2xl flex flex-col md:hidden transform transition-transform duration-300 ease-in-out ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 flex items-center justify-between border-b border-line min-h-[66px]">
          <div className="flex items-center gap-3">
            <div className="shrink-0 w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
              M
            </div>
            <div>
              <div className="font-bold text-sm leading-tight text-ink-900">MIT School of</div>
              <div className="text-xs font-semibold text-brand-600">Computing</div>
            </div>
          </div>
          <button
            onClick={() => setMobileNavOpen(false)}
            className="p-2 rounded-xl text-ink-500 hover:text-ink-900 hover:bg-brand-50 transition min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        {/* Role badge */}
        <div className="px-4 pt-3 pb-2">
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-widest bg-brand-50 text-brand-700 border border-brand-200">
            {user?.role}
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-3 space-y-1.5 overflow-y-auto">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/student' || to === '/faculty' || to === '/admin'}
              onClick={() => setMobileNavOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition min-h-[44px] ${
                  isActive
                    ? 'bg-brand-100 text-brand-700 border-l-4 border-brand-600 shadow-xs'
                    : 'text-ink-700 hover:bg-brand-50 hover:text-ink-900'
                }`
              }
            >
              <Icon size={20} className="shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom utility links */}
        <div className="px-3 pb-4 pt-2 border-t border-line space-y-1">
          <NavLink
            to="/privacy"
            onClick={() => setMobileNavOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-ink-500 hover:bg-brand-50 hover:text-ink-900 transition min-h-[40px]"
          >
            <Shield size={18} className="shrink-0" />
            <span>Privacy &amp; Data Use</span>
          </NavLink>
          <NavLink
            to="/how-it-works"
            onClick={() => setMobileNavOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-ink-500 hover:bg-brand-50 hover:text-ink-900 transition min-h-[40px]"
          >
            <HelpCircle size={18} className="shrink-0" />
            <span>How It Works</span>
          </NavLink>
          <NavLink
            to="/about"
            onClick={() => setMobileNavOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-ink-500 hover:bg-brand-50 hover:text-ink-900 transition min-h-[40px]"
          >
            <Info size={18} className="shrink-0" />
            <span>About System</span>
          </NavLink>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-danger hover:bg-danger-bg transition min-h-[40px]"
          >
            <LogOut size={18} className="shrink-0" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* ── Desktop Sidebar (>=768px) ── */}
      <aside
        className={`hidden md:flex flex-col bg-surface border-r border-line transition-all duration-300 ease-in-out shrink-0 sticky top-0 h-screen overflow-y-auto overflow-x-hidden shadow-xs z-30 ${
          sidebarOpen ? 'w-64' : 'w-16'
        }`}
      >
        {/* Logo */}
        <div className="p-4 flex items-center gap-3 border-b border-line min-h-[66px]">
          <div className="shrink-0 w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
            M
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <div className="font-bold text-sm leading-tight text-ink-900">
                MIT School of
              </div>
              <div className="text-xs font-semibold text-brand-600">
                Computing
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto p-1.5 rounded-lg text-ink-500 hover:text-ink-900 hover:bg-brand-50 transition"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Role badge */}
        {sidebarOpen && (
          <div className="px-4 pt-3 pb-2">
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-widest bg-brand-50 text-brand-700 border border-brand-200">
              {user?.role}
            </span>
          </div>
        )}

        {/* Nav links */}
        <nav className="flex-1 px-2.5 py-3 space-y-1">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/student' || to === '/faculty' || to === '/admin'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-brand-100 text-brand-700 border-l-4 border-brand-600 shadow-xs'
                    : 'text-ink-700 hover:bg-brand-50 hover:text-ink-900'
                }`
              }
              title={!sidebarOpen ? label : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {sidebarOpen && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom utility links */}
        <div className="px-2.5 pb-4 pt-2 border-t border-line space-y-1">
          <NavLink
            to="/privacy"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
                isActive ? 'bg-brand-100 text-brand-700 font-semibold' : 'text-ink-500 hover:bg-brand-50 hover:text-ink-900'
              }`
            }
            title={!sidebarOpen ? 'Privacy & Data Use' : undefined}
          >
            <Shield size={16} className="shrink-0" />
            {sidebarOpen && <span>Privacy &amp; Data Use</span>}
          </NavLink>
          <NavLink
            to="/how-it-works"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
                isActive ? 'bg-brand-100 text-brand-700 font-semibold' : 'text-ink-500 hover:bg-brand-50 hover:text-ink-900'
              }`
            }
            title={!sidebarOpen ? 'How It Works' : undefined}
          >
            <HelpCircle size={16} className="shrink-0" />
            {sidebarOpen && <span>How It Works</span>}
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
                isActive ? 'bg-brand-100 text-brand-700 font-semibold' : 'text-ink-500 hover:bg-brand-50 hover:text-ink-900'
              }`
            }
            title={!sidebarOpen ? 'About System' : undefined}
          >
            <Info size={16} className="shrink-0" />
            {sidebarOpen && <span>About System</span>}
          </NavLink>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-danger hover:bg-danger-bg transition"
            title={!sidebarOpen ? 'Log Out' : undefined}
          >
            <LogOut size={16} className="shrink-0" />
            {sidebarOpen && <span>Log Out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main content area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-3.5 sm:px-6 h-16 gap-3 bg-brand-600 text-white border-b border-brand-700 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden p-2 -ml-1 rounded-xl text-white hover:bg-brand-700 transition min-w-[40px] min-h-[40px] flex items-center justify-center shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>

            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold tracking-tight text-white truncate">
                Student Academic Risk Predictor
              </div>
              <div className="text-[10px] sm:text-xs text-brand-100 truncate hidden xs:block">
                MIT School of Computing — Dept. of CSE
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Dark Mode Toggle */}
            <button
              id="theme-toggle-btn"
              onClick={toggleTheme}
              className="p-2 rounded-xl text-white hover:bg-brand-700 transition min-w-[40px] min-h-[40px] flex items-center justify-center"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notification bell */}
            <button
              id="nav-notifications-btn"
              onClick={() => navigate(user?.role === 'student' ? '/student/alerts' : '#')}
              className="relative p-2 rounded-xl text-white hover:bg-brand-700 transition min-w-[40px] min-h-[40px] flex items-center justify-center"
              aria-label="View notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute 1 top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center border-2 border-brand-600">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Profile dropdown */}
            <div className="relative">
              <button
                id="nav-profile-btn"
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-1.5 sm:gap-2 px-2 py-1.5 rounded-xl text-white hover:bg-brand-700 transition min-h-[40px]"
              >
                <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                  {user?.full_name?.charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-semibold max-w-[120px] truncate leading-tight">
                    {user?.full_name}
                  </div>
                  <div className="text-[10px] text-brand-100 capitalize">
                    {user?.role}
                  </div>
                </div>
                <ChevronDown size={14} className="text-brand-200 shrink-0" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-surface border border-line shadow-xl py-1.5 z-50 text-ink-900">
                  <div className="px-4 py-2.5 border-b border-line">
                    <div className="text-xs font-bold text-ink-900 truncate">
                      {user?.full_name}
                    </div>
                    <div className="text-[11px] text-ink-500 truncate">
                      {user?.email}
                    </div>
                    <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                      {user?.role}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-xs font-semibold text-danger hover:bg-danger-bg transition flex items-center gap-2 min-h-[40px]"
                  >
                    <LogOut size={14} /> Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-3.5 sm:p-6 md:p-8 overflow-x-hidden flex flex-col justify-between">
          <div className="max-w-7xl mx-auto w-full">{children}</div>

          {/* Institutional Footer */}
          <footer className="mt-12 pt-6 border-t border-line text-xs text-ink-500 flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface -mx-3.5 sm:-mx-6 md:-mx-8 -mb-3.5 sm:-mb-6 md:-mb-8 px-4 sm:px-8 py-4">
            <div className="flex items-center gap-2 text-center sm:text-left">
              <span className="font-semibold text-ink-700">MIT School of Computing</span>
              <span>•</span>
              <span>Department of Computer Science &amp; Engineering</span>
            </div>
            <div className="flex flex-wrap justify-center items-center gap-4 text-ink-500">
              <NavLink to="/privacy" className="hover:text-brand-600 transition">Privacy &amp; Data Use</NavLink>
              <NavLink to="/how-it-works" className="hover:text-brand-600 transition">How It Works</NavLink>
              <NavLink to="/about" className="hover:text-brand-600 transition">About System</NavLink>
            </div>
          </footer>
        </main>
      </div>
    </div>
  )
}
