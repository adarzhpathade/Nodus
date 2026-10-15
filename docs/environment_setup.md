# NODUS — Environment Setup

> **Owner: BE.** How to run NODUS locally, which Neon branch to use, and the demo logins.

## 1. Prerequisites
- Node.js 20+ and npm
- Git
- Neon CLI: `npm i -g neon@latest`, then `neon login`

## 2. First-time setup

```bash
git clone https://github.com/adarzhpathade/Nodus.git
cd Nodus
npm install
cp .env.example .env.local
```

**Frontend only (mocks):** keep `MOCK_FEATURES=all` and run `npm run dev`. No keys needed.

**With real services:**
```bash
neon checkout dev          # links the project, pulls DATABASE_URL, Auth and Storage vars into .env.local
```
Then fill by hand in `.env.local`:
- `NEON_AUTH_COOKIE_SECRET` — `openssl rand -base64 32`
- `GOOGLE_GENERATIVE_AI_API_KEY` — from Google AI Studio (AI features)

```bash
npm run db:migrate         # apply migrations to the branch in .env.local
npm run db:seed            # fill demo data (dev branch only)
npm run dev                # http://localhost:3000
```

## 3. Neon project & branches

Project **`nodus-singapore`** (`spring-fog-12666043`) in **AWS Asia Pacific (Singapore)** — Postgres, Neon Auth and Object Storage (bucket `nodus-uploads`). Chosen for low latency from India (~80 ms per query).

| Branch | Use | Seeded? |
|---|---|---|
| `main` (default) | Production — deployed app (Vercel env vars) | No — `db:seed` refuses to run here |
| `dev` | Local development for both roles (permanent, set in `neon.ts`) | Yes |

- Switch with `neon checkout <branch>` — it rewrites the Neon vars in `.env.local`.
- Messed-up dev data → `npm run db:seed` again (it wipes and refills NODUS tables; auth users are kept).
- Need a throwaway copy → `neon checkout my-experiment --create` (expires after 7 days).

## 4. Demo logins (dev branch)

Password for every account: **`Nodus-Demo-2026!`**

| Role | Name | Email | Story |
|---|---|---|---|
| Student | Ananya Sharma | `ananya.sharma@nodus-demo.example.com` | Sem 3 · Sec B · 12-day streak · Algorithms › Graphs at BFS/DFS/Dijkstra ✅, Topo Sort/MST missing · BFS assignment pending |
| Student | Rahul Verma | `rahul.verma@nodus-demo.example.com` | Sem 3 · Sec B · diligent · already handed in the BFS assignment |
| Faculty | Prof. Neha Sharma | `neha.sharma@nodus-demo.example.com` | Teaches Data Structures & Algorithms and Discrete Mathematics (A, B, C) · Sec B is weak on MST |
| Faculty | Prof. Arjun Iyer | `arjun.iyer@nodus-demo.example.com` | Teaches DBMS and OOP with Java (A, B, C) |
| Faculty | Prof. Kavita Rao | `kavita.rao@nodus-demo.example.com` | Teaches Computer Organization & Architecture (A, B, C) |

The other 46 students are data-only (no login).

## 5. What the seed creates

| Data | Amount |
|---|---|
| Syllabus | CSE · 8 semesters · 33 subjects · 57 units · 236 topics (Sem 3 current, Sem 4–8 locked) |
| People | 48 students (16 per section A/B/C), 3 faculty |
| Resources | 57 PDFs in `nodus-uploads` + 236 text chunks (embeddings filled by the ingestion pipeline later) |
| Notes | ~3.4k notes, ~130 links |
| Quizzes | 57 cached quizzes, ~960 attempts |
| Assignments | 11 (6 past and marked, 5 upcoming) |
| Tutor | ~45 conversations, ~310 messages |
| Activity | ~8.8k rows over ~120 days |
| Notifications | ~1.3k |

IDs for curriculum, notes, quizzes, resources and assignments are **deterministic** (same every run), so links and mocks stay valid after re-seeding.

## 6. Commands

| Command | Does |
|---|---|
| `npm run db:generate` | Create a migration from schema changes |
| `npm run db:migrate` | Apply migrations (direct connection, shows real errors) |
| `npm run db:seed` | Wipe + seed demo data (`--skip-files` skips PDF uploads) |
| `npm run db:studio` | Browse the database |
| `GET /api/health` | Check Postgres + pgvector, Auth and Storage |
