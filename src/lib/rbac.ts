import { Prisma } from "@prisma/client";
import { SessionUser } from "./auth";

/**
 * Generates Prisma query filter for Cases based on the active user session.
 * - MANAGEMENT: Unrestricted (sees all cases across AICTE)
 * - BUREAU_OFFICER: Sees own bureau cases + cases in active overlap groups involving their bureau
 * - REGIONAL_OFFICER: Sees cases relating to institutions within their geographical region
 */
export function caseScope(session: SessionUser): Prisma.CaseWhereInput {
  if (session.role === "MANAGEMENT") {
    return {};
  }

  if (session.role === "BUREAU_OFFICER") {
    if (!session.bureauId) return { id: "__NO_ACCESS__" };
    return {
      OR: [
        { currentBureauId: session.bureauId },
        {
          overlapMembers: {
            some: {
              group: {
                members: {
                  some: {
                    case: {
                      currentBureauId: session.bureauId,
                    },
                  },
                },
              },
            },
          },
        },
      ],
    };
  }

  if (session.role === "REGIONAL_OFFICER") {
    if (!session.region) return { id: "__NO_ACCESS__" };
    return {
      institution: {
        region: session.region,
      },
    };
  }

  return { id: "__NO_ACCESS__" };
}

/**
 * Generates Prisma query filter for Overlap Groups based on user role.
 */
export function overlapScope(session: SessionUser): Prisma.OverlapGroupWhereInput {
  if (session.role === "MANAGEMENT") {
    return {};
  }

  if (session.role === "BUREAU_OFFICER") {
    if (!session.bureauId) return { id: "__NO_ACCESS__" };
    return {
      members: {
        some: {
          case: {
            currentBureauId: session.bureauId,
          },
        },
      },
    };
  }

  if (session.role === "REGIONAL_OFFICER") {
    if (!session.region) return { id: "__NO_ACCESS__" };
    return {
      institution: {
        region: session.region,
      },
    };
  }

  return { id: "__NO_ACCESS__" };
}

/**
 * Validates whether the active session has permissions to mutate a case.
 */
export function canMutateCase(session: SessionUser, currentBureauId: string): boolean {
  if (session.role === "MANAGEMENT") return true;
  if (session.role === "BUREAU_OFFICER" && session.bureauId === currentBureauId) return true;
  return false;
}

/**
 * Generates Prisma query filter for Alerts based on user role and audience.
 * - MANAGEMENT: Sees all alerts across AICTE (including escalations and overlaps)
 * - BUREAU_OFFICER: Sees alerts targeted to their Bureau (e.g. BUREAU:RB) or broadcast (ALL)
 * - REGIONAL_OFFICER: Sees alerts targeted to their Region (e.g. REGION:Central) or broadcast (ALL)
 */
export function alertScope(session: SessionUser): Prisma.AlertWhereInput {
  if (session.role === "MANAGEMENT") {
    return {};
  }

  if (session.role === "BUREAU_OFFICER") {
    if (!session.bureauCode) return { id: "__NO_ACCESS__" };
    return {
      audience: { in: [`BUREAU:${session.bureauCode}`, "ALL"] },
    };
  }

  if (session.role === "REGIONAL_OFFICER") {
    if (!session.region) return { id: "__NO_ACCESS__" };
    return {
      audience: { in: [`REGION:${session.region}`, "ALL"] },
    };
  }

  return { id: "__NO_ACCESS__" };
}


