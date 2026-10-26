---
name: minesweeper-testing
description: How Minesweeper runs and writes its specs — its Vitest setup and the coverage floor on its rules, fields drawn as pictures with fieldFrom, games put in play with playOn, and the contrast spec over every palette. Triggers on: minesweeper spec, minesweeper test, fieldFrom, playOn, field picture, minesweeper coverage, contrast spec, frontend/games/minesweeper tests.
---

# Testing Minesweeper

This skill covers how Minesweeper runs its specs and what they share. The
patterns every Angular workspace's specs follow (Testing Library by role,
user-event, jest-dom, zoneless change detection, fake timers, what jsdom
keeps and lacks) are the repository's `angular-testing` skill's, and the
rules every spec follows are in `.agents/AGENTS.md`, under "Writing Unit
Tests". Paths are relative to `frontend/games/minesweeper/`.

## Commands and Coverage

Run these from `frontend/games/minesweeper/`, or as
`yarn workspace minesweeper <script>` from `frontend/`.

- **Run Tests**: `yarn test` (the whole suite once, with coverage) or
  `yarn test:watch`. `yarn vitest run <path>` runs one spec without
  coverage.
- **Coverage Floor**: `vitest.config.ts` holds `src/rules/` to a floor near
  100%, and `yarn test`, which CI runs, fails below it; never let a change
  drop below it.

## Setup

- `vitest.config.ts` is `@fz/dev/vitest`'s `angularTests()`, given the floor
  and what coverage leaves out.
- A spec sits beside the file it tests, named after it.
- `src/test-setup.ts` starts Angular's TestBed, loads jest-dom's matchers,
  polyfills `<dialog>`, and clears `localStorage` before every test.

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
- Find a square by its role and accessible name, such as
  `getByRole("gridcell", { name: "Flagged" })`, and press a finger on it with
  `fireEvent`, which makes the touch's pointer events user-event can't.
- The board's long-press specs install fake timers after `render`.
- The bar and the board ask `GameViewportService` what fits, so their specs
  set the screen with `installFakeViewport()`.

## Contrast

`src/app/board/contrast.spec.ts` checks every palette in `@fz/style`'s
`THEMES` with `@fz/style/testing`'s helpers, holding the numbers and the
marks to 4.5:1 on their squares and the squares' states to 3:1. Only the
numbers' inks it compiles with Sass itself.
