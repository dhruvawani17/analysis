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
    format?: string;
    trend?: {
      direction: string;
      pct: number;
      label: string;
      sparkline?: Array<Record<string, unknown>>;
    };
    sparkline?: Array<Record<string, unknown>>;
    icon: string;
    color: number;
    source_column?: string;
    extra?: Record<string, number>;
  }>;
  charts: Array<{
    type: string;
    title: string;
    x?: string;
    y?: string;
    columns?: string[];
    description?: string;
    plotly?: Record<string, unknown>;
  }>;
  rendered_charts?: Array<{
    type: string;
    title: string;
    x?: string;
    y?: string;
    columns?: string[];
    description?: string;
    plotly?: Record<string, unknown>;
    section?: string;
  }>;
  sections?: Array<{
    title: string;
    charts: number[];
    icon?: string;
    description?: string;
  }>;
  insights?: string[];
  ai_insights?: Array<{
    type: "success" | "error" | "warning" | "info";
    message: string;
    icon: string;
  }>;
  recommendations?: Array<{
    action: string;
    reason: string;
    impact: string;
    category: string;
  }>;
  detective_issues?: Array<{
    column: string;
    type: string;
    count: number;
    total: number;
    pct: number;
    severity: "critical" | "warning" | "info";
    suggested_fix: string;
    confidence: number;
  }>;
  story_segments?: Array<{
    chapter: string;
    narrative: string;
  }>;
  outlier_data?: Record<string, { count: number; pct: number; total: number }>;
  data_quality?: {
    overall: number;
    completeness: number;
    consistency: number;
    uniqueness: number;
    validity: number;
    accuracy: number;
  };
  ai_health_score?: number;
  feature_importance?: Array<{
    feature: string;
    importance: number;
    direction: string;
  }>;
  ml_summary?: {
    target_column: string;
    best_model: string;
    best_score?: number;
    ml_available: boolean;
  } | null;
  prediction_summary?: {
    has_prediction: boolean;
  };
  geo_data?: {
    columns: string[];
    count: number;
  } | null;
  filters: Array<{
    column: string;
    type: string;
  }>;
  layout: string;
  columns?: number;
  total_charts?: number;
  total_kpis?: number;
  dataset_summary?: {
    records: number;
    columns: number;
    numeric: number;
    categorical: number;
    dates: number;
    missing_pct: number;
    duplicate_pct: number;
    data_quality_score?: number;
    health_score?: number;
  };
  executive_summary?: string;
  swot?: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  risks?: Array<{
    risk: string;
    likelihood: string;
    impact: string;
    score: number;
    mitigation: string;
    urgency: string;
  }>;
  decisions?: Array<{
    question: string;
    recommendation: string;
    rationale: string;
    confidence: string;
  }>;
  trends?: Array<{
    metric: string;
    direction: string;
    change_pct: number;
    label: string;
    current: string;
    average: string;
    min: string;
    max: string;
    status: string;
  }>;
  benchmarks?: Array<{
    metric: string;
    value: number;
    benchmark: number;
    status: "above" | "below";
    note: string;
  }>;
  action_items?: Array<{
    action: string;
    priority: number;
    impact: string;
    urgency: string;
    category: string;
  }>;
}
