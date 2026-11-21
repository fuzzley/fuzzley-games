#!/usr/bin/env bash
# Says, for each game whose dist/ is built, whether its build copied every
# screenshot under its public/ into dist/, byte for byte, and whether any
# image under its docs/ (outside public/) reached dist/. Then says what the
# Docker build leaves out of its context.
#
#   docs/repo-size/scripts/screenshots/dist-check.sh
#
# Build a game first (yarn build in its workspace). Writes
# docs/repo-size/data/screenshots/dist-check.txt.
set -euo pipefail
repo_root=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
out=$repo_root/docs/repo-size/data/screenshots/dist-check.txt
{
  for game in "$repo_root"/frontend/games/*/; do
    name=$(basename "$game")
    if [ ! -d "$game/dist" ]; then
      echo "$name: no dist/ built"
      continue
    fi
    public=$(cd "$game/public" && find docs/screenshots -type f | sort)
    copied=0
    same=0
    for file in $public; do
      if [ -f "$game/dist/$file" ]; then
        copied=$((copied + 1))
        cmp -s "$game/public/$file" "$game/dist/$file" && same=$((same + 1))
      fi
    done
    originals=$(find "$game/dist" -name 'overview.png' | wc -l)
    echo "$name: $(printf '%s\n' "$public" | grep -c .) screenshots in public/, $copied in dist/, $same byte-identical; lossless originals in dist/: $originals"
  done
  echo
  echo ".dockerignore lines that leave screenshots or docs out of the image's build:"
  grep -n -E 'docs|\.md|\.git' "$repo_root/.dockerignore"
} > "$out"
cat "$out"
