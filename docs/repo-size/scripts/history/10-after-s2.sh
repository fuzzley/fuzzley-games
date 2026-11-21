#!/usr/bin/env bash
# Keeps S2's maps, and looks at what S2 leaves: filter-repo's own analysis of
# the rewritten mirror, S5's extra candidates at several thresholds (writing
# S5's strip list for one), and whether running S2 again gives the very same
# commits.
#
#   10-after-s2.sh [threshold-KiB]   100 by default
#
# Needs 03-scenario.sh s2 first. Writes data/history/s2-commit-map.txt,
# s2-ref-map.txt, s2-first-changed-commits.txt, s2-changed-refs.txt,
# after-s2-analysis.txt, s5-candidates.txt and s2-determinism.txt.
set -euo pipefail
. "$(dirname "$0")/env.sh"
s2=$WORK/s2.git
inv=$WORK/inventory

# filter-repo's maps from the measured run, kept beside the data.
for f in commit-map ref-map first-changed-commits changed-refs; do
  cp "$s2/filter-repo/$f" "$DATA/s2-$f.txt"
done
wc -l "$DATA"/s2-*-map.txt

# filter-repo's analysis of the rewritten mirror: the biggest paths, the
# deleted ones and the extensions, by packed size.
rm -rf "$WORK/s2-analyze.git"
cp -a "$s2" "$WORK/s2-analyze.git"
(cd "$WORK/s2-analyze.git" && "$FILTER_REPO" --analyze --force > /dev/null)
a=$WORK/s2-analyze.git/filter-repo/analysis
{
  echo "== directories, top 25 by packed size (filter-repo's estimate; <present> is its own guess)"
  sed -n '3,27p' "$a/directories-all-sizes.txt"
  echo
  echo "== deleted directories, top 15"
  sed -n '3,17p' "$a/directories-deleted-sizes.txt"
  echo
  echo "== paths, top 25"
  sed -n '3,27p' "$a/path-all-sizes.txt"
  echo
  echo "== extensions, top 12"
  sed -n '3,14p' "$a/extensions-all-sizes.txt"
} > "$DATA/after-s2-analysis.txt"
rm -rf "$WORK/s2-analyze.git"
cat "$DATA/after-s2-analysis.txt"

node "$(dirname "$0")/s5.mjs" "$inv" "${1:-100}" | tee "$DATA/s5-candidates.txt"

# The same rewrite again, from the untouched mirror: the same commit-map?
again=$(copy_mirror s2-again)
(cd "$again" && "$FILTER_REPO" --quiet --prune-empty never --prune-degenerate never \
  --sensitive-data-removal --no-fetch --strip-blobs-with-ids "$inv/s2-strip-ids.txt") > /dev/null 2>&1
if cmp -s "$s2/filter-repo/commit-map" "$again/filter-repo/commit-map"; then same=yes; else same=no; fi
{
  echo "commit-map of a second S2 run identical to the first: $same"
  echo "main after the second run: $(git -C "$again" rev-parse refs/heads/main)"
  echo "main after the first run:  $(git -C "$s2" rev-parse refs/heads/main)"
} | tee "$DATA/s2-determinism.txt"
rm -rf "$again"
