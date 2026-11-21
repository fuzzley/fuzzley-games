#!/usr/bin/env bash
# Runs the card atlas generator inside the Dockerfile's build image,
# node:26.13.1-alpine3.24 (musl), and copies what it wrote back out.
#
#   docs/repo-size/scripts/atlases/docker-alpine.sh <output dir>
#   DOCKER_CPUSET=0-3 docs/repo-size/scripts/atlases/docker-alpine.sh <output dir>
#
# DOCKER_CPUSET pins the container to those CPUs (docker run --cpuset-cpus),
# to stand in for a 4-vCPU runner.
#
# The container gets, on stdin, the generator's tools, the SVG card sheets,
# run-generator.mjs and a package.json naming the sharp and resvg versions
# frontend/yarn.lock pins. npm installs them there, picking the linuxmusl
# binaries as Yarn would on the same platform, and run-generator.mjs times
# the run. The atlases and the timing come back on stdout as a tar, into
# <output dir>. The container is removed when it exits, and the image too
# if it was not here before.
set -euo pipefail

IMAGE='node:26.13.1-alpine3.24@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5'
REPO=$(cd "$(dirname "$0")/../../../.." && pwd)
WS="$REPO/frontend/games/solitaire"
OUT=${1:?output dir}
mkdir -p "$OUT"

if docker image inspect "$IMAGE" > /dev/null 2>&1; then had_image=yes; else had_image=no; fi
cleanup() {
  rm -rf "$stage"
  if [ "$had_image" = no ]; then docker rmi "$IMAGE" > /dev/null 2>&1 || true; fi
}
stage=$(mktemp -d)
trap cleanup EXIT

sharp=$(sed -n '/^"sharp@npm:/,/^$/s/^  version: //p' "$REPO/frontend/yarn.lock")
resvg=$(sed -n '/^"@resvg\/resvg-js@npm:/,/^$/s/^  version: //p' "$REPO/frontend/yarn.lock")
echo "lockfile pins sharp $sharp, @resvg/resvg-js $resvg" >&2

mkdir -p "$stage/frontend/games/solitaire/src/engine/render/assets/sprites" \
  "$stage/docs/repo-size/scripts/atlases"
cp -r "$WS/tools" "$stage/frontend/games/solitaire/tools"
rm -rf "$stage/frontend/games/solitaire/tools/card-atlas/.preview"
cp -r "$WS/src/engine/render/assets/sprites/card" \
  "$stage/frontend/games/solitaire/src/engine/render/assets/sprites/card"
cp "$REPO/docs/repo-size/scripts/atlases/run-generator.mjs" \
  "$stage/docs/repo-size/scripts/atlases/"
printf '{"private": true, "dependencies": {"sharp": "%s", "@resvg/resvg-js": "%s"}}\n' \
  "$sharp" "$resvg" > "$stage/frontend/package.json"

docker pull -q "$IMAGE" >&2
cpuset=()
if [ -n "${DOCKER_CPUSET:-}" ]; then cpuset=(--cpuset-cpus "$DOCKER_CPUSET"); fi
tar -C "$stage" -c . | docker run --rm -i "${cpuset[@]}" "$IMAGE" sh -c '
  set -e
  mkdir /repo /scratch
  cd /repo
  tar x
  {
    echo "alpine $(cat /etc/alpine-release), node $(node --version), $(ldd 2>&1 | head -1)"
    echo "cpus in container: $(nproc)"
  } > /scratch/env.txt
  (cd frontend && npm install --no-audit --no-fund) >&2
  ls frontend/node_modules/@img frontend/node_modules/@resvg >> /scratch/env.txt
  ATLAS_SCRATCH=/scratch node docs/repo-size/scripts/atlases/run-generator.mjs alpine \
    > /scratch/run.txt
  tar -C /scratch -c env.txt run.txt mirror-alpine/src/engine/render/assets/sprites/atlas
' | tar -x -C "$OUT"

cat "$OUT/env.txt" "$OUT/run.txt"
