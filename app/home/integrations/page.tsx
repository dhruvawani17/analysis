"use client";

import { Plug, Database, Bot, BarChart3 } from "lucide-react";

export default function IntegrationsPage() {
  return (
    <div className="max-w-[700px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[20px] font-bold text-[#F0F0F5]" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>Integrations</h1>
        <p className="text-[13px] text-[#6B7280] mt-0.5">Connect external services and data sources</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { icon: Database, label: "PostgreSQL", desc: "Connect to PostgreSQL databases", status: "Coming Soon" },
          { icon: Database, label: "MySQL", desc: "Connect to MySQL databases", status: "Coming Soon" },
          { icon: Bot, label: "OpenAI", desc: "Use OpenAI models for analysis", status: "Coming Soon" },
          { icon: BarChart3, label: "Tableau", desc: "Export dashboards to Tableau", status: "Coming Soon" },
        ].map((item) => (
          <div key={item.label} className="p-5 rounded-xl border border-[#1C1E2E] bg-[#12141F] hover:border-[#2a2d3e] transition-all">
            <div className="flex items-start justify-between mb-2">
              <item.icon className="w-5 h-5 text-[#6366F1]" />
              <span className="text-[10px] font-semibold text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-0.5 rounded-full">{item.status}</span>
            </div>
            <h3 className="text-[14px] font-semibold text-[#F0F0F5] mb-1" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>{item.label}</h3>
            <p className="text-[12px] text-[#6B7280]">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
