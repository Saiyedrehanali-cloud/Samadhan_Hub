# 02 — TECHNICAL REQUIREMENTS DOCUMENT (TRD)

## 1. Architecture
```
Browser (Next.js App Router, Tailwind, Recharts)
        │  fetch / server components
Next.js Route Handlers  /api/*
  ├─ auth + RBAC (JWT cookie)         ├─ overlap engine (service)
  ├─ cases / actions / transfer       ├─ SLA + alert engine (service)
  ├─ institutions / reports           ├─ audit chain (HMAC)
  └─ ingestion API (multi-bureau)     └─ CSV export
        │ Prisma
     SQLite (dev.db)
```
Monolith for speed; business logic in `src/lib/services/*` so it can be split later.

## 2. Stack
Next.js 14/15 + TypeScript · Tailwind **v3.4** · lucide-react · recharts · date-fns · zod · jose + bcryptjs · Prisma 6 + SQLite · Inter font.

## 3. Folder structure
```
/docs  /prisma (schema.prisma, seed.ts)
/src
  /app
    /(auth)/login
    /(app)/layout.tsx          sidebar + topbar
    /(app)/page.tsx            Overview
    /(app)/cases  [id]  new
    /(app)/overlaps  [id]
    /(app)/institutions  [id]
    /(app)/reports
    /(app)/alerts
    /(app)/audit               (optional)
    /api/...
  /components  /ui /layout /cases /overlaps
  /lib  db.ts auth.ts rbac.ts audit.ts utils.ts
        /services  cases.ts overlap.ts sla.ts alerts.ts reports.ts text.ts
  /types
middleware.ts
```

## 4. Auth & RBAC
- `POST /api/auth/login` → bcrypt verify → JWT `{userId, role, bureauId, region}` 8h, httpOnly cookie.
- `middleware.ts` protects all routes except `/login`.
- Visibility scope helper `caseScope(session)`:
  - MANAGEMENT → no filter
  - BUREAU_OFFICER → `bureauId = own` OR case belongs to an **overlap group** that includes own bureau
  - REGIONAL_OFFICER → `institution.region = own region`
- Mutations: Bureau Officer only on cases currently held by own bureau; Management any.

## 5. Case lifecycle service (`services/cases.ts`)
All mutations in one transaction: update case → insert `CaseAction` → `logAudit` → trigger `scanOverlapsForInstitution(institutionId)` → trigger `evaluateAlertsForCase(caseId)`.
Actions: `CREATE, REMARK, STATUS_CHANGE, TRANSFER, ESCALATE, LINK, DISPOSE, REOPEN, OVERLAP_COORDINATED, OVERLAP_DISMISSED`.
`lastActionAt`, `lastActionNote`, `nextAction` updated on each action.

## 6. Overlap engine — see `06_OVERLAP_DETECTION_SPEC.md`
Pure functions (`text.ts`: normalize, tokenize, jaccard/tf-idf cosine, jaro-winkler) + orchestration (`overlap.ts`). Deterministic, unit-testable, explainable. Optional AI-assist hook (`aiSimilarity()`), off by default.

## 7. SLA & alert engine
- `SlaRule(category, slaDays)` table; `expectedDisposalAt = receivedAt + slaDays`.
- `evaluateAlerts()` loops open cases: ratio = elapsed / slaDays.
  - ≥0.75 → `SLA_NEARING` (WARNING); ≥0.90 → `SLA_CRITICAL`; >1.0 → `OVERDUE` (DANGER); overdue by `escalateAfterDays` (default 7) → `ESCALATION` to MANAGEMENT; no action for `idleDays` (default 10) → `IDLE`.
  - `OVERLAP_DETECTED` created by overlap engine for each involved bureau.
- Idempotent via unique `(caseId, type, key)`. Triggered by: "Run scan now" button, on login dashboard load (throttled 5 min), after case mutations.

## 8. Reports
`GET /api/reports/:type?format=json|csv`: `bureau-wise`, `region-wise`, `status-wise`, `ageing`, `disposal-rate`, `overlaps`, `institution-history`. CSV built server-side from the same query functions used by the UI (guarantees numbers match).

## 9. Audit chain
`hash = HMAC_SHA256(AUDIT_KEY, prevHash | actorId | action | entity | entityId | payload | ts)`; `GET /api/audit/verify` recomputes the chain.

## 10. Ingestion API (integration story)
`POST /api/ingest/cases` (API-key header) accepts cases from any Bureau/Cell system in a normalized JSON shape; runs the same pipeline (institution match by AICTE ID → fuzzy name fallback → create case → overlap scan). Seed script uses it to simulate RB and PGRC feeds.

## 11. Environment
```
DATABASE_URL="file:./dev.db"
JWT_SECRET="change-me-32chars+"
AUDIT_KEY="another-secret"
INGEST_API_KEY="demo-ingest-key"
ALERT_SCAN_THROTTLE_MIN=5
ENABLE_AI_SIMILARITY=false
```

## 12. Security checklist
httpOnly cookie + bcrypt · zod validation on all inputs · scope filter on every query · audit every mutation · no stack traces to client · simple login rate limit · security headers.

## 13. Performance
Indexes: `Case(institutionId)`, `Case(currentBureauId, status)`, `Case(receivedAt)`, `Case(expectedDisposalAt)`. Server-side pagination (20/page). Overlap scan is per-institution (small candidate sets).

## 14. Scalability roadmap (pitch)
SQLite→PostgreSQL · cron→queue worker · ingestion API→real RB/PGRC system connectors · optional embeddings-based semantic similarity · e-mail/SMS notifications · SSO.
