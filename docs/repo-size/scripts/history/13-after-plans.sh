#!/usr/bin/env bash
# Measures what S2 leaves once the screenshot and atlas plans have landed,
# without building them: S2's list, plus the blobs at main's and live's tips
# that those plans take out of the tree (AFTER_PLANS_REMOVED in env.sh), then
# the size the atlas pages take as lossless WebP added back, since they are
# new blobs that barely compress.
#
#   13-after-plans.sh
#
# Needs 01-mirror.sh, 02-inventory.sh and data/atlases/encodings-atlas.txt.
# Writes data/history/after-plans.txt and a row of scenarios.tsv, through
# 03-scenario.sh s2-after.
set -euo pipefail
. "$(dirname "$0")/env.sh"
inv=$WORK/inventory
out=$DATA/after-plans.txt

# Blob ids at the two tips, at the paths the plans remove and at every other
# path, so a blob also kept elsewhere at a tip is not stripped. The pattern is
# read from the environment, as awk's -v would process its backslashes.
awk -F'\t' \
  'BEGIN { re = ENVIRON["AFTER_PLANS_REMOVED"] } ($1 == "refs/heads/main" || $1 == "refs/heads/live") && $3 ~ re { print $2 }' \
  "$inv/tip-blob-paths.tsv" | sort -u > "$inv/after-plans-tip-ids.txt"
awk -F'\t' \
  'BEGIN { re = ENVIRON["AFTER_PLANS_REMOVED"] } ($1 == "refs/heads/main" || $1 == "refs/heads/live") && $3 !~ re { print $2 }' \
  "$inv/tip-blob-paths.tsv" | sort -u > "$inv/after-plans-kept-ids.txt"
comm -23 "$inv/after-plans-tip-ids.txt" "$inv/after-plans-kept-ids.txt" > "$inv/after-plans-strip-tip.txt"
sort -u "$inv/s2-strip-ids.txt" "$inv/after-plans-strip-tip.txt" > "$inv/s2-after-strip-ids.txt"

paths=$(awk -F'\t' 'BEGIN { re = ENVIRON["AFTER_PLANS_REMOVED"] } $1 == "refs/heads/main" && $3 ~ re' "$inv/tip-blob-paths.tsv" | wc -l)
tip_bytes=$(git -C "$MIRROR" cat-file --batch-check='%(objectsize)' < "$inv/after-plans-strip-tip.txt" | awk '{ s += $1 } END { print s }')
webp_mib=$(awk '/^Totals over distinct blobs/ { t = 1 } t && $1 == "webp-lossless-exact" { print $2; exit }' \
  "$REPO/docs/repo-size/data/atlases/encodings-atlas.txt")

"$(dirname "$0")/03-scenario.sh" s2-after > /dev/null
row=$(awk -F'\t' '$1 == "s2-after"' "$DATA/scenarios.tsv")
mirror_mib=$(cut -f2 <<< "$row")
clone_mib=$(cut -f4 <<< "$row")
s2_clone=$(awk -F'\t' '$1 == "s2" { print $4 }' "$DATA/scenarios.tsv")
base_clone=$(awk -F'\t' '$1 == "baseline" { print $4 }' "$DATA/scenarios.tsv")

{
  echo "tip paths the plans remove, on main: $paths"
  echo "distinct blobs among them, stripped on top of S2's $(wc -l < "$inv/s2-strip-ids.txt"): $(wc -l < "$inv/after-plans-strip-tip.txt")"
  awk -v b="$tip_bytes" 'BEGIN { printf "their raw size: %.2f MiB\n", b / 1048576 }'
  echo "S2 and them, measured: mirror $mirror_mib MiB, clone $clone_mib MiB"
  echo "atlas pages as lossless WebP, added back: $webp_mib MiB"
  awk -v m="$mirror_mib" -v c="$clone_mib" -v w="$webp_mib" -v s="$s2_clone" -v z="$base_clone" 'BEGIN {
    printf "projected after the plans and S2: mirror %.1f MiB, clone %.1f MiB\n", m + w, c + w
    printf "against S2 today, clone: %.1f MiB; against no rewrite, clone: %.1f MiB (%.0f%% left)\n", s, z, 100 * (c + w) / z
  }'
  echo "tree check: $(grep -E '^(tree differences|tree entries removed on purpose), refs/heads/main' "$DATA/scenario-s2-after-verify.txt" | tr '\n' ';')"
  echo "commits on main: $(cut -f9 <<< "$row"), message refs wrong: $(cut -f11 <<< "$row"), fsck: $(cut -f7 <<< "$row")"
} > "$out"
cat "$out"
