"""
Reports router — PDF/CSV/Excel export.
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io
import csv
import json
from datetime import datetime

from ..database import get_db
from ..deps import get_faculty_or_admin
from ..models.user import User
from ..models.academic import Student, AcademicRecord, AttendanceRecord, Prediction

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/students/csv")
def export_students_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_faculty_or_admin)
):
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

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=students_report_{datetime.now().strftime('%Y%m%d')}.csv"}
    )


@router.get("/student/{student_id}/csv")
def export_student_detail_csv(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_faculty_or_admin)
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["=== STUDENT REPORT ==="])
    writer.writerow(["Generated", datetime.now().strftime("%Y-%m-%d %H:%M")])
    writer.writerow([])
    writer.writerow(["Student ID", "Name", "Email", "Semester"])
    writer.writerow([student.student_id, student.full_name, student.email, student.semester])
    writer.writerow([])

    pred = db.query(Prediction).filter(Prediction.student_id == student_id).order_by(Prediction.created_at.desc()).first()
    if pred:
        writer.writerow(["=== PREDICTION ==="])
        writer.writerow(["Risk Level", "Dropout Prob", "Grade Band", "Pass Prob"])
        writer.writerow([pred.risk_level.value, round(pred.dropout_probability, 3),
                         pred.predicted_grade_band, round(pred.pass_probability or 0, 3)])
        writer.writerow([])

    writer.writerow(["=== MARKS ==="])
    writer.writerow(["Subject", "Total Marks", "Max Marks", "Percentage", "Grade"])
    marks = db.query(AcademicRecord).filter(AcademicRecord.student_id == student_id).all()
    for m in marks:
        pct = (m.total_marks or 0) / (m.max_marks or 100) * 100
        writer.writerow([m.subject, m.total_marks, m.max_marks, round(pct, 1), m.grade])
    writer.writerow([])

    writer.writerow(["=== ATTENDANCE ==="])
    writer.writerow(["Subject", "Attended", "Total", "Percentage"])
    att_records = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student_id).all()
    for a in att_records:
        writer.writerow([a.subject, a.attended_classes, a.total_classes, round(a.attendance_percentage, 1)])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=student_{student.student_id}_report.csv"}
    )


@router.get("/institutional/csv")
def export_institutional_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_faculty_or_admin)
):
    students = db.query(Student).all()
    risk_counts = {"low": 0, "medium": 0, "high": 0, "unassessed": 0}

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["=== INSTITUTIONAL SUMMARY REPORT ==="])
    writer.writerow(["MIT School of Computing — Dept. of CSE"])
    writer.writerow(["Generated", datetime.now().strftime("%Y-%m-%d %H:%M")])
    writer.writerow([])
    writer.writerow(["Total Students", len(students)])

    for s in students:
        pred = db.query(Prediction).filter(Prediction.student_id == s.id).order_by(Prediction.created_at.desc()).first()
        rl = pred.risk_level.value if pred else "unassessed"
        risk_counts[rl] = risk_counts.get(rl, 0) + 1

    writer.writerow([])
    writer.writerow(["=== RISK DISTRIBUTION ==="])
    for level, count in risk_counts.items():
        writer.writerow([level.title(), count, f"{round(count/len(students)*100, 1) if students else 0}%"])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=institutional_report_{datetime.now().strftime('%Y%m%d')}.csv"}
    )
