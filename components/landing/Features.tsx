"use client";

import { motion } from "framer-motion";
import { useRef } from "react";
import { useMouseGlow } from "@/src/hooks/useMouseGlow";
import { Wand2, Cpu, LayoutDashboard, MessageSquare, TrendingUp, BarChart3, GitBranch, Rocket } from "lucide-react";

const features = [
  { icon: Wand2, title: "AI Cleaning", desc: "Automatic null filling, duplicate removal, type inference. Zero manual work." },
  { icon: Cpu, title: "AutoML", desc: "XGBoost, Random Forest, LightGBM trained automatically with hyperparameter tuning." },
  { icon: LayoutDashboard, title: "Dashboard Builder", desc: "Interactive charts, KPIs, and narratives generated from your data." },
  { icon: MessageSquare, title: "AI Copilot", desc: "Natural language queries. Ask questions, get answers, create visualizations." },
  { icon: TrendingUp, title: "Forecasting", desc: "Time series analysis with seasonality detection and confidence intervals." },
  { icon: BarChart3, title: "Business Intelligence", desc: "SWOT, risk assessment, decision points, benchmarks, and action items." },
  { icon: GitBranch, title: "Explainable AI", desc: "SHAP values, feature importance, decision trees with human-readable explanations." },
  { icon: Rocket, title: "Deployment", desc: "One-click deploy to production. REST API, embedded dashboards, scheduled reports." },
];

function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  useMouseGlow(cardRef);
  const Icon = feature.icon;
  return (
    <motion.div ref={cardRef} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.6, delay: index * 0.05 }} className="group relative rounded-2xl border border-[#27272A] bg-[#18181B]/50 p-6 hover:border-[#4F46E5]/20 transition-all duration-300 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: "radial-gradient(400px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(79,70,229,0.06), transparent 60%)" }} />
      <div className="relative z-10">
        <div className="h-10 w-10 rounded-xl bg-[#4F46E5]/10 flex items-center justify-center mb-4 group-hover:bg-[#4F46E5]/15 transition-colors">
          <Icon className="h-5 w-5 text-[#6366F1]" />
        </div>
        <h3 className="text-sm font-semibold text-[#F8FAFC] mb-1.5">{feature.title}</h3>
        <p className="text-[13px] text-[#A1A1AA] leading-relaxed">{feature.desc}</p>
      </div>
    </motion.div>
  );
}

export function Features() {
  return (
    <section id="features" className="py-24 px-4 relative z-10">
      <div className="max-w-[1100px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.8 }} className="text-center mb-16">
          <p className="text-[11px] text-[#6366F1] uppercase tracking-widest font-medium mb-3">Features</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#F8FAFC] tracking-tight">
            Everything your data needs.<br />
            <span className="font-serif italic text-[#A1A1AA]">Nothing it doesn&apos;t.</span>
          </h2>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f, i) => <FeatureCard key={f.title} feature={f} index={i} />)}
        </div>
      </div>
    </section>
  );
}
