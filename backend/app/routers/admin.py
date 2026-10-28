"""
Admin router — institution-wide management and analytics.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import json

from ..database import get_db
from ..deps import get_admin
from ..models.user import User, UserRole
from ..models.academic import (
    Student, Faculty, AcademicRecord, AttendanceRecord, AttendanceEntry,
    AssignmentRecord, QuizRecord, SurveyResponse, LMSData,
    Prediction, Alert, Intervention, CounselorReferral,
    DataUpload, ModelVersion, AuditLog
)
from ..schemas.auth import UserCreate, UserResponse
from ..services.auth_service import get_password_hash
from ..schemas.student import DataQualityReport

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/dashboard")
def admin_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_admin)):
    students = db.query(Student).all()
    faculty_count = db.query(Faculty).count()

    # Latest prediction per student in a single query
    preds = db.query(Prediction).order_by(Prediction.student_id, Prediction.created_at.desc()).all()
    latest_risk = {}
    for p in preds:
        if p.student_id not in latest_risk:
            latest_risk[p.student_id] = p.risk_level.value

    risk_dist = {"low": 0, "medium": 0, "high": 0, "unassessed": 0}
    for s in students:
        rl = latest_risk.get(s.id)
        if rl:
            risk_dist[rl] = risk_dist.get(rl, 0) + 1
        else:
            risk_dist["unassessed"] += 1

    # Per-student attendance averages in one query
    att_by = {}
    for sid, pct in db.query(AttendanceRecord.student_id, AttendanceRecord.attendance_percentage).all():
        att_by.setdefault(sid, []).append(pct or 0.0)
    att_avgs = [sum(v) / len(v) for v in att_by.values()]

    # Per-student marks averages in one query
    marks_by = {}
    for sid, total, mx in db.query(
        AcademicRecord.student_id, AcademicRecord.total_marks, AcademicRecord.max_marks
    ).all():
        pct = (total or 0) / (mx or 100) * 100
        marks_by.setdefault(sid, []).append(pct)
    marks_avgs = [sum(v) / len(v) for v in marks_by.values()]

    uploads = db.query(DataUpload).order_by(DataUpload.uploaded_at.desc()).limit(5).all()
    model_info = db.query(ModelVersion).filter(ModelVersion.is_active == True).first()

    return {
        "total_students": len(students),
        "total_faculty": faculty_count,
        "total_users": db.query(User).count(),
        "risk_distribution": risk_dist,
        "overall_avg_attendance": round(sum(att_avgs) / len(att_avgs), 1) if att_avgs else 0,
        "overall_avg_marks": round(sum(marks_avgs) / len(marks_avgs), 1) if marks_avgs else 0,
        "at_risk_count": risk_dist["medium"] + risk_dist["high"],
        "recent_uploads": [
            {"id": u.id, "filename": u.filename, "type": u.upload_type,
             "status": u.status, "rows": u.rows_uploaded, "uploaded_at": u.uploaded_at.isoformat()}
            for u in uploads
        ],
        "model_info": {
            "version": model_info.version, "algorithm": model_info.algorithm,
            "accuracy": model_info.accuracy, "roc_auc": model_info.roc_auc,
            "trained_at": model_info.trained_at.isoformat()
        } if model_info else None,
    }


@router.get("/users", response_model=List[UserResponse])
def list_users(db: Session = Depends(get_db), current_user: User = Depends(get_admin)):
    return db.query(User).all()


@router.post("/users", response_model=UserResponse)
def create_user(data: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(get_admin)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=get_password_hash(data.password),
        role=data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/users/{user_id}/toggle-active")
def toggle_user_active(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    db.commit()
    return {"id": user_id, "is_active": user.is_active}


@router.get("/students")
def list_all_students(db: Session = Depends(get_db), current_user: User = Depends(get_admin)):
    students = db.query(Student).all()
    result = []
    for s in students:
        pred = db.query(Prediction).filter(Prediction.student_id == s.id).order_by(Prediction.created_at.desc()).first()
        result.append({
            "id": s.id,
            "student_id": s.student_id,
            "full_name": s.full_name,
            "email": s.email,
            "semester": s.semester,
            "year": s.year,
            "risk_level": pred.risk_level.value if pred else None,
            "dropout_probability": pred.dropout_probability if pred else None,
        })
    return result


@router.get("/analytics/risk-trends")
def get_risk_trends(db: Session = Depends(get_db), current_user: User = Depends(get_admin)):
    """Get risk distribution over time (by model training dates)."""
    versions = db.query(ModelVersion).order_by(ModelVersion.trained_at).all()
    trends = []
    for mv in versions:
        trends.append({
            "date": mv.trained_at.isoformat()[:10],
            "version": mv.version,
            "accuracy": mv.accuracy,
            "roc_auc": mv.roc_auc,
        })
    return trends


@router.get("/analytics/department-comparison")
def department_comparison(db: Session = Depends(get_db), current_user: User = Depends(get_admin)):
    students = db.query(Student).all()
    preds = db.query(Prediction).order_by(Prediction.student_id, Prediction.created_at.desc()).all()
    latest = {}
    for p in preds:
        if p.student_id not in latest:
            latest[p.student_id] = p

    dept_data = {}
    for s in students:
        dept = s.department or "Unknown"
        if dept not in dept_data:
            dept_data[dept] = {"count": 0, "high_risk": 0, "avg_marks": []}
        dept_data[dept]["count"] += 1

        pred = latest.get(s.id)
        if pred and pred.risk_level.value == "high":
            dept_data[dept]["high_risk"] += 1
        if pred and pred.predicted_score:
            dept_data[dept]["avg_marks"].append(pred.predicted_score)

    result = []
    for dept, data in dept_data.items():
        result.append({
            "department": dept,
            "total": data["count"],
            "high_risk": data["high_risk"],
            "avg_marks": round(sum(data["avg_marks"]) / len(data["avg_marks"]), 1) if data["avg_marks"] else 0,
        })
    return result


@router.get("/data-quality")
def get_data_quality(db: Session = Depends(get_db), current_user: User = Depends(get_admin)):
    from ..ml.preprocessing import preprocess_dataframe, FEATURE_COLUMNS
    from ..ml.preprocessing import build_features_from_db
    import pandas as pd

    students = db.query(Student).all()
    rows = [build_features_from_db(db, s.id) for s in students]
    rows = [r for r in rows if r]
    if not rows:
        return {"error": "No data available"}

    df = pd.DataFrame(rows)
    _, report = preprocess_dataframe(df)
    return report


@router.get("/dsr/export/{student_id}")
def export_student_data(student_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_admin)):
    """Data Subject Access Request (DSAR): Export all personal, academic, and predictive records for a student."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    dossier = {
        "export_metadata": {
            "requested_at": datetime.utcnow().isoformat(),
            "exported_by": current_user.email,
            "legal_basis": "FERPA / Data Subject Access Request (DSAR)",
            "system": "Student Academic Performance & Dropout Risk Predictor"
        },
        "student_profile": {
            "id": student.id,
            "student_id": student.student_id,
            "full_name": student.full_name,
            "email": student.email,
            "gender": student.gender,
            "age": student.age,
            "department": student.department,
            "semester": student.semester,
            "year": student.year,
            "address": student.address,
            "phone": student.phone,
            "guardian_name": student.guardian_name,
            "guardian_phone": student.guardian_phone,
            "created_at": student.created_at.isoformat() if student.created_at else None,
        },
        "academic_records": [
            {
                "subject": r.subject, "semester": r.semester, "year": r.year,
                "internal_marks": r.internal_marks, "external_marks": r.external_marks,
                "total_marks": r.total_marks, "grade": r.grade
            } for r in student.academic_records
        ],
        "attendance_aggregate_records": [
            {
                "subject": r.subject, "semester": r.semester,
                "total_classes": r.total_classes, "attended_classes": r.attended_classes,
                "attendance_percentage": r.attendance_percentage
            } for r in student.attendance_records
        ],
        "attendance_dated_entries": [
            {
                "subject": r.subject, "date": r.session_date.isoformat(),
                "status": r.status
            } for r in student.attendance_entries
        ],
        "assignment_records": [
            {
                "subject": r.subject, "total_assignments": r.total_assignments,
                "submitted_assignments": r.submitted_assignments,
                "late_submissions": r.late_submissions, "avg_score": r.avg_score
            } for r in student.assignment_records
        ],
        "quiz_records": [
            {
                "subject": r.subject, "total_quizzes": r.total_quizzes,
                "attempted_quizzes": r.attempted_quizzes, "avg_score": r.avg_score
            } for r in student.quiz_records
        ],
        "survey_responses": [
            {
                "id": r.id, "stress_level": r.stress_level, "workload_level": r.workload_level,
                "motivation_level": r.motivation_level, "study_hours_per_day": r.study_hours_per_day,
                "support_needed": r.support_needed, "support_type": r.support_type,
                "consent_given": r.consent_given,
                "consent_timestamp": r.consent_timestamp.isoformat() if r.consent_timestamp else None,
                "submitted_at": r.submitted_at.isoformat() if r.submitted_at else None
            } for r in student.survey_responses
        ],
        "lms_telemetry": [
            {
                "login_frequency_per_week": r.login_frequency_per_week,
                "avg_time_spent_hours": r.avg_time_spent_hours,
                "resource_views": r.resource_views, "forum_posts": r.forum_posts,
                "early_submissions": r.early_submissions, "late_submissions": r.late_submissions,
                "recorded_at": r.recorded_at.isoformat() if r.recorded_at else None
            } for r in student.lms_data
        ],
        "ai_predictions": [
            {
                "risk_level": r.risk_level.value, "dropout_probability": r.dropout_probability,
                "predicted_grade_band": r.predicted_grade_band, "pass_probability": r.pass_probability,
                "predicted_score": r.predicted_score,
                "model_version": r.model_version,
                "created_at": r.created_at.isoformat() if r.created_at else None
            } for r in student.predictions
        ],
        "alerts": [
            {
                "alert_type": r.alert_type, "message": r.message,
                "severity": r.severity, "is_read": r.is_read,
                "created_at": r.created_at.isoformat() if r.created_at else None
            } for r in student.alerts
        ],
        "interventions": [
            {
                "message": r.message, "is_acknowledged": r.is_acknowledged,
                "acknowledged_at": r.acknowledged_at.isoformat() if r.acknowledged_at else None,
                "created_at": r.created_at.isoformat() if r.created_at else None
            } for r in student.interventions
        ],
        "counselor_referrals": [
            {
                "reason": r.reason, "status": r.status, "notes": r.notes,
                "created_at": r.created_at.isoformat() if r.created_at else None
            } for r in student.counselor_referrals
        ]
    }

    # Audit log
    audit_entry = AuditLog(
        user_id=current_user.id,
        action="DSR_EXPORT",
        target_type="student",
        target_id=str(student.id),
        details=f"Exported data dossier for student {student.student_id} ({student.full_name}) by admin {current_user.email}"
    )
    db.add(audit_entry)
    db.commit()

    return dossier


@router.delete("/dsr/delete/{student_id}")
def delete_student_data(student_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_admin)):
    """Data Subject Right to Erasure: Permanently purges student and associated academic, predictive, and telemetry records."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    student_code = student.student_id
    student_name = student.full_name
    linked_user_id = student.user_id

    # Create audit record before deleting
    audit_entry = AuditLog(
        user_id=current_user.id,
        action="DSR_DELETE",
        target_type="student",
        target_id=str(student_id),
        details=f"Permanently purged all records for student {student_code} ({student_name}) per Right to Erasure request by admin {current_user.email}"
    )
    db.add(audit_entry)

    # Delete student (cascades to all academic, attendance, prediction, survey, etc. records)
    db.delete(student)
    db.flush()

    # If linked user exists, delete user account as well
    if linked_user_id:
        linked_user = db.query(User).filter(User.id == linked_user_id).first()
        if linked_user:
            db.delete(linked_user)

    db.commit()

    return {
        "status": "success",
        "message": f"Successfully purged all data for student {student_code} ({student_name}) per Data Subject Erasure Request.",
        "student_id": student_id,
        "student_code": student_code
    }


@router.get("/audit-logs")
def list_audit_logs(db: Session = Depends(get_db), current_user: User = Depends(get_admin)):
    """Retrieve system audit logs for administrative actions and data subject requests."""
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(100).all()
    return [
        {
            "id": log.id,
            "user_id": log.user_id,
            "action": log.action,
            "target_type": log.target_type,
            "target_id": log.target_id,
            "details": log.details,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None
        }
        for log in logs
    ]

