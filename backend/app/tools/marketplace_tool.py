from app.copilot.tools import ToolResult
import pandas as pd


async def marketplace_tool(dataset_id: int, df: pd.DataFrame, params: dict = None) -> ToolResult:
    from app.services.marketplace import suggest_datasets
    from app.db.models import Dataset

    dataset = await _get_dataset(dataset_id)
    dataset_name = dataset.name if dataset else ""

    suggestions = suggest_datasets(df, dataset_name)

    what_changed = [
        f"Found {len(suggestions)} relevant enrichment datasets",
    ]
    for s in suggestions:
        what_changed.append(f"  • {s['name']} (relevance: {s['relevance_score']}/10): {s.get('suggested_join', '')}")

    return ToolResult(
        tool="marketplace",
        status="success",
        summary=f"Data Marketplace: {len(suggestions)} enrichment datasets available for '{dataset_name}'",
        what_changed=what_changed,
        why="Enriching your dataset with external data can uncover deeper patterns and improve model performance",
        expected_impact="Dataset enrichment can improve model accuracy by 5-20%",
        confidence=0.75,
        suggestions=["Select a dataset to enrich your analysis", "Run EDA after enrichment to see new patterns"],
        data={"datasets": suggestions},
    )


async def _get_dataset(dataset_id: int):
    from app.db.models import Dataset
    from app.api.deps import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        return await session.get(Dataset, dataset_id)
