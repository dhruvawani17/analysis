import json
from datetime import datetime
from dataclasses import asdict

from app.llm.factory import get_llm_provider
from app.copilot.memory import ConversationMemory, DatasetContext
from app.copilot.planner import AgentPlanner, AnalysisPlan
from app.copilot.proactor import ProactiveInsights
from app.copilot.tools import ToolResult
from app.core.storage import load_dataframe
from app.db.models import ToolInvocation


class CopilotBrain:
    def __init__(self, db_session):
        self.db = db_session
        self.memory = ConversationMemory(db_session)
        self.planner = AgentPlanner()
        self.proactor = ProactiveInsights()

    async def process(self, message: str, dataset_id: int, conversation_id: str = None) -> dict:
        if not conversation_id:
            conversation_id = await self.memory.get_or_create_conversation(dataset_id)

        from app.copilot.memory import Message
        user_msg = Message(role="user", content=message)
        await self.memory.save_message(conversation_id, user_msg)

        ctx = await self.memory.get_dataset_context(dataset_id)

        intent = await self._classify_intent(message, ctx)

        tool_results = []
        if intent.get("action") == "plan":
            plan = await self._create_plan(dataset_id, ctx)
            response_text = self._format_plan(plan)
            suggestions = [f"Run {step.tool}" for step in plan.steps[:3]]
        elif intent.get("action") == "run_all":
            plan = await self._create_plan(dataset_id, ctx)
            tool_results = await self._execute_plan(plan, dataset_id, conversation_id)
            response_text = self._format_execution_results(tool_results)
            suggestions = self._generate_suggestions(tool_results, ctx)
        elif intent.get("action") == "invoke_tool":
            tool_name = intent.get("tool", "")
            params = intent.get("params", {})
            result = await self._invoke_single_tool(tool_name, dataset_id, params, conversation_id)
            tool_results = [result]
            response_text = self._format_tool_result(result)
            suggestions = self._generate_suggestions(tool_results, ctx)
        elif intent.get("action") == "chat":
            response_text = await self._chat_response(message, ctx)
            suggestions = self._get_contextual_suggestions(ctx)
        else:
            response_text = await self._chat_response(message, ctx)
            suggestions = self._get_contextual_suggestions(ctx)

        assistant_msg = Message(
            role="assistant",
            content=response_text,
            tool_results=[r.to_dict() for r in tool_results] if tool_results else [],
            suggestions=suggestions,
        )
        await self.memory.save_message(conversation_id, assistant_msg)

        proactive = []
        for tr in tool_results:
            insights = await self.proactor.scan_after_tool(tr.tool, tr.to_dict(), asdict(ctx))
            proactive.extend(insights)

        return {
            "response": response_text,
            "conversation_id": conversation_id,
            "tool_results": [r.to_dict() for r in tool_results],
            "suggestions": suggestions,
            "proactive_insights": [{"type": i.type, "message": i.message, "suggestion": i.suggestion, "confidence": i.confidence} for i in proactive],
            "context": {
                "dataset_name": ctx.dataset_name,
                "cleaned": ctx.cleaned,
                "eda_completed": ctx.eda_completed,
                "ml_completed": ctx.ml_completed,
                "dashboard_generated": ctx.dashboard_generated,
                "key_metrics": ctx.key_metrics,
            },
        }

    async def _classify_intent(self, message: str, ctx: DatasetContext) -> dict:
        llm = get_llm_provider()

        tools_list = [
            "cleaning", "eda", "summary", "qa", "business", "story",
            "dashboard", "timeseries", "ml", "optimizer", "notebook",
            "deploy", "edit", "report", "workflow",
        ]

        context_str = f"Dataset: {ctx.dataset_name}, Cleaned: {ctx.cleaned}, EDA: {ctx.eda_completed}, ML: {ctx.ml_completed}"

        prompt = f"""Classify the user's intent. Current context: {context_str}

User message: "{message}"

Available tools: {', '.join(tools_list)}

Return JSON with:
- "action": one of "invoke_tool", "plan", "run_all", "chat"
- "tool": tool name if action is "invoke_tool" (or null)
- "params": parameters for the tool (or {{}})

Examples:
- "clean my data" -> {{"action": "invoke_tool", "tool": "cleaning", "params": {{}}}}
- "analyze my data" -> {{"action": "plan"}}
- "run everything" -> {{"action": "run_all"}}
- "what is the average age?" -> {{"action": "invoke_tool", "tool": "qa", "params": {{"question": "what is the average age?"}}}}
- "train a model to predict price" -> {{"action": "invoke_tool", "tool": "ml", "params": {{"target_column": "price"}}}}
- "generate a dashboard" -> {{"action": "invoke_tool", "tool": "dashboard", "params": {{}}}}
- "hello" -> {{"action": "chat"}}

Return ONLY valid JSON."""

        try:
            response = await llm.chat([
                {"role": "system", "content": "You are an intent classifier. Always respond with valid JSON only."},
                {"role": "user", "content": prompt},
            ])

            from app.services.ml import _parse_llm_json
            parsed = _parse_llm_json(response)
            if parsed and "action" in parsed:
                return parsed
        except Exception:
            pass

        lower = message.lower().strip()
        if any(w in lower for w in ["clean", "fix", "missing", "duplicates"]):
            return {"action": "invoke_tool", "tool": "cleaning", "params": {}}
        if any(w in lower for w in ["eda", "explore", "statistics", "stats", "analyze"]):
            if "analyze" in lower and "data" in lower:
                return {"action": "plan"}
            return {"action": "invoke_tool", "tool": "eda", "params": {}}
        if any(w in lower for w in ["summary", "summarize", "overview"]):
            return {"action": "invoke_tool", "tool": "summary", "params": {}}
        if any(w in lower for w in ["dashboard", "kpi", "monitor"]):
            return {"action": "invoke_tool", "tool": "dashboard", "params": {}}
        if any(w in lower for w in ["train", "model", "ml", "predict"]):
            return {"action": "invoke_tool", "tool": "ml", "params": {}}
        if any(w in lower for w in ["business", "insights", "risks", "opportunities"]):
            return {"action": "invoke_tool", "tool": "business", "params": {}}
        if any(w in lower for w in ["story", "narrative", "report"]):
            return {"action": "invoke_tool", "tool": "story", "params": {}}
        if any(w in lower for w in ["forecast", "time", "trend", "timeseries"]):
            return {"action": "invoke_tool", "tool": "timeseries", "params": {}}
        if any(w in lower for w in ["notebook", "jupyter"]):
            return {"action": "invoke_tool", "tool": "notebook", "params": {}}
        if any(w in lower for w in ["deploy", "export", "api", "docker"]):
            return {"action": "invoke_tool", "tool": "deploy", "params": {}}
        if any(w in lower for w in ["plan", "what should"]):
            return {"action": "plan"}
        if any(w in lower for w in ["run all", "run everything", "do everything"]):
            return {"action": "run_all"}

        return {"action": "chat"}

    async def _create_plan(self, dataset_id: int, ctx: DatasetContext) -> AnalysisPlan:
        df = self._load_df(dataset_id)
        return await self.planner.analyze_and_plan(df, ctx.dataset_name)

    async def _execute_plan(self, plan: AnalysisPlan, dataset_id: int, conversation_id: str) -> list[ToolResult]:
        df = self._load_df(dataset_id)
        results = []

        for step in plan.steps:
            result = await self._invoke_single_tool(step.tool, dataset_id, step.params, conversation_id)
            results.append(result)

            if result.status == "success" and result.data:
                self._save_tool_result(dataset_id, step.tool, step.params, result, conversation_id)

        return results

    async def _invoke_single_tool(self, tool_name: str, dataset_id: int, params: dict, conversation_id: str) -> ToolResult:
        df = self._load_df(dataset_id)

        from app.tools.preprocessing import cleaning_tool, eda_tool, summary_tool
        from app.tools.analysis import business_tool, story_tool, notebook_tool
        from app.tools.advanced import dashboard_tool, timeseries_tool, edit_tool, deploy_tool

        async def ml_tool(dataset_id, df, params):
            from app.copilot.tools import ToolResult as TR
            from app.services.ml import train_and_evaluate
            target = (params or {}).get("target_column", "")
            if not target:
                num_cols = df.select_dtypes(include=["number"]).columns.tolist()
                id_cols = [c for c in num_cols if "id" in c.lower()]
                num_cols = [c for c in num_cols if c not in id_cols]
                if num_cols:
                    target = num_cols[-1]
                else:
                    return TR(tool="ml", status="error", summary="No numeric target column found", confidence=0)
            result = await train_and_evaluate(df, target)
            best = result.get("best_model", "")
            score = result.get("best_score", 0)
            what_changed = [
                f"Trained {len(result.get('all_results', []))} models",
                f"Best model: {best} ({result.get('problem_type', '')})",
                f"Score: {score:.4f}" if score else "Score: N/A",
                f"Features: {result.get('num_features', 0)}",
                f"Samples: {result.get('num_samples', 0)}",
            ]
            suggestions = []
            if score and score < 0.7:
                suggestions.append("Try feature engineering or the Pipeline Optimizer for better results")
            suggestions.append("Deploy this model as a REST API or Docker container")
            return TR(
                tool="ml", status="success",
                summary=f"Trained models: {best} achieved {score:.1%} on {result.get('problem_type', 'unknown')}",
                what_changed=what_changed,
                why="ML models reveal predictive patterns in the data.",
                expected_impact=f"Best model can predict with {score:.1%} accuracy" if score else "Model training complete",
                confidence=0.85,
                suggestions=suggestions,
                data=result,
            )

        async def optimizer_tool(dataset_id, df, params):
            from app.copilot.tools import ToolResult as TR
            target = (params or {}).get("target_column", "")
            if not target:
                return TR(tool="optimizer", status="error", summary="Target column required for optimization", confidence=0)
            from app.services.ml import generate_data_improvements, apply_data_improvements, detect_feature_engineering
            improvements = await generate_data_improvements(df, target)
            df_improved, applied = apply_data_improvements(df, target, improvements)
            fe_opts = detect_feature_engineering(df_improved, target)
            suggestions = improvements.get("suggestions", [])
            what_changed = [f"Applied {len(applied)} data improvements"] + applied[:5]
            if fe_opts.get("_reasons"):
                what_changed.extend(fe_opts["_reasons"])
            return TR(
                tool="optimizer", status="success",
                summary=f"Pipeline optimization: {len(applied)} improvements applied, {len(fe_opts.get('_reasons', []))} feature engineering suggestions",
                what_changed=what_changed,
                why="Optimized preprocessing and feature engineering improve model performance.",
                expected_impact="Model accuracy should improve with optimized pipeline",
                confidence=0.8,
                suggestions=["Re-train ML models with the optimized data", "Compare before/after performance"],
                data={"improvements": improvements, "feature_engineering": fe_opts, "applied": applied},
            )

        async def qa_tool(dataset_id, df, params):
            from app.copilot.tools import ToolResult as TR
            question = (params or {}).get("question", "")
            if not question:
                return TR(tool="qa", status="error", summary="No question provided", confidence=0)
            return TR(
                tool="qa", status="success",
                summary=f"Q&A: {question}",
                what_changed=[f"Processed question: {question}"],
                why="Natural language Q&A makes data accessible to everyone.",
                confidence=0.75,
                data={"question": question, "note": "Use the dedicated Q&A page for full interactive Q&A with code and charts"},
            )

        async def report_tool(dataset_id, df, params):
            from app.copilot.tools import ToolResult as TR
            from app.services.eda import run_eda
            from app.services.reports import generate_html_report
            from app.db.models import Dataset

            dataset = await self.db.get(Dataset, dataset_id)
            eda_result = run_eda(df)
            cleaning = json.loads(dataset.data_quality_report) if dataset.data_quality_report else None
            summary = {
                "rows": len(df),
                "columns": len(df.columns),
                "numeric_columns": len(eda_result.get("numeric_columns", [])),
                "categorical_columns": len(eda_result.get("categorical_columns", [])),
                "missing_total": sum(eda_result.get("missing_summary", {}).values()),
            }
            html = await generate_html_report(
                dataset_name=dataset.name,
                summary=summary,
                cleaning=cleaning,
                charts=eda_result.get("charts"),
                ai_summary=dataset.ai_summary,
                df=df,
                eda_result=eda_result,
            )
            return TR(
                tool="report", status="success",
                summary=f"Generated HTML report for {dataset.name}",
                what_changed=["Created comprehensive HTML report with charts and analysis"],
                why="Reports provide shareable, downloadable analysis documents.",
                expected_impact="Report can be viewed in browser or downloaded as PDF",
                confidence=0.9,
                suggestions=["Download as PDF for sharing"],
                data={"html": html, "filename": f"report_{dataset.id}.html", "dataset_id": dataset.id},
            )

        async def workflow_tool(dataset_id, df, params):
            from app.copilot.tools import ToolResult as TR
            return TR(
                tool="workflow", status="success",
                summary="Workflow builder coming soon",
                what_changed=[],
                why="Workflows allow saving and re-running analysis pipelines.",
                confidence=0.5,
                suggestions=["Use 'run everything' to execute a full analysis plan"],
            )

        tool_map = {
            "cleaning": cleaning_tool,
            "eda": eda_tool,
            "summary": summary_tool,
            "ml": ml_tool,
            "optimizer": optimizer_tool,
            "qa": qa_tool,
            "report": report_tool,
            "workflow": workflow_tool,
            "business": business_tool,
            "story": story_tool,
            "notebook": notebook_tool,
            "dashboard": dashboard_tool,
            "timeseries": timeseries_tool,
            "edit": edit_tool,
            "deploy": deploy_tool,
        }

        tool_fn = tool_map.get(tool_name)
        if not tool_fn:
            return ToolResult(
                tool=tool_name,
                status="error",
                summary=f"Unknown tool: {tool_name}",
                confidence=0,
            )

        invocation = ToolInvocation(
            dataset_id=dataset_id,
            conversation_id=conversation_id,
            tool_name=tool_name,
            parameters=json.dumps(params),
            status="running",
        )
        self.db.add(invocation)
        await self.db.commit()

        try:
            result = await tool_fn(dataset_id, df, params)
            invocation.status = result.status
            invocation.result = json.dumps(result.to_dict(), default=str)
            invocation.completed_at = datetime.utcnow()
            await self.db.commit()
            return result
        except Exception as e:
            invocation.status = "error"
            invocation.result = json.dumps({"error": str(e)})
            invocation.completed_at = datetime.utcnow()
            await self.db.commit()
            return ToolResult(
                tool=tool_name,
                status="error",
                summary=f"Tool execution failed: {str(e)}",
                confidence=0,
            )

    def _save_tool_result(self, dataset_id: int, tool_name: str, params: dict, result: ToolResult, conversation_id: str):
        invocation = ToolInvocation(
            dataset_id=dataset_id,
            conversation_id=conversation_id,
            tool_name=tool_name,
            parameters=json.dumps(params),
            result=json.dumps(result.to_dict(), default=str),
            status=result.status,
            completed_at=datetime.utcnow(),
        )
        self.db.add(invocation)

    def _load_df(self, dataset_id: int):
        import asyncio
        from app.db.models import Dataset

        async def _get():
            dataset = await self.db.get(Dataset, dataset_id)
            if not dataset:
                raise ValueError(f"Dataset {dataset_id} not found")
            source = dataset.cleaned_file_path or dataset.file_path
            return load_dataframe(source)

        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                future = pool.submit(asyncio.run, _get())
                return future.result()
        else:
            return asyncio.run(_get())

    def _format_plan(self, plan: AnalysisPlan) -> str:
        lines = [f"## Analysis Plan for Dataset"]
        lines.append(f"\n{plan.dataset_summary}\n")

        if plan.issues:
            lines.append("### Issues Found")
            for issue in plan.issues:
                severity_icon = {"high": "🔴", "medium": "🟡", "low": "🟢"}.get(issue["severity"], "⚪")
                lines.append(f"- {severity_icon} {issue['message']}")
            lines.append("")

        if plan.opportunities:
            lines.append("### Opportunities")
            for opp in plan.opportunities:
                lines.append(f"- 💡 {opp['message']}")
            lines.append("")

        lines.append("### Proposed Steps")
        for i, step in enumerate(plan.steps, 1):
            lines.append(f"{i}. **{step.tool.title()}** — {step.reason} (~{step.time_estimate}s)")

        lines.append(f"\n**Total estimated time: ~{plan.total_time_estimate} seconds**")
        lines.append("\nSay **\"run everything\"** to execute all steps, or ask me to run specific tools.")

        return "\n".join(lines)

    def _format_execution_results(self, results: list[ToolResult]) -> str:
        lines = ["## Execution Complete\n"]

        for i, r in enumerate(results, 1):
            status_icon = "✅" if r.status == "success" else "❌"
            lines.append(f"### {i}. {r.tool.title()} {status_icon}")
            lines.append(f"{r.summary}")

            if r.what_changed:
                lines.append("\n**What changed:**")
                for change in r.what_changed:
                    lines.append(f"- {change}")

            if r.why:
                lines.append(f"\n**Why:** {r.why}")

            if r.expected_impact:
                lines.append(f"\n**Expected impact:** {r.expected_impact}")

            if r.suggestions:
                lines.append("\n**Next steps:**")
                for s in r.suggestions:
                    lines.append(f"- {s}")

            lines.append("")

        return "\n".join(lines)

    def _format_tool_result(self, result: ToolResult) -> str:
        status_icon = "✅" if result.status == "success" else "❌"
        lines = [f"## {result.tool.title()} {status_icon}\n"]
        lines.append(result.summary)

        if result.what_changed:
            lines.append("\n**What changed:**")
            for change in result.what_changed:
                lines.append(f"- {change}")

        if result.why:
            lines.append(f"\n**Why:** {result.why}")

        if result.expected_impact:
            lines.append(f"\n**Expected impact:** {result.expected_impact}")

        if result.confidence > 0:
            lines.append(f"\n**Confidence:** {result.confidence:.0%}")

        if result.suggestions:
            lines.append("\n**Suggestions:**")
            for s in result.suggestions:
                lines.append(f"- {s}")

        return "\n".join(lines)

    async def _chat_response(self, message: str, ctx: DatasetContext) -> str:
        llm = get_llm_provider()

        context_parts = [
            f"Dataset: {ctx.dataset_name}",
            f"Size: {ctx.rows} rows, {ctx.columns} columns",
            f"Cleaned: {'Yes' if ctx.cleaned else 'No'}",
            f"EDA completed: {'Yes' if ctx.eda_completed else 'No'}",
            f"ML trained: {'Yes' if ctx.ml_completed else 'No'}",
        ]
        if ctx.key_metrics:
            context_parts.append(f"Key metrics: {json.dumps(ctx.key_metrics)}")

        context_str = "\n".join(context_parts)

        prompt = f"""You are an AI data analyst copilot. You help users analyze their data.

## Current Dataset Context
{context_str}

## User Message
{message}

Respond helpfully. If the user wants to perform an action, tell them what tool you'll use.
Keep responses concise and actionable.
If you can answer from the context, do so. Otherwise, suggest running specific tools."""

        try:
            response = await llm.chat([
                {"role": "system", "content": "You are a helpful AI data analyst copilot. Be concise and actionable."},
                {"role": "user", "content": prompt},
            ])
            return response
        except Exception:
            return self._fallback_response(message, ctx)

    def _fallback_response(self, message: str, ctx: DatasetContext) -> str:
        lower = message.lower()

        if any(w in lower for w in ["hello", "hi", "hey"]):
            return f"Hello! I'm your AI data analyst copilot. I can see you have the **{ctx.dataset_name}** dataset loaded ({ctx.rows} rows, {ctx.columns} columns). How can I help you analyze it?"

        if "help" in lower:
            return """I can help you with:
- **Clean data** — Fix missing values, remove duplicates
- **Explore data** — Run EDA with statistics and charts
- **Train models** — Compare ML algorithms automatically
- **Build dashboards** — Generate interactive dashboards
- **Generate reports** — Create narrative reports and notebooks
- **Deploy models** — Export as REST API, Docker, Streamlit, etc.

Just tell me what you'd like to do!"""

        return f"I understand you're asking about **{ctx.dataset_name}**. Try saying things like:\n- \"Clean my data\"\n- \"Run EDA\"\n- \"Train a model\"\n- \"Generate a dashboard\"\n- \"Analyze my data\" (runs full plan)"

    def _generate_suggestions(self, results: list[ToolResult], ctx: DatasetContext) -> list[str]:
        suggestions = []

        for r in results:
            if r.suggestions:
                suggestions.extend(r.suggestions[:2])

        if not suggestions:
            if not ctx.cleaned:
                suggestions.append("Clean the data first")
            elif not ctx.eda_completed:
                suggestions.append("Run EDA to explore patterns")
            elif not ctx.ml_completed:
                suggestions.append("Train ML models to find predictive patterns")
            elif not ctx.dashboard_generated:
                suggestions.append("Generate a dashboard to monitor key metrics")
            else:
                suggestions.append("Generate a report or deploy your model")

        return suggestions[:5]

    def _get_contextual_suggestions(self, ctx: DatasetContext) -> list[str]:
        suggestions = []

        if not ctx.cleaned:
            suggestions.append("Clean the data")
        if ctx.cleaned and not ctx.eda_completed:
            suggestions.append("Run EDA")
        if ctx.eda_completed and not ctx.ml_completed:
            suggestions.append("Train ML models")
        if ctx.ml_completed and not ctx.dashboard_generated:
            suggestions.append("Generate a dashboard")
        if ctx.ml_completed:
            suggestions.append("Deploy the model")

        if not suggestions:
            suggestions = [
                "Analyze my data",
                "What insights can you find?",
                "Generate a summary",
            ]

        return suggestions[:5]
