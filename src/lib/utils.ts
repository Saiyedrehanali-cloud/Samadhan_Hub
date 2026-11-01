import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, differenceInCalendarDays, isAfter } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | number | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return format(d, "dd MMM yyyy");
}

export function formatDateTime(date: Date | string | number | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return format(d, "dd MMM yyyy, hh:mm a");
}

export function formatRelativeTime(date: Date | string | number | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return formatDistanceToNow(d, { addSuffix: true });
}

export type SlaState = "ON_TIME" | "NEARING" | "OVERDUE" | "DISPOSED";

export interface SlaInfo {
  state: SlaState;
  ratio: number;
  daysRemaining: number;
  daysOverdue: number;
  badgeText: string;
  badgeClass: string;
}

export function computeSlaState(item: {
  receivedAt: Date | string;
  slaDays: number;
  expectedDisposalAt?: Date | string;
  disposedAt?: Date | string | null;
  status?: string;
}): SlaInfo {
  const received = new Date(item.receivedAt);
  const now = new Date();
  const slaTarget = item.expectedDisposalAt
    ? new Date(item.expectedDisposalAt)
    : new Date(received.getTime() + item.slaDays * 86400000);

  if (item.status === "DISPOSED" || item.disposedAt) {
    const disposedTime = item.disposedAt ? new Date(item.disposedAt) : now;
    const isLate = isAfter(disposedTime, slaTarget);
    return {
      state: "DISPOSED",
      ratio: 1,
      daysRemaining: 0,
      daysOverdue: isLate ? differenceInCalendarDays(disposedTime, slaTarget) : 0,
      badgeText: isLate ? "Disposed (Late)" : "Disposed (On-time)",
      badgeClass: isLate ? "bg-muted/10 text-muted" : "bg-success-50 text-success",
    };
  }

  const totalDurationMs = Math.max(1, slaTarget.getTime() - received.getTime());
  const elapsedMs = now.getTime() - received.getTime();
  const ratio = Math.max(0, elapsedMs / totalDurationMs);
  const diffDays = differenceInCalendarDays(slaTarget, now);

  if (now > slaTarget || diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      state: "OVERDUE",
      ratio,
      daysRemaining: 0,
      daysOverdue: overdueDays === 0 ? 1 : overdueDays,
      badgeText: overdueDays <= 1 ? "1 day overdue" : `${overdueDays} days overdue`,
      badgeClass: "bg-danger-50 text-danger border-danger/20 font-medium",
    };
  } else if (ratio >= 0.75 || diffDays <= 5) {
    return {
      state: "NEARING",
      ratio,
      daysRemaining: diffDays,
      daysOverdue: 0,
      badgeText: diffDays === 0 ? "Due today" : `${diffDays}d remaining`,
      badgeClass: "bg-warning-50 text-warning border-warning/20 font-medium",
    };
  } else {
    return {
      state: "ON_TIME",
      ratio,
      daysRemaining: diffDays,
      daysOverdue: 0,
      badgeText: `${diffDays}d remaining`,
      badgeClass: "bg-success-50 text-success border-success/20",
    };
  }
}

export const BUREAU_MAP: Record<string, { code: string; name: string; shortName: string; color: string }> = {
  RB: { code: "RB", name: "Regulation Bureau", shortName: "Regulation", color: "#1D4ED8" },
  PGRC: { code: "PGRC", name: "Public Grievance Redressal Cell", shortName: "PGRC", color: "#7C3AED" },
  AB: { code: "AB", name: "Approval Bureau", shortName: "Approval", color: "#0D9488" },
  LC: { code: "LC", name: "Legal Cell", shortName: "Legal", color: "#B45309" },
};

export const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  RECEIVED: { label: "Received", bg: "bg-slate-100", text: "text-slate-700" },
  UNDER_PROCESS: { label: "Under Process", bg: "bg-blue-50", text: "text-blue-700" },
  TRANSFERRED: { label: "Transferred", bg: "bg-amber-50", text: "text-amber-700" },
  ESCALATED: { label: "Escalated", bg: "bg-red-50", text: "text-red-700" },
  DISPOSED: { label: "Disposed", bg: "bg-emerald-50", text: "text-emerald-700" },
};

export const CATEGORIES = [
  "Fee Regulation",
  "Faculty Norms",
  "Infrastructure",
  "Admission",
  "Affiliation",
  "Harassment",
  "Other",
] as const;

export type CaseCategory = typeof CATEGORIES[number];
