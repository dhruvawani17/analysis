"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  { name: "Sarah Chen", role: "Head of Analytics, TechFlow", text: "Datanex replaced our entire data pipeline. What used to take our team 2 weeks now takes 10 minutes. The AI copilot is genuinely magical.", rating: 5 },
  { name: "Marcus Rodriguez", role: "Data Scientist, CloudBase", text: "The AutoML feature is incredible. It trained 6 models, selected the best one, and gave me SHAP explanations \u2014 all without writing a single line of code.", rating: 5 },
  { name: "Priya Sharma", role: "VP Operations, NexGen", text: "We went from Excel spreadsheets to executive dashboards in under an hour. Our CEO was stunned. This is the future of business intelligence.", rating: 5 },
];

export function Testimonials() {
  return (
    <section className="py-24 px-4 relative z-10">
      <div className="max-w-[1100px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.8 }} className="text-center mb-16">
          <p className="text-[11px] text-[#6366F1] uppercase tracking-widest font-medium mb-3">Testimonials</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#F8FAFC] tracking-tight">Loved by data teams.</h2>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {testimonials.map((t, i) => (
            <motion.div key={t.name} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.6 }} className="relative rounded-2xl border border-[#27272A] bg-[#18181B]/50 p-6 hover:border-[#4F46E5]/20 transition-all duration-300">
              <div className="flex items-center gap-0.5 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                ))}
              </div>
              <p className="text-[13px] text-[#A1A1AA] leading-relaxed mb-6">&ldquo;{t.text}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-[#27272A] flex items-center justify-center">
                  <span className="text-[10px] font-bold text-[#A1A1AA]">{t.name.split(" ").map((n) => n[0]).join("")}</span>
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-[#F8FAFC]">{t.name}</p>
                  <p className="text-[10px] text-[#A1A1AA]">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
