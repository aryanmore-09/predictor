from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from ..database import Base


class RiskLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"

class GradeBand(str, enum.Enum):
    A = "A"
    B = "B"
    C = "C"
    D = "D"
    F = "F"


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=True)
    student_id = Column(String, unique=True, index=True, nullable=False)  # e.g. MIT2024001
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    gender = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    department = Column(String, default="Computer Science & Engineering")
    semester = Column(Integer, nullable=True)
    year = Column(Integer, nullable=True)
    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    guardian_name = Column(String, nullable=True)
    guardian_phone = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="student_profile")
    academic_records = relationship("AcademicRecord", back_populates="student", cascade="all, delete-orphan")
    attendance_records = relationship("AttendanceRecord", back_populates="student", cascade="all, delete-orphan")
    attendance_entries = relationship("AttendanceEntry", back_populates="student", cascade="all, delete-orphan")
    assignment_records = relationship("AssignmentRecord", back_populates="student", cascade="all, delete-orphan")
    quiz_records = relationship("QuizRecord", back_populates="student", cascade="all, delete-orphan")
    survey_responses = relationship("SurveyResponse", back_populates="student", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="student", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="student", cascade="all, delete-orphan")
    interventions = relationship("Intervention", back_populates="student", cascade="all, delete-orphan")
    counselor_referrals = relationship("CounselorReferral", back_populates="student", cascade="all, delete-orphan")
    lms_data = relationship("LMSData", back_populates="student", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="student", cascade="all, delete-orphan")


class Faculty(Base):
    __tablename__ = "faculty"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    faculty_id = Column(String, unique=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True)
    department = Column(String, default="Computer Science & Engineering")
    designation = Column(String, nullable=True)
    subjects = Column(Text, nullable=True)  # JSON string of subjects
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="faculty_profile")
    interventions = relationship("Intervention", back_populates="faculty")
    counselor_referrals = relationship("CounselorReferral", back_populates="referred_by")


class AcademicRecord(Base):
    __tablename__ = "academic_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    subject = Column(String, nullable=False)
    semester = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    internal_marks = Column(Float, nullable=True)
    external_marks = Column(Float, nullable=True)
    total_marks = Column(Float, nullable=True)
    max_marks = Column(Float, default=100.0)
    grade = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = relationship("Student", back_populates="academic_records")


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    subject = Column(String, nullable=False)
    semester = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    total_classes = Column(Integer, default=0)
    attended_classes = Column(Integer, default=0)
    attendance_percentage = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = relationship("Student", back_populates="attendance_records")


class AssignmentRecord(Base):
    __tablename__ = "assignment_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    subject = Column(String, nullable=False)
    semester = Column(Integer, nullable=False)
    total_assignments = Column(Integer, default=0)
    submitted_assignments = Column(Integer, default=0)
    late_submissions = Column(Integer, default=0)
    avg_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="assignment_records")


class QuizRecord(Base):
    __tablename__ = "quiz_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    subject = Column(String, nullable=False)
    semester = Column(Integer, nullable=False)
    total_quizzes = Column(Integer, default=0)
    attempted_quizzes = Column(Integer, default=0)
    avg_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="quiz_records")


class SurveyResponse(Base):
    __tablename__ = "survey_responses"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    stress_level = Column(Integer, nullable=True)        # 1-5
    workload_level = Column(Integer, nullable=True)      # 1-5
    study_hours_per_day = Column(Float, nullable=True)
    motivation_level = Column(Integer, nullable=True)    # 1-5
    support_needed = Column(Boolean, default=False)
    support_type = Column(String, nullable=True)
    free_text = Column(Text, nullable=True)
    consent_given = Column(Boolean, default=False, nullable=False)
    consent_timestamp = Column(DateTime, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="survey_responses")


class LMSData(Base):
    __tablename__ = "lms_data"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    semester = Column(Integer, nullable=True)
    login_frequency_per_week = Column(Float, default=0.0)
    avg_time_spent_hours = Column(Float, default=0.0)
    resource_views = Column(Integer, default=0)
    forum_posts = Column(Integer, default=0)
    forum_views = Column(Integer, default=0)
    early_submissions = Column(Integer, default=0)
    late_submissions = Column(Integer, default=0)
    recorded_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="lms_data")


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    risk_level = Column(Enum(RiskLevel), nullable=False)
    dropout_probability = Column(Float, nullable=False)
    predicted_grade_band = Column(String, nullable=True)
    pass_probability = Column(Float, nullable=True)
    predicted_score = Column(Float, nullable=True)
    top_factors = Column(Text, nullable=True)  # JSON string
    model_version = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="predictions")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    alert_type = Column(String, nullable=False)  # attendance, marks, assignment, risk_change
    message = Column(Text, nullable=False)
    severity = Column(String, default="medium")  # low, medium, high
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="alerts")


class Intervention(Base):
    __tablename__ = "interventions"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    faculty_id = Column(Integer, ForeignKey("faculty.id"), nullable=True)
    message = Column(Text, nullable=False)
    is_acknowledged = Column(Boolean, default=False)
    acknowledged_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="interventions")
    faculty = relationship("Faculty", back_populates="interventions")


class CounselorReferral(Base):
    __tablename__ = "counselor_referrals"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    referred_by_id = Column(Integer, ForeignKey("faculty.id"), nullable=True)
    reason = Column(Text, nullable=False)
    status = Column(String, default="pending")  # pending, in_progress, resolved
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = relationship("Student", back_populates="counselor_referrals")
    referred_by = relationship("Faculty", back_populates="counselor_referrals")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True)
    title = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    notification_type = Column(String, default="info")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")
    student = relationship("Student", back_populates="notifications")


class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(Integer, primary_key=True, index=True)
    version = Column(String, nullable=False)
    algorithm = Column(String, nullable=False)
    accuracy = Column(Float, nullable=True)
    precision = Column(Float, nullable=True)
    recall = Column(Float, nullable=True)
    f1_score = Column(Float, nullable=True)
    roc_auc = Column(Float, nullable=True)
    training_samples = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=False)
    metrics_json = Column(Text, nullable=True)  # full metrics JSON
    trained_at = Column(DateTime, default=datetime.utcnow)


class DataUpload(Base):
    __tablename__ = "data_uploads"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    upload_type = Column(String, nullable=False)  # attendance, marks, assignments, students
    status = Column(String, default="processing")  # processing, completed, failed
    rows_uploaded = Column(Integer, default=0)
    rows_failed = Column(Integer, default=0)
    error_report = Column(Text, nullable=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)


class AttendanceEntry(Base):
    __tablename__ = "attendance_entries"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), index=True, nullable=False)
    subject = Column(String, nullable=False)
    session_date = Column(DateTime, nullable=False, index=True)
    status = Column(String, nullable=False)  # "present", "absent"
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="attendance_entries")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)  # e.g., "DSR_EXPORT", "DSR_DELETE"
    target_type = Column(String, nullable=False)  # e.g., "student"
    target_id = Column(String, nullable=False)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
