"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Link from "next/link";
import { useState } from "react";
import { Database, ArrowRight, Plus, Bot, FileSpreadsheet, BarChart3, TrendingUp, LayoutDashboard, Trash2, AlertTriangle, X } from "lucide-react";

const colors = ["#4F46E5", "#10B981", "#F59E0B", "#6366F1", "#8B5CF6"];
const icons = [Database, TrendingUp, BarChart3, FileSpreadsheet, LayoutDashboard];

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const { data: datasets, isLoading } = useQuery({ queryKey: ["datasets"], queryFn: api.datasets.list });
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteName, setDeleteName] = useState("");

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.datasets.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
      setDeleteId(null);
      setDeleteName("");
    },
  });

  const handleDeleteClick = (id: number, name: string) => {
    setDeleteId(id);
    setDeleteName(name);
  };

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
              <div key={d.id} className="group p-5 rounded-xl border border-[#1C1E2E] bg-[#12141F] hover:border-[#2a2d3e] hover:bg-[#161827] transition-all h-full">
                <Link href={`/datasets/${d.id}`} className="block">
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
                </Link>
                <div className="mt-3 pt-3 border-t border-[#1C1E2E]">
                  <button
                    onClick={(e) => { e.preventDefault(); handleDeleteClick(d.id, d.name); }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-[#6B7280] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setDeleteId(null); setDeleteName(""); }}>
          <div className="w-full max-w-md mx-4 rounded-2xl border border-[#1C1E2E] bg-[#12141F] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-[#F0F0F5]" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>Delete Project</h3>
                  <p className="text-[12px] text-[#6B7280]">This action cannot be undone</p>
                </div>
              </div>
              <button onClick={() => { setDeleteId(null); setDeleteName(""); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6B7280] hover:text-[#F0F0F5] hover:bg-[#1C1E2E] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 pb-5">
              <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10 mb-4">
                <p className="text-[12px] text-red-400 leading-relaxed">
                  Are you sure you want to delete <span className="font-semibold">{deleteName}</span>? This will permanently remove the dataset and all associated files, dashboards, reports, models, and chat history.
                </p>
              </div>
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => { setDeleteId(null); setDeleteName(""); }}
                  className="px-4 py-2 rounded-lg text-[13px] font-medium text-[#6B7280] hover:text-[#F0F0F5] hover:bg-[#1C1E2E] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { if (deleteId !== null) deleteMutation.mutate(deleteId); }}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-[13px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {deleteMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  {deleteMutation.isPending ? "Deleting..." : "Delete Project"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
