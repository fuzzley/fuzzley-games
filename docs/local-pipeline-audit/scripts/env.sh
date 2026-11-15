# Sourced by the audit's shell scripts: where the repository, Yarn and the
# raw logs are.
#
#   REPO  the repository's root, found from this folder
#   YARN  Yarn's yarn.js, where Corepack keeps the version package.json pins,
#         unless set
#   LOGS  where the raw logs go, outside the repository, unless set
REPO=$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)
FRONTEND=$REPO/frontend
yarn_version=$(node -p "require('$FRONTEND/package.json').packageManager.split('@')[1]")
YARN=${YARN:-$HOME/.cache/node/corepack/v1/yarn/$yarn_version/yarn.js}
LOGS=${LOGS:-$(dirname "$REPO")/local-pipeline-audit-2026-11-14/logs}
export REPO FRONTEND YARN LOGS
y() { node "$YARN" "$@"; }
# Prints a step's name, its wall time and its exit code, as a TSV row.
#   timed <tsv> <log> <name> <command...>
timed() {
  local tsv=$1 log=$2 name=$3
  shift 3
  local start=$(date +%s%N)
  "$@" > "$log" 2>&1
  local rc=$?
  local end=$(date +%s%N)
  printf '%s\t%.1f\t%s\n' "$name" "$(( end - start ))e-9" "$rc" | tee -a "$tsv"
}
