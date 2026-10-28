"""
UCI Student Dropout Dataset Loader
===================================
Loads the UCI "Predict Students' Dropout and Academic Success" CSV,
maps its columns to the predictor's feature schema, and trains/evaluates
a model on it.

Usage:
    python -m data.load_uci [--csv PATH] [--model-dir PATH]

Dataset:
    Download from https://archive.ics.uci.edu/dataset/697/predict+students+dropout+and+academic+success
    Save as: backend/data/uci_dropout.csv
    (semicolon-separated, header row included)
"""
import sys
import os
import argparse
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
import pandas as pd

_DEFAULT_CSV = os.path.join(os.path.dirname(__file__), "uci_dropout.csv")
_DEFAULT_MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models", "uci")

# ── Column mapping: UCI col name → our feature schema field ──────────────────
# UCI dataset columns (semicolon-sep, headers in Portuguese/English):
UCI_TO_SCHEMA = {
    # Attendance proxy — UCI has "Curricular units Xst sem (approved)"
    "Curricular units 1st sem (approved)":  None,   # handled below
    "Curricular units 2nd sem (approved)":  None,
    # Marks proxy
    "Curricular units 1st sem (grade)":     "avg_marks_sem1",
    "Curricular units 2nd sem (grade)":     "avg_marks_sem2",
    # Engagement proxy
    "Age at enrollment":                     "age",
    "Gender":                                "gender_uci",
    "Scholarship holder":                    "scholarship",
    # Stress proxies
    "Unemployment rate":                     "unemployment_rate",
    "Inflation rate":                        "inflation_rate",
    # Semester
    "Curricular units 1st sem (enrolled)":  "enrolled_sem1",
    "Curricular units 2nd sem (enrolled)":  "enrolled_sem2",
    # Target
    "Target":                               "target_raw",
}


def map_uci_to_schema(df_raw: pd.DataFrame) -> pd.DataFrame:
    """Map UCI columns to the predictor feature schema as closely as possible."""
    df = pd.DataFrame()

    # ── avg_marks (0-20 in UCI → rescale to 0-100) ───────────────────────
    if "Curricular units 1st sem (grade)" in df_raw.columns:
        df["avg_marks"] = (
            df_raw["Curricular units 1st sem (grade)"].fillna(0) * 5.0  # 20-pt → 100-pt
        )
    if "Curricular units 2nd sem (grade)" in df_raw.columns:
        sem2 = df_raw["Curricular units 2nd sem (grade)"].fillna(0) * 5.0
        if "avg_marks" in df.columns:
            df["avg_marks"] = (df["avg_marks"] + sem2) / 2
        else:
            df["avg_marks"] = sem2

    # ── attendance_percentage proxy (approved / enrolled × 100) ──────────
    enrolled1  = df_raw.get("Curricular units 1st sem (enrolled)",  pd.Series(dtype=float)).fillna(0)
    approved1  = df_raw.get("Curricular units 1st sem (approved)",  pd.Series(dtype=float)).fillna(0)
    enrolled2  = df_raw.get("Curricular units 2nd sem (enrolled)",  pd.Series(dtype=float)).fillna(0)
    approved2  = df_raw.get("Curricular units 2nd sem (approved)",  pd.Series(dtype=float)).fillna(0)
    tot_enr    = (enrolled1 + enrolled2).replace(0, np.nan)
    tot_apr    = approved1 + approved2
    df["attendance_percentage"] = ((tot_apr / tot_enr) * 100).clip(0, 100).fillna(60.0)

    # ── assignment_submission_rate proxy ──────────────────────────────────
    evaluations1 = df_raw.get("Curricular units 1st sem (evaluations)", pd.Series(dtype=float)).fillna(0)
    evaluations2 = df_raw.get("Curricular units 2nd sem (evaluations)", pd.Series(dtype=float)).fillna(0)
    tot_eval = (evaluations1 + evaluations2).replace(0, np.nan)
    df["assignment_submission_rate"] = ((tot_apr / tot_eval) * 100).clip(0, 100).fillna(70.0)

    # ── Backlog proxy: units with grade < 10 (fail threshold in Portuguese system) ─
    # Not directly computable from aggregated data; set to 0
    df["backlog_count"]          = 0
    df["late_submission_rate"]   = 0.0
    df["marks_trend"]            = 0.0
    df["attendance_trend"]       = 0.0
    df["attendance_velocity_30d"]= 0.0
    df["quiz_average"]           = df["avg_marks"] * 0.9  # proxy

    # ── Engagement & survey proxies ───────────────────────────────────────
    df["study_hours"]       = 3.0    # not in UCI
    df["lms_login_frequency"]= 4.0   # not in UCI
    df["lms_time_spent"]    = 2.0
    df["lms_resource_views"]= 10
    df["stress_score"]      = 3
    df["motivation_score"]  = 3
    df["engagement_score"]  = 40.0

    # ── Age & semester ────────────────────────────────────────────────────
    if "Age at enrollment" in df_raw.columns:
        df["age"] = df_raw["Age at enrollment"].fillna(20)
    else:
        df["age"] = 20
    df["semester"] = 3

    # ── Target → binary is_dropout ────────────────────────────────────────
    #  UCI values: "Dropout", "Graduate", "Enrolled"
    target_col = "Target"
    if target_col in df_raw.columns:
        df["is_dropout"] = (df_raw[target_col].str.strip() == "Dropout").astype(int)
    else:
        raise ValueError(f"Column '{target_col}' not found. Check CSV format.")

    return df


def run_evaluation(df: pd.DataFrame, model_dir: str) -> dict:
    from app.ml.train import train_models
    print(f"  Training on {len(df)} UCI records...")
    os.makedirs(model_dir, exist_ok=True)
    meta = train_models(df, model_dir)
    return meta


def main():
    parser = argparse.ArgumentParser(description="Load UCI dropout dataset and evaluate predictor")
    parser.add_argument("--csv",       default=_DEFAULT_CSV,       help="Path to uci_dropout.csv")
    parser.add_argument("--model-dir", default=_DEFAULT_MODEL_DIR, help="Directory to save models")
    args = parser.parse_args()

    csv_path = args.csv
    if not os.path.exists(csv_path):
        print(
            "\n❌ UCI dataset CSV not found.\n"
            f"   Expected path: {os.path.abspath(csv_path)}\n\n"
            "   How to get it:\n"
            "   1. Visit https://archive.ics.uci.edu/dataset/697/predict+students+dropout+and+academic+success\n"
            "   2. Click 'Download' and extract the ZIP\n"
            "   3. Copy the CSV file to:  backend/data/uci_dropout.csv\n"
            "   4. Re-run:  python -m data.load_uci\n"
        )
        sys.exit(1)

    print(f"📂 Loading UCI dataset from {csv_path}...")
    # Try semicolon first (UCI standard), fall back to comma
    for sep in [";", ","]:
        try:
            df_raw = pd.read_csv(csv_path, sep=sep)
            if len(df_raw.columns) > 5:
                break
        except Exception:
            continue

    print(f"   Raw shape: {df_raw.shape}")
    print(f"   Columns: {list(df_raw.columns[:8])}...")

    print("🔄 Mapping UCI columns to feature schema...")
    df = map_uci_to_schema(df_raw)

    dist = df["is_dropout"].value_counts(normalize=True)
    print(f"   Label distribution: Dropout={dist.get(1, 0):.1%}, Non-dropout={dist.get(0, 0):.1%}")

    print(f"🏋️ Training models (saving to {args.model_dir})...")
    meta = run_evaluation(df, args.model_dir)

    print("\n📊 Results:")
    m = meta["metrics"]
    print(f"   Algorithm : {meta['best_algorithm']}")
    print(f"   Accuracy  : {m['accuracy']:.4f}")
    print(f"   Precision : {m['precision']:.4f}")
    print(f"   Recall    : {m['recall']:.4f}")
    print(f"   F1        : {m['f1_score']:.4f}")
    print(f"   ROC-AUC   : {m['roc_auc']:.4f}")
    print(f"   CV AUC    : {m.get('cv_roc_auc_mean', 0):.4f} ± {m.get('cv_roc_auc_std', 0):.4f}")
    print(f"   Brier     : {meta['calibration_curve']['brier_score']:.4f}")
    print(f"\n   Model saved to: {args.model_dir}")


if __name__ == "__main__":
    main()
