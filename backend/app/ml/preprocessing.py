"""
ML Preprocessing Pipeline
Cleans, imputes, encodes, and scales student data for model training.
"""
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.impute import SimpleImputer
import joblib
import os
import json
from datetime import datetime, timedelta
from typing import Tuple, Dict, Any, Optional

from ..config import settings

FEATURE_COLUMNS = [
    "attendance_percentage",
    "attendance_trend",
    "attendance_velocity_30d",
    "avg_marks",
    "marks_trend",
    "assignment_submission_rate",
    "late_submission_rate",
    "quiz_average",
    "engagement_score",
    "stress_score",
    "motivation_score",
    "study_hours",
    "backlog_count",
    "lms_login_frequency",
    "lms_time_spent",
    "lms_resource_views",
    "semester",
    "age",
]

SENSITIVE_COLUMNS = ["age", "gender"]

TARGET_DROPOUT = "is_dropout"
TARGET_PERFORMANCE = "avg_marks"


def build_features_from_db(db, student_id: int) -> Dict[str, Any]:
    """Build feature dict for a single student from DB records."""
    from ..models.academic import (
        Student, AttendanceRecord, AttendanceEntry, AcademicRecord,
        AssignmentRecord, QuizRecord, SurveyResponse, LMSData
    )

    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        return {}

    # Attendance
    att_records = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student_id).all()
    if att_records:
        att_pcts = [r.attendance_percentage for r in att_records]
        avg_att = np.mean(att_pcts)
        att_trend = att_pcts[-1] - att_pcts[0] if len(att_pcts) > 1 else 0.0
    else:
        avg_att, att_trend = 75.0, 0.0

    # 30-day attendance velocity using dated attendance entries
    dated_entries = db.query(AttendanceEntry).filter(
        AttendanceEntry.student_id == student_id
    ).order_by(AttendanceEntry.session_date.desc()).all()

    if dated_entries:
        latest_date = dated_entries[0].session_date
        cutoff_30d = latest_date - timedelta(days=30)
        cutoff_60d = latest_date - timedelta(days=60)

        recent_entries = [e for e in dated_entries if e.session_date >= cutoff_30d]
        prior_entries = [e for e in dated_entries if cutoff_60d <= e.session_date < cutoff_30d]

        recent_present = sum(1 for e in recent_entries if e.status.lower() == "present")
        recent_total = len(recent_entries)
        recent_rate = (recent_present / recent_total * 100) if recent_total > 0 else avg_att

        if prior_entries:
            prior_present = sum(1 for e in prior_entries if e.status.lower() == "present")
            prior_total = len(prior_entries)
            prior_rate = (prior_present / prior_total * 100) if prior_total > 0 else avg_att
        else:
            prior_rate = avg_att

        attendance_velocity = round(float(recent_rate - prior_rate), 2)
    else:
        attendance_velocity = 0.0

    # Marks
    mark_records = db.query(AcademicRecord).filter(AcademicRecord.student_id == student_id).all()
    if mark_records:
        mark_pcts = [(r.total_marks or 0) / (r.max_marks or 100) * 100 for r in mark_records]
        avg_marks = np.mean(mark_pcts)
        marks_trend = mark_pcts[-1] - mark_pcts[0] if len(mark_pcts) > 1 else 0.0
        backlogs = sum(1 for m in mark_pcts if m < 40)
    else:
        avg_marks, marks_trend, backlogs = 60.0, 0.0, 0

    # Assignments
    asgn_records = db.query(AssignmentRecord).filter(AssignmentRecord.student_id == student_id).all()
    if asgn_records:
        total_a = sum(r.total_assignments for r in asgn_records)
        submitted_a = sum(r.submitted_assignments for r in asgn_records)
        late_a = sum(r.late_submissions for r in asgn_records)
        sub_rate = (submitted_a / total_a * 100) if total_a > 0 else 100.0
        late_rate = (late_a / submitted_a * 100) if submitted_a > 0 else 0.0
    else:
        sub_rate, late_rate = 100.0, 0.0

    # Quizzes
    quiz_records = db.query(QuizRecord).filter(QuizRecord.student_id == student_id).all()
    quiz_avg = np.mean([r.avg_score for r in quiz_records]) if quiz_records else 60.0

    # Survey
    survey = db.query(SurveyResponse).filter(SurveyResponse.student_id == student_id).order_by(SurveyResponse.submitted_at.desc()).first()
    stress_score = survey.stress_level if survey and survey.stress_level else 3
    motivation_score = survey.motivation_level if survey and survey.motivation_level else 3
    study_hours = survey.study_hours_per_day if survey and survey.study_hours_per_day else 4.0

    # LMS
    lms = db.query(LMSData).filter(LMSData.student_id == student_id).order_by(LMSData.recorded_at.desc()).first()
    if lms:
        lms_login = lms.login_frequency_per_week
        lms_time = lms.avg_time_spent_hours
        lms_views = lms.resource_views
        engagement_score = min(100, (lms_login * 5 + lms_time * 3 + min(lms_views, 20) * 2))
    else:
        lms_login, lms_time, lms_views = 3.0, 2.0, 10
        engagement_score = 40.0

    return {
        "attendance_percentage": avg_att,
        "attendance_trend": att_trend,
        "attendance_velocity_30d": attendance_velocity,
        "avg_marks": avg_marks,
        "marks_trend": marks_trend,
        "assignment_submission_rate": sub_rate,
        "late_submission_rate": late_rate,
        "quiz_average": quiz_avg,
        "engagement_score": engagement_score,
        "stress_score": stress_score,
        "motivation_score": motivation_score,
        "study_hours": study_hours,
        "backlog_count": backlogs,
        "lms_login_frequency": lms_login,
        "lms_time_spent": lms_time,
        "lms_resource_views": lms_views,
        "semester": student.semester or 3,
        "age": student.age or 20,
    }


def preprocess_dataframe(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict]:
    """
    Full preprocessing pipeline:
    1. Remove duplicates
    2. Handle missing values (imputation)
    3. Remove outliers (IQR)
    4. Clip values to valid ranges
    Returns cleaned df and quality report.
    """
    report = {"total_rows": len(df), "missing_values": {}, "outliers_fixed": 0, "duplicates_removed": 0}

    # 1. Duplicates
    before = len(df)
    df = df.drop_duplicates()
    report["duplicates_removed"] = before - len(df)

    # 2. Missing values - impute numerics with median
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    for col in numeric_cols:
        missing_count = df[col].isna().sum()
        if missing_count > 0:
            report["missing_values"][col] = int(missing_count)
            df[col] = df[col].fillna(df[col].median())

    # 3. Outliers - IQR method (exclude binary targets and discrete identifiers)
    outlier_count = 0
    feature_numeric_cols = [c for c in numeric_cols if c not in [TARGET_DROPOUT, "is_dropout", "student_id", "id"]]
    for col in feature_numeric_cols:
        Q1 = df[col].quantile(0.25)
        Q3 = df[col].quantile(0.75)
        IQR = Q3 - Q1
        lower = Q1 - 1.5 * IQR
        upper = Q3 + 1.5 * IQR
        mask = (df[col] < lower) | (df[col] > upper)
        outlier_count += mask.sum()
        df.loc[mask, col] = df[col].clip(lower=lower, upper=upper)
    report["outliers_fixed"] = int(outlier_count)

    # 4. Domain-specific clipping
    if "attendance_percentage" in df.columns:
        df["attendance_percentage"] = df["attendance_percentage"].clip(0, 100)
    if "attendance_velocity_30d" in df.columns:
        df["attendance_velocity_30d"] = df["attendance_velocity_30d"].clip(-100, 100)
    if "avg_marks" in df.columns:
        df["avg_marks"] = df["avg_marks"].clip(0, 100)
    if "stress_score" in df.columns:
        df["stress_score"] = df["stress_score"].clip(1, 5)
    if "motivation_score" in df.columns:
        df["motivation_score"] = df["motivation_score"].clip(1, 5)
    if "assignment_submission_rate" in df.columns:
        df["assignment_submission_rate"] = df["assignment_submission_rate"].clip(0, 100)

    report["rows_after_cleaning"] = len(df)
    return df, report


def prepare_training_data(df: pd.DataFrame, exclude_sensitive: Optional[bool] = None):
    """
    Extract feature matrix X and target y from preprocessed dataframe.
    Honors EXCLUDE_SENSITIVE_FEATURES setting unless explicitly overridden.
    """
    if exclude_sensitive is None:
        exclude_sensitive = getattr(settings, "EXCLUDE_SENSITIVE_FEATURES", True)

    candidate_cols = [
        c for c in FEATURE_COLUMNS
        if not (exclude_sensitive and c in SENSITIVE_COLUMNS)
    ]
    feature_cols = [c for c in candidate_cols if c in df.columns]
    X = df[feature_cols].copy()

    # Fill any remaining NaNs
    X = X.fillna(X.median())

    y_dropout = df[TARGET_DROPOUT].astype(int) if TARGET_DROPOUT in df.columns else None
    y_perf = df[TARGET_PERFORMANCE] if TARGET_PERFORMANCE in df.columns else None

    return X, y_dropout, y_perf, feature_cols


def fit_scaler(X: pd.DataFrame, model_dir: str) -> StandardScaler:
    scaler = StandardScaler()
    scaler.fit(X)
    os.makedirs(model_dir, exist_ok=True)
    joblib.dump(scaler, os.path.join(model_dir, "scaler.joblib"))
    return scaler


def load_scaler(model_dir: str) -> StandardScaler:
    path = os.path.join(model_dir, "scaler.joblib")
    if os.path.exists(path):
        return joblib.load(path)
    return StandardScaler()


def save_feature_columns(feature_cols: list, model_dir: str):
    os.makedirs(model_dir, exist_ok=True)
    with open(os.path.join(model_dir, "feature_columns.json"), "w") as f:
        json.dump(feature_cols, f)


def load_feature_columns(model_dir: str) -> list:
    path = os.path.join(model_dir, "feature_columns.json")
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return FEATURE_COLUMNS
