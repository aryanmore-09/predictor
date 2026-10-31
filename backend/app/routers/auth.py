from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User
from ..models.academic import Student, Faculty
from ..schemas.auth import Token, LoginRequest, UserResponse
from ..services.auth_service import get_user_by_email, verify_password, create_access_token
from ..services.audit_service import log_audit
from ..deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/login", response_model=Token)
def login(request: LoginRequest, http_request: Request, db: Session = Depends(get_db)):
    user = get_user_by_email(db, request.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    if not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    token = create_access_token({"sub": user.email, "role": user.role.value})

    log_audit(db, user.id, "LOGIN", "user", user.id,
              ip_address=http_request.client.host if http_request.client else None)

    student_profile = db.query(Student).filter(Student.user_id == user.id).first()
    faculty_profile = db.query(Faculty).filter(Faculty.user_id == user.id).first()

    return Token(
        access_token=token,
        role=user.role,
        user_id=user.id,
        full_name=user.full_name,
        student_id=student_profile.id if student_profile else None,
        faculty_id=faculty_profile.id if faculty_profile else None,
    )

@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user
