# CaseLens — Product Requirements Document & Architecture Outline

**Smart India Hackathon 2026 · PS SIH26264**  
**Title:** Integrated Dashboard for Monitoring and Tracking Institution-Related Complaint Cases Across AICTE Bureaus/Cells  
**Theme:** Smart Automation · **Category:** Software  
**Product Name:** **CaseLens** — *One clear view of every institution-related complaint across AICTE.*

---

## 1. Executive Summary & Problem Statement
Technical institutions frequently attract complaints from students, faculty, parents, and administrative stakeholders. Under the current operating model within AICTE, these complaints are handled concurrently across distinct Bureaus and Cells:
- **RB** (Regulation Bureau)
- **PGRC** (Public Grievance Redressal Cell)
- **AB** (Approval Bureau)
- **LC** (Legal Cell)

Without a unified visibility interface, individual Bureaus operate in silos. This results in:
1. Parallel, uncoordinated inquiries or conflicting show-cause notices.
2. Inability to instantly verify which Bureau or officer is currently accountable.
3. Duplication of administrative efforts and extended resolution turnaround times.
4. SLA breaches and poor visibility for higher management.

**CaseLens** solves this by establishing a **single-window monitoring dashboard** featuring automated cross-bureau overlap detection, lifecycle tracking, SLA breach warnings, and tamper-evident audit logging.

---

## 2. Core Personas & Role-Based Access Control (RBAC)

| Role | Scope | Permissions |
|---|---|---|
| **Management** | Global (All Bureaus & Regions) | View all institutional cases, resolve escalations, adjust category SLA policies, trigger system-wide re-scans, verify audit hash-chains, and access analytical reports. |
| **Bureau Officer** | Bureau-Specific + Overlap Co-visibility | Manage, transfer, remark, update status, and dispose cases held by own Bureau. View cross-bureau overlap groups where their bureau is a party; link or dismiss overlap advisories. |
| **Regional Officer** | Regional Office Scope | Track cases arising from institutions located within their assigned region. Add progress remarks and escalate critical issues. |

---

## 3. Product Scope & Functional Modules (P0 / P1)

### F1: Centralized Institution Profile (P0)
- Unified institutional directory indexed by AICTE Permanent ID (e.g., `1-4829173`).
- Consolidated multi-bureau grievance history, active cases per bureau, and region tags.

### F2: End-to-End Case Tracking (P0)
- Standardized AICTE Case ID: `AICTE/{BUREAU}/{YYYY}/{seq}`.
- Metadata: Date received, category, source persona, current Bureau, assigned officer, last action note, next scheduled action, and computed SLA disposal date.

### F3: Cross-Bureau Overlap Detection Engine (P0 — Core Innovation)
- Auto-identifies potential duplicate or parallel cases filed with different Bureaus for the same institution.
- Operates on a composite scoring algorithm ($0.0 \to 1.0$) combining institutional matching ($0.40$), multi-bureau divergence ($0.20$), category correlation ($0.15$), TF-IDF/Jaccard text similarity ($0.15$), and temporal proximity ($0.10$).
- Advisory classification: **STRONG** ($\ge 0.75$), **POSSIBLE** ($0.60 - 0.74$).
- Coordination workflows: **Link Cases**, **Mark Coordinated** (select Lead Bureau), or **Dismiss** with mandatory reasoning.

### F4: Single-Window Dashboard & Workload Overview (P0)
- High-level metric summary: Open Cases, Needs Coordination, Beyond SLA Timeline, Disposed within Month.
- Prioritized "Needs Attention" queue (top 5 critical items).
- Bureau Workload distribution bars.

### F5: Audit Trail & Case History (P0 / P1)
- Strict chronological timeline of all remarks, status updates, bureau transfers, escalations, and disposals.
- Cryptographic HMAC-SHA256 hash chaining on mutations to ensure non-repudiation and tamper detection.

### F6: SLA & Proactive Escalation Engine (P0)
- Categorical SLA thresholds (e.g., Harassment 15d, Fee Regulation 30d, Infrastructure 45d).
- Automated warning flags: 75% SLA warning, 90% SLA critical, 100%+ Overdue, and auto-escalation to Management if overdue $>7$ days.

### F7: Analytical Reports & Data Export (P1)
- Real-time aggregation: Bureau workload, Region distribution, Category ageing, SLA compliance rates, and Overlap coordination trends.
- One-click server-side CSV export matching on-screen metrics.

---

## 4. Database Schema Outline (Prisma / SQLite)

```prisma
// High-level entity relationships
Bureau        --> Users, Cases (CurrentBureau)
User          --> Bureau, AssignedCases, Actions
Institution   --> Cases, OverlapGroups
Case          --> Institution, CurrentBureau, Assignee, Actions, OverlapMembers, Links, Alerts
CaseAction    --> Case, ActorUser (CREATE | REMARK | STATUS_CHANGE | TRANSFER | ESCALATE | DISPOSE | LINK ...)
OverlapGroup  --> Institution, OverlapMembers, ResolvedByUser
OverlapMember --> (OverlapGroup, Case)
CaseLink      --> CaseA, CaseB (Manual / coordinated mapping)
SlaRule       --> Category, SlaDays
Alert         --> Case, Type, Severity, Audience
Setting       --> System configuration key-values
AuditLog      --> ActorId, Action, Entity, Hash, PrevHash, Timestamp
```

---

## 5. Design System Tokens & Minimalism Rules (Jira / Atlassian Inspired)

### Color Palette
- **Sidebar:** `#172B4D` (Dark navy sidebar; active `#579DFF` left bar, text `#B6C2CF`)
- **Canvas:** `#F7F8F9` (Calm neutral page background)
- **Surface:** `#FFFFFF` (White cards, top bar, modals)
- **Border:** `#DDDEE1` (Clean 1px dividers and card borders)
- **Ink:** `#172B4D` (Typography headings and primary body copy)
- **Subtle:** `#44546F` (Secondary body copy)
- **Muted:** `#626F86` (Metadata, tertiary text, form labels)
- **Selected:** `#E9F2FE` (Selected row highlights, table hover)
- **Primary:** `#1868DB` (Hover `#1558BC`, Soft `#E9F2FE` — reserved strictly for primary actions)
- **Success:** `#22A06B` / Soft `#DCFFF1` / Text `#216E4E` (Disposed cases, on-time indicators)
- **Overlap:** `#C75300` / Soft `#FFF1E5` / Text `#A54800` (Cross-bureau coordination required)
- **Nearing SLA:** `#CF9F02` / Soft `#FFF7D6` / Text `#7F5F01` (Nearing resolution deadline)
- **Danger:** `#C9372C` / Soft `#FFECEB` / Text `#AE2E24` (Overdue cases, critical escalations)
- **Info:** `#1868DB` / Soft `#E9F2FE` / Text `#0C4FB0` (Under process)
- **Neutral:** `#626F86` / Soft `#F1F2F4` / Text `#44546F` (Received, transferred)
- **Bureau Identity Badges:** RB `#1868DB`, PGRC `#803FA5`, AB `#2898BD`, LC `#C9468D`

### Strict Minimalism Principles
1. **Never show too much data:** Overview consists strictly of 4 KPI metrics + 1 "Needs Attention" queue (5 items) + 1 Bureau workload chart.
2. **Tables max 6 columns:** Deep details reside in dedicated case detail pages or flyout drawers.
3. **Progressive disclosure:** Summaries first; click through for detailed audits and timelines.
4. **Single primary action:** Every view features at most one dominant primary action button in brand blue (`#1868DB`).
5. **No color alone:** Every status chip and alert features both text and an icon/dot (WCAG AA).

---

## 6. Implementation Milestones

- **Phase 0 — Foundation:** Project initialization, Tailwind 3.4 tokens, Inter font, documentation, and base shell layout.
- **Phase 1 — Data Layer:** Prisma schema migration, seed script (~30 institutions, ~90 cases, 4 bureaus, planted test overlaps), and database helpers.
- **Phase 2 — Auth & Shell:** JWT-based role authentication, middleware RBAC, responsive navigation sidebar & topbar, and Overview dashboard.
- **Phase 3 — Cases:** Case registry table, collapsible filter popover, case creation form, case detail view with chronological timeline, and status/transfer actions.
- **Phase 4 — Overlap Detection:** Text similarity, composite overlap scoring, union-find grouping, overlap inspection view, coordination & dismissal actions.
- **Phase 5 — SLA & Alerts:** SLA calculation engine, notification badge, automated alert generation, and Management escalation workflows.
- **Phase 6 — Institutions & Reports:** Consolidated institution profile, multi-metric reports, CSV export, and HMAC audit chain verification.
- **Phase 7 — Polish & Demo Preparation:** Accessibility review, responsive validation, empty/loading states, and demo script validation.

