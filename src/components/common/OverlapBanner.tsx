import React from "react";
import Link from "next/link";
import { GitMerge, ArrowRight, ExternalLink } from "lucide-react";

interface OverlapBannerProps {
  overlapGroupId: string;
  score?: number;
  bureausInvolved?: string[];
  message?: string;
  className?: string;
}

/**
 * OverlapBanner:
 * Soft orange background (#FFF1E5), orange left edge (#C75300),
 * orange text ("Potential Overlapping Cases – Coordination Required"),
 * and brand primary blue "Review overlap" button.
 */
export function OverlapBanner({
  overlapGroupId,
  score,
  bureausInvolved = [],
  message,
  className = "",
}: OverlapBannerProps) {
  return (
    <div
      className={`p-4 rounded-xl bg-overlap-soft border border-border border-l-4 border-l-overlap flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/80 border border-overlap/30 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
          <GitMerge className="w-4 h-4 text-overlap" />
        </div>

        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-overlap-text tracking-tight">
              Potential Overlapping Cases – Coordination Required
            </span>
            {score !== undefined && (
              <span className="px-1.5 py-0.2 rounded-full bg-overlap text-white text-[10px] font-bold font-mono">
                Score: {score.toFixed(2)}
              </span>
            )}
          </div>

          <p className="text-xs text-subtle leading-relaxed">
            {message ||
              (bureausInvolved.length > 0
                ? `Active parallel cases detected simultaneously across ${bureausInvolved.join(
                    " and "
                  )}. Administrative alignment advised.`
                : "Parallel inquiries detected across AICTE Bureaus. Alignment advised.")}
          </p>
        </div>
      </div>

      <Link
        href={`/overlaps/${overlapGroupId}`}
        className="px-3.5 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-1.5 transition shrink-0 self-start sm:self-auto shadow-2xs"
      >
        <span>Review Overlap</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

