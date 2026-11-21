#!/usr/bin/env bash
# Measures what GitHub would hold once a scenario's branches are force-pushed
# but its read-only refs/pull/* still name the old commits: the scenario's
# rewritten mirror with its own refs/pull/* swapped for the old ones, repacked
# as the rest are. Also what those old refs keep that the rewrite dropped.
#
#   07-github-after-push.sh <scenario>
#
# Needs 03-scenario.sh <scenario> first. Writes data/history/github-after-push.tsv
# (a row per scenario).
set -euo pipefail
. "$(dirname "$0")/env.sh"
name=$1
src=$WORK/$name.git
dest=$WORK/$name-github.git
[ -d "$src" ] || { echo "run 03-scenario.sh $name first" >&2; exit 1; }
rm -rf "$dest"
cp -a "$src" "$dest"
git -C "$dest" remote set-url --push origin DISABLED 2>/dev/null || git -C "$dest" remote add origin DISABLED
git -C "$dest" remote set-url --push origin DISABLED
guard_push "$dest"

git -C "$dest" for-each-ref --format='delete %(refname)' refs/pull | git -C "$dest" update-ref --stdin
git -C "$dest" fetch --quiet --no-tags "$MIRROR" '+refs/pull/*:refs/pull/*'
pulls=$(git -C "$dest" for-each-ref refs/pull | wc -l)
gc_tight "$dest"
kib=$(git -C "$dest" count-objects -v | awk '/^size-pack:/ { print $2 }')
objects=$(git -C "$dest" count-objects -v | awk '/^in-pack:/ { print $2 }')
# The old commits the old pull refs keep that the rewritten branches don't.
old_only=$(git -C "$dest" rev-list --count $(git -C "$dest" for-each-ref --format='%(refname)' refs/pull) --not --branches)

tsv=$DATA/github-after-push.tsv
[ -f "$tsv" ] || printf 'scenario\tsize-pack MiB\tobjects\told refs/pull kept\told commits only they reach\n' > "$tsv"
awk -F'\t' -v n="$name" '$1 != n' "$tsv" > "$tsv.tmp"
awk -v n="$name" -v s="$kib" -v o="$objects" -v p="$pulls" -v c="$old_only" \
  'BEGIN { printf "%s\t%.1f\t%d\t%d\t%d\n", n, s / 1024, o, p, c }' >> "$tsv.tmp"
mv "$tsv.tmp" "$tsv"
cat "$tsv"
rm -rf "$dest"
