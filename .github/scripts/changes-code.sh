#!/usr/bin/env bash
# Says whether a Verify run must check the code, or only lint, by writing
# code=true or code=false to $GITHUB_OUTPUT.
#
# A run is lint's alone when everything changed is Markdown or under docs/,
# which no build, spec or image reads: everything since live, the last
# commit of main that passed, for a push; since the base, for a pull
# request, whose own push to main is compared with live again. A manual
# run, or any doubt about the base, checks everything.
#
#   .github/scripts/changes-code.sh [base]
#
# The base is the pull request's base commit; a push compares with
# origin/live, which the checkout must have fetched.
set -euo pipefail

case "${GITHUB_EVENT_NAME:-}" in
  push) base=origin/live ;;
  pull_request) base=${1:-} ;;
  *) base= ;;
esac

code=true
if [ -z "$base" ]; then
  echo "A ${GITHUB_EVENT_NAME:-manual} run checks everything."
elif ! git rev-parse -q --verify "$base^{commit}" > /dev/null; then
  echo "There is no $base to compare with, so the run checks everything."
elif ! git merge-base --is-ancestor "$base" HEAD; then
  echo "$base is not behind this commit, so the run checks everything."
else
  # Both paths of a moved file, so code moved into docs/ counts as code.
  changed=$(git diff --name-only --no-renames "$base" HEAD)
  echo "Changed since $base:"
  echo "${changed:-  (nothing)}"
  if [ -n "$changed" ] && ! grep -qvE '^docs/|\.md$' <<< "$changed"; then
    code=false
    echo "Only Markdown and docs/ changed, so the run only lints."
  fi
fi

echo "code=$code" >> "${GITHUB_OUTPUT:-/dev/stdout}"
