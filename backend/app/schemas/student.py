from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# ---------- Student Schemas ----------
class StudentBase(BaseModel):
    student_id: str
    full_name: str
    email: str
    gender: Optional[str] = None
    age: Optional[int] = None
    department: str = "Computer Science & Engineering"
    semester: Optional[int] = None
    year: Optional[int] = None
    phone: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_phone: Optional[str] = None

class StudentCreate(StudentBase):
    pass

class StudentResponse(StudentBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class StudentSummary(BaseModel):
    id: int
    student_id: str
    full_name: str
    email: str
    semester: Optional[int]
    risk_level: Optional[str] = None
    dropout_probability: Optional[float] = None
    pass_probability: Optional[float] = None
    attendance_percentage: Optional[float] = None
    avg_marks: Optional[float] = None
    class Config:
        from_attributes = True

# ---------- Academic Record Schemas ----------
class AcademicRecordBase(BaseModel):
    subject: str
    semester: int
    year: int
    internal_marks: Optional[float] = None
    external_marks: Optional[float] = None
    total_marks: Optional[float] = None
    max_marks: float = 100.0
    grade: Optional[str] = None

class AcademicRecordCreate(AcademicRecordBase):
    student_id: int

class AcademicRecordResponse(AcademicRecordBase):
    id: int
    student_id: int
    created_at: datetime
    class Config:
        from_attributes = True

# ---------- Attendance Schemas ----------
class AttendanceBase(BaseModel):
    subject: str
    semester: int
    year: int
    total_classes: int = 0
    attended_classes: int = 0
    attendance_percentage: float = 0.0

class AttendanceCreate(AttendanceBase):
    student_id: int

class AttendanceResponse(AttendanceBase):
    id: int
    student_id: int
    class Config:
        from_attributes = True

# ---------- Assignment Schemas ----------
class AssignmentBase(BaseModel):
    subject: str
    semester: int
    total_assignments: int = 0
    submitted_assignments: int = 0
    late_submissions: int = 0
    avg_score: float = 0.0

class AssignmentCreate(AssignmentBase):
    student_id: int

class AssignmentResponse(AssignmentBase):
    id: int
    student_id: int
    class Config:
        from_attributes = True

# ---------- Quiz Schemas ----------
class QuizBase(BaseModel):
    subject: str
    semester: int
    total_quizzes: int = 0
    attempted_quizzes: int = 0
    avg_score: float = 0.0

class QuizCreate(QuizBase):
    student_id: int

class QuizResponse(QuizBase):
    id: int
    student_id: int
    class Config:
        from_attributes = True

# ---------- Survey Schemas ----------
class SurveyCreate(BaseModel):
    stress_level: Optional[int] = None
    workload_level: Optional[int] = None
    study_hours_per_day: Optional[float] = None
    motivation_level: Optional[int] = None
    support_needed: bool = False
    support_type: Optional[str] = None
    free_text: Optional[str] = None
    consent_given: bool = False

class SurveyResponse(SurveyCreate):
    id: int
    student_id: int
    consent_given: bool = False
    consent_timestamp: Optional[datetime] = None
    submitted_at: datetime
    class Config:
        from_attributes = True

# ---------- LMS Data Schemas ----------
class LMSDataCreate(BaseModel):
    semester: Optional[int] = None
    login_frequency_per_week: float = 0.0
    avg_time_spent_hours: float = 0.0
    resource_views: int = 0
    forum_posts: int = 0
    forum_views: int = 0
    early_submissions: int = 0
    late_submissions: int = 0

class LMSDataResponse(LMSDataCreate):
    id: int
    student_id: int
    recorded_at: datetime
    class Config:
        from_attributes = True

# ---------- Intervention Schemas ----------
class InterventionCreate(BaseModel):
    student_id: int
    message: str

class InterventionResponse(BaseModel):
    id: int
    student_id: int
    faculty_id: Optional[int]
    message: str
    is_acknowledged: bool
    created_at: datetime
    class Config:
        from_attributes = True

# ---------- Counselor Referral Schemas ----------
class CounselorReferralCreate(BaseModel):
    student_id: int
    reason: str

class CounselorReferralUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

class CounselorReferralResponse(BaseModel):
    id: int
    student_id: int
    referred_by_id: Optional[int]
    reason: str
    status: str
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

# ---------- Alert Schemas ----------
class AlertResponse(BaseModel):
    id: int
    student_id: int
    alert_type: str
    message: str
    severity: str
    is_read: bool
    created_at: datetime
    class Config:
        from_attributes = True

# ---------- Notification ----------
class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    body: str
    is_read: bool
    notification_type: str
    created_at: datetime
    class Config:
        from_attributes = True

# ---------- Dashboard Schemas ----------
class StudentDashboard(BaseModel):
    student: StudentResponse
    prediction: Optional[dict] = None
    alerts: List[AlertResponse] = []
    attendance_summary: List[dict] = []
    marks_summary: List[dict] = []
    recommendations: List[str] = []
    goal_progress: Optional[dict] = None

class FacultyDashboard(BaseModel):
    total_students: int
    risk_distribution: dict
    at_risk_students: List[StudentSummary]
    class_avg_attendance: float
    class_avg_marks: float

class AdminDashboard(BaseModel):
    total_students: int
    total_faculty: int
    risk_distribution: dict
    overall_avg_attendance: float
    overall_avg_marks: float
    recent_uploads: List[dict]
    model_info: Optional[dict] = None

# ---------- Data Quality ----------
class DataQualityReport(BaseModel):
    total_rows: int
    missing_values: dict
    outliers_fixed: int
    duplicates_removed: int
    rows_after_cleaning: int
