import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

const AUDIT_KEY = process.env.AUDIT_KEY || "samadhan-hub-tamper-evident-hmac-key-sih2026";

function computeAuditHash(
  prevHash: string,
  actorId: string | null,
  action: string,
  entity: string,
  entityId: string,
  payload: string | null,
  createdAt: Date
): string {
  const data = `${prevHash}|${actorId || ""}|${action}|${entity}|${entityId}|${payload || ""}|${createdAt.toISOString()}`;
  return crypto.createHmac("sha256", AUDIT_KEY).update(data).digest("hex");
}

async function main() {
  console.log("🌱 Starting Samadhan Hub database initialization (Clean State)...");

  // Clear existing records in reverse dependency order
  await prisma.auditLog.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.caseLink.deleteMany();
  await prisma.overlapMember.deleteMany();
  await prisma.overlapGroup.deleteMany();
  await prisma.caseAction.deleteMany();
  await prisma.case.deleteMany();
  await prisma.institution.deleteMany();
  await prisma.user.deleteMany();
  await prisma.bureau.deleteMany();
  await prisma.slaRule.deleteMany();
  await prisma.setting.deleteMany();

  console.log("🧹 Cleared existing data.");

  // 1. SLA Rules
  const slaRules = [
    { category: "Fee Regulation", slaDays: 30 },
    { category: "Faculty Norms", slaDays: 45 },
    { category: "Infrastructure", slaDays: 45 },
    { category: "Admission", slaDays: 30 },
    { category: "Affiliation", slaDays: 60 },
    { category: "Harassment", slaDays: 15 },
    { category: "Other", slaDays: 30 },
  ];

  for (const rule of slaRules) {
    await prisma.slaRule.create({ data: rule });
  }
  console.log(`✅ Seeded ${slaRules.length} SLA rules.`);

  // 2. Settings
  const settings = [
    { key: "overlap.thresholdPossible", value: "0.60" },
    { key: "overlap.thresholdStrong", value: "0.75" },
    { key: "escalateAfterDays", value: "7" },
    { key: "idleDays", value: "10" },
    {
      key: "overlap.weights",
      value: JSON.stringify({
        sameInstitution: 0.4,
        differentBureaus: 0.2,
        categoryMatch: 0.15,
        textSimilarity: 0.15,
        timeProximity: 0.1,
      }),
    },
  ];

  for (const s of settings) {
    await prisma.setting.create({ data: s });
  }
  console.log("✅ Seeded system settings.");

  // 3. Bureaus
  const bureauData = [
    { code: "RB", name: "Regulation Bureau" },
    { code: "PGRC", name: "Public Grievance Redressal Cell" },
    { code: "AB", name: "Approval Bureau" },
    { code: "LC", name: "Legal Cell" },
  ];

  const bureaus: Record<string, { id: string; code: string; name: string }> = {};
  for (const b of bureauData) {
    const created = await prisma.bureau.create({ data: b });
    bureaus[b.code] = created;
  }
  console.log("✅ Seeded 4 Bureaus/Cells (RB, PGRC, AB, LC).");

  // 4. Users (Official Samadhan Hub credentials + aliases)
  const passwordHash = await bcrypt.hash("Admin@1234", 10);
  const demoHash = await bcrypt.hash("Demo@1234", 10);

  const usersData = [
    {
      name: "Samadhan Hub Administrator",
      email: "admin@samadhanhub.gov.in",
      passwordHash,
      role: "MANAGEMENT",
      bureauId: null,
      region: null,
    },
    {
      name: "Dr. Anil Sahasrabudhe (Advisor)",
      email: "management@aicte.demo",
      passwordHash: demoHash,
      role: "MANAGEMENT",
      bureauId: null,
      region: null,
    },
    {
      name: "Rajesh Kumar (Director RB)",
      email: "rb.officer@samadhanhub.gov.in",
      passwordHash,
      role: "BUREAU_OFFICER",
      bureauId: bureaus["RB"].id,
      region: null,
    },
    {
      name: "Rajesh Kumar (Director RB)",
      email: "rb.officer@aicte.demo",
      passwordHash: demoHash,
      role: "BUREAU_OFFICER",
      bureauId: bureaus["RB"].id,
      region: null,
    },
    {
      name: "Pooja Sharma (Deputy Director PGRC)",
      email: "pgrc.officer@samadhanhub.gov.in",
      passwordHash,
      role: "BUREAU_OFFICER",
      bureauId: bureaus["PGRC"].id,
      region: null,
    },
    {
      name: "Pooja Sharma (Deputy Director PGRC)",
      email: "pgrc.officer@aicte.demo",
      passwordHash: demoHash,
      role: "BUREAU_OFFICER",
      bureauId: bureaus["PGRC"].id,
      region: null,
    },
    {
      name: "Suresh Verma (Approval Officer)",
      email: "ab.officer@samadhanhub.gov.in",
      passwordHash,
      role: "BUREAU_OFFICER",
      bureauId: bureaus["AB"].id,
      region: null,
    },
    {
      name: "Adv. Meenakshi Sundaram (Legal Officer)",
      email: "lc.officer@samadhanhub.gov.in",
      passwordHash,
      role: "BUREAU_OFFICER",
      bureauId: bureaus["LC"].id,
      region: null,
    },
    {
      name: "Dr. Vikram Singh (RO Central)",
      email: "regional.central@samadhanhub.gov.in",
      passwordHash,
      role: "REGIONAL_OFFICER",
      bureauId: null,
      region: "Central",
    },
    {
      name: "Dr. Sanjay Deshmukh (RO Western)",
      email: "regional.western@samadhanhub.gov.in",
      passwordHash,
      role: "REGIONAL_OFFICER",
      bureauId: null,
      region: "Western",
    },
  ];

  for (const u of usersData) {
    await prisma.user.create({ data: u });
  }
  console.log(`✅ Seeded ${usersData.length} Users.`);

  // 5. Genuine Recognized Technical Institutions
  const realInstitutions = [
    {
      aicteId: "1-1000101",
      name: "Indian Institute of Technology Bombay",
      normalizedName: "indian institute of technology bombay",
      address: "Main Gate Rd, IIT Area, Powai",
      city: "Mumbai",
      state: "Maharashtra",
      region: "Western",
      type: "Engineering",
    },
    {
      aicteId: "1-1000102",
      name: "Indian Institute of Technology Delhi",
      normalizedName: "indian institute of technology delhi",
      address: "Hauz Khas",
      city: "New Delhi",
      state: "Delhi",
      region: "Northern",
      type: "Engineering",
    },
    {
      aicteId: "1-1000103",
      name: "College of Engineering Pune (COEP)",
      normalizedName: "college of engineering pune coep",
      address: "Wellesely Road, Shivajinagar",
      city: "Pune",
      state: "Maharashtra",
      region: "Western",
      type: "Engineering",
    },
    {
      aicteId: "1-1000104",
      name: "National Institute of Technology Karnataka",
      normalizedName: "national institute of technology karnataka",
      address: "NH 66, Srinivasnagar, Surathkal",
      city: "Mangaluru",
      state: "Karnataka",
      region: "Southern",
      type: "Engineering",
    },
    {
      aicteId: "1-1000105",
      name: "Delhi Technological University",
      normalizedName: "delhi technological university",
      address: "Shahbad Daulatpur, Main Bawana Road",
      city: "Delhi",
      state: "Delhi",
      region: "Northern",
      type: "Engineering",
    },
    {
      aicteId: "1-1000106",
      name: "Anna University College of Engineering",
      normalizedName: "anna university college of engineering",
      address: "Sardar Patel Road, Guindy",
      city: "Chennai",
      state: "Tamil Nadu",
      region: "Southern",
      type: "Engineering",
    },
    {
      aicteId: "1-1000107",
      name: "Jadavpur University Faculty of Engineering",
      normalizedName: "jadavpur university faculty of engineering",
      address: "188, Raja S.C. Mallick Road",
      city: "Kolkata",
      state: "West Bengal",
      region: "Eastern",
      type: "Engineering",
    },
    {
      aicteId: "1-1000108",
      name: "Birla Institute of Technology Mesra",
      normalizedName: "birla institute of technology mesra",
      address: "Mesra",
      city: "Ranchi",
      state: "Jharkhand",
      region: "Eastern",
      type: "Engineering",
    },
    {
      aicteId: "1-1000109",
      name: "National Institute of Technology Bhopal (MANIT)",
      normalizedName: "national institute of technology bhopal manit",
      address: "Link Road Number 3",
      city: "Bhopal",
      state: "Madhya Pradesh",
      region: "Central",
      type: "Engineering",
    },
    {
      aicteId: "1-1000110",
      name: "National Institute of Technology Silchar",
      normalizedName: "national institute of technology silchar",
      address: "Silchar",
      city: "Silchar",
      state: "Assam",
      region: "North-Eastern",
      type: "Engineering",
    },
  ];

  for (const inst of realInstitutions) {
    await prisma.institution.create({ data: inst });
  }
  console.log(`✅ Seeded ${realInstitutions.length} genuine recognized institutions.`);

  // 6. Genesis Block for Audit Log
  const genesisHash = computeAuditHash(
    "GENESIS_BLOCK_00000000000000000000000000000000",
    "SYSTEM",
    "INIT",
    "SYSTEM",
    "SAMADHAN_HUB_INITIALIZATION",
    JSON.stringify({ version: "1.0.0", platform: "Samadhan Hub" }),
    new Date()
  );

  await prisma.auditLog.create({
    data: {
      actorId: "SYSTEM",
      action: "INIT",
      entity: "SYSTEM",
      entityId: "SAMADHAN_HUB_INITIALIZATION",
      payload: JSON.stringify({ message: "Samadhan Hub portal initialized with clean ledger." }),
      prevHash: "GENESIS_BLOCK_00000000000000000000000000000000",
      hash: genesisHash,
    },
  });
  console.log("✅ Genesis block initialized in audit chain.");
  console.log("🚀 Samadhan Hub Database Seed Completed Successfully (0 fake complaints).");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
