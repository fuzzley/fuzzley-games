#!/usr/bin/env bash
# Runs one of CI's test jobs as CI runs it, on 4 cores with `CI` set to
# `true`, in two checkouts in turn, so a slower job on a branch's CI runs
# can be told from the runners' noise. Each checkout must be installed. Each
# round runs them in the other order to the last, so neither always runs
# second, on what the first left warm. Writes `ci-tests-ab.tsv` to
# $LOGS/ci-tests-ab-<label>/: each run's label, the options, its checkout's
# folder and commit, its round, its wall time and its exit code, with each
# run's output beside it.
#
#   ci-tests-ab.sh <label> <checkout-a> <checkout-b> <rounds> <options...>
#
# The options are `yarn test:coverage`'s, as a job of CI's gives them:
#
#   ci-tests-ab.sh breakers ../fg-main-ab . 2 --only asteroid-breaker,brick-breaker --jobs 1
set -uo pipefail
label=$1
a=$(realpath "$2")
b=$(realpath "$3")
rounds=$4
shift 4
. "$(dirname "$0")/env.sh"
out=$LOGS/ci-tests-ab-$label
mkdir -p "$out"
tsv=$out/ci-tests-ab.tsv
printf 'label\toptions\tcheckout\tsha\tround\twall_s\texit\n' > "$tsv"
for round in $(seq "$rounds"); do
  order=("$a" "$b")
  [ $((round % 2)) -eq 0 ] && order=("$b" "$a")
  for checkout in "${order[@]}"; do
    name=$(basename "$checkout")
    sha=$(git -C "$checkout" rev-parse --short HEAD)
    log=$out/$name-$round.log
    start=$(date +%s%N)
    (cd "$checkout/frontend" && CI=true taskset -c 0-3 \
      node "$YARN" test:coverage "$@") > "$log" 2>&1
    rc=$?
    printf '%s\t%s\t%s\t%s\t%s\t%.1f\t%s\n' "$label" "$*" "$name" "$sha" \
      "$round" "$(( $(date +%s%N) - start ))e-9" "$rc" | tee -a "$tsv"
  done
done
