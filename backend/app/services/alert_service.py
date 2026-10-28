"""
Alert Service
Manages automated alert generation, threshold checks, notifications, and alert resolution.
"""
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from ..models.academic import Alert, Notification, Student, RiskLevel


class AlertService:
    @staticmethod
    def evaluate_and_create_alerts(
        db: Session,
        student_id: int,
        risk_level: str,
        features: dict
    ) -> List[Alert]:
        """Check thresholds and generate alerts for a student."""
        created_alerts = []
        student = db.query(Student).filter(Student.id == student_id).first()

        # 1. Risk Level Alert
        if risk_level in ["medium", "high"]:
            existing = db.query(Alert).filter(
                Alert.student_id == student_id,
                Alert.alert_type == "risk_level",
                Alert.severity == risk_level,
                Alert.is_read == False
            ).first()
            if not existing:
                msg = (
                    f"Student is at {risk_level.upper()} dropout risk. "
                    + ("Urgent counseling required." if risk_level == "high" else "Proactive mentoring recommended.")
                )
                alert = Alert(student_id=student_id, alert_type="risk_level", message=msg, severity=risk_level)
                db.add(alert)
                created_alerts.append(alert)

        # 2. Low Attendance Alert (< 75%)
        att = features.get("attendance_percentage", 100)
        if att < 75.0:
            existing = db.query(Alert).filter(
                Alert.student_id == student_id,
                Alert.alert_type == "low_attendance",
                Alert.is_read == False
            ).first()
            if not existing:
                severity = "high" if att < 60.0 else "medium"
                alert = Alert(
                    student_id=student_id,
                    alert_type="low_attendance",
                    message=f"Attendance dropped to {att:.1f}% (mandatory threshold is 75%).",
                    severity=severity
                )
                db.add(alert)
                created_alerts.append(alert)

        # 3. High Stress / Low Wellbeing Alert
        stress = features.get("stress_score", 1)
        if stress >= 4:
            existing = db.query(Alert).filter(
                Alert.student_id == student_id,
                Alert.alert_type == "wellness",
                Alert.is_read == False
            ).first()
            if not existing:
                alert = Alert(
                    student_id=student_id,
                    alert_type="wellness",
                    message=f"High stress level ({stress}/5) reported in self-assessment. Consider wellness counseling.",
                    severity="medium"
                )
                db.add(alert)
                created_alerts.append(alert)

        # Dispatch student notifications for any created alerts
        if student and student.user_id:
            for al in created_alerts:
                notif = Notification(
                    user_id=student.user_id,
                    student_id=student_id,
                    title=f"Academic Alert: {al.alert_type.replace('_', ' ').title()}",
                    body=al.message[:200],
                    notification_type="alert"
                )
                db.add(notif)

        db.commit()
        return created_alerts

    @staticmethod
    def get_student_alerts(db: Session, student_id: int, unread_only: bool = False) -> List[Alert]:
        q = db.query(Alert).filter(Alert.student_id == student_id)
        if unread_only:
            q = q.filter(Alert.is_read == False)
        return q.order_by(Alert.created_at.desc()).all()

    @staticmethod
    def mark_read(db: Session, alert_id: int, student_id: Optional[int] = None) -> bool:
        q = db.query(Alert).filter(Alert.id == alert_id)
        if student_id:
            q = q.filter(Alert.student_id == student_id)
        alert = q.first()
        if alert:
            alert.is_read = True
            db.commit()
            return True
        return False
