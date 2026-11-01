"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  FileText,
  GitMerge,
  Building2,
  BarChart3,
  Shield,
  ShieldCheck,
  LogOut,
  X,
} from "lucide-react";
import { SessionUser } from "@/lib/auth";

interface SidebarProps {
  user: SessionUser;
  activeOverlapCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ user, activeOverlapCount = 5, isOpenMobile = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      window.location.href = "/login";
    }
  };

  const navItems = [
    { label: "Overview", href: "/", icon: LayoutGrid, exact: true },
    { label: "Cases", href: "/cases", icon: FileText, exact: false },
    {
      label: "Overlaps",
      href: "/overlaps",
      icon: GitMerge,
      exact: false,
      badge: activeOverlapCount > 0 ? activeOverlapCount : undefined,
    },
    { label: "Institutions", href: "/institutions", icon: Building2, exact: false },
    { label: "Reports", href: "/reports", icon: BarChart3, exact: false },
    ...(user.role === "MANAGEMENT"
      ? [{ label: "Audit Trail", href: "/audit", icon: ShieldCheck, exact: false }]
      : []),
  ];

  const getRoleBadge = () => {
    if (user.role === "MANAGEMENT") return "Management";
    if (user.role === "BUREAU_OFFICER") return user.bureauCode ? `${user.bureauCode} Officer` : "Bureau Officer";
    if (user.role === "REGIONAL_OFFICER") return `${user.region || "Regional"} RO`;
    return user.role;
  };

  const content = (
    <div className="flex flex-col h-full w-[232px] bg-surface border-r border-border select-none">
      {/* Top Branding */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-border">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shadow-sm">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-primary-dark tracking-tight text-sm">CaseLens</span>
              <span className="text-[10px] font-semibold text-primary px-1.5 py-0.2 bg-primary-50 rounded">
                AICTE
              </span>
            </div>
            <p className="text-[10px] text-muted -mt-0.5">SIH 2026 · PS SIH26264</p>
          </div>
        </Link>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1 rounded-md text-muted hover:text-ink hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Primary Navigation — Strictly <= 6 items per minimalism rules */}
      <div className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        <div className="px-2 mb-2">
          <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">
            Main Menu
          </span>
        </div>
        {navItems.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                isActive
                  ? "bg-primary-50 text-primary font-semibold"
                  : "text-muted hover:text-ink hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? "text-primary" : "text-muted group-hover:text-ink"
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-warning-50 text-warning border border-warning/20">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* User Profile Card */}
      <div className="p-3 border-t border-border bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-primary-dark text-white flex items-center justify-center text-xs font-semibold shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-ink truncate leading-tight">{user.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="inline-block text-[10px] font-semibold text-primary bg-primary-50 px-1 rounded">
                  {getRoleBadge()}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 rounded-md text-muted hover:text-danger hover:bg-danger-50 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden md:block fixed top-0 bottom-0 left-0 z-30">
        {content}
      </aside>

      {/* Mobile drawer backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-ink/40 z-40 md:hidden backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
        >
          <div
            className="fixed inset-y-0 left-0 z-50 w-[232px] bg-surface shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {content}
          </div>
        </div>
      )}
    </>
  );
}

