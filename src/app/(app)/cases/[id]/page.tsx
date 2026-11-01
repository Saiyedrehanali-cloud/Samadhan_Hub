"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  GitMerge,
  Clock,
  Building,
  User,
  Shield,
  Send,
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle,
  FileText,
  Calendar,
  X,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { formatDate, formatDateTime, formatRelativeTime, computeSlaState, STATUS_MAP } from "@/lib/utils";

interface CaseDetailData {
  case: {
    id: string;
    caseNo: string;
    category: string;
    source: string;
    subject: string;
    description: string;
    status: string;
    priority: string;
    receivedAt: string;
    slaDays: number;
    expectedDisposalAt: string;
    lastActionAt: string;
    lastActionNote: string | null;
    nextAction: string | null;
    disposedAt: string | null;
    outcome: string | null;
    originBureauCode: string;
    institution: {
      id: string;
      name: string;
      aicteId: string;
      address: string;
      city: string;
      state: string;
      region: string;
      type: string;
    };
    currentBureau: {
      id: string;
      code: string;
      name: string;
    };
    assignee: {
      id: string;
      name: string;
      email: string;
    } | null;
    actions: Array<{
      id: string;
      type: string;
      bureauCode: string;
      fromValue: string | null;
      toValue: string | null;
      remarks: string | null;
      createdAt: string;
      actor: {
        id: string;
        name: string;
        email: string;
      } | null;
    }>;
  };
  relatedCases: Array<{
    id: string;
    caseNo: string;
    category: string;
    subject: string;
    status: string;
    receivedAt: string;
    expectedDisposalAt: string;
    currentBureau: {
      code: string;
      name: string;
    };
  }>;
  activeOverlap: {
    id: string;
    kind: string;
    score: number;
    strength: string;
    reasonsJson: string;
    members: Array<{
      case: {
        id: string;
        caseNo: string;
        category: string;
        subject: string;
        status: string;
        currentBureau: { code: string; name: string };
      };
    }>;
  } | null;
  canMutate: boolean;
  currentUser: {
    id: string;
    name: string;
    role: string;
    bureauCode: string | null;
  };
}

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;

  const [data, setData] = useState<CaseDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [modalType, setModalType] = useState<
    "REMARK" | "STATUS" | "TRANSFER" | "ESCALATE" | "DISPOSE" | null
  >(null);
  const [modalInput, setModalInput] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("UNDER_PROCESS");
  const [selectedBureau, setSelectedBureau] = useState("PGRC");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadCase = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/cases/${caseId}`);
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json?.error?.message || "Failed to load case details.");
      }
      setData(json.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error loading case";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    loadCase();
  }, [loadCase]);

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);

    let url = "";
    let body: Record<string, unknown> = {};

    if (modalType === "REMARK") {
      url = `/api/cases/${caseId}/remark`;
      body = { remarks: modalInput };
    } else if (modalType === "STATUS") {
      url = `/api/cases/${caseId}/status`;
      body = { status: selectedStatus, remarks: modalInput };
    } else if (modalType === "TRANSFER") {
      url = `/api/cases/${caseId}/transfer`;
      body = { toBureauCode: selectedBureau, reason: modalInput };
    } else if (modalType === "ESCALATE") {
      url = `/api/cases/${caseId}/escalate`;
      body = { remarks: modalInput };
    } else if (modalType === "DISPOSE") {
      url = `/api/cases/${caseId}/dispose`;
      body = { outcome: modalInput };
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json?.error?.message || "Action failed.");
      }

      setModalType(null);
      setModalInput("");
      await loadCase();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to execute action.";
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 rounded"></div>
        <div className="h-32 bg-surface rounded-xl border border-border"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-surface rounded-xl border border-border"></div>
          <div className="h-96 bg-surface rounded-xl border border-border"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-surface rounded-xl border border-danger/20 text-center">
        <AlertTriangle className="w-8 h-8 text-danger mx-auto mb-2" />
        <h3 className="text-sm font-semibold text-ink">Failed to load case details</h3>
        <p className="text-xs text-muted mt-1 mb-4">{error}</p>
        <Link
          href="/cases"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Cases</span>
        </Link>
      </div>
    );
  }

  const { case: c, relatedCases, activeOverlap, canMutate } = data;

  const sla = computeSlaState({
    receivedAt: c.receivedAt,
    slaDays: c.slaDays,
    expectedDisposalAt: c.expectedDisposalAt,
    disposedAt: c.disposedAt,
    status: c.status,
  });

  const statusConfig = STATUS_MAP[c.status] || {
    label: c.status,
    bg: "bg-slate-100",
    text: "text-slate-700",
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation Breadcrumb */}
      <div>
        <Link
          href="/cases"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-primary transition mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Cases</span>
        </Link>

        {/* Case Header Card */}
        <div className="bg-surface rounded-xl border border-border p-6 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary-50">
                  {c.caseNo}
                </span>

                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                  {statusConfig.label}
                </span>

                <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700">
                  Held by: {c.currentBureau.code} ({c.currentBureau.name})
                </span>

                {c.priority === "HIGH" && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-danger-50 text-danger border border-danger/20">
                    High Priority
                  </span>
                )}
              </div>

              <h1 className="text-lg md:text-xl font-bold text-primary-dark tracking-tight leading-snug">
                {c.subject}
              </h1>

              <div className="flex items-center gap-2 text-xs text-muted flex-wrap">
                <span className="font-medium text-ink">{c.institution.name}</span>
                <span>·</span>
                <span className="font-mono">AICTE ID: {c.institution.aicteId}</span>
                <span>·</span>
                <span>Category: {c.category}</span>
              </div>
            </div>

            {/* Contextual Action Buttons */}
            {canMutate && c.status !== "DISPOSED" && (
              <div className="flex items-center gap-2 flex-wrap self-start">
                <button
                  onClick={() => {
                    setModalType("REMARK");
                    setModalInput("");
                  }}
                  className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-slate-50 text-xs font-medium text-ink transition shadow-2xs"
                >
                  + Add Remark
                </button>

                <button
                  onClick={() => {
                    setModalType("STATUS");
                    setSelectedStatus(c.status === "RECEIVED" ? "UNDER_PROCESS" : c.status);
                    setModalInput("");
                  }}
                  className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-slate-50 text-xs font-medium text-ink transition shadow-2xs"
                >
                  Update Status
                </button>

                <button
                  onClick={() => {
                    setModalType("TRANSFER");
                    setSelectedBureau(c.currentBureau.code === "RB" ? "PGRC" : "RB");
                    setModalInput("");
                  }}
                  className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-slate-50 text-xs font-medium text-ink transition shadow-2xs inline-flex items-center gap-1"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-muted" />
                  <span>Transfer</span>
                </button>

                <button
                  onClick={() => {
                    setModalType("ESCALATE");
                    setModalInput("");
                  }}
                  className="px-3 py-1.5 rounded-lg border border-danger/20 bg-danger-50 text-danger hover:bg-danger-100/60 text-xs font-medium transition shadow-2xs"
                >
                  Escalate
                </button>

                <button
                  onClick={() => {
                    setModalType("DISPOSE");
                    setModalInput("");
                  }}
                  className="px-3 py-1.5 rounded-lg bg-success text-white hover:bg-success/90 text-xs font-medium transition shadow-2xs inline-flex items-center gap-1"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Dispose Case</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* OVERLAP ADVISORY BANNER (If Active Overlap Exists) */}
      {activeOverlap && (
        <div className="p-4 rounded-xl border border-warning/40 bg-warning-50/80 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-warning text-white flex items-center justify-center shrink-0 mt-0.5">
                <GitMerge className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-warning-dark uppercase tracking-wider">
                    Potential Overlapping Cases – Coordination Required
                  </h3>
                  <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-white text-warning border border-warning/30">
                    {activeOverlap.strength} Overlap ({activeOverlap.kind})
                  </span>
                </div>
                <p className="text-xs text-ink/80 mt-1 leading-relaxed">
                  Another open case for <strong>{c.institution.name}</strong> is currently being handled in parallel by another Bureau. Review before taking conflicting administrative action.
                </p>
              </div>
            </div>

            <Link
              href={`/overlaps`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-warning text-white hover:bg-warning/90 text-xs font-semibold shrink-0 shadow-2xs transition"
            >
              <span>Review Overlap</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* TWO-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Case Description Card */}
          <div className="bg-surface rounded-xl border border-border p-5 space-y-3 shadow-2xs">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
              Grievance Description
            </h2>
            <div className="text-xs text-ink leading-relaxed whitespace-pre-wrap bg-canvas/60 p-4 rounded-lg border border-border">
              {c.description}
            </div>
            {c.outcome && (
              <div className="mt-3 p-3.5 rounded-lg bg-success-50 border border-success/20 text-xs text-success leading-relaxed">
                <strong>Disposal Outcome:</strong> {c.outcome}
              </div>
            )}
          </div>

          {/* Chronological Action History Timeline */}
          <div className="bg-surface rounded-xl border border-border p-5 shadow-2xs">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
                Chronological Case History & Timeline
              </h2>
              <span className="text-[11px] text-muted">{c.actions.length} action logs</span>
            </div>

            <div className="pt-5 pl-2 relative">
              {/* Timeline continuous vertical line */}
              <div className="absolute left-5 top-7 bottom-4 w-0.5 bg-border"></div>

              <div className="space-y-6">
                {c.actions.map((act) => (
                  <div key={act.id} className="relative flex items-start gap-4 group">
                    {/* Action Icon / Dot */}
                    <div className="w-6 h-6 rounded-full bg-surface border-2 border-primary text-primary flex items-center justify-center shrink-0 z-10 shadow-2xs">
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                    </div>

                    {/* Action Content Card */}
                    <div className="flex-1 bg-canvas/40 rounded-lg p-3 border border-border text-xs space-y-1">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ink">
                            {act.type.replace(/_/g, " ")}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {act.bureauCode}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted">
                          {formatDateTime(act.createdAt)} ({formatRelativeTime(act.createdAt)})
                        </span>
                      </div>

                      {act.remarks && (
                        <p className="text-xs text-ink/90 leading-relaxed pt-0.5">
                          {act.remarks}
                        </p>
                      )}

                      <div className="text-[10px] text-muted pt-1">
                        Recorded by: {act.actor?.name || "System"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1/3 width): Metadata & Related Cases */}
        <div className="space-y-6">
          {/* Metadata Card */}
          <div className="bg-surface rounded-xl border border-border p-5 space-y-3.5 shadow-2xs">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider pb-2 border-b border-border">
              Timeline & SLA Particulars
            </h2>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Received Date:
                </span>
                <span className="font-medium text-ink">{formatDate(c.receivedAt)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  SLA Target Date:
                </span>
                <span className="font-medium text-ink">{formatDate(c.expectedDisposalAt)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted">SLA Resolution Window:</span>
                <span className="font-medium text-ink">{c.slaDays} calendar days</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted">Current SLA State:</span>
                <span className={`px-2 py-0.5 rounded text-[11px] border font-semibold ${sla.badgeClass}`}>
                  {sla.badgeText}
                </span>
              </div>

              <div className="pt-2 border-t border-border">
                <div className="text-muted text-[11px]">Immediate Next Action:</div>
                <div className="font-medium text-ink mt-0.5">
                  {c.nextAction || "None scheduled"}
                </div>
              </div>
            </div>
          </div>

          {/* Institution Mini Profile */}
          <div className="bg-surface rounded-xl border border-border p-5 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
                Institution Profile
              </h2>
              <Link
                href={`/institutions/${c.institution.id}`}
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                Full Profile →
              </Link>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="font-bold text-ink">{c.institution.name}</div>
              <div className="text-muted text-[11px] font-mono">
                Permanent AICTE ID: {c.institution.aicteId}
              </div>
              <div className="text-muted text-[11px]">
                {c.institution.city}, {c.institution.state} ({c.institution.region} Region)
              </div>
              <div className="text-muted text-[11px]">
                Type: {c.institution.type}
              </div>
            </div>
          </div>

          {/* Related Cases for this Institution */}
          <div className="bg-surface rounded-xl border border-border p-5 space-y-3 shadow-2xs">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider pb-2 border-b border-border">
              Related Cases on this Institution
            </h2>

            {relatedCases.length === 0 ? (
              <p className="text-xs text-muted">No other cases recorded for this institution.</p>
            ) : (
              <div className="space-y-2.5">
                {relatedCases.map((rc) => (
                  <Link
                    key={rc.id}
                    href={`/cases/${rc.id}`}
                    className="p-2.5 rounded-lg border border-border bg-canvas/50 hover:bg-slate-100 flex items-center justify-between text-xs transition block group"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold text-primary">
                          {rc.caseNo}
                        </span>
                        <span className="px-1 rounded text-[9px] font-semibold bg-slate-200 text-slate-700">
                          {rc.currentBureau.code}
                        </span>
                      </div>
                      <div className="text-ink truncate font-medium text-[11px] mt-0.5">
                        {rc.subject}
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted group-hover:text-primary transition shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ACTION MODAL OVERLAY */}
      {modalType && (
        <div className="fixed inset-0 bg-ink/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-surface rounded-xl border border-border p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-primary-dark">
                {modalType === "REMARK" && "Add Progress Remark"}
                {modalType === "STATUS" && "Update Case Status"}
                {modalType === "TRANSFER" && "Transfer Case to Another Bureau/Cell"}
                {modalType === "ESCALATE" && "Escalate Case to Management"}
                {modalType === "DISPOSE" && "Dispose / Close Case"}
              </h3>
              <button
                onClick={() => setModalType(null)}
                className="p-1 rounded-md text-muted hover:text-ink hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionError && (
              <div className="p-3 rounded-lg bg-danger-50 border border-danger/20 text-danger text-xs">
                {actionError}
              </div>
            )}

            <form onSubmit={handleActionSubmit} className="space-y-4 text-xs">
              {modalType === "STATUS" && (
                <div>
                  <label className="block font-medium text-ink mb-1">Select New Status</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="UNDER_PROCESS">Under Process</option>
                    <option value="ESCALATED">Escalated</option>
                    <option value="TRANSFERRED">Transferred</option>
                  </select>
                </div>
              )}

              {modalType === "TRANSFER" && (
                <div>
                  <label className="block font-medium text-ink mb-1">Target Bureau / Cell *</label>
                  <select
                    value={selectedBureau}
                    onChange={(e) => setSelectedBureau(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="RB">Regulation Bureau (RB)</option>
                    <option value="PGRC">Public Grievance Redressal Cell (PGRC)</option>
                    <option value="AB">Approval Bureau (AB)</option>
                    <option value="LC">Legal Cell (LC)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block font-medium text-ink mb-1">
                  {modalType === "DISPOSE" ? "Mandatory Disposal Outcome *" : "Action Remarks / Justification *"}
                </label>
                <textarea
                  required
                  rows={4}
                  value={modalInput}
                  onChange={(e) => setModalInput(e.target.value)}
                  placeholder={
                    modalType === "DISPOSE"
                      ? "Detail the compliance verified, refund executed, or resolution outcome..."
                      : "Enter notes for this action..."
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-3 py-1.5 rounded-lg border border-border text-ink hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium transition shadow-2xs disabled:opacity-60 inline-flex items-center gap-1.5"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Confirm Action</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

