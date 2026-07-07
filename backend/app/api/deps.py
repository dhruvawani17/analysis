import uuid
from fastapi import Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models import Dataset, Project, User
from app.repositories.user_repository import UserRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.dataset_repository import DatasetRepository
from app.repositories.dashboard_repository import DashboardRepository, ToolInvocationRepository


async def get_user_repository(db: AsyncSession = Depends(get_db)) -> UserRepository:
    return UserRepository(db)


async def get_project_repository(db: AsyncSession = Depends(get_db)) -> ProjectRepository:
    return ProjectRepository(db)


async def get_dataset_repository(db: AsyncSession = Depends(get_db)) -> DatasetRepository:
    return DatasetRepository(db)


async def get_dashboard_repository(db: AsyncSession = Depends(get_db)) -> DashboardRepository:
    return DashboardRepository(db)


async def get_tool_repository(db: AsyncSession = Depends(get_db)) -> ToolInvocationRepository:
    return ToolInvocationRepository(db)


async def get_current_user(request: Request, user_repo: UserRepository = Depends(get_user_repository)) -> User:
    firebase_uid = request.headers.get("X-Firebase-UID")
    if not firebase_uid:
        raise HTTPException(status_code=401, detail="Missing X-Firebase-UID header")
    user = await user_repo.get_by_firebase_uid(firebase_uid)
    if not user:
        user = await user_repo.get_or_create(firebase_uid=firebase_uid)
    return user


async def get_optional_user(request: Request, user_repo: UserRepository = Depends(get_user_repository)) -> User | None:
    firebase_uid = request.headers.get("X-Firebase-UID")
    if not firebase_uid:
        return None
    user = await user_repo.get_by_firebase_uid(firebase_uid)
    if not user:
        user = await user_repo.get_or_create(firebase_uid=firebase_uid)
    return user


async def get_dataset_or_404(
    dataset_id: int,
    dataset_repo: DatasetRepository = Depends(get_dataset_repository),
    user: User = Depends(get_current_user),
) -> Dataset:
    dataset = await dataset_repo.get_by_id_and_user(dataset_id, user.id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset


async def get_project_or_404(
    project_id: uuid.UUID,
    user: User = Depends(get_current_user),
    project_repo: ProjectRepository = Depends(get_project_repository),
) -> Project:
    project = await project_repo.get_by_id_and_user(project_id, user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project
