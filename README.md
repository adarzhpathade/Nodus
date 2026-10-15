# NODUS

> Maps your syllabus, connects your notes to it, and uses AI to show you what you know and what you're missing.

A college minor project: a curriculum knowledge graph, Obsidian-style linked notes, and a syllabus-grounded AI tutor (Gemini) — with an Awwwards-level interface.

## Start here

| Doc | For |
|---|---|
| [`docs/PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md) | What NODUS is (humans) |
| [`AGENTS.md`](AGENTS.md) | Rules for AI coding agents |
| [`docs/roadmap/README.md`](docs/roadmap/README.md) | Timeline, milestones, integration checkpoints |
| [`docs/roadmap/BACKEND.md`](docs/roadmap/BACKEND.md) / [`FRONTEND.md`](docs/roadmap/FRONTEND.md) | Task trackers per role |

## Quick start

```bash
npm install
cp .env.example .env.local     # MOCK_FEATURES=all runs the app on mock data
npm run dev                    # http://localhost:3000
```

## Scripts

| Script | Does |
|---|---|
| `npm run dev` | Dev server on port 3000 (frontend) |
| `npm run dev:be` | Dev server on port 3001 (backend worktree) |
| `npm run build` / `start` | Production build / serve |
| `npm run lint` / `format` | ESLint / Prettier |
| `npm run db:generate` / `db:migrate` / `db:studio` / `db:seed` | Drizzle + seed |
| `npm run test:e2e` | Playwright tests |

## Tech

Next.js 16 · TypeScript · Tailwind CSS 4 · shadcn/ui · Motion · GSAP · Lenis · React Three Fiber · Lottie · React Flow · Tiptap · Recharts · Nivo · Neon Postgres + pgvector · Drizzle · Neon Auth · Gemini via Vercel AI SDK
