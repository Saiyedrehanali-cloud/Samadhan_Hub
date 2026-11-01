import React from "react";
import Link from "next/link";
import { ArrowRight, GitMerge, AlertCircle, AlertTriangle } from "lucide-react";
import { BureauBadge } from "./BureauBadge";
import { StatusChip } from "./StatusChip";

interface AttentionRowProps {
  id: string;
  caseNo: string;
  institutionName: string;
  category: string;
  bureauCode: string;
  status: string;
  primaryTag: "OVERLAP" | "OVERDUE" | "ESCALATED" | string;
  overdueDays?: number;
  overlapGroupId?: string | null;
  overlapStrength?: string | null;
}

/**
 * AttentionRow: 3px colored left edge by type:
 * orange = overlap, red = overdue or escalated.
 * Includes bureau badge and status chip.
 */
export function AttentionRow({
  id,
  caseNo,
  institutionName,
  category,
  bureauCode,
  status,
  primaryTag,
  overdueDays = 0,
  overlapGroupId,
  overlapStrength,
}: AttentionRowProps) {
  const isOverlap = primaryTag === "OVERLAP";
  const isOverdueOrEscalated = primaryTag === "OVERDUE" || primaryTag === "ESCALATED";

  const borderLeftColor = isOverlap
    ? "border-l-overlap"
    : isOverdueOrEscalated
    ? "border-l-danger"
    : "border-l-border";

  const href = isOverlap && overlapGroupId ? `/overlaps/${overlapGroupId}` : `/cases/${id}`;

  return (
    <Link
      href={href}
      className={`group block p-3.5 bg-surface border border-border border-l-4 ${borderLeftColor} rounded-lg hover:bg-slate-50/70 transition shadow-2xs`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <BureauBadge code={bureauCode} size="sm" />
            <span className="font-mono text-xs font-semibold text-primary group-hover:text-primary-hover">
              {caseNo}
            </span>
            <span className="text-muted text-xs">·</span>
            <span className="text-xs font-medium text-subtle truncate max-w-[260px] sm:max-w-md">
              {institutionName}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="font-medium text-ink">{category}</span>
            <span>·</span>
            <StatusChip status={status} size="sm" />

            {isOverlap && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-overlap">
                <GitMerge className="w-3 h-3 text-overlap" />
                <span>{overlapStrength ? `${overlapStrength} Overlap` : "Coordination Required"}</span>
              </span>
            )}

            {isOverdueOrEscalated && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-danger">
                <AlertCircle className="w-3 h-3 text-danger" />
                <span>{overdueDays > 0 ? `${overdueDays}d overdue` : "Overdue"}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs font-semibold text-primary opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition shrink-0 self-end sm:self-center">
          <span>{isOverlap ? "Review Overlap" : "View Case"}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </Link>
  );
}

