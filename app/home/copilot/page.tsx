"use client";

import { useState, useEffect, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Bot, Database, ArrowRight, Sparkles, Send, ArrowUpRight } from "lucide-react";

const suggestions = [
  "Why did sales decrease in the last quarter?",
  "Which product is most profitable?",
  "Forecast revenue for next 6 months",
  "Show me top 5 customers by revenue",
  "What are the main drivers of churn?",
  "Create a summary dashboard",
];

function CopilotContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [input, setInput] = useState("");
  const { data: datasets, isLoading } = useQuery({ queryKey: ["datasets"], queryFn: api.datasets.list });

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setInput(q);
      if (datasets && datasets.length > 0) {
        handleAsk(datasets[0].id, q);
      }
    }
  }, [searchParams, datasets]);

  function handleAsk(datasetId: number, question: string) {
    const q = encodeURIComponent(question);
    router.push(`/datasets/${datasetId}/chat?q=${q}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !datasets || datasets.length === 0) return;
    handleAsk(datasets[0].id, input.trim());
  }

  return (
    <div className="max-w-[900px] mx-auto">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-[#4F46E5]/15 flex items-center justify-center mx-auto mb-4">
          <Bot className="w-7 h-7 text-[#6366F1]" />
        </div>
        <h1 className="text-[22px] font-bold text-[#F0F0F5] mb-1" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>AI Copilot</h1>
        <p className="text-[13px] text-[#6B7280]">Ask questions about your data in natural language</p>
      </div>

      {/* Chat input */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#12141F] border border-[#1C1E2E] focus-within:border-[#4F46E5]/40 transition-colors">
          <Sparkles className="w-4 h-4 text-[#6366F1] flex-shrink-0" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={datasets && datasets.length > 0 ? `Ask about ${datasets[0].name}...` : "Upload a dataset first to start asking questions"}
            className="flex-1 bg-transparent text-[14px] text-[#F0F0F5] placeholder-[#4B5563] outline-none"
            style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}
            disabled={!datasets || datasets.length === 0}
          />
          <button type="submit" disabled={!input.trim() || !datasets || datasets.length === 0}
            className="w-8 h-8 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
        {datasets && datasets.length > 1 && (
          <p className="text-[11px] text-[#6B7280] mt-1.5 ml-1">
            Asking about <span className="text-[#D1D5DB] font-medium">{datasets[0].name}</span> —{" "}
            <Link href="/home/projects" className="text-[#6366F1] hover:text-[#818CF8]">switch dataset</Link>
          </p>
        )}
      </form>

      {/* Suggested questions */}
      <div className="mb-8">
        <h3 className="text-[13px] font-semibold text-[#6B7280] mb-3" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>Suggested Questions</h3>
        <div className="grid grid-cols-2 gap-2">
          {suggestions.map((q) => (
            <button
              key={q}
              onClick={() => datasets && datasets.length > 0 && handleAsk(datasets[0].id, q)}
              disabled={!datasets || datasets.length === 0}
              className="text-left px-4 py-3 rounded-xl bg-[#12141F] border border-[#1C1E2E] hover:border-[#4F46E5]/30 hover:bg-[#161827] transition-all group disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-3.5 h-3.5 text-[#6366F1] flex-shrink-0" />
                <span className="text-[13px] text-[#D1D5DB] flex-1">{q}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#6B7280] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Your datasets */}
      {datasets && datasets.length > 0 && (
        <div>
          <h3 className="text-[13px] font-semibold text-[#6B7280] mb-3" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>Your Datasets</h3>
          <div className="space-y-2">
            {datasets.map((d) => (
              <Link key={d.id} href={`/datasets/${d.id}`}>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#12141F] border border-[#1C1E2E] hover:border-[#2a2d3e] hover:bg-[#161827] transition-all group cursor-pointer">
                  <div className="w-9 h-9 rounded-lg bg-[#4F46E5]/15 flex items-center justify-center flex-shrink-0">
                    <Database className="w-4 h-4 text-[#6366F1]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#F0F0F5] truncate">{d.name}</p>
                    <p className="text-[11px] text-[#6B7280]">{d.rows?.toLocaleString() ?? "?"} rows · {d.columns} columns</p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-[#2a2d3e] group-hover:text-[#6366F1] transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!isLoading && datasets && datasets.length === 0 && (
        <div className="text-center py-10">
          <Database className="w-10 h-10 text-[#2a2d3e] mx-auto mb-3" />
          <p className="text-[14px] font-semibold text-[#F0F0F5] mb-1" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>No datasets yet</p>
          <p className="text-[12px] text-[#6B7280] mb-3">Upload a dataset to start asking questions</p>
          <Link href="/home" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-[13px] font-semibold transition-colors"
            style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>
            Upload Dataset
          </Link>
        </div>
      )}
    </div>
  );
}

export default function CopilotPage() {
  return (
    <Suspense>
      <CopilotContent />
    </Suspense>
  );
}
