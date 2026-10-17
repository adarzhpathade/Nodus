#!/usr/bin/env bash
# Usage: ./watch.sh <task-name>[:<worktree>] ...   e.g. ./watch.sh be-7-fixes2:nodus-be7 be-8-fixes2:nodus-be8
# Blocks until every logs/<task>.finished exists (checked every 20s, 40 min cap), then prints each worker's
# report and runs tsc + eslint in its worktree. Run it in the background: its exit wakes the reviewer.
root="$(cd "$(dirname "$0")" && pwd)"; parent="$(dirname "$root")"
deadline=$((SECONDS + 2400))
pending=("$@")
while [ ${#pending[@]} -gt 0 ] && [ $SECONDS -lt $deadline ]; do
  next=()
  for item in "${pending[@]}"; do
    name="${item%%:*}"
    [ -f "$root/logs/$name.finished" ] || next+=("$item")
  done
  pending=("${next[@]}")
  [ ${#pending[@]} -gt 0 ] && sleep 20
done
[ ${#pending[@]} -gt 0 ] && echo "TIMEOUT waiting for: ${pending[*]}"
for item in "$@"; do
  name="${item%%:*}"; wt="${item#*:}"
  echo; echo "################ $name"
  cat "$root/logs/$name.log" 2>/dev/null
  if [ "$wt" != "$item" ] && [ -d "$parent/$wt" ]; then
    echo "---- tsc ($wt)"
    (cd "$parent/$wt" && npx tsc --noEmit -p . 2>&1 | grep -v LayoutProps | head -40)
    echo "---- eslint ($wt)"
    (cd "$parent/$wt" && npx eslint lib app/api 2>&1 | tail -20)
  fi
done
echo; echo "WATCH-DONE"
