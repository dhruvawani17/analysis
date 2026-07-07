"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function EmailLinkHandler() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "prompt" | "error">("loading");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isSignInWithEmailLink(auth, window.location.href)) {
      setStatus("error");
      setError("Invalid sign-in link. Please request a new one.");
      return;
    }

    const storedEmail = window.localStorage.getItem("emailForSignIn");
    if (storedEmail) {
      setEmail(storedEmail);
      completeSignIn(storedEmail);
    } else {
      setStatus("prompt");
    }
  }, []);

  async function completeSignIn(emailAddress: string) {
    try {
      setStatus("loading");
      await signInWithEmailLink(auth, emailAddress, window.location.href);
      window.localStorage.removeItem("emailForSignIn");
      router.push("/home");
    } catch (err: any) {
      setStatus("error");
      if (err.code === "auth/invalid-action-code") {
        setError("This link has expired or already been used. Please request a new one.");
      } else if (err.code === "auth/user-disabled") {
        setError("This account has been disabled.");
      } else {
        setError("Failed to sign in. Please try again.");
      }
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (email) completeSignIn(email);
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#050608] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#4F46E5] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#A1A1AA]" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>Signing you in...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-[#050608] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#EF4444]/15 flex items-center justify-center mx-auto mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#F8FAFC] mb-2" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>Link invalid</h1>
          <p className="text-sm text-[#A1A1AA] mb-6">{error}</p>
          <a
            href="/sign-in"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-semibold transition-colors"
            style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}
          >
            Back to Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050608] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#4F46E5]/15 flex items-center justify-center mx-auto mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M22 7l-10 7L2 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#F8FAFC] mb-2" style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}>Confirm your email</h1>
          <p className="text-sm text-[#A1A1AA]">
            Enter the email you used to request the link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            className="w-full h-11 px-3 rounded-lg bg-[#18181b] border border-[#27272a] text-[#F8FAFC] text-sm placeholder-[#52525b] focus:outline-none focus:border-[#4F46E5] transition-colors"
            style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}
          />
          <button
            type="submit"
            className="w-full h-11 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-semibold transition-colors"
            style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}
          >
            Complete Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
