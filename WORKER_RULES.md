# WORKER RULES (read first, applies to every task)

You are a WORKER, not the orchestrator. Ignore the "Orchestration" section of CLAUDE.md. Do not spawn agents or write other task files.

1. **Location.** Run `pwd` and `git branch --show-current` first. They must match the WORKTREE and BRANCH in your prompt. If not, STOP and print `ABORT: wrong location`. Never write into the main folder.
2. **Scope.** Edit only files matching `files_allowed` in your task. A needed change elsewhere goes under "Requests" in your report, never into a file.
3. **No questions.** Pick the simplest sensible option and list it under "Assumptions" in your report.
4. **No installs, no migrations, no dev servers, no push, no merge.** Frozen files (AGENTS.md section 3.1) are off limits.
5. **Verification.** Do not run build/lint/tests unless the task's done-when says so. Re-read every file you changed: no `any`, no hex colors, no inline prompts, no model IDs outside lib/ai/config.ts.
6. **Progress.** Print `STEP n DONE` after each step, in the order the task lists them.
7. **Commits.** Claude workers: one commit per logical change on your branch (conventional commits, scope = role, e.g. `feat(be-ai): ...`). agy workers: do not commit; the reviewer does.
8. **Finish.** Write `REPORT.md` in the worktree root (do not commit it) with exactly these sections:
   - **Done** (each done-when item: yes/no)
   - **Files changed**
   - **Assumptions**
   - **Requests** (for the other role / orchestrator)
   - **Unverified** (anything you could not check)

   Then print `TASK COMPLETE`. Nothing after it.
