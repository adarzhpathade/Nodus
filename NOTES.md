# NOTES — assumptions log

- 2026-10-17: Task files are written for Gemini workers (agy), not Claude workers. Claude only reviews and merges.
- Every task gives an absolute worktree path and requires `pwd` + branch verification first (past Gemini runs wrote into main).
- agy headless runs auto-deny shell commands, and Claude Code cannot launch agy with --dangerously-skip-permissions. So spawn.sh only PREPARES the worktree; the user starts each agy session with the command it prints.
- Worktrees: ../nodus-be6 (be/BE-6-progress-graph), ../nodus-fe6 (fe/FE-6-graph), ../nodus-fe-int (fe/FE-INT-1-3-tick). node_modules is junctioned from main, no install.
- BE-6.6 unit tests only if a test runner already exists. No package installs.
- BE-6 returns empty assignment data in hover/side panel until BE-8.
- Branch/worktree cleanup (merged be/BE-4, be/BE-5, fe/FE-1, fe/FE-3, fe/FE-5, fe/FE-10, tmp/int-check) is deferred: deleting branches is irreversible and was not requested.
- INT-1/2/3 real-data test is manual: remove features from MOCK_FEATURES and test with demo accounts.
- 2026-10-19: Removed merged worktrees nodus-be6/7/8. nodus-be9 stays until PR #8 is merged.
- 2026-10-19: BE-9 reviewed; I fixed one line myself (top AI topics counted assistant replies; now role = user). PR #8 opened. After #7 and #8 merge, set BE-9 to 3/4 and total to 81/109 in BACKEND.md.
- 2026-10-19: Never use `ln -s` or PowerShell `Remove-Item` on node_modules links (it wiped main's node_modules; restored with `npm ci`). Use `New-Item -ItemType Junction` to create and `cmd /c rmdir` to remove.
- 2026-10-19: FE-6 reviewed (1 worker fixes round + 2 small fixes by me: destructuring rename, 3 scoped set-state-in-effect disables). PR #11. Not browser-tested. BE-10 migration 0002 applied to dev branch only.
- 2026-10-20: Orchestration rewritten. spawn.sh is generic (reads task frontmatter, claude workers run headless via claude -p, agy prepare-only), watch.sh = status table/wait/scope-check/retry, WORKER_RULES.md shared by all workers. Legacy tasks without frontmatter are finished history only.
- 2026-10-20: Added AGENTS.md 5.5 (mandatory docs/changes/<date>-<slug>.md per session) so UI edits made in Antigravity are visible. Orchestrator reads docs/changes/ before reviewing or starting FE tasks.
- 2026-10-20: App shell & student top nav polished in Antigravity session (see docs/changes/2026-10-20-shell-top-nav-polish.md): zero-radius primitives, architectural grid frame & tick rulers, 52px nav height, hover-only subcategory columns with corner notch ⌟, right-side controls removed from student nav, paper texture noise moved behind content (zIndex 0), no bold font on hover.
