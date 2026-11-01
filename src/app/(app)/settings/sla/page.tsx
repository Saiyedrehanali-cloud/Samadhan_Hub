"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Layers,
  ArrowRight,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface SlaRule {
  id: string;
  category: string;
  slaDays: number;
}

interface SlaSettingsData {
  rules: SlaRule[];
  settings: {
    escalateAfterDays: number;
    idleDays: number;
    lastScanTime: string | null;
  };
}

export default function SlaSettingsPage() {
  const router = useRouter();
  const [data, setData] = useState<SlaSettingsData | null>(null);
  const [rules, setRules] = useState<SlaRule[]>([]);
  const [escalateAfterDays, setEscalateAfterDays] = useState(7);
  const [idleDays, setIdleDays] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );
  const [userRole, setUserRole] = useState<string | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/sla");
      const json = await res.json();
      if (json.ok && json.data) {
        setData(json.data);
        setRules(json.data.rules);
        setEscalateAfterDays(json.data.settings.escalateAfterDays);
        setIdleDays(json.data.settings.idleDays);
      }
    } catch (err) {
      console.error("Failed to load SLA settings:", err);
    } finally {
      setLoading(false);
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

    fetchSettings();
  }, []);

  const handleRuleChange = (category: string, newDays: number) => {
    setRules((prev) =>
      prev.map((r) => (r.category === category ? { ...r, slaDays: newDays } : r))
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/settings/sla", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rules: rules.map((r) => ({ category: r.category, slaDays: Number(r.slaDays) })),
          escalateAfterDays: Number(escalateAfterDays),
          idleDays: Number(idleDays),
        }),
      });

      const json = await res.json();
      if (json.ok) {
        setFeedback({ type: "success", message: "SLA configuration saved successfully." });
        router.refresh();
      } else {
        setFeedback({
          type: "error",
          message: json.error?.message || "Failed to save configuration.",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "Network error saving settings." });
    } finally {
      setSaving(false);
    }
  };

  const handleRunScan = async () => {
    setScanning(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/alerts/scan", { method: "POST" });
      const json = await res.json();
      if (json.ok && json.data) {
        setFeedback({
          type: "success",
          message: `SLA Scan Completed: Evaluated ${json.data.scannedCases} active cases. Created ${json.data.createdAlerts} new alerts (${json.data.skippedDuplicates} duplicates skipped).`,
        });
        fetchSettings();
        router.refresh();
      } else {
        setFeedback({
          type: "error",
          message: json.error?.message || "Scan execution failed",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "Network error triggering SLA scan." });
    } finally {
      setScanning(false);
    }
  };

  const isManagement = userRole === "MANAGEMENT";

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-primary-dark tracking-tight">
              SLA & Escalation Settings
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-primary-50 text-primary border border-primary/20 text-[10px] font-bold">
              AICTE Policy
            </span>
          </div>
          <p className="text-xs text-muted mt-1">
            Configure resolution deadlines per grievance category and automated alert thresholds.
          </p>
        </div>

        {isManagement && (
          <button
            type="button"
            onClick={handleRunScan}
            disabled={scanning}
            className="px-3.5 py-1.5 rounded-lg border border-border bg-surface hover:bg-slate-50 text-ink text-xs font-semibold flex items-center gap-2 transition disabled:opacity-50 self-start sm:self-auto shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-primary ${scanning ? "animate-spin" : ""}`} />
            <span>{scanning ? "Scanning Cases..." : "Run SLA Scan Now"}</span>
          </button>
        )}
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between animate-in fade-in ${
            feedback.type === "success"
              ? "bg-success-50 text-success border-success/20"
              : "bg-danger-50 text-danger border-danger/20"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-danger shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="font-bold opacity-70 hover:opacity-100 ml-3"
          >
            ×
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-8 bg-surface rounded-xl border border-border animate-pulse space-y-4">
          <div className="h-5 bg-slate-200 rounded w-1/4" />
          <div className="h-20 bg-slate-100 rounded" />
          <div className="h-5 bg-slate-200 rounded w-1/4" />
          <div className="h-20 bg-slate-100 rounded" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Card 1: Default SLA Resolution Days by Category */}
          <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-border bg-slate-50/60 flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold text-primary-dark uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  Category Resolution Deadlines
                </h2>
                <p className="text-[11px] text-muted mt-0.5">
                  Default calendar days permitted before a grievance transitions into Overdue status.
                </p>
              </div>
              <span className="text-[10px] text-muted">7 AICTE Categories</span>
            </div>

            <div className="divide-y divide-border">
              {rules.map((rule) => (
                <div
                  key={rule.category}
                  className="p-3.5 flex items-center justify-between hover:bg-slate-50/50 transition"
                >
                  <div>
                    <span className="text-xs font-semibold text-ink">{rule.category}</span>
                    <p className="text-[11px] text-muted">
                      {rule.category === "Harassment"
                        ? "High-priority student & staff welfare category"
                        : rule.category === "Fee Regulation" || rule.category === "Admission"
                        ? "Institutional governance category"
                        : "Academic & statutory compliance category"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={365}
                      disabled={!isManagement}
                      value={rule.slaDays}
                      onChange={(e) =>
                        handleRuleChange(rule.category, parseInt(e.target.value, 10) || 1)
                      }
                      className="w-20 px-2.5 py-1 text-xs text-right font-mono font-medium rounded-lg border border-border bg-canvas/70 focus:bg-surface focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                    />
                    <span className="text-xs text-muted font-medium w-8">days</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Proactive Warning & Escalation Thresholds */}
          <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-border bg-slate-50/60">
              <h2 className="text-xs font-bold text-primary-dark uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-primary" />
                Automated Thresholds & Trigger Rules
              </h2>
              <p className="text-[11px] text-muted mt-0.5">
                Proactive alert dispatches to holding bureaus, regional directors, and AICTE management.
              </p>
            </div>

            <div className="p-4 space-y-4 divide-y divide-border/60">
              {/* Escalate After Days */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5 max-w-md">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-ink">Management Escalation Threshold</span>
                    <span className="px-1.5 py-0.2 rounded bg-danger-50 text-danger text-[10px] font-bold">
                      DANGER
                    </span>
                  </div>
                  <p className="text-[11px] text-muted">
                    When a case remains overdue beyond this many days, it automatically escalates directly to the Management oversight desk.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    min={1}
                    max={60}
                    disabled={!isManagement}
                    value={escalateAfterDays}
                    onChange={(e) => setEscalateAfterDays(parseInt(e.target.value, 10) || 1)}
                    className="w-20 px-2.5 py-1 text-xs text-right font-mono font-medium rounded-lg border border-border bg-canvas/70 focus:bg-surface focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                  />
                  <span className="text-xs text-muted font-medium w-8">days</span>
                </div>
              </div>

              {/* Idle Case Days */}
              <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5 max-w-md">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-ink">Idle Case Warning Threshold</span>
                    <span className="px-1.5 py-0.2 rounded bg-warning-50 text-warning text-[10px] font-bold">
                      WARNING
                    </span>
                  </div>
                  <p className="text-[11px] text-muted">
                    Alerts the assigned Bureau Officer if an active grievance experiences zero remarks, transfers, or status changes.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    min={1}
                    max={60}
                    disabled={!isManagement}
                    value={idleDays}
                    onChange={(e) => setIdleDays(parseInt(e.target.value, 10) || 1)}
                    className="w-20 px-2.5 py-1 text-xs text-right font-mono font-medium rounded-lg border border-border bg-canvas/70 focus:bg-surface focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                  />
                  <span className="text-xs text-muted font-medium w-8">days</span>
                </div>
              </div>

              {/* Fixed Proactive Stages Info */}
              <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-canvas/40">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-warning" />
                    <span className="text-xs font-semibold text-ink">Approaching Deadline Warning</span>
                  </div>
                  <p className="text-[11px] text-muted">
                    Fires when &le; 5 days remain or &ge; 75% of the SLA duration has elapsed.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-canvas/40">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-danger" />
                    <span className="text-xs font-semibold text-ink">Critical SLA Risk Warning</span>
                  </div>
                  <p className="text-[11px] text-muted">
                    Fires when &le; 2 days remain or &ge; 90% of the SLA duration has elapsed.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Engine Status / Last Scan Bar */}
          <div className="p-3.5 rounded-xl border border-border bg-slate-50 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-muted">
              <RefreshCw className="w-3.5 h-3.5 text-primary" />
              <span>
                Last Automated Scan:{" "}
                <strong className="text-ink">
                  {data?.settings.lastScanTime
                    ? formatRelativeTime(data.settings.lastScanTime)
                    : "Not run recently"}
                </strong>
              </span>
            </div>
            <span className="text-[11px] text-muted">Background Cadence: Idempotent</span>
          </div>

          {/* Submit Button */}
          {isManagement ? (
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? "Saving Changes..." : "Save SLA Configuration"}</span>
              </button>
            </div>
          ) : (
            <p className="text-[11px] text-muted text-right italic">
              View-only mode: Only AICTE Management officers can modify institutional SLA deadlines.
            </p>
          )}
        </form>
      )}
    </div>
  );
}

