from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json

from app.api.deps import get_db, get_dataset_or_404
from app.db.models import Dataset
from app.core.storage import load_dataframe, save_dataframe
from app.services.cleaning import clean_dataset
from app.services.eda import run_eda
from app.services.summary import generate_ai_summary

router = APIRouter()


@router.post("/run/{dataset_id}")
async def run_full_analysis(
    dataset: Dataset = Depends(get_dataset_or_404),
):
    df = load_dataframe(dataset.file_path)

    df_clean, cleaning_report = clean_dataset(df)
    eda_result = run_eda(df_clean)

    try:
        ai_summary = await generate_ai_summary(eda_result)
    except Exception:
        ai_summary = "AI summary generation failed (check LLM provider configuration)."

    return {
        "dataset_id": dataset.id,
        "cleaning": cleaning_report,
        "eda": eda_result,
        "ai_summary": ai_summary,
    }


@router.get("/status/{dataset_id}")
async def analysis_status(
    dataset: Dataset = Depends(get_dataset_or_404),
):
    status = "completed" if dataset.ai_summary else "not_started"
    return {"dataset_id": dataset.id, "status": status}


@router.post("/analyze/{dataset_id}")
async def analyze_dataset(
    dataset: Dataset = Depends(get_dataset_or_404),
    db: AsyncSession = Depends(get_db),
):
    df = load_dataframe(dataset.file_path)

    if dataset.cleaned_file_path:
        df_clean = load_dataframe(dataset.cleaned_file_path)
        cleaning_report = json.loads(dataset.data_quality_report) if dataset.data_quality_report else {}
    else:
        df_clean, cleaning_report = clean_dataset(df)

    eda_result = run_eda(df_clean)

    import uuid
    cleaned_path = save_dataframe(df_clean, f"cleaned_{dataset.id}_{uuid.uuid4().hex[:8]}")

    try:
        ai_summary = await generate_ai_summary(eda_result)
    except Exception:
        ai_summary = "AI summary generation failed (check LLM provider configuration)."

    dataset.data_quality_report = json.dumps(cleaning_report)
    dataset.eda_summary = json.dumps(eda_result)
    dataset.ai_summary = ai_summary
    dataset.cleaned_file_path = str(cleaned_path)
    await db.commit()

    return {
        "id": dataset.id,
        "cleaning": cleaning_report,
        "eda": eda_result,
        "ai_summary": ai_summary,
    }
