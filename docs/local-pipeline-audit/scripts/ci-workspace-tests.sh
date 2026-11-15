#!/usr/bin/env bash
# Prints how long each workspace's tests took in the Verify workflow's runs,
# read from each test job's log: the table `yarn test:coverage` prints of
# when each workspace started and how long it ran. One TSV row a workspace,
# with the run's id and the job's name. The logs are kept in
# $LOGS/ci-logs/<run-id>.log, and read from there once fetched; a run must
# have ended, as `gh` gives no log of one that hasn't.
#
#   ci-workspace-tests.sh <run-id>...
set -euo pipefail
. "$(dirname "$0")/env.sh"
cd "$REPO"
mkdir -p "$LOGS/ci-logs"
printf 'run\tjob\tworkspace\tsuite_s\n'
for run in "$@"; do
  log=$LOGS/ci-logs/$run.log
  if [ ! -s "$log" ]; then
    # Kept only once whole, so a dropped connection leaves nothing to trust.
    gh run view "$run" --log > "$log.part"
    mv "$log.part" "$log"
  fi
  # A row of the table: the job, the step, a timestamp, then "  <started> s
  # <took> s  <workspace>", with "  exited with <n>" after one that failed.
  awk -F '\t' -v run="$run" '
    $1 ~ /^test / && $2 == "Test with coverage" {
      line = $3
      sub(/^[^ ]+ +/, "", line)
      if (match(line, /^[0-9.]+ s +[0-9.]+ s  /)) {
        split(line, f, / +/)
        print run "\t" $1 "\t" f[5] "\t" f[3]
      }
    }' "$log"
done
