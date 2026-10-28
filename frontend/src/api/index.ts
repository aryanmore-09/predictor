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

// ---- Test Papers ----
export interface TestPaper {
  id: number
  student_id: number
  student_name?: string
  student_code?: string
  subject: string
  exam_type: string
  exam_date: string
  marks_obtained: number
  max_marks: number
  percentage: number
  original_filename: string
  file_type: string
  file_size: number
  remarks?: string
  status: 'Pending' | 'Verified' | 'Rejected'
  verified_by?: number
  verifier_name?: string
  verified_at?: string
  faculty_comment?: string
  created_at: string
}

export interface TestPaperSummary {
  total_uploaded: number
  pending_count: number
  verified_count: number
  rejected_count: number
  overall_avg_percentage: number
  best_subject?: { subject: string; avg_percentage: number }
  weakest_subject?: { subject: string; avg_percentage: number }
  subject_averages: Array<{ subject: string; avg_percentage: number; paper_count: number }>
  trends: Array<{
    id: number
    exam_date: string
    subject: string
    exam_type: string
    marks_obtained: number
    max_marks: number
    percentage: number
    status: string
  }>
}

export const testPaperApi = {
  upload: (formData: FormData) =>
    api.post<TestPaper>('/test-papers/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getMyPapers: (params?: Record<string, unknown>) =>
    api.get<{ items: TestPaper[]; total: number; page: number; page_size: number; pages: number }>('/test-papers/me', { params }),
  getMySummary: () =>
    api.get<TestPaperSummary>('/test-papers/me/summary'),
  getPaper: (id: number) =>
    api.get<TestPaper>(`/test-papers/${id}`),
  getFileUrl: (id: number) =>
    `/api/test-papers/${id}/file`,
  downloadFile: (id: number) =>
    api.get(`/test-papers/${id}/file`, { responseType: 'blob' }),
  updatePaper: (id: number, data: { marks_obtained?: number; max_marks?: number; remarks?: string }) =>
    api.put<TestPaper>(`/test-papers/${id}`, data),
  deletePaper: (id: number) =>
    api.delete<{ message: string; id: number }>(`/test-papers/${id}`),
  getFacultyPending: () =>
    api.get<TestPaper[]>('/test-papers/faculty/pending'),
  verifyPaper: (id: number, data: { status: 'Verified' | 'Rejected'; faculty_comment?: string; corrected_marks?: number }) =>
    api.patch<TestPaper>(`/test-papers/${id}/verify`, data),
  getStudentPapers: (studentId: number) =>
    api.get<TestPaper[]>(`/test-papers/student/${studentId}`),
  extractMarks: (formData: FormData) =>
    api.post<{ marks_obtained?: number; max_marks?: number; message?: string }>('/test-papers/extract-marks', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
}

// ---- Attendance ----
export interface AttendanceSummary {
  total_classes: number
  attended_classes: number
  missed_classes: number
  excused_classes: number
  overall_percentage: number
  status_label: 'Safe' | 'Warning' | 'Critical'
  threshold_percentage: number
  consecutive_present_days: number
  recent_trend: 'improving' | 'declining' | 'stable'
}

export interface SubjectAttendance {
  subject: string
  code?: string
  total_classes: number
  attended_classes: number
  missed_classes: number
  excused_classes: number
  percentage: number
  status_label: string
  classes_needed_for_threshold: number
  classes_can_miss: number
}

export interface CalendarSessionItem {
  id: number
  subject: string
  start_time: string
  end_time: string
  status: 'Present' | 'Absent' | 'Late' | 'Excused'
  remarks?: string
}

export interface CalendarDayItem {
  date: string
  status: 'Present' | 'Absent' | 'Late' | 'Excused' | 'Mixed' | 'NoClass'
  present_count: number
  absent_count: number
  late_count: number
  excused_count: number
  sessions: CalendarSessionItem[]
}

export interface AttendanceTrendPoint {
  period: string
  attendance_percentage: number
  attended_classes: number
  total_classes: number
}

export interface AttendanceRecordDetail {
  id: number
  session_id: number
  subject: string
  session_date: string
  start_time: string
  end_time: string
  class_division: string
  status: string
  remarks?: string
  marked_at?: string
}

export interface LeaveRequestItem {
  id: number
  student_id: number
  student_name?: string
  student_code?: string
  start_date: string
  end_date: string
  reason: string
  document_path?: string
  original_filename?: string
  file_type?: string
  file_size?: number
  status: 'Pending' | 'Approved' | 'Rejected'
  reviewed_by?: number
  reviewer_name?: string
  reviewed_at?: string
  faculty_comment?: string
  created_at: string
}

export interface ClassSessionItem {
  id: number
  subject: string
  faculty_id?: number
  faculty_name?: string
  session_date: string
  start_time: string
  end_time: string
  class_division: string
  room?: string
  topic?: string
  marked_count: number
  total_students: number
  created_at: string
}

export interface SessionStudentItem {
  student_id: number
  student_code: string
  full_name: string
  current_attendance_pct: number
  current_status: 'Present' | 'Absent' | 'Late' | 'Excused'
  remarks?: string
}

export interface DefaulterStudent {
  student_id: number
  student_code: string
  full_name: string
  department: string
  semester: number
  overall_attendance: number
  weakest_subject: string
  weakest_subject_pct: number
  classes_needed: number
  risk_level: string
}

export interface AttendanceAnalytics {
  institutional_average: number
  total_classes_held: number
  total_records_marked: number
  defaulters_count: number
  department_averages: Array<{ department: string; average: number; student_count: number }>
  class_averages: Array<{ division: string; average: number; defaulters: number }>
  monthly_trend: Array<{ month: string; attendance: number }>
  threshold: number
}

export const attendanceApi = {
  // Student
  getMySummary: () => api.get<AttendanceSummary>('/attendance/me/summary'),
  getMySubjects: () => api.get<SubjectAttendance[]>('/attendance/me/subjects'),
  getMyCalendar: (month?: string) =>
    api.get<CalendarDayItem[]>('/attendance/me/calendar', { params: { month } }),
  getMyTrend: () => api.get<AttendanceTrendPoint[]>('/attendance/me/trend'),
  getMyRecords: (params?: Record<string, unknown>) =>
    api.get<{ items: AttendanceRecordDetail[]; total: number; page: number; page_size: number; pages: number }>(
      '/attendance/me/records',
      { params }
    ),
  submitLeaveRequest: (formData: FormData) =>
    api.post<LeaveRequestItem>('/attendance/me/leave-requests', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getMyLeaveRequests: () => api.get<LeaveRequestItem[]>('/attendance/me/leave-requests'),
  downloadLeaveDocument: (id: number) =>
    api.get(`/attendance/leave-requests/${id}/document`, { responseType: 'blob' }),
  exportCsv: () => api.get('/attendance/me/export', { responseType: 'blob' }),

  // Faculty
  createSession: (data: {
    subject: string
    session_date: string
    start_time: string
    end_time: string
    class_division: string
    room?: string
    topic?: string
  }) => api.post<ClassSessionItem>('/attendance/faculty/sessions', data),
  getFacultySessions: (limit: number = 50) =>
    api.get<ClassSessionItem[]>('/attendance/faculty/sessions', { params: { limit } }),
  getSessionStudents: (sessionId: number) =>
    api.get<SessionStudentItem[]>(`/attendance/faculty/sessions/${sessionId}/students`),
  markSession: (sessionId: number, records: Array<{ student_id: number; status: string; remarks?: string }>) =>
    api.post<{ message: string; marked: number }>(`/attendance/faculty/sessions/${sessionId}/mark`, {
      session_id: sessionId,
      records,
    }),
  uploadCsv: (formData: FormData) =>
    api.post<{ session_id: number; processed_rows: number; failed_rows: number; errors: string[] }>(
      '/attendance/faculty/upload-csv',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ),
  getDefaulters: (threshold?: number) =>
    api.get<DefaulterStudent[]>('/attendance/faculty/defaulters', { params: { threshold } }),
  sendReminder: (studentId: number) =>
    api.post<{ message: string }>(`/attendance/faculty/remind/${studentId}`),
  getFacultyLeaveRequests: () =>
    api.get<LeaveRequestItem[]>('/attendance/faculty/leave-requests'),
  reviewLeaveRequest: (id: number, formData: FormData) =>
    api.patch<LeaveRequestItem>(`/attendance/faculty/leave-requests/${id}/review`, formData),

  // Admin
  getAdminAnalytics: () => api.get<AttendanceAnalytics>('/attendance/admin/analytics'),
  getThreshold: () => api.get<{ threshold_percentage: number }>('/attendance/admin/threshold'),
  updateThreshold: (threshold_percentage: number) =>
    api.put<{ message: string; threshold_percentage: number }>('/attendance/admin/threshold', {
      threshold_percentage,
    }),

  // Drilldown
  getStudentDrilldownSummary: (studentId: number) =>
    api.get<AttendanceSummary>(`/attendance/student/${studentId}/summary`),
  getStudentDrilldownSubjects: (studentId: number) =>
    api.get<SubjectAttendance[]>(`/attendance/student/${studentId}/subjects`),
  getStudentDrilldownCalendar: (studentId: number, month?: string) =>
    api.get<CalendarDayItem[]>(`/attendance/student/${studentId}/calendar`, { params: { month } }),
  getStudentDrilldownTrend: (studentId: number) =>
    api.get<AttendanceTrendPoint[]>(`/attendance/student/${studentId}/trend`),
}
