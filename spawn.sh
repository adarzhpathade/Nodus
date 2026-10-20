#!/usr/bin/env bash
# Usage: ./spawn.sh <claude|agy> <task-name>      (task file: tasks/<task-name>.md with frontmatter)
# Prepares the worktree, then:
#   claude -> runs a headless Claude worker in the foreground (use: nohup ./spawn.sh claude NAME &)
#   agy    -> only prepares; prints the command the USER must run (Claude Code cannot launch agy)
# State is written to logs/<name>.status: prepared | running | done | failed | aborted
set -uo pipefail
worker="${1:?worker: claude|agy}"; name="${2:?task name}"
root="$(cd "$(dirname "$0")" && pwd)"; parent="$(dirname "$root")"
task="$root/tasks/$name.md"; logs="$root/logs"
[ -f "$task" ] || { echo "no such task file: $task"; exit 1; }
mkdir -p "$logs"
status() { echo "$1" > "$logs/$name.status"; }
fm() { sed -n '/^---$/,/^---$/p' "$task" | grep -m1 "^$1:" | sed "s/^$1:[[:space:]]*//; s/[[:space:]]*#.*$//"; }

br="$(fm branch)"; base="$(fm base)"; base="${base:-origin/main}"; allowed="$(fm files_allowed)"
if [ -z "$br" ] || [ -z "$allowed" ]; then echo "task frontmatter needs branch and files_allowed"; status aborted; exit 1; fi
wt="nodus-$name"; wtpath="$parent/$wt"
rm -f "$logs/$name.finished"

if [ ! -d "$wtpath" ]; then
  git -C "$root" fetch -q origin 2>/dev/null || true
  git -C "$root" worktree add -b "$br" "$wtpath" "$base" || { echo "worktree add failed"; status aborted; exit 1; }
  cp "$root/.env.local" "$wtpath/.env.local" 2>/dev/null || true
  # junction only; never ln -s or Remove-Item on node_modules (see NOTES.md)
  MSYS_NO_PATHCONV=1 cmd //c mklink //J "$(cygpath -w "$wtpath/node_modules")" "$(cygpath -w "$root/node_modules")" >/dev/null
fi
mkdir -p "$wtpath/tasks"
cp "$task" "$wtpath/tasks/$name.md"; cp "$root/WORKER_RULES.md" "$wtpath/WORKER_RULES.md"

prompt="You are a worker. WORKTREE: $wtpath  BRANCH: $br
Read WORKER_RULES.md, then tasks/$name.md, then follow them exactly. Allowed files: $allowed"

if [ "$worker" = "agy" ]; then
  status prepared
  echo "Ready. In PowerShell run:"
  echo "  cd \"$(cygpath -w "$wtpath")\""
  echo "  agy --mode accept-edits --prompt-interactive=\"$prompt\""
  echo "When it prints TASK COMPLETE, run: ./watch.sh done $name"
  exit 0
fi

status running
cd "$wtpath" || exit 1
claude -p "$prompt" --permission-mode acceptEdits \
  --allowedTools "Read,Edit,Write,Glob,Grep,Bash(git status:*),Bash(git diff:*),Bash(git add:*),Bash(git commit:*),Bash(git log:*),Bash(pwd),Bash(ls:*)" \
  > "$logs/$name.log" 2>&1
code=$?
if [ $code -eq 0 ] && grep -q "TASK COMPLETE" "$logs/$name.log"; then status done; else status failed; fi
echo "exit=$code" > "$logs/$name.finished"
