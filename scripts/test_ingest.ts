import { NextRequest } from "next/server";
import { POST } from "../src/app/api/ingest/cases/route";
import { db } from "../src/lib/db";

async function testIngest() {
  console.log("Testing Multi-Bureau Ingestion API...");

  // 1. Missing API Key
  const req1 = new NextRequest("http://localhost:3000/api/ingest/cases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ aicteId: "1-4829173", bureauCode: "RB" }),
  });
  const res1 = await POST(req1);
  const json1 = await res1.json();
  console.log("Missing key response status:", res1.status, json1.error?.code);
  if (res1.status !== 401) throw new Error("Expected 401 for missing API key");

  // 2. Valid Ingestion
  const payload = {
    aicteId: "1-4829173", // Apex Institute
    bureauCode: "LC",     // Legal Cell
    category: "Fee Regulation",
    source: "STUDENT",
    subject: "Automated test complaint from external grievance feed",
    description: "Legal notice served to institute regarding unauthorized fee collection and capitation charges.",
  };

  const req2 = new NextRequest("http://localhost:3000/api/ingest/cases", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": "caselens-ingest-secret-key-sih2026",
    },
    body: JSON.stringify(payload),
  });

  const res2 = await POST(req2);
  const json2 = await res2.json();
  console.log("Valid ingestion response status:", res2.status, json2.data?.caseNo);
  if (res2.status !== 201) throw new Error(`Expected 201, got ${res2.status}: ${JSON.stringify(json2)}`);

  console.log("Ingested case details:", {
    caseNo: json2.data?.caseNo,
    institution: json2.data?.institution?.name,
    bureau: json2.data?.bureau?.code,
    overlapDetected: json2.data?.overlapDetected,
  });

  // Verify Audit Log has new entry
  const latestAudit = await db.auditLog.findFirst({
    orderBy: { id: "desc" },
  });
  console.log("Latest audit block action:", latestAudit?.action, latestAudit?.entityId);
  if (latestAudit?.action !== "CASE_INGESTED_API") {
    throw new Error("Audit log entry for ingestion not found");
  }

  console.log("✅ Multi-Bureau Ingestion API verified successfully!");
}

testIngest()
  .catch((e) => {
    console.error("❌ Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

