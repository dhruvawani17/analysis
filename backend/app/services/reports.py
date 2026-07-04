import json
from typing import Any

from jinja2 import Template


REPORT_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>{{ title }}</title>
<script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>
<style>
  @page { size: A4; margin: 1.5cm; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
    max-width: 1100px; margin: 0 auto; padding: 2em;
    color: #1e293b; line-height: 1.7; background: #f8fafc;
  }

  /* ── Header ── */
  .report-header {
    background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
    color: white; padding: 2.5em 2em; border-radius: 12px; margin-bottom: 2em;
  }
  .report-header h1 { font-size: 1.8em; margin: 0 0 0.3em 0; font-weight: 700; }
  .report-header .subtitle { opacity: 0.8; font-size: 1em; }
  .report-header .meta { margin-top: 1em; display: flex; gap: 2em; font-size: 0.85em; opacity: 0.75; }

  /* ── Sections ── */
  .section { margin-bottom: 2em; }
  .section-title {
    font-size: 1.25em; font-weight: 700; color: #0f172a;
    border-bottom: 2px solid #3b82f6; padding-bottom: 0.4em; margin-bottom: 1em;
  }
  .section-subtitle { font-size: 1em; font-weight: 600; color: #334155; margin: 1em 0 0.5em 0; }

  /* ── KPI Cards ── */
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1em; margin-bottom: 1.5em; }
  .kpi-card {
    background: white; border-radius: 10px; padding: 1.2em; text-align: center;
    border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }
  .kpi-value { font-size: 1.8em; font-weight: 800; color: #0f172a; }
  .kpi-label { font-size: 0.75em; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 0.3em; }
  .kpi-card.green .kpi-value { color: #059669; }
  .kpi-card.blue .kpi-value { color: #2563eb; }
  .kpi-card.amber .kpi-value { color: #d97706; }
  .kpi-card.red .kpi-value { color: #dc2626; }

  /* ── Cards ── */
  .card {
    background: white; border-radius: 10px; padding: 1.2em 1.5em; margin: 1em 0;
    border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }
  .card-accent { border-left: 4px solid #3b82f6; }
  .card-success { border-left: 4px solid #059669; }
  .card-warning { border-left: 4px solid #d97706; }
  .card-danger { border-left: 4px solid #dc2626; }

  /* ── Tables ── */
  table { border-collapse: collapse; width: 100%; margin: 0.8em 0; font-size: 0.9em; }
  th, td { padding: 0.6em 0.8em; text-align: left; border-bottom: 1px solid #e2e8f0; }
  th { background: #f1f5f9; color: #475569; font-weight: 600; font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.03em; }
  tr:hover { background: #f8fafc; }

  /* ── Tags ── */
  .tag { display: inline-block; padding: 2px 10px; border-radius: 9999px; font-size: 0.75em; font-weight: 600; }
  .tag-green { background: #d1fae5; color: #065f46; }
  .tag-blue { background: #dbeafe; color: #1e40af; }
  .tag-amber { background: #fef3c7; color: #92400e; }
  .tag-red { background: #fee2e2; color: #991b1b; }
  .tag-gray { background: #f1f5f9; color: #475569; }

  /* ── Charts ── */
  .chart-box {
    background: white; border-radius: 10px; padding: 1em; margin: 1em 0;
    border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }
  .chart-box h4 { margin: 0 0 0.5em 0; font-size: 0.9em; color: #334155; }
  .chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1em; }
  .chart-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1em; }

  /* ── Insight boxes ── */
  .insight { background: #eff6ff; border-radius: 8px; padding: 0.8em 1em; margin: 0.5em 0; font-size: 0.9em; }
  .insight strong { color: #1e40af; }
  .insight-green { background: #ecfdf5; }
  .insight-green strong { color: #065f46; }
  .insight-amber { background: #fffbeb; }
  .insight-amber strong { color: #92400e; }
  .insight-red { background: #fef2f2; }
  .insight-red strong { color: #991b1b; }

  /* ── Recommendation ── */
  .rec-item { display: flex; gap: 0.8em; margin: 0.6em 0; align-items: flex-start; }
  .rec-num { background: #3b82f6; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75em; font-weight: 700; flex-shrink: 0; margin-top: 2px; }
  .rec-text { font-size: 0.9em; }

  /* ── Footer ── */
  .report-footer { text-align: center; padding: 1.5em; color: #94a3b8; font-size: 0.8em; border-top: 1px solid #e2e8f0; margin-top: 2em; }

  @media (max-width: 768px) {
    .kpi-grid { grid-template-columns: 1fr 1fr; }
    .chart-grid, .chart-grid-3 { grid-template-columns: 1fr; }
    .report-header .meta { flex-direction: column; gap: 0.5em; }
  }
</style>
</head>
<body>

<!-- ═══════════════ HEADER ═══════════════ -->
<div class="report-header">
  <h1>Data Analysis Report</h1>
  <div class="subtitle">{{ dataset_name }}</div>
  <div class="meta">
    <span>Rows: {{ "{:,}".format(summary.rows|int) }}</span>
    <span>Columns: {{ summary.columns }}</span>
    <span>Generated: {{ generated_date }}</span>
  </div>
</div>

<!-- ═══════════════ EXECUTIVE SUMMARY ═══════════════ -->
<div class="section">
  <div class="section-title">1. Executive Summary</div>
  <div class="card card-accent">
    <p>{{ executive_summary }}</p>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card blue">
      <div class="kpi-value">{{ "{:,}".format(summary.rows|int) }}</div>
      <div class="kpi-label">Total Records</div>
    </div>
    <div class="kpi-card green">
      <div class="kpi-value">{{ summary.columns }}</div>
      <div class="kpi-label">Features</div>
    </div>
    <div class="kpi-card {% if summary.missing_pct > 5 %}red{% elif summary.missing_pct > 0 %}amber{% else %}green{% endif %}">
      <div class="kpi-value">{{ summary.missing_pct }}%</div>
      <div class="kpi-label">Missing Data</div>
    </div>
    <div class="kpi-card {% if summary.duplicate_pct > 5 %}red{% elif summary.duplicate_pct > 0 %}amber{% else %}green{% endif %}">
      <div class="kpi-value">{{ summary.duplicate_pct }}%</div>
      <div class="kpi-label">Duplicates</div>
    </div>
  </div>
</div>

<!-- ═══════════════ DATA OVERVIEW ═══════════════ -->
<div class="section">
  <div class="section-title">2. Data Overview</div>

  <div class="card">
    <div class="section-subtitle">Schema Summary</div>
    <table>
      <tr><th>Property</th><th>Value</th></tr>
      <tr><td>Total Records</td><td>{{ "{:,}".format(summary.rows|int) }}</td></tr>
      <tr><td>Total Features</td><td>{{ summary.columns }}</td></tr>
      <tr><td>Numeric Features</td><td>{{ summary.numeric_columns }} ({{ summary.numeric_pct }}%)</td></tr>
      <tr><td>Categorical Features</td><td>{{ summary.categorical_columns }} ({{ summary.categorical_pct }}%)</td></tr>
      <tr><td>Boolean Features</td><td>{{ summary.boolean_columns }}</td></tr>
      <tr><td>Date/Time Features</td><td>{{ summary.datetime_columns }}</td></tr>
      <tr><td>Memory Usage</td><td>{{ summary.memory_mb }} MB</td></tr>
    </table>
  </div>

  {% if top_features %}
  <div class="card">
    <div class="section-subtitle">Feature Profile — Top Variables</div>
    <table>
      <tr><th>Feature</th><th>Type</th><th>Missing</th><th>Unique</th><th>Mean / Mode</th><th>Insight</th></tr>
      {% for f in top_features %}
      <tr>
        <td><strong>{{ f.name }}</strong></td>
        <td><span class="tag tag-gray">{{ f.type }}</span></td>
        <td>{{ f.missing_pct }}%</td>
        <td>{{ f.unique }}</td>
        <td>{{ f.central_value }}</td>
        <td>{{ f.insight }}</td>
      </tr>
      {% endfor %}
    </table>
  </div>
  {% endif %}
</div>

<!-- ═══════════════ DATA QUALITY ═══════════════ -->
<div class="section">
  <div class="section-title">3. Data Quality Assessment</div>

  {% if cleaning %}
  <div class="kpi-grid" style="grid-template-columns: repeat(4, 1fr);">
    <div class="kpi-card green">
      <div class="kpi-value">{{ cleaning.original_rows }}</div>
      <div class="kpi-label">Original Rows</div>
    </div>
    <div class="kpi-card {% if cleaning.duplicates_removed > 0 %}amber{% else %}green{% endif %}">
      <div class="kpi-value">{{ cleaning.duplicates_removed }}</div>
      <div class="kpi-label">Duplicates Removed</div>
    </div>
    <div class="kpi-card {% if cleaning.missing_fixed > 0 %}amber{% else %}green{% endif %}">
      <div class="kpi-value">{{ cleaning.missing_fixed }}</div>
      <div class="kpi-label">Missing Values Fixed</div>
    </div>
    <div class="kpi-card {% if cleaning.outliers_detected > 100 %}red{% elif cleaning.outliers_detected > 0 %}amber{% else %}green{% endif %}">
      <div class="kpi-value">{{ cleaning.outliers_detected }}</div>
      <div class="kpi-label">Outliers Detected</div>
    </div>
  </div>

  <div class="card card-warning">
    <p><strong>Quality Assessment:</strong> {{ cleaning.cleaning_summary }}</p>
  </div>
  {% endif %}

  {% if missing_chart %}
  <div class="chart-box">
    <h4>Missing Values Distribution</h4>
    <div id="chart-missing"></div>
  </div>
  {% endif %}
</div>

<!-- ═══════════════ STATISTICAL ANALYSIS ═══════════════ -->
<div class="section">
  <div class="section-title">4. Statistical Analysis</div>

  {% if stats_table %}
  <div class="card">
    <div class="section-subtitle">Descriptive Statistics — Numeric Features</div>
    <div style="overflow-x: auto;">
      <table>
        <tr><th>Feature</th><th>Mean</th><th>Std</th><th>Min</th><th>25%</th><th>Median</th><th>75%</th><th>Max</th><th>Skew</th></tr>
        {% for s in stats_table %}
        <tr>
          <td><strong>{{ s.name }}</strong></td>
          <td>{{ s.mean }}</td>
          <td>{{ s.std }}</td>
          <td>{{ s.min }}</td>
          <td>{{ s.q25 }}</td>
          <td>{{ s.median }}</td>
          <td>{{ s.q75 }}</td>
          <td>{{ s.max }}</td>
          <td><span class="tag {% if s.skew_abs > 1 %}tag-red{% elif s.skew_abs > 0.5 %}tag-amber{% else %}tag-green{% endif %}">{{ s.skew }}</span></td>
        </tr>
        {% endfor %}
      </table>
    </div>
  </div>
  {% endif %}

  {% if distributions %}
  <div class="section-subtitle">Distribution Analysis</div>
  <div class="chart-grid">
    {% for d in distributions %}
    <div class="chart-box">
      <h4>{{ d.name }} <span class="tag {% if d.skew_abs > 1 %}tag-red{% elif d.skew_abs > 0.5 %}tag-amber{% else %}tag-green{% endif %}" style="margin-left:0.5em;">{{ d.skew_label }}</span></h4>
      <div id="chart-dist-{{ loop.index }}"></div>
      <div class="insight {% if d.skew_abs > 1 %}insight-red{% elif d.skew_abs > 0.5 %}insight-amber{% else %}insight-green{% endif %}">
        <strong>{{ d.insight_title }}:</strong> {{ d.insight }}
      </div>
    </div>
    {% endfor %}
  </div>
  {% endif %}
</div>

<!-- ═══════════════ CORRELATIONS ═══════════════ -->
{% if corr_chart %}
<div class="section">
  <div class="section-title">5. Correlation Analysis</div>
  <div class="chart-box">
    <h4>Feature Correlation Heatmap</h4>
    <div id="chart-corr"></div>
  </div>
  {% if top_correlations %}
  <div class="card">
    <div class="section-subtitle">Strongest Correlations</div>
    <table>
      <tr><th>Pair</th><th>Correlation</th><th>Strength</th><th>Interpretation</th></tr>
      {% for c in top_correlations %}
      <tr>
        <td><strong>{{ c.pair }}</strong></td>
        <td>{{ c.value }}</td>
        <td><span class="tag {% if c.abs > 0.7 %}tag-red{% elif c.abs > 0.4 %}tag-amber{% else %}tag-green{% endif %}">{{ c.strength }}</span></td>
        <td>{{ c.interpretation }}</td>
      </tr>
      {% endfor %}
    </table>
  </div>
  {% endif %}
</div>
{% endif %}

<!-- ═══════════════ OUTLIER ANALYSIS ═══════════════ -->
{% if outlier_chart %}
<div class="section">
  <div class="section-title">6. Outlier Analysis</div>
  <div class="chart-box">
    <h4>Box Plot — Numeric Features (Normalized)</h4>
    <div id="chart-outlier"></div>
  </div>
  {% if outlier_details %}
  <div class="card card-danger">
    <div class="section-subtitle">Outlier Summary</div>
    <table>
      <tr><th>Feature</th><th>Outliers</th><th>% of Data</th><th>Severity</th><th>Recommendation</th></tr>
      {% for o in outlier_details %}
      <tr>
        <td><strong>{{ o.name }}</strong></td>
        <td>{{ o.count }}</td>
        <td>{{ o.pct }}%</td>
        <td><span class="tag {% if o.pct > 10 %}tag-red{% elif o.pct > 5 %}tag-amber{% else %}tag-green{% endif %}">{{ o.severity }}</span></td>
        <td>{{ o.recommendation }}</td>
      </tr>
      {% endfor %}
    </table>
  </div>
  {% endif %}
</div>
{% endif %}

<!-- ═══════════════ CATEGORICAL ANALYSIS ═══════════════ -->
{% if categorical_charts %}
<div class="section">
  <div class="section-title">7. Categorical Feature Analysis</div>
  <div class="chart-grid">
    {% for cat in categorical_charts %}
    <div class="chart-box">
      <h4>{{ cat.name }} ({{ cat.unique }} unique values)</h4>
      <div id="chart-cat-{{ loop.index }}"></div>
      <div class="insight">
        <strong>Distribution:</strong> {{ cat.insight }}
      </div>
    </div>
    {% endfor %}
  </div>
</div>
{% endif %}

<!-- ═══════════════ AI INSIGHTS ═══════════════ -->
{% if insights %}
<div class="section">
  <div class="section-title">8. Key Insights</div>
  {% for insight in insights %}
  <div class="card card-accent" style="border-left-color: {{ insight.color | default('#3b82f6') }};">
    <strong>{{ insight.title }}</strong>
    <p style="margin: 0.3em 0 0 0; font-size: 0.9em;">{{ insight.text }}</p>
  </div>
  {% endfor %}
</div>
{% endif %}

<!-- ═══════════════ RECOMMENDATIONS ═══════════════ -->
{% if recommendations %}
<div class="section">
  <div class="section-title">9. Recommendations</div>
  <div class="card card-success">
    {% for rec in recommendations %}
    <div class="rec-item">
      <div class="rec-num">{{ loop.index }}</div>
      <div class="rec-text">{{ rec }}</div>
    </div>
    {% endfor %}
  </div>
</div>
{% endif %}

<!-- ═══════════════ METHODOLOGY ═══════════════ -->
<div class="section">
  <div class="section-title">10. Methodology</div>
  <div class="card">
    <p style="font-size: 0.85em; color: #64748b;">
      This report was generated using automated exploratory data analysis (EDA). Statistical measures include
      descriptive statistics (mean, median, standard deviation, skewness), Pearson correlation analysis,
      IQR-based outlier detection (1.5×IQR), and distribution fitting assessment. Missing values were
      imputed using median (numeric) or mode (categorical) strategies. All visualizations use Plotly.js
      for interactive rendering. AI-powered insights were generated using LLM analysis of the statistical profile.
    </p>
  </div>
</div>

<div class="report-footer">
  Generated by AI Data Analyst &middot; {{ generated_date }}
</div>

<!-- ═══════════════ CHART SCRIPTS ═══════════════ -->
<script>
const plotConfig = { responsive: true, displayModeBar: false };

{% if missing_chart %}
Plotly.newPlot('chart-missing', {{ missing_chart.data | safe }}, Object.assign({{ missing_chart.layout | safe }}, {margin:{t:10,b:40,l:50,r:20}}), plotConfig);
{% endif %}

{% if corr_chart %}
Plotly.newPlot('chart-corr', {{ corr_chart.data | safe }}, Object.assign({{ corr_chart.layout | safe }}, {margin:{t:10,b:40,l:50,r:20}}), plotConfig);
{% endif %}

{% if distributions %}
  {% for d in distributions %}
    Plotly.newPlot('chart-dist-{{ loop.index }}', {{ d.chart.data | safe }}, Object.assign({{ d.chart.layout | safe }}, {margin:{t:10,b:40,l:40,r:10}, height:220}), plotConfig);
  {% endfor %}
{% endif %}

{% if outlier_chart %}
Plotly.newPlot('chart-outlier', {{ outlier_chart.data | safe }}, Object.assign({{ outlier_chart.layout | safe }}, {margin:{t:10,b:80,l:50,r:20}}), plotConfig);
{% endif %}

{% if categorical_charts %}
  {% for cat in categorical_charts %}
    Plotly.newPlot('chart-cat-{{ loop.index }}', {{ cat.chart.data | safe }}, Object.assign({{ cat.chart.layout | safe }}, {margin:{t:10,b:60,l:40,r:10}, height:250}), plotConfig);
  {% endfor %}
{% endif %}
</script>
</body>
</html>
"""


def _skew_label(skew_val: float) -> str:
    abs_s = abs(skew_val)
    if abs_s < 0.5:
        return "Symmetric"
    elif abs_s < 1:
        return "Moderately Skewed"
    else:
        return "Highly Skewed"


def _skew_insight(name: str, skew_val: float) -> tuple[str, str]:
    abs_s = abs(skew_val)
    direction = "right" if skew_val > 0 else "left"
    if abs_s < 0.5:
        return ("Normally Distributed", f"{name} shows a roughly symmetric distribution, suitable for parametric statistical methods.")
    elif abs_s < 1:
        return ("Moderate Skew", f"{name} is moderately skewed to the {direction}. Consider log or Box-Cox transformation if using linear models.")
    else:
        return ("Heavy Skew", f"{name} is heavily skewed to the {direction} (skewness={skew_val:.2f}). Strongly consider transformation or non-parametric methods.")


def _corr_strength(val: float) -> str:
    abs_v = abs(val)
    if abs_v > 0.7:
        return "Strong"
    elif abs_v > 0.4:
        return "Moderate"
    elif abs_v > 0.2:
        return "Weak"
    return "Very Weak"


def _corr_interpretation(val: float) -> str:
    abs_v = abs(val)
    direction = "positive" if val > 0 else "negative"
    if abs_v > 0.7:
        return f"Strong {direction} relationship — potential multicollinearity risk; consider feature engineering."
    elif abs_v > 0.4:
        return f"Moderate {direction} relationship — useful predictive signal."
    elif abs_v > 0.2:
        return f"Weak {direction} relationship — limited standalone predictive value."
    return f"Negligible {direction} relationship."


def _outlier_recommendation(pct: float) -> str:
    if pct > 15:
        return "Investigate data quality; may indicate measurement errors or genuine extreme values."
    elif pct > 10:
        return "Consider winsorization or robust scaling before modeling."
    elif pct > 5:
        return "Monitor impact on model performance; robust methods recommended."
    return "Within acceptable range; no immediate action needed."


async def generate_html_report(
    dataset_name: str,
    summary: dict[str, Any],
    cleaning: dict[str, Any] | None = None,
    charts: dict[str, Any] | None = None,
    ai_summary: str | None = None,
    ml_result: dict[str, Any] | None = None,
    qa_results: list[dict] | None = None,
    df=None,
    eda_result: dict[str, Any] | None = None,
) -> str:
    from datetime import datetime
    import numpy as np

    generated_date = datetime.now().strftime("%B %d, %Y at %H:%M")

    rows = summary.get("rows", 0)
    cols = summary.get("columns", 0)
    missing_total = summary.get("missing_total", 0)
    missing_pct = round((missing_total / (rows * cols)) * 100, 1) if rows and cols else 0

    # Compute duplicate info
    duplicate_pct = 0
    if df is not None:
        dup_count = df.duplicated().sum()
        duplicate_pct = round((dup_count / len(df)) * 100, 1) if len(df) > 0 else 0

    # Compute memory
    memory_mb = 0
    if df is not None:
        memory_mb = round(df.memory_usage(deep=True).sum() / (1024 * 1024), 2)

    # Count types
    numeric_cols = summary.get("numeric_columns", 0)
    categorical_cols = summary.get("categorical_columns", 0)
    boolean_cols = 0
    datetime_cols = 0
    if df is not None:
        boolean_cols = int(df.select_dtypes(include=["bool"]).shape[1])
        datetime_cols = int(df.select_dtypes(include=["datetime64"]).shape[1])

    numeric_pct = round((numeric_cols / cols) * 100, 1) if cols else 0
    categorical_pct = round((categorical_cols / cols) * 100, 1) if cols else 0

    enriched_summary = {
        **summary,
        "missing_pct": missing_pct,
        "duplicate_pct": duplicate_pct,
        "numeric_pct": numeric_pct,
        "categorical_pct": categorical_pct,
        "boolean_columns": boolean_cols,
        "datetime_columns": datetime_cols,
        "memory_mb": memory_mb,
    }

    # Build top features profile
    top_features = []
    if df is not None:
        numeric_df = df.select_dtypes(include=[np.number])
        cat_df = df.select_dtypes(exclude=[np.number])
        # Pick top features by variance (numeric) or top categories
        feat_list = []
        for col in numeric_df.columns[:12]:
            miss = round(df[col].isna().mean() * 100, 1)
            uniq = df[col].nunique()
            mean_val = df[col].mean()
            central = f"{mean_val:,.2f}" if not np.isnan(mean_val) else "N/A"
            skew_v = df[col].skew()
            abs_s = abs(skew_v)
            if abs_s < 0.5:
                insight = "Symmetric distribution"
            elif abs_s < 1:
                insight = f"Skewed ({_skew_label(skew_v).lower()})"
            else:
                insight = f"Heavily skewed — needs transformation"
            feat_list.append({"name": col, "type": "Numeric", "missing_pct": miss, "unique": uniq, "central_value": central, "insight": insight})
        for col in cat_df.columns[:6]:
            miss = round(df[col].isna().mean() * 100, 1)
            uniq = df[col].nunique()
            mode_val = df[col].mode().iloc[0] if not df[col].mode().empty else "N/A"
            central = str(mode_val)[:40]
            insight = f"{uniq} unique values"
            feat_list.append({"name": col, "type": "Categorical", "missing_pct": miss, "unique": uniq, "central_value": central, "insight": insight})
        top_features = feat_list[:12]

    # Stats table
    stats_table = []
    if df is not None:
        numeric_df = df.select_dtypes(include=[np.number])
        for col in numeric_df.columns[:10]:
            s = numeric_df[col].dropna()
            if len(s) == 0:
                continue
            skew_v = s.skew()
            stats_table.append({
                "name": col,
                "mean": f"{s.mean():,.2f}",
                "std": f"{s.std():,.2f}",
                "min": f"{s.min():,.2f}",
                "q25": f"{s.quantile(0.25):,.2f}",
                "median": f"{s.median():,.2f}",
                "q75": f"{s.quantile(0.75):,.2f}",
                "max": f"{s.max():,.2f}",
                "skew": f"{skew_v:.2f}",
                "skew_abs": abs(skew_v),
            })

    # Distributions
    distributions = []
    if charts and "histograms" in charts and charts["histograms"]:
        if isinstance(charts["histograms"], dict):
            items = list(charts["histograms"].items())[:8]
        else:
            items = [(h, charts["histograms"][h]) if isinstance(charts["histograms"], dict) else (h, None) for h in charts["histograms"][:8]]
            items = [(name, chart) for name, chart in items if chart is not None]

        for name, chart in items:
            skew_v = 0
            if df is not None and name in df.columns and np.issubdtype(df[name].dtype, np.number):
                skew_v = df[name].skew()
            abs_s = abs(skew_v)
            label = _skew_label(skew_v)
            insight_title, insight = _skew_insight(name, skew_v)
            distributions.append({
                "name": name,
                "chart": chart,
                "skew": f"{skew_v:.2f}",
                "skew_abs": abs_s,
                "skew_label": label,
                "insight_title": insight_title,
                "insight": insight,
            })

    # Correlation
    corr_chart = charts.get("correlation") if charts else None
    top_correlations = []
    if corr_chart and df is not None:
        numeric_df = df.select_dtypes(include=[np.number])
        corr_matrix = numeric_df.corr()
        pairs = []
        for i in range(len(corr_matrix.columns)):
            for j in range(i + 1, len(corr_matrix.columns)):
                val = corr_matrix.iloc[i, j]
                if not np.isnan(val) and abs(val) > 0.15:
                    pairs.append({
                        "pair": f"{corr_matrix.columns[i]} × {corr_matrix.columns[j]}",
                        "value": f"{val:.3f}",
                        "abs": abs(val),
                        "strength": _corr_strength(val),
                        "interpretation": _corr_interpretation(val),
                    })
        pairs.sort(key=lambda x: x["abs"], reverse=True)
        top_correlations = pairs[:8]

    # Outliers
    outlier_chart = charts.get("boxplots") if charts else None
    outlier_details = []
    if df is not None:
        numeric_df = df.select_dtypes(include=[np.number])
        for col in numeric_df.columns[:10]:
            s = numeric_df[col].dropna()
            if len(s) == 0:
                continue
            q1, q3 = s.quantile(0.25), s.quantile(0.75)
            iqr = q3 - q1
            lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
            count = int(((s < lower) | (s > upper)).sum())
            pct = round(count / len(s) * 100, 1) if len(s) > 0 else 0
            if count > 0:
                severity = "High" if pct > 10 else ("Moderate" if pct > 5 else "Low")
                outlier_details.append({
                    "name": col,
                    "count": count,
                    "pct": pct,
                    "severity": severity,
                    "recommendation": _outlier_recommendation(pct),
                })
        outlier_details.sort(key=lambda x: x["pct"], reverse=True)

    # Categorical charts
    categorical_charts = []
    if charts and "value_counts" in charts and charts["value_counts"]:
        for name, chart in list(charts["value_counts"].items())[:4]:
            unique = df[name].nunique() if df is not None and name in df.columns else 0
            top_val = df[name].mode().iloc[0] if df is not None and name in df.columns and not df[name].mode().empty else ""
            insight = f"Most frequent: {str(top_val)[:50]} ({unique} categories)"
            categorical_charts.append({"name": name, "chart": chart, "unique": unique, "insight": insight})

    # Missing chart
    missing_chart = charts.get("missing") if charts else None

    # Executive summary
    executive_summary = ai_summary or f"Analysis of {dataset_name} covering {rows:,} records across {cols} features ({numeric_cols} numeric, {categorical_cols} categorical). Data quality: {missing_pct}% missing values, {duplicate_pct}% duplicates."

    # Insights
    insights = []
    if missing_pct > 5:
        insights.append({"title": "High Missing Data", "text": f"{missing_pct}% of values are missing — this may bias analyses and reduce model performance.", "color": "#dc2626"})
    elif missing_pct > 0:
        insights.append({"title": "Minor Missing Data", "text": f"{missing_pct}% missing values detected — imputation strategies were applied.", "color": "#d97706"})

    heavy_skew = [s["name"] for s in stats_table if s["skew_abs"] > 1]
    if heavy_skew:
        insights.append({"title": "Skewed Distributions", "text": f"Features with heavy skew: {', '.join(heavy_skew[:5])}. Consider log/Box-Cox transformations.", "color": "#d97706"})

    strong_corr = [c for c in top_correlations if c["abs"] > 0.7]
    if strong_corr:
        pairs_str = ", ".join([c["pair"] for c in strong_corr[:3]])
        insights.append({"title": "Multicollinearity Warning", "text": f"Strong correlations detected: {pairs_str}. Consider dropping or combining features.", "color": "#dc2626"})

    high_outlier = [o for o in outlier_details if o["pct"] > 10]
    if high_outlier:
        names = ", ".join([o["name"] for o in high_outlier[:3]])
        insights.append({"title": "Significant Outliers", "text": f"Features with >10% outliers: {names}. Investigate for data quality issues.", "color": "#dc2626"})

    if not insights:
        insights.append({"title": "Good Data Quality", "text": "The dataset shows acceptable quality across all assessed dimensions.", "color": "#059669"})

    # Recommendations
    recommendations = []
    if missing_pct > 5:
        recommendations.append("Address missing values before modeling — consider multiple imputation or indicator variables.")
    if heavy_skew:
        recommendations.append(f"Apply transformations to skewed features: {', '.join(heavy_skew[:3])}.")
    if high_outlier:
        recommendations.append("Investigate outliers for data entry errors; apply winsorization if genuine.")
    if strong_corr:
        recommendations.append("Resolve multicollinearity by dropping one feature from each highly correlated pair.")
    recommendations.append("Engineer domain-specific features to capture non-linear relationships.")
    recommendations.append("Validate findings with domain experts before making business decisions.")
    recommendations.append("Consider collecting additional data for underrepresented categories.")

    template = Template(REPORT_TEMPLATE)
    return template.render(
        title=f"Data Analysis Report — {dataset_name}",
        dataset_name=dataset_name,
        generated_date=generated_date,
        summary=enriched_summary,
        executive_summary=executive_summary,
        top_features=top_features,
        cleaning=cleaning,
        stats_table=stats_table,
        distributions=distributions,
        corr_chart=corr_chart,
        top_correlations=top_correlations,
        outlier_chart=outlier_chart,
        outlier_details=outlier_details,
        categorical_charts=categorical_charts,
        missing_chart=missing_chart,
        insights=insights,
        recommendations=recommendations,
        charts=charts,
        ai_summary=ai_summary,
        ml_result=ml_result,
        qa_results=qa_results or [],
    )


async def export_pdf(html: str) -> bytes:
    try:
        from xhtml2pdf import pisa
        from io import BytesIO
        output = BytesIO()
        pisa_status = pisa.CreatePDF(html, dest=output, encoding="utf-8")
        if pisa_status.err:
            raise RuntimeError(f"xhtml2pdf conversion error: {pisa_status.err}")
        return output.getvalue()
    except Exception as e:
        raise RuntimeError(f"PDF generation failed: {e}")
