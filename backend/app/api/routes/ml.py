from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.api.deps import get_dataset_or_404
from app.db.models import Dataset
from app.core.storage import load_dataframe
from app.services.ml import train_and_evaluate
from app.services.utils import get_id_columns

router = APIRouter()


class MLRequest(BaseModel):
    target_column: str


@router.post("/train/{dataset_id}")
async def train_models(
    body: MLRequest,
    dataset: Dataset = Depends(get_dataset_or_404),
):
    if not body.target_column:
        raise HTTPException(status_code=400, detail="target_column is required")

    df = load_dataframe(dataset.file_path)
    if body.target_column not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column '{body.target_column}' not found in dataset")

    result = await train_and_evaluate(df, body.target_column)
    return result


@router.get("/columns/{dataset_id}")
async def get_columns(
    dataset: Dataset = Depends(get_dataset_or_404),
):
    df = load_dataframe(dataset.file_path)
    id_cols = get_id_columns(df)
    eligible = []
    for c in df.columns:
        if c in id_cols:
            continue
        if df[c].nunique() < 2:
            continue
        dtype = str(df[c].dtype)
        unique = df[c].nunique()
        if "object" in dtype or "category" in dtype:
            if unique <= 50:
                eligible.append({"name": c, "dtype": "object", "unique": unique, "problem_type": "classification"})
        elif "int" in dtype:
            pt = "classification" if unique <= 10 else "regression"
            eligible.append({"name": c, "dtype": "int", "unique": unique, "problem_type": pt})
        elif "float" in dtype:
            eligible.append({"name": c, "dtype": "float", "unique": unique, "problem_type": "regression"})
    return {
        "eligible_columns": eligible,
        "excluded_columns": id_cols,
        "all_columns": list(df.columns),
        "dtypes": {c: str(t) for c, t in df.dtypes.items()},
    }
