const isProd = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";
const API_PREFIX = isProd ? "/api/backend" : "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { ...options?.headers as Record<string, string> };
  const isFormData = options?.body instanceof FormData;
  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE_URL}${API_PREFIX}${path}`, { ...options, headers });
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
      return request<{ id: number; name: string; status: string }>("/datasets/upload", {
        method: "POST",
        body: form,
      });
    },
    clean: (id: number) =>
      request<{ dataset_id: number; cleaning: Record<string, unknown>; rows: number; columns: number }>(`/datasets/clean/${id}`, {
        method: "POST",
      }),
    downloadUrl: (id: number, format: "csv" | "json" = "csv") =>
      `${BASE_URL}${API_PREFIX}/datasets/${id}/download?format=${format}`,
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
      `${BASE_URL}${API_PREFIX}/reports/download/${datasetId}?format=${format}`,
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

  dashboard: {
    get: (datasetId: number) =>
      request<{ config: import("./types").DashboardConfig }>(`/dashboard/${datasetId}`),
    generate: (datasetId: number) =>
      request<{ config: import("./types").DashboardConfig }>(`/dashboard/generate/${datasetId}`, { method: "POST" }),
  },
};
