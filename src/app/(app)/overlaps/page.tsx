"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  GitMerge,
  Building,
  RefreshCw,
  ChevronRight,
  ShieldAlert,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { StatusChip } from "@/components/common/StatusChip";
import { BureauBadge } from "@/components/common/BureauBadge";

interface OverlapGroupItem {
  id: string;
  institution: {
    id: string;
    name: string;
    aicteId: string;
    city: string;
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
    status: string;
    priority: string;
    receivedAt: string;
    currentBureau: { code: string; name: string };
  }>;
}

function OverlapsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "OPEN";

  const [activeTab, setActiveTab] = useState<string>(initialStatus);
  const [groups, setGroups] = useState<OverlapGroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/overlaps?status=${activeTab}`);
      const json = await res.json();
      if (json.ok) {
        setGroups(json.data);
      }
    } catch (err) {
      console.error("Failed to load overlaps:", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    router.replace(`/overlaps?status=${tab}`, { scroll: false });
  };

  const handleRunScan = async () => {
    setScanning(true);
    setScanMessage(null);
    try {
      const res = await fetch("/api/overlaps/scan", { method: "POST" });
      const json = await res.json();
      if (json.ok) {
        setScanMessage("Full overlap re-scan completed across all institutions.");
        await fetchGroups();
      } else {
        setScanMessage(json?.error?.message || "Scan failed.");
      }
    } catch {
      setScanMessage("Failed to execute scan.");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink tracking-tight">
            Cross-Bureau Overlap Coordination
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Automated multi-signal correlation of institution complaints across AICTE Bureaus & Cells.
          </p>
        </div>

        <button
          onClick={handleRunScan}
          disabled={scanning}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-surface hover:bg-canvas text-xs font-semibold text-ink shadow-2xs transition self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${scanning ? "animate-spin" : ""}`} />
          <span>{scanning ? "Scanning..." : "Re-Scan All Overlaps"}</span>
        </button>
      </div>

      {scanMessage && (
        <div className="p-3 rounded-lg bg-primary-soft border border-primary/20 text-xs text-primary font-medium flex items-center justify-between">
          <span>{scanMessage}</span>
          <button onClick={() => setScanMessage(null)} className="text-muted hover:text-ink">
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-px">
        {[
          { key: "OPEN", label: "Open Overlaps" },
          { key: "COORDINATED", label: "Coordinated" },
          { key: "DISMISSED", label: "Dismissed" },
          { key: "ALL", label: "All Groups" },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition relative ${
                isActive
                  ? "text-primary border-b-2 border-primary bg-surface font-bold"
                  : "text-muted hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Overlaps Group Cards Grid */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 bg-surface rounded-xl border border-border text-center text-xs text-muted flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span>Loading overlap groups...</span>
          </div>
        ) : groups.length === 0 ? (
          <div className="p-12 bg-surface rounded-xl border border-border text-center text-xs text-muted">
            <CheckCircle className="w-8 h-8 text-success mx-auto mb-2" />
            <p className="font-semibold text-ink">No overlapping cases found in this view.</p>
            <p className="text-[11px] text-muted mt-1">
              All institution complaints are currently isolated or already coordinated.
            </p>
          </div>
        ) : (
          groups.map((group) => {
            const isConflict = group.kind === "POSSIBLE_CONFLICT";
            const isStrong = group.strength === "STRONG";

            return (
              <div
                key={group.id}
                className="bg-surface rounded-xl border border-border p-5 hover:border-slate-300 transition shadow-2xs space-y-4"
              >
                {/* Top Card Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Kind Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          isConflict
                            ? "bg-danger-soft text-danger-text border-danger/30"
                            : isStrong
                            ? "bg-overlap-soft text-overlap-text border-overlap/30"
                            : "bg-info-soft text-info-text border-info/30"
                        }`}
                      >
                        <GitMerge className="w-3 h-3" />
                        {isConflict
                          ? "Regulatory Conflict (Possible)"
                          : group.kind === "DUPLICATE"
                          ? "Duplicate Complaints (Strong)"
                          : `${group.strength} Overlap`}
                      </span>

                      {/* Status Chip */}
                      <StatusChip status={group.status} size="sm" />

                      {/* Member count */}
                      <span className="text-xs text-muted">
                        {group.members.length} Cases Involved
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-sm font-bold text-ink pt-1">
                      <Building className="w-4 h-4 text-muted shrink-0" />
                      <span>{group.institution.name}</span>
                    </div>

                    <div className="text-[11px] text-muted font-mono">
                      AICTE ID: {group.institution.aicteId} · {group.institution.city},{" "}
                      {group.institution.region} Region
                    </div>
                  </div>

                  {/* Right Action */}
                  <Link
                    href={`/overlaps/${group.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-2xs transition self-start shrink-0"
                  >
                    <span>Coordinate Overlap</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Explanation Chips Section — neutral-soft as specified */}
                <div className="pt-3 border-t border-border">
                  <div className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">
                    Why Flagged:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.reasons.map((r, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] bg-neutral-soft border border-border text-neutral-text font-medium"
                      >
                        <span>{r.label}</span>
                        <span className="text-[10px] text-muted font-mono font-bold">
                          +{Math.round(r.weight * 100)}%
                        </span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Member Cases Preview Grid */}
                <div className="pt-3 border-t border-border grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {group.members.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-lg border border-border bg-canvas/40 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-primary text-[11px]">
                          {m.caseNo}
                        </span>
                        <BureauBadge code={m.currentBureau.code} size="sm" />
                      </div>
                      <div className="text-[11px] font-medium text-ink truncate">
                        {m.subject}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted">
                        <span>{m.category}</span>
                        <StatusChip status={m.status} size="sm" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Lead Bureau note if Coordinated */}
                {group.status === "COORDINATED" && group.leadBureauCode && (
                  <div className="p-2.5 rounded-lg bg-success-soft border border-success/30 text-xs text-success-text flex items-center justify-between">
                    <span>Lead Bureau Designated: <strong>{group.leadBureauCode}</strong></span>
                    {group.resolutionNote && (
                      <span className="text-[11px] text-success-text/80 italic truncate max-w-md">
                        &quot;{group.resolutionNote}&quot;
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function OverlapsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="h-8 w-48 bg-slate-200 rounded"></div>
          <div className="h-64 bg-surface rounded-xl border border-border"></div>
        </div>
      }
    >
      <OverlapsContent />
    </Suspense>
  );
}
