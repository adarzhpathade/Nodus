# NODUS UI Design Guide — "Blueprint Paper"

> Source of truth for the look and feel. Derived from `design/references/*` (Heron AI landing site + a city-statistics infographic) and the fonts in `design/fonts/`. Tokens live in `app/globals.css`; this guide says how to use them. When this guide and a new reference disagree, the reference wins — update the guide.

## 1. Concept

An architect's drawing board. Warm paper, black ink, one orange signal color. Everything sits on a visible **grid of 1px hairlines**; there are no shadows, gradients or rounded corners. Information is typographic: huge uppercase grotesk headlines, tiny uppercase mono labels, and thin line illustrations. Motion is precise and mechanical (lines draw, cells reveal, numbers count), never bouncy.

Reference images (`design/references/`):
| File | What to copy from it |
|---|---|
| `nav.png`, `details.png` | Top nav as bordered cells, hero stage with ruler ticks + `+` crosshairs, headline + description + CTA footer row, scrolling mono ticker |
| `head-desc-border.png` | Section header (mono eyebrow + big headline + right-aligned description), 4-column bordered card grid with `[01]` numbering, dashed inner dividers, isometric line illustrations |
| `others.png` | Footer: link columns in bordered cells, giant outline wordmark, mono legal strip |
| `stats.png` | Data-viz feel: pill filter buttons, hexagon/radar chart, one bright accent line over greyscale layers |

## 2. Color tokens

Use Tailwind classes backed by tokens (`bg-background`, `text-muted-foreground`, `border-border`, `bg-signal`...). **Never write hex in components.**

| Token | Light | Dark | Use |
|---|---|---|---|
| `background` / `paper` | `#F5F5EF` | `#161614` | Page and card surface (cards are the same paper, separated by borders) |
| `foreground` / `ink` | `#282828` | `#F5F5EF` | Text, lines, primary buttons |
| `muted-foreground` | `#60605E` | `#A8A8A0` | Descriptions, numbering `[01]`, helper text |
| `muted`, `secondary`, `accent` | `#ECECE6` | `#222220` | Hover / subtle fills |
| `border` / `hairline` | `#B3B3AF` | `#3A3A36` | Every grid line, 1px (sampled from the reference) |
| `faint` | `#B4B4B0` | `#5A5A54` | Index numbers `[01]`, grey line art |
| `signal` | `#FA3600` | `#FF4A1C` | The one accent: active nav, links, arrows, focus ring, accent dots |
| `popover` | `#FAFAF6` | `#1C1C18` | Menus, dialogs |
| `destructive` | `#C23B22` | `#E5604A` | Errors, delete |

**Progress status** (always show the % and an icon or label too — never color alone):

| Status | Token | Light | Dark |
|---|---|---|---|
| Not started (0%) | `status-not-started` | `#B4B4B0` | `#5A5A54` |
| Low (1–39%) | `status-low` | `#C23B22` | `#E5604A` |
| In progress (40–75%) | `status-in-progress` | `#E0A100` | `#E8B531` |
| Mastered (>75%) | `status-mastered` | `#2F9E7A` | `#6CC4A4` |

Orange (`signal`) is **brand/interaction only**, never a progress status, so a student never confuses "active" with "behind".

Other scales: `heat-0..4` (activity heatmap, greyscale → teal), `chart-1..5` (ink, orange, mint `#66CEAB`, greys), `graph-canvas`, `graph-edge`, `graph-edge-prerequisite` (orange, dashed).

Rule of thumb: ~90% paper and ink, one orange element per view, teal only for data/success.

## 3. Typography

| Role | Font | Class | Notes |
|---|---|---|---|
| Display / headlines | BT Grotesk SemiBold | `text-display` | UPPERCASE, line-height 0.95, letter-spacing -0.04em. Sizes: hero `clamp(3rem, 7vw, 6.5rem)`, section `clamp(2rem, 4vw, 4rem)`, card `1.5–2rem` |
| Body | BT Grotesk Regular | default | 16–18px, tight tracking (-0.01em), `muted-foreground` for secondary text |
| Emphasis / buttons | BT Grotesk Medium | `font-medium` | |
| Strong | BT Grotesk Bold | `font-bold` | Rare: numbers in stat cards |
| Labels | Geist Mono Medium | `text-label` | UPPERCASE 12px, tracking +0.04em: nav items, eyebrows ("PROBLEMS"), `[01]` indices, table headers, footers, tickers |

Only one mono weight (Medium) exists — don't use `font-bold` on mono text. Fonts are loaded in `app/layout.tsx` via `next/font/local` from `app/fonts/` (originals in `design/fonts/`).

## 4. Shape, borders, spacing

- **Radius = 0** everywhere (`--radius: 0`). Only circles (`rounded-full`) for avatars, ring charts and dots.
- **Borders:** 1px `border-border`. Dashed (`divider-dashed`) for inner section dividers. Active/selected = 1px `border-foreground`.
- **No shadows.** Elevation is a border (`--shadow-pop` is a 1px ring). No blur, no glass.
- **Grid:** pages are a frame of bordered cells (use the `cell` utility). Layout is a 12-col grid on desktop with cells touching (no gaps); gutters appear as padding inside cells (24–32px).
- **Spacing scale:** 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96. Section padding 48–96px vertical.
- **Background grain:** a faint, still paper noise is rendered once in `app/layout.tsx` with `<Noise />` (`components/layout/Noise.tsx`: `soft-light`, opacity 0.5, blend set on the overlay root, `fps={0}`, no dust). Don't add your own.
- **Blueprint grid:** `bg-blueprint` for hero stages, the graph canvas and empty states.

## 5. Page frame and rulers (the most recognisable trait)

Every page is **one framed sheet**, like a drawing sheet on a board:

1. **Outer frame:** a 1px `border-border` rectangle inset ~10px from the viewport on all four sides (`page-frame` utility on the root wrapper). Nothing sits outside it except the page background; the site-wide grain shows in the margin.
2. **Section cells:** inside the frame, sections are separated by full-width 1px lines (nav row, hero stage, headline row, each section). Columns are separated by 1px verticals running the full height of their row (the 4-column cards in `head-desc-border.png`).
3. **Ruler strips:** along the inside of the left and right edges of a hero/stage area runs a dotted vertical ruler (`ruler-y`), and along the top and bottom edges a horizontal one (`ruler-x`). They are tick marks every 8px, ink-grey, 10px wide.
4. **Corner crosshairs:** a `+` (12px, 1px stroke) sits at each corner where two ruler strips meet, so a stage reads as a measured drawing area.
5. **Guide lines:** thin vertical/horizontal lines (solid `border`, some dashed) cross a stage at construction points. One short orange line may mark the "active" guide (see the orange vertical line and the orange top line in `details.png`). On hover, a full-height 1px line follows the cursor with the coordinate tooltip.
6. **Vertical edge lines in the footer:** the dashed vertical lines at the column boundaries continue up through the section above, so the grid feels continuous down the page.

Use `<GridFrame>` (to be built in `components/layout/`) for the frame, and `<Stage>` for the ruler + crosshair area. Mobile: keep the outer frame and the section lines, drop the rulers to the top/bottom only, and stack columns.

## 6. Signature details (what makes it feel like the reference)

1. **Crosshair `+`** marks at the corners of hero stages and panels (12px, 1px strokes) — see section 5.
2. **Ruler ticks** — dotted tick strips along stage edges (`ruler-x`, `ruler-y`).
3. **Orange dot/square** (6–8px) as the single accent mark: active nav item, selected node, section eyebrow.
4. **Coordinate tooltip** — dark mono box (`bg-foreground text-background text-label`) that follows the cursor on the graph/hero.
5. **Numbered cards** — header row: mono title left, `[01]` muted right; dashed divider; illustration; headline; description.
6. **Mono ticker** marquee for repeating phrases (landing only).
7. **Giant outline wordmark** in the footer drawn with thin strokes; fills solid ink on hover/scroll.
8. **Line illustrations** — isometric, 1px stroke, `ink` for the hero object and `status-not-started` grey for secondary ones. Dashed construction lines.
9. **Underlined links** — body-copy links are ink with a 1px underline; nav/CTA links are orange.

## 7. Components

Restyle shadcn primitives via tokens only (no per-component hex).

| Component | Spec |
|---|---|
| **Top nav** | Full-width bar of bordered cells. Left: logo cell. Right: links as cells with a mono uppercase label, bottom-right corner notch; active = orange label + small orange square; CTA cell is orange text with arrow `→`. Height 72–80px. Mobile: collapses to a menu cell |
| **Button (primary)** | `bg-primary text-primary-foreground`, 0 radius, mono uppercase label, 40–44px tall, hover: invert (paper on ink) + arrow nudge 4px |
| **Button (secondary/outline)** | 1px ink border, paper fill, hover fill `muted` |
| **Button (signal)** | Orange text on paper, arrow icon; use once per view (primary CTA) |
| **Pill filter** | From `stats.png`: white (`popover`) pill, 1px border, drag handle icon; active = ink border + orange dot. Only for chart/radar filters (the one place rounded is allowed) |
| **Card** | Same paper, 1px border, no radius, header row with mono label + `[index]`, dashed divider under header |
| **Badge / status chip** | Mono uppercase, 1px border in the status color, tiny filled square before the label, % beside it |
| **Input** | Paper fill, 1px border, bottom-border emphasis on focus (`ring` = orange), mono placeholder optional |
| **Table** | Hairline rows, mono uppercase header, numeric cells right-aligned in Medium |
| **Tabs** | Mono labels in cells; active cell gets an ink top border + orange square |
| **Dialog / sheet / popover** | `popover` fill, 1px border, crosshair corners on large dialogs; sheet slides from the right with a 1px left border |
| **Tooltip** | Dark mono box, as in the hero (`CLICK AND DRAG...`) |
| **Skeleton** | `muted` blocks with a slow linear shimmer (existing `--animate-shimmer`) |
| **Empty state** | `bg-blueprint` area + thin isometric illustration + one-line mono caption |
| **Progress ring / bar** | Ring or bar in the status color, 2px stroke, % in Bold mono-adjacent figure; track in `border` color |

## 8. Pages (how each surface should look)

| Surface | Layout |
|---|---|
| **Landing** | Nav → hero stage (blueprint grid, ticks, crosshairs, line illustration of a knowledge-graph tree drawn on scroll) → headline + description + CTA row → mono ticker → 4-column numbered problem/solution cards → how-it-works → footer with giant outline NODUS wordmark |
| **Auth / onboarding** | Split frame: left a bordered form cell, right a blueprint illustration cell; steps shown as `[01] [02] [03]` |
| **Student dashboard** | Bordered cell grid: stat cards (big grotesk numbers, mono labels), coverage rings, heatmap (`heat-*`), deadline timeline with orange countdown chips |
| **Graph** | `bg-blueprint` canvas. Nodes = square bordered boxes: mono title, big % in Bold, thin progress bar in status color. Edges 1px grey; prerequisite edges dashed orange. Hover card = dark mono tooltip style with topic checklist. Side panel slides in from the right, 1px border |
| **Subjects / unit** | Section header (eyebrow + display headline + description) then a 4-col numbered card grid; unit page = two columns of bordered cells |
| **Notes** | List as a table with mono headers; editor on paper with a 720px measure, mono toolbar labels, backlinks as a bordered cell |
| **Assignments** | Rows with orange countdown `02D 14H 05M` in mono, status chip at right |
| **Tutor** | Messages as bordered cells; citation chips = small mono boxes `[01] FILE.PDF · P.12`; streaming caret = orange square |
| **Practice / quiz** | One question per frame, `[01/10]` index, options as bordered cells; correct = mastered border + check, wrong = low border + cross |
| **Faculty pages** | Same system; class charts use `chart-*` with orange reserved for the highlighted series (like the radar in `stats.png`) |
| **Footer (public pages)** | Link columns in bordered cells, giant outline wordmark, mono legal strip |

## 9. Motion

Library split stays as in `AGENTS.md` section 11 (Motion for components, GSAP for scroll/timelines, Lenis for smooth scroll). Style notes for this theme:

- **Feel:** precise and mechanical. Ease `--ease-out-expo` for reveals, `--ease-in-out-quart` for panels. No springs with overshoot except tiny button presses.
- **Line drawing:** SVG strokes draw in (`stroke-dashoffset`) for illustrations and graph edges, 600–900ms.
- **Cell reveal:** grid cells fade/translate 12px in sequence (stagger 40–60ms), top-left to bottom-right.
- **Headlines:** line-by-line mask reveal (GSAP SplitText) on landing; plain fade elsewhere.
- **Numbers:** count-up with mono digits (`CountUp`).
- **Hover:** cell border goes ink, orange square appears, arrow nudges 4px. No scale/tilt.
- **Cursor:** coordinate readout `X:644PX Y:90PX` on hero and graph canvas.
- **Reduced motion:** all of the above collapse to instant state changes (already handled in `globals.css` and `components/motion/`).

## 10. Do / Don't

- **Do** keep everything on the grid, uppercase headlines, mono labels, one orange moment per view.
- **Do** show % + icon + label with every status color.
- **Don't** add rounded corners, shadows, gradients, blurs, emoji or filled colorful icons. Use thin (1.5px) `lucide-react` icons in ink.
- **Don't** use orange for progress status.
- **Don't** hardcode hex, font names or radii in components; extend `app/globals.css` instead.

## 11. Implementation checklist for an FE agent

1. Read `app/globals.css` (tokens + `text-display`, `text-label`, `cell`, `divider-dashed`, `bg-blueprint`).
2. Restyle `components/ui/*` first (button, badge, card, input, tabs, dialog, sheet, tooltip, skeleton) — token-only, radius 0, mono labels.
3. Build shared pieces in `components/layout/`: `GridFrame` (outer page frame), `Stage` (rulers + crosshairs), `Crosshair`, `RulerTicks`, `SectionHeader` (eyebrow + display + description), `NumberedCard`, `CoordinateTooltip`, `Ticker`.
4. Restyle the shells (student/faculty top nav as bordered cells) then pages in the order: landing, auth, dashboard, graph, subjects/unit, notes, tutor/practice, faculty pages.
5. Verify: both themes, mobile (nav collapses, grid stacks to 1 column), keyboard focus (orange ring), reduced motion.
