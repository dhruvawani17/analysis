import warnings
from typing import Any

import numpy as np
import pandas as pd
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.metrics import accuracy_score, r2_score
from sklearn.preprocessing import LabelEncoder, StandardScaler

warnings.filterwarnings("ignore")


def _get_models(problem_type: str, random_state: int = 42) -> dict:
    from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor

    models: dict[str, Any] = {}

    if problem_type == "classification":
        models["Random Forest"] = RandomForestClassifier(n_estimators=50, random_state=random_state, n_jobs=-1)
        try:
            import xgboost as xgb
            models["XGBoost"] = xgb.XGBClassifier(n_estimators=50, random_state=random_state, n_jobs=-1, verbosity=0)
        except ImportError:
            pass
        try:
            import lightgbm as lgb
            models["LightGBM"] = lgb.LGBMClassifier(n_estimators=50, random_state=random_state, n_jobs=-1, verbose=-1)
        except ImportError:
            pass
        try:
            from catboost import CatBoostClassifier
            models["CatBoost"] = CatBoostClassifier(n_estimators=50, random_state=random_state, verbose=0)
        except ImportError:
            pass
    else:
        models["Random Forest"] = RandomForestRegressor(n_estimators=50, random_state=random_state, n_jobs=-1)
        try:
            import xgboost as xgb
            models["XGBoost"] = xgb.XGBRegressor(n_estimators=50, random_state=random_state, n_jobs=-1, verbosity=0)
        except ImportError:
            pass
        try:
            import lightgbm as lgb
            models["LightGBM"] = lgb.LGBMRegressor(n_estimators=50, random_state=random_state, n_jobs=-1, verbose=-1)
        except ImportError:
            pass
        try:
            from catboost import CatBoostRegressor
            models["CatBoost"] = CatBoostRegressor(n_estimators=50, random_state=random_state, verbose=0)
        except ImportError:
            pass

    return models


def detect_problem_type(df: pd.DataFrame, target: str) -> str:
    y = df[target]
    if y.dtype in ("object", "category", "bool"):
        return "classification"
    if y.nunique() <= 25 and len(y) > 100:
        return "classification"
    return "regression"


def _safe(val: float | None, decimals: int = 4) -> float | None:
    if val is None or (isinstance(val, float) and (np.isnan(val) or np.isinf(val))):
        return None
    return round(float(val), decimals)


async def train_and_evaluate(df: pd.DataFrame, target: str) -> dict[str, Any]:
    problem_type = detect_problem_type(df, target)

    if problem_type == "classification":
        le = LabelEncoder()
        df = df.copy()
        df[target] = le.fit_transform(df[target].astype(str))

    feature_cols = [c for c in df.select_dtypes(include=[np.number]).columns if c != target]
    if not feature_cols:
        raise ValueError("No numeric feature columns found for training")

    X = df[feature_cols].fillna(df[feature_cols].median())
    y = df[target]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    models = _get_models(problem_type)
    results: list[dict[str, Any]] = []

    best_score = -np.inf
    best_model_name = ""
    best_model_obj = None

    for name, model in models.items():
        try:
            model.fit(X_train_scaled, y_train)
            y_pred = model.predict(X_test_scaled)

            if problem_type == "classification":
                score = accuracy_score(y_test, y_pred)
                scoring = "accuracy"
            else:
                score = r2_score(y_test, y_pred)
                scoring = "r2"

            cv_folds = min(3, len(X_train_scaled) // 2)
            cv_mean = None
            cv_std = None
            if cv_folds >= 2:
                cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=cv_folds, scoring=scoring)
                cv_mean = _safe(float(cv_scores.mean()))
                cv_std = _safe(float(cv_scores.std()))

            results.append({
                "model": name,
                "test_score": _safe(score),
                "cv_mean": _safe(cv_mean),
                "cv_std": _safe(cv_std),
                "metric": scoring,
            })

            if score > best_score:
                best_score = score
                best_model_name = name
                best_model_obj = model
        except Exception as e:
            results.append({
                "model": name,
                "error": str(e),
            })

    has_results = any("test_score" in r for r in results)
    if has_results:
        results.sort(key=lambda r: r.get("cv_mean", -1) if r.get("cv_mean") is not None else -1, reverse=True)

    return {
        "problem_type": problem_type,
        "target_column": target,
        "feature_columns": feature_cols,
        "best_model": best_model_name,
        "best_score": _safe(best_score) if best_score != -np.inf else None,
        "all_results": results,
        "num_features": len(feature_cols),
        "num_samples": len(df),
    }
