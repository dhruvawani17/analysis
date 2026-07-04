from langgraph.graph import StateGraph, END
from typing import TypedDict, Annotated
from app.agents.nodes import cleaning_node, eda_node, qa_node, ml_node, report_node


class AnalysisState(TypedDict):
    dataset_id: int
    df_path: str
    cleaning_result: dict | None
    eda_result: dict | None
    qa_results: list[dict]
    ml_result: dict | None
    report: str | None
    error: str | None


def create_analysis_graph() -> StateGraph:
    workflow = StateGraph(AnalysisState)

    workflow.add_node("clean", cleaning_node)
    workflow.add_node("eda", eda_node)
    workflow.add_node("qa", qa_node)
    workflow.add_node("ml", ml_node)
    workflow.add_node("report", report_node)

    workflow.set_entry_point("clean")
    workflow.add_edge("clean", "eda")
    workflow.add_edge("eda", "qa")
    workflow.add_edge("qa", "ml")
    workflow.add_edge("ml", "report")
    workflow.add_edge("report", END)

    return workflow.compile()


_analysis_graph = create_analysis_graph()


async def run_analysis(dataset_id: int) -> dict:
    initial_state: AnalysisState = {
        "dataset_id": dataset_id,
        "df_path": "",
        "cleaning_result": None,
        "eda_result": None,
        "qa_results": [],
        "ml_result": None,
        "report": None,
        "error": None,
    }
    result = await _analysis_graph.ainvoke(initial_state)
    return result
