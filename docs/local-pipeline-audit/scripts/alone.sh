#!/usr/bin/env bash
# Times each workspace's steps with nothing else running: its lint, its
# typecheck (run twice, the second timed, so tsc's build info is warm as a
# developer's is), its tests on every core, its build and its layout check,
# where it has each. Writes `times.tsv` to $LOGS/alone/, as
# `data/workspace-times-alone.tsv` holds it, which `estimate.mjs` reads.
#
#   alone.sh [workspace...]
set -uo pipefail
. "$(dirname "$0")/env.sh"
out=$LOGS/alone
mkdir -p "$out"
cd "$FRONTEND"
names=("$@")
if [ ${#names[@]} -eq 0 ]; then
  mapfile -t names < <(y workspaces list --json | node -e '
    const lines = require("fs").readFileSync(0, "utf8").trim().split("\n");
    for (const line of lines) {
      const { name, location } = JSON.parse(line);
      if (location !== ".") console.log(name);
    }')
fi
tsv=$out/times.tsv
[ -f "$tsv" ] || printf 'workspace\tlint\ttypecheck\ttest\tbuild\tlayout\n' > "$tsv"
for name in "${names[@]}"; do
  folder=$(y workspaces list --json | node -e '
    const name = process.argv[1];
    for (const line of require("fs").readFileSync(0, "utf8").trim().split("\n")) {
      const w = JSON.parse(line);
      if (w.name === name) console.log(w.location);
    }' "$name")
  scripts=$(node -p "Object.keys(require('./$folder/package.json').scripts).join(' ')")
  row=("$name")
  steps=$out/$(basename "$folder").tsv
  : > "$steps"
  for step in lint typecheck test build check:layout; do
    if [[ " $scripts " != *" $step "* ]]; then
      row+=("0")
      continue
    fi
    [ "$step" = typecheck ] && y workspace "$name" run typecheck > /dev/null 2>&1
    timed "$steps" "$out/$(basename "$folder")-${step/:/-}.log" "$step" \
      y workspace "$name" run "$step" > /dev/null
    row+=("$(tail -1 "$steps" | cut -f2)")
    [ "$(tail -1 "$steps" | cut -f3)" = 0 ] || echo "$name $step failed" >&2
  done
  (IFS=$'\t'; echo "${row[*]}") | tee -a "$tsv"
done
