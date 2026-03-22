"use client";

import { type ComponentType, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bug,
  Database,
  Gauge,
  Play,
  RefreshCw,
  Search,
} from "lucide-react";

import {
  api,
  type RagEvalCase,
  type RagEvalRunResult,
  type RagEvalSummary,
  type RagTraceDetail,
  type RagTraceSummary,
} from "@/lib/api";
import { ModelSelector } from "@/components/model-selector";

type TabKey = "overview" | "traces" | "bench" | "failures";

function fmtNumber(value: unknown, digits: number = 2): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return value.toFixed(digits);
}

function fmtPct(value: unknown): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return `${(value * 100).toFixed(1)}%`;
}

export default function RagLabPage() {
  const [tab, setTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<RagEvalSummary | null>(null);
  const [traces, setTraces] = useState<RagTraceSummary[]>([]);
  const [cases, setCases] = useState<RagEvalCase[]>([]);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [traceDetail, setTraceDetail] = useState<RagTraceDetail | null>(null);
  const [runningEval, setRunningEval] = useState(false);
  const [evalResult, setEvalResult] = useState<RagEvalRunResult | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedEvalModel, setSelectedEvalModel] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryData, traceData, caseData] = await Promise.all([
        api.getRagEvalSummary(14),
        api.getRagTraceSummaries(100, statusFilter || undefined),
        api.getRagEvalCases(),
      ]);
      setSummary(summaryData);
      setTraces(traceData);
      setCases(caseData);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const loadTraceDetail = useCallback(async (traceId: string) => {
    setSelectedTraceId(traceId);
    const detail = await api.getRagTraceDetail(traceId);
    setTraceDetail(detail);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runEval = useCallback(async () => {
    setRunningEval(true);
    try {
      const result = await api.runRagEval({
        use_llm_judge: true,
        model_name: selectedEvalModel || undefined,
      });
      setEvalResult(result);
      const summaryData = await api.getRagEvalSummary(14);
      setSummary(summaryData);
      const traceData = await api.getRagTraceSummaries(100, statusFilter || undefined);
      setTraces(traceData);
    } finally {
      setRunningEval(false);
    }
  }, [selectedEvalModel, statusFilter]);

  const failureClusters = useMemo(() => {
    const out = [
      { key: "failed_runs", title: "Failed runs", count: 0, icon: AlertTriangle },
      { key: "fallback_spikes", title: "Fallback model route", count: 0, icon: Database },
      { key: "slow_runs", title: "Slow runs (>8s)", count: 0, icon: Gauge },
      { key: "low_retrieval", title: "Low retrieval depth (<2 results)", count: 0, icon: Search },
    ];

    for (const t of traces) {
      if (t.status === "failed") out[0].count += 1;
      if (t.model_route === "ollama_fallback") out[1].count += 1;
      if ((t.total_ms ?? 0) > 8000) out[2].count += 1;
      if ((t.returned_count ?? 0) < 2) out[3].count += 1;
    }
    return out;
  }, [traces]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-6 pb-16 pt-24">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border/40 bg-secondary/40 text-foreground/60 hover:bg-secondary hover:text-foreground"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="font-serif text-3xl tracking-tight text-foreground/90">RAG Lab</h1>
              <p className="text-xs text-muted-foreground/60">Development observability + eval bench</p>
            </div>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 rounded-lg border border-border/40 bg-secondary/30 px-3 py-2 text-xs text-foreground/80 hover:bg-secondary"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2">
          {[
            ["overview", "Overview"],
            ["traces", "Trace Explorer"],
            ["bench", "Eval Bench"],
            ["failures", "Failure Clusters"],
          ].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k as TabKey)}
              className={`rounded-md border px-3 py-1.5 text-xs ${
                tab === k
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                  : "border-border/40 bg-secondary/20 text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="rounded-xl border border-border/30 bg-card/40 p-6 text-sm text-muted-foreground">
            Loading RAG observability data...
          </div>
        ) : (
          <>
            {tab === "overview" && (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard title="Runs (14d)" value={String(summary?.runs?.run_count ?? "-")} icon={Activity} />
                <MetricCard title="Success Rate" value={fmtPct(summary?.runs?.success_rate)} icon={Gauge} />
                <MetricCard title="Fallback Rate" value={fmtPct(summary?.runs?.fallback_rate)} icon={Database} />
                <MetricCard title="Avg Total Latency" value={`${fmtNumber(summary?.runs?.avg_total_ms, 0)} ms`} icon={RefreshCw} />
                <MetricCard title="Avg Precision@K" value={fmtNumber(summary?.eval?.avg_precision_at_k)} icon={Search} />
                <MetricCard title="Avg Recall@K" value={fmtNumber(summary?.eval?.avg_recall_at_k)} icon={Search} />
                <MetricCard title="Temporal Accuracy" value={fmtPct(summary?.eval?.avg_temporal_intent_accuracy)} icon={Activity} />
                <MetricCard title="Eval Pass Rate" value={fmtPct(summary?.eval?.pass_rate)} icon={Bug} />
              </div>
            )}

            {tab === "traces" && (
              <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
                <div className="rounded-xl border border-border/30 bg-card/40 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-foreground/90">Traces</h2>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="rounded border border-border/40 bg-background px-2 py-1 text-xs"
                    >
                      <option value="">All</option>
                      <option value="completed">Completed</option>
                      <option value="failed">Failed</option>
                      <option value="started">Started</option>
                    </select>
                  </div>
                  <div className="max-h-[560px] overflow-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="text-muted-foreground/70">
                        <tr>
                          <th className="pb-2">Status</th>
                          <th className="pb-2">Query</th>
                          <th className="pb-2">Route</th>
                          <th className="pb-2">R@K</th>
                          <th className="pb-2">Latency</th>
                        </tr>
                      </thead>
                      <tbody>
                        {traces.map((t) => (
                          <tr
                            key={t.trace_id}
                            className={`cursor-pointer border-t border-border/20 hover:bg-secondary/30 ${
                              selectedTraceId === t.trace_id ? "bg-secondary/30" : ""
                            }`}
                            onClick={() => loadTraceDetail(t.trace_id)}
                          >
                            <td className="py-2">
                              <span
                                className={`rounded-full px-2 py-0.5 ${
                                  t.status === "completed"
                                    ? "bg-emerald-500/15 text-emerald-300"
                                    : t.status === "failed"
                                    ? "bg-red-500/15 text-red-300"
                                    : "bg-amber-500/15 text-amber-300"
                                }`}
                              >
                                {t.status}
                              </span>
                            </td>
                            <td className="max-w-[320px] truncate py-2 text-foreground/90">{t.query}</td>
                            <td className="py-2 text-muted-foreground">{t.model_route ?? "-"}</td>
                            <td className="py-2 text-muted-foreground">{t.returned_count ?? 0}</td>
                            <td className="py-2 text-muted-foreground">{fmtNumber(t.total_ms, 0)} ms</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-xl border border-border/30 bg-card/40 p-4">
                  <h2 className="mb-3 text-sm font-semibold text-foreground/90">Trace Detail</h2>
                  {!traceDetail ? (
                    <p className="text-xs text-muted-foreground/70">Pick a trace to inspect retrieval + judgments.</p>
                  ) : (
                    <div className="space-y-3 text-xs">
                      <div className="rounded-lg border border-border/30 bg-background/40 p-3">
                        <p className="text-muted-foreground">Trace ID</p>
                        <p className="break-all text-foreground/90">{String(traceDetail.run.trace_id)}</p>
                      </div>
                      <div className="rounded-lg border border-border/30 bg-background/40 p-3">
                        <p className="mb-1 text-muted-foreground">Retrieved Items</p>
                        <p className="text-foreground/90">{traceDetail.retrieval_items.length}</p>
                      </div>
                      <div className="rounded-lg border border-border/30 bg-background/40 p-3">
                        <p className="mb-1 text-muted-foreground">Latest Judgment</p>
                        {traceDetail.judgments.length === 0 ? (
                          <p className="text-muted-foreground">No manual/LLM judgment saved</p>
                        ) : (
                          <pre className="overflow-auto whitespace-pre-wrap text-[11px] text-foreground/80">
                            {JSON.stringify(traceDetail.judgments[0], null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === "bench" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-border/30 bg-card/40 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground/90">Eval Bench</h2>
                      <p className="text-xs text-muted-foreground/70">
                        Active cases: {cases.filter((c) => c.active === 1).length} / {cases.length}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <ModelSelector
                        value={selectedEvalModel}
                        onChange={setSelectedEvalModel}
                        disabled={runningEval}
                        compact
                      />
                      <button
                        onClick={runEval}
                        disabled={runningEval}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/20 px-3 py-2 text-xs text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-50"
                      >
                        <Play className="h-3.5 w-3.5" />
                        {runningEval ? "Running..." : "Run Eval Suite"}
                      </button>
                    </div>
                  </div>
                  <p className="mb-3 text-[11px] text-muted-foreground/60">
                    Eval model: {selectedEvalModel || "Gemini 3 Flash (Default)"}
                  </p>

                  <div className="max-h-[260px] overflow-auto rounded-lg border border-border/20">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-secondary/30 text-muted-foreground/70">
                        <tr>
                          <th className="p-2">Case</th>
                          <th className="p-2">Type</th>
                          <th className="p-2">Query</th>
                          <th className="p-2">Active</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cases.map((c) => (
                          <tr key={c.id} className="border-t border-border/20">
                            <td className="p-2 text-foreground/90">{c.name}</td>
                            <td className="p-2 text-muted-foreground">{c.case_type}</td>
                            <td className="max-w-[420px] truncate p-2 text-muted-foreground">{c.query}</td>
                            <td className="p-2 text-muted-foreground">{c.active === 1 ? "yes" : "no"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {evalResult && (
                  <div className="rounded-xl border border-border/30 bg-card/40 p-4">
                    <h3 className="mb-2 text-sm font-semibold text-foreground/90">Latest Eval Result</h3>
                    <p className="mb-3 text-xs text-muted-foreground">Run ID: {evalResult.eval_run_id}</p>
                    <pre className="max-h-[260px] overflow-auto whitespace-pre-wrap rounded-lg border border-border/20 bg-background/40 p-3 text-[11px] text-foreground/80">
                      {JSON.stringify(evalResult.summary, null, 2)}
                    </pre>
                    <div className="mt-4 max-h-[320px] overflow-auto rounded-lg border border-border/20">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-secondary/30 text-muted-foreground/70">
                          <tr>
                            <th className="p-2">Case</th>
                            <th className="p-2">Recall@K</th>
                            <th className="p-2">MRR</th>
                            <th className="p-2">Grounded</th>
                            <th className="p-2">Pass</th>
                            <th className="p-2">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {evalResult.results.map((result) => (
                            <tr key={result.trace_id} className="border-t border-border/20 align-top">
                              <td className="p-2 text-foreground/90">{result.name}</td>
                              <td className="p-2 text-muted-foreground">{fmtNumber(result.metrics.recall_at_k)}</td>
                              <td className="p-2 text-muted-foreground">{fmtNumber(result.metrics.mrr)}</td>
                              <td className="p-2 text-muted-foreground">{fmtNumber(result.metrics.groundedness)}</td>
                              <td className="p-2 text-muted-foreground">{String(result.metrics.pass ?? "-")}</td>
                              <td className="max-w-[320px] p-2 text-muted-foreground">{result.notes || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === "failures" && (
              <div className="grid gap-4 md:grid-cols-2">
                {failureClusters.map((cluster) => {
                  const Icon = cluster.icon;
                  return (
                    <div key={cluster.key} className="rounded-xl border border-border/30 bg-card/40 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <Icon className="h-4 w-4 text-amber-300" />
                        <h3 className="text-sm font-semibold text-foreground/90">{cluster.title}</h3>
                      </div>
                      <p className="font-mono text-2xl text-foreground/90">{cluster.count}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-border/30 bg-card/40 p-4">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground/70">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs">{title}</span>
      </div>
      <p className="text-xl font-semibold text-foreground/90">{value}</p>
    </div>
  );
}
