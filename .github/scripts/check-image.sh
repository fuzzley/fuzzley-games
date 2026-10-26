#!/usr/bin/env bash
# Serves a built image and checks its pages, cache and security headers,
# theme.js, icons, env.js, version.json and games.
#
# Both verify.yml and update-games.yml run this on the image they build, before
# the commit can reach live, the branch Cloud Run builds and deploys.
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
# Checks a file is served as its type, which nginx's fallback to index.html
# for a missing one would not be.
expect_type() {
  value=$(header "$1" content-type)
  echo "Content-Type: $value  $1"
  [ "${value%%;*}" = "$2" ] || fail "Expected Content-Type: $2 for $1, got '$value'."
}
# Checks the icons @fz/style's Vite plugin writes, under a base.
expect_icons() {
  expect_type "$1favicon.svg" image/svg+xml
  expect_type "$1favicon.ico" image/x-icon
  expect_type "$1apple-touch-icon.png" image/png
}
# Checks an address is sent to another with a permanent redirect.
expect_redirect() {
  expect 301 "$1"
  value=$(header "$1" location)
  echo "Location: $value  $1"
  [ "$value" = "$2" ] || fail "Expected $1 to redirect to $2, got '$value'."
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
# A folder's index.html is sent to the folder's address, query and all.
expect_redirect /index.html /
expect_redirect "/index.html?q=spider" "/?q=spider"

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
  /assets/no-such-file.js /index.html; do
  expect_security_headers "$path"
done
csp=$(header / content-security-policy)
echo "Content-Security-Policy: $csp"
grep -q "default-src 'self'" <<< "$csp" ||
  fail "The site's pages have no Content Security Policy."
grep -q "frame-ancestors 'none'" <<< "$csp" ||
  fail "The site's Content Security Policy lets other sites frame it."

expect_icons /

# theme.js is made at build time from @fz/style's list of palettes.
curl -s "$base/theme.js" | grep -q 'document.documentElement.dataset.theme' ||
  fail "theme.js doesn't set the page's palette."
# env.js is written from the container's environment at startup.
curl -s "$base/env.js" | grep -q '"G-CHECK00000"' ||
  fail "env.js doesn't carry GA_AG_MEASUREMENT_ID."
# The image says which commit it was built from.
curl -s "$base/version.json" | grep -q "\"commit\": \"${commit::7}\"" ||
  fail "version.json doesn't name commit ${commit::7}."

# Each game in games.json is a static page of its own under /play/, never the
# site's index.html, with its own fingerprinted assets/ folder.
expect 404 /play/no-such-game/
for slug in $(jq -r 'keys[]' frontend/site/games.json); do
  expect 200 "/play/$slug/"
  expect 301 "/play/$slug"
  expect_redirect "/play/$slug/index.html" "/play/$slug/"
  expect 404 "/play/$slug/no-such-file.js"
  expect_cache "/play/$slug/" "no-cache"
  expect_security_headers "/play/$slug/"
  [ -z "$(header "/play/$slug/" content-security-policy)" ] ||
    fail "/play/$slug/ carries the site's Content Security Policy, which isn't written for a game."

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

  # version.json names the build: a pinned game's archive, or for a game built
  # here, its workspace and the image's own commit.
  build=$(jq -c --arg slug "$slug" '.[$slug]' frontend/site/games.json)
  # A game built here has the icons the site has.
  if jq -e '.workspace' <<< "$build" > /dev/null; then
    expect_icons "/play/$slug/"
  fi
  curl -s "$base/version.json" |
    jq -e --arg slug "$slug" --argjson build "$build" --arg commit "${commit::7}" \
      '.games[$slug] | if $build.asset then .asset == $build.asset
        else .workspace == $build.workspace and .commit == $commit end' \
      > /dev/null ||
    fail "version.json doesn't name the build of $slug that games.json lists: $build."
done

[ "$failed" = 0 ] || docker logs games
exit $failed
