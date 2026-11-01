import { differenceInCalendarDays } from "date-fns";

export interface SlaEvaluation {
  ratio: number;
  daysRemaining: number;
  daysOverdue: number;
  status: "ON_TIME" | "SLA_NEARING" | "SLA_CRITICAL" | "OVERDUE" | "DISPOSED";
  severity: "INFO" | "WARNING" | "DANGER";
  isOverdueBy7Days: boolean;
  isIdle10Days: boolean;
}

/**
 * Proactive SLA and Ageing calculation service.
 */
export function evaluateCaseSla(item: {
  receivedAt: Date | string;
  slaDays: number;
  expectedDisposalAt: Date | string;
  disposedAt?: Date | string | null;
  lastActionAt?: Date | string | null;
  status?: string;
  escalateAfterDays?: number;
  idleDays?: number;
}): SlaEvaluation {
  const received = new Date(item.receivedAt);
  const slaTarget = new Date(item.expectedDisposalAt);
  const now = new Date();
  const escalateThreshold = item.escalateAfterDays ?? 7;
  const idleThreshold = item.idleDays ?? 10;

  if (item.status === "DISPOSED" || item.disposedAt) {
    return {
      ratio: 1.0,
      daysRemaining: 0,
      daysOverdue: 0,
      status: "DISPOSED",
      severity: "INFO",
      isOverdueBy7Days: false,
      isIdle10Days: false,
    };
  }

  const totalDurationMs = Math.max(1, slaTarget.getTime() - received.getTime());
  const elapsedMs = now.getTime() - received.getTime();
  const ratio = Math.max(0, elapsedMs / totalDurationMs);
  const diffDays = differenceInCalendarDays(slaTarget, now);

  // Check idle activity: days since last action
  const lastAction = item.lastActionAt ? new Date(item.lastActionAt) : received;
  const daysSinceLastAction = differenceInCalendarDays(now, lastAction);
  const isIdle10Days = daysSinceLastAction >= idleThreshold;

  if (now > slaTarget || diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    const isOverdueBy7Days = overdueDays >= escalateThreshold;

    return {
      ratio,
      daysRemaining: 0,
      daysOverdue: overdueDays === 0 ? 1 : overdueDays,
      status: "OVERDUE",
      severity: "DANGER",
      isOverdueBy7Days,
      isIdle10Days,
    };
  }

  if (ratio >= 0.9 || diffDays <= 2) {
    return {
      ratio,
      daysRemaining: diffDays,
      daysOverdue: 0,
      status: "SLA_CRITICAL",
      severity: "DANGER",
      isOverdueBy7Days: false,
      isIdle10Days,
    };
  }

  if (ratio >= 0.75 || diffDays <= 5) {
    return {
      ratio,
      daysRemaining: diffDays,
      daysOverdue: 0,
      status: "SLA_NEARING",
      severity: "WARNING",
      isOverdueBy7Days: false,
      isIdle10Days,
    };
  }

  return {
    ratio,
    daysRemaining: diffDays,
    daysOverdue: 0,
    status: "ON_TIME",
    severity: "INFO",
    isOverdueBy7Days: false,
    isIdle10Days,
  };
}

