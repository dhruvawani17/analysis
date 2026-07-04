import json
from app.core.storage import load_dataframe
from app.services.cleaning import clean_dataset
from app.services.eda import run_eda
from app.services.summary import generate_ai_summary


async def cleaning_node(state: dict) -> dict:
    dataset_id = state["dataset_id"]
    from app.db.models import Dataset
    from app.api.deps import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        dataset = await db.get(Dataset, dataset_id)
        if not dataset:
            return {"error": "Dataset not found", "cleaning_result": None}

        df = load_dataframe(dataset.file_path)
        df_clean, report = clean_dataset(df)

        dataset.data_quality_report = json.dumps(report)
        await db.commit()

    return {
        "cleaning_result": report,
        "df_path": dataset.file_path,
    }


async def eda_node(state: dict) -> dict:
    dataset_id = state["dataset_id"]
    df_path = state.get("df_path", "")
    from app.db.models import Dataset
    from app.api.deps import AsyncSessionLocal

    df = load_dataframe(df_path)
    result = run_eda(df)

    async with AsyncSessionLocal() as db:
        dataset = await db.get(Dataset, dataset_id)
        if dataset:
            dataset.eda_summary = json.dumps(result)
            await db.commit()

    return {"eda_result": result}


async def qa_node(state: dict) -> dict:
    return {"qa_results": []}


async def ml_node(state: dict) -> dict:
    return {"ml_result": None}


async def report_node(state: dict) -> dict:
    dataset_id = state["dataset_id"]
    from app.db.models import Dataset
    from app.api.deps import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        dataset = await db.get(Dataset, dataset_id)
        ai_summary = dataset.ai_summary if dataset else None

    if state.get("eda_result") and ai_summary is None:
        try:
            ai_summary = await generate_ai_summary(state["eda_result"])
        except Exception:
            ai_summary = "AI summary unavailable."

    summary = ""
    eda = state.get("eda_result", {})
    if eda:
        shape = eda.get("shape", [0, 0])
        summary = f"Dataset has {shape[0]} rows and {shape[1]} columns."

    return {"report": summary}
