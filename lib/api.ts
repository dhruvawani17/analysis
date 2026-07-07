import { auth } from "./firebase";

const isProd = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
const API_PREFIX = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { ...options?.headers as Record<string, string> };
  const isFormData = options?.body instanceof FormData;
  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const user = auth.currentUser;
  if (user?.uid) {
    headers["X-Firebase-UID"] = user.uid;
  }

  const res = await fetch(`${API_PREFIX}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status}: ${body}`);
  }
  return res.json();
}
