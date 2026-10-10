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

**Sources:** A deck's faces are either cut from a card sheet SVG in
`src/engine/render/assets/sprites/card/` (`playing_card_assets_large.svg` and
its two pip cuts, 52 faces plus two backs each) or generated: the `mobile`
deck's are drawn by `tools/card-atlas/mobile-deck.mjs`, its ranks set in the
bundled `tools/card-atlas/fonts/BarlowCondensed-Bold.ttf` rather than any system
font. Every deck is given the same four backs, so a player chooses the back
apart from the deck: the two plain ones `mobile-deck.mjs` draws, and the card
artwork's two, cut from `playing_card_assets_large.svg` (every sheet draws the
same pair). Their names, `BACK_FRAME_NAMES` in `tools/card-atlas/raster.mjs`,
must match `CardBackStyle` in `src/engine/render/deck/card_back.ts`; a new back goes
in both, and in `CARD_BACK_PATTERNS` in
`src/ui/app/component/settings_drawer/settings_drawer.component.ts` for its
preview. Every deck shares the placeholders in `card_placeholders.svg`, one 220 × 307
cell each in a row; a new one is a cell appended there and its name appended to
`PLACEHOLDERS.names` in `tools/build-card-atlas.mjs`, in the same order.

**Layout:** `tools/build-card-atlas.mjs` lists the decks and runs the build.
`yarn build:atlas --deck <id>` builds just one, and `--preview` also writes a
contact sheet, `.preview/decks.png` under `tools/card-atlas/` and gitignored:
every built deck as a fanned column and a fanned waste at phone scale, for
reviewing a change to a deck's look. The shared parts live in `tools/card-atlas/`: `raster.mjs` holds
the frame size, the densities, the frame names every atlas must hold and the
drawing every deck shares, `sheet-deck.mjs` finds a deck's cards on a card sheet
and draws them, and `atlas-writer.mjs` stamps the card edge and writes a density.

**Output:** `src/engine/render/assets/sprites/atlas/<deck>/<n>x/`, one directory
per deck and density. A deck that lists `vectors` in `DECKS`, as `mobile`
does, also gets `vectors.json` beside them: the SVG of each frame it generates,
ranks turned to paths by resvg, which `card_deck_vectors.ts` in
`src/engine/render/phaser/deck/` loads by a dynamic import, so the bundler
splits it into a chunk only a board drawing the deck at runtime fetches. Each holds a Phaser **multi-atlas** manifest
`card_assets_atlas.json` plus PNG pages `card_assets-0.png`,
`card_assets-1.png`, … Pages are PNG, not WebP. Frames are packed into as few
pages as fit inside `MAX_PAGE_PX` (4096), which is the texture-size floor still
found on older mobile GPUs.

Every deck is built at each density in `ART_SCALES`, in texels per design unit:
0.5×, 0.75×, 1×, 1.5× and 2×. A board draws from the least dense one that need
not enlarge its cards, so a phone held upright loads 0.5× or 0.75× and a
high-density desktop window 2×. Each is at most half as dense again as the one below,
so the GPU never shrinks a card below two thirds; see
[phaser-canvas-performance](../phaser-canvas-performance/SKILL.md). 2× takes two
pages and about 76 MB of GPU memory; every other density takes one, about 5 MB
at 0.5× and 20 MB at 1×.

A frame at density _n_ is `CARD_RENDER_WIDTH_PX × n` by
`CARD_RENDER_HEIGHT_PX × n` texels, each rounded to a whole number
(`frameSize` in `raster.mjs`, `cardFrameTexels` at runtime): 307 units at 0.5×
would otherwise be 153.5. The artwork is stretched to fill the rounded frame,
and the renderer scales each axis on its own so the card still comes out at its
design size.

Every density is drawn from the SVG itself, not shrunk from another, which
keeps thin strokes as sharp without the halo a shrink leaves around them. A card
sheet is rendered whole once, at 2×, to find its cards and check their crops;
each density then draws the same regions of it, several frames at once through
resvg's `renderAsync`, and the card edge is stamped at each density's own width.

The atlas is checked in and loaded **through the bundler**, not from `public/`.
`src/engine/render/phaser/deck/card_deck_atlas.ts` imports every deck's manifest at
every density. It resolves page filenames against an `import.meta.glob` of the
PNGs, so the pages keep their content hashes in `dist/` while the manifest can
go on naming them plainly. Only the pages a board actually loads are
downloaded.

**Rules:**

- Re-run `yarn build:atlas` whenever the card SVGs change. The atlas is a
  committed build artifact; a stale one ships.
- `ART_SCALES` in `tools/card-atlas/raster.mjs` and `CARD_ART_SCALES` in
  `src/engine/render/deck/card_art_scale.ts` must list the same densities, and
  `frameSize` and `cardFrameTexels` must round alike. Otherwise cards render at
  the wrong size.
  `test/engine/render/phaser/deck/card_deck_atlas.spec.ts` checks both against the
  built manifests.
- Adding a density to `CARD_ART_SCALES` is a compile error until
  `card_deck_atlas.ts` imports its manifests. `cardArtScaleFor`, next to it,
  decides which boards it is used for.
- The tool fails the build if any frame comes out without a stamped edge, or
  if a deck's frames are not exactly the 52 faces and every back. Those checks
  are deliberate; do not weaken them to get a build through.
- The `mobile` deck draws its index to fit the strip a fan leaves showing:
  `COLUMN_STRIP_H` and `WASTE_STRIP_W` in `mobile-deck.mjs` mirror
  `TABLEAU_FACE_UP_OFFSET` and `WASTE_FAN_OFFSET_X` in
  `src/games/common/pile_layouts.ts`. Change a fan offset and you change them
  too and rebuild the deck. The tool fails if an index leaves its strip, if
  anything else enters one, or if a suit colour falls under 4.5:1 contrast.
- A new deck goes in `DECKS` in the tool, in `DESKTOP_CARD_DECKS` in
  `src/engine/render/deck/card_deck.ts` (or beside `MOBILE_CARD_DECK`, which the
  card style setting picks rather than the player), and in the manifests in
  `card_deck_atlas.ts`. The compiler checks the last two against each other,
  not against the tool.
