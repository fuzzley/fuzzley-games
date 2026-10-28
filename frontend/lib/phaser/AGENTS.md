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
- `src/canvas/`: `<fz-phaser-canvas>`, the Angular component an app shows
  its scenes in, which makes the one host it keeps, through the
  `PHASER_CANVAS_HOST` token. Its `scene` input is a `SceneSource`, a
  function returning a `MakeScene` or a promise of one; its `state` is
  `loading`, `ready` or `failed`, also on the element as `data-state`; and
  what the app projects as `[fzCanvasPlaceholder]` lies over the canvas
  until the scene is ready. It imports the host, and so Phaser, with
  `import()`, when it first shows a scene.
- `src/testing/`: what a spec runs a scene in. `installHeadlessPhaser()`,
  which a test setup calls, gives jsdom the 2D and WebGL contexts, drawing
  nothing, that Phaser needs, and answers its requests and decodes its
  images as a browser would, so nothing reaches the network; and
  `runScene()` runs a scene in a WebGL game on them whose frames, clock,
  keys, pointer, context and served files a spec drives. `pngOfSize()` is
  an image to serve. `provideFakePhaserCanvas()` gives an app's shell
  specs a canvas that loads no Phaser, whose hosts `FakePhaserCanvas`
  keeps, to settle each scene they were shown.

## Rules

- **Imports go one way.** The library imports Phaser, Angular and
  `@fz/style`, never a game or the site.
- **The pure entries import nothing,** as ESLint checks, so a game's
  Phaser-free code can take them.
- **The host and the scene helpers know no framework,** as ESLint checks, so
  a scene runs the same in any app, and in a spec.
- **Only the canvas makes a host,** and it imports `host` with `import()`:
  ESLint lets `src/canvas/` import Phaser, the host and the scene helpers
  only by type, so an app that loads its scene with `import()` keeps Phaser
  out of its first download.
- **Whatever a scene follows, it releases when it ends,** since the game it
  runs in outlives it: through `src/scene/`'s helpers, or
  `whenSceneEnds()` for anything else.
- **A texture drawn at run time with a `Graphics` goes through
  `bakeTexture()`,** so it is drawn again after a lost context; one drawn
  otherwise, such as a filtered `DynamicTexture`, redraws itself through
  `onContextRestored()`.
- **No code bends to its specs.** The harness runs the renderer a browser
  does, so the library's code has no branch for a game with none.
- **The canvas's stylesheet is unencapsulated,** to reach what an app
  projects into it, so every selector in it starts at `fz-phaser-canvas`.
- **Every line of the pure entries is covered,** and the floor in
  `vitest.config.ts` holds the rest.

## Checks

The root's `yarn lint`, `yarn typecheck` and `yarn test` run the library's
own, which `yarn workspace @fz/phaser <script>` runs alone: ESLint and
stylelint, the Angular compiler's checks, and Vitest in jsdom, each spec
beside the file it tests. The specs run real Phaser, headless: the test
setup calls `installHeadlessPhaser()`, and the scene helpers' specs run
through `runScene()`, so the harness is checked by its own use. jsdom gets
no component styles, so what the canvas's stylesheet does is checked in a
browser, through a game's screenshots.
