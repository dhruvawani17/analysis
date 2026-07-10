"use client";

import { use, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  ArrowLeft,
  Bot,
  LayoutDashboard,
  Brain,
  FileText,
  BarChart3,
  Sparkles,
  Download,
  Wand2,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function DatasetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const datasetId = parseInt(id, 10);
  const queryClient = useQueryClient();

  const { data: dataset, isLoading } = useQuery({
    queryKey: ["dataset", datasetId],
    queryFn: () => api.datasets.get(datasetId),
  });

  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    cleaning: Record<string, unknown>;
    eda: Record<string, unknown>;
    ai_summary: string;
  } | null>(null);

  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanResult, setCleanResult] = useState<{
    cleaning: Record<string, unknown>;
    rows: number;
    columns: number;
  } | null>(null);

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await api.analysis.analyze(datasetId);
      setAnalysisResult(res as typeof analysisResult);
    } catch (e) {
      console.error("Analysis failed", e);
    } finally {
      setAnalyzing(false);
    }
  };

  const runCleaning = async () => {
    setIsCleaning(true);
    try {
      const res = await api.datasets.clean(datasetId);
      setCleanResult(res);
      queryClient.invalidateQueries({ queryKey: ["dataset", datasetId] });
    } catch (e) {
      console.error("Cleaning failed", e);
    } finally {
      setIsCleaning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-gray-500 dark:text-slate-400">Dataset not found</p>
      </div>
    );
  }

  const eda = analysisResult?.eda as Record<string, any> | undefined;
  const cleaning = analysisResult?.cleaning as Record<string, any> | undefined;
  const charts = eda?.charts as Record<string, any> | undefined;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl dark:bg-slate-900/70 sticky top-0 z-50">
        <div className="container mx-auto flex items-center gap-4 py-4 px-6">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-accent">
              <ArrowLeft className="h-4 w-4 text-primary" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground truncate">{dataset.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-xs bg-indigo-50 text-primary dark:bg-indigo-950 dark:text-indigo-400 border-0">
                {dataset.rows?.toLocaleString() ?? "?"} rows
              </Badge>
              <Badge variant="secondary" className="text-xs bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400 border-0">
                {dataset.columns} columns
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/datasets/${datasetId}/chat`}>
              <Button className="gap-1.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-lg shadow-indigo-200">
                <Bot className="h-4 w-4" />
                AI Copilot
              </Button>
            </Link>
            <a href={api.datasets.downloadUrl(datasetId, "csv")} download>
              <Button variant="outline" size="sm" className="gap-1.5 border-indigo-200 dark:border-slate-700 hover:bg-accent hover:border-indigo-300">
                <Download className="h-3.5 w-3.5" />
                CSV
              </Button>
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6 max-w-6xl">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-card backdrop-blur-sm dark:bg-slate-900/80 border border-border p-1 rounded-xl">
            <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="h-4 w-4 mr-1.5" />
              Overview
            </TabsTrigger>
          </TabsList>
          <div className="flex gap-1 bg-card backdrop-blur-sm dark:bg-slate-900/80 border border-border p-1 rounded-xl -mt-6 mb-6">
            <Link href={`/datasets/${datasetId}/chat`}>
              <Button variant="ghost" size="sm" className="gap-1.5 rounded-lg hover:bg-accent">
                <Bot className="h-4 w-4" />
                Chat
              </Button>
            </Link>
            <Link href={`/datasets/${datasetId}/dashboard`}>
              <Button variant="ghost" size="sm" className="gap-1.5 rounded-lg hover:bg-accent">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link href={`/datasets/${datasetId}/ml`}>
              <Button variant="ghost" size="sm" className="gap-1.5 rounded-lg hover:bg-accent">
                <Brain className="h-4 w-4" />
                Models
              </Button>
            </Link>
            <Link href={`/datasets/${datasetId}/report`}>
              <Button variant="ghost" size="sm" className="gap-1.5 rounded-lg hover:bg-accent">
                <FileText className="h-4 w-4" />
                Reports
              </Button>
            </Link>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Quick Actions */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Link href={`/datasets/${datasetId}/chat`}>
                <Card className="group hover:shadow-lg hover:shadow-indigo-100/50 transition-all duration-300 cursor-pointer h-full bg-card border-border hover:border-indigo-200 dark:border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br bg-primary flex items-center justify-center shadow-sm">
                        <Bot className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-slate-100 text-sm">AI Copilot</h3>
                        <p className="text-xs text-gray-500 dark:text-slate-400">Chat with your data</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href={`/datasets/${datasetId}/dashboard`}>
                <Card className="group hover:shadow-lg hover:shadow-indigo-100/50 transition-all duration-300 cursor-pointer h-full bg-card border-border hover:border-indigo-200 dark:border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-sm">
                        <LayoutDashboard className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-slate-100 text-sm">Dashboard</h3>
                        <p className="text-xs text-gray-500 dark:text-slate-400">AI-generated dashboard</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href={`/datasets/${datasetId}/ml`}>
                <Card className="group hover:shadow-lg hover:shadow-indigo-100/50 transition-all duration-300 cursor-pointer h-full bg-card border-border hover:border-indigo-200 dark:border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-sm">
                        <Brain className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-slate-100 text-sm">Models</h3>
                        <p className="text-xs text-gray-500 dark:text-slate-400">Train ML models</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href={`/datasets/${datasetId}/report`}>
                <Card className="group hover:shadow-lg hover:shadow-indigo-100/50 transition-all duration-300 cursor-pointer h-full bg-card border-border hover:border-indigo-200 dark:border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-sm">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-slate-100 text-sm">Reports</h3>
                        <p className="text-xs text-gray-500 dark:text-slate-400">Generate reports</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>

            {/* Clean Data Card */}
            {!cleanResult && !analysisResult && (
              <Card className="bg-card border-border overflow-hidden">
                <CardContent className="p-8 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mx-auto mb-4">
                    <Wand2 className="h-7 w-7 text-emerald-500" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-1">Clean your data first</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mb-5">
                    Fix missing values, remove duplicates, detect outliers, and standardize types
                  </p>
                  {dataset.cleaned ? (
                    <div className="flex items-center justify-center gap-2 text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm font-medium">Data already cleaned</span>
                    </div>
                  ) : (
                    <Button
                      onClick={runCleaning}
                      disabled={isCleaning}
                      size="lg"
                      className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-200"
                    >
                      {isCleaning ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Wand2 className="h-4 w-4" />
                      )}
                      {isCleaning ? "Cleaning..." : "Clean Data"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Cleaning Report */}
            {cleanResult && (
              <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-foreground">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    Data Cleaned Successfully
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {[
                      { label: "Original Rows", value: cleanResult.cleaning.original_rows },
                      { label: "Final Rows", value: cleanResult.cleaning.final_rows },
                      { label: "Duplicates Removed", value: cleanResult.cleaning.duplicates_removed },
                      { label: "Missing Fixed", value: cleanResult.cleaning.missing_fixed },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl bg-card p-4 text-center border border-emerald-100">
                        <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{String(item.value ?? "0")}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Run Analysis Button */}
            {!analysisResult && (
              <Card className="bg-card border-border overflow-hidden">
                <CardContent className="p-8 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="h-7 w-7 text-indigo-500" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-1">Ready to analyze</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mb-5">
                    Run a full analysis to get statistics, charts, and AI insights
                  </p>
                  <Button
                    onClick={runAnalysis}
                    disabled={analyzing}
                    size="lg"
                    className="gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-lg shadow-indigo-200"
                  >
                    {analyzing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {analyzing ? "Analyzing..." : "Run Full Analysis"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Schema */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-foreground">
                  <BarChart3 className="h-4 w-4 text-indigo-500" />
                  Dataset Schema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-indigo-700 dark:text-indigo-300">Column</TableHead>
                        <TableHead className="text-indigo-700 dark:text-indigo-300">Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dataset.column_names.map((col) => (
                        <TableRow key={col} className="border-indigo-50 hover:bg-accent/50">
                          <TableCell className="font-mono text-sm font-medium text-foreground">{col}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs border-indigo-200 dark:border-slate-700 text-primary">
                              {dataset.dtypes[col] ?? "unknown"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Analysis Results */}
            {analysisResult && (
              <>
                {analysisResult.ai_summary && analysisResult.ai_summary !== "AI summary generation failed (check LLM provider configuration)." && (
                  <Card className="bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 border-indigo-200 dark:border-indigo-800">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base text-foreground">
                        <Sparkles className="h-5 w-5 text-indigo-500" />
                        AI Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed text-gray-700 dark:text-slate-300">{analysisResult.ai_summary}</p>
                    </CardContent>
                  </Card>
                )}

                {eda?.insights && eda.insights.length > 0 && (
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base text-foreground">
                        <Sparkles className="h-5 w-5 text-amber-500" />
                        Key Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {eda.insights.map((insight: any, i: number) => (
                          <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-800">
                            <span className="text-amber-500 mt-0.5">•</span>
                            <span className="text-sm text-gray-700 dark:text-slate-300">{insight.message}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="grid gap-6 lg:grid-cols-2">
                  {charts?.missing && (
                    <Card className="bg-card border-border">
                      <CardHeader>
                        <CardTitle className="text-base text-foreground">Missing Values</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Plot
                          data={charts.missing.data}
                          layout={{ ...charts.missing.layout, height: 250, margin: { t: 10, b: 40, l: 50, r: 20 } }}
                          config={{ responsive: true, displayModeBar: false }}
                          className="w-full"
                        />
                      </CardContent>
                    </Card>
                  )}

                  {charts?.correlation && eda?.numeric_columns && eda.numeric_columns.length > 1 && (
                    <Card className="bg-card border-border">
                      <CardHeader>
                        <CardTitle className="text-base text-foreground">Correlation Matrix</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Plot
                          data={charts.correlation.data}
                          layout={{ ...charts.correlation.layout, height: 350, margin: { t: 10, b: 40, l: 50, r: 20 } }}
                          config={{ responsive: true, displayModeBar: false }}
                          className="w-full"
                        />
                      </CardContent>
                    </Card>
                  )}
                </div>

                {eda?.stats && Object.keys(eda.stats).length > 0 && (
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base text-foreground">
                        <BarChart3 className="h-5 w-5 text-indigo-500" />
                        Numeric Statistics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="max-h-[400px]">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-border">
                              <TableHead className="text-indigo-700">Column</TableHead>
                              <TableHead className="text-indigo-700">Mean</TableHead>
                              <TableHead className="text-indigo-700">Std</TableHead>
                              <TableHead className="text-indigo-700">Min</TableHead>
                              <TableHead className="text-indigo-700">Median</TableHead>
                              <TableHead className="text-indigo-700">Max</TableHead>
                              <TableHead className="text-indigo-700">Missing</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.entries(eda.stats as Record<string, any>).map(([col, s]) => (
                              <TableRow key={col} className="border-indigo-50 hover:bg-accent/50">
                                <TableCell className="font-mono text-xs font-medium">{col}</TableCell>
                                <TableCell>{s.mean?.toFixed(2) ?? "-"}</TableCell>
                                <TableCell>{s.std?.toFixed(2) ?? "-"}</TableCell>
                                <TableCell>{s.min?.toFixed(2) ?? "-"}</TableCell>
                                <TableCell>{s.median?.toFixed(2) ?? "-"}</TableCell>
                                <TableCell>{s.max?.toFixed(2) ?? "-"}</TableCell>
                                <TableCell>{s.missing}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}

                {charts?.histograms && Object.keys(charts.histograms).length > 0 && (
                  <div className="grid gap-6 lg:grid-cols-2">
                    {Object.entries(charts.histograms as Record<string, any>).map(
                      ([col, chart]) => (
                        <Card key={col} className="bg-card border-border">
                          <CardHeader>
                            <CardTitle className="text-base text-foreground">{col}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Plot
                              data={chart.data}
                              layout={{ ...chart.layout, height: 220, margin: { t: 10, b: 40, l: 50, r: 20 } }}
                              config={{ responsive: true, displayModeBar: false }}
                              className="w-full"
                            />
                          </CardContent>
                        </Card>
                      )
                    )}
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
