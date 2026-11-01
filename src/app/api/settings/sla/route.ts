import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/services/audit";
import { z } from "zod";

const updateSlaSchema = z.object({
  rules: z.array(
    z.object({
      category: z.string().min(1),
      slaDays: z.number().int().min(1).max(365),
    })
  ),
  escalateAfterDays: z.number().int().min(1).max(60).optional(),
  idleDays: z.number().int().min(1).max(60).optional(),
});

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHENTICATED", message: "Sign in required" } },
        { status: 401 }
      );
    }

    const [rules, settings] = await Promise.all([
      db.slaRule.findMany({
        orderBy: { category: "asc" },
      }),
      db.setting.findMany({
        where: {
          key: {
            in: [
              "escalateAfterDays",
              "idleDays",
              "alerts.lastScanTime",
            ],
          },
        },
      }),
    ]);

    const settingsMap = settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {} as Record<string, string>);

    return NextResponse.json({
      ok: true,
      data: {
        rules,
        settings: {
          escalateAfterDays: parseInt(settingsMap["escalateAfterDays"] || "7", 10),
          idleDays: parseInt(settingsMap["idleDays"] || "10", 10),
          lastScanTime: settingsMap["alerts.lastScanTime"] || null,
        },
      },
    });
  } catch (err: unknown) {
    console.error("GET /api/settings/sla error:", err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER", message: "Failed to load SLA settings" } },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHENTICATED", message: "Sign in required" } },
        { status: 401 }
      );
    }

    if (session.role !== "MANAGEMENT") {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "FORBIDDEN",
            message: "Only Management officers have authorization to modify institutional SLA rules",
          },
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = updateSlaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION",
            message: "Invalid SLA parameters provided",
            details: parsed.error.flatten(),
          },
        },
        { status: 422 }
      );
    }

    const { rules, escalateAfterDays, idleDays } = parsed.data;

    // Transactional update of rules and threshold settings
    await db.$transaction(async (tx) => {
      // 1. Update rules
      for (const rule of rules) {
        await tx.slaRule.upsert({
          where: { category: rule.category },
          update: { slaDays: rule.slaDays },
          create: { category: rule.category, slaDays: rule.slaDays },
        });
      }

      // 2. Update thresholds if provided
      if (escalateAfterDays !== undefined) {
        await tx.setting.upsert({
          where: { key: "escalateAfterDays" },
          update: { value: escalateAfterDays.toString() },
          create: { key: "escalateAfterDays", value: escalateAfterDays.toString() },
        });
      }

      if (idleDays !== undefined) {
        await tx.setting.upsert({
          where: { key: "idleDays" },
          update: { value: idleDays.toString() },
          create: { key: "idleDays", value: idleDays.toString() },
        });
      }
    });

    // Write audit log
    await logAudit({
      actorId: session.userId,
      action: "SLA_SETTINGS_UPDATED",
      entity: "SlaRule",
      entityId: "CONFIGURATION",
      payload: {
        updatedCategoriesCount: rules.length,
        escalateAfterDays,
        idleDays,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "SLA configuration saved successfully",
    });
  } catch (err: unknown) {
    console.error("PUT /api/settings/sla error:", err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER", message: "Failed to update SLA settings" } },
      { status: 500 }
    );
  }
}
