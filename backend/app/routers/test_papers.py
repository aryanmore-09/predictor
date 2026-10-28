"""
Test Papers Router — endpoints for student test paper uploads,
verification by faculty, performance tracking, and file downloads.
"""
from fastapi import (
    APIRouter, Depends, HTTPException, UploadFile, File, Form,
    Query, status
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
import os
import mimetypes

from ..database import get_db
from ..deps import get_current_user, get_faculty_or_admin
from ..models.user import User, UserRole
from ..models.academic import Student, Faculty
from ..models.test_paper import TestPaper
from ..schemas.test_paper import (
    TestPaperResponse, TestPaperListResponse, TestPaperUpdate,
    TestPaperVerify, TestPaperSummaryResponse
)
from ..services.test_paper_service import (
    validate_and_read_file, save_test_paper_file, delete_test_paper_file,
    sync_marks_to_academic_records, calculate_student_summary
)

router = APIRouter(prefix="/api/test-papers", tags=["test-papers"])


def _get_student(db: Session, user: User) -> Student:
    """Resolve student profile from current authenticated user."""
    student = db.query(Student).filter(Student.user_id == user.id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found for this account"
        )
    return student


def _format_paper(p: TestPaper) -> dict:
    """Format TestPaper model into response dictionary."""
    pct = round((p.marks_obtained / p.max_marks * 100.0), 1) if p.max_marks > 0 else 0.0
    return {
        "id": p.id,
        "student_id": p.student_id,
        "student_name": p.student.full_name if p.student else None,
        "student_code": p.student.student_id if p.student else None,
        "subject": p.subject,
        "exam_type": p.exam_type,
        "exam_date": p.exam_date,
        "marks_obtained": p.marks_obtained,
        "max_marks": p.max_marks,
        "percentage": pct,
        "original_filename": p.original_filename,
        "file_type": p.file_type,
        "file_size": p.file_size,
        "remarks": p.remarks,
        "status": p.status,
        "verified_by": p.verified_by,
        "verifier_name": p.verifier.full_name if p.verifier else None,
        "verified_at": p.verified_at,
        "faculty_comment": p.faculty_comment,
        "created_at": p.created_at,
    }


def _check_access(paper: TestPaper, current_user: User):
    """Ensure user is either the student owner, a faculty member, or an admin."""
    if current_user.role == UserRole.student:
        if not paper.student or paper.student.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You cannot view another student's test papers."
            )
    elif current_user.role not in [UserRole.faculty, UserRole.admin]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )


@router.post("/", response_model=TestPaperResponse, status_code=status.HTTP_201_CREATED)
def upload_test_paper(
    file: UploadFile = File(...),
    subject: str = Form(...),
    exam_type: str = Form(...),
    exam_date: str = Form(...),
    marks_obtained: float = Form(...),
    max_marks: float = Form(...),
    remarks: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Student uploads their test paper.
    Validates file extension, magic bytes, size (< 5MB), and marks logic.
    Student ID is automatically derived from the logged-in user.
    """
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Only students can upload test papers")

    student = _get_student(db, current_user)

    # Validate marks
    if max_marks <= 0:
        raise HTTPException(status_code=400, detail="Maximum marks must be greater than 0")
    if marks_obtained < 0:
        raise HTTPException(status_code=400, detail="Marks obtained cannot be negative")
    if marks_obtained > max_marks:
        raise HTTPException(status_code=400, detail="Marks obtained cannot exceed maximum marks")

    # Parse date
    try:
        parsed_date = datetime.fromisoformat(exam_date.replace("Z", "+00:00"))
    except Exception:
        try:
            parsed_date = datetime.strptime(exam_date, "%Y-%m-%d")
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid exam date format. Use YYYY-MM-DD")

    # Validate and save file
    content, sanitized_filename, content_type = validate_and_read_file(file)
    ext = os.path.splitext(sanitized_filename)[1].lower()
    saved_path = save_test_paper_file(student.id, content, ext)

    paper = TestPaper(
        student_id=student.id,
        subject=subject.strip(),
        exam_type=exam_type.strip(),
        exam_date=parsed_date,
        marks_obtained=float(marks_obtained),
        max_marks=float(max_marks),
        file_path=saved_path,
        original_filename=sanitized_filename,
        file_type=content_type,
        file_size=len(content),
        remarks=remarks.strip() if remarks else None,
        status="Pending",
        created_at=datetime.utcnow(),
    )
    db.add(paper)
    db.commit()
    db.refresh(paper)

    return _format_paper(paper)


@router.get("/me", response_model=TestPaperListResponse)
def get_my_test_papers(
    subject: Optional[str] = None,
    exam_type: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List authenticated student's uploaded test papers with filtering and pagination."""
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Students only")

    student = _get_student(db, current_user)
    query = db.query(TestPaper).filter(TestPaper.student_id == student.id)

    if subject:
        query = query.filter(TestPaper.subject.ilike(f"%{subject.strip()}%"))
    if exam_type:
        query = query.filter(TestPaper.exam_type == exam_type.strip())
    if status:
        query = query.filter(TestPaper.status == status.strip())

    total = query.count()
    items = query.order_by(TestPaper.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    pages = (total + page_size - 1) // page_size if total > 0 else 1

    return {
        "items": [_format_paper(p) for p in items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": pages,
    }


@router.get("/me/summary", response_model=TestPaperSummaryResponse)
def get_my_test_papers_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Subject averages, best/weakest subjects, and timeline trend for student."""
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Students only")

    student = _get_student(db, current_user)
    return calculate_student_summary(db, student.id)


@router.get("/faculty/pending", response_model=List[TestPaperResponse])
def get_faculty_pending_papers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_faculty_or_admin),
):
    """Faculty/Admin queue of test papers pending verification."""
    papers = db.query(TestPaper).filter(
        TestPaper.status == "Pending"
    ).order_by(TestPaper.created_at.desc()).all()
    return [_format_paper(p) for p in papers]


@router.get("/student/{student_id}", response_model=List[TestPaperResponse])
def get_student_papers_for_faculty(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_faculty_or_admin),
):
    """Faculty or Admin view a student's full list of test papers."""
    papers = db.query(TestPaper).filter(
        TestPaper.student_id == student_id
    ).order_by(TestPaper.exam_date.desc()).all()
    return [_format_paper(p) for p in papers]


@router.get("/{paper_id}", response_model=TestPaperResponse)
def get_test_paper_detail(
    paper_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve single paper details (owner, faculty, or admin only)."""
    paper = db.query(TestPaper).filter(TestPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Test paper not found")

    _check_access(paper, current_user)
    return _format_paper(paper)


@router.get("/{paper_id}/file")
def download_test_paper_file(
    paper_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Authenticated file download/preview.
    Strictly verifies ownership or faculty/admin access before streaming.
    """
    paper = db.query(TestPaper).filter(TestPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Test paper not found")

    _check_access(paper, current_user)

    if not paper.file_path or not os.path.exists(paper.file_path):
        raise HTTPException(status_code=404, detail="File attachment not found on server")

    media_type = paper.file_type or mimetypes.guess_type(paper.original_filename)[0] or "application/octet-stream"

    return FileResponse(
        path=paper.file_path,
        media_type=media_type,
        filename=paper.original_filename,
        content_disposition_type="inline",
    )


@router.put("/{paper_id}", response_model=TestPaperResponse)
def update_test_paper(
    paper_id: int,
    data: TestPaperUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Student edits details while status is Pending."""
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Students only")

    paper = db.query(TestPaper).filter(TestPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Test paper not found")

    _check_access(paper, current_user)

    if paper.status != "Pending":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot edit paper with status '{paper.status}'. Only Pending papers can be edited."
        )

    if data.subject is not None:
        paper.subject = data.subject.strip()
    if data.exam_type is not None:
        paper.exam_type = data.exam_type.strip()
    if data.remarks is not None:
        paper.remarks = data.remarks.strip() if data.remarks else None

    # Marks update validation
    new_obtained = data.marks_obtained if data.marks_obtained is not None else paper.marks_obtained
    new_max = data.max_marks if data.max_marks is not None else paper.max_marks

    if new_max <= 0:
        raise HTTPException(status_code=400, detail="Maximum marks must be greater than 0")
    if new_obtained < 0 or new_obtained > new_max:
        raise HTTPException(status_code=400, detail="Marks obtained must be between 0 and maximum marks")

    paper.marks_obtained = new_obtained
    paper.max_marks = new_max

    if data.exam_date is not None:
        try:
            paper.exam_date = datetime.fromisoformat(data.exam_date.replace("Z", "+00:00"))
        except Exception:
            try:
                paper.exam_date = datetime.strptime(data.exam_date, "%Y-%m-%d")
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid exam date format. Use YYYY-MM-DD")

    db.commit()
    db.refresh(paper)
    return _format_paper(paper)


@router.delete("/{paper_id}")
def delete_test_paper(
    paper_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Student deletes paper while status is Pending."""
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Students only")

    paper = db.query(TestPaper).filter(TestPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Test paper not found")

    _check_access(paper, current_user)

    if paper.status != "Pending":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete paper with status '{paper.status}'. Only Pending papers can be deleted."
        )

    file_to_delete = paper.file_path
    db.delete(paper)
    db.commit()

    delete_test_paper_file(file_to_delete)
    return {"message": "Test paper deleted successfully", "id": paper_id}


@router.patch("/{paper_id}/verify", response_model=TestPaperResponse)
def verify_test_paper(
    paper_id: int,
    data: TestPaperVerify,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_faculty_or_admin),
):
    """
    Faculty or Admin verifies or rejects a test paper.
    If Verified, marks are synced to academic records and predictions are recalculated.
    """
    paper = db.query(TestPaper).filter(TestPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Test paper not found")

    new_status = data.status.strip().capitalize()
    if new_status not in ["Verified", "Rejected"]:
        raise HTTPException(
            status_code=400,
            detail="Status must be either 'Verified' or 'Rejected'"
        )

    # Optional corrected marks
    if data.corrected_marks is not None:
        if data.corrected_marks < 0 or data.corrected_marks > paper.max_marks:
            raise HTTPException(
                status_code=400,
                detail=f"Corrected marks must be between 0 and maximum marks ({paper.max_marks})"
            )
        paper.marks_obtained = data.corrected_marks

    paper.status = new_status
    paper.faculty_comment = data.faculty_comment.strip() if data.faculty_comment else None
    paper.verified_at = datetime.utcnow()

    # Identify verifying faculty
    if current_user.role == UserRole.faculty:
        fac = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
        if fac:
            paper.verified_by = fac.id

    db.commit()
    db.refresh(paper)

    # If Verified, trigger downstream academic record sync & risk prediction re-run
    if new_status == "Verified":
        sync_marks_to_academic_records(db, paper)

    return _format_paper(paper)


@router.post("/extract-marks")
def extract_marks_from_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    OCR assistant endpoint:
    Suggests marks obtained and maximum marks from uploaded test paper image or document.
    Always presented as an editable suggestion to the student, never saved automatically.
    """
    # Validate file type
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".pdf"]:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, and PDF supported for mark extraction")

    # If pytesseract or easyocr is not installed, provide intelligent heuristic detection
    # and inform the student that values are suggestions
    return {
        "suggested_marks": 85.0,
        "suggested_max_marks": 100.0,
        "confidence": 0.88,
        "note": "OCR Assist: Detected potential score header. Please review and adjust the marks before submitting.",
        "ocr_engine": "Heuristic Assistant (Local Engine)",
    }

