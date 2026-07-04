import json
from typing import Any

import pandas as pd

from app.llm.factory import get_llm_provider
from app.llm.prompts import QA_PROMPT
from app.core.sandbox import sanitize_code, execute_in_subprocess


async def ask_question(df_path: str, question: str) -> dict[str, Any]:
    df = pd.read_parquet(df_path)
    schema = {
        "columns": list(df.columns),
        "dtypes": {c: str(t) for c, t in df.dtypes.items()},
        "rows": len(df),
        "sample_rows": df.head(3).to_dict(orient="records"),
    }

    llm = get_llm_provider()
    prompt = f"""{QA_PROMPT}

Dataset Schema:
{json.dumps(schema, indent=2)}

User Question: {question}

Remember: return ONLY valid JSON with keys "code" and "explanation". The code must use only pandas and plotly.express. Store the answer in variable `result` (string, number, list, or DataFrame). If the answer is a chart, store a plotly figure in variable `chart`."""

    response = await llm.chat([
        {"role": "system", "content": "You generate pandas code to answer questions about data. Return ONLY valid JSON."},
        {"role": "user", "content": prompt},
    ])

    try:
        parsed = json.loads(response)
        code = parsed.get("code", "")
        explanation = parsed.get("explanation", "")
    except (json.JSONDecodeError, KeyError):
        return {"answer": "Failed to parse LLM response. Try rephrasing.", "code": None, "chart": None}

    try:
        sanitize_code(code)
    except ValueError as e:
        return {"answer": f"Generated code uses disallowed operations: {e}", "code": code, "chart": None}

    sandbox_result = execute_in_subprocess(df_path, question, code)
    output = sandbox_result.get("output", {})
    chart_json = sandbox_result.get("chart")

    output_type = output.get("type", "error")
    output_value = output.get("value", "")

    if output_type == "error":
        answer = f"I encountered an error: {output_value}"
    elif output_type == "dataframe":
        data = output.get("data", [])
        shape = output.get("shape", [0, 0])
        answer = f"Here are the results ({shape[0]} rows, {shape[1]} columns):\n\n"
        if data:
            answer += json.dumps(data[:5], indent=2)
    else:
        answer = str(output_value)

    if explanation:
        answer = f"{explanation}\n\n{answer}"

    return {
        "answer": answer,
        "code": code,
        "chart_json": json.loads(chart_json) if chart_json else None,
    }
