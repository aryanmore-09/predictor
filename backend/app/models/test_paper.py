from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base


class TestPaper(Base):
    __tablename__ = "test_papers"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    subject = Column(String(100), nullable=False)
    exam_type = Column(String(50), nullable=False)  # Unit Test, Midterm, Quiz, Assignment, Endterm
    exam_date = Column(DateTime, nullable=False)
    marks_obtained = Column(Float, nullable=False)
    max_marks = Column(Float, nullable=False)
    file_path = Column(String(500), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_type = Column(String(100), nullable=False)
    file_size = Column(Integer, nullable=False)
    remarks = Column(Text, nullable=True)
    status = Column(String(20), default="Pending", index=True)  # Pending, Verified, Rejected
    verified_by = Column(Integer, ForeignKey("faculty.id"), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    faculty_comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", backref="test_papers")
    verifier = relationship("Faculty", foreign_keys=[verified_by])

