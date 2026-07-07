"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import Link from "next/link";

const plans = [
  { name: "Free", price: "$0", period: "forever", desc: "Perfect for exploring Datanex", features: ["5 datasets/month", "Basic EDA", "3 dashboards", "AI Copilot (limited)", "Community support"], cta: "Start Free", popular: false },
  { name: "Pro", price: "$49", period: "/month", desc: "For data professionals", features: ["Unlimited datasets", "Full AutoML pipeline", "Unlimited dashboards", "AI Copilot (unlimited)", "Business reports", "Priority support", "API access"], cta: "Start Pro Trial", popular: true },
  { name: "Enterprise", price: "Custom", period: "", desc: "For organizations at scale", features: ["Everything in Pro", "SSO & SAML", "On-premise deployment", "Custom ML models", "Dedicated support", "SLA guarantee", "White-label option", "Audit logs"], cta: "Book Demo", popular: false },
];

export function Pricing() {
  const [annual, setAnnual] = useState(true);

  return (
    <section id="pricing" className="py-24 px-4 relative z-10">
      <div className="max-w-[1100px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.8 }} className="text-center mb-12">
          <p className="text-[11px] text-[#6366F1] uppercase tracking-widest font-medium mb-3">Pricing</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#F8FAFC] tracking-tight">
            Simple pricing.<br />
            <span className="font-serif italic text-[#A1A1AA]">No surprises.</span>
          </h2>
        </motion.div>

        <div className="flex items-center justify-center gap-3 mb-12">
          <span className={`text-[12px] font-medium ${!annual ? "text-[#F8FAFC]" : "text-[#A1A1AA]"}`}>Monthly</span>
          <button onClick={() => setAnnual(!annual)} className="relative h-6 w-11 rounded-full bg-[#27272A] border border-[#3f3f46] transition-colors">
            <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-[#6366F1] transition-transform duration-200 ${annual ? "left-[22px]" : "left-0.5"}`} />
          </button>
          <span className={`text-[12px] font-medium ${annual ? "text-[#F8FAFC]" : "text-[#A1A1AA]"}`}>
            Annual <span className="text-[10px] text-[#22C55E]">Save 20%</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan, i) => (
            <motion.div key={plan.name} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.6 }} className={`relative rounded-2xl border p-6 flex flex-col ${plan.popular ? "border-[#4F46E5]/40 bg-[#4F46E5]/5" : "border-[#27272A] bg-[#18181B]/50"}`}>
              {plan.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#4F46E5] text-[10px] font-semibold text-white">Most Popular</div>}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-[#F8FAFC] mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold text-[#F8FAFC]">{plan.price}</span>
                  {plan.period && <span className="text-[12px] text-[#A1A1AA]">{plan.period}</span>}
                </div>
                <p className="text-[12px] text-[#A1A1AA]">{plan.desc}</p>
              </div>
              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[12px] text-[#A1A1AA]">
                    <Check className="h-3.5 w-3.5 text-[#22C55E] shrink-0" />{f}
                  </li>
                ))}
              </ul>
              {plan.name === "Free" ? (
                <Link href="/home" className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-medium transition-all duration-300 bg-[#27272A] hover:bg-[#3f3f46] text-[#F8FAFC] border border-[#27272A] hover:border-[#3f3f46]`}>
                  {plan.cta}<ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <button className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-medium transition-all duration-300 ${plan.popular ? "bg-[#4F46E5] hover:bg-[#4338CA] text-white hover:shadow-lg hover:shadow-[#4F46E5]/20" : "bg-[#27272A] hover:bg-[#3f3f46] text-[#F8FAFC] border border-[#27272A] hover:border-[#3f3f46]"}`}>
                  {plan.cta}<ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
