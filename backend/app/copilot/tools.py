import json
from dataclasses import dataclass, field, asdict
from typing import Any, Callable, Optional
from datetime import datetime


@dataclass
class ToolResult:
    tool: str
    status: str
    summary: str
    what_changed: list[str] = field(default_factory=list)
    why: str = ""
    expected_impact: str = ""
    confidence: float = 0.0
    metrics_before: dict = field(default_factory=dict)
    metrics_after: dict = field(default_factory=dict)
    suggestions: list[str] = field(default_factory=list)
    data: dict = field(default_factory=dict)
    charts: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class ToolDefinition:
    name: str
    description: str
    input_schema: dict
    category: str
    requires_target: bool = False
    estimated_time: int = 5


TOOL_REGISTRY: dict[str, ToolDefinition] = {
    "cleaning": ToolDefinition(
        name="Data Cleaning",
        description="Fix missing values, remove duplicates, detect outliers, standardize types",
        input_schema={"missing_strategy": "median|mode|drop", "remove_duplicates": True},
        category="preprocessing",
        estimated_time=2,
    ),
    "eda": ToolDefinition(
        name="Exploratory Data Analysis",
        description="Generate statistics, correlations, distributions, charts, and insights",
        input_schema={},
        category="analysis",
        estimated_time=5,
    ),
    "business": ToolDefinition(
        name="Business Analysis",
        description="Executive summary, key insights, risks, opportunities, recommendations, action items",
        input_schema={"focus": "sales|marketing|finance|general"},
        category="analysis",
        estimated_time=8,
    ),
    "story": ToolDefinition(
        name="Data Story Generator",
        description="Generate a narrative report with embedded charts explaining the data story",
        input_schema={"tone": "executive|technical|casual", "include_charts": True},
        category="reporting",
        estimated_time=10,
    ),
    "dashboard": ToolDefinition(
        name="Dashboard Builder",
        description="Generate an interactive dashboard with KPIs, charts, and filters",
        input_schema={"kpi_columns": [], "chart_preferences": {}},
        category="visualization",
        estimated_time=8,
    ),
    "timeseries": ToolDefinition(
        name="Time Series Analysis",
        description="Detect trends, seasonality, and forecast future values",
        input_schema={"date_column": "", "value_column": "", "periods": 12},
        category="analysis",
        requires_target=True,
        estimated_time=10,
    ),
    "ml": ToolDefinition(
        name="Machine Learning",
        description="Train and compare multiple ML models with cross-validation",
        input_schema={"target_column": ""},
        category="modeling",
        requires_target=True,
        estimated_time=15,
    ),
    "optimizer": ToolDefinition(
        name="Pipeline Optimizer",
        description="Suggest and apply optimizations to improve data quality and model performance",
        input_schema={"target_column": ""},
        category="modeling",
        requires_target=True,
        estimated_time=12,
    ),
    "notebook": ToolDefinition(
        name="Notebook Generator",
        description="Generate a Jupyter notebook with the complete analysis code",
        input_schema={"sections": ["eda", "ml", "story"], "style": "tutorial|analysis"},
        category="reporting",
        estimated_time=8,
    ),
    "deploy": ToolDefinition(
        name="Model Deployment",
        description="Export trained model as REST API, Docker, Streamlit, Gradio, ONNX, or batch script",
        input_schema={"target_column": "", "format": "rest|docker|streamlit|gradio|onnx|batch"},
        category="deployment",
        requires_target=True,
        estimated_time=5,
    ),
    "edit": ToolDefinition(
        name="Natural Language Data Editor",
        description="Apply natural language edits to the dataset with undo support",
        input_schema={"instruction": ""},
        category="preprocessing",
        estimated_time=5,
    ),
    "summary": ToolDefinition(
        name="AI Summary",
        description="Generate an AI-powered summary of the dataset",
        input_schema={},
        category="analysis",
        estimated_time=3,
    ),
    "report": ToolDefinition(
        name="Report Generator",
        description="Generate an HTML/PDF report with charts and analysis",
        input_schema={},
        category="reporting",
        estimated_time=8,
    ),
    "qa": ToolDefinition(
        name="Question & Answer",
        description="Answer natural language questions about the data with code and charts",
        input_schema={"question": ""},
        category="analysis",
        estimated_time=5,
    ),
    "workflow": ToolDefinition(
        name="Workflow Runner",
        description="Execute a saved workflow (sequence of tools)",
        input_schema={"workflow_id": 0},
        category="automation",
        estimated_time=30,
    ),
    "goal": ToolDefinition(
        name="Goal Detection",
        description="Automatically detect what you want to achieve and recommend the best ML pipeline",
        input_schema={"message": ""},
        category="modeling",
        estimated_time=3,
    ),
    "confidence": ToolDefinition(
        name="AI Confidence Checker",
        description="Pre-training validation: check dataset size, target leakage, class imbalance, multicollinearity, and more",
        input_schema={"target_column": ""},
        category="modeling",
        requires_target=True,
        estimated_time=2,
    ),
    "playground": ToolDefinition(
        name="Model Playground",
        description="Train and compare multiple ML models with accuracy, speed, model size, explainability scores, and learning curves",
        input_schema={"target_column": "", "models": []},
        category="modeling",
        requires_target=True,
        estimated_time=20,
    ),
    "simulation": ToolDefinition(
        name="What-If Simulation",
        description="Simulate what happens if certain variables change (e.g., increase marketing spend by 20%)",
        input_schema={"scenario": "", "target_column": "", "changes": []},
        category="modeling",
        requires_target=True,
        estimated_time=10,
    ),
    "lineage": ToolDefinition(
        name="Data Lineage",
        description="Show the complete transformation history of the dataset with rollback capability",
        input_schema={},
        category="analysis",
        estimated_time=2,
    ),
    "marketplace": ToolDefinition(
        name="Data Marketplace",
        description="Suggest public datasets to enrich your analysis (demographics, weather, economic indicators, etc.)",
        input_schema={},
        category="analysis",
        estimated_time=3,
    ),
    "alerting": ToolDefinition(
        name="AI Insight Alerts",
        description="Proactively detect data quality issues, extreme values, strong correlations, and performance changes",
        input_schema={},
        category="analysis",
        estimated_time=2,
    ),
    "multisheet": ToolDefinition(
        name="Multi-Sheet Analyzer",
        description="Detect every sheet in an Excel workbook, classify each (data/summary/chart/pivot/template), infer relationships via common keys, and recommend merge/join/analyze-separately workflow",
        input_schema={},
        category="analysis",
        estimated_time=3,
    ),
}


def get_tool(name: str) -> ToolDefinition | None:
    return TOOL_REGISTRY.get(name)


def list_tools() -> list[ToolDefinition]:
    return list(TOOL_REGISTRY.values())


def list_tools_by_category() -> dict[str, list[ToolDefinition]]:
    categories: dict[str, list[ToolDefinition]] = {}
    for tool in TOOL_REGISTRY.values():
        categories.setdefault(tool.category, []).append(tool)
    return categories
