import io
import logging
from datetime import timedelta
from pathlib import Path

import pandas as pd

from app.config import settings

logger = logging.getLogger(__name__)

_s3_client = None


def _get_client():
    global _s3_client
    if _s3_client is None:
        if not settings.aws_access_key_id or not settings.aws_secret_access_key:
            return None
        try:
            import boto3
            from botocore.config import Config
            _s3_client = boto3.client(
                "s3",
                endpoint_url=settings.aws_s3_endpoint,
                aws_access_key_id=settings.aws_access_key_id,
                aws_secret_access_key=settings.aws_secret_access_key,
                region_name=settings.aws_s3_region,
                config=Config(signature_version="s3v4"),
            )
        except Exception as e:
            logger.warning(f"Failed to create S3 client: {e}")
            return None
    return _s3_client


class StorageService:
    """
    S3-compatible object storage service (Backblaze B2, Cloudflare R2, AWS S3, etc.).
    All file I/O in the app goes through this service.
    To swap backends, only this file needs to change.

    Path convention:
        users/{user_id}/{project_id}/uploads/    ← original files
        users/{user_id}/{project_id}/cleaned/    ← cleaned parquet
        users/{user_id}/{project_id}/reports/    ← PDF/HTML reports
        users/{user_id}/{project_id}/dashboards/ ← dashboard JSON
        users/{user_id}/{project_id}/models/     ← ML model artifacts
        users/{user_id}/{project_id}/exports/    ← prediction CSVs
        users/{user_id}/{project_id}/charts/     ← chart images
    """

    SIGNED_URL_EXPIRATION = timedelta(hours=1)
    BUCKET = settings.aws_s3_bucket

    # ── Upload ───────────────────────────────────────────────────────────

    @staticmethod
    async def upload_file(
        file_bytes: bytes,
        storage_path: str,
        content_type: str = "application/octet-stream",
    ) -> str:
        client = _get_client()
        if client is None:
            raise ConnectionError("S3 storage not configured — check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env")
        client.put_object(
            Bucket=StorageService.BUCKET,
            Key=storage_path,
            Body=file_bytes,
            ContentType=content_type,
        )
        return storage_path

    @staticmethod
    async def upload_dataframe(
        df: pd.DataFrame,
        storage_path: str,
    ) -> str:
        client = _get_client()
        if client is None:
            raise ConnectionError("S3 storage not configured — check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env")
        buf = io.BytesIO()
        df.to_parquet(buf, index=False)
        buf.seek(0)
        client.put_object(
            Bucket=StorageService.BUCKET,
            Key=storage_path,
            Body=buf.getvalue(),
            ContentType="application/octet-stream",
        )
        return storage_path

    # ── Download ─────────────────────────────────────────────────────────

    @staticmethod
    async def download_file(storage_path: str) -> bytes:
        client = _get_client()
        if client is None:
            raise ConnectionError("S3 storage not configured")
        response = client.get_object(Bucket=StorageService.BUCKET, Key=storage_path)
        return response["Body"].read()

    @staticmethod
    async def download_dataframe(storage_path: str) -> pd.DataFrame:
        raw = await StorageService.download_file(storage_path)
        buf = io.BytesIO(raw)
        suffix = Path(storage_path).suffix.lower()
        if suffix == ".parquet":
            return pd.read_parquet(buf)
        if suffix == ".csv":
            return pd.read_csv(buf)
        if suffix == ".xlsx":
            return pd.read_excel(buf)
        if suffix == ".json":
            return pd.read_json(buf)
        raise ValueError(f"Unsupported file type: {suffix}")

    # ── Delete ───────────────────────────────────────────────────────────

    @staticmethod
    async def delete_file(storage_path: str) -> bool:
        client = _get_client()
        if client is None:
            return False
        try:
            client.delete_object(Bucket=StorageService.BUCKET, Key=storage_path)
            return True
        except Exception:
            return False

    @staticmethod
    async def delete_prefix(prefix: str) -> int:
        client = _get_client()
        if client is None:
            return 0
        paginator = client.get_paginator("list_objects_v2")
        count = 0
        for page in paginator.paginate(Bucket=StorageService.BUCKET, Prefix=prefix):
            for obj in page.get("Contents", []):
                client.delete_object(Bucket=StorageService.BUCKET, Key=obj["Key"])
                count += 1
        return count

    # ── Signed URLs ──────────────────────────────────────────────────────

    @staticmethod
    def generate_signed_url(
        storage_path: str,
        expiration: timedelta | None = None,
        method: str = "GET",
        content_type: str = "application/octet-stream",
    ) -> str:
        client = _get_client()
        if client is None:
            raise ConnectionError("S3 storage not configured")
        exp = expiration or StorageService.SIGNED_URL_EXPIRATION
        params = {
            "Bucket": StorageService.BUCKET,
            "Key": storage_path,
        }
        if method == "PUT":
            params["ContentType"] = content_type
        url = client.generate_presigned_url(
            "get_object" if method == "GET" else "put_object",
            Params=params,
            ExpiresIn=int(exp.total_seconds()),
        )
        return url

    # ── Existence check ──────────────────────────────────────────────────

    @staticmethod
    async def exists(storage_path: str) -> bool:
        client = _get_client()
        if client is None:
            return False
        try:
            client.head_object(Bucket=StorageService.BUCKET, Key=storage_path)
            return True
        except client.exceptions.ClientError:
            return False


# Singleton — import and use directly
storage_service = StorageService()
