"use client";

import { motion } from "framer-motion";

const logos = [
  { name: "Stanford" }, { name: "MIT" }, { name: "Google" }, { name: "Meta" },
  { name: "Stripe" }, { name: "Notion" }, { name: "Vercel" }, { name: "Linear" },
];

export function TrustedBy() {
  return (
    <section className="py-20 px-4 relative z-10">
      <div className="max-w-[1100px] mx-auto">
        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center text-[13px] text-[#A1A1AA] mb-10 tracking-wide uppercase">
          Trusted by teams at
        </motion.p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {logos.map((logo, i) => (
            <motion.div key={logo.name} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="flex items-center gap-2 opacity-40 hover:opacity-70 transition-opacity duration-300">
              <div className="h-6 w-6 rounded bg-[#27272A] flex items-center justify-center">
                <span className="text-[8px] font-bold text-[#A1A1AA]">{logo.name[0]}</span>
              </div>
              <span className="text-sm font-medium text-[#A1A1AA]">{logo.name}</span>
            </motion.div>
          ))}
        </div>
        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center text-[11px] text-[#A1A1AA]/50 mt-6">
          Universities \u00b7 Startups \u00b7 Data Scientists \u00b7 Analysts \u00b7 Enterprises
        </motion.p>
      </div>
    </section>
  );
}
