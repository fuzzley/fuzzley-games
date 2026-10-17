#!/usr/bin/env bash
# Serves a built image and checks its pages, cache and security headers,
# theme.js, env.js, version.json and games.
#
# Cloud Run builds and deploys the Dockerfile from main without waiting for
# any check, so both verify.yml and update-games.yml run this on the image
# they build.
#
# Usage: .github/scripts/check-image.sh <image> <commit>
#
#   <commit>  The commit the image was built from; version.json must name it.
#
# Run from the repository root, with curl and jq installed.
set -euo pipefail

image=$1
commit=$2
base=http://localhost:8080

docker run -d --name games -p 8080:8080 -e PORT=8080 \
  -e GA_AG_MEASUREMENT_ID=G-CHECK00000 "$image" > /dev/null
trap 'docker rm -f games > /dev/null' EXIT
for attempt in $(seq 1 30); do
  curl -fs -o /dev/null "$base/" && break
  sleep 1
done

failed=0
fail() {
  echo "::error::$1"
  failed=1
}
expect() {
  status=$(curl -s -o /dev/null -w '%{http_code}' "$base$2")
  echo "$status $2"
  [ "$status" = "$1" ] || fail "Expected $1 for $2, got $status."
}
# Prints a response header's value, or nothing if the response has none.
header() {
  curl -s -o /dev/null -D - "$base$1" |
    tr -d '\r' | sed -n "s/^$2: //Ip"
}
expect_cache() {
  value=$(header "$1" cache-control)
  echo "Cache-Control: $value  $1"
  [ "$value" = "$2" ] || fail "Expected Cache-Control: $2 for $1, got '$value'."
}
# Checks the headers nginx/security-headers.conf sets, on any response.
expect_security_headers() {
  for name in x-content-type-options referrer-policy x-frame-options \
    permissions-policy strict-transport-security; do
    [ -n "$(header "$1" "$name")" ] || fail "$1 has no $name header."
  done
  [ "$(header "$1" x-content-type-options)" = "nosniff" ] ||
    fail "$1 isn't served with X-Content-Type-Options: nosniff."
}

# Routes are Angular's, so nginx answers them with index.html.
expect 200 /
expect 200 /category/solitaire
expect 200 /games/klondike
expect 200 /theme.js
expect 200 /env.js
expect 200 /analytics.js
expect 200 /version.json
# A missing build file must not fall back to index.html.
expect 404 /assets/no-such-file.js

asset=$(curl -s "$base/" | grep -o '/assets/[^"]*\.js' | head -1)
[ -n "$asset" ] || fail "index.html links no script under /assets/."
expect 200 "$asset"
expect_cache "$asset" "public, max-age=31536000, immutable"
expect_cache / "no-cache"
expect_cache /theme.js "no-cache"
expect_cache /env.js "no-store"
expect_cache /version.json "no-store"

# Every response carries the security headers, errors included, and the site's
# pages (not the games') carry its Content Security Policy.
for path in / /games/klondike "$asset" /theme.js /env.js /version.json \
  /assets/no-such-file.js; do
  expect_security_headers "$path"
done
csp=$(header / content-security-policy)
echo "Content-Security-Policy: $csp"
grep -q "default-src 'self'" <<< "$csp" ||
  fail "The site's pages have no Content Security Policy."
grep -q "frame-ancestors 'none'" <<< "$csp" ||
  fail "The site's Content Security Policy lets other sites frame it."

# theme.js is made at build time from the app's list of palettes.
curl -s "$base/theme.js" | grep -q 'document.documentElement.dataset.theme' ||
  fail "theme.js doesn't set the page's palette."
# env.js is written from the container's environment at startup.
curl -s "$base/env.js" | grep -q '"G-CHECK00000"' ||
  fail "env.js doesn't carry GA_AG_MEASUREMENT_ID."
# The image says which commit it was built from.
curl -s "$base/version.json" | grep -q "\"commit\": \"${commit::7}\"" ||
  fail "version.json doesn't name commit ${commit::7}."

# Each game pinned in games.json is a static page of its own under /play/,
# never the site's index.html, with its own fingerprinted assets/ folder.
expect 404 /play/no-such-game/
for slug in $(jq -r 'keys[]' frontend/games.json); do
  expect 200 "/play/$slug/"
  expect 301 "/play/$slug"
  expect 404 "/play/$slug/no-such-file.js"
  expect_cache "/play/$slug/" "no-cache"
  expect_security_headers "/play/$slug/"
  [ -z "$(header "/play/$slug/" content-security-policy)" ] ||
    fail "/play/$slug/ carries the site's Content Security Policy, which can't vouch for a game."

  page=$(curl -s "$base/play/$slug/")
  grep -q '<title>Fuzzley Games</title>' <<< "$page" &&
    fail "/play/$slug/ is the site's own index.html, not the game."
  grep -q 'src="/analytics.js"' <<< "$page" ||
    fail "/play/$slug/ has no analytics tags."

  game_asset=$(grep -o 'assets/[^"]*\.js' <<< "$page" | head -1)
  if [ -z "$game_asset" ]; then
    fail "/play/$slug/ links no script under assets/."
  else
    expect 200 "/play/$slug/$game_asset"
    expect_cache "/play/$slug/$game_asset" "public, max-age=31536000, immutable"
    expect_security_headers "/play/$slug/$game_asset"
  fi

  pinned=$(jq -r --arg slug "$slug" '.[$slug].asset' frontend/games.json)
  curl -s "$base/version.json" |
    jq -e --arg slug "$slug" --arg asset "$pinned" \
      '.games[$slug].asset == $asset' > /dev/null ||
    fail "version.json doesn't name $pinned for $slug."
done

[ "$failed" = 0 ] || docker logs games
exit $failed
