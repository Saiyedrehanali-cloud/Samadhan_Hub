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
  console.log("🧹 Cleaning fake entries and data from Samadhan Hub database...");

  // 1. Delete all fake complaints, cases, overlaps, alerts, and actions
  await prisma.auditLog.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.caseLink.deleteMany();
  await prisma.overlapMember.deleteMany();
  await prisma.overlapGroup.deleteMany();
  await prisma.caseAction.deleteMany();
  await prisma.case.deleteMany();

  console.log("✅ Cleared all fake cases, actions, overlaps, links, alerts, and audit logs.");

  // 2. Clear planted fake institutions
  const fakeInstitutions = [
    "Apex Institute of Technology & Management",
    "Bharat Institute of Science & Technology",
    "Capital Engineering College",
    "Delta Institute of Technology",
    "Elite College of Engineering & Technology",
    "Future Institute of Pharmaceutical Sciences",
    "Global Academy of Technology & Research",
  ];

  for (const name of fakeInstitutions) {
    await prisma.institution.deleteMany({
      where: { name: { contains: name } },
    });
  }
  console.log("✅ Removed planted fake institutions.");

  // 3. Ensure Bureaus exist
  const bureauData = [
    { code: "RB", name: "Regulation Bureau" },
    { code: "PGRC", name: "Public Grievance Redressal Cell" },
    { code: "AB", name: "Approval Bureau" },
    { code: "LC", name: "Legal Cell" },
  ];

  const bureaus: Record<string, { id: string; code: string; name: string }> = {};
  for (const b of bureauData) {
    const upserted = await prisma.bureau.upsert({
      where: { code: b.code },
      update: { name: b.name },
      create: b,
    });
    bureaus[b.code] = upserted;
  }
  console.log("✅ Verified 4 AICTE statutory Bureaus (RB, PGRC, AB, LC).");

  // 4. Ensure SLA Rules exist
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
    await prisma.slaRule.upsert({
      where: { category: rule.category },
      update: { slaDays: rule.slaDays },
      create: rule,
    });
  }
  console.log("✅ Seeded 7 standard SLA rules.");

  // 5. Ensure Settings exist
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
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log("✅ Seeded system settings.");

  // 6. Ensure Users exist (both official @samadhanhub.gov.in and backward-compatible)
  const passwordHash = await bcrypt.hash("Admin@1234", 10);
  const demoHash = await bcrypt.hash("Demo@1234", 10);

  const officialUsers = [
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

  for (const u of officialUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        bureauId: u.bureauId,
        region: u.region,
        passwordHash: u.passwordHash,
      },
      create: u,
    });
  }
  console.log("✅ Seeded official Samadhan Hub user accounts.");

  // 7. Seed prominent real technical institutions
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
    await prisma.institution.upsert({
      where: { aicteId: inst.aicteId },
      update: {
        name: inst.name,
        normalizedName: inst.normalizedName,
        address: inst.address,
        city: inst.city,
        state: inst.state,
        region: inst.region,
        type: inst.type,
      },
      create: inst,
    });
  }
  console.log(`✅ Seeded ${realInstitutions.length} genuine recognized institutions.`);

  // 8. Create Genesis Audit Log
  const genesisHash = computeAuditHash(
    "GENESIS_BLOCK_00000000000000000000000000000000",
    "SYSTEM",
    "INIT",
    "SYSTEM",
    "SAMADHAN_HUB_INITIALIZATION",
    JSON.stringify({ version: "1.0.0", platform: "Samadhan Hub", initializedAt: new Date().toISOString() }),
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
  console.log("✅ Genesis block initialized in audit log chain.");

  const totalCases = await prisma.case.count();
  const totalInsts = await prisma.institution.count();
  const totalUsers = await prisma.user.count();
  console.log("\n🎉 Samadhan Hub Clean Database State:");
  console.log(`   - Cases: ${totalCases} (all fake complaints removed)`);
  console.log(`   - Institutions: ${totalInsts}`);
  console.log(`   - Users: ${totalUsers}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

