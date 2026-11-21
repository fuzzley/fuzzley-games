#!/usr/bin/env bash
# Lists every blob history holds with every path it was stored at, the tree
# at each ref's tip, and each blob's size in the repacked baseline, then has
# inventory.mjs work out what each scenario would remove.
#
#   02-inventory.sh
#
# Needs 01-mirror.sh first. The raw lists go to $WORK/inventory/; what
# inventory.mjs prints goes to data/history/inventory-*.tsv, and the lists the
# scenarios read to $WORK/inventory/s1-paths.txt and s2-strip-ids.txt.
set -euo pipefail
. "$(dirname "$0")/env.sh"
out=$WORK/inventory
mkdir -p "$out"
guard_push "$MIRROR"

# Every blob each commit adds or changes, against each parent of a merge too,
# and every blob of a root commit: so every (blob, path) any commit's tree
# holds. Submodules (mode 160000) are not blobs.
git -C "$MIRROR" log --all -m --root --raw --no-abbrev --no-renames --format= |
  awk -F'\t' '/^:/ {
    split($1, f, " ")
    if (f[4] !~ /^0+$/ && f[2] != "160000") print f[4] "\t" $2
  }' | sort -u > "$out/history-blob-paths.tsv"

# The tree at each branch's tip, and at each pull request's head.
git -C "$MIRROR" for-each-ref --format='%(refname)' refs/heads refs/pull |
  while read -r ref; do
    git -C "$MIRROR" ls-tree -r --full-tree "$ref" |
      awk -F'\t' -v ref="$ref" '{ split($1, f, " "); if (f[2] == "blob") print ref "\t" f[3] "\t" $2 }'
  done > "$out/tip-blob-paths.tsv"

# Each blob's size, and its size on disk in the baseline's single pack, which
# counts a delta as its delta.
git -C "$WORK/baseline.git" cat-file --batch-all-objects \
  --batch-check=$'%(objectname)\t%(objecttype)\t%(objectsize)\t%(objectsize:disk)' |
  awk -F'\t' '$2 == "blob"' > "$out/blob-sizes.tsv"

wc -l "$out"/*.tsv
node "$(dirname "$0")/inventory.mjs" "$out"
