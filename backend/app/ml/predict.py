"""
Prediction Engine
Generates dropout risk and performance predictions for individual students or batches.
"""
import numpy as np
import pandas as pd
import json
import os
from typing import Dict, Any, List, Optional

from .preprocessing import build_features_from_db, load_scaler, load_feature_columns, FEATURE_COLUMNS
from .train import load_model, load_model_meta


def get_risk_level(dropout_prob: float) -> str:
    if dropout_prob >= 0.65:
        return "high"
    elif dropout_prob >= 0.35:
        return "medium"
    else:
        return "low"


def get_grade_band(score: float) -> str:
    if score >= 75:
        return "A"
    elif score >= 60:
        return "B"
    elif score >= 50:
        return "C"
    elif score >= 40:
        return "D"
    else:
        return "F"


def get_pass_probability(score: float) -> float:
    """Sigmoid-based pass probability centered at passing mark (40%)."""
    x = (score - 40) / 15
    return float(1 / (1 + np.exp(-x)))


def explain_prediction(features: Dict[str, float], model_dir: str) -> List[Dict]:
    """Return top contributing factors using feature importance from the model meta."""
    meta = load_model_meta(model_dir)
    importance_map = {}
    for item in meta.get("feature_importance", []):
        importance_map[item["feature"]] = item["importance"]

    factors = []
    for feat, value in features.items():
        if feat not in importance_map:
            continue
        importance = importance_map[feat]
        # Contextual direction using each feature's own scale & semantics.
        # Higher-is-better percentage features (threshold below which it counts as risk)
        higher_is_better = {
            "attendance_percentage": 75.0,
            "avg_marks": 60.0,
            "assignment_submission_rate": 80.0,
            "quiz_average": 50.0,
            "engagement_score": 40.0,
        }
        # Higher-is-worse features (threshold above which it counts as risk)
        higher_is_worse = {
            "late_submission_rate": 30.0,
            "backlog_count": 0.0,
        }
        if feat in higher_is_better:
            direction = "negative" if value < higher_is_better[feat] else "positive"
        elif feat in higher_is_worse:
            direction = "negative" if value > higher_is_worse[feat] else "positive"
        elif feat == "motivation_score":  # 1-5, higher is better
            direction = "negative" if value <= 2 else ("positive" if value >= 4 else "neutral")
        elif feat == "stress_score":  # 1-5, higher is worse
            direction = "negative" if value >= 4 else ("positive" if value <= 2 else "neutral")
        elif feat == "study_hours":  # hours/day
            direction = "negative" if value < 2 else ("positive" if value >= 4 else "neutral")
        elif feat in ["lms_login_frequency", "lms_time_spent"]:
            direction = "negative" if value < 2 else "positive"
        elif feat == "lms_resource_views":
            direction = "negative" if value < 10 else "positive"
        elif feat in ["attendance_trend", "attendance_velocity_30d", "marks_trend"]:
            direction = "negative" if value < 0 else ("positive" if value > 0 else "neutral")
        else:
            direction = "neutral"

        factors.append({
            "feature": feat,
            "value": round(float(value), 2),
            "importance": importance,
            "direction": direction,
        })

    factors.sort(key=lambda x: -x["importance"])
    return factors[:6]


def get_recommendations(features: Dict[str, float], risk_level: str) -> List[str]:
    recs = []

    if features.get("attendance_percentage", 100) < 75:
        recs.append("📅 Your attendance is below 75%. Try to attend at least 2 more classes per week.")
    if features.get("avg_marks", 100) < 50:
        recs.append("📚 Your average score is low. Schedule extra revision sessions for weak subjects.")
    if features.get("assignment_submission_rate", 100) < 80:
        recs.append("✅ Submit all pending assignments — they contribute significantly to your grade.")
    if features.get("late_submission_rate", 0) > 30:
        recs.append("⏰ Work on submitting assignments on time to avoid grade penalties.")
    if features.get("stress_score", 1) >= 4:
        recs.append("🧘 Your stress level is high. Consider speaking with a counselor or using stress-relief techniques.")
    if features.get("motivation_score", 5) <= 2:
        recs.append("💡 Set small weekly goals to rebuild motivation. Celebrate small wins!")
    if features.get("study_hours", 6) < 2:
        recs.append("📖 Try to study at least 2-3 hours daily. Consistent effort compounds over time.")
    if features.get("lms_login_frequency", 7) < 2:
        recs.append("💻 Log into the LMS more frequently to stay updated on course materials.")
    if features.get("quiz_average", 100) < 50:
        recs.append("🎯 Practice topic quizzes to strengthen your conceptual understanding.")
    if features.get("backlog_count", 0) > 2:
        recs.append("🗂️ You have pending backlogs. Focus on clearing them one subject at a time.")

    if risk_level == "high":
        recs.append("🆘 You have been flagged as high-risk. Please reach out to your faculty or counselor immediately.")
    elif risk_level == "medium":
        recs.append("⚠️ You are in the caution zone. A little more effort now can make a big difference.")
    else:
        recs.append("🌟 You're doing well! Keep up the consistent effort and stay engaged.")

    return recs[:6]


def predict_student(db, student_id: int, model_dir: str) -> Dict[str, Any]:
    """Generate prediction for a single student."""
    model = load_model(model_dir)
    if model is None:
        raise RuntimeError("No trained model found. Please trigger training first.")

    scaler = load_scaler(model_dir)
    feature_cols = load_feature_columns(model_dir)

    features = build_features_from_db(db, student_id)
    if not features:
        raise ValueError(f"No feature data found for student {student_id}")

    # Build feature vector in correct order
    X = np.array([[features.get(f, 0.0) for f in feature_cols]])
    X_scaled = scaler.transform(X)

    dropout_prob = float(model.predict_proba(X_scaled)[0][1])
    risk_level = get_risk_level(dropout_prob)

    avg_marks = features.get("avg_marks", 60.0)
    grade_band = get_grade_band(avg_marks)
    pass_prob = get_pass_probability(avg_marks)

    top_factors = explain_prediction(features, model_dir)
    recommendations = get_recommendations(features, risk_level)

    meta = load_model_meta(model_dir)

    return {
        "risk_level": risk_level,
        "dropout_probability": round(dropout_prob, 4),
        "predicted_grade_band": grade_band,
        "pass_probability": round(pass_prob, 4),
        "predicted_score": round(avg_marks, 2),
        "top_factors": top_factors,
        "recommendations": recommendations,
        "model_version": meta.get("version", "unknown"),
    }


def batch_predict(db, student_ids: List[int], model_dir: str) -> List[Dict]:
    results = []
    for sid in student_ids:
        try:
            pred = predict_student(db, sid, model_dir)
            pred["student_id"] = sid
            results.append(pred)
        except Exception as e:
            results.append({"student_id": sid, "error": str(e)})
    return results
