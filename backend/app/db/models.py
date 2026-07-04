from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, BigInteger
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    cleaned_file_path = Column(String(512), nullable=True)
    file_type = Column(String(16), nullable=False)  # csv, xlsx, json
    row_count = Column(Integer, nullable=True)
    column_count = Column(Integer, nullable=True)
    column_names = Column(Text, nullable=True)  # JSON list
    dtypes = Column(Text, nullable=True)  # JSON dict
    data_quality_report = Column(Text, nullable=True)  # JSON
    eda_summary = Column(Text, nullable=True)  # JSON
    ai_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    file_size_bytes = Column(BigInteger, nullable=True)
