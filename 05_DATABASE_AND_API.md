# 05 — DATABASE SCHEMA & API

## 1. Prisma schema (`prisma/schema.prisma`)
```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "sqlite"; url = env("DATABASE_URL") }

model Bureau {
  id        String @id @default(cuid())
  code      String @unique          // RB, PGRC, AB, LC
  name      String
  users     User[]
  cases     Case[] @relation("CurrentBureau")
}

model User {
  id           String @id @default(cuid())
  name         String
  email        String @unique
  passwordHash String
  role         String                 // MANAGEMENT | BUREAU_OFFICER | REGIONAL_OFFICER
  bureauId     String?
  bureau       Bureau? @relation(fields:[bureauId], references:[id])
  region       String?
  assignedCases Case[] @relation("Assignee")
  actions      CaseAction[]
}

model Institution {
  id             String @id @default(cuid())
  aicteId        String @unique       // AICTE Permanent ID e.g. 1-4829173
  name           String
  normalizedName String               // lowercase, stripped, for fuzzy match
  address        String
  city           String
  state          String
  region         String               // Central | Eastern | Northern | North-Eastern | Southern | Western (illustrative)
  type           String               // Engineering | Management | Pharmacy ...
  cases          Case[]
  overlapGroups  OverlapGroup[]
  @@index([region])
}

model Case {
  id               String @id @default(cuid())
  caseNo           String @unique       // AICTE/RB/2026/0042
  institutionId    String
  institution      Institution @relation(fields:[institutionId], references:[id])
  currentBureauId  String
  currentBureau    Bureau @relation("CurrentBureau", fields:[currentBureauId], references:[id])
  assigneeId       String?
  assignee         User? @relation("Assignee", fields:[assigneeId], references:[id])
  category         String               // Fee Regulation | Faculty Norms | Infrastructure | Admission | Affiliation | Harassment | Other
  source           String               // STUDENT | FACULTY | STAKEHOLDER | OTHER
  subject          String
  description      String
  status           String @default("RECEIVED") // RECEIVED|UNDER_PROCESS|TRANSFERRED|ESCALATED|DISPOSED
  priority         String @default("NORMAL")   // NORMAL | HIGH
  receivedAt       DateTime
  slaDays          Int
  expectedDisposalAt DateTime
  lastActionAt     DateTime
  lastActionNote   String?
  nextAction       String?
  disposedAt       DateTime?
  outcome          String?
  originBureauCode String               // bureau where first received
  createdAt        DateTime @default(now())
  actions          CaseAction[]
  overlapMembers   OverlapMember[]
  linksA           CaseLink[] @relation("LinkA")
  linksB           CaseLink[] @relation("LinkB")
  alerts           Alert[]
  @@index([institutionId])
  @@index([currentBureauId, status])
  @@index([expectedDisposalAt])
}

model CaseAction {
  id         String @id @default(cuid())
  caseId     String
  case       Case @relation(fields:[caseId], references:[id], onDelete: Cascade)
  actorId    String?
  actor      User? @relation(fields:[actorId], references:[id])
  bureauCode String
  type       String        // CREATE|REMARK|STATUS_CHANGE|TRANSFER|ESCALATE|LINK|DISPOSE|REOPEN|OVERLAP_COORDINATED|OVERLAP_DISMISSED
  fromValue  String?       // e.g. old status / from bureau
  toValue    String?
  remarks    String?
  createdAt  DateTime @default(now())
  @@index([caseId, createdAt])
}

model OverlapGroup {
  id            String @id @default(cuid())
  institutionId String
  institution   Institution @relation(fields:[institutionId], references:[id])
  kind          String        // CROSS_BUREAU | DUPLICATE | POSSIBLE_CONFLICT
  score         Float         // 0..1
  strength      String        // STRONG | POSSIBLE
  reasonsJson   String        // [{code,label,weight}]
  status        String @default("OPEN") // OPEN | COORDINATED | DISMISSED
  leadBureauCode String?
  resolutionNote String?
  resolvedById  String?
  detectedAt    DateTime @default(now())
  resolvedAt    DateTime?
  members       OverlapMember[]
  @@index([institutionId, status])
}

model OverlapMember {
  groupId String
  group   OverlapGroup @relation(fields:[groupId], references:[id], onDelete: Cascade)
  caseId  String
  case    Case @relation(fields:[caseId], references:[id], onDelete: Cascade)
  @@id([groupId, caseId])
}

model CaseLink {            // manual or accepted links
  id        String @id @default(cuid())
  caseAId   String
  caseBId   String
  caseA     Case @relation("LinkA", fields:[caseAId], references:[id], onDelete: Cascade)
  caseB     Case @relation("LinkB", fields:[caseBId], references:[id], onDelete: Cascade)
  reason    String?
  linkedById String
  createdAt DateTime @default(now())
  @@unique([caseAId, caseBId])
}

model SlaRule {
  id       String @id @default(cuid())
  category String @unique
  slaDays  Int
}

model Alert {
  id        String @id @default(cuid())
  caseId    String?
  case      Case? @relation(fields:[caseId], references:[id], onDelete: Cascade)
  overlapGroupId String?
  type      String        // OVERLAP_DETECTED|SLA_NEARING|SLA_CRITICAL|OVERDUE|ESCALATION|IDLE
  key       String @default("")   // idempotency key (e.g. threshold or group id)
  severity  String        // INFO|WARNING|DANGER
  audience  String        // BUREAU:RB | MANAGEMENT | REGION:Central
  title     String
  message   String
  isRead    Boolean @default(false)
  createdAt DateTime @default(now())
  @@unique([caseId, type, key, audience])
}

model Setting {            // escalateAfterDays, idleDays, thresholds
  key   String @id
  value String
}

model AuditLog {
  id        Int @id @default(autoincrement())
  actorId   String?
  action    String
  entity    String
  entityId  String
  payload   String?
  prevHash  String
  hash      String
  createdAt DateTime @default(now())
}
```

## 2. API (JSON; cookie auth; `{ok:true,data}` or `{ok:false,error:{code,message}}`)
| Method | Route | Roles | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` `/logout`, GET `/me` | any | session |
| GET | `/api/dashboard/summary` | all (scoped) | `{openCases, needsCoordination, beyondTimeline, disposedThisMonth, withinSlaPct, needsAttention[5], bureauWorkload[]}` |
| GET | `/api/cases?q=&bureau=&region=&category=&status=&from=&to=&overlap=&overdue=&page=` | all (scoped) | list |
| POST | `/api/cases` | BUREAU, MGMT | create → overlap scan |
| GET | `/api/cases/:id` | scoped | detail + timeline + related + overlap |
| POST | `/api/cases/:id/remark` | scoped | add remark |
| POST | `/api/cases/:id/status` | owner bureau, MGMT | `{status, remarks}` |
| POST | `/api/cases/:id/transfer` | owner bureau, MGMT | `{toBureauCode, reason}` → rescan |
| POST | `/api/cases/:id/escalate` | scoped | `{remarks}` |
| POST | `/api/cases/:id/dispose` | owner bureau, MGMT | `{outcome}` |
| GET | `/api/overlaps?status=` | scoped | groups |
| GET | `/api/overlaps/:id` | scoped | members + reasons |
| POST | `/api/overlaps/:id/link` | involved bureau, MGMT | `{remarks}` |
| POST | `/api/overlaps/:id/coordinate` | involved bureau, MGMT | `{leadBureauCode, remarks}` |
| POST | `/api/overlaps/:id/dismiss` | involved bureau, MGMT | `{reason}` |
| POST | `/api/overlaps/scan` | MGMT | rescan all |
| GET | `/api/institutions?q=&region=` ; `/api/institutions/:id` | scoped | list/profile |
| GET | `/api/alerts?unread=` ; PATCH `/api/alerts/:id/read` | scoped | |
| POST | `/api/alerts/scan` | MGMT | run SLA/alert engine |
| GET | `/api/reports/:type?format=json|csv` | scoped | reports |
| GET/PUT | `/api/settings/sla` | MGMT | SLA by category |
| GET | `/api/audit` ; `/api/audit/verify` | MGMT | audit |
| POST | `/api/ingest/cases` | API key | simulated Bureau/Cell feed |

## 3. Zod essentials
```ts
export const caseCreate = z.object({
  institutionId: z.string(), category: z.enum(CATEGORIES), source: z.enum(["STUDENT","FACULTY","STAKEHOLDER","OTHER"]),
  subject: z.string().min(5).max(140), description: z.string().min(10).max(4000), receivedAt: z.coerce.date(),
});
export const dismiss = z.object({ reason: z.string().min(5) });
```
## 4. Error codes
`UNAUTHENTICATED 401 · FORBIDDEN 403 · NOT_FOUND 404 · VALIDATION 422 · INVALID_STATE 409 · SERVER 500`
