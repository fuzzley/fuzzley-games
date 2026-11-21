#!/usr/bin/env bash
# Counts the places that name a fuzzley-games commit by hash: the files at
# main's tip (from the mirror), the memory notes and the sibling fuzzley
# repository, which it only reads.
#
#   05-hash-refs.sh
#
# Writes data/history/hash-refs-summary.tsv, -files.tsv, -code.tsv and
# -odd.tsv.
set -euo pipefail
. "$(dirname "$0")/env.sh"
MEMORY=${MEMORY:-$HOME/.claude/projects/-home-dev-Projects-personal/memory}
FUZZLEY=${FUZZLEY:-$(dirname "$REPO")/fuzzley}
node "$(dirname "$0")/hash-refs.mjs" "$MIRROR" "$MEMORY" "$FUZZLEY" "$DATA"
