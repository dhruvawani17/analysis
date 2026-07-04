from fastapi import APIRouter, UploadFile, File, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_dataset_or_404
from app.services.ingestion import import_dataset
from app.db.models import Dataset
from app.core.storage import load_dataframe
import io, csv, json

router = APIRouter()


@router.post("/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    dataset = await import_dataset(db, file)
    return {"id": dataset.id, "name": dataset.name, "status": "imported"}


@router.get("/")
async def list_datasets(
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select
    result = await db.execute(select(Dataset).order_by(Dataset.created_at.desc()))
    datasets = result.scalars().all()
    return [
        {
            "id": d.id,
            "name": d.name,
            "rows": d.row_count,
            "columns": d.column_count,
            "created_at": d.created_at.isoformat(),
        }
        for d in datasets
    ]


@router.get("/{dataset_id}")
async def get_dataset(
    dataset: Dataset = Depends(get_dataset_or_404),
):
    import json
    return {
        "id": dataset.id,
        "name": dataset.name,
        "rows": dataset.row_count,
        "columns": dataset.column_count,
        "column_names": json.loads(dataset.column_names) if dataset.column_names else [],
        "dtypes": json.loads(dataset.dtypes) if dataset.dtypes else {},
        "created_at": dataset.created_at.isoformat(),
    }


@router.get("/{dataset_id}/download")
async def download_dataset(
    dataset: Dataset = Depends(get_dataset_or_404),
    format: str = Query("csv", pattern="^(csv|json)$"),
):
    source = dataset.cleaned_file_path or dataset.file_path
    df = load_dataframe(source)

    filename = dataset.name.rsplit(".", 1)[0] or "data"

    if format == "json":
        content = df.to_json(orient="records", date_format="iso")
        media_type = "application/json"
        ext = "json"
    else:
        buf = io.StringIO()
        df.to_csv(buf, index=False)
        content = buf.getvalue()
        media_type = "text/csv"
        ext = "csv"

    return StreamingResponse(
        iter([content]),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}_clean.{ext}"'},
    )
