#!/usr/bin/env bash
# Probes builds in turn for rounds (wave 9's kept run unless INIT, GO and WAIT say), serving each on PORT (9151 unless
# it says) and printing, for each, the summary probe.mjs prints, writing what it measured to pr-<build>-<round>.json.
# Run from the budget folder.
# Usage: prounds.sh <rounds> <options as JSON> <build>...   (probe builds: probe-<build>-dist, made by PROBE=1 build.sh)
here=$(cd "$(dirname "$0")" && pwd)
F=$(cd "$here/../F1-budget" && pwd)
rounds=$1 opts=$2
shift 2
init=${INIT:-budget-init.js} go=${GO:-go.js} wait=${WAIT:-0}
[ -f "$go" ] || go="$F/$go"
export PORT=${PORT:-9151}
for round in $(seq 1 "$rounds"); do
  for build in "$@"; do
    "$F/serve.sh" "$PWD/probe-$build-dist" > /dev/null || exit 1
    summary=$(timeout 150 node "$here/probe.mjs" "pr-$build-$round.json" "probe-$build-dist/$init" "$go" "$wait" "$here/probe-page.js" "$opts" 2> "pr-$build-$round.log")
    status=$?
    if [ $status = 0 ]; then
      echo "$build $round $summary"
    elif [ $status = 124 ]; then
      echo "$build $round: the probe timed out"
    else
      echo "$build $round: the probe failed: $(tail -1 "pr-$build-$round.log")"
    fi
  done
done
"$F/serve.sh" stop
