"""
Model Training Module
Trains Logistic Regression, SVM, Random Forest, and Gradient Boosting
for dropout risk classification. Picks best model by ROC-AUC.
"""
import pandas as pd
import numpy as np
import joblib
import json
import os
from datetime import datetime
from typing import Dict, Any, Tuple

from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix
)

from .preprocessing import preprocess_dataframe, prepare_training_data, fit_scaler, save_feature_columns


def get_models():
    return {
        "LogisticRegression": LogisticRegression(max_iter=1000, random_state=42),
        "SVM": SVC(probability=True, kernel="rbf", random_state=42, C=1.0),
        "RandomForest": RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1),
        "GradientBoosting": GradientBoostingClassifier(n_estimators=100, random_state=42),
    }


def evaluate_model(model, X_test: np.ndarray, y_test: np.ndarray) -> Dict[str, Any]:
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    cm = confusion_matrix(y_test, y_pred).tolist()
    return {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "precision": float(precision_score(y_test, y_pred, zero_division=0)),
        "recall": float(recall_score(y_test, y_pred, zero_division=0)),
        "f1_score": float(f1_score(y_test, y_pred, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_test, y_proba)),
        "confusion_matrix": cm,
    }


def train_models(df: pd.DataFrame, model_dir: str) -> Dict[str, Any]:
    """
    Full training pipeline:
    1. Preprocess data
    2. Prepare features
    3. Split train/test
    4. Train all models
    5. Evaluate and pick best
    6. Save best model
    Returns metrics comparison and best model info.
    """
    os.makedirs(model_dir, exist_ok=True)

    # Preprocess
    df_clean, quality_report = preprocess_dataframe(df.copy())

    # Prepare features
    X, y_dropout, y_perf, feature_cols = prepare_training_data(df_clean)
    if y_dropout is None:
        raise ValueError("Training data must have 'is_dropout' column")

    # Save feature columns
    save_feature_columns(feature_cols, model_dir)

    # Split using indices so we keep raw demographic attributes for fairness audit
    indices = np.arange(len(X))
    idx_train, idx_test = train_test_split(
        indices, test_size=0.2, random_state=42, stratify=y_dropout
    )
    X_train = X.iloc[idx_train]
    X_test = X.iloc[idx_test]
    y_train = y_dropout.iloc[idx_train]
    y_test = y_dropout.iloc[idx_test]
    df_test_raw = df_clean.iloc[idx_test].copy()

    # Scale
    scaler = fit_scaler(X_train, model_dir)
    X_train_scaled = scaler.transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Train and evaluate
    models = get_models()
    results = {}
    trained_models = {}

    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    for name, model in models.items():
        model.fit(X_train_scaled, y_train)
        metrics = evaluate_model(model, X_test_scaled, y_test)

        # Cross-validation score
        cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=skf, scoring="roc_auc")
        metrics["cv_roc_auc_mean"] = float(cv_scores.mean())
        metrics["cv_roc_auc_std"] = float(cv_scores.std())

        results[name] = metrics
        trained_models[name] = model
        print(f"[Train] {name}: AUC={metrics['roc_auc']:.4f}, F1={metrics['f1_score']:.4f}")

    # Pick best by ROC-AUC
    best_name = max(results, key=lambda k: results[k]["roc_auc"])
    best_model = trained_models[best_name]

    # Feature importance
    feature_importance = []
    if hasattr(best_model, "feature_importances_"):
        importance = best_model.feature_importances_
        for feat, imp in sorted(zip(feature_cols, importance), key=lambda x: -x[1]):
            feature_importance.append({"feature": feat, "importance": round(float(imp), 4)})
    elif hasattr(best_model, "coef_"):
        coefs = np.abs(best_model.coef_[0])
        for feat, coef in sorted(zip(feature_cols, coefs), key=lambda x: -x[1]):
            feature_importance.append({"feature": feat, "importance": round(float(coef), 4)})

    # Fairness & Algorithmic Bias Audit for champion model
    from .fairness import run_fairness_audit, compare_sensitive_features_impact
    fairness_report = run_fairness_audit(best_model, X_test_scaled, y_test.values, df_test_raw)
    try:
        sensitive_comparison = compare_sensitive_features_impact(df_clean, best_name)
        fairness_report["sensitive_features_comparison"] = sensitive_comparison
    except Exception as e:
        print(f"[Train] Notice: Sensitive comparison skipped ({e})")
        fairness_report["sensitive_features_comparison"] = {}

    # Version
    version = datetime.utcnow().strftime("v%Y%m%d_%H%M%S")

    # Save best model
    model_path = os.path.join(model_dir, f"best_model_{version}.joblib")
    joblib.dump(best_model, model_path)

    # Save metadata
    meta = {
        "version": version,
        "best_algorithm": best_name,
        "feature_columns": feature_cols,
        "metrics": results[best_name],
        "all_metrics": results,
        "feature_importance": feature_importance,
        "fairness": fairness_report,
        "training_samples": len(X_train),
        "test_samples": len(X_test),
        "quality_report": quality_report,
        "trained_at": datetime.utcnow().isoformat(),
    }
    meta_path = os.path.join(model_dir, "model_meta.json")
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)

    # Also save as "latest"
    latest_path = os.path.join(model_dir, "best_model_latest.joblib")
    joblib.dump(best_model, latest_path)

    return meta


def load_model(model_dir: str):
    latest = os.path.join(model_dir, "best_model_latest.joblib")
    if os.path.exists(latest):
        return joblib.load(latest)
    # Fallback: find any model file
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
