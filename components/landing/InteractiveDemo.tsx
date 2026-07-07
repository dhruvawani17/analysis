"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Database, MessageSquare, Sparkles } from "lucide-react";

const queries = [
  { q: "What's the revenue trend?", a: "Revenue shows a consistent upward trend at $2.4M, up 18% from last quarter. The growth is primarily driven by the enterprise segment (+32% QoQ)." },
  { q: "Show me top customers", a: "Top 5 customers by revenue: 1. Acme Corp ($340K), 2. TechFlow ($280K), 3. DataSync ($195K), 4. CloudBase ($172K), 5. NexGen ($148K). These represent 47% of total revenue." },
  { q: "Predict next quarter", a: "Based on ARIMA and XGBoost models, Q3 revenue is projected at $2.7M \u00b1 $180K (95% CI). Seasonal adjustment applied. Confidence: High." },
];

export function InteractiveDemo() {
  const [activeQuery, setActiveQuery] = useState(0);

  return (
    <section id="demo" className="py-24 px-4 relative z-10">
      <div className="max-w-[1100px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.8 }} className="text-center mb-16">
          <p className="text-[11px] text-[#6366F1] uppercase tracking-widest font-medium mb-3">Interactive Demo</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#F8FAFC] tracking-tight">Ask your data anything.</h2>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-[#27272A] bg-[#18181B]/50 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#27272A]">
              <Database className="h-3.5 w-3.5 text-[#6366F1]" />
              <span className="text-[11px] font-semibold text-[#F8FAFC]">sales_data_2024.csv</span>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-4 gap-px text-[9px] font-mono mb-2">
                {["date", "revenue", "region", "product"].map((h) => (
                  <div key={h} className="px-2 py-1 bg-[#27272A] text-[#A1A1AA] font-semibold">{h}</div>
                ))}
              </div>
              {[
                ["2024-01-15", "$42,300", "North", "Pro"],
                ["2024-01-16", "$38,100", "South", "Basic"],
                ["2024-01-17", "$51,200", "East", "Enterprise"],
                ["2024-01-18", "$44,800", "West", "Pro"],
                ["2024-01-19", "$39,600", "North", "Basic"],
                ["2024-01-20", "$55,400", "East", "Enterprise"],
              ].map((row, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="grid grid-cols-4 gap-px text-[9px] font-mono">
                  {row.map((cell, j) => (
                    <div key={j} className="px-2 py-1.5 border-b border-[#27272A]/50 text-[#A1A1AA]">{cell}</div>
                  ))}
                </motion.div>
              ))}
              <p className="text-[9px] text-[#A1A1AA]/40 mt-2 text-center">52,341 rows \u00b7 24 columns</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#27272A] bg-[#18181B]/50 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#27272A]">
              <MessageSquare className="h-3.5 w-3.5 text-[#6366F1]" />
              <span className="text-[11px] font-semibold text-[#F8FAFC]">AI Copilot</span>
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#22C55E] animate-pulse" />
            </div>
            <div className="p-4 min-h-[340px] flex flex-col">
              <div className="flex-1 space-y-3 mb-4">
                <AnimatePresence mode="wait">
                  <motion.div key={activeQuery} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                    <div className="flex items-start gap-2 flex-row-reverse">
                      <div className="h-6 w-6 rounded-full bg-[#22C55E]/10 flex items-center justify-center shrink-0"><span className="text-[7px] font-bold text-[#22C55E]">U</span></div>
                      <div className="bg-[#4F46E5]/10 border border-[#4F46E5]/20 rounded-xl rounded-tr-sm px-3 py-2 max-w-[80%]">
                        <p className="text-[11px] text-[#F8FAFC]">{queries[activeQuery].q}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="h-6 w-6 rounded-full bg-[#4F46E5]/20 flex items-center justify-center shrink-0"><Sparkles className="h-3 w-3 text-[#6366F1]" /></div>
                      <div className="bg-[#27272A]/50 border border-[#27272A] rounded-xl rounded-tl-sm px-3 py-2 max-w-[85%]">
                        <p className="text-[11px] text-[#A1A1AA] leading-relaxed">{queries[activeQuery].a}</p>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="flex gap-2">
                {queries.map((q, i) => (
                  <button key={i} onClick={() => setActiveQuery(i)} className={`flex-1 px-2 py-1.5 rounded-lg text-[9px] font-medium border transition-all ${activeQuery === i ? "bg-[#4F46E5]/10 border-[#4F46E5]/20 text-[#6366F1]" : "bg-[#27272A]/30 border-[#27272A] text-[#A1A1AA] hover:border-[#3f3f46]"}`}>
                    {q.q.length > 20 ? q.q.slice(0, 20) + "..." : q.q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
