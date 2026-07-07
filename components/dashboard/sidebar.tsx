"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  Home,
  FolderOpen,
  Database,
  LayoutDashboard,
  Bot,
  BrainCircuit,
  FileBarChart,
  Rocket,
  Settings,
  Plug,
  Users,
  Crown,
  LogOut,
  ChevronDown,
} from "lucide-react";

const navItems = [
  { label: "Home", href: "/home", icon: Home },
  { label: "Projects", href: "/home/projects", icon: FolderOpen },
  { label: "Datasets", href: "/home/datasets", icon: Database },
  { label: "Dashboards", href: "/home/dashboards", icon: LayoutDashboard },
  { label: "AI Copilot", href: "/home/copilot", icon: Bot, badge: "New" },
  { label: "Models", href: "/home/models", icon: BrainCircuit },
  { label: "Reports", href: "/home/reports", icon: FileBarChart },
  { label: "Deploy", href: "/home/deploy", icon: Rocket },
];

const bottomNavItems = [
  { label: "Settings", href: "/home/settings", icon: Settings },
  { label: "Integrations", href: "/home/integrations", icon: Plug },
  { label: "Team", href: "/home/team", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOut(auth);
    router.push("/");
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[220px] bg-[#0B0D17] border-r border-[#1C1E2E] flex flex-col z-40">
      {/* Logo */}
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-[#1C1E2E]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <span className="text-[15px] font-bold text-[#F0F0F5]" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>
          DATANEX AI
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                active
                  ? "bg-[#4F46E5]/15 text-[#818CF8]"
                  : "text-[#6B7280] hover:text-[#D1D5DB] hover:bg-white/[0.03]"
              }`}
              style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}
            >
              <item.icon className="w-[18px] h-[18px]" strokeWidth={active ? 2 : 1.5} />
              {item.label}
              {item.badge && (
                <span className="ml-auto text-[10px] font-semibold bg-[#4F46E5] text-white px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-2 space-y-0.5">
        {bottomNavItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                active
                  ? "bg-[#4F46E5]/15 text-[#818CF8]"
                  : "text-[#6B7280] hover:text-[#D1D5DB] hover:bg-white/[0.03]"
              }`}
              style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}
            >
              <item.icon className="w-[18px] h-[18px]" strokeWidth={1.5} />
              {item.label}
            </Link>
          );
        })}

        {/* Premium */}
        <div className="mt-3 p-3 rounded-xl bg-gradient-to-br from-[#1a1535] to-[#13102a] border border-[#2a2545]">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Crown className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span className="text-[12px] font-semibold text-[#F0F0F5]" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>
              Premium Plan
            </span>
          </div>
          <p className="text-[11px] text-[#6B7280] mb-2">10 days left</p>
          <div className="w-full h-1.5 bg-[#1C1E2E] rounded-full mb-1.5">
            <div className="h-full w-[80%] bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] rounded-full" />
          </div>
          <p className="text-[10px] text-[#6B7280] mb-2.5">80% of monthly usage</p>
          <button className="w-full py-1.5 rounded-lg border border-[#4F46E5]/40 text-[12px] font-medium text-[#818CF8] hover:bg-[#4F46E5]/10 transition-colors"
            style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>
            Upgrade Plan
          </button>
        </div>

        {/* User */}
        {user && (
          <div className="flex items-center gap-2.5 px-2 py-2.5 mt-1 rounded-lg hover:bg-white/[0.03] cursor-pointer transition-colors">
            <div className="w-8 h-8 rounded-full bg-[#4F46E5] flex items-center justify-center overflow-hidden">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-xs font-bold">{(user.email?.[0] || "U").toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-[#D1D5DB] truncate">
                {user.displayName || user.email?.split("@")[0] || "User"}
              </p>
              <p className="text-[11px] text-[#6B7280] truncate">{user.email}</p>
            </div>
            <button onClick={handleSignOut} className="text-[#6B7280] hover:text-[#D1D5DB] transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
