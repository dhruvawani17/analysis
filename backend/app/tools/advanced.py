import json
import pandas as pd
import numpy as np
from app.copilot.tools import ToolResult


async def dashboard_tool(dataset_id: int, df: pd.DataFrame, params: dict = None) -> ToolResult:
    import plotly.express as px
    import plotly.graph_objects as go
    from app.llm.factory import get_llm_provider
    from app.services.eda import run_eda

    llm = get_llm_provider()
    eda_result = run_eda(df)

    numeric_cols = eda_result.get("numeric_columns", [])
    categorical_cols = eda_result.get("categorical_columns", [])
    date_cols = eda_result.get("date_columns", [])

    profile = {
        "shape": list(df.shape),
        "columns": list(df.columns),
        "dtypes": {c: str(t) for c, t in df.dtypes.items()},
        "numeric_columns": numeric_cols,
        "categorical_columns": categorical_cols,
        "date_columns": date_cols,
        "stats": {k: {kk: vv for kk, vv in v.items() if kk in ("mean", "min", "max", "median")} for k, v in eda_result.get("stats", {}).items()},
    }

    kpi_columns = (params or {}).get("kpi_columns", [])

    prompt = f"""You are a dashboard designer. Generate an interactive dashboard configuration for this dataset.

## Dataset Profile
{json.dumps(profile, default=str)}

## KPI Columns Requested: {kpi_columns}

Generate a dashboard with KPIs, charts, and filters. Return JSON with:
1. "title": Dashboard title
2. "kpis": Array of KPI cards, each with:
   - "name": KPI name
   - "value": Computed value (use actual data statistics)
   - "trend": Optional trend description
   - "icon": Icon name (dollar-sign, users, trending-up, bar-chart, etc.)
   - "color": CSS color class (emerald, indigo, violet, amber, etc.)
3. "charts": Array of chart configs, each with:
   - "type": "line"|"bar"|"pie"|"scatter"|"heatmap"|"histogram"|"box"
   - "title": Chart title
   - "x": Column name for x-axis (or null for single-series)
   - "y": Column name for y-axis (or null for single-series)
   - "columns": Array of column names (for multi-series or heatmap)
   - "description": Brief chart description
4. "filters": Array of filter configs, each with:
   - "column": Column name
   - "type": "daterange"|"range"|"multiselect"|"search"
5. "layout": "grid"|"tabs"

Return ONLY valid JSON."""

    try:
        response = await llm.chat([
            {"role": "system", "content": "You are an expert dashboard designer. Always respond with valid JSON only. Use actual data statistics for KPI values."},
            {"role": "user", "content": prompt},
        ])

        from app.services.ml import _parse_llm_json
        parsed = _parse_llm_json(response)

        if not parsed:
            raise ValueError("Could not parse LLM response")

        # Generate actual Plotly charts from config
        chart_configs = parsed.get("charts", [])
        rendered_charts = []

        for cfg in chart_configs:
            try:
                chart_type = cfg.get("type", "bar")
                title = cfg.get("title", "")
                x_col = cfg.get("x")
                y_col = cfg.get("y")
                cols = cfg.get("columns", [])

                fig = None

                if chart_type == "bar" and x_col and y_col and x_col in df.columns and y_col in df.columns:
                    agg = df.groupby(x_col)[y_col].mean().sort_values(ascending=False).head(10)
                    fig = px.bar(x=agg.index.astype(str), y=agg.values, title=title, labels={"x": x_col, "y": y_col})

                elif chart_type == "bar" and x_col and x_col in df.columns:
                    vc = df[x_col].value_counts().head(10)
                    fig = px.bar(x=vc.index.astype(str), y=vc.values, title=title, labels={"x": x_col, "y": "Count"})

                elif chart_type == "line" and x_col and y_col and x_col in df.columns and y_col in df.columns:
                    temp = df[[x_col, y_col]].dropna().sort_values(x_col)
                    fig = px.line(temp, x=x_col, y=y_col, title=title)

                elif chart_type == "pie" and x_col and x_col in df.columns:
                    vc = df[x_col].value_counts().head(8)
                    fig = px.pie(values=vc.values, names=vc.index.astype(str), title=title)

                elif chart_type == "scatter" and x_col and y_col and x_col in df.columns and y_col in df.columns:
                    fig = px.scatter(df, x=x_col, y=y_col, title=title, opacity=0.6)

                elif chart_type == "histogram" and x_col and x_col in df.columns:
                    fig = px.histogram(df, x=x_col, title=title, nbins=25)

                elif chart_type == "box" and x_col and x_col in df.columns:
                    fig = px.box(df, y=x_col, title=title)

                elif chart_type == "heatmap" and len(cols) >= 2:
                    valid_cols = [c for c in cols if c in df.columns and df[c].dtype in ("int64", "float64")]
                    if len(valid_cols) >= 2:
                        corr = df[valid_cols].corr()
                        fig = px.imshow(corr, text_auto=".2f", color_continuous_scale="RdBu_r", title=title)

                if fig is not None:
                    fig.update_layout(margin=dict(l=20, r=20, t=40, b=20), height=280)
                    chart_data = json.loads(fig.to_json())
                    rendered_charts.append({
                        "type": chart_type,
                        "title": title,
                        "x": x_col,
                        "y": y_col,
                        "description": cfg.get("description", ""),
                        "plotly": chart_data,
                    })
            except Exception:
                continue

        parsed["rendered_charts"] = rendered_charts

        num_kpis = len(parsed.get("kpis", []))
        num_charts = len(rendered_charts)

        return ToolResult(
            tool="dashboard",
            status="success",
            summary=f"Generated dashboard: {parsed.get('title', 'Untitled')} with {num_kpis} KPIs and {num_charts} charts",
            what_changed=[
                f"Created {num_kpis} KPI cards with real data statistics",
                f"Rendered {num_charts} interactive Plotly charts",
                f"Added {len(parsed.get('filters', []))} data filters",
            ],
            why="Dashboards provide at-a-glance understanding of key metrics and trends.",
            expected_impact="Enables real-time monitoring of critical business metrics",
            confidence=0.85,
            data=parsed,
        )
    except Exception as e:
        return ToolResult(
            tool="dashboard",
            status="error",
            summary=f"Dashboard generation failed: {str(e)}",
            confidence=0,
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

    if not target:
        return ToolResult(
            tool="deploy",
            status="error",
            summary="Target column is required for deployment",
            confidence=0,
        )

    from app.llm.factory import get_llm_provider

    llm = get_llm_provider()

    schema = {
        "columns": list(df.columns),
        "dtypes": {c: str(t) for c, t in df.dtypes.items()},
        "target": target,
        "shape": list(df.shape),
    }

    format_instructions = {
        "rest": "Generate a FastAPI REST API with /predict endpoint",
        "docker": "Generate a Dockerfile + app.py for containerized deployment",
        "streamlit": "Generate a Streamlit app for interactive predictions",
        "gradio": "Generate a Gradio interface for easy sharing",
        "onnx": "Generate code to export the model to ONNX format",
        "batch": "Generate a batch prediction script that processes CSV files",
    }

    prompt = f"""You are an ML engineer. Generate deployment code for a trained model.

## Dataset Schema
{json.dumps(schema, default=str)}

## Deployment Format: {fmt}
## Instructions: {format_instructions.get(fmt, '')}

Return JSON with:
- "code": The complete deployment code
- "requirements": Python requirements for this deployment
- "filename": Suggested filename
- "instructions": How to run the deployment

Return ONLY valid JSON."""

    try:
        response = await llm.chat([
            {"role": "system", "content": "You are an expert ML engineer. Always respond with valid JSON only. Generate complete, runnable code."},
            {"role": "user", "content": prompt},
        ])

        from app.services.ml import _parse_llm_json
        parsed = _parse_llm_json(response)

        if not parsed or "code" not in parsed:
            raise ValueError("Could not generate deployment code")

        return ToolResult(
            tool="deploy",
            status="success",
            summary=f"Generated {fmt.upper()} deployment code",
            what_changed=[
                f"Created {parsed.get('filename', 'app')}",
                f"Generated {len(parsed.get('code', '').splitlines())} lines of code",
            ],
            why=f"Deployment format: {format_instructions.get(fmt, fmt)}",
            expected_impact="Model can be deployed to production",
            confidence=0.8,
            data=parsed,
        )
    except Exception as e:
        return ToolResult(
            tool="deploy",
            status="error",
            summary=f"Deployment generation failed: {str(e)}",
            confidence=0,
        )
