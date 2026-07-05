import json
import pandas as pd
from typing import Any
from datetime import datetime


def build_lineage(dataset_id: int, tool_history: list[dict]) -> dict:
    root = {
        "id": "root",
        "type": "dataset",
        "label": "Raw Dataset",
        "description": "Original uploaded data",
        "children": [],
        "timestamp": "",
        "is_current": False,
        "can_rollback": False,
    }

    current = root
    steps = []

    for i, inv in enumerate(tool_history):
        tool = inv.get("tool", "")
        status = inv.get("status", "")
        result = inv.get("result", {})
        if isinstance(result, str):
            try:
                result = json.loads(result)
            except Exception:
                result = {}

        if status != "success":
            continue

        lineage_configs = {
            "cleaning": {
                "label": "Data Cleaning",
                "description": lambda r: f"Removed {r.get('data', {}).get('duplicates_removed', 0)} duplicates, fixed {r.get('data', {}).get('missing_fixed', 0)} missing values",
            },
            "edit": {
                "label": "Data Editing",
                "description": lambda r: r.get("summary", "Applied edits"),
            },
            "eda": {
                "label": "Exploratory Analysis",
                "description": lambda r: "Generated statistics and charts",
            },
            "feature_engineering": {
                "label": "Feature Engineering",
                "description": lambda r: r.get("summary", "Generated new features"),
            },
            "ml": {
                "label": f"ML Training: {result.get('data', {}).get('best_model', '')}",
                "description": lambda r: f"Score: {r.get('data', {}).get('best_score', 0):.4f}",
            },
            "timeseries": {
                "label": "Time Series Forecast",
                "description": lambda r: r.get("summary", "Generated forecast"),
            },
            "dashboard": {
                "label": "Dashboard Created",
                "description": lambda r: f"Generated dashboard with KPIs and charts",
            },
            "report": {
                "label": "Report Generated",
                "description": lambda r: "Generated HTML report",
            },
            "playground": {
                "label": "Model Playground",
                "description": lambda r: f"Trained {len(r.get('data', {}).get('models', []))} models",
            },
            "optimizer": {
                "label": "Pipeline Optimization",
                "description": lambda r: r.get("summary", "Applied optimizations"),
            },
            "deploy": {
                "label": "Deployment",
                "description": lambda r: f"Generated {r.get('data', {}).get('filename', 'code')}",
            },
        }

        config = lineage_configs.get(tool)
        if not config:
            continue

        desc = config["description"](result) if callable(config["description"]) else config["description"]
        step = {
            "id": f"step_{i}",
            "type": "transformation",
            "tool": tool,
            "label": config["label"],
            "description": desc,
            "timestamp": inv.get("started_at", ""),
            "is_current": i == len(tool_history) - 1,
            "can_rollback": True,
            "children": [],
        }
        steps.append(step)

    return {
        "dataset_id": dataset_id,
        "lineage": [
            {
                "id": "root",
                "type": "dataset",
                "label": "Raw Dataset",
                "description": "Original uploaded data",
                "is_current": len(steps) == 0,
                "can_rollback": False,
            },
            *steps,
        ],
        "total_steps": len(steps),
    }
