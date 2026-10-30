"""
Students router — student-facing endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import json

from ..database import get_db
from ..deps import get_current_user, get_faculty_or_admin
from ..models.user import User, UserRole
from ..models.academic import (
    Student, AcademicRecord, AttendanceRecord, AssignmentRecord,
    QuizRecord, SurveyResponse, LMSData, Prediction, Alert,
    Intervention, Notification
)
from ..schemas.student import (
    StudentResponse, StudentSummary, SurveyCreate, SurveyResponse as SurveyResponseSchema,
    AlertResponse, InterventionResponse, NotificationResponse, StudentDashboard
)
from ..config import settings
from ..ml.predict import predict_student, get_recommendations

from datetime import datetime

router = APIRouter(prefix="/api/students", tags=["students"])


def _get_student_for_user(db: Session, user: User) -> Student:
    student = db.query(Student).filter(Student.user_id == user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return student


@router.get("/me", response_model=StudentResponse)
def get_my_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Students only")
    return _get_student_for_user(db, current_user)


@router.get("/me/dashboard")
def get_my_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Students only")
    student = _get_student_for_user(db, current_user)
    return _build_student_dashboard(db, student)


def _build_student_dashboard(db: Session, student: Student) -> dict:
    # Latest prediction
    pred = db.query(Prediction).filter(Prediction.student_id == student.id).order_by(Prediction.created_at.desc()).first()
    pred_data = None
    if pred:
        pred_data = {
            "risk_level": pred.risk_level.value if pred.risk_level else "low",
            "dropout_probability": pred.dropout_probability,
            "predicted_grade_band": pred.predicted_grade_band,
            "pass_probability": pred.pass_probability,
            "predicted_score": pred.predicted_score,
            "top_factors": json.loads(pred.top_factors) if pred.top_factors else [],
        }

    # Attendance summary
    att_records = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student.id).all()
    attendance_summary = [
        {"subject": r.subject, "percentage": round(r.attendance_percentage, 1),
         "attended": r.attended_classes, "total": r.total_classes}
        for r in att_records
    ]

    # Marks summary
    mark_records = db.query(AcademicRecord).filter(AcademicRecord.student_id == student.id).all()
    marks_summary = [
        {"subject": r.subject, "marks": r.total_marks, "max": r.max_marks,
         "percentage": round((r.total_marks or 0) / (r.max_marks or 100) * 100, 1), "grade": r.grade}
        for r in mark_records
    ]

    # Alerts
    alerts = db.query(Alert).filter(Alert.student_id == student.id).order_by(Alert.created_at.desc()).limit(10).all()
    alert_data = [{"id": a.id, "alert_type": a.alert_type, "message": a.message,
                   "severity": a.severity, "is_read": a.is_read, "created_at": a.created_at.isoformat()} for a in alerts]

    # Recommendations
    recommendations = []
    if pred_data:
        factors = pred_data.get("top_factors", [])
        feat_dict = {f["feature"]: f.get("value", 0) for f in factors if isinstance(f, dict) and "feature" in f}
        recommendations = get_recommendations(feat_dict, pred_data["risk_level"])

    return {
        "student": {
            "id": student.id, "student_id": student.student_id,
            "full_name": student.full_name, "email": student.email,
            "semester": student.semester, "year": student.year,
            "department": student.department,
        },
        "prediction": pred_data,
        "alerts": alert_data,
        "attendance_summary": attendance_summary,
        "marks_summary": marks_summary,
        "recommendations": recommendations,
    }


@router.post("/me/survey", response_model=SurveyResponseSchema)
def submit_survey(
    data: SurveyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Students only")
    if not data.consent_given:
        raise HTTPException(
            status_code=400,
            detail="Consent is required to submit survey responses for academic support."
        )
    student = _get_student_for_user(db, current_user)
    survey_data = data.model_dump()
    survey_data["consent_timestamp"] = datetime.utcnow()
    survey = SurveyResponse(**survey_data, student_id=student.id)
    db.add(survey)
    db.commit()
    db.refresh(survey)
    return survey


@router.get("/me/alerts", response_model=List[AlertResponse])
def get_my_alerts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Students only")
    student = _get_student_for_user(db, current_user)
    return db.query(Alert).filter(Alert.student_id == student.id).order_by(Alert.created_at.desc()).limit(20).all()


@router.post("/me/alerts/{alert_id}/read")
def mark_alert_read(alert_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student = _get_student_for_user(db, current_user)
    alert = db.query(Alert).filter(Alert.id == alert_id, Alert.student_id == student.id).first()
    if alert:
        alert.is_read = True
        db.commit()
    return {"status": "ok"}


@router.get("/me/interventions", response_model=List[InterventionResponse])
def get_my_interventions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student = _get_student_for_user(db, current_user)
    return db.query(Intervention).filter(Intervention.student_id == student.id).order_by(Intervention.created_at.desc()).all()


@router.post("/me/interventions/{intervention_id}/acknowledge")
def acknowledge_intervention(
    intervention_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from datetime import datetime
    student = _get_student_for_user(db, current_user)
    intv = db.query(Intervention).filter(
        Intervention.id == intervention_id,
        Intervention.student_id == student.id
    ).first()
    if intv:
        intv.is_acknowledged = True
        intv.acknowledged_at = datetime.utcnow()
        db.commit()
    return {"status": "acknowledged"}


@router.get("/me/notifications", response_model=List[NotificationResponse])
def get_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(30).all()


@router.post("/me/notifications/{notif_id}/read")
def mark_notification_read(notif_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notif = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.user_id == current_user.id
    ).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"status": "ok"}
