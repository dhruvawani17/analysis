import json
import pandas as pd
import numpy as np
from app.copilot.tools import ToolResult


# Power BI-inspired professional color palette
PBI_COLORS = [
    "#2563EB", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
    "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1",
    "#14B8A6", "#D946EF", "#0EA5E9", "#22C55E", "#EAB308",
]

PBI_THEME = {
    "bg": "#FFFFFF",
    "card_bg": "#FFFFFF",
    "text": "#1E293B",
    "text_secondary": "#64748B",
    "border": "#E2E8F0",
    "accent": "#2563EB",
    "header_bg": "#F8FAFC",
    "kpi_gradients": [
        "from-blue-500 to-blue-600",
        "from-emerald-500 to-teal-500",
        "from-amber-500 to-orange-500",
        "from-violet-500 to-purple-500",
        "from-rose-500 to-pink-500",
        "from-cyan-500 to-blue-500",
    ],
}


def _format_number(val: float) -> str:
    if abs(val) >= 1_000_000_000:
        return f"{val / 1_000_000_000:.1f}B"
    if abs(val) >= 1_000_000:
        return f"{val / 1_000_000:.1f}M"
    if abs(val) >= 1_000:
        return f"{val / 1_000:.1f}K"
    if val == int(val):
        return f"{int(val):,}"
    return f"{val:,.2f}"


def _compute_trend(series: pd.Series) -> dict:
    """Compute trend direction and percentage from a series."""
    if len(series) < 2:
        return {"direction": "stable", "pct": 0, "label": "0%"}
    first_half = series.iloc[: len(series) // 2].mean()
    second_half = series.iloc[len(series) // 2 :].mean()
    if first_half == 0 or pd.isna(first_half):
        return {"direction": "stable", "pct": 0, "label": "0%"}
    pct = ((second_half - first_half) / first_half) * 100
    direction = "up" if pct > 2 else ("down" if pct < -2 else "stable")
    return {"direction": direction, "pct": round(pct, 1), "label": f"{'+' if pct > 0 else ''}{pct:.1f}%"}


def _make_sparkline(series: pd.Series, color: str = "#2563EB") -> list:
    """Generate a mini sparkline trace for KPIs."""
    vals = series.dropna().values[-50:]
    if len(vals) < 2:
        return []
    import plotly.graph_objects as go
    trace = go.Scatter(
        y=vals,
        mode="lines",
        line=dict(color=color, width=2),
        showlegend=False,
        hoverinfo="skip",
    )
    return [trace]


def _apply_pbi_style(fig, title: str = "", height: int = 320):
    """Apply Power BI-inspired styling to a plotly figure."""
    fig.update_layout(
        title=dict(text=title, font=dict(size=13, color="#1E293B", family="Inter, sans-serif"), x=0.02, y=0.97),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        margin=dict(l=60, r=20, t=50, b=60),
        height=height,
        font=dict(family="Inter, sans-serif", size=11, color="#64748B"),
        hovermode="x unified",
        xaxis=dict(gridcolor="#F1F5F9", zeroline=False, showgrid=True, tickfont=dict(size=10), automargin=True),
        yaxis=dict(gridcolor="#F1F5F9", zeroline=False, showgrid=True, tickfont=dict(size=10), automargin=True),
        legend=dict(orientation="h", y=1.12, x=0.02, font=dict(size=10), bgcolor="rgba(0,0,0,0)"),
        modebar=dict(bgcolor="rgba(0,0,0,0)", color="#94A3B8", activecolor="#2563EB"),
    )
    return fig


def _render_chart(cfg: dict, df: pd.DataFrame, color_idx: int = 0) -> dict | None:
    """Render a single chart from config, returning Plotly JSON or None."""
    import plotly.express as px
    import plotly.graph_objects as go

    chart_type = cfg.get("type", "bar")
    title = cfg.get("title", "")
    x_col = cfg.get("x")
    y_col = cfg.get("y")
    cols = cfg.get("columns", [])

    fig = None
    color = PBI_COLORS[color_idx % len(PBI_COLORS)]
    color_seq = [PBI_COLORS[(color_idx + i) % len(PBI_COLORS)] for i in range(8)]

    try:
        if chart_type == "bar" and x_col and y_col and x_col in df.columns and y_col in df.columns:
            agg = df.groupby(x_col, observed=True)[y_col].mean().sort_values(ascending=False).head(12)
            fig = px.bar(x=agg.index.astype(str), y=agg.values, text_auto=".1s",
                         color_discrete_sequence=[color])
            fig.update_traces(marker_line_width=0, textposition="outside", textfont_size=9)

        elif chart_type == "bar" and x_col and x_col in df.columns:
            vc = df[x_col].value_counts().head(12)
            fig = px.bar(x=vc.index.astype(str), y=vc.values, text_auto=True,
                         color_discrete_sequence=[color])
            fig.update_traces(marker_line_width=0, textposition="outside", textfont_size=9)

        elif chart_type == "line" and x_col and y_col and x_col in df.columns and y_col in df.columns:
            temp = df[[x_col, y_col]].dropna().sort_values(x_col)
            fig = px.line(temp, x=x_col, y=y_col, color_discrete_sequence=[color])

        elif chart_type == "area" and x_col and y_col and x_col in df.columns and y_col in df.columns:
            temp = df[[x_col, y_col]].dropna().sort_values(x_col)
            fig = px.area(temp, x=x_col, y=y_col, color_discrete_sequence=[color])
            fig.update_traces(line=dict(width=2), fillcolor=f"rgba({int(color[1:3], 16)},{int(color[3:5], 16)},{int(color[5:7], 16)},0.15)")

        elif chart_type == "pie" and x_col and x_col in df.columns:
            vc = df[x_col].value_counts().head(8)
            fig = px.pie(values=vc.values, names=vc.index.astype(str), color_discrete_sequence=color_seq)

        elif chart_type == "donut" and x_col and x_col in df.columns:
            vc = df[x_col].value_counts().head(8)
            fig = px.pie(values=vc.values, names=vc.index.astype(str), hole=0.55, color_discrete_sequence=color_seq)
            fig.update_traces(textinfo="percent+label", textfont_size=10)

        elif chart_type == "scatter" and x_col and y_col and x_col in df.columns and y_col in df.columns:
            fig = px.scatter(df, x=x_col, y=y_col, opacity=0.5, color_discrete_sequence=[color],
                             trendline="lowess" if len(df) > 10 else None)
            fig.update_traces(marker=dict(size=6, line=dict(width=0)))

        elif chart_type == "histogram" and x_col and x_col in df.columns:
            fig = px.histogram(df, x=x_col, nbins=30, color_discrete_sequence=[color])
            fig.update_traces(marker_line_width=0)

        elif chart_type == "box" and x_col and x_col in df.columns:
            fig = px.box(df, y=x_col, color_discrete_sequence=[color], points="outliers")

        elif chart_type == "heatmap" and len(cols) >= 2:
            valid_cols = [c for c in cols if c in df.columns and df[c].dtype in ("int64", "float64")]
            if len(valid_cols) >= 2:
                corr = df[valid_cols].corr()
                fig = px.imshow(corr, text_auto=".2f", color_continuous_scale="RdBu_r",
                                aspect="auto", zmin=-1, zmax=1)
                fig.update_layout(height=400)

        elif chart_type == "treemap" and len(cols) >= 1 and cols[0] in df.columns:
            values_col = cols[1] if len(cols) > 1 and cols[1] in df.columns else None
            if values_col:
                agg = df.groupby(cols[0], observed=True)[values_col].sum().reset_index()
                fig = px.treemap(agg, path=[cols[0]], values=values_col, color=values_col,
                                 color_continuous_scale="Blues", color_discrete_sequence=color_seq)
            else:
                vc = df[cols[0]].value_counts().head(15)
                fig = px.treemap(values=vc.values, names=vc.index.astype(str), color_discrete_sequence=color_seq)

        elif chart_type == "funnel" and len(cols) >= 1 and cols[0] in df.columns:
            vc = df[cols[0]].value_counts().head(8)
            fig = px.funnel(x=vc.values, y=vc.index.astype(str), color_discrete_sequence=[color])

        if fig is not None:
            fig = _apply_pbi_style(fig, title, height=320 if chart_type not in ("heatmap",) else 400)
            chart_data = json.loads(fig.to_json())
            return {
                "type": chart_type,
                "title": title,
                "x": x_col,
                "y": y_col,
                "columns": cols,
                "description": cfg.get("description", ""),
                "plotly": chart_data,
            }
    except Exception:
        pass
    return None


async def dashboard_tool(dataset_id: int, df: pd.DataFrame, params: dict = None) -> ToolResult:
    """Industry-grade executive dashboard — 15+ analytical sections, all chart types, ML-aware."""
    import plotly.express as px
    import plotly.graph_objects as go
    from datetime import datetime
    from app.services.eda import run_eda

    params = params or {}
    ml_context = params.get("ml_context", {})

    eda_result = run_eda(df)
    numeric_cols = [c for c in eda_result.get("numeric_columns", []) if df[c].nunique() > 1]
    categorical_cols = eda_result.get("categorical_columns", [])
    date_cols = eda_result.get("date_columns", [])

    total_records = len(df)
    total_columns = len(df.columns)
    missing_pct = round(df.isna().sum().sum() / max(total_records * total_columns, 1) * 100, 1)
    duplicate_pct = round(df.duplicated().sum() / max(total_records, 1) * 100, 1)

    # ─── DATA QUALITY SCORES ──────────────────────────────────────────────
    completeness = round((1 - missing_pct / 100) * 100, 1)
    uniqueness = round((1 - df.duplicated().sum() / max(total_records, 1)) * 100, 1)

    valid_count, total_checks = 0, 0
    for col in numeric_cols:
        s = pd.to_numeric(df[col].dropna(), errors="coerce").dropna()
        if len(s) >= 3:
            q1, q3 = s.quantile(0.25), s.quantile(0.75)
            iqr = q3 - q1
            in_range = ((s >= q1 - 3*iqr) & (s <= q3 + 3*iqr)).sum()
            valid_count += in_range
            total_checks += len(s)
    validity = round(valid_count / max(total_checks, 1) * 100, 1) if total_checks > 0 else 100

    consistency = 100.0
    for col in categorical_cols[:5]:
        vc = df[col].value_counts()
        if len(vc) > 1:
            top_pct = vc.iloc[0] / max(vc.sum(), 1)
            consistency -= max(0, (top_pct - 0.95)) * 50
    consistency = max(0, round(consistency, 1))

    accuracy = round(100 - (1 - validity / 100) * 50, 1)
    dq_score = round(completeness * 0.25 + consistency * 0.20 + uniqueness * 0.20 + validity * 0.20 + accuracy * 0.15, 1)

    model_readiness = 100 if len(numeric_cols) >= 3 else 60 if len(numeric_cols) >= 1 else 30
    health_score = round(dq_score * 0.5 + model_readiness * 0.2 +
                         (100 if len(numeric_cols) >= 2 else 50) * 0.1 +
                         (100 if date_cols else 40) * 0.1 +
                         min(100, total_records / 1000 * 100) * 0.1, 1)

    # ─── ML CONTEXT ────────────────────────────────────────────────────────
    target_column = ml_context.get("target_column", "")
    best_model = ml_context.get("best_model", "")
    best_score = ml_context.get("best_score")
    if not target_column and numeric_cols:
        candidates = [(c, df[c].std()) for c in numeric_cols if df[c].nunique() > 5]
        if candidates:
            target_column = max(candidates, key=lambda x: x[1])[0]

    # ─── KPI CARDS ─────────────────────────────────────────────────────────
    def make_kpi(name, value, icon, color, trend=None, extra=None, fmt="number"):
        trend = trend or {"direction": "stable", "pct": 0, "label": str(value)[:20]}
        return {"name": name, "value": str(value)[:30], "format": fmt, "icon": icon,
                "color": color, "trend": trend, "extra": extra}

    kpis = [
        make_kpi("Total Records", _format_number(total_records), "database", 0,
                 {"direction": "stable", "pct": 0, "label": f"{total_records:,}"}),
        make_kpi("Total Columns", str(total_columns), "layers", 1,
                 {"direction": "stable", "pct": 0, "label": f"{total_columns} features"}),
        make_kpi("Missing Values", f"{missing_pct}%", "alert-triangle", 2 if missing_pct > 5 else 1,
                 {"direction": "up" if missing_pct > 5 else "stable", "pct": missing_pct, "label": f"{missing_pct}%"}),
        make_kpi("Duplicate Rows", f"{duplicate_pct}%", "copy", 3 if duplicate_pct > 2 else 1,
                 {"direction": "up" if duplicate_pct > 2 else "stable", "pct": duplicate_pct, "label": f"{duplicate_pct}%"}),
    ]

    # Numeric avg KPIs with sparklines
    for col in numeric_cols[:4]:
        s = pd.to_numeric(df[col].dropna(), errors="coerce").dropna()
        if len(s) < 2: continue
        trend = _compute_trend(s)
        sparkline = _make_sparkline(s, PBI_COLORS[len(kpis) % len(PBI_COLORS)])
        kpis.append(make_kpi(f"Avg {col}", _format_number(s.mean()), "activity" if any(k in col.lower() for k in ("price","revenue","cost")) else "trending-up",
                            len(kpis), {"direction": trend["direction"], "pct": trend["pct"], "label": trend["label"], "sparkline": sparkline}))

    kpis.append(make_kpi("Data Quality", f"{dq_score}/100", "shield", 0 if dq_score >= 80 else (2 if dq_score >= 60 else 3),
                         {"direction": "up" if dq_score >= 80 else "down", "pct": dq_score, "label": f"{dq_score}/100"},
                         {"completeness": completeness, "consistency": consistency, "uniqueness": uniqueness, "validity": validity, "accuracy": accuracy}))
    kpis.append(make_kpi("AI Health Score", f"{health_score}/100", "activity", 0 if health_score >= 80 else (2 if health_score >= 60 else 3),
                         {"direction": "up" if health_score >= 80 else "stable", "pct": health_score, "label": f"{health_score}/100"}))

    if target_column:
        kpis.append(make_kpi("Target Variable", str(target_column)[:25], "target", 4,
                            {"direction": "stable", "pct": 0, "label": str(target_column)[:25]}))
    if best_model:
        kpis.append(make_kpi("Best Model", str(best_model)[:25], "zap", 5,
                            {"direction": "stable", "pct": 0, "label": str(best_model)[:25]}))
    if best_score is not None:
        sv = best_score * 100 if best_score <= 1 else best_score
        kpis.append(make_kpi("Accuracy", f"{sv:.1f}%", "star", 0,
                            {"direction": "up", "pct": sv, "label": f"{sv:.1f}%"}))
    kpis.append(make_kpi("Last Updated", datetime.now().strftime("%b %d, %Y"), "calendar", 1,
                         {"direction": "stable", "pct": 0, "label": "Today"}))

    # ─── OUTLIER DATA ──────────────────────────────────────────────────────
    outlier_data = {}
    for col in numeric_cols[:10]:
        s = pd.to_numeric(df[col].dropna(), errors="coerce").dropna()
        if len(s) >= 5:
            q1, q3 = s.quantile(0.25), s.quantile(0.75)
            iqr = q3 - q1
            o = s[(s < q1 - 1.5*iqr) | (s > q3 + 1.5*iqr)]
            if len(o) > 0:
                outlier_data[col] = {"count": len(o), "pct": round(len(o)/len(s)*100, 1), "total": len(s)}

    # ─── AI DATA DETECTIVE ─────────────────────────────────────────────────
    detective_issues = []
    for col in numeric_cols[:8]:
        s = pd.to_numeric(df[col].dropna(), errors="coerce").dropna()
        if len(s) >= 10:
            q1, q3 = s.quantile(0.25), s.quantile(0.75)
            iqr = q3 - q1
            o = s[(s < q1 - 1.5*iqr) | (s > q3 + 1.5*iqr)]
            if len(o) > 0:
                detective_issues.append({"column": col, "type": "outlier", "count": len(o), "total": len(s),
                    "pct": round(len(o)/len(s)*100, 1),
                    "severity": "critical" if len(o)/len(s) > 0.1 else ("warning" if len(o)/len(s) > 0.05 else "info"),
                    "suggested_fix": f"Consider winsorizing or removing {len(o)} extreme values",
                    "confidence": round(min(99, 80 + len(o)/len(s)*50), 1)})
    for col in categorical_cols[:5]:
        vc = df[col].value_counts()
        if len(vc) == 1 and len(df) > 10:
            detective_issues.append({"column": col, "type": "constant", "count": len(df), "total": len(df),
                "pct": 100, "severity": "warning",
                "suggested_fix": f"Column '{col}' has only one unique value — consider removing", "confidence": 99})
        rare = (vc == 1).sum()
        if rare > 0 and rare / len(df) < 0.02:
            detective_issues.append({"column": col, "type": "rare_categories", "count": int(rare), "total": len(df),
                "pct": round(rare/len(df)*100, 1), "severity": "info",
                "suggested_fix": f"Group rare categories in '{col}' into 'Other'", "confidence": 90})
    for col in df.columns:
        nc = df[col].isna().sum()
        if nc > 0 and nc / len(df) > 0.01:
            detective_issues.append({"column": col, "type": "missing", "count": int(nc), "total": len(df),
                "pct": round(nc/len(df)*100, 1),
                "severity": "critical" if nc/len(df) > 0.2 else ("warning" if nc/len(df) > 0.05 else "info"),
                "suggested_fix": f"Impute {nc} missing values with mean/median/mode",
                "confidence": round(min(99, 75 + nc/len(df)*50), 1)})
    sev_order = {"critical": 0, "warning": 1, "info": 2}
    detective_issues = sorted(detective_issues, key=lambda x: sev_order.get(x["severity"], 3))[:12]

    # ─── AI INSIGHTS ───────────────────────────────────────────────────────
    ai_insights = []
    if dq_score >= 80:
        ai_insights.append({"type": "success", "message": f"Data quality {dq_score}/100 — healthy dataset foundation", "icon": "trending-up"})
    if completeness > 95:
        ai_insights.append({"type": "success", "message": f"Only {100-completeness:.1f}% missing — excellent completeness", "icon": "check-circle"})
    if len(numeric_cols) >= 5:
        ai_insights.append({"type": "success", "message": f"{len(numeric_cols)} numeric features for rich quantitative analysis", "icon": "bar-chart"})
    if missing_pct > 10:
        ai_insights.append({"type": "error", "message": f"High missing data ({missing_pct}%) — may reduce model accuracy", "icon": "alert-triangle"})
    if duplicate_pct > 5:
        ai_insights.append({"type": "error", "message": f"{duplicate_pct}% duplicates — may indicate collection issues", "icon": "alert-triangle"})
    for col in numeric_cols[:3]:
        s = pd.to_numeric(df[col].dropna(), errors="coerce").dropna()
        if len(s) >= 5 and abs(s.skew()) > 2:
            ai_insights.append({"type": "error", "message": f"'{col}' highly skewed ({s.skew():.1f}) — log transform recommended", "icon": "trending-down"})
    if outlier_data:
        ai_insights.append({"type": "error", "message": f"{sum(v['count'] for v in outlier_data.values())} outliers across {len(outlier_data)} columns", "icon": "alert-triangle"})
    if 5 < missing_pct <= 10:
        ai_insights.append({"type": "warning", "message": f"Moderate missing data ({missing_pct}%) — review affected columns", "icon": "alert-triangle"})
    for col in categorical_cols[:2]:
        if df[col].nunique() > 20:
            ai_insights.append({"type": "warning", "message": f"'{col}' has {df[col].nunique()} values — group rare categories", "icon": "layers"})
    if not date_cols:
        ai_insights.append({"type": "warning", "message": "No date columns — time series analysis unavailable", "icon": "calendar"})
    if len(numeric_cols) < 3:
        ai_insights.append({"type": "warning", "message": "Only 1-2 numeric columns — limited statistical options", "icon": "bar-chart"})
    ai_insights.append({"type": "info", "message": f"{total_records:,} rows × {total_columns} cols ({len(numeric_cols)}N, {len(categorical_cols)}C, {len(date_cols)}D)", "icon": "info"})
    if target_column:
        ai_insights.append({"type": "info", "message": f"Target: '{target_column}' — ready for supervised learning", "icon": "target"})

    # ─── AI RECOMMENDATIONS ────────────────────────────────────────────────
    recommendations = []
    if duplicate_pct > 1:
        recommendations.append({"action": f"Remove {df.duplicated().sum()} duplicate rows",
            "reason": "Improves quality, prevents data leakage", "impact": "high", "category": "cleaning"})
    for c in [c for c in df.columns if c.lower() in ("id","customerid","customer_id","userid","user_id")][:2]:
        recommendations.append({"action": f"Drop '{c}' column", "reason": "No predictive value, adds noise",
            "impact": "medium", "category": "feature_engineering"})
    if len(numeric_cols) >= 2:
        recommendations.append({"action": "Create interaction features from top numeric columns",
            "reason": "Captures non-linear relationships", "impact": "high", "category": "feature_engineering"})
    for col in numeric_cols[:3]:
        s = pd.to_numeric(df[col].dropna(), errors="coerce").dropna()
        if len(s) >= 5 and abs(s.skew()) > 1:
            recommendations.append({"action": f"Log-transform '{col}'", "reason": f"Reduces skew ({s.skew():.1f}→~0)",
                "impact": "medium", "category": "preprocessing"})
    for col in categorical_cols[:3]:
        if df[col].nunique() > 10:
            recommendations.append({"action": f"Target-encode '{col}'", "reason": f"{df[col].nunique()} cats — too many for OHE",
                "impact": "high", "category": "encoding"})
    for col in categorical_cols[:2]:
        if df[col].isna().sum() > 0:
            recommendations.append({"action": f"Impute '{col}' with mode", "reason": "Preserves distribution",
                "impact": "medium", "category": "cleaning"})
    if missing_pct > 5:
        recommendations.append({"action": "Iterative imputation for numeric missing values",
            "reason": "More accurate than mean/median for correlated features", "impact": "high", "category": "cleaning"})
    if best_model:
        recommendations.append({"action": f"Deploy {best_model} to production",
            "reason": f"Best model with {best_score*100 if best_score and best_score<=1 else best_score:.1f}% accuracy",
            "impact": "high", "category": "deployment"})

    # ─── CHARTS ────────────────────────────────────────────────────────────
    rendered_charts = []
    chart_idx = 0
    all_sections = []

    def add_chart(ctype, title, fig, desc, section, x=None, y=None, cols=None):
        nonlocal chart_idx
        cd = json.loads(fig.to_json())
        rendered_charts.append({"type": ctype, "title": title, "x": x, "y": y,
            "columns": cols or [], "description": desc, "plotly": cd, "section": section})
        chart_idx += 1
        return chart_idx - 1

    # 1. DISTRIBUTIONS ──────────────────────────────────────────────────────
    dist_idx = []
    for col in numeric_cols[:6]:
        s = pd.to_numeric(df[col].dropna(), errors="coerce").dropna()
        if len(s) < 5: continue
        try:
            fig = px.histogram(x=s.values, nbins=30, color_discrete_sequence=[PBI_COLORS[chart_idx % len(PBI_COLORS)]])
            fig.update_traces(marker_line_width=0)
            fig = _apply_pbi_style(fig, f"Distribution of {col}", 350)
            fig.add_vline(x=s.mean(), line_dash="dash", line_color="#EF4444", annotation_text=f"μ={s.mean():.1f}", annotation_position="top")
            fig.add_vline(x=s.median(), line_dash="dot", line_color="#10B981", annotation_text=f"m={s.median():.1f}", annotation_position="bottom")
            dist_idx.append(add_chart("histogram", f"Distribution of {col}", fig,
                f"{col}: μ={s.mean():.2f}, σ={s.std():.2f}, skew={s.skew():.2f}", "distributions", x=col))
        except: pass
    if dist_idx:
        all_sections.append({"title": "Data Distributions", "charts": dist_idx, "icon": "bar-chart",
            "description": "Statistical distributions with mean (red dash) and median (green dot) markers"})

    # 2. OUTLIER BOX PLOTS ──────────────────────────────────────────────────
    box_idx = []
    for col in numeric_cols[:8]:
        s = pd.to_numeric(df[col].dropna(), errors="coerce").dropna()
        if len(s) < 5: continue
        try:
            q1, q3 = s.quantile(0.25), s.quantile(0.75)
            iqr = q3 - q1
            o = s[(s < q1 - 1.5*iqr) | (s > q3 + 1.5*iqr)]
            fig = go.Figure()
            fig.add_trace(go.Box(y=s.values, name=col, marker_color=PBI_COLORS[chart_idx % len(PBI_COLORS)],
                boxmean=True, boxpoints="outliers"))
            fig = _apply_pbi_style(fig, f"Box Plot — {col}", 350)
            fig.update_yaxes(title=col, automargin=True)
            box_idx.append(add_chart("box", f"Box Plot — {col}", fig,
                f"Outliers: {len(o)} ({len(o)/len(s)*100:.1f}%) | IQR: {iqr:.2f}", "outliers", x=col))
        except: pass
    if box_idx:
        all_sections.append({"title": "Outlier Analysis", "charts": box_idx, "icon": "activity",
            "description": "Box plots with IQR, quartiles, and outlier detection (1.5× IQR rule)"})

    # 3. CATEGORICAL ANALYSIS ──────────────────────────────────────────────
    cat_idx = []
    for col in categorical_cols[:4]:
        vc = df[col].value_counts()
        if len(vc) < 2: continue
        try:
            top = vc.head(12)
            fig = px.bar(x=top.index.astype(str), y=top.values, text_auto=True,
                color_discrete_sequence=[PBI_COLORS[chart_idx % len(PBI_COLORS)]])
            fig.update_traces(marker_line_width=0, textposition="outside", textfont_size=9)
            fig = _apply_pbi_style(fig, f"Top Categories — {col}", 350)
            cat_idx.append(add_chart("bar", f"Top Categories — {col}", fig,
                f"Top {min(12,len(vc))}: {top.index[0]} ({top.values[0]:,})", "categorical", x=col))
            if 2 <= len(vc) <= 10:
                cs = [PBI_COLORS[(chart_idx + i) % len(PBI_COLORS)] for i in range(min(len(vc), 8))]
                fig2 = px.pie(values=vc.values, names=vc.index.astype(str), hole=0.55, color_discrete_sequence=cs)
                fig2.update_traces(textinfo="percent+label", textfont_size=10)
                fig2 = _apply_pbi_style(fig2, f"Proportion — {col}", 350)
                cat_idx.append(add_chart("donut", f"Proportion — {col}", fig2,
                    f"Distribution across {len(vc)} categories", "categorical", x=col))
            # Sunburst for first categorical with sub-category
            if len(categorical_cols) >= 2 and col == categorical_cols[0]:
                c2 = categorical_cols[1]
                if c2 != col:
                    try:
                        sb = df.groupby([col, c2], observed=True).size().reset_index(name="count")
                        fig3 = px.sunburst(sb, path=[col, c2], values="count",
                            color_discrete_sequence=[PBI_COLORS[i % len(PBI_COLORS)] for i in range(10)])
                        fig3 = _apply_pbi_style(fig3, f"Hierarchy: {col} → {c2}", 380)
                        cat_idx.append(add_chart("sunburst", f"Hierarchy: {col} → {c2}", fig3,
                            f"Multi-level breakdown of {col} by {c2}", "categorical", cols=[col, c2]))
                    except: pass
        except: pass
    if cat_idx:
        all_sections.append({"title": "Categorical Analysis", "charts": cat_idx, "icon": "pie-chart",
            "description": "Bar, donut, and sunburst charts for categorical feature breakdowns"})

    # 4. CORRELATION HEATMAP ────────────────────────────────────────────────
    corr_idx = []
    if len(numeric_cols) >= 2:
        try:
            cdf = df[numeric_cols].dropna().corr()
            if cdf.shape[0] >= 2:
                fig = px.imshow(cdf, text_auto=".2f", color_continuous_scale="RdBu_r", aspect="auto", zmin=-1, zmax=1)
                fig = _apply_pbi_style(fig, "Correlation Matrix", 420)
                fig.update_layout(margin=dict(l=100, r=30, t=50, b=100))
                corr_idx.append(add_chart("heatmap", "Correlation Matrix", fig,
                    f"{cdf.shape[0]}×{cdf.shape[1]} pairwise Pearson correlations", "correlations", cols=numeric_cols))
        except: pass
    if corr_idx:
        all_sections.append({"title": "Correlation Matrix", "charts": corr_idx, "icon": "grid",
            "description": "Pairwise Pearson correlation between numeric features"})

    # 5. TIME SERIES ────────────────────────────────────────────────────────
    ts_idx = []
    if date_cols and numeric_cols:
        dc = date_cols[0]
        for nc in numeric_cols[:2]:
            try:
                temp = df[[dc, nc]].dropna().copy()
                temp[dc] = pd.to_datetime(temp[dc], errors="coerce")
                temp = temp.dropna().sort_values(dc)
                if len(temp) >= 5:
                    fig = px.area(temp, x=dc, y=nc,
                        color_discrete_sequence=[PBI_COLORS[chart_idx % len(PBI_COLORS)]])
                    c = PBI_COLORS[chart_idx % len(PBI_COLORS)]
                    fig.update_traces(line=dict(width=2),
                        fillcolor=f"rgba({int(c[1:3],16)},{int(c[3:5],16)},{int(c[5:7],16)},0.12)")
                    fig = _apply_pbi_style(fig, f"{nc} Over Time", 350)
                    ts_idx.append(add_chart("area", f"{nc} Over Time", fig,
                        f"Trend of {nc} over {dc}", "timeseries", x=dc, y=nc))
            except: pass
    if ts_idx:
        all_sections.append({"title": "Time Trends", "charts": ts_idx, "icon": "trending-up",
            "description": "Metric trends over time with area fills"})

    # 6. SCATTER RELATIONSHIPS ─────────────────────────────────────────────
    sc_idx = []
    if len(numeric_cols) >= 2:
        pairs = []
        for i, c1 in enumerate(numeric_cols[:6]):
            for c2 in numeric_cols[i+1:min(i+3, len(numeric_cols))]:
                if c1 != c2: pairs.append((c1, c2))
        for c1, c2 in pairs[:3]:
            try:
                temp = df[[c1, c2]].dropna()
                if len(temp) < 10: continue
                fig = px.scatter(temp, x=c1, y=c2, opacity=0.5, trendline="lowess" if len(temp) > 20 else None,
                    color_discrete_sequence=[PBI_COLORS[chart_idx % len(PBI_COLORS)]])
                fig.update_traces(marker=dict(size=6, line=dict(width=0)))
                r = temp[c1].corr(temp[c2])
                fig = _apply_pbi_style(fig, f"{c1} vs {c2} (r={r:.3f})", 350)
                sc_idx.append(add_chart("scatter", f"{c1} vs {c2}", fig,
                    f"r={r:.3f}, n={len(temp):,}", "relationships", x=c1, y=c2))
            except: pass
    if sc_idx:
        all_sections.append({"title": "Relationships", "charts": sc_idx, "icon": "scatter-chart",
            "description": "Pairwise scatter plots with LOWESS trend lines and Pearson r"})

    # 7. TREEMAP ────────────────────────────────────────────────────────────
    tm_idx = []
    if categorical_cols:
        try:
            col = categorical_cols[0]
            vc = df[col].value_counts().head(15)
            fig = px.treemap(values=vc.values, names=vc.index.astype(str),
                color_discrete_sequence=[PBI_COLORS[i % len(PBI_COLORS)] for i in range(min(len(vc), 8))])
            fig.update_traces(textinfo="label+percent entry", textfont_size=11)
            fig = _apply_pbi_style(fig, f"Hierarchy — {col}", 360)
            tm_idx.append(add_chart("treemap", f"Hierarchy — {col}", fig,
                f"Hierarchical view of {len(vc)} categories in {col}", "categorical", x=col))
        except: pass

    # 8. FEATURE IMPORTANCE ─────────────────────────────────────────────────
    fi_idx = []
    fi_data = []
    if ml_context.get("feature_importance"):
        fi_data = ml_context["feature_importance"]
    elif target_column and target_column in numeric_cols:
        for col in numeric_cols:
            if col != target_column:
                try:
                    r = df[[col, target_column]].dropna().corr().iloc[0, 1]
                    fi_data.append({"feature": col, "importance": abs(r), "direction": "pos" if r > 0 else "neg"})
                except: pass
        fi_data = sorted(fi_data, key=lambda x: x["importance"], reverse=True)[:15]
    if fi_data:
        try:
            names = [f["feature"] for f in fi_data]
            vals = [f["importance"] * 100 for f in fi_data]
            colors = ["#10B981" if f["direction"] == "pos" else "#EF4444" for f in fi_data]
            fig = go.Figure()
            fig.add_trace(go.Bar(x=vals, y=names, orientation="h", marker_color=colors,
                text=[f"{v:.1f}%" for v in vals], textposition="outside"))
            fig.update_layout(xaxis=dict(range=[0, max(vals) * 1.2]))
            fig = _apply_pbi_style(fig, "Feature Importance", 350)
            top_feat = fi_data[0]["feature"] if fi_data else "N/A"
            top_val = fi_data[0]["importance"] * 100 if fi_data else 0
            fi_idx.append(add_chart("bar", "Feature Importance", fig,
                f"Top feature: {top_feat} ({top_val:.1f}%) — click any bar for AI explanation", "ml", x="Importance (%)" if vals else None))
        except: pass

    # 9. ML METRICS ─────────────────────────────────────────────────────────
    ml_idx = []
    if ml_context.get("all_results"):
        try:
            results = ml_context["all_results"]
            models = [r.get("model", r.get("name", f"M{i}")) for i, r in enumerate(results)]
            scores = []
            for r in results:
                s = r.get("score", r.get("accuracy", r.get("r2", 0)))
                scores.append(s * 100 if s and s <= 1 else (s or 0))
            fig = px.bar(x=models, y=scores, text_auto=".1f",
                color_discrete_sequence=[PBI_COLORS[chart_idx % len(PBI_COLORS)]])
            fig.update_traces(marker_line_width=0, textposition="outside", textfont_size=9)
            fig.update_layout(xaxis_tickangle=-30)
            fig = _apply_pbi_style(fig, "Model Performance Comparison", 350)
            ml_idx.append(add_chart("bar", "Model Performance Comparison", fig,
                f"Best: {best_model} ({best_score*100 if best_score and best_score<=1 else best_score:.1f}%)", "ml"))
        except: pass

    if fi_idx or ml_idx:
        all_sections.append({"title": "ML Dashboard", "charts": fi_idx + ml_idx, "icon": "zap",
            "description": "Feature importance and model performance metrics"})

    # 10. PREDICTION DASHBOARD ──────────────────────────────────────────────
    pred_idx = []
    if target_column and target_column in df.columns:
        try:
            s = df[target_column]
            if s.dtype in ("int64", "float64"):
                vals = pd.to_numeric(s.dropna(), errors="coerce").dropna()
                if len(vals) >= 10:
                    q1, q2, q3 = vals.quantile(0.33), vals.quantile(0.5), vals.quantile(0.66)
                    labels = ["Low Risk", "Medium Risk", "High Risk"]
                    counts = [int((vals <= q1).sum()), int(((vals > q1) & (vals <= q3)).sum()), int((vals > q3).sum())]
                    colors = ["#10B981", "#F59E0B", "#EF4444"]
                    fig = go.Figure()
                    fig.add_trace(go.Bar(x=labels, y=counts, marker_color=colors,
                        text=counts, textposition="outside", textfont_size=14))
                    fig = _apply_pbi_style(fig, f"Risk Distribution — {target_column}", 350)
                    fig.update_layout(yaxis_title="Count")
                    pred_idx.append(add_chart("bar", f"Risk Distribution — {target_column}", fig,
                        f"Low: {counts[0]:,} | Medium: {counts[1]:,} | High: {counts[2]:,}", "predictions",
                        x="Risk Level", y="Count"))
            elif s.dtype == "object" or s.dtype.name == "category":
                vc = s.value_counts()
                if len(vc) <= 10:
                    fig = px.bar(x=vc.index.astype(str), y=vc.values, text_auto=True,
                        color_discrete_sequence=[PBI_COLORS[chart_idx % len(PBI_COLORS)]])
                    fig.update_traces(marker_line_width=0, textposition="outside")
                    fig = _apply_pbi_style(fig, f"Target Distribution — {target_column}", 350)
                    pred_idx.append(add_chart("bar", f"Target Distribution — {target_column}", fig,
                        f"Distribution across {len(vc)} classes", "predictions", x=target_column))
        except: pass
    if pred_idx:
        all_sections.append({"title": "Predictions", "charts": pred_idx, "icon": "target",
            "description": "Risk segmentation and target distribution analysis"})

    # 11. BUBBLE CHART ──────────────────────────────────────────────────────
    bubble_idx = []
    if len(numeric_cols) >= 3:
        try:
            xc, yc, sc = numeric_cols[0], numeric_cols[1], numeric_cols[2] if len(numeric_cols) > 2 else numeric_cols[0]
            cat_c = categorical_cols[0] if categorical_cols else None
            temp = df[[xc, yc, sc] + ([cat_c] if cat_c else [])].dropna().head(200)
            if len(temp) >= 10:
                fig = px.scatter(temp, x=xc, y=yc, size=sc, color=cat_c, opacity=0.6,
                    color_discrete_sequence=[PBI_COLORS[i % len(PBI_COLORS)] for i in range(10)],
                    hover_name=cat_c, size_max=40)
                fig = _apply_pbi_style(fig, f"Bubble: {xc} vs {yc} (size={sc})", 380)
                bubble_idx.append(add_chart("scatter", f"Bubble: {xc} vs {yc} (size={sc})", fig,
                    f"Multi-dimensional view: {xc} × {yc} × {sc}", "relationships", x=xc, y=yc))
        except: pass
    if bubble_idx:
        # Merge into relationships section or add separately
        rel_sec = [s for s in all_sections if s["title"] == "Relationships"]
        if rel_sec:
            rel_sec[0]["charts"].extend(bubble_idx)
            rel_sec[0]["description"] += " + bubble charts"

    # 12. WATERFALL CHART ──────────────────────────────────────────────────
    wf_idx = []
    if len(numeric_cols) >= 2 and categorical_cols:
        try:
            cat = categorical_cols[0]
            num = numeric_cols[0]
            agg = df.groupby(cat, observed=True)[num].sum().sort_values(ascending=False).head(8)
            if len(agg) >= 2:
                measures = []
                total = 0
                for i, (k, v) in enumerate(agg.items()):
                    if i == 0: measures.append({"label": str(k), "value": v})
                    else: measures.append({"label": str(k), "value": v})
                    total += v
                fig = go.Figure(go.Waterfall(name=cat, orientation="v",
                    measure=["relative"] * len(agg) + ["total"],
                    x=list(agg.index.astype(str)) + ["Total"],
                    y=list(agg.values) + [agg.sum()],
                    text=[f"{v:,.0f}" for v in agg.values] + [f"{agg.sum():,.0f}"],
                    textposition="outside",
                    connector={"line": {"color": "rgb(150,150,150)", "width": 1}},
                    decreasing={"marker": {"color": "#EF4444"}},
                    increasing={"marker": {"color": "#10B981"}},
                    totals={"marker": {"color": "#2563EB"}}))
                fig = _apply_pbi_style(fig, f"Waterfall: {num} by {cat}", 380)
                wf_idx.append(add_chart("waterfall", f"Waterfall: {num} by {cat}", fig,
                    f"Running total of {num} across {cat} categories", "categorical", x=cat, y=num))
        except: pass
    if wf_idx:
        cat_sec = [s for s in all_sections if s["title"] == "Categorical Analysis"]
        if cat_sec: cat_sec[0]["charts"].extend(wf_idx)

    # 13. FUNNEL CHART ──────────────────────────────────────────────────────
    funnel_idx = []
    if categorical_cols:
        try:
            col = categorical_cols[0]
            vc = df[col].value_counts().head(8)
            if len(vc) >= 3:
                fig = px.funnel(x=vc.values, y=vc.index.astype(str),
                    color_discrete_sequence=[PBI_COLORS[chart_idx % len(PBI_COLORS)]])
                fig = _apply_pbi_style(fig, f"Funnel: {col}", 350)
                funnel_idx.append(add_chart("funnel", f"Funnel: {col}", fig,
                    f"Progressive breakdown of {len(vc)} categories", "categorical", x=col))
        except: pass
    if funnel_idx:
        cat_sec = [s for s in all_sections if s["title"] == "Categorical Analysis"]
        if cat_sec: cat_sec[0]["charts"].extend(funnel_idx)

    # 14. DATA QUALITY GAUGE SECTION ───────────────────────────────────────
    dq_idx = []
    try:
        dq_metrics = [
            ("Completeness", completeness, "#2563EB"),
            ("Consistency", consistency, "#10B981"),
            ("Uniqueness", uniqueness, "#F59E0B"),
            ("Validity", validity, "#8B5CF6"),
            ("Accuracy", accuracy, "#EC4899"),
        ]
        fig = go.Figure()
        for i, (name, val, color) in enumerate(dq_metrics):
            fig.add_trace(go.Bar(
                x=[name], y=[val],
                name=name,
                marker_color=color,
                text=f"{val:.1f}%",
                textposition="inside",
                showlegend=False,
            ))
        fig.update_layout(yaxis=dict(range=[0, 100], title="Score (%)", gridcolor="#F1F5F9"),
            bargap=0.4)
        fig = _apply_pbi_style(fig, "Data Quality Dashboard", 350)
        dq_idx.append(add_chart("bar", "Data Quality Dashboard", fig,
            f"Overall DQ: {dq_score}/100 | Best: {max(completeness, consistency, uniqueness, validity, accuracy):.1f}%",
            "data_quality", x="Metric", y="Score"))
    except: pass
    if dq_idx:
        all_sections.append({"title": "Data Quality", "charts": dq_idx, "icon": "shield",
            "description": "5-pillar data quality assessment with percentage scores"})

    # 15. STORY DASHBOARD ───────────────────────────────────────────────────
    story_segments = []
    story_segments.append({
        "chapter": "Dataset Overview",
        "narrative": f"This dataset contains {total_records:,} records across {total_columns} columns, "
                     f"comprising {len(numeric_cols)} numeric, {len(categorical_cols)} categorical, and {len(date_cols)} date-based features. "
                     f"The data quality assessment scores {dq_score}/100, indicating a {'healthy' if dq_score>=80 else 'moderate' if dq_score>=60 else 'concerning'} dataset."
    })
    if outlier_data:
        total_o = sum(v["count"] for v in outlier_data.values())
        worst = max(outlier_data.items(), key=lambda x: x[1]["count"])
        story_segments.append({
            "chapter": "Outlier Analysis",
            "narrative": f"Detected {total_o} outlier values across {len(outlier_data)} columns. "
                         f"The column '{worst[0]}' has the most outliers ({worst[1]['count']} values, {worst[1]['pct']}% of its data). "
                         f"Consider winsorization or removal for statistical modeling."
        })
    if detective_issues:
        crit = [d for d in detective_issues if d["severity"] == "critical"]
        warn = [d for d in detective_issues if d["severity"] == "warning"]
        story_segments.append({
            "chapter": "Data Issues Found",
            "narrative": f"AI analysis found {len(crit)} critical and {len(warn)} warning-level issues. "
                         f"Key concerns: {', '.join(d['column'] for d in (crit+warn)[:3])}. "
                         f"Addressing these could significantly improve model performance."
        })
    if fi_data:
        top3 = fi_data[:3]
        story_segments.append({
            "chapter": "Feature Importance",
            "narrative": f"The most predictive features are: {', '.join(f['feature'] for f in top3)}. "
                         f"'{top3[0]['feature']}' leads with {top3[0]['importance']*100:.1f}% importance — "
                         f"over {'twice' if top3[0]['importance'] > 2*top3[1]['importance'] else '1.5×'} the next feature."
        })
    if len(all_sections) >= 3:
        story_segments.append({
            "chapter": "Summary",
            "narrative": f"This dashboard contains {len(all_sections)} analytical sections with {chart_idx} visualizations "
                         f"and {len(kpis)} KPI cards. Key strengths: {len(numeric_cols)} numeric features for modeling, "
                         f"{'date columns for time series' if date_cols else 'no temporal data'}. "
                         f"{'Ready for ML deployment.' if ml_context.get('best_model') else 'Recommended next: train a model to unlock predictive insights.'}"
        })

    # ─── OVERVIEW INSIGHTS ─────────────────────────────────────────────────
    insights = []
    total_outliers = sum(v["count"] for v in outlier_data.values()) if outlier_data else 0
    insights.append(f"Dataset: {total_records:,} records × {total_columns} columns ({len(numeric_cols)}N, {len(categorical_cols)}C, {len(date_cols)}D)")
    insights.append(f"Data Quality: {dq_score}/100 (completeness={completeness}%, consistency={consistency}%, uniqueness={uniqueness}%, validity={validity}%, accuracy={accuracy}%)")
    if missing_pct > 0:
        insights.append(f"Missing data: {missing_pct}% — {len([c for c in df.columns if df[c].isna().sum() > 0])} columns affected")
    if outlier_data:
        insights.append(f"Outliers: {total_outliers} values across {len(outlier_data)} columns")
    if fi_data:
        insights.append(f"Top feature: '{fi_data[0]['feature']}' ({fi_data[0]['importance']*100:.1f}%) — drives most predictive power")

    strong_corrs = []
    if len(numeric_cols) >= 2:
        try:
            cdf = df[numeric_cols].dropna().corr()
            for i in range(len(cdf.columns)):
                for j in range(i+1, len(cdf.columns)):
                    if abs(cdf.iloc[i, j]) > 0.7:
                        strong_corrs.append(f"{cdf.columns[i]} ↔ {cdf.columns[j]}")
        except: pass
    if strong_corrs:
        insights.append(f"Strong correlations: {', '.join(strong_corrs[:3])}")

    if len(detective_issues) > 0:
        insights.append(f"AI Detective found {len([d for d in detective_issues if d['severity']=='critical'])} critical, "
                        f"{len([d for d in detective_issues if d['severity']=='warning'])} warning issues")
    if best_model:
        insights.append(f"Best model: {best_model} ({best_score*100 if best_score and best_score<=1 else best_score:.1f}%) — ready for deployment")

    # ─── GEOGRAPHIC DETECTION ──────────────────────────────────────────────
    geo_cols = [c for c in df.columns if any(k in c.lower() for k in ("country","state","city","region","zip","postal","lat","lon","longitude","latitude","address"))]
    geo_data = {"columns": geo_cols[:5], "count": len(geo_cols)} if geo_cols else None

    # ─── EXECUTIVE SUMMARY (plain-English, readable in 10 seconds) ─────────
    exec_summary_parts = []
    if total_records >= 10000:
        exec_summary_parts.append(f"This is a large dataset ({total_records:,} records) suitable for robust statistical analysis and ML modeling")
    elif total_records >= 1000:
        exec_summary_parts.append(f"Dataset is moderately sized ({total_records:,} records) — sufficient for analysis but more data would improve confidence")
    else:
        exec_summary_parts.append(f"Small dataset ({total_records:,} records) — results may have limited statistical significance")
    if dq_score >= 85:
        exec_summary_parts.append("data quality is excellent — you can trust the insights below")
    elif dq_score >= 70:
        exec_summary_parts.append("data quality is acceptable but some cleanup recommended before major decisions")
    else:
        exec_summary_parts.append(f"data quality is concerning ({dq_score}/100) — prioritize cleanup before relying on insights")
    if len(numeric_cols) >= 5:
        exec_summary_parts.append(f"{len(numeric_cols)} numeric features enable predictive modeling")
    if best_model and best_score:
        sv = best_score * 100 if best_score <= 1 else best_score
        exec_summary_parts.append(f"ML model achieves {sv:.1f}% accuracy with {best_model}")
    exec_summary = ". ".join(exec_summary_parts) + "."

    # ─── SWOT ANALYSIS ─────────────────────────────────────────────────────
    swot = {
        "strengths": [],
        "weaknesses": [],
        "opportunities": [],
        "threats": [],
    }
    # Strengths
    if completeness > 95:
        swot["strengths"].append(f"High data completeness ({completeness}%) — minimal missing values")
    if len(numeric_cols) >= 5:
        swot["strengths"].append(f"Rich feature set ({len(numeric_cols)} numeric columns) — enables deep analysis and modeling")
    if uniqueness > 95:
        swot["strengths"].append(f"Low duplication ({uniqueness}% unique) — data integrity is high")
    if total_records >= 10000:
        swot["strengths"].append(f"Large sample size ({total_records:,}) — statistically significant results")
    if date_cols:
        swot["strengths"].append(f"Temporal data available ({len(date_cols)} date columns) — enables trend analysis and forecasting")
    if best_model and best_score and (best_score > 0.85 if best_score <= 1 else best_score > 85):
        swot["strengths"].append(f"High-performing ML model ({best_model}: {best_score*100 if best_score<=1 else best_score:.1f}%)")

    # Weaknesses
    if missing_pct > 5:
        swot["weaknesses"].append(f"{missing_pct}% missing data — may bias results and reduce model accuracy")
    if duplicate_pct > 2:
        swot["weaknesses"].append(f"{duplicate_pct}% duplicate rows — data collection redundancy")
    if len(numeric_cols) < 3:
        swot["weaknesses"].append(f"Limited numeric features ({len(numeric_cols)}) — constrained analytical depth")
    if not date_cols:
        swot["weaknesses"].append("No temporal data — cannot perform time series analysis or forecasting")
    if total_records < 1000:
        swot["weaknesses"].append(f"Small dataset ({total_records} records) — results may lack statistical power")
    for col in numeric_cols[:3]:
        s = pd.to_numeric(df[col].dropna(), errors="coerce").dropna()
        if len(s) >= 5 and abs(s.skew()) > 1.5:
            swot["weaknesses"].append(f"'{col}' is skewed ({s.skew():.1f}) — may distort averages and models")

    # Opportunities
    if not best_model:
        swot["opportunities"].append("Train an ML model to unlock predictive capabilities and automated decision-making")
    if len(numeric_cols) >= 2:
        swot["opportunities"].append(f"Correlation analysis across {len(numeric_cols)} features may reveal hidden relationships")
    if date_cols:
        swot["opportunities"].append("Time series forecasting can predict future trends and enable proactive decisions")
    if categorical_cols:
        swot["opportunities"].append(f"Segment analysis by {len(categorical_cols)} categorical groups may reveal actionable customer/product segments")
    if outlier_data:
        swot["opportunities"].append(f"{sum(v['count'] for v in outlier_data.values())} outliers may represent high-value or anomalous cases worth investigating")
    if geo_data:
        swot["opportunities"].append(f"Geographic analysis possible with {geo_data['count']} location columns")

    # Threats
    if missing_pct > 10:
        swot["threats"].append(f"High missing data ({missing_pct}%) may lead to biased decisions if not addressed")
    if duplicate_pct > 5:
        swot["threats"].append(f"{duplicate_pct}% duplicates may inflate metrics and mask underlying trends")
    if outlier_data:
        worst_outlier = max(outlier_data.items(), key=lambda x: x[1]["pct"])
        if worst_outlier[1]["pct"] > 10:
            swot["threats"].append(f"'{worst_outlier[0]}' has {worst_outlier[1]['pct']} outliers — may skew aggregate metrics significantly")
    for col in numeric_cols[:3]:
        s = pd.to_numeric(df[col].dropna(), errors="coerce").dropna()
        if len(s) >= 5:
            cv = s.std() / abs(s.mean()) if s.mean() != 0 else 0
            if cv > 1.5:
                swot["threats"].append(f"High variability in '{col}' (CV={cv:.1f}) — predictions will have wide confidence intervals")
    if not best_model and target_column:
        swot["threats"].append("No trained model yet — decisions are based on historical analysis only, not predictions")

    # ─── RISK ASSESSMENT ──────────────────────────────────────────────────
    risk_items = []
    if missing_pct > 20:
        risk_items.append({"risk": "Decision bias from missing data", "likelihood": "high", "impact": "high",
            "score": 9, "mitigation": "Implement iterative imputation before analysis", "urgency": "immediate"})
    elif missing_pct > 5:
        risk_items.append({"risk": "Potential bias from missing data", "likelihood": "medium", "impact": "medium",
            "score": 6, "mitigation": "Impute with median/mode or use ML-based imputation", "urgency": "high"})
    if duplicate_pct > 5:
        risk_items.append({"risk": "Inflated metrics from duplicates", "likelihood": "high", "impact": "medium",
            "score": 6, "mitigation": "Deduplicate records before computing KPIs", "urgency": "immediate"})
    if total_records < 500:
        risk_items.append({"risk": "Low statistical power", "likelihood": "high", "impact": "high",
            "score": 9, "mitigation": "Collect more data or use bootstrapping for confidence intervals", "urgency": "medium"})
    for col in numeric_cols[:5]:
        s = pd.to_numeric(df[col].dropna(), errors="coerce").dropna()
        if len(s) >= 10:
            cv = s.std() / abs(s.mean()) if s.mean() != 0 else 0
            if cv > 2:
                risk_items.append({"risk": f"High variability in {col}", "likelihood": "medium", "impact": "medium",
                    "score": 6, "mitigation": f"Segment {col} analysis or use median-based metrics", "urgency": "high"})
    if outlier_data:
        total_out = sum(v["count"] for v in outlier_data.values())
        if total_out > total_records * 0.05:
            risk_items.append({"risk": "Outliers may distort aggregate metrics", "likelihood": "high", "impact": "medium",
                "score": 6, "mitigation": "Use robust statistics (median, IQR) instead of mean/std", "urgency": "high"})
    if not date_cols:
        risk_items.append({"risk": "No trend visibility — blind to temporal patterns", "likelihood": "medium", "impact": "medium",
            "score": 4, "mitigation": "Add timestamp collection to future records", "urgency": "low"})
    if detective_issues:
        crit_count = len([d for d in detective_issues if d["severity"] == "critical"])
        if crit_count > 0:
            risk_items.append({"risk": f"{crit_count} critical data quality issues", "likelihood": "high", "impact": "high",
                "score": 9, "mitigation": "Address detective issues before making decisions", "urgency": "immediate"})

    if not risk_items:
        risk_items.append({"risk": "No significant data risks detected", "likelihood": "low", "impact": "low",
            "score": 1, "mitigation": "Continue monitoring data collection", "urgency": "low"})

    risk_items = sorted(risk_items, key=lambda x: x["score"], reverse=True)[:8]

    # ─── DECISION POINTS (key questions with data-backed answers) ─────────
    decisions = []
    if best_model and best_score:
        sv = best_score * 100 if best_score <= 1 else best_score
        decisions.append({
            "question": f"Should we deploy the {best_model} model to production?",
            "recommendation": "yes" if sv >= 85 else ("pilot first" if sv >= 75 else "no — improve model first"),
            "rationale": f"Model achieves {sv:.1f}% accuracy {'which exceeds the 85% threshold for production deployment' if sv >= 85 else 'which needs improvement — consider feature engineering or hyperparameter tuning'}",
            "confidence": "high" if sv >= 90 else ("medium" if sv >= 75 else "low"),
        })
    if missing_pct > 5:
        decisions.append({
            "question": "Should we clean the data before analysis?",
            "recommendation": "yes — immediate priority",
            "rationale": f"{missing_pct}% missing values will bias any analysis. Impute or remove affected records first",
            "confidence": "high",
        })
    if duplicate_pct > 2:
        decisions.append({
            "question": "Should we deduplicate the dataset?",
            "recommendation": "yes — immediate",
            "rationale": f"{duplicate_pct}% duplicate rows inflate metrics and waste compute. Deduplicate before any aggregate analysis",
            "confidence": "high",
        })
    if len(categorical_cols) >= 2:
        decisions.append({
            "question": f"Should we segment analysis by {categorical_cols[0]}?",
            "recommendation": "yes — segment analysis recommended",
            "rationale": f"Segmenting by {categorical_cols[0]} ({df[categorical_cols[0]].nunique()} groups) may reveal actionable differences between groups",
            "confidence": "medium",
        })
    if date_cols:
        decisions.append({
            "question": "Should we forecast future trends?",
            "recommendation": "yes — if business decisions depend on trend direction",
            "rationale": f"Date column '{date_cols[0]}' is available. Forecasting can predict next-quarter metrics and inform proactive decisions",
            "confidence": "medium",
        })
    if not best_model and len(numeric_cols) >= 3:
        decisions.append({
            "question": "Should we train a predictive model?",
            "recommendation": "yes — data is suitable for ML",
            "rationale": f"{len(numeric_cols)} numeric features and {total_records:,} records provide sufficient signal for supervised learning. A model could automate predictions and uncover hidden patterns",
            "confidence": "medium",
        })
    if outlier_data:
        worst = max(outlier_data.items(), key=lambda x: x[1]["count"])
        decisions.append({
            "question": f"Should we investigate outliers in '{worst[0]}'?",
            "recommendation": "yes — investigate top outliers",
            "rationale": f"'{worst[0]}' has {worst[1]['count']} outliers ({worst[1]['pct']}% of data). These may represent errors, fraud, or high-value opportunities",
            "confidence": "medium",
        })

    # ─── TREND ANALYSIS (per-metric direction) ─────────────────────────────
    trends = []
    for col in numeric_cols[:8]:
        s = pd.to_numeric(df[col].dropna(), errors="coerce").dropna()
        if len(s) >= 10:
            trend = _compute_trend(s)
            top_val = s.max() if trend["direction"] == "up" else s.min() if trend["direction"] == "down" else s.mean()
            bottom_val = s.min() if trend["direction"] == "up" else s.max() if trend["direction"] == "down" else s.mean()
            trends.append({
                "metric": col,
                "direction": trend["direction"],
                "change_pct": trend["pct"],
                "label": trend["label"],
                "current": _format_number(s.iloc[-1] if len(s) > 0 else 0),
                "average": _format_number(s.mean()),
                "min": _format_number(s.min()),
                "max": _format_number(s.max()),
                "status": "improving" if trend["pct"] > 5 else ("declining" if trend["pct"] < -5 else "stable"),
            })

    # ─── ACTION ITEMS (prioritized, with impact + urgency) ────────────────
    action_items = []
    if duplicate_pct > 1:
        action_items.append({"action": f"Remove {df.duplicated().sum()} duplicate rows", "priority": 1, "impact": "high", "urgency": "immediate", "category": "data_cleaning"})
    if missing_pct > 5:
        action_items.append({"action": f"Impute {missing_pct}% missing values", "priority": 2, "impact": "high", "urgency": "high", "category": "data_cleaning"})
    if best_model:
        sv = best_score * 100 if best_score <= 1 else best_score
        action_items.append({"action": f"Deploy {best_model} model ({sv:.1f}% accuracy)", "priority": 3, "impact": "high", "urgency": "medium", "category": "deployment"})
    elif len(numeric_cols) >= 3:
        action_items.append({"action": "Train an ML model to enable predictions", "priority": 3, "impact": "high", "urgency": "medium", "category": "modeling"})
    if date_cols and numeric_cols:
        action_items.append({"action": f"Forecast future {numeric_cols[0]} trends using {date_cols[0]}", "priority": 4, "impact": "medium", "urgency": "medium", "category": "forecasting"})
    if categorical_cols:
        action_items.append({"action": f"Run segment analysis by {categorical_cols[0]}", "priority": 5, "impact": "medium", "urgency": "low", "category": "analysis"})
    for col in numeric_cols[:2]:
        s = pd.to_numeric(df[col].dropna(), errors="coerce").dropna()
        if len(s) >= 5 and abs(s.skew()) > 1.5:
            action_items.append({"action": f"Apply log transformation to {col} (skew={s.skew():.1f})", "priority": 6, "impact": "medium", "urgency": "low", "category": "preprocessing"})
    if outlier_data:
        worst = max(outlier_data.items(), key=lambda x: x[1]["count"])
        action_items.append({"action": f"Investigate {worst[1]['count']} outliers in {worst[0]}", "priority": 7, "impact": "medium", "urgency": "low", "category": "analysis"})

    # ─── FINAL ASSEMBLY ────────────────────────────────────────────────────
    if not rendered_charts:
        return ToolResult(tool="dashboard", status="error",
            summary="Could not generate any charts from this dataset", confidence=0)

    result = {
        "title": f"Executive Dashboard — {total_records:,} Records × {total_columns} Features",
        "kpis": kpis,
        "rendered_charts": rendered_charts,
        "sections": all_sections,
        "filters": [{"column": c, "type": "multiselect"} for c in categorical_cols[:6]],
        "layout": "grid", "columns": 2,
        "insights": insights,
        "ai_insights": ai_insights,
        "recommendations": recommendations,
        "detective_issues": detective_issues,
        "story_segments": story_segments,
        "outlier_data": outlier_data,
        "data_quality": {"overall": dq_score, "completeness": completeness, "consistency": consistency,
            "uniqueness": uniqueness, "validity": validity, "accuracy": accuracy},
        "ai_health_score": health_score,
        "feature_importance": fi_data,
        "ml_summary": {"target_column": target_column, "best_model": best_model, "best_score": best_score,
            "ml_available": bool(ml_context.get("ml_results"))} if any([target_column, best_model]) else None,
        "prediction_summary": {"has_prediction": target_column in df.columns if target_column else False},
        "geo_data": geo_data,
        "total_charts": len(rendered_charts),
        "total_kpis": len(kpis),
        "dataset_summary": {
            "records": total_records, "columns": total_columns,
            "numeric": len(numeric_cols), "categorical": len(categorical_cols),
            "dates": len(date_cols), "missing_pct": missing_pct, "duplicate_pct": duplicate_pct,
            "data_quality_score": dq_score, "health_score": health_score,
        },
    }

    return ToolResult(
        tool="dashboard",
        status="success",
        summary=f"Executive Dashboard: {total_records:,} records · {total_columns} features · {len(kpis)} KPIs · {len(rendered_charts)} charts · {len(all_sections)} sections",
        what_changed=[
            f"Generated {len(kpis)} KPI cards with data quality, health score, and ML metrics",
            f"Rendered {len(rendered_charts)} professional charts across {len(all_sections)} sections",
            f"Sections: {', '.join(s['title'] for s in all_sections)}",
            f"AI Detective found {len(detective_issues)} issues | AI generated {len(ai_insights)} insights | {len(recommendations)} recommendations",
            f"Story dashboard with {len(story_segments)} narrative segments",
        ],
        why="Industry-grade executive dashboards consolidate all analytical perspectives — distributions, quality, correlations, ML, predictions, and narrative — into a single presentation-ready view",
        expected_impact="Eliminates ad-hoc analysis by providing a comprehensive, curated view of the entire dataset, reducing time-to-insight by 80%",
        confidence=0.95,
        data=result,
    )


async def timeseries_tool(dataset_id: int, df: pd.DataFrame, params: dict = None) -> ToolResult:
    date_col = (params or {}).get("date_column", "")
    value_col = (params or {}).get("value_column", "")
    periods = (params or {}).get("periods", 12)

    if not date_col or not value_col:
        date_cols = df.select_dtypes(include=["datetime64[ns]"]).columns.tolist()
        if not date_cols:
            for col in df.select_dtypes(include=["object"]).columns:
                try:
                    parsed = pd.to_datetime(df[col], errors="coerce", infer_datetime_format=True)
                    if parsed.notna().sum() > len(df) * 0.5:
                        date_cols.append(col)
                except Exception:
                    pass

        num_cols = df.select_dtypes(include=["number"]).columns.tolist()
        id_cols = get_id_columns(df) if hasattr(df, 'columns') else []
        num_cols = [c for c in num_cols if c not in id_cols]

        if not date_cols:
            return ToolResult(
                tool="timeseries",
                status="error",
                summary="No date columns detected in the dataset",
                why="Time series analysis requires a date/time column",
                confidence=0,
            )

        if not date_col:
            date_col = date_cols[0]
        if not value_col and num_cols:
            value_col = num_cols[0]

    if not value_col:
        return ToolResult(
            tool="timeseries",
            status="error",
            summary="No numeric value column found for time series analysis",
            confidence=0,
        )

    try:
        series = df.set_index(date_col)[value_col].dropna()
        series = pd.to_numeric(series, errors="coerce").dropna()

        if len(series) < 10:
            return ToolResult(
                tool="timeseries",
                status="error",
                summary=f"Need at least 10 data points, got {len(series)}",
                confidence=0,
            )

        mean_val = float(series.mean())
        std_val = float(series.std())
        trend = "increasing" if series.iloc[-1] > series.iloc[0] else "decreasing"
        change_pct = round((series.iloc[-1] - series.iloc[0]) / max(abs(series.iloc[0]), 1e-10) * 100, 1)

        forecast_values = []
        if trend == "increasing":
            step = (series.iloc[-1] - series.iloc[0]) / len(series)
            for i in range(1, periods + 1):
                forecast_values.append(round(float(series.iloc[-1] + step * i), 2))
        else:
            step = (series.iloc[0] - series.iloc[-1]) / len(series)
            for i in range(1, periods + 1):
                forecast_values.append(round(float(series.iloc[-1] - step * i), 2))

        what_changed = [
            f"Analyzed {len(series)} data points for '{value_col}' over '{date_col}'",
            f"Detected {trend} trend ({change_pct}% overall change)",
            f"Generated {periods}-period forecast",
        ]

        suggestions = []
        if abs(change_pct) > 20:
            suggestions.append(f"Significant trend detected ({change_pct}% change) — investigate drivers")
        suggestions.append("Consider seasonality and external factors when interpreting forecast")

        return ToolResult(
            tool="timeseries",
            status="success",
            summary=f"Time series analysis of '{value_col}': {trend} trend ({change_pct}% change). Forecast generated for {periods} periods.",
            what_changed=what_changed,
            why="Time series analysis reveals trends, patterns, and future projections.",
            expected_impact=f"Forecasts suggest {value_col} will {'increase' if trend == 'increasing' else 'decrease'} over the next {periods} periods",
            confidence=0.75,
            suggestions=suggestions,
            data={
                "date_column": date_col,
                "value_column": value_col,
                "trend": trend,
                "change_pct": change_pct,
                "mean": mean_val,
                "std": std_val,
                "forecast": forecast_values,
                "periods": periods,
            },
        )
    except Exception as e:
        return ToolResult(
            tool="timeseries",
            status="error",
            summary=f"Time series analysis failed: {str(e)}",
            confidence=0,
        )


async def edit_tool(dataset_id: int, df: pd.DataFrame, params: dict = None) -> ToolResult:
    instruction = (params or {}).get("instruction", "")
    if not instruction:
        return ToolResult(
            tool="edit",
            status="error",
            summary="No editing instruction provided",
            confidence=0,
        )

    from app.llm.factory import get_llm_provider
    from app.core.sandbox import sanitize_code, execute_in_subprocess

    llm = get_llm_provider()

    schema = {
        "columns": list(df.columns),
        "dtypes": {c: str(t) for c, t in df.dtypes.items()},
        "shape": list(df.shape),
        "sample": df.head(3).to_dict(orient="records"),
    }

    prompt = f"""You are a pandas expert. Generate Python code to edit the dataframe based on the user's instruction.

## Current Dataset Schema
{json.dumps(schema, default=str)}

## User Instruction
{instruction}

Generate pandas code that:
1. Makes the requested change
2. Stores the result in a variable called `result`
3. Do NOT modify the original `df` — work on a copy

Return JSON with:
- "code": The pandas code to execute
- "description": What the code does

Return ONLY valid JSON."""

    try:
        response = await llm.chat([
            {"role": "system", "content": "You are an expert pandas programmer. Always respond with valid JSON only."},
            {"role": "user", "content": prompt},
        ])

        from app.services.ml import _parse_llm_json
        parsed = _parse_llm_json(response)

        if not parsed or "code" not in parsed:
            raise ValueError("Could not generate edit code")

        code = parsed["code"]
        description = parsed.get("description", instruction)

        return ToolResult(
            tool="edit",
            status="success",
            summary=f"Generated edit: {description}",
            what_changed=[f"Code generated: {code[:100]}..."],
            why=f"User requested: {instruction}",
            expected_impact="Dataset will be modified as requested",
            confidence=0.75,
            data={"code": code, "description": description, "instruction": instruction},
        )
    except Exception as e:
        return ToolResult(
            tool="edit",
            status="error",
            summary=f"Edit generation failed: {str(e)}",
            confidence=0,
        )


async def deploy_tool(dataset_id: int, df: pd.DataFrame, params: dict = None) -> ToolResult:
    target = (params or {}).get("target_column", "")
    fmt = (params or {}).get("format", "rest")

    # Auto-detect target from previous ML results if not provided
    if not target:
        try:
            from app.db.models import Dataset, ToolInvocation
            from sqlalchemy import select
            from app.api.deps import AsyncSessionLocal

            async with AsyncSessionLocal() as session:
                result = await session.execute(
                    select(ToolInvocation)
                    .where(ToolInvocation.dataset_id == dataset_id)
                    .where(ToolInvocation.tool_name == "ml")
                    .where(ToolInvocation.status == "success")
                    .order_by(ToolInvocation.started_at.desc())
                    .limit(1)
                )
                inv = result.scalar_one_or_none()
                if inv and inv.result:
                    import json
                    ml_data = json.loads(inv.result)
                    target = ml_data.get("target_column", "")
        except Exception:
            pass

    # If still no target, deploy as a data API
    is_data_api = not target
    if is_data_api:
        target = df.columns[0] if len(df.columns) > 0 else ""

    from app.llm.factory import get_llm_provider

    llm = get_llm_provider()

    schema = {
        "columns": list(df.columns),
        "dtypes": {c: str(t) for c, t in df.dtypes.items()},
        "target": target,
        "shape": list(df.shape),
    }

    format_instructions = {
        "rest": "Generate a FastAPI REST API with /predict endpoint" if not is_data_api else "Generate a FastAPI REST API with /data and /stats endpoints to serve the dataset",
        "docker": "Generate a Dockerfile + app.py for containerized deployment",
        "streamlit": "Generate a Streamlit app for interactive predictions" if not is_data_api else "Generate a Streamlit app for data exploration",
        "gradio": "Generate a Gradio interface for easy sharing",
        "onnx": "Generate code to export the model to ONNX format",
        "batch": "Generate a batch prediction script that processes CSV files",
    }

    if is_data_api:
        task_desc = f"""Generate a FastAPI REST API for serving this dataset. Return ONLY a JSON object.

## Dataset: {schema['shape'][0]} rows, {schema['shape'][1]} columns
## Columns: {', '.join(schema['columns'][:15])}

Return JSON with exactly these keys:
- "code": A STRING containing the complete Python code (use \\\\n for newlines)
- "requirements": A LIST of pip package names
- "filename": A STRING like "app.py"
- "instructions": A STRING with run instructions

IMPORTANT: "code" must be a STRING with actual Python code, NOT a nested object.

Example format:
{{"code": "from fastapi import FastAPI\\napp = FastAPI()\\n\\n@app.get('/data')\\ndef get_data():\\n    return {{'hello': 'world'}}", "requirements": ["fastapi", "uvicorn"], "filename": "app.py", "instructions": "uvicorn app:app"}}

Return ONLY valid JSON, no markdown."""
    else:
        task_desc = f"""Generate a {fmt} deployment for an ML model predicting '{target}'. Return ONLY a JSON object.

## Dataset: {schema['shape'][0]} rows, {schema['shape'][1]} columns
## Columns: {', '.join(schema['columns'][:15])}
## Target: {target}

Return JSON with exactly these keys:
- "code": A STRING containing the complete Python code (use \\\\n for newlines)
- "requirements": A LIST of pip package names
- "filename": A STRING like "app.py"
- "instructions": A STRING with run instructions

IMPORTANT: "code" must be a STRING with actual Python code, NOT a nested object.

Example format:
{{"code": "from fastapi import FastAPI\\napp = FastAPI()\\n\\n@app.get('/predict')\\ndef predict():\\n    return {{'prediction': 42}}", "requirements": ["fastapi", "uvicorn", "scikit-learn"], "filename": "app.py", "instructions": "uvicorn app:app"}}

Return ONLY valid JSON, no markdown."""

    try:
        response = await llm.chat([
            {"role": "system", "content": "You are an expert ML engineer. Always respond with valid JSON only. Generate complete, runnable code."},
            {"role": "user", "content": task_desc},
        ])

        from app.services.ml import _parse_llm_json
        parsed = _parse_llm_json(response)

        if not parsed or "code" not in parsed:
            raise ValueError("LLM did not return valid code")

        # Ensure code is a string
        code = parsed.get("code", "")
        if isinstance(code, dict):
            # Try to flatten nested dict structure into code
            try:
                lines = []
                for k, v in code.items():
                    if isinstance(v, str):
                        lines.append(k if k.endswith(":") or k.startswith(("@", "import", "from", "def", "class")) else f"{k} {v}")
                    elif isinstance(v, dict):
                        lines.append(k)
                        for kk, vv in v.items():
                            if isinstance(vv, str):
                                lines.append(f"    {kk}: {vv}")
                            elif isinstance(vv, dict):
                                for kkk, vvv in vv.items():
                                    lines.append(f"        {kkk}: {vvv}" if isinstance(vvv, str) else f"        {kkk} {json.dumps(vvv)}")
                            else:
                                lines.append(f"    {kk} {json.dumps(vv)}")
                    else:
                        lines.append(f"{k} {json.dumps(v)}")
                code = "\n".join(lines)
            except Exception:
                code = json.dumps(code, indent=2)
        parsed["code"] = str(code)

        # Ensure requirements is a list
        reqs = parsed.get("requirements", [])
        if isinstance(reqs, str):
            reqs = [r.strip() for r in reqs.split(",") if r.strip()]
        parsed["requirements"] = reqs

        deploy_type = "Data API" if is_data_api else f"ML Model ({target})"

        return ToolResult(
            tool="deploy",
            status="success",
            summary=f"Generated {fmt.upper()} deployment code ({deploy_type})",
            what_changed=[
                f"Created {parsed.get('filename', 'app')}",
                f"Generated {len(code.splitlines())} lines of code",
                f"Deploy type: {deploy_type}",
            ],
            why=f"Deployment format: {format_instructions.get(fmt, fmt)}",
            expected_impact="Can be deployed to production",
            confidence=0.8,
            data=parsed,
        )
    except Exception as e:
        # Fallback: generate template-based code
        cols = list(df.columns[:10])
        if is_data_api:
            code = f'''from fastapi import FastAPI
import pandas as pd

app = FastAPI()
df = pd.read_csv("{dataset_id}.csv")

@app.get("/data")
def get_data():
    return df.head(100).to_dict(orient="records")

@app.get("/stats")
def get_stats():
    return df.describe().to_dict()

@app.get("/columns")
def get_columns():
    return {{"columns": {cols}, "shape": list(df.shape)}}

@app.get("/data/{{column}}/{{value}}")
def filter_data(column: str, value: str):
    filtered = df[df[column].astype(str) == value]
    return filtered.to_dict(orient="records")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
'''
            parsed = {"code": code, "requirements": ["fastapi", "uvicorn", "pandas"], "filename": "app.py", "instructions": "uvicorn app:app --reload"}
        else:
            code = f'''from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd

app = FastAPI()

class PredictionInput(BaseModel):
    {chr(10).join([f"    {c}: float" for c in cols if df[c].dtype in ["int64", "float64"]][:5])}

@app.get("/health")
def health():
    return {{"status": "ok", "target": "{target}"}}

@app.post("/predict")
def predict(input: PredictionInput):
    return {{"prediction": 0, "note": "Replace with trained model inference"}}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
'''
            parsed = {"code": code, "requirements": ["fastapi", "uvicorn", "pandas", "scikit-learn"], "filename": "app.py", "instructions": "uvicorn app:app --reload"}

        deploy_type = "Data API" if is_data_api else f"ML Model ({target})"
        return ToolResult(
            tool="deploy",
            status="success",
            summary=f"Generated {fmt.upper()} deployment code ({deploy_type})",
            what_changed=[
                f"Created {parsed['filename']}",
                f"Generated {len(code.splitlines())} lines of code",
                f"Deploy type: {deploy_type}",
                "Note: Generated from template (LLM unavailable)",
            ],
            why=f"Deployment format: {format_instructions.get(fmt, fmt)}",
            expected_impact="Can be deployed to production",
            confidence=0.7,
            data=parsed,
        )
