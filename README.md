<div align="center">

# NODUS

**Your syllabus as a living knowledge graph.**

NODUS maps your syllabus, connects your notes to it, and uses AI to show you what you know and what you're missing.

![Status](https://img.shields.io/badge/status-in%20development-orange)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)
![Gemini](https://img.shields.io/badge/AI-Gemini-8e75b2)

</div>

---

## The problem

College learning is scattered. Faculty slides live in WhatsApp groups and Drive folders, assignments get announced in class and forgotten, students' notes have no connection to the syllabus, and generic AI answers from the internet instead of from what the professor actually taught.

## The idea

NODUS combines three layers into one map:

| Layer | Built by | What it is |
|---|---|---|
| **Official** | Faculty | Semester → Subject → Unit → Topic, with uploaded notes, slides and assignments |
| **Personal** | Student | Private notes written under topics and linked to each other, Obsidian-style |
| **AI** | System | A tutor, quizzes and a gap finder grounded **only** in the two layers above, with citations |

```
See gaps on the graph  →  write notes / practise  →  topic turns ✅  →  graph turns green
```

## Features

### For students
- **Graph View:** your semester as a tree. Every unit is colored by progress. Hover a unit for a progress card; click it for a side panel with topics, faculty notes, the assignment, Ask AI and Practice.
- **Stats-first dashboard:** coverage rings, activity heatmap, quiz average, study streak, deadlines.
- **Linked notes:** a rich-text editor with a `/` menu, one-click links to notes, topics and units, backlinks, search and Ctrl+K.
- **AI tutor:** answers only from your professor's material and your own notes, and cites the file and slide.
- **Practice quizzes, Analyze Note and Gap Finder.**
- **Assignments:** deadline countdowns and the status your teacher marked.

### For faculty
- **Class Graph View:** class-average progress, weak topics and students who need help.
- **Content manager:** define units and topics, upload PDFs/PPTs per section.
- **Assignments:** create them for chosen sections; students submit on paper and faculty mark Submitted / Late / Not submitted in the app.
- **Tracker and analytics** per section.

## Tech stack

| Area | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| UI | Tailwind CSS 4, shadcn/ui |
| Motion | Motion, GSAP (ScrollTrigger, SplitText), Lenis, React Three Fiber, Lottie |
| Graph & editor | React Flow + dagre, Tiptap |
| Charts | Recharts, Nivo |
| Data | Neon Postgres + pgvector, Drizzle ORM, Neon Auth |
| AI | Google Gemini via the Vercel AI SDK (RAG with citations) |

## Getting started

**Requirements:** Node.js 20+ and npm.

```bash
git clone https://github.com/adarzhpathade/Nodus.git
cd Nodus
npm install
cp .env.example .env.local     # MOCK_FEATURES=all runs the app on mock data, no keys needed
npm run dev                    # http://localhost:3000
```

To use real data, fill in `DATABASE_URL`, the Neon Auth values and `GOOGLE_GENERATIVE_AI_API_KEY` in `.env.local`, then run:

```bash
npm run db:migrate
npm run db:seed
```

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server on port 3000 |
| `npm run dev:be` | Dev server on port 3001 (for a second, backend worktree) |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` / `npm run typecheck` / `npm run format` | ESLint / TypeScript / Prettier |
| `npm run db:generate` / `db:migrate` / `db:studio` / `db:seed` | Drizzle migrations, studio and demo data |
| `npm run test:e2e` | Playwright end-to-end tests |

## How the project is organised

Two roles build NODUS in parallel without merge conflicts:

- **Backend** owns `contracts/`, `lib/` (db, ai, progress, auth, actions, server-gateway), `app/api/` and `proxy.ts`.
- **Frontend** owns the pages in `app/`, `components/`, `hooks/`, `stores/` and `mocks/`.

Backend defines every data shape in `contracts/` first. Frontend builds the UI against realistic mocks, backend builds the real implementation behind the same contracts, and `MOCK_FEATURES` switches each feature from mock to real as it's finished.

```
contracts/ ──► mocks/gateway.ts          (frontend: fake data)
          └──► lib/server-gateway/        (backend: database + AI)
                        ▼
         lib/gateway/index.ts  ← MOCK_FEATURES picks per feature
```

## Documentation

| Doc | Contents |
|---|---|
| [Project overview](docs/PROJECT_OVERVIEW.md) | The full picture: problem, features, progress logic, AI pipeline, demo story |
| [AGENTS.md](AGENTS.md) | Rules for AI coding agents: ownership, workflow, conventions |
| [Roadmap](docs/roadmap/README.md) | Timeline, milestones, integration checkpoints |
| [Backend tracker](docs/roadmap/BACKEND.md) / [Frontend tracker](docs/roadmap/FRONTEND.md) | Task lists and progress per role |

## Status

🚧 **In development** as a college minor project. The repository is bootstrapped; contracts, database and features are being built according to the roadmap.
