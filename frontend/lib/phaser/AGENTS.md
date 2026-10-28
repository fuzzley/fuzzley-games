# @fz/phaser

The `@fz/phaser` library (`frontend/lib/phaser`): what every game drawn with
Phaser shares. The frontend's rules are in
[frontend/AGENTS.md](../../AGENTS.md), and the repository's in
[.agents/AGENTS.md](../../../.agents/AGENTS.md). Paths are relative to
`frontend/lib/phaser/`.

## What it holds

One folder under `src/` per entry point, each with an `index.ts` that names
what it exports; an app imports it as `@fz/phaser/<folder>`. The entries
are split by what they import, so a game's code that knows no Phaser can
take the pure ones.

- `src/insets/`: `Insets` and `NO_INSETS`, how far an app's chrome lies over
  each edge of a canvas. It imports nothing.
- `src/color/`: `colorNumber()`, a palette role's hex as the number Phaser
  takes, and `mixColors()`, two colors mixed as CSS's `color-mix(in srgb)`
  mixes them, for `@fz/style`'s washes. It imports nothing.
- `src/host/`: `PhaserHost`, which keeps one Phaser game, and so one WebGL
  context, for a canvas's whole life and swaps each scene it is handed into
  it, and `ViewportScaler`, which keeps the canvas at the size and pixel
  ratio of its box. It imports Phaser, never Angular.
- `src/scene/`: what a scene needs to live in a game that outlives it:
  `whenSceneEnds()`, and `onScaleResize()`, `onContextRestored()` and
  `onFirstFrame()`, which let go of what they subscribe to when the scene
  ends; `pixelRatioOf()`; and `bakeTexture()`, a texture drawn at run time
  and drawn again after a lost context. It imports Phaser, never Angular.
- `src/testing/`: what a spec runs a scene in. `installHeadlessPhaser()`,
  which a test setup calls, gives jsdom the blank 2D context and image loads
  Phaser needs, and `runScene()` runs a scene in a HEADLESS game whose
  frames, clock, keys and pointer a spec drives.

## Rules

- **Imports go one way.** The library imports Phaser, Angular and
  `@fz/style`, never a game or the site.
- **The pure entries import nothing,** as ESLint checks, so a game's
  Phaser-free code can take them.
- **Every line of the pure entries is covered,** and the floor in
  `vitest.config.ts` holds the rest.

## Checks

The root's `yarn lint`, `yarn typecheck` and `yarn test` run the library's
own, which `yarn workspace @fz/phaser <script>` runs alone: ESLint and
stylelint, the Angular compiler's checks, and Vitest in jsdom, each spec
beside the file it tests.
