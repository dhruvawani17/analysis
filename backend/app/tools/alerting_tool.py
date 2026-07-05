from app.copilot.tools import ToolResult
import pandas as pd


async def alerting_tool(dataset_id: int, df: pd.DataFrame, params: dict = None) -> ToolResult:
    from app.services.alerting import generate_alerts
    from app.copilot.memory import ConversationMemory
    from app.api.deps import AsyncSessionLocal

    async with AsyncSessionLocal() as session:
        memory = ConversationMemory(session)
        ctx = await memory.get_dataset_context(dataset_id)
        alerts = generate_alerts(df, context=ctx.__dict__ if hasattr(ctx, "__dict__") else {})

    critical = [a for a in alerts if a.get("severity") == "critical"]
    warnings = [a for a in alerts if a.get("severity") == "warning"]
    infos = [a for a in alerts if a.get("severity") in ("info", "success")]

    what_changed = [
        f"Found {len(alerts)} insights: {len(critical)} critical, {len(warnings)} warnings, {len(infos)} info",
    ]
    for a in alerts[:5]:
        icon = {"critical": "🔴", "warning": "🟡", "info": "ℹ️", "success": "✅"}.get(a.get("severity"), "ℹ️")
        what_changed.append(f"  {icon} {a['title']}: {a.get('message', '')}")

    return ToolResult(
        tool="alerting",
        status="success",
        summary=f"AI Insights: {len(alerts)} alerts generated",
        what_changed=what_changed,
        why="Proactive alerts help you catch issues and opportunities before they become problems",
        expected_impact="Stay informed about data quality, model performance, and business metrics",
        confidence=0.85,
        suggestions=["Set up recurring insight scans", "Investigate the most critical alerts first"],
        data={
            "alerts": alerts,
            "critical_count": len(critical),
            "warning_count": len(warnings),
            "info_count": len(infos),
        },
    )
