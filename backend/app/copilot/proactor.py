from dataclasses import dataclass, field


@dataclass
class Insight:
    type: str
    message: str
    confidence: float
    suggestion: str = ""
    severity: str = "info"


class ProactiveInsights:
    async def scan_after_tool(self, tool_name: str, tool_result: dict, dataset_context: dict) -> list[Insight]:
        insights = []

        if tool_name == "cleaning":
            metrics_before = tool_result.get("metrics_before", {})
            metrics_after = tool_result.get("metrics_after", {})
            quality_before = metrics_before.get("quality_pct", 0)
            quality_after = metrics_after.get("quality_pct", 0)

            if quality_after > quality_before:
                insights.append(Insight(
                    type="impact",
                    message=f"Data quality improved from {quality_before}% to {quality_after}%",
                    confidence=0.95,
                    suggestion="Ready for EDA or ML training",
                ))

            missing_before = metrics_before.get("missing", 0)
            if missing_before > 0:
                insights.append(Insight(
                    type="detail",
                    message=f"Filled {missing_before} missing values using median/mode imputation",
                    confidence=0.9,
                    suggestion="Check if imputation strategy is appropriate for your use case",
                ))

        if tool_name == "eda":
            insights.append(Insight(
                type="next_step",
                message="EDA complete — data distributions and correlations mapped",
                confidence=0.95,
                suggestion="Train ML models to find predictive patterns, or generate a dashboard for monitoring",
            ))

        if tool_name == "ml":
            best_score = tool_result.get("best_score")
            best_model = tool_result.get("best_model", "")
            problem_type = tool_result.get("problem_type", "")

            if best_score is not None:
                if best_score >= 0.9:
                    insights.append(Insight(
                        type="success",
                        message=f"Excellent model performance: {best_model} achieved {best_score:.1%} {tool_result.get('best_metric', 'score')}",
                        confidence=0.9,
                        suggestion="Model is production-ready. Consider deploying as REST API or Docker container",
                    ))
                elif best_score >= 0.7:
                    insights.append(Insight(
                        type="good",
                        message=f"Good model performance: {best_model} achieved {best_score:.1%}",
                        confidence=0.85,
                        suggestion="Try the Pipeline Optimizer to squeeze out more performance",
                    ))
                else:
                    insights.append(Insight(
                        type="warning",
                        message=f"Model performance is moderate ({best_score:.1%}). May need more features or data.",
                        confidence=0.8,
                        suggestion="Consider feature engineering, more data, or different algorithms",
                    ))

        if tool_name == "business":
            risks = tool_result.get("data", {}).get("risks", [])
            if risks:
                high_risks = [r for r in risks if isinstance(r, dict) and r.get("severity") == "high"]
                if high_risks:
                    insights.append(Insight(
                        type="risk",
                        message=f"{len(high_risks)} high-severity risks identified",
                        confidence=0.8,
                        suggestion="Review and address high-severity risks before proceeding",
                        severity="high",
                    ))

        if tool_name == "timeseries":
            trend = tool_result.get("data", {}).get("trend", "")
            change_pct = tool_result.get("data", {}).get("change_pct", 0)
            if abs(change_pct) > 20:
                insights.append(Insight(
                    type="alert",
                    message=f"Significant trend detected: {trend} ({change_pct}% change)",
                    confidence=0.8,
                    suggestion="Investigate the root cause of this trend",
                    severity="high" if abs(change_pct) > 50 else "medium",
                ))

        return insights

    async def scan_proactive(self, df, dataset_context: dict) -> list[Insight]:
        insights = []

        missing_pct = df.isnull().sum().sum() / (len(df) * len(df.columns)) * 100
        if missing_pct > 20:
            insights.append(Insight(
                type="alert",
                message=f"High missing data rate: {missing_pct:.1f}% of all values are missing",
                confidence=0.95,
                suggestion="Consider imputation strategies or dropping heavily incomplete columns",
                severity="high",
            ))

        dupes = df.duplicated().sum()
        if dupes > len(df) * 0.1:
            insights.append(Insight(
                type="warning",
                message=f"{int(dupes)} duplicate rows ({dupes/len(df)*100:.1f}% of data)",
                confidence=0.95,
                suggestion="Remove duplicates to avoid biasing analysis",
                severity="medium",
            ))

        num_cols = df.select_dtypes(include=["number"]).columns
        for col in num_cols:
            skew = df[col].skew()
            if abs(skew) > 2:
                insights.append(Insight(
                    type="distribution",
                    message=f"'{col}' is highly skewed (skewness: {skew:.2f})",
                    confidence=0.85,
                    suggestion="Consider log transformation for better model performance",
                ))
                break

        return insights
