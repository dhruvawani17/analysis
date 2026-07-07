"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendSignInLinkToEmail,
} from "firebase/auth";
import { auth, googleProvider, getEmailLinkActionCodeSettings } from "@/lib/firebase";

type AuthMode = "password" | "link";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [mode, setMode] = useState<AuthMode>("password");

  async function handleEmailSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "link") {
        const actionCodeSettings = getEmailLinkActionCodeSettings();
        await sendSignInLinkToEmail(auth, email, actionCodeSettings);
        window.localStorage.setItem("emailForSignIn", email);
        setLinkSent(true);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        router.push("/home");
      }
    } catch (err: any) {
      if (mode === "link") {
        setError(err.code === "auth/invalid-email" ? "Invalid email address" : "Failed to send sign-in link");
      } else {
        if (err.code === "auth/email-already-in-use") setError("Email already in use");
        else if (err.code === "auth/weak-password") setError("Password must be at least 6 characters");
        else setError("Failed to create account");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    try {
      await signInWithPopup(auth, googleProvider);
      router.push("/home");
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") setError("Failed to sign in with Google");
    }
  }

  if (linkSent) {
    return (
      <div className="min-h-screen bg-[#050608] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#4F46E5]/15 flex items-center justify-center mx-auto mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 7L2 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#F8FAFC] mb-2" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>Check your email</h1>
          <p className="text-sm text-[#A1A1AA] mb-6">We sent a sign-in link to<br /><span className="font-medium text-[#F8FAFC]">{email}</span></p>
          <p className="text-xs text-[#52525b] mb-6">Open the link in the same browser to complete sign-in.</p>
          <button onClick={() => { setLinkSent(false); setEmail(""); }} className="text-sm text-[#6366F1] hover:text-[#818CF8] font-medium transition-colors"
            style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>← Back to sign up</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050608] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-lg bg-[#4F46E5] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-lg font-bold text-[#F8FAFC]" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>DATANEX AI</span>
          </Link>
          <h1 className="text-2xl font-bold text-[#F8FAFC]" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>Create your account</h1>
          <p className="text-sm text-[#A1A1AA] mt-1">Start analyzing your data today</p>
        </div>

        <button onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 h-11 rounded-lg border border-[#27272a] bg-[#18181b] hover:bg-[#27272a] text-[#F8FAFC] text-sm font-medium transition-colors mb-4"
          style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#27272a]" /></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#050608] px-2 text-[#52525b]">or</span></div>
        </div>

        <div className="flex rounded-lg bg-[#18181b] border border-[#27272a] p-0.5 mb-4">
          {([
            { key: "password" as AuthMode, label: "Password" },
            { key: "link" as AuthMode, label: "Email Link" },
          ]).map((m) => (
            <button key={m.key} onClick={() => { setMode(m.key); setError(""); }}
              className={`flex-1 py-1.5 text-[13px] font-medium rounded-md transition-all ${
                mode === m.key ? "bg-[#4F46E5] text-white shadow-sm" : "text-[#A1A1AA] hover:text-[#F8FAFC]"
              }`} style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>
              {m.label}
            </button>
          ))}
        </div>

        {/* Password */}
        {mode === "password" && (
          <form onSubmit={handleEmailSignUp} className="space-y-3">
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full h-11 px-3 rounded-lg bg-[#18181b] border border-[#27272a] text-[#F8FAFC] text-sm placeholder-[#52525b] focus:outline-none focus:border-[#4F46E5] transition-colors"
              style={{ fontFamily: "'General Sans', system-ui, sans-serif" }} />
            <input type="password" placeholder="Password (min 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
              className="w-full h-11 px-3 rounded-lg bg-[#18181b] border border-[#27272a] text-[#F8FAFC] text-sm placeholder-[#52525b] focus:outline-none focus:border-[#4F46E5] transition-colors"
              style={{ fontFamily: "'General Sans', system-ui, sans-serif" }} />
            {error && <p className="text-xs text-[#EF4444]">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full h-11 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-semibold transition-colors disabled:opacity-50"
              style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>
        )}

        {/* Link */}
        {mode === "link" && (
          <form onSubmit={handleEmailSignUp} className="space-y-3">
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full h-11 px-3 rounded-lg bg-[#18181b] border border-[#27272a] text-[#F8FAFC] text-sm placeholder-[#52525b] focus:outline-none focus:border-[#4F46E5] transition-colors"
              style={{ fontFamily: "'General Sans', system-ui, sans-serif" }} />
            {error && <p className="text-xs text-[#EF4444]">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full h-11 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-semibold transition-colors disabled:opacity-50"
              style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>
              {loading ? "Sending link..." : "Send Sign-In Link"}
            </button>
            <p className="text-center text-[11px] text-[#52525b]">We&apos;ll email you a link to sign in — no password needed.</p>
          </form>
        )}

        <p className="text-center text-sm text-[#A1A1AA] mt-6" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>
          Already have an account?{" "}
          <Link href="/sign-in" className="text-[#6366F1] hover:text-[#818CF8] font-medium transition-colors">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
