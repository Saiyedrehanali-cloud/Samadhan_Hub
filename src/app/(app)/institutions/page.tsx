"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Search,
  Filter,
  ArrowRight,
  GitMerge,
  AlertTriangle,
  CheckCircle2,
  MapPin,
} from "lucide-react";

interface InstitutionItem {
  id: string;
  aicteId: string;
  name: string;
  city: string;
  state: string;
  region: string;
  type: string;
  openCasesCount: number;
  hasActiveOverlap: boolean;
  overlapStrength: "STRONG" | "POSSIBLE" | null;
  overlapGroupId: string | null;
}

const REGIONS = [
  "All Regions",
  "Central",
  "Eastern",
  "Northern",
  "North-West",
  "Southern",
  "South-West",
  "Western",
];

export default function InstitutionsPage() {
  const router = useRouter();
  const [institutions, setInstitutions] = useState<InstitutionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("All Regions");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchInstitutions = async (searchTerm: string, regionFilter: string, pageNum: number) => {
    setLoading(true);
    try {
      let url = `/api/institutions?page=${pageNum}&limit=15`;
      if (searchTerm) url += `&q=${encodeURIComponent(searchTerm)}`;
      if (regionFilter && regionFilter !== "All Regions") {
        url += `&region=${encodeURIComponent(regionFilter)}`;
      }

      const res = await fetch(url);
      const json = await res.json();
      if (json.ok && json.data) {
        setInstitutions(json.data.institutions);
        setTotal(json.data.total);
        setTotalPages(json.data.totalPages || 1);
        setPage(json.data.page || 1);
      }
    } catch (err) {
      console.error("Failed to load institutions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInstitutions(search, selectedRegion, page);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, selectedRegion, page]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-ink tracking-tight">
              Centralized Institution Directory
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-neutral-soft text-muted border border-border text-[10px] font-bold">
              {total} Institutions
            </span>
          </div>
          <p className="text-xs text-muted mt-1">
            Consolidated complaint records, active bureau assignments, and overlap flags across AICTE-approved institutions.
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Institution Name, AICTE ID, City, or State..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-border bg-surface text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
          />
        </div>

        {/* Region Filter */}
        <div className="w-full sm:w-48 shrink-0">
          <select
            value={selectedRegion}
            onChange={(e) => {
              setSelectedRegion(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
          >
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Directory Table — Strictly 6 Columns Max */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-canvas/70 text-[11px] font-bold text-muted uppercase tracking-wider">
                <th className="py-3 px-4">AICTE ID</th>
                <th className="py-3 px-4">Institution Name & City</th>
                <th className="py-3 px-4">Region</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-center">Open Cases</th>
                <th className="py-3 px-4 text-right">Advisory Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span>Loading institutions...</span>
                    </div>
                  </td>
                </tr>
              ) : institutions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Building2 className="w-8 h-8 text-muted mx-auto mb-2 opacity-50" />
                    <p className="font-semibold text-ink">No institutions match your search</p>
                    <p className="text-[11px] text-muted mt-0.5">
                      Try clearing your search query or selecting a different region.
                    </p>
                  </td>
                </tr>
              ) : (
                institutions.map((inst) => (
                  <tr
                    key={inst.id}
                    onClick={() => router.push(`/institutions/${inst.id}`)}
                    className="hover:bg-selected transition cursor-pointer group"
                  >
                    {/* Col 1: AICTE ID */}
                    <td className="py-3 px-4 font-mono font-semibold text-primary">
                      {inst.aicteId}
                    </td>

                    {/* Col 2: Name & City */}
                    <td className="py-3 px-4 max-w-[260px]">
                      <div className="font-semibold text-ink group-hover:underline transition truncate">
                        {inst.name}
                      </div>
                      <div className="text-[11px] text-muted flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-muted shrink-0" />
                        <span className="truncate">
                          {inst.city}, {inst.state}
                        </span>
                      </div>
                    </td>

                    {/* Col 3: Region */}
                    <td className="py-3 px-4 text-muted font-medium">
                      {inst.region}
                    </td>

                    {/* Col 4: Type */}
                    <td className="py-3 px-4 text-muted text-[11px]">
                      {inst.type}
                    </td>

                    {/* Col 5: Open Cases */}
                    <td className="py-3 px-4 text-center">
                      {inst.openCasesCount > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary-soft text-primary border border-primary/20">
                          {inst.openCasesCount} active
                        </span>
                      ) : (
                        <span className="text-muted text-[11px]">0</span>
                      )}
                    </td>

                    {/* Col 6: Advisory Status */}
                    <td className="py-3 px-4 text-right">
                      {inst.hasActiveOverlap ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-overlap-soft text-overlap-text border border-overlap/30">
                          <GitMerge className="w-3 h-3 text-overlap" />
                          <span>Overlap Alert</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-muted bg-neutral-soft border border-border">
                          <CheckCircle2 className="w-3 h-3 text-success" />
                          <span>Clear</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-border bg-slate-50/50 flex items-center justify-between text-xs text-muted">
            <span>
              Showing {institutions.length} of {total} institutions (Page {page} of {totalPages})
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg border border-border bg-surface hover:bg-slate-50 disabled:opacity-40 transition"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded-lg border border-border bg-surface hover:bg-slate-50 disabled:opacity-40 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
