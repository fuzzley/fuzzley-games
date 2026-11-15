#!/usr/bin/env bash
# Times what `yarn verify` and `yarn check:layout` would cost for a change to
# one game if only that game's steps ran, side by side, each given the cores:
# the root's skills, constraints, dedupe and Prettier checks (not its ESLint
# or tsc), its lint, its typecheck's passes, its tests, and its
# build then its layout check. Then the same steps one after another, as the
# game's own scripts run them. Writes `side-by-side.tsv` and `in-turn.tsv`
# to $LOGS/one-game-<game>/: each part's wall time and exit code.
#
#   one-game.sh <game> [eslint_concurrency]
#
# The typecheck's passes are the workspace's own, `ngc` on TypeScript 6 and
# the rest on TypeScript 7 through `tsc7`, keeping no build info, as step 2 of
# the work log made them; at e6740e04 they were all TypeScript 6's, with
# their build info.
set -uo pipefail
game=$1
conc=${2:-off}
. "$(dirname "$0")/env.sh"
out=$LOGS/one-game-$game
mkdir -p "$out"
cd "$FRONTEND/games/$game"
B=../../node_modules/.bin
root() {
  cd ../.. && y skills:check && y constraints && y dedupe --check &&
    y prettier:check
}
lint() {
  node ../../node_modules/eslint/bin/eslint.js --concurrency="$conc" src tools \
    eslint.config.js stylelint.config.js vite.config.ts vitest.config.ts &&
    y lint:styles
}
typecheck() {
  local codes=0
  $B/ngc -p tsconfig.app.json --noEmit &
  $B/tsc7 -p tsconfig.spec.json --noEmit &
  $B/tsc7 -p tsconfig.node.json &
  $B/tsc7 -p tsconfig.scripts.json &
  for _ in 1 2 3 4; do wait -n || codes=1; done
  return $codes
}
layout() { y build && y check:layout; }
whole() {
  local tsv=$1 start=$2
  printf 'whole\t%.1f\t\n' "$(( $(date +%s%N) - start ))e-9" | tee -a "$tsv"
}
side=$out/side-by-side.tsv
printf 'part\twall_s\texit\n' > "$side"
echo "$game, side by side (ESLint --concurrency=$conc):"
start=$(date +%s%N)
timed "$side" "$out/root.log" root root &
timed "$side" "$out/lint.log" lint lint &
timed "$side" "$out/typecheck.log" typecheck typecheck &
timed "$side" "$out/test.log" test y test &
timed "$side" "$out/layout.log" layout layout &
wait
whole "$side" "$start"
turn=$out/in-turn.tsv
printf 'part\twall_s\texit\n' > "$turn"
echo "$game, one after another, as its scripts run, without the root's:"
start=$(date +%s%N)
timed "$turn" "$out/lint-in-turn.log" lint y lint
timed "$turn" "$out/typecheck-in-turn.log" typecheck y typecheck
timed "$turn" "$out/test-in-turn.log" test y test
timed "$turn" "$out/layout-in-turn.log" layout layout
whole "$turn" "$start"
