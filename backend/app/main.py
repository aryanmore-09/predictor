from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from .database import engine, Base
from .routers import auth, students, faculty, admin, predictions, upload, reports, alerts

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

app = FastAPI(
    title="Student Academic Performance & Dropout Risk Predictor",
    description="AI-based system to predict student academic performance and dropout risk. — MIT School of Computing, Dept. of CSE",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
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

from fastapi.responses import RedirectResponse

@app.get("/", include_in_schema=False)
def index():
    return RedirectResponse(url="/api/docs")

@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "Student Academic Performance & Dropout Risk Predictor"}

@app.get("/api/")
def root():
    return {
        "message": "Welcome to the Student Academic Performance & Dropout Risk Predictor API",
        "docs": "/api/docs",
        "institution": "MIT School of Computing — Dept. of Computer Science & Engineering",
    }
