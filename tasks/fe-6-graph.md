# Task: fe-6-graph  (worker: Gemini / agy, role: FRONTEND)

## Setup (do first)
- Work ONLY in the worktree `E:\Projects\College Projects\nodus-fe6` on branch `fe/FE-6-graph`.
- First run `pwd` and `git branch --show-current`. If either is wrong, STOP and report.
- Read `AGENTS.md` (sections 3, 8, 9.2, 9.7, 11, 12, 15), `docs/roadmap/FRONTEND.md` (FE-6), `contracts/graph.ts`, `contracts/progress.ts`, `docs/ui_design.md`, `app/globals.css` (tokens), and existing `components/layout/*` (PageBody, SectionHeader, GridFrame) for style.

## Goal
Build FE-6.1 to FE-6.11: the tree Graph View for students and faculty, against the mock gateway (`MOCK_FEATURES` includes `graph`). Never import `lib/db`, `lib/ai`, `lib/progress`, `lib/server-gateway`.

## Files allowed (FE-owned only)
- `components/graph/**` (new), `components/ui/**` additions if needed
- `app/(student)/graph/**`, `app/(faculty)/faculty/graph/**`
- `hooks/**`, `stores/**` (Zustand store for selection/expanded nodes)
- `mocks/**` (extend `mocks/gateway.ts` graph methods + fixtures if the graph data is thin)
- `docs/roadmap/FRONTEND.md` (tick FE-6 tasks only), `docs/user_flow.md` if you document the flow

## Do NOT touch
`contracts/**`, `lib/**`, `app/api/**`, frozen files. Do not install packages (React Flow `@xyflow/react` and `dagre` are already installed). Do not run build/lint/tests.

## Design rules
Follow the blueprint-paper theme already in `globals.css`: tokens only, no hex values, no `text-[Npx]` arbitrary sizes, no sidebar, no radial view. Semester switcher stays in the top nav, NOT in the graph. Status color AND % AND icon/label (never color alone). Motion: transform/opacity only, `components/motion/tokens.ts` presets, respect reduced motion, lazy-load the graph with `next/dynamic`.

## Steps (print "STEP n DONE" after each)
1. `TreeGraph` with React Flow + dagre, left to right, semester -> subjects -> units, fed by `getGateway().graph`. Server page fetches, client component renders. Loading skeleton, empty state, error state.
2. Custom nodes: name, %, progress ring, status color from the 4 bands.
3. Expand/collapse subjects with animated layout (Motion). Prerequisite edges dashed.
4. Hover card (subject and unit variants): %, topics covered/not, notes count, quiz average, nearest deadline. Spring in.
5. Side panel on unit click, slides in from the right, graph stays visible: topics with covered flag and note count, "+ Add note" for empty topics (use the existing create-note flow), faculty resources, assignment block with countdown + status, buttons **Ask AI** (`/tutor?unit=<id>`) and **Practice** (`/practice?unit=<id>`).
6. Controls: zoom, pan, fit view, legend. Search input in the graph that flies to a node. Keyboard: Tab to nodes, Enter opens panel, Esc closes.
7. Faculty graph (`/faculty/graph`): same `TreeGraph` with class data, Subject+Section from the existing faculty switcher, hover card with class average / band counts / weakest topic, side panel with topic coverage bars and "students needing help".
8. "Topic covered" micro-animation when a node's % rises. Tick FE-6.1 to FE-6.11 in `docs/roadmap/FRONTEND.md` (NOT FE-6.12, that is INT-4).

## Done when
- `/graph` and `/faculty/graph` render with mocks, all interactions above work, no forbidden imports, no hex/any.
- Commit with `feat(fe-graph): ...` messages and push the branch. Do NOT open a PR and do NOT touch `main`.

## Report (last message)
Files changed, assumptions, any contract gaps as requests for BE (write them in FRONTEND.md "Requests to BE"), anything unverified.
