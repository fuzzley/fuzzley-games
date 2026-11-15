#!/usr/bin/env bash
# Times each game's layout check alone, as it is, then with
# layout-pages.patch applied, which opens all of a game's pages at once;
# then Brick Breaker's and Brick Fuzz Pop's both ways on 4 cores with Chrome
# drawing WebGL in software, as a GitHub runner's does
# (chrome-swiftshader.sh). The patch is taken out again when it ends.
# Writes `times.tsv` to $LOGS/layout-pages/.
#
#   layout-pages.sh
set -uo pipefail
here=$(cd "$(dirname "$0")" && pwd)
. "$here/env.sh"
out=$LOGS/layout-pages
mkdir -p "$out"
patched=0
cleanup() {
  [ "$patched" = 1 ] && git -C "$REPO" apply -R "$here/layout-pages.patch"
}
trap cleanup EXIT
tsv=$out/times.tsv
printf 'run\twall_s\texit\n' > "$tsv"
games=(brick-breaker brick-fuzz-pop snake asteroid-breaker sudoku)
check() {
  local pages=$1
  for game in "${games[@]}"; do
    (cd "$FRONTEND/games/$game" &&
      timed "$tsv" "$out/$game-$pages.log" "$game, 24 cores, $pages" y check:layout)
  done
  for game in brick-breaker brick-fuzz-pop; do
    (cd "$FRONTEND/games/$game" && export CI=true CHROME_PATH=$here/chrome-swiftshader.sh &&
      timed "$tsv" "$out/$game-4-$pages.log" "$game, 4 cores, software WebGL, $pages" \
        taskset -c 0-3 node "$YARN" check:layout)
  done
}
check "one page at a time"
# The patch fits e6740e04's layout.ts; where it no longer applies, there is
# nothing to compare, so stop rather than time the code as it is.
git -C "$REPO" apply "$here/layout-pages.patch" || {
  echo "layout-pages.patch doesn't apply to this checkout." >&2
  exit 1
}
patched=1
check "all at once"
