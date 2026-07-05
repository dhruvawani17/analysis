from app.copilot.tools import ToolResult
import pandas as pd


async def lineage_tool(dataset_id: int, df: pd.DataFrame, params: dict = None) -> ToolResult:
    from app.services.lineage import build_lineage
    from app.copilot.memory import ConversationMemory
    from app.api.deps import AsyncSessionLocal

    async with AsyncSessionLocal() as session:
        memory = ConversationMemory(session)
        ctx = await memory.get_dataset_context(dataset_id)
        lineage = build_lineage(dataset_id, ctx.tool_history)

    steps = lineage.get("lineage", [])
    current_step = next((s for s in steps if s.get("is_current")), steps[-1] if steps else None)

    what_changed = [f"Data lineage: {lineage.get('total_steps', 0)} transformation steps"]
    for s in steps:
        icon = "📌" if s.get("is_current") else "→"
        what_changed.append(f"  {icon} {s['label']}: {s.get('description', '')}")

    suggestions = []
    if current_step and current_step.get("can_rollback"):
        suggestions.append(f"Rollback to previous step")
    suggestions.extend(["Run a new analysis step to extend the lineage", "Export lineage as a report"])

    return ToolResult(
        tool="lineage",
        status="success",
        summary=f"Data Lineage: {lineage.get('total_steps', 0)} steps — currently at '{current_step.get('label', 'start')}'" if current_step else "Data Lineage: No transformations yet",
        what_changed=what_changed,
        why="Data lineage provides full transparency into how the dataset was transformed, enabling audit, rollback, and reproducibility",
        expected_impact="Full visibility into data transformations and ability to rollback",
        confidence=0.95,
        suggestions=suggestions,
        data=lineage,
    )
