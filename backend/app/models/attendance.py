from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base

class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    department = Column(String, default="Computer Science & Engineering")
    semester = Column(Integer, default=5)
    credits = Column(Integer, default=4)
    faculty_id = Column(Integer, ForeignKey("faculty.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    faculty = relationship("Faculty")


class ClassSession(Base):
    __tablename__ = "class_sessions"

    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String, nullable=False, index=True)
    faculty_id = Column(Integer, ForeignKey("faculty.id"), nullable=True)
    session_date = Column(DateTime, nullable=False, index=True)
    start_time = Column(String, default="09:00")
    end_time = Column(String, default="10:00")
    class_division = Column(String, default="CSE-A")
    room = Column(String, nullable=True, default="Room 401")
    topic = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    faculty = relationship("Faculty")
    attendance_records = relationship(
        "SessionAttendanceRecord",
        back_populates="session",
        cascade="all, delete-orphan"
    )


class SessionAttendanceRecord(Base):
    __tablename__ = "session_attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("class_sessions.id", ondelete="CASCADE"), index=True, nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), index=True, nullable=False)
    status = Column(String, nullable=False, default="Present")  # "Present", "Absent", "Late", "Excused"
    marked_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    marked_at = Column(DateTime, default=datetime.utcnow)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    session = relationship("ClassSession", back_populates="attendance_records")
    student = relationship("Student")
    marker = relationship("User")


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), index=True, nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    reason = Column(Text, nullable=False)
    document_path = Column(String, nullable=True)
    original_filename = Column(String, nullable=True)
    file_type = Column(String, nullable=True)
    file_size = Column(Integer, nullable=True)
    status = Column(String, default="Pending")  # "Pending", "Approved", "Rejected"
    reviewed_by = Column(Integer, ForeignKey("faculty.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    faculty_comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student")
    reviewer = relationship("Faculty")


class AttendanceSetting(Base):
    __tablename__ = "attendance_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True, nullable=False)
    value = Column(String, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

