from fastapi import APIRouter, UploadFile, File, Depends, Query, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
import uuid

from app.api.deps import get_db, get_dataset_or_404, get_current_user, get_dataset_repository
from app.services.ingestion import import_dataset
from app.services.cleaning import clean_dataset
from app.db.models import Dataset, User
from app.core.storage import load_dataframe, save_dataframe, get_signed_url, delete_file, delete_prefix
from app.repositories.dataset_repository import DatasetRepository
import io, csv, json

router = APIRouter()


@router.post("/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    dataset = await import_dataset(db, file, user_id=user.id)
    return {"id": dataset.id, "name": dataset.name, "status": "imported"}


@router.post("/clean/{dataset_id}")
async def clean_dataset_endpoint(
    dataset_id: int,
    dataset: Dataset = Depends(get_dataset_or_404),
    db: AsyncSession = Depends(get_db),
):
    df = load_dataframe(dataset.file_path)
    df_clean, cleaning_report = clean_dataset(df)

    uid = str(dataset.user_id) if dataset.user_id else "default"
    cleaned_path = save_dataframe(
        df_clean,
        f"cleaned_{dataset.id}_{uuid.uuid4().hex[:8]}",
        user_id=uid,
        folder="cleaned",
    )

    dataset.cleaned_file_path = cleaned_path
    dataset.data_quality_report = cleaning_report
    await db.commit()

    return {
        "dataset_id": dataset.id,
        "cleaning": cleaning_report,
        "rows": len(df_clean),
        "columns": len(df_clean.columns),
    }


@router.get("")
async def list_datasets(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from sqlalchemy import select
    result = await db.execute(
        select(Dataset).where(Dataset.user_id == user.id).order_by(Dataset.created_at.desc())
    )
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
        "column_names": json.loads(dataset.column_names) if isinstance(dataset.column_names, str) else (dataset.column_names or []),
        "dtypes": json.loads(dataset.dtypes) if isinstance(dataset.dtypes, str) else (dataset.dtypes or {}),
        "created_at": dataset.created_at.isoformat(),
        "cleaned": dataset.cleaned_file_path is not None,
    }


@router.get("/{dataset_id}/download")
async def download_dataset(
    dataset: Dataset = Depends(get_dataset_or_404),
    format: str = Query("csv", pattern="^(csv|json)$"),
):
    source = dataset.cleaned_file_path or dataset.file_path

    # If it's a Firebase Storage path, generate signed URL
    if source.startswith("users/"):
        url = get_signed_url(source)
        return RedirectResponse(url=url, status_code=307)

    # Fallback: legacy local paths — stream directly
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

    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        iter([content]),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}_clean.{ext}"'},
    )


@router.get("/{dataset_id}/download-original")
async def download_original(
    dataset: Dataset = Depends(get_dataset_or_404),
):
    """Download the original uploaded file via signed URL."""
    if not dataset.original_file_path:
        return {"error": "Original file not available"}
    url = get_signed_url(dataset.original_file_path)
    return RedirectResponse(url=url, status_code=307)


class ExecuteMultisheetRequest(BaseModel):
    action: str
    left_sheet: str | None = None
    right_sheet: str | None = None
    join_column: str | None = None
    join_how: str = "inner"


@router.post("/{dataset_id}/multisheet/execute")
async def execute_multisheet(
    body: ExecuteMultisheetRequest,
    dataset: Dataset = Depends(get_dataset_or_404),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from app.tools.multisheet_tool import execute_workflow
    result = execute_workflow(
        dataset,
        action=body.action,
        left_sheet=body.left_sheet,
        right_sheet=body.right_sheet,
        join_column=body.join_column,
        join_how=body.join_how,
    )
    if result["status"] == "success":
        import json
        new_dataset = Dataset(
            user_id=user.id,
            name=f"{dataset.name.rsplit('.', 1)[0] or dataset.name}_combined",
            file_path=result["output_path"],
            file_type="parquet",
            row_count=result["rows"],
            column_count=result["columns"],
            column_names=json.dumps(result["column_names"]),
            dtypes=json.dumps(result["dtypes"]),
        )
        db.add(new_dataset)
        await db.commit()
        await db.refresh(new_dataset)
        result["new_dataset_id"] = new_dataset.id
        result["new_dataset_name"] = new_dataset.name
    return result


@router.delete("/{dataset_id}")
async def delete_dataset(
    dataset: Dataset = Depends(get_dataset_or_404),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete a dataset and all associated files from storage."""
    uid = str(dataset.user_id) if dataset.user_id else "default"
    prefix = f"users/{uid}/"

    # Delete files from B2 storage
    try:
        if dataset.file_path:
            delete_file(dataset.file_path)
        if dataset.cleaned_file_path:
            delete_file(dataset.cleaned_file_path)
        if dataset.original_file_path:
            delete_file(dataset.original_file_path)
        # Delete any per-sheet parquet files
        if dataset.sheets_meta:
            sheets = dataset.sheets_meta if isinstance(dataset.sheets_meta, dict) else {}
            for sheet_name, sheet_path in sheets.items():
                if isinstance(sheet_path, str) and sheet_path:
                    try:
                        delete_file(sheet_path)
                    except Exception:
                        pass
        # Delete all files under this dataset's storage prefix
        delete_prefix(f"{prefix}{dataset.id}/")
    except Exception:
        pass  # Best-effort cleanup

    # Delete database record (cascades to all related tables)
    await db.delete(dataset)
    await db.commit()

    return {"status": "deleted", "dataset_id": dataset.id}
