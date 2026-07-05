import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_dataset_or_404
from app.db.models import Dataset, Dashboard, ToolInvocation

router = APIRouter()


@router.get("/{dataset_id}")
async def get_dashboard(
    dataset: Dataset = Depends(get_dataset_or_404),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Dashboard).where(Dashboard.dataset_id == dataset.id).order_by(Dashboard.updated_at.desc()).limit(1)
    )
    dashboard = result.scalar_one_or_none()

    if not dashboard:
        raise HTTPException(status_code=404, detail="No dashboard found")

    return {"config": json.loads(dashboard.config)}


@router.post("/generate/{dataset_id}")
async def generate_dashboard(
    dataset: Dataset = Depends(get_dataset_or_404),
    db: AsyncSession = Depends(get_db),
):
    from app.core.storage import load_dataframe
    from app.tools.advanced import dashboard_tool

    # Load ML context from recent tool invocations
    ml_context = {}
    try:
        inv_result = await db.execute(
            select(ToolInvocation)
            .where(ToolInvocation.dataset_id == dataset.id, ToolInvocation.tool_name == "ml", ToolInvocation.status == "success")
            .order_by(ToolInvocation.completed_at.desc())
            .limit(1)
        )
        ml_invocation = inv_result.scalar_one_or_none()
        if ml_invocation and ml_invocation.result:
            ml_data = json.loads(ml_invocation.result)
            if isinstance(ml_data, dict):  # ToolResult.to_dict()
                inner = ml_data.get("data", ml_data)
                ml_context = {
                    "target_column": inner.get("target_column", inner.get("target", "")),
                    "best_model": inner.get("best_model", ""),
                    "best_score": inner.get("best_score"),
                    "ml_results": [inner] if inner.get("best_model") else [],
                    "feature_importance": inner.get("feature_importance", []),
                    "all_results": inner.get("all_results", []),
                }
    except Exception:
        pass

    df = load_dataframe(dataset.cleaned_file_path or dataset.file_path)
    result = await dashboard_tool(dataset.id, df, {"ml_context": ml_context})

    if result.status == "error":
        raise HTTPException(status_code=500, detail=result.summary)

    config = result.data

    existing = await db.execute(
        select(Dashboard).where(Dashboard.dataset_id == dataset.id)
    )
    dashboard_obj = existing.scalar_one_or_none()

    if dashboard_obj:
        dashboard_obj.config = json.dumps(config)
    else:
        dashboard_obj = Dashboard(dataset_id=dataset.id, config=json.dumps(config))
        db.add(dashboard_obj)

    await db.commit()

    return {"config": config}
