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

