"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileUp,
  ArrowRight,
  Database,
  Loader2,
  Bot,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";

export default function HomePage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const { data: datasets, isLoading } = useQuery({
    queryKey: ["datasets"],
    queryFn: api.datasets.list,
  });

  const uploadMutation = useMutation({
    mutationFn: api.datasets.upload,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
      setUploadProgress(null);
    },
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "text/csv": [".csv"],
      "application/json": [".json"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    maxFiles: 1,
    onDrop: async (files) => {
      if (files[0]) {
        setUploadProgress(`Uploading ${files[0].name}...`);
        setUploading(true);
        try {
          const result = await uploadMutation.mutateAsync(files[0]);
          router.push(`/datasets/${result.id}/chat`);
        } finally {
          setUploading(false);
        }
      }
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50">
      {/* Header */}
      <header className="border-b border-indigo-100 bg-white/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between py-4 px-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">AI Data Analyst</h1>
              <p className="text-[11px] text-gray-400 -mt-0.5">Your AI-powered data copilot</p>
            </div>
          </div>
          {datasets && datasets.length > 0 && (
            <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-200">
              {datasets.length} dataset{datasets.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </header>

      <main className="container mx-auto px-6 py-10 max-w-5xl">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 text-xs font-medium text-indigo-700 mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            AI-Powered Analysis
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Upload data, let AI do the rest
          </h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Drop a file and your AI copilot will clean, analyze, visualize, and model your data — all through natural conversation.
          </p>
        </div>

        {/* Upload Zone */}
        <Card className="mb-10 border-2 border-dashed border-indigo-200 bg-white/60 backdrop-blur-sm hover:border-indigo-400 hover:bg-indigo-50/30 transition-all duration-300 shadow-sm hover:shadow-md">
          <CardContent className="p-0">
            <div
              {...getRootProps()}
              className={`cursor-pointer rounded-xl p-10 text-center transition-all duration-300 ${
                isDragActive ? "bg-indigo-50 scale-[1.01]" : ""
              }`}
            >
              <input {...getInputProps()} />
              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 text-indigo-600 animate-spin" />
                  </div>
                  <p className="text-sm font-medium text-indigo-700">{uploadProgress}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileUp className="h-7 w-7 text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-gray-800">
                      {isDragActive ? "Drop your file here" : "Drag & drop a file, or click to browse"}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Supports CSV, Excel (.xlsx), and JSON files
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        {!datasets || datasets.length === 0 ? (
          <div className="grid md:grid-cols-3 gap-4 mb-10">
            {[
              { icon: Bot, title: "AI Copilot", desc: "Chat with your data — ask questions, get insights, run analysis" },
              { icon: Sparkles, title: "Auto Everything", desc: "AI automatically cleans, analyzes, models, and visualizes" },
              { icon: Database, title: "One-Click Deploy", desc: "Export models as REST API, Docker, Streamlit, or notebooks" },
            ].map((f) => (
              <Card key={f.title} className="bg-white/60 border-indigo-100 hover:border-indigo-200 transition-colors">
                <CardContent className="p-5">
                  <f.icon className="h-8 w-8 text-indigo-400 mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                  <p className="text-sm text-gray-500">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}

        {/* Datasets Grid */}
        {datasets && datasets.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Your Datasets</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {datasets.map((d) => (
                <Link key={d.id} href={`/datasets/${d.id}/chat`}>
                  <Card className="group hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100/50 transition-all duration-300 cursor-pointer h-full bg-white/80">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-sm">
                          <Bot className="h-5 w-5 text-white" />
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                      </div>
                      <h3 className="font-semibold text-gray-900 truncate mb-2">{d.name}</h3>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs bg-indigo-50 text-indigo-600 border-0">
                          {d.rows?.toLocaleString() ?? "?"} rows
                        </Badge>
                        <Badge variant="secondary" className="text-xs bg-violet-50 text-violet-600 border-0">
                          {d.columns} cols
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {!isLoading && datasets && datasets.length === 0 && (
          <p className="text-center text-sm text-gray-400 mt-4">
            No datasets yet. Upload one above to get started.
          </p>
        )}
      </main>
    </div>
  );
}
