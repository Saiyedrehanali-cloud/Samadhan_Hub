import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { caseScope } from "@/lib/rbac";
import { differenceInCalendarDays, format } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHENTICATED", message: "Sign in required." } },
        { status: 401 }
      );
    }

    const { type } = params;
    const { searchParams } = new URL(req.url);
    const formatType = searchParams.get("format") || "json";

    // Fetch scoped cases
    const cases = await db.case.findMany({
      where: caseScope(session),
      include: {
        currentBureau: true,
        institution: true,
      },
    });

    const now = new Date();

    let reportTitle = "";
    let headers: string[] = [];
    let rows: Array<Record<string, unknown>> = [];
    let chartData: Array<{ name: string; value: number }> = [];

    switch (type) {
      case "bureau-workload": {
        reportTitle = "Bureau-Wise Workload & SLA Compliance";
        headers = ["Bureau Code", "Bureau Name", "Open Cases", "Disposed Cases", "Total Cases", "SLA Compliance %"];

        const bureaus = await db.bureau.findMany({ orderBy: { code: "asc" } });

        rows = bureaus.map((b) => {
          const bCases = cases.filter((c) => c.currentBureauId === b.id);
          const open = bCases.filter((c) => c.status !== "DISPOSED").length;
          const disposed = bCases.filter((c) => c.status === "DISPOSED");
          const total = bCases.length;

          const onTimeDisposed = disposed.filter((c) => {
            if (!c.disposedAt) return false;
            return new Date(c.disposedAt) <= new Date(c.expectedDisposalAt);
          }).length;

          const compliancePct = disposed.length > 0
            ? Math.round((onTimeDisposed / disposed.length) * 100)
            : 100;

          return {
            bureauCode: b.code,
            bureauName: b.name,
            openCases: open,
            disposedCases: disposed.length,
            totalCases: total,
            compliancePct: `${compliancePct}%`,
          };
        });

        chartData = rows.map((r) => ({
          name: r.bureauCode as string,
          value: r.openCases as number,
        }));
        break;
      }

      case "region-breakdown": {
        reportTitle = "Region-Wise Grievance Breakdown";
        headers = ["Region", "Open Complaints", "Disposed Complaints", "Total Complaints", "Active Overlaps"];

        const regions = [
          "Central",
          "Eastern",
          "Northern",
          "North-West",
          "Southern",
          "South-West",
          "Western",
        ];

        const openOverlaps = await db.overlapGroup.findMany({
          where: { status: "OPEN" },
          include: { institution: true },
        });

        rows = regions.map((reg) => {
          const regCases = cases.filter((c) => c.institution.region === reg);
          const open = regCases.filter((c) => c.status !== "DISPOSED").length;
          const disposed = regCases.filter((c) => c.status === "DISPOSED").length;
          const overlapsCount = openOverlaps.filter((o) => o.institution.region === reg).length;

          return {
            region: reg,
            openCases: open,
            disposedCases: disposed,
            totalCases: regCases.length,
            activeOverlaps: overlapsCount,
          };
        });

        chartData = rows.map((r) => ({
          name: r.region as string,
          value: r.openCases as number,
        }));
        break;
      }

      case "category-matrix": {
        reportTitle = "Grievance Category & Status Distribution Matrix";
        headers = ["Category", "Received", "Under Process", "Transferred", "Escalated", "Disposed", "Total"];

        const categories = [
          "Fee Regulation",
          "Faculty Norms",
          "Infrastructure",
          "Admission",
          "Affiliation",
          "Harassment",
          "Other",
        ];

        rows = categories.map((cat) => {
          const catCases = cases.filter((c) => c.category === cat);
          const received = catCases.filter((c) => c.status === "RECEIVED").length;
          const underProcess = catCases.filter((c) => c.status === "UNDER_PROCESS").length;
          const transferred = catCases.filter((c) => c.status === "TRANSFERRED").length;
          const escalated = catCases.filter((c) => c.status === "ESCALATED").length;
          const disposed = catCases.filter((c) => c.status === "DISPOSED").length;

          return {
            category: cat,
            received,
            underProcess,
            transferred,
            escalated,
            disposed,
            total: catCases.length,
          };
        });

        chartData = rows.map((r) => ({
          name: r.category as string,
          value: (r.underProcess as number) + (r.received as number) + (r.escalated as number),
        }));
        break;
      }

      case "ageing-analysis": {
        reportTitle = "Case Ageing & Lifecycle Analysis";
        headers = ["Age Bucket", "Active Cases", "Beyond SLA (Overdue)", "Oldest Case No"];

        const openCases = cases.filter((c) => c.status !== "DISPOSED");

        const buckets = [
          { label: "< 15 Days", min: 0, max: 14 },
          { label: "15–30 Days", min: 15, max: 30 },
          { label: "30–60 Days", min: 31, max: 60 },
          { label: "> 60 Days", min: 61, max: 99999 },
        ];

        rows = buckets.map((b) => {
          const matching = openCases.filter((c) => {
            const age = differenceInCalendarDays(now, new Date(c.receivedAt));
            return age >= b.min && age <= b.max;
          });

          const overdueCount = matching.filter(
            (c) => new Date(c.expectedDisposalAt) < now
          ).length;

          const oldest = [...matching].sort(
            (a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime()
          )[0];

          return {
            ageBucket: b.label,
            activeCases: matching.length,
            overdueCount,
            oldestCaseNo: oldest?.caseNo || "None",
          };
        });

        chartData = rows.map((r) => ({
          name: r.ageBucket as string,
          value: r.activeCases as number,
        }));
        break;
      }

      case "disposal-compliance": {
        reportTitle = "Disposal & SLA Compliance Rate";
        headers = ["Category", "Total Disposed", "Resolved Within SLA", "Breached SLA", "Compliance Rate %"];

        const categories = [
          "Fee Regulation",
          "Faculty Norms",
          "Infrastructure",
          "Admission",
          "Affiliation",
          "Harassment",
          "Other",
        ];

        const disposedCases = cases.filter((c) => c.status === "DISPOSED");

        rows = categories.map((cat) => {
          const catDisposed = disposedCases.filter((c) => c.category === cat);
          const onTime = catDisposed.filter((c) => {
            if (!c.disposedAt) return false;
            return new Date(c.disposedAt) <= new Date(c.expectedDisposalAt);
          }).length;
          const breached = catDisposed.length - onTime;
          const rate = catDisposed.length > 0
            ? Math.round((onTime / catDisposed.length) * 100)
            : 100;

          return {
            category: cat,
            totalDisposed: catDisposed.length,
            resolvedWithinSla: onTime,
            breachedSla: breached,
            complianceRatePct: `${rate}%`,
          };
        });

        chartData = rows.map((r) => ({
          name: r.category as string,
          value: parseInt((r.complianceRatePct as string).replace("%", ""), 10),
        }));
        break;
      }

      default:
        return NextResponse.json(
          { ok: false, error: { code: "NOT_FOUND", message: `Unknown report type: ${type}` } },
          { status: 404 }
        );
    }

    // CSV Export Mode
    if (formatType === "csv") {
      const csvLines: string[] = [];

      // Header row
      csvLines.push(headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(","));

      // Value rows
      for (const row of rows) {
        const values = Object.values(row).map((val) => {
          const str = String(val ?? "");
          return `"${str.replace(/"/g, '""')}"`;
        });
        csvLines.push(values.join(","));
      }

      const csvContent = csvLines.join("\n");

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="samadhan-hub-${type}-report.csv"`,
        },
      });
    }

    // JSON Mode
    return NextResponse.json({
      ok: true,
      data: {
        reportType: type,
        title: reportTitle,
        headers,
        rows,
        chartData,
        totalCasesCount: cases.length,
        generatedAt: now.toISOString(),
      },
    });
  } catch (err: unknown) {
    console.error("GET /api/reports/[type] error:", err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER", message: "Failed to generate analytical report" } },
      { status: 500 }
    );
  }
}

