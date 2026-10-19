# NODUS — Frontend Roadmap & Tracker

> **Owner: FE agent.** Only the FE agent edits this file.
> Owns: `app/**` (except `app/api/**`), `components/**`, `hooks/**`, `stores/**`, `mocks/**`, `public/**`.
> Rules: `AGENTS.md` §3.1 and §5. Overview: [README.md](README.md).

**Status:** ⬜ Not started · 🟡 In progress · ✅ Done · ⏸ Blocked · ⏭ Skipped
**Branches:** `fe/<task-id>-<slug>` · deps/config: `chore/<slug>`

**Golden rule:** read data only via `getGateway()` from `@/lib/gateway` (server components) and mutate only via `@/lib/actions`. Develop with `MOCK_FEATURES=all` until each integration checkpoint.

---

## Summary

| Phase | Name | Weeks | Tasks | Done |
|---|---|---|---|---|
| FE-0 | Frontend docs | 1 | 4 | 0 |
| FE-1 | Foundation + mocks | 2 | 12 | 12 |
| FE-3 | Auth & app shell | 3 | 9 | 8 |
| FE-4 | Faculty content & unit page | 4 | 6 | 5 |
| FE-5 | Notes | 5 | 10 | 9 |
| FE-6 | Graph View | 6–7 | 12 | 11 |
| FE-7 | AI UI | 7–8 | 9 | 0 |
| FE-8 | Assignments & notifications | 9 | 8 | 0 |
| FE-9 | Dashboards | 9–10 | 8 | 0 |
| FE-10 | Design replication & motion polish | 10–11 | 12 | 0 |
| FE-11 | Testing & demo | 11–12 | 7 | 0 |
| FE-B | Bonus | anytime | 4 | 0 |
| | **Total** | | **101** | **45** |

> FE starts after **BOOT** is merged to `main` (BE task BOOT-12).

---

## FE-0 — Frontend docs (Week 1)

| ID | Task | Pri | Done when | Status |
|---|---|---|---|---|
| FE-0.1 | `docs/user_flow.md` (student, faculty, Graph View flows in Mermaid) | P0 | Flows render | ⬜ |
| FE-0.2 | Use case + activity diagrams | P1 | In `docs/user_flow.md` or `docs/diagrams.md` | ⬜ |
| FE-0.3 | `docs/ui_design.md` skeleton (tokens, components, motion list) — filled when design arrives | P0 | Structure ready | ⬜ |
| FE-0.4 | Collect motion references (3–5 Awwwards sites) with notes | P1 | Listed in `ui_design.md` | ⬜ |

---

## FE-1 — Foundation + mocks (Week 2)

| ID | Task | Pri | Needs | Done when | Status |
|---|---|---|---|---|---|
| FE-1.1 | Design tokens in `app/globals.css` → Tailwind theme (placeholder values) | P0 | BOOT | No hardcoded colors in components | ✅ |
| FE-1.2 | Base UI components (shadcn): Button, Card, Dialog, Sheet, Input, Dropdown, Tooltip, Tabs, Badge, Skeleton | P0 | BOOT | In `components/ui/` | ✅ |
| FE-1.3 | Motion tokens + wrappers: `FadeIn`, `Stagger`, `CountUp`, `PageTransition`, `MagneticButton` | P0 | BOOT | In `components/motion/` | ✅ |
| FE-1.4 | GSAP helper (`useGsapContext`) with cleanup | P0 | BOOT | Sample timeline cleans up | ✅ |
| FE-1.5 | Lenis hook synced with ScrollTrigger | P1 | FE-1.4 | Smooth scroll on test page | ✅ |
| FE-1.6 | Reduced-motion handling across wrappers | P0 | FE-1.3 | OS setting respected | ✅ |
| FE-1.7 | Review contracts v1 (BE-1.14) — request changes in BE's file | P0 | BE-1.x | Approved | ✅ Approved with requests (see below) |
| FE-1.8 | Mock fixtures: CSE, Sem 1–8, full Sem 3 (subjects, units, topics), students, faculty | P0 | FE-1.7 | `mocks/fixtures/*` typed by contracts | ✅ |
| FE-1.9 | Mock fixtures: notes, links, quiz attempts, assignments, 60 days activity, notifications | P0 | FE-1.8 | Typed by contracts | ✅ |
| FE-1.10 | `mocks/gateway.ts` implementing full `NodusGateway` (in-memory, mutations work during session) | P0 | FE-1.8, FE-1.9 | Type-checks against interface | ✅ |
| FE-1.11 | Mock AI responses (canned tutor answers with citations, sample quiz, analysis) | P0 | FE-1.10 | AI screens buildable offline | ✅ |
| FE-1.12 | Providers in `app/layout.tsx` (TanStack Query, theme, Lenis; auth provider when BE requests) | P0 | BOOT | App boots with providers | ✅ |

---

### Mock mode notes (FE-1)

- `mocks/store.ts` builds an in-memory world from `mocks/fixtures/*` on first use (kept on `globalThis`, so edits survive hot reload; restart the dev server to reset). Dates are relative to "today".
- Pick the mock user with the `nodus-mock-role` cookie: `student` (default, Aarav Sharma, CSE Sem 3 · A), `faculty` (Dr. Meera Iyer), `new-student` (no profile → onboarding), `signed-out`.
- `MOCK_LATENCY_MS` adds a delay to every call (to see skeletons). `MOCK_AI_ERROR=RATE_LIMITED` or `AI_UNAVAILABLE` forces AI errors (FE-7.9).
- `mocks/progress.ts` mirrors the §6.6 formula **for fake data only** so the graph reacts to new notes/quizzes; the real formula stays in `lib/progress`.
- Lenis is **opt-in** (`<SmoothScroll>` in a layout/page), not global — it fights the graph canvas, editor and inner scroll panels.
- Dev playground for motion wrappers: `/motion-lab` (404 in production).

---

## FE-3 — Auth & app shell (Week 3) → INT-1

| ID | Task | Pri | Needs | Done when | Status |
|---|---|---|---|---|---|
| FE-3.1 | Login + signup pages | P0 | FE-1.2 | Calls auth actions | ✅ |
| FE-3.2 | Student onboarding (branch, semester, section) | P0 | FE-3.1 | Submits onboarding action | ✅ |
| FE-3.3 | Student shell: top nav (7 links + semester switcher, search, bell, profile), breadcrumbs, mobile menu — **no sidebar** | P0 | FE-1.2 | All student routes reachable (placeholders) | ✅ |
| FE-3.4 | Faculty shell: top nav (5 links + subject/section switcher, bell, profile), mobile menu — **no sidebar** | P0 | FE-1.2 | All faculty routes reachable | ✅ |
| FE-3.5 | Semester switcher (locked future semesters with lock icon) | P0 | FE-3.3 | Selection changes page data | ✅ |
| FE-3.6 | Subject + Section switcher (faculty) | P0 | FE-3.4 | Selection changes page data | ✅ |
| FE-3.7 | Route transitions for the shell | P1 | FE-1.3 | Shell stays, content transitions | ✅ |
| FE-3.8 | Profile page (info, theme, logout) | P1 | FE-3.3 | Works on mocks | ✅ |
| FE-3.9 | **INT-1**: switch `auth,curriculum` to real; fix UI issues | P0 | BE-3.7 | Works with real data | ⬜ |

---

## FE-4 — Faculty content & unit page (Week 4) → INT-2

| ID | Task | Pri | Needs | Done when | Status |
|---|---|---|---|---|---|
| FE-4.1 | Faculty content page: subjects → units → topics tree | P0 | FE-3.4 | Lists own subjects | ✅ |
| FE-4.2 | Units + topics CRUD UI with drag-to-reorder | P0 | FE-4.1 | Calls actions; optimistic UI | ✅ |
| FE-4.3 | Upload UI (drag & drop, section visibility, ingestion status) | P0 | FE-4.1 | Upload flow complete on mocks | ✅ |
| FE-4.4 | Student subjects list page | P0 | FE-3.3 | Subjects for selected semester | ✅ |
| FE-4.5 | Student unit page (topics, resources, assignment slot, AI action buttons) | P0 | FE-4.4 | Resource open/download works | ✅ |
| FE-4.6 | **INT-2**: switch `resources` to real | P0 | BE-4.9 | Works with real data | ⬜ |

---

## FE-5 — Notes (Week 5) → INT-3

| ID | Task | Pri | Needs | Done when | Status |
|---|---|---|---|---|---|
| FE-5.1 | Notes list (filter by subject/unit/topic, tags, search) | P0 | FE-3.3 | Lists notes | ✅ |
| FE-5.2 | Create note under a topic (from list, unit page, graph panel) | P0 | FE-5.1 | Opens editor | ✅ |
| FE-5.3 | Tiptap editor (headings, lists, checklist, code, table, image) | P0 | FE-5.2 | Formatting works | ✅ |
| FE-5.4 | Debounced auto-save + "Saved" indicator | P0 | FE-5.3 | No save button needed | ✅ |
| FE-5.5 | Slash (`/`) menu | P0 | FE-5.3 | Inserts blocks | ✅ |
| FE-5.6 | Link picker (note / topic / unit, create new inline) | P0 | FE-5.3 | Saves links by ID | ✅ |
| FE-5.7 | Backlinks panel + hover preview | P0 | FE-5.6 | Shows backlinks; preview on hover | ✅ |
| FE-5.8 | Ctrl+K quick switcher | P1 | FE-5.1 | Jumps to note/unit/topic | ✅ |
| FE-5.9 | Export Markdown button | P1 | FE-5.3 | Downloads `.md` | ✅ |
| FE-5.10 | **INT-3**: switch `notes` to real | P0 | BE-5.8 | Works with real data | ⬜ |

---

## FE-6 — Graph View (Weeks 6–7) → INT-4

| ID | Task | Pri | Needs | Done when | Status |
|---|---|---|---|---|---|
| FE-6.1 | `TreeGraph` with React Flow + dagre (left → right) | P0 | FE-1.10 | Semester → subjects → units rendered | ✅ |
| FE-6.2 | Custom nodes: name, %, progress ring, status color | P0 | FE-6.1 | Status ranges correct | ✅ |
| FE-6.3 | Expand/collapse subjects with animated layout | P0 | FE-6.1 | Smooth | ✅ |
| FE-6.4 | Prerequisite dashed edges | P1 | FE-6.1 | Visible | ✅ |
| FE-6.5 | Hover card (subject + unit variants) | P0 | FE-6.2 | Shows %, topics ✅/⬜, notes, quiz, deadline | ✅ |
| FE-6.6 | Side panel (topics, + Add note, resources, assignment, Ask AI, Practice) | P0 | FE-6.2 | Opens/closes with animation; actions navigate | ✅ |
| FE-6.7 | Controls: zoom, pan, fit view, legend | P0 | FE-6.1 | Work | ✅ |
| FE-6.8 | Search fly-to node | P1 | FE-6.1 | Camera animates to node | ✅ |
| FE-6.9 | Keyboard navigation (Tab / Enter / Esc) | P1 | FE-6.6 | Accessible | ✅ |
| FE-6.10 | Faculty Graph View (class data, weak topics, students needing help, edit topics) | P0 | FE-6.6 | Same component, faculty data | ✅ |
| FE-6.11 | "Topic covered" micro-animation | P1 | FE-6.2 | Node animates on change | ✅ |
| FE-6.12 | **INT-4**: switch `graph` to real | P0 | BE-6.7 | Works with real data | ⬜ |

---

## FE-7 — AI UI (Weeks 7–8) → INT-5

| ID | Task | Pri | Needs | Done when | Status |
|---|---|---|---|---|---|
| FE-7.1 | Tutor chat (`useChat`, streaming, typing indicator) | P0 | FE-1.11 | Streams mock answers | ⬜ |
| FE-7.2 | Scope selector (semester / subject / unit) | P0 | FE-7.1 | Sent with request | ⬜ |
| FE-7.3 | Citation chips → open resource page / note | P0 | FE-7.1 | Clickable | ⬜ |
| FE-7.4 | "Not covered" state + conversation history list | P1 | FE-7.1 | Renders | ⬜ |
| FE-7.5 | Practice: generate quiz (unit/topic) | P0 | FE-1.11 | Shows quiz | ⬜ |
| FE-7.6 | Quiz player (one question at a time, feedback, explanation, score, Lottie celebration) | P0 | FE-7.5 | Submits attempt | ⬜ |
| FE-7.7 | Analyze Note panel in editor (summary, title, tags, todos, suggested links) | P0 | FE-5.3 | Apply suggestions in one click | ⬜ |
| FE-7.8 | Gap finder UI (unit page + side panel) | P0 | FE-6.6 | Lists missing topics + "Add note" | ⬜ |
| FE-7.9 | Rate-limit / error states + retry; **INT-5**: switch `ai` to real | P0 | BE-7.11 | Works with real AI | ⬜ |

---

## FE-8 — Assignments & notifications (Week 9) → INT-6

| ID | Task | Pri | Needs | Done when | Status |
|---|---|---|---|---|---|
| FE-8.1 | Faculty: create assignment form (sections, due date/time) | P0 | FE-3.4 | Calls action | ⬜ |
| FE-8.2 | Faculty: assignments list with pending counts | P0 | FE-8.1 | Renders | ⬜ |
| FE-8.3 | Faculty: marking table (status toggles, marks, remark, bulk) | P0 | FE-8.2 | Fast keyboard-friendly marking | ⬜ |
| FE-8.4 | Faculty tracker (submission donut per section, student list) | P0 | FE-8.3 | Renders | ⬜ |
| FE-8.5 | Student assignments page (live countdown, status badge, no upload) | P0 | FE-3.3 | Countdown ticks | ⬜ |
| FE-8.6 | Assignment block in side panel + unit page | P0 | FE-6.6, FE-4.5 | Shown in both | ⬜ |
| FE-8.7 | Notification bell (unread count, list, mark read) | P1 | FE-3.3 | Works | ⬜ |
| FE-8.8 | **INT-6**: switch `assignments,notifications` to real | P0 | BE-8.8 | Works with real data | ⬜ |

---

## FE-9 — Dashboards (Weeks 9–10) → INT-7

| ID | Task | Pri | Needs | Done when | Status |
|---|---|---|---|---|---|
| FE-9.1 | Stat cards with count-up | P0 | FE-1.3 | Animated values | ⬜ |
| FE-9.2 | Coverage rings per subject (click → graph) | P0 | FE-9.1 | Fill on load | ⬜ |
| FE-9.3 | Activity heatmap (Nivo calendar) | P0 | FE-9.1 | 60+ days shown | ⬜ |
| FE-9.4 | Deadline timeline with countdown chips | P0 | FE-9.1 | Ordered by due date | ⬜ |
| FE-9.5 | Subject radar + quiz trend | P2 | FE-9.1 | Render | ⬜ |
| FE-9.6 | Faculty dashboard (section comparison, weak units heatmap, submission donuts, AI topics) | P0 | FE-9.1 | Render | ⬜ |
| FE-9.7 | Skeletons + empty states for every widget | P0 | FE-9.1…9.6 | No blank widgets | ⬜ |
| FE-9.8 | **INT-7**: switch `dashboard` to real | P0 | BE-9.4 | Works with real data | ⬜ |

---

## FE-10 — Design replication & motion polish (Weeks 10–11)

| ID | Task | Pri | Needs | Done when | Status |
|---|---|---|---|---|---|
| FE-10.1 | Apply final design tokens | P0 | H-04 | Match design | ⬜ |
| FE-10.2 | Replicate auth + onboarding | P0 | FE-10.1 | Checklist AGENTS.md §12.2 | ⬜ |
| FE-10.3 | Replicate student screens | P0 | FE-10.1 | Checklist passes | ⬜ |
| FE-10.4 | Replicate faculty screens | P0 | FE-10.1 | Checklist passes | ⬜ |
| FE-10.5 | Landing page: GSAP hero, SplitText, Lenis, scroll sections | P0 | FE-1.4, FE-1.5 | Matches design | ⬜ |
| FE-10.6 | Optional R3F/WebGL hero (lazy-loaded) | P2 | FE-10.5 | Smooth, no load-time hit | ⬜ |
| FE-10.7 | Micro-interactions (magnetic buttons, tilt, pressed states) | P1 | FE-10.3 | Consistent | ⬜ |
| FE-10.8 | Lottie empty states + celebrations | P1 | FE-10.3 | Added | ⬜ |
| FE-10.9 | View Transitions API + Motion fallback | P1 | FE-3.7 | All routes | ⬜ |
| FE-10.10 | Responsive pass (mobile, tablet, desktop) | P0 | FE-10.3, FE-10.4 | No breaks | ⬜ |
| FE-10.11 | Accessibility + reduced-motion pass | P0 | FE-10.3 | AGENTS.md §15 met | ⬜ |
| FE-10.12 | Performance pass (lazy-load graph, editor, charts, 3D, Lottie; 60fps) | P0 | FE-10.3 | No jank | ⬜ |

---

## FE-11 — Testing & demo (Weeks 11–12) → INT-8

| ID | Task | Pri | Done when | Status |
|---|---|---|---|---|
| FE-11.1 | `docs/test_cases.md` (UI cases + BE cases sent by BE) | P0 | 40+ cases | ⬜ |
| FE-11.2 | Playwright E2E for critical flows (login, write note → graph updates, tutor, quiz, faculty marking) | P0 | Pass on production | ⬜ |
| FE-11.3 | **INT-8**: verify every page with `MOCK_FEATURES` empty | P0 | No mock data anywhere | ⬜ |
| FE-11.4 | Screenshots for report + README | P0 | All key screens captured | ⬜ |
| FE-11.5 | Demo video (3–5 min) | P0 | Recorded | ⬜ |
| FE-11.6 | Final `docs/user_flow.md` + `docs/ui_design.md` | P0 | Match final UI | ⬜ |
| FE-11.7 | Remove dead mock-only UI code paths | P1 | Clean | ⬜ |

---

## FE-B — Bonus

| ID | Task | Pri | Done when | Status |
|---|---|---|---|---|
| FE-B.1 | Knowledge Web (`react-force-graph-2d`, focus/fade, side panel) | P2 | `/notes/web` works | ⬜ |
| FE-B.2 | Image to note UI (camera/upload → preview → save) | P2 | Works with BE-B.1 | ⬜ |
| FE-B.3 | Auto-link suggestion chips in editor | P2 | Works with BE-B.2 | ⬜ |
| FE-B.4 | Improve-writing bubble menu | P2 | Works with BE-B.3 | ⬜ |

---

## Requests to BE

> FE writes requests for BE here (e.g. "contract C-06 needs `deadlineAt` on HoverCardData"). BE handles them via a `contract/` PR.

| Date | Request | Status |
|---|---|---|
| 2026-10-15 | **FE-1.7 review of contracts v1: APPROVED** — OK to merge `contract/v1` and tag `contracts-v1`. Nothing blocks FE; the items below can go in a follow-up `contract/` PR. | Info |
| 2026-10-15 | **C-04 note links in content (please decide before BE-5).** The editor writes links into `contentMd`, but the links table is only changed by `addLink`/`removeLink`, so deleting a link in the editor would leave a stale row (and stale backlinks). Proposal: export the href scheme from `contracts/notes.ts` (`nodus://note/<id>`, `nodus://topic/<id>`, `nodus://unit/<id>`, e.g. `noteLinkHref(target)` + `parseNoteLinkHref(href)`), and have `updateNote` re-derive the note's links from those hrefs whenever `contentMd` is sent. `addLink`/`removeLink` can stay for the link picker. FE mocks + fixtures already use this scheme. | Open |
| 2026-10-15 | **C-04 images in notes.** §9.3 lists images in the editor, but storage is faculty-only and `contentMd` is capped at 200 000 chars (base64 images would blow it). FE plan for v1: images **by URL only**, no upload. Tell FE if you'd rather add a note-image upload route. | Open |
| 2026-10-15 | **C-02 `Unit.title` convention.** Please confirm titles are stored *without* the "Unit 3 –" prefix (e.g. `"Graphs"`); FE renders `Unit {order} – {title}`. Mocks follow this; please make the seed (BE-2) match. | Open |
| 2026-10-15 | **C-06 faculty hover cards** exist only for unit nodes. FE will show just label + % for the subject root and topic nodes in v1. Optional later: a subject variant (class average + bands). | Info |
| 2026-10-15 | **`docs/api_contract.md`:** please state that sign-up always creates a *student* and faculty accounts come from the seed, so FE builds no role picker on `/signup`. | Open |
| 2026-10-15 | FYI: `UpdateNoteInput.title` is `min(1)` — FE never sends an empty title (falls back to "Untitled note"). Subjects page will read per-subject % from `getStudentGraph` subject nodes, so no new method is needed. | Info |
| 2026-10-15 | FYI: `mocks/gateway.ts` + `mocks/ai-tutor.ts` are now real mocks (FE-1.10/1.11). `mockTutorReply(question, scope)` keeps the same signature the tutor route calls; it answers as the mock demo student. | Info |
| 2026-10-15 | **FE-3 Shells & Auth completed.** Created shells (student & faculty), route guards, top navigation without sidebars, onboarding, semester & subject/section switchers, ProfileCard, and route transitions. Please ensure Neon Auth session cookie and auth provider proxy are synced for SSR viewer resolution when switching from mocks to real in INT-1. | Info |
| 2026-10-15 | **FE-5 Notes completed.** Implemented Notes list with debounced search, subject/unit/topic filters, tags, and pagination; Tiptap markdown editor with debounced auto-save (~1s, dirty-fields only), slash menu, link picker (`nodus://` URI scheme), backlinks panel, link hover preview, Ctrl+K quick switcher, and Markdown export. Ready for INT-3 (BE-5 real notes). | Info |
| 2026-10-19 | **FE-6 Graph View completed.** Built tree layout using React Flow + Dagre (left to right), custom semester/subject/unit/topic nodes with progress rings and 4-band status colors, expandable/collapsible subjects with animated re-layout, dashed prerequisite edges, spring hover cards (subject, unit, faculty variants), slide-in side panels (student & faculty), in-graph search with camera fly-to, keyboard navigation (Tab/Enter/Esc), and topic covered micro-animation. Ready for INT-4 (BE-6 real graph). | Info |
