#!/usr/bin/env bash
# Runs one scenario's rewrite on its own copy of the mirror, repacks it as the
# baseline was, and measures and verifies it.
#
#   03-scenario.sh <baseline|s1|s1b|s2|s3|s4-1m|s4-500k|s5|s2-after>
#
# `baseline` rewrites nothing, so it is measured and checked the same way as
# the rest, as a control.
# Each scenario runs twice from the untouched mirror: once with filter-repo's
# default pruning, only to count the commits it would drop, and once with
# `--prune-empty never --prune-degenerate never`, which keeps every commit and
# is the run measured and verified. The second also passes
# `--sensitive-data-removal --no-fetch`, so filter-repo prints the first
# changed commits GitHub Support asks for and keeps the (disabled) remote.
#
# Needs 01-mirror.sh and 02-inventory.sh first (s5 needs 10-after-s2.sh, and
# s2-after is run by 13-after-plans.sh).
# Writes data/history/scenarios.tsv (a row per scenario), and
# scenario-<name>-filter-repo.txt, -fsck.txt and -verify.txt.
set -euo pipefail
. "$(dirname "$0")/env.sh"
name=$1
inv=$WORK/inventory
case $name in
  baseline) args=() ;;
  s1) args=(--paths-from-file "$inv/s1-paths.txt" --invert-paths) ;;
  s1b) args=(--paths-from-file "$inv/s1b-paths.txt" --invert-paths) ;;
  s2) args=(--strip-blobs-with-ids "$inv/s2-strip-ids.txt") ;;
  s3) args=(--path-regex '(^|/)docs/screenshots/' --path-regex '.+/sprites/atlas/' --invert-paths) ;;
  s4-1m) args=(--strip-blobs-bigger-than 1M) ;;
  s4-500k) args=(--strip-blobs-bigger-than 500K) ;;
  s5) args=(--strip-blobs-with-ids "$inv/s5-strip-ids.txt") ;;
  s2-after) args=(--strip-blobs-with-ids "$inv/s2-after-strip-ids.txt") ;;
  *)
    echo "unknown scenario $name" >&2
    exit 2
    ;;
esac
# What the scenario removes from main's tip on purpose, for the tree check.
removed=''
[ "$name" = s3 ] && removed='(^|/)docs/screenshots/|/sprites/atlas/'
[ "$name" = s2-after ] && removed=$AFTER_PLANS_REMOVED
log=$WORK/logs
mkdir -p "$log"

# The default pruning, only to see which commits it would drop.
auto=$(copy_mirror "$name-auto")
: > "$log/$name-auto-pruned.txt"
if [ ${#args[@]} -gt 0 ]; then
  (cd "$auto" && "$FILTER_REPO" --quiet "${args[@]}") > "$log/$name-auto.txt" 2>&1
  awk 'NR > 1 && $2 ~ /^0+$/ { print $1 }' "$auto/filter-repo/commit-map" > "$log/$name-auto-pruned.txt"
  awk 'NR > 1 && $2 ~ /^0+$/' "$auto/filter-repo/ref-map" > "$log/$name-auto-pruned-refs.txt"
fi

# The run measured.
dest=$(copy_mirror "$name")
start=$(now)
if [ ${#args[@]} -gt 0 ]; then
  (cd "$dest" && "$FILTER_REPO" --prune-empty never --prune-degenerate never \
    --sensitive-data-removal --no-fetch "${args[@]}") > "$DATA/scenario-$name-filter-repo.txt" 2>&1
fi
filter_s=$(elapsed "$start" "$(now)")
guard_push "$dest"
start=$(now)
gc_tight "$dest"
gc_s=$(elapsed "$start" "$(now)")
git -C "$dest" fsck --full --no-progress > "$DATA/scenario-$name-fsck.txt" 2>&1 && fsck=ok || fsck=failed
echo "exit: $fsck" >> "$DATA/scenario-$name-fsck.txt"
size_kib=$(git -C "$dest" count-objects -v | awk '/^size-pack:/ { print $2 }')
objects=$(git -C "$dest" count-objects -v | awk '/^in-pack:/ { print $2 }')

# What a clone, which fetches no refs/pull/*, would hold.
heads=$WORK/$name-heads.git
rm -rf "$heads"
cp -a "$dest" "$heads"
git -C "$heads" for-each-ref --format='delete %(refname)' refs/pull | git -C "$heads" update-ref --stdin
gc_tight "$heads"
heads_kib=$(git -C "$heads" count-objects -v | awk '/^size-pack:/ { print $2 }')
rm -rf "$heads" "$auto"

node "$(dirname "$0")/verify.mjs" "$MIRROR" "$dest" "$name" "$removed" "$log/$name-auto-pruned.txt" \
  > "$DATA/scenario-$name-verify.txt"
diffs=$(awk -F': ' '/^tree differences, refs\/heads\/main:/ { print $2 }' "$DATA/scenario-$name-verify.txt")
refs_bad=$(awk -F': ' '/^message hash references wrong:/ { print $2 }' "$DATA/scenario-$name-verify.txt")
commits=$(git -C "$dest" rev-list --count refs/heads/main)
pruned=$(wc -l < "$log/$name-auto-pruned.txt")

tsv=$DATA/scenarios.tsv
[ -f "$tsv" ] || printf 'scenario\tsize-pack MiB\tobjects\theads-only MiB\tfilter-repo s\tgc s\tfsck\tmain tip differences\tcommits on main\tpruned by default\tmessage refs wrong\n' > "$tsv"
awk -F'\t' -v n="$name" '$1 != n' "$tsv" > "$tsv.tmp"
awk -v n="$name" -v s="$size_kib" -v o="$objects" -v h="$heads_kib" -v f="$filter_s" -v g="$gc_s" \
  -v k="$fsck" -v d="$diffs" -v c="$commits" -v p="$pruned" -v r="$refs_bad" \
  'BEGIN { printf "%s\t%.1f\t%d\t%.1f\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n", n, s / 1024, o, h / 1024, f, g, k, d, c, p, r }' >> "$tsv.tmp"
mv "$tsv.tmp" "$tsv"
grep -E "^(scenario|$name)\b" "$tsv"
