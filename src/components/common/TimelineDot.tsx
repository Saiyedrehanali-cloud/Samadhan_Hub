import React from "react";
import {
  MessageSquare,
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle2,
  GitMerge,
  FileText,
  Activity,
  LucideIcon,
} from "lucide-react";

export type TimelineActionType =
  | "REMARK"
  | "TRANSFER"
  | "ESCALATE"
  | "DISPOSE"
  | "LINK"
  | "COORDINATE"
  | "DISMISS"
  | "OVERLAP_COORDINATED"
  | "OVERLAP_DISMISSED"
  | "STATUS_CHANGE"
  | "CREATE"
  | string;

interface TimelineDotProps {
  actionType: TimelineActionType;
  className?: string;
}

interface ActionConfig {
  bg: string;
  border: string;
  icon: LucideIcon;
  iconColor: string;
}

const ACTION_CONFIGS: Record<string, ActionConfig> = {
  REMARK: {
    bg: "bg-surface",
    border: "border-muted text-muted",
    icon: MessageSquare,
    iconColor: "text-muted",
  },
  TRANSFER: {
    bg: "bg-[#F3E8FF]",
    border: "border-bureau-pgrc",
    icon: ArrowRightLeft,
    iconColor: "text-bureau-pgrc",
  },
  ESCALATE: {
    bg: "bg-danger-soft",
    border: "border-danger",
    icon: AlertTriangle,
    iconColor: "text-danger",
  },
  DISPOSE: {
    bg: "bg-success-soft",
    border: "border-success",
    icon: CheckCircle2,
    iconColor: "text-success",
  },
  LINK: {
    bg: "bg-overlap-soft",
    border: "border-overlap",
    icon: GitMerge,
    iconColor: "text-overlap",
  },
  COORDINATE: {
    bg: "bg-overlap-soft",
    border: "border-overlap",
    icon: GitMerge,
    iconColor: "text-overlap",
  },
  OVERLAP_COORDINATED: {
    bg: "bg-overlap-soft",
    border: "border-overlap",
    icon: GitMerge,
    iconColor: "text-overlap",
  },
  DISMISS: {
    bg: "bg-neutral-soft",
    border: "border-neutral",
    icon: Activity,
    iconColor: "text-neutral",
  },
  OVERLAP_DISMISSED: {
    bg: "bg-neutral-soft",
    border: "border-neutral",
    icon: Activity,
    iconColor: "text-neutral",
  },
  STATUS_CHANGE: {
    bg: "bg-primary-soft",
    border: "border-primary",
    icon: Activity,
    iconColor: "text-primary",
  },
  CREATE: {
    bg: "bg-primary-soft",
    border: "border-primary",
    icon: FileText,
    iconColor: "text-primary",
  },
};

/**
 * TimelineDot: Coloured by action type:
 * remark = muted (#626F86), transfer = purple (#803FA5), escalate = red (#C9372C),
 * dispose = green (#22A06B), overlap action = orange (#C75300), status change = blue (#1868DB)
 */
export function TimelineDot({ actionType, className = "" }: TimelineDotProps) {
  const normalized = (actionType || "").toUpperCase();
  const config = ACTION_CONFIGS[normalized] || {
    bg: "bg-surface",
    border: "border-muted",
    icon: Activity,
    iconColor: "text-muted",
  };

  const Icon = config.icon;

  return (
    <div
      className={`w-7 h-7 rounded-full border-2 ${config.border} ${config.bg} flex items-center justify-center shrink-0 z-10 shadow-2xs ${className}`}
    >
      <Icon className={`w-3.5 h-3.5 ${config.iconColor}`} />
    </div>
  );
}

