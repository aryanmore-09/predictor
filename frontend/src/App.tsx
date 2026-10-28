import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/auth'
import Login from './pages/Login'
import StudentDashboard from './pages/student/Dashboard'
import StudentAlerts from './pages/student/Alerts'
import StudentSurvey from './pages/student/Survey'
import StudentRecommendations from './pages/student/Recommendations'
import FacultyDashboard from './pages/faculty/Dashboard'
import FacultyStudents from './pages/faculty/Students'
import FacultyStudentDetail from './pages/faculty/StudentDetail'
import AdminDashboard from './pages/admin/Dashboard'
import AdminUsers from './pages/admin/Users'
import AdminModels from './pages/admin/Models'
import AdminUpload from './pages/admin/Upload'
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
            background: 'rgba(10, 22, 40, 0.95)',
            color: '#f0f6ff',
            border: '1px solid rgba(74, 128, 200, 0.3)',
            borderRadius: '12px',
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/about" element={<Layout><AboutPage /></Layout>} />
        <Route path="/how-it-works" element={<Layout><HowItWorks /></Layout>} />
        <Route path="/privacy" element={<Layout><PrivacyPage /></Layout>} />
        <Route path="/unauthorized" element={
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-red-400 mb-4">403</h1>
              <p className="text-navy-200">You don't have permission to access this page.</p>
            </div>
          </div>
        } />

        {/* Student Routes */}
        <Route path="/student" element={<PrivateRoute roles={['student']}><Layout><StudentDashboard /></Layout></PrivateRoute>} />
        <Route path="/student/alerts" element={<PrivateRoute roles={['student']}><Layout><StudentAlerts /></Layout></PrivateRoute>} />
        <Route path="/student/survey" element={<PrivateRoute roles={['student']}><Layout><StudentSurvey /></Layout></PrivateRoute>} />
        <Route path="/student/recommendations" element={<PrivateRoute roles={['student']}><Layout><StudentRecommendations /></Layout></PrivateRoute>} />

        {/* Faculty Routes */}
        <Route path="/faculty" element={<PrivateRoute roles={['faculty', 'admin']}><Layout><FacultyDashboard /></Layout></PrivateRoute>} />
        <Route path="/faculty/students" element={<PrivateRoute roles={['faculty', 'admin']}><Layout><FacultyStudents /></Layout></PrivateRoute>} />
        <Route path="/faculty/students/:id" element={<PrivateRoute roles={['faculty', 'admin']}><Layout><FacultyStudentDetail /></Layout></PrivateRoute>} />

        {/* Admin Routes */}
        <Route path="/admin" element={<PrivateRoute roles={['admin']}><Layout><AdminDashboard /></Layout></PrivateRoute>} />
        <Route path="/admin/users" element={<PrivateRoute roles={['admin']}><Layout><AdminUsers /></Layout></PrivateRoute>} />
        <Route path="/admin/models" element={<PrivateRoute roles={['admin']}><Layout><AdminModels /></Layout></PrivateRoute>} />
        <Route path="/admin/upload" element={<PrivateRoute roles={['admin', 'faculty']}><Layout><AdminUpload /></Layout></PrivateRoute>} />

        <Route path="/" element={<Navigate to={defaultRoute()} replace />} />
        <Route path="*" element={<Navigate to={defaultRoute()} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
