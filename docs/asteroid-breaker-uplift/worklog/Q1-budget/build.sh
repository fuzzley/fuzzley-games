#!/usr/bin/env bash
# Builds the game with source maps into <budget folder>/<name>-dist, with the runs its own tools keep: wave 9's
# (budget-init.js), Tempest's (budget-tempest.js) and Foundry's (budget-foundry.js), written by F1's kept-run.mjs and
# wave-run.mjs. With PROBE=1, also a probe build into <budget folder>/probe-<name>-dist whose scene hands probe-page.js
# itself and its layers by name (globalThis.__belt, globalThis.__beltLayers), the scene's source put back after.
# Given a commit or a branch, it builds that, checked out detached in this checkout, and checks out again what was
# checked out before as it ends, however it ends, saying so if it can't; it refuses a checkout holding a tracked change,
# and runs from a copy of itself and of F1's run scripts, as an older commit lacks them. Without one, it builds the
# tree as it stands. YARN runs Yarn (yarn unless it says).
# Usage: build.sh <budget folder> <name> [commit or branch]
set -e
budget=$(cd "$1" && pwd) name=$2 commit=$3
here=$(cd "$(dirname "$0")" && pwd)
if [ -n "$commit" ] && [ ! -f "$here/.build-copy" ]; then
  repo=$(cd "$here/../../../.." && pwd)
  if ! git -C "$repo" diff --quiet || ! git -C "$repo" diff --cached --quiet; then
    echo "the checkout holds a tracked change; commit it or set it aside first" >&2
    exit 1
  fi
  copy=$(mktemp -d)
  cp "$0" "$here/../F1-budget/kept-run.mjs" "$here/../F1-budget/wave-run.mjs" "$copy/" || {
    rm -rf "$copy"
    exit 1
  }
  touch "$copy/.build-copy"
  BUILD_REPO=$repo exec bash "$copy/build.sh" "$@"
fi
scene=src/scene/belt_scene.ts kept="" before=""
cleanup() {
  set +e
  if [ -n "$kept" ]; then cp "$kept" "$game/$scene" || echo "the scene's source is in $kept; put it back by hand" >&2; fi
  if [ -n "$before" ]; then
    git -C "$repo" checkout -q "$before" || echo "the checkout is left on $commit; check out $before by hand" >&2
  fi
  if [ -f "$here/.build-copy" ]; then rm -rf "$here"; fi
}
trap cleanup EXIT
if [ -n "$commit" ]; then
  repo=$BUILD_REPO runs=$here
  before=$(git -C "$repo" symbolic-ref -q --short HEAD || git -C "$repo" rev-parse HEAD)
  git -C "$repo" checkout -q --detach "$commit"
  git -C "$repo" log --oneline -1
else
  repo=$(cd "$here/../../../.." && pwd) runs="$here/../F1-budget"
fi
game="$repo/frontend/games/asteroid-breaker"
build() {
  ${YARN:-yarn} vite build --sourcemap --outDir "$budget/$1" --emptyOutDir > "$budget/build-$1.log" 2>&1 || {
    echo "the build failed; see $budget/build-$1.log" >&2
    return 1
  }
  node "$runs/kept-run.mjs" "$budget/$1/budget-init.js" "$game/tools" > /dev/null
  node "$runs/wave-run.mjs" "$budget/$1/budget-tempest.js" casino 29 "$game/tools" > /dev/null
  node "$runs/wave-run.mjs" "$budget/$1/budget-foundry.js" casino 17 "$game/tools" > /dev/null
}
cd "$game"
build "$name-dist"
if [ "${PROBE:-0}" = 1 ]; then
  cp "$scene" "$budget/belt_scene.keep.ts"
  kept="$budget/belt_scene.keep.ts"
  sed -i 's/    this.madeKit = kit;/    this.madeKit = kit;\n    Object.assign(globalThis, { __belt: this, __beltLayers: layers });/' "$scene"
  grep -q __beltLayers "$scene"
  build "probe-$name-dist"
fi
echo "built $name"
