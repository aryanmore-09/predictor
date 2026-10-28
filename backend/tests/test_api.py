from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_api_root():
    response = client.get("/api/")
    assert response.status_code == 200
    assert "MIT" in response.json()["institution"]


def test_login_invalid():
    response = client.post("/api/auth/login", json={"email": "wrong@mit.edu", "password": "wrongpassword"})
    assert response.status_code == 401


def test_login_admin():
    response = client.post("/api/auth/login", json={"email": "admin@mit.edu", "password": "Admin@123"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "admin"


def test_survey_consent_enforcement():
    # Login as student1
    res = client.post("/api/auth/login", json={"email": "student1@mit.edu", "password": "Student@123"})
    assert res.status_code == 200
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt survey without consent
    res_no_consent = client.post("/api/students/me/survey", json={
        "stress_level": 3,
        "workload_level": 3,
        "study_hours_per_day": 4.0,
        "motivation_level": 4,
        "consent_given": False
    }, headers=headers)
    assert res_no_consent.status_code == 400
    assert "consent is required" in res_no_consent.json()["detail"].lower()

    # Submit with consent
    res_consent = client.post("/api/students/me/survey", json={
        "stress_level": 3,
        "workload_level": 3,
        "study_hours_per_day": 4.0,
        "motivation_level": 4,
        "consent_given": True
    }, headers=headers)
    assert res_consent.status_code == 200
    data = res_consent.json()
    assert data["consent_given"] is True
    assert data["consent_timestamp"] is not None


def test_admin_dsr_export_and_audit():
    # Login as admin
    res = client.post("/api/auth/login", json={"email": "admin@mit.edu", "password": "Admin@123"})
    assert res.status_code == 200
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Export student 1
    exp_res = client.get("/api/admin/dsr/export/1", headers=headers)
    assert exp_res.status_code == 200
    dossier = exp_res.json()
    assert "student_profile" in dossier
    assert "academic_records" in dossier
    assert "attendance_dated_entries" in dossier

    # Check audit log
    audit_res = client.get("/api/admin/audit-logs", headers=headers)
    assert audit_res.status_code == 200
    logs = audit_res.json()
    assert any(l["action"] == "DSR_EXPORT" for l in logs)

