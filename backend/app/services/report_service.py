"""
Report Service
Generates structured datasets for reporting and export.
"""
import io
import csv
from datetime import datetime
from sqlalchemy.orm import Session
from ..models.academic import Student, AcademicRecord, AttendanceRecord, Prediction


class ReportService:
    @staticmethod
    def generate_students_csv(db: Session) -> str:
        students = db.query(Student).all()
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["student_id", "full_name", "email", "semester", "year", "risk_level",
                         "dropout_prob", "pass_prob", "avg_marks", "avg_attendance"])

        for s in students:
            pred = db.query(Prediction).filter(Prediction.student_id == s.id).order_by(Prediction.created_at.desc()).first()
            att = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == s.id).all()
            marks = db.query(AcademicRecord).filter(AcademicRecord.student_id == s.id).all()
            avg_att = sum(r.attendance_percentage for r in att) / len(att) if att else 0
            avg_marks = sum((r.total_marks or 0) / (r.max_marks or 100) * 100 for r in marks) / len(marks) if marks else 0
            writer.writerow([
                s.student_id, s.full_name, s.email, s.semester, s.year,
                pred.risk_level.value if pred else "unassessed",
                round(pred.dropout_probability, 3) if pred else "",
                round(pred.pass_probability, 3) if pred else "",
                round(avg_marks, 1), round(avg_att, 1)
            ])
        return output.getvalue()
