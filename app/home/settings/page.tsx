"use client";

import { Settings, Key, Moon, Bell, Globe } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="max-w-[700px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[20px] font-bold text-[#F0F0F5]" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>Settings</h1>
        <p className="text-[13px] text-[#6B7280] mt-0.5">Manage your account and preferences</p>
      </div>

      <div className="space-y-4">
        {[
          { icon: Key, label: "API Keys", desc: "Manage your API keys for LLM providers", action: "Configure" },
          { icon: Bell, label: "Notifications", desc: "Control email and push notifications", action: "Manage" },
          { icon: Globe, label: "Language", desc: "Set your preferred language", action: "English" },
          { icon: Moon, label: "Appearance", desc: "Switch between dark and light mode", action: "Dark" },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between p-4 rounded-xl border border-[#1C1E2E] bg-[#12141F] hover:border-[#2a2d3e] transition-all">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#4F46E5]/15 flex items-center justify-center">
                <item.icon className="w-4 h-4 text-[#6366F1]" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#F0F0F5]" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>{item.label}</p>
                <p className="text-[12px] text-[#6B7280]">{item.desc}</p>
              </div>
            </div>
            <button className="text-[12px] font-medium text-[#6366F1] hover:text-[#818CF8] transition-colors px-3 py-1.5 rounded-lg border border-[#1C1E2E] hover:border-[#4F46E5]/30"
              style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>
              {item.action}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
