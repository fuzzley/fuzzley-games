#!/usr/bin/env bash
# Lists what reads the card atlases at HEAD, from git grep over tracked
# files: imports of the manifests and vectors.json, the glob of the pages,
# the specs that serve pages from the workspace, and the docs and configs
# that name the atlas folder. Also prints the build targets (Vite's default,
# since no config sets one) and the facts the WebP question turns on.
#
#   docs/repo-size/scripts/atlases/list-consumers.sh
set -uo pipefail
cd "$(dirname "$0")/../../../.."
ATLAS=frontend/games/solitaire/src/engine/render/assets/sprites/atlas

section() { printf '\n== %s\n' "$1"; }

section "Tracked files under the atlas folder"
git ls-tree -r -l HEAD "$ATLAS/" | awk '{n++; s+=$4} END {printf "%d files, %.2f MiB\n", n, s/1048576}'
git ls-tree -r -l HEAD "$ATLAS/" | awk '$5 ~ /\.png$/ {n++; s+=$4} END {printf "  PNG pages: %d files, %.2f MiB\n", n, s/1048576}'
git ls-tree -r -l HEAD "$ATLAS/" | awk '$5 ~ /\.json$/ {n++; s+=$4} END {printf "  JSON: %d files, %.2f MiB\n", n, s/1048576}'

section "Source that imports the manifests, vectors.json or the pages"
git grep -n -E "sprites/atlas/" -- 'frontend/games/solitaire/src/**/*.ts' | sed -E 's/:([0-9]+):.*(sprites\/atlas\/[^"]*).*/:\1: \2/' | sort | uniq

section "Specs and test support that import manifests or read pages"
git grep -l -E "sprites/atlas/|serveWorkspace|runSceneWithAtlases|loadAtlases" -- 'frontend/games/solitaire/test' | sort
echo "spec files in the workspace: $(git ls-files 'frontend/games/solitaire/test/**/*.spec.ts' | wc -l)"

section "The headless harness sizes a served image from its PNG header only"
git grep -n -E "function pngSize|PNG_SIGNATURE =|at 0 × 0 if it is no PNG" -- frontend/lib/phaser/src/testing/served_files.ts

section "Typed lint: the TypeScript preset's parser options"
git grep -n "projectService" -- frontend/lib/dev/src/eslint.ts
section "JSON modules in the compiler presets"
git grep -n "resolveJsonModule" -- frontend/lib/dev/tsconfig

section "What git, Prettier and Docker ignore near the atlases"
git check-ignore -v "$ATLAS/classic/1x/card_assets-0.png" || echo "atlas pages: not ignored"
grep -n "solitaire" .dockerignore || true

section "Docs, skills and notices that name the atlas folder or say it is committed"
git grep -l -E "sprites/atlas|atlas is committed|card_assets-" -- '*.md' 'frontend/games/solitaire/NOTICE' ':!docs/archive' ':!docs/repo-size' | sort

section "The solitaire build and test scripts"
node -p 'const s=require("./frontend/games/solitaire/package.json").scripts; ["build","build:atlas","test","test:coverage","lint","typecheck"].map(k=>`${k}: ${s[k]}`).join("\n")'

section "Build targets: any build.target or browserslist in the repo"
git grep -n -E "build\.target|\btarget:|browserslist" -- 'frontend/**/vite.config.ts' 'frontend/lib/dev/src/vite.ts' 'frontend/**/package.json' '.browserslistrc' '**/.browserslistrc' || echo "none"
section "Vite's default build target, which applies"
node -p 'require("./frontend/node_modules/vite/package.json").version' | sed 's/^/vite /'
sed -n '/^const ESBUILD_BASELINE_WIDELY_AVAILABLE_TARGET = \[/,/^\];/p' frontend/node_modules/vite/dist/node/chunks/node.js

section "WebP the site and games already ship"
echo "tracked .webp files: $(git ls-files '*.webp' | wc -l), of them under public/: $(git ls-files '*.webp' | grep -c '/public/')"

section "Which games load image files with Phaser's loader"
git grep -n -E "\.load\.[a-z]+[(]|loader\.(multiatlas|image|atlas)[(]" -- ':(glob)frontend/games/*/src/**' ':(glob)frontend/lib/*/src/**' | grep -v "\.spec\.ts" || true
section "Renderer type each Phaser host asks for"
git grep -n -E "type: (Phaser\.)?(AUTO|WEBGL|CANVAS)" -- 'frontend/lib/phaser/src' ':(glob)frontend/games/*/src/**' || true
section "Code that reads texture pixels"
git grep -n -E "getPixel|getPixelAlpha|pixelPerfect|alphaTolerance|getImageData|readPixels" -- ':(glob)frontend/games/*/src/**' ':(glob)frontend/lib/*/src/**' | grep -v "\.spec\.ts" | grep -v "/testing/" || echo "none outside specs and testing helpers"

section "PNG chunks in each atlas page at HEAD (colour-management chunks would be gAMA, cHRM, sRGB, iCCP)"
git ls-tree -r --name-only HEAD "$ATLAS/" | grep '\.png$' | while read -r page; do
  git show "HEAD:$page" | node -e '
    const b = require("fs").readFileSync(0); const types = [];
    for (let i = 8; i < b.length; ) { const len = b.readUInt32BE(i); types.push(b.toString("latin1", i + 4, i + 8)); i += 12 + len; }
    const counts = {}; for (const t of types) counts[t] = (counts[t] ?? 0) + 1;
    console.log(Object.entries(counts).map(([t, n]) => `${t}x${n}`).join(" "));'
done | sed -E "s/IDATx[0-9]+/IDAT(several)/" | sort | uniq -c

section "PNGs at HEAD by where they sit"
git ls-tree -r -l HEAD | awk '$5 ~ /\.png$/ {
  if ($5 ~ /sprites\/atlas\//) c = "atlas pages";
  else if ($5 ~ /solitaire\/docs\/screenshots\//) c = "solitaire docs/screenshots (lossless originals)";
  else if ($5 ~ /(^|\/)docs\//) c = "other docs/ folders";
  else if ($5 ~ /\/(src|public)\//) c = "other src/ or public/ (shipped)";
  else c = "elsewhere";
  n[c]++; s[c] += $4 }
  END { for (k in n) printf "%s: %d files, %.2f MiB\n", k, n[k], s[k] / 1048576 }' | sort

section "Screenshot files each game keeps at HEAD, by extension (a lossless original is a .png outside public/)"
git ls-files ':(glob)frontend/games/*/docs/screenshots/**' ':(glob)frontend/games/*/public/docs/screenshots/**' |
  awk -F/ '{ ext = $NF; sub(/.*\./, "", ext); where = ($4 == "public") ? "public" : "docs"; print $3, where, ext }' | sort | uniq -c
section "Which games' screenshot scripts write the site's images straight from the capture"
git grep -l -E "runScreenshotScript|writeSiteImages" -- ':(glob)frontend/games/*/tools/*.mjs'

section "What already runs sharp or resvg when an app builds (outside specs and tools/)"
git grep -n -E "import\(\"sharp\"\)|from \"sharp\"|@resvg/resvg-js" -- ':(glob)frontend/lib/*/src/**' ':(glob)frontend/site/src/**' ':(glob)frontend/games/*/src/**' | grep -v "\.spec\.ts" || echo "none"
git grep -n -E "fuzzleyStyle\(\)" -- frontend/lib/dev/src/vite.ts frontend/site/vite.config.ts || true
git grep -n -E "fuzzballPng|fuzzballIco" -- frontend/lib/style/src/build/vite.ts || true
