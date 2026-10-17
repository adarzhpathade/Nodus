# Task: be-7-ai  (worker: Gemini / agy, role: BACKEND)

## Setup
- Work ONLY in the worktree `E:\Projects\College Projects\nodus-be7` (branch `be/BE-7-ai`).
- Do NOT run shell commands or git (they are denied). Use only file read/write/edit/search tools. Do not commit or push; the reviewer does that.
- Read `AGENTS.md` (sections 3, 10, 13, 14), `docs/roadmap/BACKEND.md` (BE-5.6, BE-7), `contracts/ai.ts`, `contracts/gateway.ts`, `lib/ai/config.ts`, everything in `lib/ai/rag/`, `app/api/ai/tutor/route.ts`, `lib/actions/ai.ts`, `lib/db/schema/ai.ts`, `lib/db/schema/resources.ts`, `lib/db/schema/notes.ts`, and the style references `lib/server-gateway/notes.ts`, `lib/db/queries/notes.ts`.
- The Gemini key `GOOGLE_GENERATIVE_AI_API_KEY` may be missing. All AI calls must degrade to a typed `AI_UNAVAILABLE` GatewayError, never crash, and never invent an answer.

## Goal
Implement BE-5.6 and BE-7.1 to BE-7.10 EXCEPT anything that needs `lib/progress` (BE-7.7 progress update and BE-7.9 gap finder's coverage signal): for those, import nothing from `lib/progress` yet; leave a clearly marked `TODO(BE-6)` seam and say so in the report.

## Files allowed (BE-owned only)
- `lib/ai/**` (config.ts, prompts/, schemas.ts, rag/, new retrieval/quiz/analyze/gap modules)
- `lib/db/queries/ai.ts` (new), and `lib/db/queries/notes.ts` ONLY to add a function that re-chunks/embeds a note
- `lib/server-gateway/ai.ts` (new) and the `ai` line in `lib/server-gateway/index.ts` (replace ONLY that line + add the import)
- `lib/actions/ai.ts` only if an action is missing
- `app/api/ai/tutor/route.ts`
- `docs/roadmap/BACKEND.md` (tick BE-7 / BE-5.6 tasks you finish)

## Do NOT touch
`app/**` except `app/api/**`, `components/**`, `mocks/**`, `contracts/**`, frozen files, `lib/progress/**`, `lib/server-gateway/graph.ts`, assignments/notifications files. No package installs (`ai`, `@ai-sdk/google`, `@ai-sdk/groq` are already installed). No build/lint/tests.

## Rules
- Model IDs and provider config ONLY in `lib/ai/config.ts`. Prompts ONLY in `lib/ai/prompts/`. Structured outputs validated with Zod from `lib/ai/schemas.ts`.
- Answer ONLY from retrieved sources; cite every claim by source id; if retrieval is weak return the "not covered" response and suggest a unit/topic. Never send other students' data to the model: context = faculty resources visible to the student's section + THEIR OWN notes.
- Retrieval applies the same permission filters as normal queries (section visibility, owner, semester not locked, scope subject/unit).
- Cache quizzes (per unit/topic, `sourceHash`) and note analyses (by content hash). Map provider 429/quota errors to `RATE_LIMITED` with `retryAfterSeconds`, other provider errors to `AI_UNAVAILABLE`.
- Respect the `ai` mock branch in the tutor route (canned stream when `ai` is in `MOCK_FEATURES`).

## Steps (print "STEP n DONE" after each)
1. `config.ts` (chat/embedding models, provider selection, optional Groq fallback for chat only), `schemas.ts` (quiz, analysis, gap output), `prompts/` (tutor, quiz, analyze, gap).
2. Note embeddings (BE-5.6): chunk + embed on note save, debounced/background (`waitUntil`), replace the note's `note_chunks`.
3. Retrieval: embed the question, vector search over `resource_chunks` + the student's `note_chunks` with scope and permission filters, top-k, similarity threshold for "not covered".
4. Tutor route: stream answer with citations (C-07 shapes), not-covered fallback, save conversation/messages, log `ai_question` activity, store best-matching `topicId`.
5. Conversations: `listConversations`, `getConversation`, `deleteConversation` (own only).
6. Quiz: `generateQuiz` (from faculty material of the unit/topic only, 5-10 MCQs, Zod-validated, cached unless `fresh`), `getQuiz`, `submitQuizAttempt` (score, store attempt, log `quiz_attempted`; progress recompute is `TODO(BE-6)`), `listQuizAttempts`.
7. `analyzeNote` (cached by content hash) and `getGapReport` (compare the unit's topics with the student's notes; coverage signal from `lib/progress` is `TODO(BE-6)`, for now use "topic has >=1 note").
8. `lib/server-gateway/ai.ts` implementing `AiApi`, wired into the index. Tick finished tasks in `docs/roadmap/BACKEND.md`.

## Report (last message)
Files changed, assumptions, the exact list of `TODO(BE-6)` seams, requests for FE/reviewer, anything unverified.
