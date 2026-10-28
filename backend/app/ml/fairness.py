"""
Fairness and Algorithmic Bias Audit Module
Evaluates model predictions across demographic subgroups (gender, age groups)
to assess Demographic Parity Difference and Equal Opportunity Difference.
"""
from typing import Dict, Any, List
import numpy as np
import pandas as pd
from sklearn.metrics import confusion_matrix


def assign_age_group(age: float) -> str:
    """Bin age into specified groups: <=19, 20-21, >=22."""
    if pd.isna(age):
        return "Unknown"
    try:
        val = float(age)
        if val <= 19:
            return "<=19"
        elif val <= 21:
            return "20-21"
        else:
            return ">=22"
    except (ValueError, TypeError):
        return "Unknown"


def compute_group_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, Any]:
    """
    Computes selection rate (share predicted High risk/positive),
    True Positive Rate (TPR), and False Positive Rate (FPR).
    """
    total = len(y_true)
    if total == 0:
        return {
            "count": 0,
            "selection_rate": 0.0,
            "true_positive_rate": 0.0,
            "false_positive_rate": 0.0,
            "positives_predicted": 0,
            "actual_positives": 0,
        }

    # Selection rate: share predicted High risk (positive class = 1)
    positives_predicted = int(np.sum(y_pred == 1))
    selection_rate = float(positives_predicted / total)

    actual_positives = int(np.sum(y_true == 1))
    actual_negatives = int(np.sum(y_true == 0))

    # True positive rate = TP / (TP + FN) = TP / actual_positives
    if actual_positives > 0:
        tp = int(np.sum((y_pred == 1) & (y_true == 1)))
        tpr = float(tp / actual_positives)
    else:
        tpr = 0.0

    # False positive rate = FP / (FP + TN) = FP / actual_negatives
    if actual_negatives > 0:
        fp = int(np.sum((y_pred == 1) & (y_true == 0)))
        fpr = float(fp / actual_negatives)
    else:
        fpr = 0.0

    return {
        "count": total,
        "selection_rate": round(selection_rate, 4),
        "true_positive_rate": round(tpr, 4),
        "false_positive_rate": round(fpr, 4),
        "positives_predicted": positives_predicted,
        "actual_positives": actual_positives,
    }


def compute_subgroup_parity(
    df_sub: pd.DataFrame,
    group_col: str,
    y_true_col: str = "y_true",
    y_pred_col: str = "y_pred"
) -> Dict[str, Any]:
    """
    Computes fairness metrics across categories of a demographic attribute.
    Calculates Demographic Parity Difference and Equal Opportunity Difference.
    """
    groups = {}
    valid_groups = []

    for group_name, sub in df_sub.groupby(group_col):
        if len(sub) == 0:
            continue
        g_name = str(group_name)
        metrics = compute_group_metrics(sub[y_true_col].values, sub[y_pred_col].values)
        groups[g_name] = metrics
        valid_groups.append((g_name, metrics))

    if len(valid_groups) > 1:
        selection_rates = [m["selection_rate"] for _, m in valid_groups]
        tprs = [m["true_positive_rate"] for _, m in valid_groups]

        dp_diff = float(max(selection_rates) - min(selection_rates))
        eo_diff = float(max(tprs) - min(tprs))
    else:
        dp_diff = 0.0
        eo_diff = 0.0

    # Check warnings for gap exceeding 0.10
    warnings = []
    THRESHOLD = 0.10

    if dp_diff > THRESHOLD:
        max_g = max(valid_groups, key=lambda x: x[1]["selection_rate"])
        min_g = min(valid_groups, key=lambda x: x[1]["selection_rate"])
        warnings.append(
            f"Demographic Parity gap across {group_col} is {dp_diff:.1%} (exceeds {THRESHOLD:.0%} threshold). "
            f"Group '{max_g[0]}' has {max_g[1]['selection_rate']:.1%} selection rate vs '{min_g[0]}' at {min_g[1]['selection_rate']:.1%}."
        )

    if eo_diff > THRESHOLD:
        max_tpr_g = max(valid_groups, key=lambda x: x[1]["true_positive_rate"])
        min_tpr_g = min(valid_groups, key=lambda x: x[1]["true_positive_rate"])
        warnings.append(
            f"Equal Opportunity gap across {group_col} is {eo_diff:.1%} (exceeds {THRESHOLD:.0%} threshold). "
            f"True positive rate for '{max_tpr_g[0]}' is {max_tpr_g[1]['true_positive_rate']:.1%} vs '{min_tpr_g[0]}' at {min_tpr_g[1]['true_positive_rate']:.1%}."
        )

    return {
        "attribute": group_col,
        "groups": groups,
        "demographic_parity_difference": round(dp_diff, 4),
        "equal_opportunity_difference": round(eo_diff, 4),
        "threshold_exceeded": (dp_diff > THRESHOLD) or (eo_diff > THRESHOLD),
        "warnings": warnings,
    }


def run_fairness_audit(
    model,
    X_test_scaled: np.ndarray,
    y_test: np.ndarray,
    df_test_raw: pd.DataFrame
) -> Dict[str, Any]:
    """
    Runs full fairness audit for champion model on test set.
    Evaluates by gender and age group (<=19, 20-21, >=22).
    """
    y_pred = model.predict(X_test_scaled)
    # Predicted high risk: 1 for binary dropout prediction
    # If model outputs probabilities, also check y_proba >= 0.5
    if hasattr(model, "predict_proba"):
        y_proba = model.predict_proba(X_test_scaled)[:, 1]
    else:
        y_proba = y_pred.astype(float)

    eval_df = df_test_raw.copy().reset_index(drop=True)
    eval_df["y_true"] = np.array(y_test)
    eval_df["y_pred"] = np.array(y_pred)
    eval_df["y_proba"] = np.array(y_proba)

    # Standardize gender
    if "gender" not in eval_df.columns:
        eval_df["gender"] = "Unspecified"
    else:
        eval_df["gender"] = eval_df["gender"].fillna("Unspecified").astype(str)

    # Standardize age groups (<=19, 20-21, >=22)
    if "age" in eval_df.columns:
        eval_df["age_group"] = eval_df["age"].apply(assign_age_group)
    else:
        eval_df["age_group"] = "Unknown"

    gender_audit = compute_subgroup_parity(eval_df, "gender")
    age_audit = compute_subgroup_parity(eval_df, "age_group")

    all_warnings = gender_audit["warnings"] + age_audit["warnings"]
    threshold_exceeded = gender_audit["threshold_exceeded"] or age_audit["threshold_exceeded"]

    return {
        "status": "warning" if threshold_exceeded else "passed",
        "threshold": 0.10,
        "threshold_exceeded": threshold_exceeded,
        "all_warnings": all_warnings,
        "by_gender": gender_audit,
        "by_age_group": age_audit,
        "sample_count": len(eval_df),
    }


def compare_sensitive_features_impact(
    df: pd.DataFrame,
    champion_algo: str = "RandomForest"
) -> Dict[str, Any]:
    """
    Trains and compares model performance and fairness WITH and WITHOUT sensitive features (age, gender).
    Returns metric differences to quantify fairness-accuracy tradeoffs.
    """
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import StandardScaler
    from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
    from sklearn.linear_model import LogisticRegression
    from sklearn.svm import SVC
    from sklearn.metrics import accuracy_score, f1_score, roc_auc_score
    from .preprocessing import preprocess_dataframe, prepare_training_data

    def get_model_instance(name: str):
        if name == "GradientBoosting":
            return GradientBoostingClassifier(n_estimators=100, random_state=42)
        elif name == "SVM":
            return SVC(probability=True, kernel="rbf", random_state=42, C=1.0)
        elif name == "LogisticRegression":
            return LogisticRegression(max_iter=1000, random_state=42)
        else:
            return RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)

    df_clean, _ = preprocess_dataframe(df.copy())
    if "is_dropout" not in df_clean.columns:
        return {}

    # 1. With sensitive features
    X_with, y_with, _, cols_with = prepare_training_data(df_clean, exclude_sensitive=False)
    # 2. Without sensitive features
    X_without, y_without, _, cols_without = prepare_training_data(df_clean, exclude_sensitive=True)

    # Train/test split using shared random state so test samples are identical
    indices = np.arange(len(df_clean))
    idx_train, idx_test = train_test_split(indices, test_size=0.2, random_state=42, stratify=df_clean["is_dropout"])

    df_test_raw = df_clean.iloc[idx_test].copy()
    y_test = df_clean["is_dropout"].iloc[idx_test].values

    # Fit with sensitive
    scaler_with = StandardScaler()
    X_train_with = scaler_with.fit_transform(X_with.iloc[idx_train])
    X_test_with = scaler_with.transform(X_with.iloc[idx_test])
    model_with = get_model_instance(champion_algo)
    model_with.fit(X_train_with, df_clean["is_dropout"].iloc[idx_train].values)

    y_pred_with = model_with.predict(X_test_with)
    y_prob_with = model_with.predict_proba(X_test_with)[:, 1]

    metrics_with = {
        "accuracy": round(float(accuracy_score(y_test, y_pred_with)), 4),
        "f1_score": round(float(f1_score(y_test, y_pred_with, zero_division=0)), 4),
        "roc_auc": round(float(roc_auc_score(y_test, y_prob_with)), 4),
        "feature_count": len(cols_with),
        "features": cols_with,
    }
    fairness_with = run_fairness_audit(model_with, X_test_with, y_test, df_test_raw)
    metrics_with["demographic_parity_diff_gender"] = fairness_with["by_gender"]["demographic_parity_difference"]
    metrics_with["equal_opportunity_diff_gender"] = fairness_with["by_gender"]["equal_opportunity_difference"]
    metrics_with["demographic_parity_diff_age"] = fairness_with["by_age_group"]["demographic_parity_difference"]
    metrics_with["equal_opportunity_diff_age"] = fairness_with["by_age_group"]["equal_opportunity_difference"]

    # Fit without sensitive
    scaler_without = StandardScaler()
    X_train_without = scaler_without.fit_transform(X_without.iloc[idx_train])
    X_test_without = scaler_without.transform(X_without.iloc[idx_test])
    model_without = get_model_instance(champion_algo)
    model_without.fit(X_train_without, df_clean["is_dropout"].iloc[idx_train].values)

    y_pred_without = model_without.predict(X_test_without)
    y_prob_without = model_without.predict_proba(X_test_without)[:, 1]

    metrics_without = {
        "accuracy": round(float(accuracy_score(y_test, y_pred_without)), 4),
        "f1_score": round(float(f1_score(y_test, y_pred_without, zero_division=0)), 4),
        "roc_auc": round(float(roc_auc_score(y_test, y_prob_without)), 4),
        "feature_count": len(cols_without),
        "features": cols_without,
    }
    fairness_without = run_fairness_audit(model_without, X_test_without, y_test, df_test_raw)
    metrics_without["demographic_parity_diff_gender"] = fairness_without["by_gender"]["demographic_parity_difference"]
    metrics_without["equal_opportunity_diff_gender"] = fairness_without["by_gender"]["equal_opportunity_difference"]
    metrics_without["demographic_parity_diff_age"] = fairness_without["by_age_group"]["demographic_parity_difference"]
    metrics_without["equal_opportunity_diff_age"] = fairness_without["by_age_group"]["equal_opportunity_difference"]

    # Differences: without - with
    diff = {
        "accuracy_diff": round(metrics_without["accuracy"] - metrics_with["accuracy"], 4),
        "f1_score_diff": round(metrics_without["f1_score"] - metrics_with["f1_score"], 4),
        "roc_auc_diff": round(metrics_without["roc_auc"] - metrics_with["roc_auc"], 4),
        "dp_gender_gap_change": round(metrics_without["demographic_parity_diff_gender"] - metrics_with["demographic_parity_diff_gender"], 4),
        "eo_gender_gap_change": round(metrics_without["equal_opportunity_diff_gender"] - metrics_with["equal_opportunity_diff_gender"], 4),
        "dp_age_gap_change": round(metrics_without["demographic_parity_diff_age"] - metrics_with["demographic_parity_diff_age"], 4),
        "eo_age_gap_change": round(metrics_without["equal_opportunity_diff_age"] - metrics_with["equal_opportunity_diff_age"], 4),
    }

    return {
        "with_sensitive": metrics_with,
        "without_sensitive": metrics_without,
        "difference": diff,
        "active_configuration": "excluded" if getattr(from_config_or_default(), "EXCLUDE_SENSITIVE_FEATURES", True) else "included"
    }


def from_config_or_default():
    from ..config import settings
    return settings
