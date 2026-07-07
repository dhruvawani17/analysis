"""
Migration script to transfer data from SQLite to Neon PostgreSQL.

Usage:
    cd backend
    python -m scripts.migrate_sqlite_to_pg

Requires:
    - DATABASE_URL env var pointing to Neon PostgreSQL
    - Existing SQLite database at ./data/analyst.db
"""
import asyncio
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

import aiosqlite
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.config import settings
from app.db.models import Base, Dataset, Conversation, ToolInvocation, Dashboard


async def migrate():
    sqlite_path = Path("./data/analyst.db")
    if not sqlite_path.exists():
        print("No SQLite database found at ./data/analyst.db — nothing to migrate.")
        return

    pg_engine = create_async_engine(settings.database_url, echo=False)
    PgSession = async_sessionmaker(pg_engine, class_=AsyncSession, expire_on_commit=False)

    # Create all tables in PostgreSQL
    async with pg_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Read from SQLite
    async with aiosqlite.connect(str(sqlite_path)) as sqlite_db:
        sqlite_db.row_factory = aiosqlite.Row

        # Migrate Datasets
        async with PgSession() as pg_db:
            cursor = await sqlite_db.execute("SELECT * FROM datasets")
            rows = await cursor.fetchall()
            id_map = {}
            for row in rows:
                old_id = row["id"]
                dataset = Dataset(
                    name=row["name"],
                    file_path=row["file_path"],
                    cleaned_file_path=row["cleaned_file_path"],
                    file_type=row["file_type"],
                    row_count=row["row_count"],
                    column_count=row["column_count"],
                    column_names=json.loads(row["column_names"]) if row["column_names"] else None,
                    dtypes=json.loads(row["dtypes"]) if row["dtypes"] else None,
                    data_quality_report=json.loads(row["data_quality_report"]) if row["data_quality_report"] else None,
                    eda_summary=json.loads(row["eda_summary"]) if row["eda_summary"] else None,
                    ai_summary=row["ai_summary"],
                    file_size_bytes=row["file_size_bytes"],
                    sheets_meta=json.loads(row["sheets_meta"]) if row["sheets_meta"] else None,
                    status="imported",
                    created_at=datetime.fromisoformat(row["created_at"]) if row["created_at"] else datetime.now(timezone.utc),
                )
                pg_db.add(dataset)
                await pg_db.flush()
                id_map[old_id] = dataset.id
            await pg_db.commit()
            print(f"Migrated {len(rows)} datasets")

        # Migrate Conversations
        async with PgSession() as pg_db:
            cursor = await sqlite_db.execute("SELECT * FROM conversations")
            rows = await cursor.fetchall()
            conv_map = {}
            for row in rows:
                old_id = row["id"]
                new_dataset_id = id_map.get(row["dataset_id"])
                if not new_dataset_id:
                    continue
                conv = Conversation(
                    id=row["id"],
                    dataset_id=new_dataset_id,
                    messages=row["messages"] or "[]",
                    created_at=datetime.fromisoformat(row["created_at"]) if row["created_at"] else datetime.now(timezone.utc),
                    updated_at=datetime.fromisoformat(row["updated_at"]) if row["updated_at"] else None,
                )
                pg_db.add(conv)
                await pg_db.flush()
                conv_map[old_id] = conv.id
            await pg_db.commit()
            print(f"Migrated {len(rows)} conversations")

        # Migrate Tool Invocations
        async with PgSession() as pg_db:
            cursor = await sqlite_db.execute("SELECT * FROM tool_invocations")
            rows = await cursor.fetchall()
            for row in rows:
                new_dataset_id = id_map.get(row["dataset_id"])
                if not new_dataset_id:
                    continue
                invocation = ToolInvocation(
                    dataset_id=new_dataset_id,
                    conversation_id=row["conversation_id"],
                    tool_name=row["tool_name"],
                    parameters=json.loads(row["parameters"]) if row["parameters"] else None,
                    result=json.loads(row["result"]) if row["result"] else None,
                    status=row["status"],
                    started_at=datetime.fromisoformat(row["started_at"]) if row["started_at"] else None,
                    completed_at=datetime.fromisoformat(row["completed_at"]) if row["completed_at"] else None,
                )
                pg_db.add(invocation)
            await pg_db.commit()
            print(f"Migrated {len(rows)} tool invocations")

        # Migrate Dashboards
        async with PgSession() as pg_db:
            cursor = await sqlite_db.execute("SELECT * FROM dashboards")
            rows = await cursor.fetchall()
            for row in rows:
                new_dataset_id = id_map.get(row["dataset_id"])
                if not new_dataset_id:
                    continue
                dashboard = Dashboard(
                    dataset_id=new_dataset_id,
                    config=json.loads(row["config"]) if row["config"] else {},
                    created_at=datetime.fromisoformat(row["created_at"]) if row["created_at"] else datetime.now(timezone.utc),
                    updated_at=datetime.fromisoformat(row["updated_at"]) if row["updated_at"] else None,
                )
                pg_db.add(dashboard)
            await pg_db.commit()
            print(f"Migrated {len(rows)} dashboards")

    await pg_engine.dispose()
    print("Migration complete!")


if __name__ == "__main__":
    asyncio.run(migrate())
