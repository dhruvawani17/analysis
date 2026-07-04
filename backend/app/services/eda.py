import json
import numpy as np
import pandas as pd
import plotly
import plotly.express as px
import plotly.graph_objects as go


def _safe(val: float | None, decimals: int = 4) -> float | None:
    if val is None:
        return None
    try:
        f = float(val)
        if np.isnan(f) or np.isinf(f):
            return None
        return round(f, decimals)
    except (ValueError, TypeError):
        return None


def run_eda(df: pd.DataFrame) -> dict:
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()
    date_cols = df.select_dtypes(include=["datetime64"]).columns.tolist()

    stats = {}
    for col in numeric_cols:
        s = df[col].dropna()
        stats[col] = {
            "mean": _safe(s.mean()),
            "std": _safe(s.std()) if len(s) > 1 else None,
            "min": _safe(s.min()),
            "max": _safe(s.max()),
            "median": _safe(s.median()),
            "q1": _safe(s.quantile(0.25)),
            "q3": _safe(s.quantile(0.75)),
            "missing": int(df[col].isna().sum()),
            "unique": int(s.nunique()),
        }

    cat_stats = {}
    for col in categorical_cols:
        value_counts = df[col].value_counts().head(10)
        cat_stats[col] = {
            "missing": int(df[col].isna().sum()),
            "unique": int(df[col].nunique()),
            "top_values": {str(k): int(v) for k, v in value_counts.items()},
        }

    date_stats = {}
    for col in date_cols:
        s = df[col].dropna()
        date_stats[col] = {
            "min": str(s.min()) if len(s) > 0 else None,
            "max": str(s.max()) if len(s) > 0 else None,
            "missing": int(df[col].isna().sum()),
        }

    missing_summary = {col: int(v) for col, v in df.isnull().sum().items() if v > 0}

    corr_matrix = {}
    if len(numeric_cols) > 1:
        corr = df[numeric_cols].corr().round(4)
        corr_matrix = json.loads(corr.to_json())
        for col1 in corr_matrix:
            for col2 in corr_matrix[col1]:
                v = corr_matrix[col1][col2]
                if v is not None and (np.isnan(v) if isinstance(v, float) else False):
                    corr_matrix[col1][col2] = None

    histograms = {}
    for col in numeric_cols[:10]:
        fig = px.histogram(df, x=col, title=col, nbins=30)
        fig.update_layout(margin=dict(l=20, r=20, t=40, b=20), height=250)
        histograms[col] = json.loads(fig.to_json())

    box_plots = {}
    for col in numeric_cols[:10]:
        fig = px.box(df, y=col, title=col)
        fig.update_layout(margin=dict(l=20, r=20, t=40, b=20), height=250)
        box_plots[col] = json.loads(fig.to_json())

    corr_chart = None
    if len(numeric_cols) > 1:
        fig = px.imshow(
            df[numeric_cols].corr(),
            text_auto=".2f",
            color_continuous_scale="RdBu_r",
            aspect="auto",
            title="Correlation Matrix",
        )
        fig.update_layout(height=500)
        corr_chart = json.loads(fig.to_json())

    missing_chart = None
    if missing_summary:
        fig = go.Figure()
        fig.add_trace(go.Bar(
            x=list(missing_summary.keys()),
            y=list(missing_summary.values()),
            marker_color="orange",
        ))
        fig.update_layout(
            title="Missing Values by Column",
            xaxis_title="Column",
            yaxis_title="Count",
            height=300,
            margin=dict(l=20, r=20, t=40, b=80),
        )
        missing_chart = json.loads(fig.to_json())

    result = {
        "shape": list(df.shape),
        "columns": list(df.columns),
        "dtypes": {c: str(t) for c, t in df.dtypes.items()},
        "numeric_columns": numeric_cols,
        "categorical_columns": categorical_cols,
        "date_columns": date_cols,
        "stats": stats,
        "categorical_stats": cat_stats,
        "date_stats": date_stats,
        "missing_summary": missing_summary,
        "correlation": corr_matrix,
        "charts": {
            "histograms": histograms,
            "box_plots": box_plots,
            "correlation": corr_chart,
            "missing": missing_chart,
        },
    }

    return result
