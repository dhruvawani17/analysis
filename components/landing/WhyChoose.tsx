"use client";

import { motion } from "framer-motion";
import { X, Check } from "lucide-react";

const comparisons = [
  { feature: "Data Cleaning", traditional: "Manual, hours of work", nexus: "Automatic, seconds", highlight: true },
  { feature: "EDA", traditional: "Write SQL/Python scripts", nexus: "One-click auto-generated", highlight: false },
  { feature: "ML Models", traditional: "Need ML engineer", nexus: "AutoML, no code needed", highlight: true },
  { feature: "Dashboards", traditional: "Tableau/PowerBI licenses", nexus: "AI-built, interactive", highlight: false },
  { feature: "AI Copilot", traditional: "Not available", nexus: "Natural language queries", highlight: true },
  { feature: "Business Reports", traditional: "Manual writing", nexus: "Auto-generated narratives", highlight: false },
  { feature: "Forecasting", traditional: "Excel formulas", nexus: "ARIMA + XGBoost + LSTM", highlight: true },
  { feature: "Time to Insight", traditional: "Days to weeks", nexus: "Minutes", highlight: false },
];

export function WhyChoose() {
  return (
    <section id="solutions" className="py-24 px-4 relative z-10">
      <div className="max-w-[900px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.8 }} className="text-center mb-16">
          <p className="text-[11px] text-[#6366F1] uppercase tracking-widest font-medium mb-3">Why Choose Datanex</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#F8FAFC] tracking-tight">
            Old way vs.<br />
            <span className="font-serif italic text-[#6366F1]">The new way.</span>
          </h2>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="rounded-2xl border border-[#27272A] bg-[#18181B]/50 overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_1fr] border-b border-[#27272A]">
            <div className="px-4 py-3 text-[11px] font-semibold text-[#A1A1AA]">Feature</div>
            <div className="px-4 py-3 text-[11px] font-semibold text-[#EF4444] border-x border-[#27272A]">Traditional</div>
            <div className="px-4 py-3 text-[11px] font-semibold text-[#22C55E]">Datanex AI</div>
          </div>
          {comparisons.map((row, i) => (
            <motion.div key={row.feature} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className={`grid grid-cols-[1fr_1fr_1fr] ${row.highlight ? "bg-[#27272A]/20" : ""}`}>
              <div className="px-4 py-3 text-[12px] font-medium text-[#F8FAFC] border-b border-[#27272A]/50">{row.feature}</div>
              <div className="px-4 py-3 text-[12px] text-[#A1A1AA] border-x border-b border-[#27272A]/50 flex items-center gap-2">
                <X className="h-3 w-3 text-[#EF4444] shrink-0" />{row.traditional}
              </div>
              <div className="px-4 py-3 text-[12px] text-[#A1A1AA] border-b border-[#27272A]/50 flex items-center gap-2">
                <Check className="h-3 w-3 text-[#22C55E] shrink-0" />{row.nexus}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
