import json
import pandas as pd
from app.core.storage import load_dataframe
from app.services.cleaning import clean_dataset
from app.services.eda import run_eda
from app.services.utils import get_id_columns
from app.copilot.tools import ToolResult


async def cleaning_tool(dataset_id: int, df: pd.DataFrame, params: dict = None) -> ToolResult:
    missing_before = int(df.isnull().sum().sum())
    dupes_before = int(df.duplicated().sum())
    rows_before = len(df)

    df_clean, report = clean_dataset(df)

    what_changed = []
    if report.get("column_renames"):
        what_changed.append(f"Renamed {len(report['column_renames'])} columns")
    if report.get("missing_fixed", 0) > 0:
        what_changed.append(f"Filled {report['missing_fixed']} missing values")
    if report.get("duplicates_removed", 0) > 0:
        what_changed.append(f"Removed {report['duplicates_removed']} duplicate rows")
    if report.get("date_columns_standardized"):
        what_changed.append(f"Standardized {len(report['date_columns_standardized'])} date columns")
    if report.get("outliers_detected", 0) > 0:
        what_changed.append(f"Detected {report['outliers_detected']} outliers")

    if not what_changed:
        what_changed.append("No issues found — data is already clean")

    quality_before = round((1 - missing_before / max(rows_before * len(df.columns), 1)) * 100, 1)
    quality_after = round((1 - int(df_clean.isnull().sum().sum()) / max(len(df_clean) * len(df_clean.columns), 1)) * 100, 1)

    return ToolResult(
        tool="cleaning",
        status="success",
        summary=f"Cleaned {rows_before} rows: {', '.join(what_changed)}",
        what_changed=what_changed,
        why="Missing values prevent model training. Duplicates bias results. Standardized types enable proper analysis.",
        expected_impact=f"Data quality improved from {quality_before}% to {quality_after}%",
        confidence=0.95,
        metrics_before={"missing": missing_before, "duplicates": dupes_before, "quality_pct": quality_before},
        metrics_after={"missing": int(df_clean.isnull().sum().sum()), "duplicates": 0, "quality_pct": quality_after},
        suggestions=["Next: Run EDA to explore data distributions and correlations"],
        data=report,
    )


async def eda_tool(dataset_id: int, df: pd.DataFrame, params: dict = None) -> ToolResult:
    eda_result = run_eda(df)

    num_numeric = len(eda_result.get("numeric_columns", []))
    num_cat = len(eda_result.get("categorical_columns", []))
    num_missing = len(eda_result.get("missing_summary", {}))
    num_insights = len(eda_result.get("insights", []))

    what_changed = [
        f"Computed statistics for {num_numeric} numeric columns",
        f"Profiled {num_cat} categorical columns",
    ]
    if num_missing > 0:
        what_changed.append(f"Identified {num_missing} columns with missing values")
    what_changed.append(f"Generated {num_insights} data insights")

    suggestions = []
    if num_numeric > 0:
        suggestions.append("Train ML models to find predictive patterns")
    if num_cat > 0:
        suggestions.append("Explore categorical relationships with cross-tabulations")
    if eda_result.get("charts", {}).get("correlation"):
        suggestions.append("Check the correlation matrix for strong relationships")

    return ToolResult(
        tool="eda",
        status="success",
        summary=f"EDA complete: {num_numeric} numeric, {num_cat} categorical columns profiled with {num_insights} insights",
        what_changed=what_changed,
        why="Understanding data distributions, correlations, and patterns is essential before modeling.",
        expected_impact="Identifies key features, data quality issues, and modeling opportunities",
        confidence=0.9,
        suggestions=suggestions,
        data=eda_result,
        charts=eda_result.get("charts", {}),
    )


async def summary_tool(dataset_id: int, df: pd.DataFrame, params: dict = None) -> ToolResult:
    from app.services.summary import generate_ai_summary
    from app.services.eda import run_eda

    eda_result = run_eda(df)
    summary = await generate_ai_summary(eda_result)

    return ToolResult(
        tool="summary",
        status="success",
        summary=summary or "Summary generated",
        what_changed=["Generated AI-powered natural language summary of the dataset"],
        why="A human-readable summary helps stakeholders quickly understand the data without reading statistics.",
        expected_impact="Provides accessible overview for non-technical stakeholders",
        confidence=0.85,
        data={"ai_summary": summary},
    )


async def qa_tool(dataset_id: int, df: pd.DataFrame, params: dict = None) -> ToolResult:
    question = (params or {}).get("question", "")
    if not question:
        return ToolResult(
            tool="qa",
            status="error",
            summary="No question provided",
            why="A question is required for Q&A",
        )

    from app.services.qa import ask_question
    from app.core.storage import load_dataframe
    import tempfile, os

    source_path = load_dataframe.__module__

    result = await ask_question(df_path="", question=question)

    return ToolResult(
        tool="qa",
        status="success" if result.get("output", {}).get("type") != "error" else "error",
        summary=result.get("output", {}).get("value", "") if result.get("output", {}).get("type") == "scalar" else "Query executed",
        what_changed=[f"Answered: {question}"],
        why="Natural language Q&A makes data accessible to everyone.",
        confidence=0.8,
        data=result,
        charts={"answer_chart": result.get("chart")} if result.get("chart") else {},
    )
