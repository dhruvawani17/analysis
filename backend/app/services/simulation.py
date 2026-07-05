import json
import numpy as np
import pandas as pd
from typing import Any


async def run_simulation(
    df: pd.DataFrame,
    target_column: str,
    scenario_description: str = "",
    changes: list[dict] | None = None,
) -> dict:
    from app.llm.factory import get_llm_provider
    from app.services.utils import get_analysis_columns
    from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
    from sklearn.preprocessing import LabelEncoder
    from sklearn.model_selection import train_test_split

    numeric, cat, date = get_analysis_columns(df)

    if target_column not in df.columns:
        target_column = numeric[-1] if numeric else df.columns[-1]

    target = df[target_column].copy()
    is_classification = target.dtype == "object" or target.nunique() <= 25

    feature_cols = [c for c in numeric if c != target_column]
    X = df[feature_cols].fillna(df[feature_cols].median()).copy()
    y = target.fillna(target.mode()[0] if is_classification else target.median())

    if is_classification:
        le = LabelEncoder()
        y = le.fit_transform(y)
        model = RandomForestClassifier(n_estimators=50, n_jobs=-1, random_state=42)
    else:
        model = RandomForestRegressor(n_estimators=50, n_jobs=-1, random_state=42)
        y = y.astype(float)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model.fit(X_train, y_train)

    apply_changes = {}
    if changes:
        for change in changes:
            col = change.get("column", "")
            change_type = change.get("type", "multiply")
            value = change.get("value", 1.0)
            if col in feature_cols:
                if change_type == "multiply":
                    apply_changes[col] = X[col] * value
                elif change_type == "add":
                    apply_changes[col] = X[col] + value
                elif change_type == "set":
                    apply_changes[col] = pd.Series(value, index=X.index)
                elif change_type == "percent_increase":
                    apply_changes[col] = X[col] * (1 + value / 100)

    X_scenario = X.copy()
    change_descriptions = []
    for col, new_vals in apply_changes.items():
        original_mean = X[col].mean()
        X_scenario[col] = new_vals
        new_mean = X_scenario[col].mean()
        pct_change = ((new_mean - original_mean) / original_mean * 100) if original_mean != 0 else 0
        change_descriptions.append({
            "column": col,
            "original_mean": round(original_mean, 2),
            "new_mean": round(new_mean, 2),
            "change_pct": round(pct_change, 1),
        })

    baseline_preds = model.predict(X_test[:500])
    scenario_preds = model.predict(X_scenario.iloc[:500])

    baseline_mean = float(np.mean(baseline_preds))
    scenario_mean = float(np.mean(scenario_preds))
    pct_impact = ((scenario_mean - baseline_mean) / baseline_mean * 100) if baseline_mean != 0 else 0

    baseline_preds_full = model.predict(X)
    scenario_preds_full = model.predict(X_scenario)

    llm_analysis = ""
    if scenario_description:
        try:
            llm = get_llm_provider()
            analysis_prompt = f"""You are a data analyst. Analyze the results of a what-if simulation.

## Scenario
{scenario_description}

## Dataset Context
- Target column: {target_column}
- Feature columns: {feature_cols[:8]}
- Number of samples: {len(X)}

## Changes Applied
{json.dumps(change_descriptions, indent=2)}

## Results
- Baseline mean prediction: {baseline_mean:.4f}
- Scenario mean prediction: {scenario_mean:.4f}
- Impact: {pct_impact:+.1f}%

What does this mean for the user's business? Provide a concise analysis with actionable recommendations.

Return JSON only:
- "analysis": Your business analysis
- "recommendation": Actionable next step
- "confidence": Your confidence in this prediction (0-1)
"""
            response = await llm.chat([
                {"role": "system", "content": "You are a data analyst specializing in what-if simulations. Provide concise, actionable analysis."},
                {"role": "user", "content": analysis_prompt},
            ])
            from app.services.ml import _parse_llm_json
            parsed = _parse_llm_json(response)
            if parsed:
                llm_analysis = parsed.get("analysis", "")
        except Exception:
            pass

    return {
        "target_column": target_column,
        "problem_type": "classification" if is_classification else "regression",
        "scenario": scenario_description,
        "changes_applied": change_descriptions,
        "baseline_mean": round(baseline_mean, 4),
        "scenario_mean": round(scenario_mean, 4),
        "absolute_impact": round(scenario_mean - baseline_mean, 4),
        "percentage_impact": round(pct_impact, 1),
        "direction": "increase" if pct_impact > 0 else "decrease",
        "analysis": llm_analysis,
        "confidence": 0.7,
    }
