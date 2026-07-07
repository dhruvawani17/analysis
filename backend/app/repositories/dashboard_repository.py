import uuid
import json
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import Dashboard, ToolInvocation


class DashboardRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_latest_by_dataset(self, dataset_id: uuid.UUID) -> Dashboard | None:
        result = await self.db.execute(
            select(Dashboard).where(Dashboard.dataset_id == dataset_id).order_by(Dashboard.updated_at.desc()).limit(1)
        )
        return result.scalar_one_or_none()

    async def create_or_update(self, dataset_id: uuid.UUID, config: dict) -> Dashboard:
        existing = await self.get_latest_by_dataset(dataset_id)
        if existing:
            existing.dashboard_json = config
            self.db.add(existing)
            await self.db.commit()
            await self.db.refresh(existing)
            return existing
        dashboard = Dashboard(dataset_id=dataset_id, dashboard_json=config)
        self.db.add(dashboard)
        await self.db.commit()
        await self.db.refresh(dashboard)
        return dashboard


class ToolInvocationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_latest_ml_by_dataset(self, dataset_id: uuid.UUID) -> ToolInvocation | None:
        result = await self.db.execute(
            select(ToolInvocation)
            .where(
                ToolInvocation.dataset_id == dataset_id,
                ToolInvocation.tool_name == "ml",
                ToolInvocation.status == "success",
            )
            .order_by(ToolInvocation.completed_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def create(self, dataset_id: uuid.UUID, tool_name: str, parameters: dict = None, conversation_id: str = None) -> ToolInvocation:
        invocation = ToolInvocation(
            dataset_id=dataset_id,
            tool_name=tool_name,
            parameters=parameters,
            conversation_id=conversation_id,
        )
        self.db.add(invocation)
        await self.db.commit()
        await self.db.refresh(invocation)
        return invocation

    async def update_result(self, invocation: ToolInvocation, result: dict, status: str = "success") -> ToolInvocation:
        invocation.result = result
        invocation.status = status
        from datetime import datetime, timezone
        invocation.completed_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(invocation)
        return invocation

    async def delete_by_dataset(self, dataset_id: uuid.UUID):
        from sqlalchemy import delete
        await self.db.execute(delete(ToolInvocation).where(ToolInvocation.dataset_id == dataset_id))
        await self.db.commit()

    async def delete_by_conversation(self, dataset_id: uuid.UUID):
        from sqlalchemy import delete
        await self.db.execute(
            delete(ToolInvocation).where(ToolInvocation.dataset_id == dataset_id)
        )
        await self.db.commit()
