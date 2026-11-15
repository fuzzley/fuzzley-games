#!/usr/bin/env bash
# Runs `yarn verify`'s steps and `yarn check:layout` side by side rather than
# one after another: lint, typecheck, the tests, and the build then the
# layout check, each started at once. Writes `summary.tsv` to $LOGS/<label>/,
# as `data/overlap-*.tsv` hold it: each part's wall time and exit code, the
# whole run's, and the least memory available while it ran.
#
#   [LINT_JOBS=n TC_JOBS=n] overlap.sh <label> [test options...]
#
# LINT_JOBS and TC_JOBS, when given, run lint's and typecheck's foreach that
# many at once, where Yarn's default is half the cores, with the root's
# commands as e6740e04's `yarn lint` and `yarn typecheck` ran them.
set -uo pipefail
label=$1
shift
. "$(dirname "$0")/env.sh"
logs=$LOGS/$label
mkdir -p "$logs"
cd "$FRONTEND"
parts=$logs/parts.tsv
: > "$parts"
(while :; do
  free -m | awk '/Mem:/ { print $7 }'
  sleep 1
done) > "$logs/free.txt" &
sampler=$!
start=$(date +%s%N)
ws="--include 'lib/*' --include site --include 'games/*'"
if [ -n "${LINT_JOBS:-}" ]; then
  timed "$parts" "$logs/lint.log" lint bash -c "node $YARN skills:check && node $YARN constraints && node $YARN dedupe --check && (cd .. && frontend/node_modules/.bin/eslint -c frontend/eslint.config.js .agents frontend/tools frontend/yarn.config.cjs frontend/eslint.config.js) && node $YARN workspaces foreach --all --parallel --jobs $LINT_JOBS $ws run lint && node $YARN prettier:check" &
  timed "$parts" "$logs/typecheck.log" typecheck bash -c "node_modules/.bin/tsc -p tsconfig.scripts.json --incremental --tsBuildInfoFile tsconfig.scripts.tsbuildinfo && node $YARN workspaces foreach --all --parallel --jobs $TC_JOBS $ws run typecheck" &
else
  timed "$parts" "$logs/lint.log" lint y lint &
  timed "$parts" "$logs/typecheck.log" typecheck y typecheck &
fi
timed "$parts" "$logs/test.log" test y test "$@" &
timed "$parts" "$logs/build-layout.log" build-layout bash -c "node $YARN build && node $YARN check:layout" &
wait %2 %3 %4 %5
end=$(date +%s%N)
kill $sampler
{
  echo "# $label: ${LINT_JOBS:+LINT_JOBS=$LINT_JOBS TC_JOBS=$TC_JOBS, }yarn test $*"
  printf 'part\twall_s\texit\n'
  cat "$parts"
  printf 'whole\t%.1f\t\n' "$(( end - start ))e-9"
  printf 'least_free_mib\t%s\t\n' "$(sort -n "$logs/free.txt" | head -1)"
} > "$logs/summary.tsv"
column -t -s $'\t' "$logs/summary.tsv"
grep -hE "Test Files .*failed|Tests .*failed|timed out" "$logs/test.log" | head -5 || true
