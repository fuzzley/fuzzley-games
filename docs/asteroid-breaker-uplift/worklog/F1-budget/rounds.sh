#!/usr/bin/env bash
# Traces each build in turn, for a number of rounds, each in a Chrome of its own, and prints each trace's median frame and the bar's figures at its end.
# Run it from the folder that holds each build as <build>-dist, its init script inside it; the traces are written there.
# Usage: rounds.sh <rounds> <prefix> <go script> <wait ms> <init file name> <build>...
# FIRST starts at a later round; PROFILE=1 and TRACE_MS pass on to trace.mjs.
here=$(cd "$(dirname "$0")" && pwd)
rounds=$1 prefix=$2 go=$3 wait=$4 init=$5
shift 5
# A go script not in the builds' folder is taken from this one.
[ -f "$go" ] || go="$here/$go"
for round in $(seq "${FIRST:-1}" "$rounds"); do
  for build in "$@"; do
    "$here/serve.sh" "$PWD/$build-dist" > /dev/null || exit 1
    out="$prefix-$build-$round.json"
    load=$(cut -d' ' -f1 /proc/loadavg)
    node "$here/trace.mjs" "$out" "$build-dist/$init" "$go" "$wait" 2> /dev/null
    echo "$build $round load=$load $(node "$here/frames.mjs" "$out") bar: $(cat "${out%.json}.txt" 2> /dev/null)"
  done
done
"$here/serve.sh" stop
