# CaseLens — Integrated Institution Complaint Monitoring & Status Dashboard

> **Smart India Hackathon 2026 · PS SIH26264**  
> **Organization:** All India Council for Technical Education (AICTE)  
> **Theme:** Smart Automation · **Category:** Software  
> **Product Name:** **CaseLens** — *One clear view of every institution-related complaint across AICTE.*

---

## 📌 Project Overview

In AICTE, technical institutions frequently receive complaints handled by disparate Bureaus and Cells:
- **RB** (Regulation Bureau)
- **PGRC** (Public Grievance Redressal Cell)
- **AB** (Approval Bureau)
- **LC** (Legal Cell)

Without a unified system, officers operate in silos—leading to parallel inquiries, duplicate efforts, conflicting show-cause notices, and missed resolution timelines.

**CaseLens** provides a **single-window monitoring and tracking dashboard** featuring:
1. **Centralized Institution Profile:** Consolidated grievance history across all bureaus indexed by AICTE Permanent ID.
2. **Cross-Bureau Overlap Detection (Core Innovation):** Automated multi-signal algorithm detecting duplicate or parallel cases across bureaus even when complaints or wording differ.
3. **End-to-End Case Tracking:** Full status lifecycle, SLA countdowns, and chronological audit trails.
4. **Proactive SLA Monitoring & Alerts:** Automated warnings for cases nearing or exceeding resolution timelines with auto-escalation to Management.
5. **Tamper-Evident Audit Trail:** Keyed HMAC-SHA256 hash chaining ensuring data integrity.
6. **Analytical Reports:** Bureau-wise, region-wise, category ageing, and compliance reporting with 1-click CSV export.

---

## ⚡ Quickstart Guide for Teammates (Run in 2 Minutes)

### Prerequisites
- **Node.js** 18.17+ or 20+
- **npm** (included with Node.js)

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
The project comes pre-configured with `.env`, `.env.local`, and `.env.example`. SQLite is configured out-of-the-box (`file:./dev.db`), so **no external database installation is required**!

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="caselens-super-secret-jwt-key-sih2026-minimum-32-chars"
AUDIT_KEY="caselens-tamper-evident-hmac-key-sih2026"
INGEST_API_KEY="demo-ingest-key"
ALERT_SCAN_THROTTLE_MIN=5
ENABLE_AI_SIMILARITY=false
```

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
| **Management** | `management@aicte.demo` | Full access across all Bureaus & Regions, SLA settings, global reports, escalations |
| **Bureau Officer (RB)** | `rb.officer@aicte.demo` | Regulation Bureau cases, overlap alerts involving RB, case lifecycle actions |
| **Bureau Officer (PGRC)**| `pgrc.officer@aicte.demo`| Public Grievance Redressal cases, overlap alerts involving PGRC |
| **Regional Officer** | `regional.central@aicte.demo` | Cases filtered to Central Region institutions, remarks & escalations |

---

## 🛠 Tech Stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Styling:** Tailwind CSS v3.4 (Strictly pinned, government-grade minimal tokens)
- **Database / ORM:** SQLite via Prisma ORM 6
- **Authentication:** Stateless JWT stored in `httpOnly` cookies via `jose` + `bcryptjs`
- **Icons & UI:** `lucide-react`, `recharts`, `date-fns`, `clsx`, `tailwind-merge`
- **Validation:** `zod` schema validation on all inputs and API routes
- **Algorithms:** Multi-signal TF-IDF cosine similarity, Jaro-Winkler, Jaccard token matching

---

## 📁 Repository Structure

```
├── .env                  # Pre-configured environment variables
├── .env.example          # Environment template
├── .env.local            # Local Next.js environment override
├── package.json          # Pinned dependencies & scripts
├── tailwind.config.ts    # Exact design system color tokens & typography
├── tsconfig.json         # TypeScript configuration with @/* path aliases
├── prd.md                # High-level product requirements & schema outline
├── REMAINING_TASKS.md    # Detailed Phase 1–7 task checklist & specs
├── docs/                 # Complete SIH 2026 Documentation Pack
│   ├── 00_MASTER_PROMPT.md
│   ├── 01_PRD.md
│   ├── 02_TRD.md
│   ├── 03_APP_FLOW.md
│   ├── 04_UI_UX_DESIGN.md
│   ├── 05_DATABASE_AND_API.md
│   ├── 06_OVERLAP_DETECTION_SPEC.md
│   ├── 07_BUILD_PLAN_TASKS.md
│   ├── 08_TEST_AND_DEMO.md
│   ├── 09_PITCH_NOTES.md
│   └── 10_STITCH_PROMPTS.md
└── src/
    ├── app/
    │   ├── globals.css   # Base styles, canvas background, text tokens
    │   ├── layout.tsx    # Root layout with Inter font
    │   └── page.tsx      # Foundation verification view
    └── lib/
        └── utils.ts      # Class merging (cn) utility
```

---

## 🚀 Development Phases & Handover Guide

The project is built following a strict Phase-by-Phase architecture.  
See **[`REMAINING_TASKS.md`](./REMAINING_TASKS.md)** for detailed field-by-field instructions for the remaining phases:

- [x] **Phase 0 — Foundation:** Next.js 14, Tailwind 3.4, Inter font, design tokens, documentation pack.
- [ ] **Phase 1 — Data Layer:** Prisma schema, SQLite migration, seed data (~30 institutions, ~90 cases, planted test overlaps).
- [ ] **Phase 2 — Auth, Shell & Overview:** JWT auth, RBAC middleware, 232px sidebar shell, Overview 4-KPI dashboard.
- [ ] **Phase 3 — Cases:** 6-column case list, search & filters, case detail view, chronological action timeline.
- [ ] **Phase 4 — Overlap Detection Engine:** 5-signal overlap scoring algorithm, explainable reasons, Link/Coordinate/Dismiss workflows.
- [ ] **Phase 5 — SLA & Alerts:** Proactive SLA warning engine, notification bell, Management escalation flow.
- [ ] **Phase 6 — Institutions, Reports & Audit:** Institution profiles, 5 CSV exportable reports, Ingestion API, HMAC hash chain.
- [ ] **Phase 7 — Polish & Demo Prep:** Skeletons, empty states, mobile drawer, a11y contrast audit, demo rehearsal.
