## Orchestration
- Never ask me questions. Decide, log assumptions in NOTES.md, continue.
- Split my request into tasks/<name>.md from tasks/_TEMPLATE.md (frontmatter: branch, worker, files_allowed; then goal, steps, done-when). Disjoint files_allowed per parallel task.
- Launch: nohup ./spawn.sh <claude|agy> <name> &  (agy only prepares the worktree; the user runs the printed command, then ./watch.sh done <name>)
- Max 5 workers at once. Monitor with ./watch.sh (table) and ./watch.sh wait 120 (blocks until a state change).
- Workers follow WORKER_RULES.md and end with REPORT.md + "TASK COMPLETE". No REPORT.md = failed.
- Review: ./watch.sh check <name> (scope check + report), read the diff, run tsc/tests, retry via ./watch.sh retry <name> (max 3), merge, report to me.

@AGENTS.md
