import React from "react";

export type StatusType =
  | "DISPOSED"
  | "UNDER_PROCESS"
  | "RECEIVED"
  | "TRANSFERRED"
  | "ESCALATED"
  | "OVERDUE"
  | "COORDINATION_REQUIRED"
  | "NEARING_SLA"
  | "SLA_CRITICAL"
  | "ON_TIME"
  | string;

interface StatusChipProps {
  status: StatusType;
  label?: string;
  className?: string;
  size?: "sm" | "md";
}

interface StatusStyle {
  bg: string;
  text: string;
  dot: string;
  defaultLabel: string;
}

const STATUS_STYLES: Record<string, StatusStyle> = {
  DISPOSED: {
    bg: "bg-success-soft",
    text: "text-success-text",
    dot: "bg-success",
    defaultLabel: "Disposed",
  },
  UNDER_PROCESS: {
    bg: "bg-info-soft",
    text: "text-info-text",
    dot: "bg-info",
    defaultLabel: "Under Process",
  },
  RECEIVED: {
    bg: "bg-neutral-soft",
    text: "text-neutral-text",
    dot: "bg-neutral",
    defaultLabel: "Received",
  },
  TRANSFERRED: {
    bg: "bg-neutral-soft",
    text: "text-neutral-text",
    dot: "bg-bureau-pgrc",
    defaultLabel: "Transferred",
  },
  ESCALATED: {
    bg: "bg-danger-soft",
    text: "text-danger-text",
    dot: "bg-danger",
    defaultLabel: "Escalated",
  },
  OVERDUE: {
    bg: "bg-danger-soft",
    text: "text-danger-text",
    dot: "bg-danger",
    defaultLabel: "Overdue",
  },
  COORDINATION_REQUIRED: {
    bg: "bg-overlap-soft",
    text: "text-overlap-text",
    dot: "bg-overlap",
    defaultLabel: "Coordination Required",
  },
  NEARING_SLA: {
    bg: "bg-sla-soft",
    text: "text-sla-text",
    dot: "bg-sla",
    defaultLabel: "Nearing SLA",
  },
  SLA_CRITICAL: {
    bg: "bg-danger-soft",
    text: "text-danger-text",
    dot: "bg-danger",
    defaultLabel: "Critical SLA",
  },
  ON_TIME: {
    bg: "bg-success-soft",
    text: "text-success-text",
    dot: "bg-success",
    defaultLabel: "On Time",
  },
};

/**
 * StatusChip: Filled soft-background pill with a status dot and label.
 * Never uses colour alone (WCAG AA).
 */
export function StatusChip({ status, label, className = "", size = "md" }: StatusChipProps) {
  const normalized = (status || "").toUpperCase().replace(/[\s-]/g, "_");
  const style = STATUS_STYLES[normalized] || {
    bg: "bg-neutral-soft",
    text: "text-neutral-text",
    dot: "bg-neutral",
    defaultLabel: status,
  };

  const displayText = label || style.defaultLabel;

  const sizeClasses =
    size === "sm"
      ? "px-2 py-0.5 text-[10px]"
      : "px-2.5 py-0.5 text-[11px]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold select-none ${style.bg} ${style.text} ${sizeClasses} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
      <span>{displayText}</span>
    </span>
  );
}

