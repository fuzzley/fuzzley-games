#!/usr/bin/env bash
# Lists, and changes nothing in, the local clones of fuzzley-games and their
# worktrees: each one's branch, whether it has uncommitted changes, and the
# commits no remote branch holds, which a rewrite would leave on the old
# history. Every git call passes --no-optional-locks, so `git status` never
# writes another session's index.
#
#   08-local-clones.sh [root]   root to search for clones, ~/Projects by default
#
# Writes data/history/local-clones.txt.
set -uo pipefail
. "$(dirname "$0")/env.sh"
root=${1:-$HOME/Projects}
out=$DATA/local-clones.txt
g() { git --no-optional-locks "$@"; }

{
  echo "read at $(date -u +%FT%TZ)"
  # Every non-bare clone under root whose origin is fuzzley-games, by its
  # common git directory, so a worktree is listed under its clone.
  find "$root" -maxdepth 4 -name .git \( -type d -o -type f \) 2>/dev/null | while read -r dotgit; do
    dir=$(dirname "$dotgit")
    url=$(g -C "$dir" remote get-url origin 2>/dev/null || true)
    case $url in *fuzzley/fuzzley-games*) ;; *) continue ;; esac
    common=$(cd "$dir" && cd "$(g rev-parse --git-common-dir)" && pwd)
    echo "$common"
  done | sort -u | while read -r common; do
    echo
    echo "== clone: $(dirname "$common")"
    echo "local branches: $(g --git-dir="$common" for-each-ref refs/heads | wc -l)"
    echo "commits on local branches that no remote-tracking branch holds: $(g --git-dir="$common" rev-list --count --branches --not --remotes)"
    echo "stash entries (shared by every worktree): $(g --git-dir="$common" stash list 2>/dev/null | wc -l)"
    echo "branches (name, upstream, track, commits not on origin/main):"
    g --git-dir="$common" for-each-ref refs/heads --format='%(refname:short)%09%(upstream:short)%09%(upstream:track)' |
      while IFS=$'\t' read -r b up track; do
        printf '  %s\t%s\t%s\t%s\n' "$b" "${up:-none}" "${track:-}" \
          "$(g --git-dir="$common" rev-list --count "refs/heads/$b" --not refs/remotes/origin/main 2>/dev/null)"
      done
    echo "worktrees:"
    g --git-dir="$common" worktree list --porcelain | awk '/^worktree / { w = $2 } /^branch / { print w "\t" $2 } /^detached/ { print w "\tdetached" }' |
      while IFS=$'\t' read -r w b; do
        changes=$(g -C "$w" status --porcelain 2>/dev/null | wc -l)
        staged=$(g -C "$w" diff --cached --name-only 2>/dev/null | wc -l)
        printf '  %s\t%s\t%s changed paths, %s staged\n' "$w" "${b#refs/heads/}" "$changes" "$staged"
      done
  done
} > "$out"
cat "$out"
