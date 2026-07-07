"use client";

import { motion } from "framer-motion";
import { Upload, Brain, Sparkles, BarChart3, Cpu, LineChart, FileText, Rocket, CheckCircle2 } from "lucide-react";

const steps = [
  { icon: Upload, label: "Upload", desc: "Drag & drop Excel, CSV, SQL, JSON" },
  { icon: Brain, label: "AI Understanding", desc: "Auto-detect types, patterns, anomalies" },
  { icon: Sparkles, label: "Cleaning", desc: "Fill nulls, remove duplicates, fix types" },
  { icon: BarChart3, label: "EDA", desc: "Distributions, correlations, outliers" },
  { icon: Cpu, label: "Machine Learning", desc: "AutoML with XGBoost, Random Forest, LSTM" },
  { icon: LineChart, label: "Dashboard", desc: "Interactive charts, KPIs, AI insights" },
  { icon: FileText, label: "Business Report", desc: "Executive summary, SWOT, risk assessment" },
  { icon: Rocket, label: "Deployment", desc: "One-click deploy to production" },
];

export function HowItWorks() {
  return (
    <section id="platform" className="py-24 px-4 relative z-10">
      <div className="max-w-[900px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.8 }} className="text-center mb-16">
          <p className="text-[11px] text-[#6366F1] uppercase tracking-widest font-medium mb-3">How It Works</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#F8FAFC] tracking-tight">
            From data to decisions.<br />
            <span className="font-serif italic text-[#A1A1AA]">In minutes.</span>
          </h2>
        </motion.div>
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-px bg-[#27272A]" />
          <div className="space-y-0">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div key={step.label} initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.6, delay: i * 0.08 }} className="relative flex items-center gap-6 py-6 group">
                  <div className="relative z-10 h-12 w-12 rounded-xl bg-[#18181B] border border-[#27272A] flex items-center justify-center shrink-0 group-hover:border-[#4F46E5]/30 group-hover:bg-[#4F46E5]/5 transition-all duration-300">
                    <Icon className="h-5 w-5 text-[#A1A1AA] group-hover:text-[#6366F1] transition-colors" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-[#F8FAFC] mb-0.5">{step.label}</h3>
                    <p className="text-[13px] text-[#A1A1AA]">{step.desc}</p>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-[#27272A] group-hover:text-[#22C55E] transition-colors shrink-0" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
