# 07 — BUILD PLAN & TASK CHECKLIST (vibe-coding friendly)

Give the agent **one phase at a time**. Prompt template: *"Read /docs. Implement Phase N from 07_BUILD_PLAN_TASKS.md. List files changed, how to run, what to test. Then stop."*

## Phase 0 — Foundation ✅
- [x] Next.js (TS, App Router, `src/`), Tailwind **3.4**, lucide-react, recharts, date-fns, zod, jose, bcryptjs, prisma
- [x] `tailwind.config.ts` tokens + Inter via `next/font`; `globals.css` (bg canvas, text ink)
- [x] `/docs` + root `prd.md`; `.env.local`; `.gitignore`

> 💡 **Comprehensive task breakdown & specifications:** See [`REMAINING_TASKS.md`](file:///d:/1%20Project/SIH/REMAINING_TASKS.md) for full field-level models, endpoint contracts, algorithmic formulas, and unit tests.

## Phase 1 — Data
- [ ] `schema.prisma` (doc 05) → migrate
- [ ] `lib/db.ts`, `lib/utils.ts` (dates, status/age helpers, `cn`)
- [ ] `seed.ts` (doc 08): bureaus, users, SLA rules, ~30 institutions, ~90 cases + actions, planted overlaps
- [ ] Helpers: `computeAge`, `slaState(case)` → ON_TIME | NEARING | OVERDUE

## Phase 2 — Auth, shell, Overview ✅ demo checkpoint 1
- [ ] Login page (3 roles, demo autofill) · JWT · `middleware.ts` · `caseScope()`
- [ ] Layout: sidebar (5 items) + top bar (search, bell, user menu)
- [ ] `/api/dashboard/summary` · Overview: 4 KPI cards, Needs-attention list, Bureau workload chart
- [ ] Skeleton + empty states

## Phase 3 — Cases ✅ demo checkpoint 2
- [ ] Cases list (6 cols, search, Filters popover, pagination, URL state)
- [ ] Create case form
- [ ] Case detail: details, next action, timeline
- [ ] Actions: remark, status, transfer, escalate, dispose (modals with required remarks)
- [ ] `services/cases.ts` transaction: action log + audit

## Phase 4 — Overlap detection ✅ demo checkpoint 3 (core)
- [ ] `services/text.ts` (normalize, tokenize, tf-idf cosine, jaccard, jaro-winkler)
- [ ] `services/overlap.ts` per doc 06 + unit tests (T1–T8)
- [ ] Overlaps list + detail (side-by-side, reasons chips)
- [ ] Link / Coordinate / Dismiss modals
- [ ] Banner on case detail + "Related cases" panel
- [ ] Re-scan button (Management); auto-run on create/transfer

## Phase 5 — Alerts & SLA
- [ ] `services/sla.ts`, `services/alerts.ts` (idempotent)
- [ ] Bell dropdown + Alerts page (minimal)
- [ ] "Run scan now" (Management); escalation to MANAGEMENT
- [ ] Settings: SLA days by category (simple table)

## Phase 6 — Institutions, Reports, Audit
- [ ] Institutions list + profile (open cases by Bureau, history)
- [ ] 5 reports + CSV export (numbers == on-screen)
- [ ] Ingestion API (`/api/ingest/cases`) + seed uses it
- [ ] Audit page + verify chain (Management)

## Phase 7 — Polish & demo
- [ ] Responsive + a11y pass; consistent empty/error states
- [ ] Remove any clutter (apply minimalism rules in doc 04 §4)
- [ ] README; rehearse demo script (doc 08); record 2–3 min video

## Cut-line if time is short
**Must:** Phases 0–4 + basic alerts. **Nice:** reports beyond 3, audit page, ingestion API, settings.

## Handy prompts
- "Match 04_UI_UX_DESIGN.md exactly for this screen; list deviations."
- "This page feels busy: apply the minimalism rules and remove anything non-essential."
- "Before editing, summarize your plan in 5 bullets."
- "Write unit tests for doc 06 §13 first, then implement until they pass."
