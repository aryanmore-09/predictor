from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, date

class AttendanceSummaryResponse(BaseModel):
    total_classes: int
    attended_classes: int
    missed_classes: int
    excused_classes: int
    overall_percentage: float
    status_label: str  # Safe / Warning / Critical
    threshold_percentage: float
    consecutive_present_days: int = 0
    recent_trend: str = "stable"  # improving / declining / stable

    model_config = ConfigDict(from_attributes=True)


class SubjectAttendanceResponse(BaseModel):
    subject: str
    code: Optional[str] = None
    total_classes: int
    attended_classes: int
    missed_classes: int
    excused_classes: int
    percentage: float
    status_label: str
    classes_needed_for_threshold: int
    classes_can_miss: int
    recent_percentage: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class CalendarSessionItem(BaseModel):
    id: int
    subject: str
    start_time: str
    end_time: str
    status: str  # Present / Absent / Late / Excused
    remarks: Optional[str] = None


class CalendarDayItem(BaseModel):
    date: str  # YYYY-MM-DD
    status: str  # Present / Absent / Late / Excused / Mixed / NoClass
    present_count: int
    absent_count: int
    late_count: int
    excused_count: int
    sessions: List[CalendarSessionItem]


class AttendanceTrendPoint(BaseModel):
    period: str  # Week 1, Oct 2026, etc.
    attendance_percentage: float
    attended_classes: int
    total_classes: int


class AttendanceRecordDetail(BaseModel):
    id: int
    session_id: int
    subject: str
    session_date: datetime
    start_time: str
    end_time: str
    class_division: str
    status: str
    remarks: Optional[str] = None
    marked_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PaginatedAttendanceRecords(BaseModel):
    items: List[AttendanceRecordDetail]
    total: int
    page: int
    page_size: int
    pages: int


class LeaveRequestCreate(BaseModel):
    start_date: str  # YYYY-MM-DD
    end_date: str    # YYYY-MM-DD
    reason: str


class LeaveRequestReview(BaseModel):
    status: str  # Approved / Rejected
    faculty_comment: Optional[str] = None


class LeaveRequestResponse(BaseModel):
    id: int
    student_id: int
    student_name: Optional[str] = None
    student_code: Optional[str] = None
    start_date: datetime
    end_date: datetime
    reason: str
    document_path: Optional[str] = None
    original_filename: Optional[str] = None
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    status: str
    reviewed_by: Optional[int] = None
    reviewer_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    faculty_comment: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ClassSessionCreate(BaseModel):
    subject: str
    session_date: str  # YYYY-MM-DD
    start_time: str = "09:00"
    end_time: str = "10:00"
    class_division: str = "CSE-A"
    room: Optional[str] = "Room 401"
    topic: Optional[str] = None


class ClassSessionResponse(BaseModel):
    id: int
    subject: str
    faculty_id: Optional[int] = None
    faculty_name: Optional[str] = None
    session_date: datetime
    start_time: str
    end_time: str
    class_division: str
    room: Optional[str] = None
    topic: Optional[str] = None
    marked_count: int = 0
    total_students: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StudentAttendanceMarkItem(BaseModel):
    student_id: int
    status: str  # Present / Absent / Late / Excused
    remarks: Optional[str] = None


class BulkAttendanceMarkRequest(BaseModel):
    session_id: int
    records: List[StudentAttendanceMarkItem]


class SessionStudentItem(BaseModel):
    student_id: int
    student_code: str
    full_name: str
    current_attendance_pct: float
    current_status: Optional[str] = "Present"  # Present / Absent / Late / Excused
    remarks: Optional[str] = None


class SubjectReportItem(BaseModel):
    subject: str
    total_sessions: int
    average_attendance: float
    defaulters_count: int


class DefaulterStudentItem(BaseModel):
    student_id: int
    student_code: str
    full_name: str
    department: str
    semester: int
    overall_attendance: float
    weakest_subject: str
    weakest_subject_pct: float
    classes_needed: int
    risk_level: str = "medium"


class AttendanceAnalyticsResponse(BaseModel):
    institutional_average: float
    total_classes_held: int
    total_records_marked: int
    defaulters_count: int
    department_averages: List[Dict[str, Any]]
    class_averages: List[Dict[str, Any]]
    monthly_trend: List[Dict[str, Any]]
    threshold: float


class ThresholdUpdateRequest(BaseModel):
    threshold_percentage: float

