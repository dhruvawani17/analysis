"use client";

import { Bell, HelpCircle, Search, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";

export function TopBar() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="h-14 border-b border-[#1C1E2E] bg-[#0B0D17]/80 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#12141F] border border-[#1C1E2E] w-[380px] text-[13px] text-[#6B7280] cursor-text hover:border-[#2a2d3e] transition-colors">
        <Search className="w-4 h-4" />
        <span>Search anything (datasets, projects, insights...)</span>
        <span className="ml-auto flex items-center gap-0.5 text-[11px] text-[#4B5563] border border-[#1C1E2E] rounded px-1.5 py-0.5">
          <span>⌘</span><span>K</span>
        </span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1">
        <button className="p-2 rounded-lg text-[#6B7280] hover:text-[#D1D5DB] hover:bg-white/[0.04] transition-colors">
          <HelpCircle className="w-[18px] h-[18px]" />
        </button>
        <button className="p-2 rounded-lg text-[#6B7280] hover:text-[#D1D5DB] hover:bg-white/[0.04] transition-colors relative">
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#EF4444] rounded-full" />
        </button>
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-lg text-[#6B7280] hover:text-[#D1D5DB] hover:bg-white/[0.04] transition-colors"
        >
          {theme === "dark" ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
        </button>
      </div>
    </header>
  );
}
