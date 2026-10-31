from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import logging

import sys
from .config import settings, BACKEND_DIR

# Ensure backend root is on sys.path so data.seed and app modules resolve from any working directory
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from .database import engine, Base, SessionLocal
from .routers import auth, students, faculty, admin, predictions, upload, reports, alerts, test_papers, attendance

logger = logging.getLogger("app.main")
logger.info(f"Database path: {settings.resolved_db_path}")
print(f"[DATABASE] Path: {settings.resolved_db_path}")

# Create all tables
Base.metadata.create_all(bind=engine)

def ensure_sqlite_schema():
    with engine.connect() as conn:
        cols = [row[1] for row in conn.exec_driver_sql("PRAGMA table_info(survey_responses)").fetchall()]
        if cols and "consent_given" not in cols:
            conn.exec_driver_sql("ALTER TABLE survey_responses ADD COLUMN consent_given BOOLEAN DEFAULT 0")
        if cols and "consent_timestamp" not in cols:
            conn.exec_driver_sql("ALTER TABLE survey_responses ADD COLUMN consent_timestamp DATETIME")
        conn.commit()

ensure_sqlite_schema()


def ensure_workflow_schema():
    """Idempotent ALTERs for Prompt-3 columns on existing SQLite databases."""
    specs = {
        "students": [("mentor_id", "INTEGER"), ("guardian_email", "VARCHAR")],
        "interventions": [("follow_up_date", "DATETIME"), ("outcome", "VARCHAR")],
        "audit_logs": [("ip_address", "VARCHAR")],
    }
    with engine.connect() as conn:
        for table, cols in specs.items():
            existing = [r[1] for r in conn.exec_driver_sql(f"PRAGMA table_info({table})").fetchall()]
            if not existing:
                continue
            for name, ctype in cols:
                if name not in existing:
                    conn.exec_driver_sql(f"ALTER TABLE {table} ADD COLUMN {name} {ctype}")
        conn.commit()


ensure_workflow_schema()

def ensure_startup_data():
    from .models.user import User
    from .models.academic import Student
    from data.seed import seed_demo_users_and_faculty, seed_database

    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        if user_count == 0:
            print("[STARTUP] Users table is empty. Initializing startup seed...")
            student_count = db.query(Student).count()
            if student_count == 0:
                seed_database()
            else:
                seed_demo_users_and_faculty(db)
            print("[STARTUP] Startup seed finished.")
    except Exception as e:
        logger.error(f"Error checking startup data: {e}")
        print(f"[STARTUP] Error checking startup data: {e}")
    finally:
        db.close()

app = FastAPI(
    title="Student Academic Performance & Dropout Risk Predictor",
    description="AI-based system to predict student academic performance and dropout risk. — MIT School of Computing, Dept. of CSE",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

@app.on_event("startup")
def startup_event():
    ensure_startup_data()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(students.router)
app.include_router(faculty.router)
app.include_router(admin.router)
app.include_router(predictions.router)
app.include_router(upload.router)
app.include_router(reports.router)
app.include_router(alerts.router)
app.include_router(test_papers.router)
app.include_router(attendance.router)

from fastapi.responses import RedirectResponse

@app.get("/", include_in_schema=False)
def index():
    return RedirectResponse(url="/api/docs")

_cached_ml_model = None
_model_load_attempted = False

def get_cached_model():
    global _cached_ml_model, _model_load_attempted
    if not _model_load_attempted or _cached_ml_model is None:
        try:
            from .ml.train import load_model
            _cached_ml_model = load_model(settings.MODEL_DIR)
        except Exception:
            _cached_ml_model = None
        _model_load_attempted = True
    return _cached_ml_model

@app.get("/api/health")
def health_check():
    from .models.user import User
    from .models.academic import Student

    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        student_count = db.query(Student).count()
    except Exception:
        user_count = 0
        student_count = 0
    finally:
        db.close()

    model_loaded = get_cached_model() is not None

    return {
        "status": "ok",
        "db_path": settings.resolved_db_path,
        "user_count": user_count,
        "student_count": student_count,
        "model_loaded": model_loaded,
    }

@app.get("/api/")
def root():
    return {
        "message": "Welcome to the Student Academic Performance & Dropout Risk Predictor API",
        "docs": "/api/docs",
        "institution": "MIT School of Computing — Dept. of Computer Science & Engineering",
    }
