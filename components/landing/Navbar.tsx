"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useScrollPosition } from "@/src/hooks/useScrollPosition";
import { useAuth } from "@/components/auth-provider";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export function LandingNavbar() {
  const scrolled = useScrollPosition();
  const { user, loading } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOut(auth);
    router.push("/");
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#09090b]/80 backdrop-blur-xl border-b border-[#27272a]/50 shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div
          className={`mx-auto flex items-center justify-between transition-all duration-300 ${
            scrolled
              ? "h-12 my-2 bg-[#18181b]/90 backdrop-blur-xl border border-[#27272a]/70 rounded-full px-4 shadow-lg shadow-black/20"
              : "h-16 my-3 bg-[#18181b]/60 backdrop-blur-md border border-[#27272a]/30 rounded-full px-6"
          }`}
        >
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#4F46E5] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-base font-bold tracking-tight text-[#F8FAFC]" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>
              DATANEX AI
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {[
              { label: "Platform", href: "#platform" },
              { label: "Use Cases", href: "#features" },
              { label: "Pricing", href: "#pricing" },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="px-3 py-1.5 text-sm font-medium text-[#A1A1AA] hover:text-[#F8FAFC] transition-colors rounded-md hover:bg-white/5"
                style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#22C55E] font-medium" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
              AI Ready
            </div>

            {loading ? null : user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/home"
                  className="text-xs font-medium text-[#A1A1AA] hover:text-[#F8FAFC] transition-colors px-3 py-1.5"
                  style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}
                >
                  Dashboard
                </Link>
                <div className="w-7 h-7 rounded-full bg-[#4F46E5] flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (user.email?.[0] || "U").toUpperCase()
                  )}
                </div>
                <button
                  onClick={handleSignOut}
                  className="text-xs text-[#52525b] hover:text-[#A1A1AA] transition-colors"
                  style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/sign-in"
                  className="text-xs font-medium text-[#A1A1AA] hover:text-[#F8FAFC] transition-colors px-3 py-1.5"
                  style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold h-8 px-4 rounded-full transition-all"
                  style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}
                >
                  Start Free
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
