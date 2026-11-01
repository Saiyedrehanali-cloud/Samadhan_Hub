import React from "react";

export type BureauCode = "RB" | "PGRC" | "AB" | "LC" | string;

interface BureauBadgeProps {
  code: BureauCode;
  className?: string;
  size?: "sm" | "md";
}

const BUREAU_CONFIG: Record<string, { bg: string; label: string }> = {
  RB: { bg: "bg-bureau-rb", label: "Regulation Bureau" },
  PGRC: { bg: "bg-bureau-pgrc", label: "Public Grievance Redressal Cell" },
  AB: { bg: "bg-bureau-ab", label: "Approval Bureau" },
  LC: { bg: "bg-bureau-lc", label: "Legal Cell" },
};

/**
 * BureauBadge: Square badge with white code letters and official Bureau identity color.
 * RB = #1868DB (blue), PGRC = #803FA5 (purple), AB = #2898BD (teal), LC = #C9468D (magenta)
 */
export function BureauBadge({ code, className = "", size = "md" }: BureauBadgeProps) {
  const normalized = (code || "").toUpperCase();
  const config = BUREAU_CONFIG[normalized] || { bg: "bg-neutral", label: normalized };

  const sizeClasses =
    size === "sm"
      ? "px-1.5 py-0.5 text-[10px] min-w-[24px]"
      : "px-2 py-0.5 text-[11px] min-w-[28px]";

  return (
    <span
      className={`inline-flex items-center justify-center font-mono font-bold tracking-tight text-white rounded-md shadow-2xs select-none ${config.bg} ${sizeClasses} ${className}`}
      title={config.label}
    >
      {normalized}
    </span>
  );
}

