"use client";

import { use, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, Loader2, User, Bot, Code, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import dynamic from "next/dynamic";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface Message {
  role: "user" | "assistant";
  content: string;
  code?: string;
  chart_json?: Record<string, unknown>;
}

const SUGGESTIONS = [
  "How many rows are in the dataset?",
  "What is the average value of a column?",
  "Show me the distribution of a numeric column",
  "What are the column names?",
  "Find correlations between columns",
];

export default function QAPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const datasetId = parseInt(id, 10);

  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const askQuestion = async (q?: string) => {
    const text = q || question;
    if (!text.trim() || loading) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setLoading(true);

    try {
      const response = await api.qa.ask(datasetId, text);
      const assistantMessage: Message = {
        role: "assistant",
        content: response.answer,
        code: response.code,
        chart_json: response.chart_json,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${e instanceof Error ? e.message : "Request failed. Is the backend running?"}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold text-foreground">AI Q&A</h1>
          </div>
        <ThemeToggle />
          </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 container mx-auto px-6 py-6 max-w-3xl flex flex-col">
        {messages.length === 0 ? (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center mx-auto mb-4">
                <Bot className="h-8 w-8 text-indigo-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">Ask anything about your data</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                I can answer questions, run calculations, and create visualizations.
              </p>
              <div className="space-y-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => askQuestion(s)}
                    className="w-full text-left px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-border text-sm text-gray-700 dark:text-slate-300 hover:border-indigo-300 hover:bg-accent transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Messages */
          <ScrollArea className="flex-1 pr-4 mb-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
                >
                  {msg.role === "assistant" && (
                    <div className="h-8 w-8 rounded-xl bg-gradient-to-br bg-primary flex items-center justify-center shrink-0 shadow-sm">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-200"
                        : "bg-white dark:bg-slate-900 border border-border shadow-sm"
                    }`}
                  >
                    <p className={`text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "assistant" ? "text-gray-700 dark:text-slate-300" : ""}`}>
                      {msg.content}
                    </p>
                    {msg.code && (
                      <details className="mt-2">
                        <summary className="text-xs cursor-pointer text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
                          <Code className="h-3 w-3" />
                          Show code
                        </summary>
                        <pre className="mt-2 p-3 bg-gray-900 text-green-400 rounded-lg text-xs overflow-x-auto">
                          {msg.code}
                        </pre>
                      </details>
                    )}
                    {msg.chart_json && (
                      <div className="mt-3">
                        <Plot
                          data={(msg.chart_json as any).data}
                          layout={{ ...(msg.chart_json as any).layout, height: 300, margin: { t: 10, b: 40, l: 50, r: 20 } }}
                          config={{ responsive: true, displayModeBar: false }}
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="h-8 w-8 rounded-xl bg-gray-900 flex items-center justify-center shrink-0 shadow-sm">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-br bg-primary flex items-center justify-center shadow-sm">
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                      <div className="flex gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0ms]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:300ms]" />
                      </div>
                      Thinking...
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Input */}
        <div className="sticky bottom-0 pt-4">
          <div className="flex gap-2 bg-card backdrop-blur-sm dark:bg-slate-900/80 p-2 rounded-2xl border border-border shadow-lg shadow-indigo-100/30">
            <Input
              placeholder="Ask a question about your data..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && askQuestion()}
              disabled={loading}
              className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
            />
            <Button
              onClick={() => askQuestion()}
              disabled={loading || !question.trim()}
              size="icon"
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 shadow-md"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
