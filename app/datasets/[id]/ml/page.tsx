"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Brain, Loader2, Trophy, BarChart3, Target, Hash, Sparkles, Wand2 } from "lucide-react";
import { api } from "@/lib/api";
import { ThemeToggle } from "@/components/ui/theme-toggle";

function extractText(item: any): string {
  if (typeof item === "string") return item;
  if (item && typeof item === "object") {
    return item.text || item.finding || item.prediction || item.recommendation || item.risk_factor || JSON.stringify(item);
  }
  return String(item);
}

export default function MLPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const datasetId = parseInt(id, 10);

  const [targetColumn, setTargetColumn] = useState("");
  const [result, setResult] = useState<Record<string, any> | null>(null);

  const { data: columns, isLoading: colsLoading } = useQuery({
    queryKey: ["ml-columns", datasetId],
    queryFn: () => api.ml.columns(datasetId),
  });

  const trainMutation = useMutation({
    mutationFn: (target: string) => api.ml.train(datasetId, target),
    onSuccess: (data: any) => setResult(data),
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl dark:bg-slate-900/70 sticky top-0 z-50">
        <div className="container mx-auto flex items-center gap-4 py-4 px-6">
          <Link href={`/datasets/${id}`}>
            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-accent">
              <ArrowLeft className="h-4 w-4 text-primary" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br bg-primary flex items-center justify-center">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold text-foreground">Auto ML</h1>
          </div>
        <ThemeToggle />
          </div>
      </header>

      <main className="container mx-auto px-6 py-6 max-w-5xl space-y-6">
        {/* Target Selection */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-5 w-5 text-violet-500" />
              Select Target Column
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Choose a column to predict. The system will automatically detect the problem type
              and train multiple models for comparison.
            </p>

            {colsLoading ? (
              <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading columns...
              </div>
            ) : columns ? (
              <div className="flex items-end gap-4">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Target Column</label>
                  <Select value={targetColumn} onValueChange={(v) => v && setTargetColumn(v)}>
                    <SelectTrigger className="border-indigo-200 dark:border-slate-700 focus:ring-indigo-500">
                      <SelectValue placeholder="Select a column to predict" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.eligible_columns.map((col: { name: string; dtype: string; unique: number; problem_type: string }) => (
                        <SelectItem key={col.name} value={col.name}>
                          <span className="flex items-center gap-2">
                            {col.name}
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                col.problem_type === "classification"
                                  ? "border-violet-200 text-violet-600 bg-violet-50"
                                  : "border-indigo-200 dark:border-slate-700 text-primary bg-indigo-50"
                              }`}
                            >
                              {col.problem_type === "classification" ? `${col.unique} classes` : col.dtype}
                            </Badge>
                          </span>
                        </SelectItem>
                      ))}
                      {columns.eligible_columns.length === 0 && (
                        <p className="px-2 py-1 text-xs text-gray-400 dark:text-slate-500 dark:text-slate-400">No eligible columns</p>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => trainMutation.mutate(targetColumn)}
                  disabled={!targetColumn || trainMutation.isPending}
                  className="gap-2 bg-gradient-to-r bg-primary hover:from-violet-600 hover:to-purple-600 shadow-lg shadow-violet-200"
                >
                  {trainMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Brain className="h-4 w-4" />
                  )}
                  {trainMutation.isPending ? "Training..." : "Train Models"}
                </Button>
              </div>
            ) : null}

            {trainMutation.error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
                Error: {(trainMutation.error as Error).message}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="bg-gradient-to-br bg-primary text-white border-0 shadow-lg shadow-violet-200">
                <CardContent className="p-6 text-center">
                  <Trophy className="h-8 w-8 mx-auto mb-2 opacity-90" />
                  <p className="text-2xl font-bold">{result.best_model || "N/A"}</p>
                  <p className="text-xs text-violet-100 mt-1">Best Model</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-6 text-center">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center mx-auto mb-2">
                    <BarChart3 className="h-5 w-5 text-indigo-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{result.best_score ?? "-"}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Best Score</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-6 text-center">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center mx-auto mb-2">
                    <Hash className="h-5 w-5 text-violet-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{result.num_features}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Features</p>
                </CardContent>
              </Card>
            </div>

            {/* Feature Engineering Applied */}
            {result.feature_engineering && result.feature_engineering.applied && result.feature_engineering.applied.length > 0 && (
              <Card className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border-violet-200 dark:border-violet-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-foreground">
                    <Wand2 className="h-5 w-5 text-violet-500" />
                    Feature Engineering Applied
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {result.feature_engineering.reasons && result.feature_engineering.reasons.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-violet-600 dark:text-violet-400 mb-1.5">Why these features?</p>
                      {result.feature_engineering.reasons.map((reason: string, i: number) => (
                        <p key={i} className="text-sm text-gray-600 dark:text-slate-400">• {reason}</p>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {result.feature_engineering.applied.map((step: string, i: number) => (
                      <Badge key={i} className="bg-violet-100 text-violet-700 border-violet-200 text-xs">
                        {step}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Model Comparison */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-5 w-5 text-violet-500" />
                  Model Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-indigo-700 dark:text-indigo-300">Model</TableHead>
                      <TableHead className="text-indigo-700 dark:text-indigo-300">Test Score</TableHead>
                      <TableHead className="text-indigo-700 dark:text-indigo-300">CV Mean</TableHead>
                      <TableHead className="text-indigo-700 dark:text-indigo-300">CV Std</TableHead>
                      <TableHead className="text-indigo-700 dark:text-indigo-300">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.all_results?.map((r: any) => (
                      <TableRow
                        key={r.model}
                        className={`border-indigo-50 ${
                          r.model === result.best_model ? "bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/50 dark:to-purple-950/50" : "hover:bg-accent/50"
                        }`}
                      >
                        <TableCell className="font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            {r.model}
                            {r.model === result.best_model && (
                              <Badge className="bg-gradient-to-r bg-primary text-white border-0 text-[10px]">
                                Best
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground">
                          {r.test_score != null ? (
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-indigo-400 to-violet-500 rounded-full"
                                  style={{ width: `${Math.min(100, Math.max(0, r.test_score * 100))}%` }}
                                />
                              </div>
                              <span className="text-sm">{r.test_score}</span>
                            </div>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-foreground">{r.cv_mean ?? "-"}</TableCell>
                        <TableCell className="text-foreground">{r.cv_std ?? "-"}</TableCell>
                        <TableCell>
                          {r.error ? (
                            <Badge variant="destructive" className="text-xs">Error</Badge>
                          ) : (
                            <Badge className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200">OK</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Insights */}
            {result.insights && result.insights.length > 0 && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    Data Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.insights.map((insight: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-800">
                        <span className="text-amber-500 mt-0.5">•</span>
                        <span className="text-sm text-gray-700 dark:text-slate-300">{insight.message}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* LLM Analysis */}
            {result.llm_analysis && result.llm_analysis.summary && (
              <Card className="bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 border-indigo-200 dark:border-indigo-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-foreground">
                    <Brain className="h-5 w-5 text-indigo-500" />
                    AI Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <p className="text-sm leading-relaxed text-gray-700 dark:text-slate-300">{result.llm_analysis.summary}</p>

                  {result.llm_analysis.key_findings?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-800 dark:text-slate-200 mb-2">Key Findings</h4>
                      <div className="space-y-1.5">
                        {result.llm_analysis.key_findings.map((f: any, i: number) => (
                          <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-border">
                            <span className="text-indigo-500 mt-0.5">•</span>
                            <span className="text-sm text-gray-700 dark:text-slate-300">{extractText(f)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.llm_analysis.predictions?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-800 dark:text-slate-200 mb-2">Scenario Predictions</h4>
                      <div className="space-y-1.5">
                        {result.llm_analysis.predictions.map((p: any, i: number) => (
                          <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800">
                            <Target className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                            <span className="text-sm text-gray-700 dark:text-slate-300">{extractText(p)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.llm_analysis.recommendations?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-800 dark:text-slate-200 mb-2">Recommendations</h4>
                      <div className="space-y-1.5">
                        {result.llm_analysis.recommendations.map((r: any, i: number) => (
                          <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-violet-50/50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-800">
                            <Sparkles className="h-3.5 w-3.5 text-violet-500 mt-0.5 shrink-0" />
                            <span className="text-sm text-gray-700 dark:text-slate-300">{extractText(r)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.llm_analysis.risk_factors?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-800 dark:text-slate-200 mb-2">Risk Factors</h4>
                      <div className="space-y-1.5">
                        {result.llm_analysis.risk_factors.map((r: any, i: number) => (
                          <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-800">
                            <span className="text-amber-500 mt-0.5">⚠</span>
                            <span className="text-sm text-gray-700 dark:text-slate-300">{extractText(r)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

          </>
        )}
      </main>
    </div>
  );
}
