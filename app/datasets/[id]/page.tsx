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
  MessageSquare,
  Brain,
  FileText,
  BarChart3,
  Sparkles,
  Download,
  Upload,
  Wand2,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });
import { ScrollArea } from "@/components/ui/scroll-area";

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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50">
        <p className="text-gray-500">Dataset not found</p>
      </div>
    );
  }

  const eda = analysisResult?.eda as Record<string, any> | undefined;
  const cleaning = analysisResult?.cleaning as Record<string, any> | undefined;
  const charts = eda?.charts as Record<string, any> | undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50">
      {/* Header */}
      <header className="border-b border-indigo-100 bg-white/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto flex items-center gap-4 py-4 px-6">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-indigo-50">
              <ArrowLeft className="h-4 w-4 text-indigo-600" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">{dataset.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-xs bg-indigo-50 text-indigo-600 border-0">
                {dataset.rows?.toLocaleString() ?? "?"} rows
              </Badge>
              <Badge variant="secondary" className="text-xs bg-violet-50 text-violet-600 border-0">
                {dataset.columns} columns
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href={api.datasets.downloadUrl(datasetId, "csv")} download>
              <Button variant="outline" size="sm" className="gap-1.5 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300">
                <Download className="h-3.5 w-3.5" />
                CSV
              </Button>
            </a>
            <a href={api.datasets.downloadUrl(datasetId, "json")} download>
              <Button variant="outline" size="sm" className="gap-1.5 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300">
                <Download className="h-3.5 w-3.5" />
                JSON
              </Button>
            </a>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6 max-w-6xl">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur-sm border border-indigo-100 p-1 rounded-xl">
            <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
              <BarChart3 className="h-4 w-4 mr-1.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="qa" className="rounded-lg data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
              <MessageSquare className="h-4 w-4 mr-1.5" />
              Q&A
            </TabsTrigger>
            <TabsTrigger value="ml" className="rounded-lg data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
              <Brain className="h-4 w-4 mr-1.5" />
              Auto ML
            </TabsTrigger>
            <TabsTrigger value="report" className="rounded-lg data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
              <FileText className="h-4 w-4 mr-1.5" />
              Report
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Clean Data Card */}
            {!cleanResult && !analysisResult && (
              <Card className="bg-white/80 border-indigo-100 overflow-hidden">
                <CardContent className="p-8 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mx-auto mb-4">
                    <Wand2 className="h-7 w-7 text-emerald-500" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Clean your data first</h3>
                  <p className="text-sm text-gray-500 mb-5">
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
              <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
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
                      <div key={item.label} className="rounded-xl bg-white/80 p-4 text-center border border-emerald-100">
                        <p className="text-2xl font-bold text-gray-900">{String(item.value ?? "0")}</p>
                        <p className="text-xs text-gray-500 mt-1">{item.label}</p>
                      </div>
                    ))}
                  </div>
                  {cleanResult.cleaning.cleaning_summary && (
                    <p className="text-sm text-gray-600 mb-4">{String(cleanResult.cleaning.cleaning_summary)}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <a href={api.datasets.downloadUrl(datasetId, "csv")} download>
                      <Button variant="outline" size="sm" className="gap-1.5 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300">
                        <Download className="h-3.5 w-3.5" />
                        Download Clean CSV
                      </Button>
                    </a>
                    <a href={api.datasets.downloadUrl(datasetId, "json")} download>
                      <Button variant="outline" size="sm" className="gap-1.5 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300">
                        <Download className="h-3.5 w-3.5" />
                        Download Clean JSON
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Run Analysis Button */}
            {!analysisResult && (
              <Card className="bg-white/80 border-indigo-100 overflow-hidden">
                <CardContent className="p-8 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="h-7 w-7 text-indigo-500" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Ready to analyze</h3>
                  <p className="text-sm text-gray-500 mb-5">
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
            <Card className="bg-white/80 border-indigo-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Upload className="h-4 w-4 text-indigo-500" />
                  Dataset Schema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-indigo-100">
                        <TableHead className="text-indigo-700">Column</TableHead>
                        <TableHead className="text-indigo-700">Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dataset.column_names.map((col) => (
                        <TableRow key={col} className="border-indigo-50 hover:bg-indigo-50/50">
                          <TableCell className="font-mono text-sm font-medium">{col}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs border-indigo-200 text-indigo-600">
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
                {/* AI Summary */}
                {analysisResult.ai_summary && analysisResult.ai_summary !== "AI summary generation failed (check LLM provider configuration)." && (
                  <Card className="bg-gradient-to-r from-indigo-50 to-violet-50 border-indigo-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Sparkles className="h-5 w-5 text-indigo-500" />
                        AI Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed text-gray-700">
                        {analysisResult.ai_summary}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Insights */}
                {eda?.insights && eda.insights.length > 0 && (
                  <Card className="bg-white/80 border-indigo-100">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Sparkles className="h-5 w-5 text-amber-500" />
                        Key Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {eda.insights.map((insight: any, i: number) => (
                          <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-amber-50/50 border border-amber-100">
                            <span className="text-amber-500 mt-0.5">•</span>
                            <span className="text-sm text-gray-700">{insight.message}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Cleaning Stats */}
                {cleaning && (
                  <Card className="bg-white/80 border-indigo-100">
                    <CardHeader>
                      <CardTitle className="text-base">Data Quality Report</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { label: "Original Rows", value: cleaning.original_rows, color: "indigo" },
                          { label: "Duplicates Removed", value: cleaning.duplicates_removed, color: "red" },
                          { label: "Missing Fixed", value: cleaning.missing_fixed, color: "amber" },
                          { label: "Outliers Detected", value: cleaning.outliers_detected, color: "violet" },
                        ].map((item) => (
                          <div key={item.label} className="rounded-xl bg-gray-50 p-4 text-center border border-gray-100">
                            <p className="text-2xl font-bold text-gray-900">{String(item.value ?? "0")}</p>
                            <p className="text-xs text-gray-500 mt-1">{item.label}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Charts */}
                <div className="grid gap-6 lg:grid-cols-2">
                  {charts?.missing && (
                    <Card className="bg-white/80 border-indigo-100">
                      <CardHeader>
                        <CardTitle className="text-base">Missing Values</CardTitle>
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
                    <Card className="bg-white/80 border-indigo-100">
                      <CardHeader>
                        <CardTitle className="text-base">Correlation Matrix</CardTitle>
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

                {/* Stats Table */}
                {eda?.stats && Object.keys(eda.stats).length > 0 && (
                  <Card className="bg-white/80 border-indigo-100">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <BarChart3 className="h-5 w-5 text-indigo-500" />
                        Numeric Statistics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="max-h-[400px]">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-indigo-100">
                              <TableHead className="text-indigo-700">Column</TableHead>
                              <TableHead className="text-indigo-700">Mean</TableHead>
                              <TableHead className="text-indigo-700">Std</TableHead>
                              <TableHead className="text-indigo-700">Min</TableHead>
                              <TableHead className="text-indigo-700">Q1</TableHead>
                              <TableHead className="text-indigo-700">Median</TableHead>
                              <TableHead className="text-indigo-700">Q3</TableHead>
                              <TableHead className="text-indigo-700">Max</TableHead>
                              <TableHead className="text-indigo-700">Missing</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.entries(eda.stats as Record<string, any>).map(([col, s]) => (
                              <TableRow key={col} className="border-indigo-50 hover:bg-indigo-50/50">
                                <TableCell className="font-mono text-xs font-medium">{col}</TableCell>
                                <TableCell>{s.mean?.toFixed(2) ?? "-"}</TableCell>
                                <TableCell>{s.std?.toFixed(2) ?? "-"}</TableCell>
                                <TableCell>{s.min?.toFixed(2) ?? "-"}</TableCell>
                                <TableCell>{s.q1?.toFixed(2) ?? "-"}</TableCell>
                                <TableCell>{s.median?.toFixed(2) ?? "-"}</TableCell>
                                <TableCell>{s.q3?.toFixed(2) ?? "-"}</TableCell>
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

                {/* Histograms */}
                {charts?.histograms && Object.keys(charts.histograms).length > 0 && (
                  <div className="grid gap-6 lg:grid-cols-2">
                    {Object.entries(charts.histograms as Record<string, any>).map(
                      ([col, chart]) => (
                        <Card key={col} className="bg-white/80 border-indigo-100">
                          <CardHeader>
                            <CardTitle className="text-base">{col}</CardTitle>
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

                {/* Action Cards */}
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { href: `/datasets/${datasetId}/qa`, icon: MessageSquare, title: "Ask Questions", desc: "Natural language Q&A about your data", color: "from-indigo-500 to-blue-500" },
                    { href: `/datasets/${datasetId}/ml`, icon: Brain, title: "Auto ML", desc: "Train and compare ML models", color: "from-violet-500 to-purple-500" },
                    { href: `/datasets/${datasetId}/report`, icon: FileText, title: "Report", desc: "Generate a downloadable report", color: "from-pink-500 to-rose-500" },
                  ].map((item) => (
                    <Link key={item.title} href={item.href}>
                      <Card className="group hover:shadow-lg hover:shadow-indigo-100/50 transition-all duration-300 cursor-pointer h-full bg-white/80 border-indigo-100 hover:border-indigo-200">
                        <CardContent className="p-5">
                          <div className="flex items-start gap-3">
                            <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-sm shrink-0`}>
                              <item.icon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{item.title}</h3>
                              <p className="text-sm text-gray-500">{item.desc}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          {/* Q&A Tab */}
          <TabsContent value="qa">
            <Card className="bg-white/80 border-indigo-100">
              <CardContent className="p-12 text-center">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-7 w-7 text-indigo-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Natural Language Q&A</h3>
                <p className="text-sm text-gray-500 mb-5">Ask questions about your data in plain English</p>
                <Link href={`/datasets/${datasetId}/qa`}>
                  <Button className="gap-2 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 shadow-lg shadow-indigo-200">
                    <MessageSquare className="h-4 w-4" />
                    Open Q&A
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ML Tab */}
          <TabsContent value="ml">
            <Card className="bg-white/80 border-indigo-100">
              <CardContent className="p-12 text-center">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
                  <Brain className="h-7 w-7 text-violet-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Auto ML</h3>
                <p className="text-sm text-gray-500 mb-5">Train and compare ML models automatically</p>
                <Link href={`/datasets/${datasetId}/ml`}>
                  <Button className="gap-2 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 shadow-lg shadow-violet-200">
                    <Brain className="h-4 w-4" />
                    Open Auto ML
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Report Tab */}
          <TabsContent value="report">
            <Card className="bg-white/80 border-indigo-100">
              <CardContent className="p-12 text-center">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-7 w-7 text-pink-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Analysis Report</h3>
                <p className="text-sm text-gray-500 mb-5">Generate a comprehensive downloadable report</p>
                <Link href={`/datasets/${datasetId}/report`}>
                  <Button className="gap-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 shadow-lg shadow-pink-200">
                    <FileText className="h-4 w-4" />
                    Open Report
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
