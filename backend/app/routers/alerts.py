"""
Alerts router — dedicated endpoints for alerts and notifications.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..deps import get_current_user, get_faculty_or_admin
from ..models.user import User, UserRole
from ..models.academic import Alert, Student
from ..schemas.student import AlertResponse
from ..services.alert_service import AlertService

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("/", response_model=List[AlertResponse])
def get_all_alerts(
    severity: Optional[str] = Query(None),
    unread_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_faculty_or_admin)
):
    """Faculty/Admin: view institutional alerts."""
    q = db.query(Alert)
    if severity:
        q = q.filter(Alert.severity == severity)
    if unread_only:
        q = q.filter(Alert.is_read == False)
    return q.order_by(Alert.created_at.desc()).limit(100).all()


@router.get("/student/{student_id}", response_model=List[AlertResponse])
def get_student_alerts(
    student_id: int,
    unread_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_faculty_or_admin)
):
    """Faculty/Admin: view alerts for a specific student."""
    return AlertService.get_student_alerts(db, student_id, unread_only=unread_only)


@router.put("/{alert_id}/read")
def mark_alert_read(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark an alert as read."""
    student_id = None
    if current_user.role == UserRole.student:
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if student:
            student_id = student.id

    success = AlertService.mark_read(db, alert_id, student_id=student_id)
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"status": "ok", "alert_id": alert_id}
