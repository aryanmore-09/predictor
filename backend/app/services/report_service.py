"""
Report Service
Generates structured datasets for reporting and export (CSV & PDF).
"""
import io
import csv
import json
from datetime import datetime
from sqlalchemy.orm import Session

from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

from ..models.academic import Student, AcademicRecord, AttendanceRecord, Prediction
from ..ml.predict import get_recommendations


class ReportService:
    @staticmethod
    def generate_students_csv(db: Session) -> str:
        students = db.query(Student).all()
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["student_id", "full_name", "email", "semester", "year", "risk_level",
                         "dropout_prob", "pass_prob", "avg_marks", "avg_attendance"])

        for s in students:
            pred = db.query(Prediction).filter(Prediction.student_id == s.id).order_by(Prediction.created_at.desc()).first()
            att = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == s.id).all()
            marks = db.query(AcademicRecord).filter(AcademicRecord.student_id == s.id).all()
            avg_att = sum(r.attendance_percentage for r in att) / len(att) if att else 0
            avg_marks = sum((r.total_marks or 0) / (r.max_marks or 100) * 100 for r in marks) / len(marks) if marks else 0
            writer.writerow([
                s.student_id, s.full_name, s.email, s.semester, s.year,
                pred.risk_level.value if pred else "unassessed",
                round(pred.dropout_probability, 3) if pred else "",
                round(pred.pass_probability, 3) if pred else "",
                round(avg_marks, 1), round(avg_att, 1)
            ])
        return output.getvalue()

    @staticmethod
    def generate_student_pdf(db: Session, student_id: int) -> bytes:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise ValueError(f"Student with ID {student_id} not found")

        # Latest prediction
        pred = (
            db.query(Prediction)
            .filter(Prediction.student_id == student_id)
            .order_by(Prediction.created_at.desc())
            .first()
        )

        # Academic marks
        marks = (
            db.query(AcademicRecord)
            .filter(AcademicRecord.student_id == student_id)
            .order_by(AcademicRecord.semester, AcademicRecord.subject)
            .all()
        )

        # Attendance records
        att_records = (
            db.query(AttendanceRecord)
            .filter(AttendanceRecord.student_id == student_id)
            .order_by(AttendanceRecord.semester, AttendanceRecord.subject)
            .all()
        )

        # Historical predictions (last 8)
        history = (
            db.query(Prediction)
            .filter(Prediction.student_id == student_id)
            .order_by(Prediction.created_at.desc())
            .limit(8)
            .all()
        )

        # Document setup
        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf,
            pagesize=letter,
            leftMargin=36,
            rightMargin=36,
            topMargin=32,
            bottomMargin=32,
        )

        styles = getSampleStyleSheet()

        # Brand color palette
        c_brand = colors.HexColor("#0F766E")
        c_brand_dark = colors.HexColor("#063B37")
        c_ink = colors.HexColor("#1F3D2B")
        c_muted = colors.HexColor("#5F8A6D")
        c_line = colors.HexColor("#CFE5D5")
        c_mist = colors.HexColor("#F7FBF8")

        c_danger = colors.HexColor("#B42318")
        c_danger_bg = colors.HexColor("#FDECEA")
        c_warning = colors.HexColor("#B7791F")
        c_warning_bg = colors.HexColor("#FDF6E3")
        c_safe = colors.HexColor("#0F766E")
        c_safe_bg = colors.HexColor("#ECFAF6")

        # Typography styles
        style_title = ParagraphStyle(
            "DocTitle",
            parent=styles["Heading1"],
            fontSize=15,
            leading=18,
            textColor=c_brand,
            fontName="Helvetica-Bold",
        )
        style_sub = ParagraphStyle(
            "DocSub",
            parent=styles["Normal"],
            fontSize=8.5,
            leading=11,
            textColor=c_muted,
            fontName="Helvetica",
        )
        style_sec = ParagraphStyle(
            "SecHeading",
            parent=styles["Heading2"],
            fontSize=10,
            leading=13,
            textColor=c_brand_dark,
            fontName="Helvetica-Bold",
            spaceBefore=6,
            spaceAfter=3,
        )
        style_cell = ParagraphStyle(
            "CellNorm",
            parent=styles["Normal"],
            fontSize=7.5,
            leading=9.5,
            textColor=c_ink,
            fontName="Helvetica",
        )
        style_cell_b = ParagraphStyle(
            "CellBold",
            parent=styles["Normal"],
            fontSize=7.5,
            leading=9.5,
            textColor=c_ink,
            fontName="Helvetica-Bold",
        )
        style_cell_header = ParagraphStyle(
            "CellHdr",
            parent=styles["Normal"],
            fontSize=7.5,
            leading=9.5,
            textColor=colors.white,
            fontName="Helvetica-Bold",
        )
        style_bullet = ParagraphStyle(
            "BulletStyle",
            parent=styles["Normal"],
            fontSize=7.5,
            leading=10.5,
            textColor=c_ink,
            fontName="Helvetica",
        )

        story = []

        # Header Title
        story.append(Paragraph("MIT SCHOOL OF COMPUTING &amp; ENGINEERING", style_title))
        story.append(
            Paragraph(
                f"Student Academic Standing &amp; Dropout Risk Report &bull; Generated on {datetime.now().strftime('%B %d, %Y at %H:%M')}",
                style_sub,
            )
        )
        story.append(Spacer(1, 6))
        story.append(HRFlowable(width="100%", thickness=1.5, color=c_brand, spaceAfter=8))

        # 1. Student Information Block
        info_data = [
            [
                Paragraph("<b>Student Name:</b>", style_cell_b),
                Paragraph(student.full_name, style_cell),
                Paragraph("<b>Student ID:</b>", style_cell_b),
                Paragraph(student.student_id, style_cell),
            ],
            [
                Paragraph("<b>Department:</b>", style_cell_b),
                Paragraph(student.department or "CSE", style_cell),
                Paragraph("<b>Semester / Year:</b>", style_cell_b),
                Paragraph(f"Semester {student.semester or 'N/A'} (Year {student.year or 'N/A'})", style_cell),
            ],
            [
                Paragraph("<b>Institutional Email:</b>", style_cell_b),
                Paragraph(student.email, style_cell),
                Paragraph("<b>Report ID:</b>", style_cell_b),
                Paragraph(f"REP-{student.student_id}-{datetime.now().strftime('%Y%m%d')}", style_cell),
            ],
        ]
        info_table = Table(info_data, colWidths=[90, 180, 90, 180])
        info_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), c_mist),
                ("BOX", (0, 0), (-1, -1), 0.75, c_line),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, c_line),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ])
        )
        story.append(info_table)
        story.append(Spacer(1, 8))

        # 2. Risk & Performance Prediction Summary
        story.append(Paragraph("PREDICTIVE RISK &amp; ACADEMIC PERFORMANCE SUMMARY", style_sec))
        risk_level_str = pred.risk_level.value.upper() if pred else "UNASSESSED"
        dropout_pct = f"{(pred.dropout_probability * 100):.1f}%" if pred else "N/A"
        grade_band_str = pred.predicted_grade_band if (pred and pred.predicted_grade_band) else "N/A"
        pass_prob_str = f"{(pred.pass_probability * 100):.1f}%" if (pred and pred.pass_probability is not None) else "N/A"
        pred_score_str = f"{pred.predicted_score:.1f}%" if (pred and pred.predicted_score is not None) else "N/A"

        # Badge colors
        if risk_level_str == "HIGH":
            badge_bg = c_danger_bg
            badge_fg = c_danger
        elif risk_level_str == "MEDIUM":
            badge_bg = c_warning_bg
            badge_fg = c_warning
        else:
            badge_bg = c_safe_bg
            badge_fg = c_safe

        summary_data = [
            [
                Paragraph("<b>Overall Risk Level</b>", style_cell_b),
                Paragraph("<b>Dropout Probability</b>", style_cell_b),
                Paragraph("<b>Predicted Grade Band</b>", style_cell_b),
                Paragraph("<b>Pass Probability</b>", style_cell_b),
                Paragraph("<b>Expected Continuous Score</b>", style_cell_b),
            ],
            [
                Paragraph(f"<font color='{badge_fg.hexval()}'><b>{risk_level_str} RISK</b></font>", style_cell_b),
                Paragraph(f"<b>{dropout_pct}</b>", style_cell),
                Paragraph(f"<b>Grade {grade_band_str}</b>", style_cell),
                Paragraph(f"<b>{pass_prob_str}</b>", style_cell),
                Paragraph(f"<b>{pred_score_str}</b>", style_cell),
            ],
        ]
        summary_table = Table(summary_data, colWidths=[108, 108, 108, 108, 108])
        summary_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), c_mist),
                ("BACKGROUND", (0, 1), (0, 1), badge_bg),
                ("BOX", (0, 0), (-1, -1), 0.75, c_line),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, c_line),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ])
        )
        story.append(summary_table)
        story.append(Spacer(1, 8))

        # 3. Top Contributing Factors
        story.append(Paragraph("PRIMARY INFLUENCING FACTORS (MODEL EXPLANATION)", style_sec))
        top_factors = []
        if pred and pred.top_factors:
            try:
                top_factors = json.loads(pred.top_factors)
            except Exception:
                top_factors = []

        factors_data = [
            [
                Paragraph("Influencing Feature", style_cell_header),
                Paragraph("Observed Value", style_cell_header),
                Paragraph("Model Impact Direction", style_cell_header),
                Paragraph("Relative Importance", style_cell_header),
            ]
        ]
        if top_factors:
            for tf in top_factors[:5]:
                fname = tf.get("feature", "").replace("_", " ").title()
                fval = str(tf.get("value", ""))
                fdir = tf.get("direction", "neutral")
                fimp = f"{tf.get('importance', 0):.3f}"
                dir_label = "Attention Needed (Risk Factor)" if fdir == "negative" else "Positive Indicator"
                dir_color = c_danger if fdir == "negative" else c_safe
                factors_data.append([
                    Paragraph(fname, style_cell_b),
                    Paragraph(fval, style_cell),
                    Paragraph(f"<font color='{dir_color.hexval()}'><b>{dir_label}</b></font>", style_cell),
                    Paragraph(fimp, style_cell),
                ])
        else:
            factors_data.append([
                Paragraph("Standard Academic Trajectory", style_cell),
                Paragraph("Nominal", style_cell),
                Paragraph("Good Standing", style_cell),
                Paragraph("-", style_cell),
            ])

        factors_table = Table(factors_data, colWidths=[160, 100, 180, 100])
        factors_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), c_brand),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, c_mist]),
                ("BOX", (0, 0), (-1, -1), 0.75, c_line),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, c_line),
                ("TOPPADDING", (0, 0), (-1, -1), 3.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
            ])
        )
        story.append(factors_table)
        story.append(Spacer(1, 8))

        # 4. Subject-wise Marks & Attendance (Two-column side by side or sequential tables)
        story.append(Paragraph("SUBJECT-WISE MARKS &amp; ATTENDANCE", style_sec))

        # Marks Table
        marks_rows = [
            [
                Paragraph("Subject Course", style_cell_header),
                Paragraph("Semester", style_cell_header),
                Paragraph("Marks / Max", style_cell_header),
                Paragraph("Percentage", style_cell_header),
                Paragraph("Grade", style_cell_header),
            ]
        ]
        if marks:
            for m in marks:
                pct = round(((m.total_marks or 0) / (m.max_marks or 100)) * 100, 1)
                marks_rows.append([
                    Paragraph(m.subject, style_cell),
                    Paragraph(f"Sem {m.semester}", style_cell),
                    Paragraph(f"{m.total_marks} / {m.max_marks}", style_cell),
                    Paragraph(f"{pct}%", style_cell_b),
                    Paragraph(m.grade or "-", style_cell_b),
                ])
        else:
            marks_rows.append([
                Paragraph("No academic marks recorded", style_cell),
                Paragraph("-", style_cell),
                Paragraph("-", style_cell),
                Paragraph("-", style_cell),
                Paragraph("-", style_cell),
            ])

        marks_table = Table(marks_rows, colWidths=[200, 70, 90, 90, 90])
        marks_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), c_brand_dark),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, c_mist]),
                ("BOX", (0, 0), (-1, -1), 0.75, c_line),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, c_line),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ])
        )
        story.append(marks_table)
        story.append(Spacer(1, 6))

        # Attendance Table
        att_rows = [
            [
                Paragraph("Subject Course", style_cell_header),
                Paragraph("Semester", style_cell_header),
                Paragraph("Attended / Total", style_cell_header),
                Paragraph("Attendance Rate", style_cell_header),
                Paragraph("Compliance Status", style_cell_header),
            ]
        ]
        if att_records:
            for a in att_records:
                pct = round(a.attendance_percentage, 1)
                is_safe = pct >= 75.0
                status_txt = "Compliant (Safe)" if is_safe else "Defaulter (<75%)"
                status_color = c_safe if is_safe else c_danger
                att_rows.append([
                    Paragraph(a.subject, style_cell),
                    Paragraph(f"Sem {a.semester}", style_cell),
                    Paragraph(f"{a.attended_classes} / {a.total_classes}", style_cell),
                    Paragraph(f"{pct}%", style_cell_b),
                    Paragraph(f"<font color='{status_color.hexval()}'><b>{status_txt}</b></font>", style_cell),
                ])
        else:
            att_rows.append([
                Paragraph("No attendance records recorded", style_cell),
                Paragraph("-", style_cell),
                Paragraph("-", style_cell),
                Paragraph("-", style_cell),
                Paragraph("-", style_cell),
            ])

        att_table = Table(att_rows, colWidths=[200, 70, 90, 90, 90])
        att_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), c_brand),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, c_mist]),
                ("BOX", (0, 0), (-1, -1), 0.75, c_line),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, c_line),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ])
        )
        story.append(att_table)
        story.append(Spacer(1, 8))

        # 5. Risk Trend Over Time
        story.append(Paragraph("HISTORICAL RISK TREND OVER TIME", style_sec))
        trend_rows = [
            [
                Paragraph("Recorded Timestamp", style_cell_header),
                Paragraph("Assessed Risk Level", style_cell_header),
                Paragraph("Dropout Probability", style_cell_header),
                Paragraph("Grade Band", style_cell_header),
                Paragraph("Pass Probability", style_cell_header),
            ]
        ]
        if history:
            for h in history:
                dt_str = h.created_at.strftime("%b %d, %Y") if h.created_at else "N/A"
                rl = h.risk_level.value.upper() if hasattr(h.risk_level, "value") else str(h.risk_level).upper()
                c_rl = c_danger if rl == "HIGH" else (c_warning if rl == "MEDIUM" else c_safe)
                trend_rows.append([
                    Paragraph(dt_str, style_cell),
                    Paragraph(f"<font color='{c_rl.hexval()}'><b>{rl}</b></font>", style_cell_b),
                    Paragraph(f"{(h.dropout_probability * 100):.1f}%", style_cell_b),
                    Paragraph(h.predicted_grade_band or "-", style_cell),
                    Paragraph(f"{(h.pass_probability * 100):.1f}%" if h.pass_probability is not None else "-", style_cell),
                ])
        else:
            trend_rows.append([
                Paragraph("No prior historical milestones", style_cell),
                Paragraph("-", style_cell),
                Paragraph("-", style_cell),
                Paragraph("-", style_cell),
                Paragraph("-", style_cell),
            ])

        trend_table = Table(trend_rows, colWidths=[130, 105, 105, 100, 100])
        trend_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), c_brand_dark),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, c_mist]),
                ("BOX", (0, 0), (-1, -1), 0.75, c_line),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, c_line),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ])
        )
        story.append(trend_table)
        story.append(Spacer(1, 8))

        # 6. Actionable Recommendations
        story.append(Paragraph("ACTIONABLE RECOMMENDATIONS &amp; ADVISORY", style_sec))
        recs = []
        if pred:
            try:
                tf_list = json.loads(pred.top_factors) if pred.top_factors else []
                feat_dict = {f["feature"]: f["value"] for f in tf_list if isinstance(f, dict) and "feature" in f}
                recs = get_recommendations(feat_dict, pred.risk_level.value if hasattr(pred.risk_level, "value") else str(pred.risk_level))
            except Exception:
                recs = []

        if not recs:
            recs = [
                "Maintain consistent attendance across all subjects to protect course eligibility.",
                "Review upcoming assignment submission deadlines to ensure continuous assessment marks.",
                "Reach out to faculty mentors during scheduled office hours if encountering difficult coursework.",
            ]

        for r in recs[:5]:
            story.append(Paragraph(f"&bull; {r}", style_bullet))
            story.append(Spacer(1, 2))

        # Footer / Institutional Disclaimer
        story.append(Spacer(1, 10))
        story.append(HRFlowable(width="100%", thickness=0.75, color=c_line, spaceAfter=6))
        story.append(
            Paragraph(
                "Notice: This report is generated by the MIT Student Risk Prediction and Early Warning System. "
                "Predictions and indicators are decision-support aids designed for academic advisors and students, "
                "not sole determinants of academic outcomes.",
                style_sub,
            )
        )

        doc.build(story)
        return buf.getvalue()
