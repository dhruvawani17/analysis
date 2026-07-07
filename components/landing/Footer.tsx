"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

const footerLinks = {
  Product: ["Features", "Pricing", "Changelog", "Roadmap", "API"],
  Resources: ["Documentation", "Blog", "Tutorials", "Templates", "Community"],
  Company: ["About", "Careers", "Press", "Partners", "Contact"],
  Legal: ["Privacy", "Terms", "Security", "GDPR"],
};

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-[#27272A]">
      <div className="max-w-[1100px] mx-auto px-4">
        <div className="py-24 text-center">
          <motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#F8FAFC] tracking-tight mb-8">
            The Future of<br />
            <span className="font-serif italic text-[#6366F1]">Data Intelligence.</span>
          </motion.h2>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2, duration: 0.8 }} className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/home" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-full transition-all duration-300 hover:shadow-xl hover:shadow-[#4F46E5]/25">
              Start Building<ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-[#A1A1AA] hover:text-[#F8FAFC] border border-[#27272A] hover:border-[#3f3f46] rounded-full transition-all duration-300">
              Book Demo
            </a>
          </motion.div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-12 border-b border-[#27272A]">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="h-7 w-7 rounded-lg bg-[#4F46E5] flex items-center justify-center">
                <span className="text-white font-bold text-xs">D</span>
              </div>
              <span className="font-semibold text-sm text-[#F8FAFC]">Datanex</span>
            </Link>
            <p className="text-[12px] text-[#A1A1AA] leading-relaxed mb-4">Your AI Data Team. From raw data to business decisions.</p>
          </div>
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-[11px] font-semibold text-[#F8FAFC] uppercase tracking-wider mb-3">{category}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link}><a href="#" className="text-[12px] text-[#A1A1AA] hover:text-[#F8FAFC] transition-colors">{link}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-[#A1A1AA]/60">&copy; 2024 Datanex AI. All rights reserved.</p>
          <p className="text-[11px] text-[#A1A1AA]/40">Built with intelligence.</p>
        </div>
      </div>
    </footer>
  );
}
