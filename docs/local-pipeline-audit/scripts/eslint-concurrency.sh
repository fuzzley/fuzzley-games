#!/usr/bin/env bash
# Times Brick Fuzz Pop's ESLint at each `--concurrency`, with the CPU it used
# (user + sys, from bash's `time`) and the peak memory of its processes,
# sampled every 0.3 s. Writes `times.tsv` to $LOGS/eslint-concurrency/.
#
#   eslint-concurrency.sh [game]
set -uo pipefail
game=${1:-brick-fuzz-pop}
. "$(dirname "$0")/env.sh"
out=$LOGS/eslint-concurrency
mkdir -p "$out"
cd "$FRONTEND/games/$game"
tsv=$out/times.tsv
printf 'concurrency\twall_s\tcpu_s\tpeak_mib\texit\n' > "$tsv"
export TIMEFORMAT='%R %U %S'
for c in off 2 4 8 auto; do
  (peak=0
  while :; do
    rss=$(ps -eo rss,args | awk '/eslint\.js/ && !/awk/ { s += $1 } END { print s + 0 }')
    [ "$rss" -gt "$peak" ] && peak=$rss
    echo "$peak" > "$out/peak-$c"
    sleep 0.3
  done) &
  sampler=$!
  t=$( { time node ../../node_modules/eslint/bin/eslint.js --concurrency="$c" src tools \
    eslint.config.js stylelint.config.js vite.config.ts vitest.config.ts > "$out/$c.log" 2>&1; } 2>&1 )
  rc=$?
  kill $sampler
  read -r real user sys <<< "$t"
  awk -v c="$c" -v r="$real" -v u="$user" -v s="$sys" -v p="$(cat "$out/peak-$c")" -v x="$rc" \
    'BEGIN { printf "%s\t%.1f\t%.0f\t%.0f\t%s\n", c, r, u + s, p / 1024, x }' | tee -a "$tsv"
done
