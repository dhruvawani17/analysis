"""
Backward-compatible storage module.
All calls delegate to StorageService (S3/B2). New code should import storage_service directly.
"""
import asyncio
import logging
from pathlib import Path

import pandas as pd

from app.services.storage_service import storage_service

logger = logging.getLogger(__name__)


def _run_async(coro):
    """Run an async coroutine from sync code. Used by legacy sync callers."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None
    if loop and loop.is_running():
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as pool:
            return pool.submit(asyncio.run, coro).result()
    else:
        return asyncio.run(coro)


def save_dataframe(df: pd.DataFrame, name: str, user_id: str = "default", project_id: str = "default", folder: str = "cleaned") -> str:
    """Save dataframe to S3/B2. Returns storage path."""
    storage_path = f"users/{user_id}/{project_id}/{folder}/{name}.parquet"
    _run_async(storage_service.upload_dataframe(df, storage_path))
    return storage_path


def save_file(file_bytes: bytes, name: str, user_id: str = "default", project_id: str = "default", folder: str = "uploads", content_type: str = "application/octet-stream") -> str:
    """Save raw file to S3/B2. Returns storage path."""
    storage_path = f"users/{user_id}/{project_id}/{folder}/{name}"
    _run_async(storage_service.upload_file(file_bytes, storage_path, content_type))
    return storage_path


def load_dataframe(stored_path: str) -> pd.DataFrame:
    """Load dataframe from S3/B2 or local path (fallback)."""
    if stored_path.startswith("users/"):
        df = _run_async(storage_service.download_dataframe(stored_path))
        return df
    # Fallback: legacy local paths
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


def get_signed_url(storage_path: str) -> str:
    """Generate a signed URL for a file in S3/B2."""
    return storage_service.generate_signed_url(storage_path)
