from app.copilot.tools import ToolResult
import pandas as pd


async def confidence_checker_tool(dataset_id: int, df: pd.DataFrame, params: dict = None) -> ToolResult:
    from app.services.confidence import check_confidence

    target = (params or {}).get("target_column", "")

    if not target:
        numeric_cols = df.select_dtypes(include=["number"]).columns.tolist()
        id_cols = [c for c in numeric_cols if "id" in c.lower()]
        numeric_cols = [c for c in numeric_cols if c not in id_cols]
        if numeric_cols:
            target = numeric_cols[-1]

    issues = check_confidence(df, target)

    critical = [i for i in issues if i["severity"] == "critical"]
    warnings = [i for i in issues if i["severity"] == "warning"]
    infos = [i for i in issues if i["severity"] == "info"]

    what_changed = [
        f"Found {len(critical)} critical issues, {len(warnings)} warnings, {len(infos)} info items",
    ]
    for issue in critical[:3]:
        what_changed.append(f"🔴 {issue['message']}")
    for issue in warnings[:3]:
        what_changed.append(f"🟡 {issue['message']}")

    can_proceed = len(critical) == 0

    suggestions = []
    for issue in critical + warnings:
        suggestions.append(issue["recommendation"])
    if can_proceed:
        suggestions.append("Proceed with model training — confidence is adequate")

    return ToolResult(
        tool="confidence",
        status="success" if can_proceed else "warning",
        summary=f"Confidence check: {len(critical)} critical, {len(warnings)} warnings" if critical else f"Confidence check: {len(warnings)} warnings, all clear" if warnings else "Confidence check: All checks passed",
        what_changed=what_changed,
        why="Pre-training validation prevents common modeling mistakes and saves time",
        expected_impact="Issues resolved before training leads to better model performance",
        confidence=0.9,
        suggestions=suggestions[:5],
        data={
            "issues": issues,
            "critical_count": len(critical),
            "warning_count": len(warnings),
            "info_count": len(infos),
            "can_proceed": can_proceed,
            "target_column": target,
        },
    )
