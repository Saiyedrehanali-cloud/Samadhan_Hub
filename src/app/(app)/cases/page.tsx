"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Filter,
  Plus,
  GitMerge,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Building,
  Loader2,
} from "lucide-react";
import { STATUS_MAP, computeSlaState, CATEGORIES } from "@/lib/utils";
import { StatusChip } from "@/components/common/StatusChip";
import { BureauBadge } from "@/components/common/BureauBadge";

interface CaseItem {
  id: string;
  caseNo: string;
  category: string;
  source: string;
  subject: string;
  status: string;
  priority: string;
  receivedAt: string;
  expectedDisposalAt: string;
  lastActionAt: string;
  lastActionNote: string | null;
  institution: {
    id: string;
    name: string;
    aicteId: string;
    region: string;
    city: string;
  };
  currentBureau: {
    id: string;
    code: string;
    name: string;
  };
  hasActiveOverlap: boolean;
  activeOverlap: {
    id: string;
    kind: string;
    strength: string;
  } | null;
}

const REGIONS = ["Central", "Western", "Eastern", "Northern", "North-Eastern", "Southern"];
const BUREAUS = [
  { code: "RB", name: "Regulation Bureau" },
  { code: "PGRC", name: "PGR Cell" },
  { code: "AB", name: "Approval Bureau" },
  { code: "LC", name: "Legal Cell" },
];
const STATUSES = ["RECEIVED", "UNDER_PROCESS", "TRANSFERRED", "ESCALATED", "DISPOSED"];

function CasesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read URL query params
  const initialQ = searchParams.get("q") || "";
  const initialBureau = searchParams.get("bureau") || "";
  const initialRegion = searchParams.get("region") || "";
  const initialCategory = searchParams.get("category") || "";
  const initialStatus = searchParams.get("status") || "";
  const initialOverlap = searchParams.get("overlap") === "true";
  const initialOverdue = searchParams.get("overdue") === "true";
  const initialPage = parseInt(searchParams.get("page") || "1", 10);

  const [q, setQ] = useState(initialQ);
  const [bureau, setBureau] = useState(initialBureau);
  const [region, setRegion] = useState(initialRegion);
  const [category, setCategory] = useState(initialCategory);
  const [status, setStatus] = useState(initialStatus);
  const [overlapOnly, setOverlapOnly] = useState(initialOverlap);
  const [overdueOnly, setOverdueOnly] = useState(initialOverdue);
  const [page, setPage] = useState(initialPage);

  const [showFilters, setShowFilters] = useState(
    Boolean(initialBureau || initialRegion || initialCategory || initialStatus || initialOverlap || initialOverdue)
  );

  const [cases, setCases] = useState<CaseItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Sync state to URL and fetch cases
  const fetchCases = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (bureau) params.set("bureau", bureau);
    if (region) params.set("region", region);
    if (category) params.set("category", category);
    if (status) params.set("status", status);
    if (overlapOnly) params.set("overlap", "true");
    if (overdueOnly) params.set("overdue", "true");
    params.set("page", page.toString());
    params.set("limit", "12");

    // Update browser URL query
    router.replace(`/cases?${params.toString()}`, { scroll: false });

    try {
      const res = await fetch(`/api/cases?${params.toString()}`);
      const json = await res.json();
      if (json.ok) {
        setCases(json.data.cases);
        setPagination(json.data.pagination);
      }
    } catch (err) {
      console.error("Failed to load cases:", err);
    } finally {
      setLoading(false);
    }
  }, [q, bureau, region, category, status, overlapOnly, overdueOnly, page, router]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const clearAllFilters = () => {
    setQ("");
    setBureau("");
    setRegion("");
    setCategory("");
    setStatus("");
    setOverlapOnly(false);
    setOverdueOnly(false);
    setPage(1);
  };

  const activeFilterCount =
    (bureau ? 1 : 0) +
    (region ? 1 : 0) +
    (category ? 1 : 0) +
    (status ? 1 : 0) +
    (overlapOnly ? 1 : 0) +
    (overdueOnly ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink tracking-tight">Cases</h1>
          <p className="text-xs text-muted mt-0.5">
            Single-window institution complaint directory across AICTE Bureaus & Cells.
          </p>
        </div>
        <Link
          href="/cases/new"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition shadow-2xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Case</span>
        </Link>
      </div>

      {/* Search & Collapsible Filters Bar */}
      <div className="bg-surface rounded-xl border border-border p-3.5 space-y-3 shadow-2xs">
        <div className="flex items-center gap-2">
          {/* Always visible search input */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search by Case No, Institution Name, AICTE ID, or Subject..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-border bg-canvas/60 text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:bg-surface transition"
            />
          </div>

          {/* Filters Toggle Button */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition ${
              showFilters || activeFilterCount > 0
                ? "bg-primary-soft border-primary/30 text-primary font-semibold"
                : "border-border bg-surface text-ink hover:bg-canvas"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              title="Clear all filters"
              className="p-2 rounded-lg border border-border text-muted hover:text-danger-text hover:bg-danger-soft text-xs transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Collapsible Filter Panel */}
        {showFilters && (
          <div className="pt-3 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Bureau Filter */}
            <div>
              <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">
                Bureau / Cell
              </label>
              <select
                value={bureau}
                onChange={(e) => {
                  setBureau(e.target.value);
                  setPage(1);
                }}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Bureaus</option>
                {BUREAUS.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.code} ({b.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Region Filter */}
            <div>
              <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">
                Region
              </label>
              <select
                value={region}
                onChange={(e) => {
                  setRegion(e.target.value);
                  setPage(1);
                }}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Regions</option>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Statuses</option>
                {STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {STATUS_MAP[st]?.label || st}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Toggle Chips */}
            <div className="col-span-2 sm:col-span-4 flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setOverlapOnly(!overlapOnly);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition border ${
                  overlapOnly
                    ? "bg-overlap-soft border-overlap/40 text-overlap-text font-semibold ring-1 ring-overlap/30"
                    : "border-border bg-canvas text-subtle hover:text-ink"
                }`}
              >
                ⚡ Overlapping Only
              </button>

              <button
                type="button"
                onClick={() => {
                  setOverdueOnly(!overdueOnly);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition border ${
                  overdueOnly
                    ? "bg-danger-soft border-danger/40 text-danger-text font-semibold ring-1 ring-danger/30"
                    : "border-border bg-canvas text-subtle hover:text-ink"
                }`}
              >
                ⏰ Beyond Timeline Only
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MINIMALIST CASES TABLE — Strictly 6 Columns max per Minimalism Rule 2 */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-canvas/70 text-[10px] font-semibold text-muted uppercase tracking-wider">
                <th className="py-3 px-4">Case ID</th>
                <th className="py-3 px-4">Institution</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Bureau</th>
                <th className="py-3 px-4 text-right">Age / Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted">
                    <div className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span>Loading cases...</span>
                    </div>
                  </td>
                </tr>
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <p className="text-xs text-muted mb-2">No cases match your filters.</p>
                    <button
                      onClick={clearAllFilters}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Clear all filters
                    </button>
                  </td>
                </tr>
              ) : (
                cases.map((c) => {
                  const sla = computeSlaState({
                    receivedAt: c.receivedAt,
                    slaDays: 30,
                    expectedDisposalAt: c.expectedDisposalAt,
                    status: c.status,
                  });

                  return (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/cases/${c.id}`)}
                      className="hover:bg-selected cursor-pointer transition group"
                    >
                      {/* Col 1: Case ID (Monospace) */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-primary group-hover:underline">
                        {c.caseNo}
                      </td>

                      {/* Col 2: Institution (Name + AICTE ID) */}
                      <td className="py-3.5 px-4 max-w-[240px]">
                        <div className="font-medium text-ink truncate leading-snug">
                          {c.institution.name}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted font-mono mt-0.5">
                          <span>{c.institution.aicteId}</span>
                          <span>·</span>
                          <span className="font-sans text-subtle">{c.institution.city}</span>
                        </div>
                      </td>

                      {/* Col 3: Category */}
                      <td className="py-3.5 px-4 text-subtle whitespace-nowrap">
                        {c.category}
                      </td>

                      {/* Col 4: Status (Atlassian StatusChip) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusChip status={c.status} size="sm" />
                      </td>

                      {/* Col 5: Current Bureau (BureauBadge + Overlap icon if active) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <BureauBadge code={c.currentBureau.code} size="sm" />
                          {c.hasActiveOverlap && (
                            <span
                              title={`Active Overlap: ${c.activeOverlap?.kind}`}
                              className="p-1 rounded bg-overlap-soft text-overlap"
                            >
                              <GitMerge className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Col 6: Age / Due */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] border ${sla.badgeClass}`}
                        >
                          {sla.badgeText}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Minimalist Pagination Bar */}
        <div className="px-4 py-3 border-t border-border bg-canvas/40 flex items-center justify-between text-xs text-muted">
          <span>
            Showing{" "}
            <strong className="text-ink">
              {cases.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}
            </strong>{" "}
            to{" "}
            <strong className="text-ink">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </strong>{" "}
            of <strong className="text-ink">{pagination.total}</strong> cases
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page <= 1 || loading}
              className="p-1.5 rounded-md border border-border bg-surface hover:bg-canvas disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-medium">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="p-1.5 rounded-md border border-border bg-surface hover:bg-canvas disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CasesPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="h-8 w-48 bg-slate-200 rounded-md"></div>
          <div className="h-64 bg-surface rounded-xl border border-border"></div>
        </div>
      }
    >
      <CasesContent />
    </Suspense>
  );
}
