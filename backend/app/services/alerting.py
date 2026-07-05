import json
import numpy as np
import pandas as pd
from typing import Any
from datetime import datetime


def generate_alerts(df: pd.DataFrame, prev_df: pd.DataFrame | None = None, context: dict | None = None) -> list[dict]:
    alerts: list[dict] = []

    if prev_df is not None and len(prev_df) > 0 and len(df) > 0:
        try:
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            common_cols = [c for c in numeric_cols if c in prev_df.columns]
            for col in common_cols[:5]:
                current_mean = df[col].mean()
                prev_mean = prev_df[col].mean()
                if prev_mean != 0:
                    pct_change = ((current_mean - prev_mean) / prev_mean) * 100
                    if abs(pct_change) > 10:
                        direction = "increased" if pct_change > 0 else "dropped"
                        alerts.append({
                            "type": "metric_change",
                            "severity": "warning" if abs(pct_change) > 20 else "info",
                            "title": f"{col} {direction} by {abs(pct_change):.0f}%",
                            "message": f"Mean {col} changed from {prev_mean:.2f} to {current_mean:.2f}",
                            "metric": col,
                            "change_pct": round(pct_change, 1),
                            "confidence": 0.9,
                        })
        except Exception:
            pass

    if len(df) > 0:
        numeric_df = df.select_dtypes(include=[np.number])
        for col in numeric_df.columns[:10]:
            s = numeric_df[col].dropna()
            if len(s) > 0:
                q1, q3 = s.quantile(0.25), s.quantile(0.75)
                iqr = q3 - q1
                lower, upper = q1 - 3 * iqr, q3 + 3 * iqr
                extreme_outliers = s[(s < lower) | (s > upper)]
                if len(extreme_outliers) > 0:
                    alerts.append({
                        "type": "extreme_values",
                        "severity": "info",
                        "title": f"Extreme values detected in {col}",
                        "message": f"{len(extreme_outliers)} extreme values found ({len(extreme_outliers)/len(s)*100:.1f}% of data)",
                        "metric": col,
                        "count": len(extreme_outliers),
                        "confidence": 0.8,
                    })

        missing_pct = df.isna().mean() * 100
        high_missing = missing_pct[missing_pct > 30]
        for col, pct in high_missing.items():
            alerts.append({
                "type": "high_missing",
                "severity": "warning",
                "title": f"High missing values in {col}",
                "message": f"{col} has {pct:.0f}% missing values",
                "metric": col,
                "missing_pct": round(pct, 1),
                "confidence": 0.95,
            })

        corr_matrix = numeric_df.corr().abs()
        if len(corr_matrix) > 1:
            upper = corr_matrix.where(np.triu(np.ones(corr_matrix.shape), k=1).astype(bool))
            strong_corr = [(col, row, upper.loc[row, col]) for col in upper.columns for row in upper.index if not pd.isna(upper.loc[row, col]) and upper.loc[row, col] > 0.85]
            for col1, col2, val in strong_corr[:3]:
                alerts.append({
                    "type": "strong_correlation",
                    "severity": "info",
                    "title": f"Strong correlation: {col1} × {col2}",
                    "message": f"Pearson correlation: r={val:.2f}",
                    "features": [col1, col2],
                    "correlation": round(val, 2),
                    "confidence": 0.9,
                })

    if context:
        if context.get("ml_completed") and context.get("ml_results"):
            for ml_res in context.get("ml_results", []):
                score = ml_res.get("best_score", 0)
                if score > 0.9:
                    alerts.append({
                        "type": "ml_success",
                        "severity": "success",
                        "title": f"Excellent model performance",
                        "message": f"{ml_res.get('best_model', 'Model')} achieved {score:.1%} accuracy",
                        "confidence": 0.95,
                    })
                elif score < 0.5:
                    alerts.append({
                        "type": "ml_warning",
                        "severity": "warning",
                        "title": f"Poor model performance",
                        "message": f"Best model only achieved {score:.1%} — consider feature engineering",
                        "confidence": 0.85,
                    })

    return alerts[:10]
