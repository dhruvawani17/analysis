import json
import pandas as pd
from app.copilot.tools import ToolResult


async def business_tool(dataset_id: int, df: pd.DataFrame, params: dict = None) -> ToolResult:
    from app.llm.factory import get_llm_provider

    llm = get_llm_provider()

    profile = {
        "shape": list(df.shape),
        "columns": list(df.columns),
        "dtypes": {c: str(t) for c, t in df.dtypes.items()},
        "missing": {c: int(v) for c, v in df.isnull().sum().items() if v > 0},
        "numeric_summary": {},
        "categorical_summary": {},
    }

    for col in df.select_dtypes(include=["number"]).columns:
        s = df[col].dropna()
        profile["numeric_summary"][col] = {
            "mean": round(float(s.mean()), 2) if len(s) > 0 else None,
            "std": round(float(s.std()), 2) if len(s) > 1 else None,
            "min": round(float(s.min()), 2) if len(s) > 0 else None,
            "max": round(float(s.max()), 2) if len(s) > 0 else None,
        }

    for col in df.select_dtypes(include=["object", "category"]).columns:
        vc = df[col].value_counts().head(5)
        profile["categorical_summary"][col] = {str(k): int(v) for k, v in vc.items()}

    focus = (params or {}).get("focus", "general")

    prompt = f"""You are a senior business analyst. Analyze this dataset and provide a comprehensive business analysis.

## Dataset Profile
{json.dumps(profile, default=str)}

## Focus Area: {focus}

Return JSON with:
1. "executive_summary": 3-5 sentence executive summary
2. "key_insights": Array of 4-6 key business insights (each with "insight" and "impact")
3. "risks": Array of 2-4 risks (each with "risk" and "severity" [high/medium/low])
4. "opportunities": Array of 2-4 opportunities (each with "opportunity" and "potential")
5. "recommendations": Array of 3-5 actionable recommendations
6. "action_items": Array of 2-3 immediate next steps

Return ONLY valid JSON."""

    try:
        response = await llm.chat([
            {"role": "system", "content": "You are an expert business analyst. Always respond with valid JSON only."},
            {"role": "user", "content": prompt},
        ])

        from app.services.ml import _parse_llm_json
        parsed = _parse_llm_json(response)

        if not parsed:
            raise ValueError("Could not parse LLM response")

        what_changed = [
            "Analyzed dataset from business perspective",
            f"Identified {len(parsed.get('key_insights', []))} key insights",
            f"Flagged {len(parsed.get('risks', []))} risks",
            f"Found {len(parsed.get('opportunities', []))} opportunities",
        ]

        return ToolResult(
            tool="business",
            status="success",
            summary=parsed.get("executive_summary", "Business analysis complete"),
            what_changed=what_changed,
            why="Business analysis translates data patterns into actionable business intelligence.",
            expected_impact="Enables data-driven decision making with clear priorities",
            confidence=0.8,
            suggestions=[
                "Review the identified risks and prioritize mitigation",
                "Evaluate opportunities against current resource capacity",
            ],
            data=parsed,
        )
    except Exception as e:
        return ToolResult(
            tool="business",
            status="error",
            summary=f"Business analysis failed: {str(e)}",
            what_changed=[],
            why="Business analysis requires LLM provider to be configured.",
            confidence=0,
        )


async def story_tool(dataset_id: int, df: pd.DataFrame, params: dict = None) -> ToolResult:
    from app.llm.factory import get_llm_provider
    from app.services.eda import run_eda

    llm = get_llm_provider()
    eda_result = run_eda(df)

    tone = (params or {}).get("tone", "executive")
    include_charts = (params or {}).get("include_charts", True)

    profile = {
        "shape": list(df.shape),
        "columns": list(df.columns),
        "insights": eda_result.get("insights", []),
        "stats": eda_result.get("stats", {}),
        "correlations": list(eda_result.get("correlation", {}).keys())[:5] if eda_result.get("correlation") else [],
    }

    prompt = f"""You are a data storyteller. Create a compelling narrative report about this dataset.

## Dataset Profile
{json.dumps(profile, default=str)}

## Tone: {tone}
## Include Charts: {include_charts}

Return JSON with:
1. "title": Compelling report title
2. "narrative": Array of sections, each with:
   - "section": Section heading
   - "content": 2-4 paragraph narrative
   - "chart_ref": Optional reference to a chart type ("histogram", "correlation", "box_plot")
   - "chart_type": Type of chart if chart_ref is set
3. "conclusion": Final summary paragraph
4. "key_takeaways": Array of 3-5 bullet points

Return ONLY valid JSON."""

    try:
        response = await llm.chat([
            {"role": "system", "content": "You are an expert data storyteller. Always respond with valid JSON only."},
            {"role": "user", "content": prompt},
        ])

        from app.services.ml import _parse_llm_json
        parsed = _parse_llm_json(response)

        if not parsed:
            raise ValueError("Could not parse LLM response")

        num_sections = len(parsed.get("narrative", []))

        return ToolResult(
            tool="story",
            status="success",
            summary=f"Generated data story: {parsed.get('title', 'Untitled')}",
            what_changed=[
                f"Created {num_sections}-section narrative",
                f"Applied {tone} tone",
            ],
            why="Data stories make analytical findings accessible and actionable for all stakeholders.",
            expected_impact="Improves stakeholder understanding and buy-in for data-driven decisions",
            confidence=0.8,
            data=parsed,
        )
    except Exception as e:
        return ToolResult(
            tool="story",
            status="error",
            summary=f"Story generation failed: {str(e)}",
            confidence=0,
        )


async def notebook_tool(dataset_id: int, df: pd.DataFrame, params: dict = None) -> ToolResult:
    from app.llm.factory import get_llm_provider
    from app.services.eda import run_eda

    llm = get_llm_provider()
    eda_result = run_eda(df)

    sections = (params or {}).get("sections", ["eda", "ml", "story"])
    style = (params or {}).get("style", "analysis")

    profile = {
        "shape": list(df.shape),
        "columns": list(df.columns),
        "dtypes": {c: str(t) for c, t in df.dtypes.items()},
        "numeric_columns": eda_result.get("numeric_columns", []),
        "categorical_columns": eda_result.get("categorical_columns", []),
    }

    prompt = f"""You are a data science instructor. Generate a Jupyter notebook for analyzing this dataset.

## Dataset Profile
{json.dumps(profile, default=str)}

## Sections to Include: {sections}
## Style: {style}

Return a valid Jupyter notebook JSON structure with:
- "nbformat": 4
- "nbformat_minor": 5
- "metadata": {{"kernelspec": {{"display_name": "Python 3", "language": "python", "name": "python3"}}}}
- "cells": Array of cell objects, each with:
  - "cell_type": "markdown" or "code"
  - "source": Array of strings (lines of the cell)
  - "metadata": {{}}
  - "outputs": [] (for code cells)
  - "execution_count": null (for code cells)

Include cells for:
1. Title and introduction (markdown)
2. Data loading and imports (code)
3. Data overview (code + markdown)
4. EDA with visualizations (code + markdown)
5. Statistical analysis (code + markdown)
6. Key findings (markdown)

Return ONLY valid JSON."""

    try:
        response = await llm.chat([
            {"role": "system", "content": "You are an expert data scientist. Always respond with valid JSON only. Generate complete, runnable notebook code."},
            {"role": "user", "content": prompt},
        ])

        from app.services.ml import _parse_llm_json
        parsed = _parse_llm_json(response)

        if not parsed or "cells" not in parsed:
            raise ValueError("Invalid notebook format")

        num_cells = len(parsed.get("cells", []))

        return ToolResult(
            tool="notebook",
            status="success",
            summary=f"Generated Jupyter notebook with {num_cells} cells",
            what_changed=[f"Created notebook with {num_cells} cells covering {', '.join(sections)}"],
            why="Notebooks provide reproducible analysis that can be shared and re-executed.",
            expected_impact="Enables reproducible analysis and knowledge sharing",
            confidence=0.8,
            data={"notebook": parsed, "filename": f"analysis_{dataset_id}.ipynb"},
        )
    except Exception as e:
        return ToolResult(
            tool="notebook",
            status="error",
            summary=f"Notebook generation failed: {str(e)}",
            confidence=0,
        )
