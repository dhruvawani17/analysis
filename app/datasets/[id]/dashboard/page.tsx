"use client";

import { use, useState, useMemo, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Loader2, LayoutDashboard, TrendingUp, TrendingDown,
  BarChart3, RefreshCw, Activity, Star, Target, Zap, Heart,
  Lightbulb, Layers, Filter, ImageDown, FileText,
  Database, Table, Hash, List, CalendarDays, AlertTriangle, Copy,
  PieChart, Grid3X3, ScatterChart, CheckCircle2, Shield,
  AlertCircle, Info, BookOpen, ListChecks, FileSearch, ShieldAlert,
  Crosshair, TrendingUp as TrendIcon, ClipboardList,
  MessageCircle, Sparkles, ChevronRight,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { DashboardConfig } from "@/lib/types";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

const PBI_COLORS = [
  { bg: "from-blue-500 to-blue-600", ring: "ring-blue-500", text: "text-blue-600", light: "bg-blue-50 border-blue-100", solid: "bg-blue-500", hex: "#2563EB" },
  { bg: "from-emerald-500 to-teal-500", ring: "ring-emerald-500", text: "text-emerald-600", light: "bg-emerald-50 border-emerald-100", solid: "bg-emerald-500", hex: "#10B981" },
  { bg: "from-amber-500 to-orange-500", ring: "ring-amber-500", text: "text-amber-600", light: "bg-amber-50 border-amber-100", solid: "bg-amber-500", hex: "#F59E0B" },
  { bg: "from-violet-500 to-purple-500", ring: "ring-violet-500", text: "text-violet-600", light: "bg-violet-50 border-violet-100", solid: "bg-violet-500", hex: "#8B5CF6" },
  { bg: "from-rose-500 to-pink-500", ring: "ring-rose-500", text: "text-rose-600", light: "bg-rose-50 border-rose-100", solid: "bg-rose-500", hex: "#EC4899" },
  { bg: "from-cyan-500 to-blue-500", ring: "ring-cyan-500", text: "text-cyan-600", light: "bg-cyan-50 border-cyan-100", solid: "bg-cyan-500", hex: "#06B6D4" },
];

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  "trending-up": TrendingUp, "trending-down": TrendingDown,
  activity: Activity, star: Star, target: Target, zap: Zap, heart: Heart,
  "alert-triangle": AlertTriangle, copy: Copy, "pie-chart": PieChart,
  layers: Layers, grid: Grid3X3, "scatter-chart": ScatterChart, shield: Shield,
  database: Database, calendar: CalendarDays, "check-circle": CheckCircle2, info: Info,
  "bar-chart": BarChart3,
};

const chartTypeBadge: Record<string, { label: string; color: string }> = {
  bar: { label: "Bar", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  line: { label: "Line", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  area: { label: "Area", color: "bg-teal-500/10 text-teal-400 border-teal-500/20" },
  pie: { label: "Pie", color: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  donut: { label: "Donut", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  scatter: { label: "Scatter", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  histogram: { label: "Histogram", color: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  box: { label: "Box Plot", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  heatmap: { label: "Heatmap", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  treemap: { label: "Treemap", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
  funnel: { label: "Funnel", color: "bg-pink-500/10 text-pink-400 border-pink-500/20" },
  sunburst: { label: "Sunburst", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  waterfall: { label: "Waterfall", color: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
};

const severityColors: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20" },
  warning: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
  info: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  success: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
};

const insightTypeColors: Record<string, { bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }> = {
  success: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", icon: CheckCircle2 },
  error: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", icon: AlertCircle },
  warning: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", icon: AlertTriangle },
  info: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", icon: Info },
};

const actionBadgeColors: Record<string, string> = {
  "Fix Now": "bg-red-500/10 text-red-400 border-red-500/20",
  Review: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Investigate: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Generate: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  View: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

export default function DashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const datasetId = parseInt(id, 10);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<"none" | "png" | "pdf">("none");
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  const { data: dataset } = useQuery({
    queryKey: ["dataset", datasetId],
    queryFn: () => api.datasets.get(datasetId),
  });

  const { isLoading: loadingDashboard } = useQuery({
    queryKey: ["dashboard", datasetId],
    queryFn: async () => { try { const r = await api.dashboard.get(datasetId); setConfig(r.config); return r; } catch { return null; } },
  });

  const generateMutation = useMutation({
    mutationFn: async () => { const r = await api.dashboard.generate(datasetId); setConfig(r.config); return r; },
  });

  const allCharts = useMemo(() => config?.rendered_charts || config?.charts || [], [config]);
  const sections = useMemo(() => config?.sections || [{ title: "All Charts", charts: allCharts.map((_, i) => i) }], [config, allCharts]);
  const currentSections = useMemo(() => selectedSection === null ? sections : sections.filter(s => s.title === selectedSection), [sections, selectedSection]);
  const ds = useMemo(() => config?.dataset_summary, [config]);

  const handleExport = useCallback(async (fmt: "png" | "pdf") => {
    if (!dashboardRef.current) return;
    setExporting(fmt);
    try {
      const el = dashboardRef.current;
      if (fmt === "pdf") {
        document.body.classList.add("printing-dashboard");
        window.print();
      } else {
        const domToImage = (await import("dom-to-image-more")).default;
        const dataUrl = await domToImage.toPng(el, { pixelRatio: 2, filter: (node: Node) => { if (node instanceof HTMLElement) { if (node.classList.contains("print:hidden")) return false; if (node.tagName === "BUTTON" || node.tagName === "A") return false; } return true; } });
        const link = document.createElement("a");
        link.download = `dashboard-${datasetId}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      document.body.classList.remove("printing-dashboard");
      setTimeout(() => setExporting("none"), 1000);
    }
  }, [datasetId]);

  const totalKpis = config?.kpis?.length || 0;
  const totalCharts = allCharts.length;

  const sidebarInsights = useMemo(() => {
    const insights: Array<{ icon: string; text: string; action: string; severity: string }> = [];
    if (config?.ai_insights) {
      config.ai_insights.slice(0, 3).forEach(i => insights.push({ icon: i.type === "success" ? "check" : i.type === "warning" ? "alert" : "info", text: i.message, action: i.type === "success" ? "View" : i.type === "warning" ? "Review" : "Investigate", severity: i.type }));
    }
    if (config?.detective_issues) {
      config.detective_issues.slice(0, 2).forEach(i => insights.push({ icon: "alert", text: `${i.column}: ${i.type} (${i.pct}%)`, action: "Fix Now", severity: i.severity }));
    }
    if (config?.action_items) {
      config.action_items.slice(0, 2).forEach(i => insights.push({ icon: "check", text: i.action, action: "Generate", severity: i.impact }));
    }
    return insights.slice(0, 6);
  }, [config]);

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      <header className="border-b border-[#1e293b] bg-[#0f172a]/90 backdrop-blur-xl sticky top-0 z-50 print:hidden">
        <div className="mx-auto flex items-center gap-3 py-2.5 px-4 max-w-[1800px]">
          <Link href={`/datasets/${datasetId}`}>
            <Button variant="ghost" size="icon" className="rounded-lg hover:bg-[#18181b] h-8 w-8">
              <ArrowLeft className="h-4 w-4 text-[#a1a1aa]" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-[#6366f1] flex items-center justify-center">
              <LayoutDashboard className="h-3.5 w-3.5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-[#f8fafc]">{config?.title || "Dashboard"}</h1>
              {dataset && <p className="text-[10px] text-[#a1a1aa]">{dataset.name}</p>}
            </div>
          </div>
          <div className="flex-1" />
          {config && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-[10px] text-[#a1a1aa]">
                <span className="font-medium text-[#f8fafc]">{totalCharts}</span> charts
                <span className="text-[#27272a]">·</span>
                <span className="font-medium text-[#f8fafc]">{totalKpis}</span> KPIs
              </div>
              <div className="w-px h-3 bg-[#27272a]" />
              <Button variant="outline" size="sm" onClick={() => handleExport("png")} disabled={exporting !== "none"} className="gap-1 border-[#27272a] text-[#a1a1aa] hover:bg-[#18181b] hover:text-[#f8fafc] h-7 text-[10px] px-2">
                {exporting === "png" ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImageDown className="h-3 w-3" />}PNG
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport("pdf")} disabled={exporting !== "none"} className="gap-1 border-[#27272a] text-[#a1a1aa] hover:bg-[#18181b] hover:text-[#f8fafc] h-7 text-[10px] px-2">
                {exporting === "pdf" ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}PDF
              </Button>
              <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending} size="sm" className="gap-1 bg-[#6366f1] hover:bg-[#4f46e5] text-white h-7 text-[10px] px-2">
                {generateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                {config ? "Refresh" : "Generate"}
              </Button>
              <ThemeToggle />
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto px-4 py-4 max-w-[1800px]">
        {!config && !loadingDashboard && (
          <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-md border-[#1e293b] bg-gradient-to-br from-[#0f172a] to-[#1e293b] shadow-2xl">
              <CardContent className="p-10 text-center">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-indigo-500/25">
                  <LayoutDashboard className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1.5">Executive Dashboard</h3>
                <p className="text-sm text-slate-400 mb-6 max-w-sm mx-auto leading-relaxed">
                  Generate a comprehensive AI-powered dashboard with KPIs, data quality scoring, feature importance, outlier detection, correlations, ML metrics, predictions, and narrative insights
                </p>
                <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending} size="default" className="gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/25">
                  {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LayoutDashboard className="h-4 w-4" />}
                  {generateMutation.isPending ? "Generating..." : "Generate Dashboard"}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {generateMutation.isPending && (
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="text-center">
              <div className="relative mx-auto mb-5 h-14 w-14">
                <div className="absolute inset-0 rounded-xl bg-indigo-500 animate-pulse opacity-20" />
                <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-indigo-400" /></div>
              </div>
              <p className="text-sm font-bold text-white">Building Your Executive Dashboard</p>
              <p className="text-xs text-slate-400 mt-1">Computing data quality, distributions, correlations, ML insights, and narrative story</p>
            </div>
          </div>
        )}

        {config && (
          <div ref={dashboardRef} className="space-y-4 overflow-hidden">

            {/* KPI Row */}
            {config.kpis && config.kpis.length > 0 && (
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {config.kpis.slice(0, 6).map((kpi, i) => {
                  const Icon = iconMap[kpi.icon] || BarChart3;
                  const colorIdx = typeof kpi.color === "number" ? kpi.color % PBI_COLORS.length : 0;
                  const cs = PBI_COLORS[colorIdx];
                  const t = kpi.trend;
                  const sparkData: number[] = Array.isArray(kpi.sparkline) ? kpi.sparkline.map(Number) : [30, 45, 35, 60, 42, 55, 48, 62, 50, 70, 58, 75];
                  const max = Math.max(...sparkData);
                  const min = Math.min(...sparkData);
                  const range = max - min || 1;
                  const points = sparkData.map((v, idx) => {
                    const x = (idx / (sparkData.length - 1)) * 100;
                    const y = 30 - ((v - min) / range) * 26;
                    return `${x},${y}`;
                  }).join(" ");
                  return (
                    <div key={i} className="relative rounded-xl border border-[#1e293b] bg-gradient-to-br from-[#0f172a] to-[#1e293b] p-4 hover:border-[#334155] transition-all duration-200 overflow-hidden group">
                      <div className="absolute top-0 right-0 w-20 h-20 opacity-[0.03]">
                        <Icon className="w-full h-full" />
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${cs.bg} flex items-center justify-center shadow-lg`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        {t && (
                          <div className={`flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${t.direction === "up" ? "text-emerald-400 bg-emerald-500/10" : t.direction === "down" ? "text-red-400 bg-red-500/10" : "text-slate-400 bg-slate-500/10"}`}>
                            {t.direction === "up" ? <TrendingUp className="h-2.5 w-2.5" /> : t.direction === "down" ? <TrendingDown className="h-2.5 w-2.5" /> : null}
                            <span>{t.label}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mb-1 font-medium">{kpi.name}</p>
                      <p className="text-2xl font-bold text-white tracking-tight">{kpi.value}</p>
                      <svg className="absolute bottom-0 left-0 right-0 h-8 opacity-40 group-hover:opacity-60 transition-opacity" viewBox="0 0 100 30" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id={`spark-${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={cs.hex} stopOpacity="0.3" />
                            <stop offset="100%" stopColor={cs.hex} stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <polygon points={`0,30 ${points} 100,30`} fill={`url(#spark-${i})`} />
                        <polyline points={points} fill="none" stroke={cs.hex} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Key Insights */}
            {config.insights && config.insights.length > 0 && (
              <div className="rounded-xl border border-[#1e293b] bg-gradient-to-br from-[#0f172a] to-[#1e293b] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-4 w-4 text-amber-400" />
                  <h2 className="text-sm font-semibold text-white">Key Insights</h2>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-3.5 border-amber-500/20 text-amber-400 bg-amber-500/10 font-medium">{config.insights.length}</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {config.insights.map((ins, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                      <span className="text-amber-400 mt-0.5 text-sm">◆</span>
                      <p className="text-[11px] text-slate-300 leading-relaxed">{ins}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trend Analysis */}
            {config.trends && config.trends.length > 0 && (
              <div className="rounded-xl border border-[#1e293b] bg-gradient-to-br from-[#0f172a] to-[#1e293b] overflow-hidden">
                <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-[#1e293b]">
                  <TrendIcon className="h-4 w-4 text-cyan-400" />
                  <h2 className="text-sm font-semibold text-white">Trend Analysis</h2>
                </div>
                <div className="p-4">
                  {(() => {
                    const trendMetrics = config.trends.map((t, i) => ({
                      name: t.metric,
                      current: typeof t.current === "number" ? t.current : parseFloat(String(t.current)) || 0,
                      average: typeof t.average === "number" ? t.average : parseFloat(String(t.average)) || 0,
                      change: t.change_pct,
                      direction: t.direction,
                    }));
                    return (
                      <div className="space-y-3">
                        <div className="min-w-0 overflow-x-auto">
                          <Plot
                            data={[
                              {
                                x: trendMetrics.map(t => t.name),
                                y: trendMetrics.map(t => t.current),
                                type: "bar",
                                name: "Current",
                                marker: { color: "#3b82f6", cornerradius: 4 },
                                yaxis: "y",
                              },
                              {
                                x: trendMetrics.map(t => t.name),
                                y: trendMetrics.map(t => t.average),
                                type: "scatter",
                                mode: "lines+markers",
                                name: "Average",
                                line: { color: "#f97316", width: 2.5, shape: "spline" },
                                marker: { size: 7, color: "#f97316", line: { color: "#0f172a", width: 2 } },
                                yaxis: "y",
                              },
                            ]}
                            layout={{
                              height: 260,
                              margin: { t: 15, b: 90, l: 45, r: 15 },
                              paper_bgcolor: "rgba(0,0,0,0)",
                              plot_bgcolor: "rgba(0,0,0,0)",
                              font: { color: "#94a3b8", size: 10 },
                              xaxis: { gridcolor: "rgba(148,163,184,0.08)", tickangle: -35, tickfont: { size: 9 } },
                              yaxis: { gridcolor: "rgba(148,163,184,0.08)" },
                              showlegend: false,
                              bargap: 0.5,
                            }}
                            config={{ responsive: true, displayModeBar: false }}
                            className="w-full min-w-[400px]"
                            useResizeHandler
                          />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                          {trendMetrics.map((t, i) => (
                            <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: PBI_COLORS[i % PBI_COLORS.length].hex }} />
                                <span className="text-[11px] font-medium text-white truncate">{t.name}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                <span className="text-[10px] text-slate-400">Current: <b className="text-white">{t.current.toLocaleString()}</b></span>
                                <span className="text-[10px] text-slate-400">Avg: <b className="text-white">{t.average.toLocaleString()}</b></span>
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${t.direction === "up" ? "text-emerald-400 bg-emerald-500/10" : t.direction === "down" ? "text-red-400 bg-red-500/10" : "text-slate-400 bg-slate-500/10"}`}>
                                  {t.direction === "up" ? "+" : t.direction === "down" ? "" : ""}{t.change > 0 ? "+" : ""}{t.change.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Charts */}
            {currentSections.map((section) => {
              const secCharts = section.charts.filter(i => i < allCharts.length).map(i => allCharts[i]);
              if (secCharts.length === 0) return null;
              const SectionIcon = section.title === "Data Distributions" ? BarChart3 :
                section.title === "Outlier Analysis" ? Activity :
                section.title === "Categorical Analysis" ? PieChart :
                section.title === "Correlation Matrix" ? Grid3X3 :
                section.title === "Time Trends" ? TrendingUp :
                section.title === "Relationships" ? ScatterChart :
                section.title === "ML Dashboard" ? Zap :
                section.title === "Predictions" ? Target :
                section.title === "Data Quality" ? Shield : Layers;
              return (
                <div key={section.title} id={`section-${section.title.replace(/\s+/g, "-")}`} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-[#27272a] flex items-center justify-center">
                      <SectionIcon className="h-3 w-3 text-[#a1a1aa]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h2 className="text-xs font-semibold text-[#f8fafc]">{section.title}</h2>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-[#27272a] text-[#a1a1aa] bg-[#18181b] font-medium">{secCharts.length}</Badge>
                      </div>
                      {section.description && <p className="text-[9px] text-[#a1a1aa] mt-px">{section.description}</p>}
                    </div>
                  </div>
                  <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
                    {secCharts.map((chart: any, ci: number) => {
                      const ct = chartTypeBadge[chart.type] || { label: chart.type, color: "bg-[#27272a] text-[#a1a1aa] border-[#27272a]" };
                      return (
                        <Card key={ci} className="border-[#1e293b] bg-gradient-to-br from-[#0f172a] to-[#1e293b] shadow-lg hover:border-[#334155] transition-all duration-200 overflow-hidden">
                          <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-[#1e293b]">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-semibold border uppercase tracking-wider ${ct.color}`}>{ct.label}</span>
                              <h3 className="text-[11px] font-semibold text-white truncate">{chart.title}</h3>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              {chart.x && <span className="text-[8px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 font-mono">{chart.x}</span>}
                              {chart.y && <span className="text-[8px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 font-mono">{chart.y}</span>}
                            </div>
                          </div>
                          <CardContent className="p-1">
                            {chart.plotly ? (
                              <Plot
                                data={chart.plotly.data}
                                layout={{
                                  ...chart.plotly.layout,
                                  height: 320,
                                  margin: chart.plotly.layout?.margin || { t: 40, b: 55, l: 60, r: 18 },
                                  paper_bgcolor: "rgba(0,0,0,0)",
                                  plot_bgcolor: "rgba(0,0,0,0)",
                                  font: { color: "#94a3b8", size: 10, family: "Inter, system-ui, sans-serif" },
                                  xaxis: { ...chart.plotly.layout?.xaxis, gridcolor: "rgba(148,163,184,0.08)", zerolinecolor: "rgba(148,163,184,0.08)" },
                                  yaxis: { ...chart.plotly.layout?.yaxis, gridcolor: "rgba(148,163,184,0.08)", zerolinecolor: "rgba(148,163,184,0.08)" },
                                }}
                                config={{ responsive: true, displayModeBar: false, scrollZoom: false }}
                                className="w-full" useResizeHandler
                              />
                            ) : (
                              <div className="h-[320px] flex items-center justify-center bg-[#0f172a] rounded-lg border border-[#1e293b]">
                                <div className="text-center"><BarChart3 className="h-8 w-8 text-slate-700 mx-auto mb-2" /><p className="text-xs text-slate-500 font-medium">{chart.type}: {chart.title}</p></div>
                              </div>
                            )}
                          </CardContent>
                          {chart.description && (
                            <div className="px-3 pb-2 pt-0.5"><p className="text-[9px] text-[#a1a1aa] leading-relaxed">{chart.description}</p></div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Main content + Sidebar */}
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-[1fr_340px]">

              {/* Left: Sections */}
              <div className="space-y-4">
                {/* Recommendations */}
                {config.recommendations && config.recommendations.length > 0 && (
                  <div className="rounded-xl border border-[#27272a] bg-[#18181b] overflow-hidden">
                    <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-[#27272a]">
                      <ListChecks className="h-4 w-4 text-violet-400" />
                      <h2 className="text-sm font-semibold text-[#f8fafc]">Recommendations</h2>
                    </div>
                    <div className="divide-y divide-[#27272a]">
                      {config.recommendations.map((rec, i) => (
                        <div key={i} className="flex items-start gap-3 px-4 py-2.5 hover:bg-[#0f0f11] transition-colors">
                          <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${rec.impact === "high" ? "bg-emerald-500/20 text-emerald-400" : rec.impact === "medium" ? "bg-amber-500/20 text-amber-400" : "bg-blue-500/20 text-blue-400"}`}>
                            <CheckCircle2 className="h-3 w-3" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-medium text-[#f8fafc]">{rec.action}</span>
                              <Badge variant="outline" className={`text-[8px] px-1 py-0 h-3 font-medium border ${rec.impact === "high" ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/10" : rec.impact === "medium" ? "border-amber-500/20 text-amber-400 bg-amber-500/10" : "border-blue-500/20 text-blue-400 bg-blue-500/10"}`}>{rec.impact}</Badge>
                            </div>
                            <p className="text-[10px] text-[#a1a1aa] mt-0.5">{rec.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Data Story */}
                {config.story_segments && config.story_segments.length > 0 && (
                  <div className="rounded-xl border border-[#27272a] bg-[#18181b] overflow-hidden">
                    <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-[#27272a]">
                      <BookOpen className="h-4 w-4 text-[#6366f1]" />
                      <h2 className="text-sm font-semibold text-[#f8fafc]">Data Story</h2>
                    </div>
                    <div className="p-4 space-y-3">
                      {config.story_segments.map((seg, i) => (
                        <div key={i} className="relative pl-5 border-l-2 border-[#6366f1]/30 pb-1 last:pb-0">
                          <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-[#6366f1] flex items-center justify-center text-[7px] text-white font-bold">{i + 1}</div>
                          <p className="text-[11px] font-semibold text-[#6366f1] mb-0.5">{seg.chapter}</p>
                          <p className="text-[11px] text-[#a1a1aa] leading-relaxed">{seg.narrative}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Business Sections */}
                {config.executive_summary && selectedSection === null && (
                  <div className="rounded-xl border border-[#27272a] bg-[#18181b] overflow-hidden">
                    <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-[#27272a]">
                      <FileSearch className="h-4 w-4 text-[#4f46e5]" />
                      <h2 className="text-sm font-semibold text-[#f8fafc]">Executive Summary</h2>
                    </div>
                    <div className="p-4">
                      <p className="text-[12px] text-[#a1a1aa] leading-relaxed">{config.executive_summary}</p>
                    </div>
                  </div>
                )}

                {config.swot && selectedSection === null && (
                  <div className="rounded-xl border border-[#27272a] bg-[#18181b] overflow-hidden">
                    <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-[#27272a]">
                      <Crosshair className="h-4 w-4 text-violet-400" />
                      <h2 className="text-sm font-semibold text-[#f8fafc]">SWOT Analysis</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
                      {([
                        { key: "strengths", label: "Strengths", color: "emerald", icon: "✓" },
                        { key: "weaknesses", label: "Weaknesses", color: "red", icon: "✗" },
                        { key: "opportunities", label: "Opportunities", color: "blue", icon: "→" },
                        { key: "threats", label: "Threats", color: "amber", icon: "⚠" },
                      ] as const).map(({ key, label, color, icon }) => {
                        const items = config.swot![key];
                        const colorMap: Record<string, { bg: string; text: string; header: string }> = {
                          emerald: { bg: "bg-emerald-500/5", text: "text-emerald-300", header: "text-emerald-400" },
                          red: { bg: "bg-red-500/5", text: "text-red-300", header: "text-red-400" },
                          blue: { bg: "bg-blue-500/5", text: "text-blue-300", header: "text-blue-400" },
                          amber: { bg: "bg-amber-500/5", text: "text-amber-300", header: "text-amber-400" },
                        };
                        const c = colorMap[color];
                        return (
                          <div key={key} className={`rounded-lg border border-[#27272a] ${c.bg} p-3`}>
                            <p className={`text-[11px] font-bold ${c.header} mb-1.5 uppercase tracking-wider`}>{label}</p>
                            {items.length > 0 ? (
                              <ul className="space-y-1">
                                {items.map((item, j) => (
                                  <li key={j} className={`text-[10px] ${c.text} leading-relaxed flex items-start gap-1`}>
                                    <span className="font-bold mt-px shrink-0">{icon}</span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className={`text-[10px] ${c.text} italic opacity-60`}>No {key} identified</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {config.decisions && config.decisions.length > 0 && selectedSection === null && (
                  <div className="rounded-xl border border-[#27272a] bg-[#18181b] overflow-hidden">
                    <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-[#27272a]">
                      <Crosshair className="h-4 w-4 text-[#6366f1]" />
                      <h2 className="text-sm font-semibold text-[#f8fafc]">Decision Points</h2>
                    </div>
                    <div className="divide-y divide-[#27272a]">
                      {config.decisions.map((d, i) => {
                        const recColor = d.recommendation.startsWith("yes") ? "text-emerald-400" : d.recommendation.startsWith("no") ? "text-red-400" : "text-amber-400";
                        const confColors: Record<string, string> = {
                          high: "bg-emerald-500/10 text-emerald-400",
                          medium: "bg-amber-500/10 text-amber-400",
                          low: "bg-red-500/10 text-red-400",
                        };
                        return (
                          <div key={i} className="px-4 py-2.5 hover:bg-[#0f0f11] transition-colors">
                            <p className="text-[11px] font-semibold text-[#f8fafc] mb-0.5">{d.question}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[10px] font-medium ${recColor}`}>{d.recommendation}</span>
                              <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded ${confColors[d.confidence] || confColors.medium}`}>{d.confidence} confidence</span>
                            </div>
                            <p className="text-[10px] text-[#a1a1aa] mt-1 leading-relaxed">{d.rationale}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {config.benchmarks && config.benchmarks.length > 0 && selectedSection === null && (
                  <div className="rounded-xl border border-[#27272a] bg-[#18181b] overflow-hidden">
                    <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-[#27272a]">
                      <Target className="h-4 w-4 text-emerald-400" />
                      <h2 className="text-sm font-semibold text-[#f8fafc]">Performance vs Benchmark</h2>
                    </div>
                    <div className="divide-y divide-[#27272a]">
                      {config.benchmarks.map((b, i) => {
                        const isAbove = b.status === "above";
                        const pct = b.benchmark > 0 ? Math.min(100, (b.value / b.benchmark) * 100) : 0;
                        return (
                          <div key={i} className="px-4 py-2.5 hover:bg-[#0f0f11] transition-colors">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] font-semibold text-[#f8fafc]">{b.metric}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-[#a1a1aa]">Target: <b className="text-[#f8fafc]">{b.benchmark.toLocaleString()}</b></span>
                                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${isAbove ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
                                  {isAbove ? "✓ Above" : "↓ Below"}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 mb-1">
                              <div className="flex-1 h-1.5 rounded-full bg-[#27272a] overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-700 ${isAbove ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${Math.max(pct, 3)}%` }} />
                              </div>
                              <span className="text-[9px] font-mono font-semibold text-[#a1a1aa] w-12 text-right">{typeof b.value === "number" ? b.value.toLocaleString() : b.value}</span>
                            </div>
                            <p className="text-[9px] text-[#a1a1aa] italic">{b.note}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {config.action_items && config.action_items.length > 0 && selectedSection === null && (
                  <div className="rounded-xl border border-[#27272a] bg-[#18181b] overflow-hidden">
                    <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-[#27272a]">
                      <ClipboardList className="h-4 w-4 text-orange-400" />
                      <h2 className="text-sm font-semibold text-[#f8fafc]">Action Items</h2>
                    </div>
                    <div className="divide-y divide-[#27272a]">
                      {config.action_items.map((item, i) => {
                        const impactColors: Record<string, string> = {
                          high: "bg-emerald-500/10 text-emerald-400",
                          medium: "bg-amber-500/10 text-amber-400",
                          low: "bg-blue-500/10 text-blue-400",
                        };
                        const urgencyColors: Record<string, string> = {
                          immediate: "bg-red-500/10 text-red-400",
                          high: "bg-orange-500/10 text-orange-400",
                          medium: "bg-amber-500/10 text-amber-400",
                          low: "bg-[#27272a] text-[#a1a1aa]",
                        };
                        return (
                          <div key={i} className="flex items-center gap-3 px-4 py-2 hover:bg-[#0f0f11] transition-colors">
                            <span className="text-[10px] font-mono font-bold text-[#a1a1aa] w-5">{item.priority}</span>
                            <div className="flex-1 min-w-0">
                              <span className="text-[11px] font-medium text-[#f8fafc]">{item.action}</span>
                            </div>
                            <div className="shrink-0 flex items-center gap-1">
                              <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded ${impactColors[item.impact] || impactColors.low}`}>{item.impact}</span>
                              <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded ${urgencyColors[item.urgency] || urgencyColors.low}`}>{item.urgency}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {config.feature_importance && config.feature_importance.length > 0 && (
                  <div className="rounded-xl border border-[#27272a] bg-[#18181b] overflow-hidden">
                    <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-[#27272a]">
                      <Activity className="h-4 w-4 text-[#4f46e5]" />
                      <h2 className="text-sm font-semibold text-[#f8fafc]">Feature Importance</h2>
                    </div>
                    <div className="p-4">
                      <div className="space-y-1.5">
                        {config.feature_importance.slice(0, 10).map((fi, i) => {
                          const pct = fi.importance * 100;
                          const sel = selectedFeature === fi.feature;
                          return (
                            <div key={fi.feature}>
                              <div className={`flex items-center gap-2 px-2 py-1 rounded-lg cursor-pointer transition-all ${sel ? "bg-[#6366f1]/10 border border-[#6366f1]/20" : "hover:bg-[#0f0f11]"}`}
                                onClick={() => setSelectedFeature(sel ? null : fi.feature)}>
                                <span className="text-[10px] font-mono text-[#a1a1aa] w-5">{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-0.5">
                                    <span className="text-[11px] font-medium text-[#f8fafc] truncate">{fi.feature}</span>
                                    <span className="text-[10px] font-mono font-semibold text-[#a1a1aa]">{pct.toFixed(1)}%</span>
                                  </div>
                                  <div className="h-1.5 rounded-full bg-[#27272a] overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-500 ${fi.direction === "pos" ? "bg-emerald-500" : "bg-red-500"}`}
                                      style={{ width: `${Math.max(pct, 2)}%` }} />
                                  </div>
                                </div>
                                <div className={`h-5 w-5 rounded flex items-center justify-center text-[8px] font-bold ${fi.direction === "pos" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                                  {fi.direction === "pos" ? "+" : "-"}
                                </div>
                              </div>
                              {sel && (
                                <div className="mx-2 mb-1.5 px-3 py-2 rounded-lg bg-[#6366f1]/5 border border-[#6366f1]/10 text-[10px] text-[#a1a1aa] leading-relaxed">
                                  <span className="font-semibold text-[#6366f1]">{fi.feature}</span> contributes <span className="font-semibold">{pct.toFixed(1)}%</span> to predictive power.
                                  {fi.direction === "pos" ? " Higher values positively impact the target." : " Higher values negatively impact the target."}
                                  {i === 0 && " This is the single most important feature."}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Insights */}
                {config.ai_insights && config.ai_insights.length > 0 && (
                  <div className="rounded-xl border border-[#1e293b] bg-gradient-to-br from-[#0f172a] to-[#1e293b] p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="h-4 w-4 text-amber-400" />
                      <h2 className="text-sm font-semibold text-white">AI Insights</h2>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-3.5 border-amber-500/20 text-amber-400 bg-amber-500/10 font-medium">{config.ai_insights.length}</Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {config.ai_insights.map((insight, i) => {
                        const style = insightTypeColors[insight.type] || insightTypeColors.info;
                        const Icon = style.icon;
                        return (
                          <div key={i} className={`flex items-start gap-2.5 p-3 rounded-lg border ${style.border} ${style.bg}`}>
                            <div className={`shrink-0 mt-0.5 ${style.text}`}><Icon className="h-3.5 w-3.5" /></div>
                            <p className={`text-[11px] leading-relaxed ${style.text}`}>{insight.message}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Data Detective */}
                {config.detective_issues && config.detective_issues.length > 0 && (
                  <div className="rounded-xl border border-[#1e293b] bg-gradient-to-br from-[#0f172a] to-[#1e293b] overflow-hidden">
                    <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-[#1e293b]">
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                      <h2 className="text-sm font-semibold text-white">Data Detective</h2>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-3.5 border-red-500/20 text-red-400 bg-red-500/10 font-medium">{config.detective_issues.length} issues</Badge>
                    </div>
                    <div className="divide-y divide-[#1e293b]">
                      {config.detective_issues.map((issue, i) => {
                        const sev = severityColors[issue.severity] || severityColors.info;
                        return (
                          <div key={i} className="flex items-start justify-between px-4 py-2.5 hover:bg-[#0f172a] transition-colors">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium border ${sev.bg} ${sev.text} ${sev.border}`}>
                                  <span className="h-1.5 w-1.5 rounded-full bg-current" />{issue.severity}
                                </span>
                                <span className="text-[11px] font-semibold text-white">{issue.column}</span>
                                <span className="text-[9px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded font-mono">{issue.type}</span>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5">{issue.count} of {issue.total} values ({issue.pct}%)</p>
                              <p className="text-[10px] text-slate-400 mt-0.5 italic">{issue.suggested_fix}</p>
                            </div>
                            <span className="shrink-0 ml-3 inline-flex items-center gap-1 text-[9px] font-medium text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                              <Activity className="h-2.5 w-2.5" /> {issue.confidence}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Risk Assessment */}
                {config.risks && config.risks.length > 0 && selectedSection === null && (
                  <div className="rounded-xl border border-[#1e293b] bg-gradient-to-br from-[#0f172a] to-[#1e293b] overflow-hidden">
                    <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-[#1e293b]">
                      <ShieldAlert className="h-4 w-4 text-red-400" />
                      <h2 className="text-sm font-semibold text-white">Risk Assessment</h2>
                    </div>
                    <div className="divide-y divide-[#1e293b]">
                      {config.risks.map((risk, i) => {
                        const urgencyColors: Record<string, { bg: string; text: string }> = {
                          immediate: { bg: "bg-red-500/10", text: "text-red-400" },
                          high: { bg: "bg-orange-500/10", text: "text-orange-400" },
                          medium: { bg: "bg-amber-500/10", text: "text-amber-400" },
                          low: { bg: "bg-emerald-500/10", text: "text-emerald-400" },
                        };
                        const uc = urgencyColors[risk.urgency] || urgencyColors.medium;
                        return (
                          <div key={i} className="px-4 py-2.5 hover:bg-[#0f172a] transition-colors">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <span className="text-[11px] font-semibold text-white">{risk.risk}</span>
                                <p className="text-[10px] text-slate-400 mt-0.5">{risk.mitigation}</p>
                              </div>
                              <div className="shrink-0 flex items-center gap-1.5">
                                <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded ${uc.bg} ${uc.text}`}>{risk.urgency}</span>
                                <span className="text-[9px] font-mono font-semibold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">{risk.score}/9</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Data Quality */}
                {config.data_quality && (
                  <div className="rounded-xl border border-[#27272a] bg-[#18181b] overflow-hidden">
                    <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-[#27272a]">
                      <Shield className="h-4 w-4 text-emerald-400" />
                      <h2 className="text-sm font-semibold text-[#f8fafc]">Data Quality</h2>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-3.5 border-emerald-500/20 text-emerald-400 bg-emerald-500/10 font-medium">{config.data_quality.overall}/100</Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 p-4">
                      {[
                        { label: "Completeness", value: config.data_quality.completeness, color: "#4f46e5" },
                        { label: "Consistency", value: config.data_quality.consistency, color: "#22c55e" },
                        { label: "Uniqueness", value: config.data_quality.uniqueness, color: "#f59e0b" },
                        { label: "Validity", value: config.data_quality.validity, color: "#8b5cf6" },
                        { label: "Accuracy", value: config.data_quality.accuracy, color: "#ec4899" },
                      ].map((m) => (
                        <div key={m.label} className="text-center p-3 rounded-xl bg-[#0f0f11] border border-[#27272a]">
                          <div className="relative h-16 w-16 mx-auto mb-2">
                            <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#27272a" strokeWidth="3" />
                              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={m.color} strokeWidth="3" strokeDasharray={`${m.value}, 100`} strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center"><span className="text-sm font-bold text-[#f8fafc]">{m.value}%</span></div>
                          </div>
                          <p className="text-[10px] font-medium text-[#a1a1aa]">{m.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Filters */}
                {config.filters && config.filters.length > 0 && (
                  <Card className="border-[#27272a] bg-[#18181b]">
                    <CardHeader className="pb-1.5 pt-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <Filter className="h-3 w-3 text-[#a1a1aa]" />
                        <CardTitle className="text-[11px] font-semibold text-[#f8fafc]">Cross-Filtering</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="px-3 pb-2.5">
                      <div className="flex flex-wrap gap-1">
                        {config.filters.map((f, i) => {
                          const active = activeFilters[f.column] && activeFilters[f.column].length > 0;
                          return (
                            <Badge key={i} variant="outline"
                              className={`text-[9px] px-1.5 py-0.5 font-medium cursor-pointer transition-all ${active ? "bg-[#6366f1]/10 text-[#6366f1] border-[#6366f1]/20" : "bg-[#27272a] text-[#a1a1aa] border-[#27272a] hover:bg-[#3f3f46]"}`}
                              onClick={() => setActiveFilters(p => { const n = { ...p }; if (active) delete n[f.column]; else n[f.column] = ["filtered"]; return n; })}>
                              {f.column}
                              <span className="ml-0.5 font-normal text-[#a1a1aa]/60">({f.type})</span>
                            </Badge>
                          );
                        })}
                      </div>
                      {Object.keys(activeFilters).length > 0 && (
                        <Button variant="ghost" size="sm" onClick={() => setActiveFilters({})} className="mt-1.5 text-[9px] h-4 px-1.5 text-[#a1a1aa] hover:text-[#f8fafc]">Clear all filters</Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Sidebar */}
              <div className="space-y-4">
                {/* Today's Insights */}
                {sidebarInsights.length > 0 && (
                  <div className="rounded-xl border border-[#27272a] bg-[#18181b] overflow-hidden">
                    <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-[#27272a]">
                      <Lightbulb className="h-4 w-4 text-[#f59e0b]" />
                      <h2 className="text-sm font-semibold text-[#f8fafc]">Today's Insights</h2>
                    </div>
                    <div className="divide-y divide-[#27272a]">
                      {sidebarInsights.map((insight, i) => {
                        const actionStyle = actionBadgeColors[insight.action] || "bg-[#27272a] text-[#a1a1aa] border-[#27272a]";
                        return (
                          <div key={i} className="px-4 py-2.5 hover:bg-[#0f0f11] transition-colors">
                            <p className="text-[11px] text-[#a1a1aa] leading-relaxed mb-1.5">{insight.text}</p>
                            <div className="flex items-center justify-between">
                              <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${actionStyle}`}>{insight.action}</span>
                              <ChevronRight className="h-3 w-3 text-[#a1a1aa]" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* AI Copilot */}
                <div className="rounded-xl border border-[#27272a] bg-[#18181b] overflow-hidden">
                  <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-[#27272a]">
                    <MessageCircle className="h-4 w-4 text-[#6366f1]" />
                    <h2 className="text-sm font-semibold text-[#f8fafc]">AI Copilot</h2>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="rounded-lg bg-[#6366f1]/10 border border-[#6366f1]/20 p-3">
                      <p className="text-[11px] text-[#6366f1] leading-relaxed">Ask me anything about your data. I can help you explore patterns, generate insights, and create visualizations.</p>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[9px] text-[#a1a1aa] uppercase tracking-wider font-medium">Suggested questions</p>
                      {["What are the key trends?", "Show me outliers", "Summarize the data", "Compare categories"].map((q, i) => (
                        <Link key={i} href={`/datasets/${datasetId}/chat?q=${encodeURIComponent(q)}`}>
                          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[#27272a] hover:border-[#3f3f46] hover:bg-[#0f0f11] transition-all cursor-pointer">
                            <span className="text-[10px] text-[#a1a1aa]">{q}</span>
                            <ChevronRight className="h-2.5 w-2.5 text-[#a1a1aa] ml-auto" />
                          </div>
                        </Link>
                      ))}
                    </div>
                    <Link href={`/datasets/${datasetId}/chat`}>
                      <Button variant="outline" className="w-full gap-1.5 border-[#27272a] text-[#a1a1aa] hover:bg-[#0f0f11] hover:text-[#f8fafc] h-8 text-[11px]">
                        <MessageCircle className="h-3 w-3" />Open Copilot
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-[8px] text-[#a1a1aa] pb-3 pt-1 border-t border-[#27272a]">
              <span>Executive Dashboard · {totalCharts} charts · {totalKpis} KPIs · {sections.length} sections{config.data_quality ? ` · DQ: ${config.data_quality.overall}/100` : ""}{config.ai_health_score != null ? ` · Health: ${config.ai_health_score}/100` : ""}</span>
              <span>AI-powered · Generated {new Date().toLocaleDateString()}</span>
            </div>
          </div>
        )}

        {generateMutation.isError && (
          <Card className="mt-4 border-red-500/20 bg-red-500/5 shadow-none">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <div className="h-4 w-4 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5"><span className="text-[8px] font-bold text-red-400">!</span></div>
                <p className="text-xs text-red-400">Error: {generateMutation.error instanceof Error ? generateMutation.error.message : "Failed to generate dashboard."}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <style jsx global>{`
        @media print { body { background: #09090b !important; } .print\\:hidden { display: none !important; } }
        body.printing-dashboard header { display: none !important; }
        body.printing-dashboard { background: #09090b !important; padding: 0 !important; margin: 0 !important; }
        body.printing-dashboard * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
      `}</style>
    </div>
  );
}
