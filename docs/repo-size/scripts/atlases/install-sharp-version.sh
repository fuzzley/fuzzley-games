#!/usr/bin/env bash
# Installs one version of sharp, with the resvg the lockfile pins, into a
# scratch folder of its own, for run-generator.mjs's --node-modules.
#
#   docs/repo-size/scripts/atlases/install-sharp-version.sh <sharp version> <folder>
set -euo pipefail
version=${1:?sharp version}
dir=${2:?folder}
mkdir -p "$dir"
cd "$dir"
[ -f package.json ] || echo '{"private": true}' > package.json
npm install --no-audit --no-fund --no-save "sharp@$version" "@resvg/resvg-js@2.6.2" >&2
node -e 'const s=require("sharp"); const v=JSON.parse(require("fs").readFileSync("node_modules/sharp/package.json")).version; console.log(`installed sharp ${v}, libvips ${s.versions.vips}`)'
