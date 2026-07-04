import json
from app.llm.factory import get_llm_provider
from app.llm.prompts import EDA_SUMMARY_PROMPT


async def generate_ai_summary(eda_result: dict) -> str:
    llm = get_llm_provider()

    profile_summary = {
        "shape": eda_result.get("shape"),
        "columns": len(eda_result.get("columns", [])),
        "numeric_columns": len(eda_result.get("numeric_columns", [])),
        "categorical_columns": len(eda_result.get("categorical_columns", [])),
        "missing_summary": eda_result.get("missing_summary", {}),
    }

    if eda_result.get("stats"):
        numeric_stats = {}
        for col, s in eda_result["stats"].items():
            numeric_stats[col] = {k: v for k, v in s.items() if k != "unique"}
        profile_summary["numeric_stats"] = numeric_stats

    if eda_result.get("correlation"):
        corr = eda_result["correlation"]
        high_corr = []
        for col1, vals in corr.items():
            for col2, v in vals.items():
                if col1 < col2 and abs(v) > 0.7:
                    high_corr.append((col1, col2, v))
        if high_corr:
            profile_summary["strong_correlations"] = high_corr[:5]

    prompt = f"{EDA_SUMMARY_PROMPT}\n\nData Profile:\n{json.dumps(profile_summary, indent=2)}"
    response = await llm.chat([
        {"role": "system", "content": "You are a data analyst. Provide concise, insightful summaries."},
        {"role": "user", "content": prompt},
    ])

    return response
