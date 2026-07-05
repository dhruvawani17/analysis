import json
from typing import Any
import pandas as pd
import numpy as np

from app.llm.factory import get_llm_provider
from app.services.utils import get_analysis_columns


GOAL_EXAMPLES = {
    "predict customer churn": {"goal": "predict customer churn", "problem_type": "classification", "target_hint": "churn"},
    "forecast sales": {"goal": "forecast sales", "problem_type": "regression", "target_hint": "sales"},
    "detect fraud": {"goal": "detect fraud", "problem_type": "classification", "target_hint": "fraud"},
    "segment customers": {"goal": "segment customers", "problem_type": "clustering", "target_hint": ""},
    "find anomalies": {"goal": "find anomalies", "problem_type": "anomaly_detection", "target_hint": ""},
    "recommend products": {"goal": "recommend products", "problem_type": "recommendation", "target_hint": ""},
    "predict price": {"goal": "predict price", "problem_type": "regression", "target_hint": "price"},
    "predict rating": {"goal": "predict rating", "problem_type": "regression", "target_hint": "rating"},
    "classify customers": {"goal": "classify customers", "problem_type": "classification", "target_hint": ""},
    "estimate value": {"goal": "estimate value", "problem_type": "regression", "target_hint": ""},
}


def _find_matching_goal(user_message: str) -> dict | None:
    lower = user_message.lower()
    for keyword, goal in GOAL_EXAMPLES.items():
        words = keyword.split()
        if any(w in lower for w in words):
            return goal
    return None


def _find_target_column(df: pd.DataFrame, hint: str = "") -> str:
    if hint:
        for col in df.columns:
            if hint.lower() in col.lower():
                return col
    numeric, cat, date = get_analysis_columns(df)
    all_valid = numeric + [c for c in cat if df[c].nunique() <= 25]
    for col in all_valid:
        if "target" in col.lower() or "label" in col.lower() or "class" in col.lower():
            return col
    if numeric:
        for col in numeric:
            if "price" in col.lower() or "score" in col.lower() or "value" in col.lower():
                return col
    return all_valid[-1] if all_valid else df.columns[-1]


def _build_dataset_profile(df: pd.DataFrame) -> dict:
    numeric, cat, date = get_analysis_columns(df)
    profile = {
        "rows": len(df),
        "columns": len(df.columns),
        "column_names": list(df.columns),
        "numeric_columns": numeric[:10],
        "categorical_columns": cat[:10],
        "date_columns": date[:5],
        "memory_mb": round(df.memory_usage(deep=True).sum() / (1024 * 1024), 2),
        "missing_pct": round(df.isna().sum().sum() / (len(df) * len(df.columns)) * 100, 1),
        "sample_values": {c: df[c].dropna().unique()[:3].tolist()[:3] for c in df.columns[:8]},
    }
    return profile


async def detect_goal(df: pd.DataFrame, user_message: str = "") -> dict:
    matched = _find_matching_goal(user_message)
    if matched:
        target = _find_target_column(df, matched.get("target_hint", ""))
        matched["target_column"] = target
        return matched

    profile = _build_dataset_profile(df)
    llm = get_llm_provider()

    prompt = f"""You are an AI goal detector for a data analysis platform. The user wants to analyze their data.

## Dataset Profile
{json.dumps(profile, default=str)}

## User Message
"{user_message}"

Based on the dataset columns and the user's message, determine what they want to achieve.
Return a JSON object with:
- "goal": A short description of the goal (e.g., "predict customer churn", "forecast sales", "segment customers")
- "problem_type": One of ["classification", "regression", "clustering", "forecasting", "anomaly_detection", "recommendation"]
- "target_column": The most appropriate target column (empty string for unsupervised like clustering)
- "reason": Why you chose this
- "suggested_models": List of 2-4 model names appropriate for this problem
- "suggested_metrics": List of 2-3 evaluation metrics

Examples:
- User says "predict which customers will leave" -> classification, target=churn
- User says "forecast next quarter revenue" -> regression, target=revenue
- User says "group my customers" -> clustering, target=""

Return ONLY valid JSON."""

    try:
        response = await llm.chat([
            {"role": "system", "content": "You are an AI goal detector. Analyze the user's goal and dataset to recommend the best ML approach."},
            {"role": "user", "content": prompt},
        ])
        from app.services.ml import _parse_llm_json
        parsed = _parse_llm_json(response)
        if parsed and "goal" in parsed:
            return parsed
    except Exception:
        pass

    return {
        "goal": user_message or "analyze data",
        "problem_type": "classification",
        "target_column": _find_target_column(df),
        "reason": "Auto-detected based on dataset structure",
        "suggested_models": ["RandomForest", "XGBoost", "LightGBM"],
        "suggested_metrics": ["accuracy", "precision", "recall"],
    }
