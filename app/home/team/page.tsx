"use client";

import { Users, UserPlus, Crown } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

export default function TeamPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-[700px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-bold text-[#F0F0F5]" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>Team</h1>
          <p className="text-[13px] text-[#6B7280] mt-0.5">Manage team members and permissions</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-[13px] font-semibold transition-colors"
          style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>
          <UserPlus className="w-4 h-4" /> Invite Member
        </button>
      </div>

      {/* Current user */}
      <div className="p-4 rounded-xl border border-[#1C1E2E] bg-[#12141F] mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#4F46E5] flex items-center justify-center overflow-hidden">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-sm font-bold">{(user?.email?.[0] || "U").toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-[#F0F0F5]">{user?.displayName || user?.email?.split("@")[0] || "You"}</p>
            <p className="text-[12px] text-[#6B7280]">{user?.email}</p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#F59E0B] bg-[#F59E0B]/10 px-2.5 py-1 rounded-full">
            <Crown className="w-3 h-3" /> Owner
          </div>
        </div>
      </div>

      {/* Upgrade nudge */}
      <div className="p-5 rounded-xl border border-[#4F46E5]/20 bg-[#4F46E5]/5 text-center">
        <Users className="w-8 h-8 text-[#6366F1] mx-auto mb-2" />
        <p className="text-[14px] font-semibold text-[#F0F0F5] mb-1" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>Invite your team</p>
        <p className="text-[12px] text-[#6B7280] mb-3">Collaborate on datasets and dashboards with your team members</p>
        <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-[13px] font-semibold transition-colors"
          style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>
          Upgrade to Pro
        </button>
      </div>
    </div>
  );
}
