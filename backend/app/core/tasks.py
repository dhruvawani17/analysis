from fastapi import BackgroundTasks
from app.db.models import Dataset
from sqlalchemy.ext.asyncio import AsyncSession


def run_analysis_background(dataset_id: int):
    pass


async def schedule_analysis(
    db: AsyncSession,
    dataset: Dataset,
    background_tasks: BackgroundTasks,
):
    background_tasks.add_task(run_analysis_background, dataset.id)
