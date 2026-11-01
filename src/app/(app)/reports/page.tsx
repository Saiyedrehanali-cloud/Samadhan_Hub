"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Download,
  Layers,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  RefreshCw,
  Table as TableIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

// Rule 11: Categorical order #1868DB, #2898BD, #803FA5, #C75300, #22A06B
const CATEGORICAL_COLORS = ["#1868DB", "#2898BD", "#803FA5", "#C75300", "#22A06B"];

interface ReportData {
  reportType: string;
  title: string;
  headers: string[];
  rows: Array<Record<string, unknown>>;
  chartData: Array<{ name: string; value: number }>;
  totalCasesCount: number;
  generatedAt: string;
}

const REPORT_TABS = [
  {
    id: "bureau-workload",
    label: "Bureau Workload",
    desc: "Active cases & SLA compliance per AICTE Bureau",
    icon: Layers,
  },
  {
    id: "region-breakdown",
    label: "Regional Breakdown",
    desc: "Geographic complaint volume & overlap density",
    icon: MapPin,
  },
  {
    id: "category-matrix",
    label: "Category Matrix",
    desc: "Status progression across 7 grievance categories",
    icon: BarChart3,
  },
  {
    id: "ageing-analysis",
    label: "Case Ageing",
    desc: "Distribution across ageing buckets & overdue risks",
    icon: Clock,
  },
  {
    id: "disposal-compliance",
    label: "Disposal Compliance",
    desc: "Resolution efficiency and deadline adherence",
    icon: CheckCircle2,
  },
];

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState("bureau-workload");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchReport = async (reportType: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/${reportType}?format=json`);
      const json = await res.json();
      if (json.ok && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.error("Failed to load report:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(selectedReport);
  }, [selectedReport]);

  const handleExportCsv = () => {
    setExporting(true);
    // Direct browser navigation to download CSV file
    window.location.href = `/api/reports/${selectedReport}?format=csv`;
    setTimeout(() => setExporting(false), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-ink tracking-tight">
              Analytical Reports & Statutory Exports
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-neutral-soft text-subtle text-[10px] font-bold">
              AICTE Oversight
            </span>
          </div>
          <p className="text-xs text-muted mt-1">
            Real-time bureau analytics, grievance ageing, and 1:1 verifiable server-side CSV exports.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          disabled={loading || exporting}
          className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-2 transition disabled:opacity-50 self-start sm:self-auto shadow-2xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{exporting ? "Generating CSV..." : "Export Official CSV"}</span>
        </button>
      </div>

      {/* 5 Quiet Report Switcher Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {REPORT_TABS.map((tab) => {
          const Icon = tab.icon;
          const isSelected = selectedReport === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setSelectedReport(tab.id)}
              className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                isSelected
                  ? "bg-selected border-primary shadow-2xs"
                  : "bg-surface border-border hover:bg-canvas hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon
                  className={`w-4 h-4 ${
                    isSelected ? "text-primary" : "text-muted"
                  }`}
                />
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </div>
              <div>
                <div
                  className={`text-xs font-bold leading-tight ${
                    isSelected ? "text-primary" : "text-ink"
                  }`}
                >
                  {tab.label}
                </div>
                <div className="text-[10px] text-muted line-clamp-1 mt-0.5">
                  {tab.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Report Workspace */}
      {loading ? (
        <div className="p-12 bg-surface rounded-xl border border-border flex flex-col items-center justify-center text-muted">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
          <span className="text-xs font-medium">Aggregating cross-bureau records...</span>
        </div>
      ) : !data ? (
        <div className="p-12 bg-surface rounded-xl border border-border text-center text-muted">
          Failed to load report data.
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in">
          {/* Card 1: Minimalist Distribution Bar Chart with Categorical Colors (Rule 11) */}
          <div className="p-5 bg-surface rounded-xl border border-border shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-primary" />
                  {data.title}
                </h2>
                <p className="text-[11px] text-muted mt-0.5">
                  Visual metric distribution matching official statutory figures.
                </p>
              </div>
              <span className="text-[11px] font-mono text-muted">
                Sample Size: {data.totalCasesCount} complaints
              </span>
            </div>

            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#DDDEE1" />
                  <XAxis
                    dataKey="name"
                    stroke="#626F86"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#DDDEE1" }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    stroke="#626F86"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      borderColor: "#DDDEE1",
                      borderRadius: "8px",
                      fontSize: "12px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                    }}
                    cursor={{ fill: "#E9F2FE" }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    {data.chartData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card 2: Minimalist Data Table (Strictly <= 6 Columns) */}
          <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-border bg-canvas/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TableIcon className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-bold text-ink uppercase tracking-wider">
                  Tabular Breakdown & Verification Grid
                </span>
              </div>
              <span className="text-[10px] text-muted">
                1:1 Match with Downloadable CSV
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-canvas/50 text-[11px] font-bold text-muted uppercase tracking-wider">
                    {data.headers.map((h, i) => (
                      <th
                        key={h}
                        className={`py-3 px-4 ${i === data.headers.length - 1 ? "text-right" : ""}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs">
                  {data.rows.map((row, rIdx) => {
                    const values = Object.values(row);
                    return (
                      <tr key={rIdx} className="hover:bg-selected transition">
                        {values.map((val, cIdx) => (
                          <td
                            key={cIdx}
                            className={`py-3 px-4 ${
                              cIdx === 0
                                ? "font-semibold text-ink"
                                : "text-subtle"
                            } ${
                              cIdx === values.length - 1 ? "text-right font-medium" : ""
                            }`}
                          >
                            {String(val ?? "—")}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 border-t border-border bg-canvas/40 flex items-center justify-between text-[11px] text-muted">
              <span>Verified against immutable Case records</span>
              <span>Generated: {new Date(data.generatedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
