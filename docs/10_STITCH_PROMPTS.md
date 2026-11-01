# 10 — GOOGLE STITCH PROMPTS (optional, for UI first)

Paste **Prompt 0**, then screens one at a time.

## Prompt 0 — Design system
```
Design a minimalist, clean, trustworthy web dashboard called "CaseLens" for AICTE officials to monitor institution complaint cases across Bureaus/Cells. Desktop 1440px, light theme, lots of whitespace, very little data per screen.
Colors (exact): primary blue #1D4ED8, dark navy #0F2A5C (headings/logo), light blue tint #EFF4FF (active/selected), text #0F172A, muted text #64748B, borders #E5E9F0, page background #F7F9FC, cards #FFFFFF. Status colors used sparingly: success #15803D on #E8F5EC, warning/overlap #B45309 on #FEF3E2, danger/overdue #B91C1C on #FDECEC.
Typography: Inter, two weights only (regular, semibold). Cards white with 1px border, 12px radius, no heavy shadows. Buttons 10px radius; one primary button per screen. Line icons (Lucide) 16-18px. Status chips are small pills with a dot and tinted background. Tables max 6 columns.
Shell: white 232px left sidebar with logo and 5 items (Overview, Cases, Overlaps, Institutions, Reports); active item has light-blue background and a thin left bar. White 64px top bar with a search field, bell icon with small count, user avatar. Content max-width 1200px.
Confirm, then I'll request screens.
```
## Screen prompts
**1 Login** — Centered 420px white card on #F7F9FC. Logo + "CaseLens", tagline "One clear view of every institution complaint." Three segmented role chips (Management, Bureau Officer, Regional Officer), email, password, primary "Sign in". Small footer "Prototype for SIH 2026".

**2 Overview** — Title "Overview" + muted subtitle. Row of 4 minimal KPI cards (icon, label, big number, muted subtext): Open cases 42 · Needs coordination 5 (amber number) · Beyond timeline 7 (red number) · Disposed this month 18 (green number). Below: left 2/3 card "Needs attention" with 5 rows (chip Overlap/Overdue/Escalated, institution name, short case summary, age, chevron) and a "View all" link; right 1/3 card "Workload by Bureau/Cell" with 4 simple horizontal blue bars (RB, PGRC, AB, LC). Nothing else.

**3 Cases** — Search field, "Filters" outline button, primary "New case". Table with 6 columns: Case ID, Institution, Category, Status chip, Bureau/Cell chip (small amber overlap icon on some rows), Age/due. 8 realistic rows, pagination.

**4 Case detail** — Header card: muted case ID, subject as H1, status chip, Bureau chip "RB", "Assigned to Anita Sharma". Left column: Details card (category, source, received, last action, next action, expected disposal) and a vertical Timeline of 5 actions with officer, bureau chip, time and remark. Right column: amber banner "Potential Overlapping Cases – Coordination Required" with button "Review overlap", a Related cases card with 1 case from PGRC, and a small institution card. Top-right: primary "Update status" and a ⋯ menu.

**5 Overlaps list** — Tabs Open / Coordinated / Dismissed. Simple rows: institution, bureau chips (RB, PGRC), "2 cases", badge Strong/Possible, detected date.

**6 Overlap detail** — Two case cards side by side (bureau chip, status, category, last action, officer). Below: "Why flagged" row of small chips (Same institution, Different Bureaus, Same category, Similar wording, Within 90 days). Bottom actions: outline "Link cases", primary "Mark coordinated", ghost "Dismiss".

**7 Institutions profile** — Header (name, AICTE ID, region), small "Open cases by Bureau" bars, minimal history table.

**8 Reports** — Five quiet cards (Bureau-wise, Region-wise, Status-wise, Ageing, Disposal rate) each with icon, title, one line; one card opened as a preview table with "Export CSV".

Tip: if colors drift add "Use only the listed hex colors".

