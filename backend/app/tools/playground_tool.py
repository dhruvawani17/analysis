from app.copilot.tools import ToolResult
import pandas as pd


async def playground_tool(dataset_id: int, df: pd.DataFrame, params: dict = None) -> ToolResult:
    from app.services.playground import run_model_playground

    target = (params or {}).get("target_column", "")
    selected_models = (params or {}).get("models", None)

    if not target:
        numeric_cols = df.select_dtypes(include=["number"]).columns.tolist()
        id_cols = [c for c in numeric_cols if "id" in c.lower()]
        numeric_cols = [c for c in numeric_cols if c not in id_cols]
        if numeric_cols:
            target = numeric_cols[-1]
        else:
            return ToolResult(
                tool="playground", status="error",
                summary="No numeric target column found for model playground",
                confidence=0,
            )

    result = run_model_playground(df, target, selected_models)

    if result.get("error"):
        return ToolResult(
            tool="playground", status="error",
            summary=f"Playground failed: {result['error']}",
            confidence=0,
        )

    best = result.get("best_model", "")
    best_score = result.get("best_score", 0)
    models = result.get("models", [])
    problem_type = result.get("problem_type", "")

    what_changed = [
        f"Trained {len(models)} models for {problem_type}",
        f"Best model: {best} (score: {best_score:.4f})",
        f"Total training time: {result.get('total_training_time', 0):.1f}s",
        f"Features used: {result.get('num_features', 0)}",
        f"Samples: {result.get('num_samples', 0):,}",
    ]

    for m in models[:3]:
        score_str = f"accuracy {m['test_score']:.2%}" if problem_type == "classification" else f"R² {m['test_score']:.4f}"
        speed = m.get("inference_speed", 0)
        speed_str = f"{speed:,.0f} pred/s"
        size = m.get("model_size_kb", 0)
        exp = m.get("explainability", 0)
        what_changed.append(f"  {m['name']}: {score_str}, {speed_str}, {size:.0f}KB, explainability {exp}/10")

    suggestions = [
        f"Deploy the {best} model",
        "Run pipeline optimizer to improve results",
        "Compare with different feature sets",
    ]

    return ToolResult(
        tool="playground",
        status="success",
        summary=f"Model Playground: {best} is best ({'accuracy' if problem_type == 'classification' else 'R²'}: {best_score:.4f})",
        what_changed=what_changed,
        why="Comparing multiple models reveals the best trade-off between accuracy, speed, and explainability",
        expected_impact=f"{best} model can be deployed with confidence",
        confidence=0.9,
        suggestions=suggestions,
        data=result,
    )
