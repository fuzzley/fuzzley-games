#!/usr/bin/env bash
# Fetches the pages the findings quote on Git LFS and Cloud Build and prints
# the sentences quoted, with the page and the day they were read, so the
# figures can be checked against the pages again.
#
#   docs/repo-size/scripts/screenshots/sources.sh
#
# The pages go to a temporary folder ($SCRATCH, or one under /tmp) and are
# read as text only. Writes docs/repo-size/data/screenshots/sources.txt.
set -euo pipefail
repo_root=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
out=$repo_root/docs/repo-size/data/screenshots/sources.txt
pages=${SCRATCH:-/tmp/repo-size-screenshots}/web
mkdir -p "$pages"

fetch() { curl -sS -m 30 -L "$1" -o "$pages/$2"; }
fetch https://docs.github.com/en/billing/concepts/product-billing/git-lfs gh-lfs.html
fetch https://docs.cloud.google.com/build/docs/automating-builds/create-manage-triggers gcb-triggers.html
fetch https://raw.githubusercontent.com/actions/checkout/main/action.yml checkout-action.yml
fetch https://docs.cloud.google.com/run/docs/continuous-deployment-with-cloud-build gcr-continuous.html

{
  echo "Read on $(date -u +%Y-%m-%d)."
  python3 -I - "$pages" <<'EOF'
import html, re, sys
from pathlib import Path

pages = Path(sys.argv[1])

def text(name):
    raw = (pages / name).read_text(encoding="utf8", errors="replace")
    raw = re.sub(r"<script.*?</script>|<style.*?</style>", " ", raw, flags=re.S)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", raw)))

def quote(name, url, patterns, width=170):
    t = text(name)
    print(f"\n{url}")
    for pattern in patterns:
        m = re.search(pattern, t)
        print("  " + (f"... {t[max(0, m.start() - 20):m.end() + width].strip()} ..." if m else f"(no match for {pattern!r})"))
    print(f"  mentions of LFS on the page: {len(re.findall(r'(?i)git lfs|large file storage', t))}")

quote("gh-lfs.html", "https://docs.github.com/en/billing/concepts/product-billing/git-lfs",
      [r"The following amounts of storage and bandwidth", r"Bandwidth is billed", r"Git LFS support is disabled"])
quote("gcb-triggers.html", "https://docs.cloud.google.com/build/docs/automating-builds/create-manage-triggers",
      [r"Cloud Build performs a shallow clone"])
quote("gcr-continuous.html", "https://docs.cloud.google.com/run/docs/continuous-deployment-with-cloud-build",
      [r"(?i)dockerfile", r"(?i)build configuration"])
EOF
  echo
  echo "GitHub's API, repos/fuzzley/fuzzley-games:"
  gh api repos/fuzzley/fuzzley-games --jq '"  visibility \(.visibility); size \(.size) KiB (\(.size / 1024 * 10 | floor / 10) MiB)"'
  echo
  echo "https://raw.githubusercontent.com/actions/checkout/main/action.yml"
  grep -A2 '^  lfs:' "$pages/checkout-action.yml" | sed 's/^/  /'
} > "$out"
cat "$out"
