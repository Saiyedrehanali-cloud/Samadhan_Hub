# 08 — SEED DATA, TEST SCENARIOS & DEMO SCRIPT

## 1. Seed data
**Bureaus/Cells:** `RB` Regulation Bureau · `PGRC` Public Grievance Redressal Cell · `AB` Approval Bureau · `LC` Legal Cell (illustrative; confirm real names before final pitch).
**Users** (password `Demo@1234`): `management@aicte.demo` (MANAGEMENT) · `rb.officer@aicte.demo` (BUREAU_OFFICER, RB) · `pgrc.officer@aicte.demo` (BUREAU_OFFICER, PGRC) · `regional.central@aicte.demo` (REGIONAL_OFFICER, Central) + a few more officers for assignment.
**Regions (illustrative):** Central, Eastern, Northern, North-Eastern, Southern, Western.
**SLA by category:** Fee Regulation 30d · Faculty Norms 45d · Infrastructure 45d · Admission 30d · Affiliation 60d · Harassment 15d · Other 30d.
**Institutions:** 30 realistic synthetic names/IDs (`1-4829173` style) across regions.
**Cases:** ~90 total — mix: 35 UNDER_PROCESS, 12 RECEIVED, 10 TRANSFERRED, 6 ESCALATED, 27 DISPOSED. Spread across RB (35), PGRC (30), AB (15), LC (10). 7 cases beyond SLA (oldest 23 days overdue); 3 with no action for 10+ days.
**Planted overlaps (must be found):**
| # | Setup | Expected |
|---|---|---|
| O1 | Institution A: PGRC case "Fee refund not given" (Fee Regulation) + RB case "Excess fee collection" (Fee Regulation), 12 days apart | CROSS_BUREAU, **STRONG** |
| O2 | Institution B: PGRC "Hostel facilities poor" + RB "Faculty shortage" — different category/wording, 40 days apart | CROSS_BUREAU, **POSSIBLE** (institution-level, no wording match — PS example) |
| O3 | Institution C: RB case with `nextAction = "Issue show-cause notice"` + PGRC case "Resolve with institution — closing soon" | POSSIBLE_CONFLICT |
| O4 | Institution D: two PGRC cases, near-identical complaint text from two students | DUPLICATE |
| O5 | Institution E: RB + PGRC + AB all open | one group with 3 cases |
| O6 | Institution F: RB open + PGRC DISPOSED | **no** overlap |
| O7 | Institution G: RB case; transfer demo → PGRC creates overlap with existing PGRC case | created after transfer |
**Ingestion:** seed pushes RB and PGRC cases through `/api/ingest/cases` to demonstrate multi-source consolidation.

## 2. Test scenarios (map to PS objectives)
| # | Scenario | Expected |
|---|---|---|
| T1 | Login each role | Correct scoped data; Bureau Officer can't edit other bureau's cases |
| T2 | Single window: Cases list | All bureaus visible to Management, filter by bureau/region/category/status/date |
| T3 | Case detail | Shows bureau, officer, last/next action, expected disposal, timeline |
| T4 | Create case on Institution A with existing other-bureau case | Overlap banner appears automatically |
| T5 | O1–O7 | Detected/not detected exactly as table |
| T6 | Link cases | Linked; remark appears in both cases' timelines |
| T7 | Coordinate (lead = RB) | Group → COORDINATED; alerts cleared; timeline entries |
| T8 | Dismiss with reason; unrelated update | Stays dismissed |
| T9 | Transfer RB→PGRC | History "RB → PGRC", rescan runs, alerts to PGRC |
| T10 | SLA scan | Nearing / overdue / escalation alerts created once; rerun creates none |
| T11 | Dispose | Requires outcome; removed from open counts; overlaps auto-close |
| T12 | Reports | CSV equals on-screen numbers |
| T13 | Audit verify | Intact → tamper a row → "Tampering detected at #N" |
| T14 | Minimalism check | Overview shows only 4 KPIs + 1 list + 1 chart; tables ≤ 6 cols |
| T15 | Mobile 375px | Drawer nav, stacked cards, no horizontal scroll |

## 3. Metrics to show judges
Overlaps detected vs planted (7/7 logic correct) · avg time open→disposed · % within SLA · cases per Bureau (workload) · number of cross-bureau coordination actions · duplicate effort avoided (cases linked/coordinated).

## 4. Demo script (3–4 min)
1. **Hook (20s):** "Same college, two Bureaus, two parallel actions — nobody knows." Show login.
2. **Overview (30s):** 4 KPIs, needs-attention list; "everything important in 5 seconds".
3. **Cases (30s):** single window, search an institution, filter by Bureau.
4. **Overlap detection (60s):** open Institution A → banner → Overlap detail → "Why flagged" chips → Mark coordinated with RB as lead. Then show O2: different wording, still caught (PS innovation).
5. **Transfer (20s):** transfer a case → overlap re-detected live.
6. **Alerts (20s):** Run scan → escalation to Management.
7. **Reports (15s):** Bureau-wise export.
8. **Close (15s):** roadmap (real system connectors, semantic AI similarity, notifications) + impact.

## 5. Definition of done
P0 features working on seeded data · T1–T14 pass · overlap unit tests T1–T8 (doc 06) pass · UI follows doc 04 minimalism rules · README + demo video ready.
