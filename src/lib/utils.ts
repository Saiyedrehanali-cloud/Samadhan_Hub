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
      badgeClass: isLate ? "bg-neutral-soft text-muted border-border" : "bg-success-soft text-success-text border-success/30 font-medium",
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
      badgeClass: "bg-danger-soft text-danger-text border-danger/30 font-medium",
    };
  } else if (ratio >= 0.75 || diffDays <= 5) {
    return {
      state: "NEARING",
      ratio,
      daysRemaining: diffDays,
      daysOverdue: 0,
      badgeText: diffDays === 0 ? "Due today" : `${diffDays}d remaining`,
      badgeClass: "bg-sla-soft text-sla-text border-sla/30 font-medium",
    };
  } else {
    return {
      state: "ON_TIME",
      ratio,
      daysRemaining: diffDays,
      daysOverdue: 0,
      badgeText: `${diffDays}d remaining`,
      badgeClass: "bg-success-soft text-success-text border-success/30 font-medium",
    };
  }
}

export const BUREAU_MAP: Record<string, { code: string; name: string; shortName: string; color: string }> = {
  RB: { code: "RB", name: "Regulation Bureau", shortName: "Regulation", color: "#1868DB" },
  PGRC: { code: "PGRC", name: "Public Grievance Redressal Cell", shortName: "PGRC", color: "#803FA5" },
  AB: { code: "AB", name: "Approval Bureau", shortName: "Approval", color: "#2898BD" },
  LC: { code: "LC", name: "Legal Cell", shortName: "Legal", color: "#C9468D" },
};

export const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  RECEIVED: { label: "Received", bg: "bg-neutral-soft", text: "text-neutral-text" },
  UNDER_PROCESS: { label: "Under Process", bg: "bg-info-soft", text: "text-info-text" },
  TRANSFERRED: { label: "Transferred", bg: "bg-neutral-soft", text: "text-neutral-text" },
  ESCALATED: { label: "Escalated", bg: "bg-danger-soft", text: "text-danger-text" },
  DISPOSED: { label: "Disposed", bg: "bg-success-soft", text: "text-success-text" },
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
