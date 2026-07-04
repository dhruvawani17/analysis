export interface DatasetSummary {
  id: number;
  name: string;
  rows: number | null;
  columns: number | null;
  column_names: string[];
  dtypes: Record<string, string>;
  created_at: string;
}

export interface DatasetListItem {
  id: number;
  name: string;
  rows: number | null;
  columns: number | null;
  created_at: string;
}

export interface EDAProfile {
  shape: [number, number];
  columns: string[];
  dtypes: Record<string, string>;
  numeric_columns: string[];
  categorical_columns: string[];
  stats: Record<string, {
    mean?: number;
    std?: number;
    min?: number;
    max?: number;
    median?: number;
    missing: number;
  }>;
  missing_summary: Record<string, number>;
  correlation: Record<string, Record<string, number>>;
}

export interface QuestionRequest {
  question: string;
}

export interface QuestionResponse {
  answer: string;
  code?: string;
  pandas_code?: string;
  chart_json?: Record<string, unknown>;
}

export interface MLRequest {
  target_column: string;
  problem_type?: string;
}

export interface MLResult {
  problem_type: string;
  best_model: string;
  best_score?: number;
  all_results: Array<Record<string, unknown>>;
  num_features: number;
  num_samples: number;
}
