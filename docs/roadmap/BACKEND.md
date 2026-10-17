# NODUS — Backend Roadmap & Tracker

> **Owner: BE agent.** Only the BE agent edits this file.
> Owns: `contracts/**`, `lib/server-gateway/**`, `lib/actions/**`, `lib/ai/**`, `lib/db/**`, `lib/progress/**`, `lib/auth/**`, `app/api/**`, `proxy.ts`, `drizzle.config.ts`, `scripts/**`, `.env.example`.
> Rules: `AGENTS.md` §3.1 and §5. Overview: [README.md](README.md).

**Status:** ⬜ Not started · 🟡 In progress · ✅ Done · ⏸ Blocked · ⏭ Skipped
**Branches:** `be/<task-id>-<slug>` · contracts: `contract/<slug>` · deps/config: `chore/<slug>`

---

## Summary

| Phase | Name | Weeks | Tasks | Done |
|---|---|---|---|---|
| BE-0 | Backend docs | 1 | 5 | 2 |
| BOOT | Repo bootstrap (on `main`, before split) | 1 | 12 | 10 |
| BE-1 | Contract sprint | 2 | 14 | 14 |
| BE-2 | Database & seed | 2–3 | 9 | 9 |
| BE-3 | Auth & roles | 3 | 7 | 6 |
| BE-4 | Curriculum, resources & ingestion | 4 | 9 | 8 |
| BE-5 | Notes | 5 | 8 | 6 |
| BE-6 | Progress engine & graph data | 6–7 | 7 | 0 |
| BE-7 | AI | 7–8 | 11 | 0 |
| BE-8 | Assignments & notifications | 9 | 8 | 0 |
| BE-9 | Dashboard data | 9–10 | 4 | 0 |
| BE-10 | Hardening & performance | 10–11 | 5 | 0 |
| BE-11 | Testing, deployment & docs | 11–12 | 6 | 0 |
| BE-B | Bonus | anytime | 4 | 0 |
| | **Total** | | **109** | **55** |

---

## BE-0 — Backend docs (Week 1)

| ID | Task | Pri | Done when | Status |
|---|---|---|---|---|
| BE-0.1 | `docs/database_schema.md` + Mermaid ER diagram | P0 | All tables (AGENTS.md §7) with columns, keys, relations | ✅ |
| BE-0.2 | `docs/architecture.md` (system + RAG pipeline diagrams) | P0 | Diagrams render; gateway/mock pattern explained | ⬜ |
| BE-0.3 | `docs/progress_logic.md` with 3 worked examples | P0 | Matches AGENTS.md §6.6 | ⬜ |
| BE-0.4 | DFD (L0–L2) + sequence diagrams (tutor question, faculty marking, upload ingestion) | P1 | In `docs/architecture.md` or `docs/diagrams.md` | ⬜ |
| BE-0.5 | `docs/environment_setup.md` skeleton (accounts, env vars, commands) | P0 | Steps to run locally | ✅ |

---

## BOOT — Repo bootstrap (Week 1, done once on `main` before FE starts)

> Everything that would otherwise cause conflicts is created **once** here. After BOOT, frozen files change only via `chore/` PRs.

| ID | Task | Pri | Done when | Status |
|---|---|---|---|---|
| BOOT-01 | Create Next.js app (App Router, TS strict, Tailwind, ESLint) | P0 | `npm run dev` works | ✅ |
| BOOT-02 | Install **all** known dependencies at once (AGENTS.md §2: motion, gsap, lenis, @react-three/fiber, @react-three/drei, lottie-react, @xyflow/react, dagre, recharts, @nivo/calendar, tiptap packages, @tanstack/react-query, zustand, date-fns, lucide-react, zod, ai, @ai-sdk/google, @ai-sdk/groq, drizzle-orm, drizzle-kit, @neondatabase/serverless, Neon Auth SDK, pdf/ppt parsers, server-only, react-force-graph-2d) | P0 | `package.json` + lockfile committed | ✅ |
| BOOT-03 | shadcn/ui init (`components.json`, `lib/utils.ts`) | P0 | `cn()` available | ✅ |
| BOOT-04 | Full folder skeleton (AGENTS.md §3) with `.gitkeep` | P0 | All folders exist | ✅ |
| BOOT-05 | Path aliases, Prettier, ESLint rule blocking FE imports of `lib/db`, `lib/ai`, `lib/progress`, `lib/server-gateway` from `app/(…)`, `components`, `hooks`, `stores` | P0 | Lint fails on forbidden import | ✅ |
| BOOT-06 | `lib/gateway/index.ts` — `getGateway()` choosing mock/real **per feature** from `MOCK_FEATURES` (server-only) | P0 | Returns mock when flag set, real otherwise | ✅ |
| BOOT-07 | Empty `contracts/gateway.ts` (`NodusGateway` interface) + `mocks/gateway.ts` and `lib/server-gateway/index.ts` stubs that compile | P0 | Both stubs satisfy the (empty) interface | ✅ |
| BOOT-08 | `package.json` scripts: `dev` (3000), `dev:be` (3001), `db:*`, `lint`, `build` | P0 | Scripts listed in AGENTS.md §4 exist | ✅ |
| BOOT-09 | `.env.example` + env validation (`lib/env.ts`, BE-owned) | P0 | Missing vars fail clearly | ✅ |
| BOOT-10 | `.gitignore`, GitHub repo, branch protection on `main` (PR required) | P0 | Direct push to `main` blocked | 🟡 Local repo + .gitignore done; GitHub repo + branch protection pending |
| BOOT-11 | PR template with checklist (owner files only, roadmap updated, contracts unchanged or in own PR) | P1 | `.github/pull_request_template.md` exists | ✅ |
| BOOT-12 | Merge BOOT to `main`, tag `v0-bootstrap`, notify FE | P0 | FE can branch from it | 🟡 Initial commit on local `main`; tag + push pending GitHub |

---

## BE-1 — Contract sprint (Week 2)

> Goal: FE can build the **entire UI** against mocks. Open one `contract/v1` PR (or a few small ones), FE reviews.

| ID | Task | Pri | Done when | Status |
|---|---|---|---|---|
| BE-1.1 | C-00 `contracts/common.ts` | P0 | Exported and documented | ✅ |
| BE-1.2 | C-01 `contracts/auth.ts` | P0 | 〃 | ✅ |
| BE-1.3 | C-02 `contracts/curriculum.ts` | P0 | 〃 | ✅ |
| BE-1.4 | C-03 `contracts/resources.ts` | P0 | 〃 | ✅ |
| BE-1.5 | C-04 `contracts/notes.ts` | P0 | 〃 | ✅ |
| BE-1.6 | C-05 `contracts/progress.ts` + C-06 `contracts/graph.ts` | P0 | 〃 | ✅ |
| BE-1.7 | C-07 `contracts/ai.ts` | P0 | 〃 | ✅ |
| BE-1.8 | C-08 `contracts/assignments.ts` | P0 | 〃 | ✅ |
| BE-1.9 | C-09 `contracts/dashboard.ts` + C-10 `contracts/notifications.ts` | P0 | 〃 | ✅ |
| BE-1.10 | C-11 `NodusGateway` interface complete | P0 | Mock + real stubs must implement it | ✅ |
| BE-1.11 | Server action stubs in `lib/actions/*` for every mutation (validate with Zod → call `getGateway()`) | P0 | FE can import every action | ✅ |
| BE-1.12 | API route stubs (`app/api/ai/tutor`, `app/api/upload`, `app/api/cron/reminders`) returning mock stream/data when flagged | P0 | Routes respond in mock mode | ✅ |
| BE-1.13 | `docs/api_contract.md` generated/written from contracts | P0 | Every function + action + route listed | ✅ |
| BE-1.14 | FE review done → merge `contract/v1` → tag `contracts-v1` | P0 | FE approved | ✅ Approved by FE (FE-1.7), tagged `contracts-v1` |

---

## BE-2 — Database & seed (Weeks 2–3)

| ID | Task | Pri | Needs | Done when | Status |
|---|---|---|---|---|---|
| BE-2.1 | Neon project, enable `pgvector`, dev + prod branches | P0 | H-06 | `DATABASE_URL` works | ✅ `production` + permanent `dev` branch (`neon.ts`), pgvector on both |
| BE-2.2 | Drizzle config + client + migration scripts | P0 | BOOT | `db:generate/migrate/studio` work | ✅ |
| BE-2.3 | Schema: users, student_profiles, branches, semesters, subjects, subject_prerequisites, units, topics, faculty map | P0 | BE-2.2 | Migrated | ✅ |
| BE-2.4 | Schema: resources, resource_chunks (vector + index) | P0 | BE-2.3 | Migrated | ✅ |
| BE-2.5 | Schema: notes, note_chunks, note_links | P0 | BE-2.3 | Migrated | ✅ |
| BE-2.6 | Schema: assignments, assignment_sections, assignment_status | P0 | BE-2.3 | Migrated | ✅ |
| BE-2.7 | Schema: quizzes, quiz_attempts, ai_conversations, ai_messages, note_analyses, activity_log, notifications | P0 | BE-2.3 | Migrated | ✅ |
| BE-2.8 | Seed script (AGENTS.md §17), using real syllabus if provided (H-05) | P0 | BE-2.3…2.7 | `db:seed` fills realistic data | ✅ |
| BE-2.9 | Demo logins in `docs/environment_setup.md` | P0 | BE-2.8 | Listed | ✅ |

---

## BE-3 — Auth & roles (Week 3) → INT-1

| ID | Task | Pri | Needs | Done when | Status |
|---|---|---|---|---|---|
| BE-3.1 | Neon Auth server setup; request provider in `app/layout.tsx` from FE if needed | P0 | BE-2.3 | Sign up / log in / log out work | ✅ `lib/auth/server.ts`, `/api/auth/[...path]`, `proxy.ts`; sign-up/in/out verified |
| BE-3.2 | `lib/auth/guards.ts` (`requireUser`, `requireStudent`, `requireFaculty`) | P0 | BE-3.1 | Used by every action | ✅ `requireViewer/Student/StudentAccount/Faculty/FacultyTeaches`, `assertSemesterOpen` |
| BE-3.3 | `proxy.ts`: role redirects, onboarding redirect, protect route groups | P0 | BE-3.2 | Student → `/dashboard`, Faculty → `/faculty/dashboard` | ✅ |
| BE-3.4 | Gateway `auth`: session, onboarding, profile | P0 | BE-3.2 | Matches C-01 | ✅ |
| BE-3.5 | Selected semester / subject+section persistence (cookie) + locked-semester enforcement | P0 | BE-3.4 | Future semester requests rejected | ✅ |
| BE-3.6 | Gateway `curriculum` read: semesters, subjects, units, topics, prerequisites | P0 | BE-2.8 | Matches C-02 | ✅ |
| BE-3.7 | **INT-1** support: fix data issues found in integration | P0 | FE-3.x | Auth + curriculum run with real data | 🟡 Ready — waiting for FE-3.x (INT-1) |

---

## BE-4 — Curriculum CRUD, resources & ingestion (Week 4) → INT-2

| ID | Task | Pri | Needs | Done when | Status |
|---|---|---|---|---|---|
| BE-4.1 | Faculty: units CRUD + reorder (own subjects only) | P0 | BE-3.2 | Matches C-02 | ✅ |
| BE-4.2 | Faculty: topics CRUD + reorder | P0 | BE-4.1 | Order respected everywhere | ✅ |
| BE-4.3 | Storage bucket + `app/api/upload` (PDF/PPT/PPTX, size limit) | P0 | H-06 | File stored, `resources` row created | ✅ Real upload in `resourcesApi`, storage upload, `resources` row created |
| BE-4.4 | Section visibility filter on all resource queries | P0 | BE-4.3 | Students see only their sections | ✅ Filtered by student's section on reads, semester lock enforced |
| BE-4.5 | Text extraction per page/slide | P0 | BE-4.3 | Text + page number saved | ✅ `lib/ai/rag/extract.ts` (PDF via pdf-parse, PPT/PPTX via officeparser) |
| BE-4.6 | Chunking + Gemini embeddings → `resource_chunks` (`lib/ai/rag/`) | P0 | BE-4.5 | Chunks with embeddings stored | ✅ `chunk.ts` (~500–800 tokens) + `embed.ts` (Gemini via AI SDK, NULL fallback) |
| BE-4.7 | Ingestion status (processing / ready / failed) | P1 | BE-4.6 | Exposed via C-03 | ✅ `ingest.ts` pipeline updates status to ready/failed, exposed in `Resource` |
| BE-4.8 | Activity log helper (`logActivity`) + `resource_opened` | P1 | BE-2.7 | Rows created | ✅ `lib/db/queries/activity.ts`, logs `resource_opened` on `getResourceAccess` |
| BE-4.9 | **INT-2** support | P0 | FE-4.x | Resources run with real data | 🟡 Ready for integration with FE |

---

## BE-5 — Notes (Week 5) → INT-3

| ID | Task | Pri | Needs | Done when | Status |
|---|---|---|---|---|---|
| BE-5.1 | Notes CRUD (owner-only, always under a topic) | P0 | BE-3.2 | Matches C-04 | ✅ Owner-only, branch/open semester checked, mapped to C-04 |
| BE-5.2 | Auto-save action (idempotent update, `updated_at`) | P0 | BE-5.1 | Frequent saves are safe | ✅ Partial update, updated_at bump, title min 1 validation |
| BE-5.3 | Links by ID (note/topic/unit) + backlinks query | P0 | BE-5.1 | Rename never breaks links | ✅ addLink/removeLink, diff sync on save from `nodus://` hrefs, backlinks with snippets, link preview |
| BE-5.4 | Full-text search + tags | P1 | BE-5.1 | Search returns own notes only | ✅ `search_vector` GIN index + ILIKE fallback, tag array filter, `listTags()` |
| BE-5.5 | Quick-switcher search (notes, units, topics) | P1 | BE-5.4 | One query returns mixed results | ✅ Ctrl+K ranked search across notes, topics, units, subjects in semester |
| BE-5.6 | Note chunking + embeddings (debounced / background) | P0 | BE-4.6 | `note_chunks` updated after edits | ✅ `rechunkAndEmbedNote()` chunks & embeds on note save in background (`waitUntil`), replaces `note_chunks` |
| BE-5.7 | Markdown export route + `note_created/updated` activity | P1 | BE-5.1 | `.md` download; activity rows | ✅ `exportMarkdown()` (.md filename + content), `activity_log` rows with 10-minute throttling for updates |
| BE-5.8 | **INT-3** support | P0 | FE-5.x | Notes run with real data | 🟡 Ready for integration with FE |

---

## BE-6 — Progress engine & graph data (Weeks 6–7) → INT-4

| ID | Task | Pri | Needs | Done when | Status |
|---|---|---|---|---|---|
| BE-6.1 | `lib/progress/`: topic, unit, subject, semester % | P0 | BE-5.1 | Matches worked examples in `progress_logic.md` | ✅ |
| BE-6.2 | Class-average progress per section + weakest topic + students needing help | P0 | BE-6.1 | Correct for seeded data | ✅ |
| BE-6.3 | Student graph data (nodes, edges, prerequisites, %) | P0 | BE-6.1 | Matches C-06 | ✅ |
| BE-6.4 | Hover card + side panel data (topics ✅/⬜, notes, quiz, resources, assignment) | P0 | BE-6.3 | Matches C-06 | ✅ |
| BE-6.5 | Faculty graph data (class-level) | P0 | BE-6.2 | Matches C-06 | ✅ |
| BE-6.6 | Unit tests for progress functions | P1 | BE-6.1 | Tests cover edge cases (no quiz, no topics) | ⬜ |
| BE-6.7 | **INT-4** support | P0 | FE-6.x | Graph runs with real data | ⬜ |

---

## BE-7 — AI (Weeks 7–8) → INT-5

| ID | Task | Pri | Needs | Done when | Status |
|---|---|---|---|---|---|
| BE-7.1 | `lib/ai/config.ts` (provider, models, embedding dim) + `prompts/` + `schemas.ts` | P0 | BOOT | Single source for models/prompts | ✅ Config with Gemini + Groq fallback, typed schemas, modular prompts |
| BE-7.2 | Retrieval: vector search over resource + own note chunks with scope & permission filters | P0 | BE-4.6, BE-5.6 | Only allowed chunks returned | ✅ `lib/ai/rag/retrieve.ts` pgvector cosine distance, scope/branch/section filters, private notes |
| BE-7.3 | `app/api/ai/tutor` streaming with citations | P0 | BE-7.2 | Stream + citation IDs (C-07) | ✅ Streaming UI message stream with `[S1]`, `[S2]` citation metadata |
| BE-7.4 | "Not covered" fallback when retrieval is weak | P0 | BE-7.3 | Off-syllabus question → fallback | ✅ Distance threshold check + syllabus suggestion |
| BE-7.5 | Save conversations/messages + `ai_question` activity | P1 | BE-7.3 | History persists | ✅ `ai_conversations`, `ai_messages`, best matching `topicId`, `logActivity` |
| BE-7.6 | Quiz generation (unit/topic) + cache | P0 | BE-7.1 | Valid Zod-checked quiz stored | ✅ `generateQuizService` from faculty chunks, 4 options, explanations, cached |
| BE-7.7 | Quiz attempts → score → progress update | P0 | BE-7.6, BE-6.1 | Progress changes after attempt | ✅ Scored, saved to `quiz_attempts`, activity logged; progress update has `TODO(BE-6)` seam |
| BE-7.8 | Analyze Note + cache by content hash | P0 | BE-7.1 | Cached until note changes | ✅ `analyzeNoteService` cached by SHA-256 hash in `note_analyses` |
| BE-7.9 | Gap finder (progress + AI explanation) | P0 | BE-6.1, BE-7.2 | Missing topics with reasons | ✅ Missing & weak topics with AI explanations; coverage signal has `TODO(BE-6)` seam |
| BE-7.10 | Rate-limit / provider error handling → typed `AiError` | P0 | BE-7.3 | No crashes on quota | ✅ `mapAiError` maps 429 to `RATE_LIMITED` with `retryAfterSeconds: 60`, others to `AI_UNAVAILABLE` |
| BE-7.11 | **INT-5** support (+ optional Groq fallback, P2) | P0 | FE-7.x | AI runs for real | 🟡 Ready for integration with FE (aiApi wired into serverGateway) |

---

## BE-8 — Assignments & notifications (Week 9) → INT-6

| ID | Task | Pri | Needs | Done when | Status |
|---|---|---|---|---|---|
| BE-8.1 | Create/list assignments for own subjects + sections | P0 | BE-3.2 | Matches C-08 | ✅ |
| BE-8.2 | Marking: Submitted / Late / Not submitted + marks + remark | P0 | BE-8.1 | Saved per student | ✅ |
| BE-8.3 | Bulk marking | P1 | BE-8.2 | One call marks many | ✅ |
| BE-8.4 | Student assignment view (status, due date) | P0 | BE-8.1 | Only own sections | ✅ |
| BE-8.5 | Section tracker data | P0 | BE-8.2 | Counts correct | ✅ |
| BE-8.6 | Notifications CRUD + unread count | P1 | BE-2.7 | Matches C-10 | ✅ |
| BE-8.7 | Triggers (new resource, new assignment, status marked) + reminders via `app/api/cron/reminders` (Vercel Cron) | P1 | BE-8.6 | Notifications created | ✅ |
| BE-8.8 | **INT-6** support | P0 | FE-8.x | Runs with real data | ⬜ |

---

## BE-9 — Dashboard data (Weeks 9–10) → INT-7

| ID | Task | Pri | Needs | Done when | Status |
|---|---|---|---|---|---|
| BE-9.1 | Student dashboard loader (stats, rings, heatmap, deadlines, streak; radar + trend optional) | P0 | BE-6.1, BE-8.4 | Matches C-09 | ⬜ |
| BE-9.2 | Faculty dashboard loader (section comparison, weak units heatmap, submission donuts) | P0 | BE-6.2, BE-8.5 | Matches C-09 | ⬜ |
| BE-9.3 | Most-asked AI topics (aggregated, no content leak) | P1 | BE-7.5 | Topic counts only | ⬜ |
| BE-9.4 | **INT-7** support | P0 | FE-9.x | Dashboards real | ⬜ |

---

## BE-10 — Hardening & performance (Weeks 10–11)

| ID | Task | Pri | Done when | Status |
|---|---|---|---|---|
| BE-10.1 | DB indexes for hot queries (notes by owner/topic, progress, chunks) | P0 | Slow queries fixed | ⬜ |
| BE-10.2 | Caching (`unstable_cache` / tags) for curriculum + dashboard | P1 | Revalidated on writes | ⬜ |
| BE-10.3 | Security review: guards on every action/route, scope filters, upload validation | P0 | AGENTS.md §14 table holds | ⬜ |
| BE-10.4 | Error logging + friendly error shapes everywhere | P1 | No raw errors reach UI | ⬜ |
| BE-10.5 | Production seed (demo semester) | P0 | Prod DB looks full | ⬜ |

---

## BE-11 — Testing, deployment & docs (Weeks 11–12) → INT-8

| ID | Task | Pri | Done when | Status |
|---|---|---|---|---|
| BE-11.1 | Permission tests (notes privacy, locked semesters, faculty scope) | P0 | All pass | ⬜ |
| BE-11.2 | Backend test cases for `docs/test_cases.md` (send to FE, who owns the file) | P0 | Delivered in report | ⬜ |
| BE-11.3 | Vercel deploy: env vars, Neon prod branch, cron | P0 | Production URL works | ⬜ |
| BE-11.4 | `MOCK_FEATURES` empty in production; mocks excluded from prod path | P0 | No mock data in prod | ⬜ |
| BE-11.5 | Final update: schema, architecture, api_contract, progress_logic, environment_setup | P0 | Docs match code | ⬜ |
| BE-11.6 | **INT-8** support | P0 | Full system live | ⬜ |

---

## BE-B — Bonus

| ID | Task | Pri | Done when | Status |
|---|---|---|---|---|
| BE-B.1 | Image to note (Gemini vision → Markdown) | P2 | Action returns note draft | ⬜ |
| BE-B.2 | Auto-link suggestions | P2 | Suggestions with IDs | ⬜ |
| BE-B.3 | Improve writing (rewrite/expand/shorten/grammar) | P2 | Action returns text | ⬜ |
| BE-B.4 | Knowledge Web data (all notes + links for semester) | P2 | Contract-matched data | ⬜ |

---

## Requests to FE

> BE writes requests for FE here (e.g. "add AuthProvider to `app/layout.tsx`"). FE replies in their file.

| Date | Request | Status |
|---|---|---|
| 2026-10-15 | **Review contracts v1** (`contracts/*`, `docs/api_contract.md`) on PR `contract/v1` — FE-1.7 | Open |
| 2026-10-15 | `mocks/gateway.ts` and `mocks/ai-tutor.ts` were given **placeholders** by BE so `main` compiles (every mock method throws NOT_IMPLEMENTED). They are FE-owned — replace with real mocks in FE-1.10 / FE-1.11 | Open |
| 2026-10-15 | ESLint now allows FE to import `@/lib/auth/client` (sign-in/up/out); everything else in `lib/auth` stays blocked | Info |
| 2026-10-15 | FE: update mocks/gateway.ts curriculum faculty methods to mirror NOT_FOUND / FORBIDDEN / VALIDATION / CONFLICT behaviour; noteLinkHref/parseNoteLinkHref now exported from contracts/notes.ts | Open |
| 2026-10-15 | Real resources API, storage upload (`POST /api/upload`), and ingestion pipeline implemented (BE-4.3 to BE-4.8). FE can test against real resources by removing `resources` from `MOCK_FEATURES` | Info |
| 2026-10-15 | Real notes API implemented (BE-5.1 to 5.5, 5.7). FE can test against real notes by removing `notes` from `MOCK_FEATURES`. Server actions in `lib/actions/notes.ts` cover all NotesApi methods. Note embeddings (BE-5.6) deferred until Gemini API key is configured. | Info |
| 2026-10-17 | Real assignments API (BE-8.1 to 8.5) and notifications API (BE-8.6 to 8.7) implemented. FE can test by removing `assignments` and `notifications` from `MOCK_FEATURES`. Server action `getSectionTracker` added to `lib/actions/assignments.ts`. Exported `notifyNewResource` helper in `lib/db/queries/notifications.ts` for reviewer/FE. | Info |
