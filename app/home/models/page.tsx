"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Link from "next/link";
import { BrainCircuit, ArrowRight, BarChart3 } from "lucide-react";

export default function ModelsPage() {
  const { data: datasets, isLoading } = useQuery({ queryKey: ["datasets"], queryFn: api.datasets.list });

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-bold text-[#F0F0F5]" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>Models</h1>
          <p className="text-[13px] text-[#6B7280] mt-0.5">ML models trained on your data</p>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-[#4F46E5] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && datasets && datasets.length === 0 && (
        <div className="text-center py-20">
          <BrainCircuit className="w-12 h-12 text-[#2a2d3e] mx-auto mb-4" />
          <p className="text-[15px] font-semibold text-[#F0F0F5] mb-1" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>No models yet</p>
          <p className="text-[13px] text-[#6B7280] mb-4">Upload a dataset and train ML models</p>
          <Link href="/home" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-[13px] font-semibold transition-colors"
            style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>Upload Dataset</Link>
        </div>
      )}

      {datasets && datasets.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {datasets.map((d) => (
            <Link key={d.id} href={`/datasets/${d.id}/ml`}>
              <div className="group p-5 rounded-xl border border-[#1C1E2E] bg-[#12141F] hover:border-[#2a2d3e] hover:bg-[#161827] transition-all cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#10B981]/15 flex items-center justify-center">
                    <BrainCircuit className="w-5 h-5 text-[#10B981]" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#2a2d3e] group-hover:text-[#6366F1] group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="text-[14px] font-semibold text-[#F0F0F5] truncate mb-1">{d.name}</h3>
                <p className="text-[12px] text-[#6B7280]">Train models →</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
