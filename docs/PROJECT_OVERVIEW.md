# NODUS — Project Overview

> **Owner: HUMAN.** A readable overview of the project for the team, guide and reviewers.
> Agent rules live in [`AGENTS.md`](../AGENTS.md). Tasks and progress live in [`docs/roadmap/`](roadmap/README.md).

---

## 1. In one line

> **NODUS maps your syllabus, connects your notes to it, and uses AI to show you what you know and what you're missing.**

---

## 2. The problem

College learning is scattered:

- **Material is everywhere.** Faculty slides and notes are spread across WhatsApp groups, Google Drive and email.
- **Assignments get lost.** They are announced in class and easily forgotten.
- **Notes are disconnected.** Students' own notes have no link to the syllabus, so they can't tell what they've covered.
- **AI isn't grounded.** Generic chatbots answer from the internet, not from what *your* professor taught.

So students can't easily answer three questions: **What do I need to know? What do I already know? What's missing?**

---

## 3. The solution

NODUS turns the semester into **one living map of knowledge**, built in three layers.

| Layer | Who builds it | What it is |
|---|---|---|
| **Official layer** | Faculty | Semester → Subject → Unit → Topic structure, with uploaded notes/slides and assignments |
| **Personal layer** | Student | Private notes written under topics and linked to each other, Obsidian-style |
| **AI layer** | System | A tutor, quizzes, note analysis and gap finder, all grounded **only** in the two layers above |

### The core loop
```
See gaps on the graph  →  write notes / take a practice quiz  →  topic turns ✅  →  graph turns green
```

### What makes it different
| | Obsidian | Moodle / Google Classroom | ChatGPT | **NODUS** |
|---|---|---|---|---|
| Linked notes + graph | ✅ | ❌ | ❌ | ✅ |
| Structured syllabus from faculty | ❌ | ✅ | ❌ | ✅ |
| Shows your progress against the syllabus | ❌ | ❌ | ❌ | ✅ |
| AI grounded in your professor's material, with citations | ❌ | ❌ | ❌ | ✅ |
| No learning curve (no Markdown, no plugins) | ❌ | ✅ | ✅ | ✅ |

---

## 4. Users

| Role | What they do |
|---|---|
| **Student** | Sees their semester as a graph, writes notes under topics, asks the AI tutor, practises quizzes, tracks assignments and progress |
| **Faculty** | Defines units and topics, uploads material, posts assignments, marks offline submissions, sees class progress and weak topics |

---

## 5. Features

### Student
1. **Dashboard (stats-first):** stat cards, subject coverage rings, activity heatmap, deadline timeline.
2. **Graph View:** semester → subjects → units as a tree. Each node is colored by progress.
   - **Hover** a unit → progress card (topics ✅/⬜, notes, quiz score, deadline).
   - **Click** a unit → side panel (topics, faculty notes, assignment, Ask AI, Practice).
3. **Subjects and unit pages:** faculty material, topics and assignments in one place.
4. **Notes:** simple rich-text editor, `/` menu, one-click linking to notes, topics and units, backlinks, search, tags, Ctrl+K.
5. **AI Tutor:** answers only from faculty material and the student's own notes, with source citations.
6. **Practice:** AI-generated quizzes per unit or topic, with explanations.
7. **Analyze Note:** one click gives a summary, tags, title and to-dos.
8. **Gap Finder:** shows which syllabus topics are missing from the student's notes.
9. **Assignments:** deadline countdown and the status marked by faculty.
10. **Semester switcher:** past semesters open, future semesters locked.

### Faculty
1. **Class Graph View:** the same tree, showing class-average progress, weak topics and students who need help.
2. **Content manager:** create units and topics, upload PDFs/PPTs, choose which sections see them.
3. **Assignments:** create for selected sections with a due date.
4. **Offline marking:** students submit on paper; faculty mark Submitted / Late / Not submitted (plus marks) in the app.
5. **Tracker and dashboard:** submission status per section, section comparison, weak units.

### Bonus (if time allows)
Knowledge Web (Obsidian-style force graph of notes) · Image to note (OCR of handwritten pages) · Auto-link suggestions · Improve writing.

### Out of scope
Online assignment submission · Voice notes · Offline/PWA mode · Public share links · Email/push notifications.

---

## 6. How progress is calculated

```
Topic covered   = the topic has at least 1 note (and a passing quiz score, if a quiz was taken)
Unit %          = 70% topic coverage + 30% quiz average
Subject %       = average of its units
Semester %      = average of its subjects
```

| Status | Range |
|---|---|
| Not started | 0% |
| Low | 1–39% |
| In progress | 40–75% |
| Mastered | > 75% |

Full details with examples: [`docs/progress_logic.md`](progress_logic.md).

---

## 7. How the AI works (RAG)

```
Faculty uploads PDF/PPT ─► extract text ─► split into chunks ─► embed (Gemini) ─► store in Postgres (pgvector)
Student writes notes    ─► split into chunks ─► embed ─────────────────────────► store

Student asks a question ─► embed question ─► find the most relevant chunks
                        ─► Gemini answers ONLY from those chunks ─► answer + citations (file, page/slide)
```

- If the material doesn't cover the question, the tutor says so instead of guessing.
- A student's AI only ever sees faculty material for their sections and **their own** notes.
- Quizzes and note analyses are cached to stay within the free tier.

---

## 8. Tech stack

| Area | Technology |
|---|---|
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Motion | Motion (Framer Motion), GSAP + ScrollTrigger + SplitText, Lenis, React Three Fiber, Lottie |
| Graph | React Flow + dagre |
| Editor | Tiptap |
| Charts | Recharts, Nivo |
| Database | Neon Postgres + pgvector, Drizzle ORM |
| Auth | Neon Auth |
| AI | Google Gemini (chat, embeddings, vision) via Vercel AI SDK |
| Hosting | Vercel + Neon |

### Architecture
```
┌──────────────────────────── Next.js app (Vercel) ────────────────────────────┐
│  Pages & components (FE)  ──►  Gateway  ──►  Server actions / API routes (BE)  │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              ▼                        ▼                        ▼
      Neon Postgres + pgvector     File storage           Google Gemini
      (data + embeddings)          (faculty uploads)      (chat, embeddings, vision)
```
Full details: [`docs/architecture.md`](architecture.md).

---

## 9. Design goal

NODUS should look and feel **Awwwards-level**: premium visuals, smooth motion, polished interactions. The visual design is provided by the team and replicated exactly. Motion is used meaningfully: rings fill, numbers count up, graph nodes ease in, panels slide, and topics celebrate when covered.

---

## 10. Team and workflow

| Role | Responsible for |
|---|---|
| **Backend developer** | Database, auth, contracts, server actions, AI/RAG pipeline, progress engine, deployment |
| **Frontend developer** | All pages and components, mocks, Graph View, editor, dashboards, design replication, motion |

The two roles work **in parallel without merge conflicts**:
1. **Contracts first:** backend defines all data shapes in `contracts/` (week 2).
2. **Mocks:** frontend builds the full UI against realistic mock data.
3. **Real implementation:** backend builds the real data layer behind the same contracts.
4. **Integration per feature:** each feature switches from mock to real at a checkpoint.
5. **Strict file ownership:** each file belongs to one role.

Details: [`AGENTS.md`](../AGENTS.md) §3 and §5.

---

## 11. Timeline (≈12 weeks)

| Week | Focus |
|---|---|
| 1 | Synopsis, docs, repo bootstrap |
| 2 | Contracts, database, design foundation, mocks |
| 3 | Auth, roles, app shell |
| 4 | Faculty content and file ingestion |
| 5 | Notes |
| 6–7 | Progress engine and Graph View |
| 7–8 | AI features |
| 9 | Assignments and notifications |
| 9–10 | Dashboards |
| 10–11 | Design replication and motion polish |
| 11–12 | Testing, deployment, report, PPT, demo video |

Milestones and tasks: [`docs/roadmap/README.md`](roadmap/README.md).

---

## 12. Deliverables

| Deliverable | Location |
|---|---|
| Working app (deployed) | Vercel URL |
| Source code | GitHub repository |
| Synopsis | `docs/academic/synopsis.md` |
| Requirements (SRS) | `docs/requirements.md` |
| Design docs (architecture, schema, flows, diagrams) | `docs/` |
| Literature review | `literature/` |
| Test cases | `docs/test_cases.md` |
| Project report | `docs/academic/` (final in college format) |
| Presentation + viva prep | `docs/academic/ppt_viva_outline.md` |
| Demo video | Shared link |

---

## 13. Demo story (for the viva)

1. **Ananya** logs in. The dashboard shows Sem 3 at 45%, a 12-day streak and an assignment due Friday.
2. She opens **Graph View**. Algorithms is yellow. She hovers over *Unit 3 – Graphs*: 60%, with Topo Sort and MST missing.
3. She clicks the unit. The side panel shows Prof. Sharma's slides and the assignment.
4. She asks the **AI tutor** about BFS vs DFS. It answers from the professor's slides and cites *slide 12*.
5. She adds a note on **Topological Sort**, and the topic turns ✅ with a small celebration.
6. She takes a **practice quiz** and scores 80%. The unit moves to green.
7. **Prof. Sharma** logs in, sees Section B is weak on MST, and marks the offline assignment submissions.

---

## 14. Honest limitations

- Web-only; needs an internet connection.
- The free AI tier has rate limits; responses are cached to reduce usage.
- Answer quality depends on the faculty material uploaded.
- Scoped to one college/branch for the demo; not multi-institution.

---

## 15. Future scope

Knowledge Web graph · Image/voice to note · Previous-year question bank · Mobile app / PWA · Email and push reminders · Multi-college support · Peer study groups · Spaced-repetition flashcards.
