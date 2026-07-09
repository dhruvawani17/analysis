"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Link from "next/link";
import { Database, ArrowRight, Plus, Bot, FileSpreadsheet, BarChart3, TrendingUp, LayoutDashboard } from "lucide-react";

const colorMap: Record<string, string> = { "#4F46E5": "#4F46E5", "#10B981": "#10B981", "#F59E0B": "#F59E0B", "#6366F1": "#6366F1", "#8B5CF6": "#8B5CF6" };
const icons = [Database, TrendingUp, BarChart3, FileSpreadsheet, LayoutDashboard];
const colors = ["#4F46E5", "#10B981", "#F59E0B", "#6366F1", "#8B5CF6"];

export default function ProjectsPage() {
  const { data: datasets, isLoading } = useQuery({ queryKey: ["datasets"], queryFn: api.datasets.list });

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-bold text-[#F0F0F5]" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>Projects</h1>
          <p className="text-[13px] text-[#6B7280] mt-0.5">All your datasets and analyses</p>
        </div>
        <Link href="/home" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-[13px] font-semibold transition-colors"
          style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>
          <Plus className="w-4 h-4" /> New Project
        </Link>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-[#4F46E5] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && datasets && datasets.length === 0 && (
        <div className="text-center py-20">
          <Bot className="w-12 h-12 text-[#2a2d3e] mx-auto mb-4" />
          <p className="text-[15px] font-semibold text-[#F0F0F5] mb-1" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>No projects yet</p>
          <p className="text-[13px] text-[#6B7280] mb-4">Upload your first dataset to get started</p>
          <Link href="/home" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-[13px] font-semibold transition-colors"
            style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>
            <Plus className="w-4 h-4" /> Upload Dataset
          </Link>
        </div>
      )}

      {datasets && datasets.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {datasets.map((d, i) => {
            const Icon = icons[i % icons.length];
            const color = colors[i % colors.length];
            return (
              <Link key={d.id} href={`/datasets/${d.id}`}>
                <div className="group p-5 rounded-xl border border-[#1C1E2E] bg-[#12141F] hover:border-[#2a2d3e] hover:bg-[#161827] transition-all cursor-pointer h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                      <Icon className="w-5 h-5" style={{ color }} />
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#2a2d3e] group-hover:text-[#6366F1] group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="text-[14px] font-semibold text-[#F0F0F5] truncate mb-1">{d.name}</h3>
                  <p className="text-[12px] text-[#6B7280] mb-3">{d.name.toLowerCase().replace(/\s+/g, "_")}.csv</p>
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-[13px] font-bold text-[#F0F0F5]">{d.rows?.toLocaleString() ?? "?"}</p>
                      <p className="text-[10px] text-[#6B7280]">Rows</p>
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-[#F0F0F5]">{d.columns}</p>
                      <p className="text-[10px] text-[#6B7280]">Columns</p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
