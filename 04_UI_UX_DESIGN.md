# 04 — UI / UX DESIGN SYSTEM (Jira / Atlassian Inspired · Clean · Trustworthy · Minimalist)

**Feel:** a calm government-grade tool taking design cues from Jira and the Atlassian Design System: a calm neutral base, ONE brand blue reserved for the primary action, and a distinct accent colour for each meaning. A dark navy sidebar gives structure. Colour carries meaning (status, bureau, urgency), never decoration.

## 1. Color tokens

### Neutrals and structure
```
sidebar:        #172B4D  (dark navy; text #B6C2CF; active item bg white/14% + 3px left bar #579DFF; hover white/8%)
canvas:         #F7F8F9  (page background)
surface:        #FFFFFF  (cards, top bar)
border:         #DDDEE1
ink:            #172B4D  (headings and body text)
text-subtle:    #44546F
muted:          #626F86
selected:       #E9F2FE  (selected row, hover)
```

### Brand (primary action only)
```
primary:        #1868DB, hover #1558BC, soft #E9F2FE
```

### Status and meaning (solid / soft bg / text on soft)
```
success (Disposed, on time):      #22A06B / #DCFFF1 / #216E4E
overlap (Coordination Required):  #C75300 / #FFF1E5 / #A54800
nearing SLA:                      #CF9F02 / #FFF7D6 / #7F5F01
danger (Overdue, Escalated):      #C9372C / #FFECEB / #AE2E24
info (Under process):             #1868DB / #E9F2FE / #0C4FB0
neutral (Received, Transferred):  #626F86 / #F1F2F4 / #44546F
```

### Bureau/Cell identity colours (square badge with white code letters, also workload bar colours)
```
RB:   #1868DB (blue)
PGRC: #803FA5 (purple)
AB:   #2898BD (teal)
LC:   #C9468D (magenta)
```

### Categorical Charts & Reports Order
```
#1868DB, #2898BD, #803FA5, #C75300, #22A06B
```

### Status chip mapping (dot + label, soft-background pill, WCAG AA compliant)
| Status | Token Style | Dot | Label |
|---|---|---|---|
| Received | `#F1F2F4` bg / `#44546F` text | `#626F86` | Received |
| Under Process | `#E9F2FE` bg / `#0C4FB0` text | `#1868DB` | Under Process |
| Transferred | `#F1F2F4` bg / `#44546F` text | `#803FA5` | Transferred |
| Escalated | `#FFECEB` bg / `#AE2E24` text | `#C9372C` | Escalated |
| Disposed | `#DCFFF1` bg / `#216E4E` text | `#22A06B` | Disposed |
| Coordination Required | `#FFF1E5` bg / `#A54800` text | `#C75300` | Coordination Required |
| Nearing SLA | `#FFF7D6` bg / `#7F5F01` text | `#CF9F02` | Nearing SLA |
| Overdue | `#FFECEB` bg / `#AE2E24` text | `#C9372C` | Overdue |

### Tailwind config
```ts
// tailwind.config.ts
import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sidebar: "#172B4D",
        canvas: "#F7F8F9",
        surface: "#FFFFFF",
        border: "#DDDEE1",
        ink: "#172B4D",
        subtle: "#44546F",
        muted: "#626F86",
        selected: "#E9F2FE",
        primary: { DEFAULT: "#1868DB", hover: "#1558BC", soft: "#E9F2FE" },
        success: { DEFAULT: "#22A06B", soft: "#DCFFF1", text: "#216E4E" },
        overlap: { DEFAULT: "#C75300", soft: "#FFF1E5", text: "#A54800" },
        sla:     { DEFAULT: "#CF9F02", soft: "#FFF7D6", text: "#7F5F01" },
        danger:  { DEFAULT: "#C9372C", soft: "#FFECEB", text: "#AE2E24" },
        info:    { DEFAULT: "#1868DB", soft: "#E9F2FE", text: "#0C4FB0" },
        neutral: { DEFAULT: "#626F86", soft: "#F1F2F4", text: "#44546F" },
        bureau: {
          rb:   "#1868DB",
          pgrc: "#803FA5",
          ab:   "#2898BD",
          lc:   "#C9468D",
        },
      },
      fontFamily: { sans: ["var(--font-inter)", "system-ui", "sans-serif"] },
      borderRadius: { xl: "12px", "2xl": "16px" },
    },
  },
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
