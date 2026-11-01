"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  AlertCircle,
  Info,
  Clock,
  Shield,
  Building,
  CheckCircle2,
  Settings,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface Alert {
  id: string;
  caseId: string | null;
  overlapGroupId: string | null;
  type: string;
  key: string;
  severity: "INFO" | "WARNING" | "DANGER" | string;
  audience: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  case?: {
    id: string;
    caseNo: string;
    category: string;
    currentBureau: {
      code: string;
      name: string;
    };
    institution: {
      id: string;
      name: string;
      aicteId: string;
      region: string;
    };
  } | null;
}

type TabType = "ALL" | "UNREAD" | "OVERLAPS" | "SLA" | "ESCALATIONS";

export default function AlertsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("ALL");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [userRole, setUserRole] = useState<string | null>(null);

  const fetchAlerts = async (tab: TabType, pageNum: number = 1) => {
    setLoading(true);
    try {
      let url = `/api/alerts?page=${pageNum}&limit=20`;
      if (tab === "UNREAD") url += "&unread=true";
      else if (tab === "OVERLAPS") url += "&category=OVERLAPS";
      else if (tab === "SLA") url += "&category=SLA";
      else if (tab === "ESCALATIONS") url += "&category=ESCALATIONS";

      const res = await fetch(url);
      const json = await res.json();
      if (json.ok && json.data) {
        setAlerts(json.data.alerts);
        setUnreadTotal(json.data.unreadCount);
        setTotalPages(json.data.totalPages || 1);
        setPage(json.data.page || 1);
      }
    } catch (err) {
      console.error("Failed to load alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check current user role for scan button visibility
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((json) => {
        if (json.ok && json.data) {
          setUserRole(json.data.role);
        }
      })
      .catch(() => {});

    fetchAlerts(activeTab, 1);
  }, [activeTab]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch(`/api/alerts/${id}/read`, { method: "PATCH" });
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isRead: true } : a))
      );
      setUnreadTotal((prev) => Math.max(0, prev - 1));
      router.refresh();
    } catch (err) {
      console.error("Error marking alert as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    try {
      await fetch("/api/alerts/read-all", { method: "POST" });
      setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
      setUnreadTotal(0);
      router.refresh();
    } catch (err) {
      console.error("Error marking all alerts as read:", err);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleRunScan = async () => {
    setScanning(true);
    setScanMessage(null);
    try {
      const res = await fetch("/api/alerts/scan", { method: "POST" });
      const json = await res.json();
      if (json.ok && json.data) {
        setScanMessage(
          `SLA Scan Complete: Scanned ${json.data.scannedCases} active cases. Created ${json.data.createdAlerts} new alerts (${json.data.skippedDuplicates} existing preserved).`
        );
        fetchAlerts(activeTab, page);
        router.refresh();
      } else {
        setScanMessage(json.error?.message || "Scan failed");
      }
    } catch {
      setScanMessage("Network error during SLA scan execution");
    } finally {
      setScanning(false);
    }
  };

  const getSeverityBadge = (severity: string, type: string) => {
    if (type === "ESCALATION" || type === "OVERDUE" || type === "SLA_CRITICAL") {
      return (
        <span className="px-2 py-0.5 rounded-full bg-danger-soft text-danger-text border border-danger/30 text-[10px] font-bold">
          {type === "ESCALATION" ? "ESCALATED" : type === "OVERDUE" ? "OVERDUE" : "CRITICAL"}
        </span>
      );
    }
    if (type === "OVERLAP_DETECTED") {
      return (
        <span className="px-2 py-0.5 rounded-full bg-overlap-soft text-overlap-text border border-overlap/30 text-[10px] font-bold">
          OVERLAP
        </span>
      );
    }
    if (type === "SLA_NEARING") {
      return (
        <span className="px-2 py-0.5 rounded-full bg-sla-soft text-sla-text border border-sla/30 text-[10px] font-bold">
          NEARING SLA
        </span>
      );
    }
    if (type === "IDLE") {
      return (
        <span className="px-2 py-0.5 rounded-full bg-neutral-soft text-neutral-text border border-border text-[10px] font-bold">
          IDLE
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full bg-primary-soft text-primary border border-primary/20 text-[10px] font-bold">
        {severity}
      </span>
    );
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "DANGER":
        return <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />;
      case "WARNING":
        return <AlertTriangle className="w-4 h-4 text-overlap shrink-0 mt-0.5" />;
      default:
        return <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-ink tracking-tight">
              Alerts & Notifications
            </h1>
            {unreadTotal > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-danger-soft text-danger-text border border-danger/30">
                {unreadTotal} unread
              </span>
            )}
          </div>
          <p className="text-xs text-muted mt-1">
            Automated SLA warnings, cross-bureau overlap flags, and management escalations.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {unreadTotal > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              disabled={markingAll}
              className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-canvas text-xs font-semibold text-ink flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <CheckCheck className="w-3.5 h-3.5 text-primary" />
              <span>{markingAll ? "Marking..." : "Mark all as read"}</span>
            </button>
          )}

          <Link
            href="/settings/sla"
            className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-canvas text-xs font-semibold text-ink flex items-center gap-1.5 transition"
            title="Configure SLA Rules & Thresholds"
          >
            <Settings className="w-3.5 h-3.5 text-muted" />
            <span className="hidden sm:inline">Configure SLA</span>
          </Link>

          {userRole === "MANAGEMENT" && (
            <button
              type="button"
              onClick={handleRunScan}
              disabled={scanning}
              className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-2 transition disabled:opacity-50 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${scanning ? "animate-spin" : ""}`} />
              <span>{scanning ? "Evaluating Cases..." : "Run SLA Scan Now"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Scan Feedback Banner */}
      {scanMessage && (
        <div className="p-3 rounded-lg bg-primary-soft border border-primary/20 text-xs text-primary flex items-center justify-between animate-in fade-in">
          <span>{scanMessage}</span>
          <button
            onClick={() => setScanMessage(null)}
            className="text-primary hover:text-primary-hover font-bold ml-3"
          >
            ×
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex border-b border-border gap-1 overflow-x-auto text-xs">
        <button
          onClick={() => handleTabChange("ALL")}
          className={`px-4 py-2 font-medium border-b-2 transition whitespace-nowrap ${
            activeTab === "ALL"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted hover:text-ink hover:border-slate-300"
          }`}
        >
          All Alerts
        </button>
        <button
          onClick={() => handleTabChange("UNREAD")}
          className={`px-4 py-2 font-medium border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === "UNREAD"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted hover:text-ink hover:border-slate-300"
          }`}
        >
          <span>Unread</span>
          {unreadTotal > 0 && (
            <span className="w-2 h-2 rounded-full bg-danger inline-block" />
          )}
        </button>
        <button
          onClick={() => handleTabChange("OVERLAPS")}
          className={`px-4 py-2 font-medium border-b-2 transition whitespace-nowrap ${
            activeTab === "OVERLAPS"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted hover:text-ink hover:border-slate-300"
          }`}
        >
          Overlaps
        </button>
        <button
          onClick={() => handleTabChange("SLA")}
          className={`px-4 py-2 font-medium border-b-2 transition whitespace-nowrap ${
            activeTab === "SLA"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted hover:text-ink hover:border-slate-300"
          }`}
        >
          SLA Breaches
        </button>
        <button
          onClick={() => handleTabChange("ESCALATIONS")}
          className={`px-4 py-2 font-medium border-b-2 transition whitespace-nowrap ${
            activeTab === "ESCALATIONS"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted hover:text-ink hover:border-slate-300"
          }`}
        >
          Escalations
        </button>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="p-4 bg-surface rounded-xl border border-border animate-pulse flex items-start gap-3"
              >
                <div className="w-4 h-4 bg-slate-200 rounded-full mt-1 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-muted mx-auto flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6 text-success" />
            </div>
            <h3 className="text-sm font-semibold text-ink">You&apos;re all caught up</h3>
            <p className="text-xs text-muted max-w-sm mx-auto mt-1">
              No active alerts in this category requiring immediate action or coordination.
            </p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 bg-surface border rounded-xl transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                !alert.isRead
                  ? "border-primary/40 bg-primary-50/20 shadow-2xs"
                  : "border-border hover:border-slate-300"
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                {getSeverityIcon(alert.severity)}

                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-xs ${
                        !alert.isRead ? "font-bold text-ink" : "font-medium text-ink"
                      }`}
                    >
                      {alert.title}
                    </span>
                    {getSeverityBadge(alert.severity, alert.type)}
                    {!alert.isRead && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </div>

                  <p className="text-xs text-muted leading-relaxed">
                    {alert.message}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-muted">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-muted" />
                      {formatRelativeTime(alert.createdAt)}
                    </span>

                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3 text-muted" />
                      <span className="font-mono">{alert.audience}</span>
                    </span>

                    {alert.case && (
                      <span className="flex items-center gap-1">
                        <Building className="w-3 h-3 text-muted" />
                        <span className="truncate max-w-[200px]">
                          {alert.case.institution.name}
                        </span>
                        <span>·</span>
                        <span className="font-mono text-primary font-semibold">
                          {alert.case.caseNo}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {!alert.isRead && (
                  <button
                    type="button"
                    onClick={() => handleMarkAsRead(alert.id)}
                    className="px-2.5 py-1 text-xs font-medium text-muted hover:text-ink hover:bg-slate-100 rounded transition"
                  >
                    Mark read
                  </button>
                )}

                {alert.caseId ? (
                  <Link
                    href={`/cases/${alert.caseId}`}
                    className="px-3 py-1 bg-surface border border-border hover:border-primary text-xs font-semibold text-primary rounded-lg flex items-center gap-1 transition"
                  >
                    <span>View Case</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                ) : alert.overlapGroupId ? (
                  <Link
                    href={`/overlaps/${alert.overlapGroupId}`}
                    className="px-3 py-1 bg-surface border border-border hover:border-primary text-xs font-semibold text-primary rounded-lg flex items-center gap-1 transition"
                  >
                    <span>View Overlap</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-border text-xs text-muted">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => {
                const next = page - 1;
                setPage(next);
                fetchAlerts(activeTab, next);
              }}
              className="px-3 py-1 rounded border border-border bg-surface hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => {
                const next = page + 1;
                setPage(next);
                fetchAlerts(activeTab, next);
              }}
              className="px-3 py-1 rounded border border-border bg-surface hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
