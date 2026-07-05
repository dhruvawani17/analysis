"use client";

import { use, useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Send,
  Loader2,
  Bot,
  User,
  Sparkles,
  Play,
  CheckCircle2,
  XCircle,
  BarChart3,
  Brain,
  Wand2,
  TrendingUp,
  TrendingDown,
  FileText,
  Lightbulb,
  LayoutDashboard,
  Target,
  Shield,
  GitBranch,
  Globe,
  Bell,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { CopilotMessage, ToolResult, CopilotContext } from "@/lib/types";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

/* ─── Markdown-ish renderer ─── */
function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let inList = false;
  const listItems: React.ReactNode[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(<ul key={`ul-${elements.length}`} className="list-disc ml-5 space-y-0.5 my-1">{listItems.splice(0)}</ul>);
      inList = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("- ")) {
      inList = true;
      listItems.push(<li key={i} className="text-sm">{renderInline(line.slice(2))}</li>);
      continue;
    }
    flushList();
    if (line.startsWith("## ")) {
      elements.push(<h3 key={i} className="text-base font-bold mt-3 mb-1">{renderInline(line.slice(3))}</h3>);
    } else if (line.startsWith("### ")) {
      elements.push(<h4 key={i} className="text-sm font-semibold mt-2 mb-1">{renderInline(line.slice(4))}</h4>);
    } else if (line.trim() === "") {
      elements.push(<br key={i} />);
    } else {
      elements.push(<p key={i} className="text-sm leading-relaxed">{renderInline(line)}</p>);
    }
  }
  flushList();
  return elements;
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIdx = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) parts.push(text.slice(lastIdx, match.index));
    parts.push(<strong key={match.index} className="font-semibold">{match[1]}</strong>);
    lastIdx = regex.lastIndex;
  }
  parts.push(text.slice(lastIdx));
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

/* ─── EDA Renderer ─── */
function renderEDAInline(data: Record<string, any>) {
  const charts = data.charts || {};
  const stats = data.stats || {};
  const insights = data.insights || [];

  return (
    <div className="mt-3 space-y-3">
      {/* Insights */}
      {insights.length > 0 && (
        <Card className="bg-amber-50/50 border-amber-200">
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-amber-700 mb-1">Key Insights</p>
            {insights.slice(0, 5).map((ins: any, i: number) => (
              <p key={i} className="text-xs text-amber-800 ml-2">• {ins.message}</p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Stats Table */}
      {Object.keys(stats).length > 0 && (
        <Card className="bg-white border-indigo-100">
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-gray-700 mb-2">Numeric Statistics</p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-indigo-100">
                    <TableHead className="text-xs py-1">Column</TableHead>
                    <TableHead className="text-xs py-1">Mean</TableHead>
                    <TableHead className="text-xs py-1">Std</TableHead>
                    <TableHead className="text-xs py-1">Min</TableHead>
                    <TableHead className="text-xs py-1">Median</TableHead>
                    <TableHead className="text-xs py-1">Max</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(stats).slice(0, 8).map(([col, s]: [string, any]) => (
                    <TableRow key={col} className="border-indigo-50">
                      <TableCell className="font-mono text-xs py-1">{col}</TableCell>
                      <TableCell className="text-xs py-1">{s.mean?.toFixed(1) ?? "-"}</TableCell>
                      <TableCell className="text-xs py-1">{s.std?.toFixed(1) ?? "-"}</TableCell>
                      <TableCell className="text-xs py-1">{s.min?.toFixed(1) ?? "-"}</TableCell>
                      <TableCell className="text-xs py-1">{s.median?.toFixed(1) ?? "-"}</TableCell>
                      <TableCell className="text-xs py-1">{s.max?.toFixed(1) ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Correlation Chart */}
      {charts.correlation && (
        <Card className="bg-white border-indigo-100">
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-gray-700 mb-1">Correlation Matrix</p>
            <Plot
              data={charts.correlation.data}
              layout={{ ...charts.correlation.layout, height: 280, margin: { t: 5, b: 40, l: 50, r: 20 } }}
              config={{ responsive: true, displayModeBar: false }}
              className="w-full"
            />
          </CardContent>
        </Card>
      )}

      {/* Histograms */}
      {charts.histograms && (
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(charts.histograms).slice(0, 4).map(([col, chart]: [string, any]) => (
            <Card key={col} className="bg-white border-indigo-100">
              <CardContent className="p-2">
                <Plot
                  data={chart.data}
                  layout={{ ...chart.layout, height: 180, margin: { t: 5, b: 30, l: 40, r: 10 } }}
                  config={{ responsive: true, displayModeBar: false }}
                  className="w-full"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Missing Values */}
      {charts.missing && (
        <Card className="bg-white border-indigo-100">
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-gray-700 mb-1">Missing Values</p>
            <Plot
              data={charts.missing.data}
              layout={{ ...charts.missing.layout, height: 200, margin: { t: 5, b: 40, l: 50, r: 20 } }}
              config={{ responsive: true, displayModeBar: false }}
              className="w-full"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ─── Dashboard Renderer ─── */
function renderDashboardInline(data: Record<string, any>) {
  const kpis = data.kpis || [];
  const renderedCharts = data.rendered_charts || [];
  const title = data.title || "Dashboard";

  return (
    <div className="mt-3 space-y-3">
      <p className="text-xs font-semibold text-indigo-700">{title}</p>

      {/* KPIs */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {kpis.map((kpi: any, i: number) => (
            <Card key={i} className="bg-white border-indigo-100 overflow-hidden">
              <CardContent className="p-3">
                <p className="text-[10px] font-medium text-gray-500">{kpi.name}</p>
                <p className="text-lg font-bold text-gray-900">{kpi.value}</p>
                {kpi.trend && (
                  <p className={`text-[10px] font-medium flex items-center gap-0.5 ${String(kpi.trend).startsWith("+") ? "text-emerald-600" : String(kpi.trend).startsWith("-") ? "text-red-600" : "text-gray-500"}`}>
                    {String(kpi.trend).startsWith("+") ? <TrendingUp className="h-2.5 w-2.5" /> : String(kpi.trend).startsWith("-") ? <TrendingDown className="h-2.5 w-2.5" /> : null}
                    {kpi.trend}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Rendered Plotly Charts */}
      {renderedCharts.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {renderedCharts.map((chart: any, i: number) => (
            <Card key={i} className="bg-white border-indigo-100">
              <CardContent className="p-2">
                <p className="text-[10px] font-semibold text-gray-700 mb-1">{chart.title}</p>
                {chart.plotly ? (
                  <Plot
                    data={chart.plotly.data}
                    layout={{ ...chart.plotly.layout, height: 220, margin: { t: 5, b: 30, l: 40, r: 10 } }}
                    config={{ responsive: true, displayModeBar: false }}
                    className="w-full"
                  />
                ) : (
                  <div className="h-[160px] bg-gray-50 rounded flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="h-6 w-6 text-gray-300 mx-auto mb-1" />
                      <p className="text-[9px] text-gray-400">{chart.type}: {chart.title}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── ML Renderer ─── */
function renderMLInline(data: Record<string, any>) {
  const results = data.all_results || [];
  const bestModel = data.best_model || "";
  const bestScore = data.best_score;
  const problemType = data.problem_type || "";
  const llmAnalysis = data.llm_analysis || {};
  const featureEngineering = data.feature_engineering || {};

  return (
    <div className="mt-3 space-y-3">
      {/* Best Model Badge */}
      {bestModel && (
        <div className="flex items-center gap-2">
          <Badge className="bg-violet-500 text-white">{bestModel}</Badge>
          <span className="text-sm font-semibold text-gray-900">
            {bestScore != null ? `${(bestScore * 100).toFixed(1)}%` : "N/A"}
          </span>
          <Badge variant="outline" className="text-xs border-gray-200">{problemType}</Badge>
        </div>
      )}

      {/* Model Comparison */}
      {results.length > 0 && (
        <Card className="bg-white border-indigo-100">
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-gray-700 mb-2">Model Comparison</p>
            <div className="space-y-1.5">
              {results.filter((r: any) => r.test_score != null).map((r: any, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={`text-xs w-24 truncate ${r.model === bestModel ? "font-bold text-violet-700" : "text-gray-600"}`}>{r.model}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${r.model === bestModel ? "bg-gradient-to-r from-violet-400 to-purple-500" : "bg-indigo-300"}`}
                      style={{ width: `${(r.test_score || 0) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-12 text-right">{(r.test_score * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feature Engineering */}
      {featureEngineering.applied && featureEngineering.applied.length > 0 && (
        <Card className="bg-violet-50/50 border-violet-200">
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-violet-700 mb-1">Feature Engineering</p>
            {featureEngineering.applied.map((f: string, i: number) => (
              <p key={i} className="text-xs text-violet-800 ml-2">• {f}</p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* LLM Analysis */}
      {llmAnalysis.summary && (
        <Card className="bg-indigo-50/50 border-indigo-200">
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-indigo-700 mb-1">AI Analysis</p>
            <p className="text-xs text-indigo-800 mb-2">{llmAnalysis.summary}</p>
            {llmAnalysis.key_findings && llmAnalysis.key_findings.length > 0 && (
              <div className="mb-2">
                <p className="text-[10px] font-medium text-indigo-600 mb-0.5">Findings:</p>
                {llmAnalysis.key_findings.slice(0, 3).map((f: any, i: number) => (
                  <p key={i} className="text-[11px] text-indigo-700 ml-2">• {typeof f === "string" ? f : f.finding || f.text || JSON.stringify(f)}</p>
                ))}
              </div>
            )}
            {llmAnalysis.recommendations && llmAnalysis.recommendations.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-indigo-600 mb-0.5">Recommendations:</p>
                {llmAnalysis.recommendations.slice(0, 3).map((r: any, i: number) => (
                  <p key={i} className="text-[11px] text-indigo-700 ml-2">• {typeof r === "string" ? r : r.recommendation || r.text || JSON.stringify(r)}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ─── Story Renderer ─── */
function renderStoryInline(data: Record<string, any>) {
  const title = data.title || "Data Story";
  const narrative = data.narrative || [];
  const conclusion = data.conclusion || "";
  const takeaways = data.key_takeaways || [];

  return (
    <div className="mt-3 space-y-3">
      <Card className="bg-gradient-to-r from-indigo-50 to-violet-50 border-indigo-200">
        <CardContent className="p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-2">{title}</h3>
          {narrative.map((section: any, i: number) => (
            <div key={i} className="mb-3">
              <h4 className="text-xs font-semibold text-indigo-700 mb-1">{section.section}</h4>
              <p className="text-xs text-gray-700 leading-relaxed">{section.content}</p>
            </div>
          ))}
          {conclusion && (
            <div className="mt-2 p-2 bg-indigo-100/50 rounded-lg">
              <p className="text-xs font-semibold text-indigo-700 mb-0.5">Conclusion</p>
              <p className="text-xs text-indigo-800">{conclusion}</p>
            </div>
          )}
          {takeaways.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-indigo-700 mb-1">Key Takeaways</p>
              {takeaways.map((t: any, i: number) => (
                <p key={i} className="text-[11px] text-indigo-800 ml-2">• {typeof t === "string" ? t : t.takeaway || JSON.stringify(t)}</p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Business Analysis Renderer ─── */
function renderBusinessInline(data: Record<string, any>) {
  const summary = data.executive_summary || "";
  const insights = data.key_insights || [];
  const risks = data.risks || [];
  const opportunities = data.opportunities || [];
  const recommendations = data.recommendations || [];
  const actionItems = data.action_items || [];

  return (
    <div className="mt-3 space-y-3">
      {summary && (
        <Card className="bg-indigo-50/50 border-indigo-200">
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-indigo-700 mb-1">Executive Summary</p>
            <p className="text-xs text-indigo-800 leading-relaxed">{summary}</p>
          </CardContent>
        </Card>
      )}

      {insights.length > 0 && (
        <Card className="bg-emerald-50/50 border-emerald-200">
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-emerald-700 mb-1">Key Insights</p>
            {insights.slice(0, 5).map((ins: any, i: number) => (
              <p key={i} className="text-xs text-emerald-800 ml-2">• {ins.insight || ins.message || JSON.stringify(ins)}</p>
            ))}
          </CardContent>
        </Card>
      )}

      {risks.length > 0 && (
        <Card className="bg-red-50/50 border-red-200">
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-red-700 mb-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Risks</p>
            {risks.slice(0, 3).map((r: any, i: number) => (
              <p key={i} className="text-xs text-red-800 ml-2">• {r.risk || r.message || JSON.stringify(r)} {r.severity && <Badge className="ml-1 text-[9px] bg-red-100 text-red-700">{r.severity}</Badge>}</p>
            ))}
          </CardContent>
        </Card>
      )}

      {opportunities.length > 0 && (
        <Card className="bg-blue-50/50 border-blue-200">
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1"><Lightbulb className="h-3 w-3" /> Opportunities</p>
            {opportunities.slice(0, 3).map((o: any, i: number) => (
              <p key={i} className="text-xs text-blue-800 ml-2">• {o.opportunity || o.message || JSON.stringify(o)}</p>
            ))}
          </CardContent>
        </Card>
      )}

      {recommendations.length > 0 && (
        <Card className="bg-violet-50/50 border-violet-200">
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-violet-700 mb-1 flex items-center gap-1"><Target className="h-3 w-3" /> Recommendations</p>
            {recommendations.slice(0, 5).map((r: any, i: number) => (
              <p key={i} className="text-xs text-violet-800 ml-2">• {typeof r === "string" ? r : r.recommendation || JSON.stringify(r)}</p>
            ))}
          </CardContent>
        </Card>
      )}

      {actionItems.length > 0 && (
        <Card className="bg-amber-50/50 border-amber-200">
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-amber-700 mb-1">Action Items</p>
            {actionItems.map((a: any, i: number) => (
              <p key={i} className="text-xs text-amber-800 ml-2">• {typeof a === "string" ? a : a.action || JSON.stringify(a)}</p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ─── Cleaning Renderer ─── */
function renderCleaningInline(data: Record<string, any>) {
  return (
    <div className="mt-3">
      <Card className="bg-emerald-50/50 border-emerald-200">
        <CardContent className="p-3">
          <div className="grid grid-cols-4 gap-2 mb-2">
            {[
              { label: "Original", value: data.original_rows },
              { label: "Final", value: data.final_rows },
              { label: "Missing Fixed", value: data.missing_fixed },
              { label: "Duplicates Removed", value: data.duplicates_removed },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <p className="text-lg font-bold text-gray-900">{item.value ?? 0}</p>
                <p className="text-[9px] text-gray-500">{item.label}</p>
              </div>
            ))}
          </div>
          {data.cleaning_summary && (
            <p className="text-xs text-emerald-700">{data.cleaning_summary}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Time Series Renderer ─── */
function renderTimeseriesInline(data: Record<string, any>) {
  const forecast = data.forecast || [];
  const trend = data.trend || "";
  const changePct = data.change_pct || 0;

  return (
    <div className="mt-3">
      <Card className="bg-white border-indigo-100">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className={trend === "increasing" ? "border-emerald-300 text-emerald-700" : "border-red-300 text-red-700"}>
              {trend === "increasing" ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              {trend} ({changePct}%)
            </Badge>
          </div>
          {forecast.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-700 mb-1">Forecast ({data.periods} periods)</p>
              <div className="flex gap-1 flex-wrap">
                {forecast.map((v: number, i: number) => (
                  <Badge key={i} variant="secondary" className="text-[9px] bg-indigo-50">{v.toFixed(0)}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Notebook / Deploy Renderer ─── */
function renderCodeInline(data: Record<string, any>, tool: string) {
  const code = data.code || data.notebook || "";
  const filename = data.filename || "";
  const requirements = data.requirements || "";

  return (
    <div className="mt-3">
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-3">
          {filename && <p className="text-[10px] text-gray-400 mb-1">{filename}</p>}
          <pre className="text-[11px] text-green-400 overflow-x-auto max-h-40 overflow-y-auto font-mono">
            {typeof code === "string" ? code.slice(0, 1000) : JSON.stringify(code, null, 2).slice(0, 1000)}
            {(typeof code === "string" ? code.length : JSON.stringify(code).length) > 1000 && "\n... (truncated)"}
          </pre>
          {requirements && (
            <div className="mt-2">
              <p className="text-[10px] text-gray-400 mb-0.5">Requirements:</p>
              <pre className="text-[10px] text-gray-300 font-mono">{typeof requirements === "string" ? requirements : JSON.stringify(requirements)}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── HTML Report Renderer ─── */
function renderReportInline(data: Record<string, any>) {
  const html = data.html || "";
  const datasetId = data.dataset_id;

  if (!html) return null;

  return (
    <div className="mt-3 space-y-2">
      <Card className="bg-white border-indigo-100 overflow-hidden">
        <div className="p-2 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
          <p className="text-xs font-semibold text-indigo-700">Report Preview</p>
          {datasetId && (
            <a
              href={`/api/reports/download/${datasetId}?format=pdf`}
              download
              className="text-[10px] bg-indigo-500 text-white px-2 py-1 rounded hover:bg-indigo-600 transition-colors"
            >
              Download PDF
            </a>
          )}
        </div>
        <div className="h-[500px] overflow-y-auto">
          <iframe
            srcDoc={html}
            className="w-full h-full border-0"
            title="Report Preview"
          />
        </div>
      </Card>
    </div>
  );
}

function renderGoalInline(data: Record<string, any>) {
  const goal = data.goal || "";
  const problemType = data.problem_type || "";
  const targetColumn = data.target_column || "";
  const suggestedModels = data.suggested_models || [];
  const suggestedMetrics = data.suggested_metrics || [];

  return (
    <div className="mt-3 space-y-2">
      <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
        <CardContent className="p-3">
          <p className="text-sm font-semibold text-emerald-800">Detected Goal: {goal}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge className="text-[10px] bg-emerald-100 text-emerald-700">{problemType}</Badge>
            {targetColumn && <Badge className="text-[10px] bg-blue-100 text-blue-700">Target: {targetColumn}</Badge>}
          </div>
          {suggestedModels.length > 0 && (
            <p className="text-[11px] text-gray-600 mt-1">Models: {suggestedModels.join(", ")}</p>
          )}
          {suggestedMetrics.length > 0 && (
            <p className="text-[11px] text-gray-600">Metrics: {suggestedMetrics.join(", ")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function renderConfidenceInline(data: Record<string, any>) {
  const issues = data.issues || [];
  const critical = issues.filter((i: any) => i.severity === "critical");
  const warnings = issues.filter((i: any) => i.severity === "warning");

  return (
    <div className="mt-3 space-y-2">
      {critical.length > 0 && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-red-700 mb-1">🔴 Critical ({critical.length})</p>
            {critical.map((i: any, idx: number) => (
              <p key={idx} className="text-[11px] text-red-600 ml-2">• {i.message}</p>
            ))}
          </CardContent>
        </Card>
      )}
      {warnings.length > 0 && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-amber-700 mb-1">🟡 Warnings ({warnings.length})</p>
            {warnings.map((i: any, idx: number) => (
              <p key={idx} className="text-[11px] text-amber-600 ml-2">• {i.message}</p>
            ))}
          </CardContent>
        </Card>
      )}
      {critical.length === 0 && warnings.length === 0 && (
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-emerald-700">✅ All checks passed — ready for modeling</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function renderPlaygroundInline(data: Record<string, any>) {
  const models = data.models || [];
  const best = data.best_model || "";
  const problemType = data.problem_type || "";

  return (
    <div className="mt-3 space-y-2">
      {models.length > 0 && (
        <div className="space-y-1">
          {models.map((m: any, idx: number) => (
            <Card key={idx} className={`${m.name === best ? "bg-gradient-to-r from-violet-50 to-purple-50 border-violet-300" : "bg-white border-gray-100"}`}>
              <CardContent className="p-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-xs">{m.name}</p>
                    {m.name === best && <Badge className="text-[10px] bg-violet-100 text-violet-700">Best</Badge>}
                  </div>
                  <p className="text-xs font-mono font-bold">{problemType === "classification" ? (m.test_score * 100).toFixed(1) + "%" : m.test_score.toFixed(4)}</p>
                </div>
                <div className="flex gap-3 mt-1 text-[10px] text-gray-500">
                  {m.training_time > 0 && <span>⏱ {m.training_time}s</span>}
                  {m.inference_speed > 0 && <span>⚡ {m.inference_speed.toLocaleString()} pred/s</span>}
                  {m.model_size_kb > 0 && <span>💾 {m.model_size_kb}KB</span>}
                  {m.explainability > 0 && <span>🔍 {m.explainability}/10</span>}
                </div>
                {m.feature_importance && Object.keys(m.feature_importance).length > 0 && (
                  <div className="flex gap-2 mt-1">
                    {Object.entries(m.feature_importance).slice(0, 3).map(([f, v]: [string, any]) => (
                      <Badge key={f} className="text-[9px] bg-gray-100 text-gray-600">{f}: {(v as number).toFixed(2)}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function renderSimulationInline(data: Record<string, any>) {
  const pctImpact = data.percentage_impact || 0;
  const direction = data.direction || "neutral";
  const baseline = data.baseline_mean || 0;
  const scenario = data.scenario_mean || 0;
  const targetCol = data.target_column || "";
  const analysis = data.analysis || "";
  const changesApplied = data.changes_applied || [];

  return (
    <div className="mt-3 space-y-2">
      <Card className={`${direction === "increase" ? "bg-emerald-50 border-emerald-200" : direction === "decrease" ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{direction === "increase" ? "📈" : direction === "decrease" ? "📉" : "➡️"}</span>
            <span className="text-lg font-bold">{pctImpact > 0 ? "+" : ""}{pctImpact}%</span>
            <span className="text-xs text-gray-600">impact on {targetCol}</span>
          </div>
          <div className="text-xs text-gray-600">
            Baseline: {baseline.toFixed(2)} → Scenario: {scenario.toFixed(2)}
          </div>
          {changesApplied.length > 0 && (
            <div className="mt-2">
              <p className="text-[11px] font-semibold text-gray-700">Changes:</p>
              {changesApplied.map((c: any, idx: number) => (
                <p key={idx} className="text-[10px] text-gray-500 ml-2">• {c.column}: {c.original_mean} → {c.new_mean} ({(c.change_pct >= 0 ? "+" : "")}{c.change_pct}%)</p>
              ))}
            </div>
          )}
          {analysis && (
            <div className="mt-2 p-2 bg-white/70 rounded text-[11px] text-gray-700">{analysis}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function renderLineageInline(data: Record<string, any>) {
  const lineage = data.lineage || [];

  return (
    <div className="mt-3">
      <Card className="bg-white border-indigo-100">
        <CardContent className="p-3">
          <div className="space-y-0">
            {lineage.map((step: any, idx: number) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full ${step.is_current ? "bg-indigo-500 ring-2 ring-indigo-200" : "bg-gray-300"}`} />
                  {idx < lineage.length - 1 && <div className="w-0.5 h-8 bg-gray-200" />}
                </div>
                <div className={`pb-4 ${step.is_current ? "font-semibold" : ""}`}>
                  <p className="text-xs text-gray-800">{step.label}</p>
                  <p className="text-[10px] text-gray-500">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function renderMarketplaceInline(data: Record<string, any>) {
  const datasets = data.datasets || [];

  return (
    <div className="mt-3 space-y-2">
      {datasets.map((ds: any, idx: number) => (
        <Card key={idx} className="bg-white border-indigo-100">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-800">{ds.name}</p>
              <Badge className="text-[10px] bg-indigo-100 text-indigo-700">{ds.relevance_score}/10</Badge>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">{ds.description}</p>
            <div className="flex gap-2 mt-1">
              <Badge className="text-[9px] bg-gray-100 text-gray-600">{ds.source}</Badge>
              <Badge className="text-[9px] bg-gray-100 text-gray-600">{ds.suggested_join}</Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function renderAlertingInline(data: Record<string, any>) {
  const alerts = data.alerts || [];

  return (
    <div className="mt-3 space-y-1">
      {alerts.map((a: any, idx: number) => (
        <Card key={idx} className={`${a.severity === "critical" ? "bg-red-50 border-red-200" : a.severity === "warning" ? "bg-amber-50 border-amber-200" : a.severity === "success" ? "bg-emerald-50 border-emerald-200" : "bg-blue-50 border-blue-200"}`}>
          <CardContent className="p-2.5">
            <div className="flex items-start gap-2">
              <span className="mt-0.5">{a.severity === "critical" ? "🔴" : a.severity === "warning" ? "🟡" : a.severity === "success" ? "✅" : "ℹ️"}</span>
              <div>
                <p className="text-xs font-semibold text-gray-800">{a.title}</p>
                <p className="text-[10px] text-gray-500">{a.message}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ─── Main Tool Result Renderer ─── */
function ToolResultCard({ result }: { result: ToolResult }) {
  const statusIcon = result.status === "success" ? (
    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
  ) : (
    <XCircle className="h-4 w-4 text-red-500" />
  );

  const toolIcons: Record<string, typeof Brain> = {
    cleaning: Wand2, eda: BarChart3, ml: Brain, dashboard: LayoutDashboard,
    story: FileText, timeseries: TrendingUp, business: Lightbulb,
    summary: Sparkles, notebook: FileText, deploy: Play, edit: Wand2,
    qa: BarChart3, optimizer: Brain, report: FileText, workflow: Play,
    goal: Target, confidence: Shield, playground: Brain,
    simulation: TrendingUp, lineage: GitBranch, marketplace: Globe,
    alerting: Bell,
  };
  const ToolIcon = toolIcons[result.tool] || Brain;

  const toolColors: Record<string, string> = {
    cleaning: "from-emerald-50 to-teal-50 border-emerald-200",
    eda: "from-indigo-50 to-blue-50 border-indigo-200",
    ml: "from-violet-50 to-purple-50 border-violet-200",
    dashboard: "from-blue-50 to-cyan-50 border-blue-200",
    story: "from-indigo-50 to-violet-50 border-indigo-200",
    timeseries: "from-amber-50 to-orange-50 border-amber-200",
    business: "from-emerald-50 to-teal-50 border-emerald-200",
    summary: "from-indigo-50 to-violet-50 border-indigo-200",
    goal: "from-emerald-50 to-teal-50 border-emerald-200",
    confidence: "from-amber-50 to-orange-50 border-amber-200",
    playground: "from-violet-50 to-purple-50 border-violet-200",
    simulation: "from-blue-50 to-cyan-50 border-blue-200",
    lineage: "from-indigo-50 to-blue-50 border-indigo-200",
    marketplace: "from-emerald-50 to-teal-50 border-emerald-200",
    alerting: "from-red-50 to-rose-50 border-red-200",
  };

  const bg = toolColors[result.tool] || "from-indigo-50/50 to-violet-50/50 border-indigo-100";
  const hasData = result.data && Object.keys(result.data).length > 0;

  return (
    <div className="mt-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        {statusIcon}
        <ToolIcon className="h-4 w-4 text-indigo-500" />
        <span className="font-semibold text-sm text-gray-900 capitalize">{result.tool}</span>
        {result.confidence > 0 && (
          <Badge variant="secondary" className="text-[10px] bg-indigo-50 text-indigo-600 ml-auto">
            {Math.round(result.confidence * 100)}%
          </Badge>
        )}
      </div>

      {/* Inline content by tool type */}
      {result.tool === "eda" && result.data && renderEDAInline(result.data)}
      {result.tool === "dashboard" && result.data && renderDashboardInline(result.data)}
      {result.tool === "ml" && result.data && renderMLInline(result.data)}
      {result.tool === "story" && result.data && renderStoryInline(result.data)}
      {result.tool === "business" && result.data && renderBusinessInline(result.data)}
      {result.tool === "cleaning" && result.data && renderCleaningInline(result.data)}
      {result.tool === "timeseries" && result.data && renderTimeseriesInline(result.data)}
      {result.tool === "report" && result.data && renderReportInline(result.data)}
      {["notebook", "deploy"].includes(result.tool) && result.data && renderCodeInline(result.data, result.tool)}
      {result.tool === "goal" && result.data && renderGoalInline(result.data)}
      {result.tool === "confidence" && result.data && renderConfidenceInline(result.data)}
      {result.tool === "playground" && result.data && renderPlaygroundInline(result.data)}
      {result.tool === "simulation" && result.data && renderSimulationInline(result.data)}
      {result.tool === "lineage" && result.data && renderLineageInline(result.data)}
      {result.tool === "marketplace" && result.data && renderMarketplaceInline(result.data)}
      {result.tool === "alerting" && result.data && renderAlertingInline(result.data)}

      {/* Summary + explanation */}
      <Card className={`mt-2 bg-gradient-to-r ${bg}`}>
        <CardContent className="p-3">
          <p className="text-sm text-gray-700">{result.summary}</p>
          {result.what_changed.length > 0 && (
            <div className="mt-1">
              {result.what_changed.slice(0, 3).map((c, i) => (
                <p key={i} className="text-[11px] text-gray-600 ml-2">• {c}</p>
              ))}
            </div>
          )}
          {result.expected_impact && (
            <p className="text-[11px] text-emerald-600 mt-1">Impact: {result.expected_impact}</p>
          )}
        </CardContent>
      </Card>

      {/* Charts from EDA/other tools */}
      {result.charts && Object.keys(result.charts).length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {Object.entries(result.charts).map(([key, chartData]) => {
            if (!chartData || typeof chartData !== "object") return null;
            const chart = chartData as { data: unknown[]; layout: Record<string, unknown> };
            if (!chart.data || !chart.layout) return null;
            return (
              <Card key={key} className="bg-white border-indigo-100">
                <CardContent className="p-2">
                  <Plot
                    data={chart.data as any}
                    layout={{ ...chart.layout, height: 200, margin: { t: 5, b: 30, l: 40, r: 10 } }}
                    config={{ responsive: true, displayModeBar: false }}
                    className="w-full"
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ─── */
export default function CopilotPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const datasetId = parseInt(id, 10);

  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: dataset } = useQuery({
    queryKey: ["dataset", datasetId],
    queryFn: () => api.datasets.get(datasetId),
  });

  const { data: context } = useQuery({
    queryKey: ["copilot-context", datasetId],
    queryFn: () => api.copilot.getContext(datasetId),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (context && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: getWelcomeMessage(context),
        suggestions: getSuggestions(context),
      }]);
    }
  }, [context]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    try {
      const result = await api.copilot.chat(datasetId, text, conversationId);
      setConversationId(result.conversation_id);
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: result.response,
        tool_results: result.tool_results,
        suggestions: result.suggestions,
      }]);
    } catch (err) {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: `Error: ${err instanceof Error ? err.message : "Something went wrong"}`,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const runAll = async () => {
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: "Run everything" }]);
    try {
      const result = await api.copilot.runPlan(datasetId);
      setConversationId(result.conversation_id);
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: result.summary,
        tool_results: result.results,
        suggestions: ["View dashboard", "Generate report", "Deploy model"],
      }]);
    } catch (err) {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: `Error: ${err instanceof Error ? err.message : "Something went wrong"}`,
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50">
      {/* Header */}
      <header className="border-b border-indigo-100 bg-white/70 backdrop-blur-xl sticky top-0 z-50 shrink-0">
        <div className="flex items-center gap-4 py-3 px-6">
          <Link href={`/datasets/${datasetId}`}>
            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-indigo-50">
              <ArrowLeft className="h-4 w-4 text-indigo-600" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-indigo-500" />
              <h1 className="text-lg font-bold text-gray-900">AI Copilot</h1>
            </div>
            {dataset && (
              <p className="text-xs text-gray-500 truncate">
                {dataset.name} &bull; {dataset.rows?.toLocaleString()} rows &bull; {dataset.columns} columns
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {context && (
              <div className="flex items-center gap-1">
                {context.cleaned && <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">Cleaned</Badge>}
                {context.eda_completed && <Badge className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">EDA</Badge>}
                {context.ml_completed && <Badge className="text-[10px] bg-violet-50 text-violet-700 border-violet-200">ML</Badge>}
              </div>
            )}
            <Button onClick={runAll} disabled={loading} size="sm" className="gap-1.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              Run All
            </Button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "assistant" && (
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}
              <div className={`max-w-[90%] min-w-0 ${msg.role === "user" ? "order-first" : ""}`}>
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white ml-auto"
                      : "bg-white border border-indigo-100 text-gray-800"
                  }`}
                >
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {renderMarkdown(msg.content)}
                  </div>
                </div>

                {/* Tool Results - rendered inline */}
                {msg.tool_results && msg.tool_results.length > 0 && (
                  <div className="space-y-2">
                    {msg.tool_results.map((result, j) => (
                      <ToolResultCard key={j} result={result} />
                    ))}
                  </div>
                )}

                {/* Suggestions */}
                {msg.suggestions && msg.suggestions.length > 0 && msg.role === "assistant" && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {msg.suggestions.map((s, j) => (
                      <Button
                        key={j}
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 rounded-full border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300"
                        onClick={() => sendMessage(s)}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-1">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="bg-white border border-indigo-100 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-indigo-100 bg-white/80 backdrop-blur-sm shrink-0">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about your data..."
              disabled={loading}
              className="flex-1 border-indigo-200 focus:border-indigo-400 focus:ring-indigo-400 rounded-xl"
            />
            <Button type="submit" disabled={loading || !input.trim()} size="icon" className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function getWelcomeMessage(ctx: CopilotContext): string {
  if (!ctx.cleaned) {
    return `Welcome! I'm your AI data analyst copilot.\n\nI can see **${ctx.dataset_name}** (${ctx.rows.toLocaleString()} rows, ${ctx.columns} columns).\n\nI found some data quality issues. Say **"analyze my data"** to get a full plan, or ask me anything!`;
  }
  if (ctx.eda_completed && ctx.ml_completed) {
    return `Welcome back! **${ctx.dataset_name}** is fully analyzed.\n\nBest model: **${String(ctx.key_metrics.best_model || "N/A")}** — Score: ${ctx.key_metrics.best_score != null ? Number(ctx.key_metrics.best_score).toFixed(1) + "%" : "N/A"}\n\nWhat would you like to do next?`;
  }
  return `Welcome! I'm your AI data analyst copilot for **${ctx.dataset_name}**.\n\n${ctx.cleaned ? "✅ Cleaned" : "⚠️ Needs cleaning"} • ${ctx.eda_completed ? "✅ EDA done" : "⏳ EDA pending"} • ${ctx.ml_completed ? "✅ ML trained" : "⏳ ML pending"}\n\nSay **"analyze my data"** to run a full analysis, or ask me anything!`;
}

function getSuggestions(ctx: CopilotContext): string[] {
  if (!ctx.cleaned) return ["Analyze my data", "Clean the data", "What issues exist?", "Goal detection", "Confidence check"];
  if (!ctx.eda_completed) return ["Run EDA", "Explore correlations", "Show distributions", "Train a model", "Goal detection"];
  if (!ctx.ml_completed) return ["Train ML models", "Model Playground", "What's the best algorithm?", "Generate dashboard", "Confidence check"];
  return ["Generate dashboard", "Deploy model", "Create story", "What insights?", "Model Playground", "What-if simulation"];
}
