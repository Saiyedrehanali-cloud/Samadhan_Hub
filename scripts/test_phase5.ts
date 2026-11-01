import { db } from "../src/lib/db";
import { scanAndDispatchAlerts } from "../src/lib/services/alerts";
import { alertScope } from "../src/lib/rbac";
import { SessionUser } from "../src/lib/auth";

async function main() {
  console.log("==================================================");
  console.log("🧪 CaseLens — Phase 5 SLA & Alerts Verification");
  console.log("==================================================");

  // 1. Initial Alert Count
  const initialAlertsCount = await db.alert.count();
  console.log(`\n1️⃣ Initial alert count in DB: ${initialAlertsCount}`);

  // 2. Trigger On-Demand Scan
  console.log("\n2️⃣ Running scanAndDispatchAlerts({ force: true })...");
  const result1 = await scanAndDispatchAlerts({ force: true });
  console.log("Result:", result1);

  const afterScanCount = await db.alert.count();
  console.log(`Total alerts in DB after scan: ${afterScanCount}`);

  if (result1.scannedCases <= 0) {
    throw new Error("Expected scanned cases to be > 0");
  }

  // 3. Test Idempotency (Second scan should create 0 new alerts)
  console.log("\n3️⃣ Testing Idempotency: Re-running scan immediately with force: true...");
  const result2 = await scanAndDispatchAlerts({ force: true });
  console.log("Result:", result2);

  if (result2.createdAlerts !== 0) {
    throw new Error(`Idempotency violation! Expected 0 created alerts, got ${result2.createdAlerts}`);
  }
  console.log("✅ Idempotency passed: Exactly 0 duplicates created on re-scan.");

  // 4. Verify Escalation Alerts (>7 days overdue) routed to Management
  console.log("\n4️⃣ Verifying Escalation Alerts for Management...");
  const escalationAlerts = await db.alert.findMany({
    where: {
      type: "ESCALATION",
      audience: "MANAGEMENT",
    },
    include: {
      case: true,
    },
  });

  console.log(`Found ${escalationAlerts.length} escalation alert(s) for Management.`);
  for (const a of escalationAlerts) {
    console.log(` - [${a.key}] ${a.title}: ${a.message.substring(0, 60)}...`);
  }

  if (escalationAlerts.length === 0) {
    throw new Error("Expected at least 1 escalation alert for Management from overdue cases");
  }
  console.log("✅ Management escalations successfully created.");

  // 5. Verify RBAC alert scoping
  console.log("\n5️⃣ Verifying Alert Scoping across Roles...");

  const mgmtSession: SessionUser = {
    userId: "u_mgmt",
    email: "mgmt@aicte.demo",
    role: "MANAGEMENT",
    bureauId: null,
    bureauCode: null,
    region: null,
    name: "Management Advisor",
  };

  const rbSession: SessionUser = {
    userId: "u_rb",
    email: "rb@aicte.demo",
    role: "BUREAU_OFFICER",
    bureauId: "b_rb",
    bureauCode: "RB",
    region: null,
    name: "RB Officer",
  };

  const roCentralSession: SessionUser = {
    userId: "u_ro",
    email: "ro@aicte.demo",
    role: "REGIONAL_OFFICER",
    bureauId: null,
    bureauCode: null,
    region: "Central",
    name: "Central RO",
  };

  const mgmtAlerts = await db.alert.count({ where: alertScope(mgmtSession) });
  const rbAlerts = await db.alert.count({ where: alertScope(rbSession) });
  const roCentralAlerts = await db.alert.count({ where: alertScope(roCentralSession) });

  console.log(`Alerts visible to MANAGEMENT:   ${mgmtAlerts} (All alerts across AICTE)`);
  console.log(`Alerts visible to RB OFFICER:   ${rbAlerts} (BUREAU:RB)`);
  console.log(`Alerts visible to CENTRAL RO:   ${roCentralAlerts} (REGION:Central)`);

  if (mgmtAlerts <= rbAlerts || mgmtAlerts <= roCentralAlerts) {
    throw new Error("Management should have broader alert visibility than individual bureau/region officers");
  }
  console.log("✅ Scoping rules validated successfully.");

  // 6. Test Mark As Read
  console.log("\n6️⃣ Testing Mark Alert As Read...");
  const unreadOne = await db.alert.findFirst({
    where: { isRead: false },
  });

  if (unreadOne) {
    await db.alert.update({
      where: { id: unreadOne.id },
      data: { isRead: true },
    });
    const refreshed = await db.alert.findUnique({ where: { id: unreadOne.id } });
    if (!refreshed?.isRead) {
      throw new Error("Failed to mark alert as read");
    }
    console.log(`Marked alert [${unreadOne.id}] as read.`);

    // Re-verify that re-running the scan preserves isRead: true
    await scanAndDispatchAlerts({ force: true });
    const preserved = await db.alert.findUnique({ where: { id: unreadOne.id } });
    if (!preserved?.isRead) {
      throw new Error("Scan overwrote isRead status of existing alert!");
    }
    console.log("✅ Alert state preserved: isRead is not overwritten by subsequent scans.");
  }

  console.log("\n==================================================");
  console.log("🎉 ALL PHASE 5 TESTS PASSED SUCCESSFULLY!");
  console.log("==================================================");
}

main()
  .catch((e) => {
    console.error("❌ Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

