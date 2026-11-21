#!/usr/bin/env bash
# Prints the facts about the mirror's history that bear on a rewrite: the
# signed commits, which filter-repo leaves unsigned, the merges and root
# commits, the bots' commits, and for each pull request ref the commits it
# holds that main doesn't and how far back its base is.
#
#   04-history-facts.sh
#
# Needs 01-mirror.sh first. Writes data/history/history-facts.txt and
# pull-refs.tsv.
set -euo pipefail
. "$(dirname "$0")/env.sh"
m=$MIRROR
out=$DATA/history-facts.txt
{
  echo "mirror main: $(git -C "$m" rev-parse refs/heads/main), live: $(git -C "$m" rev-parse refs/heads/live)"
  echo "commits, all refs: $(git -C "$m" rev-list --count --all); main: $(git -C "$m" rev-list --count refs/heads/main)"
  echo "merge commits on main: $(git -C "$m" rev-list --count --merges refs/heads/main)"
  echo "root commits on main: $(git -C "$m" rev-list --max-parents=0 refs/heads/main | wc -l)"
  git -C "$m" rev-list --max-parents=0 refs/heads/main |
    while read -r c; do
      echo "  $(git -C "$m" log -1 --format='%h %cs %s' "$c" | cut -c1-60), first file: $(git -C "$m" ls-tree -r --name-only "$c" | head -1)"
    done
  echo "first commit on main by date: $(git -C "$m" log --reverse --format='%cs' refs/heads/main | head -1)"
  signed=$(git -C "$m" rev-list --all | git -C "$m" cat-file --batch='commit %(objectname)' |
    awk '/^commit [0-9a-f]{40}$/ { c = $2 } /^gpgsig/ { print c }' | sort -u)
  echo "signed commits, all refs: $(printf '%s' "$signed" | grep -c . || true)"
  echo "signed commits on main: $(comm -12 <(printf '%s\n' "$signed" | sort) <(git -C "$m" rev-list refs/heads/main | sort) | grep -c . || true)"
  echo "committers of signed commits:"
  printf '%s\n' "$signed" | grep . | git -C "$m" log --no-walk=unsorted --stdin --format='%cn' | sort | uniq -c | sed 's/^/  /'
  echo "commits on main by bots: $(git -C "$m" log refs/heads/main --format='%an' | grep -c '\[bot\]' || true)"
} > "$out"
cat "$out"

{
  printf 'ref\tcommits main lacks\tbase on main\tbase date\tcommits on main since base\n'
  git -C "$m" for-each-ref --format='%(refname)' refs/pull | sort -V | while read -r ref; do
    base=$(git -C "$m" merge-base "$ref" refs/heads/main)
    printf '%s\t%s\t%s\t%s\t%s\n' "$ref" \
      "$(git -C "$m" rev-list --count "$ref" --not refs/heads/main)" \
      "$(git -C "$m" rev-parse --short=8 "$base")" \
      "$(git -C "$m" log -1 --format=%cs "$base")" \
      "$(git -C "$m" rev-list --count "$base..refs/heads/main")"
  done
} > "$DATA/pull-refs.tsv"
cat "$DATA/pull-refs.tsv"
