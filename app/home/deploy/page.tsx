"use client";

import { Rocket, ExternalLink } from "lucide-react";

export default function DeployPage() {
  return (
    <div className="max-w-[900px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[20px] font-bold text-[#F0F0F5]" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>Deploy</h1>
        <p className="text-[13px] text-[#6B7280] mt-0.5">Deploy your models and dashboards as APIs or apps</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { title: "REST API", desc: "Deploy your ML model as a REST API endpoint", status: "Coming Soon" },
          { title: "Docker Container", desc: "Package your analysis as a Docker container", status: "Coming Soon" },
          { title: "Streamlit App", desc: "Deploy dashboards as interactive Streamlit apps", status: "Coming Soon" },
          { title: "Jupyter Notebook", desc: "Export as a shareable Jupyter notebook", status: "Coming Soon" },
        ].map((item) => (
          <div key={item.title} className="p-5 rounded-xl border border-[#1C1E2E] bg-[#12141F] hover:border-[#2a2d3e] transition-all">
            <div className="flex items-start justify-between mb-2">
              <Rocket className="w-5 h-5 text-[#6366F1]" />
              <span className="text-[10px] font-semibold text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-0.5 rounded-full">{item.status}</span>
            </div>
            <h3 className="text-[14px] font-semibold text-[#F0F0F5] mb-1" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>{item.title}</h3>
            <p className="text-[12px] text-[#6B7280]">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
