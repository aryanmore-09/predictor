import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/auth'
import Login from './pages/Login'
import StudentDashboard from './pages/student/Dashboard'
import StudentAlerts from './pages/student/Alerts'
import StudentSurvey from './pages/student/Survey'
import StudentRecommendations from './pages/student/Recommendations'
import StudentTestPapers from './pages/student/TestPapers'
import StudentAttendance from './pages/student/Attendance'
import FacultyDashboard from './pages/faculty/Dashboard'
import FacultyStudents from './pages/faculty/Students'
import FacultyStudentDetail from './pages/faculty/StudentDetail'
import FacultyPendingVerifications from './pages/faculty/PendingVerifications'
import FacultyAttendanceManagement from './pages/faculty/AttendanceManagement'
import AdminDashboard from './pages/admin/Dashboard'
import AdminAttendanceAnalytics from './pages/admin/AttendanceAnalytics'
import AdminUsers from './pages/admin/Users'
import AdminModels from './pages/admin/Models'
import AdminUpload from './pages/admin/Upload'
import AdminAssignments from './pages/admin/Assignments'
import AdminOutbox from './pages/admin/Outbox'
import AdminAuditLog from './pages/admin/AuditLog'
import AboutPage from './pages/About'
import HowItWorks from './pages/HowItWorks'
import PrivacyPage from './pages/Privacy'
import Layout from './components/Layout'

function PrivateRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/unauthorized" replace />
  return <>{children}</>
}

export default function App() {
  const { user, token } = useAuthStore()

  const defaultRoute = () => {
    if (!token) return '/login'
    if (user?.role === 'admin') return '/admin'
    if (user?.role === 'faculty') return '/faculty'
    return '/student'
  }

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#FFFFFF',
            color: '#1F3D2B',
            border: '1px solid #CFE5D5',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(31, 61, 43, 0.08)',
            fontSize: '0.875rem',
            fontWeight: 500,
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/about" element={<Layout><AboutPage /></Layout>} />
        <Route path="/how-it-works" element={<Layout><HowItWorks /></Layout>} />
        <Route path="/privacy" element={<Layout><PrivacyPage /></Layout>} />
        <Route
          path="/unauthorized"
          element={
            <div className="flex items-center justify-center min-h-screen bg-mist p-4">
              <div className="bg-surface border border-line rounded-2xl p-8 max-w-md text-center shadow-sm">
                <h1 className="text-4xl font-extrabold text-danger mb-2">403</h1>
                <h2 className="text-lg font-bold text-ink-900 mb-1">Access Restricted</h2>
                <p className="text-sm text-ink-500 mb-6">
                  You do not have administrative or authorized permissions to view this resource.
                </p>
                <a
                  href="/login"
                  className="inline-flex items-center justify-center px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold transition"
                >
                  Return to Login
                </a>
              </div>
            </div>
          }
        />

        {/* Student Routes */}
        <Route path="/student" element={<PrivateRoute roles={['student']}><Layout><StudentDashboard /></Layout></PrivateRoute>} />
        <Route path="/student/attendance" element={<PrivateRoute roles={['student']}><Layout><StudentAttendance /></Layout></PrivateRoute>} />
        <Route path="/student/test-papers" element={<PrivateRoute roles={['student']}><Layout><StudentTestPapers /></Layout></PrivateRoute>} />
        <Route path="/student/alerts" element={<PrivateRoute roles={['student']}><Layout><StudentAlerts /></Layout></PrivateRoute>} />
        <Route path="/student/survey" element={<PrivateRoute roles={['student']}><Layout><StudentSurvey /></Layout></PrivateRoute>} />
        <Route path="/student/recommendations" element={<PrivateRoute roles={['student']}><Layout><StudentRecommendations /></Layout></PrivateRoute>} />

        {/* Faculty Routes */}
        <Route path="/faculty" element={<PrivateRoute roles={['faculty', 'admin']}><Layout><FacultyDashboard /></Layout></PrivateRoute>} />
        <Route path="/faculty/attendance" element={<PrivateRoute roles={['faculty', 'admin']}><Layout><FacultyAttendanceManagement /></Layout></PrivateRoute>} />
        <Route path="/faculty/verifications" element={<PrivateRoute roles={['faculty', 'admin']}><Layout><FacultyPendingVerifications /></Layout></PrivateRoute>} />
        <Route path="/faculty/students" element={<PrivateRoute roles={['faculty', 'admin']}><Layout><FacultyStudents /></Layout></PrivateRoute>} />
        <Route path="/faculty/students/:id" element={<PrivateRoute roles={['faculty', 'admin']}><Layout><FacultyStudentDetail /></Layout></PrivateRoute>} />

        {/* Admin Routes */}
        <Route path="/admin" element={<PrivateRoute roles={['admin']}><Layout><AdminDashboard /></Layout></PrivateRoute>} />
        <Route path="/admin/attendance" element={<PrivateRoute roles={['admin']}><Layout><AdminAttendanceAnalytics /></Layout></PrivateRoute>} />
        <Route path="/admin/users" element={<PrivateRoute roles={['admin']}><Layout><AdminUsers /></Layout></PrivateRoute>} />
        <Route path="/admin/models" element={<PrivateRoute roles={['admin']}><Layout><AdminModels /></Layout></PrivateRoute>} />
        <Route path="/admin/upload" element={<PrivateRoute roles={['admin', 'faculty']}><Layout><AdminUpload /></Layout></PrivateRoute>} />
        <Route path="/admin/assignments" element={<PrivateRoute roles={['admin']}><Layout><AdminAssignments /></Layout></PrivateRoute>} />
        <Route path="/admin/outbox" element={<PrivateRoute roles={['admin']}><Layout><AdminOutbox /></Layout></PrivateRoute>} />
        <Route path="/admin/audit" element={<PrivateRoute roles={['admin']}><Layout><AdminAuditLog /></Layout></PrivateRoute>} />

        <Route path="/" element={<Navigate to={defaultRoute()} replace />} />
        <Route path="*" element={<Navigate to={defaultRoute()} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
