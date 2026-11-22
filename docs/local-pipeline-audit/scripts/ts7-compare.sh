#!/usr/bin/env bash
# Times every plain `tsc` project, the 40 passes 1624f87b's `typecheck`
# scripts ran with `tsc` and the three Angular libraries' `tsconfig.lib.json`
# that `ngc` checks, with no build info, one after another on TypeScript 6
# and then on TypeScript 7.0.2, installed into $LOGS/ts7/. Then the 11 `ngc`
# passes on TypeScript 6 and the 40 plain ones on 7, twelve at a time, and
# the `ngc` passes alone. Writes `times.tsv` to $LOGS/ts7/, and the last
# part `brick-fuzz-pop.tsv`.
#
#   ts7-compare.sh
set -uo pipefail
. "$(dirname "$0")/env.sh"
out=$LOGS/ts7
mkdir -p "$out"
if [ ! -x "$out/node_modules/.bin/tsc" ]; then
  (cd "$out" && npm init -y > /dev/null &&
    npm install --no-audit --no-fund --ignore-scripts typescript@7.0.2 > /dev/null)
fi
T7=$out/node_modules/.bin/tsc
T6=$FRONTEND/node_modules/.bin/tsc
NGC=$FRONTEND/node_modules/.bin/ngc
cd "$FRONTEND"
dirs=(. lib/* site games/*)
plain=()
angular=()
for d in "${dirs[@]}"; do
  for p in app lib spec node scripts; do
    [ -f "$d/tsconfig.$p.json" ] || continue
    if grep -q "ngc -p tsconfig.$p.json" "$d/package.json" 2>/dev/null; then
      angular+=("$d tsconfig.$p.json")
      [ "$p" = lib ] && plain+=("$d tsconfig.$p.json")
    elif [ "$p" != app ]; then
      plain+=("$d tsconfig.$p.json")
    fi
  done
done
tsv=$out/times.tsv
printf 'run\tprojects\twall_s\tfailed\n' > "$tsv"
# Runs each project of a list, one after another, with a tsc.
in_turn() {
  local label=$1 tsc=$2
  shift 2
  local failed=0 start=$(date +%s%N)
  for job in "$@"; do
    read -r d p <<< "$job"
    (cd "$d" && "$tsc" -p "$p" --noEmit > /dev/null 2>&1) || failed=$((failed + 1))
  done
  printf '%s\t%s\t%.1f\t%s\n' "$label" "$#" "$(( $(date +%s%N) - start ))e-9" "$failed" | tee -a "$tsv"
}
in_turn "TypeScript 6, one after another" "$T6" "${plain[@]}"
in_turn "TypeScript 7, one after another" "$T7" "${plain[@]}"
jobs=$out/jobs.txt
: > "$jobs"
for job in "${angular[@]}"; do echo "$job $NGC" >> "$jobs"; done
for job in "${plain[@]}"; do
  read -r d p <<< "$job"
  grep -q "ngc -p $p" "$d/package.json" 2>/dev/null || echo "$job $T7" >> "$jobs"
done
# Runs the jobs of a file, twelve at a time.
twelve() {
  local label=$1 file=$2
  local start=$(date +%s%N)
  local failed
  failed=$(xargs -P 12 -L 1 bash -c 'cd "$0" && "$2" -p "$1" --noEmit > /dev/null 2>&1 || echo x' < "$file" | wc -l)
  printf '%s\t%s\t%.1f\t%s\n' "$label" "$(wc -l < "$file")" "$(( $(date +%s%N) - start ))e-9" "$failed" | tee -a "$tsv"
}
twelve "ngc on 6 and the rest on 7, twelve at a time" "$jobs"
grep "$NGC" "$jobs" > "$out/ngc.txt"
twelve "ngc alone, twelve at a time" "$out/ngc.txt"
# Brick Fuzz Pop's passes, each alone: `ngc`'s on TypeScript 6; then each
# plain one on 6 warm, as 1624f87b's typecheck ran it with its build info,
# run twice and the second timed, then cold on 6 and on 7, with the files
# each reads. Writes `brick-fuzz-pop.tsv` to $LOGS/ts7/.
bfp=$out/brick-fuzz-pop.tsv
printf 'config\tts6_warm_s\tts6_files\tts6_s\tts7_files\tts7_s\n' > "$bfp"
cd "$FRONTEND/games/brick-fuzz-pop"
since() { printf '%.1f' "$(( $(date +%s%N) - $1 ))e-9"; }
start=$(date +%s%N)
"$NGC" -p tsconfig.app.json --noEmit > /dev/null 2>&1
printf 'tsconfig.app.json, ngc\t%s\t\t\t\t\n' "$(since "$start")" | tee -a "$bfp"
for p in spec node scripts; do
  warm=(-p "tsconfig.$p.json" --incremental --tsBuildInfoFile "tsconfig.$p.tsbuildinfo")
  [ "$p" = spec ] && warm+=(--noEmit)
  "$T6" "${warm[@]}" > /dev/null 2>&1
  start=$(date +%s%N)
  "$T6" "${warm[@]}" > /dev/null 2>&1
  row="tsconfig.$p.json"$'\t'"$(since "$start")"
  for tsc in "$T6" "$T7"; do
    start=$(date +%s%N)
    files=$("$tsc" -p "tsconfig.$p.json" --noEmit --extendedDiagnostics 2>&1 |
      awk '/^Files:/ { print $2 }')
    row+=$'\t'"$files"$'\t'"$(since "$start")"
  done
  echo "$row" | tee -a "$bfp"
done
