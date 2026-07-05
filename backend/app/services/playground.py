import json
import time
import numpy as np
import pandas as pd
from typing import Any

from app.services.utils import get_analysis_columns


def _get_model_list(problem_type: str) -> list[tuple[str, Any, str]]:
    models = []
    if problem_type == "classification":
        try:
            from sklearn.ensemble import RandomForestClassifier
            models.append(("RandomForest", RandomForestClassifier(n_jobs=-1, random_state=42), "sklearn"))
        except ImportError:
            pass
        try:
            from sklearn.linear_model import LogisticRegression
            models.append(("LogisticRegression", LogisticRegression(max_iter=1000, random_state=42, n_jobs=-1), "sklearn"))
        except ImportError:
            pass
        try:
            from sklearn.ensemble import GradientBoostingClassifier
            models.append(("GradientBoosting", GradientBoostingClassifier(random_state=42), "sklearn"))
        except ImportError:
            pass
        try:
            from sklearn.svm import SVC
            models.append(("SVC", SVC(probability=True, random_state=42), "sklearn"))
        except ImportError:
            pass
        try:
            from sklearn.neighbors import KNeighborsClassifier
            models.append(("KNN", KNeighborsClassifier(n_jobs=-1), "sklearn"))
        except ImportError:
            pass
        try:
            import xgboost as xgb
            models.append(("XGBoost", xgb.XGBClassifier(n_jobs=-1, random_state=42, verbosity=0), "xgboost"))
        except ImportError:
            pass
        try:
            import lightgbm as lgb
            models.append(("LightGBM", lgb.LGBMClassifier(n_jobs=-1, random_state=42, verbose=-1), "lightgbm"))
        except ImportError:
            pass
        try:
            from catboost import CatBoostClassifier
            models.append(("CatBoost", CatBoostClassifier(verbose=0, random_state=42), "catboost"))
        except ImportError:
            pass
    else:
        try:
            from sklearn.ensemble import RandomForestRegressor
            models.append(("RandomForest", RandomForestRegressor(n_jobs=-1, random_state=42), "sklearn"))
        except ImportError:
            pass
        try:
            from sklearn.linear_model import Ridge
            models.append(("Ridge", Ridge(random_state=42), "sklearn"))
        except ImportError:
            pass
        try:
            from sklearn.ensemble import GradientBoostingRegressor
            models.append(("GradientBoosting", GradientBoostingRegressor(random_state=42), "sklearn"))
        except ImportError:
            pass
        try:
            from sklearn.svm import SVR
            models.append(("SVR", SVR(), "sklearn"))
        except ImportError:
            pass
        try:
            import xgboost as xgb
            models.append(("XGBoost", xgb.XGBRegressor(n_jobs=-1, random_state=42, verbosity=0), "xgboost"))
        except ImportError:
            pass
        try:
            import lightgbm as lgb
            models.append(("LightGBM", lgb.LGBMRegressor(n_jobs=-1, random_state=42, verbose=-1), "lightgbm"))
        except ImportError:
            pass
        try:
            from catboost import CatBoostRegressor
            models.append(("CatBoost", CatBoostRegressor(verbose=0, random_state=42), "catboost"))
        except ImportError:
            pass
    return models


def _get_metric(problem_type: str):
    if problem_type == "classification":
        from sklearn.metrics import accuracy_score
        return accuracy_score
    from sklearn.metrics import r2_score
    return r2_score


def _get_scoring(problem_type: str) -> str:
    return "accuracy" if problem_type == "classification" else "r2"


def _compute_explainability(model_name: str) -> int:
    name = model_name.lower()
    if any(w in name for w in ["ridge", "linear", "logistic", "elasticnet"]):
        return 9
    if "decisiontree" in name or "knn" in name:
        return 8
    if "randomforest" in name:
        return 7
    if "gradient" in name or "svc" in name or "svr" in name:
        return 6
    if "xgboost" in name:
        return 5
    if "lightgbm" in name:
        return 4
    if "catboost" in name:
        return 4
    return 5


def _estimate_model_size_kb(model) -> float:
    try:
        import pickle
        data = pickle.dumps(model, protocol=4)
        return len(data) / 1024
    except Exception:
        return 10.0


def run_model_playground(
    df: pd.DataFrame,
    target_column: str,
    models: list[str] | None = None,
    cv_folds: int = 3,
    test_size: float = 0.2,
) -> dict:
    from sklearn.model_selection import train_test_split, cross_val_score
    from sklearn.preprocessing import LabelEncoder, StandardScaler

    target = df[target_column].copy()
    if target.dtype == "object" or target.nunique() <= 25:
        problem_type = "classification"
        le = LabelEncoder()
        y = le.fit_transform(target.dropna().values)
        classes = le.classes_
    else:
        problem_type = "regression"
        y = target.dropna().values.astype(float)

    numeric, cat, date = get_analysis_columns(df)
    feature_cols = [c for c in numeric if c != target_column]
    X = df[feature_cols].dropna()
    y = y[: len(X)]

    if len(X) == 0 or len(y) == 0:
        return {"problem_type": problem_type, "models": [], "error": "No valid features after preprocessing"}

    X = X.fillna(X.median())
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=test_size, random_state=42)

    metric_fn = _get_metric(problem_type)
    scoring = _get_scoring(problem_type)
    available_models = _get_model_list(problem_type)

    results = []
    total_time = 0.0

    for name, model, lib in available_models:
        if models and name not in models:
            continue
        try:
            t0 = time.time()
            model.fit(X_train, y_train)
            train_time = time.time() - t0

            y_pred = model.predict(X_test)
            test_score = float(metric_fn(y_test, y_pred))

            t_inf0 = time.time()
            _ = model.predict(X_test[:min(100, len(X_test))])
            inf_time = time.time() - t_inf0
            inference_speed = len(X_test) / max(inf_time, 0.001)

            cv_scores = cross_val_score(model, X_scaled, y, cv=min(cv_folds, max(2, len(y) // 10)), scoring=scoring)
            cv_mean = float(np.mean(cv_scores))
            cv_std = float(np.std(cv_scores))

            model_size = _estimate_model_size_kb(model)
            explainability = _compute_explainability(name)
            total_time += train_time

            feat_imp = {}
            if hasattr(model, "feature_importances_"):
                importances = model.feature_importances_
                top_idx = np.argsort(importances)[-5:][::-1]
                feat_imp = {feature_cols[i]: float(importances[i]) for i in top_idx if i < len(feature_cols)}
            elif hasattr(model, "coef_"):
                coefs = np.abs(model.coef_[0]) if model.coef_.ndim > 1 else np.abs(model.coef_)
                top_idx = np.argsort(coefs)[-5:][::-1]
                feat_imp = {feature_cols[i]: float(coefs[i]) for i in top_idx if i < len(feature_cols)}

            cm = None
            roc_auc = None
            if problem_type == "classification" and len(classes) == 2:
                from sklearn.metrics import confusion_matrix, roc_auc_score
                cm = confusion_matrix(y_test, y_pred).tolist()
                try:
                    if hasattr(model, "predict_proba"):
                        y_prob = model.predict_proba(X_test)[:, 1]
                        roc_auc = float(roc_auc_score(y_test, y_prob))
                except Exception:
                    pass

            learning_curve = None
            if len(X_train) > 50:
                try:
                    from sklearn.model_selection import learning_curve as lc
                    train_sizes = np.linspace(0.1, 1.0, 5)
                    lc_data = lc(model, X_train, y_train, cv=2, train_sizes=train_sizes, scoring=scoring, n_jobs=-1)
                    learning_curve = {
                        "train_sizes": lc_data[0].tolist(),
                        "train_scores": [float(np.mean(s)) for s in lc_data[1]],
                        "test_scores": [float(np.mean(s)) for s in lc_data[2]],
                    }
                except Exception:
                    pass

            rec_score = (
                test_score * 0.4
                - (train_time / 10) * 0.05
                + (inference_speed / 10000) * 0.05
                - (model_size / 100) * 0.05
                + (explainability / 10) * 0.15
            ) * 10

            results.append({
                "name": name,
                "library": lib,
                "test_score": round(test_score, 4),
                "cv_mean": round(cv_mean, 4),
                "cv_std": round(cv_std, 4),
                "training_time": round(train_time, 2),
                "inference_speed": round(inference_speed, 0),
                "model_size_kb": round(model_size, 1),
                "explainability": explainability,
                "feature_importance": feat_imp,
                "confusion_matrix": cm,
                "roc_auc": roc_auc,
                "learning_curve": learning_curve,
                "recommendation_score": round(rec_score, 2),
            })
        except Exception as e:
            results.append({
                "name": name,
                "library": lib,
                "test_score": 0.0,
                "cv_mean": 0.0,
                "cv_std": 0.0,
                "training_time": 0,
                "inference_speed": 0,
                "model_size_kb": 0,
                "explainability": _compute_explainability(name),
                "feature_importance": {},
                "confusion_matrix": None,
                "roc_auc": None,
                "learning_curve": None,
                "recommendation_score": 0,
                "error": str(e)[:100],
            })

    results.sort(key=lambda r: r["recommendation_score"], reverse=True)
    best = results[0] if results else {}

    return {
        "problem_type": problem_type,
        "num_features": len(feature_cols),
        "num_samples": len(X),
        "target_column": target_column,
        "models": results,
        "best_model": best.get("name", ""),
        "best_score": best.get("test_score", 0),
        "total_training_time": round(total_time, 2),
    }
