import pandas as pd
import numpy as np
from typing import Any


def check_confidence(df: pd.DataFrame, target_column: str = "") -> list[dict]:
    issues: list[dict] = []
    n_rows, n_cols = df.shape

    if n_rows == 0:
        issues.append({
            "type": "empty_dataset",
            "severity": "critical",
            "message": "Dataset is empty",
            "recommendation": "Upload a dataset with at least one row",
        })
        return issues

    if n_rows < 50:
        issues.append({
            "type": "small_dataset",
            "severity": "critical",
            "message": f"Dataset has only {n_rows} rows — too small for reliable ML training",
            "recommendation": "Collect more data (aim for at least 500 rows)",
        })
    elif n_rows < 100:
        issues.append({
            "type": "small_dataset",
            "severity": "warning",
            "message": f"Dataset has only {n_rows} rows — results may not generalize",
            "recommendation": "Consider collecting more data or using simple models",
        })

    if n_cols > n_rows:
        issues.append({
            "type": "overfitting_risk",
            "severity": "critical",
            "message": f"More features ({n_cols}) than rows ({n_rows}) — high overfitting risk",
            "recommendation": "Use dimensionality reduction or feature selection",
        })

    if target_column and target_column in df.columns:
        if df[target_column].dtype == "object" or df[target_column].nunique() <= 25:
            value_counts = df[target_column].value_counts(normalize=True)
            min_class_pct = value_counts.min() * 100
            if min_class_pct < 5:
                issues.append({
                    "type": "class_imbalance",
                    "severity": "critical",
                    "message": f"Severe class imbalance: smallest class is {min_class_pct:.1f}%",
                    "recommendation": "Use SMOTE, class weights, or collect more samples for minority class",
                })
            elif min_class_pct < 15:
                issues.append({
                    "type": "class_imbalance",
                    "severity": "warning",
                    "message": f"Moderate class imbalance: smallest class is {min_class_pct:.1f}%",
                    "recommendation": "Consider using class weights or stratified sampling",
                })
            if df[target_column].nunique() > 50:
                issues.append({
                    "type": "high_cardinality_target",
                    "severity": "warning",
                    "message": f"Target has {df[target_column].nunique()} unique values — consider grouping rare classes",
                    "recommendation": "Group rare classes or use a regression approach",
                })

    id_cols = [c for c in df.columns if any(w in c.lower() for w in ["id", "uuid", "key", "code"]) and c != target_column]
    for col in id_cols:
        if df[col].nunique() / len(df) > 0.95:
            issues.append({
                "type": "potential_leakage",
                "severity": "critical",
                "message": f"'{col}' is nearly unique — potential target leakage or identifier column",
                "recommendation": f"Drop '{col}' before training to prevent data leakage",
            })

    numeric_df = df.select_dtypes(include=[np.number])
    if len(numeric_df.columns) > 1:
        corr_matrix = numeric_df.corr().abs()
        upper = corr_matrix.where(np.triu(np.ones(corr_matrix.shape), k=1).astype(bool))
        high_corr = [(col, row, upper.loc[row, col]) for col in upper.columns for row in upper.index if not pd.isna(upper.loc[row, col]) and upper.loc[row, col] > 0.9]
        for col1, col2, val in high_corr[:5]:
            issues.append({
                "type": "multicollinearity",
                "severity": "warning",
                "message": f"'{col1}' and '{col2}' are highly correlated (r={val:.2f})",
                "recommendation": f"Consider dropping one of '{col1}' or '{col2}'",
            })

    for col in numeric_df.columns:
        if col == target_column:
            continue
        if numeric_df[col].std() < 1e-10:
            issues.append({
                "type": "constant_column",
                "severity": "warning",
                "message": f"'{col}' is constant or near-constant — provides no predictive value",
                "recommendation": f"Drop '{col}' as it adds no information",
            })

    for col in df.columns:
        missing_pct = df[col].isna().mean() * 100
        if missing_pct > 50 and col != target_column:
            issues.append({
                "type": "high_missing",
                "severity": "critical",
                "message": f"'{col}' has {missing_pct:.0f}% missing values",
                "recommendation": f"Drop '{col}' or use advanced imputation",
            })
        elif missing_pct > 20 and col != target_column:
            issues.append({
                "type": "high_missing",
                "severity": "warning",
                "message": f"'{col}' has {missing_pct:.0f}% missing values",
                "recommendation": f"Consider imputation for '{col}'",
            })

    cat_cols = df.select_dtypes(exclude=[np.number]).columns
    for col in cat_cols:
        if col == target_column:
            continue
        unique_count = df[col].nunique()
        if unique_count > 100:
            issues.append({
                "type": "high_cardinality",
                "severity": "warning",
                "message": f"'{col}' has {unique_count} unique values (high cardinality)",
                "recommendation": f"Consider target encoding or grouping rare categories in '{col}'",
            })

    for col in numeric_df.columns[:5]:
        skew_val = numeric_df[col].skew()
        if abs(skew_val) > 3:
            issues.append({
                "type": "high_skew",
                "severity": "warning",
                "message": f"'{col}' has high skew ({skew_val:.1f})",
                "recommendation": f"Apply log or Box-Cox transformation to '{col}'",
            })

    if n_rows >= 100:
        issues.append({
            "type": "ready_for_modelling",
            "severity": "info",
            "message": f"Dataset is ready for modeling ({n_rows:,} rows, {n_cols} features)",
            "recommendation": "Proceed with training — confidence is good",
        })

    return issues
