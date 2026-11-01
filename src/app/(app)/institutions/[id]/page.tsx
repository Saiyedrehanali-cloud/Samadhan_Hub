"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Building2,
  ArrowLeft,
  MapPin,
  GitMerge,
  ExternalLink,
  ShieldAlert,
  FileText,
  Clock,
  Layers,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface InstitutionDetailData {
  institution: {
    id: string;
    aicteId: string;
    name: string;
    address: string;
    city: string;
    state: string;
    region: string;
    type: string;
  };
  stats: {
    totalCases: number;
    openCases: number;
    disposedCases: number;
    workloadByBureau: Record<string, number>;
  };
  activeOverlap: {
    id: string;
    strength: string;
    kind: string;
    score: number;
    reasons: Array<{ signal: string; weight: number; explanation: string }>;
    detectedAt: string;
    bureausInvolved: string[];
  } | null;
  cases: Array<{
    id: string;
    caseNo: string;
    subject: string;
    category: string;
    source: string;
    status: string;
    priority: string;
    receivedAt: string;
    expectedDisposalAt: string;
    disposedAt: string | null;
    bureauCode: string;
    bureauName: string;
    assigneeName: string;
  }>;
}

export default function InstitutionProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [data, setData] = useState<InstitutionDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/institutions/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.ok && json.data) {
          setData(json.data);
        } else {
          setError(json.error?.message || "Institution not found");
        }
      })
      .catch(() => setError("Failed to load institution details"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-36 bg-slate-200 rounded animate-pulse" />
        <div className="h-32 bg-surface rounded-xl border border-border p-6 animate-pulse" />
        <div className="h-64 bg-surface rounded-xl border border-border p-6 animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-surface rounded-xl border border-border p-12 text-center">
        <AlertTriangle className="w-8 h-8 text-danger mx-auto mb-2" />
        <h2 className="text-sm font-semibold text-ink">{error || "Institution Not Found"}</h2>
        <Link
          href="/institutions"
          className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold mt-4 hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Institutions Directory</span>
        </Link>
      </div>
    );
  }

  const { institution, stats, activeOverlap, cases } = data;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DISPOSED":
        return (
          <span className="px-2 py-0.5 rounded-full bg-success-50 text-success border border-success/20 text-[10px] font-bold">
            Disposed
          </span>
        );
      case "ESCALATED":
        return (
          <span className="px-2 py-0.5 rounded-full bg-danger-50 text-danger border border-danger/20 text-[10px] font-bold">
            Escalated
          </span>
        );
      case "TRANSFERRED":
        return (
          <span className="px-2 py-0.5 rounded-full bg-warning-50 text-warning border border-warning/20 text-[10px] font-bold">
            Transferred
          </span>
        );
      case "UNDER_PROCESS":
        return (
          <span className="px-2 py-0.5 rounded-full bg-primary-50 text-primary border border-primary/20 text-[10px] font-bold">
            Under Process
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-muted border border-border text-[10px] font-bold">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <div>
        <Link
          href="/institutions"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Institutions Directory</span>
        </Link>
      </div>

      {/* Institutional Header Card */}
      <div className="p-6 bg-surface rounded-xl border border-border shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary-50 text-primary border border-primary/20">
                {institution.aicteId}
              </span>
              <span className="text-xs text-muted font-medium px-2 py-0.5 rounded bg-slate-100">
                {institution.type}
              </span>
            </div>
            <h1 className="text-xl font-bold text-primary-dark tracking-tight">
              {institution.name}
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-muted pt-1">
              <MapPin className="w-3.5 h-3.5 text-muted shrink-0" />
              <span>
                {institution.address}, {institution.city}, {institution.state} ({institution.region} Region)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0 sm:border-l sm:border-border sm:pl-6 text-center">
            <div>
              <div className="text-2xl font-bold text-primary-dark">{stats.openCases}</div>
              <div className="text-[11px] font-medium text-muted uppercase tracking-wider">
                Active Cases
              </div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div>
              <div className="text-2xl font-bold text-success">{stats.disposedCases}</div>
              <div className="text-[11px] font-medium text-muted uppercase tracking-wider">
                Disposed
              </div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div>
              <div className="text-2xl font-bold text-ink">{stats.totalCases}</div>
              <div className="text-[11px] font-medium text-muted uppercase tracking-wider">
                Lifetime
              </div>
            </div>
          </div>
        </div>

        {/* Active Overlap Alert Banner (if any) */}
        {activeOverlap && (
          <div className="p-4 rounded-xl bg-warning-50/70 border border-warning/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-ink">
                    Potential Overlapping Cases – Coordination Required
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full bg-warning text-white text-[10px] font-bold">
                    Score: {activeOverlap.score.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-muted mt-0.5">
                  Overlapping complaints currently open simultaneously across{" "}
                  <strong>{activeOverlap.bureausInvolved.join(" and ")}</strong> on this institution.
                </p>
              </div>
            </div>

            <Link
              href={`/overlaps/${activeOverlap.id}`}
              className="px-3.5 py-1.5 rounded-lg bg-surface border border-warning/40 text-xs font-semibold text-warning hover:bg-warning hover:text-white transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto shadow-2xs"
            >
              <span>Review Overlap</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* Workload Mini-Distribution across Bureaus */}
      <div className="bg-surface rounded-xl border border-border p-4 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-primary-dark uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-primary" />
            Active Case Distribution across AICTE Bureaus / Cells
          </span>
          <span className="text-[11px] text-muted">
            {stats.openCases} active complaint{stats.openCases === 1 ? "" : "s"}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg border border-border bg-slate-50/50">
            <div className="text-[11px] font-semibold text-muted">Regulation Bureau (RB)</div>
            <div className="text-xl font-bold text-primary-dark mt-1">
              {stats.workloadByBureau["RB"] || 0}
            </div>
          </div>
          <div className="p-3 rounded-lg border border-border bg-slate-50/50">
            <div className="text-[11px] font-semibold text-muted">Grievance Cell (PGRC)</div>
            <div className="text-xl font-bold text-primary-dark mt-1">
              {stats.workloadByBureau["PGRC"] || 0}
            </div>
          </div>
          <div className="p-3 rounded-lg border border-border bg-slate-50/50">
            <div className="text-[11px] font-semibold text-muted">Approval Bureau (AB)</div>
            <div className="text-xl font-bold text-primary-dark mt-1">
              {stats.workloadByBureau["AB"] || 0}
            </div>
          </div>
          <div className="p-3 rounded-lg border border-border bg-slate-50/50">
            <div className="text-[11px] font-semibold text-muted">Legal Cell (LC)</div>
            <div className="text-xl font-bold text-primary-dark mt-1">
              {stats.workloadByBureau["LC"] || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Consolidated Grievance History Table — Strictly 6 Columns Max */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-border bg-slate-50/70 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-primary-dark uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-primary" />
              Consolidated Grievance History
            </h2>
            <p className="text-[11px] text-muted mt-0.5">
              Chronological single-window view of all complaints recorded for this institution across all AICTE bureaus.
            </p>
          </div>
          <span className="text-xs text-muted font-medium">{cases.length} Total Records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-slate-50/50 text-[11px] font-bold text-muted uppercase tracking-wider">
                <th className="py-3 px-4">Case No</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Holding Bureau</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Received Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {cases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted">
                    No complaints on record for this institution.
                  </td>
                </tr>
              ) : (
                cases.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/cases/${c.id}`)}
                    className="hover:bg-slate-50/80 transition cursor-pointer group"
                  >
                    {/* Col 1: Case No */}
                    <td className="py-3 px-4 font-mono font-semibold text-primary">
                      {c.caseNo}
                    </td>

                    {/* Col 2: Subject */}
                    <td className="py-3 px-4 max-w-[320px]">
                      <div className="font-semibold text-ink group-hover:text-primary transition truncate">
                        {c.subject}
                      </div>
                      <div className="text-[11px] text-muted truncate mt-0.5">
                        Assigned to: {c.assigneeName}
                      </div>
                    </td>

                    {/* Col 3: Category */}
                    <td className="py-3 px-4 text-ink font-medium">
                      {c.category}
                    </td>

                    {/* Col 4: Bureau */}
                    <td className="py-3 px-4">
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-ink">
                        {c.bureauCode}
                      </span>
                    </td>

                    {/* Col 5: Status */}
                    <td className="py-3 px-4">
                      {getStatusBadge(c.status)}
                    </td>

                    {/* Col 6: Received Date */}
                    <td className="py-3 px-4 text-right text-muted font-mono text-[11px]">
                      {formatDate(c.receivedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
