import os
import re
import uuid
from datetime import datetime
from typing import Tuple, Dict, Any, Optional, List
from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..models.academic import (
    Student, AcademicRecord, QuizRecord, AssignmentRecord, Faculty
)
from ..models.test_paper import TestPaper
from ..config import settings
from ..ml.predict import predict_student
from ..routers.predictions import _save_prediction

# 5 MB limit
MAX_FILE_SIZE = 5 * 1024 * 1024

ALLOWED_MIME_TYPES = {
    "application/pdf": [".pdf"],
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
}

MAGIC_NUMBERS = {
    "pdf": b"%PDF-",
    "jpeg": b"\xff\xd8\xff",
    "png": b"\x89PNG\r\n\x1a\n",
}

UPLOAD_BASE_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "uploads", "test_papers"
)


def sanitize_filename(filename: str) -> str:
    """Sanitize original filename to prevent path traversal or unsafe characters."""
    base = os.path.basename(filename)
    # Remove any non-alphanumeric except dots, dashes, underscores
    clean = re.sub(r"[^a-zA-Z0-9._-]", "_", base)
    return clean[:200] or "test_paper"


def validate_and_read_file(file: UploadFile) -> Tuple[bytes, str, str]:
    """
    Validate file size, extension, MIME type, and real content magic bytes.
    Returns (content, sanitized_filename, content_type).
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    sanitized = sanitize_filename(file.filename)
    ext = os.path.splitext(sanitized)[1].lower()

    if not ext:
        raise HTTPException(status_code=400, detail="File has no extension")

    valid_exts = [e for exts in ALLOWED_MIME_TYPES.values() for e in exts]
    if ext not in valid_exts:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file extension '{ext}'. Only PDF, JPG, JPEG, and PNG are allowed."
        )

    # Read content
    content = file.file.read()
    file_size = len(content)

    if file_size == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty (0 bytes)")

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size of 5 MB (actual: {file_size / (1024 * 1024):.2f} MB)"
        )

    # Validate magic bytes
    detected_type = None
    if content.startswith(MAGIC_NUMBERS["pdf"]):
        detected_type = "application/pdf"
    elif content.startswith(MAGIC_NUMBERS["jpeg"]):
        detected_type = "image/jpeg"
    elif content.startswith(MAGIC_NUMBERS["png"]):
        detected_type = "image/png"

    if not detected_type:
        raise HTTPException(
            status_code=400,
            detail="File content does not match genuine PDF, JPEG, or PNG format"
        )

    # Confirm detected type matches extension
    if ext not in ALLOWED_MIME_TYPES.get(detected_type, []):
        raise HTTPException(
            status_code=400,
            detail=f"Extension '{ext}' does not match detected file content type '{detected_type}'"
        )

    return content, sanitized, detected_type


def save_test_paper_file(student_id: int, content: bytes, extension: str) -> str:
    """Save upload to backend/uploads/test_papers/<student_id>/<uuid>.<ext>."""
    student_dir = os.path.join(UPLOAD_BASE_DIR, str(student_id))
    os.makedirs(student_dir, exist_ok=True)
    random_filename = f"{uuid.uuid4().hex}{extension}"
    full_path = os.path.join(student_dir, random_filename)

    with open(full_path, "wb") as f:
        f.write(content)

    return full_path


def delete_test_paper_file(file_path: str):
    """Safely delete file from filesystem if present."""
    try:
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
    except Exception:
        pass


def sync_marks_to_academic_records(db: Session, paper: TestPaper):
    """
    When a paper is Verified, reflect marks into AcademicRecord, QuizRecord,
    or AssignmentRecord, then re-run prediction & generate alerts if risk changes.
    """
    student = db.query(Student).filter(Student.id == paper.student_id).first()
    if not student:
        return

    pct = round((paper.marks_obtained / paper.max_marks) * 100.0, 1) if paper.max_marks > 0 else 0.0
    semester = student.semester or 1
    year = student.year or ((semester + 1) // 2)

    # 1. Update or create AcademicRecord for this subject
    acad_rec = db.query(AcademicRecord).filter(
        AcademicRecord.student_id == paper.student_id,
        AcademicRecord.subject == paper.subject
    ).first()

    if acad_rec:
        # Weighted blend of previous and new verified marks
        current_marks = acad_rec.total_marks or 60.0
        new_total = round((current_marks * 0.7) + (pct * 0.3), 1)
        acad_rec.total_marks = min(100.0, max(0.0, new_total))
        acad_rec.internal_marks = round(acad_rec.total_marks * 0.4, 1)
        acad_rec.external_marks = round(acad_rec.total_marks * 0.6, 1)
        acad_rec.grade = (
            "A" if new_total >= 75 else
            "B" if new_total >= 60 else
            "C" if new_total >= 50 else
            "D" if new_total >= 40 else "F"
        )
        acad_rec.updated_at = datetime.utcnow()
    else:
        new_total = pct
        grade = (
            "A" if new_total >= 75 else
            "B" if new_total >= 60 else
            "C" if new_total >= 50 else
            "D" if new_total >= 40 else "F"
        )
        acad_rec = AcademicRecord(
            student_id=paper.student_id,
            subject=paper.subject,
            semester=semester,
            year=year,
            internal_marks=round(new_total * 0.4, 1),
            external_marks=round(new_total * 0.6, 1),
            total_marks=new_total,
            max_marks=100.0,
            grade=grade,
        )
        db.add(acad_rec)

    # 2. Update Quiz or Assignment records if applicable
    if paper.exam_type.lower() == "quiz":
        quiz_rec = db.query(QuizRecord).filter(
            QuizRecord.student_id == paper.student_id,
            QuizRecord.subject == paper.subject
        ).first()
        if quiz_rec:
            quiz_rec.total_quizzes += 1
            quiz_rec.attempted_quizzes += 1
            quiz_rec.avg_score = round((quiz_rec.avg_score + pct) / 2.0, 1)
        else:
            db.add(QuizRecord(
                student_id=paper.student_id,
                subject=paper.subject,
                semester=semester,
                total_quizzes=1,
                attempted_quizzes=1,
                avg_score=pct
            ))

    elif paper.exam_type.lower() == "assignment":
        asgn_rec = db.query(AssignmentRecord).filter(
            AssignmentRecord.student_id == paper.student_id,
            AssignmentRecord.subject == paper.subject
        ).first()
        if asgn_rec:
            asgn_rec.total_assignments += 1
            asgn_rec.submitted_assignments += 1
            asgn_rec.avg_score = round((asgn_rec.avg_score + pct) / 2.0, 1)
        else:
            db.add(AssignmentRecord(
                student_id=paper.student_id,
                subject=paper.subject,
                semester=semester,
                total_assignments=1,
                submitted_assignments=1,
                late_submissions=0,
                avg_score=pct
            ))

    db.commit()

    # 3. Re-run prediction and generate alert if risk level changes or worsens
    try:
        pred = predict_student(db, paper.student_id, settings.MODEL_DIR)
        _save_prediction(db, paper.student_id, pred)
    except Exception as e:
        # Prediction re-computation should not abort verification transaction
        print(f"[TestPaper] Re-prediction notice: {e}")


def calculate_student_summary(db: Session, student_id: int) -> Dict[str, Any]:
    """Compute subject averages, best/weakest subject, and historical trends for student."""
    papers = db.query(TestPaper).filter(
        TestPaper.student_id == student_id
    ).order_by(TestPaper.exam_date.asc()).all()

    total_uploaded = len(papers)
    pending_count = sum(1 for p in papers if p.status == "Pending")
    verified_count = sum(1 for p in papers if p.status == "Verified")
    rejected_count = sum(1 for p in papers if p.status == "Rejected")

    # Consider verified papers (or all non-rejected papers if no verified papers yet)
    scored_papers = [p for p in papers if p.status == "Verified"]
    if not scored_papers and papers:
        scored_papers = [p for p in papers if p.status != "Rejected"]

    subject_data: Dict[str, List[float]] = {}
    for p in scored_papers:
        pct = (p.marks_obtained / p.max_marks * 100) if p.max_marks > 0 else 0.0
        subject_data.setdefault(p.subject, []).append(pct)

    subject_averages = []
    for subj, scores in subject_data.items():
        avg = round(sum(scores) / len(scores), 1)
        subject_averages.append({
            "subject": subj,
            "avg_percentage": avg,
            "paper_count": len(scores)
        })

    best_subject = None
    weakest_subject = None
    overall_avg = 0.0

    if subject_averages:
        sorted_subjs = sorted(subject_averages, key=lambda x: x["avg_percentage"], reverse=True)
        best_subject = {"subject": sorted_subjs[0]["subject"], "avg_percentage": sorted_subjs[0]["avg_percentage"]}
        weakest_subject = {"subject": sorted_subjs[-1]["subject"], "avg_percentage": sorted_subjs[-1]["avg_percentage"]}
        all_scores = [s for scores in subject_data.values() for s in scores]
        overall_avg = round(sum(all_scores) / len(all_scores), 1)

    trends = [
        {
            "id": p.id,
            "exam_date": p.exam_date,
            "subject": p.subject,
            "exam_type": p.exam_type,
            "marks_obtained": p.marks_obtained,
            "max_marks": p.max_marks,
            "percentage": round((p.marks_obtained / p.max_marks * 100), 1) if p.max_marks > 0 else 0.0,
            "status": p.status,
        }
        for p in papers
    ]

    return {
        "total_uploaded": total_uploaded,
        "pending_count": pending_count,
        "verified_count": verified_count,
        "rejected_count": rejected_count,
        "overall_avg_percentage": overall_avg,
        "best_subject": best_subject,
        "weakest_subject": weakest_subject,
        "subject_averages": subject_averages,
        "trends": trends,
    }

