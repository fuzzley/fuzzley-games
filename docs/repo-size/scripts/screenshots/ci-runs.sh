#!/usr/bin/env bash
# Counts the Verify runs of a 30-day window, by event, and how many of them
# ran each job. The jobs that check out the files the site's build needs,
# screenshots included, are docker and build, and verify before the jobs were
# split on 2026-11-14; promote moves live, which starts a Cloud Build. That is
# how many checkouts Git LFS would serve the screenshots to in a month.
#
#   docs/repo-size/scripts/screenshots/ci-runs.sh [since] [until]
#
# Writes docs/repo-size/data/screenshots/ci-runs.txt. Needs gh, signed in or
# not, since the repository is public.
set -euo pipefail
repo_root=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
out=$repo_root/docs/repo-size/data/screenshots/ci-runs.txt
since=${1:-2026-10-22}
until=${2:-2026-11-21}
api=repos/fuzzley/fuzzley-games/actions

runs=$(gh api --paginate "$api/workflows/verify.yml/runs?per_page=100&created=$since..$until" \
  --jq '.workflow_runs[] | "\(.id)\t\(.event)\t\(.head_branch)"')

{
  echo "Verify runs created $since..$until: $(printf '%s\n' "$runs" | grep -c .)"
  echo
  echo "By event and branch kind (runs, event, branch):"
  printf '%s\n' "$runs" | awk -F'\t' '{ b = ($3 == "main") ? "main" : ($3 ~ /^dependabot\//) ? "dependabot/*" : "other"; print $2 "\t" b }' |
    sort | uniq -c | sort -rn
  echo
  echo "Jobs that ran, not skipped (job, runs):"
  printf '%s\n' "$runs" | cut -f1 | while read -r id; do
    gh api "$api/runs/$id/jobs?per_page=100" \
      --jq '.jobs[] | select(.conclusion != "skipped") | .name'
  done | sort | uniq -c | sort -rn
} > "$out"
cat "$out"
