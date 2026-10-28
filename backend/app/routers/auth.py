from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User
from ..models.academic import Student, Faculty
from ..schemas.auth import Token, LoginRequest, UserResponse
from ..services.auth_service import authenticate_user, create_access_token
from ..deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/login", response_model=Token)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, request.email, request.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token = create_access_token({"sub": user.email, "role": user.role.value})

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
