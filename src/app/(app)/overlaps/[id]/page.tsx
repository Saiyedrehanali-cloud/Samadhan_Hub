"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  GitMerge,
  Building,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Link2,
  Calendar,
  Clock,
  ShieldCheck,
  Loader2,
  X,
  ExternalLink,
} from "lucide-react";
import { formatDate, formatDateTime, formatRelativeTime } from "@/lib/utils";

interface OverlapDetailData {
  id: string;
  institution: {
    id: string;
    name: string;
    aicteId: string;
    address: string;
    city: string;
    state: string;
    region: string;
  };
  kind: "CROSS_BUREAU" | "DUPLICATE" | "POSSIBLE_CONFLICT";
  score: number;
  strength: "STRONG" | "POSSIBLE";
  status: "OPEN" | "COORDINATED" | "DISMISSED";
  leadBureauCode: string | null;
  resolutionNote: string | null;
  detectedAt: string;
  resolvedAt: string | null;
  involvedBureaus: string[];
  reasons: Array<{ code: string; label: string; weight: number }>;
  members: Array<{
    id: string;
    caseNo: string;
    category: string;
    subject: string;
    description: string;
    status: string;
    priority: string;
    receivedAt: string;
    expectedDisposalAt: string;
    lastActionAt: string;
    lastActionNote: string | null;
    nextAction: string | null;
    currentBureau: { code: string; name: string };
    assignee: { name: string; email: string } | null;
  }>;
  currentUserRole: string;
  userBureauCode: string | null;
}

export default function OverlapDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [data, setData] = useState<OverlapDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [activeModal, setActiveModal] = useState<"LINK" | "COORDINATE" | "DISMISS" | null>(null);
  const [modalText, setModalText] = useState("");
  const [selectedLead, setSelectedLead] = useState("RB");
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadGroup = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/overlaps/${groupId}`);
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json?.error?.message || "Failed to load overlap details.");
      }
      setData(json.data);
      if (json.data.involvedBureaus?.[0]) {
        setSelectedLead(json.data.involvedBureaus[0]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error loading overlap group";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);

    let url = "";
    let body: Record<string, unknown> = {};

    if (activeModal === "LINK") {
      url = `/api/overlaps/${groupId}/link`;
      body = { remarks: modalText };
    } else if (activeModal === "COORDINATE") {
      url = `/api/overlaps/${groupId}/coordinate`;
      body = { leadBureauCode: selectedLead, remarks: modalText };
    } else if (activeModal === "DISMISS") {
      url = `/api/overlaps/${groupId}/dismiss`;
      body = { reason: modalText };
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

      setActiveModal(null);
      setModalText("");
      await loadGroup();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to execute coordination action.";
      setModalError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 rounded"></div>
        <div className="h-32 bg-surface rounded-xl border border-border"></div>
        <div className="grid grid-cols-2 gap-6">
          <div className="h-96 bg-surface rounded-xl border border-border"></div>
          <div className="h-96 bg-surface rounded-xl border border-border"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-surface rounded-xl border border-danger/20 text-center">
        <AlertTriangle className="w-8 h-8 text-danger mx-auto mb-2" />
        <h3 className="text-sm font-semibold text-ink">Failed to load overlap</h3>
        <p className="text-xs text-muted mt-1 mb-4">{error}</p>
        <Link
          href="/overlaps"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Overlaps</span>
        </Link>
      </div>
    );
  }

  const isConflict = data.kind === "POSSIBLE_CONFLICT";

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb */}
      <div>
        <Link
          href="/overlaps"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-primary transition mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Overlaps</span>
        </Link>

        {/* Header Card */}
        <div className="bg-surface rounded-xl border border-border p-6 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    isConflict
                      ? "bg-danger-50 text-danger border-danger/30"
                      : data.strength === "STRONG"
                      ? "bg-warning-50 text-warning border-warning/30"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                  }`}
                >
                  <GitMerge className="w-3.5 h-3.5" />
                  {isConflict
                    ? "Regulatory Conflict Detected"
                    : `${data.strength} Overlap (${data.kind})`}
                </span>

                <span
                  className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
                    data.status === "OPEN"
                      ? "bg-amber-100 text-amber-800"
                      : data.status === "COORDINATED"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  Status: {data.status}
                </span>

                <span className="text-xs text-muted">
                  Detected {formatDate(data.detectedAt)}
                </span>
              </div>

              <h1 className="text-xl md:text-2xl font-bold text-primary-dark tracking-tight">
                {data.institution.name}
              </h1>

              <div className="flex items-center gap-2 text-xs text-muted flex-wrap">
                <span className="font-mono">AICTE ID: {data.institution.aicteId}</span>
                <span>·</span>
                <span>{data.institution.city}, {data.institution.region} Region</span>
                <span>·</span>
                <span>Bureaus Involved: <strong>{data.involvedBureaus.join(", ")}</strong></span>
              </div>
            </div>

            {/* Coordination Action Buttons */}
            {data.status === "OPEN" && (
              <div className="flex items-center gap-2 flex-wrap self-start">
                <button
                  onClick={() => {
                    setActiveModal("LINK");
                    setModalText("Cases cross-referenced and linked for synchronized review.");
                  }}
                  className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-slate-50 text-xs font-semibold text-ink shadow-2xs transition inline-flex items-center gap-1.5"
                >
                  <Link2 className="w-3.5 h-3.5 text-muted" />
                  <span>Link Cases</span>
                </button>

                <button
                  onClick={() => {
                    setActiveModal("COORDINATE");
                    setModalText(
                      `Joint review conducted. Designating ${data.involvedBureaus[0] || "RB"} as lead bureau to coordinate institutional response.`
                    );
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold shadow-2xs transition inline-flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Mark Coordinated</span>
                </button>

                <button
                  onClick={() => {
                    setActiveModal("DISMISS");
                    setModalText("");
                  }}
                  className="px-3 py-1.5 rounded-lg border border-border text-muted hover:text-danger hover:bg-danger-50 text-xs font-medium shadow-2xs transition"
                >
                  Dismiss Advisory
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* REGULATORY CONFLICT WARNING BANNER */}
      {isConflict && data.status === "OPEN" && (
        <div className="p-4 rounded-xl border border-danger/40 bg-danger-50/90 text-danger shadow-2xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider">
                Action Conflict Warning
              </h3>
              <p className="text-xs text-ink/90 mt-1 leading-relaxed">
                One Bureau (Regulation Bureau) is proceeding with adverse regulatory steps (show-cause / inspection memo), while PGR Cell is proceeding toward routine closure. Coordination is urgently required to prevent conflicting administrative communications to the institution.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* RESOLUTION STATUS BANNER (If already Coordinated or Dismissed) */}
      {data.status === "COORDINATED" && (
        <div className="p-4 rounded-xl border border-success/30 bg-success-50 text-success shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <div className="text-xs">
              <span className="font-bold">Coordination Agreement Active:</span> Lead Bureau designated as{" "}
              <strong>{data.leadBureauCode}</strong>.
              {data.resolutionNote && <p className="italic text-ink/80 mt-0.5">&quot;{data.resolutionNote}&quot;</p>}
            </div>
          </div>
          <span className="text-[11px] text-muted">
            Resolved {formatDate(data.resolvedAt)}
          </span>
        </div>
      )}

      {data.status === "DISMISSED" && (
        <div className="p-4 rounded-xl border border-slate-300 bg-slate-100 text-slate-700 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <XCircle className="w-5 h-5 shrink-0 text-muted" />
            <div className="text-xs">
              <span className="font-bold">Advisory Dismissed:</span> {data.resolutionNote}
            </div>
          </div>
          <span className="text-[11px] text-muted">
            Dismissed {formatDate(data.resolvedAt)}
          </span>
        </div>
      )}

      {/* "WHY FLAGGED" EXPLAINABLE MULTI-SIGNAL CARD */}
      <div className="bg-surface rounded-xl border border-border p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <div>
            <h2 className="text-xs font-bold text-primary-dark uppercase tracking-wider">
              Explainable Detection Signals (Composite Score: {Math.round(data.score * 100)}%)
            </h2>
            <p className="text-[11px] text-muted">
              Deterministic scoring based on institution identity, handling bureaus, category relevance, text similarity, and time proximity.
            </p>
          </div>
          <span className="text-xs font-bold font-mono text-primary bg-primary-50 px-2 py-0.5 rounded">
            Score: {data.score.toFixed(2)} / 1.00
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
          {data.reasons.map((r, i) => (
            <div
              key={i}
              className="p-3 rounded-lg border border-border bg-canvas/60 flex flex-col justify-between"
            >
              <div className="text-xs font-medium text-ink leading-relaxed">
                {r.label}
              </div>
              <div className="flex items-center justify-between mt-2 pt-1 border-t border-border/60">
                <span className="text-[10px] font-mono text-muted uppercase tracking-wider">
                  {r.code}
                </span>
                <span className="text-xs font-bold text-primary">
                  +{Math.round(r.weight * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SIDE-BY-SIDE CASE COMPARISON */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-primary-dark tracking-tight">
          Side-by-Side Case Comparison ({data.members.length} Cases)
        </h2>

        <div className={`grid grid-cols-1 ${data.members.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"} gap-4`}>
          {data.members.map((m) => (
            <div
              key={m.id}
              className="bg-surface rounded-xl border border-border p-5 space-y-3.5 shadow-2xs flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Case Top Badges */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary-50">
                    {m.caseNo}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-800">
                    {m.currentBureau.code} ({m.currentBureau.name})
                  </span>
                </div>

                {/* Subject */}
                <div>
                  <h3 className="text-sm font-bold text-ink leading-snug">
                    {m.subject}
                  </h3>
                  <div className="text-[11px] text-muted mt-0.5">
                    Category: <strong>{m.category}</strong> · Status: {m.status}
                  </div>
                </div>

                {/* Grievance Description Preview */}
                <div className="p-3 rounded-lg bg-canvas/70 border border-border text-xs text-ink/90 leading-relaxed whitespace-pre-wrap">
                  {m.description}
                </div>

                {/* Timeline info */}
                <div className="space-y-1.5 text-[11px] text-muted border-t border-border pt-2.5">
                  <div className="flex items-center justify-between">
                    <span>Received Date:</span>
                    <span className="font-medium text-ink">{formatDate(m.receivedAt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Target SLA:</span>
                    <span className="font-medium text-ink">{formatDate(m.expectedDisposalAt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Next Scheduled Action:</span>
                    <span className="font-medium text-ink truncate max-w-[150px]">
                      {m.nextAction || "—"}
                    </span>
                  </div>
                  {m.lastActionNote && (
                    <div className="pt-1 text-[11px] text-ink/80 italic">
                      Last note: &quot;{m.lastActionNote}&quot;
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Direct Link */}
              <div className="pt-3 border-t border-border">
                <Link
                  href={`/cases/${m.id}`}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-border bg-surface hover:bg-slate-50 text-xs font-semibold text-primary transition shadow-2xs"
                >
                  <span>Open Case Workspace</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ACTION MODAL OVERLAYS */}
      {activeModal && (
        <div className="fixed inset-0 bg-ink/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-surface rounded-xl border border-border p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-primary-dark">
                {activeModal === "LINK" && "Link Cases Mutually"}
                {activeModal === "COORDINATE" && "Mark Coordinated & Designate Lead Bureau"}
                {activeModal === "DISMISS" && "Dismiss Overlap Advisory"}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-md text-muted hover:text-ink hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-lg bg-danger-50 border border-danger/20 text-danger text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleModalSubmit} className="space-y-4 text-xs">
              {activeModal === "COORDINATE" && (
                <div>
                  <label className="block font-medium text-ink mb-1">
                    Designate Lead Bureau / Cell *
                  </label>
                  <p className="text-[11px] text-muted mb-1.5">
                    The chosen Bureau will take primary charge of issuing notices and institutional inquiries.
                  </p>
                  <select
                    value={selectedLead}
                    onChange={(e) => setSelectedLead(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {data.involvedBureaus.map((b) => (
                      <option key={b} value={b}>
                        {b} ({b === "RB" ? "Regulation Bureau" : b === "PGRC" ? "PGR Cell" : b === "AB" ? "Approval Bureau" : "Legal Cell"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-medium text-ink mb-1">
                  {activeModal === "DISMISS"
                    ? "Mandatory Dismissal Justification *"
                    : "Coordination Notes / Joint Plan *"}
                </label>
                <textarea
                  required
                  rows={4}
                  value={modalText}
                  onChange={(e) => setModalText(e.target.value)}
                  placeholder={
                    activeModal === "DISMISS"
                      ? "Explain why these cases do not require coordination (e.g. verified distinct academic programs)..."
                      : "Detail the agreed lead bureau, shared evidence, and unified communication plan..."
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3 py-1.5 rounded-lg border border-border text-ink hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium transition shadow-2xs disabled:opacity-60 inline-flex items-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Confirm</span>
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

