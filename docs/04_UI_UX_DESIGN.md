# 04 — UI / UX DESIGN SYSTEM (clean · trustworthy · minimalist)

**Feel:** a calm government-grade tool. White space, quiet blues, colour only when it means something. Think "clear desk", not "control room".

## 1. Color tokens
```
primary        #1D4ED8   buttons, links, active nav
primary-dark   #0F2A5C   headings, logo
primary-50     #EFF4FF   active nav bg, selected row
ink            #0F172A   body text
muted          #64748B   secondary text, labels
border         #E5E9F0   dividers, card borders
canvas         #F7F9FC   page background
surface        #FFFFFF   cards, sidebar, top bar
success        #15803D   bg #E8F5EC     disposed, on time
warning        #B45309   bg #FEF3E2     overlap, nearing SLA
danger         #B91C1C   bg #FDECEC     overdue, escalated
```
### Status chip mapping (dot + label, tinted bg)
| Status | Style |
|---|---|
| Received | muted on `#F1F5F9` |
| Under process | primary on primary-50 |
| Transferred | primary-dark on `#E4EAF6` |
| Escalated | danger on danger-50 |
| Disposed | success on success-50 |
| Overlap flag | warning on warning-50 (icon `GitMerge`) |
| Overdue | danger on danger-50 |

### Tailwind config
```ts
// tailwind.config.ts
import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: {
    colors: {
      primary: { DEFAULT:"#1D4ED8", dark:"#0F2A5C", 50:"#EFF4FF" },
      ink:"#0F172A", muted:"#64748B", border:"#E5E9F0", canvas:"#F7F9FC", surface:"#FFFFFF",
      success:{ DEFAULT:"#15803D", 50:"#E8F5EC" },
      warning:{ DEFAULT:"#B45309", 50:"#FEF3E2" },
      danger:{ DEFAULT:"#B91C1C", 50:"#FDECEC" },
    },
    fontFamily: { sans:["var(--font-inter)","system-ui","sans-serif"] },
    borderRadius: { xl:"12px", "2xl":"16px" },
    boxShadow: { card:"0 1px 2px rgba(15,23,42,.04)", pop:"0 8px 24px rgba(15,23,42,.08)" },
  }},
  plugins: [],
} satisfies Config;
```

## 2. Typography
Inter. H1 24/32 semibold primary-dark · H2 18/26 semibold · Body 14/22 · Label 12/16 medium muted (uppercase optional, tracking-wide) · KPI number 30/36 semibold ink. Only two weights in use: 400 & 600.

## 3. Spacing & shape
8-pt grid. Page padding 32 (desktop) / 16 (mobile). Cards: white, `1px border`, radius 12, padding 20, `shadow-card` at most. Inputs/buttons: radius 10, height 40. Generous gaps (24) between sections.

## 4. MINIMALISM RULES (enforced)
1. **Overview:** exactly 4 KPI cards + 1 "Needs attention" list (5 rows) + 1 small bar chart. Nothing else.
2. **Tables:** ≤ 6 columns, row height 52, zebra off, hover `primary-50`. Secondary info goes to detail view.
3. **Filters** hidden behind one "Filters" button (popover); search always visible.
4. **One primary button per screen**; everything else ghost/outline.
5. **No more than 2 colours in any chart** (primary + muted).
6. **No decorative graphics.** Icons are 16–18px line icons (Lucide), used sparingly.
7. **Truncate with tooltips** instead of wrapping long text in tables.
8. **Progressive disclosure:** summaries first; "View details" reveals more.
9. **Alerts are quiet:** bell with a small count; no popups/toasts except confirmations.

## 5. Layout shell
```
┌──────────┬──────────────────────────────────────────────────┐
│ CaseLens │  [ Search cases, institutions…    ]   🔔  👤 Name │  ← 64px white, bottom border
│ (logo)   ├──────────────────────────────────────────────────┤
│ Overview │  Page title                        [Primary btn]  │
│ Cases    │  muted subtitle                                   │
│ Overlaps │                                                   │
│ Institu… │  content (max-width 1200, centered)               │
│ Reports  │                                                   │
│          │                                                   │
└──────────┴──────────────────────────────────────────────────┘
 sidebar 232px white, right border; active item = primary-50 bg + primary text + 2px left bar
```
Sidebar items (Lucide): `LayoutGrid` Overview · `FileText` Cases · `GitMerge` Overlaps (count pill if open) · `Building2` Institutions · `BarChart3` Reports. Bottom: user chip. Mobile: collapses to a top-bar drawer.

## 6. Screens

### 6.1 Login
Centered card on canvas (420px). Logo + "CaseLens", tagline "One clear view of every institution complaint." Role selector (3 segmented chips: Management · Bureau Officer · Regional Officer), email, password, primary "Sign in". "Demo accounts" as small muted links that auto-fill. Footer: "Prototype for SIH 2026 · PS SIH26264".

### 6.2 Overview
- Title "Overview", subtitle "Status of institution complaints across AICTE Bureaus/Cells".
- **4 KPI cards** in a row (no coloured top bars; small icon + label + number + muted subtext):
  1. Open cases — `42` — "6 received this week"
  2. Needs coordination — `5` — "overlapping cases" (warning-coloured number)
  3. Beyond timeline — `7` — "oldest 23 days" (danger-coloured number)
  4. Disposed this month — `18` — "82% within SLA" (success)
- **Needs attention** card (left, 2/3 width): 5 rows max; each row = small chip (Overlap / Overdue / Escalated) + institution + case summary + age + chevron. "View all" link.
- **Workload by Bureau/Cell** card (right, 1/3): horizontal bars, primary colour, 4 bars.

### 6.3 Cases
Search bar + "Filters" button + primary "New case". Table (6 cols): Case ID · Institution · Category · Status chip · Bureau/Cell (+ overlap icon if flagged) · Age / due. Pagination. Row click → detail.
Filters popover: Bureau/Cell, Region, Category, Status, Date range, "Overlapping only", "Beyond timeline only".

### 6.4 Case detail
Header card: Case ID (muted), Subject (H1), chips (status, bureau), "Assigned to: officer". Two-column body:
- Left 2/3: **Details** (category, source, received, last action, **next action**, expected disposal) → **Timeline** (vertical line, dot per action, "RB · Officer name · 12 Oct, 10:42" + remark).
- Right 1/3: **Related cases** (only if overlap) with banner (warning-50): "Potential Overlapping Cases – Coordination Required" + "Review overlap" button; below it institution mini-card.
Action bar (top right): primary = contextual (e.g., "Update status"), overflow menu `⋯` = Transfer, Escalate, Add remark, Dispose.

### 6.5 Overlaps
Simple list of groups: institution · bureaus involved (chips) · # cases · strength badge (Strong/Possible) · detected date · status. Tabs: Open / Coordinated / Dismissed.
**Overlap detail:** left-to-right cards for each case (bureau chip, status, category, last action, officer). Under them "Why flagged" chips. Bottom action row: **Link cases** · **Mark coordinated** (primary) · **Dismiss**. Each opens a small modal requiring a remark.

### 6.6 Institutions
Search + minimal table (Name · AICTE ID · Region · Open cases · Overlap flag). Profile: header, "Open cases by Bureau" mini bar, history table.

### 6.7 Reports
Five quiet cards (icon + title + one-line description). Click → preview table + optional tiny chart + "Export CSV".

### 6.8 Alerts (from bell)
Plain list, one line each, unread dot, filter All/Unread. No colours beyond a small icon.

## 7. Components
| Component | Spec |
|---|---|
| Button primary | bg primary, white text, hover `#1E40AF`, focus ring `primary/30` 3px |
| Button ghost | text primary, hover bg primary-50 |
| Button outline | border `border`, text ink, hover bg canvas |
| Danger button | text danger, outline; filled only in destructive confirm modal |
| Chip | pill, 12px, tinted bg + dot; no borders |
| Table | header 12px muted uppercase, sticky, bottom border only |
| Timeline | 2px `border` line, 10px dots (primary for latest, border for rest) |
| Modal | 480px, radius 16, backdrop `ink/40`, title + body + right-aligned buttons |
| Empty state | line icon (muted), 1 sentence, 1 link/button |
| Skeleton | `#EDF1F7` shimmer blocks |

## 8. Accessibility
Contrast ≥ AA (ink on white 16:1; primary on white 6.4:1; muted on white 4.7:1). Never colour-only: chips have text + dot/icon. Visible focus ring, keyboard navigable tables/modals, `aria-live` for confirmations, labels on all inputs.

## 9. Motion
150ms ease-out for hover/focus and modal open. No decorative animation. Respect `prefers-reduced-motion`.

## 10. Responsive
≥1024 sidebar fixed · 768–1023 icon-only sidebar · <768 drawer, KPI cards 2×2, tables become stacked card rows (case ID + status + institution).

## 11. Content tone
Plain, official, concise. Buttons are verbs ("Mark coordinated", "Transfer case"). Dates `12 Oct 2026`; relative age as "6 days". Always show the Bureau/Cell code (RB, PGRC) as a chip.

