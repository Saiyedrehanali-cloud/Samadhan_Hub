# 01 — PRODUCT REQUIREMENTS DOCUMENT (PRD)

**Product:** CaseLens — Integrated Institution Complaint Monitoring & Status Dashboard
**PS:** SIH26264 · AICTE · Software · Smart Automation · Deadline: 28 Oct 2026
**Version:** 1.0

## 1. Problem
AICTE receives complaints about technical institutions from students, faculty and stakeholders. Cases are handled by different Bureaus/Cells (Regulation Bureau — RB, Public Grievance Redressal Cell — PGRC, others). With no central real-time view, officials cannot easily see **which Bureau/Cell is handling which case**, leading to **overlapping or conflicting actions, duplicated effort and delayed disposal**.

## 2. Vision
**One source of truth** for all institution-related complaint cases: simple to read, hard to miss an overlap.

## 3. Goals & measurable outcomes
| Goal | Demo-able metric |
|---|---|
| Single window | All cases from all Bureaus/Cells in one list |
| Prevent duplicate/conflicting action | Overlaps auto-detected and coordinated (count + time-to-coordinate) |
| Timely disposal | % cases within SLA; ageing buckets |
| Accountability | Complete action history with officer + timestamp |
| Data-driven decisions | Bureau-wise / region-wise / status-wise reports |

## 4. Users & roles
| Role | Who | Can do |
|---|---|---|
| **Management** | Senior officers / Competent Authority | View everything, all reports, resolve escalations, manage SLA settings |
| **Bureau Officer** | RB, PGRC & other Bureau/Cell officers | Create/update/transfer/dispose own bureau's cases; see overlaps involving own cases; link/dismiss overlaps |
| **Regional Officer** | Regional Office staff | Region-scoped view; add remarks; escalate |

## 5. Scope — MVP (maps to PS)
| # | Feature | PS section | Priority |
|---|---|---|---|
| F1 | **Centralized Institution Profile** — AICTE Permanent ID, name, address, region, consolidated case history | Key feature 1 | P0 |
| F2 | **Case tracking** — case ID, date received, category, status, assigned Bureau/Cell, assigned officer, last action, next action, last-action date, expected disposal date | 2 | P0 |
| F3 | **Cross-Bureau overlap detection** — auto-identify, alert, link/map related cases (data matching + rules + optional AI-assist) | 3 + Innovation | P0 |
| F4 | **Real-time dashboard** — total, pending, under process, disposed, transferred, beyond-timeline, institution-wise, Bureau-wise workload | 4 | P0 |
| F5 | **Workflow & action history** — chronological actions, responsible officer/Bureau, timestamp, remarks, documents, transfer/escalation history | 5 | P0 |
| F6 | **Search & filters** — institution, AICTE ID, case ID, Bureau/Cell, region, category, status, date range | 6 | P0 |
| F7 | **Alerts** — overlap, pending reminders, escalation, SLA | 7 | P0 |
| F8 | **Reports** — Bureau-wise, region-wise, institution history, ageing, disposal rate, overlapping cases, monthly/quarterly | 8 | P1 |
| F9 | **Audit trail & RBAC** | Safeguard | P1 |

**Out of scope (future):** real AICTE system integration, e-mail/SMS delivery, NLP across Indian languages, public complainant portal, document OCR.

## 6. User stories & acceptance criteria
**US-1 Single window** — *As an officer I see all institution cases in one list.* AC: list shows case ID, institution, category, status, current Bureau/Cell, age; search + filters work; Bureau Officers see own bureau + overlap-related cases.
**US-2 Who is handling this?** — *I open a case and instantly see the Bureau/Cell and officer.* AC: header shows current Bureau/Cell + officer; transfer history visible in timeline.
**US-3 Overlap alert** — *When RB and PGRC both hold open cases for the same institution, I'm warned.* AC: banner "Potential Overlapping Cases – Coordination Required"; overlap group lists cases + bureaus + reasons; alert sent to involved bureaus.
**US-4 Coordinate** — *I link related cases, mark a lead Bureau, or dismiss a false match.* AC: link/mark/dismiss require remarks; all logged in history of every involved case.
**US-5 Transfer** — *I transfer a case to another Bureau/Cell.* AC: reason required; history records from→to; overlap scan re-runs.
**US-6 SLA** — *I'm warned before a case breaches its timeline.* AC: alerts at 75%/90% of SLA, on breach, and escalation to Management after N days overdue.
**US-7 Dashboard** — *Management sees the state of play at a glance.* AC: 4 KPIs, needs-attention list, Bureau workload chart; clicking drills into filtered Cases.
**US-8 Reports** — *I export Bureau-wise/region-wise/ageing reports.* AC: preview + CSV that matches on-screen numbers.
**US-9 Audit** — *Every action is traceable.* AC: who/what/when for every mutation.

## 7. Business rules
1. Case statuses: `RECEIVED → UNDER_PROCESS → (TRANSFERRED | ESCALATED) → DISPOSED`. Transferred and escalated cases remain open; `DISPOSED` is terminal (re-open requires Management).
2. A case always has exactly one **current Bureau/Cell**; transfers keep history.
3. Case ID unique (format `AICTE/{BUREAU}/{YYYY}/{seq}`).
4. Overlap = ≥2 **open** cases on the same institution held by **different** Bureaus/Cells (or a likely duplicate within one) — see doc 06.
5. SLA days configured per category; expected disposal = received + SLA.
6. Dispose requires an outcome remark.
7. Overlaps are advisory; only humans link, coordinate or dismiss.

## 8. Non-functional requirements
Clarity (readable in 5 seconds), performance (<2s on 1,000 cases), security (RBAC, audit, validation), accessibility (WCAG AA), responsive (desktop-first, tablet OK), explainability (each overlap shows reasons).

## 9. Differentiators (for judges)
1. **Explainable overlap engine** — institution match + category + text similarity + time window → scored, with reasons.
2. **Works even when descriptions/references differ** (PS "innovation expected").
3. **Coordination workflow** — link, lead-bureau, dismiss; not just a warning.
4. **Minimalist "needs attention" design** — reduces cognitive load for busy officials.
5. **Hash-chained audit log** (tamper-evident; ties to team's research).
6. **Simulated multi-bureau sources** with an ingestion API so real systems can plug in.

## 10. Risks
| Risk | Mitigation |
|---|---|
| False overlap flags | Score + reasons + dismiss with reason; tune thresholds |
| No real AICTE data | Synthetic realistic seed; ingestion API documented |
| UI overload | Strict minimalism rules (doc 04) |
