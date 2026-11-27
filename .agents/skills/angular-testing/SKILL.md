---
name: angular-testing
description: How a spec is written in any Angular workspace here (the site, a game's shell, @fz/ui, @fz/game-ui, @fz/phaser's canvas) — Testing Library by role, user-event, zoneless change detection, fake timers, what jsdom lacks and what stands in for it, and the libraries' testing helpers. Triggers on: spec, unit test, vitest, TestBed, render, getByRole, jsdom, installFakeViewport, provideMemoryStorage.
---

# Testing Angular code

What every Angular workspace's specs share. The rules every spec follows are
in `.agents/AGENTS.md`, under "Writing Unit Tests", and how to run one spec
and check its types in `frontend/AGENTS.md`, under "Checking". An app's own
testing skill, where it has one (`brick-breaker-testing`), has its
fixtures and floors, and the `phaser-core` skill has a scene's specs. Paths
are relative to the repository's root.

## Setup

- **A workspace's `vitest.config.ts` is `@fz/dev/vitest`'s
  `angularTests()`,** given its floors (`frontend/lib/dev/src/vitest.ts`).
  Every `*.spec.ts` under `src/` runs in jsdom, after the workspace's
  `src/test-setup.ts`, which starts the TestBed, loads jest-dom's matchers
  and stands in for what jsdom lacks. The site builds its projects from the
  same file's pieces, in `frontend/site/vite.config.ts`, and the Solitaire
  Collection keeps a config of its own, with its specs under `test/`.
- **Where the config names `projects`, a spec's folder sets where it runs:**
  in Node, with no page, under a folder the config lists as `pure` or
  `sim`, such as a game's rules and view, and in jsdom (`dom`) anywhere
  else.

## Components

- **Render a component with `render()` from `@testing-library/angular`,**
  passing its `inputs` and `providers`, and find what it shows through
  `screen` by role, label or text:
  `screen.getByRole("button", { name: "New game" })`. Never query by a CSS
  class: a role query also checks what assistive technology is told, and a
  restyle can't break it.
- **Drive it as a person would, with `@testing-library/user-event`:**
  `const user = userEvent.setup()`, then `await user.click(…)` or
  `await user.keyboard("{Escape}")`. `fireEvent` is for what user-event
  can't make, such as a touch's pointer events.
- **Assert with jest-dom's matchers** (`toHaveAttribute`, `toHaveFocus`,
  `toBeInTheDocument`, `toHaveTextContent`).

## Change Detection and Time

- **Change detection is zoneless.** `render` and user-event's actions leave
  the template up to date; an effect in a service runs on `TestBed.tick()`.
- **Install fake timers after `render`:** rendering waits for the app to be
  stable, which it never is while time stands still. A spec that needs them
  on before it renders fakes with `shouldAdvanceTime: true`, or fakes
  `setTimeout` and `clearTimeout` alone (`toFake`).

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
- **No `matchMedia`,** so `GameViewportService` reads a roomy window that
  allows no motion and is no touch screen. `installFakeViewport()`, from
  `@fz/ui/testing`, or `@fz/game-ui/testing` in a game, given a width and a
  height, answers the queries it and `ThemeService` ask, and a board's
  `(resolution)`: a light system, a mouse and motion allowed, until
  `setColorScheme()`, `setCoarsePointer()`, `setReducedMotion()`,
  `setSize()` or `setPixelRatio()` says otherwise. It takes itself off once
  the test finishes, so it goes in the test or a `beforeEach`, never a
  `beforeAll`.
- **No `<dialog>` methods:** `installDialogPolyfill(window)`, from
  `@fz/ui/testing`, in the setup file.
- **No canvas:** a shell around `<fz-phaser-canvas>` takes
  `provideFakePhaserCanvas()`, from `@fz/phaser/testing`, which loads no
  Phaser.
- **No `ResizeObserver`:** a board that watches its size is specced inside
  a describe that calls `watchResizes()`, and `resize()` lays it out at a
  size and tells it, both from `@fz/phaser/testing`.
- **No fonts to load:** a game whose board waits for its fonts gives the
  page a `document.fonts` in its setup file, as
  `frontend/games/asteroid-breaker/src/test-setup.ts` does.
- **No layout and no component styles:** every element measures 0 by 0,
  and the test build leaves a component's stylesheet out. A spec asserts on
  a state, such as `data-state`, never on what a stylesheet shows or hides
  or on where something lands, which is a game's `check:layout`'s to hold.
- **An accessible name's inline parts run together** where a browser puts a
  space ("Hard16 × 30" where Chrome reads "Hard 16 × 30"), so match such a
  name with `\s*`.
- **jsdom's `URL` isn't Node's,** and `fileURLToPath` refuses it, so a spec
  that reads a file builds its path with `import.meta.dirname` and
  `node:path`.

## The Libraries' Helpers

Each library's `testing` entry holds what specs need of it. Beside those
above:

- **`@fz/ui/testing`:** `setPageVisibility()` hides the page or shows it
  again, as switching tabs does, until the test finishes. `figure()`,
  `figureValue()` and `figures()` read a bar's or a card's figures by their
  terms, and throw when a term is missing. `heldLoad()` holds a load
  `onDemand()` takes until the spec lets it `arrive()`, or `fail()` with
  `OFFLINE`, as a slow or a lost connection would. `loadsSettled()` waits
  for a fixture or the app to settle, for a load no pending task holds,
  such as the files a debug menu loads once it is there, and for it to
  settle again.
- **`@fz/game-ui/testing`:** `barChoice()`, `chooseInBar()` and
  `openBarMenu()` drive the bar's choice and overflow menus as a player
  does.
- **`@fz/core/testing`:** `playUntil()` and `playFor()` play any game with
  a `tick(ms, steer)` a frame (`FRAME_MS`) at a time, in a spec in Node too.
  `variantOfSpec()` gives the variant a spec file is named for in its
  folder, such as the speed a spec of every level plays. `SIM_TIMEOUT_MS`
  is how long a slow `sim` test or `pure` search may take, and
  `sortedTimes()`, `quantile()` and `described()` read a benchmark's times
  at their median and 99th percentile.
- **`@fz/phaser/testing`:** the fake canvas's scenes and `collectErrors()`,
  the harness that runs a real scene headless, and
  `@fz/phaser/testing/pure` for a spec in Node are the `phaser-core`
  skill's, under "Testing".
- **`@fz/style/testing`:** what a contrast spec needs to hold every palette
  to WCAG, and a palette spec to color a board as a palette does.
  `stylesheetPalettes()` reads an app's palettes from its global
  stylesheet, which `compileStylesheet()` compiles as its Vite does and
  `paletteRoles()` reads palette by palette. `paint()` works out the color
  a role or a tint lays down, `rgbOf()` reads a color written as a number,
  as a canvas game draws it, `contrast()` measures two colors, and
  `deltaE()` tells apart two of one luminance, which `contrast()` can't.
  `paintRoles()` gives the page roles in a spec's colors until the test
  finishes.
