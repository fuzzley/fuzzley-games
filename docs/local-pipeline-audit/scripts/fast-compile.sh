#!/usr/bin/env bash
# Tries Analog's fastCompile: Brick Breaker's build with and without it,
# twice each, into $LOGS/fast-compile/, then its layout check on the fast
# build, put in dist/ for the check and the game's own build put back after;
# and Sudoku's one-spec run with and without it, and with Analog's
# compilation API, each on a module cache of its own, primed by a first
# run. The configs, in fast-compile/, are copied into the games for the run
# and deleted after. Writes `times.tsv` to $LOGS/fast-compile/, and the two
# builds' files side by side to `assets.tsv`.
#
#   fast-compile.sh
set -uo pipefail
here=$(cd "$(dirname "$0")" && pwd)
. "$here/env.sh"
out=$LOGS/fast-compile
mkdir -p "$out"
bb=$FRONTEND/games/brick-breaker
sudoku=$FRONTEND/games/sudoku
cleanup() {
  rm -f "$bb/vite.scratch-fast.config.ts" "$sudoku/vitest.scratch-fast.config.ts"
  if [ -d "$out/bb-dist" ]; then
    rm -rf "$bb/dist" && mv "$out/bb-dist" "$bb/dist"
  fi
}
trap cleanup EXIT
cp "$here/fast-compile/vite.config.ts" "$bb/vite.scratch-fast.config.ts"
cp "$here/fast-compile/vitest.config.ts" "$sudoku/vitest.scratch-fast.config.ts"
tsv=$out/times.tsv
printf 'run\twall_s\texit\n' > "$tsv"
cd "$bb"
for fast in 0 1 0 1; do
  (export FAST=$fast
  timed "$tsv" "$out/build-$fast.log" "Brick Breaker build, fastCompile=$fast" \
    ../../node_modules/.bin/vite build -c vite.scratch-fast.config.ts \
    --outDir "$out/bb-fast$fast" --emptyOutDir)
done
du -sb "$out/bb-fast0" "$out/bb-fast1" | tee -a "$out/sizes.txt"
# Each build's files, their hashes taken out of their names, and their
# sizes, side by side in `assets.tsv`, a "-" where one build lacks a file.
listing() {
  (cd "$1" && find . -type f -printf '%p\t%s\n') |
    sed -E 's/-[A-Za-z0-9_-]{8}\./-HASH./' | LC_ALL=C sort
}
{
  printf 'file\tfastCompile=0\tfastCompile=1\n'
  LC_ALL=C join -t $'\t' -a 1 -a 2 -e - -o 0,1.2,2.2 \
    <(listing "$out/bb-fast0") <(listing "$out/bb-fast1")
} > "$out/assets.tsv"
mv dist "$out/bb-dist" && cp -r "$out/bb-fast1" dist
timed "$tsv" "$out/layout-fast.log" "Brick Breaker layout check, on the fastCompile build" y check:layout
cd "$sudoku"
one=src/app/app.component.spec.ts
for variant in "FAST=0" "FAST=1" "API=1"; do
  rm -rf "$out/cache-$variant"
  for run in prime again again; do
    (export "$variant"
    timed "$tsv" "$out/sudoku-$variant-$run.log" "Sudoku one spec, $variant, $run" \
      node "$YARN" vitest run -c vitest.scratch-fast.config.ts \
      --fsModuleCachePath "$out/cache-$variant" "$one")
  done
done
(export API=1
timed "$tsv" "$out/sudoku-api-all.log" "Sudoku every spec, API=1" \
  node "$YARN" vitest run -c vitest.scratch-fast.config.ts --fsModuleCachePath "$out/cache-API=1")
