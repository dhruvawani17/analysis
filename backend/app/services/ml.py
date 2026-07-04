import warnings
import json
from typing import Any

import numpy as np
import pandas as pd
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.metrics import accuracy_score, r2_score
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.preprocessing import LabelEncoder, StandardScaler
from app.services.utils import get_id_columns

warnings.filterwarnings("ignore")


def _parse_llm_json(text: str) -> dict:
    import re
    import json
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1]
    if cleaned.endswith("```"):
        cleaned = cleaned.rsplit("```", 1)[0]
    cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    try:
        start = cleaned.index("{")
        end = cleaned.rindex("}") + 1
        return json.loads(cleaned[start:end])
    except (ValueError, json.JSONDecodeError):
        pass

    try:
        cleaned = re.sub(r',\s*}', '}', cleaned)
        cleaned = re.sub(r',\s*]', ']', cleaned)
        cleaned = re.sub(r':\s*"([^"]*)"([^",}\]])', r': "\1"\2', cleaned)
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    return {}


async def generate_data_improvements(df: pd.DataFrame, target: str) -> dict:
    from app.llm.factory import get_llm_provider

    llm = get_llm_provider()

    profile = {
        "shape": list(df.shape),
        "target": target,
        "dtypes": {c: str(t) for c, t in df.dtypes.items()},
        "missing": {c: int(v) for c, v in df.isnull().sum().items() if v > 0},
        "skew": {c: round(float(df[c].skew()), 2) for c in df.select_dtypes(include=["number"]).columns if c != target},
        "high_cardinality_cat": [c for c in df.select_dtypes(include=["object", "category"]).columns if c != target and df[c].nunique() > 20],
        "low_cardinality_cat": [c for c in df.select_dtypes(include=["object", "category"]).columns if c != target and df[c].nunique() <= 20],
        "near_zero_var": [c for c in df.select_dtypes(include=["number"]).columns if c != target and df[c].std() < df[c].mean() * 0.01 if df[c].mean() != 0],
        "sample_rows": df.head(5).to_dict(orient="records"),
    }

    prompt = f"""You are a data scientist preparing data for ML. Analyze the dataset profile below and suggest specific actionable improvements.

## Dataset Profile
{json.dumps(profile)}

## Instructions
Suggest improvements that will make ML training better. Return JSON with:
1. "drop_columns": columns to remove (leaks, useless, high cardinality identifiers)
2. "combine_rare": {{"column": "venue", "threshold": 5, "label": "Other"}} — combine rare categories
3. "create_features": ["run_rate = runs / matches", "margin_log = log1p(margin)"] — new features to engineer
4. "encode": {{"column": "team", "method": "onehot" or "label" or "target"}}
5. "scale": {{"columns": ["first_ings_score", "highscore"], "method": "standard" or "robust" or "minmax"}}
6. "outlier_strategy": "clip" or "remove" or "log_transform" for numeric columns with extreme outliers
7. "suggestions": array of 2-4 general suggestions (e.g., "Combine stage 'Qualifier' and 'Eliminator' into 'Playoffs'")

Return ONLY valid JSON, no markdown."""

    try:
        response = await llm.chat([
            {"role": "system", "content": "You are an expert ML engineer preparing data for training. Always respond with valid JSON only."},
            {"role": "user", "content": prompt},
        ])

        parsed = _parse_llm_json(response)
        if not parsed:
            raise ValueError("Could not parse JSON from LLM response")

        return {
            "drop_columns": parsed.get("drop_columns", []),
            "combine_rare": parsed.get("combine_rare", {}),
            "create_features": parsed.get("create_features", []),
            "encode": parsed.get("encode", {}),
            "scale": parsed.get("scale", {}),
            "outlier_strategy": parsed.get("outlier_strategy", ""),
            "suggestions": parsed.get("suggestions", []),
        }
    except Exception as e:
        return {
            "drop_columns": [],
            "combine_rare": {},
            "create_features": [],
            "encode": {},
            "scale": {},
            "outlier_strategy": "",
            "suggestions": [f"LLM analysis unavailable: {str(e)}"],
        }


def apply_data_improvements(df: pd.DataFrame, target: str, improvements: dict) -> tuple[pd.DataFrame, list[str]]:
    applied = []
    df = df.copy()

    drop_cols = improvements.get("drop_columns", [])
    valid_drops = [c for c in drop_cols if c in df.columns and c != target]
    if valid_drops:
        df = df.drop(columns=valid_drops)
        applied.append(f"Dropped {len(valid_drops)} columns ({', '.join(valid_drops[:5])}{'...' if len(valid_drops) > 5 else ''})")

    combine = improvements.get("combine_rare", {})
    if combine and isinstance(combine, dict):
        col = combine.get("column")
        threshold = combine.get("threshold", 5)
        label = combine.get("label", "Other")
        if col and col in df.columns and col != target:
            vc = df[col].value_counts()
            rare = vc[vc < threshold].index
            if len(rare) > 0:
                df[col] = df[col].replace(rare, label)
                applied.append(f"Combined {len(rare)} rare values in '{col}' into '{label}'")

    features = improvements.get("create_features", [])
    for feat in (features or []):
        try:
            if isinstance(feat, str) and "=" in feat:
                name, expr = feat.split("=", 1)
                name = name.strip()
                expr = expr.strip()
                local_vars = {c: df[c] for c in df.select_dtypes(include=["number"]).columns}
                df[name] = eval(expr, {"__builtins__": {}}, local_vars)
                applied.append(f"Created feature '{name}' = {expr}")
        except Exception:
            continue

    return df, applied


async def generate_llm_predictions(df: pd.DataFrame, target: str, problem_type: str, results: list[dict], feature_cols: list[str]) -> dict:
    from app.llm.factory import get_llm_provider

    llm = get_llm_provider()

    sample = df.head(10).to_string(index=False)
    best = next((r for r in results if r.get("test_score") is not None), None)
    best_model = best["model"] if best else "unknown"
    best_score = best.get("test_score") if best else None

    top_features = feature_cols[:10]

    if problem_type == "classification":
        vc = df[target].value_counts()
        class_dist = {str(k): int(v) for k, v in vc.head(5).items()}
    else:
        class_dist = None

    prompt = f"""You are a data scientist analyzing a dataset. Based on the model training results below, provide USEFUL, ACTIONABLE predictions and insights.

## Dataset Info
- Target column: '{target}'
- Problem type: {problem_type}
- Samples: {len(df)}
- Features used: {len(feature_cols)}
- Top features: {', '.join(top_features)}

## Model Results
- Best model: {best_model} (score: {best_score})
{chr(10).join(f"- {r['model']}: {r.get('test_score', 'error')}" for r in results if 'test_score' in r)}

## Class Distribution (if classification)
{class_dist if class_dist else 'N/A (regression)'}

## Sample Data (first 5 rows)
{df.head(5).to_string(index=False)}

Provide your response as JSON with these keys:
1. "summary": A 2-3 sentence plain-English summary of what the model found
2. "key_findings": Array of 3-5 plain strings with specific findings
3. "predictions": Array of 3-5 plain strings with scenario-based predictions
4. "recommendations": Array of 2-3 plain strings with actionable recommendations
5. "risk_factors": Array of 1-2 plain strings with things that could affect reliability

IMPORTANT: Every array value must be a plain string, not an object. Example: "key_findings": ["Finding 1", "Finding 2"]
Return ONLY valid JSON, no markdown, no extra text."""

    try:
        response = await llm.chat([
            {"role": "system", "content": "You are an expert data scientist. Always respond with valid JSON only. All array values must be plain strings, not objects."},
            {"role": "user", "content": prompt},
        ])

        parsed = _parse_llm_json(response)
        if not parsed:
            raise ValueError("Could not parse JSON from LLM response")

        def _to_str_list(val: any) -> list[str]:
            if not isinstance(val, list):
                return []
            result = []
            for item in val:
                if isinstance(item, str):
                    result.append(item)
                elif isinstance(item, dict):
                    result.append(item.get("text", item.get("finding", item.get("prediction", item.get("recommendation", item.get("risk_factor", str(item)))))))
                else:
                    result.append(str(item))
            return result

        return {
            "summary": str(parsed.get("summary", "")),
            "key_findings": _to_str_list(parsed.get("key_findings", [])),
            "predictions": _to_str_list(parsed.get("predictions", [])),
            "recommendations": _to_str_list(parsed.get("recommendations", [])),
            "risk_factors": _to_str_list(parsed.get("risk_factors", [])),
        }
    except Exception as e:
        return {
            "summary": f"LLM analysis unavailable: {str(e)}",
            "key_findings": [],
            "predictions": [],
            "recommendations": [],
            "risk_factors": [],
        }


def detect_feature_engineering(df: pd.DataFrame, target: str) -> dict:
    options = {"encode_categoricals": False, "extract_dates": False, "log_transform": False, "interactions": False}
    reasons = []

    cat_cols = [c for c in df.select_dtypes(include=["object", "category"]).columns if c != target]
    encodable = [c for c in cat_cols if df[c].nunique() <= 20]
    if encodable:
        options["encode_categoricals"] = True
        reasons.append(f"One-hot encode {len(encodable)} categorical columns ({', '.join(encodable[:3])}{'...' if len(encodable) > 3 else ''})")

    str_cols = df.select_dtypes(include=["object"]).columns
    date_like = 0
    for col in str_cols:
        if col == target:
            continue
        try:
            parsed = pd.to_datetime(df[col], errors="coerce", infer_datetime_format=True)
            if parsed.notna().sum() > len(df) * 0.5:
                date_like += 1
        except Exception:
            pass
    datetime_cols = df.select_dtypes(include=["datetime64[ns]"]).columns
    total_dates = len(datetime_cols) + date_like
    if total_dates > 0:
        options["extract_dates"] = True
        reasons.append(f"Extract date features from {total_dates} date column(s)")

    num_cols = [c for c in df.select_dtypes(include=[np.number]).columns if c != target]
    skewed = [c for c in num_cols if df[c].min() >= 0 and df[c].skew() > 1]
    if skewed:
        options["log_transform"] = True
        reasons.append(f"Log-transform {len(skewed)} skewed column(s) ({', '.join(skewed[:3])}{'...' if len(skewed) > 3 else ''})")

    if len(num_cols) >= 3:
        options["interactions"] = True
        reasons.append(f"Create interaction features from top {min(5, len(num_cols))} numeric columns")

    options["_reasons"] = reasons
    return options


def apply_feature_engineering(df: pd.DataFrame, options: dict | None = None, target: str | None = None) -> tuple[pd.DataFrame, dict]:
    if not options:
        return df, {}

    if options == "auto" and target:
        detected = detect_feature_engineering(df, target)
        reasons = detected.pop("_reasons", [])
        options = detected
    elif isinstance(options, dict) and options.get("_reasons"):
        reasons = options.pop("_reasons", [])
    else:
        reasons = []

    df = df.copy()
    applied = []

    if options.get("encode_categoricals"):
        cat_cols = [c for c in df.select_dtypes(include=["object", "category"]).columns if c != target]
        encoded = 0
        for col in cat_cols:
            if df[col].nunique() <= 20:
                dummies = pd.get_dummies(df[col], prefix=col, drop_first=True, dtype=int)
                df = pd.concat([df, dummies], axis=1)
                df.drop(columns=[col], inplace=True)
                encoded += 1
        if encoded:
            applied.append(f"Encoded {encoded} categorical columns")

    if options.get("extract_dates"):
        date_cols = df.select_dtypes(include=["datetime64[ns]"]).columns
        for col in date_cols:
            df[f"{col}_year"] = df[col].dt.year
            df[f"{col}_month"] = df[col].dt.month
            df[f"{col}_day"] = df[col].dt.day
            df[f"{col}_dayofweek"] = df[col].dt.dayofweek
            df.drop(columns=[col], inplace=True)
        str_cols = df.select_dtypes(include=["object"]).columns
        for col in str_cols:
            try:
                parsed = pd.to_datetime(df[col], errors="coerce", infer_datetime_format=True)
                if parsed.notna().sum() > len(df) * 0.5:
                    df[f"{col}_year"] = parsed.dt.year
                    df[f"{col}_month"] = parsed.dt.month
                    df[f"{col}_day"] = parsed.dt.day
                    df[f"{col}_dayofweek"] = parsed.dt.dayofweek
                    df.drop(columns=[col], inplace=True)
                    applied.append(f"Extracted date features from '{col}'")
            except Exception:
                pass

    if options.get("log_transform"):
        num_cols = [c for c in df.select_dtypes(include=[np.number]).columns if c != target]
        logged = 0
        for col in num_cols:
            if df[col].min() >= 0 and df[col].skew() > 1:
                df[f"{col}_log"] = np.log1p(df[col])
                logged += 1
        if logged:
            applied.append(f"Log-transformed {logged} skewed columns")

    if options.get("interactions"):
        num_cols = [c for c in df.select_dtypes(include=[np.number]).columns if c != target]
        if len(num_cols) >= 2:
            variances = df[num_cols].var().sort_values(ascending=False)
            top_cols = list(variances.index[:min(5, len(num_cols))])
            pairs = 0
            for i in range(len(top_cols)):
                for j in range(i + 1, len(top_cols)):
                    c1, c2 = top_cols[i], top_cols[j]
                    df[f"{c1}_x_{c2}"] = df[c1] * df[c2]
                    pairs += 1
            if pairs:
                applied.append(f"Created {pairs} interaction features")

    fe_info = {"applied": applied, "reasons": reasons}
    return df, fe_info


def _get_models(problem_type: str, random_state: int = 42) -> dict:
    models: dict[str, Any] = {}

    if problem_type == "classification":
        models["Random Forest"] = RandomForestClassifier(n_estimators=100, random_state=random_state, n_jobs=-1)
        try:
            import xgboost as xgb
            models["XGBoost"] = xgb.XGBClassifier(n_estimators=100, random_state=random_state, n_jobs=-1, verbosity=0)
        except ImportError:
            pass
        try:
            import lightgbm as lgb
            models["LightGBM"] = lgb.LGBMClassifier(n_estimators=100, random_state=random_state, n_jobs=-1, verbose=-1)
        except ImportError:
            pass
        try:
            from catboost import CatBoostClassifier
            models["CatBoost"] = CatBoostClassifier(n_estimators=100, random_state=random_state, verbose=0)
        except ImportError:
            pass
    else:
        models["Random Forest"] = RandomForestRegressor(n_estimators=100, random_state=random_state, n_jobs=-1)
        try:
            import xgboost as xgb
            models["XGBoost"] = xgb.XGBRegressor(n_estimators=100, random_state=random_state, n_jobs=-1, verbosity=0)
        except ImportError:
            pass
        try:
            import lightgbm as lgb
            models["LightGBM"] = lgb.LGBMRegressor(n_estimators=100, random_state=random_state, n_jobs=-1, verbose=-1)
        except ImportError:
            pass
        try:
            from catboost import CatBoostRegressor
            models["CatBoost"] = CatBoostRegressor(n_estimators=100, random_state=random_state, verbose=0)
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


def get_insights(df: pd.DataFrame, target: str, problem_type: str, results: list[dict]) -> list[dict]:
    insights = []
    y = df[target]

    if problem_type == "classification":
        vc = y.value_counts()
        total = len(y)
        insights.append({
            "type": "target_distribution",
            "message": f"Target '{target}' has {len(vc)} classes. Most common: '{vc.index[0]}' ({vc.iloc[0]/total*100:.0f}%)",
        })

        if len(vc) >= 2:
            for col in df.select_dtypes(include=["object", "category"]).columns:
                if col == target:
                    continue
                try:
                    ct = pd.crosstab(df[col], df[target], normalize="index")
                    if ct.shape[1] >= 2:
                        best_class = ct.columns[0]
                        best_row = ct[best_class].idxmax()
                        best_pct = ct.loc[best_row, best_class] * 100
                        if best_pct > 60:
                            insights.append({
                                "type": "pattern",
                                "message": f"When '{col}' is '{best_row}', '{target}' is '{best_class}' {best_pct:.0f}% of the time",
                            })
                            break
                except Exception:
                    continue

        for col in df.select_dtypes(include=[np.number]).columns:
            if col == target:
                continue
            try:
                groups = df.groupby(target)[col].mean()
                if len(groups) >= 2:
                    top = groups.idxmax()
                    bot = groups.idxmin()
                    ratio = groups.max() / groups.min() if groups.min() != 0 else None
                    if ratio and ratio > 1.5:
                        insights.append({
                            "type": "feature_importance",
                            "message": f"Average '{col}' varies by {ratio:.1f}x across '{target}' classes (highest: '{top}', lowest: '{bot}')",
                        })
                        break
            except Exception:
                continue
    else:
        insights.append({
            "type": "target_stats",
            "message": f"Target '{target}' range: {y.min():.2f} to {y.max():.2f} (mean: {y.mean():.2f})",
        })

        for col in df.select_dtypes(include=[np.number]).columns:
            if col == target:
                continue
            corr = df[col].corr(y)
            if corr is not None and abs(corr) > 0.3:
                direction = "positively" if corr > 0 else "negatively"
                insights.append({
                    "type": "correlation",
                    "message": f"'{col}' is {direction} correlated with '{target}' (r={corr:.2f})",
                })
                break

    best = next((r for r in results if r.get("test_score") is not None), None)
    if best:
        insights.append({
            "type": "model_performance",
            "message": f"Best model '{best['model']}' achieved {best.get('metric', 'score')}: {best['test_score']:.4f}",
        })

    return insights[:8]


def generate_predictions(df: pd.DataFrame, target: str, problem_type: str, feature_cols: list[str]) -> dict:
    preds = {}

    if problem_type == "classification":
        vc = df[target].value_counts()
        top3 = vc.head(3)
        total = len(df)
        preds["top_predictions"] = [
            {"value": str(k), "probability": round(v / total, 3), "count": int(v)}
            for k, v in top3.items()
        ]

        for col in df.select_dtypes(include=["object", "category"]).columns:
            if col == target:
                continue
            try:
                ct = pd.crosstab(df[col], df[target], normalize="index")
                if ct.shape[1] >= 2:
                    winners = ct.idxmax(axis=1)
                    preds["conditional_predictions"] = {
                        "feature": col,
                        "predictions": {str(k): str(v) for k, v in winners.head(5).items()},
                    }
                    break
            except Exception:
                continue
    else:
        preds["statistics"] = {
            "mean": round(float(df[target].mean()), 4),
            "median": round(float(df[target].median()), 4),
            "std": round(float(df[target].std()), 4),
            "min": round(float(df[target].min()), 4),
            "max": round(float(df[target].max()), 4),
        }

        for col in df.select_dtypes(include=[np.number]).columns:
            if col == target:
                continue
            corr = df[col].corr(df[target])
            if corr is not None and abs(corr) > 0.3:
                preds["correlated_feature"] = {
                    "feature": col,
                    "correlation": round(float(corr), 4),
                    "trend": "increasing" if corr > 0 else "decreasing",
                }
                break

    return preds


async def train_and_evaluate(df: pd.DataFrame, target: str, feature_engineering: dict | str | None = "auto") -> dict[str, Any]:
    id_cols = get_id_columns(df)
    problem_type = detect_problem_type(df, target)

    if problem_type == "classification":
        le = LabelEncoder()
        df = df.copy()
        df[target] = le.fit_transform(df[target].astype(str))

    improvements = {}
    improvement_applied: list[str] = []
    try:
        improvements = await generate_data_improvements(df, target)
        df, improvement_applied = apply_data_improvements(df, target, improvements)
    except Exception:
        improvements = {"suggestions": []}
        improvement_applied = []

    if feature_engineering is None:
        fe_opts = None
    elif feature_engineering == "auto":
        fe_opts = "auto"
    else:
        fe_opts = feature_engineering

    df, fe_info = apply_feature_engineering(df, fe_opts, target=target)

    feature_cols = [c for c in df.select_dtypes(include=[np.number]).columns if c != target and c not in id_cols]
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
        except Exception as e:
            results.append({
                "model": name,
                "error": str(e),
            })

    has_results = any("test_score" in r for r in results)
    if has_results:
        results.sort(key=lambda r: r.get("cv_mean", -1) if r.get("cv_mean") is not None else -1, reverse=True)

    insights = get_insights(df, target, problem_type, results)
    predictions = generate_predictions(df, target, problem_type, feature_cols)

    try:
        llm_predictions = await generate_llm_predictions(df, target, problem_type, results, feature_cols)
    except Exception:
        llm_predictions = {"summary": "", "key_findings": [], "predictions": [], "recommendations": [], "risk_factors": []}

    return {
        "problem_type": problem_type,
        "target_column": target,
        "excluded_columns": id_cols,
        "feature_columns": feature_cols,
        "best_model": best_model_name,
        "best_score": _safe(best_score) if best_score != -np.inf else None,
        "all_results": results,
        "num_features": len(feature_cols),
        "num_samples": len(df),
        "insights": insights,
        "predictions": predictions,
        "llm_analysis": llm_predictions,
        "feature_engineering": fe_info,
        "data_improvements": {
            "suggestions": improvements.get("suggestions", []),
            "applied": improvement_applied,
            "details": improvements,
        },
    }
