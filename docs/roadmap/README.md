# NODUS — Roadmap Overview

> **Owner: HUMAN.** Agents read this file but do not edit it.
> Task lists and progress live in **[BACKEND.md](BACKEND.md)** (BE agent) and **[FRONTEND.md](FRONTEND.md)** (FE agent).
> Each agent edits **only its own file**, so tracking never causes merge conflicts.

**Status legend:** ⬜ Not started · 🟡 In progress · ✅ Done · ⏸ Blocked · ⏭ Skipped
**Priority:** **P0** must-have · **P1** should-have · **P2** bonus
**Timeline assumption:** ~12 weeks. Adjust to the real deadline.

---

## 1. How the two roles work in parallel

```
Week 1   Docs + Bootstrap (BE, on main)  ──►  everyone starts from the same skeleton
Week 2   CONTRACT SPRINT: BE writes ALL contracts/*  ·  FE reviews + builds mocks
Week 3+  BE builds real gateway  ║  FE builds UI on mocks     (no waiting, no shared files)
End of each phase: INTEGRATION — remove feature from MOCK_FEATURES, each side fixes its own files
```

Rules in short (full rules: `AGENTS.md` §3.1 and §5):
- Every file has **one owner** (BE / FE / FROZEN / HUMAN).
- **Contracts first**, mocks second, real implementation third.
- FE talks to data **only** through `@/lib/gateway` and `@/lib/actions`.
- Small PRs, rebase daily, contract and dependency changes in their own PRs.

---

## 2. Week-by-week plan

| Week | Backend (BE) | Frontend (FE) | Sync point |
|---|---|---|---|
| 1 | Docs (schema, architecture, progress logic) · **Bootstrap repo** | Docs (user flow, UI design notes) · collect design | Bootstrap merged → FE starts |
| 2 | **Contract sprint** (all contracts + action stubs + mock-aware API routes) · Neon + Drizzle schema | Design tokens, base UI, motion foundation · **mock gateway + fixtures** | ✅ Contracts v1 frozen (C1) |
| 3 | Seed data · Auth, guards, proxy (route protection), onboarding | Auth pages, onboarding, student + faculty shells, switchers | 🔗 INT-1: auth + curriculum |
| 4 | Content CRUD · uploads · ingestion (extract, chunk, embed) | Faculty content UI · upload UI · unit page | 🔗 INT-2: resources |
| 5 | Notes CRUD, links, backlinks, search, note embeddings | Notes list, Tiptap editor, slash menu, link picker, backlinks | 🔗 INT-3: notes |
| 6–7 | Progress engine · graph data · class progress | Tree graph, nodes, hover card, side panel, faculty graph | 🔗 INT-4: progress + graph |
| 7–8 | RAG retrieval · tutor stream · quiz · analyze · gap finder | Tutor UI, citations, quiz UI, analyze panel, gap finder UI | 🔗 INT-5: AI |
| 9 | Assignments, marking, tracker, notifications | Assignment pages, marking table, tracker, bell | 🔗 INT-6: assignments + notifications |
| 9–10 | Dashboard loaders (student + faculty) | Dashboard widgets + charts | 🔗 INT-7: dashboards |
| 10–11 | Indexes, caching, security hardening, prod seed | **Design replication + motion polish + landing page** | — |
| 11–12 | Permission tests, deploy, backend docs | E2E tests, responsive/a11y pass, screenshots, demo video | 🔗 INT-8: full system on production |

---

## 3. Milestones

| # | Milestone | Target | Condition | Status |
|---|---|---|---|---|
| M1 | Synopsis approved | Week 1 | Guide sign-off | ⬜ |
| M2 | Foundation ready | Week 3 | Bootstrap + contracts v1 + login works (INT-1) | ⬜ |
| M3 | Content + notes | Week 5 | INT-2 + INT-3 done | ⬜ |
| M4 | **Core demo** | Week 8 | Graph with live progress + cited AI tutor (INT-4, INT-5) | ⬜ |
| M5 | Feature complete | Week 10 | INT-6 + INT-7 done | ⬜ |
| M6 | Awwwards polish | Week 11 | Design + motion complete | ⬜ |
| M7 | Submission ready | Week 12 | Deployed, report, PPT, video (INT-8) | ⬜ |

---

## 4. Contracts list

Written by BE in week 2 (BE-1.x), reviewed by FE. Each file exports Zod schemas, inferred types, and its part of the `NodusGateway` interface.

| ID | File | Defines | Feature flag |
|---|---|---|---|
| C-00 | `contracts/common.ts` | IDs, `Result<T>` / error shape, `ProgressStatus`, pagination, timestamps | — |
| C-01 | `contracts/auth.ts` | `Session`, `Role`, `StudentProfile`, `OnboardingInput`, selected semester / subject+section | `auth` |
| C-02 | `contracts/curriculum.ts` | `Semester` (with locked flag), `Subject`, `Prerequisite`, `Unit`, `Topic`, CRUD + reorder inputs | `curriculum` |
| C-03 | `contracts/resources.ts` | `Resource`, upload input, `IngestionStatus`, section visibility | `resources` |
| C-04 | `contracts/notes.ts` | `Note`, `NoteSummary`, `NoteLink`, `Backlink`, create/update/link inputs, search query/result | `notes` |
| C-05 | `contracts/progress.ts` | `TopicProgress`, `UnitProgress`, `SubjectProgress`, `SemesterProgress`, `ClassUnitProgress` | `graph` |
| C-06 | `contracts/graph.ts` | `GraphNode`, `GraphEdge`, `StudentGraph`, `FacultyGraph`, `HoverCardData`, `SidePanelData` | `graph` |
| C-07 | `contracts/ai.ts` | `Citation`, `ChatMessage`, `TutorScope`, `Quiz`, `QuizQuestion`, `QuizAttempt`, `NoteAnalysis`, `GapReport`, `AiError` | `ai` |
| C-08 | `contracts/assignments.ts` | `Assignment`, `AssignmentStatus` (Submitted/Late/Not submitted/Pending), create input, marking input, bulk input, `SectionTracker` | `assignments` |
| C-09 | `contracts/dashboard.ts` | `StudentDashboard` (stats, rings, heatmap, deadlines, radar, trend), `FacultyDashboard` | `dashboard` |
| C-10 | `contracts/notifications.ts` | `Notification`, unread count, mark-read input | `notifications` |
| C-11 | `contracts/gateway.ts` | `NodusGateway` interface combining all feature APIs | — |

Contract changes after v1: `contract/<slug>` PR by BE → FE review → merge → FE updates mocks.

---

## 5. Integration checkpoints

At each checkpoint both agents stop new work for that feature and:
1. BE confirms the real gateway for the feature is done (BE tracker ✅).
2. Remove the feature from `MOCK_FEATURES` locally and test the pages.
3. Mismatches → fix in owner's files (BE: data, FE: UI). Contract gaps → `contract/` PR.
4. Tick the checkpoint below.

| ID | Checkpoint | Needs (BE) | Needs (FE) | Status |
|---|---|---|---|---|
| INT-1 | Auth + curriculum real | BE-3.x | FE-3.x | ⬜ |
| INT-2 | Resources real | BE-4.x | FE-4.x | ⬜ |
| INT-3 | Notes real | BE-5.x | FE-5.x | ⬜ |
| INT-4 | Progress + graph real | BE-6.x | FE-6.x | ⬜ |
| INT-5 | AI real | BE-7.x | FE-7.x | ⬜ |
| INT-6 | Assignments + notifications real | BE-8.x | FE-8.x | ⬜ |
| INT-7 | Dashboards real | BE-9.x | FE-9.x | ⬜ |
| INT-8 | Production (`MOCK_FEATURES` empty) | BE-11.x | FE-11.x | ⬜ |

---

## 6. Shared / human tasks (not owned by an agent)

| ID | Task | Week | Status |
|---|---|---|---|
| H-01 | Write synopsis (`docs/academic/synopsis.md`) | 1 | ⬜ |
| H-02 | Get synopsis approved by guide | 1 | ⬜ |
| H-03 | Requirements / SRS (`docs/requirements.md`) | 1 | ⬜ |
| H-04 | Provide visual design (Figma / screenshots / references) | 1–2 | ⬜ |
| H-05 | Real syllabus + 2–3 sample faculty PDFs/PPTs for seed data | 1–2 | ⬜ |
| H-06 | Create accounts: GitHub, Neon, Google AI Studio, Vercel, storage bucket | 1 | ⬜ |
| H-07 | Literature review + annotated bibliography | 2–4 | ⬜ |
| H-08 | Weekly guide meeting + logbook | weekly | ⬜ |
| H-09 | Project report | 11–12 | ⬜ |
| H-10 | Plagiarism check | 12 | ⬜ |
| H-11 | PPT + viva Q&A prep | 12 | ⬜ |
| H-12 | Demo script + rehearsal | 12 | ⬜ |
| H-13 | Certificates, declaration (college format) | 12 | ⬜ |

---

## 7. Demo-critical path

If time runs short, this chain must be finished:

```
BOOT → Contracts v1 → BE: seed, auth, topics, ingestion, notes, progress, graph data, tutor, quiz, assignments, dashboard
                     FE: shells, editor, tree graph + hover + side panel, tutor UI, quiz UI, assignments, dashboard
→ design replication → deploy → demo video
```

---

## 8. Change log (HUMAN)

| Date | Change | Reason |
|---|---|---|
| 2026-10-15 | Roadmap created | Initial plan |
| 2026-10-15 | Assignments offline (faculty marks status) | Simpler, matches college practice |
| 2026-10-15 | Radial view dropped; tree + hover card + side panel | Less work, same information |
| 2026-10-15 | AI: Gemini (free) via Vercel AI SDK | Free tier covers chat, embeddings, vision |
| 2026-10-15 | Split into BE/FE roles with contract-first + mocks and separate trackers | Parallel work without merge conflicts |
