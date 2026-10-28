"""
Attendance Router
Provides complete endpoints for Students, Faculty, and Administrators.
"""
import csv
import io
from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, get_faculty_or_admin, get_admin
from ..models.user import User, UserRole
from ..models.academic import Student, Faculty, Alert, Notification
from ..models.attendance import (
    ClassSession, SessionAttendanceRecord, LeaveRequest, Course
)
from ..schemas.attendance import (
    AttendanceSummaryResponse, SubjectAttendanceResponse, CalendarDayItem,
    AttendanceTrendPoint, PaginatedAttendanceRecords, LeaveRequestResponse,
    ClassSessionCreate, ClassSessionResponse, SessionStudentItem,
    BulkAttendanceMarkRequest, DefaulterStudentItem, AttendanceAnalyticsResponse,
    ThresholdUpdateRequest
)
from ..services.attendance_service import AttendanceService, LEAVE_UPLOAD_DIR

router = APIRouter(prefix="/api/attendance", tags=["attendance"])


def _get_student(db: Session, user: User) -> Student:
    student = db.query(Student).filter(Student.user_id == user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return student


def _get_faculty(db: Session, user: User) -> Faculty:
    faculty = db.query(Faculty).filter(Faculty.user_id == user.id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty profile not found")
    return faculty


# ─── Student Endpoints ────────────────────────────────────────────────────────

@router.get("/me/summary", response_model=AttendanceSummaryResponse)
def get_my_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Overall %, total/attended/missed classes, status label (Safe / Warning / Critical)."""
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Student access only")
    student = _get_student(db, current_user)
    AttendanceService.ensure_backfill(db)
    return AttendanceService.get_student_summary(db, student.id)


@router.get("/me/subjects", response_model=List[SubjectAttendanceResponse])
def get_my_subjects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Subject-wise attended, total, %, and classes needed / can miss."""
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Student access only")
    student = _get_student(db, current_user)
    AttendanceService.ensure_backfill(db)
    return AttendanceService.get_student_subjects(db, student.id)


@router.get("/me/calendar", response_model=List[CalendarDayItem])
def get_my_calendar(
    month: Optional[str] = Query(None, description="YYYY-MM filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Day-by-day attendance status for interactive calendar heatmap."""
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Student access only")
    student = _get_student(db, current_user)
    AttendanceService.ensure_backfill(db)
    return AttendanceService.get_student_calendar(db, student.id, month_str=month)


@router.get("/me/trend", response_model=List[AttendanceTrendPoint])
def get_my_trend(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Weekly attendance trend over time."""
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Student access only")
    student = _get_student(db, current_user)
    AttendanceService.ensure_backfill(db)
    return AttendanceService.get_student_trend(db, student.id)


@router.get("/me/records", response_model=PaginatedAttendanceRecords)
def get_my_records(
    subject: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Paginated daily attendance records with subject, status and date range filtering."""
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Student access only")
    student = _get_student(db, current_user)
    AttendanceService.ensure_backfill(db)
    return AttendanceService.get_student_records_paginated(
        db, student.id, subject=subject, status=status,
        start_date=start_date, end_date=end_date, page=page, page_size=page_size
    )


@router.post("/me/leave-requests", response_model=LeaveRequestResponse, status_code=201)
async def submit_leave_request(
    start_date: str = Form(...),
    end_date: str = Form(...),
    reason: str = Form(...),
    document: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Student submits an excuse/leave request with optional medical/absence certificate."""
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Student access only")
    student = _get_student(db, current_user)

    try:
        dt_start = datetime.strptime(start_date, "%Y-%m-%d")
        dt_end = datetime.strptime(end_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD.")

    if dt_end < dt_start:
        raise HTTPException(status_code=400, detail="End date cannot be earlier than start date.")

    doc_path = None
    orig_filename = None
    file_type = None
    file_size = None

    if document and document.filename:
        ext = document.filename.split(".")[-1].lower()
        if ext not in ["pdf", "jpg", "jpeg", "png"]:
            raise HTTPException(status_code=400, detail="Document must be PDF, JPG, JPEG, or PNG.")

        content = await document.read()
        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Document size exceeds 5 MB limit.")

        student_dir = os.path.join(LEAVE_UPLOAD_DIR, str(student.id))
        os.makedirs(student_dir, exist_ok=True)
        filename = f"{uuid.uuid4().hex}.{ext}"
        full_path = os.path.join(student_dir, filename)
        with open(full_path, "wb") as f:
            f.write(content)

        doc_path = full_path
        orig_filename = document.filename
        file_type = document.content_type or f"application/{ext}"
        file_size = len(content)

    leave_req = LeaveRequest(
        student_id=student.id,
        start_date=dt_start,
        end_date=dt_end,
        reason=reason.strip(),
        document_path=doc_path,
        original_filename=orig_filename,
        file_type=file_type,
        file_size=file_size,
        status="Pending",
        created_at=datetime.utcnow()
    )
    db.add(leave_req)
    db.commit()
    db.refresh(leave_req)

    return LeaveRequestResponse(
        id=leave_req.id,
        student_id=student.id,
        student_name=student.full_name,
        student_code=student.student_id,
        start_date=leave_req.start_date,
        end_date=leave_req.end_date,
        reason=leave_req.reason,
        document_path=leave_req.document_path,
        original_filename=leave_req.original_filename,
        file_type=leave_req.file_type,
        file_size=leave_req.file_size,
        status=leave_req.status,
        created_at=leave_req.created_at
    )


@router.get("/me/leave-requests", response_model=List[LeaveRequestResponse])
def get_my_leave_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List the student's leave requests."""
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Student access only")
    student = _get_student(db, current_user)

    reqs = db.query(LeaveRequest).filter(
        LeaveRequest.student_id == student.id
    ).order_by(LeaveRequest.created_at.desc()).all()

    return [
        LeaveRequestResponse(
            id=r.id,
            student_id=student.id,
            student_name=student.full_name,
            student_code=student.student_id,
            start_date=r.start_date,
            end_date=r.end_date,
            reason=r.reason,
            document_path=r.document_path,
            original_filename=r.original_filename,
            file_type=r.file_type,
            file_size=r.file_size,
            status=r.status,
            reviewed_by=r.reviewed_by,
            reviewer_name=r.reviewer.full_name if r.reviewer else None,
            reviewed_at=r.reviewed_at,
            faculty_comment=r.faculty_comment,
            created_at=r.created_at
        )
        for r in reqs
    ]


@router.get("/me/export")
def export_my_attendance_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download student attendance report as CSV."""
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Student access only")
    student = _get_student(db, current_user)
    AttendanceService.ensure_backfill(db)

    records = db.query(SessionAttendanceRecord).join(ClassSession).filter(
        SessionAttendanceRecord.student_id == student.id
    ).order_by(ClassSession.session_date.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Time", "Subject", "Class Division", "Attendance Status", "Remarks"])

    for r in records:
        writer.writerow([
            r.session.session_date.strftime("%Y-%m-%d"),
            f"{r.session.start_time} - {r.session.end_time}",
            r.session.subject,
            r.session.class_division,
            r.status,
            r.remarks or ""
        ])

    output.seek(0)
    filename = f"attendance_report_{student.student_id}_{datetime.now().strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/leave-requests/{request_id}/document")
def download_leave_document(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download attached leave verification document."""
    req = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if not req or not req.document_path:
        raise HTTPException(status_code=404, detail="Document not found")

    # Access control
    if current_user.role == UserRole.student:
        student = _get_student(db, current_user)
        if req.student_id != student.id:
            raise HTTPException(status_code=403, detail="Access denied")

    if not os.path.exists(req.document_path):
        raise HTTPException(status_code=404, detail="File no longer exists on server")

    with open(req.document_path, "rb") as f:
        file_bytes = f.read()

    return Response(
        content=file_bytes,
        media_type=req.file_type or "application/octet-stream",
        headers={"Content-Disposition": f'inline; filename="{req.original_filename or "document.pdf"}"'}
    )


# ─── Faculty Endpoints ────────────────────────────────────────────────────────

@router.post("/faculty/sessions", response_model=ClassSessionResponse)
def create_session(
    data: ClassSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_faculty_or_admin)
):
    """Create a new class session for attendance marking."""
    faculty_id = None
    if current_user.role == UserRole.faculty:
        fac = _get_faculty(db, current_user)
        faculty_id = fac.id

    cs = AttendanceService.create_class_session(
        db,
        subject=data.subject,
        session_date=data.session_date,
        start_time=data.start_time,
        end_time=data.end_time,
        class_division=data.class_division,
        faculty_id=faculty_id,
        room=data.room,
        topic=data.topic
    )

    total_std = db.query(Student).count()
    return ClassSessionResponse(
        id=cs.id,
        subject=cs.subject,
        faculty_id=cs.faculty_id,
        faculty_name=cs.faculty.full_name if cs.faculty else None,
        session_date=cs.session_date,
        start_time=cs.start_time,
        end_time=cs.end_time,
        class_division=cs.class_division,
        room=cs.room,
        topic=cs.topic,
        marked_count=0,
        total_students=total_std,
        created_at=cs.created_at
    )


@router.get("/faculty/sessions", response_model=List[ClassSessionResponse])
def get_faculty_sessions(
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_faculty_or_admin)
):
    """List scheduled and recent sessions."""
    AttendanceService.ensure_backfill(db)
    q = db.query(ClassSession)
    if current_user.role == UserRole.faculty:
        fac = _get_faculty(db, current_user)
        q = q.filter(ClassSession.faculty_id == fac.id)

    sessions = q.order_by(ClassSession.session_date.desc()).limit(limit).all()
    total_std = db.query(Student).count()

    results = []
    for s in sessions:
        marked = db.query(SessionAttendanceRecord).filter(SessionAttendanceRecord.session_id == s.id).count()
        results.append(ClassSessionResponse(
            id=s.id,
            subject=s.subject,
            faculty_id=s.faculty_id,
            faculty_name=s.faculty.full_name if s.faculty else None,
            session_date=s.session_date,
            start_time=s.start_time,
            end_time=s.end_time,
            class_division=s.class_division,
            room=s.room,
            topic=s.topic,
            marked_count=marked,
            total_students=total_std,
            created_at=s.created_at
        ))
    return results


@router.get("/faculty/sessions/{session_id}/students", response_model=List[SessionStudentItem])
def get_session_student_roster(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_faculty_or_admin)
):
    """Roster of students for a session with current marked status."""
    AttendanceService.ensure_backfill(db)
    students = AttendanceService.get_session_students(db, session_id)
    return students


@router.post("/faculty/sessions/{session_id}/mark")
def mark_session_attendance(
    session_id: int,
    data: BulkAttendanceMarkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_faculty_or_admin)
):
    """Bulk marks student attendance for a session and triggers aggregate synchronization."""
    records_list = [r.model_dump() for r in data.records]
    try:
        count = AttendanceService.bulk_mark_session(
            db, session_id, records_list, marked_by_user_id=current_user.id
        )
        return {"message": f"Successfully recorded attendance for {count} students", "marked": count}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/faculty/upload-csv")
async def upload_attendance_csv(
    subject: str = Form(...),
    session_date: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_faculty_or_admin)
):
    """Upload CSV attendance with column mapping (student_id / roll, status) and error report."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    content = await file.read()
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV file is empty or invalid header")

    # Map columns
    id_col = None
    status_col = None
    for col in reader.fieldnames:
        c_low = col.lower().strip()
        if "student" in c_low or "roll" in c_low or "id" in c_low:
            id_col = col
        if "status" in c_low or "attendance" in c_low:
            status_col = col

    if not id_col:
        raise HTTPException(status_code=400, detail="Could not identify student ID column in CSV")

    # Create session
    faculty_id = _get_faculty(db, current_user).id if current_user.role == UserRole.faculty else None
    cs = AttendanceService.create_class_session(
        db,
        subject=subject,
        session_date=session_date,
        start_time="09:00",
        end_time="10:00",
        class_division="CSE-A",
        faculty_id=faculty_id,
        room="Room 401",
        topic=f"CSV Upload Session: {file.filename}"
    )

    success_count = 0
    errors = []
    mark_items = []

    for row_idx, row in enumerate(reader, start=2):
        s_code = row.get(id_col, "").strip()
        student = db.query(Student).filter(
            (Student.student_id == s_code) | (Student.email == s_code)
        ).first()

        if not student:
            errors.append(f"Row {row_idx}: Student '{s_code}' not found")
            continue

        raw_status = row.get(status_col, "Present").strip().capitalize() if status_col else "Present"
        if raw_status in ["P", "1", "True"]:
            raw_status = "Present"
        elif raw_status in ["A", "0", "False"]:
            raw_status = "Absent"
        elif raw_status in ["L"]:
            raw_status = "Late"
        elif raw_status in ["E"]:
            raw_status = "Excused"

        if raw_status not in ["Present", "Absent", "Late", "Excused"]:
            raw_status = "Present"

        mark_items.append({"student_id": student.id, "status": raw_status})
        success_count += 1

    if mark_items:
        AttendanceService.bulk_mark_session(db, cs.id, mark_items, marked_by_user_id=current_user.id)

    return {
        "session_id": cs.id,
        "processed_rows": success_count,
        "failed_rows": len(errors),
        "errors": errors[:10]
    }


@router.get("/faculty/defaulters", response_model=List[DefaulterStudentItem])
def get_defaulters(
    threshold: Optional[float] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_faculty_or_admin)
):
    """Students below the minimum attendance threshold."""
    AttendanceService.ensure_backfill(db)
    return AttendanceService.get_defaulters_list(db, threshold=threshold)


@router.post("/faculty/remind/{student_id}")
def send_attendance_reminder(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_faculty_or_admin)
):
    """Send an advisory alert & notification to a student regarding attendance shortage."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    summary = AttendanceService.get_student_summary(db, student_id)
    threshold = AttendanceService.get_threshold(db)
    msg = (
        f"Official Notice: Your overall attendance is currently {summary['overall_percentage']}%, "
        f"which is below the mandatory {threshold}% threshold. Please contact your course coordinator."
    )

    alert = Alert(
        student_id=student.id,
        alert_type="low_attendance",
        message=msg,
        severity="high" if summary["overall_percentage"] < (threshold - 10) else "medium"
    )
    db.add(alert)

    if student.user_id:
        db.add(Notification(
            user_id=student.user_id,
            student_id=student.id,
            title="Attendance Shortage Notice",
            body=msg,
            notification_type="warning"
        ))

    db.commit()
    return {"message": f"Reminder sent to {student.full_name}"}


@router.get("/faculty/leave-requests", response_model=List[LeaveRequestResponse])
def get_faculty_leave_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_faculty_or_admin)
):
    """Faculty queue of student leave and excuse requests."""
    reqs = db.query(LeaveRequest).order_by(LeaveRequest.created_at.desc()).all()
    results = []
    for r in reqs:
        student = db.query(Student).filter(Student.id == r.student_id).first()
        results.append(LeaveRequestResponse(
            id=r.id,
            student_id=r.student_id,
            student_name=student.full_name if student else None,
            student_code=student.student_id if student else None,
            start_date=r.start_date,
            end_date=r.end_date,
            reason=r.reason,
            document_path=r.document_path,
            original_filename=r.original_filename,
            file_type=r.file_type,
            file_size=r.file_size,
            status=r.status,
            reviewed_by=r.reviewed_by,
            reviewer_name=r.reviewer.full_name if r.reviewer else None,
            reviewed_at=r.reviewed_at,
            faculty_comment=r.faculty_comment,
            created_at=r.created_at
        ))
    return results


@router.patch("/faculty/leave-requests/{request_id}/review", response_model=LeaveRequestResponse)
def review_leave_request(
    request_id: int,
    status: str = Form(...),
    faculty_comment: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_faculty_or_admin)
):
    """Faculty approves or rejects a leave request, updating attendance denominators if approved."""
    if status not in ["Approved", "Rejected"]:
        raise HTTPException(status_code=400, detail="Status must be Approved or Rejected")

    faculty_id = _get_faculty(db, current_user).id if current_user.role == UserRole.faculty else None
    try:
        req = AttendanceService.review_leave_request(
            db, request_id, status=status, faculty_id=faculty_id, comment=faculty_comment
        )
        student = db.query(Student).filter(Student.id == req.student_id).first()
        return LeaveRequestResponse(
            id=req.id,
            student_id=req.student_id,
            student_name=student.full_name if student else None,
            student_code=student.student_id if student else None,
            start_date=req.start_date,
            end_date=req.end_date,
            reason=req.reason,
            document_path=req.document_path,
            original_filename=req.original_filename,
            file_type=req.file_type,
            file_size=req.file_size,
            status=req.status,
            reviewed_by=req.reviewed_by,
            reviewer_name=req.reviewer.full_name if req.reviewer else None,
            reviewed_at=req.reviewed_at,
            faculty_comment=req.faculty_comment,
            created_at=req.created_at
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ─── Admin Endpoints ──────────────────────────────────────────────────────────

@router.get("/admin/analytics", response_model=AttendanceAnalyticsResponse)
def get_admin_attendance_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin)
):
    """Institutional analytics: departmental comparison, trends, defaulters count."""
    AttendanceService.ensure_backfill(db)
    return AttendanceService.get_institutional_analytics(db)


@router.get("/admin/threshold")
def get_threshold_setting(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin)
):
    """Get active minimum attendance threshold."""
    return {"threshold_percentage": AttendanceService.get_threshold(db)}


@router.put("/admin/threshold")
def update_threshold_setting(
    data: ThresholdUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin)
):
    """Update institutional minimum attendance threshold."""
    if data.threshold_percentage <= 0 or data.threshold_percentage > 100:
        raise HTTPException(status_code=400, detail="Threshold must be between 1 and 100")
    val = AttendanceService.set_threshold(db, data.threshold_percentage)
    return {"message": "Attendance threshold updated", "threshold_percentage": val}


# ─── Faculty/Admin Student Drill-Down Endpoints ───────────────────────────────

@router.get("/student/{student_id}/summary", response_model=AttendanceSummaryResponse)
def get_student_drilldown_summary(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_faculty_or_admin)
):
    AttendanceService.ensure_backfill(db)
    return AttendanceService.get_student_summary(db, student_id)


@router.get("/student/{student_id}/subjects", response_model=List[SubjectAttendanceResponse])
def get_student_drilldown_subjects(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_faculty_or_admin)
):
    AttendanceService.ensure_backfill(db)
    return AttendanceService.get_student_subjects(db, student_id)


@router.get("/student/{student_id}/calendar", response_model=List[CalendarDayItem])
def get_student_drilldown_calendar(
    student_id: int,
    month: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_faculty_or_admin)
):
    AttendanceService.ensure_backfill(db)
    return AttendanceService.get_student_calendar(db, student_id, month_str=month)


@router.get("/student/{student_id}/trend", response_model=List[AttendanceTrendPoint])
def get_student_drilldown_trend(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_faculty_or_admin)
):
    AttendanceService.ensure_backfill(db)
    return AttendanceService.get_student_trend(db, student_id)
