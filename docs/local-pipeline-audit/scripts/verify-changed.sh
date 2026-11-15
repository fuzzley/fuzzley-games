#!/usr/bin/env bash
# Times `yarn verify:changed`, as a developer runs it: on the branch as it
# stands against origin/main (`branch`, the default), or, with `one-game`,
# against HEAD with a line added to one of Brick Fuzz Pop's source files, so
# the change reaches that game alone. `one-game` refuses a `frontend/` with
# changes of its own, which would widen the reach, puts the file back as it
# found it once it ends, and fails where the run says it reached more than
# the game. Writes the run's output and `times.tsv` to
# $LOGS/verify-changed-<label>/.
#
#   verify-changed.sh <label> [branch | one-game]
set -uo pipefail
label=$1
mode=${2:-branch}
case $mode in
  branch | one-game) ;;
  *)
    echo "verify-changed.sh: no mode named $mode" >&2
    exit 2
    ;;
esac
. "$(dirname "$0")/env.sh"
out=$LOGS/verify-changed-$label
mkdir -p "$out"
tsv=$out/times.tsv
printf 'run\twall_s\texit\n' > "$tsv"
cd "$FRONTEND"
if [ "$mode" = one-game ]; then
  touched=$FRONTEND/games/brick-fuzz-pop/src/rules/grid.ts
  if [ -n "$(git -C "$REPO" status --porcelain -- frontend)" ]; then
    echo "verify-changed.sh: frontend/ has changes; commit or set them aside" >&2
    exit 2
  fi
  cp "$touched" "$out/grid.ts.kept"
  trap 'cp "$out/grid.ts.kept" "$touched" && rm "$out/grid.ts.kept"' EXIT
  # A comment, so the file still passes Prettier's check and lint.
  printf '// Touched by verify-changed.sh.\n' >> "$touched"
  timed "$tsv" "$out/run.log" "one game, against HEAD" y verify:changed --base HEAD
  reach=$(head -n 1 "$out/run.log")
  if [ "$reach" != "What changed since HEAD reaches brick-fuzz-pop." ]; then
    echo "verify-changed.sh: the run reached more than the game: $reach" >&2
    exit 1
  fi
else
  timed "$tsv" "$out/run.log" "the branch, against origin/main" y verify:changed
fi
