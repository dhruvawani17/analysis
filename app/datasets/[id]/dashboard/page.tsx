"use client";

import { use, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Loader2,
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  BarChart3,
  ShoppingCart,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { DashboardConfig } from "@/lib/types";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

const iconMap: Record<string, typeof DollarSign> = {
  "dollar-sign": DollarSign,
  users: Users,
  "trending-up": TrendingUp,
  "bar-chart": BarChart3,
  "shopping-cart": ShoppingCart,
};

const colorMap: Record<string, string> = {
  emerald: "from-emerald-500 to-teal-500",
  indigo: "from-indigo-500 to-blue-500",
  violet: "from-violet-500 to-purple-500",
  amber: "from-amber-500 to-orange-500",
  rose: "from-rose-500 to-pink-500",
  blue: "from-blue-500 to-cyan-500",
};

export default function DashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const datasetId = parseInt(id, 10);

  const [config, setConfig] = useState<DashboardConfig | null>(null);

  const { data: dataset } = useQuery({
    queryKey: ["dataset", datasetId],
    queryFn: () => api.datasets.get(datasetId),
  });

  const { data: existingDashboard, isLoading: loadingDashboard } = useQuery({
    queryKey: ["dashboard", datasetId],
    queryFn: async () => {
      try {
        const result = await api.dashboard.get(datasetId);
        setConfig(result.config);
        return result;
      } catch {
        return null;
      }
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const result = await api.dashboard.generate(datasetId);
      setConfig(result.config);
      return result;
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50">
      {/* Header */}
      <header className="border-b border-indigo-100 bg-white/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto flex items-center gap-4 py-4 px-6">
          <Link href={`/datasets/${datasetId}`}>
            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-indigo-50">
              <ArrowLeft className="h-4 w-4 text-indigo-600" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5 text-indigo-500" />
              <h1 className="text-lg font-bold text-gray-900">Dashboard</h1>
            </div>
            {dataset && (
              <p className="text-xs text-gray-500 truncate">{dataset.name}</p>
            )}
          </div>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            size="sm"
            className="gap-1.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700"
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {config ? "Regenerate" : "Generate Dashboard"}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6 max-w-7xl">
        {!config && !loadingDashboard && (
          <Card className="bg-white/80 border-indigo-100">
            <CardContent className="p-12 text-center">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center mx-auto mb-4">
                <LayoutDashboard className="h-7 w-7 text-indigo-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">No Dashboard Yet</h3>
              <p className="text-sm text-gray-500 mb-5">
                Generate an AI-powered dashboard with KPIs, charts, and insights
              </p>
              <Button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                size="lg"
                className="gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-lg shadow-indigo-200"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LayoutDashboard className="h-4 w-4" />
                )}
                {generateMutation.isPending ? "Generating..." : "Generate Dashboard"}
              </Button>
            </CardContent>
          </Card>
        )}

        {generateMutation.isPending && (
          <Card className="bg-white/80 border-indigo-100">
            <CardContent className="p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mx-auto mb-4" />
              <p className="text-sm text-gray-500">AI is designing your dashboard...</p>
            </CardContent>
          </Card>
        )}

        {config && (
          <>
            {/* Title */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{config.title}</h2>
              <p className="text-sm text-gray-500">AI-generated dashboard for {dataset?.name}</p>
            </div>

            {/* KPIs */}
            {config.kpis && config.kpis.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                {config.kpis.map((kpi, i) => {
                  const Icon = iconMap[kpi.icon] || BarChart3;
                  const gradient = colorMap[kpi.color] || colorMap.indigo;
                  return (
                    <Card key={i} className="bg-white/80 border-indigo-100 overflow-hidden">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">{kpi.name}</p>
                            <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                            {kpi.trend && (
                              <div className="flex items-center gap-1 mt-1">
                                {kpi.trend.startsWith("+") ? (
                                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                                ) : kpi.trend.startsWith("-") ? (
                                  <TrendingDown className="h-3 w-3 text-red-500" />
                                ) : null}
                                <span className={`text-xs font-medium ${kpi.trend.startsWith("+") ? "text-emerald-600" : kpi.trend.startsWith("-") ? "text-red-600" : "text-gray-500"}`}>
                                  {kpi.trend}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}>
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Charts */}
            {((config as any).rendered_charts && (config as any).rendered_charts.length > 0) ? (
              <div className="grid gap-6 lg:grid-cols-2">
                {(config as any).rendered_charts.map((chart: any, i: number) => (
                  <Card key={i} className="bg-white/80 border-indigo-100">
                    <CardHeader>
                      <CardTitle className="text-base">{chart.title}</CardTitle>
                      {chart.description && (
                        <p className="text-xs text-gray-500">{chart.description}</p>
                      )}
                    </CardHeader>
                    <CardContent>
                      {chart.plotly ? (
                        <Plot
                          data={chart.plotly.data}
                          layout={{ ...chart.plotly.layout, height: 300, margin: { t: 10, b: 40, l: 50, r: 20 } }}
                          config={{ responsive: true, displayModeBar: false }}
                          className="w-full"
                        />
                      ) : (
                        <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-lg border border-gray-100">
                          <div className="text-center">
                            <BarChart3 className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-xs text-gray-400">{chart.type}: {chart.title}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : config.charts && config.charts.length > 0 ? (
              <div className="grid gap-6 lg:grid-cols-2">
                {config.charts.map((chart: any, i: number) => (
                  <Card key={i} className="bg-white/80 border-indigo-100">
                    <CardHeader>
                      <CardTitle className="text-base">{chart.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-lg border border-gray-100">
                        <div className="text-center">
                          <BarChart3 className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-xs text-gray-400">{chart.type}: {chart.title}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : null}

            {/* Filters */}
            {config.filters && config.filters.length > 0 && (
              <Card className="mt-6 bg-white/80 border-indigo-100">
                <CardHeader>
                  <CardTitle className="text-base">Available Filters</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {config.filters.map((filter, i) => (
                      <Badge key={i} variant="outline" className="border-indigo-200 text-indigo-600">
                        {filter.column} ({filter.type})
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {generateMutation.isError && (
          <Card className="mt-6 bg-red-50 border-red-200">
            <CardContent className="p-4">
              <p className="text-sm text-red-700">
                Error: {generateMutation.error instanceof Error ? generateMutation.error.message : "Failed to generate dashboard"}
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
