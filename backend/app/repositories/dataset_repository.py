import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import Dataset


class DatasetRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_by_user(self, user_id: uuid.UUID) -> list[Dataset]:
        result = await self.db.execute(
            select(Dataset).where(Dataset.user_id == user_id).order_by(Dataset.created_at.desc())
        )
        return list(result.scalars().all())

    async def list_all(self) -> list[Dataset]:
        result = await self.db.execute(select(Dataset).order_by(Dataset.created_at.desc()))
        return list(result.scalars().all())

    async def get_by_id(self, dataset_id: int) -> Dataset | None:
        return await self.db.get(Dataset, dataset_id)

    async def get_by_id_and_user(self, dataset_id: int, user_id: uuid.UUID) -> Dataset | None:
        result = await self.db.execute(
            select(Dataset).where(Dataset.id == dataset_id, Dataset.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def create(self, user_id: uuid.UUID, name: str, file_path: str, file_type: str, **kwargs) -> Dataset:
        dataset = Dataset(user_id=user_id, name=name, file_path=file_path, file_type=file_type, **kwargs)
        self.db.add(dataset)
        await self.db.commit()
        await self.db.refresh(dataset)
        return dataset

    async def create_unassigned(self, name: str, file_path: str, file_type: str, **kwargs) -> Dataset:
        dataset = Dataset(name=name, file_path=file_path, file_type=file_type, **kwargs)
        self.db.add(dataset)
        await self.db.commit()
        await self.db.refresh(dataset)
        return dataset

    async def update(self, dataset: Dataset, **kwargs) -> Dataset:
        for key, value in kwargs.items():
            setattr(dataset, key, value)
        await self.db.commit()
        await self.db.refresh(dataset)
        return dataset

    async def delete(self, dataset: Dataset):
        await self.db.delete(dataset)
        await self.db.commit()
