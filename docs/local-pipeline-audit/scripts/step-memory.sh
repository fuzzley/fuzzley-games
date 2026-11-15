#!/usr/bin/env bash
# Measures the memory each kind of step takes, run alone, for the claims
# `yarn verify:changed` makes of its budget: the most `MemAvailable` fell
# below where it stood before the step, sampled every 100 ms, which counts
# every process the step starts at once. Writes `step-memory.tsv` to
# $LOGS/step-memory/: each step's wall time, exit code and the most memory
# it took, in GB.
#
#   step-memory.sh
set -uo pipefail
. "$(dirname "$0")/env.sh"
out=$LOGS/step-memory
mkdir -p "$out"
tsv=$out/step-memory.tsv
printf 'step\twall_s\texit\tpeak_gb\n' > "$tsv"
available() { awk '/^MemAvailable:/ { print $2 }' /proc/meminfo; }
# Runs a step in a workspace's folder, then prints its row.
#   measured <name> <folder> <command...>
measured() {
  local name=$1 folder=$2
  shift 2
  local before least now start rc sampler
  before=$(available)
  least=$before
  start=$(date +%s%N)
  (cd "$FRONTEND/$folder" && "$@") > "$out/${name// /-}.log" 2>&1 &
  local step=$!
  while kill -0 "$step" 2> /dev/null; do
    now=$(available)
    [ "$now" -lt "$least" ] && least=$now
    sleep 0.1
  done
  wait "$step"
  rc=$?
  printf '%s\t%.1f\t%s\t%.1f\n' "$name" "$(( $(date +%s%N) - start ))e-9" \
    "$rc" "$(( before - least ))e-6" | tee -a "$tsv"
}
measured "brick-fuzz-pop lint" games/brick-fuzz-pop y run lint
measured "solitaire lint" games/solitaire y run lint
measured "site lint" site y run lint
measured "brick-fuzz-pop typecheck" games/brick-fuzz-pop y run typecheck
measured "solitaire typecheck" games/solitaire y run typecheck
measured "brick-fuzz-pop test, 4 workers" games/brick-fuzz-pop y run test --maxWorkers=4
measured "brick-fuzz-pop test, 8 workers" games/brick-fuzz-pop y run test --maxWorkers=8
measured "solitaire test, 4 workers" games/solitaire y run test --maxWorkers=4
measured "solitaire test, 8 workers" games/solitaire y run test --maxWorkers=8
measured "brick-fuzz-pop build" games/brick-fuzz-pop y run build
measured "site build" site y run build
measured "brick-breaker check:layout" games/brick-breaker y run check:layout
