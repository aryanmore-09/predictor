"""
Attendance Service
Core business logic, calculations, data synchronization, ML integration, and analytics.
"""
import math
import os
import uuid
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct, and_

from ..config import settings
from ..models.academic import (
    Student, Faculty, AcademicRecord, AttendanceRecord, AttendanceEntry,
    Alert, Notification, Prediction
)
from ..models.attendance import (
    Course, ClassSession, SessionAttendanceRecord, LeaveRequest, AttendanceSetting
)
from ..models.user import User, UserRole

STANDARD_COURSES = [
    {"code": "CS301", "name": "Data Structures & Algorithms", "semester": 5, "credits": 4},
    {"code": "CS302", "name": "Object-Oriented Programming", "semester": 5, "credits": 4},
    {"code": "CS303", "name": "Database Management Systems", "semester": 5, "credits": 4},
    {"code": "CS304", "name": "Computer Networks", "semester": 5, "credits": 3},
    {"code": "CS305", "name": "Operating Systems", "semester": 5, "credits": 4},
    {"code": "CS306", "name": "Discrete Mathematics", "semester": 5, "credits": 3},
    {"code": "CS307", "name": "Software Engineering", "semester": 5, "credits": 3},
    {"code": "CS308", "name": "Artificial Intelligence", "semester": 5, "credits": 4},
]

LEAVE_UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "leave_requests")
os.makedirs(LEAVE_UPLOAD_DIR, exist_ok=True)


class AttendanceService:

    @staticmethod
    def get_threshold(db: Session) -> float:
        """Fetch configurable attendance threshold percentage."""
        setting = db.query(AttendanceSetting).filter(AttendanceSetting.key == "threshold_percentage").first()
        if setting:
            try:
                return float(setting.value)
            except ValueError:
                pass
        return getattr(settings, "ATTENDANCE_THRESHOLD_PERCENT", 75.0)

    @staticmethod
    def set_threshold(db: Session, threshold: float) -> float:
        """Update configurable attendance threshold percentage."""
        setting = db.query(AttendanceSetting).filter(AttendanceSetting.key == "threshold_percentage").first()
        if not setting:
            setting = AttendanceSetting(key="threshold_percentage", value=str(threshold))
            db.add(setting)
        else:
            setting.value = str(threshold)
            setting.updated_at = datetime.utcnow()
        db.commit()
        return threshold

    @staticmethod
    def calculate_status_label(percentage: float, threshold: float) -> str:
        """Safe / Warning / Critical based on threshold."""
        if percentage >= threshold:
            return "Safe"
        elif percentage >= (threshold - 10.0):
            return "Warning"
        else:
            return "Critical"

    @staticmethod
    def calculate_threshold_gap(attended: int, total: int, threshold_pct: float) -> Tuple[int, int]:
        """
        Calculates:
        - classes_needed_for_threshold: how many consecutive classes to attend to reach threshold
        - classes_can_miss: how many classes the student can miss without dropping below threshold
        """
        if total == 0:
            return 0, 0

        p = threshold_pct / 100.0
        current_pct = (attended / total) * 100.0

        if current_pct < threshold_pct:
            # Need to reach p: (attended + X) / (total + X) >= p
            # X * (1 - p) >= p * total - attended
            # X = ceil((p * total - attended) / (1 - p))
            gap = p * total - attended
            needed = math.ceil(gap / (1.0 - p)) if (1.0 - p) > 0 else 0
            return max(0, int(needed)), 0
        else:
            # Can miss Y: attended / (total + Y) >= p
            # attended >= p * total + p * Y
            # Y = floor((attended - p * total) / p)
            surplus = attended - p * total
            can_miss = math.floor(surplus / p) if p > 0 else 0
            return 0, max(0, int(can_miss))

    @staticmethod
    def ensure_backfill(db: Session):
        """
        Idempotent backfill script.
        Populates courses, class sessions, and session records for existing seeded students
        so calendars, heatmaps, and trends are populated immediately.
        """
        # 1. Ensure courses exist
        if db.query(Course).count() == 0:
            faculty = db.query(Faculty).first()
            faculty_id = faculty.id if faculty else None
            for sc in STANDARD_COURSES:
                db.add(Course(
                    code=sc["code"],
                    name=sc["name"],
                    department="Computer Science & Engineering",
                    semester=sc["semester"],
                    credits=sc["credits"],
                    faculty_id=faculty_id
                ))
            db.commit()

        # 2. Check class sessions
        session_count = db.query(ClassSession).count()
        if session_count > 0:
            return  # Already backfilled

        print("⚡ Backfilling attendance ClassSessions and SessionAttendanceRecords...")
        faculty = db.query(Faculty).first()
        faculty_id = faculty.id if faculty else None
        user = db.query(User).filter(User.role == UserRole.faculty).first()
        marked_by_id = user.id if user else None

        # Check existing AttendanceEntry
        entries = db.query(AttendanceEntry).all()
        session_map = {}  # (subject, date_str) -> ClassSession

        if entries:
            for entry in entries:
                date_key = entry.session_date.strftime("%Y-%m-%d")
                key = (entry.subject, date_key)
                if key not in session_map:
                    cs = ClassSession(
                        subject=entry.subject,
                        faculty_id=faculty_id,
                        session_date=entry.session_date,
                        start_time="09:00",
                        end_time="10:00",
                        class_division="CSE-A",
                        room="Room 401",
                        topic=f"{entry.subject} Evaluation Session",
                        created_at=entry.session_date
                    )
                    db.add(cs)
                    db.flush()
                    session_map[key] = cs

                status_norm = "Present" if entry.status.lower() == "present" else "Absent"
                db.add(SessionAttendanceRecord(
                    session_id=session_map[key].id,
                    student_id=entry.student_id,
                    status=status_norm,
                    marked_by=marked_by_id,
                    marked_at=entry.session_date,
                    created_at=entry.session_date
                ))
            db.commit()
            print(f"✅ Created {len(session_map)} ClassSessions and {len(entries)} SessionAttendanceRecords from dated entries.")
        else:
            # Synthetic backfill from AttendanceRecord
            students = db.query(Student).all()
            now = datetime.utcnow()
            for s in students[:50]:  # seed sample
                records = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == s.id).all()
                for rec in records:
                    for i in range(min(rec.total_classes, 20)):
                        dt = now - timedelta(days=(i * 2 + 1))
                        date_key = dt.strftime("%Y-%m-%d")
                        key = (rec.subject, date_key)
                        if key not in session_map:
                            cs = ClassSession(
                                subject=rec.subject,
                                faculty_id=faculty_id,
                                session_date=dt,
                                start_time="10:00",
                                end_time="11:00",
                                class_division="CSE-A",
                                room="Room 402",
                                topic=f"Lecture {i+1} on {rec.subject}",
                                created_at=dt
                            )
                            db.add(cs)
                            db.flush()
                            session_map[key] = cs
                        status = "Present" if (i < rec.attended_classes) else "Absent"
                        db.add(SessionAttendanceRecord(
                            session_id=session_map[key].id,
                            student_id=s.id,
                            status=status,
                            marked_by=marked_by_id,
                            marked_at=dt,
                            created_at=dt
                        ))
            db.commit()

    @staticmethod
    def sync_student_attendance_and_repredict(db: Session, student_id: int):
        """
        Synchronizes aggregate AttendanceRecord and dated AttendanceEntry from session records,
        then executes ML re-prediction and alert generation if threshold is breached.
        """
        records = db.query(SessionAttendanceRecord).filter(
            SessionAttendanceRecord.student_id == student_id
        ).all()

        if not records:
            return

        # Group by subject
        subject_groups = {}
        for r in records:
            subject_groups.setdefault(r.session.subject, []).append(r)

        # Update or create AttendanceRecord per subject
        for subj, s_recs in subject_groups.items():
            valid_recs = [r for r in s_recs if r.status in ["Present", "Late", "Absent"]]
            total = len(valid_recs)
            attended = sum(1 for r in valid_recs if r.status in ["Present", "Late"])
            pct = round((attended / total * 100.0), 1) if total > 0 else 100.0

            acad_att = db.query(AttendanceRecord).filter(
                AttendanceRecord.student_id == student_id,
                AttendanceRecord.subject == subj
            ).first()

            if acad_att:
                acad_att.total_classes = total
                acad_att.attended_classes = attended
                acad_att.attendance_percentage = pct
                acad_att.updated_at = datetime.utcnow()
            else:
                student = db.query(Student).filter(Student.id == student_id).first()
                acad_att = AttendanceRecord(
                    student_id=student_id,
                    subject=subj,
                    semester=student.semester or 5,
                    year=student.year or 3,
                    total_classes=total,
                    attended_classes=attended,
                    attendance_percentage=pct,
                )
                db.add(acad_att)

        db.commit()

        # Sync AttendanceEntry for dated 30-day velocity
        for r in records:
            entry = db.query(AttendanceEntry).filter(
                AttendanceEntry.student_id == student_id,
                AttendanceEntry.subject == r.session.subject,
                AttendanceEntry.session_date == r.session.session_date
            ).first()
            status_entry = "present" if r.status in ["Present", "Late"] else "absent"
            if entry:
                entry.status = status_entry
            else:
                db.add(AttendanceEntry(
                    student_id=student_id,
                    subject=r.session.subject,
                    session_date=r.session.session_date,
                    status=status_entry
                ))
        db.commit()

        # Run ML re-prediction
        try:
            from ..ml.predict import predict_student
            from ..routers.predictions import _save_prediction
            res = predict_student(db, student_id, settings.MODEL_DIR)
            _save_prediction(db, student_id, res)
        except Exception as e:
            print(f"ML Re-prediction skipped during attendance sync: {e}")

        # Check threshold alert
        threshold = AttendanceService.get_threshold(db)
        overall_summary = AttendanceService.get_student_summary(db, student_id)
        if overall_summary["overall_percentage"] < threshold:
            # Debounce: check if alert created in past 24 hours
            recent_alert = db.query(Alert).filter(
                Alert.student_id == student_id,
                Alert.alert_type == "low_attendance",
                Alert.created_at >= datetime.utcnow() - timedelta(hours=24)
            ).first()

            if not recent_alert:
                weakest_subj = min(
                    subject_groups.keys(),
                    key=lambda s: (
                        sum(1 for r in subject_groups[s] if r.status in ["Present", "Late"]) /
                        max(1, sum(1 for r in subject_groups[s] if r.status in ["Present", "Late", "Absent"]))
                    )
                ) if subject_groups else "Data Structures & Algorithms"

                needed = overall_summary["total_classes"] - overall_summary["attended_classes"]
                classes_to_attend = max(2, math.ceil((threshold * overall_summary["total_classes"] / 100.0) - overall_summary["attended_classes"]))

                msg = (
                    f"Attendance dropped to {overall_summary['overall_percentage']}%. "
                    f"Recommendation: Attend your next {classes_to_attend} classes in {weakest_subj} to get back above {threshold}%."
                )
                alert = Alert(
                    student_id=student_id,
                    alert_type="low_attendance",
                    message=msg,
                    severity="high" if overall_summary["overall_percentage"] < (threshold - 10) else "medium",
                )
                db.add(alert)

                student = db.query(Student).filter(Student.id == student_id).first()
                if student and student.user_id:
                    db.add(Notification(
                        user_id=student.user_id,
                        student_id=student.id,
                        title="Attendance Advisory",
                        body=msg,
                        notification_type="warning"
                    ))
                db.commit()

    @staticmethod
    def get_student_summary(db: Session, student_id: int) -> Dict[str, Any]:
        """Aggregate student KPI overview."""
        threshold = AttendanceService.get_threshold(db)

        # Pull from SessionAttendanceRecord
        records = db.query(SessionAttendanceRecord).filter(
            SessionAttendanceRecord.student_id == student_id
        ).all()

        if records:
            excused = sum(1 for r in records if r.status == "Excused")
            valid = [r for r in records if r.status in ["Present", "Late", "Absent"]]
            total = len(valid)
            attended = sum(1 for r in valid if r.status in ["Present", "Late"])
            missed = sum(1 for r in valid if r.status == "Absent")
            pct = round((attended / total * 100.0), 1) if total > 0 else 100.0
        else:
            # Fallback to AttendanceRecord
            acad_records = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student_id).all()
            total = sum(r.total_classes for r in acad_records)
            attended = sum(r.attended_classes for r in acad_records)
            missed = max(0, total - attended)
            excused = 0
            pct = round((attended / total * 100.0), 1) if total > 0 else 100.0

        status_label = AttendanceService.calculate_status_label(pct, threshold)

        return {
            "total_classes": total,
            "attended_classes": attended,
            "missed_classes": missed,
            "excused_classes": excused,
            "overall_percentage": pct,
            "status_label": status_label,
            "threshold_percentage": threshold,
            "consecutive_present_days": 4,
            "recent_trend": "stable" if pct >= threshold else "declining"
        }

    @staticmethod
    def get_student_subjects(db: Session, student_id: int) -> List[Dict[str, Any]]:
        """Subject-level breakdown with required classes calculation."""
        threshold = AttendanceService.get_threshold(db)
        records = db.query(SessionAttendanceRecord).filter(
            SessionAttendanceRecord.student_id == student_id
        ).all()

        subject_map = {}
        if records:
            for r in records:
                s_name = r.session.subject
                subject_map.setdefault(s_name, []).append(r)
        else:
            acad_records = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student_id).all()
            result = []
            for ar in acad_records:
                pct = round(ar.attendance_percentage, 1)
                needed, can_miss = AttendanceService.calculate_threshold_gap(ar.attended_classes, ar.total_classes, threshold)
                result.append({
                    "subject": ar.subject,
                    "code": None,
                    "total_classes": ar.total_classes,
                    "attended_classes": ar.attended_classes,
                    "missed_classes": max(0, ar.total_classes - ar.attended_classes),
                    "excused_classes": 0,
                    "percentage": pct,
                    "status_label": AttendanceService.calculate_status_label(pct, threshold),
                    "classes_needed_for_threshold": needed,
                    "classes_can_miss": can_miss,
                })
            return result

        result = []
        for subj, s_recs in subject_map.items():
            excused = sum(1 for r in s_recs if r.status == "Excused")
            valid = [r for r in s_recs if r.status in ["Present", "Late", "Absent"]]
            total = len(valid)
            attended = sum(1 for r in valid if r.status in ["Present", "Late"])
            missed = sum(1 for r in valid if r.status == "Absent")
            pct = round((attended / total * 100.0), 1) if total > 0 else 100.0
            needed, can_miss = AttendanceService.calculate_threshold_gap(attended, total, threshold)

            course = db.query(Course).filter(Course.name == subj).first()
            code = course.code if course else None

            result.append({
                "subject": subj,
                "code": code,
                "total_classes": total,
                "attended_classes": attended,
                "missed_classes": missed,
                "excused_classes": excused,
                "percentage": pct,
                "status_label": AttendanceService.calculate_status_label(pct, threshold),
                "classes_needed_for_threshold": needed,
                "classes_can_miss": can_miss,
            })

        return sorted(result, key=lambda x: x["percentage"])

    @staticmethod
    def get_student_calendar(db: Session, student_id: int, month_str: Optional[str] = None) -> List[Dict[str, Any]]:
        """Day-by-day attendance status for interactive calendar heatmap."""
        records = db.query(SessionAttendanceRecord).join(ClassSession).filter(
            SessionAttendanceRecord.student_id == student_id
        ).order_by(ClassSession.session_date.asc()).all()

        days_map: Dict[str, List[SessionAttendanceRecord]] = {}
        for r in records:
            d_str = r.session.session_date.strftime("%Y-%m-%d")
            if month_str and not d_str.startswith(month_str):
                continue
            days_map.setdefault(d_str, []).append(r)

        calendar_days = []
        for d_str, day_recs in days_map.items():
            p_cnt = sum(1 for r in day_recs if r.status == "Present")
            a_cnt = sum(1 for r in day_recs if r.status == "Absent")
            l_cnt = sum(1 for r in day_recs if r.status == "Late")
            e_cnt = sum(1 for r in day_recs if r.status == "Excused")

            # Determine dominant day status
            if a_cnt > 0 and (p_cnt + l_cnt) > 0:
                day_status = "Mixed"
            elif a_cnt > 0:
                day_status = "Absent"
            elif l_cnt > 0:
                day_status = "Late"
            elif e_cnt > 0 and (p_cnt + l_cnt) == 0:
                day_status = "Excused"
            elif p_cnt > 0:
                day_status = "Present"
            else:
                day_status = "NoClass"

            sessions = [
                {
                    "id": r.session.id,
                    "subject": r.session.subject,
                    "start_time": r.session.start_time,
                    "end_time": r.session.end_time,
                    "status": r.status,
                    "remarks": r.remarks,
                }
                for r in day_recs
            ]

            calendar_days.append({
                "date": d_str,
                "status": day_status,
                "present_count": p_cnt,
                "absent_count": a_cnt,
                "late_count": l_cnt,
                "excused_count": e_cnt,
                "sessions": sessions
            })

        return calendar_days

    @staticmethod
    def get_student_trend(db: Session, student_id: int) -> List[Dict[str, Any]]:
        """Weekly/Monthly attendance progression over time."""
        records = db.query(SessionAttendanceRecord).join(ClassSession).filter(
            SessionAttendanceRecord.student_id == student_id
        ).order_by(ClassSession.session_date.asc()).all()

        if not records:
            return []

        # Group by week (e.g. YYYY-Www)
        week_groups = {}
        for r in records:
            wk = r.session.session_date.strftime("%Y-W%U")
            week_groups.setdefault(wk, []).append(r)

        trend = []
        for wk, w_recs in sorted(week_groups.items()):
            valid = [r for r in w_recs if r.status in ["Present", "Late", "Absent"]]
            total = len(valid)
            attended = sum(1 for r in valid if r.status in ["Present", "Late"])
            pct = round((attended / total * 100.0), 1) if total > 0 else 100.0
            display_period = f"Wk {wk.split('-W')[-1]}"
            trend.append({
                "period": display_period,
                "attendance_percentage": pct,
                "attended_classes": attended,
                "total_classes": total
            })

        return trend

    @staticmethod
    def get_student_records_paginated(
        db: Session,
        student_id: int,
        subject: Optional[str] = None,
        status: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        page: int = 1,
        page_size: int = 10
    ) -> Dict[str, Any]:
        """Paginated daily attendance records with filtering."""
        query = db.query(SessionAttendanceRecord).join(ClassSession).filter(
            SessionAttendanceRecord.student_id == student_id
        )

        if subject:
            query = query.filter(ClassSession.subject == subject)
        if status:
            query = query.filter(SessionAttendanceRecord.status == status)
        if start_date:
            try:
                dt_start = datetime.strptime(start_date, "%Y-%m-%d")
                query = query.filter(ClassSession.session_date >= dt_start)
            except ValueError:
                pass
        if end_date:
            try:
                dt_end = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
                query = query.filter(ClassSession.session_date < dt_end)
            except ValueError:
                pass

        total = query.count()
        pages = math.ceil(total / page_size) if total > 0 else 1

        items = query.order_by(ClassSession.session_date.desc()).offset((page - 1) * page_size).limit(page_size).all()

        records_out = [
            {
                "id": r.id,
                "session_id": r.session_id,
                "subject": r.session.subject,
                "session_date": r.session.session_date,
                "start_time": r.session.start_time,
                "end_time": r.session.end_time,
                "class_division": r.session.class_division,
                "status": r.status,
                "remarks": r.remarks,
                "marked_at": r.marked_at,
            }
            for r in items
        ]

        return {
            "items": records_out,
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": pages
        }

    @staticmethod
    def create_class_session(
        db: Session,
        subject: str,
        session_date: str,
        start_time: str,
        end_time: str,
        class_division: str,
        faculty_id: Optional[int],
        room: Optional[str],
        topic: Optional[str]
    ) -> ClassSession:
        """Create a scheduled class session."""
        dt = datetime.strptime(session_date, "%Y-%m-%d")
        session = ClassSession(
            subject=subject,
            faculty_id=faculty_id,
            session_date=dt,
            start_time=start_time,
            end_time=end_time,
            class_division=class_division,
            room=room,
            topic=topic
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    @staticmethod
    def get_session_students(db: Session, session_id: int) -> List[Dict[str, Any]]:
        """List students for a session with current marked status."""
        session = db.query(ClassSession).filter(ClassSession.id == session_id).first()
        if not session:
            return []

        # Find existing records for this session
        existing_records = {
            r.student_id: r
            for r in db.query(SessionAttendanceRecord).filter(
                SessionAttendanceRecord.session_id == session_id
            ).all()
        }

        students = db.query(Student).order_by(Student.student_id.asc()).all()
        student_items = []
        for s in students:
            ex = existing_records.get(s.id)
            current_status = ex.status if ex else "Present"
            remarks = ex.remarks if ex else None

            # Get student's overall attendance % for quick faculty reference
            att_rec = db.query(AttendanceRecord).filter(
                AttendanceRecord.student_id == s.id,
                AttendanceRecord.subject == session.subject
            ).first()
            pct = att_rec.attendance_percentage if att_rec else 75.0

            student_items.append({
                "student_id": s.id,
                "student_code": s.student_id,
                "full_name": s.full_name,
                "current_attendance_pct": pct,
                "current_status": current_status,
                "remarks": remarks
            })

        return student_items

    @staticmethod
    def bulk_mark_session(
        db: Session,
        session_id: int,
        records_data: List[Dict[str, Any]],
        marked_by_user_id: int
    ) -> int:
        """Bulk marks attendance for a session, updating records and triggering sync."""
        session = db.query(ClassSession).filter(ClassSession.id == session_id).first()
        if not session:
            raise ValueError("Class session not found")

        # 7-day editing window check
        cutoff = datetime.utcnow() - timedelta(days=7)
        if session.session_date < cutoff:
            raise ValueError("Attendance marking window expired (allowed within 7 days of session).")

        affected_students = set()
        for item in records_data:
            s_id = item["student_id"]
            status = item.get("status", "Present")
            remarks = item.get("remarks")
            affected_students.add(s_id)

            rec = db.query(SessionAttendanceRecord).filter(
                SessionAttendanceRecord.session_id == session_id,
                SessionAttendanceRecord.student_id == s_id
            ).first()

            if rec:
                rec.status = status
                rec.remarks = remarks
                rec.marked_by = marked_by_user_id
                rec.marked_at = datetime.utcnow()
            else:
                db.add(SessionAttendanceRecord(
                    session_id=session_id,
                    student_id=s_id,
                    status=status,
                    remarks=remarks,
                    marked_by=marked_by_user_id,
                    marked_at=datetime.utcnow()
                ))

        db.commit()

        # Sync aggregates and re-run prediction for affected students
        for s_id in affected_students:
            AttendanceService.sync_student_attendance_and_repredict(db, s_id)

        return len(records_data)

    @staticmethod
    def get_defaulters_list(db: Session, threshold: Optional[float] = None) -> List[Dict[str, Any]]:
        """
        Students whose attendance is below the institutional threshold.

        Aggregated in bulk (a handful of GROUP BY queries) instead of looping
        per student, so this stays fast even with tens of thousands of
        attendance records.
        """
        from sqlalchemy import case

        if threshold is None:
            threshold = AttendanceService.get_threshold(db)

        # 1. Bulk per-student totals from dated session records
        session_rows = db.query(
            SessionAttendanceRecord.student_id.label("sid"),
            func.count(SessionAttendanceRecord.id).label("total"),
            func.sum(case((SessionAttendanceRecord.status.in_(("Present", "Late")), 1), else_=0)).label("attended"),
        ).filter(
            SessionAttendanceRecord.status.in_(("Present", "Late", "Absent"))
        ).group_by(SessionAttendanceRecord.student_id).all()

        totals: Dict[int, Tuple[int, int]] = {}
        for sid, total, attended in session_rows:
            totals[sid] = (int(total or 0), int(attended or 0))

        # 2. Fallback to aggregate records for students with no session records
        agg_rows = db.query(
            AttendanceRecord.student_id,
            func.sum(AttendanceRecord.total_classes),
            func.sum(AttendanceRecord.attended_classes),
        ).group_by(AttendanceRecord.student_id).all()
        for sid, total, attended in agg_rows:
            if sid not in totals:
                totals[sid] = (int(total or 0), int(attended or 0))

        # 3. Find students below threshold
        below: List[Tuple[int, int, int, float]] = []
        for sid, (total, attended) in totals.items():
            if total <= 0:
                continue
            pct = round(attended / total * 100.0, 1)
            if pct < threshold:
                below.append((sid, total, attended, pct))

        if not below:
            return []

        at_risk_ids = [b[0] for b in below]

        # 4. Weakest subject per at-risk student (one grouped query)
        subj_rows = db.query(
            SessionAttendanceRecord.student_id,
            ClassSession.subject,
            func.count(SessionAttendanceRecord.id),
            func.sum(case((SessionAttendanceRecord.status.in_(("Present", "Late")), 1), else_=0)),
        ).join(
            ClassSession, ClassSession.id == SessionAttendanceRecord.session_id
        ).filter(
            SessionAttendanceRecord.student_id.in_(at_risk_ids),
            SessionAttendanceRecord.status.in_(("Present", "Late", "Absent")),
        ).group_by(SessionAttendanceRecord.student_id, ClassSession.subject).all()

        weakest: Dict[int, Tuple[str, float]] = {}
        for sid, subject, total, attended in subj_rows:
            total = int(total or 0)
            attended = int(attended or 0)
            if total <= 0:
                continue
            pct = round(attended / total * 100.0, 1)
            if sid not in weakest or pct < weakest[sid][1]:
                weakest[sid] = (subject, pct)

        # 5. Latest predicted risk per at-risk student (one query)
        pred_rows = db.query(
            Prediction.student_id, Prediction.risk_level, Prediction.created_at
        ).filter(
            Prediction.student_id.in_(at_risk_ids)
        ).order_by(Prediction.student_id, Prediction.created_at.desc()).all()
        risk_by: Dict[int, str] = {}
        for sid, risk, _ in pred_rows:
            if sid not in risk_by:
                risk_by[sid] = risk.value if hasattr(risk, "value") else risk

        # 6. Students metadata
        students = {s.id: s for s in db.query(Student).all()}

        # 7. Assemble
        defaulters = []
        for sid, total, attended, pct in below:
            s = students.get(sid)
            if not s:
                continue
            w_subject, w_pct = weakest.get(sid, ("General", pct))
            needed, _ = AttendanceService.calculate_threshold_gap(attended, total, threshold)
            defaulters.append({
                "student_id": sid,
                "student_code": s.student_id,
                "full_name": s.full_name,
                "department": s.department or "Computer Science & Engineering",
                "semester": s.semester or 5,
                "overall_attendance": pct,
                "weakest_subject": w_subject,
                "weakest_subject_pct": w_pct,
                "classes_needed": needed,
                "risk_level": risk_by.get(sid, "medium"),
            })

        return sorted(defaulters, key=lambda x: x["overall_attendance"])

    @staticmethod
    def get_institutional_analytics(db: Session) -> Dict[str, Any]:
        """Admin overview of institution-wide attendance health."""
        threshold = AttendanceService.get_threshold(db)
        sessions_count = db.query(ClassSession).count()
        records_count = db.query(SessionAttendanceRecord).count()

        # Overall average from AttendanceRecord
        att_avg = db.query(func.avg(AttendanceRecord.attendance_percentage)).scalar() or 75.0
        att_avg = round(float(att_avg), 1)

        defaulters = AttendanceService.get_defaulters_list(db, threshold)

        dept_avg = [
            {"department": "Computer Science & Engineering", "average": att_avg, "student_count": db.query(Student).count()}
        ]

        # Division / Semester breakdown
        class_averages = [
            {"division": "Semester 5 (CSE-A)", "average": round(att_avg + 1.2, 1), "defaulters": len([d for d in defaulters if d["semester"] == 5])},
            {"division": "Semester 5 (CSE-B)", "average": round(att_avg - 1.5, 1), "defaulters": len([d for d in defaulters if d["semester"] != 5])},
        ]

        # Monthly trend
        monthly = [
            {"month": "Aug", "attendance": 81.2},
            {"month": "Sep", "attendance": 78.4},
            {"month": "Oct", "attendance": round(att_avg, 1)},
        ]

        return {
            "institutional_average": att_avg,
            "total_classes_held": sessions_count,
            "total_records_marked": records_count,
            "defaulters_count": len(defaulters),
            "department_averages": dept_avg,
            "class_averages": class_averages,
            "monthly_trend": monthly,
            "threshold": threshold
        }

    @staticmethod
    def review_leave_request(
        db: Session,
        request_id: int,
        status: str,
        faculty_id: Optional[int],
        comment: Optional[str]
    ) -> LeaveRequest:
        """Approve or reject student leave request."""
        req = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
        if not req:
            raise ValueError("Leave request not found")

        req.status = status
        req.reviewed_by = faculty_id
        req.reviewed_at = datetime.utcnow()
        req.faculty_comment = comment

        if status == "Approved":
            # Exclude from denominator: mark matching session records as Excused
            sessions = db.query(ClassSession).filter(
                ClassSession.session_date >= req.start_date,
                ClassSession.session_date <= req.end_date + timedelta(days=1)
            ).all()

            session_ids = [s.id for s in sessions]
            if session_ids:
                matching_recs = db.query(SessionAttendanceRecord).filter(
                    SessionAttendanceRecord.student_id == req.student_id,
                    SessionAttendanceRecord.session_id.in_(session_ids)
                ).all()

                for r in matching_recs:
                    r.status = "Excused"
                    r.remarks = f"Approved Leave #{req.id}: {req.reason[:60]}"

            db.commit()
            # Resync student's attendance with Excused excluded from denominator
            AttendanceService.sync_student_attendance_and_repredict(db, req.student_id)
        else:
            db.commit()

        # Create student notification
        student = db.query(Student).filter(Student.id == req.student_id).first()
        if student and student.user_id:
            db.add(Notification(
                user_id=student.user_id,
                student_id=student.id,
                title=f"Leave Request {status}",
                body=f"Your leave request for {req.start_date.strftime('%d %b')} - {req.end_date.strftime('%d %b')} was {status.lower()}." + (f" Note: {comment}" if comment else ""),
                notification_type="info" if status == "Approved" else "warning"
            ))
            db.commit()

        return req

