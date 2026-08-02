---
name: vite-bundle-optimization
description: Vite configuration, the Phaser manual chunk, the card texture atlas toolchain (build-card-atlas.mjs), and what makes the subdirectory deploy work for fSolitaire. Triggers on: vite, bundle, chunk, vite.config, build:atlas, atlas generation, rollup, manualChunks, base href.
---

# Vite Build System & Texture Atlas Toolchain

> Build setup, chunking, and card atlas generation for fSolitaire.

## Commands

- **`yarn start` / `yarn dev`** — Vite dev server on `http://localhost:9000/`,
  opens a browser.
- **`yarn build`** — production assets into `dist/`.
- **`yarn preview`** — serves the production output locally.
- **`yarn build:atlas`** — regenerates the card atlas (see below).

## Chunking

`vite.config.ts` splits out exactly one manual chunk:

```ts
build: {
  outDir: "dist",
  assetsDir: "assets",
  rollupOptions: {
    output: {
      manualChunks(id) {
        if (id.includes("node_modules/phaser")) {
          return "phaser";
        }
      },
    },
  },
},
```

Phaser is the one dependency large enough and stable enough to be worth its own
cacheable file. **There is no separate Angular vendor chunk** — do not add one
speculatively; measure first, because Angular's own code splitting already
interacts with the AnalogJS plugin.

The ES output target comes from `tsconfig.json` (ES2022). `vite.config.ts` sets
no `build.target` of its own.

## The Subdirectory Deploy

Two settings exist solely because the built app is copied into
`/project/solitaire/` on another static host:

- **`base: "./"`** in `vite.config.ts`, so emitted asset URLs are relative and
  do not assume the site root.
- **`withHashLocation()`** in `provideRouter(routes, withHashLocation())`
  (`src/ui/app/main.ts`), so a deep link like `#/freecell` needs no server
  rewrite. (It is `withHashLocation()`, the modern provider — not the legacy
  `useHash: true` router option.)

Break either one and the app 404s on the host while working perfectly on
`yarn preview`.

## Texture Atlas Generation (`tools/build-card-atlas.mjs`)

**Sources:** `src/engine/render/assets/sprites/card/` — a card sheet SVG
(`playing_card_assets_large.svg`, 52 faces plus two backs) and
`card_placeholders.svg`.

**Output:** `src/engine/render/assets/sprites/atlas/` — a Phaser **multi-atlas**
manifest `card_assets_atlas.json` plus one or more PNG pages
`card_assets-0.png`, `card_assets-1.png`, … Pages are PNG, not WebP, and there
is more than one: frames are packed into as few pages as fit inside
`MAX_PAGE_PX` (4096), which is the texture-size floor still found on older
mobile GPUs.

The atlas is checked in and loaded **through the bundler**, not from `public/`.
`src/engine/render/phaser/loading_scene.ts` imports the manifest and resolves
page filenames against an `import.meta.glob` of the PNGs, so the pages keep
their content hashes in `dist/` while the manifest can go on naming them plainly.

**Rules:**

- Re-run `yarn build:atlas` whenever the card SVGs change. The atlas is a
  committed build artifact; a stale one ships.
- `ART_SCALE` in the tool must stay equal to `CARD_ART_SCALE` in
  `src/engine/render/layout/card_metrics.ts`. They are two halves of one number
  — texels per design unit — and the cards render at the wrong size if they
  drift.
- The tool fails the build if any frame comes out without a stamped edge. That
  check is deliberate; do not weaken it to get a build through.
