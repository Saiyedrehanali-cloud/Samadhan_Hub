# Samadhan Hub — Integrated Institution Complaint Monitoring & Status Dashboard

> **Smart India Hackathon 2026 · PS SIH26264**  
> **Organization:** All India Council for Technical Education (AICTE)  
> **Theme:** Smart Automation · **Category:** Software  
> **Product Name:** **Samadhan Hub** — *One clear view of every institution-related complaint across AICTE.*

---

## 📌 Project Overview

In AICTE, technical institutions frequently receive complaints handled by disparate Bureaus and Cells:
- **RB** (Regulation Bureau)
- **PGRC** (Public Grievance Redressal Cell)
- **AB** (Approval Bureau)
- **LC** (Legal Cell)

Without an integrated platform, officers operate in information silos—leading to parallel inquiries, duplicate show-cause notices, conflicting actions, and missed resolution timelines.

**Samadhan Hub** provides a **single-window monitoring and tracking dashboard** featuring:
1. **Centralized Institution Profile:** Consolidated grievance history across all bureaus indexed by AICTE Permanent ID.
2. **Cross-Bureau Overlap Detection (Core Innovation):** Automated 5-signal deterministic algorithm detecting duplicate or parallel cases across bureaus even when descriptions or grievance categories differ.
3. **End-to-End Case Tracking:** Strictly 6-column minimalist tables, real-time status transitions, chronological action timelines, and bureau transfer workflows.
4. **Proactive SLA Monitoring & Alerts:** Automated warnings for cases nearing or exceeding resolution deadlines with automatic escalation to AICTE Management.
5. **Tamper-Evident Cryptographic Audit Trail:** Keyed HMAC-SHA256 sequential hash chaining ensuring complete legal immutability.
6. **Analytical Reports & Statutory Exports:** 5 quiet reports (bureau workload, regional breakdown, status matrix, ageing analysis, disposal compliance) with 1:1 server-side CSV export.
7. **Multi-Bureau Ingestion API:** High-throughput JSON feed endpoint protected via API key for external portal consolidation.

---

## ⚡ Quickstart Guide (Run in 2 Minutes)

### Prerequisites
- **Node.js** 18.17+ or 20+
- **npm** (included with Node.js)

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup & Seed
The database uses SQLite via Prisma (`prisma/dev.db`), requiring **no external database server**.
```bash
npx prisma generate
npx tsx prisma/seed.ts
```
> *Seeding populates 30 AICTE technical institutions, 90+ realistic complaint cases, 4 bureaus, 7 planted test overlap groups (`O1`–`O7`), and a cryptographically chained audit log.*

### 3. Start the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Pre-Configured Demo Accounts

All demo accounts share the password: `Demo@1234`

| Role | Email | Scope / Permissions |
|---|---|---|
| **AICTE Management** | `management@aicte.demo` | Global visibility across all Bureaus & Regions, SLA policy configuration, global audit verification, escalations desk |
| **Bureau Officer (RB)** | `rb.officer@aicte.demo` | Regulation Bureau cases, overlap alerts involving RB, case transfers & remarks |
| **Bureau Officer (PGRC)**| `pgrc.officer@aicte.demo`| Public Grievance Redressal cases, overlap alerts involving PGRC |
| **Regional Officer** | `regional.central@aicte.demo` | Cases filtered to Central Region institutions, regional alerts & escalations |

*(Quick-login demo pills are available directly on the `/login` screen for 1-click authentication).*

---

## 🧪 Automated Verification Test Suites

CaseLens includes automated unit and integration verification test suites:

```bash
# 1. Overlap Detection Engine Test Suite (Doc 06 §13: T1–T8)
npx tsx -e "import { runOverlapTests } from './src/lib/services/overlap'; runOverlapTests();"

# 2. SLA Evaluation, Alert Dispatch & Idempotency Suite (Phase 5)
npx tsx scripts/test_phase5.ts

# 3. Institutions, Reports, Ingestion & Audit Chain Tampering Detection (Phase 6)
npx tsx scripts/test_phase6.ts

# 4. Multi-Bureau API Ingestion Test
npx tsx scripts/test_ingest.ts

# 5. Production Lint & Build Verification
npm run lint
npm run build
```

---

## 🎯 3-Minute SIH Hackathon Demo Walkthrough

Map this directly to your official SIH 2026 presentation flow (`08_TEST_AND_DEMO.md`):

### 1. Hook (20s)
- Log in as **Management Advisor** (`management@aicte.demo`).
- Highlight the problem: *"Same technical institution, two different AICTE bureaus, parallel conflicting actions—neither bureau knows what the other is doing."*

### 2. Single-Window Overview (30s)
- Walk through the **4 KPI Cards**: Open Cases, Needs Coordination, Beyond Timeline, SLA Compliance %.
- Point out the **"Needs Attention" Queue** (strictly capped at top 5 priority items) and **Bureau Workload Distribution**.

### 3. Case Lifecycle & Tracking (30s)
- Navigate to **Cases** (`/cases`). Demonstrate quick search and collapsible filters.
- Open case **AICTE/RB/2026/0001** (Apex Institute).
- Point out the yellow advisory banner: **"Potential Overlapping Cases – Coordination Required"**.
- View the **Chronological Action Timeline**: see all past remarks, transfers, and status changes.

### 4. Overlap Detection & Coordination Workflow (60s — Core Innovation)
- Click **"Review Overlap"** to open Overlap Group **O1** (`/overlaps/[id]`).
- Show the **Deterministic Signal Score (0.84 - STRONG)** and explainable **"Why Flagged"** reasoning chips:
  - *Same Institution: Apex Institute (0.40)*
  - *Different Bureaus: RB vs PGRC (0.20)*
  - *Identical Grievance Category: Fee Regulation (0.15)*
  - *High Token Cosine Similarity: 0.12*
- Side-by-side case comparison shows one case in Regulation Bureau and another in PGR Cell.
- Execute **"Mark Coordinated"**: set `RB` as the Lead Bureau with remarks.
- Show **O2** (Bharat Institute): different categories (*Infrastructure* vs *Faculty Norms*), yet caught automatically via institutional cross-bureau correlation!

### 5. Bureau Transfer & Live Rescan (20s)
- Open an active case and click **"Transfer Bureau"** (e.g. `RB` $\to$ `PGRC`).
- Notice that CaseLens records the transfer in the timeline, re-scans for overlaps, and updates the assigned bureau instantly.

### 6. Proactive SLA Alerts & Management Escalation (20s)
- Click the **Notification Bell** in the top bar. Preview unread alerts with severity dots.
- Open `/alerts` and `/settings/sla`: demonstrate how overdue cases $>7$ days automatically escalate directly to the Management desk.
- Click **"Run SLA Scan Now"** to demonstrate strict idempotency (0 duplicates created).

### 7. Statutory Reports & Cryptographic Audit (15s)
- Open **Reports** (`/reports`): click through the 5 quiet report cards and click **"Export Official CSV"** (numbers match 1:1).
- Open **Audit Trail** (`/audit`): show the live green badge **"Cryptographic Hash Chain Verified Intact"** backed by sequential HMAC-SHA256 ledger blocks.

### 8. Closing (15s)
- Reiterate impact: eliminates duplicate inquiry committees, prevents contradictory show-cause notices, cuts resolution delays, and provides AICTE with a single source of truth.

---

## 🏛 Technical Architecture & Design Rules

### Tech Stack
- **Framework:** Next.js 14 (App Router) + TypeScript (`src/` structure)
- **Styling:** Pinned Tailwind CSS v3.4.14 with strict token-based color hierarchy
- **Database:** SQLite via Prisma ORM 6 (portable, zero-configuration)
- **Authentication:** Edge-compatible stateless JWT stored in secure `httpOnly` cookies via `jose`
- **Charts & UI:** `recharts` (minimalist single-color bars), `lucide-react`, `date-fns`
- **Audit Security:** Cryptographic HMAC-SHA256 sequential block hash chaining

### Strict Minimalism Rules
- **Overview:** Strictly $\le 4$ KPI cards, $\le 1$ attention list (max 5 rows), $\le 1$ workload chart.
- **Data Tables:** Strictly $\le 6$ columns across all screens (Cases, Overlaps, Institutions, Audit, Reports).
- **Navigation:** Strictly $\le 6$ sidebar items.
- **Color Semantics:** Color used strictly for meaning (Blue = primary/navigation, Green = disposed/on-time, Amber = overlap/nearing SLA, Red = overdue/escalated).

---

## 📁 Repository Structure

```
├── prisma/
│   ├── schema.prisma        # Canonical SQLite schema (11 models)
│   ├── dev.db               # Pre-populated local database
│   └── seed.ts              # Realistic seed generator (~30 institutions, ~90 cases)
├── scripts/
│   ├── test_phase5.ts       # SLA evaluation & alert idempotency tests
│   ├── test_phase6.ts       # Reports, institutions & audit tamper tests
│   └── test_ingest.ts       # External multi-bureau feed API tests
├── src/
│   ├── app/
│   │   ├── (auth)/login/    # 1-click role switcher login
│   │   ├── (app)/
│   │   │   ├── page.tsx            # Minimalist Overview dashboard
│   │   │   ├── cases/              # 6-col case directory & new case form
│   │   │   ├── cases/[id]/         # Case workspace, action timeline & modals
│   │   │   ├── overlaps/           # Overlap directory (Open, Coordinated, Dismissed)
│   │   │   ├── overlaps/[id]/      # Side-by-side comparison & coordination actions
│   │   │   ├── alerts/             # Multi-tiered notification workspace
│   │   │   ├── institutions/       # Centralized directory
│   │   │   ├── institutions/[id]/  # Institutional profile & cross-bureau history
│   │   │   ├── reports/            # 5 Quiet reports with CSV export
│   │   │   ├── settings/sla/       # Management SLA policy console
│   │   │   └── audit/              # Cryptographic HMAC-SHA256 ledger & verification
│   │   └── api/                    # Route handlers for auth, cases, overlaps, alerts, etc.
│   ├── components/layout/   # Minimalist 232px sidebar, topbar, alert bell flyout
│   └── lib/
│       ├── auth.ts          # Stateless JWT session management
│       ├── rbac.ts          # Role-based query scoping helpers
│       ├── db.ts            # Prisma client singleton
│       ├── utils.ts         # Formatting & SLA utilities
│       └── services/        # Business logic: overlap, cases, sla, alerts, audit, text
└── docs/                    # Complete SIH 2026 Documentation Pack
```

---

## 🏆 SIH 2026 Problem Statement Alignment

| PS SIH26264 Requirement | CaseLens Feature Implementation |
|---|---|
| **Single-Window Monitoring** | Integrated case repository connecting Regulation Bureau, PGR Cell, Approval Bureau, and Legal Cell into one searchable view. |
| **Clear Case Ownership** | Every grievance explicitly tracks `currentBureauId`, assigned officer, expected disposal date, and next scheduled action. |
| **Cross-Bureau Overlap Detection** | Automated 5-signal deterministic correlation engine flags parallel inquiries across bureaus even when complaint phrasing or categories differ. |
| **Coordinated Action Protocol** | Formal "Mark Coordinated" workflow sets a single Lead Bureau, avoids conflicting show-cause notices, and synchronizes actions. |
| **Proactive SLA Tracking** | Idempotent SLA engine monitors resolution deadlines, dispatches warnings at 75% and 90% duration, and escalates overdue cases $>7$ days to Management. |
| **Multi-Source Ingestion** | Secure `POST /api/ingest/cases` endpoint allows existing Bureau grievance portals to stream complaint records into the single window. |
| **Immutable Accountability** | Tamper-evident HMAC-SHA256 hash chaining records every mutation with instant chain verification. |

---

*Developed for Smart India Hackathon 2026 · AICTE PS SIH26264.*
