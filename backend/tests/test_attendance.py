import io
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_headers():
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

    # Login as admin
    r_a = client.post("/api/auth/login", json={"email": "admin@mit.edu", "password": "Admin@123"})
    token_a = r_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    return headers_s1, headers_s2, headers_f, headers_a


def test_student_attendance_endpoints_and_access_control():
    headers_s1, headers_s2, headers_f, headers_a = get_auth_headers()

    # 1. Student fetches own summary
    res_summary = client.get("/api/attendance/me/summary", headers=headers_s1)
    assert res_summary.status_code == 200
    data = res_summary.json()
    assert "overall_percentage" in data
    assert "status_label" in data
    assert data["status_label"] in ["Safe", "Warning", "Critical"]
    assert "threshold_percentage" in data

    # 2. Student fetches subject-wise attendance
    res_subjects = client.get("/api/attendance/me/subjects", headers=headers_s1)
    assert res_subjects.status_code == 200
    subjs = res_subjects.json()
    assert isinstance(subjs, list)
    assert len(subjs) > 0
    first_subj = subjs[0]
    assert "classes_needed_for_threshold" in first_subj
    assert "classes_can_miss" in first_subj

    # 3. Calendar heatmap & trend
    res_cal = client.get("/api/attendance/me/calendar", headers=headers_s1)
    assert res_cal.status_code == 200
    assert isinstance(res_cal.json(), list)

    res_trend = client.get("/api/attendance/me/trend", headers=headers_s1)
    assert res_trend.status_code == 200
    assert isinstance(res_trend.json(), list)

    # 4. Access control: Student cannot access faculty or admin endpoints
    res_forbidden_fac = client.get("/api/attendance/faculty/sessions", headers=headers_s1)
    assert res_forbidden_fac.status_code == 403

    res_forbidden_adm = client.get("/api/attendance/admin/analytics", headers=headers_s1)
    assert res_forbidden_adm.status_code == 403


def test_faculty_marking_workflow_and_alert_generation():
    headers_s1, _, headers_f, _ = get_auth_headers()

    # Get student1 profile ID
    res_profile = client.get("/api/students/me", headers=headers_s1)
    assert res_profile.status_code == 200
    student1_id = res_profile.json()["id"]

    # 1. Faculty creates a new class session
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    res_sess = client.post(
        "/api/attendance/faculty/sessions",
        json={
            "subject": "Data Structures & Algorithms",
            "session_date": today_str,
            "start_time": "11:00",
            "end_time": "12:00",
            "class_division": "CSE-A",
            "room": "Lab 203",
            "topic": "Binary Search Trees"
        },
        headers=headers_f
    )
    assert res_sess.status_code == 200
    session_id = res_sess.json()["id"]

    # 2. Faculty fetches student roster for this session
    res_roster = client.get(f"/api/attendance/faculty/sessions/{session_id}/students", headers=headers_f)
    assert res_roster.status_code == 200
    students = res_roster.json()
    assert any(s["student_id"] == student1_id for s in students)

    # 3. Faculty marks student1 as Absent (simulating attendance drop)
    res_mark = client.post(
        f"/api/attendance/faculty/sessions/{session_id}/mark",
        json={
            "session_id": session_id,
            "records": [
                {"student_id": student1_id, "status": "Absent", "remarks": "Unexcused absence"}
            ]
        },
        headers=headers_f
    )
    assert res_mark.status_code == 200
    assert res_mark.json()["marked"] >= 1

    # 4. Verify student1 summary reflects marked absence
    res_summary = client.get("/api/attendance/me/summary", headers=headers_s1)
    assert res_summary.status_code == 200
    assert res_summary.json()["missed_classes"] >= 1


def test_leave_request_and_excuse_workflow():
    headers_s1, headers_s2, headers_f, _ = get_auth_headers()

    # 1. Student1 submits a leave request
    res_leave = client.post(
        "/api/attendance/me/leave-requests",
        data={
            "start_date": "2026-11-01",
            "end_date": "2026-11-03",
            "reason": "Attending national coding hackathon"
        },
        headers=headers_s1
    )
    assert res_leave.status_code == 201
    leave_data = res_leave.json()
    req_id = leave_data["id"]
    assert leave_data["status"] == "Pending"

    # 2. Student2 tries to access Student1's leave document -> 403 Forbidden
    res_s2_doc = client.get(f"/api/attendance/leave-requests/{req_id}/document", headers=headers_s2)
    assert res_s2_doc.status_code in [403, 404]

    # 3. Faculty reviews and approves leave request
    res_review = client.patch(
        f"/api/attendance/faculty/leave-requests/{req_id}/review",
        data={
            "status": "Approved",
            "faculty_comment": "Representing university; excused."
        },
        headers=headers_f
    )
    assert res_review.status_code == 200
    assert res_review.json()["status"] == "Approved"


def test_admin_analytics_and_threshold_update():
    _, _, _, headers_a = get_auth_headers()

    # 1. Admin views institutional analytics
    res_analytics = client.get("/api/attendance/admin/analytics", headers=headers_a)
    assert res_analytics.status_code == 200
    an_data = res_analytics.json()
    assert "institutional_average" in an_data
    assert "defaulters_count" in an_data

    # 2. Admin updates threshold setting
    res_thresh = client.put(
        "/api/attendance/admin/threshold",
        json={"threshold_percentage": 75.0},
        headers=headers_a
    )
    assert res_thresh.status_code == 200
    assert res_thresh.json()["threshold_percentage"] == 75.0


def test_student_attendance_csv_export():
    headers_s1, _, _, _ = get_auth_headers()
    res_export = client.get("/api/attendance/me/export", headers=headers_s1)
    assert res_export.status_code == 200
    assert "text/csv" in res_export.headers["content-type"]
    assert "Date,Time,Subject" in res_export.text


def test_e2e_attendance_drop_alert_and_excuse_denominator():
    headers_s1, headers_s2, headers_f, _ = get_auth_headers()

    # 1. Get student 1 ID
    res_profile = client.get("/api/students/me", headers=headers_s1)
    assert res_profile.status_code == 200
    student1_id = res_profile.json()["id"]

    # 2. Student 2 attempts to view Student 1's attendance records directly via student drilldown -> 403
    res_s2_drill = client.get(f"/api/attendance/student/{student1_id}/summary", headers=headers_s2)
    assert res_s2_drill.status_code == 403

    # 3. Create a session on 2026-11-10
    res_sess = client.post(
        "/api/attendance/faculty/sessions",
        json={
            "subject": "Operating Systems",
            "session_date": "2026-11-10",
            "start_time": "14:00",
            "end_time": "15:00",
            "class_division": "CSE-A",
            "topic": "Process Synchronization"
        },
        headers=headers_f
    )
    assert res_sess.status_code == 200
    sess_id = res_sess.json()["id"]

    # Mark student 1 as Absent
    client.post(
        f"/api/attendance/faculty/sessions/{sess_id}/mark",
        json={
            "session_id": sess_id,
            "records": [{"student_id": student1_id, "status": "Absent", "remarks": "Medical emergency"}]
        },
        headers=headers_f
    )

    # 4. Check summary before leave
    res_before = client.get("/api/attendance/me/summary", headers=headers_s1)
    assert res_before.status_code == 200
    missed_before = res_before.json()["missed_classes"]
    excused_before = res_before.json()["excused_classes"]

    # 5. Student submits leave request for 2026-11-10
    res_leave = client.post(
        "/api/attendance/me/leave-requests",
        data={
            "start_date": "2026-11-10",
            "end_date": "2026-11-10",
            "reason": "Hospital appointment"
        },
        headers=headers_s1
    )
    assert res_leave.status_code == 201
    leave_id = res_leave.json()["id"]

    # 6. Faculty approves leave request
    res_approve = client.patch(
        f"/api/attendance/faculty/leave-requests/{leave_id}/review",
        data={"status": "Approved", "faculty_comment": "Approved doctor note"},
        headers=headers_f
    )
    assert res_approve.status_code == 200
    assert res_approve.json()["status"] == "Approved"

    # 7. Check summary after approval: Excused increases, and missed_classes decreases!
    res_after = client.get("/api/attendance/me/summary", headers=headers_s1)
    assert res_after.status_code == 200
    assert res_after.json()["excused_classes"] == excused_before + 1
    assert res_after.json()["missed_classes"] == missed_before - 1

