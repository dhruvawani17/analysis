import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import User


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_firebase_uid(self, firebase_uid: str) -> User | None:
        result = await self.db.execute(select(User).where(User.firebase_uid == firebase_uid))
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        return await self.db.get(User, user_id)

    async def create(self, firebase_uid: str, email: str = None, name: str = None, avatar_url: str = None) -> User:
        user = User(firebase_uid=firebase_uid, email=email, name=name, avatar_url=avatar_url)
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def get_or_create(self, firebase_uid: str, email: str = None, name: str = None, avatar_url: str = None) -> User:
        user = await self.get_by_firebase_uid(firebase_uid)
        if not user:
            user = await self.create(firebase_uid, email, name, avatar_url)
        return user

    async def update(self, user: User, **kwargs) -> User:
        for key, value in kwargs.items():
            if value is not None:
                setattr(user, key, value)
        await self.db.commit()
        await self.db.refresh(user)
        return user
