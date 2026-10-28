"""
Upload router — CSV/Excel data upload with validation.
"""
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
import pandas as pd
import io
import os
import json
from datetime import datetime

from ..database import get_db
from ..deps import get_admin, get_faculty_or_admin
from ..models.user import User
from ..models.academic import (
    Student, AcademicRecord, AttendanceRecord, AssignmentRecord,
    QuizRecord, LMSData, DataUpload
)

router = APIRouter(prefix="/api/upload", tags=["upload"])

TEMPLATE_COLUMNS = {
    "students": ["student_id", "full_name", "email", "gender", "age", "semester", "year", "phone"],
    "attendance": ["student_id", "subject", "semester", "year", "total_classes", "attended_classes"],
    "marks": ["student_id", "subject", "semester", "year", "internal_marks", "external_marks", "total_marks", "max_marks", "grade"],
    "assignments": ["student_id", "subject", "semester", "total_assignments", "submitted_assignments", "late_submissions", "avg_score"],
    "quizzes": ["student_id", "subject", "semester", "total_quizzes", "attempted_quizzes", "avg_score"],
    "lms": ["student_id", "semester", "login_frequency_per_week", "avg_time_spent_hours", "resource_views", "forum_posts", "early_submissions", "late_submissions"],
}


@router.get("/template/{upload_type}")
def download_template(upload_type: str):
    if upload_type not in TEMPLATE_COLUMNS:
        raise HTTPException(status_code=400, detail=f"Unknown type. Choose from: {list(TEMPLATE_COLUMNS.keys())}")

    # Generate CSV template
    df = pd.DataFrame(columns=TEMPLATE_COLUMNS[upload_type])
    path = f"/tmp/template_{upload_type}.csv"
    df.to_csv(path, index=False)
    return FileResponse(path, media_type="text/csv", filename=f"template_{upload_type}.csv")


@router.post("/csv")
async def upload_csv(
    file: UploadFile = File(...),
    upload_type: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_faculty_or_admin)
):
    if upload_type not in TEMPLATE_COLUMNS:
        raise HTTPException(status_code=400, detail=f"Unknown type. Choose from: {list(TEMPLATE_COLUMNS.keys())}")

    content = await file.read()
    try:
        if file.filename.endswith(".xlsx") or file.filename.endswith(".xls"):
            df = pd.read_excel(io.BytesIO(content))
        else:
            df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse file: {str(e)}")

    # Column validation
    required_cols = TEMPLATE_COLUMNS[upload_type]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing columns: {missing}")

    upload_record = DataUpload(
        filename=file.filename,
        upload_type=upload_type,
        status="processing",
        uploaded_by=current_user.id,
    )
    db.add(upload_record)
    db.commit()
    db.refresh(upload_record)

    rows_uploaded = 0
    rows_failed = 0
    errors = []

    for idx, row in df.iterrows():
        try:
            _process_row(db, row, upload_type)
            rows_uploaded += 1
        except Exception as e:
            rows_failed += 1
            errors.append(f"Row {idx + 2}: {str(e)}")

    db.commit()

    upload_record.status = "completed" if rows_failed == 0 else "partial"
    upload_record.rows_uploaded = rows_uploaded
    upload_record.rows_failed = rows_failed
    upload_record.error_report = json.dumps(errors[:50])
    db.commit()

    return {
        "upload_id": upload_record.id,
        "status": upload_record.status,
        "rows_uploaded": rows_uploaded,
        "rows_failed": rows_failed,
        "errors": errors[:20],
    }


def _process_row(db: Session, row: pd.Series, upload_type: str):
    def get(col, default=None):
        val = row.get(col, default)
        return None if pd.isna(val) else val

    if upload_type == "students":
        student_id = str(get("student_id", "")).strip()
        existing = db.query(Student).filter(Student.student_id == student_id).first()
        if not existing:
            s = Student(
                student_id=student_id,
                full_name=str(get("full_name", "Unknown")),
                email=str(get("email", f"{student_id}@mit.edu")),
                gender=get("gender"),
                age=int(get("age", 20)) if get("age") else None,
                semester=int(get("semester", 1)) if get("semester") else None,
                year=int(get("year", 1)) if get("year") else None,
                phone=get("phone"),
            )
            db.add(s)
            db.flush()

    elif upload_type == "attendance":
        student_id = str(get("student_id", "")).strip()
        student = db.query(Student).filter(Student.student_id == student_id).first()
        if not student:
            raise ValueError(f"Student {student_id} not found")
        total = int(get("total_classes", 0) or 0)
        attended = int(get("attended_classes", 0) or 0)
        existing = db.query(AttendanceRecord).filter(
            AttendanceRecord.student_id == student.id,
            AttendanceRecord.subject == str(get("subject")),
            AttendanceRecord.semester == int(get("semester", 1)),
        ).first()
        if existing:
            existing.total_classes = total
            existing.attended_classes = attended
            existing.attendance_percentage = (attended / total * 100) if total > 0 else 0
        else:
            db.add(AttendanceRecord(
                student_id=student.id,
                subject=str(get("subject")),
                semester=int(get("semester", 1)),
                year=int(get("year", 2024)),
                total_classes=total,
                attended_classes=attended,
                attendance_percentage=(attended / total * 100) if total > 0 else 0,
            ))

    elif upload_type == "marks":
        student_id = str(get("student_id", "")).strip()
        student = db.query(Student).filter(Student.student_id == student_id).first()
        if not student:
            raise ValueError(f"Student {student_id} not found")
        existing = db.query(AcademicRecord).filter(
            AcademicRecord.student_id == student.id,
            AcademicRecord.subject == str(get("subject")),
            AcademicRecord.semester == int(get("semester", 1)),
        ).first()
        if existing:
            existing.total_marks = float(get("total_marks") or 0)
            existing.internal_marks = float(get("internal_marks") or 0) if get("internal_marks") else None
            existing.external_marks = float(get("external_marks") or 0) if get("external_marks") else None
            existing.grade = get("grade")
        else:
            db.add(AcademicRecord(
                student_id=student.id,
                subject=str(get("subject")),
                semester=int(get("semester", 1)),
                year=int(get("year", 2024)),
                internal_marks=float(get("internal_marks") or 0) if get("internal_marks") else None,
                external_marks=float(get("external_marks") or 0) if get("external_marks") else None,
                total_marks=float(get("total_marks") or 0),
                max_marks=float(get("max_marks") or 100),
                grade=get("grade"),
            ))

    elif upload_type == "assignments":
        student_id = str(get("student_id", "")).strip()
        student = db.query(Student).filter(Student.student_id == student_id).first()
        if not student:
            raise ValueError(f"Student {student_id} not found")
        db.add(AssignmentRecord(
            student_id=student.id,
            subject=str(get("subject")),
            semester=int(get("semester", 1)),
            total_assignments=int(get("total_assignments", 0) or 0),
            submitted_assignments=int(get("submitted_assignments", 0) or 0),
            late_submissions=int(get("late_submissions", 0) or 0),
            avg_score=float(get("avg_score", 0) or 0),
        ))

    elif upload_type == "quizzes":
        student_id = str(get("student_id", "")).strip()
        student = db.query(Student).filter(Student.student_id == student_id).first()
        if not student:
            raise ValueError(f"Student {student_id} not found")
        db.add(QuizRecord(
            student_id=student.id,
            subject=str(get("subject")),
            semester=int(get("semester", 1)),
            total_quizzes=int(get("total_quizzes", 0) or 0),
            attempted_quizzes=int(get("attempted_quizzes", 0) or 0),
            avg_score=float(get("avg_score", 0) or 0),
        ))

    elif upload_type == "lms":
        student_id = str(get("student_id", "")).strip()
        student = db.query(Student).filter(Student.student_id == student_id).first()
        if not student:
            raise ValueError(f"Student {student_id} not found")
        db.add(LMSData(
            student_id=student.id,
            semester=int(get("semester", 1)) if get("semester") else None,
            login_frequency_per_week=float(get("login_frequency_per_week", 0) or 0),
            avg_time_spent_hours=float(get("avg_time_spent_hours", 0) or 0),
            resource_views=int(get("resource_views", 0) or 0),
            forum_posts=int(get("forum_posts", 0) or 0),
            early_submissions=int(get("early_submissions", 0) or 0),
            late_submissions=int(get("late_submissions", 0) or 0),
        ))


@router.post("/lms-sync/{student_id}")
def lms_mock_sync(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_faculty_or_admin)
):
    """Mock LMS sync endpoint — generates synthetic engagement data."""
    import random
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    lms = LMSData(
        student_id=student_id,
        login_frequency_per_week=round(random.uniform(1, 10), 1),
        avg_time_spent_hours=round(random.uniform(0.5, 5.0), 1),
        resource_views=random.randint(5, 50),
        forum_posts=random.randint(0, 10),
        forum_views=random.randint(5, 30),
        early_submissions=random.randint(0, 5),
        late_submissions=random.randint(0, 3),
    )
    db.add(lms)
    db.commit()
    return {"status": "synced", "student_id": student_id, "data": {
        "login_frequency_per_week": lms.login_frequency_per_week,
        "avg_time_spent_hours": lms.avg_time_spent_hours,
        "resource_views": lms.resource_views,
        "forum_posts": lms.forum_posts,
    }}
