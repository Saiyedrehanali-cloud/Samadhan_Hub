"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, ExternalLink, Loader2, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface AlertItem {
  id: string;
  caseId: string | null;
  overlapGroupId: string | null;
  type: string;
  severity: "INFO" | "WARNING" | "DANGER" | string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  case?: {
    caseNo: string;
    institution: {
      name: string;
    };
  } | null;
}

interface AlertBellProps {
  initialUnreadCount?: number;
}

export function AlertBell({ initialUnreadCount = 0 }: AlertBellProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync prop changes
  useEffect(() => {
    setUnreadCount(initialUnreadCount);
  }, [initialUnreadCount]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Fetch preview alerts when opened
  const handleToggle = async () => {
    const nextState = !isOpen;
    setIsOpen(nextState);

    if (nextState) {
      setLoading(true);
      try {
        const res = await fetch("/api/alerts?limit=5");
        const json = await res.json();
        if (json.ok && json.data) {
          setAlerts(json.data.alerts);
          setUnreadCount(json.data.unreadCount);
        }
      } catch (err) {
        console.error("Failed to load alerts preview:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/alerts/${id}/read`, { method: "PATCH" });
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isRead: true } : a))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      router.refresh();
    } catch (err) {
      console.error("Failed to mark alert as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    try {
      await fetch("/api/alerts/read-all", { method: "POST" });
      setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
      setUnreadCount(0);
      router.refresh();
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNavigate = (alert: AlertItem) => {
    if (!alert.isRead) {
      fetch(`/api/alerts/${alert.id}/read`, { method: "PATCH" }).catch(() => {});
      setAlerts((prev) =>
        prev.map((a) => (a.id === alert.id ? { ...a, isRead: true } : a))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      router.refresh();
    }
    setIsOpen(false);

    if (alert.caseId) {
      router.push(`/cases/${alert.caseId}`);
    } else if (alert.overlapGroupId) {
      router.push(`/overlaps/${alert.overlapGroupId}`);
    } else {
      router.push("/alerts");
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "DANGER":
        return <AlertCircle className="w-4 h-4 text-danger shrink-0" />;
      case "WARNING":
        return <AlertTriangle className="w-4 h-4 text-warning shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-primary shrink-0" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        className={`relative p-2 rounded-lg border transition ${
          isOpen
            ? "border-primary bg-primary-50/50 text-primary"
            : "border-border bg-surface hover:bg-slate-50 text-muted hover:text-ink"
        }`}
        aria-label="Alerts and notifications"
        aria-expanded={isOpen}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Flyout */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-primary-dark">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-danger-50 text-danger border border-danger/20 text-[10px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={markingAll}
                className="text-[11px] font-medium text-primary hover:text-primary-dark flex items-center gap-1 disabled:opacity-50"
              >
                {markingAll ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <CheckCheck className="w-3.5 h-3.5" />
                )}
                Mark all read
              </button>
            )}
          </div>

          {/* Alert List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {loading ? (
              <div className="py-8 flex flex-col items-center justify-center text-muted">
                <Loader2 className="w-5 h-5 animate-spin text-primary mb-2" />
                <span className="text-xs">Loading alerts...</span>
              </div>
            ) : alerts.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <div className="w-8 h-8 rounded-full bg-slate-100 text-muted mx-auto flex items-center justify-center mb-2">
                  <Bell className="w-4 h-4" />
                </div>
                <p className="text-xs font-medium text-ink">You&apos;re all caught up</p>
                <p className="text-[11px] text-muted mt-0.5">No active alerts requiring attention.</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  onClick={() => handleNavigate(alert)}
                  className={`p-3.5 hover:bg-slate-50 transition cursor-pointer flex gap-3 items-start ${
                    !alert.isRead ? "bg-primary-50/30" : ""
                  }`}
                >
                  <div className="mt-0.5">{getSeverityIcon(alert.severity)}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`text-xs truncate ${
                          !alert.isRead ? "font-semibold text-ink" : "font-medium text-muted"
                        }`}
                      >
                        {alert.title}
                      </p>
                      <span className="text-[10px] text-muted shrink-0">
                        {formatRelativeTime(alert.createdAt)}
                      </span>
                    </div>

                    <p className="text-[11px] text-muted line-clamp-2 mt-0.5 leading-relaxed">
                      {alert.message}
                    </p>

                    {alert.case && (
                      <div className="mt-1 flex items-center gap-1.5 text-[10px] text-primary">
                        <span className="font-mono font-medium">{alert.case.caseNo}</span>
                        <span>·</span>
                        <span className="truncate text-muted">{alert.case.institution.name}</span>
                      </div>
                    )}
                  </div>

                  {!alert.isRead && (
                    <button
                      type="button"
                      onClick={(e) => handleMarkAsRead(alert.id, e)}
                      title="Mark as read"
                      className="mt-0.5 p-1 rounded hover:bg-slate-200 text-muted hover:text-ink shrink-0"
                    >
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-border bg-slate-50/50 flex items-center justify-between text-xs">
            <Link
              href="/alerts"
              onClick={() => setIsOpen(false)}
              className="text-primary hover:text-primary-dark font-medium flex items-center gap-1.5 transition"
            >
              <span>View all alerts</span>
              <ExternalLink className="w-3 h-3" />
            </Link>

            <span className="text-[10px] text-muted">Proactive SLA Engine</span>
          </div>
        </div>
      )}
    </div>
  );
}
