#!/usr/bin/env bash
# Times each step of `yarn verify` and `yarn check:layout`, one after another,
# as a developer runs them: wall-clock and the CPU every process the step
# started used (user + sys), both from bash's `time`, so a step's cores in use
# is cpu / wall.
#
#   bench.sh <label> [cold]
#
# `cold` empties Prettier's and Vitest's caches, Node's compile cache and
# any tsc build info first. The output of each step, and `steps.tsv`, go to
# $LOGS/<label>/.
#
# The root's tsc is its `typecheck:root`, which exists from step 6 of the
# work log (aecbc5fe), on TypeScript 7 since step 2, keeping no build info.
# `data/steps-warm.tsv` came from this script as it was at b7ec98ac, which
# ran TypeScript 6 with its build info, as 1624f87b does;
# `data/steps-after-step-5.tsv` from it as it is, at c509a31f with step 6's
# work in the tree, uncommitted.
set -uo pipefail
label=$1
mode=${2:-warm}
. "$(dirname "$0")/env.sh"
logs=$LOGS/$label
mkdir -p "$logs"
cd "$FRONTEND"
fe() { y workspaces foreach --all --parallel -vv "$@"; }
ws=(--include "lib/*" --include site --include "games/*")
export TIMEFORMAT='%R %U %S'
step() {
  local name=$1
  shift
  local t
  { t=$( { time "$@" > "$logs/$name.log" 2>&1; } 2>&1 ); } 2>&1
  local rc=$?
  read -r real user sys <<< "$t"
  awk -v n="$name" -v r="$real" -v u="$user" -v s="$sys" -v c="$rc" \
    'BEGIN { printf "%s\t%.1f\t%.1f\t%.1f\t%s\n", n, r, u + s, (u + s) / r, c }' |
    tee -a "$logs/steps.tsv"
}
if [ "$mode" = cold ]; then
  rm -rf node_modules/.cache/prettier node_modules/.vitest-cache \
    node_modules/.cache/node-compile-cache
  find . -name 'tsconfig.*.tsbuildinfo' -not -path '*/node_modules/*' -delete
fi
printf 'step\twall_s\tcpu_s\tcores\texit\n' > "$logs/steps.tsv"
echo "nproc=$(nproc) mode=$mode CI=${CI:-} $(date -Is) $(git rev-parse --short HEAD)" > "$logs/meta.txt"
step skills-check y skills:check
step constraints y constraints
step dedupe-check y dedupe --check
step root-eslint bash -c 'cd .. && frontend/node_modules/.bin/eslint -c frontend/eslint.config.js .agents frontend/tools frontend/yarn.config.cjs frontend/eslint.config.js'
step lint-foreach fe "${ws[@]}" run lint
step prettier-check y prettier:check
step root-tsc y typecheck:root
step typecheck-foreach fe "${ws[@]}" run typecheck
step test y test
step build-games fe --include "games/*" run build
step build-site y workspace site build
step check-layout fe --include "games/*" run check:layout
