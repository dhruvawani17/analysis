"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Link from "next/link";
import { Database, ArrowRight, Upload, Bot } from "lucide-react";

export default function DatasetsPage() {
  const { data: datasets, isLoading } = useQuery({ queryKey: ["datasets"], queryFn: api.datasets.list });

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-bold text-[#F0F0F5]" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>Datasets</h1>
          <p className="text-[13px] text-[#6B7280] mt-0.5">Manage and explore your uploaded data</p>
        </div>
        <Link href="/home" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-[13px] font-semibold transition-colors"
          style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>
          <Upload className="w-4 h-4" /> Upload Dataset
        </Link>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-[#4F46E5] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && datasets && datasets.length === 0 && (
        <div className="text-center py-20">
          <Database className="w-12 h-12 text-[#2a2d3e] mx-auto mb-4" />
          <p className="text-[15px] font-semibold text-[#F0F0F5] mb-1" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>No datasets yet</p>
          <p className="text-[13px] text-[#6B7280]">Upload your first dataset to get started</p>
        </div>
      )}

      {datasets && datasets.length > 0 && (
        <div className="rounded-xl border border-[#1C1E2E] bg-[#12141F] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1C1E2E]">
                <th className="text-left px-5 py-3 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>Name</th>
                <th className="text-left px-5 py-3 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>Rows</th>
                <th className="text-left px-5 py-3 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>Columns</th>
                <th className="text-left px-5 py-3 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>Created</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {datasets.map((d) => (
                <tr key={d.id} className="border-b border-[#1C1E2E] last:border-0 hover:bg-[#161827] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#4F46E5]/15 flex items-center justify-center">
                        <Database className="w-4 h-4 text-[#6366F1]" />
                      </div>
                      <span className="text-[13px] font-semibold text-[#F0F0F5]">{d.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-[#D1D5DB]">{d.rows?.toLocaleString() ?? "—"}</td>
                  <td className="px-5 py-3.5 text-[13px] text-[#D1D5DB]">{d.columns ?? "—"}</td>
                  <td className="px-5 py-3.5 text-[13px] text-[#6B7280]">{new Date(d.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3.5">
                    <Link href={`/datasets/${d.id}`} className="text-[12px] text-[#6366F1] hover:text-[#818CF8] font-medium flex items-center gap-1 transition-colors"
                      style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>
                      Open <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
