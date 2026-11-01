import React from "react";
import Link from "next/link";
import { LucideIcon } from "lucide-react";

export type KpiColor = "blue" | "orange" | "red" | "green";

interface KpiCardProps {
  label: string;
  value: number | string;
  subtext?: string;
  icon: LucideIcon;
  color: KpiColor;
  href?: string;
}

const COLOR_MAP: Record<KpiColor, { bg: string; text: string }> = {
  blue: { bg: "bg-primary-soft", text: "text-primary" },
  orange: { bg: "bg-overlap-soft", text: "text-overlap" },
  red: { bg: "bg-danger-soft", text: "text-danger" },
  green: { bg: "bg-success-soft", text: "text-success" },
};

/**
 * KpiCard: Atlassian/Jira inspired quiet metric card.
 * White card on canvas, 1px #DDDEE1 border, number stays ink (#172B4D),
 * and a 36px rounded icon chip in its own soft color.
 */
export function KpiCard({ label, value, subtext, icon: Icon, color, href }: KpiCardProps) {
  const colorStyle = COLOR_MAP[color];

  const content = (
    <div className="bg-surface rounded-xl border border-border p-5 flex flex-col justify-between transition hover:border-slate-300 shadow-2xs h-full">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
          {label}
        </span>
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${colorStyle.bg} ${colorStyle.text}`}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-3">
        {/* The number stays ink (#172B4D) */}
        <div className="text-2xl font-bold text-ink tracking-tight font-sans">
          {value}
        </div>
        {subtext && (
          <p className="text-xs text-muted mt-1 leading-normal">
            {subtext}
          </p>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block group transition-transform active:scale-[0.99]">
        {content}
      </Link>
    );
  }

  return content;
}

