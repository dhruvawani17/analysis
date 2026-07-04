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
import { ArrowLeft, Brain, Loader2, Trophy, BarChart3, Target, Hash, Sparkles } from "lucide-react";
import { api } from "@/lib/api";

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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50">
      {/* Header */}
      <header className="border-b border-indigo-100 bg-white/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto flex items-center gap-4 py-4 px-6">
          <Link href={`/datasets/${id}`}>
            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-indigo-50">
              <ArrowLeft className="h-4 w-4 text-indigo-600" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">Auto ML</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6 max-w-5xl space-y-6">
        {/* Target Selection */}
        <Card className="bg-white/80 border-indigo-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-5 w-5 text-violet-500" />
              Select Target Column
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">
              Choose a column to predict. The system will automatically detect the problem type
              and train multiple models for comparison.
            </p>

            {colsLoading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading columns...
              </div>
            ) : columns ? (
              <div className="flex items-end gap-4">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium text-gray-700">Target Column</label>
                  <Select value={targetColumn} onValueChange={(v) => v && setTargetColumn(v)}>
                    <SelectTrigger className="border-indigo-200 focus:ring-indigo-500">
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
                                  : "border-indigo-200 text-indigo-600 bg-indigo-50"
                              }`}
                            >
                              {col.problem_type === "classification" ? `${col.unique} classes` : col.dtype}
                            </Badge>
                          </span>
                        </SelectItem>
                      ))}
                      {columns.eligible_columns.length === 0 && (
                        <p className="px-2 py-1 text-xs text-gray-400">No eligible columns</p>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => trainMutation.mutate(targetColumn)}
                  disabled={!targetColumn || trainMutation.isPending}
                  className="gap-2 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 shadow-lg shadow-violet-200"
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
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
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
              <Card className="bg-gradient-to-br from-violet-500 to-purple-500 text-white border-0 shadow-lg shadow-violet-200">
                <CardContent className="p-6 text-center">
                  <Trophy className="h-8 w-8 mx-auto mb-2 opacity-90" />
                  <p className="text-2xl font-bold">{result.best_model || "N/A"}</p>
                  <p className="text-xs text-violet-100 mt-1">Best Model</p>
                </CardContent>
              </Card>
              <Card className="bg-white/80 border-indigo-100">
                <CardContent className="p-6 text-center">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center mx-auto mb-2">
                    <BarChart3 className="h-5 w-5 text-indigo-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{result.best_score ?? "-"}</p>
                  <p className="text-xs text-gray-500 mt-1">Best Score</p>
                </CardContent>
              </Card>
              <Card className="bg-white/80 border-indigo-100">
                <CardContent className="p-6 text-center">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center mx-auto mb-2">
                    <Hash className="h-5 w-5 text-violet-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{result.num_features}</p>
                  <p className="text-xs text-gray-500 mt-1">Features</p>
                </CardContent>
              </Card>
            </div>

            {/* Model Comparison */}
            <Card className="bg-white/80 border-indigo-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-5 w-5 text-violet-500" />
                  Model Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-indigo-100">
                      <TableHead className="text-indigo-700">Model</TableHead>
                      <TableHead className="text-indigo-700">Test Score</TableHead>
                      <TableHead className="text-indigo-700">CV Mean</TableHead>
                      <TableHead className="text-indigo-700">CV Std</TableHead>
                      <TableHead className="text-indigo-700">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.all_results?.map((r: any) => (
                      <TableRow
                        key={r.model}
                        className={`border-indigo-50 ${
                          r.model === result.best_model ? "bg-gradient-to-r from-violet-50 to-purple-50" : "hover:bg-indigo-50/50"
                        }`}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {r.model}
                            {r.model === result.best_model && (
                              <Badge className="bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0 text-[10px]">
                                Best
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {r.test_score != null ? (
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 rounded-full bg-gray-100 overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-indigo-400 to-violet-500 rounded-full"
                                  style={{ width: `${Math.min(100, Math.max(0, r.test_score * 100))}%` }}
                                />
                              </div>
                              <span className="text-sm">{r.test_score}</span>
                            </div>
                          ) : "-"}
                        </TableCell>
                        <TableCell>{r.cv_mean ?? "-"}</TableCell>
                        <TableCell>{r.cv_std ?? "-"}</TableCell>
                        <TableCell>
                          {r.error ? (
                            <Badge variant="destructive" className="text-xs">Error</Badge>
                          ) : (
                            <Badge className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">OK</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
