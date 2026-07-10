"use client";

import { use, useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, Send, Loader2, Bot, User, Sparkles, Play, CheckCircle2, XCircle,
  BarChart3, Brain, Wand2, TrendingUp, TrendingDown, FileText, Lightbulb,
  LayoutDashboard, Target, Shield, GitBranch, Globe, Bell, AlertTriangle,
  Layers, GitMerge, Link2, Paperclip, Search, Copy, RotateCcw, ThumbsUp,
  ThumbsDown, Bookmark, Share2, ChevronDown, Plus, Clock, MessageSquare,
  X, ArrowDown, PanelRightClose, PanelRightOpen, Hash, Zap, Image, Volume2,
  Square, ChevronRight, MoreHorizontal, Save, FileDown, BrainCircuit, Webhook, Mic,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import type { CopilotMessage, ToolResult, CopilotContext } from "@/lib/types";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

/* ─── Markdown renderer (unchanged) ─── */
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

/* ─── All tool renderers (preserved from original) ─── */
function renderEDAInline(data: Record<string, any>) {
  const charts = data.charts || {};
  const stats = data.stats || {};
  const insights = data.insights || [];
  return (
    <div className="mt-3 space-y-3">
      {insights.length > 0 && (
        <Card className="bg-amber-50/50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-amber-700 mb-1">Key Insights</p>
            {insights.slice(0, 5).map((ins: any, i: number) => (
              <p key={i} className="text-xs text-amber-800 ml-2">• {ins.message}</p>
            ))}
          </CardContent>
        </Card>
      )}
      {Object.keys(stats).length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-gray-700 dark:text-slate-300 mb-2">Numeric Statistics</p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
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
      {charts.correlation && (
        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Correlation Matrix</p>
            <Plot data={charts.correlation.data} layout={{ ...charts.correlation.layout, height: 280, margin: { t: 5, b: 40, l: 50, r: 20 } }} config={{ responsive: true, displayModeBar: false }} className="w-full" />
          </CardContent>
        </Card>
      )}
      {charts.histograms && (
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(charts.histograms).slice(0, 4).map(([col, chart]: [string, any]) => (
            <Card key={col} className="bg-card border-border">
              <CardContent className="p-2">
                <Plot data={chart.data} layout={{ ...chart.layout, height: 180, margin: { t: 5, b: 30, l: 40, r: 10 } }} config={{ responsive: true, displayModeBar: false }} className="w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {charts.missing && (
        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Missing Values</p>
            <Plot data={charts.missing.data} layout={{ ...charts.missing.layout, height: 200, margin: { t: 5, b: 40, l: 50, r: 20 } }} config={{ responsive: true, displayModeBar: false }} className="w-full" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function renderDashboardInline(data: Record<string, any>) {
  const kpis = data.kpis || [];
  const renderedCharts = data.rendered_charts || [];
  const title = data.title || "Dashboard";
  return (
    <div className="mt-3 space-y-3">
      <p className="text-xs font-semibold text-indigo-700">{title}</p>
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {kpis.map((kpi: any, i: number) => (
            <Card key={i} className="bg-card border-border overflow-hidden">
              <CardContent className="p-3">
                <p className="text-[10px] font-medium text-gray-500 dark:text-slate-400">{kpi.name}</p>
                <p className="text-lg font-bold text-foreground">{kpi.value}</p>
                {kpi.trend && (
                  <p className={`text-[10px] font-medium flex items-center gap-0.5 ${String(kpi.trend).startsWith("+") ? "text-emerald-600" : String(kpi.trend).startsWith("-") ? "text-red-600" : "text-gray-500 dark:text-slate-400"}`}>
                    {String(kpi.trend).startsWith("+") ? <TrendingUp className="h-2.5 w-2.5" /> : String(kpi.trend).startsWith("-") ? <TrendingDown className="h-2.5 w-2.5" /> : null}
                    {kpi.trend}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {renderedCharts.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {renderedCharts.map((chart: any, i: number) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-2">
                <p className="text-[10px] font-semibold text-gray-700 dark:text-slate-300 mb-1">{chart.title}</p>
                {chart.plotly ? (
                  <Plot data={chart.plotly.data} layout={{ ...chart.plotly.layout, height: 220, margin: { t: 5, b: 30, l: 40, r: 10 } }} config={{ responsive: true, displayModeBar: false }} className="w-full" />
                ) : (
                  <div className="h-[160px] bg-gray-50 rounded flex items-center justify-center">
                    <div className="text-center"><BarChart3 className="h-6 w-6 text-gray-300 mx-auto mb-1" /><p className="text-[9px] text-gray-400">{chart.type}: {chart.title}</p></div>
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

function renderMLInline(data: Record<string, any>) {
  const results = data.all_results || [];
  const bestModel = data.best_model || "";
  const bestScore = data.best_score;
  const problemType = data.problem_type || "";
  const llmAnalysis = data.llm_analysis || {};
  const featureEngineering = data.feature_engineering || {};
  return (
    <div className="mt-3 space-y-3">
      {bestModel && (
        <div className="flex items-center gap-2">
          <Badge className="bg-violet-500 text-white">{bestModel}</Badge>
          <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">{bestScore != null ? `${(bestScore * 100).toFixed(1)}%` : "N/A"}</span>
          <Badge variant="outline" className="text-xs border-gray-200">{problemType}</Badge>
        </div>
      )}
      {results.length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-gray-700 dark:text-slate-300 mb-2">Model Comparison</p>
            <div className="space-y-1.5">
              {results.filter((r: any) => r.test_score != null).map((r: any, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={`text-xs w-24 truncate ${r.model === bestModel ? "font-bold text-violet-700" : "text-gray-600 dark:text-slate-400"}`}>{r.model}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2"><div className={`h-2 rounded-full ${r.model === bestModel ? "bg-gradient-to-r from-violet-400 to-purple-500" : "bg-indigo-300"}`} style={{ width: `${(r.test_score || 0) * 100}%` }} /></div>
                  <span className="text-xs text-gray-500 dark:text-slate-400 w-12 text-right">{(r.test_score * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {featureEngineering.applied && featureEngineering.applied.length > 0 && (
        <Card className="bg-violet-50/50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800">
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-violet-700 mb-1">Feature Engineering</p>
            {featureEngineering.applied.map((f: string, i: number) => (<p key={i} className="text-xs text-violet-800 ml-2">• {f}</p>))}
          </CardContent>
        </Card>
      )}
      {llmAnalysis.summary && (
        <Card className="bg-indigo-50/50 border-border">
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-indigo-700 mb-1">AI Analysis</p>
            <p className="text-xs text-indigo-800 mb-2">{llmAnalysis.summary}</p>
            {llmAnalysis.key_findings && llmAnalysis.key_findings.length > 0 && (
              <div className="mb-2">
                <p className="text-[10px] font-medium text-primary mb-0.5">Findings:</p>
                {llmAnalysis.key_findings.slice(0, 3).map((f: any, i: number) => (<p key={i} className="text-[11px] text-indigo-700 ml-2">• {typeof f === "string" ? f : f.finding || f.text || JSON.stringify(f)}</p>))}
              </div>
            )}
            {llmAnalysis.recommendations && llmAnalysis.recommendations.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-primary mb-0.5">Recommendations:</p>
                {llmAnalysis.recommendations.slice(0, 3).map((r: any, i: number) => (<p key={i} className="text-[11px] text-indigo-700 ml-2">• {typeof r === "string" ? r : r.recommendation || r.text || JSON.stringify(r)}</p>))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function renderStoryInline(data: Record<string, any>) {
  const title = data.title || "Data Story";
  const narrative = data.narrative || [];
  const conclusion = data.conclusion || "";
  const takeaways = data.key_takeaways || [];
  return (
    <div className="mt-3 space-y-3">
      <Card className="bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 border-border">
        <CardContent className="p-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100 mb-2">{title}</h3>
          {narrative.map((section: any, i: number) => (<div key={i} className="mb-3"><h4 className="text-xs font-semibold text-indigo-700 mb-1">{section.section}</h4><p className="text-xs text-gray-700 dark:text-slate-300 leading-relaxed">{section.content}</p></div>))}
          {conclusion && <div className="mt-2 p-2 bg-indigo-100/50 rounded-lg"><p className="text-xs font-semibold text-indigo-700 mb-0.5">Conclusion</p><p className="text-xs text-indigo-800">{conclusion}</p></div>}
          {takeaways.length > 0 && <div className="mt-2"><p className="text-xs font-semibold text-indigo-700 mb-1">Key Takeaways</p>{takeaways.map((t: any, i: number) => (<p key={i} className="text-[11px] text-indigo-800 ml-2">• {typeof t === "string" ? t : t.takeaway || JSON.stringify(t)}</p>))}</div>}
        </CardContent>
      </Card>
    </div>
  );
}

function renderBusinessInline(data: Record<string, any>) {
  const summary = data.executive_summary || "";
  const insights = data.key_insights || [];
  const risks = data.risks || [];
  const opportunities = data.opportunities || [];
  const recommendations = data.recommendations || [];
  const actionItems = data.action_items || [];
  return (
    <div className="mt-3 space-y-3">
      {summary && <Card className="bg-indigo-50/50 border-border"><CardContent className="p-3"><p className="text-xs font-semibold text-indigo-700 mb-1">Executive Summary</p><p className="text-xs text-indigo-800 leading-relaxed">{summary}</p></CardContent></Card>}
      {insights.length > 0 && <Card className="bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"><CardContent className="p-3"><p className="text-xs font-semibold text-emerald-700 mb-1">Key Insights</p>{insights.slice(0, 5).map((ins: any, i: number) => (<p key={i} className="text-xs text-emerald-800 ml-2">• {ins.insight || ins.message || JSON.stringify(ins)}</p>))}</CardContent></Card>}
      {risks.length > 0 && <Card className="bg-red-50/50 dark:bg-red-950/30 border-red-200 dark:border-red-800"><CardContent className="p-3"><p className="text-xs font-semibold text-red-700 mb-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Risks</p>{risks.slice(0, 3).map((r: any, i: number) => (<p key={i} className="text-xs text-red-800 ml-2">• {r.risk || r.message || JSON.stringify(r)} {r.severity && <Badge className="ml-1 text-[9px] bg-red-100 text-red-700">{r.severity}</Badge>}</p>))}</CardContent></Card>}
      {opportunities.length > 0 && <Card className="bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"><CardContent className="p-3"><p className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1"><Lightbulb className="h-3 w-3" /> Opportunities</p>{opportunities.slice(0, 3).map((o: any, i: number) => (<p key={i} className="text-xs text-blue-800 ml-2">• {o.opportunity || o.message || JSON.stringify(o)}</p>))}</CardContent></Card>}
      {recommendations.length > 0 && <Card className="bg-violet-50/50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800"><CardContent className="p-3"><p className="text-xs font-semibold text-violet-700 mb-1 flex items-center gap-1"><Target className="h-3 w-3" /> Recommendations</p>{recommendations.slice(0, 5).map((r: any, i: number) => (<p key={i} className="text-xs text-violet-800 ml-2">• {typeof r === "string" ? r : r.recommendation || JSON.stringify(r)}</p>))}</CardContent></Card>}
      {actionItems.length > 0 && <Card className="bg-amber-50/50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"><CardContent className="p-3"><p className="text-xs font-semibold text-amber-700 mb-1">Action Items</p>{actionItems.map((a: any, i: number) => (<p key={i} className="text-xs text-amber-800 ml-2">• {typeof a === "string" ? a : a.action || JSON.stringify(a)}</p>))}</CardContent></Card>}
    </div>
  );
}

function renderCleaningInline(data: Record<string, any>) {
  return (
    <div className="mt-3">
      <Card className="bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
        <CardContent className="p-3">
          <div className="grid grid-cols-4 gap-2 mb-2">
            {[{ label: "Original", value: data.original_rows }, { label: "Final", value: data.final_rows }, { label: "Missing Fixed", value: data.missing_fixed }, { label: "Duplicates Removed", value: data.duplicates_removed }].map((item) => (
              <div key={item.label} className="text-center"><p className="text-lg font-bold text-foreground">{item.value ?? 0}</p><p className="text-[9px] text-gray-500 dark:text-slate-400">{item.label}</p></div>
            ))}
          </div>
          {data.cleaning_summary && <p className="text-xs text-emerald-700">{data.cleaning_summary}</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function renderTimeseriesInline(data: Record<string, any>) {
  const forecast = data.forecast || [];
  const trend = data.trend || "";
  const changePct = data.change_pct || 0;
  return (
    <div className="mt-3">
      <Card className="bg-card border-border">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className={trend === "increasing" ? "border-emerald-300 text-emerald-700" : "border-red-300 text-red-700"}>
              {trend === "increasing" ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}{trend} ({changePct}%)
            </Badge>
          </div>
          {forecast.length > 0 && <div><p className="text-[10px] font-semibold text-gray-700 dark:text-slate-300 mb-1">Forecast ({data.periods} periods)</p><div className="flex gap-1 flex-wrap">{forecast.map((v: number, i: number) => (<Badge key={i} variant="secondary" className="text-[9px] bg-indigo-50">{v.toFixed(0)}</Badge>))}</div></div>}
        </CardContent>
      </Card>
    </div>
  );
}

function renderCodeInline(data: Record<string, any>, tool: string) {
  const code = data.code || data.notebook || "";
  const filename = data.filename || "";
  const requirements = data.requirements || "";
  return (
    <div className="mt-3">
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-3">
          {filename && <p className="text-[10px] text-gray-400 mb-1">{filename}</p>}
          <pre className="text-[11px] text-green-400 overflow-x-auto max-h-40 overflow-y-auto font-mono">{typeof code === "string" ? code.slice(0, 1000) : JSON.stringify(code, null, 2).slice(0, 1000)}{(typeof code === "string" ? code.length : JSON.stringify(code).length) > 1000 && "\n... (truncated)"}</pre>
          {requirements && <div className="mt-2"><p className="text-[10px] text-gray-400 mb-0.5">Requirements:</p><pre className="text-[10px] text-gray-300 font-mono">{typeof requirements === "string" ? requirements : JSON.stringify(requirements)}</pre></div>}
        </CardContent>
      </Card>
    </div>
  );
}

function renderReportInline(data: Record<string, any>) {
  const html = data.html || "";
  const datasetId = data.dataset_id;
  if (!html) return null;
  return (
    <div className="mt-3 space-y-2">
      <Card className="bg-card border-border overflow-hidden">
        <div className="p-2 bg-indigo-50 border-b border-border flex items-center justify-between">
          <p className="text-xs font-semibold text-indigo-700">Report Preview</p>
          {datasetId && <a href={`/api/reports/download/${datasetId}?format=pdf`} download className="text-[10px] bg-primary text-primary-foreground px-2 py-1 rounded hover:bg-indigo-600 transition-colors">Download PDF</a>}
        </div>
        <div className="h-[500px] overflow-y-auto"><iframe srcDoc={html} className="w-full h-full border-0" title="Report Preview" /></div>
      </Card>
    </div>
  );
}

function renderGoalInline(data: Record<string, any>) {
  const goal = data.goal || "";
  const problemType = data.problem_type || "";
  const targetColumn = data.target_column || "";
  const suggestedModels = data.suggested_models || [];
  return (
    <div className="mt-3 space-y-2">
      <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800">
        <CardContent className="p-3">
          <p className="text-sm font-semibold text-emerald-800">Detected Goal: {goal}</p>
          <div className="flex flex-wrap gap-2 mt-2"><Badge className="text-[10px] bg-emerald-100 text-emerald-700">{problemType}</Badge>{targetColumn && <Badge className="text-[10px] bg-blue-100 text-blue-700">Target: {targetColumn}</Badge>}</div>
          {suggestedModels.length > 0 && <p className="text-[11px] text-gray-600 dark:text-slate-400 mt-1">Models: {suggestedModels.join(", ")}</p>}
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
      {critical.length > 0 && <Card className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"><CardContent className="p-3"><p className="text-xs font-semibold text-red-700 mb-1">Critical ({critical.length})</p>{critical.map((i: any, idx: number) => (<p key={idx} className="text-[11px] text-red-600 ml-2">• {i.message}</p>))}</CardContent></Card>}
      {warnings.length > 0 && <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"><CardContent className="p-3"><p className="text-xs font-semibold text-amber-700 mb-1">Warnings ({warnings.length})</p>{warnings.map((i: any, idx: number) => (<p key={idx} className="text-[11px] text-amber-600 ml-2">• {i.message}</p>))}</CardContent></Card>}
      {critical.length === 0 && warnings.length === 0 && <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"><CardContent className="p-3"><p className="text-xs font-semibold text-emerald-700">All checks passed — ready for modeling</p></CardContent></Card>}
    </div>
  );
}

function renderPlaygroundInline(data: Record<string, any>) {
  const models = data.models || [];
  const best = data.best_model || "";
  const problemType = data.problem_type || "";
  return (
    <div className="mt-3 space-y-2">
      {models.length > 0 && <div className="space-y-1">{models.map((m: any, idx: number) => (
        <Card key={idx} className={`${m.name === best ? "bg-gradient-to-r from-violet-50 to-purple-50 border-violet-300" : "bg-card border-gray-100"}`}>
          <CardContent className="p-2.5">
            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><p className="font-semibold text-xs">{m.name}</p>{m.name === best && <Badge className="text-[10px] bg-violet-100 text-violet-700">Best</Badge>}</div><p className="text-xs font-mono font-bold">{problemType === "classification" ? (m.test_score * 100).toFixed(1) + "%" : m.test_score.toFixed(4)}</p></div>
            <div className="flex gap-3 mt-1 text-[10px] text-gray-500 dark:text-slate-400">
              {m.training_time > 0 && <span>Training: {m.training_time}s</span>}
              {m.inference_speed > 0 && <span>Speed: {m.inference_speed.toLocaleString()} pred/s</span>}
            </div>
          </CardContent>
        </Card>
      ))}</div>}
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
  return (
    <div className="mt-3 space-y-2">
      <Card className={`${direction === "increase" ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800" : direction === "decrease" ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800" : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"}`}>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2"><span className="text-lg font-bold">{pctImpact > 0 ? "+" : ""}{pctImpact}%</span><span className="text-xs text-gray-600 dark:text-slate-400">impact on {targetCol}</span></div>
          <div className="text-xs text-gray-600 dark:text-slate-400">Baseline: {baseline.toFixed(2)} → Scenario: {scenario.toFixed(2)}</div>
          {analysis && <div className="mt-2 p-2 bg-white/70 dark:bg-slate-800/70 rounded text-[11px] text-gray-700 dark:text-slate-300">{analysis}</div>}
        </CardContent>
      </Card>
    </div>
  );
}

function renderLineageInline(data: Record<string, any>) {
  const lineage = data.lineage || [];
  return (
    <div className="mt-3">
      <Card className="bg-card border-border">
        <CardContent className="p-3">
          <div className="space-y-0">
            {lineage.map((step: any, idx: number) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="flex flex-col items-center"><div className={`w-3 h-3 rounded-full ${step.is_current ? "bg-indigo-500 ring-2 ring-indigo-200" : "bg-gray-300"}`} />{idx < lineage.length - 1 && <div className="w-0.5 h-8 bg-gray-200" />}</div>
                <div className={`pb-4 ${step.is_current ? "font-semibold" : ""}`}><p className="text-xs text-gray-800 dark:text-slate-200">{step.label}</p><p className="text-[10px] text-gray-500 dark:text-slate-400">{step.description}</p></div>
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
        <Card key={idx} className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-center justify-between"><p className="text-xs font-semibold text-gray-800 dark:text-slate-200">{ds.name}</p><Badge className="text-[10px] bg-indigo-100 text-indigo-700">{ds.relevance_score}/10</Badge></div>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">{ds.description}</p>
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
        <Card key={idx} className={`${a.severity === "critical" ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800" : a.severity === "warning" ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800" : "bg-blue-50 border-blue-200"}`}>
          <CardContent className="p-2.5">
            <div className="flex items-start gap-2">
              <span className="mt-0.5">{a.severity === "critical" ? "!" : a.severity === "warning" ? "!" : "i"}</span>
              <div><p className="text-xs font-semibold text-gray-800 dark:text-slate-200">{a.title}</p><p className="text-[10px] text-gray-500 dark:text-slate-400">{a.message}</p></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function renderMultisheetInline(data: Record<string, any>) {
  const sheets: any[] = data.sheets || [];
  const relationships: any[] = data.relationships || [];
  const rec: any = data.recommendation;
  if (!data.multisheet) {
    return <div className="mt-2 text-xs text-gray-500 dark:text-slate-400">{data.summary || "Single-sheet dataset."}</div>;
  }
  return <MultisheetExecView data={data} sheets={sheets} relationships={relationships} rec={rec} />;
}

function MultisheetExecView({ data, sheets, relationships, rec }: { data: any; sheets: any[]; relationships: any[]; rec: any }) {
  const [executing, setExecuting] = useState(false);
  const [execResult, setExecResult] = useState<any>(null);
  const [execError, setExecError] = useState<string | null>(null);
  const handleExecute = async () => {
    if (!rec) return;
    setExecuting(true); setExecError(null);
    try {
      const res = await fetch(`/api/datasets/${data.datasetId}/multisheet/execute`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: rec.action, left_sheet: rec.left_sheet, right_sheet: rec.right_sheet, join_column: rec.join_column, join_how: rec.join_how }) });
      if (!res.ok) throw new Error(await res.text());
      setExecResult(await res.json());
    } catch (err: any) { setExecError(err.message || "Execution failed"); } finally { setExecuting(false); }
  };
  return (
    <div className="mt-3 space-y-3">
      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Sheets ({sheets.length})</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {sheets.map((s: any) => (
          <Card key={s.name} className="border-border">
            <CardContent className="p-2.5">
              <div className="flex items-start justify-between gap-1"><div className="min-w-0"><p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{s.name}</p><p className="text-[10px] text-slate-500">{s.rows} rows x {s.columns} cols</p></div><Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{s.classification}</Badge></div>
            </CardContent>
          </Card>
        ))}
      </div>
      {rec && (
        <Card className="border-indigo-200 dark:border-indigo-800 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30">
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">Recommendation</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">{rec.reasoning}</p>
            {!execResult && !executing && <Button size="sm" onClick={handleExecute} className="gap-1.5 bg-gradient-to-r from-indigo-500 to-blue-600 text-white text-xs h-7"><Play className="h-3 w-3" /> Execute</Button>}
            {executing && <Button size="sm" disabled className="gap-1.5 text-xs h-7"><Loader2 className="h-3 w-3 animate-spin" /> Executing...</Button>}
            {execError && <p className="text-[10px] text-red-600 mt-1">Error: {execError}</p>}
            {execResult && <Card className="mt-2 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"><CardContent className="p-2"><p className="text-xs font-medium text-emerald-800">{execResult.message || `${execResult.rows} rows, ${execResult.columns} columns created`}</p></CardContent></Card>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ─── Tool Result Card ─── */
function ToolResultCard({ result, datasetId }: { result: ToolResult; datasetId: number }) {
  const toolIcons: Record<string, typeof Brain> = { cleaning: Wand2, eda: BarChart3, ml: Brain, dashboard: LayoutDashboard, story: FileText, timeseries: TrendingUp, business: Lightbulb, summary: Sparkles, notebook: FileText, deploy: Play, edit: Wand2, qa: BarChart3, optimizer: Brain, report: FileText, workflow: Play, goal: Target, confidence: Shield, playground: Brain, simulation: TrendingUp, lineage: GitBranch, marketplace: Globe, alerting: Bell, multisheet: Layers };
  const ToolIcon = toolIcons[result.tool] || Brain;
  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 mb-1">
        {result.status === "success" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
        <ToolIcon className="h-4 w-4 text-primary" />
        <span className="font-semibold text-sm text-gray-900 dark:text-slate-100 capitalize">{result.tool}</span>
        {result.confidence > 0 && <Badge variant="secondary" className="text-[10px] bg-indigo-50 text-primary ml-auto">{Math.round(result.confidence * 100)}%</Badge>}
      </div>
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
      {result.tool === "multisheet" && result.data && renderMultisheetInline({ ...result.data, datasetId })}
      <Card className="mt-2 bg-gradient-to-r from-indigo-50/50 to-violet-50/50 dark:from-indigo-950/20 dark:to-violet-950/20 border-border">
        <CardContent className="p-3">
          <p className="text-sm text-gray-700 dark:text-slate-300">{result.summary}</p>
          {result.what_changed.length > 0 && <div className="mt-1">{result.what_changed.slice(0, 3).map((c, i) => (<p key={i} className="text-[11px] text-gray-600 dark:text-slate-400 ml-2">• {c}</p>))}</div>}
        </CardContent>
      </Card>
      {result.charts && Object.keys(result.charts).length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {Object.entries(result.charts).map(([key, chartData]) => {
            if (!chartData || typeof chartData !== "object") return null;
            const chart = chartData as { data: unknown[]; layout: Record<string, unknown> };
            if (!chart.data || !chart.layout) return null;
            return (<Card key={key} className="bg-card border-border"><CardContent className="p-2"><Plot data={chart.data as any} layout={{ ...chart.layout, height: 200, margin: { t: 5, b: 30, l: 40, r: 10 } }} config={{ responsive: true, displayModeBar: false }} className="w-full" /></CardContent></Card>);
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Loading Steps Component ─── */
function LoadingSteps() {
  const [step, setStep] = useState(0);
  const steps = ["Reading Dataset", "Analyzing Data", "Finding Insights", "Generating Response"];
  useEffect(() => {
    const timer = setInterval(() => setStep(p => Math.min(p + 1, steps.length - 1)), 1200);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="flex gap-3">
      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
        <Bot className="h-4 w-4 text-white" />
      </div>
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
        <div className="space-y-1.5">
          {steps.map((s, i) => (
            <div key={i} className={`flex items-center gap-2 text-xs transition-all duration-300 ${i <= step ? "opacity-100" : "opacity-30"}`}>
              {i < step ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : i === step ? <Loader2 className="h-3 w-3 text-blue-500 animate-spin" /> : <div className="h-3 w-3 rounded-full border border-slate-300 dark:border-slate-600" />}
              <span className={i <= step ? "text-slate-700 dark:text-slate-300" : "text-slate-400 dark:text-slate-500"}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
function CopilotContent({ datasetId }: { datasetId: number }) {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [initialQuerySent, setInitialQuerySent] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [barHeights, setBarHeights] = useState<number[]>(new Array(24).fill(2));
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: dataset } = useQuery({ queryKey: ["dataset", datasetId], queryFn: () => api.datasets.get(datasetId) });
  const { data: context } = useQuery({ queryKey: ["copilot-context", datasetId], queryFn: () => api.copilot.getContext(datasetId) });
  const { data: history } = useQuery({ queryKey: ["copilot-history", datasetId], queryFn: () => api.copilot.getHistory(datasetId) });

  useEffect(() => {
    // Check if MediaRecorder is supported
    if (typeof window !== "undefined" && !window.MediaRecorder) {
      // Silently disable if not supported
    }
  }, []);

  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      cancelAnimationFrame(animationFrameRef.current);
      mediaRecorderRef.current?.stop();
      audioContextRef.current?.close();
      audioContextRef.current = null;
      analyserRef.current = null;
      setIsRecording(false);
      setIsTranscribing(true);
      setBarHeights(new Array(24).fill(2));
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Set up Web Audio API for frequency analysis
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.7;
        source.connect(analyser);
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const BAR_COUNT = 24;

        const updateBars = () => {
          analyser.getByteFrequencyData(dataArray);
          const newHeights: number[] = [];
          const step = Math.floor(bufferLength / BAR_COUNT);
          for (let i = 0; i < BAR_COUNT; i++) {
            const value = dataArray[i * step] || 0;
            // Map 0-255 to 2-28px
            const height = Math.max(2, (value / 255) * 28);
            newHeights.push(height);
          }
          setBarHeights(newHeights);
          animationFrameRef.current = requestAnimationFrame(updateBars);
        };
        updateBars();

        // Set up MediaRecorder
        const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          stream.getTracks().forEach(t => t.stop());

          try {
            const result = await api.speech.transcribe(audioBlob);
            if (result.text) {
              setInput(prev => {
                const existing = prev.trim();
                return existing ? `${existing} ${result.text}` : result.text;
              });
            }
          } catch (err) {
            console.error("STT failed:", err);
          } finally {
            setIsTranscribing(false);
            setRecordingTime(0);
          }
        };

        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;
        setRecordingTime(0);
        setIsRecording(true);
        recordingTimerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      } catch (err) {
        console.error("Microphone access denied:", err);
      }
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const onScroll = () => { setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 200); };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (context && messages.length === 0) {
      setMessages([{ role: "assistant", content: "", suggestions: [] }]);
    }
  }, [context]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setMessages(prev => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    try {
      const result = await api.copilot.chat(datasetId, text, conversationId);
      setConversationId(result.conversation_id);
      setMessages(prev => [...prev, { role: "assistant", content: result.response, tool_results: result.tool_results, suggestions: result.suggestions }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "Something went wrong"}` }]);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (initialQuery && !initialQuerySent && context && messages.length >= 1 && !loading) {
      setInitialQuerySent(true);
      sendMessage(initialQuery);
    }
  }, [initialQuery, initialQuerySent, context, messages, loading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  const quickActions = ["Analyze Dataset", "Find Trends", "Detect Outliers", "Build Dashboard", "Generate Report", "Forecast Sales", "Explain Column", "Create ML Model"];

  const suggestedPrompts = context ? (
    !context.cleaned ? ["Clean my data first", "What issues exist?", "Show data quality", "Goal detection"] :
    !context.eda_completed ? ["Run full EDA", "Show correlations", "Find patterns", "Train a model"] :
    !context.ml_completed ? ["Train ML models", "Best algorithm?", "Compare models", "Feature importance"] :
    ["Generate dashboard", "Create executive summary", "What-if simulation", "Deploy model"]
  ) : ["Analyze my data", "Show trends", "Detect outliers", "Train a model"];

  return (
    <div className="flex h-screen bg-[#0f1219] overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b border-slate-800 bg-[#0f1219]/80 backdrop-blur-xl flex items-center justify-between px-4 shrink-0 z-20">
          <div className="flex items-center gap-3">
            <Link href={`/datasets/${datasetId}`}>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Bot className="h-3.5 w-3.5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-bold text-white">AI Copilot</h1>
                  <Badge className="text-[9px] px-1.5 py-0 h-4 bg-blue-500/20 text-blue-400 border-blue-500/30">Gemini Flash</Badge>
                </div>
                {dataset && <p className="text-[10px] text-slate-500">{dataset.name} · {dataset.rows?.toLocaleString()} rows · {dataset.columns} cols</p>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {context && (
              <div className="flex items-center gap-1 mr-2">
                {context.cleaned && <Badge className="text-[9px] px-1.5 py-0 h-4 bg-emerald-500/15 text-emerald-400 border-emerald-500/20">Clean</Badge>}
                {context.eda_completed && <Badge className="text-[9px] px-1.5 py-0 h-4 bg-blue-500/15 text-blue-400 border-blue-500/20">EDA</Badge>}
                {context.ml_completed && <Badge className="text-[9px] px-1.5 py-0 h-4 bg-violet-500/15 text-violet-400 border-violet-500/20">ML</Badge>}
              </div>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800" onClick={() => { setMessages([]); setConversationId(undefined); }}>
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800" onClick={() => setShowHistory(!showHistory)}>
              <Clock className="h-4 w-4" />
            </Button>
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800" onClick={() => setPanelOpen(!panelOpen)}>
              {panelOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            </Button>
          </div>
        </header>

        {/* Context Bar */}
        {dataset && (
          <div className="h-9 border-b border-slate-800/50 bg-[#0d1117] flex items-center px-4 gap-4 text-[10px] text-slate-500 shrink-0">
            <span className="flex items-center gap-1"><Hash className="h-3 w-3" /> {dataset.rows?.toLocaleString()} rows</span>
            <span className="flex items-center gap-1"><Layers className="h-3 w-3" /> {dataset.columns} columns</span>
            {context?.key_metrics?.best_model != null && <span className="flex items-center gap-1"><Brain className="h-3 w-3" /> {String(context.key_metrics.best_model)}</span>}
            <span className="flex items-center gap-1 ml-auto"><Zap className="h-3 w-3 text-emerald-500" /> Ready</span>
          </div>
        )}

        {/* Messages */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto relative">
          <div className="max-w-3xl mx-auto px-4 py-6">
            {/* Welcome Screen */}
            {messages.length <= 1 && context && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center mb-8">
                <div className="relative mb-6">
                  <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-2xl shadow-blue-500/30">
                    <Bot className="h-10 w-10 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Sparkles className="h-3 w-3 text-white" />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-white mb-1">Welcome to AI Copilot</h2>
                <p className="text-sm text-slate-400 mb-8 max-w-md">Ask me anything about your data. I can analyze patterns, generate insights, build dashboards, and more.</p>

                {/* Suggested Prompts */}
                <div className="grid grid-cols-2 gap-2 w-full max-w-lg mb-6">
                  {suggestedPrompts.map((prompt, i) => (
                    <button key={i} onClick={() => sendMessage(prompt)} className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-left hover:bg-slate-800 hover:border-blue-500/30 transition-all group">
                      <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 transition-colors">
                        {i === 0 ? <BarChart3 className="h-4 w-4 text-blue-400" /> : i === 1 ? <TrendingUp className="h-4 w-4 text-emerald-400" /> : i === 2 ? <AlertTriangle className="h-4 w-4 text-amber-400" /> : <Brain className="h-4 w-4 text-violet-400" />}
                      </div>
                      <span className="text-xs text-slate-300 group-hover:text-white transition-colors">{prompt}</span>
                    </button>
                  ))}
                </div>

                {/* Quick Action Chips */}
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {quickActions.map((action, i) => (
                    <button key={i} onClick={() => sendMessage(action)} className="px-3 py-1.5 rounded-full text-[11px] font-medium bg-slate-800/60 text-slate-400 border border-slate-700/40 hover:bg-slate-800 hover:text-white hover:border-blue-500/30 transition-all">
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Messages */}
            {messages.map((msg, i) => (
              <div key={i} className={`mb-4 ${msg.role === "user" ? "flex justify-end" : ""}`}>
                {msg.role === "assistant" && i === 0 && msg.content === "" ? null : (
                  <>
                    {msg.role === "assistant" && (
                      <div className="flex gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0 mt-1 shadow-lg shadow-blue-500/20">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
                            <div className="whitespace-pre-wrap leading-relaxed text-sm text-slate-800 dark:text-slate-200">{renderMarkdown(msg.content)}</div>
                          </div>
                          {/* Message Toolbar */}
                          {msg.content && (
                            <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"><Copy className="h-3 w-3" /></button>
                              <button className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"><RotateCcw className="h-3 w-3" /></button>
                              <button className="p-1 rounded-md text-slate-500 hover:text-emerald-400 hover:bg-slate-800 transition-colors"><ThumbsUp className="h-3 w-3" /></button>
                              <button className="p-1 rounded-md text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"><ThumbsDown className="h-3 w-3" /></button>
                              <button className="p-1 rounded-md text-slate-500 hover:text-amber-400 hover:bg-slate-800 transition-colors"><Bookmark className="h-3 w-3" /></button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {msg.role === "user" && (
                      <div className="flex gap-3 justify-end">
                        <div className="max-w-[80%]">
                          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-2xl rounded-tr-md px-4 py-3 shadow-lg shadow-blue-500/20">
                            <p className="text-sm leading-relaxed">{msg.content}</p>
                          </div>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0 mt-1">
                          <User className="h-4 w-4 text-slate-300" />
                        </div>
                      </div>
                    )}
                    {/* Tool Results */}
                    {msg.tool_results && msg.tool_results.length > 0 && (
                      <div className="ml-11 space-y-2 mt-2">
                        {msg.tool_results.map((result, j) => (<ToolResultCard key={j} result={result} datasetId={datasetId} />))}
                      </div>
                    )}
                    {/* Suggestions */}
                    {msg.suggestions && msg.suggestions.length > 0 && msg.role === "assistant" && (
                      <div className="flex flex-wrap gap-1.5 ml-11 mt-2">
                        {msg.suggestions.map((s, j) => (
                          <button key={j} onClick={() => sendMessage(s)} className="px-3 py-1.5 rounded-full text-[11px] font-medium bg-slate-800/60 text-slate-400 border border-slate-700/40 hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/30 transition-all">
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}

            {/* Loading State */}
            {loading && <LoadingSteps />}

            <div ref={messagesEndRef} />
          </div>

          {/* Scroll to Bottom */}
          {showScrollBtn && (
            <button onClick={scrollToBottom} className="fixed bottom-24 right-8 h-10 w-10 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center shadow-xl transition-all z-10">
              <ArrowDown className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-800 bg-[#0f1219] p-3 shrink-0">
          <div className="max-w-3xl mx-auto">
            {isRecording ? (
              /* ── Recording Animation ── */
              <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3 animate-in fade-in duration-200">
                {/* Pulsing red dot */}
                <div className="relative flex items-center justify-center">
                  <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                  <div className="absolute h-3 w-3 rounded-full bg-red-500 animate-ping opacity-75" />
                </div>

                {/* Waveform bars */}
                <div className="flex items-center gap-[3px] h-7">
                  {barHeights.map((h, i) => (
                    <div
                      key={i}
                      className="w-[3px] rounded-full bg-red-400/80 transition-[height] duration-75"
                      style={{ height: `${h}px` }}
                    />
                  ))}
                </div>

                {/* Timer */}
                <span className="text-xs font-mono text-red-400 tabular-nums min-w-[40px]">
                  {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, "0")}
                </span>

                <span className="text-[11px] text-red-300/60 ml-1 hidden sm:inline">Listening...</span>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Stop button */}
                <button
                  onClick={toggleRecording}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-all shadow-lg shadow-red-500/30 active:scale-95"
                >
                  <div className="h-3 w-3 rounded-sm bg-white" />
                  <span className="text-xs font-semibold">Stop</span>
                </button>
              </div>
            ) : (
              /* ── Normal Input ── */
              <div className="relative flex items-end gap-2 bg-slate-800/50 border border-slate-700/50 rounded-2xl px-3 py-2 focus-within:border-blue-500/50 transition-colors">
                <button className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-colors shrink-0 mb-0.5">
                  <Paperclip className="h-4 w-4" />
                </button>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything about your data..."
                  disabled={loading}
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 resize-none outline-none py-1.5 max-h-[120px] leading-relaxed"
                />
                <div className="flex items-center gap-1 shrink-0 mb-0.5">
                  <button
                    onClick={toggleRecording}
                    disabled={isTranscribing}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-colors"
                    title="Voice input"
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                  <button className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-colors" title="Deep Think">
                    <BrainCircuit className="h-4 w-4" />
                  </button>
                  <button className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-colors" title="Charts">
                    <BarChart3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={loading || !input.trim()}
                    className="p-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between mt-1.5 px-1">
              <p className="text-[10px] text-slate-600">Press Enter to send · Shift+Enter for new line · Cmd+K to focus</p>
              <p className="text-[10px] text-slate-600">{input.length > 0 ? `${input.length} chars` : ""}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Chat History */}
      {showHistory && (
        <div className="w-72 border-l border-slate-800 bg-[#0d1117] flex flex-col shrink-0">
          <div className="flex items-center justify-between p-3 border-b border-slate-800">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-slate-400" /> History</h3>
            <button onClick={() => setShowHistory(false)} className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"><X className="h-3.5 w-3.5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {history && history.messages && history.messages.length > 0 ? (
              history.messages.filter((m: any) => m.role === "user").slice(0, 20).map((m: any, i: number) => (
                <button key={i} className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-colors truncate">
                  {m.content}
                </button>
              ))
            ) : (
              <p className="text-[11px] text-slate-600 text-center py-8">No conversation history yet</p>
            )}
          </div>
        </div>
      )}

      {/* Right Panel - Dataset Info */}
      {panelOpen && !showHistory && (
        <div className="w-72 border-l border-slate-800 bg-[#0d1117] flex flex-col shrink-0">
          <div className="flex items-center justify-between p-3 border-b border-slate-800">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5 text-slate-400" /> Dataset Info</h3>
            <button onClick={() => setPanelOpen(false)} className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"><X className="h-3.5 w-3.5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {dataset && (
              <>
                <div className="space-y-2">
                  <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/30">
                    <p className="text-[10px] text-slate-500 mb-0.5">Name</p>
                    <p className="text-xs font-medium text-white">{dataset.name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/30">
                      <p className="text-[10px] text-slate-500 mb-0.5">Rows</p>
                      <p className="text-xs font-bold text-white">{dataset.rows?.toLocaleString()}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/30">
                      <p className="text-[10px] text-slate-500 mb-0.5">Columns</p>
                      <p className="text-xs font-bold text-white">{dataset.columns}</p>
                    </div>
                  </div>
                </div>
                {context && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Status</p>
                    {[
                      { label: "Data Cleaning", done: context.cleaned },
                      { label: "EDA Analysis", done: context.eda_completed },
                      { label: "ML Training", done: context.ml_completed },
                    ].map(s => (
                      <div key={s.label} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/30">
                        <span className="text-[11px] text-slate-400">{s.label}</span>
                        {s.done ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <div className="h-3.5 w-3.5 rounded-full border border-slate-600" />}
                      </div>
                    ))}
                  </div>
                )}
                {context?.key_metrics && Object.keys(context.key_metrics).length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Key Metrics</p>
                    {Object.entries(context.key_metrics).slice(0, 5).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/30">
                        <span className="text-[11px] text-slate-400 truncate">{k}</span>
                        <span className="text-[11px] font-medium text-white ml-2">{v != null ? (typeof v === "number" ? v.toFixed(2) : String(v)) : "-"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function getWelcomeMessage(ctx: CopilotContext): string {
  if (!ctx.cleaned) return `Welcome! I can see **${ctx.dataset_name}** (${ctx.rows.toLocaleString()} rows, ${ctx.columns} columns). I found some data quality issues. Say **"analyze my data"** to get a full plan!`;
  if (ctx.eda_completed && ctx.ml_completed) return `Welcome back! **${ctx.dataset_name}** is fully analyzed. Best model: **${String(ctx.key_metrics?.best_model ?? "N/A")}**. What would you like to do next?`;
  return `Welcome! I'm your AI copilot for **${ctx.dataset_name}**. ${ctx.cleaned ? "Cleaned" : "Needs cleaning"} · ${ctx.eda_completed ? "EDA done" : "EDA pending"} · ${ctx.ml_completed ? "ML trained" : "ML pending"}. Say **"analyze my data"** or ask me anything!`;
}

function getSuggestions(ctx: CopilotContext): string[] {
  if (!ctx.cleaned) return ["Analyze my data", "Clean the data", "What issues exist?", "Goal detection"];
  if (!ctx.eda_completed) return ["Run EDA", "Explore correlations", "Show distributions", "Train a model"];
  if (!ctx.ml_completed) return ["Train ML models", "Model Playground", "What's the best algorithm?", "Generate dashboard"];
  return ["Generate dashboard", "Deploy model", "Create story", "What insights?"];
}

export default function CopilotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const datasetId = parseInt(id, 10);
  return <Suspense><CopilotContent datasetId={datasetId} /></Suspense>;
}
