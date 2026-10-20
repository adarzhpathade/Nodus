# NODUS handoff — end of session 2026-10-20

Read AGENTS.md, CLAUDE.md, memory (MEMORY.md) first. Recent UI edits are documented in `docs/changes/2026-10-20-shell-top-nav-polish.md`.

## Latest Session Summary (2026-10-20 — Antigravity & User Pair Programming)
- **Top Nav & App Shell:**
  - Height reduced from 72px to sleek architectural 52px (`h-13`).
  - Subcategories implemented: `Dashboard` (`/dashboard`), `Syllabus` (`/graph`, `/subjects`), `Workspace` (`/notes`, `/assignments`), `AI & Practice` (`/tutor`, `/practice`).
  - Hover-only opening (no `onClick` toggle, no portal flickering — rendered inline).
  - Submenu column matches the exact cell width (`w-full min-w-full`) with uppercase Geist Mono font (`text-label`) and no arrows or subtitle descriptions.
  - Cell widths set to `w-32 sm:w-36 lg:w-40` with `whitespace-nowrap` so `AI & PRACTICE` never truncates, and `<nav>` has `border-r border-border` to enclose the right edge.
  - Corner notch `⌟` positioned at bottom-right, inverting cleanly with the cell to solid black on hover.
  - Active and hover state orange dots removed; hover now changes only the color (`bg-foreground text-background`) with no font bolding.
  - Right-side controls (Semester switcher, Search, Bell, Profile) removed from student top nav per user direction.
  - Paper texture grain `<Noise />` in `app/layout.tsx` moved from overlay `zIndex: 60` to background `zIndex: 0` behind `relative z-1` content. Opaque `bg-background` removed from `GridFrame.tsx`.
- **Immediate Next Task:**
  - Build the **Student Dashboard** (`app/(student)/dashboard/page.tsx`) widgets one by one under user guidance (Stat cards grid, Subject coverage rings, Activity heatmap, and Assignment deadline countdowns).

## State
- main = f64d0f6 (BE-8 merged). Everything after is in OPEN PRs; the user merges (classifier blocks `gh pr merge` for Claude).
  - #7 `be/BE-tracker-update` — tracker 78/109 + task files + NOTES/spawn/watch (this is also the main folder's current branch).
  - #8 `be/BE-9-dashboard` — BE-9.1-9.3. Reviewed; I fixed one bug (top AI topics counted assistant replies, now role=user). tsc+eslint clean.
  - #9 `be/BE-10-hardening` (base = BE-9 branch) — 10 indexes (migration `0002_charming_ultimates.sql`, **already applied to the dev Neon branch only**, prod untouched), docs/security_review.md, upload route checks faculty teaches the unit's subject, tutor scope checks branch, sanitized AI/health/storage errors. Ticks BE-10.1/10.3/10.4.
  - #10 `be/BE-11-docs` (base = BE-9 branch) — architecture.md, api_contract.md, database_schema.md, environment_setup.md, test_cases_backend.md (50 cases; FE merges into docs/test_cases.md). Its BACKEND.md says 85/109.
  - #11 `fe/FE-6-graph` (base = main) — FE-6.1-6.11 tree graph (student + faculty), tsc clean, eslint 0 errors (5 aria-selected warnings on tree items), 3 scoped `react-hooks/set-state-in-effect` disables. **Never opened in a browser.** Still mock data (`MOCK_FEATURES=all`).
- After merging: if #9/#10 do not retarget to main automatically, `gh pr edit N --base main`. BACKEND.md summary counts will conflict across #7/#9/#10: recompute once (BE-9 3/4, BE-10 3/5, BE-0 5/5, BE-11 per its branch) and FRONTEND.md FE-6 = 12 done (worker wrote 45/101; FE-10.1 still unticked).
- Worktrees still present: ../nodus-be9, ../nodus-be10, ../nodus-be11, ../nodus-fe6 (each has node_modules JUNCTION + .env.local + tasks/ copy). Remove after their PR merges (see safety rule below). ../nodus-be6/7/8 already removed.
- Branch cleanup BLOCKED by the classifier (user must run): `! git branch -D be/BE-4-content be/BE-5-notes fe/FE-1-foundation fe/FE-3-shells fe/FE-5-notes fe/FE-10-theme be/BE-6-progress-graph be/BE-7-ai be/BE-8-assignments tmp/int-check && git push origin --delete be/BE-4-content be/BE-5-notes fe/FE-1-foundation fe/FE-3-shells fe/FE-5-notes fe/FE-10-theme be/BE-6-progress-graph be/BE-7-ai be/BE-8-assignments`. All were verified merged (PRs #1-#6 + earlier BE-4/FE-3) and in sync with origin. Also still stale: be/BE-4 etc. only; old worktrees ../nodus-fe, ../nodus-be are gone.

## Trackers
BE 78/109 on main; with #8-#10: BE-9 3/4 (9.4 = INT-7), BE-10 3/5 (10.2 caching + 10.5 prod seed open), BE-11 docs bits ticked (11.1 permission tests, 11.3 deploy, 11.4, 11.6 open). FE 34/101 on main (+12 with #11).

## Next steps, in order
1. Wait for the user to merge #7 → #8 → #9, #10, #11. Then reconcile tracker counts (one small docs PR on a branch), remove the 4 worktrees, pull main.
2. Write + launch FE tasks (all FE worktrees from origin/main): FE-8 (assignments + notifications UI), FE-9 (dashboards, Nivo heatmap, Recharts), FE-7 (tutor/practice/analyze/gap UI). Write tasks/<name>.md like tasks/fe-6-graph.md (absolute worktree path, pwd+branch check, "no shell/git", allowed files, steps with STEP n DONE). Then `tasks/int-1-3-check.md` (ticks FE-10.1, fixes FE counts).
3. Remaining BE: BE-10.2 caching, BE-6.6 tests (no test runner, package.json frozen), BE-11.1 permission tests, then INT-1..INT-5 real-data checks (remove features from MOCK_FEATURES one by one, demo logins in docs/environment_setup.md; INT-5 needs the Gemini key).
4. User-owned: BE-10.5 production seed, BE-11.3 Vercel deploy, apply migration 0002 to production when deploying (`db:migrate` with the production DATABASE_URL_UNPOOLED — dev only so far).
5. Browser-check the FE-6 graph once (Playwright MCP or the user's dev server on :3000, mock cookie `nodus-mock-role=student|faculty`).

## How the Gemini worker loop works (verified again this session)
- Create worktree from PowerShell: `git worktree add -b <branch> <abs path> origin/main` (or `be/BE-9-dashboard` for stacked work), `Copy-Item .env.local`, `New-Item -ItemType Junction -Path <wt>\node_modules -Target <main>\node_modules`, copy `tasks/<name>.md` into `<wt>\tasks\`.
- Launch (Git Bash, from main folder, with run_in_background): `export PATH="$PATH:$HOME/AppData/Local/agy/bin"; (cd ../<wt> && nohup bash -c "agy --mode accept-edits -p=\"You are the BACKEND|FRONTEND worker. Working directory: <abs path>. Do NOT run shell or git; use file tools only. Read tasks/<name>.md and do every step. Print STEP n DONE and end with the Report.\" > \"<main>/logs/<name>.log\" 2>&1; touch \"<main>/logs/<name>.finished\"" >/dev/null 2>&1 &)`. Its "completed" notification is only the launcher exiting.
- Wait: `./watch.sh <task>:<worktree-folder> ...` with run_in_background; its completion notification is the real wake-up and prints report + tsc + eslint. `rm -f logs/<name>.finished` before re-using a task name.
- First pass of every worker has defects (FE-6: 11 tsc errors — nonexistent `Resource.fileUrl`, union not narrowed, React Flow v12 node typing). Always read the diff, run `npx tsc --noEmit -p . | grep -v LayoutProps` and eslint on the touched folders (watch.sh's eslint output can hide errors: run `npx eslint <folders>` yourself), then send `tasks/<name>-fixes.md` to the same worker. Tiny leftovers (a rename, scoped lint disable) I fix myself.
- Commit footer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`; PR body ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. `gh` is not on Git Bash PATH: use PowerShell and refresh `$env:Path` from Machine+User.

## SAFETY RULES learned the hard way
- **Never `ln -s` or `Remove-Item` a node_modules link.** Git Bash `ln -s` made a real symlink and PowerShell `Remove-Item -Force` then deleted the TARGET's contents (main's node_modules). Fixed with `npm ci` (lockfile unchanged). Create junctions with `New-Item -ItemType Junction`, remove them with `cmd /c rmdir <path>` BEFORE `git worktree remove --force`.
- `jq` is not installed here; use `node` for JSON reads (`doctor.js`-style). Never print settings files whole (secrets).
- Never run `db:migrate` against anything but the dev branch (`.env.local` has NEON_BRANCH=dev). Seed refuses main/production.

## Permissions / classifier
- Blocked for Claude: `gh pr merge`, deleting branches (`git branch -D`, `git push origin --delete`). Do not work around; hand the exact `!` command to the user. Allowed: `gh pr create`, commits/pushes/rebases of feature branches, worktree add/remove.
- Project `.claude/settings.local.json` pins `defaultMode: bypassPermissions` (project-local), so a user-level auto default would not apply here.

## /doctor findings (2026-10-19) — user said "don't do anything", so NOTHING applied
- Healthy: native install 2.1.303 = latest, settings parse OK, 20 agents OK. autoUpdates=false (their choice).
- Proposed, pending the user's "apply cleanup": `skillOverrides` off for ~30 unused `seo*` skills and `enabledPlugins["neon-postgres@neon"]=false` in ~/.claude/settings.json; user runs `/mcp disable Neon` (zero MCP calls in 30 sessions); optionally move the 20 unused `seo-*` agents out of ~/.claude/agents. Est. savings ~5-6k tokens/session. AGENTS.md (42.8k chars) left alone: HUMAN-owned, workers cite it by section number.
- SessionStart:compact hook is slow (avg 7.1s, worst 11s) — plugin-sourced, warning only.
- CLAUDE.md orchestration lines are stale (spawn.sh/claude workers); user's file, not edited.

## Open items for the user
Gemini API key (BE-7 never run live; NOT_COVERED_DISTANCE_THRESHOLD=0.42 needs tuning), real Sem 3 syllabus, design references for FE-10, rotate the Neon API token in ~/.gemini/settings.json, delete old Ohio Neon project square-bird-17216159 (ask first), GitHub branch protection, synopsis (H-01), merge PRs #7-#11, run the branch-delete command, decide on the /doctor cleanup.

## Known review notes
- BE-7 never exercised against live Gemini/pgvector; 3 pre-existing unused-import lint warnings (app/api/ai/tutor/route.ts GatewayError, lib/ai/analyze.ts sql/units) + `unimplementedApi` unused in server-gateway/index.ts.
- BE-8: faculty can only update/delete an assignment if they teach ALL its sections.
- BE-9: quizAverageDelta compares overall average vs attempts older than 7 days (approximation of "vs previous 7 days"); top AI topics are not limited to the faculty's own sections (counts only).
- BE-10: `ai_messages_topic_role_idx` makes `ai_messages_topic_idx` redundant (harmless).
- Unit tests for lib/progress not written (no test runner; package.json frozen).
