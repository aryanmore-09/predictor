"""Mentor scoping tests — faculty only see/act on their own mentees."""
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.models.academic import Student, Faculty

client = TestClient(app)


def _login(email, password):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def _mentor_students():
    db = SessionLocal()
    fac_a = db.query(Faculty).filter(Faculty.faculty_id == "FAC001").first()
    fac_b = db.query(Faculty).filter(Faculty.faculty_id == "FAC002").first()
    a_ids = [s.id for s in db.query(Student).filter(Student.mentor_id == fac_a.id).all()]
    b_ids = [s.id for s in db.query(Student).filter(Student.mentor_id == fac_b.id).all()]
    db.close()
    return a_ids, b_ids


def test_mentor_assignment_exists():
    a_ids, b_ids = _mentor_students()
    assert len(a_ids) > 0
    assert len(b_ids) > 0


def test_faculty_cannot_view_other_mentors_student():
    a_ids, b_ids = _mentor_students()
    headers = _login("prof.sharma@mit.edu", "Faculty@123")
    res = client.get(f"/api/faculty/students/{b_ids[0]}/detail", headers=headers)
    assert res.status_code == 403


def test_faculty_can_view_own_student():
    a_ids, _ = _mentor_students()
    headers = _login("prof.sharma@mit.edu", "Faculty@123")
    res = client.get(f"/api/faculty/students/{a_ids[0]}/detail", headers=headers)
    assert res.status_code == 200


def test_faculty_student_list_is_scoped():
    a_ids, _ = _mentor_students()
    headers = _login("prof.sharma@mit.edu", "Faculty@123")
    res = client.get("/api/faculty/students?page=1&page_size=100", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] <= len(a_ids)


def test_admin_can_view_any_student():
    _, b_ids = _mentor_students()
    headers = _login("admin@mit.edu", "Admin@123")
    res = client.get(f"/api/faculty/students/{b_ids[0]}/detail", headers=headers)
    assert res.status_code == 200
