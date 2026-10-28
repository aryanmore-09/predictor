"""
Feature Engineering Module
Transforms raw academic and behavioural metrics into engineered predictive features.
"""
import pandas as pd
import numpy as np
from typing import Dict, Any


def compute_derived_features(features: Dict[str, Any]) -> Dict[str, Any]:
    """Compute interaction and ratio features from base student metrics."""
    feats = features.copy()
    att = feats.get("attendance_percentage", 75.0)
    marks = feats.get("avg_marks", 60.0)
    stress = feats.get("stress_score", 3.0)
    motivation = feats.get("motivation_score", 3.0)
    sub_rate = feats.get("assignment_submission_rate", 80.0)
    late_rate = feats.get("late_submission_rate", 10.0)
    study_hrs = feats.get("study_hours", 3.0)
    lms_freq = feats.get("lms_login_frequency", 4.0)

    # Academic-engagement ratio
    feats["academic_engagement_ratio"] = round(float(marks / (study_hrs * 10 + 1)), 2)
    # Attendance-risk factor
    feats["attendance_risk_factor"] = round(float(max(0, 75.0 - att) / 75.0), 3)
    # Submission reliability
    feats["submission_reliability"] = round(float(sub_rate * (1 - late_rate / 100.0)), 2)
    # Wellbeing index
    feats["wellbeing_index"] = round(float((motivation * 20.0) - (stress * 15.0)), 2)
    # Digital engagement intensity
    feats["digital_engagement_intensity"] = round(float(lms_freq * study_hrs), 2)

    return feats


def engineer_features_df(df: pd.DataFrame) -> pd.DataFrame:
    """Vectorized feature engineering on a DataFrame."""
    df_out = df.copy()
    if "attendance_percentage" in df_out.columns:
        df_out["attendance_risk_factor"] = np.maximum(0, 75.0 - df_out["attendance_percentage"]) / 75.0
    if "avg_marks" in df_out.columns and "study_hours" in df_out.columns:
        df_out["academic_engagement_ratio"] = df_out["avg_marks"] / (df_out["study_hours"] * 10 + 1)
    if "assignment_submission_rate" in df_out.columns and "late_submission_rate" in df_out.columns:
        df_out["submission_reliability"] = df_out["assignment_submission_rate"] * (1 - df_out["late_submission_rate"] / 100.0)
    if "motivation_score" in df_out.columns and "stress_score" in df_out.columns:
        df_out["wellbeing_index"] = (df_out["motivation_score"] * 20.0) - (df_out["stress_score"] * 15.0)
    return df_out
