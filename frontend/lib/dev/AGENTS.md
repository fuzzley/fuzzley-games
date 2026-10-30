# @fz/dev

The `@fz/dev` library (`frontend/lib/dev`): what every workspace shares to
check, test and build itself and script its chores, which no app's own code
imports. The
frontend's rules, in [frontend/AGENTS.md](../../AGENTS.md), and the
repository's, in [.agents/AGENTS.md](../../../.agents/AGENTS.md), apply here
too. Paths are relative to `frontend/lib/dev/`.

## What it holds

- `src/eslint.ts`, `@fz/dev/eslint`: the blocks a workspace's
  `eslint.config.js` is made of, each given the files it covers:
  - `typescript()`: typescript-eslint's strict and stylistic type-checked
    rules, with the repository's own on top (explicit return types on what a
    module exports, `import type` for type-only imports, `@deprecated` APIs
    an error), and the fence around every library's testing entry point,
    such as `@fz/ui/testing`. It needs the workspace's folder (`root`), whose
    `tsconfig.json` its project service starts from.
  - `angular()`: angular-eslint's rules for the TypeScript, and the prefix
    every component and directive selector carries (`fz` in a library,
    `app` in an app).
  - `templates()`: angular-eslint's rules for the templates, accessibility's
    among them.
  - `tests()`: what the specs, and the helpers only they use, may do that
    other code may not: assert with `!`, stub with an empty function, let a
    mock's type be what it builds, and import the libraries' testing helpers.
  - `scripts()`: the `.mjs` scripts' rules, which require JSDoc types on
    every parameter and returned value.
  - `phaser()`: what code that drives Phaser may do that other code may
    not: keep the guards `no-unnecessary-condition` would take out, since
    Phaser types a scene's systems as always there, though they aren't
    before it boots or after it ends.
- `tsconfig/`, `@fz/dev/tsconfig/*.json`: the compiler options a
  workspace's `tsconfig.json` extends.
  - `base.json`: the strict flags every workspace's TypeScript is checked
    with. An app compiles the libraries' sources into its own program, with
    its own options, so one set for all of them is what lets a library's code
    pass in every app.
  - `angular.json`: the base, with Angular's decorators and the Angular
    compiler's strictest checks, every extended diagnostic an error. Its
    `outDir` and `rootDir` are the extending workspace's own folder
    (`${configDir}`).
  - `scripts.json`: the `.mjs` scripts, type-checked from their JSDoc.
- `src/vitest.ts`, `@fz/dev/vitest`: the Vitest settings every workspace's
  specs share. `angularTests()` is the whole config of a workspace that
  tests Angular code: Analog's plugin, every spec under `src/` in jsdom with
  the globals TestBed needs, after the workspace's `test-setup.ts` there,
  and V8 coverage of `src/`, less the setup file. `nodeTests()` is the same
  for specs that run in Node. Each is given the workspace's floors and,
  where they differ, the files coverage measures or leaves out. The pieces
  they are made of, `angularSpecs()`, `nodeSpecs()` and `coverage()`, are
  for a config of Vitest projects, such as the site's.
- `src/vite.ts`, `@fz/dev/vite`: `gameConfig({ port, name, catalog })`,
  the Vite config every game built here shares: the `./` base that lets
  the site serve a build from `/play/<slug>/`, the Angular plugins,
  `@fz/style`'s `fuzzleyStyle()`, the game's manifest, a build in `dist/`
  with its files in `assets/` and Phaser, where a game has it, in a chunk
  of its own (`PHASER_CHUNK`), and a dev server on the game's own port,
  which its screenshot script defaults to: 9000 for the Solitaire
  Collection, 9001 for Minesweeper, 9002 for Sudoku, 9003 for Snake,
  9004 for Brick Breaker. The Angular plugins, `angularPlugins()`, which the
  site's config takes too, are Analog's with its live reload, which swaps an
  edited component's template or styles into the running page, and
  `componentUpdates()`, which makes that hold for every component and reloads
  the page for an edit to TypeScript, whose class code Angular can't swap.
  Analog announces an update under the component's path from the app's folder,
  where Angular compiled in its path from the app's `rootDir`, or its whole
  path for a file outside it, such as a library's, in lower case on Windows;
  so `componentUpdates()` renames each update to Angular's ID, and the page's
  request for it back to Analog's. It takes the app's `rootDir` to be its
  folder, as `tsconfig/angular.json` sets it; an app that moves its `rootDir`
  loses its updates without a word. The last of them, `watchLibraries()`,
  watches `frontend/lib/` as a whole: Vite watches each file outside the app's
  folder on its own, and loses one that git replaces (a checkout, a stash, a
  branch switch), which a watched folder sees come back. A server logs a page
  reload for a library's template it never loaded, and sends one only for that
  template's own address, so no page reloads.
- `src/game_manifest.ts`, `@fz/dev/game-manifest`: what a game's build
  says it holds, in `game.json` at the top of its `dist/`: its name and,
  for a collection, the `id` and `name` of every game it opens.
  `gameManifest()` is the plugin that writes it, loading a collection's
  catalog module through Vite's `runnerImport()` with the build's own
  aliases; `isGameManifest()` is the guard the site reads it with, and
  `GameManifest` its type.
- `src/chrome.ts`, `@fz/dev/chrome`: what a script that drives a headless
  Chrome needs. `withChrome()` starts Chrome on a throwaway profile and
  hands over a `DevToolsConnection`; `withPage()` opens a `Page` in a
  browser context of its own at a viewport, which navigates, reloads, runs
  a function in the page before or after it loads, listens to its events
  (`on()`), and takes a screenshot.
  `findChrome()` picks the Chrome to run: the one asked for, `CHROME_PATH`,
  or the first installed in a usual place. The games' screenshot scripts
  are built on it, and so is the layout check.
- `src/layout.ts`, `@fz/dev/layout`: a game's layout checked in a real
  browser. `checkLayout()` opens a game's page at each of `SHAPES` (a roomy
  window, and a large and a small phone, upright and on its side), waits for a
  selector and the fonts, and returns what is wrong at each: an error the page
  reports (an exception, `console.error`, or the browser's own, such as a
  refused resource), a page that scrolls, a control of the game bar out of the
  window, and what the game's own `inspect()`, run in the page, finds.
  `checkTurns()` does the same once it has turned the window, as a phone
  turns, through each of `TURNS` (upright to its side, and back), and given
  half a second to lay itself out again, which finds what follows a turn late,
  or not at all. A check's `before()` runs in the page ahead of its own
  scripts, to set it up as a player might have, such as with a setting stored.
  `SMALLEST`, a 320 × 480 phone held upright, and `shapesAt()` and
  `turnsAt()`, which copy shapes and turns at a pixel ratio, are there for a
  game drawn on a canvas, as Snake and Brick Breaker check theirs at 2×. The
  functions it runs in the page are in `src/layout_page.ts`, which only a
  browser runs, so coverage leaves it out. A game's `tools/check-layout.mjs`
  holds its inspection and which checks it runs, and hands them to
  `runLayoutScript()`, which reads the command line (`--chrome`, `--help`),
  serves the build as `yarn preview` does, runs the checks in a headless
  Chrome and prints what is wrong, or that the layout holds. It returns the
  exit code, 1 for a layout that doesn't hold and 2 for an option it doesn't
  know, and throws where it can't check at all, such as for a game with no
  build, no Chrome to run, or a page that never draws.
- `src/screenshots.ts`, `@fz/dev/screenshots`: the images the site shows
  of a game, `SITE_IMAGES` (`thumb.webp` at 576 × 324 and `preview.webp` at
  2560 × 1440, the names `screenshotUrl()` in the site's model asks for),
  and the sharp calls that write them. `writeSiteImages()` writes both from
  a capture into a folder, the thumbnail cropped to a region when given
  one; `writeImage()` writes one image of any size, as the Solitaire
  Collection's rules-page image is.
- `src/sounds.ts`, `@fz/dev/sounds`: a game's sound effects, synthesized. A
  `Sound` is a name, a length, a peak and a wave, made of `glide()` (a tone
  gliding between two pitches), `envelope()`, `thud()` (seeded noise),
  `note()` and `arpeggio()` (a chord's notes struck one after another, as a
  chime is); `writeSoundSprite()` renders a list of them, throwing for an
  empty list, two of one name or a silent one, at 16,000 samples a second,
  each faded out at its end and a tenth of a second apart, into `sounds.wav`
  and the spritemap Phaser plays it by, `sounds.json`, the same bytes every
  run. A game's `tools/build-sounds.mjs` holds its recipes and calls it.

## How a workspace uses it

- **A workspace's configs extend it, and add only what is their own.** Its
  `package.json` lists `"@fz/dev": "workspace:*"` beside `eslint` and
  `typescript`, which it runs. Its `eslint.config.js` passes the blocks to
  `defineConfig()`, then its own fences, such as Minesweeper's around its
  rules, and its `tsconfig.json` extends `@fz/dev/tsconfig/angular.json`
  (`base.json` without Angular), as `frontend/games/minesweeper/` shows. A
  rule raised here is raised everywhere at once.
- **Its `vitest.config.ts` is `angularTests()` or `nodeTests()`**, given
  its floors, unless its specs run another way: the Solitaire Collection's
  live under `test/`, mostly in Node, and keep a config of their own. A
  game's `vite.config.ts` is `gameConfig()`, with what is the game's own
  merged in by Vite's `mergeConfig()`, as `frontend/games/solitaire/` does
  for the commit it was built from and its `@` alias. Analog's plugin, Vite
  and Vitest are peers, which the workspace lists and runs.
- **A game's screenshot script writes the site's images with
  `writeSiteImages()`**, and keeps to itself how it stages its game and
  what else it writes.
- **A workspace's own import fences use
  `@typescript-eslint/no-restricted-imports`**, so that they add to the
  testing fence, which uses ESLint's own `no-restricted-imports`, rather
  than replace it.
- **A loosening stays in the workspace, with its reason,** unless every
  workspace of a kind needs it: `phaser()` is the one here, since every
  folder that drives Phaser does.

## Rules

- **It runs in Node as it is.** An app's ESLint config and scripts import
  these files, so relative imports name the file (`./eslint.ts`) and the
  TypeScript is only the kind Node can strip (`erasableSyntaxOnly`), as in
  `@fz/style`.
- **Nothing here reaches an app's bundle.** It holds only what checks,
  builds or scripts a workspace; what an app runs belongs in the other
  libraries.
- **It depends on `@fz/style`**, for the plugin `gameConfig()` adds, while
  `@fz/style` is checked with this library's presets. Yarn links the two
  either way round, and nothing in `lib/` is built, so neither has to come
  first.

## Checks

The root's `yarn lint`, `yarn typecheck` and `yarn test` run the library's
own, which `yarn workspace @fz/dev <script>` runs alone.

- **`lint`** runs ESLint with its own blocks (`eslint.config.js`).
- **`typecheck`** runs `tsc` over the sources, the specs and the Vitest
  config.
- **`test`** runs Vitest in Node. `src/eslint.spec.ts` lints files written
  into a folder of their own with the blocks, so a block that stops catching
  what it should fails here; `src/vitest.spec.ts` and `src/vite.spec.ts`
  check the configs the presets return; `src/game_manifest.spec.ts` builds
  games with Vite in a folder of their own and reads the manifests they
  write; `src/screenshots.spec.ts` writes the site's images from a capture
  it draws; `src/sounds.spec.ts` renders sprites and reads them back;
  `src/chrome.spec.ts` and `src/layout.spec.ts` drive the DevTools helpers
  and the layout check against a fake browser, `src/testing/fake_browser.ts`,
  and the layout spec serves a build it writes with Vite's `preview()`.
  Starting a real Chrome is left to the screenshot scripts, so the coverage
  floor in `vitest.config.ts` sits under it.
