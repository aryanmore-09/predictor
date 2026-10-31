"""
Faculty router — faculty-facing endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import json

from ..database import get_db
from ..deps import get_faculty_or_admin, get_current_user
from ..models.user import User, UserRole
from ..models.academic import (
    Student, AcademicRecord, AttendanceRecord, Prediction,
    Intervention, CounselorReferral, Faculty, Alert, Notification
)
from ..schemas.student import (
    StudentSummary, InterventionCreate, InterventionResponse,
    CounselorReferralCreate, CounselorReferralResponse, CounselorReferralUpdate,
    AcademicRecordCreate, AcademicRecordResponse, AttendanceCreate, AttendanceResponse
)

router = APIRouter(prefix="/api/faculty", tags=["faculty"])


def _get_faculty(db: Session, user: User) -> Faculty:
    fac = db.query(Faculty).filter(Faculty.user_id == user.id).first()
    if not fac:
        raise HTTPException(status_code=404, detail="Faculty profile not found")
    return fac


@router.get("/dashboard")
def faculty_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_faculty_or_admin)):
    students = db.query(Student).all()

    risk_dist = {"low": 0, "medium": 0, "high": 0, "unassessed": 0}
    student_summaries = []
    total_att = []
    total_marks = []

    for s in students:
        pred = db.query(Prediction).filter(Prediction.student_id == s.id).order_by(Prediction.created_at.desc()).first()
        att = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == s.id).all()
        marks = db.query(AcademicRecord).filter(AcademicRecord.student_id == s.id).all()

        avg_att = sum(r.attendance_percentage for r in att) / len(att) if att else None
        avg_marks = sum((r.total_marks or 0) / (r.max_marks or 100) * 100 for r in marks) / len(marks) if marks else None

        if avg_att is not None:
            total_att.append(avg_att)
        if avg_marks is not None:
            total_marks.append(avg_marks)

        risk_level = pred.risk_level.value if pred else None
        if risk_level:
            risk_dist[risk_level] = risk_dist.get(risk_level, 0) + 1
        else:
            risk_dist["unassessed"] += 1

        student_summaries.append({
            "id": s.id,
            "student_id": s.student_id,
            "full_name": s.full_name,
            "email": s.email,
            "semester": s.semester,
            "risk_level": risk_level,
            "dropout_probability": pred.dropout_probability if pred else None,
            "pass_probability": pred.pass_probability if pred else None,
            "attendance_percentage": round(avg_att, 1) if avg_att else None,
            "avg_marks": round(avg_marks, 1) if avg_marks else None,
        })

    at_risk = [s for s in student_summaries if s["risk_level"] in ["medium", "high"]]
    at_risk.sort(key=lambda x: x.get("dropout_probability") or 0, reverse=True)

    return {
        "total_students": len(students),
        "risk_distribution": risk_dist,
        "at_risk_students": at_risk,
        "all_students": student_summaries,
        "class_avg_attendance": round(sum(total_att) / len(total_att), 1) if total_att else 0,
        "class_avg_marks": round(sum(total_marks) / len(total_marks), 1) if total_marks else 0,
    }


@router.get("/students")
def list_students(
    risk_level: Optional[str] = None,
    search: Optional[str] = None,
    semester: Optional[int] = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_faculty_or_admin)
):
    """Paginated student directory. Bulk-loads predictions/attendance/marks to avoid N+1."""
    page = max(1, int(page))
    page_size = max(1, min(100, int(page_size)))

    q = db.query(Student)
    if semester:
        q = q.filter(Student.semester == semester)
    students = q.all()

    # Latest prediction per student (single query)
    pred_rows = db.query(Prediction).order_by(Prediction.student_id, Prediction.created_at.desc()).all()
    pred_by = {}
    for p in pred_rows:
        if p.student_id not in pred_by:
            pred_by[p.student_id] = p

    # Attendance and marks aggregates (single query each)
    att_by = {}
    for sid, pct in db.query(AttendanceRecord.student_id, AttendanceRecord.attendance_percentage).all():
        att_by.setdefault(sid, []).append(pct or 0.0)
    marks_by = {}
    for sid, total, mx in db.query(
        AcademicRecord.student_id, AcademicRecord.total_marks, AcademicRecord.max_marks
    ).all():
        marks_by.setdefault(sid, []).append((total or 0) / (mx or 100) * 100)

    result = []
    search_l = search.lower() if search else None
    for s in students:
        pred = pred_by.get(s.id)
        rl = pred.risk_level.value if pred else None
        if risk_level and rl != risk_level:
            continue
        if search_l and search_l not in s.full_name.lower() and search_l not in s.student_id.lower():
            continue

        att_list = att_by.get(s.id, [])
        marks_list = marks_by.get(s.id, [])
        avg_att = sum(att_list) / len(att_list) if att_list else None
        avg_marks = sum(marks_list) / len(marks_list) if marks_list else None

        result.append(StudentSummary(
            id=s.id, student_id=s.student_id, full_name=s.full_name, email=s.email,
            semester=s.semester, risk_level=rl,
            dropout_probability=pred.dropout_probability if pred else None,
            pass_probability=pred.pass_probability if pred else None,
            attendance_percentage=round(avg_att, 1) if avg_att is not None else None,
            avg_marks=round(avg_marks, 1) if avg_marks is not None else None,
        ))

    total = len(result)
    pages = max(1, (total + page_size - 1) // page_size)
    page = min(page, pages)
    start = (page - 1) * page_size
    return {
        "items": result[start:start + page_size],
        "total": total,
        "page": page,
        "pages": pages,
        "page_size": page_size,
    }


@router.get("/students/{student_id}/detail")
def get_student_detail(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_faculty_or_admin)
):
    from ..routers.students import _build_student_dashboard
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    dashboard = _build_student_dashboard(db, student)

    # Add intervention history
    interventions = db.query(Intervention).filter(Intervention.student_id == student_id).order_by(Intervention.created_at.desc()).all()
    dashboard["interventions"] = [
        {"id": i.id, "message": i.message, "is_acknowledged": i.is_acknowledged, "created_at": i.created_at.isoformat()}
        for i in interventions
    ]

    # Add referrals
    referrals = db.query(CounselorReferral).filter(CounselorReferral.student_id == student_id).all()
    dashboard["referrals"] = [
        {"id": r.id, "reason": r.reason, "status": r.status, "notes": r.notes, "created_at": r.created_at.isoformat()}
        for r in referrals
    ]

    return dashboard


@router.post("/interventions", response_model=InterventionResponse)
def send_intervention(
    data: InterventionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_faculty_or_admin)
):
    faculty = _get_faculty(db, current_user) if current_user.role == UserRole.faculty else None
    student = db.query(Student).filter(Student.id == data.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    intv = Intervention(
        student_id=data.student_id,
        faculty_id=faculty.id if faculty else None,
        message=data.message,
    )
    db.add(intv)

    # Create notification for student
    if student.user_id:
        notif = Notification(
            user_id=student.user_id,
            student_id=student.id,
            title="New Message from Faculty",
            body=data.message[:200],
            notification_type="intervention",
        )
        db.add(notif)

    db.commit()
    db.refresh(intv)
    return intv


@router.post("/referrals", response_model=CounselorReferralResponse)
def create_referral(
    data: CounselorReferralCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_faculty_or_admin)
):
    faculty = _get_faculty(db, current_user) if current_user.role == UserRole.faculty else None
    referral = CounselorReferral(
        student_id=data.student_id,
        referred_by_id=faculty.id if faculty else None,
        reason=data.reason,
    )
    db.add(referral)
    db.commit()
    db.refresh(referral)
    return referral


@router.put("/referrals/{referral_id}", response_model=CounselorReferralResponse)
def update_referral(
    referral_id: int,
    data: CounselorReferralUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_faculty_or_admin)
):
    ref = db.query(CounselorReferral).filter(CounselorReferral.id == referral_id).first()
    if not ref:
        raise HTTPException(status_code=404, detail="Referral not found")
    ref.status = data.status
    if data.notes:
        ref.notes = data.notes
    db.commit()
    db.refresh(ref)
    return ref


@router.post("/marks", response_model=AcademicRecordResponse)
def add_marks(
    data: AcademicRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_faculty_or_admin)
):
    # Check if record exists, update if so
    existing = db.query(AcademicRecord).filter(
        AcademicRecord.student_id == data.student_id,
        AcademicRecord.subject == data.subject,
        AcademicRecord.semester == data.semester,
        AcademicRecord.year == data.year,
    ).first()
    if existing:
        for key, val in data.model_dump(exclude={"student_id"}).items():
            setattr(existing, key, val)
        db.commit()
        db.refresh(existing)
        return existing

    record = AcademicRecord(**data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.post("/attendance", response_model=AttendanceResponse)
def update_attendance(
    data: AttendanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_faculty_or_admin)
):
    existing = db.query(AttendanceRecord).filter(
        AttendanceRecord.student_id == data.student_id,
        AttendanceRecord.subject == data.subject,
        AttendanceRecord.semester == data.semester,
    ).first()
    if existing:
        existing.total_classes = data.total_classes
        existing.attended_classes = data.attended_classes
        existing.attendance_percentage = (data.attended_classes / data.total_classes * 100) if data.total_classes > 0 else 0
        db.commit()
        db.refresh(existing)
        return existing

    record = AttendanceRecord(
        **data.model_dump(exclude={"attendance_percentage"}),
        attendance_percentage=(data.attended_classes / data.total_classes * 100) if data.total_classes > 0 else 0
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
