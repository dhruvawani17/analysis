from pydantic import BaseModel
from typing import Any


class DatasetSummary(BaseModel):
    id: int
    name: str
    rows: int | None = None
    columns: int | None = None
    column_names: list[str] = []
    dtypes: dict[str, str] = {}


class QuestionRequest(BaseModel):
    question: str


class QuestionResponse(BaseModel):
    answer: str
    pandas_code: str | None = None
    chart_json: dict[str, Any] | None = None


class MLRequest(BaseModel):
    target_column: str
    problem_type: str | None = None


class MLResult(BaseModel):
    problem_type: str
    best_model: str
    metrics: dict[str, float]
    all_results: list[dict[str, Any]] = []


class AnalysisProgress(BaseModel):
    dataset_id: int
    stage: str
    status: str
    message: str = ""
