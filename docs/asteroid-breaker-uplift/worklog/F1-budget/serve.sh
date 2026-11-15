#!/usr/bin/env bash
# Serves a build of the game on port 9141 (or PORT) with Vite's preview, stopping whatever this script served there before.
# Usage: serve.sh <dist folder> | serve.sh stop
# YARN runs Yarn (yarn unless it says, e.g. "node <path to yarn.js>"); the preview's log goes to $TMPDIR.
# It fails, rather than letting another server's page be traced, if anything else holds the port.
port=${PORT:-9141}
for pid in $(ps -eo pid,args | awk -v p="preview --port $port" 'index($0, p) && !/awk/ {print $1}'); do
  kill "$pid" 2> /dev/null
done
sleep 1
[ "$1" = stop ] && exit 0
if curl -s -o /dev/null "http://localhost:$port/"; then
  echo "something else is serving port $port" >&2
  exit 1
fi
cd "$(dirname "$0")/../../../../frontend/games/asteroid-breaker" || exit 1
log="${TMPDIR:-/tmp}/f1-budget-preview.log"
nohup ${YARN:-yarn} preview --port "$port" --strictPort --outDir "$1" > "$log" 2>&1 &
preview=$!
for _ in $(seq 1 60); do
  curl -s -o /dev/null "http://localhost:$port/" && break
  sleep 0.25
done
if ! kill -0 "$preview" 2> /dev/null || ! curl -s -o /dev/null "http://localhost:$port/"; then
  echo "the preview didn't start; see $log" >&2
  exit 1
fi
echo "serving $1"
