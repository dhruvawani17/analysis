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
  AlertCircle, Info, BookOpen, ListChecks,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { DashboardConfig } from "@/lib/types";

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
  bar: { label: "Bar", color: "bg-blue-100 text-blue-700 border-blue-200" },
  line: { label: "Line", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  area: { label: "Area", color: "bg-teal-100 text-teal-700 border-teal-200" },
  pie: { label: "Pie", color: "bg-violet-100 text-violet-700 border-violet-200" },
  donut: { label: "Donut", color: "bg-purple-100 text-purple-700 border-purple-200" },
  scatter: { label: "Scatter", color: "bg-amber-100 text-amber-700 border-amber-200" },
  histogram: { label: "Histogram", color: "bg-rose-100 text-rose-700 border-rose-200" },
  box: { label: "Box Plot", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  heatmap: { label: "Heatmap", color: "bg-orange-100 text-orange-700 border-orange-200" },
  treemap: { label: "Treemap", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  funnel: { label: "Funnel", color: "bg-pink-100 text-pink-700 border-pink-200" },
  sunburst: { label: "Sunburst", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  waterfall: { label: "Waterfall", color: "bg-sky-100 text-sky-700 border-sky-200" },
};

function SeverityBadge({ severity }: { severity: string }) {
  const m: Record<string, { bg: string; text: string; dot: string }> = {
    critical: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
    warning: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
    info: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  };
  const s = m[severity] || m.info;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />{severity}
    </span>
  );
}

function InsightCard({ insight }: { insight: { type: string; message: string } }) {
  const c: Record<string, { border: string; bg: string; icon: string; text: string }> = {
    success: { border: "border-emerald-200", bg: "bg-emerald-50", icon: "text-emerald-500", text: "text-emerald-800" },
    error: { border: "border-red-200", bg: "bg-red-50", icon: "text-red-500", text: "text-red-800" },
    warning: { border: "border-amber-200", bg: "bg-amber-50", icon: "text-amber-500", text: "text-amber-800" },
    info: { border: "border-blue-200", bg: "bg-blue-50", icon: "text-blue-500", text: "text-blue-800" },
  };
  const style = c[insight.type] || c.info;
  const Icon = insight.type === "success" ? CheckCircle2 : insight.type === "error" ? AlertCircle : insight.type === "warning" ? AlertTriangle : Info;
  return (
    <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border ${style.border} ${style.bg}`}>
      <div className={`shrink-0 mt-0.5 ${style.icon}`}><Icon className="h-3.5 w-3.5" /></div>
      <p className={`text-[11px] leading-relaxed ${style.text}`}>{insight.message}</p>
    </div>
  );
}

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
      const rect = el.getBoundingClientRect();
      const w = Math.ceil(rect.width);
      const h = Math.ceil(el.scrollHeight);

      if (fmt === "pdf") {
        const printWin = window.open("", "_blank", `width=${w},height=${h}`);
        if (!printWin) { alert("Please allow popups to export PDF"); return; }
        const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map(s => s.outerHTML).join("\n");
        printWin.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Dashboard Export</title>${styles}<style>@media print { body { margin: 0; padding: 16px; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }</style></head><body>${el.outerHTML}</body></html>`);
        printWin.document.close();
        printWin.focus();
        setTimeout(() => { printWin.print(); printWin.close(); }, 800);
      } else {
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("xmlns", svgNS);
        svg.setAttribute("width", String(w));
        svg.setAttribute("height", String(h));
        const foreign = document.createElementNS(svgNS, "foreignObject");
        foreign.setAttribute("x", "0"); foreign.setAttribute("y", "0");
        foreign.setAttribute("width", "100%"); foreign.setAttribute("height", "100%");
        const div = document.createElement("div");
        div.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
        div.style.width = w + "px";
        div.innerHTML = el.outerHTML;
        const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map(s => s.outerHTML).join("\n");
        div.innerHTML = styles + el.outerHTML;
        foreign.appendChild(div);
        svg.appendChild(foreign);
        const svgStr = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = w * 2; canvas.height = h * 2;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.scale(2, 2);
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(url);
          canvas.toBlob((blob) => {
            if (!blob) return;
            const a = document.createElement("a");
            a.download = `dashboard-${datasetId}.png`;
            a.href = URL.createObjectURL(blob);
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
          }, "image/png");
        };
        img.onerror = (e) => {
          console.error("SVG render failed", e);
          URL.revokeObjectURL(url);
          try {
            const html2canvas = (window as any).__html2canvas;
            if (html2canvas) {
              html2canvas(el, { scale: 2, backgroundColor: "#ffffff" }).then((canvas: HTMLCanvasElement) => {
                canvas.toBlob((blob) => { if (blob) { const a = document.createElement("a"); a.download = `dashboard-${datasetId}.png`; a.href = URL.createObjectURL(blob); a.click(); } }, "image/png");
              });
            }
          } catch (e2) { console.error("Fallback also failed", e2); }
          alert("PNG export failed. Try the PDF export instead (uses browser print).");
        };
        img.src = url;
      }
    } catch (err) {
      console.error("Export failed:", err);
      alert("Export failed. Check console for details.");
    } finally {
      setTimeout(() => setExporting("none"), 2000);
    }
  }, [datasetId]);

  const totalKpis = config?.kpis?.length || 0;
  const totalCharts = allCharts.length;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="border-b border-[#E2E8F0] bg-white sticky top-0 z-50 shadow-sm print:hidden">
        <div className="mx-auto flex items-center gap-2 py-2 px-4 max-w-[1600px]">
          <Link href={`/datasets/${datasetId}`}>
            <Button variant="ghost" size="icon" className="rounded-lg hover:bg-slate-100 h-7 w-7"><ArrowLeft className="h-3.5 w-3.5 text-slate-500" /></Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm"><LayoutDashboard className="h-3 w-3 text-white" /></div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-semibold text-slate-800">{config?.title || "Dashboard"}</h1>
                {config && (<><Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-blue-200 text-blue-600 bg-blue-50 font-medium">{totalCharts} charts</Badge><Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-emerald-200 text-emerald-600 bg-emerald-50 font-medium">{totalKpis} KPIs</Badge></>)}
              </div>
              {dataset && <p className="text-[9px] text-slate-400">{dataset.name}</p>}
            </div>
          </div>
          <div className="flex-1" />
          {config && sections.length > 1 && (
            <div className="hidden md:flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5 mr-1">
              <button onClick={() => setSelectedSection(null)} className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all whitespace-nowrap ${selectedSection === null ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>All</button>
              {sections.map(s => (
                <button key={s.title} onClick={() => setSelectedSection(s.title)} className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all whitespace-nowrap ${selectedSection === s.title ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>{s.title}</button>
              ))}
            </div>
          )}
          {config && (
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => handleExport("png")} disabled={exporting !== "none"} className="gap-1 border-slate-200 text-slate-600 h-6 text-[10px] px-1.5">
                {exporting === "png" ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <ImageDown className="h-2.5 w-2.5" />}PNG
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport("pdf")} disabled={exporting !== "none"} className="gap-1 border-slate-200 text-slate-600 h-6 text-[10px] px-1.5">
                {exporting === "pdf" ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <FileText className="h-2.5 w-2.5" />}PDF
              </Button>
              <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending} variant="outline" size="sm" className="gap-1 border-slate-200 text-slate-600 h-6 text-[10px] px-1.5">
                {generateMutation.isPending ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <RefreshCw className="h-2.5 w-2.5" />}{config ? "Refresh" : "Generate"}
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto px-4 py-4 max-w-[1600px]">
        {!config && !loadingDashboard && (
          <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-md border-slate-200 shadow-sm bg-white">
              <CardContent className="p-10 text-center">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center mx-auto mb-5 ring-1 ring-slate-200">
                  <LayoutDashboard className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-1.5">Executive Dashboard</h3>
                <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto leading-relaxed">
                  Generate a comprehensive AI-powered dashboard with KPIs, data quality scoring, feature importance, outlier detection, correlations, ML metrics, predictions, and narrative insights
                </p>
                <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending} size="default" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
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
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 animate-pulse opacity-30" />
                <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></div>
              </div>
              <p className="text-sm font-semibold text-slate-700">Building Your Executive Dashboard</p>
              <p className="text-xs text-slate-400 mt-1">Computing data quality, distributions, correlations, ML insights, and narrative story</p>
            </div>
          </div>
        )}

        {config && (
          <div ref={dashboardRef} className="space-y-4">

            <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white shadow-sm">
              {ds && (<>
                <div className="flex items-center gap-1 text-[10px] text-slate-500"><Database className="h-3 w-3 text-slate-400" /><span className="font-medium text-slate-700">{ds.records?.toLocaleString() || "—"}</span> records</div>
                <div className="w-px h-3 bg-slate-200" />
                <div className="flex items-center gap-1 text-[10px] text-slate-500"><Table className="h-3 w-3 text-slate-400" /><span className="font-medium text-slate-700">{ds.columns || "—"}</span> cols</div>
                <div className="w-px h-3 bg-slate-200" />
                <div className="flex items-center gap-1 text-[10px] text-slate-500"><Hash className="h-3 w-3 text-blue-400" /><span className="font-medium text-blue-600">{ds.numeric || 0}</span> num</div>
                <div className="w-px h-3 bg-slate-200" />
                <div className="flex items-center gap-1 text-[10px] text-slate-500"><List className="h-3 w-3 text-amber-400" /><span className="font-medium text-amber-600">{ds.categorical || 0}</span> cat</div>
                <div className="w-px h-3 bg-slate-200" />
                <div className="flex items-center gap-1 text-[10px] text-slate-500"><CalendarDays className="h-3 w-3 text-emerald-400" /><span className="font-medium text-emerald-600">{ds.dates || 0}</span> dates</div>
                <div className="w-px h-3 bg-slate-200" />
                <div className="flex items-center gap-1 text-[10px] text-slate-500"><AlertTriangle className={`h-3 w-3 ${(ds.missing_pct || 0) > 5 ? "text-red-400" : "text-emerald-400"}`} /><span className={`font-medium ${(ds.missing_pct || 0) > 5 ? "text-red-600" : "text-emerald-600"}`}>{ds.missing_pct || 0}%</span> missing</div>
                {ds.duplicate_pct > 0 && (<><div className="w-px h-3 bg-slate-200" /><div className="flex items-center gap-1 text-[10px] text-slate-500"><Copy className={`h-3 w-3 ${ds.duplicate_pct > 2 ? "text-orange-400" : "text-slate-400"}`} /><span className={`font-medium ${ds.duplicate_pct > 2 ? "text-orange-600" : "text-slate-500"}`}>{ds.duplicate_pct}%</span> dupes</div></>)}
                {ds.data_quality_score != null && (<><div className="w-px h-3 bg-slate-200" /><div className="flex items-center gap-1 text-[10px] text-slate-500"><Shield className="h-3 w-3 text-emerald-400" /><span className="font-medium text-emerald-600">{ds.data_quality_score}/100</span> DQ</div></>)}
                <div className="flex-1" />
                <div className="flex items-center gap-1 text-[10px] text-slate-400"><CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" /><span>{totalCharts} charts · {totalKpis} KPIs</span></div>
              </>)}
            </div>

            {config.kpis && config.kpis.length > 0 && (
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
                {config.kpis.map((kpi, i) => {
                  const Icon = iconMap[kpi.icon] || BarChart3;
                  const colorIdx = typeof kpi.color === "number" ? kpi.color % PBI_COLORS.length : 0;
                  const cs = PBI_COLORS[colorIdx];
                  const t = kpi.trend;
                  const hs = kpi.sparkline && kpi.sparkline.length > 0;
                  const extra = kpi.extra;
                  return (
                    <div key={i} className="relative rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md transition-all duration-200 cursor-default group">
                      <div className="flex items-start justify-between mb-1.5">
                        <div className={`h-6 w-6 rounded-lg bg-gradient-to-br ${cs.bg} flex items-center justify-center shadow-sm`}><Icon className="h-3 w-3 text-white" /></div>
                        {t && (
                          <div className={`flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[8px] font-medium ${t.direction === "up" ? "bg-emerald-50 text-emerald-600" : t.direction === "down" ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-500"}`}>
                            {t.direction === "up" ? <TrendingUp className="h-2 w-2" /> : t.direction === "down" ? <TrendingDown className="h-2 w-2" /> : null}
                            <span>{t.label}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-[9px] font-medium text-slate-500 truncate">{kpi.name}</p>
                      <p className="text-base font-bold text-slate-800 mt-px">{kpi.value}</p>
                      {hs && (
                        <div className="h-6 mt-0.5 -mx-0.5 -mb-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <Plot data={kpi.sparkline as any[]} layout={{ autosize: true, margin: { t: 0, b: 0, l: 0, r: 0 }, paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)", xaxis: { visible: false }, yaxis: { visible: false }, height: 24 }} config={{ displayModeBar: false, staticPlot: true }} className="w-full" />
                        </div>
                      )}
                      {extra && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {extra.completeness != null && <span className="text-[7px] text-slate-400 bg-slate-50 px-1 rounded">C:{extra.completeness}%</span>}
                          {extra.consistency != null && <span className="text-[7px] text-slate-400 bg-slate-50 px-1 rounded">Co:{extra.consistency}%</span>}
                          {extra.validity != null && <span className="text-[7px] text-slate-400 bg-slate-50 px-1 rounded">V:{extra.validity}%</span>}
                        </div>
                      )}
                      <div className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl bg-gradient-to-r ${cs.bg} opacity-60`} />
                    </div>
                  );
                })}
              </div>
            )}

            {config.data_quality && (
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-slate-100">
                  <Shield className="h-4 w-4 text-emerald-500" />
                  <h2 className="text-sm font-semibold text-slate-800">Data Quality Dashboard</h2>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-emerald-200 text-emerald-600 bg-emerald-50 font-medium ml-1">{config.data_quality.overall}/100</Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 p-4">
                  {[
                    { label: "Completeness", value: config.data_quality.completeness, color: "#2563EB" },
                    { label: "Consistency", value: config.data_quality.consistency, color: "#10B981" },
                    { label: "Uniqueness", value: config.data_quality.uniqueness, color: "#F59E0B" },
                    { label: "Validity", value: config.data_quality.validity, color: "#8B5CF6" },
                    { label: "Accuracy", value: config.data_quality.accuracy, color: "#EC4899" },
                  ].map((m) => (
                    <div key={m.label} className="text-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="relative h-16 w-16 mx-auto mb-2">
                        <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#E2E8F0" strokeWidth="3" />
                          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={m.color} strokeWidth="3" strokeDasharray={`${m.value}, 100`} strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center"><span className="text-sm font-bold text-slate-700">{m.value}%</span></div>
                      </div>
                      <p className="text-[10px] font-medium text-slate-500">{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {config.ai_insights && config.ai_insights.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-slate-100">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <h2 className="text-sm font-semibold text-slate-800">AI Insights</h2>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-amber-200 text-amber-600 bg-amber-50 font-medium ml-1">{config.ai_insights.length}</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-4">
                  {config.ai_insights.map((insight, i) => <InsightCard key={i} insight={insight} />)}
                </div>
              </div>
            )}

            {config.detective_issues && config.detective_issues.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-slate-100">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <h2 className="text-sm font-semibold text-slate-800">AI Data Detective</h2>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-red-200 text-red-600 bg-red-50 font-medium ml-1">{config.detective_issues.length} issues</Badge>
                </div>
                <div className="divide-y divide-slate-100">
                  {config.detective_issues.map((issue, i) => (
                    <div key={i} className="flex items-start justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <SeverityBadge severity={issue.severity} />
                          <span className="text-xs font-semibold text-slate-700">{issue.column}</span>
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">{issue.type}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">{issue.count} of {issue.total} values ({issue.pct}%)</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 italic">{issue.suggested_fix}</p>
                      </div>
                      <div className="shrink-0 ml-3 text-right">
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          <Activity className="h-2.5 w-2.5" /> {issue.confidence}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {config.recommendations && config.recommendations.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-slate-100">
                  <ListChecks className="h-4 w-4 text-violet-500" />
                  <h2 className="text-sm font-semibold text-slate-800">AI Recommendations</h2>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-violet-200 text-violet-600 bg-violet-50 font-medium ml-1">{config.recommendations.length}</Badge>
                </div>
                <div className="divide-y divide-slate-100">
                  {config.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                      <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${rec.impact === "high" ? "bg-emerald-100 text-emerald-600" : rec.impact === "medium" ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"}`}>
                        <CheckCircle2 className="h-3 w-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-medium text-slate-800">{rec.action}</span>
                          <Badge variant="outline" className={`text-[8px] px-1 py-0 h-3 font-medium ${rec.impact === "high" ? "border-emerald-200 text-emerald-600 bg-emerald-50" : rec.impact === "medium" ? "border-amber-200 text-amber-600 bg-amber-50" : "border-blue-200 text-blue-600 bg-blue-50"}`}>{rec.impact}</Badge>
                          <span className="text-[8px] text-slate-400 bg-slate-100 px-1 py-0.5 rounded">{rec.category}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">{rec.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {config.story_segments && config.story_segments.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-slate-100">
                  <BookOpen className="h-4 w-4 text-indigo-500" />
                  <h2 className="text-sm font-semibold text-slate-800">Data Story</h2>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-indigo-200 text-indigo-600 bg-indigo-50 font-medium ml-1">{config.story_segments.length} chapters</Badge>
                </div>
                <div className="p-4 space-y-3">
                  {config.story_segments.map((seg, i) => (
                    <div key={i} className="relative pl-5 border-l-2 border-indigo-200 pb-1 last:pb-0">
                      <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-[7px] text-white font-bold shadow-sm">{i + 1}</div>
                      <p className="text-[11px] font-semibold text-indigo-700 mb-0.5">{seg.chapter}</p>
                      <p className="text-[11px] text-slate-600 leading-relaxed">{seg.narrative}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {config.feature_importance && config.feature_importance.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-slate-100">
                  <Activity className="h-4 w-4 text-blue-500" />
                  <h2 className="text-sm font-semibold text-slate-800">Feature Importance</h2>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-blue-200 text-blue-600 bg-blue-50 font-medium ml-1">{config.feature_importance.length}</Badge>
                </div>
                <div className="p-4">
                  <div className="space-y-1.5">
                    {config.feature_importance.slice(0, 10).map((fi, i) => {
                      const pct = fi.importance * 100;
                      const sel = selectedFeature === fi.feature;
                      return (
                        <div key={fi.feature}>
                          <div className={`flex items-center gap-2 px-2 py-1 rounded-lg cursor-pointer transition-all ${sel ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-slate-50"}`}
                            onClick={() => setSelectedFeature(sel ? null : fi.feature)}>
                            <span className="text-[10px] font-mono text-slate-400 w-5">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[11px] font-medium text-slate-700 truncate">{fi.feature}</span>
                                <span className="text-[10px] font-mono font-semibold text-slate-500">{pct.toFixed(1)}%</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-500 ${fi.direction === "pos" ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : "bg-gradient-to-r from-red-400 to-red-500"}`}
                                  style={{ width: `${Math.max(pct, 2)}%` }} />
                              </div>
                            </div>
                            <div className={`h-5 w-5 rounded flex items-center justify-center text-[8px] font-bold ${fi.direction === "pos" ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}>
                              {fi.direction === "pos" ? "+" : "-"}
                            </div>
                          </div>
                          {sel && (
                            <div className="mx-2 mb-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 text-[10px] text-slate-600 leading-relaxed animate-fadeIn">
                              <span className="font-semibold text-blue-700">{fi.feature}</span> contributes <span className="font-semibold">{pct.toFixed(1)}%</span> to predictive power.
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

            {config.insights && config.insights.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 p-3 shadow-sm">
                <div className="flex items-start gap-2">
                  <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 mt-0.5 shadow-sm"><Lightbulb className="h-3 w-3 text-white" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-amber-800 mb-1">Key Insights <span className="font-normal text-amber-500">({config.insights.length})</span></p>
                    <div className="space-y-0.5">{config.insights.map((ins, i) => (<p key={i} className="text-[10px] text-amber-700 leading-relaxed flex items-start gap-1"><span className="font-bold text-amber-500 mt-px shrink-0">◆</span><span>{ins}</span></p>))}</div>
                  </div>
                </div>
              </div>
            )}

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
                <div key={section.title} className="space-y-2">
                  <div className="flex items-center gap-2 px-0.5">
                    <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shadow-sm">
                      <SectionIcon className="h-3 w-3 text-slate-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h2 className="text-xs font-semibold text-slate-800">{section.title}</h2>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-slate-200 text-slate-500 bg-slate-50 font-medium">{secCharts.length}</Badge>
                      </div>
                      {section.description && <p className="text-[9px] text-slate-400 mt-px">{section.description}</p>}
                    </div>
                  </div>
                  <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
                    {secCharts.map((chart: any, ci: number) => {
                      const ct = chartTypeBadge[chart.type] || { label: chart.type, color: "bg-slate-100 text-slate-700 border-slate-200" };
                      return (
                        <Card key={ci} className="border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 bg-white overflow-hidden">
                          <div className="flex items-center justify-between px-3 pt-2 pb-1 border-b border-slate-50">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={`inline-flex items-center px-1 py-0.5 rounded text-[8px] font-medium border uppercase tracking-wider ${ct.color}`}>{ct.label}</span>
                              <h3 className="text-[11px] font-semibold text-slate-700 truncate">{chart.title}</h3>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-1.5">
                              {chart.x && <span className="text-[8px] text-slate-400 bg-slate-50 px-1 py-0.5 rounded border border-slate-100 font-mono">{chart.x}</span>}
                              {chart.y && <span className="text-[8px] text-slate-400 bg-slate-50 px-1 py-0.5 rounded border border-slate-100 font-mono">{chart.y}</span>}
                            </div>
                          </div>
                          <CardContent className="p-1">
                            {chart.plotly ? (
                              <Plot
                                data={chart.plotly.data}
                                layout={{ ...chart.plotly.layout, height: 320, margin: chart.plotly.layout?.margin || { t: 40, b: 55, l: 60, r: 18 } }}
                                config={{ responsive: true, displayModeBar: false, scrollZoom: false }}
                                className="w-full" useResizeHandler
                              />
                            ) : (
                              <div className="h-[320px] flex items-center justify-center bg-slate-50 rounded-lg border border-slate-100">
                                <div className="text-center"><BarChart3 className="h-8 w-8 text-slate-300 mx-auto mb-2" /><p className="text-xs text-slate-400 font-medium">{chart.type}: {chart.title}</p></div>
                              </div>
                            )}
                          </CardContent>
                          {chart.description && (
                            <div className="px-3 pb-2 pt-0.5"><p className="text-[9px] text-slate-500 leading-relaxed">{chart.description}</p></div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {config.filters && config.filters.length > 0 && (
              <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="pb-1.5 pt-2.5 px-3">
                  <div className="flex items-center gap-1.5">
                    <Filter className="h-3 w-3 text-slate-400" />
                    <CardTitle className="text-[11px] font-semibold text-slate-700">Cross-Filtering</CardTitle>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-slate-200 text-slate-500 bg-slate-50 font-medium ml-0.5">{config.filters.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-3 pb-2.5">
                  <div className="flex flex-wrap gap-1">
                    {config.filters.map((f, i) => {
                      const active = activeFilters[f.column] && activeFilters[f.column].length > 0;
                      return (
                        <Badge key={i} variant="outline"
                          className={`text-[9px] px-1.5 py-0.5 font-medium cursor-pointer transition-all ${active ? "bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-200" : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"}`}
                          onClick={() => setActiveFilters(p => { const n = { ...p }; if (active) delete n[f.column]; else n[f.column] = ["filtered"]; return n; })}>
                          <Filter className={`h-2 w-2 mr-0.5 ${active ? "text-blue-500" : "text-slate-400"}`} />
                          {f.column}
                          <span className="ml-0.5 font-normal text-slate-400">({f.type})</span>
                        </Badge>
                      );
                    })}
                  </div>
                  {Object.keys(activeFilters).length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setActiveFilters({})} className="mt-1.5 text-[9px] h-4 px-1.5 text-slate-400 hover:text-slate-600">Clear all filters</Button>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex items-center justify-between text-[8px] text-slate-400 pb-3 pt-1 border-t border-slate-100">
              <span>Executive Dashboard · {totalCharts} charts · {totalKpis} KPIs · {sections.length} sections{config.data_quality ? ` · DQ: ${config.data_quality.overall}/100` : ""}{config.ai_health_score != null ? ` · Health: ${config.ai_health_score}/100` : ""}</span>
              <span>AI-powered · Generated {new Date().toLocaleDateString()}</span>
            </div>
          </div>
        )}

        {generateMutation.isError && (
          <Card className="mt-4 border-red-200 bg-red-50 shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <div className="h-4 w-4 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5"><span className="text-[8px] font-bold text-red-600">!</span></div>
                <p className="text-xs text-red-700">Error: {generateMutation.error instanceof Error ? generateMutation.error.message : "Failed to generate dashboard."}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <style jsx global>{`
        @media print { body { background: white !important; } .print\\:hidden { display: none !important; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
      `}</style>
    </div>
  );
}
