# Task: be-11-docs (Gemini, BACKEND, docs only)
Work ONLY in your assigned worktree (path given in the launch prompt). No shell or git; file tools only; do not commit. Edit ONLY BE-owned docs: docs/architecture.md (new), docs/progress_logic.md (verify only), docs/api_contract.md, docs/database_schema.md, docs/environment_setup.md, docs/test_cases_backend.md (new), docs/roadmap/BACKEND.md (tick BE-0.2, BE-0.3, BE-0.4, BE-11.2, BE-11.5 only if truly done).
Read the real code first; document what exists, never what you assume.

## Steps (print STEP n DONE)
1. docs/architecture.md (BE-0.2): system diagram (Mermaid) of Next.js app, gateway/mock switch (`MOCK_FEATURES`), contracts, server actions, lib/server-gateway, Neon Postgres + pgvector, Neon Auth, Neon storage, Gemini. RAG pipeline diagram (ingest and tutor query). Explain the gateway/mock pattern and file ownership in a short section.
2. BE-0.4: DFD level 0/1 and three Mermaid sequence diagrams (tutor question, faculty marking, upload ingestion) in docs/architecture.md; match lib/ai/rag/*, app/api/ai/tutor/route.ts, app/api/upload/route.ts, lib/server-gateway/assignments.ts.
3. docs/api_contract.md: make it match the code: list every gateway method / server action / route that exists now (graph, ai, assignments, notifications, dashboard if present), with inputs, outputs, error codes, guards.
4. docs/database_schema.md: verify against lib/db/schema/** (all tables, columns, indexes, enums, relations; ER diagram in Mermaid). Fix drift.
5. docs/environment_setup.md: env vars incl. GOOGLE_GENERATIVE_AI_API_KEY, GROQ_API_KEY, CRON_SECRET, HEALTHCHECK_SECRET, MOCK_FEATURES (explain which features are real now), how to run migrations/seed, demo logins (copy from the existing doc, do not invent).
6. docs/test_cases_backend.md (BE-11.2): at least 40 backend test cases in a table (ID, area, precondition, steps, expected result): auth/roles, locked semesters, notes privacy, resource section visibility, progress formula examples (use docs/progress_logic.md numbers), tutor not-covered and citations, quiz caching and scoring, assignments marking (offline), notifications, faculty scoping. FE merges these into docs/test_cases.md.
End with a Report: files changed, drift found and fixed, anything you could not verify.
