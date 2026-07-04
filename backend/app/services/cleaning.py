import pandas as pd
import numpy as np
from datetime import datetime


def clean_dataset(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    report = {
        "original_rows": len(df),
        "original_columns": len(df.columns),
        "missing_values": {},
        "missing_fixed": 0,
        "duplicates": 0,
        "duplicates_removed": 0,
        "outliers_detected": 0,
        "type_changes": {},
        "date_columns_standardized": [],
        "column_renames": {},
    }

    original_columns = list(df.columns)
    new_columns = {}
    for col in original_columns:
        clean = col.strip().lower().replace(" ", "_").replace("-", "_")
        clean = "".join(c if c.isalnum() or c == "_" else "_" for c in clean)
        clean = clean.strip("_")
        if not clean:
            clean = "column"
        if clean != col:
            new_columns[col] = clean
    if new_columns:
        report["column_renames"] = new_columns
        df = df.rename(columns=new_columns)

    for col in df.columns:
        if df[col].dtype == "object":
            try:
                parsed = pd.to_datetime(df[col], errors="coerce", infer_datetime_format=True)
                if parsed.notna().sum() > len(df) * 0.5:
                    df[col] = parsed
                    report["date_columns_standardized"].append(col)
                    continue
            except (ValueError, TypeError):
                pass

            try:
                numeric = pd.to_numeric(df[col].astype(str).str.replace("$", "").str.replace(",", ""), errors="coerce")
                if numeric.notna().sum() > len(df) * 0.5:
                    df[col] = numeric
                    report["type_changes"][col] = f"object → {numeric.dtype}"
            except (ValueError, TypeError):
                pass

    for col in df.columns:
        missing = int(df[col].isna().sum())
        if missing > 0:
            report["missing_values"][col] = missing
            if df[col].dtype in ("int64", "float64"):
                median_val = df[col].median()
                if pd.notna(median_val):
                    df[col] = df[col].fillna(median_val)
                    report["missing_fixed"] += missing
            elif df[col].dtype == "datetime64[ns]":
                pass
            else:
                mode_val = df[col].mode()
                if not mode_val.empty and pd.notna(mode_val[0]):
                    df[col] = df[col].fillna(mode_val[0])
                    report["missing_fixed"] += missing

    dupes = df.duplicated().sum()
    report["duplicates"] = int(dupes)
    if dupes > 0:
        df = df.drop_duplicates()
        report["duplicates_removed"] = int(dupes)

    numeric_cols = df.select_dtypes(include=[np.number]).columns
    for col in numeric_cols:
        q1 = df[col].quantile(0.25)
        q3 = df[col].quantile(0.75)
        iqr = q3 - q1
        lower = q1 - 1.5 * iqr
        upper = q3 + 1.5 * iqr
        outliers = df[(df[col] < lower) | (df[col] > upper)].shape[0]
        if outliers > 0:
            report["outliers_detected"] += outliers

    report["final_rows"] = len(df)
    report["final_columns"] = len(df.columns)
    report["cleaning_summary"] = (
        f"Removed {report['duplicates_removed']} duplicate rows, "
        f"fixed {report['missing_fixed']} missing values, "
        f"detected {report['outliers_detected']} outliers, "
        f"standardized {len(report['date_columns_standardized'])} date columns."
    )

    return df, report
