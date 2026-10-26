---
name: vitest-testing
description: Minesweeper's Vitest setup (jsdom, globals, specs beside their files, the coverage floor on the rules) and its patterns (fields drawn as pictures with fieldFrom, games put in play with playOn, Testing Library by role, the fake viewport, fake timers, the contrast spec). Triggers on: vitest, unit test, spec, TestBed, Testing Library, coverage, test structure.
---

# Testing Minesweeper with Vitest

This skill covers how Minesweeper runs and writes its specs, with Vitest (v5)
through the AnalogJS Vite plugin. The rules every spec in the repository
follows (Arrange-Act-Assert, the public API, state over interactions, real
objects over mocks) are in `.agents/AGENTS.md`, under "Writing Unit Tests".
Paths are relative to `frontend/games/minesweeper/`.

## Commands and Coverage

Run these from `frontend/games/minesweeper/`, or as
`yarn workspace minesweeper <script>` from `frontend/`.

- **Run Tests**: `yarn test` (the whole suite once, with coverage) or
  `yarn test:watch`. `yarn vitest run <path>` runs one spec without
  coverage.
- **Coverage Floor**: `vitest.config.ts` holds `src/rules/` to a floor near
  100%, and `yarn test`, which CI runs, fails below it; never let a change
  drop below it.
- **Type-check the specs**: `yarn typecheck`. Vitest strips types without
  checking them.

## Setup

- A spec sits beside the file it tests, named after it.
- Every spec runs in jsdom. `src/test-setup.ts` starts Angular's TestBed,
  loads jest-dom's matchers, polyfills `<dialog>` with `@fz/ui/testing`'s
  `installDialogPolyfill`, and clears `localStorage` before every test.
- Specs use Vitest's globals (`describe`, `it`, `expect`, `vi`). They are
  not optional: TestBed and Testing Library register their teardown on the
  global `afterEach`.

## The Rules

- Draw a field rather than deal one: `fieldFrom` (`src/testing/field_picture.ts`)
  takes rows of letters, `.` hidden, `*` a hidden mine, `f` and `F` flags
  without and with a mine, `_` blank, `1` to `8` numbers and `x` a mine
  stepped on, and refuses a number that isn't the count around it. Its
  options set the lives and the outcome where the picture doesn't.
- The rules know no framework, so their specs call the functions in
  `src/rules/` directly and assert on the field they return.

## The Shell

- Put a game in play with `playOn(picture, options)` (`src/testing/game.ts`),
  which takes it up through `GameService.resume` as a saved game would be.
- Render a component with `render()` from `@testing-library/angular` and
  find what it shows through `screen` by role and accessible name, such as a
  square by `getByRole("gridcell", { name: "Flagged" })`. Never query by a
  CSS class. Drive it with `userEvent.setup()`, or `fireEvent` for pointer
  events user-event can't make, such as a touch's.
- Change detection is zoneless: `render` and user-event leave the template up
  to date, and an effect in a service runs on `TestBed.tick()`.
- A service reads what is stored when it is made, so write `localStorage`
  before the first `render` or `TestBed.inject`.
- jsdom has no `matchMedia`: `installFakeViewport(width, height)`
  (`src/testing/fake_viewport.ts`) answers the queries `ViewportService`
  asks, and its `restore()` belongs in an `afterEach`.
- Install fake timers after `render`, as the board's long-press specs do:
  rendering waits for the app to be stable, which it never is while time
  stands still.
- jsdom runs an accessible name's inline parts together where a browser puts
  a space ("Hard16 × 30" where Chrome reads "Hard 16 × 30"), so match such a
  name with `\s*`.

## Contrast

`src/app/board/contrast.spec.ts` checks every palette in `@fz/style`'s
`THEMES`. It compiles the global stylesheet with `@fz/style/testing`'s
`compileStylesheet()`, reads the palettes with `paletteRoles()`, and
measures with `paint()` and `contrast()`; only the numbers' inks it
compiles with Sass itself. It builds paths with `import.meta.dirname` and
`node:path`, because jsdom's `URL` isn't Node's and `fileURLToPath`
refuses it.
