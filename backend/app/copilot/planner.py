import json
import pandas as pd
from dataclasses import dataclass, field
from typing import Any


@dataclass
class PlanStep:
    tool: str
    reason: str
    time_estimate: int
    params: dict = field(default_factory=dict)
    status: str = "pending"


@dataclass
class AnalysisPlan:
    dataset_summary: str
    issues: list[dict]
    opportunities: list[dict]
    steps: list[PlanStep]
    total_time_estimate: int = 0

    def __post_init__(self):
        self.total_time_estimate = sum(s.time_estimate for s in self.steps)


def detect_issues(df) -> list[dict]:
    issues = []

    missing = df.isnull().sum()
    cols_with_missing = missing[missing > 0]
    if len(cols_with_missing) > 0:
        total_missing = int(cols_with_missing.sum())
        pct = round(total_missing / (len(df) * len(df.columns)) * 100, 1)
        issues.append({
            "type": "missing_values",
            "severity": "high" if pct > 10 else "medium",
            "message": f"{total_missing} missing values across {len(cols_with_missing)} columns ({pct}% of all data)",
            "columns": cols_with_missing.index.tolist()[:5],
        })

    dupes = df.duplicated().sum()
    if dupes > 0:
        issues.append({
            "type": "duplicates",
            "severity": "medium",
            "message": f"{int(dupes)} duplicate rows found",
            "count": int(dupes),
        })

    import numpy as np
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    outlier_cols = []
    for col in numeric_cols:
        q1 = df[col].quantile(0.25)
        q3 = df[col].quantile(0.75)
        iqr = q3 - q1
        outliers = df[(df[col] < q1 - 1.5 * iqr) | (df[col] > q3 + 1.5 * iqr)].shape[0]
        if outliers > 0:
            outlier_cols.append(col)
    if outlier_cols:
        issues.append({
            "type": "outliers",
            "severity": "low",
            "message": f"Outliers detected in {len(outlier_cols)} columns",
            "columns": outlier_cols[:5],
        })

    high_card = []
    for col in df.select_dtypes(include=["object", "category"]).columns:
        if df[col].nunique() > 50:
            high_card.append(col)
    if high_card:
        issues.append({
            "type": "high_cardinality",
            "severity": "medium",
            "message": f"{len(high_card)} columns have high cardinality (>50 unique values)",
            "columns": high_card[:5],
        })

    return issues


def detect_opportunities(df) -> list[dict]:
    opportunities = []

    num_cols = df.select_dtypes(include=["number"]).columns.tolist()
    cat_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()

    if len(num_cols) >= 2:
        opportunities.append({
            "type": "ml_classification",
            "message": f"{len(num_cols)} numeric columns available for ML modeling",
            "columns": num_cols[:5],
        })

    if len(cat_cols) > 0 and len(num_cols) > 0:
        opportunities.append({
            "type": "categorical_analysis",
            "message": f"{len(cat_cols)} categorical columns can be analyzed against numeric features",
        })

    date_cols = df.select_dtypes(include=["datetime64[ns]"]).columns.tolist()
    if not date_cols:
        for col in df.select_dtypes(include=["object"]).columns:
            try:
                parsed = pd.to_datetime(df[col], errors="coerce", infer_datetime_format=True)
                if parsed.notna().sum() > len(df) * 0.5:
                    date_cols.append(col)
            except Exception:
                pass

    if date_cols:
        opportunities.append({
            "type": "time_series",
            "message": f"Date column(s) detected — time series analysis available",
            "columns": date_cols,
        })

    if len(num_cols) >= 3:
        opportunities.append({
            "type": "correlations",
            "message": f"{len(num_cols)} numeric columns — correlation analysis available",
        })

    if len(df) >= 100:
        opportunities.append({
            "type": "large_dataset",
            "message": f"{len(df)} rows — sufficient for robust ML training",
        })

    return opportunities


class AgentPlanner:
    async def analyze_and_plan(self, df, dataset_name: str = "") -> AnalysisPlan:
        import pandas as pd

        issues = detect_issues(df)
        opportunities = detect_opportunities(df)

        steps = []

        has_missing = any(i["type"] == "missing_values" for i in issues)
        has_dupes = any(i["type"] == "duplicates" for i in issues)

        if has_missing or has_dupes:
            reason_parts = []
            if has_missing:
                mi = next(i for i in issues if i["type"] == "missing_values")
                reason_parts.append(mi["message"])
            if has_dupes:
                di = next(i for i in issues if i["type"] == "duplicates")
                reason_parts.append(di["message"])
            steps.append(PlanStep(
                tool="cleaning",
                reason=f"Fix data quality issues: {'; '.join(reason_parts)}",
                time_estimate=2,
            ))

        steps.append(PlanStep(
            tool="eda",
            reason="Explore data distributions, correlations, and patterns",
            time_estimate=5,
        ))

        steps.append(PlanStep(
            tool="summary",
            reason="Generate AI-powered summary of findings",
            time_estimate=3,
        ))

        ts_opps = [o for o in opportunities if o["type"] == "time_series"]
        if ts_opps:
            date_col = ts_opps[0].get("columns", [""])[0]
            steps.append(PlanStep(
                tool="timeseries",
                reason="Analyze time-based patterns and generate forecast",
                time_estimate=10,
                params={"date_column": date_col},
            ))

        ml_opps = [o for o in opportunities if o["type"] == "ml_classification"]
        if ml_opps:
            num_cols = ml_opps[0].get("columns", [])
            if num_cols:
                steps.append(PlanStep(
                    tool="ml",
                    reason=f"Train and compare ML models on {len(num_cols)} features",
                    time_estimate=15,
                ))

        steps.append(PlanStep(
            tool="dashboard",
            reason="Generate interactive dashboard with key metrics",
            time_estimate=8,
        ))

        steps.append(PlanStep(
            tool="story",
            reason="Create narrative report for stakeholders",
            time_estimate=10,
        ))

        summary_parts = []
        if issues:
            summary_parts.append(f"{len(issues)} data quality issues found")
        if opportunities:
            summary_parts.append(f"{len(opportunities)} analysis opportunities identified")
        summary = f"Dataset '{dataset_name}': {', '.join(summary_parts)}" if summary_parts else f"Dataset '{dataset_name}': Ready for analysis"

        return AnalysisPlan(
            dataset_summary=summary,
            issues=issues,
            opportunities=opportunities,
            steps=steps,
        )
