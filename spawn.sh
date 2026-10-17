#!/usr/bin/env bash
# Usage: ./spawn.sh agy <task-name>
# Prepares the worktree for a Gemini (agy) worker and prints the command to start it.
# Claude Code cannot launch agy itself (permission classifier), so the user runs the printed command.
set -euo pipefail
worker="${1:?worker (agy)}"; name="${2:?task name}"
[ "$worker" = "agy" ] || { echo "only agy workers are supported"; exit 1; }
root="$(cd "$(dirname "$0")" && pwd)"; parent="$(dirname "$root")"
case "$name" in
  be-6-progress-graph) wt="nodus-be6";    br="be/BE-6-progress-graph" ;;
  fe-6-graph)          wt="nodus-fe6";    br="fe/FE-6-graph" ;;
  int-1-3-check)       wt="nodus-fe-int"; br="fe/FE-INT-1-3-tick" ;;
  *) echo "unknown task $name"; exit 1 ;;
esac
mkdir -p "$root/logs"
if [ ! -d "$parent/$wt" ]; then
  git -C "$root" worktree add -b "$br" "$parent/$wt" origin/main
  cp "$root/.env.local" "$parent/$wt/.env.local" 2>/dev/null || true
  MSYS_NO_PATHCONV=1 cmd //c mklink //J "$(cygpath -w "$parent/$wt/node_modules")" "$(cygpath -w "$root/node_modules")" >/dev/null
fi
mkdir -p "$parent/$wt/tasks" && cp "$root/tasks/$name.md" "$parent/$wt/tasks/$name.md"
echo "Ready. In PowerShell run:"
echo "  cd \"$(cygpath -w "$parent/$wt")\""
echo "  agy --mode accept-edits --prompt-interactive=\"\$(Get-Content tasks/$name.md -Raw)\""
echo "When finished, create logs/$name.finished in the main folder."
