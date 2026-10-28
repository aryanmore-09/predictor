from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime


class TestPaperBase(BaseModel):
    subject: str
    exam_type: str
    marks_obtained: float
    max_marks: float
    remarks: Optional[str] = None


class TestPaperUpdate(BaseModel):
    subject: Optional[str] = None
    exam_type: Optional[str] = None
    exam_date: Optional[str] = None
    marks_obtained: Optional[float] = None
    max_marks: Optional[float] = None
    remarks: Optional[str] = None


class TestPaperVerify(BaseModel):
    status: str  # "Verified" | "Rejected"
    faculty_comment: Optional[str] = None
    corrected_marks: Optional[float] = None


class TestPaperResponse(BaseModel):
    id: int
    student_id: int
    student_name: Optional[str] = None
    student_code: Optional[str] = None
    subject: str
    exam_type: str
    exam_date: datetime
    marks_obtained: float
    max_marks: float
    percentage: float
    original_filename: str
    file_type: str
    file_size: int
    remarks: Optional[str] = None
    status: str
    verified_by: Optional[int] = None
    verifier_name: Optional[str] = None
    verified_at: Optional[datetime] = None
    faculty_comment: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TestPaperListResponse(BaseModel):
    items: List[TestPaperResponse]
    total: int
    page: int
    page_size: int
    pages: int


class SubjectAverage(BaseModel):
    subject: str
    avg_percentage: float
    paper_count: int


class SubjectHighlight(BaseModel):
    subject: str
    avg_percentage: float


class TrendItem(BaseModel):
    id: int
    exam_date: datetime
    subject: str
    exam_type: str
    marks_obtained: float
    max_marks: float
    percentage: float
    status: str


class TestPaperSummaryResponse(BaseModel):
    total_uploaded: int
    pending_count: int
    verified_count: int
    rejected_count: int
    overall_avg_percentage: float
    best_subject: Optional[SubjectHighlight] = None
    weakest_subject: Optional[SubjectHighlight] = None
    subject_averages: List[SubjectAverage]
    trends: List[TrendItem]

