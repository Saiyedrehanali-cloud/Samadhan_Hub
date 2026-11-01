import { differenceInCalendarDays } from "date-fns";
import { db } from "../db";
import { evaluateCaseSla } from "./sla";

export interface AlertScanResult {
  scannedCases: number;
  createdAlerts: number;
  skippedDuplicates: number;
  throttled: boolean;
  timestamp: string;
}

/**
 * Automated Alert & SLA Scanning Service.
 * Idempotently evaluates active cases against SLA rules and thresholds,
 * creating alerts for holding Bureaus, Regional Officers, and Management.
 */
export async function scanAndDispatchAlerts(options?: {
  force?: boolean;
}): Promise<AlertScanResult> {
  const now = new Date();

  // 1. Throttling check (minimum 5-minute cooldown unless force is true)
  if (!options?.force) {
    const lastScanSetting = await db.setting.findUnique({
      where: { key: "alerts.lastScanTime" },
    });

    if (lastScanSetting?.value) {
      const lastScanDate = new Date(lastScanSetting.value);
      const diffMs = now.getTime() - lastScanDate.getTime();
      const fiveMinutesMs = 5 * 60 * 1000;

      if (diffMs < fiveMinutesMs) {
        return {
          scannedCases: 0,
          createdAlerts: 0,
          skippedDuplicates: 0,
          throttled: true,
          timestamp: lastScanDate.toISOString(),
        };
      }
    }
  }

  // 2. Load active threshold settings
  const [escalateSetting, idleSetting] = await Promise.all([
    db.setting.findUnique({ where: { key: "escalateAfterDays" } }),
    db.setting.findUnique({ where: { key: "idleDays" } }),
  ]);

  const escalateAfterDays = escalateSetting ? parseInt(escalateSetting.value, 10) || 7 : 7;
  const idleDays = idleSetting ? parseInt(idleSetting.value, 10) || 10 : 10;

  // 3. Fetch all active cases (not disposed)
  const openCases = await db.case.findMany({
    where: {
      status: { not: "DISPOSED" },
      disposedAt: null,
    },
    include: {
      institution: true,
      currentBureau: true,
      actions: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  let createdAlerts = 0;
  let skippedDuplicates = 0;

  // 4. Evaluate each case and queue alerts
  for (const c of openCases) {
    const lastActionAt = c.actions[0]?.createdAt ?? c.receivedAt;
    const sla = evaluateCaseSla({
      receivedAt: c.receivedAt,
      slaDays: c.slaDays,
      expectedDisposalAt: c.expectedDisposalAt,
      disposedAt: c.disposedAt,
      lastActionAt,
      status: c.status,
      escalateAfterDays,
      idleDays,
    });

    const candidates: Array<{
      caseId: string;
      type: string;
      key: string;
      severity: string;
      audience: string;
      title: string;
      message: string;
    }> = [];

    // Alert: SLA Nearing (5 days or 75% elapsed)
    if (sla.status === "SLA_NEARING") {
      candidates.push({
        caseId: c.id,
        type: "SLA_NEARING",
        key: `sla_nearing_${c.id}`,
        severity: "WARNING",
        audience: `BUREAU:${c.currentBureau.code}`,
        title: `SLA Nearing: ${c.caseNo}`,
        message: `${c.category} case on ${c.institution.name} has ${sla.daysRemaining} days remaining before deadline.`,
      });
    }

    // Alert: SLA Critical (2 days or 90% elapsed)
    if (sla.status === "SLA_CRITICAL") {
      candidates.push({
        caseId: c.id,
        type: "SLA_CRITICAL",
        key: `sla_critical_${c.id}`,
        severity: "DANGER",
        audience: `BUREAU:${c.currentBureau.code}`,
        title: `Critical SLA Warning: ${c.caseNo}`,
        message: `Only ${sla.daysRemaining} day(s) remain for ${c.category} case on ${c.institution.name}!`,
      });
    }

    // Alert: Case Overdue
    if (sla.status === "OVERDUE") {
      // Dispatched to holding Bureau
      candidates.push({
        caseId: c.id,
        type: "OVERDUE",
        key: `sla_overdue_${c.id}`,
        severity: "DANGER",
        audience: `BUREAU:${c.currentBureau.code}`,
        title: `Case SLA Breached: ${c.caseNo}`,
        message: `${c.category} case on ${c.institution.name} is ${sla.daysOverdue} day(s) overdue.`,
      });

      // Dispatched to Regional Officer
      if (c.institution.region) {
        candidates.push({
          caseId: c.id,
          type: "OVERDUE",
          key: `sla_overdue_${c.id}_reg`,
          severity: "DANGER",
          audience: `REGION:${c.institution.region}`,
          title: `Regional SLA Breached: ${c.caseNo}`,
          message: `${c.category} case on ${c.institution.name} (${c.institution.region} Region) is ${sla.daysOverdue} day(s) overdue.`,
        });
      }
    }

    // Alert: Escalation (>7 days overdue -> Management)
    if (sla.isOverdueBy7Days) {
      candidates.push({
        caseId: c.id,
        type: "ESCALATION",
        key: `sla_escalated_${c.id}`,
        severity: "DANGER",
        audience: "MANAGEMENT",
        title: `Escalated SLA Breach: ${c.caseNo}`,
        message: `High Priority: ${c.category} complaint for ${c.institution.name} is ${sla.daysOverdue} days overdue at ${c.currentBureau.code}. Immediate review required.`,
      });
    }

    // Alert: Idle Case (>10 days without remarks)
    if (sla.isIdle10Days) {
      const daysIdle = differenceInCalendarDays(now, new Date(lastActionAt));
      candidates.push({
        caseId: c.id,
        type: "IDLE",
        key: `idle_case_${c.id}`,
        severity: "WARNING",
        audience: `BUREAU:${c.currentBureau.code}`,
        title: `Action Required: Idle Case ${c.caseNo}`,
        message: `Case has had no movement or remarks for ${daysIdle} days on ${c.institution.name}.`,
      });
    }

    // Idempotent insertion
    for (const cand of candidates) {
      const existing = await db.alert.findUnique({
        where: {
          caseId_type_key_audience: {
            caseId: cand.caseId,
            type: cand.type,
            key: cand.key,
            audience: cand.audience,
          },
        },
      });

      if (!existing) {
        await db.alert.create({
          data: {
            caseId: cand.caseId,
            type: cand.type,
            key: cand.key,
            severity: cand.severity,
            audience: cand.audience,
            title: cand.title,
            message: cand.message,
            isRead: false,
          },
        });
        createdAlerts++;
      } else {
        skippedDuplicates++;
      }
    }
  }

  // 5. Check and dispatch Overlap Alerts for Open Overlap Groups
  const openGroups = await db.overlapGroup.findMany({
    where: { status: "OPEN" },
    include: {
      institution: true,
      members: {
        include: {
          case: {
            include: { currentBureau: true },
          },
        },
      },
    },
  });

  for (const group of openGroups) {
    const bureausInvolved = Array.from(
      new Set(group.members.map((m) => m.case.currentBureau.code))
    );
    const primaryCaseId = group.members[0]?.caseId;
    if (!primaryCaseId) continue;

    // Dispatched to involved Bureaus
    for (const bCode of bureausInvolved) {
      const existing = await db.alert.findUnique({
        where: {
          caseId_type_key_audience: {
            caseId: primaryCaseId,
            type: "OVERLAP_DETECTED",
            key: `overlap_${group.id}`,
            audience: `BUREAU:${bCode}`,
          },
        },
      });

      if (!existing) {
        await db.alert.create({
          data: {
            caseId: primaryCaseId,
            overlapGroupId: group.id,
            type: "OVERLAP_DETECTED",
            key: `overlap_${group.id}`,
            severity: group.strength === "STRONG" ? "WARNING" : "INFO",
            audience: `BUREAU:${bCode}`,
            title: "Potential Overlapping Case – Coordination Required",
            message: `Overlap detected with ${bureausInvolved.filter((b) => b !== bCode).join(", ")} on ${group.institution.name}.`,
            isRead: false,
          },
        });
        createdAlerts++;
      } else {
        skippedDuplicates++;
      }
    }

    // Dispatched to Management
    const mgmtExisting = await db.alert.findUnique({
      where: {
        caseId_type_key_audience: {
          caseId: primaryCaseId,
          type: "OVERLAP_DETECTED",
          key: `overlap_${group.id}`,
          audience: "MANAGEMENT",
        },
      },
    });

    if (!mgmtExisting) {
      await db.alert.create({
        data: {
          caseId: primaryCaseId,
          overlapGroupId: group.id,
          type: "OVERLAP_DETECTED",
          key: `overlap_${group.id}`,
          severity: group.strength === "STRONG" ? "WARNING" : "INFO",
          audience: "MANAGEMENT",
          title: `Cross-Bureau Overlap: ${group.institution.name}`,
          message: `${group.strength} overlap (${bureausInvolved.join(", ")}) on ${group.institution.name}.`,
          isRead: false,
        },
      });
      createdAlerts++;
    } else {
      skippedDuplicates++;
    }
  }

  // 6. Update last scan timestamp setting
  await db.setting.upsert({
    where: { key: "alerts.lastScanTime" },
    update: { value: now.toISOString() },
    create: { key: "alerts.lastScanTime", value: now.toISOString() },
  });

  return {
    scannedCases: openCases.length,
    createdAlerts,
    skippedDuplicates,
    throttled: false,
    timestamp: now.toISOString(),
  };
}
