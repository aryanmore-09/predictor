import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { studentApi } from '../api'
import {
  LayoutDashboard, Bell, ClipboardList, Star, Users, GraduationCap,
  Upload, Brain, LogOut, Menu, X, Info, HelpCircle, Shield,
  ChevronDown
} from 'lucide-react'
import { useQuery } from '../hooks/useQuery'

const navConfig = {
  student: [
    { to: '/student', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/student/alerts', icon: Bell, label: 'My Alerts' },
    { to: '/student/survey', icon: ClipboardList, label: 'Wellness Survey' },
    { to: '/student/recommendations', icon: Star, label: 'Recommendations' },
  ],
  faculty: [
    { to: '/faculty', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/faculty/students', icon: Users, label: 'My Students' },
    { to: '/admin/upload', icon: Upload, label: 'Upload Data' },
  ],
  admin: [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/users', icon: Users, label: 'User Management' },
    { to: '/admin/models', icon: Brain, label: 'AI Models' },
    { to: '/admin/upload', icon: Upload, label: 'Data Upload' },
    { to: '/faculty/students', icon: GraduationCap, label: 'All Students' },
  ],
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [profileOpen, setProfileOpen] = useState(false)

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
    <div className="flex min-h-screen" style={{ background: 'var(--color-bg)', fontFamily: 'Inter, sans-serif' }}>
      {/* ── Sidebar ── */}
      <aside
        className="flex flex-col transition-all duration-300 ease-in-out"
        style={{
          width: sidebarOpen ? '252px' : '66px',
          minHeight: '100vh',
          background: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          boxShadow: '1px 0 3px rgba(23,49,46,0.04)',
        }}
      >
        {/* Logo */}
        <div
          className="p-4 flex items-center gap-3"
          style={{ borderBottom: '1px solid var(--color-border)', minHeight: 66 }}
        >
          <div
            className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center font-bold text-base"
            style={{ background: 'var(--color-primary)', color: 'white' }}
          >
            M
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <div className="font-bold text-sm leading-tight" style={{ color: 'var(--color-heading)' }}>
                MIT School of
              </div>
              <div className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
                Computing
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto p-1 rounded-lg transition-colors"
            style={{ color: 'var(--color-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-tint)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Role badge */}
        {sidebarOpen && (
          <div className="px-4 pt-3 pb-2">
            <span
              className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-widest"
              style={{
                background: 'var(--color-tint)',
                color: 'var(--color-primary)',
                border: '1px solid var(--color-border)',
              }}
            >
              {user?.role}
            </span>
          </div>
        )}

        {/* Nav links */}
        <nav className="flex-1 px-2 py-2 space-y-0.5">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/student' || to === '/faculty' || to === '/admin'}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={17} className="flex-shrink-0" />
              {sidebarOpen && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom utility links */}
        <div
          className="px-2 pb-4 space-y-0.5"
          style={{ borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}
        >
          <NavLink to="/privacy" className="sidebar-link">
            <Shield size={17} className="flex-shrink-0" />
            {sidebarOpen && <span>Privacy &amp; Data Use</span>}
          </NavLink>
          <NavLink to="/how-it-works" className="sidebar-link">
            <HelpCircle size={17} className="flex-shrink-0" />
            {sidebarOpen && <span>How It Works</span>}
          </NavLink>
          <NavLink to="/about" className="sidebar-link">
            <Info size={17} className="flex-shrink-0" />
            {sidebarOpen && <span>About</span>}
          </NavLink>
          <button
            onClick={handleLogout}
            className="sidebar-link"
            style={{ color: 'var(--color-risk-high)' }}
          >
            <LogOut size={17} className="flex-shrink-0" />
            {sidebarOpen && <span>Log Out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main content area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header
          className="sticky top-0 z-30 flex items-center justify-between px-6 h-16 gap-4"
          style={{
            background: 'var(--color-surface)',
            borderBottom: '1px solid var(--color-border)',
            boxShadow: '0 1px 3px rgba(23,49,46,0.05)',
          }}
        >
          <div>
            <div
              className="text-sm font-bold"
              style={{ color: 'var(--color-heading)', fontFamily: 'Outfit, sans-serif' }}
            >
              Student Academic Performance &amp; Dropout Risk Predictor
            </div>
            <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
              MIT School of Computing — Dept. of Computer Science &amp; Engineering
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <button
              id="nav-notifications-btn"
              onClick={() => navigate(user?.role === 'student' ? '/student/alerts' : '#')}
              className="relative p-2 rounded-lg transition-colors"
              style={{ color: 'var(--color-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-tint)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Bell size={19} />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 text-[10px] rounded-full flex items-center justify-center font-bold"
                  style={{ width: 17, height: 17, background: 'var(--color-risk-high)', color: 'white' }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Profile dropdown */}
            <div className="relative">
              <button
                id="nav-profile-btn"
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl transition-colors"
                style={{ color: 'var(--color-heading)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-tint)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm"
                  style={{ background: 'var(--color-primary)', color: 'white' }}
                >
                  {user?.full_name?.charAt(0).toUpperCase()}
                </div>
                {sidebarOpen && (
                  <>
                    <div className="text-left hidden sm:block">
                      <div
                        className="text-sm font-semibold leading-tight"
                        style={{
                          maxWidth: 120, overflow: 'hidden',
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          color: 'var(--color-heading)',
                        }}
                      >
                        {user?.full_name}
                      </div>
                      <div className="text-xs capitalize" style={{ color: 'var(--color-muted)' }}>
                        {user?.role}
                      </div>
                    </div>
                    <ChevronDown size={13} style={{ color: 'var(--color-muted)' }} />
                  </>
                )}
              </button>

              {profileOpen && (
                <div
                  className="absolute right-0 mt-2 w-44 rounded-xl py-2 z-50"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    boxShadow: '0 8px 24px rgba(23,49,46,0.14)',
                  }}
                >
                  <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <div className="text-sm font-semibold" style={{ color: 'var(--color-heading)' }}>
                      {user?.full_name}
                    </div>
                    <div className="text-xs capitalize" style={{ color: 'var(--color-muted)' }}>
                      {user?.role}
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm transition-colors"
                    style={{ color: 'var(--color-risk-high)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-tint)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto flex flex-col justify-between" style={{ background: 'var(--color-bg)' }}>
          <div>{children}</div>

          {/* Institutional Footer */}
          <footer className="mt-12 pt-6 border-t border-slate-800/80 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-400">MIT School of Computing</span>
              <span>•</span>
              <span>Department of Computer Science &amp; Engineering</span>
            </div>
            <div className="flex items-center gap-4 text-slate-400">
              <NavLink to="/privacy" className="hover:text-blue-400 transition">Privacy &amp; Data Use</NavLink>
              <NavLink to="/how-it-works" className="hover:text-blue-400 transition">How It Works</NavLink>
              <NavLink to="/about" className="hover:text-blue-400 transition">About System</NavLink>
            </div>
          </footer>
        </main>
      </div>
    </div>
  )
}
