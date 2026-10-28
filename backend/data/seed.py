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
        # ---- Demo Accounts ----
        print("Creating demo users...")
        demo_users = [
            {"email": "admin@mit.edu", "full_name": "Admin User", "role": UserRole.admin, "password": "Admin@123"},
            {"email": "prof.sharma@mit.edu", "full_name": "Prof. Ramesh Sharma", "role": UserRole.faculty, "password": "Faculty@123"},
            {"email": "prof.desai@mit.edu", "full_name": "Prof. Priya Desai", "role": UserRole.faculty, "password": "Faculty@123"},
        ]
        student_demo_emails = [
            "student1@mit.edu", "student2@mit.edu", "student3@mit.edu",
            "student4@mit.edu", "student5@mit.edu"
        ]
        for i, email in enumerate(student_demo_emails):
            demo_users.append({
                "email": email,
                "full_name": f"Demo Student {i+1}",
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
            from app.ml.predict import predict_student
            from app.models.academic import RiskLevel

            risk_map = {"low": RiskLevel.low, "medium": RiskLevel.medium, "high": RiskLevel.high}
            import json as json_mod

            for s in all_students:
                try:
                    pred = predict_student(db, s.id, settings.MODEL_DIR)
                    from app.models.academic import Prediction as PredModel, Alert as AlertModel
                    existing_pred = db.query(PredModel).filter(PredModel.student_id == s.id).first()
                    if not existing_pred:
                        new_pred = PredModel(
                            student_id=s.id,
                            risk_level=risk_map[pred["risk_level"]],
                            dropout_probability=pred["dropout_probability"],
                            predicted_grade_band=pred.get("predicted_grade_band"),
                            pass_probability=pred.get("pass_probability"),
                            predicted_score=pred.get("predicted_score"),
                            top_factors=json_mod.dumps(pred.get("top_factors", [])),
                            model_version=pred.get("model_version"),
                        )
                        db.add(new_pred)

                        # Generate alerts for at-risk
                        if pred["risk_level"] in ["medium", "high"]:
                            alert = AlertModel(
                                student_id=s.id,
                                alert_type="risk_change",
                                message=f"Your academic risk level is {pred['risk_level'].upper()}. Please review your performance and seek help if needed.",
                                severity=pred["risk_level"],
                            )
                            db.add(alert)
                except Exception as e:
                    pass

            db.commit()
            print("  Predictions generated.")

        print("\n✅ Seed complete!")
        print("Demo accounts:")
        print("  Admin:   admin@mit.edu / Admin@123")
        print("  Faculty: prof.sharma@mit.edu / Faculty@123")
        print("  Faculty: prof.desai@mit.edu / Faculty@123")
        print("  Student: student1@mit.edu / Student@123  (through student5)")

    except Exception as e:
        print(f"❌ Seed error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
