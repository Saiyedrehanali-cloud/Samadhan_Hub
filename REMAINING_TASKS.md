# CaseLens — Detailed Master Task Breakdown (Phases 1–7)

**Project:** CaseLens — Integrated Dashboard for Monitoring and Tracking Institution-Related Complaint Cases Across AICTE Bureaus/Cells  
**Problem Statement:** SIH 2026 · PS SIH26264 (AICTE, Smart Automation, Software)  
**Status:** Phase 0 Completed · Phases 1 to 7 Remaining

---

## Progress Overview

| Phase | Title | Status | Core Objective |
|---|---|---|---|
| **Phase 0** | Foundation & Design System | ✅ Completed | Next.js 14, Tailwind 3.4, tokens, Inter, root PRD, /docs |
| **Phase 1** | Data Layer & Seed Database | ✅ Completed | Prisma schema, SQLite, realistic seed (~30 institutions, ~90 cases, planted overlaps) |
| **Phase 2** | Auth, App Shell & Overview | ✅ Completed | JWT cookie auth, RBAC, minimal shell, Overview dashboard (4 KPIs, attention list, chart) |
| **Phase 3** | Case Lifecycle & Tracking | ✅ Completed | 6-col case table, detail view, timeline, mutations (remark, transfer, escalate, dispose) |
| **Phase 4** | Cross-Bureau Overlap Engine | ✅ Completed | Pair scoring algorithm, explainable reasons, union-find groups, coordinate/dismiss UI |
| **Phase 5** | SLA Monitoring & Alerts | ✅ Completed | Idempotent SLA scanner, alert bell, escalation to Management, SLA category rules |
| **Phase 6** | Institutions, Reports & Audit | ✅ Completed | Institution profiles, 5 CSV reports, Ingestion API, HMAC-SHA256 tamper-evident audit |
| **Phase 7** | Polish, Accessibility & Demo | ✅ Completed | Skeletons, empty states, mobile drawer, a11y pass, demo script rehearsal |

---

## Phase 0 — Foundation (Completed)
- [x] Next.js 14 (App Router) + TypeScript configuration with `@/*` aliases
- [x] Pinned Tailwind CSS v3.4.14 with exact color tokens (`primary`, `primary-dark`, `primary-50`, `ink`, `muted`, `border`, `canvas`, `surface`, `success`, `warning`, `danger`)
- [x] Typography setup with Inter (`next/font/google`)
- [x] Base layout, `globals.css` with accessibility focus rings
- [x] Environment files (`.env.local`, `.env.example`) and `.gitignore`
- [x] Complete documentation pack copied to `/docs` and root `prd.md` established

---

## Phase 1 — Data Layer & Seed Database (Completed)

### 1.1 Objectives & Deliverables
Establish the persistent relational storage using Prisma ORM with SQLite (`prisma/schema.prisma`), implement the database connection singleton, build date/SLA computation utilities, and seed realistic data containing the 7 planted overlap scenarios.

### 1.2 Detailed Task Checklist
- [x] **Prisma Schema (`prisma/schema.prisma`)**
  - [x] Configure `generator client` and `datasource db` with `provider = "sqlite"` and `url = env("DATABASE_URL")`.
  - [x] Implement `Bureau` model (`id`, `code` unique: `RB`, `PGRC`, `AB`, `LC`, `name`).
  - [x] Implement `User` model (`id`, `name`, `email` unique, `passwordHash`, `role` as String: `MANAGEMENT`, `BUREAU_OFFICER`, `REGIONAL_OFFICER`, `bureauId`, `region`).
  - [x] Implement `Institution` model (`id`, `aicteId` unique e.g. `1-4829173`, `name`, `normalizedName`, `address`, `city`, `state`, `region`, `type`, indexes on `region`).
  - [x] Implement `Case` model (`id`, `caseNo` unique `AICTE/{BUREAU}/{YYYY}/{seq}`, `institutionId`, `currentBureauId`, `assigneeId`, `category`, `source`, `subject`, `description`, `status` [default `RECEIVED`], `priority` [default `NORMAL`], `receivedAt`, `slaDays`, `expectedDisposalAt`, `lastActionAt`, `lastActionNote`, `nextAction`, `disposedAt`, `outcome`, `originBureauCode`, `createdAt`, indexes on `institutionId`, `currentBureauId + status`, `expectedDisposalAt`).
  - [x] Implement `CaseAction` model (`id`, `caseId`, `actorId`, `bureauCode`, `type`, `fromValue`, `toValue`, `remarks`, `createdAt`, index on `caseId + createdAt`).
  - [x] Implement `OverlapGroup` model (`id`, `institutionId`, `kind` [`CROSS_BUREAU`, `DUPLICATE`, `POSSIBLE_CONFLICT`], `score`, `strength` [`STRONG`, `POSSIBLE`], `reasonsJson`, `status` [default `OPEN`], `leadBureauCode`, `resolutionNote`, `resolvedById`, `detectedAt`, `resolvedAt`, index on `institutionId + status`).
  - [x] Implement `OverlapMember` model (`groupId`, `caseId`, composite primary key `@@id([groupId, caseId])`).
  - [x] Implement `CaseLink` model (`id`, `caseAId`, `caseBId`, `reason`, `linkedById`, `createdAt`, unique `@@unique([caseAId, caseBId])`).
  - [x] Implement `SlaRule` model (`id`, `category` unique, `slaDays`).
  - [x] Implement `Alert` model (`id`, `caseId`, `overlapGroupId`, `type`, `key`, `severity`, `audience`, `title`, `message`, `isRead`, `createdAt`, unique `@@unique([caseId, type, key, audience])`).
  - [x] Implement `Setting` model (`key` primary key, `value`).
  - [x] Implement `AuditLog` model (`id` autoincrement, `actorId`, `action`, `entity`, `entityId`, `payload`, `prevHash`, `hash`, `createdAt`).

- [x] **Database Client & Utilities (`src/lib/db.ts`, `src/lib/utils.ts`)**
  - [x] Create `src/lib/db.ts` with global Prisma client singleton to avoid exhausting connection pools in Next.js development reload.
  - [x] Build date formatters in `src/lib/utils.ts` (e.g. `12 Oct 2026`, relative age `"6 days ago"` using `date-fns`).
  - [x] Build SLA helper `computeSlaState(caseItem)` returning `{ state: "ON_TIME" | "NEARING" | "OVERDUE", ratio: number, daysRemaining: number }`.
  - [x] Build status badge and bureau color mapping helpers.

- [x] **Database Migration & Seeding (`prisma/seed.ts`)**
  - [x] Run `npx prisma db push` or `npx prisma migrate dev` to generate SQLite schema at `prisma/dev.db`.
  - [x] Seed default SLA rules:
    - Fee Regulation: 30 days
    - Faculty Norms: 45 days
    - Infrastructure: 45 days
    - Admission: 30 days
    - Affiliation: 60 days
    - Harassment: 15 days
    - Other: 30 days
  - [x] Seed default System Settings (`overlap.thresholdPossible`: `0.60`, `overlap.thresholdStrong`: `0.75`, `escalateAfterDays`: `7`, `idleDays`: `10`).
  - [x] Seed Bureaus: `RB` (Regulation Bureau), `PGRC` (Public Grievance Redressal Cell), `AB` (Approval Bureau), `LC` (Legal Cell).
  - [x] Seed Users with password `Demo@1234` (hashed using `bcryptjs`):
    - `management@aicte.demo` (Role: `MANAGEMENT`)
    - `rb.officer@aicte.demo` (Role: `BUREAU_OFFICER`, Bureau: `RB`)
    - `pgrc.officer@aicte.demo` (Role: `BUREAU_OFFICER`, Bureau: `PGRC`)
    - `regional.central@aicte.demo` (Role: `REGIONAL_OFFICER`, Region: `Central`)
    - Additional officers for `AB`, `LC`, and case assignments.
  - [x] Seed ~30 realistic technical institutions across 6 regions (`Central`, `Eastern`, `Northern`, `North-Eastern`, `Southern`, `Western`).
  - [x] Seed ~90 realistic cases:
    - Status distribution: ~35 `UNDER_PROCESS`, ~12 `RECEIVED`, ~10 `TRANSFERRED`, ~6 `ESCALATED`, ~27 `DISPOSED`.
    - Bureau distribution: ~35 `RB`, ~30 `PGRC`, ~15 `AB`, ~10 `LC`.
    - 7 cases deliberately beyond SLA (oldest 23 days overdue).
    - 3 cases with no activity for 10+ days (idle).
  - [x] **Plant the 7 critical test overlap cases (`O1` to `O7`):**
    - `O1`: Institution A — PGRC case ("Fee refund not given") + RB case ("Excess fee collection"), 12 days apart (`CROSS_BUREAU`, `STRONG`).
    - `O2`: Institution B — PGRC ("Hostel facilities poor") + RB ("Faculty shortage"), 40 days apart, different categories (`CROSS_BUREAU`, `POSSIBLE`).
    - `O3`: Institution C — RB case (`nextAction` = "Issue show-cause notice") + PGRC case ("Resolve with institution — closing soon") (`POSSIBLE_CONFLICT`).
    - `O4`: Institution D — Two PGRC cases with near-identical student text (`DUPLICATE`, `STRONG`).
    - `O5`: Institution E — 3 open cases across RB, PGRC, and AB (one multi-case group).
    - `O6`: Institution F — RB open case + PGRC `DISPOSED` case (must NOT be grouped as active overlap).
    - `O7`: Institution G — RB case ready for transfer demo to PGRC.

### 1.3 Acceptance Criteria
- [x] `npm run seed` executes without errors.
- [x] Database seeded with 30 institutions, 90 cases, users, SLA rules, and initial planted groups.

---

## Phase 2 — Authentication, Shell & Overview Dashboard (Completed)

### 2.1 Objectives & Deliverables
Implement stateless JWT cookie authentication with role-based access control (RBAC), build the application layout shell (sidebar + top navigation), and deliver the minimal, high-impact Overview dashboard screen.

### 2.2 Detailed Task Checklist
- [x] **Auth Utilities & Endpoints (`src/lib/auth.ts`, `src/lib/rbac.ts`)**
  - [x] Implement JWT generation and verification using `jose` (`SignJWT` / `jwtVerify`) storing `{ userId, email, role, bureauId, region, name }`.
  - [x] Set secure, `httpOnly`, `sameSite: "lax"`, path `/`, 8-hour expiration cookie `caselens_session`.
  - [x] Route Handler: `POST /api/auth/login` (validates email & password with `bcryptjs.compare`, returns user profile).
  - [x] Route Handler: `POST /api/auth/logout` (clears cookie).
  - [x] Route Handler: `GET /api/auth/me` (returns current user session).
  - [x] Build `middleware.ts` to protect all routes (`/(app)/*`, `/api/*` except `/api/auth/login`, `/api/ingest/cases`, public assets).
  - [x] Build RBAC query filter helper `caseScope(session)`:
    - `MANAGEMENT` $\to$ unrestricted (`{}`)
    - `BUREAU_OFFICER` $\to$ `{ OR: [{ currentBureauId: session.bureauId }, { overlapMembers: { some: { group: { members: { some: { case: { currentBureauId: session.bureauId } } } } } } }] }`
    - `REGIONAL_OFFICER` $\to$ `{ institution: { region: session.region } }`

- [x] **Login Screen (`src/app/(auth)/login/page.tsx`)**
  - [x] Center card layout (420px width) on `canvas` (`#F7F9FC`).
  - [x] CaseLens logo mark + dark navy heading "CaseLens" + tagline: *"One clear view of every institution complaint."*
  - [x] Role selector with 3 segmented chips: `Management`, `Bureau Officer`, `Regional Officer`.
  - [x] Quick "Demo Accounts" pill buttons that auto-fill credentials on click:
    - *Management:* `management@aicte.demo`
    - *Regulation Bureau:* `rb.officer@aicte.demo`
    - *PGR Cell:* `pgrc.officer@aicte.demo`
    - *Regional Officer:* `regional.central@aicte.demo`
  - [x] Primary "Sign in" button with loading state.

- [x] **Application Shell (`src/app/(app)/layout.tsx`)**
  - [x] **Sidebar (232px width):**
    - Surface `#FFFFFF`, 1px right border `#E5E9F0`.
    - CaseLens logo mark and header.
    - 5 primary navigation links with Lucide icons:
      1. `Overview` (`LayoutGrid`)
      2. `Cases` (`FileText`)
      3. `Overlaps` (`GitMerge`, with active count badge pill)
      4. `Institutions` (`Building2`)
      5. `Reports` (`BarChart3`)
    - Active link state: `bg-primary-50`, `text-primary`, and 2px left indicator bar.
    - Bottom profile widget: user avatar/initials, full name, role badge, bureau chip, and logout button.
  - [x] **Top Bar (64px height):**
    - Surface `#FFFFFF`, 1px bottom border `#E5E9F0`.
    - Global quick search input with shortcut hint `⌘K`.
    - Notification bell with unread count badge linking to `/alerts`.
    - Mobile menu hamburger toggle for responsive drawer.

- [x] **Dashboard API & Overview Page (`src/app/api/dashboard/summary/route.ts`, `src/app/(app)/page.tsx`)**
  - [x] API endpoint `/api/dashboard/summary` returning:
    - `openCases`: count of active cases (scoped).
    - `needsCoordination`: count of active overlap groups.
    - `beyondTimeline`: count of cases past SLA.
    - `disposedThisMonth`: count of resolved cases in the past 30 days.
    - `withinSlaPct`: percentage of cases disposed within SLA.
    - `needsAttention`: top 5 urgent cases (sorted by Overlap first, then most overdue days).
    - `bureauWorkload`: array of counts per bureau (`RB`, `PGRC`, `AB`, `LC`).
  - [x] Overview Page adhering strictly to **Minimalism Rule 1**:
    - **4 KPI Cards** (Icon + Label + Large Stat + Subtext):
      1. Open cases (e.g. `42` · "6 received this week")
      2. Needs coordination (e.g. `5` in warning amber `#B45309`)
      3. Beyond timeline (e.g. `7` in danger red `#B91C1C`)
      4. Disposed this month (e.g. `18` in success green `#15803D`)
    - **Needs Attention card (2/3 width):** Max 5 rows. Each row displays status chip (`Overlap`, `Overdue`, `Escalated`), Institution name, brief subject, relative age, and click-through link. "View all cases" footer link.
    - **Workload by Bureau/Cell card (1/3 width):** Clean horizontal progress bars (Primary `#1D4ED8` and muted `#64748B`), showing workload breakdown across `RB`, `PGRC`, `AB`, and `LC`.

### 2.3 Acceptance Criteria
- [x] Seamless login switching between Management, Bureau Officer, and Regional Officer.
- [x] Scoped KPI calculations match the active user's permissions.
- [x] Overview renders cleanly with exactly 4 KPI cards, 5 attention items, and workload chart.

---

## Phase 3 — Case Lifecycle, Tracking & Mutations (Completed)

### 3.1 Objectives & Deliverables
Build the core Case Management view with single-window case tracking, search, collapsible filters, detailed case audit views, interactive timelines, and atomic state transitions (Remark, Status Change, Bureau Transfer, Escalate, Dispose).

### 3.2 Detailed Task Checklist
- [x] **Case Listing Page (`src/app/(app)/cases/page.tsx`)**
  - [x] **Search & Filter Controls:**
    - Always-visible search input (matches Case No, Institution Name, AICTE ID, or Subject).
    - "Filters" popover button toggle:
      - Bureau dropdown (`RB`, `PGRC`, `AB`, `LC`)
      - Region dropdown (`Central`, `Western`, etc.)
      - Category dropdown
      - Status dropdown (`RECEIVED`, `UNDER_PROCESS`, `TRANSFERRED`, `ESCALATED`, `DISPOSED`)
      - Quick toggle: "Overlapping only"
      - Quick toggle: "Beyond timeline only"
    - URL query parameter state synchronization (`?q=&bureau=&status=&page=`).
    - Primary action button: `+ New case`.
  - [x] **Minimalist Table (Strictly 6 Columns max):**
    1. Case ID (monospace, e.g. `AICTE/RB/2026/0042`)
    2. Institution (Name + AICTE ID)
    3. Category (e.g. `Fee Regulation`)
    4. Status (Micro-UI chip with status dot)
    5. Current Bureau (Bureau chip e.g. `RB` + amber `GitMerge` icon if overlap active)
    6. Age / Due (e.g. `12 days` or `3 days overdue` in red)
  - [x] Server-side pagination (10 or 20 cases per page).
  - [x] Row click navigates to `/cases/[id]`.

- [x] **Case Creation Modal / View (`src/app/(app)/cases/new/page.tsx`)**
  - [x] Clean single-page form with Zod schema validation:
    - Institution selector with autocomplete search by name or AICTE ID.
    - Category dropdown (Fee Regulation, Faculty Norms, Infrastructure, etc.).
    - Source dropdown (`STUDENT`, `FACULTY`, `STAKEHOLDER`, `OTHER`).
    - Subject (max 140 chars).
    - Description text area (rich markdown or plaintext).
    - Received date picker (defaults to today).
  - [x] Automatic assignment:
    - Auto-generates Case ID: `AICTE/{BUREAU}/{YYYY}/{sequence}`.
    - Calculates `expectedDisposalAt = receivedAt + SlaRule.slaDays`.
    - Sets `currentBureauId` to creating officer's bureau (or selected if Management).
  - [x] Post-creation hook: triggers transactional overlap scan and audit logging.
  - [x] Redirects to newly created case. If an overlap is flagged, displays warning banner immediately.

- [x] **Case Detail View (`src/app/(app)/cases/[id]/page.tsx`)**
  - [x] **Header Card:**
    - Monospace Case ID + Subject as H1.
    - Status pill + Bureau chip + Assignee name.
    - Top-right contextual Action Button (`Update status`) + Overflow Menu (`⋯`) with options: `Add remark`, `Transfer case`, `Escalate to Management`, `Dispose case`.
  - [x] **Two-Column Layout:**
    - **Left Column (2/3 width):**
      - *Case Metadata Card:* Category, Source, Received date, SLA Target Date, Next Action, Assigned Officer.
      - *Case Description Card:* Full grievance text.
      - *Chronological Timeline:* Vertical line, action dots. Each action displays: Actor Name, Bureau chip, Action Type, Timestamp, and Remarks.
    - **Right Column (1/3 width):**
      - *Overlap Advisory Banner (if flagged):* Amber `#FEF3E2` box with warning icon: *"Potential Overlapping Cases – Coordination Required"* + primary button `Review Overlap`.
      - *Related Cases Panel:* Lists cross-bureau cases linked to this institution.
      - *Institution Mini Profile:* Name, AICTE ID, Region, City, active cases count.

- [x] **Case Mutation Service & Endpoints (`src/lib/services/cases.ts`, `src/app/api/cases/*`)**
  - [x] Transactional wrapper `executeCaseAction()`:
    1. Updates Case state in DB.
    2. Inserts `CaseAction` row.
    3. Writes cryptographic `AuditLog`.
    4. Triggers `scanOverlapsForInstitution(case.institutionId)`.
    5. Triggers `evaluateAlertsForCase(case.id)`.
  - [x] Endpoint `POST /api/cases/:id/remark` (adds progress remark + updates `lastActionAt`).
  - [x] Endpoint `POST /api/cases/:id/status` (updates status e.g. `UNDER_PROCESS` $\to$ `ESCALATED`).
  - [x] Endpoint `POST /api/cases/:id/transfer` (requires target bureau + transfer justification; logs `fromBureau` $\to$ `toBureau`, re-runs overlap detection).
  - [x] Endpoint `POST /api/cases/:id/escalate` (flags case for Management intervention + generates high-severity alert).
  - [x] Endpoint `POST /api/cases/:id/dispose` (requires mandatory outcome remark; marks status `DISPOSED`, records `disposedAt`, auto-resolves stale overlap groups).

### 3.3 Acceptance Criteria
- [x] End-to-end case creation, status updates, transfers between bureaus, and disposal work seamlessly.
- [x] Every state change logs a `CaseAction` in the timeline and updates the audit log.
- [x] Transferring a case across bureaus triggers an immediate overlap re-scan.

---

## Phase 4 — Cross-Bureau Overlap Detection Engine (Completed)

### 4.1 Objectives & Deliverables
Implement the core intellectual differentiator of CaseLens per `06_OVERLAP_DETECTION_SPEC.md`: automated, explainable, multi-signal overlap scoring that catches duplicates and cross-bureau actions even when wording or references differ. Deliver the dedicated Overlaps coordination interface.

### 4.2 Detailed Task Checklist
- [x] **Text Processing Utility (`src/lib/services/text.ts`)**
  - [x] Text normalization: lowercase, strip punctuation, strip common stopwords (`the`, `of`, `and`, `to`, `in`, `for`, `on`, `with`, `at`, `by`, `from`).
  - [x] Tokenizer & n-gram extractor.
  - [x] Jaro-Winkler string similarity implementation (for institution names and titles).
  - [x] TF-IDF Cosine similarity computation between case subjects and descriptions.
  - [x] Jaccard keyword overlap index calculation.

- [x] **Pair Scoring & Grouping Algorithm (`src/lib/services/overlap.ts`)**
  - [x] Implement `scorePair(caseA, caseB, institution)` calculating total score ($0.0 \to 1.0$) based on the 5 signals:
    1. **Same Institution:** Base weight **0.40** (exact AICTE ID = 1.0 confidence $\times$ 0.40; fuzzy name match $\ge 0.92$ = 0.9 confidence $\times$ 0.40).
    2. **Different Bureaus/Cells:** Weight **0.20** if `caseA.currentBureauId !== caseB.currentBureauId` (0 if same bureau).
    3. **Category Match:** Weight **0.15** if exact category match; Weight **0.08** if related category (e.g. Fee Regulation $\leftrightarrow$ Admission; Harassment $\leftrightarrow$ Other).
    4. **Text / Semantic Similarity:** Weight up to **0.15** based on `max(cosineSimilarity, jaccardSimilarity)`.
    5. **Time Proximity:** Weight **0.10** if received within 90 days; **0.05** if within 180 days.
  - [x] Classification:
    - Score $\ge 0.75 \to$ **STRONG** overlap
    - Score $0.60 - 0.74 \to$ **POSSIBLE** overlap
    - Score $< 0.60 \to$ No overlap flagged
  - [x] Overlap Kinds determination:
    - `CROSS_BUREAU`: Different bureaus, score $\ge 0.60$ (PS primary scenario).
    - `DUPLICATE`: Same bureau, score $\ge 0.75$.
    - `POSSIBLE_CONFLICT`: `CROSS_BUREAU` where one case contains adverse actions (e.g. "show-cause", "penalty", "withdraw approval") while another is routine/closing.
  - [x] Generate structured `reasonsJson` explanation chips:
    ```json
    [
      {"code": "SAME_INSTITUTION", "label": "Same institution (AICTE ID 1-4829173)", "weight": 0.40},
      {"code": "DIFFERENT_BUREAUS", "label": "Handled by RB and PGRC", "weight": 0.20},
      {"code": "SAME_CATEGORY", "label": "Both: Fee Regulation", "weight": 0.15},
      {"code": "SIMILAR_WORDING", "label": "Similar wording (key terms: refund, excess fee)", "weight": 0.09},
      {"code": "WITHIN_90_DAYS", "label": "Received 12 days apart", "weight": 0.10}
    ]
    ```
  - [x] Connected Components / Union-Find: cluster overlapping pairs into cohesive `OverlapGroup` entities.
  - [x] Lifecycle management:
    - Group identity hashed from sorted member Case IDs (idempotent).
    - If a group is `DISMISSED` and members haven't changed, retain `DISMISSED` state.
    - If $<2$ members remain active (others disposed), auto-close group as `RESOLVED_AUTO`.

- [x] **Overlaps Coordination Views (`src/app/(app)/overlaps/page.tsx`, `src/app/(app)/overlaps/[id]/page.tsx`)**
  - [x] **Overlaps List View:**
    - Tabs: `Open` (default) · `Coordinated` · `Dismissed`.
    - Group cards displaying: Institution Name, AICTE ID, involved Bureau chips (`RB`, `PGRC`), Member count (`2 cases`), Badge (`Strong Overlap` / `Possible Overlap`), and Detected Date.
  - [x] **Overlap Detail View:**
    - Side-by-side comparison cards for each member case (Bureau chip, Subject, Status, Category, Assigned Officer, Last Action Note).
    - "Why flagged" section displaying explanation chips with percentage weight tooltips.
    - If `POSSIBLE_CONFLICT`, render prominent warning banner highlighting conflicting action plans.
  - [x] **Coordination Action Modals:**
    1. **Link Cases Modal:** Creates mutual `CaseLink` records, appends cross-reference notes to all case timelines.
    2. **Mark Coordinated Modal (Primary):** Select designated Lead Bureau (e.g. `RB`), enter joint coordination plan remarks. Transitions group status to `COORDINATED`, clears active overlap alerts.
    3. **Dismiss Advisory Modal:** Requires mandatory justification remark (e.g. "Verified different academic departments, no overlap"). Transitions status to `DISMISSED`.
  - [x] **Manual "Re-Scan All Overlaps" Button:**
    - Accessible to Management. Triggers batch re-scan across all open cases with progress feedback.

- [x] **Unit Tests for Overlap Engine (`src/lib/services/__tests__/overlap.test.ts`)**
  - [x] Test 1: Same institution, RB + PGRC, different category & wording, 40 days apart $\to$ classifies as `POSSIBLE` (0.60 - 0.74).
  - [x] Test 2: Same institution, same category, similar wording, 10 days apart $\to$ classifies as `STRONG` ($\ge 0.75$).
  - [x] Test 3: Same bureau, different category $\to$ score $< 0.60$ (not flagged).
  - [x] Test 4: Same bureau, same category, near-identical wording $\to$ `DUPLICATE` `STRONG`.
  - [x] Test 5: One case `DISPOSED` $\to$ no active overlap.
  - [x] Test 6: Different institutions $\to$ never flagged.
  - [x] Test 7: Dismissed group is not re-opened on unrelated case update.
  - [x] Test 8: Transferring a case to make both cases belong to the same bureau updates kind or auto-closes.

### 4.3 Acceptance Criteria
- [x] All 7 planted test overlap scenarios (`O1`–`O7`) are accurately detected and classified.
- [x] The 3 coordination actions (Link, Mark Coordinated, Dismiss) persist to database and update case histories.
- [x] Unit tests pass with 100% assertion success.
- The 3 coordination actions (Link, Mark Coordinated, Dismiss) persist to database and update case histories.
- Unit tests pass with 100% assertion success.

---

## Phase 5 — SLA Monitoring & Automated Alert Engine (Completed)

### 5.1 Objectives & Deliverables
Implement the proactive SLA monitoring service and multi-tiered alert dispatch system per `02_TRD.md` and `01_PRD.md`. Deliver the quiet notification interface and Management escalation flow.

### 5.2 Detailed Task Checklist
- [x] **SLA Calculation Service (`src/lib/services/sla.ts`)**
  - [x] Calculate case SLA progress: $\text{elapsedRatio} = \frac{\text{now} - \text{receivedAt}}{\text{slaDays} \times 86400000}$.
  - [x] Determine SLA status:
    - $\text{ratio} < 0.75 \to$ `ON_TIME`
    - $0.75 \le \text{ratio} < 0.90 \to$ `SLA_NEARING` (Severity: `WARNING`)
    - $0.90 \le \text{ratio} \le 1.00 \to$ `SLA_CRITICAL` (Severity: `WARNING` / `DANGER`)
    - $\text{ratio} > 1.00 \to$ `OVERDUE` (Severity: `DANGER`)
    - Overdue by $>7$ days $\to$ `ESCALATION` to Management
    - Inactive for $>10$ days without progress remarks $\to$ `IDLE` warning

- [x] **Alert Dispatch Engine (`src/lib/services/alerts.ts`)**
  - [x] Idempotent generation using composite unique key `(caseId, type, key, audience)`:
    - Audience formats: `BUREAU:RB`, `BUREAU:PGRC`, `MANAGEMENT`, `REGION:Central`.
  - [x] Alert generators:
    - `OVERLAP_DETECTED`: Generated on overlap detection, dispatched to each involved bureau + Management (if `STRONG` or `POSSIBLE_CONFLICT`).
    - `SLA_NEARING` & `SLA_CRITICAL`: Dispatched to holding Bureau.
    - `OVERDUE`: Dispatched to holding Bureau and Regional Officer.
    - `ESCALATION`: Dispatched directly to Management with high-priority banner.
    - `IDLE`: Dispatched to assigned officer and bureau lead.
  - [x] Throttling mechanism (minimum 5-minute cooldown between background scans).

- [x] **Alerts UI & Bell Flyout (`src/components/layout/AlertBell.tsx`, `src/app/(app)/alerts/page.tsx`)**
  - [x] Top bar notification bell with live badge showing unread count.
  - [x] Dropdown popover previewing latest 5 alerts with "Mark as read" and "View all" link.
  - [x] Dedicated `/alerts` page:
    - Filter tabs: `All` · `Unread only` · `Overlaps` · `SLA Breaches` · `Escalations`.
    - Alert item card: Severity dot, Timestamp, Title, Short message, and direct click-through to affected Case or Overlap Group.
    - "Mark all as read" button.

- [x] **Management SLA Settings (`src/app/(app)/settings/sla/page.tsx`, `src/app/api/settings/sla/route.ts`)**
  - [x] View and modify default SLA resolution days per grievance category.
  - [x] Configurable escalation threshold (default 7 days) and idle warning threshold (default 10 days).
  - [x] "Run Alert Scan Now" trigger button for immediate manual audit.

### 5.3 Acceptance Criteria
- [x] Running the SLA scan creates alerts once without duplicates (idempotency verified).
- [x] Breached cases overdue by $>7$ days escalate to Management dashboard.
- [x] Marking alerts as read updates unread counts in real-time.

---

## Phase 6 — Centralized Institutions, Analytical Reports & Cryptographic Audit (Completed)

### 6.1 Objectives & Deliverables
Deliver the Centralized Institution Directory, 5 analytical reporting modules with server-side CSV export, the simulated Multi-Bureau Ingestion API, and the tamper-evident HMAC-SHA256 audit log.

### 6.2 Detailed Task Checklist
- [x] **Institution Directory & Profile (`src/app/(app)/institutions/page.tsx`, `src/app/(app)/institutions/[id]/page.tsx`)**
  - [x] Searchable directory of technical institutions (by AICTE ID, Name, State, Region).
  - [x] Minimal table: Name, AICTE ID, Region, Active Open Cases, Overlap Advisory Status.
  - [x] **Institution Profile Page (`/institutions/[id]`):**
    - Institutional header: Official name, Permanent AICTE ID, Address, Region, Type.
    - Workload Mini-Distribution: Visual stacked bar showing active cases held by `RB`, `PGRC`, `AB`, `LC`.
    - Active Overlap Alert banner (if any active overlap exists on this institution).
    - Consolidated Grievance History: Chronological table of all past and current cases across all bureaus.

- [x] **Analytical Reports & CSV Export (`src/app/(app)/reports/page.tsx`, `src/app/api/reports/[type]/route.ts`)**
  - [x] 5 Quiet Report Cards:
    1. **Bureau-Wise Distribution:** Workload, open vs disposed, SLA compliance % per Bureau.
    2. **Region-Wise Breakdown:** Complaints aggregated by geographic zones (`Central`, `Western`, etc.).
    3. **Status & Category Matrix:** Breakdown of complaints by grievance category.
    4. **Case Ageing Analysis:** Cases grouped into age buckets ($<15$d, $15-30$d, $30-60$d, $>60$d).
    5. **Disposal & SLA Compliance Rate:** Monthly disposal trends and % resolved within deadline.
  - [x] Interactive report preview with tabular summary and minimalist single-color bar chart (`recharts`).
  - [x] Server-Side CSV Export (`GET /api/reports/:type?format=csv`): Generates downloadable `.csv` file ensuring numbers match on-screen metrics exactly.

- [x] **Multi-Bureau Ingestion API (`src/app/api/ingest/cases/route.ts`)**
  - [x] Secure endpoint protected by header `x-api-key: env("INGEST_API_KEY")`.
  - [x] Accepts normalized JSON payload simulating feeds from external Bureau portals.
  - [x] Resolution pipeline:
    - Match institution by exact `aicteId`, fallback to normalized fuzzy name match.
    - Create Case record with source metadata.
    - Trigger immediate overlap detection scan and SLA scheduler.
    - Return created Case No and overlap detection result.

- [x] **Cryptographic Hash-Chained Audit Trail (`src/lib/services/audit.ts`, `src/app/(app)/audit/page.tsx`)**
  - [x] Implement cryptographic HMAC-SHA256 chaining:
    $$\text{hash} = \text{HMAC-SHA256}(\text{AUDIT\_KEY}, \text{prevHash} \parallel \text{actorId} \parallel \text{action} \parallel \text{entity} \parallel \text{entityId} \parallel \text{payload} \parallel \text{timestamp})$$
  - [x] Record audit entries on every mutation (case creation, status update, transfer, overlap link/dismiss).
  - [x] Route Handler: `GET /api/audit/verify` (re-computes entire hash chain sequentially from genesis block; detects tampering or record deletion).
  - [x] Management Audit Page: Log table displaying chronological events, actor, action, and verification status badge ("Chain Verified Intact" or "Tampering Detected at Block #N").

### 6.3 Acceptance Criteria
- [x] Exported CSV files match on-screen dashboard numbers 1:1.
- [x] Ingestion API successfully ingests simulated complaint payloads and triggers overlap scans.
- [x] Audit verification endpoint accurately detects simulated tampering in database records.

---

## Phase 7 — Final Polish, Accessibility & Hackathon Demo Preparation (Completed)

### 7.1 Objectives & Deliverables
Execute responsive and accessibility audits, verify adherence to minimalism rules, deliver loading skeletons, and rehearse the official SIH 2026 3–4 minute presentation flow.

### 7.2 Detailed Task Checklist
- [x] **Minimalism & UX Audit (Doc 04 Enforcement)**
  - [x] Verify Overview strictly displays 4 KPI cards, 1 attention list (5 rows max), and 1 workload chart.
  - [x] Verify all tables display 6 columns maximum.
  - [x] Verify no decorative graphics or extraneous colors are used (colors reserved strictly for status meaning).
  - [x] Ensure subtle tooltips exist for truncated table text.

- [x] **Loading, Empty & Error States**
  - [x] Implement shimmering skeleton loaders (`#EDF1F7`) for Overview, Case Table, and Detail views.
  - [x] Implement friendly, actionable empty states:
    - *Overview:* "Nothing needs attention right now."
    - *Cases:* "No cases match your filters. [Clear filters]"
    - *Overlaps:* "No overlapping cases detected across Bureaus."
    - *Alerts:* "You're all caught up."
    - *Institutions:* "No institutions match your search."

- [x] **Accessibility (WCAG AA) & Responsiveness**
  - [x] Verify color contrast ratios (Ink on white $\ge 16:1$; Primary on white $\ge 6.4:1$).
  - [x] Ensure full keyboard navigation support and visible focus rings.
  - [x] Responsive pass:
    - $\ge 1024\text{px}$: Fixed sidebar.
    - $768\text{px} - 1023\text{px}$: Fixed sidebar layout.
    - $< 768\text{px}$: Slide-out drawer navigation, stacked 2x2 KPI cards, horizontal scroll prevention.

- [x] **Demo Rehearsal & Verification Script (`08_TEST_AND_DEMO.md`)**
  - [x] Rehearse Step 1 (Hook - 20s): Show login screen, explain multi-bureau problem in AICTE.
  - [x] Rehearse Step 2 (Overview - 30s): Walk through the 4 KPIs and top attention queue.
  - [x] Rehearse Step 3 (Cases - 30s): Filter by bureau, search Institution A, open case detail.
  - [x] Rehearse Step 4 (Overlap Detection - 60s):
    - Highlight "Potential Overlapping Cases – Coordination Required" warning banner.
    - Open Overlap detail: explain "Why flagged" chips.
    - Execute "Mark Coordinated" with `RB` as Lead Bureau.
    - Show `O2` (different category and wording, yet caught via institutional correlation).
  - [x] Rehearse Step 5 (Bureau Transfer - 20s): Transfer case from `RB` $\to$ `PGRC`, demonstrate live overlap re-scan.
  - [x] Rehearse Step 6 (Alerts & SLA - 20s): Run SLA scan, demonstrate escalation routing to Management.
  - [x] Rehearse Step 7 (Reports & Audit - 15s): Export Bureau-wise CSV and show verified audit hash chain.
  - [x] Rehearse Step 8 (Closing & Roadmap - 15s): Highlight real system ingestion, AI-assist toggle, and institutional impact.

### 7.3 Acceptance Criteria
- [x] Clean console with zero errors or warnings during full demo walkthrough.
- [x] Mobile view renders seamlessly without horizontal overflow.
- [x] All 15 test scenarios (`T1`–`T15` in `08_TEST_AND_DEMO.md`) pass smoothly.

---

## Quick Reference: Execution Prompts for Remaining Phases

When proceeding phase by phase, use the following prompts:

- **For Phase 1:**  
  `"Implement Phase 1 (Data Layer & Seed Database) per REMAINING_TASKS.md and 05_DATABASE_AND_API.md. Create schema.prisma, run migrations, write seed.ts with planted overlaps O1-O7, and set up db/utils helpers. List files changed, how to run, what to test, then stop."`

- **For Phase 2:**  
  `"Implement Phase 2 (Auth, App Shell & Overview) per REMAINING_TASKS.md. Build JWT auth, middleware RBAC, the 232px sidebar and topbar shell, /api/dashboard/summary, and the Overview screen with 4 KPIs. List files changed, how to run, what to test, then stop."`

- **For Phase 3:**  
  `"Implement Phase 3 (Case Lifecycle & Tracking) per REMAINING_TASKS.md. Build the 6-col cases table, filter popover, case detail page with timeline, and mutation modals (remark, transfer, escalate, dispose). List files changed, how to run, what to test, then stop."`

- **For Phase 4:**  
  `"Implement Phase 4 (Cross-Bureau Overlap Engine) per REMAINING_TASKS.md and 06_OVERLAP_DETECTION_SPEC.md. Build text similarity, composite scoring, union-find groups, Overlaps list/detail views, and coordination actions. List files changed, how to run, what to test, then stop."`

- **For Phase 5:**  
  `"Implement Phase 5 (SLA Monitoring & Automated Alerts) per REMAINING_TASKS.md. Build the idempotent SLA scanner, alerts UI, bell flyout, and Management escalation flow. List files changed, how to run, what to test, then stop."`

- **For Phase 6:**  
  `"Implement Phase 6 (Institutions, Reports & Cryptographic Audit) per REMAINING_TASKS.md. Build institution profiles, 5 CSV reports, Ingestion API, and HMAC audit chain verification. List files changed, how to run, what to test, then stop."`

- **For Phase 7:**  
  `"Implement Phase 7 (Polish, Accessibility & Demo Prep) per REMAINING_TASKS.md. Add loading skeletons, empty states, responsive drawer, and verify demo scenarios T1-T15. List files changed, how to run, what to test, then stop."`

