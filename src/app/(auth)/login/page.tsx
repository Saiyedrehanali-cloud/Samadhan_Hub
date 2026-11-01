"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Shield, ArrowRight, Loader2, Lock, UserCheck, ShieldCheck } from "lucide-react";

interface OfficialRoleAccount {
  label: string;
  roleDesc: string;
  email: string;
  badge: string;
}

const OFFICIAL_ROLES: OfficialRoleAccount[] = [
  {
    label: "Management Oversight",
    roleDesc: "AICTE HQ · Full Institutional Oversight",
    email: "admin@samadhanhub.gov.in",
    badge: "HQ",
  },
  {
    label: "Regulation Bureau",
    roleDesc: "RB Case Officer · Show Cause & Affiliations",
    email: "rb.officer@samadhanhub.gov.in",
    badge: "RB",
  },
  {
    label: "Public Grievance Redressal",
    roleDesc: "PGRC Officer · Student & Faculty Complaints",
    email: "pgrc.officer@samadhanhub.gov.in",
    badge: "PGRC",
  },
  {
    label: "Regional Directorate",
    roleDesc: "Central Region · Zonal Monitoring",
    email: "regional.central@samadhanhub.gov.in",
    badge: "RO",
  },
];

function LoginForm() {
  const searchParams = useSearchParams();
  const rawFrom = searchParams.get("from") || "/";

  // Sanitize redirect target so browser never redirects to devtools or 404s
  const isValidAppRoute = (path: string) => {
    if (!path || !path.startsWith("/")) return false;
    if (
      path.startsWith("/.well-known") ||
      path.startsWith("/_next") ||
      path.startsWith("/api") ||
      path === "/login"
    ) {
      return false;
    }
    return true;
  };

  const from = isValidAppRoute(rawFrom) ? rawFrom : "/";

  const [email, setEmail] = useState("admin@samadhanhub.gov.in");
  const [password, setPassword] = useState("Admin@1234");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectRole = (role: OfficialRoleAccount) => {
    setEmail(role.email);
    setPassword("Admin@1234");
    setError(null);
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        setError(`Server returned status ${res.status}. Please check server connection.`);
        setLoading(false);
        return;
      }

      if (!res.ok || !data?.ok) {
        setError(data?.error?.message || `Sign in failed (${res.status}). Please verify your credentials.`);
        setLoading(false);
        return;
      }

      // Perform a full hard navigation to ensure fresh session cookies are sent
      window.location.href = from;
    } catch (err: any) {
      setError(err?.message || "Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface rounded-xl border border-border shadow-2xs overflow-hidden">
      {/* Top accent line */}
      <div className="h-1 bg-gradient-to-r from-primary to-bureau-ab w-full" />

      <div className="p-6">
        {/* Quick Role Selection for instant evaluation */}
        <div className="mb-5">
          <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Select Official Desk / Role</span>
            <span className="text-[10px] text-primary font-normal">Click to prefill</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {OFFICIAL_ROLES.map((role) => {
              const isSelected = email.toLowerCase() === role.email.toLowerCase();
              return (
                <button
                  key={role.label}
                  type="button"
                  onClick={() => selectRole(role)}
                  className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                    isSelected
                      ? "border-primary bg-selected text-primary font-medium ring-1 ring-primary/30"
                      : "border-border bg-surface text-ink hover:bg-canvas"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-semibold leading-tight">{role.label}</span>
                    <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-slate-100 text-subtle font-bold">
                      {role.badge}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted mt-1 leading-tight line-clamp-1">
                    {role.roleDesc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-danger-soft border border-danger/30 text-danger-text text-xs leading-relaxed">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink mb-1.5 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-muted" />
              <span>Official Email or Username</span>
            </label>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@samadhanhub.gov.in or admin"
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-muted" />
              <span>Password</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition shadow-2xs disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating & Redirecting...</span>
              </>
            ) : (
              <>
                <span>Sign In to Samadhan Hub</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security badge footer */}
        <div className="mt-5 pt-3 border-t border-border flex items-center justify-center gap-1.5 text-[11px] text-muted">
          <ShieldCheck className="w-3.5 h-3.5 text-success" />
          <span>Secured with cryptographic audit logging & RBAC</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[440px]">
        {/* App Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-sidebar text-white shadow-2xs mb-3">
            <Shield className="w-5 h-5 text-primary-50" />
          </div>
          <div className="block">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-neutral-soft text-subtle text-[10px] font-semibold tracking-wider uppercase mb-1">
              AICTE · PS SIH26264
            </span>
          </div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Samadhan Hub</h1>
          <p className="text-xs text-muted mt-1">
            Integrated complaint monitoring and cross-bureau case coordination engine.
          </p>
        </div>

        {/* Login Form inside Suspense boundary */}
        <Suspense
          fallback={
            <div className="bg-surface rounded-xl border border-border p-8 text-center text-xs text-muted shadow-2xs">
              Loading sign in...
            </div>
          }
        >
          <LoginForm />
        </Suspense>

        {/* Footer info */}
        <p className="text-center text-[11px] text-muted mt-5">
          Role-scoped access control enforced. Actions are cryptographically logged.
        </p>
      </div>
    </div>
  );
}
