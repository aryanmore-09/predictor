import pytest
import pandas as pd
import numpy as np
from app.ml.preprocessing import preprocess_dataframe, prepare_training_data, FEATURE_COLUMNS


def test_preprocess_dataframe():
    df = pd.DataFrame({
        "attendance_percentage": [85.0, 70.0, 85.0, None],
        "attendance_velocity_30d": [15.0, -25.0, 15.0, 120.0],  # Out-of-range value to test clipping
        "avg_marks": [90.0, 45.0, 90.0, 60.0],
        "is_dropout": [0, 1, 0, 0],
    })
    cleaned_df, report = preprocess_dataframe(df)
    assert report["duplicates_removed"] >= 1
    assert cleaned_df["attendance_percentage"].isna().sum() == 0
    assert cleaned_df["attendance_percentage"].max() <= 100
    assert cleaned_df["attendance_percentage"].min() >= 0
    assert cleaned_df["attendance_velocity_30d"].max() <= 100
    assert cleaned_df["attendance_velocity_30d"].min() >= -100


def test_prepare_training_data():
    df = pd.DataFrame({
        "attendance_percentage": [80.0, 40.0],
        "attendance_velocity_30d": [5.0, -15.0],
        "avg_marks": [75.0, 35.0],
        "age": [20, 22],
        "is_dropout": [0, 1],
    })
    # Sensitive excluded
    X_ex, y_dropout_ex, _, cols_ex = prepare_training_data(df, exclude_sensitive=True)
    assert len(X_ex) == 2
    assert "attendance_velocity_30d" in cols_ex
    assert "age" not in cols_ex
    assert list(y_dropout_ex) == [0, 1]

    # Sensitive included
    X_in, _, _, cols_in = prepare_training_data(df, exclude_sensitive=False)
    assert "age" in cols_in


def test_feature_columns_contains_velocity():
    assert "attendance_velocity_30d" in FEATURE_COLUMNS



def test_no_label_leakage():
    """
    Train a model on synthetic data and assert test accuracy < 0.99.
    If accuracy is ≥ 0.99, there is almost certainly a leakage problem.
    """
    import numpy as np
    from sklearn.ensemble import GradientBoostingClassifier
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score
    from app.ml.preprocessing import FEATURE_COLUMNS

    np.random.seed(123)
    n = 400
    # Generate realistic overlapping data (mirrors the fixed seed.py logic)
    attendance  = np.random.normal(74, 12, n).clip(30, 100)
    marks       = np.random.normal(60, 15, n).clip(20, 100)
    stress      = np.random.randint(1, 6, n).astype(float)
    motivation  = np.random.randint(1, 6, n).astype(float)
    study_h     = np.random.normal(3, 1.5, n).clip(0.5, 10)
    lms_login   = np.random.normal(4, 2, n).clip(0, 14)
    sub_rate    = np.random.normal(75, 15, n).clip(10, 100)
    late_rate   = np.random.normal(18, 12, n).clip(0, 80)
    quiz_avg    = (marks + np.random.normal(0, 8, n)).clip(0, 100)
    backlogs    = (marks < 45).astype(float) + np.random.randint(0, 3, n)
    semester    = np.random.randint(1, 7, n).astype(float)
    age         = np.random.randint(18, 25, n).astype(float)

    # Logistic probability
    att_z   = (attendance - 74) / 12.0
    marks_z = (marks      - 62) / 14.0
    s_z     = (stress     - 3)  /  1.0
    logit   = -0.8*att_z - 1.0*marks_z + 0.5*s_z - 1.5 + np.random.normal(0, 0.9, n)
    p       = 1.0 / (1.0 + np.exp(-logit.clip(-20, 20)))
    # Stochastic label + 6% flip
    y = (np.random.random(n) < p).astype(int)
    flip_mask = np.random.random(n) < 0.06
    y[flip_mask] = 1 - y[flip_mask]

    X = np.column_stack([
        attendance, np.zeros(n), np.zeros(n), marks, np.zeros(n),
        sub_rate, late_rate, quiz_avg, np.zeros(n), stress, motivation,
        study_h, backlogs, lms_login, study_h * 0.7, np.random.randint(5, 50, n),
        semester, age,
    ])

    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    clf = GradientBoostingClassifier(n_estimators=100, random_state=42)
    clf.fit(X_tr, y_tr)
    acc = accuracy_score(y_te, clf.predict(X_te))
    print(f"[test_no_label_leakage] test accuracy = {acc:.4f}")
    assert acc < 0.99, (
        f"Test accuracy {acc:.4f} ≥ 0.99 — possible label leakage detected!"
    )
