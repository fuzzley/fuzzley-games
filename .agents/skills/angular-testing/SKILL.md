---
name: angular-testing
description: How every Angular workspace here writes its specs (the site, Minesweeper, Sudoku, Snake's shell, Brick Breaker's shell, Asteroid Breaker's shell, the Solitaire Collection's shell, @fz/ui, @fz/game-ui and @fz/phaser's canvas) — @fz/dev/vitest's setup, Testing Library queries by role, user-event, jest-dom, zoneless change detection, what jsdom keeps and lacks, and the libraries' testing helpers. Triggers on: vitest, unit test, spec, TestBed, Testing Library, render, screen, getByRole, user-event, jest-dom, jsdom, fake timers, coverage.
---

# Testing Angular code

The patterns every Angular workspace's specs share. The rules every spec in the
repository follows (Arrange-Act-Assert, the public API, state over interactions,
real objects over mocks) are in `.agents/AGENTS.md`, under "Writing Unit Tests".
Each app's own skill covers its setup, fixtures and floors: `site-testing`,
`minesweeper-testing`, `sudoku-testing`, `snake-testing`,
`brick-breaker-testing`, `asteroid-breaker-testing` and `solitaire-testing`; a
scene drawn with Phaser is `phaser-core`'s. Paths are relative to the
repository's root.

## Setup

- **A workspace's `vitest.config.ts` is `@fz/dev/vitest`'s
  `angularTests()`**, given its floors: Analog's plugin, every `*.spec.ts`
  under `src/` in jsdom after the workspace's `src/test-setup.ts`, and V8
  coverage of `src/`. Given the folders of its projects, as Snake's, Brick
  Breaker's and Asteroid Breaker's are, it runs the specs that touch no
  page in Node (`pure`), the simulations in Node too (`sim`), and the rest
  in jsdom with the plugin (`dom`); a `test:coverage` script that runs
  Vitest twice, as the breakers' do, is what runs the simulations apart,
  without coverage. The site's config of Vitest projects is built from its pieces,
  `angularSpecs()`, `nodeSpecs()` and `coverage()`
  (`frontend/lib/dev/AGENTS.md`). The Solitaire Collection keeps a config
  of its own, its specs under `test/`, in Node unless one asks for jsdom.
- **The setup file** starts Angular's zoneless TestBed and loads jest-dom's
  matchers, and polyfills `<dialog>`, which jsdom lacks, where the app opens
  one.
- **Specs use Vitest's globals** (`describe`, `it`, `expect`, `vi`) without
  importing them. The globals are not optional: TestBed and Testing Library
  register their teardown on the global `afterEach`, so without them TestBed
  would never reset between tests.
- **A floor holds for the whole suite,** so `yarn vitest run <path>`, from
  the workspace's folder, runs one spec without coverage, with
  `--project <name>` where the workspace has projects, so Vitest starts
  that one alone. Vitest strips types without checking them;
  `yarn typecheck` checks the specs'.

## Components

- Render a component with `render()` from `@testing-library/angular`,
  passing its `inputs` and `providers`, and find what it shows through
  `screen` by role, label or text:
  `screen.getByRole("button", { name: "New game" })`. Never query by a CSS
  class: a role query also checks what assistive technology is told, and a
  restyle can't break it.
- Drive it as a person would, with `@testing-library/user-event`:
  `const user = userEvent.setup()`, then `await user.click(…)` or
  `await user.keyboard("{Escape}")`. `fireEvent` is for what user-event
  can't make, such as a touch's pointer events.
- Assert with jest-dom's matchers (`toHaveAttribute`, `toHaveFocus`,
  `toBeInTheDocument`, `toHaveTextContent`).
- Get a service with `TestBed.inject(…)`.

## Change Detection and Time

- Change detection is zoneless. `render` and user-event's actions leave the
  template up to date; an effect in a service runs on `TestBed.tick()`.
- Install fake timers after `render`: rendering waits for the app to be
  stable, which it never is while time stands still.

## What jsdom Keeps and Lacks

- **One document for a whole spec file,** so reset any browser state a test
  touches (attributes on `document.documentElement`) in a `beforeEach`, or
  in the setup file for every spec.
- **No `localStorage` of a test's own:** `provideMemoryStorage()`, from
  `@fz/ui/testing`, gives the app a store in memory for the browser's, which
  a game's setup file hands each test. A spec that stores an entry for the
  app, reads back what it stored, or loads it again after
  `TestBed.resetTestingModule()` holds a `MemoryStorage` of its own and
  hands it to `provideMemoryStorage()` each time.
- **A service reads what is stored when it is made,** so store an entry
  before the first `render` or `TestBed.inject`.
- **No `matchMedia`:** `installFakeViewport(width, height)`, from
  `@fz/ui/testing`, or `@fz/game-ui/testing` in a game, answers the queries
  `GameViewportService` and `ThemeService` ask, and a board's
  `(resolution)`; `setPixelRatio()`, `setColorScheme()` and
  `setReducedMotion()` change them; it takes itself off once the test
  finishes, so it goes in the test or a `beforeEach`, never a `beforeAll`.
- **No `<dialog>` methods:** `installDialogPolyfill()`, from
  `@fz/ui/testing`, in the setup file.
- **No canvas and no component styles:** a shell around `<fz-phaser-canvas>`
  takes `provideFakePhaserCanvas()`, from `@fz/phaser/testing`, and a spec
  asserts on a state, such as `data-state`, rather than on what a component's
  stylesheet shows or hides, which Analog's test build leaves out.
- **An accessible name's inline parts run together** where a browser puts a
  space ("Hard16 × 30" where Chrome reads "Hard 16 × 30"), so match such a
  name with `\s*`.
- **jsdom's `URL` isn't Node's,** and `fileURLToPath` refuses it, so a spec
  that reads a file builds its path with `import.meta.dirname` and
  `node:path`.

## The Libraries' Helpers

Each library's `testing` entry point holds what specs need of it, and
`@fz/dev`'s ESLint lets only specs and their helpers import one:

- `@fz/ui/testing`: `installDialogPolyfill()`; `installFakeViewport()`;
  `provideMemoryStorage()` and `MemoryStorage`, a store in memory for the
  browser's; `setPageVisibility()`, which hides the page or shows it
  again, as switching tabs does, until the test finishes; and `figure()`,
  `figureValue()` and `figures()`, which read a bar's or a card's figures
  by their terms and throw when a term is missing.
- `@fz/game-ui/testing`: `installFakeViewport()`, handed on from
  `@fz/ui/testing`; and `barChoice()`, `chooseInBar()` and `openBarMenu()`,
  which drive the bar's choice and overflow menus as a player does.
- `@fz/core/testing`: `FRAME_MS`, `playUntil()` and `playFor()`, which play
  any game with a `tick(ms, steer)` a frame at a time, in a spec in Node
  too, as it loads no framework; and `variantOfSpec()`, the variant a spec
  file is named for in its folder, such as the speed a spec of every level
  plays.
- `@fz/phaser/testing`: `provideFakePhaserCanvas()`, a canvas that loads no
  Phaser, with `collectErrors()`, which keeps what a failed scene hands the
  app's `ErrorHandler` for the spec to read, and `FakeResizeObserver`,
  `watchResizes()` and `resize()`, for a board that watches its size;
  `installHeadlessPhaser()`, `runScene()`, `runKeyedScene()` and
  `runShownScene()`, the scene a fake canvas was shown, which run a real
  Phaser scene headless, driven by keys, the mouse by any button
  (`pointer()`'s `PointerOptions`), its wheel (`wheel()`) and a finger the
  browser may take away (`touch("cancel", …)`); `browserKey()`, a key with
  the `keyCode` Phaser reads, for `fireEvent`; and what reads back what a
  scene drew (`objectsIn()`, `imagesIn()`, `commandsOf()`, `strokesOf()`,
  `colorsOf()`); and, from `@fz/phaser/testing/pure`, which loads no
  Phaser, `viewport()`, `frameNamed()` and `drawnIn()` for a spec in Node
  (the `phaser-core` skill).
- `@fz/style/testing`: what a contrast spec needs to hold every palette in
  `THEMES` to WCAG, and a palette spec to color a board as a palette does. `compileStylesheet()` compiles an app's global
  stylesheet as its Vite does, `paletteRoles()` reads each palette's roles
  from the CSS, `paint()` works out the color a role or a tint lays down,
  `rgbOf()` reads a color written as a number, as a canvas game draws it,
  and `contrast()` measures two colors. `stylesheetPalettes()` reads an
  app's palettes, whole (`palette()`), a role at a time (`role()`) or under
  the names the app reads them by (`rolesIn()`), and `paintRoles()` gives
  the page roles in a spec's colors until the test finishes.
