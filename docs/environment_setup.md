# NODUS — Environment Setup & Configuration

> **Owner: BE.** Operational setup guide, environment variable specification, Neon branch management, and demo accounts.
> Referenced tasks: `BE-0.5`, `BE-11.5`.

---

## 1. Prerequisites

Before running NODUS locally, ensure your machine has:
- **Node.js:** v20.x or higher (LTS recommended)
- **Package Manager:** `npm` (v10+)
- **Version Control:** `git`
- **Neon CLI (optional but recommended):**
  ```bash
  npm i -g neon@latest
  neon login
  ```

---

## 2. Quickstart Guide

### 2.1 Repository Setup

```bash
git clone https://github.com/adarzhpathade/Nodus.git
cd Nodus
npm install
cp .env.example .env.local
```

### 2.2 Execution Modes

#### Mode A: Frontend Isolated Development (Mocks Only)
In `.env.local`, set:
```bash
MOCK_FEATURES=all
```
Run the development server:
```bash
npm run dev # Runs on http://localhost:3000
```
*No cloud accounts, database connections, or AI API keys are required in this mode.*

#### Mode B: Full-Stack Development (Real Services)
1. Link your environment to the Neon development branch:
   ```bash
   neon checkout dev
   ```
   *(This automatically populates `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_AUTH_BASE_URL`, and Object Storage keys in `.env.local`)*.

2. Populate required application secrets in `.env.local`:
   - `NEON_AUTH_COOKIE_SECRET`: Generate a 32+ character key:
     ```bash
     openssl rand -base64 32
     ```
   - `GOOGLE_GENERATIVE_AI_API_KEY`: Obtain from Google AI Studio (required for Gemini 2.0 Flash chat and `text-embedding-004` embeddings).
   - `GROQ_API_KEY` (optional): Fallback chat model key for `llama-3.3-70b-versatile`.
   - `CRON_SECRET`: Random string for protecting `/api/cron/reminders`.
   - `HEALTHCHECK_SECRET`: Secret token for accessing `/api/health` in production.
   - Set `MOCK_FEATURES=` (empty string) to enable all real backend services.

3. Apply database migrations and seed demo data:
   ```bash
   npm run db:migrate   # Applies pgvector extension and core schema migrations
   npm run db:seed      # Seeds demo syllabus, realistic students, notes, quizzes, and assignments
   npm run dev          # Start Next.js development server
   ```

---

## 3. Environment Variables Reference

| Variable | Required? | Purpose & Description | Example Value |
|---|---|---|---|
| `DATABASE_URL` | Mode B | Pooled connection string used by the Next.js runtime. Uses Neon connection pooling (`-pooler`). | `postgresql://user:pass@ep-spring-fog-12666043-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require` |
| `DATABASE_URL_UNPOOLED` | Mode B | Direct (unpooled) connection string. Required by `drizzle-kit` for running migrations and DDL statements. | `postgresql://user:pass@ep-spring-fog-12666043.ap-southeast-1.aws.neon.tech/neondb?sslmode=require` |
| `NEON_BRANCH` | Optional | Current active Neon branch identifier. | `dev` |
| `NEON_AUTH_BASE_URL` | Mode B | Base URL of Neon Auth service. | `https://auth.nodus.example.com` |
| `NEON_AUTH_JWKS_URL` | Optional | JWKS URL for JSON Web Key validation. | `https://auth.nodus.example.com/.well-known/jwks.json` |
| `NEON_AUTH_COOKIE_SECRET` | Mode B | Secret key used to encrypt and sign auth session cookies. Must be $\ge 32$ characters. | `openssl rand -base64 32` |
| `AWS_ACCESS_KEY_ID` | Mode B | S3-compatible access key for Neon Object Storage (`nodus-uploads` bucket). | `AKI...` |
| `AWS_SECRET_ACCESS_KEY` | Mode B | S3-compatible secret key for Neon Object Storage. | `secret...` |
| `AWS_ENDPOINT_URL_S3` | Mode B | S3-compatible endpoint URL for Neon Object Storage. | `https://s3.ap-southeast-1.amazonaws.com` |
| `AWS_REGION` | Mode B | AWS region where the Neon Storage bucket resides. | `ap-southeast-1` |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Mode B | Google Gemini API key. Powers `gemini-2.0-flash` chat, note analyses, quiz generation, and `text-embedding-004` (768 dimensions). | `AIzaSy...` |
| `GROQ_API_KEY` | Optional | Groq Cloud API key. Serves as automatic fallback chat model (`llama-3.3-70b-versatile`) if Gemini key is omitted. | `gsk_...` |
| `CRON_SECRET` | Mode B | Shared bearer token for authenticating Vercel Cron requests to `GET /api/cron/reminders`. | `c7a8f3...` |
| `HEALTHCHECK_SECRET` | Optional | Header value (`x-health-secret`) required to access `GET /api/health` in production environments. | `health_sec_...` |
| `MOCK_FEATURES` | All | Comma-separated list of feature domains to mock, or `"all"`. Leave empty (`""`) to run all real services. | `all` or `""` |
| `NEXT_PUBLIC_APP_URL` | All | Public canonical URL of the application. | `http://localhost:3000` |

### 3.1 Understanding `MOCK_FEATURES` and Real Backend Status

The `MOCK_FEATURES` variable allows incremental decoupling. The valid feature keys are:
`auth`, `curriculum`, `resources`, `notes`, `graph`, `ai`, `assignments`, `dashboard`, `notifications`.

**Current Implementation Status:**
**All 9 feature namespaces are fully built and operational on the real backend:**
- `auth`: Real Neon Auth proxy, session guards, profile queries, cookie-based semester selection.
- `curriculum`: Real semester/subject/unit/topic queries and faculty CRUD with conflict protection.
- `resources`: Real S3 upload to `nodus-uploads`, PDF/PPT text extraction, chunking, and pgvector embeddings.
- `notes`: Real owner-isolated note CRUD, Markdown storage, link graph, full-text GIN search, and background re-embedding.
- `graph`: Real deterministic progress engine calculations, dependency DAG edges, and hover cards.
- `ai`: Real RAG retrieval over slides + private notes, streaming cited tutor chat, quiz generation, and note analysis.
- `assignments`: Real offline paper assignment management, faculty section marking, and student views.
- `dashboard`: Real 180-day study activity heatmap, study streak calculator, coverage rings, and radar charts.
- `notifications`: Real in-app notifications and scheduled deadline reminders cron.

*To run against the live database and AI models, set `MOCK_FEATURES=""`.*

---

## 4. Neon Project & Branching Strategy

NODUS is provisioned in the **AWS Asia Pacific (Singapore)** region (`ap-southeast-1`) for low latency (~80ms per query across India):
- **Project Name:** `nodus-singapore` (`spring-fog-12666043`)
- **Capabilities:** PostgreSQL 18 with `pgvector`, Neon Auth, and Neon Object Storage (`nodus-uploads` bucket).

| Branch Name | Primary Usage | Direct Migrations | Seed Allowed? |
|---|---|---|---|
| `main` (default) | Production deployment on Vercel. Contains live student and faculty data. | Via production pipeline only | **No** (`db:seed` throws an error to protect prod) |
| `dev` | Shared development branch for feature implementation and testing. | Yes (`npm run db:migrate`) | **Yes** (`npm run db:seed`) |
| `exp-<name>` | Ephemeral developer branches for testing schema experiments. | Yes | Yes |

To switch branches using the Neon CLI:
```bash
neon checkout dev          # Updates environment variables in .env.local
neon checkout main         # Points local environment to production readouts
```

---

## 5. Demo Accounts & Test Personas (Dev Branch)

All demo accounts share the standard development password:
$$\text{Password: } \mathbf{Nodus-Demo-2026!}$$

| Role | Persona Name | Email Address | Academic Placement | Story & Context |
|---|---|---|---|---|
| **Student** | **Ananya Sharma** | `ananya.sharma@nodus-demo.example.com` | CSE, Sem 3, Sec B | 12-day study streak · CS201 Algorithms: Unit 3 (Graphs) has BFS, DFS, Dijkstra ✅ (covered), Topological Sort and MST missing ⬜ · Upcoming BFS assignment pending. |
| **Student** | **Rahul Verma** | `rahul.verma@nodus-demo.example.com` | CSE, Sem 3, Sec B | Diligent student · 100% quiz scores on Unit 1 · Has already handed in the BFS assignment on paper (marked "Submitted"). |
| **Faculty** | **Prof. Neha Sharma** | `neha.sharma@nodus-demo.example.com` | Faculty (CSE Dept) | Teaches *Data Structures & Algorithms* (CS201) and *Discrete Mathematics* to Sections A, B, and C · Section B is weak on Minimum Spanning Trees (MST). |
| **Faculty** | **Prof. Arjun Iyer** | `arjun.iyer@nodus-demo.example.com` | Faculty (CSE Dept) | Teaches *Database Management Systems* (DBMS) and *Object-Oriented Programming with Java* to Sections A, B, and C. |
| **Faculty** | **Prof. Kavita Rao** | `kavita.rao@nodus-demo.example.com` | Faculty (CSE Dept) | Teaches *Computer Organization & Architecture* (COA) to Sections A, B, and C. |

*(The remaining 46 students in the cohort are synthetic data records for section analytics and class average calculations; they do not have active login credentials).*

---

## 6. What the Database Seed Generates

Executing `npm run db:seed` establishes a deterministic academic dataset:
- **Curriculum:** 1 Branch (CSE), 8 Semesters (Semester 3 active, Semesters 4–8 locked), 33 Subjects, 57 Units, 236 Topics.
- **Roster:** 48 Students (16 students per section across Sections A, B, and C), 3 Faculty members.
- **Faculty Materials:** 57 lecture slide PDFs placed in `nodus-uploads` + 236 baseline text chunks.
- **Student Notes:** ~3,400 realistic student notes with ~130 cross-links.
- **Quizzes & Attempts:** 57 pre-generated cached quizzes with ~960 graded student attempts.
- **Assignments:** 11 course assignments (6 past marked assignments, 5 upcoming deadlines).
- **AI Tutor History:** ~45 tutor dialogs with ~310 messages and grounded citation records.
- **Activity & Telemetry:** ~8,800 activity records spanning 120 days, powering realistic heatmaps and streaks.
- **Notifications:** ~1,300 in-app notifications.

*Entity IDs (subjects, units, topics, assignments, demo students) are generated deterministically so mock fixtures and hardcoded test cases remain stable across reseeds.*

---

## 7. Developer CLI Commands Reference

| Command | Action Performed |
|---|---|
| `npm run dev` | Starts Next.js development server on `http://localhost:3000` (port 3001 if using `npm run dev:be`). |
| `npm run build` | Compiles production Next.js application and validates TypeScript types. |
| `npm run lint` | Runs ESLint with boundary rules preventing FE from importing BE internals. |
| `npm run db:generate` | Inspects `lib/db/schema/*` and generates incremental Drizzle SQL migration files in `lib/db/migrations/`. |
| `npm run db:migrate` | Connects directly via `DATABASE_URL_UNPOOLED` and applies pending migrations to the database. |
| `npm run db:seed` | Wipes and repopulates the dev database with the standard demo dataset (`--skip-files` skips S3 uploads). |
| `npm run db:studio` | Launches Drizzle Studio database explorer on `https://local.drizzle.studio`. |
| `GET /api/health` | HTTP endpoint verifying live connectivity to Postgres, pgvector, Neon Auth, and Neon Object Storage. |

---
