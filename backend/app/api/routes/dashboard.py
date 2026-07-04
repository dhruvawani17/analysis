import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_dataset_or_404
from app.db.models import Dataset, Dashboard

router = APIRouter()


@router.get("/{dataset_id}")
async def get_dashboard(
    dataset: Dataset = Depends(get_dataset_or_404),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select

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

    df = load_dataframe(dataset.cleaned_file_path or dataset.file_path)
    result = await dashboard_tool(dataset.id, df, {})

    if result.status == "error":
        raise HTTPException(status_code=500, detail=result.summary)

    config = result.data

    existing = await db.execute(
        select(Dashboard).where(Dashboard.dataset_id == dataset.id)
    )
    dashboard = existing.scalar_one_or_none()

    if dashboard:
        dashboard.config = json.dumps(config)
    else:
        dashboard = Dashboard(dataset_id=dataset.id, config=json.dumps(config))
        db.add(dashboard)

    await db.commit()

    return {"config": config}
