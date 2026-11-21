#!/usr/bin/env bash
# Prints the sharp and libvips versions frontend/yarn.lock pinned at every
# commit that changed it since the games' screenshots were first taken with
# sharp, collapsing runs of the same versions, to say whether a dependency
# update could explain a screenshot coming out differently.
#
#   docs/repo-size/scripts/screenshots/sharp-versions.sh [since]
#
# Writes docs/repo-size/data/screenshots/sharp-versions.txt.
set -euo pipefail
repo_root=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
out=$repo_root/docs/repo-size/data/screenshots/sharp-versions.txt
since=${1:-2026-10-17}
{
  echo "frontend/yarn.lock's sharp and libvips (linux-x64), oldest first, since $since:"
  git -C "$repo_root" log --reverse --format='%h %cs' --since="$since" --remotes=origin -- frontend/yarn.lock |
    while read -r commit date; do
      lock=$(git -C "$repo_root" show "${commit}:frontend/yarn.lock" 2>/dev/null || true)
      sharp=$(printf '%s\n' "$lock" | grep -A1 '^"sharp@' | awk '/version:/ { print $2 }' | head -1 || true)
      vips=$(printf '%s\n' "$lock" | grep -A1 '^"@img/sharp-libvips-linux-x64@' | awk '/version:/ { print $2 }' | head -1 || true)
      echo "$date $commit sharp=${sharp:-none} libvips=${vips:-none}"
    done | awk '{ key = $3 " " $4; if (key != last) print; last = key }'
} > "$out"
cat "$out"
