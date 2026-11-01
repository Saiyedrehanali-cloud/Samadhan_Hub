import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

const AUDIT_KEY = process.env.AUDIT_KEY || "caselens-tamper-evident-hmac-key-sih2026";

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

let lastAuditHash = "GENESIS_BLOCK_00000000000000000000000000000000";

async function createAuditLog(
  actorId: string | null,
  action: string,
  entity: string,
  entityId: string,
  payload: Record<string, unknown> | null,
  createdAt: Date = new Date()
) {
  const payloadStr = payload ? JSON.stringify(payload) : null;
  const hash = computeAuditHash(lastAuditHash, actorId, action, entity, entityId, payloadStr, createdAt);
  const log = await prisma.auditLog.create({
    data: {
      actorId,
      action,
      entity,
      entityId,
      payload: payloadStr,
      prevHash: lastAuditHash,
      hash,
      createdAt,
    },
  });
  lastAuditHash = hash;
  return log;
}

async function main() {
  console.log("🌱 Starting CaseLens database seeding...");

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

  // 4. Users (Password: Demo@1234)
  const passwordHash = await bcrypt.hash("Demo@1234", 10);

  const usersData = [
    {
      name: "Dr. Anil Sahasrabudhe (Advisor)",
      email: "management@aicte.demo",
      passwordHash,
      role: "MANAGEMENT",
      bureauId: null,
      region: null,
    },
    {
      name: "Rajesh Kumar (Director RB)",
      email: "rb.officer@aicte.demo",
      passwordHash,
      role: "BUREAU_OFFICER",
      bureauId: bureaus["RB"].id,
      region: null,
    },
    {
      name: "Pooja Sharma (Deputy Director PGRC)",
      email: "pgrc.officer@aicte.demo",
      passwordHash,
      role: "BUREAU_OFFICER",
      bureauId: bureaus["PGRC"].id,
      region: null,
    },
    {
      name: "Suresh Verma (Approval Officer)",
      email: "ab.officer@aicte.demo",
      passwordHash,
      role: "BUREAU_OFFICER",
      bureauId: bureaus["AB"].id,
      region: null,
    },
    {
      name: "Adv. Meenakshi Sundaram (Legal Officer)",
      email: "lc.officer@aicte.demo",
      passwordHash,
      role: "BUREAU_OFFICER",
      bureauId: bureaus["LC"].id,
      region: null,
    },
    {
      name: "Dr. Vikram Singh (RO Central)",
      email: "regional.central@aicte.demo",
      passwordHash,
      role: "REGIONAL_OFFICER",
      bureauId: null,
      region: "Central",
    },
    {
      name: "Dr. Sanjay Deshmukh (RO Western)",
      email: "regional.western@aicte.demo",
      passwordHash,
      role: "REGIONAL_OFFICER",
      bureauId: null,
      region: "Western",
    },
  ];

  const users: Record<string, { id: string; name: string; role: string; bureauId: string | null }> = {};
  for (const u of usersData) {
    const created = await prisma.user.create({ data: u });
    users[u.email] = created;
  }
  console.log(`✅ Seeded ${usersData.length} Users with demo passwords.`);

  // 5. Institutions (30 Institutions across 6 regions)
  const institutionsData = [
    // Planted Test Institutions (A to G)
    {
      key: "A",
      aicteId: "1-4829173",
      name: "Apex Institute of Technology & Management",
      normalizedName: "apex institute of technology management",
      address: "Raja Bhoj Marg, Gandhi Nagar",
      city: "Bhopal",
      state: "Madhya Pradesh",
      region: "Central",
      type: "Engineering",
    },
    {
      key: "B",
      aicteId: "1-5829102",
      name: "Bharat Institute of Science & Technology",
      normalizedName: "bharat institute of science technology",
      address: "AB Road, Bypass Circle",
      city: "Indore",
      state: "Madhya Pradesh",
      region: "Central",
      type: "Engineering",
    },
    {
      key: "C",
      aicteId: "1-3829145",
      name: "Capital Engineering College",
      normalizedName: "capital engineering college",
      address: "Infocity Phase II, Chandaka",
      city: "Bhubaneswar",
      state: "Odisha",
      region: "Eastern",
      type: "Engineering",
    },
    {
      key: "D",
      aicteId: "1-6829301",
      name: "Delta Institute of Technology",
      normalizedName: "delta institute of technology",
      address: "Hinjawadi IT Park, Phase 1",
      city: "Pune",
      state: "Maharashtra",
      region: "Western",
      type: "Engineering",
    },
    {
      key: "E",
      aicteId: "1-7829412",
      name: "Elite College of Engineering & Technology",
      normalizedName: "elite college of engineering technology",
      address: "Faizabad Road, Chinhat",
      city: "Lucknow",
      state: "Uttar Pradesh",
      region: "Northern",
      type: "Engineering",
    },
    {
      key: "F",
      aicteId: "1-8829523",
      name: "Future Institute of Pharmaceutical Sciences",
      normalizedName: "future institute of pharmaceutical sciences",
      address: "Electronic City Phase 2, Hosur Road",
      city: "Bengaluru",
      state: "Karnataka",
      region: "Southern",
      type: "Pharmacy",
    },
    {
      key: "G",
      aicteId: "1-9829634",
      name: "Global Academy of Technology & Research",
      normalizedName: "global academy of technology research",
      address: "Jalukbari, Kamrup",
      city: "Guwahati",
      state: "Assam",
      region: "North-Eastern",
      type: "Engineering",
    },
    // Additional realistic technical institutions (8 to 30)
    {
      key: "8",
      aicteId: "1-2849108",
      name: "Mahakoshal Engineering College",
      normalizedName: "mahakoshal engineering college",
      address: "Civil Lines, Napier Town",
      city: "Jabalpur",
      state: "Madhya Pradesh",
      region: "Central",
      type: "Engineering",
    },
    {
      key: "9",
      aicteId: "1-2849109",
      name: "Vindhya Institute of Technology & Science",
      normalizedName: "vindhya institute of technology science",
      address: "NH-7, Bodhaghat",
      city: "Rewa",
      state: "Madhya Pradesh",
      region: "Central",
      type: "Engineering",
    },
    {
      key: "10",
      aicteId: "1-2849110",
      name: "Central India Institute of Pharmacy",
      normalizedName: "central india institute of pharmacy",
      address: "VIP Road, Airport Road",
      city: "Bhopal",
      state: "Madhya Pradesh",
      region: "Central",
      type: "Pharmacy",
    },
    {
      key: "11",
      aicteId: "1-2849111",
      name: "Bengal College of Engineering & Technology",
      normalizedName: "bengal college of engineering technology",
      address: "Bidhan Nagar, City Centre",
      city: "Durgapur",
      state: "West Bengal",
      region: "Eastern",
      type: "Engineering",
    },
    {
      key: "12",
      aicteId: "1-2849112",
      name: "Patna Institute of Technology",
      normalizedName: "patna institute of technology",
      address: "Bailey Road, Danapur",
      city: "Patna",
      state: "Bihar",
      region: "Eastern",
      type: "Engineering",
    },
    {
      key: "13",
      aicteId: "1-2849113",
      name: "Kolkata Institute of Management Sciences",
      normalizedName: "kolkata institute of management sciences",
      address: "Salt Lake Sector V",
      city: "Kolkata",
      state: "West Bengal",
      region: "Eastern",
      type: "Management",
    },
    {
      key: "14",
      aicteId: "1-2849114",
      name: "Ranchi Academy of Technical Education",
      normalizedName: "ranchi academy of technical education",
      address: "Kanke Road, Morabadi",
      city: "Ranchi",
      state: "Jharkhand",
      region: "Eastern",
      type: "Engineering",
    },
    {
      key: "15",
      aicteId: "1-2849115",
      name: "St. Xavier Engineering College",
      normalizedName: "st xavier engineering college",
      address: "Bandra West, Hill Road",
      city: "Mumbai",
      state: "Maharashtra",
      region: "Western",
      type: "Engineering",
    },
    {
      key: "16",
      aicteId: "1-2849116",
      name: "Gujarat Technical Campus",
      normalizedName: "gujarat technical campus",
      address: "SG Highway, Bodakdev",
      city: "Ahmedabad",
      state: "Gujarat",
      region: "Western",
      type: "Engineering",
    },
    {
      key: "17",
      aicteId: "1-2849117",
      name: "Marathwada Institute of Technology",
      normalizedName: "marathwada institute of technology",
      address: "CIDCO Sector 4",
      city: "Chhatrapati Sambhajinagar",
      state: "Maharashtra",
      region: "Western",
      type: "Engineering",
    },
    {
      key: "18",
      aicteId: "1-2849118",
      name: "Goa College of Architecture & Design",
      normalizedName: "goa college of architecture design",
      address: "Altinho, Fontainhas",
      city: "Panaji",
      state: "Goa",
      region: "Western",
      type: "Architecture",
    },
    {
      key: "19",
      aicteId: "1-2849119",
      name: "NCR Institute of Technology",
      normalizedName: "ncr institute of technology",
      address: "Knowledge Park III",
      city: "Greater Noida",
      state: "Uttar Pradesh",
      region: "Northern",
      type: "Engineering",
    },
    {
      key: "20",
      aicteId: "1-2849120",
      name: "Punjab Technical Academy",
      normalizedName: "punjab technical academy",
      address: "GT Road, Ferozepur Road",
      city: "Ludhiana",
      state: "Punjab",
      region: "Northern",
      type: "Engineering",
    },
    {
      key: "21",
      aicteId: "1-2849121",
      name: "Jaipur National College of Engineering",
      normalizedName: "jaipur national college of engineering",
      address: "Jagatpura, Malviya Nagar",
      city: "Jaipur",
      state: "Rajasthan",
      region: "Northern",
      type: "Engineering",
    },
    {
      key: "22",
      aicteId: "1-2849122",
      name: "Shimla Institute of Management",
      normalizedName: "shimla institute of management",
      address: "Mall Road Extension, Sanjauli",
      city: "Shimla",
      state: "Himachal Pradesh",
      region: "Northern",
      type: "Management",
    },
    {
      key: "23",
      aicteId: "1-2849123",
      name: "Deccan College of Engineering & Technology",
      normalizedName: "deccan college of engineering technology",
      address: "Nampally, Darussalam",
      city: "Hyderabad",
      state: "Telangana",
      region: "Southern",
      type: "Engineering",
    },
    {
      key: "24",
      aicteId: "1-2849124",
      name: "Chennai Institute of Advanced Technology",
      normalizedName: "chennai institute of advanced technology",
      address: "OMR IT Highway, Sholinganallur",
      city: "Chennai",
      state: "Tamil Nadu",
      region: "Southern",
      type: "Engineering",
    },
    {
      key: "25",
      aicteId: "1-2849125",
      name: "Cochin Institute of Science & Technology",
      normalizedName: "cochin institute of science technology",
      address: "Kakkanad InfoPark Road",
      city: "Kochi",
      state: "Kerala",
      region: "Southern",
      type: "Engineering",
    },
    {
      key: "26",
      aicteId: "1-2849126",
      name: "Mysuru Royal Institute of Management",
      normalizedName: "mysuru royal institute of management",
      address: "Hunsur Road, Jayalakshmipuram",
      city: "Mysuru",
      state: "Karnataka",
      region: "Southern",
      type: "Management",
    },
    {
      key: "27",
      aicteId: "1-2849127",
      name: "Assam Valley Technical Institute",
      normalizedName: "assam valley technical institute",
      address: "Tezpur University Road",
      city: "Tezpur",
      state: "Assam",
      region: "North-Eastern",
      type: "Engineering",
    },
    {
      key: "28",
      aicteId: "1-2849128",
      name: "Meghalaya Institute of Engineering",
      normalizedName: "meghalaya institute of engineering",
      address: "Laitumkhrah, Polo Grounds",
      city: "Shillong",
      state: "Meghalaya",
      region: "North-Eastern",
      type: "Engineering",
    },
    {
      key: "29",
      aicteId: "1-2849129",
      name: "Tripura Institute of Technology & Science",
      normalizedName: "tripura institute of technology science",
      address: "Agartala Bypass, Narsingarh",
      city: "Agartala",
      state: "Tripura",
      region: "North-Eastern",
      type: "Engineering",
    },
    {
      key: "30",
      aicteId: "1-2849130",
      name: "Manipur Technical Academy",
      normalizedName: "manipur technical academy",
      address: "Canchipur, National Highway 2",
      city: "Imphal",
      state: "Manipur",
      region: "North-Eastern",
      type: "Engineering",
    },
  ];

  const institutions: Record<string, { id: string; aicteId: string; name: string }> = {};
  for (const inst of institutionsData) {
    const { key, ...data } = inst;
    const created = await prisma.institution.create({ data });
    institutions[key] = created;
  }
  console.log(`✅ Seeded ${institutionsData.length} technical institutions across all 6 regions.`);

  // 6. Realistic Cases Generation (~90 cases total)
  // Target status distribution: ~35 UNDER_PROCESS, ~12 RECEIVED, ~10 TRANSFERRED, ~6 ESCALATED, ~27 DISPOSED = 90
  // Target bureau distribution: ~35 RB, ~30 PGRC, ~15 AB, ~10 LC = 90
  // Deliberately 7 overdue cases (oldest 23 days overdue)
  // Deliberately 3 idle cases (no action for 10+ days)

  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);
  const daysFrom = (d: number, offsetDays: number) => new Date(now.getTime() - (d - offsetDays) * 86400000);

  const casesToSeed: Array<{
    caseNo: string;
    institutionId: string;
    currentBureauCode: string;
    originBureauCode: string;
    category: string;
    source: string;
    subject: string;
    description: string;
    status: string;
    priority: string;
    receivedDaysAgo: number;
    slaDays: number;
    expectedDisposalDaysAgo?: number; // negative means future
    lastActionDaysAgo: number;
    lastActionNote: string;
    nextAction?: string;
    disposedDaysAgo?: number;
    outcome?: string;
    assigneeEmail?: string;
    plantedGroup?: string;
  }> = [];

  // ================= PLANTED OVERLAPS O1 to O7 (15 cases) =================
  // O1: Institution A (PGRC + RB, Fee Regulation, 12 days apart -> CROSS_BUREAU, STRONG)
  casesToSeed.push({
    caseNo: "AICTE/PGRC/2026/0001",
    institutionId: institutions["A"].id,
    currentBureauCode: "PGRC",
    originBureauCode: "PGRC",
    category: "Fee Regulation",
    source: "STUDENT",
    subject: "Fee refund not given after withdrawal",
    description:
      "Student withdrew admission within mandatory AICTE refund window, college refused to refund Rs 85,000 tuition fee despite repeated notices and emails.",
    status: "UNDER_PROCESS",
    priority: "HIGH",
    receivedDaysAgo: 12,
    slaDays: 30,
    expectedDisposalDaysAgo: -18,
    lastActionDaysAgo: 3,
    lastActionNote: "Notice dispatched to Principal demanding fee ledger and refund receipt",
    nextAction: "Verify bank transaction slip with college registrar",
    assigneeEmail: "pgrc.officer@aicte.demo",
    plantedGroup: "O1",
  });

  casesToSeed.push({
    caseNo: "AICTE/RB/2026/0002",
    institutionId: institutions["A"].id,
    currentBureauCode: "RB",
    originBureauCode: "RB",
    category: "Fee Regulation",
    source: "STAKEHOLDER",
    subject: "Excess fee collection reported by parent association",
    description:
      "Parents association filed complaint regarding mandatory developmental fee of Rs 40,000 charged over and above AICTE approved fee structure.",
    status: "UNDER_PROCESS",
    priority: "HIGH",
    receivedDaysAgo: 24,
    slaDays: 30,
    expectedDisposalDaysAgo: -6,
    lastActionDaysAgo: 2,
    lastActionNote: "Interim compliance reply received from management; committee scrutiny in progress",
    nextAction: "Issue inquiry notice regarding fee schedule",
    assigneeEmail: "rb.officer@aicte.demo",
    plantedGroup: "O1",
  });

  // O2: Institution B (PGRC Hostel + RB Faculty, different categories/wording, 40 days apart -> CROSS_BUREAU, POSSIBLE)
  casesToSeed.push({
    caseNo: "AICTE/PGRC/2026/0003",
    institutionId: institutions["B"].id,
    currentBureauCode: "PGRC",
    originBureauCode: "PGRC",
    category: "Infrastructure",
    source: "STUDENT",
    subject: "Hostel facilities poor and hygiene complaints",
    description:
      "Hostel washrooms and drinking water facilities in boys hostel are unhygienic with repeated dengue outbreaks and water contamination.",
    status: "UNDER_PROCESS",
    priority: "NORMAL",
    receivedDaysAgo: 15,
    slaDays: 45,
    expectedDisposalDaysAgo: -30,
    lastActionDaysAgo: 5,
    lastActionNote: "Health inspection report requested from local municipal medical officer",
    nextAction: "Await college inspection report",
    assigneeEmail: "pgrc.officer@aicte.demo",
    plantedGroup: "O2",
  });

  casesToSeed.push({
    caseNo: "AICTE/RB/2026/0004",
    institutionId: institutions["B"].id,
    currentBureauCode: "RB",
    originBureauCode: "RB",
    category: "Faculty Norms",
    source: "FACULTY",
    subject: "Faculty shortage in Computer Science and unapproved cadre ratio",
    description:
      "Inspection report indicates 40% vacancy in CS department and lack of eligible Professors/Associate Professors as per 7th CPC norms.",
    status: "UNDER_PROCESS",
    priority: "NORMAL",
    receivedDaysAgo: 55,
    slaDays: 45,
    expectedDisposalDaysAgo: 10, // Overdue by 10 days!
    lastActionDaysAgo: 4,
    lastActionNote: "Hearing notice issued to Governing Body chairman",
    nextAction: "Schedule hearing with management",
    assigneeEmail: "rb.officer@aicte.demo",
    plantedGroup: "O2",
  });

  // O3: Institution C (RB show-cause vs PGRC resolve closing -> POSSIBLE_CONFLICT)
  casesToSeed.push({
    caseNo: "AICTE/RB/2026/0005",
    institutionId: institutions["C"].id,
    currentBureauCode: "RB",
    originBureauCode: "RB",
    category: "Affiliation",
    source: "OTHER",
    subject: "Non-compliance with AICTE approval norms for intake extension",
    description:
      "Institute admitted 120 students against sanctioned intake of 60 without AICTE affiliation approval.",
    status: "UNDER_PROCESS",
    priority: "HIGH",
    receivedDaysAgo: 20,
    slaDays: 60,
    expectedDisposalDaysAgo: -40,
    lastActionDaysAgo: 2,
    lastActionNote: "Legal scrutiny confirms unauthorized enrollment in CS AI branch",
    nextAction: "Issue show-cause notice",
    assigneeEmail: "rb.officer@aicte.demo",
    plantedGroup: "O3",
  });

  casesToSeed.push({
    caseNo: "AICTE/PGRC/2026/0006",
    institutionId: institutions["C"].id,
    currentBureauCode: "PGRC",
    originBureauCode: "PGRC",
    category: "Other",
    source: "STUDENT",
    subject: "Student grievance regarding university exams registration",
    description:
      "First year engineering students unable to register on state portal due to pending college document verification.",
    status: "UNDER_PROCESS",
    priority: "NORMAL",
    receivedDaysAgo: 14,
    slaDays: 30,
    expectedDisposalDaysAgo: -16,
    lastActionDaysAgo: 1,
    lastActionNote: "College liaison verified portal enrollment IDs for 45 students",
    nextAction: "Resolve with institution — closing soon",
    assigneeEmail: "pgrc.officer@aicte.demo",
    plantedGroup: "O3",
  });

  // O4: Institution D (Two PGRC complaints, duplicate wording -> DUPLICATE, STRONG)
  casesToSeed.push({
    caseNo: "AICTE/PGRC/2026/0007",
    institutionId: institutions["D"].id,
    currentBureauCode: "PGRC",
    originBureauCode: "PGRC",
    category: "Fee Regulation",
    source: "STUDENT",
    subject: "Capitation fee demanded during admission",
    description:
      "College demanded Rs 2,50,000 extra cash capitation fee without receipt during direct admission round in July.",
    status: "UNDER_PROCESS",
    priority: "HIGH",
    receivedDaysAgo: 8,
    slaDays: 30,
    expectedDisposalDaysAgo: -22,
    lastActionDaysAgo: 3,
    lastActionNote: "Complainant statement recorded via online grievance portal",
    nextAction: "Verify student fee receipt",
    assigneeEmail: "pgrc.officer@aicte.demo",
    plantedGroup: "O4",
  });

  casesToSeed.push({
    caseNo: "AICTE/PGRC/2026/0008",
    institutionId: institutions["D"].id,
    currentBureauCode: "PGRC",
    originBureauCode: "PGRC",
    category: "Fee Regulation",
    source: "STUDENT",
    subject: "Demanding capitation fee for B.Tech admission",
    description:
      "Management demanding Rs 2,50,000 cash capitation fee without any valid fee receipt for admission in direct quota.",
    status: "UNDER_PROCESS",
    priority: "HIGH",
    receivedDaysAgo: 6,
    slaDays: 30,
    expectedDisposalDaysAgo: -24,
    lastActionDaysAgo: 2,
    lastActionNote: "Preliminary review noted identical allegations to case 0007",
    nextAction: "Merge with primary inquiry",
    assigneeEmail: "pgrc.officer@aicte.demo",
    plantedGroup: "O4",
  });

  // O5: Institution E (RB + PGRC + AB open -> 3 cases multi-bureau group)
  casesToSeed.push({
    caseNo: "AICTE/RB/2026/0009",
    institutionId: institutions["E"].id,
    currentBureauCode: "RB",
    originBureauCode: "RB",
    category: "Faculty Norms",
    source: "FACULTY",
    subject: "Unqualified faculty in Mechanical department",
    description:
      "Guest lecturers without M.Tech/Ph.D appointed as full-time faculty in mechanical engineering contrary to norms.",
    status: "UNDER_PROCESS",
    priority: "NORMAL",
    receivedDaysAgo: 20,
    slaDays: 45,
    expectedDisposalDaysAgo: -25,
    lastActionDaysAgo: 6,
    lastActionNote: "Verification of faculty appointment orders requested from University",
    nextAction: "Cross-check biometric attendance records",
    assigneeEmail: "rb.officer@aicte.demo",
    plantedGroup: "O5",
  });

  casesToSeed.push({
    caseNo: "AICTE/PGRC/2026/0010",
    institutionId: institutions["E"].id,
    currentBureauCode: "PGRC",
    originBureauCode: "PGRC",
    category: "Faculty Norms",
    source: "STUDENT",
    subject: "Classes not conducted due to lack of teachers in core branches",
    description:
      "Core syllabus not covered for 3rd semester students as 4 faculty members resigned and were not replaced.",
    status: "UNDER_PROCESS",
    priority: "NORMAL",
    receivedDaysAgo: 18,
    slaDays: 45,
    expectedDisposalDaysAgo: -27,
    lastActionDaysAgo: 4,
    lastActionNote: "Student delegation petition forwarded to Academic Council",
    nextAction: "Direct institute to arrange compensatory classes",
    assigneeEmail: "pgrc.officer@aicte.demo",
    plantedGroup: "O5",
  });

  casesToSeed.push({
    caseNo: "AICTE/AB/2026/0011",
    institutionId: institutions["E"].id,
    currentBureauCode: "AB",
    originBureauCode: "AB",
    category: "Infrastructure",
    source: "STAKEHOLDER",
    subject: "Building completion certificate not submitted for new engineering block",
    description:
      "College operating classes in unapproved 4th floor structure without fire NOC or municipal occupancy certificate.",
    status: "UNDER_PROCESS",
    priority: "HIGH",
    receivedDaysAgo: 25,
    slaDays: 45,
    expectedDisposalDaysAgo: -20,
    lastActionDaysAgo: 2,
    lastActionNote: "Physical site inspection report submitted by Regional Officer",
    nextAction: "Issue defect memo regarding structural safety compliance",
    assigneeEmail: "ab.officer@aicte.demo",
    plantedGroup: "O5",
  });

  // O6: Institution F (RB open + PGRC DISPOSED -> NO ACTIVE OVERLAP)
  casesToSeed.push({
    caseNo: "AICTE/RB/2026/0012",
    institutionId: institutions["F"].id,
    currentBureauCode: "RB",
    originBureauCode: "RB",
    category: "Infrastructure",
    source: "FACULTY",
    subject: "Laboratory equipment inspection deficiency",
    description:
      "Deficiencies reported during random physical inspection: machine shop lacks 3 CNC trainers and safety hoods.",
    status: "UNDER_PROCESS",
    priority: "NORMAL",
    receivedDaysAgo: 10,
    slaDays: 45,
    expectedDisposalDaysAgo: -35,
    lastActionDaysAgo: 3,
    lastActionNote: "Procurement invoice verification notice issued to college",
    nextAction: "Schedule follow-up audit",
    assigneeEmail: "rb.officer@aicte.demo",
  });

  casesToSeed.push({
    caseNo: "AICTE/PGRC/2026/0013",
    institutionId: institutions["F"].id,
    currentBureauCode: "PGRC",
    originBureauCode: "PGRC",
    category: "Infrastructure",
    source: "STUDENT",
    subject: "Library books shortage resolved by college",
    description:
      "Grievance filed regarding lack of prescribed textbooks and journals for 2nd year pharmacy curriculum.",
    status: "DISPOSED",
    priority: "NORMAL",
    receivedDaysAgo: 75,
    slaDays: 45,
    expectedDisposalDaysAgo: 30,
    lastActionDaysAgo: 15,
    lastActionNote: "Case closed following verification of physical library registers",
    disposedDaysAgo: 15,
    outcome:
      "College procured 450 required titles and subscribed to DELNET database; grievance redressed satisfactorily.",
    assigneeEmail: "pgrc.officer@aicte.demo",
  });

  // O7: Institution G (RB case ready for transfer demo to PGRC)
  casesToSeed.push({
    caseNo: "AICTE/RB/2026/0014",
    institutionId: institutions["G"].id,
    currentBureauCode: "RB",
    originBureauCode: "RB",
    category: "Other",
    source: "STUDENT",
    subject: "Misleading advertisement regarding 100% placement records",
    description:
      "Prospectus claims 100% placement with median salary 12 LPA, whereas actual median placement verified is 3.5 LPA.",
    status: "UNDER_PROCESS",
    priority: "NORMAL",
    receivedDaysAgo: 7,
    slaDays: 30,
    expectedDisposalDaysAgo: -23,
    lastActionDaysAgo: 2,
    lastActionNote: "Initial scrutiny of advertisement claims. Marked eligible for transfer to PGRC grievance desk.",
    nextAction: "Scrutiny of advertisement claims",
    assigneeEmail: "rb.officer@aicte.demo",
  });

  casesToSeed.push({
    caseNo: "AICTE/PGRC/2026/0015",
    institutionId: institutions["G"].id,
    currentBureauCode: "PGRC",
    originBureauCode: "PGRC",
    category: "Other",
    source: "STUDENT",
    subject: "Placement fee charged but no companies visited campus",
    description:
      "Mandatory placement training fee of Rs 15,000 charged to final year students without arranging campus drives.",
    status: "UNDER_PROCESS",
    priority: "NORMAL",
    receivedDaysAgo: 5,
    slaDays: 30,
    expectedDisposalDaysAgo: -25,
    lastActionDaysAgo: 1,
    lastActionNote: "Explanations sought from Training & Placement Officer",
    nextAction: "Audit placement expenditure log",
    assigneeEmail: "pgrc.officer@aicte.demo",
  });

  // ================= REMAINING 75 CASES (Total reaches exactly 90) =================
  // Need to ensure:
  // Total Statuses: 35 UNDER_PROCESS (11 already + 24), 12 RECEIVED, 10 TRANSFERRED, 6 ESCALATED, 27 DISPOSED (1 already + 26)
  // Total Bureaus: 35 RB (6 already + 29), 30 PGRC (7 already + 23), 15 AB (1 already + 14), 10 LC (0 already + 10)
  // Deliberately 7 overdue cases across open cases (oldest 23 days overdue)
  // Deliberately 3 idle cases (no action for 10+ days)

  // Explicit overdue cases remaining to assign (already 1 overdue: case 4 is 10 days overdue):
  // Let's create:
  // 1: 23 days overdue (oldest)
  // 2: 18 days overdue
  // 3: 15 days overdue
  // 4: 8 days overdue
  // 5: 5 days overdue
  // 6: 3 days overdue
  // (Total 1 + 6 = 7 overdue cases!)

  // Explicit idle cases (no action for 10+ days):
  // Idle 1: lastActionDaysAgo = 18
  // Idle 2: lastActionDaysAgo = 14
  // Idle 3: lastActionDaysAgo = 11

  const instKeys = Object.keys(institutions).filter((k) => !["A", "B", "C", "D", "E", "F", "G"].includes(k));

  interface CaseTemplate {
    category: string;
    source: string;
    subject: string;
    description: string;
    slaDays: number;
  }

  const templates: CaseTemplate[] = [
    {
      category: "Fee Regulation",
      source: "STUDENT",
      subject: "Overcharging semester examination fees without approval",
      description: "College charging Rs 4,500 exam fee per semester exceeding AICTE ceiling by 200%.",
      slaDays: 30,
    },
    {
      category: "Faculty Norms",
      source: "FACULTY",
      subject: "Faculty salary delayed for three consecutive months",
      description: "Assistant professors in Mechanical department not paid salaries as per AICTE mandate.",
      slaDays: 45,
    },
    {
      category: "Infrastructure",
      source: "STUDENT",
      subject: "Non-functional chemistry lab and missing safety gear",
      description: "Exhaust systems broken and fire extinguishers expired in chemical engineering laboratory.",
      slaDays: 45,
    },
    {
      category: "Admission",
      source: "STUDENT",
      subject: "Refusal to return original 12th certificates after admission cancellation",
      description: "Administration withholding original marksheets demanding entire 4-year tuition fee.",
      slaDays: 30,
    },
    {
      category: "Affiliation",
      source: "STAKEHOLDER",
      subject: "Conducting unapproved diploma course under engineering college name",
      description: "Institute advertising 1-year diploma without state technical board or AICTE approval.",
      slaDays: 60,
    },
    {
      category: "Harassment",
      source: "STUDENT",
      subject: "Internal Complaints Committee not constituted per AICTE mandate",
      description: "No functional ICC on campus; female students grievance remained unaddressed.",
      slaDays: 15,
    },
    {
      category: "Other",
      source: "OTHER",
      subject: "Discrepancy in mandatory disclosure documents on institute website",
      description: "Faculty list and student-teacher ratio missing from public portal for past 2 academic years.",
      slaDays: 30,
    },
  ];

  // Specific quotas for the remaining 75 cases:
  // Bureaus needed: RB: 29, PGRC: 22, AB: 14, LC: 10
  // Statuses needed: UNDER_PROCESS: 21, RECEIVED: 12, TRANSFERRED: 10, ESCALATED: 6, DISPOSED: 26

  const bureauSeq: string[] = [
    ...Array(29).fill("RB"),
    ...Array(22).fill("PGRC"),
    ...Array(14).fill("AB"),
    ...Array(10).fill("LC"),
  ];

  const statusSeq: string[] = [
    ...Array(21).fill("UNDER_PROCESS"),
    ...Array(12).fill("RECEIVED"),
    ...Array(10).fill("TRANSFERRED"),
    ...Array(6).fill("ESCALATED"),
    ...Array(26).fill("DISPOSED"),
  ];

  // Map each bureau to an officer
  const bureauOfficerEmail: Record<string, string> = {
    RB: "rb.officer@aicte.demo",
    PGRC: "pgrc.officer@aicte.demo",
    AB: "ab.officer@aicte.demo",
    LC: "lc.officer@aicte.demo",
  };

  // Overdue specifications for the 6 remaining overdue open cases (Total = 1 from planted + 6 = 7 overdue cases)
  const overdueSpecs: Record<number, number> = {
    1: 23, // 23 days overdue (oldest!)
    5: 18, // 18 days overdue
    9: 15, // 15 days overdue
    13: 8, // 8 days overdue
    17: 5, // 5 days overdue
    21: 3, // 3 days overdue
  };

  // Idle specifications for the 3 idle open cases (no action for 10+ days)
  const idleSpecs: Record<number, { days: number; note: string }> = {
    3: { days: 18, note: "Awaiting documents from institution management" },
    11: { days: 14, note: "File forwarded to Regional Directorate for verification" },
    19: { days: 11, note: "Second reminder sent to college registrar; no reply" },
  };

  let openCaseCount = 0;

  for (let i = 0; i < 75; i++) {
    const seqNum = i + 16;
    const bureauCode = bureauSeq[i];
    const status = statusSeq[i];
    const instKey = instKeys[i % instKeys.length];
    const tpl = templates[i % templates.length];

    const caseNo = `AICTE/${bureauCode}/2026/${String(seqNum).padStart(4, "0")}`;

    let receivedDaysAgo: number;
    let expectedDisposalDaysAgo: number;
    let lastActionDaysAgo: number;
    let lastActionNote: string;
    let disposedDaysAgo: number | undefined;
    let outcome: string | undefined;
    let nextAction: string | undefined;

    const isOpen = status !== "DISPOSED";
    if (isOpen) {
      const openIdx = openCaseCount++;
      if (overdueSpecs[openIdx] !== undefined) {
        // Deliberately overdue
        const overdueDays = overdueSpecs[openIdx];
        receivedDaysAgo = tpl.slaDays + overdueDays;
        expectedDisposalDaysAgo = overdueDays;
        lastActionDaysAgo = Math.min(5, overdueDays);
        lastActionNote = "Reviewing non-compliance justification; penalty hearing recommended";
        nextAction = "Schedule review meeting with Vice Chancellor";
      } else if (idleSpecs[openIdx] !== undefined) {
        // Deliberately idle (no action for 10+ days, but NOT overdue)
        const idle = idleSpecs[openIdx];
        receivedDaysAgo = idle.days + 3; // e.g. 14 to 21 days ago, less than tpl.slaDays (30/45/60)
        expectedDisposalDaysAgo = -(tpl.slaDays - receivedDaysAgo);
        lastActionDaysAgo = idle.days;
        lastActionNote = idle.note;
        nextAction = "Issue urgent inquiry follow-up";
      } else {
        // Regular on-time open case (strictly receivedDaysAgo < slaDays)
        receivedDaysAgo = Math.min(tpl.slaDays - 8, Math.max(2, (i % 15) + 3));
        expectedDisposalDaysAgo = -(tpl.slaDays - receivedDaysAgo);
        lastActionDaysAgo = Math.max(1, (i % 4) + 1);
        lastActionNote =
          status === "RECEIVED"
            ? "Complaint formally docketed into portal"
            : status === "TRANSFERRED"
            ? `Transferred from ${bureauCode === "PGRC" ? "RB" : "PGRC"} for administrative review`
            : status === "ESCALATED"
            ? "Escalated to Management due to repeated non-appearance of college authorities"
            : "Verification of submitted evidence in progress";
        nextAction =
          status === "ESCALATED"
            ? "Management hearing with institute heads"
            : status === "TRANSFERRED"
            ? "Assign case investigator"
            : "Review response from college authorities";
      }
    } else {
      // Disposed case
      receivedDaysAgo = 45 + (i % 30);
      disposedDaysAgo = Math.max(2, (i % 25) + 1);
      lastActionDaysAgo = disposedDaysAgo;
      expectedDisposalDaysAgo = -(tpl.slaDays - (receivedDaysAgo - disposedDaysAgo));
      lastActionNote = "Grievance resolved following institutional compliance report";
      outcome = `Institution complied with AICTE regulatory guidelines. Grievance closed with satisfaction note.`;
    }

    casesToSeed.push({
      caseNo,
      institutionId: institutions[instKey].id,
      currentBureauCode: bureauCode,
      originBureauCode: status === "TRANSFERRED" ? (bureauCode === "PGRC" ? "RB" : "PGRC") : bureauCode,
      category: tpl.category,
      source: tpl.source,
      subject: `${tpl.subject} (#${seqNum})`,
      description: tpl.description,
      status,
      priority: status === "ESCALATED" ? "HIGH" : i % 5 === 0 ? "HIGH" : "NORMAL",
      receivedDaysAgo,
      slaDays: tpl.slaDays,
      expectedDisposalDaysAgo,
      lastActionDaysAgo,
      lastActionNote,
      nextAction,
      disposedDaysAgo,
      outcome,
      assigneeEmail: bureauOfficerEmail[bureauCode],
    });
  }

  console.log(`📦 Prepared ${casesToSeed.length} total cases for insertion.`);

  // Insert Cases & CaseActions & AuditLogs
  const createdCases: Record<string, { id: string; caseNo: string; institutionId: string; currentBureauId: string }> =
    {};

  for (const c of casesToSeed) {
    const receivedAt = daysAgo(c.receivedDaysAgo);
    const expectedDisposalAt = daysAgo(c.expectedDisposalDaysAgo || -c.slaDays);
    const lastActionAt = daysAgo(c.lastActionDaysAgo);
    const disposedAt = c.disposedDaysAgo ? daysAgo(c.disposedDaysAgo) : null;
    const currentBureau = bureaus[c.currentBureauCode];
    const assignee = c.assigneeEmail ? users[c.assigneeEmail] : null;

    const createdCase = await prisma.case.create({
      data: {
        caseNo: c.caseNo,
        institutionId: c.institutionId,
        currentBureauId: currentBureau.id,
        assigneeId: assignee?.id || null,
        category: c.category,
        source: c.source,
        subject: c.subject,
        description: c.description,
        status: c.status,
        priority: c.priority,
        receivedAt,
        slaDays: c.slaDays,
        expectedDisposalAt,
        lastActionAt,
        lastActionNote: c.lastActionNote,
        nextAction: c.nextAction || null,
        disposedAt,
        outcome: c.outcome || null,
        originBureauCode: c.originBureauCode,
        createdAt: receivedAt,
      },
    });

    createdCases[c.caseNo] = {
      id: createdCase.id,
      caseNo: createdCase.caseNo,
      institutionId: createdCase.institutionId,
      currentBureauId: createdCase.currentBureauId,
    };

    // 1. CREATE action
    await prisma.caseAction.create({
      data: {
        caseId: createdCase.id,
        actorId: assignee?.id || null,
        bureauCode: c.originBureauCode,
        type: "CREATE",
        fromValue: null,
        toValue: "RECEIVED",
        remarks: "Case registered into AICTE Central Monitoring System",
        createdAt: receivedAt,
      },
    });

    await createAuditLog(
      assignee?.id || null,
      "CASE_CREATED",
      "Case",
      createdCase.id,
      { caseNo: c.caseNo, category: c.category, bureau: c.originBureauCode },
      receivedAt
    );

    // 2. Lifecycle action (if progressed beyond RECEIVED)
    if (c.status === "UNDER_PROCESS") {
      await prisma.caseAction.create({
        data: {
          caseId: createdCase.id,
          actorId: assignee?.id || null,
          bureauCode: c.currentBureauCode,
          type: "STATUS_CHANGE",
          fromValue: "RECEIVED",
          toValue: "UNDER_PROCESS",
          remarks: c.lastActionNote,
          createdAt: lastActionAt,
        },
      });
    } else if (c.status === "TRANSFERRED") {
      await prisma.caseAction.create({
        data: {
          caseId: createdCase.id,
          actorId: assignee?.id || null,
          bureauCode: c.originBureauCode,
          type: "TRANSFER",
          fromValue: c.originBureauCode,
          toValue: c.currentBureauCode,
          remarks: `Transferred jurisdiction from ${c.originBureauCode} to ${c.currentBureauCode}`,
          createdAt: lastActionAt,
        },
      });
    } else if (c.status === "ESCALATED") {
      await prisma.caseAction.create({
        data: {
          caseId: createdCase.id,
          actorId: assignee?.id || null,
          bureauCode: c.currentBureauCode,
          type: "ESCALATE",
          fromValue: "UNDER_PROCESS",
          toValue: "ESCALATED",
          remarks: "Breached resolution SLA. Escalated to Advisor (Management) for formal hearing.",
          createdAt: lastActionAt,
        },
      });
    } else if (c.status === "DISPOSED") {
      await prisma.caseAction.create({
        data: {
          caseId: createdCase.id,
          actorId: assignee?.id || null,
          bureauCode: c.currentBureauCode,
          type: "DISPOSE",
          fromValue: "UNDER_PROCESS",
          toValue: "DISPOSED",
          remarks: c.outcome || "Case resolved",
          createdAt: disposedAt || lastActionAt,
        },
      });
    }
  }
  console.log(`✅ Seeded ${Object.keys(createdCases).length} Cases with initial actions and audit trail.`);

  // 7. Seed Planted Overlap Groups (O1, O2, O3, O4, O5)
  // O1: Institution A (CROSS_BUREAU, STRONG)
  const o1Group = await prisma.overlapGroup.create({
    data: {
      institutionId: institutions["A"].id,
      kind: "CROSS_BUREAU",
      score: 0.84,
      strength: "STRONG",
      reasonsJson: JSON.stringify([
        { code: "SAME_INSTITUTION", label: "Same institution (AICTE ID 1-4829173)", weight: 0.4 },
        { code: "DIFFERENT_BUREAUS", label: "Handled by RB and PGRC", weight: 0.2 },
        { code: "SAME_CATEGORY", label: "Both: Fee Regulation", weight: 0.15 },
        { code: "SIMILAR_WORDING", label: "Similar wording (key terms: fee, refund, admission)", weight: 0.09 },
        { code: "WITHIN_90_DAYS", label: "Received 12 days apart", weight: 0.1 },
      ]),
      status: "OPEN",
      detectedAt: daysAgo(2),
      members: {
        create: [
          { caseId: createdCases["AICTE/PGRC/2026/0001"].id },
          { caseId: createdCases["AICTE/RB/2026/0002"].id },
        ],
      },
    },
  });

  // O2: Institution B (CROSS_BUREAU, POSSIBLE - PS Example: different category/wording, 40d apart)
  const o2Group = await prisma.overlapGroup.create({
    data: {
      institutionId: institutions["B"].id,
      kind: "CROSS_BUREAU",
      score: 0.6,
      strength: "POSSIBLE",
      reasonsJson: JSON.stringify([
        { code: "SAME_INSTITUTION", label: "Same institution (AICTE ID 1-5829102)", weight: 0.4 },
        { code: "DIFFERENT_BUREAUS", label: "Handled by RB and PGRC", weight: 0.2 },
        { code: "WITHIN_90_DAYS", label: "Received 40 days apart", weight: 0.1 },
      ]),
      status: "OPEN",
      detectedAt: daysAgo(4),
      members: {
        create: [
          { caseId: createdCases["AICTE/PGRC/2026/0003"].id },
          { caseId: createdCases["AICTE/RB/2026/0004"].id },
        ],
      },
    },
  });

  // O3: Institution C (POSSIBLE_CONFLICT - show-cause vs closing)
  const o3Group = await prisma.overlapGroup.create({
    data: {
      institutionId: institutions["C"].id,
      kind: "POSSIBLE_CONFLICT",
      score: 0.7,
      strength: "POSSIBLE",
      reasonsJson: JSON.stringify([
        { code: "SAME_INSTITUTION", label: "Same institution (AICTE ID 1-3829145)", weight: 0.4 },
        { code: "DIFFERENT_BUREAUS", label: "Handled by RB and PGRC", weight: 0.2 },
        {
          code: "CONFLICTING_ACTIONS",
          label: "Action conflict: Regulation Bureau initiating show-cause notice while PGRC is closing resolution",
          weight: 0.1,
        },
      ]),
      status: "OPEN",
      detectedAt: daysAgo(1),
      members: {
        create: [
          { caseId: createdCases["AICTE/RB/2026/0005"].id },
          { caseId: createdCases["AICTE/PGRC/2026/0006"].id },
        ],
      },
    },
  });

  // O4: Institution D (DUPLICATE, STRONG - Same bureau, same institution, duplicate student texts)
  const o4Group = await prisma.overlapGroup.create({
    data: {
      institutionId: institutions["D"].id,
      kind: "DUPLICATE",
      score: 0.79,
      strength: "STRONG",
      reasonsJson: JSON.stringify([
        { code: "SAME_INSTITUTION", label: "Same institution (AICTE ID 1-6829301)", weight: 0.4 },
        { code: "SAME_CATEGORY", label: "Both: Fee Regulation", weight: 0.15 },
        {
          code: "SIMILAR_WORDING",
          label: "High textual similarity (key terms: capitation fee, admission, receipt)",
          weight: 0.14,
        },
        { code: "WITHIN_90_DAYS", label: "Received 2 days apart", weight: 0.1 },
      ]),
      status: "OPEN",
      detectedAt: daysAgo(2),
      members: {
        create: [
          { caseId: createdCases["AICTE/PGRC/2026/0007"].id },
          { caseId: createdCases["AICTE/PGRC/2026/0008"].id },
        ],
      },
    },
  });

  // O5: Institution E (3 open cases across RB, PGRC, AB)
  const o5Group = await prisma.overlapGroup.create({
    data: {
      institutionId: institutions["E"].id,
      kind: "CROSS_BUREAU",
      score: 0.75,
      strength: "STRONG",
      reasonsJson: JSON.stringify([
        { code: "SAME_INSTITUTION", label: "Same institution (AICTE ID 1-7829412)", weight: 0.4 },
        { code: "DIFFERENT_BUREAUS", label: "Handled across 3 Bureaus (RB, PGRC, AB)", weight: 0.2 },
        { code: "CATEGORY_CORRELATION", label: "Faculty Norms and Infrastructure deficiencies", weight: 0.15 },
      ]),
      status: "OPEN",
      detectedAt: daysAgo(3),
      members: {
        create: [
          { caseId: createdCases["AICTE/RB/2026/0009"].id },
          { caseId: createdCases["AICTE/PGRC/2026/0010"].id },
          { caseId: createdCases["AICTE/AB/2026/0011"].id },
        ],
      },
    },
  });

  console.log("✅ Seeded 5 Planted Overlap Groups (O1 to O5) with explainable reasons.");

  // 8. Seed Initial Alerts
  const alertsData = [
    // O1 Alert
    {
      overlapGroupId: o1Group.id,
      caseId: createdCases["AICTE/PGRC/2026/0001"].id,
      type: "OVERLAP_DETECTED",
      key: `overlap_${o1Group.id}`,
      severity: "WARNING",
      audience: "BUREAU:PGRC",
      title: "Potential Overlapping Case – Coordination Required",
      message: "Overlap detected with Regulation Bureau on Apex Institute regarding Fee Regulation.",
    },
    {
      overlapGroupId: o1Group.id,
      caseId: createdCases["AICTE/RB/2026/0002"].id,
      type: "OVERLAP_DETECTED",
      key: `overlap_${o1Group.id}`,
      severity: "WARNING",
      audience: "BUREAU:RB",
      title: "Potential Overlapping Case – Coordination Required",
      message: "Overlap detected with PGR Cell on Apex Institute regarding Fee Regulation.",
    },
    {
      overlapGroupId: o1Group.id,
      type: "OVERLAP_DETECTED",
      key: `overlap_${o1Group.id}`,
      severity: "WARNING",
      audience: "MANAGEMENT",
      title: "Cross-Bureau Overlap: Apex Institute",
      message: "Strong overlap (Score: 0.84) detected between RB and PGRC.",
    },
    // O3 Alert (Conflict)
    {
      overlapGroupId: o3Group.id,
      type: "OVERLAP_DETECTED",
      key: `overlap_${o3Group.id}`,
      severity: "DANGER",
      audience: "MANAGEMENT",
      title: "Conflicting Bureau Actions: Capital Engineering College",
      message: "Regulation Bureau initiating show-cause while PGRC is closing complaint.",
    },
    // SLA Overdue Alerts
    {
      caseId: createdCases["AICTE/RB/2026/0004"].id,
      type: "OVERDUE",
      key: "sla_overdue_0004",
      severity: "DANGER",
      audience: "BUREAU:RB",
      title: "Case SLA Breached: AICTE/RB/2026/0004",
      message: "Faculty Norms complaint for Bharat Institute is 10 days overdue.",
    },
  ];

  for (const alert of alertsData) {
    await prisma.alert.create({ data: alert });
  }
  console.log(`✅ Seeded ${alertsData.length} Initial Alerts.`);

  // Summary counts verification
  const totalInstitutions = await prisma.institution.count();
  const totalCases = await prisma.case.count();
  const totalActions = await prisma.caseAction.count();
  const totalOverlaps = await prisma.overlapGroup.count();
  const totalAudit = await prisma.auditLog.count();

  console.log("\n==========================================");
  console.log("🎉 CaseLens Database Seed Completed Successfully!");
  console.log(`Institutions:   ${totalInstitutions} (Target: ~30)`);
  console.log(`Cases:          ${totalCases} (Target: ~90)`);
  console.log(`Case Actions:   ${totalActions}`);
  console.log(`Overlap Groups: ${totalOverlaps} (Target: 5 active)`);
  console.log(`Audit Log Rows: ${totalAudit} (Cryptographically chained)`);
  console.log("==========================================\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
