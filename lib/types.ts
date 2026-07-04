export interface DatasetSummary {
  id: number;
  name: string;
  rows: number | null;
  columns: number | null;
  column_names: string[];
  dtypes: Record<string, string>;
  created_at: string;
  cleaned: boolean;
}

export interface DatasetListItem {
  id: number;
  name: string;
  rows: number | null;
  columns: number | null;
  created_at: string;
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
  llm_analysis?: {
    summary: string;
    key_findings: any[];
    predictions: any[];
    recommendations: any[];
    risk_factors: any[];
  };
  data_improvements?: {
    suggestions: any[];
    applied: string[];
    details: Record<string, unknown>;
  };
  feature_engineering?: {
    applied: string[];
    reasons: string[];
  };
}

export interface CopilotMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  tool_results?: ToolResult[];
  suggestions?: string[];
}

export interface ToolResult {
  tool: string;
  status: "success" | "error" | "partial";
  summary: string;
  what_changed: string[];
  why: string;
  expected_impact: string;
  confidence: number;
  metrics_before: Record<string, unknown>;
  metrics_after: Record<string, unknown>;
  suggestions: string[];
  data: Record<string, unknown>;
  charts: Record<string, unknown>;
}

export interface CopilotContext {
  dataset_id: number;
  dataset_name: string;
  rows: number;
  columns: number;
  column_names: string[];
  dtypes: Record<string, string>;
  cleaned: boolean;
  eda_completed: boolean;
  ml_completed: boolean;
  dashboard_generated: boolean;
  key_metrics: Record<string, unknown>;
  tool_history: Array<{
    tool: string;
    status: string;
    started_at: string | null;
  }>;
}

export interface CopilotChatResponse {
  response: string;
  conversation_id: string;
  tool_results: ToolResult[];
  suggestions: string[];
  proactive_insights: Array<{
    type: string;
    message: string;
    suggestion: string;
    confidence: number;
  }>;
  context: {
    dataset_name: string;
    cleaned: boolean;
    eda_completed: boolean;
    ml_completed: boolean;
    dashboard_generated: boolean;
    key_metrics: Record<string, unknown>;
  };
}

export interface PlanStep {
  tool: string;
  reason: string;
  time_estimate: number;
  params: Record<string, unknown>;
}

export interface AnalysisPlan {
  dataset_summary: string;
  issues: Array<{
    type: string;
    severity: string;
    message: string;
    columns?: string[];
  }>;
  opportunities: Array<{
    type: string;
    message: string;
    columns?: string[];
  }>;
  steps: PlanStep[];
  total_time_estimate: number;
}

export interface DashboardConfig {
  title: string;
  kpis: Array<{
    name: string;
    value: string;
    trend?: string;
    icon: string;
    color: string;
  }>;
  charts: Array<{
    type: string;
    title: string;
    x?: string;
    y?: string;
    columns?: string[];
    description?: string;
  }>;
  filters: Array<{
    column: string;
    type: string;
  }>;
  layout: string;
}
