"use client";

import { Menu, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { SessionUser } from "@/lib/auth";
import { AlertBell } from "./AlertBell";

interface TopbarProps {
  user: SessionUser;
  onOpenMobileNav: () => void;
  unreadAlertsCount?: number;
}

export function Topbar({ user, onOpenMobileNav, unreadAlertsCount = 5 }: TopbarProps) {
  const getRoleDisplay = () => {
    if (user.role === "MANAGEMENT") return "AICTE HQ · Management Oversight";
    if (user.role === "BUREAU_OFFICER") return `${user.bureauCode || "Bureau"} Officer Desk`;
    if (user.role === "REGIONAL_OFFICER") return `${user.region || "Regional"} Regional Directorate`;
    return user.role;
  };

  return (
    <header className="sticky top-0 z-20 h-16 bg-surface border-b border-border px-4 md:px-8 flex items-center justify-between">
      {/* Left: Mobile hamburger & breadcrumb / portal tag */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="md:hidden p-2 rounded-lg text-muted hover:text-ink hover:bg-slate-100"
          aria-label="Open mobile menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-canvas border border-border text-[11px] font-medium text-ink">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span>AICTE Central Portal</span>
          </span>
          <span className="text-xs text-muted hidden md:inline">/</span>
          <span className="text-xs font-semibold text-primary-dark">
            {getRoleDisplay()}
          </span>
        </div>
      </div>

      {/* Right: Quick Search + Alert Bell */}
      <div className="flex items-center gap-3">
        {/* Quick Search Input */}
        <div className="relative hidden sm:block w-48 md:w-64">
          <Search className="w-3.5 h-3.5 text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search cases, AICTE ID..."
            className="w-full pl-8 pr-8 py-1.5 text-xs rounded-lg border border-border bg-canvas/70 placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:bg-surface transition"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted border border-border bg-surface px-1.5 py-0.5 rounded shadow-2xs font-mono">
            ⌘K
          </kbd>
        </div>

        {/* Interactive Notifications Bell */}
        <AlertBell initialUnreadCount={unreadAlertsCount} />
      </div>
    </header>
  );
}

