import { auth } from "./firebase";

const API_PREFIX = "/api";
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

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

export const api = {
  health: () => request<{ status: string }>("/health"),

  datasets: {
    list: () =>
      request<Array<{ id: number; name: string; rows: number | null; columns: number | null; created_at: string }>>("/datasets"),
    get: (id: number) => request<import("./types").DatasetSummary>(`/datasets/${id}`),
    upload: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const headers: Record<string, string> = {};
      const user = auth.currentUser;
      if (user?.uid) headers["X-Firebase-UID"] = user.uid;
      // Bypass Next.js proxy for large uploads (avoids 10MB limit)
      const url = BACKEND_URL ? `${BACKEND_URL}/api/datasets/upload` : `${API_PREFIX}/datasets/upload`;
      return fetch(url, { method: "POST", body: form, headers }).then(async (res) => {
        if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
        return res.json();
      });
    },
    clean: (id: number) =>
      request<{ dataset_id: number; cleaning: Record<string, unknown>; rows: number; columns: number }>(`/datasets/clean/${id}`, {
        method: "POST",
      }),
    delete: (id: number) =>
      request<{ status: string; dataset_id: number }>(`/datasets/${id}`, {
        method: "DELETE",
      }),
    downloadUrl: (id: number, format: "csv" | "json" = "csv") =>
      `${API_PREFIX}/datasets/${id}/download?format=${format}`,
  },

  analysis: {
    analyze: (datasetId: number) =>
      request<Record<string, unknown>>(`/analysis/analyze/${datasetId}`, { method: "POST" }),
    run: (datasetId: number) =>
      request<Record<string, unknown>>(`/analysis/run/${datasetId}`, { method: "POST" }),
    status: (datasetId: number) =>
      request<{ dataset_id: number; status: string }>(`/analysis/status/${datasetId}`),
  },

  qa: {
    ask: (datasetId: number, question: string) =>
      request<import("./types").QuestionResponse>(`/qa/ask/${datasetId}`, {
        method: "POST",
        body: JSON.stringify({ question }),
      }),
  },

  ml: {
    columns: (datasetId: number) =>
      request<{ eligible_columns: Array<{ name: string; dtype: string; unique: number; problem_type: string }>; all_columns: string[]; dtypes: Record<string, string> }>(`/ml/columns/${datasetId}`),
    train: (datasetId: number, targetColumn: string) =>
      request<import("./types").MLResult>(`/ml/train/${datasetId}`, {
        method: "POST",
        body: JSON.stringify({ target_column: targetColumn }),
      }),
  },

  reports: {
    generate: (datasetId: number) =>
      request<{ html: string; dataset_id: number }>(`/reports/generate/${datasetId}`, { method: "POST" }),
    downloadUrl: (datasetId: number, format = "pdf") =>
      `${API_PREFIX}/reports/download/${datasetId}?format=${format}`,
  },

  copilot: {
    chat: (datasetId: number, message: string, conversationId?: string) =>
      request<import("./types").CopilotChatResponse>(`/copilot/chat/${datasetId}`, {
        method: "POST",
        body: JSON.stringify({ message, conversation_id: conversationId }),
      }),
    getContext: (datasetId: number) =>
      request<import("./types").CopilotContext>(`/copilot/context/${datasetId}`),
    getHistory: (datasetId: number) =>
      request<{ conversation_id: string; messages: import("./types").CopilotMessage[] }>(`/copilot/history/${datasetId}`),
    clearHistory: (datasetId: number) =>
      request<{ status: string }>(`/copilot/history/${datasetId}`, { method: "DELETE" }),
    plan: (datasetId: number) =>
      request<import("./types").AnalysisPlan>(`/copilot/plan/${datasetId}`, { method: "POST" }),
    runPlan: (datasetId: number, tools?: string[]) =>
      request<{ conversation_id: string; results: import("./types").ToolResult[]; summary: string }>(`/copilot/run-plan/${datasetId}`, {
        method: "POST",
        body: JSON.stringify({ tools }),
      }),
    tools: () =>
      request<{ categories: Record<string, Array<{ name: string; description: string; category: string; estimated_time: number }>> }>("/copilot/tools"),
  },

  multisheet: {
    execute: (datasetId: number, body: {
      action: string;
      left_sheet?: string | null;
      right_sheet?: string | null;
      join_column?: string | null;
      join_how?: string;
    }) =>
      request<import("./types").MultisheetExecuteResult>(`/datasets/${datasetId}/multisheet/execute`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },

  dashboard: {
    get: (datasetId: number) =>
      request<{ config: import("./types").DashboardConfig }>(`/dashboard/${datasetId}`),
    generate: (datasetId: number) =>
      request<{ config: import("./types").DashboardConfig }>(`/dashboard/generate/${datasetId}`, { method: "POST" }),
  },
};
