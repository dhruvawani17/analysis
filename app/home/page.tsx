"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import {
  Upload,
  Sparkles,
  BarChart3,
  Bot,
  ArrowRight,
  FileUp,
  Loader2,
  FileSpreadsheet,
  FileJson,
  FileCode,
  Plus,
  BrainCircuit,
  Lightbulb,
  CheckCircle2,
  MessageSquare,
  Send,
  LineChart,
  Database,
  Shield,
  TrendingUp,
  LayoutDashboard,
} from "lucide-react";

const recentProjects = [
  { name: "Sales Dashboard", file: "sales_data.xlsx", icon: FileSpreadsheet, color: "#4F46E5", updated: "2h ago", rows: "52.4K", cols: "24", visuals: "8" },
  { name: "Customer Churn Analysis", file: "churn_data.csv", icon: Database, color: "#10B981", updated: "1d ago", rows: "18.6K", cols: "32", visuals: "6" },
  { name: "Revenue Forecasting", file: "revenue_forecast.xlsx", icon: TrendingUp, color: "#F59E0B", updated: "3d ago", rows: "120K", cols: "18", visuals: "1" },
  { name: "Marketing Campaign ROI", file: "marketing_roi.csv", icon: BarChart3, color: "#6366F1", updated: "5d ago", rows: "32.1K", cols: "21", visuals: "12" },
  { name: "Inventory Analysis", file: "inventory_data.xlsx", icon: LayoutDashboard, color: "#8B5CF6", updated: "1w ago", rows: "8.7K", cols: "15", visuals: "5" },
];

const copilotQuestions = [
  "Why did sales decrease in the last quarter?",
  "Which product is most profitable?",
  "Forecast revenue for next 6 months",
  "Show me top 5 customers by revenue",
];

export default function HomePage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [copilotInput, setCopilotInput] = useState("");

  const { data: datasets } = useQuery({
    queryKey: ["datasets"],
    queryFn: api.datasets.list,
  });

  const uploadMutation = useMutation({
    mutationFn: api.datasets.upload,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
      router.push(`/datasets/${result.id}`);
    },
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "text/csv": [".csv"],
      "application/json": [".json"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    maxFiles: 1,
    onDrop: async (files) => {
      if (files[0]) {
        setUploading(true);
        try { await uploadMutation.mutateAsync(files[0]); } finally { setUploading(false); }
      }
    },
  });

  function handleCopilotSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!copilotInput.trim()) return;
    router.push(`/home/copilot?q=${encodeURIComponent(copilotInput.trim())}`);
    setCopilotInput("");
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      {/* Hero */}
      <div className="relative rounded-2xl border border-[#1C1E2E] bg-gradient-to-br from-[#12141F] to-[#0B0D17] overflow-hidden">
        <div className="relative z-10 p-8 pb-6 flex items-start gap-8">
          <div className="flex-1">
            <h1 className="text-[28px] font-bold text-[#F0F0F5] leading-tight mb-1" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>
              Your AI Data Analyst
            </h1>
            <h2 className="text-[28px] font-bold leading-tight mb-4" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>
              <span className="text-[#F0F0F5]">From Data to </span>
              <span className="text-[#6366F1]">Decisions.</span>
            </h2>
            <p className="text-[14px] text-[#6B7280] max-w-[420px] leading-relaxed mb-6">
              Upload your data, ask questions in natural language, and get instant insights, visualizations, and predictions.
            </p>
            <div className="flex items-center gap-3 mb-5">
              <button
                onClick={() => document.getElementById("file-upload")?.click()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-[13px] font-semibold transition-all hover:shadow-lg hover:shadow-[#4F46E5]/20"
                style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}
              >
                <Upload className="w-4 h-4" />
                Upload Dataset
              </button>
              <Link
                href="/home/copilot"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#27272a] bg-[#18181b]/50 hover:bg-[#1C1E2E] text-[#D1D5DB] text-[13px] font-semibold transition-all"
                style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}
              >
                <Sparkles className="w-4 h-4 text-[#6366F1]" />
                Ask AI Copilot
              </Link>
            </div>
            <input id="file-upload" {...getInputProps()} className="hidden" />
            <div className="flex items-center gap-2 text-[12px] text-[#6B7280]">
              <span>Supports:</span>
              {[
                { label: "CSV", icon: FileCode },
                { label: "Excel", icon: FileSpreadsheet },
                { label: "SQL", icon: Database },
                { label: "JSON", icon: FileJson },
                { label: "+ More", icon: null },
              ].map((f) => (
                <span key={f.label} className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[#1C1E2E] text-[#6B7280]">
                  {f.icon && <f.icon className="w-3 h-3" />}
                  {f.label}
                </span>
              ))}
            </div>
          </div>

          {/* Hero illustration */}
          <div className="hidden lg:block w-[280px] h-[200px] relative">
            <div className="absolute inset-0 bg-[#4F46E5]/5 rounded-2xl border border-[#4F46E5]/10" />
            <div className="absolute top-4 left-4 right-4 bottom-4 flex items-center justify-center">
              <div className="grid grid-cols-3 gap-2 w-full">
                <div className="col-span-2 h-20 rounded-lg bg-[#1C1E2E] border border-[#2a2d3e] flex items-center justify-center">
                  <BarChart3 className="w-10 h-10 text-[#4F46E5]/40" />
                </div>
                <div className="h-20 rounded-lg bg-[#1C1E2E] border border-[#2a2d3e] flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full border-[3px] border-[#6366F1]/30 border-t-[#6366F1]" />
                </div>
                <div className="h-16 rounded-lg bg-[#1C1E2E] border border-[#2a2d3e] flex items-end p-2 gap-1">
                  {[40, 65, 50, 80, 60, 90, 70].map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm bg-[#4F46E5]/30" style={{ height: `${h}%` }} />
                  ))}
                </div>
                <div className="col-span-2 h-16 rounded-lg bg-[#1C1E2E] border border-[#2a2d3e] flex items-center justify-center">
                  <Bot className="w-8 h-8 text-[#6366F1]/40" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload overlay */}
      {isDragActive && (
        <div className="fixed inset-0 z-50 bg-[#08090D]/80 backdrop-blur-sm flex items-center justify-center" {...getRootProps()}>
          <input {...getInputProps()} />
          <div className="text-center">
            <FileUp className="w-12 h-12 text-[#4F46E5] mx-auto mb-3 animate-bounce" />
            <p className="text-lg font-semibold text-[#F0F0F5]" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>Drop your file here</p>
          </div>
        </div>
      )}
      {uploading && (
        <div className="fixed inset-0 z-50 bg-[#08090D]/80 backdrop-blur-sm flex items-center justify-center">
          <div className="flex items-center gap-3 px-6 py-4 rounded-xl bg-[#12141F] border border-[#1C1E2E]">
            <Loader2 className="w-5 h-5 text-[#4F46E5] animate-spin" />
            <span className="text-sm text-[#D1D5DB]" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>Uploading and analyzing...</span>
          </div>
        </div>
      )}

      {/* Recent Projects */}
      {datasets && datasets.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-bold text-[#F0F0F5]" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>Recent Projects</h3>
            <Link href="/home/projects" className="text-[13px] font-medium text-[#6366F1] hover:text-[#818CF8] transition-colors flex items-center gap-1"
              style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>
              View all projects <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {datasets.slice(0, 5).map((d) => (
              <Link key={d.id} href={`/datasets/${d.id}`}>
                <div className="group p-4 rounded-xl border border-[#1C1E2E] bg-[#12141F] hover:border-[#2a2d3e] hover:bg-[#161827] transition-all cursor-pointer">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${recentProjects[0].color}15` }}>
                      <Database className="w-4 h-4" style={{ color: recentProjects[0].color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#F0F0F5] truncate">{d.name}</p>
                      <p className="text-[11px] text-[#6B7280] truncate">{d.name.toLowerCase().replace(/\s+/g, "_")}.csv</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#6B7280] mb-3">Updated recently</p>
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <p className="text-[13px] font-bold text-[#F0F0F5]">{d.rows?.toLocaleString() ?? "?"}</p>
                      <p className="text-[10px] text-[#6B7280]">Rows</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[13px] font-bold text-[#F0F0F5]">{d.columns}</p>
                      <p className="text-[10px] text-[#6B7280]">Columns</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[13px] font-bold text-[#F0F0F5]">3</p>
                      <p className="text-[10px] text-[#6B7280]">Visuals</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Bottom section: 3 Steps + AI Copilot */}
      <div className="grid grid-cols-[1fr_340px] gap-4">
        {/* Get Started */}
        <div className="rounded-xl border border-[#1C1E2E] bg-[#12141F] p-5">
          <h3 className="text-[15px] font-bold text-[#F0F0F5] mb-4" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>Get Started in 3 Simple Steps</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { step: "1", title: "Upload Data", desc: "Upload your dataset in CSV, Excel, SQL or connect your database.", icon: Upload, color: "#4F46E5" },
              { step: "2", title: "Ask Questions", desc: "Ask questions in natural language or use AI recommendations.", icon: MessageSquare, color: "#10B981" },
              { step: "3", title: "Get Insights", desc: "Receive AI-powered insights, visualizations, and reports.", icon: Lightbulb, color: "#F59E0B" },
            ].map((s, i) => (
              <div key={s.step} className="relative">
                <div className="p-4 rounded-xl bg-[#0B0D17] border border-[#1C1E2E]">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${s.color}15` }}>
                    <s.icon className="w-5 h-5" style={{ color: s.color }} />
                  </div>
                  <p className="text-[12px] font-bold text-[#6B7280] mb-0.5" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>
                    {s.step}. {s.title}
                  </p>
                  <p className="text-[12px] text-[#6B7280] leading-relaxed">{s.desc}</p>
                </div>
                {i < 2 && (
                  <div className="absolute top-1/2 -right-2 z-10 text-[#2a2d3e]">
                    <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6h8m0 0L7 3m3 3L7 9" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-[12px] text-[#6B7280] mt-4">
            Not sure where to start? Try our{" "}
            <Link href="/home/copilot" className="text-[#6366F1] font-medium hover:text-[#818CF8] transition-colors">sample dataset →</Link>
          </p>
        </div>

        {/* AI Copilot Panel */}
        <div className="rounded-xl border border-[#1C1E2E] bg-[#12141F] p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-bold text-[#F0F0F5]" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>AI Copilot – Ask Anything</h3>
            <Link href="/home/copilot" className="text-[12px] text-[#6B7280] hover:text-[#D1D5DB] flex items-center gap-1 transition-colors"
              style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>
              New Chat <Sparkles className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex-1 space-y-1.5 mb-4">
            {copilotQuestions.map((q) => (
              <Link
                key={q}
                href={`/home/copilot?q=${encodeURIComponent(q)}`}
                className="w-full text-left px-3 py-2.5 rounded-lg bg-[#0B0D17] border border-[#1C1E2E] hover:border-[#4F46E5]/30 hover:bg-[#4F46E5]/5 transition-all group block"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#6366F1] flex-shrink-0" />
                  <span className="text-[12px] text-[#D1D5DB] flex-1">{q}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#6B7280] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
          </div>
          <form onSubmit={handleCopilotSubmit} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0B0D17] border border-[#1C1E2E]">
            <input
              value={copilotInput}
              onChange={(e) => setCopilotInput(e.target.value)}
              placeholder="Ask anything about your data..."
              className="flex-1 bg-transparent text-[12px] text-[#D1D5DB] placeholder-[#4B5563] outline-none"
              style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}
            />
            <button type="submit" disabled={!copilotInput.trim()} className="w-7 h-7 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] flex items-center justify-center transition-colors disabled:opacity-30">
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </form>
        </div>
      </div>

      {/* Bottom feature bar */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: BrainCircuit, title: "AI-Powered Insights", desc: "Get intelligent insights automatically", color: "#4F46E5" },
          { icon: TrendingUp, title: "Advanced Analytics", desc: "ML models, forecasting & more", color: "#10B981" },
          { icon: BarChart3, title: "Beautiful Visualizations", desc: "Stunning charts & dashboards", color: "#8B5CF6" },
          { icon: Shield, title: "Secure & Reliable", desc: "Enterprise-grade security", color: "#F59E0B" },
        ].map((f) => (
          <div key={f.title} className="flex items-center gap-3 p-4 rounded-xl border border-[#1C1E2E] bg-[#12141F]">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${f.color}15` }}>
              <f.icon className="w-5 h-5" style={{ color: f.color }} />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[#F0F0F5]" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>{f.title}</p>
              <p className="text-[11px] text-[#6B7280]">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
