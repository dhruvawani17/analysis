const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { ...options?.headers as Record<string, string> };
  const isFormData = options?.body instanceof FormData;
  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status}: ${body}`);
  }
  return res.json();
}

export const api = {
  health: () => request<{ status: string }>("/api/health"),

  datasets: {
    list: () =>
      request<Array<{ id: number; name: string; rows: number | null; columns: number | null; created_at: string }>>("/api/datasets/"),
    get: (id: number) => request<import("./types").DatasetSummary>(`/api/datasets/${id}`),
    upload: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return request<{ id: number; name: string; status: string }>("/api/datasets/upload", {
        method: "POST",
        body: form,
      });
    },
    downloadUrl: (id: number, format: "csv" | "json" = "csv") =>
      `${BASE_URL}/api/datasets/${id}/download?format=${format}`,
  },

  analysis: {
    analyze: (datasetId: number) =>
      request<Record<string, unknown>>(`/api/analysis/analyze/${datasetId}`, { method: "POST" }),
    run: (datasetId: number) =>
      request<Record<string, unknown>>(`/api/analysis/run/${datasetId}`, { method: "POST" }),
    status: (datasetId: number) =>
      request<{ dataset_id: number; status: string }>(`/api/analysis/status/${datasetId}`),
  },

  qa: {
    ask: (datasetId: number, question: string) =>
      request<import("./types").QuestionResponse>(`/api/qa/ask/${datasetId}`, {
        method: "POST",
        body: JSON.stringify({ question }),
      }),
  },

  ml: {
    columns: (datasetId: number) =>
      request<{ eligible_columns: Array<{ name: string; dtype: string; unique: number; problem_type: string }>; all_columns: string[]; dtypes: Record<string, string> }>(`/api/ml/columns/${datasetId}`),
    train: (datasetId: number, targetColumn: string) =>
      request<import("./types").MLResult>(`/api/ml/train/${datasetId}`, {
        method: "POST",
        body: JSON.stringify({ target_column: targetColumn }),
      }),
  },

  reports: {
    generate: (datasetId: number) =>
      request<{ html: string; dataset_id: number }>(`/api/reports/generate/${datasetId}`, { method: "POST" }),
    downloadUrl: (datasetId: number, format = "pdf") =>
      `${BASE_URL}/api/reports/download/${datasetId}?format=${format}`,
  },
};
