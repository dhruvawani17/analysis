from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.routes import datasets, analysis, qa, ml, reports, copilot, dashboard, speech
from app.db.models import Base
from app.db.session import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
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
app.include_router(copilot.router, prefix="/api/copilot", tags=["copilot"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(speech.router, prefix="/api/speech", tags=["speech"])


@app.get("/api/health")
async def health():
    return {"status": "ok"}
