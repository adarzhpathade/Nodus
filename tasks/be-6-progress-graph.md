# Task: be-6-progress-graph  (worker: Gemini / agy, role: BACKEND)

## Setup (do first)
- Work ONLY in the worktree `E:\Projects\College Projects\nodus-be6` on branch `be/BE-6-progress-graph`.
- First run `pwd` and `git branch --show-current`. If either is wrong, STOP and report.
- Read `AGENTS.md` (sections 3, 6, 7, 13, 14), `docs/roadmap/BACKEND.md` (BE-6), `contracts/progress.ts`, `contracts/graph.ts`, `contracts/gateway.ts`, and the existing `lib/server-gateway/notes.ts` + `lib/db/queries/notes.ts` as the style reference.

## Goal
Implement BE-6.1 to BE-6.5 and BE-6.7: the progress engine and the real `graph` gateway.

## Files allowed (BE-owned only)
- `lib/progress/**` (new)
- `lib/db/queries/progress.ts`, `lib/db/queries/graph.ts` (new)
- `lib/server-gateway/graph.ts` (new) and the `graph` wiring in `lib/server-gateway/index.ts`
- `lib/actions/graph.ts` only if a mutation is needed (probably not)
- `docs/progress_logic.md` (new, BE-owned), `docs/roadmap/BACKEND.md` (tick BE-6 tasks only)

## Do NOT touch
Anything in `app/**` (except `app/api/**`), `components/**`, `mocks/**`, `contracts/**` (a contract gap goes in "Requests to FE" in BACKEND.md, not an edit), and frozen files (`package.json`, lockfile, configs, `lib/gateway/index.ts`, `lib/utils.ts`). Do not install packages. Do not run build/lint/tests.

## Steps (print "STEP n DONE" after each)
1. `lib/progress/` pure functions, no DB access: topic covered, unit %, subject %, semester %, class unit %, status band (Not started 0 / Low 1-39 / In progress 40-75 / Mastered >75). Formula is AGENTS.md section 6.6 exactly. Edge cases: unit with no topics, no quiz attempted (unit % = coverage x 0.7), best quiz < 50% blocks "covered". This is the ONLY place the formula lives.
2. `lib/db/queries/progress.ts`: fetch the raw inputs for a student and semester (topics, notes per topic, best quiz score per topic, quiz average per unit). Always scope by the current student; never read other students' notes.
3. Student graph data (BE-6.3, `StudentGraph` in `contracts/graph.ts`): nodes (semester root, subjects, units), edges, dashed prerequisite edges, % and status on every node.
4. Hover card + side panel data (BE-6.4): topics with covered flag, note counts, quiz average, resources (section-filtered), nearest assignment with status. Reuse the resources queries that already exist; assignments are not implemented yet (BE-8), so return the contract's empty value for them.
5. Class progress (BE-6.2) and faculty graph (BE-6.5): average unit % per section, weakest topic, students per band, "students needing help" list. Faculty sees aggregates only, never note content. Enforce `requireFacultyTeaches`.
6. Wire `graph` in `lib/server-gateway/index.ts`, mapping DB rows to contract types inside the gateway (DB types never leave `lib/db`). Locked semesters must return LOCKED.
7. Write `docs/progress_logic.md` with 3 worked examples (match the seeded demo: Ananya, Sem 3 Sec B, BFS/DFS/Dijkstra covered, Topo Sort + MST missing). Tick BE-6.1 to BE-6.5 in `docs/roadmap/BACKEND.md`.
8. Unit tests for `lib/progress` only if the repo already has a test runner configured; otherwise skip and say so (BE-6.6 stays unticked).

## Done when
- `getGateway().graph` works with `MOCK_FEATURES` not containing `graph`, for the seeded student and faculty accounts.
- Numbers match the demo story in `docs/progress_logic.md`.
- No `any`, no formula duplicated outside `lib/progress/`.
- Commit on the branch with conventional messages (`feat(be-progress): ...`) and push the branch. Do NOT open a PR and do NOT touch `main`.

## Report (last message)
Files changed, assumptions made, requests for FE, anything you could not verify.
