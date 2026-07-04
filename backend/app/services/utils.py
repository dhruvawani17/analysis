import pandas as pd
import numpy as np


ID_PATTERNS = {
    "name", "id", "index", "row", "row_number", "rownum", "num",
    "serial", "serial_number", "key", "pk", "uuid", "guid",
    "record_id", "entry_id", "item_id", "match_id", "player_id",
    "team_id", "user_id", "order_id", "transaction_id",
}


def is_id_column(df: pd.DataFrame, col: str) -> bool:
    s = df[col]
    name_lower = col.lower().replace("-", "_").replace(" ", "_")

    if name_lower in ID_PATTERNS or any(name_lower.endswith(p) for p in ["_id", "_num", "_no"]):
        if s.dtype in ("int64", "Int64", "float64"):
            if s.nunique() == len(s):
                return True
            if s.is_monotonic_increasing and s.min() >= 0:
                return True

    if s.dtype in ("int64", "Int64"):
        if s.nunique() == len(s) and s.min() >= 0:
            ratio = s.nunique() / max(len(s), 1)
            if ratio > 0.95:
                return True

    return False


def get_id_columns(df: pd.DataFrame) -> list[str]:
    return [c for c in df.columns if is_id_column(df, c)]


def get_analysis_columns(df: pd.DataFrame) -> tuple[list[str], list[str], list[str]]:
    id_cols = get_id_columns(df)
    numeric = [c for c in df.select_dtypes(include=[np.number]).columns if c not in id_cols]
    categorical = [c for c in df.select_dtypes(include=["object", "category"]).columns if c not in id_cols]
    date_cols = [c for c in df.select_dtypes(include=["datetime64"]).columns if c not in id_cols]
    return numeric, categorical, date_cols
