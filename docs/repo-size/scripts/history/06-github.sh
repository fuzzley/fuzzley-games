#!/usr/bin/env bash
# Reads, and only reads, what GitHub holds about the repository that a
# history rewrite touches: its size and forks, branch protection and
# rulesets, pull requests, issues and their comments that name commits,
# Dependabot, Actions runs and caches, releases, deployments and hooks.
#
#   06-github.sh
#
# Raw JSON goes to $WORK/github/; the summary to data/history/github.txt,
# and the commit hashes comments and bodies name to github-hash-refs.tsv.
set -uo pipefail
. "$(dirname "$0")/env.sh"
R=fuzzley/fuzzley-games
raw=$WORK/github
mkdir -p "$raw"
out=$DATA/github.txt
: > "$out"
say() { printf '%s\n' "$*" | tee -a "$out"; }

# Calls the API, keeps the JSON, and prints the HTTP status if it failed.
#   fetch <name> <gh api args...>
fetch() {
  local name=$1
  shift
  if gh api "$@" > "$raw/$name.json" 2> "$raw/$name.err"; then
    return 0
  fi
  say "  $name: $(tr '\n' ' ' < "$raw/$name.err" | cut -c1-160)"
  return 1
}

say "read at $(date -u +%FT%TZ)"
say "== repository"
gh api graphql -f query='{ repository(owner: "fuzzley", name: "fuzzley-games") {
  diskUsage forkCount visibility isFork pushedAt defaultBranchRef { name } } }' > "$raw/repo-graphql.json"
jq -r '.data.repository | "diskUsage KB: \(.diskUsage) (\(.diskUsage / 1024 | floor) MiB)\nforks: \(.forkCount)\nvisibility: \(.visibility)\ndefault branch: \(.defaultBranchRef.name)\npushed at: \(.pushedAt)"' "$raw/repo-graphql.json" | tee -a "$out"
fetch repo repos/$R && jq -r '"size (REST, KB): \(.size)\nforks_count: \(.forks_count)\nallow_force_pushes on repo: n/a (per branch)"' "$raw/repo.json" | tee -a "$out"
fetch forks "repos/$R/forks?per_page=100" && say "forks listed: $(jq length "$raw/forks.json")"

say "== GitHub's branches against the mirror's"
git ls-remote "$URL" 'refs/heads/*' > "$raw/ls-remote.txt"
for b in main live; do
  theirs=$(awk -v r="refs/heads/$b" '$2 == r { print $1 }' "$raw/ls-remote.txt")
  ours=$(git -C "$MIRROR" rev-parse "refs/heads/$b")
  if [ "$theirs" = "$ours" ]; then
    say "$b: GitHub and the mirror both at ${ours::8}"
  else
    gh api "repos/$R/compare/$ours...$theirs" > "$raw/compare-$b.json"
    say "$b: mirror at ${ours::8}, GitHub at ${theirs::8}: $(jq -r '"\(.ahead_by) commits ahead, \(.behind_by) behind, \(.files | length) files, \([.files[] | select(.filename | test("docs/screenshots/|/sprites/atlas/"))] | length) of them screenshots or atlases"' "$raw/compare-$b.json")"
  fi
done

say "== branch protection and rulesets"
for b in main live; do
  if fetch "protection-$b" "repos/$R/branches/$b/protection"; then
    jq -r --arg b "$b" '"\($b): force pushes allowed: \(.allow_force_pushes.enabled), deletions allowed: \(.allow_deletions.enabled), required checks: \([.required_status_checks.contexts[]?] | join(", "))"' "$raw/protection-$b.json" | tee -a "$out"
  fi
  fetch "branch-$b" "repos/$R/branches/$b" && jq -r --arg b "$b" '"\($b): protected: \(.protected)"' "$raw/branch-$b.json" | tee -a "$out"
  fetch "rules-$b" "repos/$R/rules/branches/$b" && say "$b: rules that apply: $(jq -c '[.[].type]' "$raw/rules-$b.json")"
done
if fetch rulesets "repos/$R/rulesets?includes_parents=true"; then
  say "rulesets: $(jq length "$raw/rulesets.json")"
  for id in $(jq -r '.[].id' "$raw/rulesets.json"); do
    fetch "ruleset-$id" "repos/$R/rulesets/$id" &&
      jq -r '"  \(.name) (\(.enforcement), target \(.target)): include \(.conditions.ref_name.include | join(",")), exclude \(.conditions.ref_name.exclude | join(",")); rules \([.rules[].type] | join(", ")); bypass \([.bypass_actors[]? | "\(.actor_type):\(.bypass_mode)"] | join(", ")); the token'"'"'s user can bypass: \(.current_user_can_bypass)"' "$raw/ruleset-$id.json" | tee -a "$out"
  done
fi

say "== pull requests and issues"
gh pr list -R $R --state all --limit 1000 --json number,state,author,headRefName,title,body,mergeCommit,createdAt > "$raw/prs.json"
jq -r '"pull requests: \(length)", (group_by(.state)[] | "  \(.[0].state): \(length)"), "  by dependabot: \([.[] | select(.author.login | test("dependabot"))] | length)", "  open: \([.[] | select(.state == "OPEN") | "#\(.number) \(.headRefName)"] | join("; "))"' "$raw/prs.json" | tee -a "$out"
gh issue list -R $R --state all --limit 1000 --json number,state,title,body,author > "$raw/issues.json"
jq -r '"issues: \(length)", (group_by(.state)[] | "  \(.[0].state): \(length)")' "$raw/issues.json" | tee -a "$out"
fetch issue-comments "repos/$R/issues/comments?per_page=100" --paginate --slurp
fetch review-comments "repos/$R/pulls/comments?per_page=100" --paginate --slurp
fetch commit-comments "repos/$R/comments?per_page=100" --paginate --slurp
say "issue and PR comments: $(jq '[.[][]] | length' "$raw/issue-comments.json" 2>/dev/null), review comments: $(jq '[.[][]] | length' "$raw/review-comments.json" 2>/dev/null), commit comments: $(jq '[.[][]] | length' "$raw/commit-comments.json" 2>/dev/null)"

# Every hex token in a PR or issue body or comment that names a commit here.
{
  flat='(.body // "") | gsub("[\\r\\n\\t]"; " ")'
  jq -r ".[] | \"pr #\(.number) body\t\($flat)\"" "$raw/prs.json"
  jq -r ".[] | \"issue #\(.number) body\t\($flat)\"" "$raw/issues.json"
  jq -r "[.[][]] | .[] | \"comment \(.html_url | split(\"/\") | .[-2:] | join(\"/\"))\t\($flat)\"" "$raw/issue-comments.json" 2>/dev/null
  jq -r "[.[][]] | .[] | \"review comment \(.pull_request_url | split(\"/\") | .[-1])\t\($flat)\"" "$raw/review-comments.json" 2>/dev/null
} > "$raw/texts.tsv"
awk -F'\t' '{ n = split($2, w, /[^0-9a-zA-Z]+/); for (i = 1; i <= n; i++) if (w[i] ~ /^[0-9a-f]+$/ && length(w[i]) >= 7 && length(w[i]) <= 40) print $1 "\t" w[i] }' "$raw/texts.tsv" > "$raw/tokens.tsv"
cut -f2 "$raw/tokens.tsv" | git -C "$MIRROR" cat-file --batch-check='%(objectname) %(objecttype)' > "$raw/tokens-resolved.txt" 2>/dev/null
paste "$raw/tokens.tsv" "$raw/tokens-resolved.txt" | awk -F'\t' '$3 ~ / commit$/ { split($3, a, " "); print $1 "\t" $2 "\t" a[1] }' > "$raw/hash-refs.tsv"
{
  printf 'where\ttoken\tcommit\n'
  cat "$raw/hash-refs.tsv"
} > "$DATA/github-hash-refs.tsv"
say "commit hashes named in PR and issue bodies and comments: $(wc -l < "$raw/hash-refs.tsv") references in $(cut -f1 "$raw/hash-refs.tsv" | sort -u | wc -l) bodies or comments"

say "== Dependabot"
fetch dependabot-alerts "repos/$R/dependabot/alerts?per_page=100" --paginate --slurp &&
  jq -r '[.[][]] | "dependabot alerts: \(length)", (group_by(.state)[] | "  \(.[0].state): \(length)")' "$raw/dependabot-alerts.json" | tee -a "$out"
say "dependabot branches: $(git -C "$MIRROR" for-each-ref refs/heads/dependabot | wc -l)"

say "== Actions"
fetch runs "repos/$R/actions/runs?per_page=1" && say "workflow runs: $(jq .total_count "$raw/runs.json")"
fetch workflows "repos/$R/actions/workflows" && jq -r '.workflows[] | "  workflow: \(.name) (\(.path)), \(.state)"' "$raw/workflows.json" | tee -a "$out"
if fetch caches "repos/$R/actions/caches?per_page=100" --paginate --slurp; then
  jq -r '[.[].actions_caches[]] | "caches: \(length), \((map(.size_in_bytes) | add // 0) / 1048576 | floor) MiB", (.[] | "  \(.ref)\t\(.key)")' "$raw/caches.json" | tee -a "$out"
  say "cache keys that end in a commit hash (github.sha): $(jq -r '[.[].actions_caches[]] | .[].key' "$raw/caches.json" | grep -cE -- '-[0-9a-f]{40}$')"
  say "cache keys without one (lockfile or version only): $(jq -r '[.[].actions_caches[]] | .[].key' "$raw/caches.json" | grep -cvE -- '-[0-9a-f]{40}$')"
fi
fetch artifacts "repos/$R/actions/artifacts?per_page=1" && say "artifacts: $(jq .total_count "$raw/artifacts.json")"

say "== releases, tags, deployments, environments, hooks, pages"
fetch releases "repos/$R/releases?per_page=100" && say "releases: $(jq length "$raw/releases.json")"
fetch tags "repos/$R/tags?per_page=100" && say "tags: $(jq length "$raw/tags.json")"
fetch deployments "repos/$R/deployments?per_page=100" && say "deployments: $(jq length "$raw/deployments.json")"
fetch environments "repos/$R/environments" && say "environments: $(jq '.total_count' "$raw/environments.json")"
fetch hooks "repos/$R/hooks" && say "webhooks: $(jq length "$raw/hooks.json") $(jq -c '[.[].config.url | sub("\\?.*"; "")]' "$raw/hooks.json") $(grep -q 'admin:repo_hook' "$raw/hooks.err" && echo '(not trustworthy: the token lacks admin:repo_hook)')"
fetch installation "repos/$R/installation" && say "app installation: $(jq -r .app_slug "$raw/installation.json")"
fetch pages "repos/$R/pages" && say "pages: $(jq -r .html_url "$raw/pages.json")"
fetch autolinks "repos/$R/autolinks" && say "autolinks: $(jq length "$raw/autolinks.json")"

say "== links to commits no branch holds"
# A commit only a pull request ref reaches, as the old history would be
# after a force-push: does GitHub still serve it by its short hash?
pr_only=$(git -C "$MIRROR" rev-parse refs/pull/1/head)
say "refs/pull/1/head ${pr_only::7} on a branch: $(git -C "$MIRROR" branch --contains "$pr_only" | wc -l)"
say "  API commits/${pr_only::7}: $(gh api "repos/$R/commits/${pr_only::7}" --jq .sha 2>&1 | head -1)"
say "  web /commit/${pr_only::7}: HTTP $(curl -s -o /dev/null -w '%{http_code}' "https://github.com/$R/commit/${pr_only::7}")"
say "  web /commit/0000000 (no such commit): HTTP $(curl -s -o /dev/null -w '%{http_code}' "https://github.com/$R/commit/0000000")"
live_commit=$(curl -s https://fuzzley.games/version.json | jq -r .commit)
say "live site's version.json commit: $live_commit, web /commit/$live_commit: HTTP $(curl -s -o /dev/null -w '%{http_code}' "https://github.com/$R/commit/$live_commit")"

say "== what a new repository in its place would have to carry over"
jq -r '"stars: \(.stargazers_count), watchers: \(.subscribers_count), has wiki: \(.has_wiki), has discussions: \(.has_discussions), created: \(.created_at)"' "$raw/repo.json" | tee -a "$out"
fetch secrets "repos/$R/actions/secrets" && say "actions secrets: $(jq .total_count "$raw/secrets.json") $(jq -c '[.secrets[].name]' "$raw/secrets.json")"
fetch variables "repos/$R/actions/variables" && say "actions variables: $(jq .total_count "$raw/variables.json")"
fetch dependabot-secrets "repos/$R/dependabot/secrets" && say "dependabot secrets: $(jq .total_count "$raw/dependabot-secrets.json")"
fetch keys "repos/$R/keys" && say "deploy keys: $(jq length "$raw/keys.json")"
fetch collaborators "repos/$R/collaborators" && say "collaborators: $(jq length "$raw/collaborators.json")"
true
