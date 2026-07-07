"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Loader2, FileText, Download, Eye, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const datasetId = parseInt(id, 10);

  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.reports.generate(datasetId);
      setHtml(result.html);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl dark:bg-slate-900/70 sticky top-0 z-50">
        <div className="container mx-auto flex items-center gap-4 py-4 px-6">
          <Link href={`/datasets/${id}`}>
            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-accent">
              <ArrowLeft className="h-4 w-4 text-primary" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br bg-primary flex items-center justify-center">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold text-foreground">Analysis Report</h1>
          </div>
        <ThemeToggle />
          </div>
      </header>

      <main className="container mx-auto px-6 py-6 max-w-5xl space-y-6">
        {/* Generate Card */}
        <Card className="bg-white/80 dark:bg-slate-900/80 border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5 text-pink-500" />
              Generate Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-slate-400 dark:text-slate-500">
              Generate a comprehensive analysis report with dataset summary, data quality
              assessment, AI insights, and model results.
            </p>

            <div className="flex gap-3">
              <Button
                onClick={generateReport}
                disabled={loading}
                className="gap-2 bg-gradient-to-r bg-primary hover:from-pink-600 hover:to-rose-600 shadow-lg shadow-pink-200"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                {loading ? "Generating..." : "Generate Report"}
              </Button>
              {html && (
                <a href={api.reports.downloadUrl(datasetId)} target="_blank" rel="noreferrer">
                  <Button variant="outline" className="gap-2 border-indigo-200 dark:border-slate-700 hover:bg-accent hover:border-indigo-300">
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                </a>
              )}
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Report Preview */}
        {html && (
          <Card className="bg-white/80 dark:bg-slate-900/80 border-border">
            <CardHeader>
              <CardTitle className="text-base">Report Preview</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                <div
                  className="p-6"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
