"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileSpreadsheet, Brain, BarChart3,
  MessageCircle, CheckCircle2, Loader2, Database, Cpu,
  Sparkles,
} from "lucide-react";

interface PipelineStep {
  id: string;
  icon: React.ReactNode;
  label: string;
  detail: string;
  duration: number;
}

const pipeline: PipelineStep[] = [
  { id: "upload", icon: <Upload className="h-4 w-4" />, label: "sales.xlsx", detail: "52,341 rows \u00b7 24 columns", duration: 1800 },
  { id: "understand", icon: <Brain className="h-4 w-4" />, label: "Understanding Dataset...", detail: "Detecting types, patterns, anomalies", duration: 1800 },
  { id: "clean", icon: <Database className="h-4 w-4" />, label: "Cleaning...", detail: "342 nulls filled \u00b7 12 duplicates removed", duration: 1800 },
  { id: "eda", icon: <BarChart3 className="h-4 w-4" />, label: "EDA...", detail: "Distributions, correlations, outliers mapped", duration: 1800 },
  { id: "ml", icon: <Cpu className="h-4 w-4" />, label: "Training XGBoost...", detail: "Accuracy: 94.2% \u00b7 F1: 0.93", duration: 1800 },
  { id: "dashboard", icon: <Sparkles className="h-4 w-4" />, label: "Building Dashboard...", detail: "8 charts \u00b7 6 KPIs \u00b7 AI Insights", duration: 1800 },
];

const dashboardMetrics = [
  { label: "Revenue", value: "$2.4M", change: "-12%", down: true },
  { label: "Users", value: "18.2K", change: "+24%", down: false },
  { label: "Conversion", value: "3.8%", change: "+0.6%", down: false },
];

function PipelinePanel({ currentStep, completedSteps }: { currentStep: number; completedSteps: number[] }) {
  return (
    <div className="border-r border-[#27272A] p-4 space-y-1">
      <div className="flex items-center gap-2 mb-3">
        <FileSpreadsheet className="h-3.5 w-3.5 text-[#6366F1]" />
        <span className="text-[11px] font-semibold text-[#F8FAFC]">AI Pipeline</span>
      </div>
      {pipeline.map((step, i) => {
        const isCompleted = completedSteps.includes(i);
        const isCurrent = currentStep === i;
        return (
          <div key={step.id} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-300 ${isCurrent ? "bg-[#4F46E5]/10 border border-[#4F46E5]/20" : isCompleted ? "bg-[#22C55E]/5" : "opacity-40"}`}>
            <div className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 ${isCompleted ? "bg-[#22C55E]/20 text-[#22C55E]" : isCurrent ? "bg-[#4F46E5]/20 text-[#6366F1]" : "bg-[#27272A] text-[#A1A1AA]"}`}>
              {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : isCurrent ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : step.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-[11px] font-medium truncate ${isCurrent ? "text-[#F8FAFC]" : "text-[#A1A1AA]"}`}>{step.label}</p>
              {(isCompleted || isCurrent) && <p className="text-[9px] text-[#A1A1AA]/60 truncate">{step.detail}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProcessingView({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[360px]">
      <div className="relative mb-6">
        <div className="h-16 w-16 rounded-2xl bg-[#4F46E5]/10 flex items-center justify-center">
          <Brain className="h-8 w-8 text-[#6366F1] animate-pulse" />
        </div>
        <div className="absolute -inset-4 bg-[#4F46E5]/10 rounded-3xl blur-xl animate-pulse" />
      </div>
      <p className="text-sm font-medium text-[#F8FAFC] mb-1">
        {currentStep < pipeline.length ? pipeline[currentStep].label : "Finalizing..."}
      </p>
      <p className="text-xs text-[#A1A1AA]">
        {currentStep < pipeline.length ? pipeline[currentStep].detail : "Preparing your dashboard"}
      </p>
      <div className="w-full max-w-[300px] mt-6 space-y-2">
        {pipeline.slice(0, Math.min(currentStep + 1, pipeline.length)).map((step, i) => (
          <div key={step.id} className="flex items-center gap-2">
            <span className="text-[9px] text-[#A1A1AA] w-14 text-right shrink-0">{step.label.split(" ")[0]}</span>
            <div className="flex-1 h-1 rounded-full bg-[#27272A] overflow-hidden">
              <motion.div initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 1.5, ease: "easeOut" }} className={`h-full rounded-full ${i < currentStep ? "bg-[#22C55E]" : "bg-[#6366F1]"}`} />
            </div>
            {i < currentStep && <CheckCircle2 className="h-3 w-3 text-[#22C55E] shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardView() {
  const bars = useMemo(() => Array.from({ length: 24 }, (_, i) => 20 + Math.sin(i * 0.5) * 30 + Math.random() * 20), []);
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="h-4 w-4 text-[#6366F1]" />
        <span className="text-xs font-semibold text-[#F8FAFC]">Executive Dashboard</span>
        <span className="text-[9px] text-[#22C55E] bg-[#22C55E]/10 px-1.5 py-0.5 rounded-full">Live</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {dashboardMetrics.map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="p-3 rounded-xl bg-[#18181B] border border-[#27272A]">
            <p className="text-[10px] text-[#A1A1AA] mb-0.5">{m.label}</p>
            <p className="text-lg font-bold text-[#F8FAFC]">{m.value}</p>
            <p className={`text-[10px] font-medium ${m.down ? "text-[#EF4444]" : "text-[#22C55E]"}`}>{m.change}</p>
          </motion.div>
        ))}
      </div>
      <div className="h-32 rounded-xl bg-[#18181B] border border-[#27272A] p-3 flex items-end gap-1">
        {bars.map((h, i) => (
          <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ duration: 0.4, delay: i * 0.03 }} className="flex-1 rounded-t-sm bg-[#4F46E5]/60 hover:bg-[#6366F1] transition-colors" />
        ))}
      </div>
    </motion.div>
  );
}

function ChatView() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center h-full min-h-[360px]">
      <div className="w-full max-w-[400px] space-y-3">
        <div className="flex items-start gap-2">
          <div className="h-6 w-6 rounded-full bg-[#4F46E5]/20 flex items-center justify-center shrink-0"><Sparkles className="h-3 w-3 text-[#6366F1]" /></div>
          <div className="bg-[#18181B] border border-[#27272A] rounded-xl rounded-tl-sm px-3 py-2">
            <p className="text-[11px] text-[#A1A1AA]">Revenue declined 12% QoQ primarily due to seasonal patterns in the retail segment. Would you like me to build a forecast model?</p>
          </div>
        </div>
        <div className="flex items-start gap-2 flex-row-reverse">
          <div className="h-6 w-6 rounded-full bg-[#22C55E]/20 flex items-center justify-center shrink-0"><span className="text-[8px] font-bold text-[#22C55E]">You</span></div>
          <div className="bg-[#4F46E5]/10 border border-[#4F46E5]/20 rounded-xl rounded-tr-sm px-3 py-2">
            <p className="text-[11px] text-[#F8FAFC]">Yes, show me the forecast for next quarter</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="h-6 w-6 rounded-full bg-[#4F46E5]/20 flex items-center justify-center shrink-0"><Sparkles className="h-3 w-3 text-[#6366F1]" /></div>
          <div className="bg-[#18181B] border border-[#27272A] rounded-xl rounded-tl-sm px-3 py-2">
            <p className="text-[11px] text-[#A1A1AA]">Based on historical trends and seasonality, Q3 revenue is projected at $2.7M (+12.5%). Here&apos;s your forecast dashboard...</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-[#18181B] border border-[#27272A] rounded-full">
          <MessageCircle className="h-3 w-3 text-[#A1A1AA]" />
          <span className="text-[10px] text-[#A1A1AA]/50">Ask anything about your data...</span>
        </div>
      </div>
    </motion.div>
  );
}

export function WorkspacePreview() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = () => { setCurrentStep(0); setCompletedSteps([]); setShowDashboard(false); setShowChat(false); };

  useEffect(() => {
    if (showChat) { timerRef.current = setTimeout(reset, 4000); return () => { if (timerRef.current) clearTimeout(timerRef.current); }; }
  }, [showChat]);

  useEffect(() => {
    if (currentStep >= pipeline.length) { timerRef.current = setTimeout(() => setShowDashboard(true), 500); return () => { if (timerRef.current) clearTimeout(timerRef.current); }; }
    timerRef.current = setTimeout(() => { setCompletedSteps((prev) => [...prev, currentStep]); setCurrentStep((prev) => prev + 1); }, pipeline[currentStep].duration);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [currentStep, showDashboard]);

  useEffect(() => {
    if (showDashboard) { timerRef.current = setTimeout(() => setShowChat(true), 2500); return () => { if (timerRef.current) clearTimeout(timerRef.current); }; }
  }, [showDashboard]);

  return (
    <div className="relative rounded-2xl border border-[#27272A] bg-[#111827] overflow-hidden shadow-2xl shadow-black/40">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#27272A]">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-[#EF4444]/60" />
          <div className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]/60" />
          <div className="h-2.5 w-2.5 rounded-full bg-[#22C55E]/60" />
        </div>
        <div className="flex-1 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#18181B] border border-[#27272A]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E] animate-pulse" />
            <span className="text-[10px] text-[#A1A1AA] font-medium">Datanex AI \u2014 Workspace</span>
          </div>
        </div>
        <div className="w-[52px]" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] min-h-[420px]">
        <PipelinePanel currentStep={currentStep} completedSteps={completedSteps} />
        <div className="p-4">
          <AnimatePresence mode="wait">
            {!showDashboard && <ProcessingView key="processing" currentStep={currentStep} />}
            {showDashboard && !showChat && <DashboardView key="dashboard" />}
            {showChat && <ChatView key="chat" />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
