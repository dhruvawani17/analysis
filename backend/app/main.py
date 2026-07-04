from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.api.routes import datasets, analysis, qa, ml, reports
from app.db.models import Base
from app.api.deps import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="AI Data Analyst API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(datasets.router, prefix="/api/datasets", tags=["datasets"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["analysis"])
app.include_router(qa.router, prefix="/api/qa", tags=["qa"])
app.include_router(ml.router, prefix="/api/ml", tags=["ml"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])


@app.get("/api/health")
async def health():
    return {"status": "ok"}
