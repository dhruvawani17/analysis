import ast
import json
import subprocess
import tempfile
import os
import sys
from pathlib import Path

CODE_TEMPLATE = """
import pandas as pd
import json

df = pd.read_parquet({df_path_repr!r})
user_question = {question_repr!r}

result = None
chart = None

{user_code}

if chart is not None:
    import plotly
    chart_json = json.dumps(chart, cls=plotly.utils.PlotlyJSONEncoder)
else:
    chart_json = None

if result is not None:
    if isinstance(result, pd.DataFrame):
        output = {{"type": "dataframe", "data": result.head(50).to_dict(orient="records"), "columns": list(result.columns), "shape": list(result.shape)}}
    else:
        output = {{"type": "scalar", "value": str(result)}}
else:
    output = {{"type": "scalar", "value": ""}}

print("__RESULT__:" + json.dumps({{"output": output, "chart": chart_json}}))
"""


def sanitize_code(code: str) -> str:
    tree = ast.parse(code)
    forbidden = {"__import__", "exec", "eval", "open", "compile", "__builtins__"}
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            func = node.func
            if isinstance(func, ast.Name) and func.id in forbidden:
                raise ValueError(f"Disallowed function: {func.id}")
            if isinstance(func, ast.Attribute) and func.attr in forbidden:
                raise ValueError(f"Disallowed method: {func.attr}")
        if isinstance(node, ast.Import) or isinstance(node, ast.ImportFrom):
            for alias in node.names:
                if alias.name != "pandas" and not alias.name.startswith("pandas."):
                    if alias.name != "plotly" and not alias.name.startswith("plotly.") and alias.name != "json":
                        raise ValueError(f"Disallowed import: {alias.name}")
    return code


def execute_in_subprocess(df_path: str, question: str, code: str) -> dict:
    full_code = CODE_TEMPLATE.format(
        df_path_repr=df_path,
        question_repr=question,
        user_code=code,
    )

    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
        f.write(full_code)
        script_path = f.name

    try:
        result = subprocess.run(
            [sys.executable, script_path],
            capture_output=True,
            text=True,
            timeout=30,
            env={},
            cwd=tempfile.gettempdir(),
        )

        for line in result.stdout.split("\n"):
            if line.startswith("__RESULT__:"):
                payload = json.loads(line[len("__RESULT__:"):])
                return payload

        if result.stderr:
            return {"output": {"type": "error", "value": result.stderr[:1000]}, "chart": None}
        return {"output": {"type": "error", "value": "No result produced"}, "chart": None}

    except subprocess.TimeoutExpired:
        return {"output": {"type": "error", "value": "Execution timed out (30s)"}, "chart": None}
    except Exception as e:
        return {"output": {"type": "error", "value": str(e)}, "chart": None}
    finally:
        os.unlink(script_path)
