import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Text, Integer, BigInteger, DateTime, Float,
    ForeignKey, Index,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.session import Base


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    firebase_uid = Column(String(255), unique=True, nullable=False, index=True)
    email = Column(String(255), nullable=True)
    name = Column(String(255), nullable=True)
    avatar_url = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    projects = relationship("Project", back_populates="user", cascade="all, delete-orphan")


class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="projects")
    datasets = relationship("Dataset", back_populates="project", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="project", cascade="all, delete-orphan")

    __table_args__ = (Index("ix_projects_user_created", "user_id", "created_at"),)


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(255), nullable=False)

    # ── Storage paths (Firebase Storage paths, never exposed to frontend) ──
    file_path = Column(String(1024), nullable=False)                         # parquet in Firebase
    cleaned_file_path = Column(String(1024), nullable=True)                 # cleaned parquet in Firebase

    # ── Original file metadata ─────────────────────────────────────────────
    original_filename = Column(String(512), nullable=True)                  # e.g. "sales.xlsx"
    mime_type = Column(String(255), nullable=True)                           # e.g. "application/vnd.openxmlformats..."
    original_file_path = Column(String(1024), nullable=True)                # original file in Firebase (for re-download)

    # ── Dataset metadata ───────────────────────────────────────────────────
    file_type = Column(String(16), nullable=False)                           # csv, xlsx, json, parquet
    row_count = Column(Integer, nullable=True)
    column_count = Column(Integer, nullable=True)
    column_names = Column(JSONB, nullable=True)
    dtypes = Column(JSONB, nullable=True)
    sheet_count = Column(Integer, default=1)
    data_quality_report = Column(JSONB, nullable=True)
    eda_summary = Column(JSONB, nullable=True)
    ai_summary = Column(Text, nullable=True)
    file_size_bytes = Column(BigInteger, nullable=True)
    sheets_meta = Column(JSONB, nullable=True)                              # per-sheet parquet paths
    status = Column(String(50), default="imported")
    uploaded_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    project = relationship("Project", back_populates="datasets")
    cleaning_jobs = relationship("CleaningJob", back_populates="dataset", cascade="all, delete-orphan")
    eda_reports = relationship("EDATReport", back_populates="dataset", cascade="all, delete-orphan")
    ml_models = relationship("MLModel", back_populates="dataset", cascade="all, delete-orphan")
    dashboards = relationship("Dashboard", back_populates="dataset", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="dataset", cascade="all, delete-orphan")
    tool_invocations = relationship("ToolInvocation", back_populates="dataset", cascade="all, delete-orphan")

    __table_args__ = (Index("ix_datasets_user_created", "user_id", "created_at"),)


class CleaningJob(Base):
    __tablename__ = "cleaning_jobs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    progress = Column(Float, default=0.0)
    status = Column(String(50), default="pending")
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    dataset = relationship("Dataset", back_populates="cleaning_jobs")


class EDATReport(Base):
    __tablename__ = "eda_reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    report_json = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    dataset = relationship("Dataset", back_populates="eda_reports")


class MLModel(Base):
    __tablename__ = "ml_models"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    algorithm = Column(String(100), nullable=True)
    accuracy = Column(Float, nullable=True)
    metrics_json = Column(JSONB, nullable=True)
    model_storage_path = Column(String(1024), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    dataset = relationship("Dataset", back_populates="ml_models")


class Dashboard(Base):
    __tablename__ = "dashboards"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    config = Column(JSONB, nullable=False, default={})
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    dataset = relationship("Dataset", back_populates="dashboards")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False)
    message = Column(Text, nullable=False)
    timestamp = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    project = relationship("Project", back_populates="chat_messages")

    __table_args__ = (Index("ix_chat_messages_project_time", "project_id", "timestamp"),)


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    report_type = Column(String(50), nullable=True)
    storage_path = Column(String(1024), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    dataset = relationship("Dataset", back_populates="reports")


class ToolInvocation(Base):
    __tablename__ = "tool_invocations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    conversation_id = Column(String(255), nullable=True)
    tool_name = Column(String(100), nullable=False)
    parameters = Column(JSONB, nullable=True)
    result = Column(JSONB, nullable=True)
    status = Column(String(20), default="running")
    started_at = Column(DateTime(timezone=True), default=utcnow)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    dataset = relationship("Dataset", back_populates="tool_invocations")


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(255), primary_key=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    messages = Column(JSONB, nullable=False, default=list)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
