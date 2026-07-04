import pandas as pd


def run_pandas_code(code: str, df: pd.DataFrame) -> str:
    local_vars = {"df": df, "pd": pd}
    try:
        exec(code, {"__builtins__": {}}, local_vars)
        result = local_vars.get("result", "")
        return str(result)
    except Exception as e:
        return f"Error: {e}"
