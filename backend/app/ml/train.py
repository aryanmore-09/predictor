"""
Model Training Module
Trains Logistic Regression, SVM, Random Forest, and Gradient Boosting
for dropout risk classification.  Picks best model by ROC-AUC (hold-out).
Adds:
  - 80/20 stratified hold-out split
  - 5-fold stratified CV (accuracy, precision, recall, F1, ROC-AUC)
  - CalibratedClassifierCV (isotonic) wrapping the champion
  - Calibration curve data (10 bins) + Brier score
  - Precision-Recall curve data
  - Confusion matrix (per-class)
"""
import pandas as pd
import numpy as np
import joblib
import json
import os
from datetime import datetime
from typing import Dict, Any, List

from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_validate
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, precision_recall_curve,
    brier_score_loss, average_precision_score,
)

from .preprocessing import preprocess_dataframe, prepare_training_data, fit_scaler, save_feature_columns


def get_models():
    return {
        "LogisticRegression": LogisticRegression(max_iter=1000, random_state=42),
        "SVM":                SVC(probability=True, kernel="rbf", random_state=42, C=1.0),
        "RandomForest":       RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1),
        "GradientBoosting":   GradientBoostingClassifier(n_estimators=100, random_state=42),
    }


def _cv_metrics(model, X: np.ndarray, y: np.ndarray, skf: StratifiedKFold) -> Dict[str, Any]:
    """Run 5-fold stratified CV; return mean ± std for all key metrics."""
    scoring = {
        "accuracy":  "accuracy",
        "precision": "precision_weighted",
        "recall":    "recall_weighted",
        "f1":        "f1_weighted",
        "roc_auc":   "roc_auc",
    }
    cv_res = cross_validate(model, X, y, cv=skf, scoring=scoring, n_jobs=-1)
    out: Dict[str, Any] = {}
    for metric, key in [
        ("accuracy",  "test_accuracy"),
        ("precision", "test_precision"),
        ("recall",    "test_recall"),
        ("f1",        "test_f1"),
        ("roc_auc",   "test_roc_auc"),
    ]:
        scores = cv_res[key]
        out[f"cv_{metric}_mean"] = float(scores.mean())
        out[f"cv_{metric}_std"]  = float(scores.std())
    return out


def evaluate_model(model, X_test: np.ndarray, y_test: np.ndarray) -> Dict[str, Any]:
    y_pred  = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    cm = confusion_matrix(y_test, y_pred).tolist()

    # Per-class metrics
    labels = sorted(set(y_test))
    per_class: Dict[str, Any] = {}
    for lbl in labels:
        per_class[str(lbl)] = {
            "precision": float(precision_score(y_test, y_pred, labels=[lbl], average="macro", zero_division=0)),
            "recall":    float(recall_score(y_test, y_pred, labels=[lbl], average="macro", zero_division=0)),
            "f1":        float(f1_score(y_test, y_pred, labels=[lbl], average="macro", zero_division=0)),
        }

    return {
        "accuracy":         float(accuracy_score(y_test, y_pred)),
        "precision":        float(precision_score(y_test, y_pred, zero_division=0)),
        "recall":           float(recall_score(y_test, y_pred, zero_division=0)),
        "f1_score":         float(f1_score(y_test, y_pred, zero_division=0)),
        "roc_auc":          float(roc_auc_score(y_test, y_proba)),
        "confusion_matrix": cm,
        "per_class_metrics": per_class,
    }


def compute_pr_curve(model, X_test: np.ndarray, y_test: np.ndarray) -> Dict[str, Any]:
    """Compute precision-recall curve data for the champion model."""
    y_proba = model.predict_proba(X_test)[:, 1]
    precision_vals, recall_vals, thresholds = precision_recall_curve(y_test, y_proba)
    avg_precision = float(average_precision_score(y_test, y_proba))
    # Downsample to max 100 points to keep JSON small
    step = max(1, len(precision_vals) // 100)
    return {
        "precision": [round(float(v), 4) for v in precision_vals[::step]],
        "recall":    [round(float(v), 4) for v in recall_vals[::step]],
        "avg_precision": avg_precision,
    }


def compute_calibration(model, X_test: np.ndarray, y_test: np.ndarray, n_bins: int = 10) -> Dict[str, Any]:
    """Return calibration curve (fraction of positives vs mean predicted probability) + Brier score."""
    y_proba = model.predict_proba(X_test)[:, 1]
    fraction_of_positives, mean_predicted = calibration_curve(y_test, y_proba, n_bins=n_bins)
    brier = float(brier_score_loss(y_test, y_proba))
    return {
        "fraction_of_positives": [round(float(v), 4) for v in fraction_of_positives],
        "mean_predicted_value":  [round(float(v), 4) for v in mean_predicted],
        "brier_score":           round(brier, 4),
        "n_bins":                n_bins,
    }


def train_models(df: pd.DataFrame, model_dir: str) -> Dict[str, Any]:
    """
    Full training pipeline:
    1. Preprocess
    2. 80/20 stratified hold-out split
    3. 5-fold stratified CV per model
    4. Evaluate on hold-out
    5. Calibrate champion with CalibratedClassifierCV (isotonic)
    6. Compute PR curve + calibration curve + Brier score
    7. Save champion model + metadata
    """
    os.makedirs(model_dir, exist_ok=True)

    df_clean, quality_report = preprocess_dataframe(df.copy())
    X, y_dropout, y_perf, feature_cols = prepare_training_data(df_clean)
    if y_dropout is None:
        raise ValueError("Training data must have 'is_dropout' column")

    save_feature_columns(feature_cols, model_dir)

    # 80/20 stratified split
    indices = np.arange(len(X))
    idx_train, idx_test = train_test_split(
        indices, test_size=0.2, random_state=42, stratify=y_dropout
    )
    X_train, X_test   = X.iloc[idx_train], X.iloc[idx_test]
    y_train, y_test   = y_dropout.iloc[idx_train], y_dropout.iloc[idx_test]
    df_test_raw = df_clean.iloc[idx_test].copy()

    # Fit scaler on train only
    scaler         = fit_scaler(X_train, model_dir)
    X_train_scaled = scaler.transform(X_train)
    X_test_scaled  = scaler.transform(X_test)

    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    models   = get_models()
    results  = {}
    trained_models = {}

    for name, model in models.items():
        # CV on train set (unscaled model, scaler already applied above)
        cv_stats = _cv_metrics(model, X_train_scaled, y_train.values, skf)

        # Fit on full train
        model.fit(X_train_scaled, y_train)

        # Hold-out evaluation
        ho_metrics = evaluate_model(model, X_test_scaled, y_test)

        metrics = {**ho_metrics, **cv_stats}
        results[name] = metrics
        trained_models[name] = model
        print(
            f"[Train] {name}: HO-AUC={ho_metrics['roc_auc']:.4f} "
            f"CV-AUC={cv_stats['cv_roc_auc_mean']:.4f}±{cv_stats['cv_roc_auc_std']:.4f} "
            f"Acc={ho_metrics['accuracy']:.4f}"
        )

    # Pick champion by hold-out ROC-AUC
    best_name  = max(results, key=lambda k: results[k]["roc_auc"])
    best_model = trained_models[best_name]
    print(f"[Train] Champion: {best_name}")

    # ---- Calibrate champion ----
    # Re-fit CalibratedClassifierCV on the TRAINING set using internal 5-fold CV
    calibrated_model = CalibratedClassifierCV(
        estimator=get_models()[best_name],  # fresh estimator
        method="isotonic",
        cv=5,
    )
    calibrated_model.fit(X_train_scaled, y_train)

    # Re-evaluate calibrated model on hold-out
    cal_ho_metrics     = evaluate_model(calibrated_model, X_test_scaled, y_test)
    cal_pr_curve       = compute_pr_curve(calibrated_model, X_test_scaled, y_test.values)
    cal_calibration    = compute_calibration(calibrated_model, X_test_scaled, y_test.values)

    print(
        f"[Train] Calibrated {best_name}: "
        f"AUC={cal_ho_metrics['roc_auc']:.4f} "
        f"Brier={cal_calibration['brier_score']:.4f}"
    )

    # Feature importance from the underlying (uncalibrated) champion
    feature_importance: List[Dict] = []
    underlying = best_model
    if hasattr(underlying, "feature_importances_"):
        for feat, imp in sorted(zip(feature_cols, underlying.feature_importances_), key=lambda x: -x[1]):
            feature_importance.append({"feature": feat, "importance": round(float(imp), 4)})
    elif hasattr(underlying, "coef_"):
        coefs = np.abs(underlying.coef_[0])
        for feat, coef in sorted(zip(feature_cols, coefs), key=lambda x: -x[1]):
            feature_importance.append({"feature": feat, "importance": round(float(coef), 4)})

    # Fairness audit
    from .fairness import run_fairness_audit, compare_sensitive_features_impact
    fairness_report = run_fairness_audit(calibrated_model, X_test_scaled, y_test.values, df_test_raw)
    try:
        sensitive_comparison = compare_sensitive_features_impact(df_clean, best_name)
        fairness_report["sensitive_features_comparison"] = sensitive_comparison
    except Exception as e:
        print(f"[Train] Notice: Sensitive comparison skipped ({e})")
        fairness_report["sensitive_features_comparison"] = {}

    version    = datetime.utcnow().strftime("v%Y%m%d_%H%M%S")
    model_path = os.path.join(model_dir, f"best_model_{version}.joblib")
    joblib.dump(calibrated_model, model_path)
    joblib.dump(calibrated_model, os.path.join(model_dir, "best_model_latest.joblib"))

    meta = {
        "version":            version,
        "best_algorithm":     best_name,
        "feature_columns":    feature_cols,
        "metrics":            {**cal_ho_metrics, **results[best_name]},  # calibrated HO + CV stats
        "all_metrics":        results,
        "feature_importance": feature_importance,
        "fairness":           fairness_report,
        "pr_curve":           cal_pr_curve,
        "calibration_curve":  cal_calibration,
        "training_samples":   len(X_train),
        "test_samples":       len(X_test),
        "quality_report":     quality_report,
        "trained_at":         datetime.utcnow().isoformat(),
        "calibration_method": "isotonic",
    }
    with open(os.path.join(model_dir, "model_meta.json"), "w") as f:
        json.dump(meta, f, indent=2)

    return meta


def load_model(model_dir: str):
    latest = os.path.join(model_dir, "best_model_latest.joblib")
    if os.path.exists(latest):
        return joblib.load(latest)
    for f in sorted(os.listdir(model_dir), reverse=True):
        if f.endswith(".joblib") and "model" in f:
            return joblib.load(os.path.join(model_dir, f))
    return None


def load_model_meta(model_dir: str) -> Dict:
    meta_path = os.path.join(model_dir, "model_meta.json")
    if os.path.exists(meta_path):
        with open(meta_path) as f:
            return json.load(f)
    return {}
