"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield, ArrowRight, Loader2, Check } from "lucide-react";

interface DemoAccount {
  label: string;
  roleDesc: string;
  email: string;
  bureauBadge?: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    label: "Management",
    roleDesc: "Full AICTE Oversight",
    email: "management@aicte.demo",
    bureauBadge: "HQ",
  },
  {
    label: "Regulation Bureau",
    roleDesc: "RB Case Officer",
    email: "rb.officer@aicte.demo",
    bureauBadge: "RB",
  },
  {
    label: "PGR Cell",
    roleDesc: "Grievance Officer",
    email: "pgrc.officer@aicte.demo",
    bureauBadge: "PGRC",
  },
  {
    label: "Regional Officer",
    roleDesc: "Central Region",
    email: "regional.central@aicte.demo",
    bureauBadge: "Central",
  },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/";

  const [email, setEmail] = useState("management@aicte.demo");
  const [password, setPassword] = useState("Demo@1234");
  const [selectedRole, setSelectedRole] = useState("Management");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectDemoAccount = (acc: DemoAccount) => {
    setEmail(acc.email);
    setPassword("Demo@1234");
    setSelectedRole(acc.label);
    setError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data?.error?.message || "Invalid credentials. Please try again.");
        setLoading(false);
        return;
      }

      router.push(from);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface rounded-xl border border-border shadow-2xs overflow-hidden">
      {/* Rule 12: Thin top accent line using a blue-to-teal gradient */}
      <div className="h-1 bg-gradient-to-r from-primary to-bureau-ab w-full" />

      <div className="p-6">
        {/* Quick Demo Selector */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
            Select Demo Role
          </label>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((acc) => {
              const isSelected = selectedRole === acc.label;
              return (
                <button
                  key={acc.label}
                  type="button"
                  onClick={() => selectDemoAccount(acc)}
                  className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                    isSelected
                      ? "border-primary bg-selected text-primary font-medium ring-1 ring-primary/30"
                      : "border-border bg-surface text-ink hover:bg-canvas"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-semibold">{acc.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                  </div>
                  <span className="text-[11px] text-muted mt-0.5 leading-tight">{acc.roleDesc}</span>
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
            <label className="block text-xs font-medium text-ink mb-1.5">Official Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="officer@aicte.demo"
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-ink">Password</label>
              <span className="text-[11px] text-muted">Demo: Demo@1234</span>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition"
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
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign in as {selectedRole}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[420px]">
        {/* App Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-sidebar text-white shadow-2xs mb-3">
            <Shield className="w-5 h-5" />
          </div>
          <div className="block">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-neutral-soft text-subtle text-[10px] font-semibold tracking-wider uppercase mb-1">
              AICTE · PS SIH26264
            </span>
          </div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">CaseLens</h1>
          <p className="text-xs text-muted mt-1">
            One clear view of every institution complaint across AICTE Bureaus & Cells.
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
