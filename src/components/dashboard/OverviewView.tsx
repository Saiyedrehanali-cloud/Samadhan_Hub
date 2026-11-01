"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  GitMerge,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Layers,
} from "lucide-react";
import { KpiCard } from "@/components/common/KpiCard";
import { AttentionRow } from "@/components/common/AttentionRow";
import { BureauBadge } from "@/components/common/BureauBadge";

interface SummaryData {
  user: {
    name: string;
    role: string;
    bureauCode: string | null;
    region: string | null;
  };
  openCases: number;
  receivedThisWeek: number;
  needsCoordination: number;
  beyondTimeline: number;
  disposedThisMonth: number;
  withinSlaPct: number;
  needsAttention: Array<{
    id: string;
    caseNo: string;
    institutionName: string;
    aicteId: string;
    subject: string;
    status: string;
    bureauCode: string;
    category: string;
    receivedAt: string;
    expectedDisposalAt: string;
    primaryTag: "OVERLAP" | "OVERDUE" | "ESCALATED" | "ACTIVE";
    overdueDays: number;
    overlapStrength: "STRONG" | "POSSIBLE" | null;
    overlapGroupId: string | null;
  }>;
  bureauWorkload: Array<{
    code: string;
    name: string;
    openCases: number;
  }>;
}

export function OverviewView() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/summary");
      if (!res.ok) throw new Error("Failed to load dashboard metrics");
      const json = await res.json();
      if (json.ok) {
        setData(json.data);
      } else {
        throw new Error(json.error?.message || "Failed to load summary");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-surface rounded-xl border border-border p-5 animate-pulse space-y-3">
              <div className="h-3 w-20 bg-slate-200 rounded" />
              <div className="h-8 w-14 bg-slate-200 rounded" />
              <div className="h-3 w-28 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-surface rounded-xl border border-border animate-pulse p-6" />
          <div className="h-72 bg-surface rounded-xl border border-border animate-pulse p-6" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-surface rounded-xl border border-border p-12 text-center shadow-2xs">
        <AlertTriangle className="w-8 h-8 text-danger mx-auto mb-2" />
        <h3 className="text-sm font-semibold text-ink">Failed to load overview</h3>
        <p className="text-xs text-muted mt-1 max-w-sm mx-auto">{error}</p>
        <button
          onClick={fetchSummary}
          className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      </div>
    );
  }

  const totalBureauCases = data.bureauWorkload.reduce((sum, b) => sum + b.openCases, 0);

  const bureauBarColors: Record<string, string> = {
    RB: "bg-bureau-rb",
    PGRC: "bg-bureau-pgrc",
    AB: "bg-bureau-ab",
    LC: "bg-bureau-lc",
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Scope Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-ink tracking-tight">Overview</h1>
          <p className="text-xs text-subtle mt-0.5">
            Single-window complaint monitoring across AICTE Bureaus and Regional Directorates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchSummary}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface text-subtle hover:text-ink text-xs font-semibold hover:bg-slate-50 transition shadow-2xs"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 4 KPI CARDS — Exact Rule 3: Number stays ink, 36px rounded icon chip in its own soft color */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Open Cases"
          value={data.openCases}
          subtext={`${data.receivedThisWeek} received this week`}
          icon={FileText}
          color="blue"
        />

        <KpiCard
          label="Needs Coordination"
          value={data.needsCoordination}
          subtext="Active cross-bureau overlaps"
          icon={GitMerge}
          color="orange"
          href="/overlaps"
        />

        <KpiCard
          label="Beyond Timeline"
          value={data.beyondTimeline}
          subtext="Exceeded resolution SLA"
          icon={AlertTriangle}
          color="red"
          href="/cases?overdue=true"
        />

        <KpiCard
          label="Disposed This Month"
          value={data.disposedThisMonth}
          subtext={`${data.withinSlaPct}% within SLA deadline`}
          icon={CheckCircle2}
          color="green"
        />
      </div>

      {/* LOWER SECTION: Needs Attention (2/3 width) + Bureau Workload (1/3 width) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Needs Attention Card — Strictly 5 rows max */}
        <div className="lg:col-span-2 bg-surface rounded-xl border border-border flex flex-col shadow-2xs">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-ink uppercase tracking-wider">Needs Attention</h2>
              <p className="text-[11px] text-muted mt-0.5">
                Priority complaints flagged for cross-bureau overlap or overdue SLA.
              </p>
            </div>
            <span className="text-[10px] font-bold text-muted bg-canvas px-2 py-0.5 rounded border border-border uppercase">
              Top 5 Urgent
            </span>
          </div>

          <div className="p-4 space-y-2.5 flex-1">
            {data.needsAttention.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted">
                Nothing needs attention right now. All cases are within SLA and coordinated.
              </div>
            ) : (
              data.needsAttention.map((item) => (
                <AttentionRow
                  key={item.id}
                  id={item.id}
                  caseNo={item.caseNo}
                  institutionName={item.institutionName}
                  category={item.category}
                  bureauCode={item.bureauCode}
                  status={item.status}
                  primaryTag={item.primaryTag}
                  overdueDays={item.overdueDays}
                  overlapGroupId={item.overlapGroupId}
                  overlapStrength={item.overlapStrength}
                />
              ))
            )}
          </div>

          <div className="px-5 py-3 border-t border-border bg-canvas/40 rounded-b-xl flex items-center justify-between">
            <span className="text-[11px] text-muted">
              Auto-prioritized by cross-bureau overlap score and SLA urgency.
            </span>
            <Link
              href="/cases"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover transition"
            >
              <span>View all cases</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Workload by Bureau/Cell Card (1/3 width) — Distinct Bureau Colors */}
        <div className="bg-surface rounded-xl border border-border flex flex-col justify-between shadow-2xs">
          <div>
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                Workload by Bureau/Cell
              </h2>
              <p className="text-[11px] text-muted mt-0.5">
                Active cases held by each AICTE division.
              </p>
            </div>

            <div className="p-5 space-y-4">
              {data.bureauWorkload.map((b) => {
                const pct = totalBureauCases > 0 ? Math.round((b.openCases / totalBureauCases) * 100) : 0;
                const barColor = bureauBarColors[b.code] || "bg-primary";

                return (
                  <div key={b.code} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <BureauBadge code={b.code} size="sm" />
                        <span className="text-subtle truncate max-w-[130px] text-[11px] font-medium">
                          {b.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-bold text-ink">{b.openCases}</span>
                        <span className="text-[11px] text-muted w-8 text-right">{pct}%</span>
                      </div>
                    </div>

                    {/* Progress Bar with official Bureau Identity Color */}
                    <div className="h-2 w-full bg-[#E5E8EC] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${Math.max(4, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-5 pt-0">
            <div className="p-3 rounded-lg bg-canvas border border-border flex items-center justify-between">
              <span className="text-xs text-muted font-medium">Total Active Across AICTE</span>
              <span className="text-sm font-bold text-ink font-mono">{data.openCases} cases</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
