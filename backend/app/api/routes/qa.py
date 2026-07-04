from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.api.deps import get_dataset_or_404
from app.db.models import Dataset
from app.services.qa import ask_question

router = APIRouter()


class QuestionRequest(BaseModel):
    question: str


class QuestionResponse(BaseModel):
    answer: str
    code: str | None = None
    chart_json: dict | None = None


@router.post("/ask/{dataset_id}")
async def ask_question_endpoint(
    body: QuestionRequest,
    dataset: Dataset = Depends(get_dataset_or_404),
):
    if not body.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    result = await ask_question(dataset.file_path, body.question)
    return QuestionResponse(
        answer=result["answer"],
        code=result.get("code"),
        chart_json=result.get("chart_json"),
    )
