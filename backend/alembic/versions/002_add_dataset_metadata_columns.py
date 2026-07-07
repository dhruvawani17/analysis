"""add_dataset_metadata_columns

Revision ID: 002
Revises: 001
Create Date: 2026-07-07
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("datasets", sa.Column("original_filename", sa.String(512), nullable=True))
    op.add_column("datasets", sa.Column("mime_type", sa.String(255), nullable=True))
    op.add_column("datasets", sa.Column("original_file_path", sa.String(1024), nullable=True))
    op.add_column("datasets", sa.Column("sheet_count", sa.Integer, server_default="1"))
    op.add_column("datasets", sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=True))

    # Widen existing path columns
    op.alter_column("datasets", "file_path", type_=sa.String(1024))
    op.alter_column("datasets", "cleaned_file_path", type_=sa.String(1024))
    op.alter_column("ml_models", "model_storage_path", type_=sa.String(1024))
    op.alter_column("reports", "storage_path", type_=sa.String(1024))

    # Backfill uploaded_at from created_at
    op.execute("UPDATE datasets SET uploaded_at = created_at WHERE uploaded_at IS NULL")
    op.alter_column("datasets", "uploaded_at", nullable=False, server_default=sa.text("now()"))


def downgrade() -> None:
    op.drop_column("datasets", "uploaded_at")
    op.drop_column("datasets", "sheet_count")
    op.drop_column("datasets", "original_file_path")
    op.drop_column("datasets", "mime_type")
    op.drop_column("datasets", "original_filename")

    op.alter_column("datasets", "file_path", type_=sa.String(512))
    op.alter_column("datasets", "cleaned_file_path", type_=sa.String(512))
    op.alter_column("ml_models", "model_storage_path", type_=sa.String(512))
    op.alter_column("reports", "storage_path", type_=sa.String(512))
