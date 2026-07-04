from pathlib import Path
import pandas as pd
import json
from app.config import settings


def get_upload_dir() -> Path:
    path = Path(settings.upload_dir)
    path.mkdir(parents=True, exist_ok=True)
    return path


def save_dataframe(df: pd.DataFrame, name: str) -> Path:
    upload_dir = get_upload_dir()
    parquet_path = upload_dir / f"{name}.parquet"
    df.to_parquet(parquet_path, index=False)
    return parquet_path


def load_dataframe(stored_path: str) -> pd.DataFrame:
    path = Path(stored_path)
    if path.suffix == ".parquet":
        return pd.read_parquet(path)
    if path.suffix == ".csv":
        return pd.read_csv(path)
    if path.suffix == ".xlsx":
        return pd.read_excel(path)
    if path.suffix == ".json":
        return pd.read_json(path)
    raise ValueError(f"Unsupported file type: {path.suffix}")
