"use client";

import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import Link from "next/link";
import { WorkspacePreview } from "./WorkspacePreview";
import { useAuth } from "@/components/auth-provider";

export function Hero() {
  const { user } = useAuth();
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-16 px-4 overflow-hidden">
      <div className="relative z-10 max-w-[900px] mx-auto text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#27272A] bg-[#18181B]/50 mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E] animate-pulse" />
            <span className="text-[11px] text-[#A1A1AA] font-medium">Now in Public Beta</span>
          </div>
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }} className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.05] mb-6">
          <span className="text-[#F8FAFC]" style={{ fontFamily: "var(--font-stardos-stencil), system-ui" }}>Your </span>
          <span className="text-[#F8FAFC]" style={{ fontFamily: "var(--font-stardos-stencil), system-ui" }}>AI </span>
          <span className="font-serif italic text-[#6366F1]">Data Team.</span>
        </motion.h1>

        <motion.h2 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.45, ease: [0.16, 1, 0.3, 1] }} className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] mb-6">
          <span className="text-[#F8FAFC]">From Raw Data</span>
          <br />
          <span className="text-[#F8FAFC]">to </span>
          <span className="gradient-text">Business Decisions</span>
          <span className="text-[#F8FAFC]">.</span>
        </motion.h2>

        <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }} className="text-base sm:text-lg text-[#A1A1AA] max-w-[640px] mx-auto mb-10 leading-relaxed">
          Upload Excel, CSV, SQL, JSON or multiple datasets. AI automatically cleans your data, performs EDA, trains machine learning models, creates dashboards and explains every insight.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.75, ease: [0.16, 1, 0.3, 1] }} className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href={user ? "/home" : "/sign-up"} className="group inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-full transition-all duration-300 hover:shadow-xl hover:shadow-[#4F46E5]/25 hover:-translate-y-0.5">
            Start Free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a href="#demo" className="group inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-[#A1A1AA] hover:text-[#F8FAFC] border border-[#27272A] hover:border-[#3f3f46] bg-[#18181B]/50 rounded-full transition-all duration-300 hover:-translate-y-0.5">
            <Play className="h-3.5 w-3.5" />
            Watch Live Demo
          </a>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, delay: 1, ease: [0.16, 1, 0.3, 1] }} className="relative z-10 w-full max-w-[1100px] mx-auto mt-16">
        <div className="absolute -inset-4 bg-[#4F46E5]/5 rounded-3xl blur-3xl" />
        <WorkspacePreview />
      </motion.div>

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#4F46E5]/5 rounded-full blur-[120px] pointer-events-none" />
    </section>
  );
}
