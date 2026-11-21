#!/usr/bin/env bash
# Prints each scenario's size against the baseline's, from scenarios.tsv and
# github-after-push.tsv: what it saves, and what is left as a share of the
# baseline, for the mirror and for a clone.
#
#   12-summary.sh
#
# Needs the scenarios run first. Writes data/history/summary.tsv.
set -euo pipefail
. "$(dirname "$0")/env.sh"
awk -F'\t' -v OFS='\t' '
  FNR == 1 { next }
  FILENAME ~ /after-push/ { after[$1] = $2; next }
  $1 == "baseline" { base = $2; base_heads = $4 }
  { size[$1] = $2; heads[$1] = $4; objects[$1] = $3; diffs[$1] = $8 }
  END {
    print "scenario", "size-pack MiB", "saved MiB", "left, % of baseline", "clone (heads only) MiB", "left, % of baseline clone", "objects", "main tip differences", "GitHub until refs/pull go, MiB"
    n = split("baseline s1 s1b s2 s3 s4-1m s4-500k s5 s2-after", order, " ")
    for (i = 1; i <= n; i++) {
      s = order[i]
      if (!(s in size)) continue
      printf "%s\t%.1f\t%.1f\t%.0f%%\t%.1f\t%.0f%%\t%d\t%s\t%s\n", s, size[s], base - size[s], 100 * size[s] / base, heads[s], 100 * heads[s] / base_heads, objects[s], diffs[s], (s in after) ? after[s] : ""
    }
  }' "$DATA/github-after-push.tsv" "$DATA/scenarios.tsv" > "$DATA/summary.tsv"
cat "$DATA/summary.tsv"
