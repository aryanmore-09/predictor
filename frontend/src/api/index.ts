import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// ---- Auth ----
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
}

// ---- Student ----
export const studentApi = {
  getProfile: () => api.get('/students/me'),
  getDashboard: () => api.get('/students/me/dashboard'),
  getAlerts: () => api.get('/students/me/alerts'),
  markAlertRead: (id: number) => api.post(`/students/me/alerts/${id}/read`),
  getInterventions: () => api.get('/students/me/interventions'),
  acknowledgeIntervention: (id: number) => api.post(`/students/me/interventions/${id}/acknowledge`),
  submitSurvey: (data: Record<string, unknown>) => api.post('/students/me/survey', data),
  getNotifications: () => api.get('/students/me/notifications'),
  markNotifRead: (id: number) => api.post(`/students/me/notifications/${id}/read`),
  getMyPrediction: () => api.get('/predictions/me'),
}

// ---- Faculty ----
export const facultyApi = {
  getDashboard: () => api.get('/faculty/dashboard'),
  getStudents: (params?: Record<string, string>) => api.get('/faculty/students', { params }),
  getStudentDetail: (id: number) => api.get(`/faculty/students/${id}/detail`),
  sendIntervention: (student_id: number, message: string) =>
    api.post('/faculty/interventions', { student_id, message }),
  createReferral: (student_id: number, reason: string) =>
    api.post('/faculty/referrals', { student_id, reason }),
  updateReferral: (id: number, status: string, notes?: string) =>
    api.put(`/faculty/referrals/${id}`, { status, notes }),
  addMarks: (data: Record<string, unknown>) => api.post('/faculty/marks', data),
  updateAttendance: (data: Record<string, unknown>) => api.post('/faculty/attendance', data),
}

// ---- Admin ----
export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: () => api.get('/admin/users'),
  createUser: (data: Record<string, unknown>) => api.post('/admin/users', data),
  toggleUserActive: (id: number) => api.put(`/admin/users/${id}/toggle-active`),
  getStudents: () => api.get('/admin/students'),
  getRiskTrends: () => api.get('/admin/analytics/risk-trends'),
  getDeptComparison: () => api.get('/admin/analytics/department-comparison'),
  getDataQuality: () => api.get('/admin/data-quality'),
  exportDsr: (student_id: number) => api.get(`/admin/dsr/export/${student_id}`),
  deleteDsr: (student_id: number) => api.delete(`/admin/dsr/delete/${student_id}`),
  getAuditLogs: () => api.get('/admin/audit-logs'),
}

// ---- Predictions ----
export const predictionApi = {
  predictStudent: (id: number) => api.post(`/predictions/predict/${id}`),
  predictAll: () => api.post('/predictions/predict-all'),
  triggerTraining: () => api.post('/predictions/train'),
  getModelInfo: () => api.get('/predictions/model-info'),
}

// ---- Upload ----
export const uploadApi = {
  uploadCsv: (file: File, upload_type: string) => {
    const form = new FormData()
    form.append('file', file)
    form.append('upload_type', upload_type)
    return api.post('/upload/csv', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  syncLms: (student_id: number) => api.post(`/upload/lms-sync/${student_id}`),
}

// ---- Reports ----
export const reportApi = {
  exportStudentsCsv: () => api.get('/reports/students/csv', { responseType: 'blob' }),
  exportStudentDetailCsv: (id: number) => api.get(`/reports/student/${id}/csv`, { responseType: 'blob' }),
  exportInstitutionalCsv: () => api.get('/reports/institutional/csv', { responseType: 'blob' }),
}
