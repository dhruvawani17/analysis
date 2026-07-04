import io
import json
from pathlib import Path

import pandas as pd
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.storage import save_dataframe
from app.db.models import Dataset


def _clean_column(col: str) -> str:
    col = col.strip().lower().replace(" ", "_").replace("-", "_")
    col = "".join(c if c.isalnum() or c == "_" else "_" for c in col)
    return col.strip("_") or "column"


def _prepare_df(df: pd.DataFrame) -> pd.DataFrame:
    df = df.drop(columns=[c for c in df.columns if "unnamed" in c.lower()], errors="ignore")
    df = df.rename(columns={c: _clean_column(c) for c in df.columns})
    df = df.loc[:, ~df.columns.duplicated()]

    for col in df.select_dtypes(include=["object"]).columns:
        df[col] = df[col].astype(str).replace("nan", None).replace("", None)

    return df


async def import_dataset(db: AsyncSession, file: UploadFile) -> Dataset:
    content = await file.read()
    ext = Path(file.filename).suffix.lower().lstrip(".")
    buf = io.BytesIO(content)

    if ext == "csv":
        df = pd.read_csv(buf)
    elif ext == "xlsx":
        df = pd.read_excel(buf)
    elif ext == "json":
        df = pd.read_json(buf)
    else:
        raise ValueError(f"Unsupported file type: {ext}")

    df = _prepare_df(df)
    parquet_path = save_dataframe(df, f"{file.filename}_{id(file)}")

    dataset = Dataset(
        name=file.filename,
        file_path=str(parquet_path),
        file_type=ext,
        row_count=len(df),
        column_count=len(df.columns),
        column_names=json.dumps(list(df.columns)),
        dtypes=json.dumps({c: str(t) for c, t in df.dtypes.items()}),
        file_size_bytes=len(content),
    )

    db.add(dataset)
    await db.commit()
    await db.refresh(dataset)
    return dataset
