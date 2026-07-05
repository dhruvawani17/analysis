from app.copilot.tools import ToolResult
import pandas as pd
import json


async def simulation_tool(dataset_id: int, df: pd.DataFrame, params: dict = None) -> ToolResult:
    from app.services.simulation import run_simulation

    target = (params or {}).get("target_column", "")
    scenario = (params or {}).get("scenario", "")
    changes = (params or {}).get("changes", [])

    if not changes and scenario:
        from app.llm.factory import get_llm_provider
        numeric_cols = df.select_dtypes(include=["number"]).columns.tolist()
        id_cols = [c for c in numeric_cols if "id" in c.lower()]
        numeric_cols = [c for c in numeric_cols if c not in id_cols]

        if not target:
            target = numeric_cols[-1] if numeric_cols else ""

        # Try keyword matching first
        scenario_lower = scenario.lower()
        col_scores = {}
        for col in numeric_cols:
            score = 0
            col_words = set(col.lower().replace("_", " ").split())
            scenario_words = set(scenario_lower.split())
            score += len(col_words & scenario_words) * 2
            if any(w in col.lower() for w in scenario_words):
                score += 1
            col_scores[col] = score
        best_col = max(col_scores, key=col_scores.get) if col_scores else numeric_cols[0] if numeric_cols else ""

        import re
        pct_match = re.search(r'(\d+)\s*%', scenario_lower)
        num_match = re.search(r'(\d+)', scenario_lower)
        if pct_match:
            pct_val = float(pct_match.group(1))
            if any(w in scenario_lower for w in ["decrease", "drop", "reduce", "less", "down"]):
                pct_val = -pct_val
            changes = [{"column": best_col, "type": "percent_increase", "value": pct_val}]
        elif num_match:
            num_val = float(num_match.group(1))
            if any(w in scenario_lower for w in ["decrease", "drop", "reduce", "less", "down"]):
                num_val = -num_val
            changes = [{"column": best_col, "type": "multiply", "value": 1 + num_val / 100}]

        # Try LLM if keyword matching failed
        if not changes:
            llm = get_llm_provider()
            parse_prompt = f"""Parse this what-if scenario into structured changes.

    Scenario: "{scenario}"

    Available numeric columns: {numeric_cols[:10]}

    Return JSON in this format:
    {{"changes": [{{"column": "column_name", "type": "multiply|add|set|percent_increase", "value": number}}], "target_column": "best_guess_target"}}

    Examples:
    - "increase marketing spend by 20%" -> {{"changes": [{{"column": "marketing_spend", "type": "percent_increase", "value": 20}}]}}
    - "what if price drops by 5" -> {{"changes": [{{"column": "price", "type": "multiply", "value": 0.95}}]}}

    Return ONLY valid JSON."""
            try:
                resp = await llm.chat([
                    {"role": "system", "content": "Parse what-if scenarios into structured JSON changes."},
                    {"role": "user", "content": parse_prompt},
                ])
                from app.services.ml import _parse_llm_json
                parsed = _parse_llm_json(resp)
                if parsed:
                    changes = parsed.get("changes", [])
                    if not target:
                        target = parsed.get("target_column", "")
            except Exception:
                pass

    if not changes:
        return ToolResult(
            tool="simulation", status="error",
            summary="Please specify what to change (e.g., 'increase runs by 20%')",
            confidence=0,
        )

    result = await run_simulation(df, target, scenario, changes)

    direction = result.get("direction", "neutral")
    icon = "📈" if direction == "increase" else "📉" if direction == "decrease" else "➡️"

    what_changed = [
        f"Target: {result.get('target_column')}",
        f"Baseline: {result.get('baseline_mean', 0):.2f} → Scenario: {result.get('scenario_mean', 0):.2f}",
        f"Impact: {icon} {result.get('percentage_impact', 0):+.1f}%",
    ]
    for c in result.get("changes_applied", []):
        what_changed.append(f"  {c['column']}: {c['original_mean']} → {c['new_mean']} ({c['change_pct']:+.1f}%)")

    analysis = result.get("analysis", "")
    suggestions = [
        "Run a different scenario",
        "Train a more accurate model for better simulation",
        "Compare multiple scenarios side by side",
    ]

    return ToolResult(
        tool="simulation",
        status="success",
        summary=f"What-If: {result.get('scenario', 'Scenario')} → {result.get('percentage_impact', 0):+.1f}% impact on {result.get('target_column', 'target')}",
        what_changed=what_changed,
        why="What-if simulation helps you understand the potential business impact of changes before committing resources",
        expected_impact=f"Predicted {direction} of {abs(result.get('percentage_impact', 0)):.1f}% in {result.get('target_column', 'target')}",
        confidence=result.get("confidence", 0.6),
        suggestions=suggestions,
        data=result,
    )
