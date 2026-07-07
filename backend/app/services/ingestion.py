import io
import uuid
from pathlib import Path

import pandas as pd
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.storage import save_dataframe, save_file
from app.db.models import Dataset
from app.services.storage_service import storage_service


def _clean_column(col: str) -> str:
    col = col.strip().lower().replace(" ", "_").replace("-", "_")
    col = "".join(c if c.isalnum() or c == "_" else "_" for c in col)
    return col.strip("_") or "column"


def _prepare_df(df: pd.DataFrame) -> pd.DataFrame:
    df.columns = [str(c) for c in df.columns]
    df = df.drop(columns=[c for c in df.columns if "unnamed" in c.lower()], errors="ignore")
    df = df.rename(columns={c: _clean_column(c) for c in df.columns})
    df = df.loc[:, ~df.columns.duplicated()]
    for col in df.select_dtypes(include=["object"]).columns:
        df[col] = df[col].astype(str).replace("nan", None).replace("", None)
    return df


async def import_dataset(db: AsyncSession, file: UploadFile, user_id=None, project_id=None) -> Dataset:
    """
    Upload flow:
    1. Upload original file to S3 (users/{uid}/{pid}/uploads/)
    2. Parse + convert to parquet, upload to S3 (users/{uid}/{pid}/cleaned/)
    3. Save metadata in PostgreSQL (never store files in DB)
    4. Return dataset (EDA runs separately via /analyze endpoint)
    """
    content = await file.read()
    ext = Path(file.filename).suffix.lower().lstrip(".")
    mime_type = file.content_type or "application/octet-stream"
    uid = str(user_id) if user_id else "default"
    pid = str(project_id) if project_id else "default"
    file_id = uuid.uuid4().hex[:8]

    buf = io.BytesIO(content)
    sheets_meta: list[dict] | None = None

    if ext == "csv":
        df = _prepare_df(pd.read_csv(buf))
        parquet_path = save_dataframe(df, f"{file.filename}_{file_id}", user_id=uid, project_id=pid, folder="cleaned")

    elif ext == "xlsx":
        all_sheets = pd.read_excel(buf, sheet_name=None)
        if not all_sheets:
            raise ValueError("Excel file contains no sheets")

        if len(all_sheets) == 1:
            name, raw = next(iter(all_sheets.items()))
            df = _prepare_df(raw)
            parquet_path = save_dataframe(df, f"{file.filename}_{file_id}", user_id=uid, project_id=pid, folder="cleaned")
        else:
            sheets_meta = []
            first_name = None
            for i, (sheet_name, sheet_df) in enumerate(all_sheets.items()):
                clean = _prepare_df(sheet_df) if not sheet_df.empty else sheet_df
                spath = save_dataframe(clean, f"{file.filename}_sheet{i}_{file_id}", user_id=uid, project_id=pid, folder="cleaned")
                sheets_meta.append({
                    "sheet_name": sheet_name,
                    "sheet_index": i,
                    "parquet_path": spath,
                    "rows": len(clean),
                    "columns": len(clean.columns) if not clean.empty else 0,
                    "column_names": list(clean.columns) if not clean.empty else [],
                })
                if first_name is None:
                    first_name = sheet_name
            df = _prepare_df(all_sheets[first_name])
            parquet_path = sheets_meta[0]["parquet_path"]

    elif ext == "json":
        df = _prepare_df(pd.read_json(buf))
        parquet_path = save_dataframe(df, f"{file.filename}_{file_id}", user_id=uid, project_id=pid, folder="cleaned")
    else:
        raise ValueError(f"Unsupported file type: {ext}")

    # Upload original file (preserves original for re-download)
    original_path = f"users/{uid}/{pid}/uploads/{file.filename}"
    await storage_service.upload_file(content, original_path, mime_type)

    dataset = Dataset(
        user_id=user_id,
        name=file.filename,
        file_path=parquet_path,
        original_filename=file.filename,
        mime_type=mime_type,
        original_file_path=original_path,
        file_type=ext,
        row_count=len(df),
        column_count=len(df.columns),
        column_names=list(df.columns),
        dtypes={c: str(t) for c, t in df.dtypes.items()},
        file_size_bytes=len(content),
        sheet_count=len(sheets_meta) if sheets_meta else 1,
        sheets_meta=sheets_meta if sheets_meta else None,
    )
    db.add(dataset)
    await db.commit()
    await db.refresh(dataset)
    return dataset
