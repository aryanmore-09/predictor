"""
Predictions router — ML prediction endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
import json
import pandas as pd
import os

from ..database import get_db
from ..deps import get_admin, get_faculty_or_admin, get_current_user
from ..models.user import User, UserRole
from ..models.academic import Student, Prediction, Alert, ModelVersion, Notification
from ..schemas.prediction import (
    PredictionResponse, BatchPredictionRequest, TrainRequest, TrainResponse,
    SimulationRequest, SimulationResponse, PredictionHistoryItem
)
from ..config import settings
from ..ml.predict import predict_student, batch_predict, predict_from_features
from ..ml.preprocessing import build_features_from_db
from ..ml.train import train_models, load_model_meta

router = APIRouter(prefix="/api/predictions", tags=["predictions"])


def _save_prediction(db: Session, student_id: int, pred: dict):
    # Check if existing prediction
    existing = db.query(Prediction).filter(Prediction.student_id == student_id).order_by(Prediction.created_at.desc()).first()
    old_risk = existing.risk_level.value if existing else None

    from ..models.academic import RiskLevel
    risk_map = {"low": RiskLevel.low, "medium": RiskLevel.medium, "high": RiskLevel.high}

    new_pred = Prediction(
        student_id=student_id,
        risk_level=risk_map[pred["risk_level"]],
        dropout_probability=pred["dropout_probability"],
        predicted_grade_band=pred.get("predicted_grade_band"),
        pass_probability=pred.get("pass_probability"),
        predicted_score=pred.get("predicted_score"),
        top_factors=json.dumps(pred.get("top_factors", [])),
        model_version=pred.get("model_version"),
    )
    db.add(new_pred)

    # Generate alerts if risk changed or is high
    student = db.query(Student).filter(Student.id == student_id).first()
    if pred["risk_level"] in ["medium", "high"]:
        if old_risk != pred["risk_level"]:
            alert_msg = f"Your academic risk has changed to {pred['risk_level'].upper()}. "
            if pred["risk_level"] == "high":
                alert_msg += "Please speak with your faculty or counselor as soon as possible."
            else:
                alert_msg += "Please review your study plan and reach out if you need help."

            alert = Alert(
                student_id=student_id,
                alert_type="risk_change",
                message=alert_msg,
                severity=pred["risk_level"],
            )
            db.add(alert)

            # Notification
            if student and student.user_id:
                notif = Notification(
                    user_id=student.user_id,
                    student_id=student_id,
                    title="Risk Level Update",
                    body=alert_msg[:200],
                    notification_type="alert",
                )
                db.add(notif)

    db.commit()
    return new_pred


@router.post("/predict/{student_id}")
def predict_for_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_faculty_or_admin)
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    try:
        pred = predict_student(db, student_id, settings.MODEL_DIR)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    _save_prediction(db, student_id, pred)

    return {
        "student_id": student_id,
        "student_name": student.full_name,
        **pred
    }


@router.post("/predict/batch")
def batch_predict_students(
    request: BatchPredictionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_faculty_or_admin)
):
    results = []
    for sid in request.student_ids:
        student = db.query(Student).filter(Student.id == sid).first()
        try:
            pred = predict_student(db, sid, settings.MODEL_DIR)
            _save_prediction(db, sid, pred)
            results.append({
                "student_id": sid,
                "student_name": student.full_name if student else "Unknown",
                **pred
            })
        except Exception as e:
            results.append({"student_id": sid, "error": str(e)})
    return {"results": results, "total": len(results)}


@router.post("/predict-all")
def predict_all_students(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_faculty_or_admin)
):
    """Run predictions for all students."""
    students = db.query(Student).all()
    student_ids = [s.id for s in students]
    results = []
    for sid in student_ids:
        student = db.query(Student).filter(Student.id == sid).first()
        try:
            pred = predict_student(db, sid, settings.MODEL_DIR)
            _save_prediction(db, sid, pred)
            results.append({"student_id": sid, "risk_level": pred["risk_level"], "success": True})
        except Exception as e:
            results.append({"student_id": sid, "error": str(e), "success": False})
    return {"results": results, "total": len(results), "successful": sum(1 for r in results if r.get("success"))}


@router.get("/me")
def get_my_prediction(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Student: get own latest prediction."""
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Students only")
    from ..models.academic import Student as StudentModel
    student = db.query(StudentModel).filter(StudentModel.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    pred = db.query(Prediction).filter(Prediction.student_id == student.id).order_by(Prediction.created_at.desc()).first()
    if not pred:
        return {"message": "No prediction available yet. Check back later."}

    return {
        "risk_level": pred.risk_level.value,
        "dropout_probability": pred.dropout_probability,
        "predicted_grade_band": pred.predicted_grade_band,
        "pass_probability": pred.pass_probability,
        "predicted_score": pred.predicted_score,
        "top_factors": json.loads(pred.top_factors) if pred.top_factors else [],
        "model_version": pred.model_version,
        "created_at": pred.created_at.isoformat(),
    }


@router.post("/simulate", response_model=SimulationResponse)
def simulate_prediction(
    request: SimulationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    What-If Simulator:
    - student role: self (student_id optional)
    - faculty/admin: any student (student_id required)
    Builds feature vector from DB, applies overrides, runs model, returns original vs simulated.
    Does NOT save anything to database.
    """
    if current_user.role == UserRole.student:
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student profile not found")
        if request.student_id is not None and request.student_id != student.id:
            raise HTTPException(status_code=403, detail="Students can only simulate their own performance")
        target_student = student
    elif current_user.role in [UserRole.faculty, UserRole.admin]:
        if request.student_id is None:
            raise HTTPException(status_code=400, detail="student_id is required for faculty or admin")
        target_student = db.query(Student).filter(Student.id == request.student_id).first()
        if not target_student:
            raise HTTPException(status_code=404, detail="Student not found")
    else:
        raise HTTPException(status_code=403, detail="Permission denied")

    features_orig = build_features_from_db(db, target_student.id)
    if not features_orig:
        raise HTTPException(status_code=400, detail=f"No feature data available for student {target_student.id}")

    try:
        orig = predict_from_features(features_orig, settings.MODEL_DIR)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model evaluation failed: {e}")

    # Apply overrides
    features_sim = dict(features_orig)
    override_fields = [
        "attendance_percentage",
        "avg_marks",
        "assignment_submission_rate",
        "study_hours",
        "stress_score",
        "motivation_score",
    ]
    applied = {}
    for f in override_fields:
        val = getattr(request, f, None)
        if val is not None:
            features_sim[f] = float(val)
            applied[f] = float(val)

    try:
        sim = predict_from_features(features_sim, settings.MODEL_DIR)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulated evaluation failed: {e}")

    base_features = {
        f: round(float(features_orig.get(f, 0.0)), 1)
        for f in override_fields
    }

    return {
        "student_id": target_student.id,
        "original": {
            "dropout_probability": orig["dropout_probability"],
            "risk_level": orig["risk_level"],
            "grade_band": orig["predicted_grade_band"],
            "pass_probability": orig.get("pass_probability"),
            "predicted_score": orig.get("predicted_score"),
        },
        "simulated": {
            "dropout_probability": sim["dropout_probability"],
            "risk_level": sim["risk_level"],
            "grade_band": sim["predicted_grade_band"],
            "pass_probability": sim.get("pass_probability"),
            "predicted_score": sim.get("predicted_score"),
        },
        "base_features": base_features,
        "applied_overrides": applied,
    }


@router.get("/student/{student_id}/history", response_model=List[PredictionHistoryItem])
def get_student_prediction_history(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns the last 12 predictions for a given student in chronological order.
    - Student: can only view own history
    - Faculty/Admin: can view any student's history
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if current_user.role == UserRole.student:
        if student.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Students can only view their own history")
    elif current_user.role not in [UserRole.faculty, UserRole.admin]:
        raise HTTPException(status_code=403, detail="Permission denied")

    records = (
        db.query(Prediction)
        .filter(Prediction.student_id == student_id)
        .order_by(Prediction.created_at.desc())
        .limit(12)
        .all()
    )

    history = [
        PredictionHistoryItem(
            id=p.id,
            student_id=p.student_id,
            risk_level=p.risk_level.value if hasattr(p.risk_level, "value") else str(p.risk_level),
            dropout_probability=round(p.dropout_probability, 4),
            predicted_grade_band=p.predicted_grade_band,
            pass_probability=round(p.pass_probability, 4) if p.pass_probability is not None else None,
            predicted_score=round(p.predicted_score, 2) if p.predicted_score is not None else None,
            created_at=p.created_at.isoformat() if p.created_at else None,
        )
        for p in reversed(records)
    ]

    return history


@router.post("/train")
def trigger_training(
    request: TrainRequest = TrainRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin)
):
    """Admin: trigger model retraining from DB data."""
    from ..ml.preprocessing import build_features_from_db, FEATURE_COLUMNS
    import numpy as np

    students = db.query(Student).all()
    if len(students) < 10:
        raise HTTPException(status_code=400, detail="Need at least 10 students with data to train")

    rows = []
    for s in students:
        feats = build_features_from_db(db, s.id)
        if feats:
            feats["gender"] = s.gender or "Male"
            feats["age"] = s.age or 20
            pred = db.query(Prediction).filter(Prediction.student_id == s.id).order_by(Prediction.created_at.desc()).first()
            # Use existing label or derive from features
            if pred and hasattr(pred, 'dropout_probability'):
                is_dropout = 1 if pred.dropout_probability >= 0.5 else 0
            else:
                # Derive label from features
                score = feats.get("avg_marks", 60)
                att = feats.get("attendance_percentage", 75)
                is_dropout = 1 if (score < 45 or att < 60) else 0
            feats["is_dropout"] = is_dropout
            rows.append(feats)

    if len(rows) < 10:
        raise HTTPException(status_code=400, detail="Not enough feature data to train")

    df = pd.DataFrame(rows)
    meta = train_models(df, settings.MODEL_DIR)

    # Save version to DB
    mv = ModelVersion(
        version=meta["version"],
        algorithm=meta["best_algorithm"],
        accuracy=meta["metrics"]["accuracy"],
        precision=meta["metrics"]["precision"],
        recall=meta["metrics"]["recall"],
        f1_score=meta["metrics"]["f1_score"],
        roc_auc=meta["metrics"]["roc_auc"],
        training_samples=meta["training_samples"],
        is_active=True,
        metrics_json=json.dumps(meta),
    )
    db.query(ModelVersion).update({"is_active": False})
    db.add(mv)
    db.commit()

    return {
        "status": "success",
        "model_version": meta["version"],
        "best_algorithm": meta["best_algorithm"],
        "metrics": meta["metrics"],
        "training_samples": meta["training_samples"],
        "all_metrics": meta.get("all_metrics", {}),
        "feature_importance": meta.get("feature_importance", []),
        "fairness": meta.get("fairness", {}),
    }


@router.get("/model-info")
def get_model_info(db: Session = Depends(get_db), current_user: User = Depends(get_faculty_or_admin)):
    meta = load_model_meta(settings.MODEL_DIR)
    model_versions = db.query(ModelVersion).order_by(ModelVersion.trained_at.desc()).limit(10).all()
    # Expose calibration + PR curve from model_meta.json
    pr_curve       = meta.get("pr_curve", {})
    cal_curve      = meta.get("calibration_curve", {})
    brier_score    = cal_curve.get("brier_score", None)
    cv_roc_mean    = meta.get("metrics", {}).get("cv_roc_auc_mean", None)
    cv_roc_std     = meta.get("metrics", {}).get("cv_roc_auc_std", None)

    return {
        "current_model": meta,
        "pr_curve":           pr_curve,
        "calibration_curve":  cal_curve,
        "brier_score":        brier_score,
        "cv_roc_auc_mean":    cv_roc_mean,
        "cv_roc_auc_std":     cv_roc_std,
        "history": [
            {
                "id": mv.id, "version": mv.version, "algorithm": mv.algorithm,
                "accuracy": mv.accuracy, "roc_auc": mv.roc_auc,
                "is_active": mv.is_active, "trained_at": mv.trained_at.isoformat()
            }
            for mv in model_versions
        ]
    }
