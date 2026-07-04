import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from app.api.deps import get_dataset_or_404
from app.db.models import Dataset
from app.core.storage import load_dataframe
from app.services.eda import run_eda
from app.services.reports import generate_html_report, export_pdf

router = APIRouter()


def _build_summary(df, eda_result):
    return {
        "rows": len(df),
        "columns": len(df.columns),
        "numeric_columns": len(eda_result.get("numeric_columns", [])),
        "categorical_columns": len(eda_result.get("categorical_columns", [])),
        "missing_total": sum(eda_result.get("missing_summary", {}).values()),
    }


@router.post("/generate/{dataset_id}")
async def generate_report(
    dataset: Dataset = Depends(get_dataset_or_404),
):
    df = load_dataframe(dataset.file_path)
    eda_result = run_eda(df)

    cleaning = json.loads(dataset.data_quality_report) if dataset.data_quality_report else None
    summary = _build_summary(df, eda_result)

    html = await generate_html_report(
        dataset_name=dataset.name,
        summary=summary,
        cleaning=cleaning,
        charts=eda_result.get("charts"),
        ai_summary=dataset.ai_summary,
    )

    return {"html": html, "dataset_id": dataset.id}


@router.get("/download/{dataset_id}")
async def download_report(
    dataset: Dataset = Depends(get_dataset_or_404),
    format: str = "pdf",
):
    df = load_dataframe(dataset.file_path)
    eda_result = run_eda(df)

    cleaning = json.loads(dataset.data_quality_report) if dataset.data_quality_report else None
    summary = _build_summary(df, eda_result)

    html = await generate_html_report(
        dataset_name=dataset.name,
        summary=summary,
        cleaning=cleaning,
        charts=eda_result.get("charts"),
        ai_summary=dataset.ai_summary,
    )

    if format == "pdf":
        try:
            pdf_bytes = await export_pdf(html)
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f'attachment; filename="report_{dataset.id}.pdf"'
                },
            )
        except NotImplementedError as e:
            raise HTTPException(status_code=501, detail=str(e))
        except RuntimeError as e:
            raise HTTPException(status_code=500, detail=str(e))

    return Response(content=html, media_type="text/html")
