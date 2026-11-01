# 09 — SIH PITCH NOTES (6-slide official template content)

> Use the official SIH 2026 template (max **6 slides including title**, keep the pointer headings, PDF only). Content below maps to each slide's pointers.

## One-liner
**CaseLens** — one clear view of every institution-related complaint across AICTE Bureaus/Cells, with automatic overlap detection so no two bureaus act in the dark.

## Slide 1 — Title page
PS ID SIH26264 · Title: Integrated Dashboard for Monitoring and Tracking Institution-Related Complaint Cases Across AICTE Bureaus/Cells · Theme: Smart Automation · Category: Software · Team ID / Name.

## Slide 2 — Idea title: CaseLens · Proposed Solution
- **Detailed explanation:** single-window dashboard; institution profile; case tracking (bureau, officer, last/next action, expected disposal); workflow history; alerts; reports.
- **How it addresses the problem:** the PS pain points mapped 1:1 → duplicate action (overlap engine), unknown owner (current Bureau/Cell on every case), delays (SLA alerts + escalation), no coordination (link / lead-bureau / dismiss).
- **Innovation & uniqueness:** explainable overlap scoring that works even when descriptions/references differ · coordination workflow (not just a warning) · minimalist "needs attention" view · hash-chained audit · ingestion API for multi-bureau sources.
*Visual:* one flow strip: Complaint → Case → Institution match → Overlap scan → Coordinate → Dispose.

## Slide 3 — Technical Approach
- **Technologies:** Next.js, TypeScript, Tailwind, Prisma + SQLite, JWT RBAC, Recharts; hardware: none.
- **Methodology/process:** architecture diagram (UI → API → services: Overlap Engine, SLA/Alert Engine, Audit chain → DB) + overlap scoring table (Same institution 0.40 · Different bureaus 0.20 · Category 0.15 · Wording 0.15 · Time 0.10 → Strong ≥0.75 / Possible ≥0.60). Include 1 screenshot of the Overlap detail.

## Slide 4 — Feasibility and Viability
- **Feasibility:** open-source stack, runs on one server; synthetic data demo; ingestion API to plug RB/PGRC systems.
- **Risks:** false overlap flags; data quality of institution names/IDs; user adoption.
- **Strategies:** scored + explained + dismissible; AICTE ID exact match + fuzzy fallback; minimalist UI + role dashboards; phased rollout RB+PGRC first.

## Slide 5 — Impact and Benefits
- **Target audience impact:** RB, PGRC, other Bureaus/Cells, regional offices, management, competent authority — one source of truth.
- **Benefits:** *Social* — faster, fairer redressal for complainants · *Economic* — less duplicated effort, fewer parallel actions · *Environmental* — paperless case movement.
*Visual:* before/after bar (illustrative targets — label as such): duplicate actions, avg disposal time, cases beyond SLA.

## Slide 6 — Research and References
AICTE Approval Process Handbook & grievance redressal guidelines · CPGRAMS (public grievance portal) as reference model · Text similarity (TF-IDF, Jaro-Winkler) literature · OWASP ASVS · team's keyed-hash-chain integrity paper · prototype links (demo, video, GitHub) + 2 UI screenshots.

## Likely judge Q&A
- **How do you detect overlaps when descriptions differ?** Institution-level matching (AICTE ID exact + fuzzy name) is the anchor; two open cases on one institution under different Bureaus are always flagged at least "Possible"; wording/category/time raise confidence.
- **False positives?** Flag is advisory, explained, dismissible with reason; dismissed groups aren't re-raised.
- **Is it AI?** Rule-based + text similarity now (explainable, no training data needed); optional semantic/LLM similarity switch as roadmap.
- **Integration with existing systems?** `/api/ingest/cases` normalized feed; connectors per Bureau/Cell system.
- **Security/privacy?** RBAC scopes, audit chain, minimal personal data stored.
- **Scale?** SQLite → PostgreSQL, queue worker, per-institution scan keeps it cheap.
