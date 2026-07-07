from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
import json

from app.api.deps import get_db, get_dataset_or_404, get_current_user
from app.db.models import Dataset, Conversation, ToolInvocation, User

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None


class PlanRequest(BaseModel):
    pass


class RunPlanRequest(BaseModel):
    tools: list[str] | None = None


@router.post("/chat/{dataset_id}")
async def copilot_chat(
    body: ChatRequest,
    dataset_id: int,
    dataset: Dataset = Depends(get_dataset_or_404),
    db: AsyncSession = Depends(get_db),
):
    from app.copilot.brain import CopilotBrain

    brain = CopilotBrain(db)
    result = await brain.process(
        message=body.message,
        dataset_id=dataset.id,
        conversation_id=body.conversation_id,
    )
    return result


@router.get("/context/{dataset_id}")
async def get_context(
    dataset: Dataset = Depends(get_dataset_or_404),
    db: AsyncSession = Depends(get_db),
):
    from app.copilot.memory import ConversationMemory

    memory = ConversationMemory(db)
    ctx = await memory.get_dataset_context(dataset.id)
    return {
        "dataset_id": ctx.dataset_id,
        "dataset_name": ctx.dataset_name,
        "rows": ctx.rows,
        "columns": ctx.columns,
        "column_names": ctx.column_names,
        "dtypes": ctx.dtypes,
        "cleaned": ctx.cleaned,
        "eda_completed": ctx.eda_completed,
        "ml_completed": ctx.ml_completed,
        "dashboard_generated": ctx.dashboard_generated,
        "key_metrics": ctx.key_metrics,
        "tool_history": ctx.tool_history,
    }


@router.get("/history/{dataset_id}")
async def get_history(
    dataset: Dataset = Depends(get_dataset_or_404),
    db: AsyncSession = Depends(get_db),
):
    from app.copilot.memory import ConversationMemory

    memory = ConversationMemory(db)
    conv_id = await memory.get_or_create_conversation(dataset.id)
    history = await memory.get_history(conv_id)

    return {
        "conversation_id": conv_id,
        "messages": [
            {
                "role": m.role,
                "content": m.content,
                "timestamp": m.timestamp,
                "tool_results": m.tool_results,
                "suggestions": m.suggestions,
            }
            for m in history
        ],
    }


@router.delete("/history/{dataset_id}")
async def clear_history(
    dataset: Dataset = Depends(get_dataset_or_404),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import delete

    await db.execute(
        delete(Conversation).where(Conversation.dataset_id == dataset.id)
    )
    await db.execute(
        delete(ToolInvocation).where(ToolInvocation.dataset_id == dataset.id)
    )
    await db.commit()
    return {"status": "cleared"}


@router.post("/plan/{dataset_id}")
async def create_plan(
    dataset: Dataset = Depends(get_dataset_or_404),
    db: AsyncSession = Depends(get_db),
):
    from app.copilot.brain import CopilotBrain

    brain = CopilotBrain(db)
    ctx = await brain.memory.get_dataset_context(dataset.id)
    plan = await brain._create_plan(dataset.id, ctx)

    return {
        "dataset_summary": plan.dataset_summary,
        "issues": plan.issues,
        "opportunities": plan.opportunities,
        "steps": [
            {
                "tool": s.tool,
                "reason": s.reason,
                "time_estimate": s.time_estimate,
                "params": s.params,
            }
            for s in plan.steps
        ],
        "total_time_estimate": plan.total_time_estimate,
    }


@router.post("/run-plan/{dataset_id}")
async def run_plan(
    body: RunPlanRequest,
    dataset: Dataset = Depends(get_dataset_or_404),
    db: AsyncSession = Depends(get_db),
):
    from app.copilot.brain import CopilotBrain

    brain = CopilotBrain(db)
    ctx = await brain.memory.get_dataset_context(dataset.id)
    plan = await brain._create_plan(dataset.id, ctx)

    if body.tools:
        plan.steps = [s for s in plan.steps if s.tool in body.tools]

    conversation_id = await brain.memory.get_or_create_conversation(dataset.id)
    results = await brain._execute_plan(plan, dataset.id, conversation_id)

    return {
        "conversation_id": conversation_id,
        "results": [r.to_dict() for r in results],
        "summary": brain._format_execution_results(results),
    }


@router.get("/tools")
async def list_tools():
    from app.copilot.tools import list_tools_by_category

    categories = list_tools_by_category()
    return {
        "categories": {
            cat: [
                {
                    "name": t.name,
                    "description": t.description,
                    "category": t.category,
                    "estimated_time": t.estimated_time,
                }
                for t in tools
            ]
            for cat, tools in categories.items()
        }
    }
