# AGENTS.md — NODUS

> Instructions for AI coding agents (Claude Code, Codex, Cursor, etc.) working in this repository.
> **Read this file fully before making any change.** When this file conflicts with a direct instruction from the user, the user wins.

---

## Table of contents

1. [Project overview](#1-project-overview)
2. [Tech stack](#2-tech-stack)
3. [Folder structure](#3-folder-structure)
4. [Commands and verification policy](#4-commands-and-verification-policy)
5. [Agent workflow](#5-agent-workflow)
6. [Core domain rules](#6-core-domain-rules)
7. [Data model](#7-data-model)
8. [Routes and pages](#8-routes-and-pages)
9. [Feature specifications](#9-feature-specifications)
10. [AI rules and RAG pipeline](#10-ai-rules-and-rag-pipeline)
11. [Motion and animation](#11-motion-and-animation)
12. [Design rules](#12-design-rules)
13. [Coding conventions](#13-coding-conventions)
14. [Security and permissions](#14-security-and-permissions)
15. [Performance and accessibility](#15-performance-and-accessibility)
16. [Environment variables](#16-environment-variables)
17. [Seed and demo data](#17-seed-and-demo-data)
18. [Git conventions](#18-git-conventions)
19. [Do's and don'ts](#19-dos-and-donts)
20. [Docs map](#20-docs-map)

---

## 1. Project overview

**NODUS** maps a student's syllabus as a knowledge graph, connects their own notes to it, and uses AI to show what they know and what they are missing.

> *"NODUS maps your syllabus, connects your notes to it, and uses AI to show you what you know and what you're missing."*

### The problem
- Faculty material is scattered (WhatsApp, Drive, email).
- Assignments are announced in class and forgotten.
- Students' notes are disconnected from the syllabus.
- Generic AI answers from the internet, not from what the professor taught.

### The solution
| Layer | Owner | What it is |
|---|---|---|
| **Official layer** | Faculty | Semester → Subject → Unit → Topic structure, with uploaded notes/slides and assignments |
| **Personal layer** | Student | Private notes written under topics and linked to each other (Obsidian-style) |
| **AI layer** | System | Gemini-powered tutor, quizzes, note analysis and gap finder, grounded only in the two layers above |

### Core loop
```
See gaps on the graph → write notes / practice quiz → topic turns ✅ → graph turns green
```

### Project nature
- **College minor project.** Code must be clean, readable and explainable in a viva.
- **Awwwards-level look and feel.** Premium visuals, rich motion, smooth interactions.
- Prefer **few features done beautifully** over many features done halfway.

---

## 2. Tech stack

| Area | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16 (App Router)** | React 19, Turbopack. Route protection lives in `proxy.ts` (formerly `middleware.ts`). Check `node_modules/next/dist/docs/` for current APIs |
| Language | **TypeScript** (strict) | No `any` |
| Styling | **Tailwind CSS 4** | Design tokens via CSS variables in `app/globals.css` (no `tailwind.config`) |
| UI primitives | **shadcn/ui** (Base UI primitives, `base-nova` style) | Accessible base components, restyled to the provided design. `cn()` from `@/lib/utils` |
| Motion | **Motion**, **GSAP**, **Lenis**, **R3F**, **Lottie** | See [Section 11](#11-motion-and-animation) |
| Graph | **React Flow** + **dagre** | Tree layout for Graph View |
| Knowledge Web (bonus) | **react-force-graph-2d** | Only when asked |
| Editor | **Tiptap** | Rich text; stored as Markdown |
| Charts | **Recharts**, **Nivo** (calendar heatmap) | |
| Database | **Neon Postgres** + **pgvector** | `pg` (node-postgres) + `attachDatabasePool` for Vercel; pooled `DATABASE_URL` for the app, `DATABASE_URL_UNPOOLED` for migrations |
| ORM | **Drizzle ORM** + drizzle-kit | Migrations in `lib/db/migrations` |
| Auth | **Neon Auth** | Role stored on the user profile |
| AI | **Google Gemini** via **Vercel AI SDK** | Chat, embeddings, vision; Groq as optional fallback |
| File storage | **Neon Object Storage** (bucket `nodus-uploads`, private) via `files-sdk` | `lib/storage` · faculty uploads only · presigned URLs on read |
| PDF/PPT parsing | `pdf-parse` / `officeparser` (or equivalent) | Text extraction for RAG |
| Validation | **Zod** | All inputs and AI structured outputs |
| Data fetching (client) | **TanStack Query** | Only where client-side fetching is needed |
| Client state | **Zustand** | Small UI state (graph selection, panels) |
| Dates | **date-fns** | Countdown timers, formatting |
| Icons | **lucide-react** | Unless the design provides its own icon set |

**Do not add other major libraries without asking the user.** Small utility packages are fine if they clearly save effort.

---

## 3. Folder structure and ownership

The project is built by **two parallel roles**: a **Backend (BE)** developer/agent and a **Frontend (FE)** developer/agent. Every file has **exactly one owner**. This is what prevents merge conflicts.

```
.
├─ app/
│  ├─ (marketing)/              # FE  landing page (public)
│  ├─ (auth)/                   # FE  login, signup, onboarding pages
│  ├─ (student)/                # FE  student pages (dashboard, graph, subjects, notes, assignments, tutor, practice)
│  ├─ (faculty)/                # FE  faculty pages (dashboard, graph, content, assignments, tracker)
│  ├─ api/                      # BE  route handlers (AI streaming, uploads, cron)
│  ├─ layout.tsx                # FE  root layout (providers added on BE's request)
│  └─ globals.css               # FE  global styles + design tokens
├─ components/                  # FE  all UI components
│  ├─ ui/  layout/  motion/  graph/  charts/  editor/  ai/  faculty/
├─ hooks/                       # FE  React hooks
├─ stores/                      # FE  Zustand stores
├─ mocks/                       # FE  mock gateway + fixtures (implements the contracts)
├─ contracts/                   # BE  (FE reviews) shared Zod schemas, types, gateway interface
├─ lib/
│  ├─ gateway/index.ts          # FROZEN  picks mock or real implementation per feature
│  ├─ utils.ts                  # FROZEN  `cn()` helper (shadcn)
│  ├─ server-gateway/           # BE  real implementation of the gateway interface
│  ├─ actions/                  # BE  server actions (thin wrappers over the gateway)
│  ├─ ai/                       # BE  config.ts, prompts/, rag/, schemas.ts
│  ├─ db/                       # BE  schema/, queries/, migrations/, seed.ts
│  ├─ progress/                 # BE  progress calculation (single source of truth)
│  └─ auth/                     # BE  session helpers, role guards
├─ proxy.ts                     # BE  auth + role redirects (Next.js 16 name for middleware)
├─ drizzle.config.ts            # BE
├─ scripts/                     # BE  one-off scripts
├─ public/                      # FE  static assets, Lottie files, fonts
├─ docs/                        # see ownership table below
├─ package.json, package-lock.json, next.config.ts, tsconfig.json,
│  eslint/prettier config, components.json   # FROZEN (see §5.4)
├─ .env.example                 # BE
├─ AGENTS.md, CLAUDE.md         # HUMAN only
```

### 3.1 Ownership table

| Owner | Paths |
|---|---|
| **BE** | `contracts/**`, `lib/server-gateway/**`, `lib/actions/**`, `lib/ai/**`, `lib/db/**`, `lib/progress/**`, `lib/auth/**`, `lib/storage/**`, `lib/env.ts`, `app/api/**`, `proxy.ts`, `neon.ts`, `drizzle.config.ts`, `scripts/**`, `.env.example`, `.github/**` |
| **FE** | `app/**` (except `app/api/**`), `components/**`, `hooks/**`, `stores/**`, `mocks/**`, `public/**` |
| **FROZEN** | `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, `.gitignore`, `components.json`, `lib/gateway/index.ts`, `lib/utils.ts` — changed only via a `chore/` PR (see §5.4) |
| **HUMAN** | `AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/PROJECT_OVERVIEW.md`, `docs/roadmap/README.md`, `docs/academic/**`, `literature/**`, `design/**` (design files you provide) |

> `contracts/gateway.ts` defines the `FEATURES` list used by `MOCK_FEATURES`. The ESLint config **blocks** FE folders from importing `@/lib/db`, `@/lib/ai`, `@/lib/progress`, `@/lib/auth` and `@/lib/server-gateway`.

| Doc | Owner |
|---|---|
| `docs/roadmap/BACKEND.md`, `database_schema.md`, `architecture.md`, `api_contract.md`, `progress_logic.md`, `environment_setup.md` | BE |
| `docs/roadmap/FRONTEND.md`, `user_flow.md`, `ui_design.md`, `test_cases.md` | FE |

**Rule: never edit a file you do not own.** If you need a change in a file owned by the other role, write the request in your report (and in your roadmap file's "Requests" section) instead of editing it.

Keep new files inside this structure. Do not create new top-level folders without asking.

---

## 4. Commands and verification policy

```bash
npm install           # install dependencies
npm run dev           # start dev server
npm run build         # production build
npm run lint          # lint
npm run db:generate   # generate Drizzle migrations from schema
npm run db:migrate    # apply migrations
npm run db:seed       # seed demo data
npm run db:studio     # open Drizzle Studio
```

### Verification policy
- **Do NOT run `npm run build`, `lint`, type checks or tests after each step.**
- Run them **only** when the user explicitly asks, or when debugging a reported error.
- Do **not** install dependencies inside feature work — `package.json` is frozen (see §5.4).
- Do not start long-running dev servers unless needed for a browser check. Ports: **FE uses 3000, BE uses 3001** so both can run at once.

### Browser checks
- Use **Playwright MCP** (headless) for UI checks. It reads the accessibility snapshot instead of screenshots, so it is fast.
- Use **Chrome DevTools MCP** (if available) for console errors, network issues and animation/performance profiling.
- Take screenshots **only** when checking visual design or motion.
- Check the browser **only** when the user asks, or once at the end of a finished feature — not after every small change.

---

## 5. Agent workflow and parallel work

### 5.1 Know your role
At the start of a session, determine whether you are the **Backend agent** or the **Frontend agent** (the user will say so, or the branch name tells you: `be/…` or `fe/…`). If unclear, ask. Then:
- Read **this file** + your roadmap: `docs/roadmap/BACKEND.md` or `docs/roadmap/FRONTEND.md`.
- Only edit files your role owns (§3.1).

### 5.2 Task workflow
1. **Understand** — read the relevant part of this file and the related file in `docs/`.
2. **Check what exists** — search for existing components, queries and utilities before writing new ones.
3. **Plan briefly** — for multi-file changes, state the plan in 3–6 bullets before editing.
4. **Implement** — small, focused changes, only in files you own.
5. **Update docs** you own if a schema, flow, route or rule changed.
6. **Update your roadmap file only** — tick the task, set its status. Never edit the other role's roadmap.
7. **Report** — what changed, which files, anything assumed, and any **requests for the other role**.

### 5.3 How BE and FE work in parallel (contract-first + mocks)

```
            contracts/  (BE writes, FE reviews)  ← agreed FIRST
              │  Zod schemas + TS types + NodusGateway interface
      ┌───────┴────────┐
      ▼                ▼
 lib/server-gateway/   mocks/gateway.ts
 (BE: real DB + AI)    (FE: realistic fake data)
      └───────┬────────┘
              ▼
     lib/gateway/index.ts  (FROZEN switch, per feature, via MOCK_FEATURES env)
              ▼
     lib/actions/* (BE, thin server actions)  +  pages/components (FE)
```

1. **Contracts first.** Every feature's data shapes and functions are defined in `contracts/<feature>.ts` (Zod schemas + inferred types) and collected in the `NodusGateway` interface in `contracts/gateway.ts`. BE writes them; FE reviews before they're merged.
2. **FE builds against mocks.** FE implements `mocks/gateway.ts` with realistic fixture data satisfying the same interface, so FE never waits for BE.
3. **BE builds the real thing.** BE implements `lib/server-gateway/` (DB, auth checks, AI) satisfying the same interface, and thin server actions in `lib/actions/` that validate input and call the gateway.
4. **One switch.** `lib/gateway/index.ts` (frozen) returns the mock or real implementation **per feature** based on the `MOCK_FEATURES` env var (e.g. `MOCK_FEATURES=graph,ai,dashboard`, or `all`).
5. **Integrate per feature.** When BE finishes a feature, remove it from `MOCK_FEATURES`. If something breaks, each role fixes it in their own files.
6. **FE only imports** from `@/contracts`, `@/lib/gateway` (server components) and `@/lib/actions` (mutations). **FE never imports** from `lib/db`, `lib/ai`, `lib/progress` or `lib/server-gateway`.
7. **BE never edits** pages or components. If BE needs a provider in `app/layout.tsx` (e.g. auth), BE requests it and FE adds it.
8. **AI streaming routes** (`app/api/**`) are BE-owned and must return a canned mock stream when their feature is in `MOCK_FEATURES`.

### 5.4 Git rules (no merge conflicts)
- `main` is always runnable. Never commit directly to `main`.
- Branches: `be/<task-id>-<slug>`, `fe/<task-id>-<slug>`, `contract/<slug>`, `chore/<slug>`.
- **Small PRs** (ideally ≤ 1 day of work). Squash-merge.
- **Rebase on `main` daily** and before opening a PR.
- **Contract changes** go in their own `contract/` PR, opened by BE, reviewed by FE, merged **before** dependent work. FE updates mocks right after.
- **Frozen files** (`package.json`, lockfile, configs, `lib/gateway/index.ts`, `lib/utils.ts`) change only in a dedicated `chore/` PR, agreed by both, merged immediately. All known dependencies are installed once in the bootstrap (see roadmap), so this should be rare. Lockfile conflict → take `main`'s version and re-run `npm install`.
- **DB migrations are BE-only.** FE never runs `db:generate`.
- If both roles run on **one machine**, use **git worktrees** so each agent has its own working folder:
  ```bash
  git worktree add ../nodus-be be/<branch>
  git worktree add ../nodus-fe fe/<branch>
  ```

### 5.5 When unsure
- **Design questions** → ask the user (do not invent a style).
- **Scope questions** (new feature, new library, new table) → ask the user.
- **Small implementation details** → choose the simplest sensible option and mention it.

---

## 6. Core domain rules

These rules are **non-negotiable** unless the user changes them.

### 6.1 Roles
| Role | Can |
|---|---|
| **Student** | View content for their branch/semester/section, write private notes, use AI features, see assignments and their marked status |
| **Faculty** | Manage subjects, units, topics, uploads; create assignments for sections; mark submissions; view class analytics |

- Students have **branch, semester, section** on their profile.
- Faculty are assigned to **subject + section(s)**.
- Role checks are enforced on the **server**, never only in the UI.

### 6.2 Semesters
- Semester is switched from the **top-bar switcher**, never inside the graph.
- Current and past semesters are **open**. Future semesters are **locked** (visible but disabled with a lock icon).
- The selected semester controls the whole app: dashboard, graph, subjects, notes, assignments.

### 6.3 Units and topics
- Each subject has units. Each unit is divided into **faculty-defined topics**.
- Topics have an order. Faculty can add, rename, reorder and delete topics.
- Every student note belongs to **exactly one topic** (and therefore one unit and one subject).

### 6.4 Notes
- Notes are **private**: never visible to other students or to faculty. Faculty analytics use only aggregated progress, never note content.
- Notes are edited in a rich-text editor and **stored as Markdown** (plus Tiptap JSON if needed for fidelity).
- Links (note → note, note → topic, note → unit) are **stored by ID** in a links table, so renaming never breaks links.
- Backlinks are computed from the links table.
- Notes auto-save (debounced).

### 6.5 Assignments
- **Submission is OFFLINE (on paper).** Never build online submission or student file upload.
- Faculty creates an assignment: title, description, subject, unit (optional), target section(s), due date and time.
- Faculty marks each student: **Submitted / Late / Not submitted**, with optional marks and remark.
- Students see: assignment details, live countdown, and the status marked by faculty.

### 6.6 Progress formula
```
Topic covered   = topic has ≥1 student note
                  AND (no quiz attempted on that topic OR best quiz score ≥ 50%)
Unit coverage   = covered topics / total topics
Unit %          = 0.7 × unit coverage + 0.3 × unit quiz average
                  (if no quiz attempted yet: Unit % = unit coverage × 0.7)
Subject %       = average of its units' %
Semester %      = average of its subjects' %
Class unit %    = average of all students' unit % in a section (faculty view)
```
- This logic lives **only** in `lib/progress/`. Every UI reads from there. Never duplicate the formula.

### 6.7 Progress colors (status)
| Status | Range |
|---|---|
| Not started | 0% |
| Low | 1–39% |
| In progress | 40–75% |
| Mastered | > 75% |

The actual color values come from the design tokens.

---

## 7. Data model

High-level tables (Drizzle). Exact columns live in `docs/database_schema.md` and `lib/db/schema/`.

| Table | Purpose | Key columns |
|---|---|---|
| `users` | App user (id = Neon Auth user id) + role | id, name, email, role (`student` / `faculty`), image |
| `student_profiles` | Student academic info | user_id, branch_id, current_semester, section |
| `branches` | e.g. CSE, IT | id, name, code |
| `semesters` | 1–8 per branch | id, branch_id, number |
| `subjects` | Subjects in a semester | id, semester_id, name, code, order |
| `subject_prerequisites` | Prerequisite edges | subject_id, prerequisite_subject_id |
| `units` | Units in a subject | id, subject_id, title, order |
| `topics` | Faculty-defined topics in a unit | id, unit_id, title, order |
| `faculty_teaching` | Which faculty teaches what | faculty_id, subject_id, section |
| `resources` | Faculty uploads | id, unit_id, uploaded_by, file_url, file_name, type, visible_sections |
| `resource_chunks` | RAG chunks of uploads | id, resource_id, content, page_or_slide, embedding (vector) |
| `notes` | Student notes | id, owner_id, topic_id, title, content_md, content_json, updated_at |
| `note_chunks` | RAG chunks of notes | id, note_id, content, embedding (vector) |
| `note_links` | Links between notes/topics/units | id, from_note_id, to_type (`note`/`topic`/`unit`), to_id |
| `assignments` | Faculty-created assignments | id, subject_id, unit_id, title, description, due_at, created_by |
| `assignment_sections` | Target sections | assignment_id, section |
| `assignment_status` | Offline marking (no row = pending) | assignment_id, student_id, status, marks, remark, marked_by, marked_at |
| `quizzes` | Generated quizzes (cached) | id, unit_id, topic_id, questions_json, created_at |
| `quiz_attempts` | Student attempts | id, quiz_id, student_id, score, answers_json, attempted_at |
| `ai_conversations` | Tutor chats | id, student_id, unit_id (optional), created_at |
| `ai_messages` | Chat messages + citations | id, conversation_id, role, content, citations_json |
| `note_analyses` | Cached Analyze Note output | note_id, summary, tags, todos, content_hash |
| `activity_log` | One row per study action | id, student_id, type, ref_id, created_at |

`activity_log` types: `note_created`, `note_updated`, `quiz_attempted`, `ai_question`, `resource_opened`. It powers the activity heatmap and streaks.

Rules:
- Use UUIDs for primary keys.
- Add `created_at` / `updated_at` to every table.
- Cascade deletes carefully (deleting a topic must not silently delete notes — ask the user how to handle it if this comes up).

---

## 8. Routes and pages

### Public
| Route | Page |
|---|---|
| `/` | Landing page (hero, features, motion showcase) |
| `/login`, `/signup` | Auth |
| `/onboarding` | Student picks branch, semester, section |

### Student
| Route | Page |
|---|---|
| `/dashboard` | Stats-first dashboard |
| `/graph` | Graph View (tree + hover card + side panel) |
| `/subjects` | List of subjects in selected semester |
| `/subjects/[subjectId]/units/[unitId]` | Unit page (topics, faculty notes, assignment, AI actions) |
| `/notes` | All notes (search, tags, filters) |
| `/notes/[noteId]` | Note editor |
| `/notes/web` | Knowledge Web (bonus) |
| `/assignments` | Assignments with countdown and status |
| `/tutor` | AI Tutor chat |
| `/practice` | Practice quizzes and past scores |
| `/profile` | Profile and settings |

**Navigation: top nav only — no sidebar anywhere in the app.**
**Top nav links:** Dashboard · Graph View · Subjects · My Notes · Assignments · AI Tutor · Practice
**Top nav controls:** Semester switcher · Search (Ctrl+K) · Notifications · Profile
On small screens the links collapse into a menu; the exact look follows the provided design.

### Faculty
| Route | Page |
|---|---|
| `/faculty/dashboard` | Class analytics |
| `/faculty/graph` | Class progress tree |
| `/faculty/content` | Subjects → units → topics, uploads |
| `/faculty/assignments` | Create and list assignments |
| `/faculty/assignments/[id]` | Mark students (Submitted / Late / Not submitted) |
| `/faculty/tracker` | Section-wise submission and progress tracker |

**Top nav links:** Dashboard · Graph View · Content · Assignments · Tracker
**Top nav controls:** Subject + Section switcher · Notifications · Profile

---

## 9. Feature specifications

### 9.1 Student dashboard (stats-first)
Content is secondary; **stats and visuals lead**. All widgets follow the selected semester.

| Widget | Shows | Data |
|---|---|---|
| **Stat cards** | Notes count, Semester %, Quiz average, Assignments submitted, Study streak | counts + `activity_log` |
| **Coverage rings** | One ring per subject, filled to subject % | `lib/progress` |
| **Activity heatmap** | Daily study activity (GitHub-style) | `activity_log` |
| **Deadline timeline** | Upcoming assignments with countdown chips | `assignments` |
| *Optional:* Subject radar | Strength per subject | `lib/progress` |
| *Optional:* Quiz trend | Scores over time | `quiz_attempts` |

Motion: animated count-up numbers, rings fill on load, staggered card reveal.

### 9.2 Student Graph View
**Layout:** tree (left → right), built with React Flow + dagre.

```
Top bar: [Sem 3 ▾]
Sem 3 ─┬─ Subject (55%) ─┬─ Unit 1 (90%)
       │                 ├─ Unit 2 (80%)
       │                 └─ Unit 3 (60%)
       └─ Subject ...
```

- Root = selected semester. Subjects branch out; clicking a subject expands/collapses its units (animated).
- Every node shows name, %, and a progress ring/color.
- Dashed edges show subject prerequisites.
- Controls: zoom, pan, fit view, search (Ctrl+K flies to a node), legend.

**Hover card** (subject or unit):
```
Unit 3 – Graphs · 60%
✅ BFS  ✅ DFS  ✅ Dijkstra
⬜ Topo Sort  ⬜ MST
📝 7 notes · 🧠 Quiz 72%
📅 Assignment due in 2 days
```

**Side panel** (click a unit) — slides in from the right, graph stays visible:
- Unit title + %
- Topic list with ✅/⬜, note count, "+ Add note" for empty topics
- Faculty notes (uploaded resources)
- Assignment with countdown and status
- Buttons: **Ask AI** (tutor scoped to unit), **Practice** (quiz for unit)

**No radial view.**

### 9.3 Notes
- Tiptap editor: headings, bold/italic, lists, checklists, code blocks, tables, images.
- **Slash menu** (`/`) to insert blocks.
- **Link picker**: link to another note, a topic or a unit; option to create a new note inline.
- **Backlinks panel**: notes linking to the current note.
- Hover preview on links.
- Tags, full-text search, Ctrl+K quick switcher.
- Debounced auto-save with a subtle "Saved" indicator.
- **Analyze note** button (see 10.4).
- Export as Markdown.

### 9.4 Assignments (student)
- List grouped by status / due date.
- Live countdown (days : hours : minutes).
- Status badge set by faculty: Pending, Submitted, Late, Not submitted.
- No upload button. Ever.

### 9.5 AI Tutor (student)
- Chat UI with streaming responses.
- Scope selector: whole semester / subject / unit.
- Each answer shows **citation chips** (file + page/slide, or note title). Clicking opens the source.
- "Not covered in your material" response when retrieval finds nothing relevant.

### 9.6 Practice (student)
- Generate a quiz for a unit or topic (MCQs, 5–10 questions).
- Instant feedback with explanation per question.
- Score saved to `quiz_attempts`, updates progress.
- History of past attempts.

### 9.7 Faculty Graph View
- Same tree component as students, different data.
- Top bar: **Subject + Section** switcher.
- Tree: Subject → Units → Topics.
- Node % = **class average**.
- Hover card: class average, students per status band, weakest topic, quiz average.
- Side panel: topic-wise class coverage bars, "students needing help" list, uploads (+ Upload), assignment summary, "Edit topics".

### 9.8 Faculty content management
- CRUD for units and topics (drag to reorder).
- Upload PDF/PPT to a unit, choose visible sections.
- On upload: extract text → chunk → embed → store in `resource_chunks` (see 10.2).

### 9.9 Faculty assignments and tracker
- Create assignment for selected sections with due date/time.
- Marking table: one row per student, quick toggles for Submitted / Late / Not submitted, optional marks and remark, bulk actions.
- Tracker: submission donut per section, pending count, progress per student.

### 9.10 Notifications (in-app)
- New resource uploaded, new assignment, deadline approaching (2 days, same day), status marked.
- Bell icon with unread count. No email/push unless asked.

---

## 10. AI rules and RAG pipeline

### 10.1 General rules
- **Provider:** Google Gemini through the **Vercel AI SDK**. Groq is an optional fallback for chat only.
- All model names and provider config live in **`lib/ai/config.ts`** only. Never hardcode model IDs elsewhere.
- All prompts live in **`lib/ai/prompts/`**. Never inline prompts in components.
- Structured outputs (quiz, analysis) must be validated with **Zod** schemas from `lib/ai/schemas.ts`.
- Never hardcode API keys. Read from environment variables.
- Never send data from other students to the model. A student's context = faculty material for their sections + **their own** notes only.
- **Cache** results (quizzes, note analyses) to save free-tier quota. Re-run Analyze Note only if the note content hash changed.
- Handle rate limits gracefully: show a friendly message and retry option, never crash.

### 10.2 Ingestion (faculty uploads)
```
Upload PDF/PPT → extract text per page/slide → chunk (~500–800 tokens, small overlap)
→ embed with Gemini embeddings → store in resource_chunks (content, page_or_slide, embedding)
```
- Notes are chunked and embedded the same way into `note_chunks` on save (debounced / background).
- Keep embedding dimension consistent with the pgvector column; set it once in `lib/ai/config.ts`.

### 10.3 Tutor (retrieval-augmented)
```
Question → embed → vector search (resource_chunks + student's note_chunks, filtered by scope & permissions)
→ top-k chunks → prompt with sources → Gemini streams answer with citations
```
Prompt rules:
- Answer **only** from the provided sources.
- Cite every claim with the source ID; UI renders citation chips.
- If sources are insufficient, reply that the material does not cover it, and suggest which unit/topic to check.
- Keep answers student-friendly: short explanation, then example, then key points.

### 10.4 Analyze note
Output (Zod-validated): `summary`, `suggestedTitle`, `tags[]`, `todos[]`, `suggestedLinks[]` (topics/notes the note mentions).

### 10.5 Practice quiz
Output (Zod-validated): array of `{ question, options[4], correctIndex, explanation, topicId }`. Generated only from faculty material of that unit/topic.

### 10.6 Gap finder
Compare the unit's topic list (and faculty material) with the student's notes → list missing or weakly covered topics with a short reason. Topic coverage from `lib/progress` is the primary signal; AI adds explanation.

### 10.7 Image to note (optional, when asked)
Gemini vision extracts text from a photo of handwritten notes → cleaned Markdown → new note under the chosen topic.

---

## 11. Motion and animation

NODUS must feel **premium and alive** — Awwwards-level. Use modern motion libraries deliberately.

### 11.1 Libraries
| Library | Use for |
|---|---|
| **Motion** (`motion`, formerly Framer Motion) | Component enter/exit, layout animations, shared-element transitions, hover/tap/drag, page transitions, `AnimatePresence`, spring physics |
| **GSAP** + ScrollTrigger + SplitText (+ Flip if needed) | Complex timelines, scroll-driven sequences, text reveals, landing page hero, orchestrated intros |
| **Lenis** | Smooth scrolling (synced with GSAP ScrollTrigger) — landing and long pages |
| **React Three Fiber** + **Drei** | Optional 3D/WebGL hero or ambient background (landing page / auth pages only) |
| **Lottie** (`lottie-react`) | Micro-illustrations, empty states, success/celebration moments |
| **View Transitions API** | Route-level transitions where supported, with Motion fallback |

**Rule of thumb:** Motion for UI and components, GSAP for timelines and scroll storytelling. Do not mix both on the same element.

### 11.2 Where motion is used
| Surface | Motion |
|---|---|
| Landing page | GSAP hero timeline, SplitText headline reveal, Lenis smooth scroll, scroll-triggered feature sections, optional R3F background |
| Route changes | Smooth page transitions (fade/slide/blur), shared layout for persistent shell |
| Dashboard | Staggered card reveal, count-up numbers, rings and bars filling on load, heatmap cells easing in |
| Graph View | Nodes ease in on load, branches expand/collapse with animated layout, hover card springs in, side panel slides in, progress rings animate when values change, camera fly-to on search |
| Notes | Slash menu and link picker pop with spring, saved indicator fades, backlinks list staggers |
| AI Tutor | Streaming text, typing indicator, citation chips pop in |
| Practice | Question transitions, correct/incorrect feedback micro-animations, Lottie celebration on high scores |
| Topic ✅ moment | Satisfying micro-animation when a topic becomes covered |
| Buttons/cards | Magnetic hover, subtle tilt/scale, pressed state |
| Empty/loading states | Skeleton shimmer, Lottie illustrations |

### 11.3 Motion rules
- Reusable wrappers and hooks go in `components/motion/` (e.g. `FadeIn`, `Stagger`, `CountUp`, `PageTransition`, `MagneticButton`, `useLenis`, `useGsapContext`).
- Centralise timing: durations, easings and spring presets in `components/motion/tokens.ts`.
- Animate **`transform` and `opacity`** only where possible (60fps). Avoid animating layout-heavy properties.
- Use `useGSAP` / `gsap.context()` and clean up on unmount. No leaking ScrollTriggers.
- **Lazy-load** heavy libraries (Three.js/R3F, GSAP plugins, Lottie files) with dynamic imports, only on pages that use them.
- Respect **`prefers-reduced-motion`**: provide reduced or no-motion fallbacks for every non-essential animation.
- Animation must **never block interaction** or delay content unnecessarily (keep entrance animations short).
- Motion should match the provided design. If the design specifies motion, replicate it exactly.

---

## 12. Design rules

### 12.1 Source of design
- **The visual design will be provided by the user** (Figma, screenshots, mockups, videos, or written instructions).
- When a design is provided → **replicate it faithfully**: layout, spacing, sizes, colors, typography, radii, shadows, icons and motion.
- When no design is provided → build according to the user's instructions using neutral placeholder styling. **Do not invent a new visual style on your own.**
- If something in the design is ambiguous or missing (e.g. a hover state, mobile layout), ask the user or choose the most consistent option and mention it.

### 12.2 Replication checklist
When replicating a design, check:
- [ ] Layout and grid match at desktop, tablet and mobile
- [ ] Spacing and sizing match (use the design's scale)
- [ ] Colors, gradients and opacity match (as tokens)
- [ ] Typography: font family, size, weight, line height, letter spacing
- [ ] Radii, borders, shadows, blur/glass effects
- [ ] Icons and illustrations
- [ ] Hover, focus, active and disabled states
- [ ] Motion and transitions
- [ ] Loading, empty and error states

### 12.3 Design tokens
- All colors, fonts, spacing, radii, shadows and motion values are **tokens** (CSS variables mapped into the Tailwind theme).
- Never hardcode hex colors or arbitrary values inside components; add a token instead.
- Support dark mode via tokens if the design includes it.

### 12.4 Fixed UX decisions (independent of visual design)
- Student Graph View = **tree + hover card + side panel**. No radial view.
- Faculty Graph View = same tree with class-level data.
- Dashboard = **stats-first**.
- Semester switcher in the top bar.
- Knowledge Web = bonus, only when asked.
- Every data view has **loading, empty and error states**.
- Fully responsive.

---

## 13. Coding conventions

### TypeScript
- `strict: true`. **No `any`** (use `unknown` + narrowing if needed).
- Shared types live in `contracts/` (inferred from Zod schemas). DB types (Drizzle `InferSelectModel`) stay inside `lib/db/` and are never exposed to FE directly — map them to contract types in `lib/server-gateway/`.

### React / Next.js
- **Server Components by default.** Add `"use client"` only for interactivity, motion, browser APIs or client state.
- Data mutations via **server actions** in `lib/actions/` (or route handlers for streaming/uploads).
- Keep client components small; pass data down from server components.
- Use `next/image` for images and `next/font` for fonts.
- Use `Suspense` + skeletons for async UI.

### Naming
| Kind | Convention | Example |
|---|---|---|
| Components | `PascalCase.tsx` | `UnitHoverCard.tsx` |
| Hooks | `useCamelCase.ts` | `useSemester.ts` |
| Utilities | `camelCase.ts` | `formatCountdown.ts` |
| Server actions | verb-first | `createAssignment`, `markSubmission` |
| DB tables | `snake_case` plural | `quiz_attempts` |
| Env vars | `SCREAMING_SNAKE_CASE` | `DATABASE_URL` |

### General
- Small, readable functions. Early returns over deep nesting.
- Comment only where logic is not obvious (e.g. progress formula, RAG filtering).
- Reuse existing components before creating new ones.
- Database access only through `lib/db/`.
- Validate all external input with Zod.
- Handle errors with user-friendly messages; log details server-side.

---

## 14. Security and permissions

| Action | Student | Faculty |
|---|---|---|
| View own notes | ✅ | ❌ |
| View other students' notes | ❌ | ❌ |
| View resources for own sections | ✅ | ✅ (own subjects) |
| Upload resources | ❌ | ✅ (own subjects) |
| Create/edit units & topics | ❌ | ✅ (own subjects) |
| Create assignments | ❌ | ✅ (own subjects/sections) |
| Mark assignment status | ❌ | ✅ (own sections) |
| View own progress | ✅ | — |
| View class aggregated progress | ❌ | ✅ (own sections) |
| Access future semesters | ❌ | — |

Rules:
- Check session and role in **every** server action and route handler (`lib/auth/guards.ts`).
- Always filter queries by the current user's scope (owner, section, subject).
- RAG retrieval must apply the same permission filters as normal queries.
- Validate file type and size on upload (PDF/PPT/PPTX only, size limit configurable).
- Never expose secrets to the client. Only `NEXT_PUBLIC_*` vars may reach the browser.

---

## 15. Performance and accessibility

### Performance
- Target good Core Web Vitals (fast LCP, low CLS, responsive INP).
- Lazy-load heavy components: graph, charts, editor, 3D, Lottie.
- Paginate or virtualise long lists.
- Debounce auto-save and search.
- Stream AI responses.
- Avoid unnecessary client-side JavaScript.

### Accessibility
- Semantic HTML, proper headings and landmarks.
- Keyboard navigation for all interactive elements, including graph nodes and panels.
- Visible focus states.
- ARIA labels for icon-only buttons.
- Sufficient color contrast; never rely on color alone (progress shows % and an icon/label too).
- `prefers-reduced-motion` respected (see Section 11.3).

---

## 16. Environment variables

Keep `.env.example` updated. Never commit `.env` or real values. Validated in `lib/env.ts`.

**Neon values are pulled automatically** by `neon deploy` / `neon env pull` (project config lives in `neon.ts`). Only `NEON_AUTH_COOKIE_SECRET`, the AI keys and app settings are filled by hand.

| Variable | Source | Used by |
|---|---|---|
| `DATABASE_URL` | Neon (pooled) | App queries (`lib/db`) |
| `DATABASE_URL_UNPOOLED` | Neon (direct) | Drizzle migrations only |
| `NEON_BRANCH` | Neon | Info |
| `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL` | Neon | `lib/auth/server.ts` |
| `NEON_AUTH_COOKIE_SECRET` | You (`openssl rand -base64 32`) | `lib/auth/server.ts` |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION` | Neon Object Storage | `lib/storage` |
| `GOOGLE_GENERATIVE_AI_API_KEY`, `GROQ_API_KEY` | Google AI Studio / Groq | `lib/ai` |
| `NEXT_PUBLIC_APP_URL` | You | App |
| `MOCK_FEATURES` | You | `lib/gateway` (`all`, a comma list, or empty) |
| `HEALTHCHECK_SECRET` | You (production only) | `/api/health` — open in dev, needs `x-health-secret` header in production |

**Service check:** `GET /api/health` tests Postgres + pgvector, Neon Auth, and storage (upload → presigned download → delete).

---

## 17. Seed and demo data

The demo must look full and realistic. `npm run db:seed` should create:

- Branch: **CSE**, semesters 1–8.
- **Semester 3** fully filled: 4–5 subjects, 4–5 units each, 4–6 topics per unit, prerequisite links.
- Semesters 1–2: filled with completed progress. Semesters 4–8: locked.
- Sections **A, B, C** with ~15–20 students each.
- 1–2 faculty accounts assigned to subjects/sections.
- Sample resources (text-based) with chunks and embeddings (or a flag to skip embeddings offline).
- Sample notes, links, quiz attempts and ~60 days of `activity_log` so charts and heatmap look alive.
- Assignments with a mix of Submitted / Late / Not submitted.
- Demo logins documented in `docs/environment_setup.md`.

---

## 18. Git conventions

- Commit only when the user asks.
- Conventional commits: `feat:`, `fix:`, `refactor:`, `style:`, `docs:`, `chore:`.
  - e.g. `feat(graph): add unit hover card with topic progress`
- One logical change per commit.
- Never commit secrets, `.env`, or large binary files.
- Branch names and merge rules: see **§5.4** (`be/…`, `fe/…`, `contract/…`, `chore/…`).
- Commit scope should show the role, e.g. `feat(be-notes): …`, `feat(fe-graph): …`.

---

## 19. Do's and don'ts

### Do
- ✅ Keep scope tight; ask before adding large features, libraries or tables.
- ✅ Replicate the provided design faithfully.
- ✅ Use the motion libraries to make every interaction feel polished.
- ✅ Keep progress logic in `lib/progress/` and AI config in `lib/ai/config.ts`.
- ✅ Update `docs/` when schema, flows, routes or rules change.
- ✅ Add loading, empty and error states.
- ✅ Keep code explainable for the viva.

### Don't
- ❌ Build online assignment submission or student uploads.
- ❌ Build a radial graph view.
- ❌ Put the semester switcher inside the graph.
- ❌ Show a student's notes to anyone else.
- ❌ Let the AI answer from outside the provided material.
- ❌ Hardcode model IDs, prompts in components, colors, or secrets.
- ❌ Add voice notes, PWA/offline mode, public share links or email/push notifications unless asked.
- ❌ Run build/lint/test after every step (see Section 4).
- ❌ Invent a visual design when none was provided.
- ❌ Edit files owned by the other role, or frozen files outside a `chore/` PR (see §3.1, §5.4).
- ❌ Import backend internals (`lib/db`, `lib/ai`, `lib/progress`, `lib/server-gateway`) from FE code.

---

## 20. Docs map

Read the related doc before working on an area. Create or update it if missing.

| File | Covers |
|---|---|
| `docs/PROJECT_OVERVIEW.md` | **Human-readable project overview (start here for context)** |
| `docs/roadmap/README.md` | **Overview: timeline, milestones, contracts list, integration checkpoints** |
| `docs/roadmap/BACKEND.md` | **Backend task list + progress tracker** |
| `docs/roadmap/FRONTEND.md` | **Frontend task list + progress tracker** |
| `docs/academic/synopsis.md` | Project proposal and scope |
| `docs/academic/report_outline.md` | Final report structure |
| `docs/academic/ppt_viva_outline.md` | Presentation and viva prep |
| `docs/requirements.md` | Functional and non-functional requirements (SRS) |
| `docs/architecture.md` | System architecture and RAG pipeline |
| `docs/database_schema.md` | Tables, columns, relationships, ER diagram |
| `docs/user_flow.md` | Student and faculty flows, Graph View flow |
| `docs/progress_logic.md` | Progress calculation with examples |
| `docs/api_contract.md` | Server actions and API endpoints |
| `docs/ui_design.md` | Design tokens, components, motion guidelines (from the provided design) |
| `docs/environment_setup.md` | Setup, env vars, demo logins |
| `docs/test_cases.md` | Test cases |
| `literature/` | Literature review and bibliography |

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
