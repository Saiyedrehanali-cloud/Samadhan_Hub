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
  ExternalLink,
  Building,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

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
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json?.error?.message || "Failed to load dashboard summary");
      }
      setData(json.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  if (loading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header skeleton */}
        <div className="h-8 w-48 bg-slate-200 rounded-md"></div>
        {/* 4 KPIs skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-surface rounded-xl border border-border p-5"></div>
          ))}
        </div>
        {/* 2-col content skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-surface rounded-xl border border-border"></div>
          <div className="h-72 bg-surface rounded-xl border border-border"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-surface rounded-xl border border-danger/20 text-center">
        <AlertTriangle className="w-8 h-8 text-danger mx-auto mb-2" />
        <h3 className="text-sm font-semibold text-ink">Failed to load overview data</h3>
        <p className="text-xs text-muted mt-1 mb-4">{error}</p>
        <button
          onClick={fetchSummary}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      </div>
    );
  }

  const totalBureauCases = data.bureauWorkload.reduce((sum, b) => sum + b.openCases, 0);

  const bureauBarColors: Record<string, string> = {
    RB: "bg-primary",
    PGRC: "bg-[#7C3AED]",
    AB: "bg-[#0D9488]",
    LC: "bg-[#B45309]",
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Scope Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-primary-dark tracking-tight">Overview</h1>
          <p className="text-xs text-muted mt-0.5">
            Single-window complaint tracking and cross-bureau coordination summary.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchSummary}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-surface text-muted hover:text-ink text-xs font-medium transition"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 4 KPI CARDS — Strict Minimalism Rule 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Open cases */}
        <div className="bg-surface rounded-xl border border-border p-5 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted uppercase tracking-wider">Open Cases</span>
            <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-primary-dark tracking-tight">{data.openCases}</div>
            <p className="text-xs text-muted mt-1">
              {data.receivedThisWeek} received this week
            </p>
          </div>
        </div>

        {/* KPI 2: Needs coordination */}
        <Link
          href="/overlaps"
          className="bg-surface rounded-xl border border-border hover:border-warning/40 p-5 flex flex-col justify-between transition group shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted uppercase tracking-wider">Needs Coordination</span>
            <div className="w-8 h-8 rounded-lg bg-warning-50 text-warning flex items-center justify-center group-hover:scale-105 transition-transform">
              <GitMerge className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-warning tracking-tight">{data.needsCoordination}</div>
            <p className="text-xs text-muted mt-1">
              Active cross-bureau overlaps
            </p>
          </div>
        </Link>

        {/* KPI 3: Beyond timeline */}
        <Link
          href="/cases?overdue=true"
          className="bg-surface rounded-xl border border-border hover:border-danger/40 p-5 flex flex-col justify-between transition group shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted uppercase tracking-wider">Beyond Timeline</span>
            <div className="w-8 h-8 rounded-lg bg-danger-50 text-danger flex items-center justify-center group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-danger tracking-tight">{data.beyondTimeline}</div>
            <p className="text-xs text-muted mt-1">
              Exceeded standard resolution SLA
            </p>
          </div>
        </Link>

        {/* KPI 4: Disposed this month */}
        <div className="bg-surface rounded-xl border border-border p-5 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted uppercase tracking-wider">Disposed This Month</span>
            <div className="w-8 h-8 rounded-lg bg-success-50 text-success flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-success tracking-tight">{data.disposedThisMonth}</div>
            <p className="text-xs text-muted mt-1">
              {data.withinSlaPct}% within SLA deadline
            </p>
          </div>
        </div>
      </div>

      {/* LOWER SECTION: Needs Attention (2/3 width) + Bureau Workload (1/3 width) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Needs Attention Card — Strictly 5 rows max */}
        <div className="lg:col-span-2 bg-surface rounded-xl border border-border flex flex-col shadow-2xs">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-primary-dark">Needs Attention</h2>
              <p className="text-[11px] text-muted">
                Priority complaints flagged for cross-bureau overlap or overdue SLA.
              </p>
            </div>
            <span className="text-[11px] font-medium text-muted">Top 5 Urgent</span>
          </div>

          <div className="divide-y divide-border flex-1">
            {data.needsAttention.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted">
                Nothing needs attention right now. All cases are within SLA and coordinated.
              </div>
            ) : (
              data.needsAttention.map((item) => (
                <Link
                  key={item.id}
                  href={`/cases/${item.id}`}
                  className="p-4 flex items-center justify-between hover:bg-slate-50/70 transition group"
                >
                  <div className="space-y-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Priority Tag Chip */}
                      {item.primaryTag === "OVERLAP" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-warning-50 text-warning border border-warning/20">
                          <GitMerge className="w-3 h-3" />
                          Overlap ({item.overlapStrength || "Strong"})
                        </span>
                      )}
                      {item.primaryTag === "OVERDUE" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-danger-50 text-danger border border-danger/20">
                          <AlertTriangle className="w-3 h-3" />
                          {item.overdueDays}d Overdue
                        </span>
                      )}
                      {item.primaryTag === "ESCALATED" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-danger-50 text-danger border border-danger/20">
                          Escalated
                        </span>
                      )}

                      {/* Bureau Chip */}
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {item.bureauCode}
                      </span>

                      {/* Case ID */}
                      <span className="text-xs font-mono font-medium text-muted">
                        {item.caseNo}
                      </span>
                    </div>

                    {/* Institution Name */}
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-ink truncate">
                      <Building className="w-3.5 h-3.5 text-muted shrink-0" />
                      <span className="truncate">{item.institutionName}</span>
                    </div>

                    {/* Grievance Subject */}
                    <p className="text-xs text-muted truncate">
                      {item.subject}
                    </p>
                  </div>

                  {/* Right Action Arrow */}
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-[11px] text-muted hidden sm:inline">
                      {formatRelativeTime(item.receivedAt)}
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              ))
            )}
          </div>

          <div className="px-5 py-3 border-t border-border bg-slate-50/50 rounded-b-xl flex items-center justify-between">
            <span className="text-[11px] text-muted">
              Cases automatically prioritized by multi-signal severity index.
            </span>
            <Link
              href="/cases"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-dark transition"
            >
              <span>View all cases</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Workload by Bureau/Cell Card (1/3 width) */}
        <div className="bg-surface rounded-xl border border-border flex flex-col justify-between shadow-2xs">
          <div>
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-primary-dark">Workload by Bureau/Cell</h2>
              <p className="text-[11px] text-muted">
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
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-ink">{b.code}</span>
                        <span className="text-muted truncate max-w-[140px] text-[11px]">
                          ({b.name})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink">{b.openCases}</span>
                        <span className="text-[11px] text-muted w-8 text-right">{pct}%</span>
                      </div>
                    </div>
                    {/* Minimal Progress Bar */}
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor}`}
                        style={{ width: `${Math.max(4, pct)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-5 pt-0">
            <div className="p-3 rounded-lg bg-canvas border border-border flex items-center justify-between">
              <span className="text-xs text-muted font-medium">Total Open Across AICTE</span>
              <span className="text-sm font-bold text-primary-dark">{data.openCases} cases</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

