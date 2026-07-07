import json
from datetime import datetime
from dataclasses import dataclass, field, asdict
from typing import Any


@dataclass
class Message:
    role: str
    content: str
    timestamp: str = ""
    tool_results: list[dict] = field(default_factory=list)
    suggestions: list[str] = field(default_factory=list)

    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.utcnow().isoformat()


@dataclass
class DatasetContext:
    dataset_id: int
    dataset_name: str = ""
    rows: int = 0
    columns: int = 0
    column_names: list[str] = field(default_factory=list)
    dtypes: dict = field(default_factory=dict)
    cleaned: bool = False
    eda_completed: bool = False
    ml_completed: bool = False
    dashboard_generated: bool = False
    cleaning_report: dict = field(default_factory=dict)
    ml_results: list[dict] = field(default_factory=list)
    key_metrics: dict = field(default_factory=dict)
    tool_history: list[dict] = field(default_factory=list)


class ConversationMemory:
    def __init__(self, db_session):
        self.db = db_session

    async def get_or_create_conversation(self, dataset_id: int) -> str:
        from app.db.models import Conversation
        from sqlalchemy import select

        result = await self.db.execute(
            select(Conversation)
            .where(Conversation.dataset_id == dataset_id)
            .order_by(Conversation.updated_at.desc())
            .limit(1)
        )
        conv = result.scalar_one_or_none()

        if conv:
            return conv.id

        import uuid
        conv_id = str(uuid.uuid4())
        conv = Conversation(id=conv_id, dataset_id=dataset_id, messages="[]")
        self.db.add(conv)
        await self.db.commit()
        return conv_id

    async def get_history(self, conversation_id: str) -> list[Message]:
        from app.db.models import Conversation

        conv = await self.db.get(Conversation, conversation_id)
        if not conv:
            return []

        messages_raw = json.loads(conv.messages)
        return [Message(**m) for m in messages_raw]

    async def save_message(self, conversation_id: str, message: Message):
        from app.db.models import Conversation

        conv = await self.db.get(Conversation, conversation_id)
        if not conv:
            return

        messages = json.loads(conv.messages)
        messages.append(asdict(message))
        conv.messages = json.dumps(messages)
        conv.updated_at = datetime.utcnow()
        await self.db.commit()

    async def get_dataset_context(self, dataset_id: int) -> DatasetContext:
        from app.db.models import Dataset, ToolInvocation
        from sqlalchemy import select

        dataset = await self.db.get(Dataset, dataset_id)
        if not dataset:
            return DatasetContext(dataset_id=dataset_id)

        ctx = DatasetContext(
            dataset_id=dataset_id,
            dataset_name=dataset.name,
            rows=dataset.row_count or 0,
            columns=dataset.column_count or 0,
            column_names=json.loads(dataset.column_names) if isinstance(dataset.column_names, str) else (dataset.column_names or []),
            dtypes=json.loads(dataset.dtypes) if isinstance(dataset.dtypes, str) else (dataset.dtypes or {}),
            cleaned=dataset.cleaned_file_path is not None,
            cleaning_report=json.loads(dataset.data_quality_report) if isinstance(dataset.data_quality_report, str) else (dataset.data_quality_report or {}),
        )

        result = await self.db.execute(
            select(ToolInvocation)
            .where(ToolInvocation.dataset_id == dataset_id)
            .order_by(ToolInvocation.started_at.desc())
            .limit(50)
        )
        invocations = result.scalars().all()

        for inv in invocations:
            ctx.tool_history.append({
                "tool": inv.tool_name,
                "status": inv.status,
                "started_at": inv.started_at.isoformat() if inv.started_at else None,
            })
            if inv.tool_name == "eda" and inv.status == "success":
                ctx.eda_completed = True
            if inv.tool_name == "ml" and inv.status == "success":
                ctx.ml_completed = True
                if inv.result:
                    try:
                        r = json.loads(inv.result)
                        ctx.ml_results.append(r)
                        if r.get("best_model"):
                            ctx.key_metrics["best_model"] = r["best_model"]
                        if r.get("best_score") is not None:
                            ctx.key_metrics["best_score"] = r["best_score"]
                        if r.get("problem_type"):
                            ctx.key_metrics["problem_type"] = r["problem_type"]
                    except json.JSONDecodeError:
                        pass
            if inv.tool_name == "dashboard" and inv.status == "success":
                ctx.dashboard_generated = True

        return ctx
