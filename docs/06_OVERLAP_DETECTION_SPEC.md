# 06 — OVERLAP DETECTION SPEC (core innovation)

**PS requirement:** identify complaints about the same institution handled by RB, PGRC or other Bureaus/Cells "even when complaint descriptions or case references are different", and display **"Potential Overlapping Cases – Coordination Required"**.

## 1. Principles
Deterministic, explainable, tunable, advisory. Every flag stores **reasons**. Humans link / coordinate / dismiss. No auto-merge, no auto-transfer.

## 2. When it runs
After: case create, transfer, status change, ingestion, manual "Re-scan". Scope: **one institution at a time** (candidate set = all open cases of that institution; typically < 20).

## 3. Step 1 — Institution resolution (matching the *same institution*)
1. Exact `aicteId` match → confidence 1.0.
2. Else fuzzy: `normalizedName` Jaro-Winkler ≥ 0.92 **and** same city/state → confidence 0.9 (flag "possible duplicate institution record", suggest merge to Management).
3. Else new institution (manual review).
`normalize(name)`: lowercase → remove punctuation → drop stop-words (`of, the, and, institute, college, technology, engineering, university`? keep distinctive tokens) → sort-insensitive token set.

## 4. Step 2 — Candidate pairs
For each pair of **open** cases (status ≠ DISPOSED) of the same institution, compute a pair score. Group pairs above threshold into an `OverlapGroup` via connected components (union-find).

## 5. Step 3 — Pair score (0–1)
| Signal | Code | Weight | Rule |
|---|---|---|---|
| Same institution | `SAME_INSTITUTION` | **0.40** (base, always true here) | institution confidence × 0.40 |
| Different Bureau/Cell | `DIFFERENT_BUREAUS` | **0.20** | `currentBureau` differ → 0.20; same bureau → 0 |
| Category match | `SAME_CATEGORY` / `RELATED_CATEGORY` | **0.15** / 0.08 | equal → 0.15; related (see map) → 0.08 |
| Text similarity | `SIMILAR_WORDING` | up to **0.15** | cosine(TF-IDF(subject+description)) × 0.15 (stop-words removed; also Jaccard on keyword set; take max) |
| Time proximity | `WITHIN_90_DAYS` | **0.10** | received dates within 90 days → 0.10; within 180 → 0.05 |

**Total max = 1.00.**
Related category map (examples): Fee Regulation ↔ Admission; Faculty Norms ↔ Infrastructure (norms compliance); Harassment ↔ Other; Affiliation ↔ Admission.

## 6. Classification
| Score | Strength | UI |
|---|---|---|
| ≥ 0.75 | **STRONG** | "Strong overlap" badge, alert severity WARNING |
| 0.60 – 0.74 | **POSSIBLE** | "Possible overlap" badge, alert INFO |
| < 0.60 | none | not shown |

Notes: With Same institution (0.40) + Different Bureaus (0.20) = **0.60** → **any two open cases on the same institution handled by different Bureaus is always at least POSSIBLE** — exactly the PS example (PGRC + RB on Institution A), even if wording and references differ. Matching category / wording / dates raise it to STRONG.

## 7. Overlap kinds
- `CROSS_BUREAU` — different Bureaus/Cells, same institution (primary PS case)
- `DUPLICATE` — same Bureau, same institution, score ≥ 0.75 (same category + high text similarity) → "Possible duplicate complaint"
- `POSSIBLE_CONFLICT` — a CROSS_BUREAU group where one case has an adverse/regulatory action type (e.g., `nextAction` or last remark contains `show-cause`, `penalty`, `withdraw approval`, `notice`) while another is routine/closing → highlight "Actions may conflict"

## 8. Explainability payload (`reasonsJson`)
```json
[
 {"code":"SAME_INSTITUTION","label":"Same institution (AICTE ID 1-4829173)","weight":0.40},
 {"code":"DIFFERENT_BUREAUS","label":"Handled by RB and PGRC","weight":0.20},
 {"code":"SAME_CATEGORY","label":"Both: Fee Regulation","weight":0.15},
 {"code":"SIMILAR_WORDING","label":"Similar wording (key terms: fee, refund, admission)","weight":0.09},
 {"code":"WITHIN_90_DAYS","label":"Received 12 days apart","weight":0.10}
]
```
UI shows each as a small chip under "Why flagged"; total score shown as Strong/Possible only (no raw number unless expanded).

## 9. Lifecycle of a group
`OPEN` → `COORDINATED` (lead Bureau set + remark) or `DISMISSED` (reason). Re-scan rules:
- Dismissed group: if members unchanged → stay dismissed (don't re-flag). If a **new case** joins the institution → create new group/reopen with note.
- Group where < 2 members remain open (others disposed) → auto-close as `RESOLVED_AUTO` (store as COORDINATED with note "auto-closed: only one open case").
- Idempotent: group identity = sorted member case IDs hash.

## 10. Alerts
On new OPEN group → `OVERLAP_DETECTED` alert to each involved Bureau (`BUREAU:RB`, `BUREAU:PGRC`) + `MANAGEMENT` if STRONG or POSSIBLE_CONFLICT. Key = group id.

## 11. Optional AI-assist (flagged, default OFF)
`aiSimilarity(a,b)`: call an LLM or embedding model to rate semantic similarity 0–1 → replaces text-similarity signal weight (0.15) when enabled, with reason "Semantically similar (AI-assisted)". Always shows rule-based reasons alongside. Pitch as roadmap + optional switch; prototype works fully without it.

## 12. Pseudocode
```ts
export async function scanOverlapsForInstitution(institutionId) {
  const open = await db.case.findMany({ where:{ institutionId, status:{ not:"DISPOSED" } } });
  const pairs = [];
  for (const [a,b] of combinations(open,2)) {
    const { score, reasons } = scorePair(a,b,institution);
    if (score >= 0.60) pairs.push({a,b,score,reasons});
  }
  const groups = unionFind(pairs);                 // connected components
  for (const g of groups) await upsertOverlapGroup(g); // idempotent by member hash
  await autoCloseStaleGroups(institutionId);
}
```

## 13. Unit tests (must pass)
1. Same institution, RB + PGRC, different categories & wording, 40 days apart → POSSIBLE (0.60+0.0..) ✔
2. Same + same category + similar wording + 10 days → STRONG
3. Same bureau, different category → not flagged
4. Same bureau, same category, near-identical text → DUPLICATE STRONG
5. One case DISPOSED → no group
6. Different institutions → never flagged
7. Dismissed group not re-flagged on unrelated update
8. Transfer RB→PGRC making both cases same bureau → kind switches to DUPLICATE or closes

## 14. Tuning
Weights/thresholds live in `Setting` table (`overlap.weights`, `overlap.thresholdPossible`, `overlap.thresholdStrong`); defaults above.

