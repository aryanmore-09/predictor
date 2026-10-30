"""
Student Service
Handles student details, dashboard aggregation, and personalized recommendation generation.
"""
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
import json

from ..models.academic import (
    Student, AcademicRecord, AttendanceRecord,
    AssignmentRecord, QuizRecord, SurveyResponse, LMSData,
    Prediction, Alert, Intervention
)
from ..ml.predict import get_recommendations


class StudentService:
    @staticmethod
    def get_dashboard_data(db: Session, student: Student) -> Dict[str, Any]:
        """Aggregate student academic stats, prediction, and recommendations."""
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

        att_records = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student.id).all()
        attendance_summary = [
            {"subject": r.subject, "percentage": round(r.attendance_percentage, 1),
             "attended": r.attended_classes, "total": r.total_classes}
            for r in att_records
        ]

        mark_records = db.query(AcademicRecord).filter(AcademicRecord.student_id == student.id).all()
        marks_summary = [
            {"subject": r.subject, "marks": r.total_marks, "max": r.max_marks,
             "percentage": round((r.total_marks or 0) / (r.max_marks or 100) * 100, 1), "grade": r.grade}
            for r in mark_records
        ]

        alerts = db.query(Alert).filter(Alert.student_id == student.id).order_by(Alert.created_at.desc()).limit(10).all()
        alert_data = [{"id": a.id, "alert_type": a.alert_type, "message": a.message,
                       "severity": a.severity, "is_read": a.is_read, "created_at": a.created_at.isoformat()} for a in alerts]

        recommendations = []
        if pred_data:
            factors = pred_data.get("top_factors", [])
            feat_dict = {f["feature"]: f.get("value", 0) for f in factors if isinstance(f, dict) and "feature" in f}
            recommendations = get_recommendations(feat_dict, pred_data["risk_level"])

        return {
            "student": {
                "id": student.id,
                "student_id": student.student_id,
                "full_name": student.full_name,
                "email": student.email,
                "semester": student.semester,
                "year": student.year,
                "department": student.department or "Computer Science & Engineering",
            },
            "prediction": pred_data,
            "alerts": alert_data,
            "attendance_summary": attendance_summary,
            "marks_summary": marks_summary,
            "recommendations": recommendations,
        }
