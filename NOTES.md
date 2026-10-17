# NOTES — assumptions log

- 2026-10-17: Task files are written for Gemini workers (agy), not Claude workers. Claude only reviews and merges.
- Every task gives an absolute worktree path and requires `pwd` + branch verification first (past Gemini runs wrote into main).
- agy headless runs auto-deny shell commands, and Claude Code cannot launch agy with --dangerously-skip-permissions. So spawn.sh only PREPARES the worktree; the user starts each agy session with the command it prints.
- Worktrees: ../nodus-be6 (be/BE-6-progress-graph), ../nodus-fe6 (fe/FE-6-graph), ../nodus-fe-int (fe/FE-INT-1-3-tick). node_modules is junctioned from main, no install.
- BE-6.6 unit tests only if a test runner already exists. No package installs.
- BE-6 returns empty assignment data in hover/side panel until BE-8.
- Branch/worktree cleanup (merged be/BE-4, be/BE-5, fe/FE-1, fe/FE-3, fe/FE-5, fe/FE-10, tmp/int-check) is deferred: deleting branches is irreversible and was not requested.
- INT-1/2/3 real-data test is manual: remove features from MOCK_FEATURES and test with demo accounts.
