"""
Seed Script — Generates 500+ realistic synthetic students with correlated features.
Usage: python -m data.seed (from backend/ directory)
"""
import sys
import os
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import random
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

# Set up app path
from app.database import engine, Base, SessionLocal
from app.models.user import User, UserRole
from app.models.academic import (
    Student, Faculty, AcademicRecord, AttendanceRecord, AttendanceEntry,
    AssignmentRecord, QuizRecord, SurveyResponse, LMSData,
    Prediction, Alert, Notification, ModelVersion
)
from app.services.auth_service import get_password_hash
from app.ml.train import train_models
from app.ml.preprocessing import build_features_from_db
from app.config import settings

random.seed(42)
np.random.seed(42)

SUBJECTS = [
    "Data Structures & Algorithms",
    "Object-Oriented Programming",
    "Database Management Systems",
    "Computer Networks",
    "Operating Systems",
    "Discrete Mathematics",
    "Software Engineering",
    "Artificial Intelligence",
]

FIRST_NAMES = [
    "Aarav", "Aditi", "Arjun", "Ananya", "Abhishek", "Anjali", "Aditya",
    "Bhavna", "Chetan", "Deepika", "Dhruv", "Divya", "Ekta", "Gaurav",
    "Harsha", "Ishaan", "Janhvi", "Kabir", "Kavya", "Kunal", "Lakshmi",
    "Manish", "Meera", "Mohit", "Neha", "Nikhil", "Nisha", "Om", "Pooja",
    "Pranav", "Priya", "Rahul", "Riya", "Rohit", "Sakshi", "Sanjay",
    "Shruti", "Siddharth", "Sneha", "Suresh", "Tanvi", "Tushar",
    "Usha", "Varun", "Vidya", "Vikram", "Vishal", "Yash", "Zara",
    "Hemant", "Eshwari", "Tanishka", "Aryan",
]

LAST_NAMES = [
    "Sharma", "Patel", "Kumar", "Singh", "Verma", "Gupta", "Joshi",
    "Mehta", "Shah", "Rao", "Nair", "Pillai", "Iyer", "Reddy",
    "Chaudhari", "More", "Alapure", "Kamthe", "Desai", "Patil",
    "Kulkarni", "Jain", "Agarwal", "Bose", "Das", "Roy", "Sinha",
    "Mishra", "Pandey", "Dubey", "Tiwari", "Chauhan", "Yadav",
]

def random_name():
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"


def _logistic(x):
    """Numerically stable logistic function."""
    return 1.0 / (1.0 + np.exp(-np.clip(x, -20, 20)))


def generate_student_profile(idx: int, semester: int) -> dict:
    """
    Generate a realistic student profile with overlapping archetypes.
    Dropout is a smooth logistic function of features + Gaussian noise,
    NOT a fixed per-archetype threshold.  ~6% random label flips simulate
    hidden personal factors (family crisis, health issues, etc.).
    Target distribution: ~55% Low-risk, ~30% Medium, ~15% High-risk dropout.
    """
    rng = np.random.RandomState(idx * 17 + semester * 31 + 7)  # reproducible per student

    r = rng.random()
    if r < 0.30:
        archetype = "high"
    elif r < 0.80:
        archetype = "average"
    else:
        archetype = "at_risk"

    # ---- Overlapping feature ranges (σ large enough that archetypes overlap) ----
    if archetype == "high":
        attendance_base = rng.normal(85, 8)        # was 88±5  → wider
        marks_base      = rng.normal(75, 10)       # was 78±8  → wider
        stress          = int(np.clip(rng.normal(2, 1), 1, 5))
        motivation      = int(np.clip(rng.normal(4, 1), 1, 5))
        study_hours     = rng.normal(4.5, 1.2)
        lms_login       = rng.normal(6.5, 2.0)
        sub_rate        = rng.normal(92, 7)
        late_rate       = rng.normal(6, 5)
    elif archetype == "average":
        attendance_base = rng.normal(74, 10)       # overlaps with both
        marks_base      = rng.normal(60, 12)
        stress          = int(np.clip(rng.normal(3, 1), 1, 5))
        motivation      = int(np.clip(rng.normal(3, 1), 1, 5))
        study_hours     = rng.normal(3.0, 1.2)
        lms_login       = rng.normal(4.0, 2.0)
        sub_rate        = rng.normal(78, 10)
        late_rate       = rng.normal(18, 10)
    else:  # at_risk
        attendance_base = rng.normal(62, 11)       # overlaps with average
        marks_base      = rng.normal(48, 14)
        stress          = int(np.clip(rng.normal(4, 1), 1, 5))
        motivation      = int(np.clip(rng.normal(2, 1), 1, 5))
        study_hours     = rng.normal(1.8, 1.0)
        lms_login       = rng.normal(2.5, 1.5)
        sub_rate        = rng.normal(58, 14)
        late_rate       = rng.normal(38, 12)

    # Clip to valid ranges
    attendance_base = float(np.clip(attendance_base, 30, 100))
    marks_base      = float(np.clip(marks_base,      20, 100))
    study_hours     = float(np.clip(study_hours,     0.5, 10))
    lms_login       = float(np.clip(lms_login,       0,   14))
    sub_rate        = float(np.clip(sub_rate,        10, 100))
    late_rate       = float(np.clip(late_rate,       0,   80))

    # ---- Smooth logistic dropout probability (NO hard thresholds) ----
    # Linear combination of standardised features + structured noise
    att_z    = (attendance_base - 74) / 12.0
    marks_z  = (marks_base      - 62) / 14.0
    stress_z = (stress          - 3)  /  1.0
    motiv_z  = (motivation      - 3)  /  1.0
    sub_z    = (sub_rate        - 75) / 14.0
    study_z  = (study_hours     - 3)  /  1.2
    lms_z    = (lms_login       - 4)  /  2.0

    # logit = negative of academic performance proxy + positive of stress
    logit = (
        -0.8 * att_z
        - 1.0 * marks_z
        + 0.5 * stress_z
        - 0.4 * motiv_z
        - 0.5 * sub_z
        - 0.3 * study_z
        - 0.2 * lms_z
        + rng.normal(0, 0.9)   # irreducible noise (hidden factors)
        - 1.5                  # intercept → pushes base rate down to ~15-20%
    )
    p_dropout = _logistic(logit)

    # Stochastic label from probability
    is_dropout = int(rng.random() < p_dropout)

    # ---- ~6% random label flip (personal crises, recovery) ----
    if rng.random() < 0.06:
        is_dropout = 1 - is_dropout

    # Subject-level variation
    subjects_data = []
    for subj in SUBJECTS:
        subj_att   = float(np.clip(attendance_base + rng.normal(0, 6), 20, 100))
        subj_marks = float(np.clip(marks_base      + rng.normal(0, 8),  0, 100))
        total_classes = rng.randint(40, 60)
        attended      = int(total_classes * subj_att / 100)
        total_asgn    = rng.randint(5, 10)
        submitted     = int(total_asgn * sub_rate / 100)
        late          = min(int(submitted * late_rate / 100), submitted)
        subjects_data.append({
            "subject":              subj,
            "attendance":          round(subj_att, 1),
            "total_classes":       total_classes,
            "attended_classes":    attended,
            "marks":               round(subj_marks, 1),
            "total_assignments":   total_asgn,
            "submitted_assignments": submitted,
            "late_submissions":    late,
            "quiz_avg":            round(float(np.clip(marks_base + rng.normal(0, 9), 0, 100)), 1),
        })

    engagement_score = float(min(100, (lms_login * 5 + study_hours * 3 + rng.randint(5, 20) * 2)))

    return {
        "idx":             idx,
        "archetype":       archetype,
        "semester":        semester,
        "year":            (semester + 1) // 2,
        "age":             rng.randint(18, 24),
        "gender":          rng.choice(["Male", "Female", "Other"]),
        "attendance_base": round(attendance_base, 1),
        "marks_base":      round(marks_base, 1),
        "stress":          stress,
        "motivation":      motivation,
        "study_hours":     round(study_hours, 1),
        "lms_login":       round(lms_login, 1),
        "engagement_score": round(engagement_score, 1),
        "subjects_data":   subjects_data,
        "is_dropout":      is_dropout,
        "p_dropout":       round(float(p_dropout), 4),
    }


STORY_STUDENTS = [
    {
        "email": "student1@mit.edu",
        "full_name": "Aarav Sharma (Dramatic Recovery)",
        "short_name": "Aarav Sharma",
        "student_id": "MIT20240001",
        "story": "Dramatic Recovery",
        "gender": "Male",
        "age": 20,
        "semester": 4,
        "year": 2,
        "current_attendance": 86.0,
        "past_attendance": 42.0,
        "current_marks": 72.0,
        "past_marks": 38.0,
        "stress": 2,
        "motivation": 4,
        "study_hours": 4.8,
        "lms_login": 7.5,
        "sub_rate": 88.0,
        "late_rate": 6.0,
        "backlogs": 0,
        "start_prob": 0.96,
        "end_prob": 0.28,
        "start_score": 38.0,
        "end_score": 72.0,
        "has_alert": False,
    },
    {
        "email": "student2@mit.edu",
        "full_name": "Diya Patel (Recovered)",
        "short_name": "Diya Patel",
        "student_id": "MIT20240002",
        "story": "Recovered",
        "gender": "Female",
        "age": 20,
        "semester": 4,
        "year": 2,
        "current_attendance": 82.0,
        "past_attendance": 50.0,
        "current_marks": 68.0,
        "past_marks": 42.0,
        "stress": 2,
        "motivation": 4,
        "study_hours": 4.5,
        "lms_login": 7.0,
        "sub_rate": 90.0,
        "late_rate": 5.0,
        "backlogs": 0,
        "start_prob": 0.81,
        "end_prob": 0.13,
        "start_score": 42.0,
        "end_score": 68.0,
        "has_alert": False,
    },
    {
        "email": "student3@mit.edu",
        "full_name": "Rohan Kulkarni (Steady Achiever)",
        "short_name": "Rohan Kulkarni",
        "student_id": "MIT20240003",
        "story": "Steady Achiever",
        "gender": "Male",
        "age": 21,
        "semester": 4,
        "year": 2,
        "current_attendance": 92.0,
        "past_attendance": 90.0,
        "current_marks": 88.0,
        "past_marks": 86.0,
        "stress": 1,
        "motivation": 5,
        "study_hours": 5.5,
        "lms_login": 8.5,
        "sub_rate": 98.0,
        "late_rate": 2.0,
        "backlogs": 0,
        "start_prob": 0.08,
        "end_prob": 0.05,
        "start_score": 86.0,
        "end_score": 88.0,
        "has_alert": False,
    },
    {
        "email": "student4@mit.edu",
        "full_name": "Ananya Iyer (Borderline)",
        "short_name": "Ananya Iyer",
        "student_id": "MIT20240004",
        "story": "Borderline",
        "gender": "Female",
        "age": 19,
        "semester": 4,
        "year": 2,
        "current_attendance": 72.0,
        "past_attendance": 78.0,
        "current_marks": 58.0,
        "past_marks": 64.0,
        "stress": 3,
        "motivation": 3,
        "study_hours": 2.8,
        "lms_login": 3.8,
        "sub_rate": 74.0,
        "late_rate": 22.0,
        "backlogs": 1,
        "start_prob": 0.38,
        "end_prob": 0.54,
        "start_score": 64.0,
        "end_score": 58.0,
        "has_alert": True,
        "alert_message": "BORDERLINE ADVISORY: Attendance is hovering near 72%. Complete pending lab assignments to maintain standing.",
    },
    {
        "email": "student5@mit.edu",
        "full_name": "Kabir Mehta (Disengaged)",
        "short_name": "Kabir Mehta",
        "student_id": "MIT20240005",
        "story": "Disengaged",
        "gender": "Male",
        "age": 20,
        "semester": 4,
        "year": 2,
        "current_attendance": 66.0,
        "past_attendance": 74.0,
        "current_marks": 55.0,
        "past_marks": 60.0,
        "stress": 3,
        "motivation": 2,
        "study_hours": 1.8,
        "lms_login": 1.2,
        "sub_rate": 62.0,
        "late_rate": 48.0,
        "backlogs": 1,
        "start_prob": 0.32,
        "end_prob": 0.62,
        "start_score": 60.0,
        "end_score": 55.0,
        "has_alert": True,
        "alert_message": "ENGAGEMENT WARNING: 48% late submission rate and low LMS login activity detected over past 30 days.",
    },
    {
        "email": "student6@mit.edu",
        "full_name": "Sneha Reddy (Backlog Risk)",
        "short_name": "Sneha Reddy",
        "student_id": "MIT20240006",
        "story": "Backlog Risk",
        "gender": "Female",
        "age": 20,
        "semester": 4,
        "year": 2,
        "current_attendance": 68.0,
        "past_attendance": 75.0,
        "current_marks": 52.0,
        "past_marks": 58.0,
        "stress": 4,
        "motivation": 2,
        "study_hours": 2.2,
        "lms_login": 3.0,
        "sub_rate": 68.0,
        "late_rate": 35.0,
        "backlogs": 3,
        "start_prob": 0.28,
        "end_prob": 0.68,
        "start_score": 58.0,
        "end_score": 52.0,
        "has_alert": True,
        "alert_message": "BACKLOG ALERT: Cumulative active backlogs (3) threaten prerequisite course progression.",
    },
]


def seed_demo_users_and_faculty(db: Session):
    """
    Idempotently seeds demo users (admin, faculty, demo story students) and faculty profiles.
    Never duplicates existing rows. Updates demo student names and links student records.
    """
    print("Creating demo users...")
    demo_users = [
        {"email": "admin@mit.edu", "full_name": "Admin User", "role": UserRole.admin, "password": "Admin@123"},
        {"email": "prof.sharma@mit.edu", "full_name": "Prof. Ramesh Sharma", "role": UserRole.faculty, "password": "Faculty@123"},
        {"email": "prof.desai@mit.edu", "full_name": "Prof. Priya Desai", "role": UserRole.faculty, "password": "Faculty@123"},
    ]
    student_demo_emails = [s["email"] for s in STORY_STUDENTS]
    for story in STORY_STUDENTS:
        demo_users.append({
            "email": story["email"],
            "full_name": story["full_name"],
            "role": UserRole.student,
            "password": "Student@123"
        })

    created_users = {}
    for ud in demo_users:
        existing = db.query(User).filter(User.email == ud["email"]).first()
        if not existing:
            u = User(
                email=ud["email"],
                full_name=ud["full_name"],
                hashed_password=get_password_hash(ud["password"]),
                role=ud["role"],
            )
            db.add(u)
            db.flush()
            created_users[ud["email"]] = u
        else:
            if existing.full_name != ud["full_name"] and ("Demo Student" in existing.full_name or "student" in existing.email):
                existing.full_name = ud["full_name"]
                db.flush()
            created_users[ud["email"]] = existing

    db.commit()

    # ---- Faculty Profiles ----
    print("Creating faculty profiles...")
    fac_users = [
        (created_users.get("prof.sharma@mit.edu"), "FAC001", "Prof. Ramesh Sharma", "Associate Professor"),
        (created_users.get("prof.desai@mit.edu"), "FAC002", "Prof. Priya Desai", "Assistant Professor"),
    ]
    created_faculty = {}
    for fac_user, fac_id, name, desig in fac_users:
        if fac_user:
            from app.models.academic import Faculty as FacultyModel
            existing = db.query(FacultyModel).filter(FacultyModel.faculty_id == fac_id).first()
            if not existing:
                fac = FacultyModel(
                    user_id=fac_user.id,
                    faculty_id=fac_id,
                    full_name=name,
                    email=fac_user.email,
                    designation=desig,
                )
                db.add(fac)
                db.flush()
                created_faculty[fac_id] = fac
            else:
                created_faculty[fac_id] = existing
    db.commit()

    # Link demo student users to Student records if student records already exist
    for i, email in enumerate(student_demo_emails):
        u = created_users.get(email)
        if u:
            st = db.query(Student).filter(Student.email == email).first()
            if not st:
                st = db.query(Student).filter(Student.student_id == f"MIT2024{(i+1):04d}").first()
            if st and st.user_id != u.id:
                st.user_id = u.id
    db.commit()

    return created_users, created_faculty, student_demo_emails


def seed_or_update_story_students(db: Session, created_users: dict, now: datetime) -> set:
    """
    Seeds or updates the 6 story students with realistic feature trajectories and
    monotonic weekly prediction series (6-8 checkpoints).
    Returns a set of student IDs to prevent generic random prediction drift.
    """
    from app.ml.predict import get_risk_level, get_grade_band, get_pass_probability
    from app.models.academic import RiskLevel, Prediction as PredModel, Alert as AlertModel
    import json as json_mod

    risk_map = {"low": RiskLevel.low, "medium": RiskLevel.medium, "high": RiskLevel.high}
    story_student_ids = set()

    for idx, story in enumerate(STORY_STUDENTS):
        user_email = story["email"]
        u = created_users.get(user_email)
        user_id = u.id if u else None
        sid = story["student_id"]

        student = db.query(Student).filter((Student.student_id == sid) | (Student.email == user_email)).first()
        if not student:
            student = Student(
                user_id=user_id,
                student_id=sid,
                full_name=story["full_name"],
                email=user_email,
                gender=story["gender"],
                age=story["age"],
                semester=story["semester"],
                year=story["year"],
            )
            db.add(student)
            db.flush()
        else:
            student.full_name = story["full_name"]
            student.email = user_email
            student.gender = story["gender"]
            student.age = story["age"]
            student.semester = story["semester"]
            student.year = story["year"]
            if user_id:
                student.user_id = user_id
            db.flush()

        story_student_ids.add(student.id)

        # Clear old records for this story student
        db.query(AcademicRecord).filter(AcademicRecord.student_id == student.id).delete()
        db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student.id).delete()
        db.query(AssignmentRecord).filter(AssignmentRecord.student_id == student.id).delete()
        db.query(QuizRecord).filter(QuizRecord.student_id == student.id).delete()
        db.query(SurveyResponse).filter(SurveyResponse.student_id == student.id).delete()
        db.query(LMSData).filter(LMSData.student_id == student.id).delete()
        db.query(AttendanceEntry).filter(AttendanceEntry.student_id == student.id).delete()
        db.flush()

        # Deterministic RNG per story student
        rng = np.random.RandomState(100 + idx * 37)

        # 5 Core Subject records
        for s_idx, subj in enumerate(SUBJECTS[:5]):
            sub_m = float(np.clip(story["current_marks"] + rng.uniform(-3, 3), 15, 100))
            sub_att = float(np.clip(story["current_attendance"] + rng.uniform(-4, 4), 15, 100))
            grade = "A" if sub_m >= 75 else "B" if sub_m >= 60 else "C" if sub_m >= 50 else "D" if sub_m >= 40 else "F"
            db.add(AcademicRecord(
                student_id=student.id,
                subject=subj,
                semester=story["semester"],
                year=story["year"],
                internal_marks=round(sub_m * 0.4, 1),
                external_marks=round(sub_m * 0.6, 1),
                total_marks=round(sub_m, 1),
                max_marks=100.0,
                grade=grade,
            ))
            db.add(AttendanceRecord(
                student_id=student.id,
                subject=subj,
                semester=story["semester"],
                year=story["year"],
                total_classes=60,
                attended_classes=int(round(60 * sub_att / 100)),
                attendance_percentage=round(sub_att, 1),
            ))
            db.add(AssignmentRecord(
                student_id=student.id,
                subject=subj,
                semester=story["semester"],
                total_assignments=10,
                submitted_assignments=int(round(10 * story["sub_rate"] / 100)),
                late_submissions=int(round(10 * story["late_rate"] / 100)),
                avg_score=round(sub_m * 0.95, 1),
            ))
            db.add(QuizRecord(
                student_id=student.id,
                subject=subj,
                semester=story["semester"],
                total_quizzes=6,
                attempted_quizzes=6 if story["motivation"] >= 3 else 4,
                avg_score=round(sub_m, 1),
            ))

        # Survey Response
        db.add(SurveyResponse(
            student_id=student.id,
            stress_level=story["stress"],
            workload_level=5 if story["stress"] >= 4 else 3,
            study_hours_per_day=story["study_hours"],
            motivation_level=story["motivation"],
            support_needed=story["has_alert"],
            support_type="Academic Counseling & Tutoring" if story["has_alert"] else None,
            free_text=f"Demonstration Archetype Profile: {story['story']}",
            consent_given=True,
            consent_timestamp=now - timedelta(days=25),
            submitted_at=now - timedelta(days=15),
        ))

        # LMS Telemetry
        db.add(LMSData(
            student_id=student.id,
            semester=story["semester"],
            login_frequency_per_week=story["lms_login"],
            avg_time_spent_hours=round(story["study_hours"] * 1.4, 1),
            resource_views=int(story["lms_login"] * 12),
            forum_posts=12 if story["story"] == "Steady Achiever" else 1 if story["story"] == "Disengaged" else 5,
            early_submissions=max(0, 10 - int(round(10 * story["late_rate"] / 100))),
            late_submissions=int(round(10 * story["late_rate"] / 100)),
            recorded_at=now - timedelta(days=2),
        ))

        # Dated Attendance entries (past 60 days)
        for day_offset in range(2, 62, 3):
            session_dt = now - timedelta(days=day_offset)
            is_recent = day_offset <= 30
            att_target = story["current_attendance"] if is_recent else story["past_attendance"]
            prob_present = att_target / 100.0
            for subj in SUBJECTS[:4]:
                st_val = "present" if (rng.random() < prob_present) else "absent"
                db.add(AttendanceEntry(
                    student_id=student.id,
                    subject=subj,
                    session_date=session_dt,
                    status=st_val
                ))

        # Prediction series: monotonic 7 weekly checkpoints
        db.query(PredModel).filter(PredModel.student_id == student.id).delete()
        db.flush()

        num_weeks = 7
        # Damped wobble so the trend has visible ups and downs, not a straight ramp.
        wobble_pattern = [0.06, -0.05, 0.05, -0.06, 0.04, -0.04, 0.0]
        for w in range(num_weeks - 1, -1, -1):
            step = num_weeks - 1 - w
            t = step / float(num_weeks - 1)
            base_p = story["start_prob"] + t * (story["end_prob"] - story["start_prob"])
            base_s = story["start_score"] + t * (story["end_score"] - story["start_score"])
            bump = wobble_pattern[step % len(wobble_pattern)] * (1.0 - t)
            p_val = float(np.clip(base_p + bump, 0.02, 0.98))
            s_val = float(np.clip(base_s + bump * 40.0, 20.0, 98.0))
            created_dt = now - timedelta(days=w * 7, hours=4)

            r_level = get_risk_level(p_val)
            g_band = get_grade_band(s_val)
            p_pass = get_pass_probability(s_val)

            factors = []
            if p_val >= 0.65:
                factors = [
                    {"factor": "Low Attendance", "impact": "High Negative", "description": f"Class presence at {story['current_attendance']}%"},
                    {"factor": "Assessment Scores", "impact": "High Negative", "description": f"Average marks at {story['current_marks']}%"},
                    {"factor": "Perceived Stress", "impact": "Moderate Negative", "description": f"Self-reported stress score {story['stress']}/5"},
                ]
            elif p_val >= 0.35:
                factors = [
                    {"factor": "Fluctuating Attendance", "impact": "Moderate Negative", "description": f"Attendance at {story['current_attendance']}%"},
                    {"factor": "Course Engagement", "impact": "Moderate Negative", "description": f"LMS activity {story['lms_login']:.1f} sessions/wk"},
                ]
            else:
                factors = [
                    {"factor": "Consistent Attendance", "impact": "High Positive", "description": f"Attendance standing at {story['current_attendance']}%"},
                    {"factor": "Strong Exam Marks", "impact": "High Positive", "description": f"Average score at {story['current_marks']}%"},
                ]

            pred_rec = PredModel(
                student_id=student.id,
                risk_level=risk_map[r_level],
                dropout_probability=round(p_val, 4),
                predicted_grade_band=g_band,
                pass_probability=round(p_pass, 4),
                predicted_score=round(s_val, 2),
                top_factors=json_mod.dumps(factors),
                model_version="v20261030_story",
                created_at=created_dt,
            )
            db.add(pred_rec)

        # Alerts (only for students ending in medium or high risk; recovered student has no active warning alert)
        db.query(AlertModel).filter(AlertModel.student_id == student.id).delete()
        if story["has_alert"]:
            db.add(AlertModel(
                student_id=student.id,
                alert_type="risk_change",
                message=story["alert_message"],
                severity=get_risk_level(story["end_prob"]),
                created_at=now,
            ))

    db.commit()
    return story_student_ids


def seed_demo_test_papers(db: Session) -> int:
    """Create a few pending test papers so the faculty verification queue is populated."""
    from app.models.test_paper import TestPaper

    if db.query(TestPaper).count() > 0:
        return 0

    subjects = [
        "Data Structures & Algorithms", "Object-Oriented Programming",
        "Database Management Systems", "Computer Networks", "Operating Systems",
        "Discrete Mathematics", "Software Engineering", "Artificial Intelligence",
    ]
    exam_types = ["Unit Test", "Midterm", "Quiz", "Assignment", "Endterm"]

    rng = random.Random(11)
    students = db.query(Student).filter(Student.id > 6).limit(15).all()
    created = 0
    for i, s in enumerate(students):
        subject = rng.choice(subjects)
        exam_type = rng.choice(exam_types)
        max_marks = rng.choice([20, 25, 50, 100])
        marks = round(rng.uniform(max_marks * 0.35, max_marks * 0.95), 1)
        db.add(TestPaper(
            student_id=s.id,
            subject=subject,
            exam_type=exam_type,
            exam_date=datetime.utcnow() - timedelta(days=rng.randint(3, 20)),
            marks_obtained=marks,
            max_marks=float(max_marks),
            file_path=f"uploads/test_papers/{s.id}/demo_{i}.pdf",
            original_filename=f"{subject.replace(' ', '_')}_{exam_type}.pdf",
            file_type="application/pdf",
            file_size=rng.randint(90_000, 420_000),
            remarks="Submitted for faculty verification.",
            status="Pending",
        ))
        created += 1
    db.commit()
    return created


def assign_mentors(db: Session) -> int:
    """Assign every student without a mentor to one of the demo faculty, alternating."""
    faculty_list = db.query(Faculty).order_by(Faculty.id).all()
    if not faculty_list:
        return 0
    students = db.query(Student).order_by(Student.id).all()
    assigned = 0
    for i, s in enumerate(students):
        if not s.mentor_id:
            s.mentor_id = faculty_list[i % len(faculty_list)].id
            assigned += 1
    db.commit()
    return assigned


def seed_database():
    print("🚀 Starting database seed...")
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        cols = [row[1] for row in conn.exec_driver_sql("PRAGMA table_info(survey_responses)").fetchall()]
        if cols and "consent_given" not in cols:
            conn.exec_driver_sql("ALTER TABLE survey_responses ADD COLUMN consent_given BOOLEAN DEFAULT 0")
        if cols and "consent_timestamp" not in cols:
            conn.exec_driver_sql("ALTER TABLE survey_responses ADD COLUMN consent_timestamp DATETIME")
        conn.commit()
    db = SessionLocal()

    try:
        # ---- Demo Accounts & Faculty Profiles ----
        created_users, created_faculty, student_demo_emails = seed_demo_users_and_faculty(db)

        # ---- Generate 520 Students ----
        print("Generating 520 synthetic students...")
        existing_count = db.query(Student).count()
        if existing_count > 10:
            print(f"  {existing_count} students already exist. Checking dated attendance records...")
            entry_count = db.query(AttendanceEntry).count()
            if entry_count == 0:
                print("  Backfilling dated AttendanceEntry records for existing students...")
                now_dt = datetime.utcnow()
                all_s = db.query(Student).all()
                for s in all_s:
                    att_rec = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == s.id).first()
                    att_pct = att_rec.attendance_percentage if att_rec else 75.0
                    is_at_risk = att_pct < 65.0
                    for subj in SUBJECTS[:4]:
                        for day_offset in range(2, 62, 3):
                            session_dt = now_dt - timedelta(days=day_offset)
                            is_recent = day_offset <= 30
                            if is_at_risk:
                                prob_present = 0.40 if is_recent else 0.70
                            elif att_pct >= 85.0:
                                prob_present = 0.92 if is_recent else 0.90
                            else:
                                prob_present = 0.78 if is_recent else 0.76
                            status = "present" if (random.random() < prob_present) else "absent"
                            db.add(AttendanceEntry(
                                student_id=s.id,
                                subject=subj,
                                session_date=session_dt,
                                status=status
                            ))
                db.commit()
                print("  Dated attendance records backfilled.")
            # Backfill consent
            for surv in db.query(SurveyResponse).filter(SurveyResponse.consent_given == False).all():
                surv.consent_given = True
                surv.consent_timestamp = datetime.utcnow() - timedelta(days=random.randint(5, 30))
            db.commit()

            # Ensure story students are always updated with their story trajectories
            now_dt = datetime.utcnow()
            story_ids = seed_or_update_story_students(db, created_users, now_dt)
            print(f"  Crafted/updated {len(story_ids)} demonstration story profiles.")
        else:
            semesters = [1, 2, 3, 4, 5, 6]
            student_data_for_training = []
            student_idx = 1

            # Create 5 demo student profiles first
            demo_student_profiles = []
            demo_archetypes = ["high", "average", "average", "at_risk", "at_risk"]
            for i, (email, archetype) in enumerate(zip(student_demo_emails, demo_archetypes)):
                sem = random.choice(semesters)
                profile = generate_student_profile(student_idx, sem)
                profile["archetype"] = archetype
                # Adjust based on archetype
                if archetype == "at_risk":
                    profile["marks_base"] = max(35, profile["marks_base"] - 10)
                    profile["attendance_base"] = max(50, profile["attendance_base"] - 10)
                    # Don't force is_dropout=1 — let logistic function decide

                demo_student_profiles.append((email, profile))
                student_idx += 1

            all_profiles = [(None, profile) for i in range(520 - 5) for profile in
                            [generate_student_profile(student_idx + i, random.choice(semesters))]]
            # Rebuild properly
            all_profiles = []
            for i in range(515):
                sem = random.choice(semesters)
                profile = generate_student_profile(student_idx, sem)
                all_profiles.append((None, profile))
                student_idx += 1

            all_profiles_combined = demo_student_profiles + all_profiles

            for i, (user_email, profile) in enumerate(all_profiles_combined):
                sid = f"MIT2024{(i+1):04d}"
                name = random_name()
                email_addr = user_email or f"{sid.lower()}@mit.edu"

                # Check existing
                existing_s = db.query(Student).filter(Student.student_id == sid).first()
                if existing_s:
                    continue

                # Check email uniqueness
                existing_email = db.query(Student).filter(Student.email == email_addr).first()
                if existing_email:
                    email_addr = f"{sid.lower()}_{random.randint(1,999)}@mit.edu"

                user_id = None
                if user_email and user_email in created_users:
                    user_id = created_users[user_email].id
                    name = created_users[user_email].full_name

                student = Student(
                    user_id=user_id,
                    student_id=sid,
                    full_name=name,
                    email=email_addr,
                    gender=profile["gender"],
                    age=profile["age"],
                    semester=profile["semester"],
                    year=profile["year"],
                )
                db.add(student)
                db.flush()

                # Academic records
                for sd in profile["subjects_data"]:
                    grade = "A" if sd["marks"] >= 75 else "B" if sd["marks"] >= 60 else "C" if sd["marks"] >= 50 else "D" if sd["marks"] >= 40 else "F"
                    db.add(AcademicRecord(
                        student_id=student.id,
                        subject=sd["subject"],
                        semester=profile["semester"],
                        year=profile["year"],
                        internal_marks=round(sd["marks"] * 0.4, 1),
                        external_marks=round(sd["marks"] * 0.6, 1),
                        total_marks=round(sd["marks"], 1),
                        max_marks=100.0,
                        grade=grade,
                    ))
                    db.add(AttendanceRecord(
                        student_id=student.id,
                        subject=sd["subject"],
                        semester=profile["semester"],
                        year=profile["year"],
                        total_classes=sd["total_classes"],
                        attended_classes=sd["attended_classes"],
                        attendance_percentage=sd["attendance"],
                    ))
                    db.add(AssignmentRecord(
                        student_id=student.id,
                        subject=sd["subject"],
                        semester=profile["semester"],
                        total_assignments=sd["total_assignments"],
                        submitted_assignments=sd["submitted_assignments"],
                        late_submissions=sd["late_submissions"],
                        avg_score=round(sd["marks"] * 0.9 + np.random.normal(0, 3), 1),
                    ))
                    db.add(QuizRecord(
                        student_id=student.id,
                        subject=sd["subject"],
                        semester=profile["semester"],
                        total_quizzes=random.randint(4, 8),
                        attempted_quizzes=random.randint(3, 8),
                        avg_score=round(sd["quiz_avg"], 1),
                    ))

                    # 30-day velocity dated attendance entries
                    now_dt = datetime.utcnow()
                    for day_offset in range(2, 62, 3):
                        session_dt = now_dt - timedelta(days=day_offset)
                        is_recent = day_offset <= 30
                        if profile["archetype"] == "at_risk":
                            prob_present = 0.40 if is_recent else 0.70
                        elif profile["archetype"] == "high":
                            prob_present = 0.92 if is_recent else 0.90
                        else:  # average
                            prob_present = 0.78 if is_recent else 0.76
                        status = "present" if (random.random() < prob_present) else "absent"
                        db.add(AttendanceEntry(
                            student_id=student.id,
                            subject=sd["subject"],
                            session_date=session_dt,
                            status=status
                        ))

                # Survey
                db.add(SurveyResponse(
                    student_id=student.id,
                    stress_level=profile["stress"],
                    workload_level=random.randint(2, 5),
                    study_hours_per_day=profile["study_hours"],
                    motivation_level=profile["motivation"],
                    support_needed=profile.get("is_dropout", 0) == 1,
                    support_type="Academic" if profile.get("is_dropout", 0) == 1 else None,
                    consent_given=True,
                    consent_timestamp=datetime.utcnow() - timedelta(days=random.randint(5, 30)),
                ))

                # LMS data
                db.add(LMSData(
                    student_id=student.id,
                    semester=profile["semester"],
                    login_frequency_per_week=profile["lms_login"],
                    avg_time_spent_hours=round(profile["study_hours"] * 0.7, 1),
                    resource_views=random.randint(5, 50),
                    forum_posts=random.randint(0, 10),
                    forum_views=random.randint(5, 30),
                    early_submissions=random.randint(0, 5),
                    late_submissions=random.randint(0, 5),
                ))

                # Store for training
                student_data_for_training.append({
                    "student_id": student.id,
                    "is_dropout": profile["is_dropout"],
                    "archetype": profile["archetype"],
                })

                if (i + 1) % 50 == 0:
                    db.commit()
                    print(f"  Inserted {i+1} students...")

            db.commit()
            print("  Done inserting students.")

        # ---- Train model & compute fairness audit ----
        print("\n📊 Training ML models & computing fairness benchmarks...")
        from app.ml.preprocessing import build_features_from_db
        import pandas as pd

        all_students = db.query(Student).all()
        rows = []
        for s in all_students:
            feats = build_features_from_db(db, s.id)
            if feats:
                feats["gender"] = s.gender or "Male"
                feats["age"] = s.age or 20
                matching = next((d for d in student_data_for_training if d["student_id"] == s.id), None) if 'student_data_for_training' in locals() else None
                if matching:
                    feats["is_dropout"] = matching["is_dropout"]
                else:
                    # Probabilistic fallback — not a hard threshold
                    score = feats.get("avg_marks", 60)
                    att   = feats.get("attendance_percentage", 75)
                    stress = feats.get("stress_score", 3)
                    att_z   = (att   - 74) / 12.0
                    marks_z = (score - 62) / 14.0
                    s_z     = (stress - 3) / 1.0
                    logit   = -0.8*att_z - 1.0*marks_z + 0.5*s_z - 1.5
                    p_fb    = 1.0 / (1.0 + np.exp(-np.clip(logit, -20, 20)))
                    feats["is_dropout"] = int(np.random.random() < p_fb)
                rows.append(feats)

        if len(rows) >= 50:
            df = pd.DataFrame(rows)
            import json
            meta = train_models(df, settings.MODEL_DIR)
            print(f"  Best model: {meta['best_algorithm']}, AUC: {meta['metrics']['roc_auc']:.4f}")

            # Save to DB
            mv = ModelVersion(
                version=meta["version"],
                algorithm=meta["best_algorithm"],
                accuracy=meta["metrics"]["accuracy"],
                precision=meta["metrics"]["precision"],
                recall=meta["metrics"]["recall"],
                f1_score=meta["metrics"]["f1_score"],
                roc_auc=meta["metrics"]["roc_auc"],
                training_samples=meta["training_samples"],
                is_active=True,
                metrics_json=json.dumps(meta),
            )
            db.query(ModelVersion).update({"is_active": False})
            db.add(mv)
            db.commit()

            # ---- Run predictions for all students ----
            print("\n🔮 Generating predictions for all students...")
            from app.ml.predict import predict_student, get_risk_level, get_grade_band, get_pass_probability
            from app.models.academic import RiskLevel, Prediction as PredModel, Alert as AlertModel

            risk_map = {"low": RiskLevel.low, "medium": RiskLevel.medium, "high": RiskLevel.high}
            import json as json_mod

            now = datetime.utcnow()
            story_ids = seed_or_update_story_students(db, created_users, now)
            print(f"  Crafted {len(story_ids)} story profiles with monotonic trajectories.")
            for s in all_students:
                if s.id in story_ids:
                    continue
                try:
                    existing_preds = db.query(PredModel).filter(PredModel.student_id == s.id).all()
                    if len(existing_preds) >= 6:
                        continue

                    pred = predict_student(db, s.id, settings.MODEL_DIR)
                    base_prob = float(pred["dropout_probability"])
                    base_score = float(pred.get("predicted_score") or 65.0)

                    # Replace single old predictions with the 6-8 weekly series
                    if existing_preds:
                        for ep in existing_preds:
                            db.delete(ep)
                        db.flush()

                    num_weeks = random.randint(6, 8)
                    for w in range(num_weeks - 1, -1, -1):
                        created_dt = now - timedelta(days=w * 7 + random.randint(0, 1), hours=random.randint(1, 12))
                        if w == 0:
                            # Spread the latest probability so the roster does not show 100% for everyone
                            p_val = float(np.clip(base_prob * random.uniform(0.74, 1.0), 0.03, 0.97))
                            s_val = base_score
                        else:
                            drift = (random.random() - 0.5) * 0.18
                            p_val = float(np.clip(base_prob + drift, 0.01, 0.99))
                            s_val = float(np.clip(base_score + (random.random() - 0.5) * 10.0, 20.0, 98.0))

                        r_level = get_risk_level(p_val)
                        g_band = get_grade_band(s_val)
                        p_pass = get_pass_probability(s_val)

                        new_pred = PredModel(
                            student_id=s.id,
                            risk_level=risk_map[r_level],
                            dropout_probability=round(p_val, 4),
                            predicted_grade_band=g_band,
                            pass_probability=round(p_pass, 4),
                            predicted_score=round(s_val, 2),
                            top_factors=json_mod.dumps(pred.get("top_factors", [])),
                            model_version=pred.get("model_version"),
                            created_at=created_dt,
                        )
                        db.add(new_pred)

                    # Generate alerts for at-risk
                    if pred["risk_level"] in ["medium", "high"]:
                        alert = AlertModel(
                            student_id=s.id,
                            alert_type="risk_change",
                            message=f"Your academic risk level is {pred['risk_level'].upper()}. Please review your performance and seek help if needed.",
                            severity=pred["risk_level"],
                            created_at=now,
                        )
                        db.add(alert)
                except Exception as e:
                    print(f"  ⚠️ Warning: Failed to generate prediction for student {s.id}: {e}")

            db.commit()
            print("  Predictions generated with 6-8 weekly historical checkpoints.")

        assigned = assign_mentors(db)
        if assigned:
            print(f"  Assigned mentors to {assigned} students.")

        papers = seed_demo_test_papers(db)
        if papers:
            print(f"  Seeded {papers} pending test papers for faculty verification.")

        print("\n✅ Seed complete!")
        print("Demo accounts:")
        print("  Admin:   admin@mit.edu / Admin@123")
        print("  Faculty: prof.sharma@mit.edu / Faculty@123")
        print("  Faculty: prof.desai@mit.edu / Faculty@123")
        print("  Student: student1@mit.edu / Student@123  (through student6)")
        print("\nStory Demonstration Accounts:")
        for s in STORY_STUDENTS:
            print(f"  {s['email']}: {s['full_name']} — Trajectory: {s['story']}")

    except Exception as e:
        print(f"❌ Seed error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
