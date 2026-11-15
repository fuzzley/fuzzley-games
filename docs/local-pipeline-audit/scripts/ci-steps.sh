#!/usr/bin/env bash
# Prints how long each job of the Verify workflow's runs took, when it
# started and ended from the run's start, and the steps step 7 of the work
# log compares: the build job's layout check and the typecheck job's
# Type-check. One TSV row a job, with the run's id, its commit and how it was
# started; a job that was skipped has no row. When a run's last check ended,
# the push's wait the CI audit measured, is the largest `end_s` of its jobs
# but `promote`.
#
#   ci-steps.sh <run-id>...
set -euo pipefail
. "$(dirname "$0")/env.sh"
cd "$REPO"
printf 'run\tsha\tevent\tjob\tjob_s\tstart_s\tend_s\tstep\tstep_s\tconclusion\n'
for run in "$@"; do
  gh run view "$run" --json databaseId,headSha,event,startedAt,jobs --jq '
    def at(t): t | fromdateiso8601;
    . as $r | .jobs[] | select(.conclusion != "skipped") |
    (.steps | map(select(.name | test("layout|Type-check"; "i"))) | first) as $s |
    [ $r.databaseId, $r.headSha[0:8], $r.event, .name,
      at(.completedAt) - at(.startedAt),
      at(.startedAt) - at($r.startedAt),
      at(.completedAt) - at($r.startedAt),
      ($s.name // "-"),
      (if $s then at($s.completedAt) - at($s.startedAt) else "-" end),
      .conclusion ] | @tsv'
done
