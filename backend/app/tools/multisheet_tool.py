"""Multi-sheet workbook analyzer tool.

Detects every sheet in an Excel workbook, classifies each sheet
(data / summary / chart / pivot / template), detects relationships
using common keys + column similarity, and recommends a workflow
(merge / join / analyze separately).
"""
from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, field
from io import BytesIO
from pathlib import Path
from typing import Any

import pandas as pd
from openpyxl import load_workbook

from app.copilot.tools import ToolResult


# --------------------------------------------------------------------------- #
# Sheet classification utilities
# --------------------------------------------------------------------------- #

@dataclass
class SheetInfo:
    name: str
    index: int
    classification: str  # data | summary | chart | pivot | template
    rows: int
    columns: int
    column_names: list[str]
    dtypes: dict[str, str]
    confidence: float = 0.0
    signals: list[str] = field(default_factory=list)
    notes: str = ""


def _is_numeric_like(series: pd.Series) -> bool:
    return pd.api.types.is_numeric_dtype(series)


def _has_header_row(df: pd.DataFrame) -> bool:
    """A sheet has a real header row if the first row differs from the rest
    in dtypes or has unique string values."""
    if df.empty or df.shape[0] < 2:
        return True
    # If most columns are not named `Unnamed:`, that's a header signal already
    unnamed = sum(1 for c in df.columns if str(c).startswith("Unnamed:"))
    return unnamed < df.shape[1] * 0.5


def _detect_pivot(df: pd.DataFrame) -> bool:
    """Heuristic: a pivot has repeating row labels in first column(s)
    and numeric values across the rest, with totals-like structure."""
    if df.shape[0] < 2 or df.shape[1] < 3:
        return False
    first_col = df.iloc[:, 0]
    # Pivot rows often repeat category labels
    if first_col.dtype == "object":
        uniqueness = first_col.nunique() / max(len(first_col), 1)
        if 0 < uniqueness < 0.8:
            rest = df.iloc[:, 1:]
            numeric_ratio = rest.select_dtypes(include="number").shape[1] / rest.shape[1]
            if numeric_ratio >= 0.5:
                return True
    return False


def _detect_template(df: pd.DataFrame) -> bool:
    """A template has a header but almost entirely empty body
    (rows filled with blanks/NaN)."""
    if df.empty or df.shape[0] == 0:
        return True
    null_ratio = df.isna().sum().sum() / (df.shape[0] * df.shape[1])
    return null_ratio > 0.85


def _detect_summary(df: pd.DataFrame) -> bool:
    """A summary sheet has small dimensions and mostly aggregate numeric columns
    with descriptive index labels."""
    if df.shape[0] > 50 or df.shape[1] < 2:
        return False
    numeric_cols = df.select_dtypes(include="number").columns
    if len(numeric_cols) == 0:
        return False
    # Heuristic: low rows + mixed text-label + numeric-value columns
    object_cols = df.select_dtypes(exclude="number").columns
    return len(object_cols) >= 1 and len(numeric_cols) >= 1


def _classify_sheet(df: pd.DataFrame, sheet_name: str, has_chart: bool) -> SheetInfo:
    signals: list[str] = []
    rows, cols = (df.shape[0], df.shape[1]) if not df.empty else (0, 0)
    col_names = [str(c) for c in df.columns] if not df.empty else []
    dtypes = {str(c): str(t) for c, t in df.dtypes.items()} if not df.empty else {}

    classification = "data"
    confidence = 0.6

    if has_chart:
        classification = "chart"
        confidence = 0.9
        signals.append("Embedded chart objects detected in the sheet")
    elif _detect_template(df):
        classification = "template"
        confidence = 0.85
        signals.append(">85% empty cells — looks like a fill-in template")
    elif _detect_pivot(df):
        classification = "pivot"
        confidence = 0.8
        signals.append("Repeating labels in first column + numeric grid — pivot-style layout")
    elif _detect_summary(df):
        classification = "summary"
        confidence = 0.75
        signals.append("Small size + descriptive labels + aggregated numeric columns — summary sheet")
    else:
        # Default to "data" with stronger confidence if it has a real header
        if _has_header_row(df):
            confidence = 0.8
            signals.append("Has a header row and varied data types — tabular data")
        else:
            confidence = 0.55
            signals.append("No clear header — best guess: tabular data")

    notes = ""
    if rows == 0:
        notes = "Sheet is empty."
        classification = "template"
        confidence = 0.95

    return SheetInfo(
        name=sheet_name,
        index=0,
        classification=classification,
        rows=rows,
        columns=cols,
        column_names=col_names,
        dtypes=dtypes,
        confidence=confidence,
        signals=signals,
        notes=notes,
    )


def _read_all_sheets(raw_path: Path) -> tuple[dict[str, pd.DataFrame], set[str]]:
    """Read every sheet from an xlsx file. Also returns the names of sheets
    that contain embedded chart objects."""
    # Load with openpyxl (data_only=False to inspect charts without cached values)
    wb = load_workbook(raw_path, data_only=True, read_only=False)
    chart_sheets: set[str] = set()
    for ws in wb.worksheets:
        try:
            if getattr(ws, "_charts", None):
                chart_sheets.add(ws.title)
        except Exception:
            pass

    # pandas read all sheets (drops NaNs to usable dtypes)
    all_dfs = pd.read_excel(raw_path, sheet_name=None)
    wb.close()
    return all_dfs, chart_sheets


# --------------------------------------------------------------------------- #
# Relationship inference
# --------------------------------------------------------------------------- #

@dataclass
class Relationship:
    left_sheet: str
    right_sheet: str
    kind: str  # common_key | column_overlap | value_overlap | none
    confidence: float = 0.0
    common_columns: list[str] = field(default_factory=list)
    join_column: str | None = None
    key_uniqueness: float = 0.0  # 1.0 if join key is unique in both (1:N or 1:1)
    sample_overlap: float = 0.0  # fraction of left key values found in right
    notes: str = ""


def _column_similarity(left: pd.DataFrame, right: pd.DataFrame) -> list[str]:
    """Return columns that exist in both sheets with compatible dtypes."""
    common: list[str] = []
    for col in left.columns:
        if col in right.columns:
            if left[col].dtype.kind == right[col].dtype.kind or (
                pd.api.types.is_numeric_dtype(left[col]) and pd.api.types.is_numeric_dtype(right[col])
            ):
                common.append(str(col))
    return common


def _pick_join_key(left: pd.DataFrame, right: pd.DataFrame, common: list[str]) -> tuple[str | None, float, float]:
    """Pick the best candidate key column for a join.
    Returns (key_column, uniqueness_score, value_overlap_score)."""
    best = None
    best_uniq = 0.0
    best_overlap = 0.0

    for col in common:
        l_series = left[col].dropna().astype(str)
        r_series = right[col].dropna().astype(str)
        if l_series.empty or r_series.empty:
            continue
        l_unique = 1.0 - (l_series.duplicated().sum() / len(l_series))
        r_unique = 1.0 - (r_series.duplicated().sum() / len(r_series))
        # High uniqueness in at least one side suggests a key
        uniqueness = min(l_unique, r_unique)
        # Value overlap: how many left values appear in right
        l_set = set(l_series.unique())
        r_set = set(r_series.unique())
        overlap = len(l_set & r_set) / max(len(l_set), 1)

        # Skip date-like or numeric-continuous columns with low uniqueness
        if uniqueness < 0.3 and overlap < 0.1:
            continue

        if uniqueness > best_uniq or (best is None and overlap > 0):
            best = col
            best_uniq = uniqueness
            best_overlap = overlap

    return best, best_uniq, best_overlap


def _detect_relationships(sheet_dfs: dict[str, pd.DataFrame]) -> list[Relationship]:
    """Detect relationships between every pair of sheets."""
    sheets = list(sheet_dfs.keys())
    rels: list[Relationship] = []

    for i, left in enumerate(sheets):
        for right in sheets[i + 1:]:
            left_df = sheet_dfs[left]
            right_df = sheet_dfs[right]
            if left_df.empty or right_df.empty:
                continue

            common = _column_similarity(left_df, right_df)
            if not common:
                rels.append(Relationship(
                    left_sheet=left, right_sheet=right, kind="none",
                    confidence=0.0, common_columns=[],
                    notes="No dtype-compatible column name overlap",
                ))
                continue

            join_col, uniqueness, overlap = _pick_join_key(left_df, right_df, common)
            if join_col is None:
                rels.append(Relationship(
                    left_sheet=left, right_sheet=right, kind="column_overlap",
                    confidence=0.3, common_columns=common,
                    notes=f"Shared columns ({', '.join(common[:3])}) but none look like keys",
                ))
                continue

            kind = "common_key" if uniqueness >= 0.5 and overlap >= 0.1 else "column_overlap"
            confidence = min(1.0, 0.4 + uniqueness * 0.4 + overlap * 0.3)
            note = f"Joinable on '{join_col}' — uniqueness {uniqueness:.2f}, overlap {overlap:.2f}"
            if uniqueness >= 0.95:
                note += " (1:1 candidate)"
            elif uniqueness >= 0.5:
                note += " (1:N candidate)"
            rels.append(Relationship(
                left_sheet=left, right_sheet=right, kind=kind,
                confidence=confidence, common_columns=common,
                join_column=join_col, key_uniqueness=uniqueness,
                sample_overlap=overlap, notes=note,
            ))
    return rels


# --------------------------------------------------------------------------- #
# Workflow recommendation
# --------------------------------------------------------------------------- #

@dataclass
class WorkflowRecommendation:
    action: str  # merge | join | analyze_separately
    left_sheet: str | None = None
    right_sheet: str | None = None
    join_column: str | None = None
    join_how: str = "inner"  # inner | left | outer
    confidence: float = 0.5
    reasoning: str = ""
    other_sheets: list[str] = field(default_factory=list)


def _recommend_workflow(sheets: list[SheetInfo], rels: list[Relationship]) -> WorkflowRecommendation:
    # Only "data" sheets are candidates for merge/join
    data_sheets = [s for s in sheets if s.classification == "data"]

    if len(data_sheets) == 0:
        return WorkflowRecommendation(
            action="analyze_separately",
            confidence=0.3,
            reasoning="No tabular-data sheets detected — nothing to merge or join.",
        )

    # Find the strongest relationship between two data sheets
    best_rel: Relationship | None = None
    for r in rels:
        if r.kind == "none":
            continue
        # Only consider data<->data relations
        if r.left_sheet not in [s.name for s in data_sheets]:
            continue
        if r.right_sheet not in [s.name for s in data_sheets]:
            continue
        if best_rel is None or r.confidence > best_rel.confidence:
            best_rel = r

    other_sheet_names = [
        s.name for s in sheets if s.classification not in ("data",)
    ]

    if best_rel is None or best_rel.kind != "common_key" or best_rel.join_column is None:
        return WorkflowRecommendation(
            action="analyze_separately",
            confidence=0.4,
            reasoning=(
                "Data sheets share no strong common key. "
                "Recommend analyzing each sheet independently."
            ),
            other_sheets=other_sheet_names,
        )

    uniqueness = best_rel.key_uniqueness
    if uniqueness >= 0.9:
        action = "merge"
        how = "outer"
        reason = (
            f"Both sheets have a near-unique '{best_rel.join_column}' — "
            "union them into a single dataset (outer merge)."
        )
    else:
        action = "join"
        how = "left" if best_rel.sample_overlap > 0.5 else "inner"
        side = "left" if how == "left" else "inner"
        reason = (
            f"Sheets share '{best_rel.join_column}' with good but not unique cardinality — "
            f"perform a {side} join on that column."
        )

    return WorkflowRecommendation(
        action=action,
        left_sheet=best_rel.left_sheet,
        right_sheet=best_rel.right_sheet,
        join_column=best_rel.join_column,
        join_how=how,
        confidence=best_rel.confidence,
        reasoning=reason,
        other_sheets=other_sheet_names,
    )


# --------------------------------------------------------------------------- #
# Main entry point
# --------------------------------------------------------------------------- #

def _resolve_raw_xlsx(dataset) -> Path | None:
    """Try to recover the original .xlsx for a dataset."""
    # The dataset stores a parquet path; we never stored the raw bytes.
    # However, if the dataset was ingested via the new multi-sheet path,
    # sheets_meta will contain per-sheet parquet paths and we can read those.
    return None


async def multisheet_tool(dataset_id: int, df: pd.DataFrame, params: dict) -> ToolResult:
    """Run multi-sheet analysis on a dataset.

    If the dataset has no sheets_meta (single-file upload), this tool reports
    that the dataset doesn't have multiple sheets. Otherwise it inspects every
    sheet, classifies them, infers relationships, and recommends a workflow.
    """
    from app.db.models import Dataset
    from app.api.deps import engine
    from sqlalchemy.ext.asyncio import AsyncSession

    try:
        async with AsyncSession(engine) as session:
            dataset = await session.get(Dataset, dataset_id)
    except Exception:
        dataset = None

    if dataset is None:
        return ToolResult(
            tool="multisheet", status="error",
            summary="Dataset not found", confidence=0,
        )

    sheets_meta_raw = dataset.sheets_meta
    if not sheets_meta_raw:
        return ToolResult(
            tool="multisheet", status="success",
            summary=(
                "This dataset does not appear to be a multi-sheet workbook. "
                "Multi-sheet analysis is only available for Excel (.xlsx) files "
                "containing more than one sheet."
            ),
            what_changed=["No additional sheets detected"],
            why="Single-sheet datasets don't need sheet classification or relationship inference.",
            expected_impact="Nothing to merge or join — use EDA / Dashboard tools on this dataset directly.",
            confidence=0.9,
            suggestions=["Upload a multi-sheet Excel workbook to use this feature"],
            data={"multisheet": False, "sheets": [], "relationships": [], "recommendation": None},
        )

    sheets_meta = json.loads(sheets_meta_raw)

    # Load each sheet's DataFrame from its parquet path
    sheet_dfs: dict[str, pd.DataFrame] = {}
    sheet_infos: list[SheetInfo] = []
    for meta in sheets_meta:
        try:
            df_sheet = pd.read_parquet(meta["parquet_path"])
        except Exception as e:
            df_sheet = pd.DataFrame()
            meta = {**meta, "notes": f"Failed to load sheet: {e}"}

        info = SheetInfo(
            name=meta["sheet_name"],
            index=meta["sheet_index"],
            classification="data",  # will be refined below
            rows=meta.get("rows", len(df_sheet)),
            columns=meta.get("columns", len(df_sheet.columns) if not df_sheet.empty else 0),
            column_names=meta.get("column_names") or list(df_sheet.columns),
            dtypes={str(c): str(t) for c, t in df_sheet.dtypes.items()} if not df_sheet.empty else {},
        )

        # Re-classify using the loaded df
        has_chart = False  # we don't re-open the raw xlsx here; we already sampled meta
        refined = _classify_sheet(df_sheet, info.name, has_chart)
        refined.index = info.index
        sheet_infos.append(refined)
        sheet_dfs[info.name] = df_sheet

    # Detect relationships
    rels = _detect_relationships(sheet_dfs)

    # Build recommendation
    rec = _recommend_workflow(sheet_infos, rels)

    # Serialize everything for the frontend
    sheets_json = [
        {
            "name": s.name,
            "index": s.index,
            "classification": s.classification,
            "rows": s.rows,
            "columns": s.columns,
            "column_names": s.column_names[:20],
            "dtypes": s.dtypes,
            "confidence": round(s.confidence, 2),
            "signals": s.signals,
            "notes": s.notes,
        }
        for s in sheet_infos
    ]
    rels_json = [
        {
            "left_sheet": r.left_sheet,
            "right_sheet": r.right_sheet,
            "kind": r.kind,
            "confidence": round(r.confidence, 2),
            "common_columns": r.common_columns[:20],
            "join_column": r.join_column,
            "key_uniqueness": round(r.key_uniqueness, 2),
            "sample_overlap": round(r.sample_overlap, 2),
            "notes": r.notes,
        }
        for r in rels
    ]
    rec_json = {
        "action": rec.action,
        "left_sheet": rec.left_sheet,
        "right_sheet": rec.right_sheet,
        "join_column": rec.join_column,
        "join_how": rec.join_how,
        "confidence": round(rec.confidence, 2),
        "reasoning": rec.reasoning,
        "other_sheets": rec.other_sheets,
    }

    summary = (
        f"Analyzed {len(sheet_infos)} sheets: "
        + ", ".join(f"{s.name} ({s.classification})" for s in sheet_infos)
        + f". Recommendation: {rec.action}"
        + (f" on '{rec.join_column}'" if rec.join_column else "")
    )

    what_changed = [f"Classified {len(sheet_infos)} sheets",
                    f"Detected {len([r for r in rels if r.kind != 'none'])} relationship(s)",
                    f"Recommended workflow: {rec.action}"]

    return ToolResult(
        tool="multisheet", status="success",
        summary=summary,
        what_changed=what_changed,
        why=(
            "Understanding the structure of a multi-sheet workbook is the first step. "
            "Classification tells you which sheets hold raw data; relationships tell you "
            "how they connect. The recommended workflow gets you to insight fastest."
        ),
        expected_impact=(
            f"One click will {rec.action} the sheets"
            + (f" on '{rec.join_column}'" if rec.join_column else "")
            + " and create a new combined dataset ready for analysis."
        ),
        confidence=0.85,
        suggestions=[
            "Click 'Execute Recommendation' to perform the action and create a new dataset",
            "Use 'Analyze Instead' on any data sheet to run EDA on that sheet independently",
        ],
        data={
            "multisheet": True,
            "sheets": sheets_json,
            "relationships": rels_json,
            "recommendation": rec_json,
            "total_sheets": len(sheet_infos),
            "data_sheets": [s.name for s in sheet_infos if s.classification == "data"],
        },
    )


# --------------------------------------------------------------------------- #
# Executing the recommended workflow (one-click action)
# --------------------------------------------------------------------------- #

def execute_workflow(dataset, action: str, left_sheet: str | None,
                     right_sheet: str | None, join_column: str | None,
                     join_how: str = "inner") -> dict:
    """Execute the recommended workflow and return a new combined DataFrame.

    Returns: {"status": ..., "output_path": str|None, "rows", "columns",
              "column_names", "dtypes"}
    """
    if dataset is None or not dataset.sheets_meta:
        return {"status": "error", "error": "Dataset not found or not a multi-sheet workbook"}

    sheets_meta = dataset.sheets_meta if isinstance(dataset.sheets_meta, list) else json.loads(dataset.sheets_meta)
    sheet_lookup = {m["sheet_name"]: m for m in sheets_meta}

    def _load(name):
        path = sheet_lookup.get(name, {}).get("parquet_path")
        if not path:
            raise ValueError(f"Sheet '{name}' not found")
        return pd.read_parquet(path)

    if action == "analyze_separately":
        # No combine — just confirm each sheet is available for independent analysis
        return {
            "status": "success", "action": "analyze_separately",
            "sheets": [m["sheet_name"] for m in sheets_meta],
            "output_path": None,
            "rows": 0, "columns": 0,
            "column_names": [], "dtypes": {},
            "message": "Each sheet will be analyzed independently. Loaded their parquet paths.",
        }

    if action not in ("merge", "join"):
        return {"status": "error", "error": f"Unknown action: {action}"}

    if not (left_sheet and right_sheet and join_column):
        return {"status": "error", "error": "merge/join require left_sheet, right_sheet, and join_column"}

    left_df = _load(left_sheet)
    right_df = _load(right_sheet)

    # Normalize join column name (sheets were already column-normalized at ingest)
    if join_column not in left_df.columns:
        return {"status": "error",
                "error": f"Column '{join_column}' not found in sheet '{left_sheet}'. Available: {list(left_df.columns)}"}
    if join_column not in right_df.columns:
        return {"status": "error",
                "error": f"Column '{join_column}' not found in sheet '{right_sheet}'. Available: {list(right_df.columns)}"}

    combined = pd.merge(left_df, right_df, on=join_column, how=join_how)
    combined = combined.loc[:, ~combined.columns.duplicated()]

    from app.core.storage import save_dataframe
    uid = str(dataset.user_id) if dataset.user_id else "default"
    output_path = save_dataframe(combined, f"multisheet_{dataset_id}_{action}_{uuid.uuid4().hex[:8]}", user_id=uid)

    return {
        "status": "success", "action": action,
        "output_path": str(output_path),
        "rows": len(combined),
        "columns": len(combined.columns),
        "column_names": list(combined.columns),
        "dtypes": {str(c): str(t) for c, t in combined.dtypes.items()},
        "join_column": join_column,
        "join_how": join_how,
        "left_sheet": left_sheet,
        "right_sheet": right_sheet,
        "message": f"{'Merged' if action == 'merge' else 'Joined'} {len(left_df):,} + {len(right_df):,} rows on '{join_column}' ({join_how}) → {len(combined):,} rows, {len(combined.columns)} columns",
    }
