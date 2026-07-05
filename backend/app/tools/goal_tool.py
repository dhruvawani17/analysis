from app.copilot.tools import ToolResult
import pandas as pd


async def goal_detection_tool(dataset_id: int, df: pd.DataFrame, params: dict = None) -> ToolResult:
    from app.services.goal_detector import detect_goal

    user_message = (params or {}).get("message", "")
    goal_info = await detect_goal(df, user_message)

    target = goal_info.get("target_column", "")
    problem_type = goal_info.get("problem_type", "")
    suggested_models = goal_info.get("suggested_models", [])
    suggested_metrics = goal_info.get("suggested_metrics", [])

    what_changed = [
        f"Detected goal: {goal_info.get('goal', 'data analysis')}",
        f"Problem type: {problem_type}",
    ]
    if target:
        what_changed.append(f"Recommended target: {target}")
    if suggested_models:
        what_changed.append(f"Suggested models: {', '.join(suggested_models)}")

    suggestions = [
        f"Train a {problem_type} model predicting '{target}'" if target else f"Run {problem_type} analysis",
        "Run confidence check before training",
    ]

    return ToolResult(
        tool="goal",
        status="success",
        summary=f"Goal detected: {goal_info.get('goal', 'data analysis')} ({problem_type})",
        what_changed=what_changed,
        why="AI goal detection automatically selects the right ML pipeline based on your objective",
        expected_impact=f"Ready for {problem_type} modeling with target column: {target}" if target else f"Ready for {problem_type} analysis",
        confidence=0.85,
        suggestions=suggestions,
        data=goal_info,
    )
