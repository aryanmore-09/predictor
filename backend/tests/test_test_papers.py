import io
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_tokens():
    # Login as student1
    r_s1 = client.post("/api/auth/login", json={"email": "student1@mit.edu", "password": "Student@123"})
    token_s1 = r_s1.json()["access_token"]
    headers_s1 = {"Authorization": f"Bearer {token_s1}"}

    # Login as student2
    r_s2 = client.post("/api/auth/login", json={"email": "student2@mit.edu", "password": "Student@123"})
    token_s2 = r_s2.json()["access_token"]
    headers_s2 = {"Authorization": f"Bearer {token_s2}"}

    # Login as faculty
    r_f = client.post("/api/auth/login", json={"email": "prof.sharma@mit.edu", "password": "Faculty@123"})
    token_f = r_f.json()["access_token"]
    headers_f = {"Authorization": f"Bearer {token_f}"}

    return headers_s1, headers_s2, headers_f


def test_upload_validation_errors():
    headers_s1, _, _ = get_tokens()

    # 1. Invalid file extension (.exe)
    fake_exe = io.BytesIO(b"MZ executable contents")
    res = client.post(
        "/api/test-papers/",
        data={
            "subject": "Data Structures & Algorithms",
            "exam_type": "Midterm",
            "exam_date": "2026-10-15",
            "marks_obtained": "45",
            "max_marks": "50",
            "remarks": "Midterm exam paper"
        },
        files={"file": ("malicious.exe", fake_exe, "application/octet-stream")},
        headers=headers_s1
    )
    assert res.status_code == 400
    assert "Invalid file extension" in res.json()["detail"]

    # 2. Spoofed extension with invalid magic bytes
    fake_pdf = io.BytesIO(b"Not a real PDF file header")
    res = client.post(
        "/api/test-papers/",
        data={
            "subject": "Data Structures & Algorithms",
            "exam_type": "Midterm",
            "exam_date": "2026-10-15",
            "marks_obtained": "45",
            "max_marks": "50",
        },
        files={"file": ("fake.pdf", fake_pdf, "application/pdf")},
        headers=headers_s1
    )
    assert res.status_code == 400
    assert "File content does not match" in res.json()["detail"]

    # 3. Marks obtained > Max marks
    valid_pdf_content = b"%PDF-1.4 sample pdf content for unit test"
    res = client.post(
        "/api/test-papers/",
        data={
            "subject": "Data Structures & Algorithms",
            "exam_type": "Midterm",
            "exam_date": "2026-10-15",
            "marks_obtained": "105",
            "max_marks": "100",
        },
        files={"file": ("paper.pdf", io.BytesIO(valid_pdf_content), "application/pdf")},
        headers=headers_s1
    )
    assert res.status_code == 400
    assert "cannot exceed" in res.json()["detail"].lower()

    # 4. Negative marks
    res = client.post(
        "/api/test-papers/",
        data={
            "subject": "Data Structures & Algorithms",
            "exam_type": "Midterm",
            "exam_date": "2026-10-15",
            "marks_obtained": "-5",
            "max_marks": "100",
        },
        files={"file": ("paper.pdf", io.BytesIO(valid_pdf_content), "application/pdf")},
        headers=headers_s1
    )
    assert res.status_code == 400
    assert "negative" in res.json()["detail"].lower()


def test_test_paper_lifecycle_and_access_control():
    headers_s1, headers_s2, headers_f = get_tokens()

    # 1. Student 1 successfully uploads valid PDF paper
    valid_pdf_content = b"%PDF-1.4 realistic minimal valid pdf binary stream"
    res_upload = client.post(
        "/api/test-papers/",
        data={
            "subject": "Data Structures & Algorithms",
            "exam_type": "Quiz",
            "exam_date": "2026-10-20",
            "marks_obtained": "22",
            "max_marks": "25",
            "remarks": "Quiz 2 DSA"
        },
        files={"file": ("dsa_quiz.pdf", io.BytesIO(valid_pdf_content), "application/pdf")},
        headers=headers_s1
    )
    assert res_upload.status_code == 201, res_upload.text
    paper = res_upload.json()
    paper_id = paper["id"]
    assert paper["subject"] == "Data Structures & Algorithms"
    assert paper["marks_obtained"] == 22
    assert paper["max_marks"] == 25
    assert paper["status"] == "Pending"

    # 2. Student 1 can fetch their own paper and download file
    res_get = client.get(f"/api/test-papers/{paper_id}", headers=headers_s1)
    assert res_get.status_code == 200
    assert res_get.json()["id"] == paper_id

    res_file = client.get(f"/api/test-papers/{paper_id}/file", headers=headers_s1)
    assert res_file.status_code == 200
    assert res_file.content == valid_pdf_content

    # 3. Student 2 tries to access Student 1's paper -> 403 Forbidden
    res_s2_get = client.get(f"/api/test-papers/{paper_id}", headers=headers_s2)
    assert res_s2_get.status_code == 403

    res_s2_file = client.get(f"/api/test-papers/{paper_id}/file", headers=headers_s2)
    assert res_s2_file.status_code == 403

    # 4. Student 1 updates paper remarks & marks while Pending
    res_update = client.put(
        f"/api/test-papers/{paper_id}",
        json={"marks_obtained": 23, "remarks": "Updated Quiz 2 marks"},
        headers=headers_s1
    )
    assert res_update.status_code == 200
    assert res_update.json()["marks_obtained"] == 23
    assert res_update.json()["remarks"] == "Updated Quiz 2 marks"

    # 5. Student 1 checks /api/test-papers/me and summary
    res_me = client.get("/api/test-papers/me", headers=headers_s1)
    assert res_me.status_code == 200
    assert any(p["id"] == paper_id for p in res_me.json()["items"])

    res_summary = client.get("/api/test-papers/me/summary", headers=headers_s1)
    assert res_summary.status_code == 200
    assert res_summary.json()["total_uploaded"] >= 1

    # 6. Faculty views pending papers
    res_pending = client.get("/api/test-papers/faculty/pending", headers=headers_f)
    assert res_pending.status_code == 200
    assert isinstance(res_pending.json(), list)

    # 7. Faculty verifies the paper
    res_verify = client.patch(
        f"/api/test-papers/{paper_id}/verify",
        json={
            "status": "Verified",
            "faculty_comment": "Verified accurate marks.",
            "corrected_marks": 24
        },
        headers=headers_f
    )
    assert res_verify.status_code == 200
    verified_data = res_verify.json()
    assert verified_data["status"] == "Verified"
    assert verified_data["marks_obtained"] == 24
    assert verified_data["faculty_comment"] == "Verified accurate marks."
    assert verified_data["verified_by"] is not None

    # 8. Student cannot modify or delete a verified paper
    res_blocked_edit = client.put(
        f"/api/test-papers/{paper_id}",
        json={"marks_obtained": 25},
        headers=headers_s1
    )
    assert res_blocked_edit.status_code == 400
    assert "pending" in res_blocked_edit.json()["detail"].lower()

    res_blocked_del = client.delete(f"/api/test-papers/{paper_id}", headers=headers_s1)
    assert res_blocked_del.status_code == 400
    assert "pending" in res_blocked_del.json()["detail"].lower()
