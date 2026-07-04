import json
from typing import Any

from jinja2 import Template


REPORT_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Data Analysis Report - {{ dataset_name }}</title>
<script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 960px; margin: 0 auto; padding: 2em; color: #1a1a2e; }
  h1 { color: #16213e; border-bottom: 2px solid #0f3460; padding-bottom: 0.5em; }
  h2 { color: #0f3460; margin-top: 1.5em; }
  h3 { color: #533483; }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
  th { background: #0f3460; color: white; }
  tr:nth-child(even) { background: #f5f5f5; }
  .card { background: #f8f9fa; border-radius: 8px; padding: 1em; margin: 1em 0; border-left: 4px solid #0f3460; }
  .ai-summary { font-size: 1.1em; line-height: 1.6; color: #333; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.85em; }
  .badge-green { background: #d4edda; color: #155724; }
  .badge-blue { background: #cce5ff; color: #004085; }
  .badge-orange { background: #fff3cd; color: #856404; }
  .chart-container { margin: 1em 0; border: 1px solid #e0e0e0; border-radius: 8px; padding: 0.5em; background: white; }
  .chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1em; }
  @media (max-width: 600px) { .chart-grid { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<h1>Data Analysis Report</h1>
<p><strong>Dataset:</strong> {{ dataset_name }}</p>

<h2>Dataset Summary</h2>
<div class="card">
  <table>
    <tr><th>Metric</th><th>Value</th></tr>
    <tr><td>Rows</td><td>{{ summary.rows }}</td></tr>
    <tr><td>Columns</td><td>{{ summary.columns }}</td></tr>
    <tr><td>Numeric Columns</td><td>{{ summary.numeric_columns }}</td></tr>
    <tr><td>Categorical Columns</td><td>{{ summary.categorical_columns }}</td></tr>
    <tr><td>Missing Values</td><td>{{ summary.missing_total }}</td></tr>
  </table>
</div>

{% if cleaning %}
<h2>Data Quality</h2>
<div class="card">
  <p>{{ cleaning.cleaning_summary }}</p>
  <table>
    <tr><th>Metric</th><th>Value</th></tr>
    <tr><td>Original Rows</td><td>{{ cleaning.original_rows }}</td></tr>
    <tr><td>Duplicates Removed</td><td>{{ cleaning.duplicates_removed }}</td></tr>
    <tr><td>Missing Values Fixed</td><td>{{ cleaning.missing_fixed }}</td></tr>
    <tr><td>Outliers Detected</td><td>{{ cleaning.outliers_detected }}</td></tr>
  </table>
</div>
{% endif %}

{% if charts %}
<h2>Visualizations</h2>

{% if charts.correlation %}
<div class="chart-container">
  <h3>Correlation Matrix</h3>
  <div id="chart-correlation"></div>
</div>
{% endif %}

{% if charts.missing %}
<div class="chart-container">
  <h3>Missing Values</h3>
  <div id="chart-missing"></div>
</div>
{% endif %}

{% if charts.histograms %}
<h3>Distributions</h3>
<div class="chart-grid">
{% for col in charts.histograms %}
  <div class="chart-container">
    <h4>{{ col }}</h4>
    <div id="chart-hist-{{ loop.index }}"></div>
  </div>
{% endfor %}
</div>
{% endif %}
{% endif %}

{% if ai_summary %}
<h2>AI Summary</h2>
<div class="card ai-summary">
  <p>{{ ai_summary }}</p>
</div>
{% endif %}

{% if ml_result %}
<h2>Machine Learning</h2>
<div class="card">
  <p><strong>Problem Type:</strong> <span class="badge badge-blue">{{ ml_result.problem_type }}</span></p>
  {% if ml_result.best_model %}
  <p><strong>Best Model:</strong> <span class="badge badge-green">{{ ml_result.best_model }}</span></p>
  <p><strong>Best Score:</strong> {{ ml_result.best_score }}</p>
  {% endif %}

  {% if ml_result.all_results %}
  <h3>Model Comparison</h3>
  <table>
    <tr><th>Model</th><th>Test Score</th><th>CV Mean</th><th>CV Std</th></tr>
    {% for r in ml_result.all_results %}
    <tr>
      <td>{{ r.model }}</td>
      <td>{{ r.test_score }}</td>
      <td>{{ r.cv_mean }}</td>
      <td>{{ r.cv_std }}</td>
    </tr>
    {% endfor %}
  </table>
  {% endif %}
</div>
{% endif %}

{% if qa_results %}
<h2>Q&A Results</h2>
{% for qa in qa_results %}
<div class="card">
  <p><strong>Q:</strong> {{ qa.question }}</p>
  <p><strong>A:</strong> {{ qa.answer }}</p>
</div>
{% endfor %}
{% endif %}

<script>
{% if charts %}
  {% if charts.correlation %}
    Plotly.newPlot('chart-correlation', {{ charts.correlation.data | safe }}, {{ charts.correlation.layout | safe }});
  {% endif %}
  {% if charts.missing %}
    Plotly.newPlot('chart-missing', {{ charts.missing.data | safe }}, {{ charts.missing.layout | safe }});
  {% endif %}
  {% if charts.histograms %}
    {% for col, chart in charts.histograms.items() %}
      Plotly.newPlot('chart-hist-{{ loop.index }}', {{ chart.data | safe }}, {{ chart.layout | safe }});
    {% endfor %}
  {% endif %}
{% endif %}
</script>
</body>
</html>
"""


async def generate_html_report(
    dataset_name: str,
    summary: dict[str, Any],
    cleaning: dict[str, Any] | None = None,
    charts: dict[str, Any] | None = None,
    ai_summary: str | None = None,
    ml_result: dict[str, Any] | None = None,
    qa_results: list[dict] | None = None,
) -> str:
    template = Template(REPORT_TEMPLATE)
    return template.render(
        dataset_name=dataset_name,
        summary=summary,
        cleaning=cleaning,
        charts=charts,
        ai_summary=ai_summary,
        ml_result=ml_result,
        qa_results=qa_results or [],
    )


async def export_pdf(html: str) -> bytes:
    try:
        from weasyprint import HTML
        return HTML(string=html).write_pdf()
    except Exception as e:
        raise RuntimeError(f"PDF generation failed: {e}")
