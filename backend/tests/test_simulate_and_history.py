import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.academic import Prediction, Student

client = TestClient(app)


@pytest.fixture(scope="module")
def student_auth():
    res = client.post("/api/auth/login", json={"email": "student1@mit.edu", "password": "Student@123"})
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def faculty_auth():
    res = client.post("/api/auth/login", json={"email": "prof.sharma@mit.edu", "password": "Faculty@123"})
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_simulate_student_self_success(student_auth):
    # Student simulating without providing student_id (defaults to self)
    res = client.post("/api/predictions/simulate", json={
        "attendance_percentage": 95.0,
        "avg_marks": 88.0,
        "assignment_submission_rate": 90.0,
        "study_hours": 5.0,
        "stress_score": 2.0,
        "motivation_score": 4.0
    }, headers=student_auth)
    assert res.status_code == 200
    data = res.json()
    assert data["student_id"] == 1
    assert "original" in data
    assert "simulated" in data
    assert "dropout_probability" in data["simulated"]
    assert "risk_level" in data["simulated"]
    assert "grade_band" in data["simulated"]
    assert data["simulated"]["grade_band"] == "A"


def test_simulate_student_forbidden_for_other(student_auth):
    # Student1 trying to simulate for Student 2
    res = client.post("/api/predictions/simulate", json={
        "student_id": 2,
        "attendance_percentage": 50.0
    }, headers=student_auth)
    assert res.status_code == 403
    assert "only simulate their own" in res.json()["detail"]


def test_simulate_faculty_any_student(faculty_auth):
    res = client.post("/api/predictions/simulate", json={
        "student_id": 2,
        "attendance_percentage": 40.0,
        "avg_marks": 35.0,
        "stress_score": 5.0,
        "motivation_score": 1.0
    }, headers=faculty_auth)
    assert res.status_code == 200
    data = res.json()
    assert data["student_id"] == 2
    assert "original" in data
    assert "simulated" in data
    assert data["simulated"]["dropout_probability"] >= 0.35
    assert data["simulated"]["risk_level"] in ["medium", "high"]


def test_simulate_faculty_missing_student_id(faculty_auth):
    res = client.post("/api/predictions/simulate", json={
        "attendance_percentage": 85.0
    }, headers=faculty_auth)
    assert res.status_code == 400
    assert "student_id is required" in res.json()["detail"]


def test_simulate_does_not_save_to_database(student_auth):
    db = SessionLocal()
    count_before = db.query(Prediction).count()
    db.close()

    res = client.post("/api/predictions/simulate", json={
        "attendance_percentage": 98.0,
        "avg_marks": 92.0
    }, headers=student_auth)
    assert res.status_code == 200

    db = SessionLocal()
    count_after = db.query(Prediction).count()
    db.close()

    assert count_before == count_after, "Simulation must not save predictions to DB"


def test_student_history_self(student_auth):
    res = client.get("/api/predictions/student/1/history", headers=student_auth)
    assert res.status_code == 200
    history = res.json()
    assert isinstance(history, list)
    assert len(history) >= 6
    assert len(history) <= 12

    first_item = history[0]
    assert "dropout_probability" in first_item
    assert "risk_level" in first_item
    assert "created_at" in first_item
    assert first_item["student_id"] == 1


def test_student_history_forbidden_for_other(student_auth):
    # Student1 trying to access Student 2 history
    res = client.get("/api/predictions/student/2/history", headers=student_auth)
    assert res.status_code == 403
    assert "only view their own" in res.json()["detail"]


def test_faculty_can_access_student_history(faculty_auth):
    res = client.get("/api/predictions/student/1/history", headers=faculty_auth)
    assert res.status_code == 200
    history = res.json()
    assert isinstance(history, list)
    assert len(history) >= 6


def test_history_student_not_found(faculty_auth):
    res = client.get("/api/predictions/student/999999/history", headers=faculty_auth)
    assert res.status_code == 404


def test_pdf_report_access(student_auth, faculty_auth):
    # Student downloading own report
    s_res = client.get("/api/reports/student/1/pdf", headers=student_auth)
    assert s_res.status_code == 200
    assert s_res.headers.get("content-type") == "application/pdf"
    assert len(s_res.content) > 1000

    # Faculty downloading student report
    f_res = client.get("/api/reports/student/1/pdf", headers=faculty_auth)
    assert f_res.status_code == 200
    assert f_res.headers.get("content-type") == "application/pdf"

    # Student forbidden from downloading another student's report
    forbidden_res = client.get("/api/reports/student/2/pdf", headers=student_auth)
    assert forbidden_res.status_code == 403

