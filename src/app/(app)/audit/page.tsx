"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Lock,
  FileCheck,
  Calendar,
  Layers,
  ArrowRight,
  User,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface AuditLogItem {
  id: number;
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string;
  payload: string | null;
  prevHash: string;
  hash: string;
  createdAt: string;
}

interface VerificationResult {
  valid: boolean;
  totalBlocks: number;
  genesisHash: string | null;
  latestHash: string | null;
  verifiedAt: string;
  tamperDetails?: {
    blockId: number;
    blockIndex: number;
    reason: string;
    expectedHash?: string;
    actualHash?: string;
  };
}

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const fetchLogs = async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/audit?page=${pageNum}&limit=20`);
      const json = await res.json();
      if (json.ok && json.data) {
        setLogs(json.data.logs);
        setTotal(json.data.total);
        setTotalPages(json.data.totalPages || 1);
        setPage(json.data.page || 1);
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await fetch("/api/audit/verify");
      const json = await res.json();
      if (json.ok && json.data) {
        setVerification(json.data);
      }
    } catch (err) {
      console.error("Failed to verify audit chain:", err);
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((json) => {
        if (json.ok && json.data) {
          setUserRole(json.data.role);
        }
      })
      .catch(() => {});

    fetchLogs(page);
    handleVerify();
  }, [page]);

  const getActionBadge = (action: string) => {
    if (action.includes("CREATE") || action.includes("INGEST")) {
      return (
        <span className="px-2 py-0.5 rounded-full bg-primary-50 text-primary border border-primary/20 text-[10px] font-bold">
          {action}
        </span>
      );
    }
    if (action.includes("TRANSFER") || action.includes("STATUS")) {
      return (
        <span className="px-2 py-0.5 rounded-full bg-warning-50 text-warning border border-warning/20 text-[10px] font-bold">
          {action}
        </span>
      );
    }
    if (action.includes("DISPOSE") || action.includes("COORDINATE")) {
      return (
        <span className="px-2 py-0.5 rounded-full bg-success-50 text-success border border-success/20 text-[10px] font-bold">
          {action}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-muted border border-border text-[10px] font-bold">
        {action}
      </span>
    );
  };

  const isManagement = userRole === "MANAGEMENT";

  if (userRole && !isManagement) {
    return (
      <div className="bg-surface rounded-xl border border-border p-12 text-center">
        <Lock className="w-8 h-8 text-muted mx-auto mb-2" />
        <h2 className="text-sm font-semibold text-ink">Restricted Administrative Area</h2>
        <p className="text-xs text-muted max-w-sm mx-auto mt-1 mb-4">
          The cryptographic hash-chained audit trail is reserved for AICTE Management oversight.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
        >
          Return to Overview
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-primary-dark tracking-tight">
              Tamper-Evident Audit Trail
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-primary-50 text-primary border border-primary/20 text-[10px] font-bold">
              HMAC-SHA256
            </span>
          </div>
          <p className="text-xs text-muted mt-1">
            Sequential cryptographic hash chaining guarantees immutable proof of every case mutation and transfer.
          </p>
        </div>

        <button
          type="button"
          onClick={handleVerify}
          disabled={verifying}
          className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-semibold flex items-center gap-2 transition disabled:opacity-50 self-start sm:self-auto shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${verifying ? "animate-spin" : ""}`} />
          <span>{verifying ? "Verifying Blocks..." : "Verify Audit Chain Now"}</span>
        </button>
      </div>

      {/* Verification Status Banner */}
      {verification && (
        <div
          className={`p-5 rounded-xl border shadow-2xs transition ${
            verification.valid
              ? "bg-surface border-success/30"
              : "bg-danger-50/70 border-danger/40"
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              {verification.valid ? (
                <div className="w-10 h-10 rounded-xl bg-success-50 text-success flex items-center justify-center shrink-0 border border-success/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-danger-50 text-danger flex items-center justify-center shrink-0 border border-danger/20">
                  <ShieldAlert className="w-5 h-5" />
                </div>
              )}

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-ink">
                    {verification.valid
                      ? "Cryptographic Hash Chain Verified Intact"
                      : "Tampering Detected in Audit Log!"}
                  </span>
                  <span
                    className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                      verification.valid
                        ? "bg-success-50 text-success border border-success/20"
                        : "bg-danger text-white"
                    }`}
                  >
                    {verification.valid ? "VALID" : "CORRUPTED"}
                  </span>
                </div>
                <p className="text-xs text-muted mt-0.5">
                  {verification.valid
                    ? `All ${verification.totalBlocks} sequential ledger blocks computed and verified with 0 breaks or modifications.`
                    : `Ledger inconsistency detected at Block #${verification.tamperDetails?.blockId}. Hash recalculation mismatch.`}
                </p>
              </div>
            </div>

            {/* Hashes preview */}
            <div className="text-xs font-mono text-muted space-y-1 bg-slate-50 p-2.5 rounded-lg border border-border">
              <div className="truncate max-w-[280px]">
                <span className="text-muted">Genesis: </span>
                <span className="text-primary font-semibold">
                  {verification.genesisHash?.substring(0, 16)}...
                </span>
              </div>
              <div className="truncate max-w-[280px]">
                <span className="text-muted">Latest:  </span>
                <span className="text-ink font-semibold">
                  {verification.latestHash?.substring(0, 16)}...
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Table — Strictly 6 Columns Max */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-border bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold text-primary-dark uppercase tracking-wider">
              Cryptographic Ledger Entries
            </span>
          </div>
          <span className="text-xs text-muted font-medium">{total} Total Blocks Chained</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-slate-50/50 text-[11px] font-bold text-muted uppercase tracking-wider">
                <th className="py-3 px-4">Block #</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Entity & Target</th>
                <th className="py-3 px-4 text-right">HMAC Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs font-mono">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted font-sans">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span>Loading ledger records...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted font-sans">
                    No audit records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition">
                    {/* Col 1: Block # */}
                    <td className="py-3 px-4 font-bold text-primary-dark">
                      #{log.id}
                    </td>

                    {/* Col 2: Timestamp */}
                    <td className="py-3 px-4 text-muted text-[11px]">
                      {new Date(log.createdAt).toLocaleString("en-IN", {
                        dateStyle: "short",
                        timeStyle: "medium",
                      })}
                    </td>

                    {/* Col 3: Action */}
                    <td className="py-3 px-4 font-sans">
                      {getActionBadge(log.action)}
                    </td>

                    {/* Col 4: Actor */}
                    <td className="py-3 px-4 text-ink font-sans">
                      {log.actorId ? (
                        <span className="truncate max-w-[120px] inline-block font-mono text-[11px]">
                          {log.actorId}
                        </span>
                      ) : (
                        <span className="text-muted italic text-[11px]">System / API</span>
                      )}
                    </td>

                    {/* Col 5: Entity */}
                    <td className="py-3 px-4 text-ink font-sans">
                      <span className="font-semibold">{log.entity}:</span>{" "}
                      <span className="font-mono text-[11px] text-muted">
                        {log.entityId}
                      </span>
                    </td>

                    {/* Col 6: Hash */}
                    <td className="py-3 px-4 text-right text-muted text-[11px]">
                      <span
                        className="font-mono bg-slate-100 px-1.5 py-0.5 rounded cursor-help"
                        title={log.hash}
                      >
                        {log.hash.substring(0, 12)}...
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-border bg-slate-50/50 flex items-center justify-between text-xs text-muted font-sans">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg border border-border bg-surface hover:bg-slate-50 disabled:opacity-40 transition"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded-lg border border-border bg-surface hover:bg-slate-50 disabled:opacity-40 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

