---
name: sudoku-testing
description: How Sudoku runs and writes its specs — its Vitest setup and the coverage floor on its rules, grids drawn as rows of digits with gridFrom and solvedBut, games put in play with playOn, the bank's spec, and the contrast spec over every palette. Triggers on: sudoku spec, sudoku test, gridFrom, solvedBut, playOn, grid picture, sudoku coverage, bank spec, contrast spec, frontend/games/sudoku tests.
---

# Testing Sudoku

This skill covers how Sudoku runs its specs and what they share. The
patterns every Angular workspace's specs follow (Testing Library by role,
user-event, jest-dom, zoneless change detection, fake timers, what jsdom
keeps and lacks) are the repository's `angular-testing` skill's, and the
rules every spec follows are in `.agents/AGENTS.md`, under "Writing Unit
Tests". Paths are relative to `frontend/games/sudoku/`.

## Commands and Coverage

Run these from `frontend/games/sudoku/`, or as
`yarn workspace sudoku <script>` from `frontend/`.

- **Run Tests**: `yarn test` (the whole suite once, with coverage) or
  `yarn test:watch`. `yarn vitest run <path>` runs one spec without
  coverage.
- **Coverage Floor**: `vitest.config.ts` holds `src/rules/` to 100% of
  statements, functions and lines and 95% of branches, and the shell,
  `src/app/`, to 100% of functions and lines, 95% of statements and 85% of
  branches. `yarn test`, which CI runs, fails below either. `noUncheckedIndexedAccess` makes every
  read of a list a branch, so the rules read a square through `at()`,
  `peersOf()` and `unitsOf()` (`src/rules/cells.ts`) rather than with a
  fallback no spec can reach.

## Setup

- `vitest.config.ts` is `@fz/dev/vitest`'s `angularTests()`, given the floor
  and what coverage leaves out.
- A spec sits beside the file it tests, named after it.
- `src/test-setup.ts` starts Angular's TestBed, loads jest-dom's matchers,
  polyfills `<dialog>`, and clears `localStorage` before every test.

## The Rules

- Draw a grid rather than deal one: `gridFrom(givens, picture)`
  (`src/testing/grid_picture.ts`) takes the givens as nine rows of digits,
  `.` for a blank, and the picture adds the player's digits drawn the same
  way, notes by square (`{ r1c3: "148" }`), the level and the hints used.
  It refuses givens without one solution, a digit over a given and a note
  under a digit. `EASY` and `EASY_SOLUTION` are the puzzle most specs play,
  `solvedBut("r1c1")` draws the player's digits that solve it but for the
  squares named, `squareAt("r1c1")` gives a square's index and `rowsOf`
  draws a board back as rows.
- The rules know no framework, so their specs call the functions in
  `src/rules/` directly and assert on what they return. The grader's specs
  hold a puzzle for each technique, one logic solves with every technique
  and can't with that one withheld; `NEEDS` in `logic.spec.ts` is typed so
  that a technique without one doesn't compile. `hint.spec.ts` checks which
  hint a board gives, passing `hintFor()` a chain of its own to reach the
  guard against a step the solution disagrees with.
- `src/rules/bank.spec.ts` holds every puzzle in `src/rules/bank/` to one
  solution, its level's grade and its level's fewest givens, and every step
  logic takes on it, grading or in a playthrough by hints, to that solution
  (`agrees()`), so it fails when the grader changes under the bank;
  `yarn generate:puzzles` writes the bank again.

## The Shell

- Put a game in play with `playOn(options)` (`src/testing/game.ts`), which
  takes the grid `gridFrom` draws (`EASY` unless `givens` says otherwise)
  up through `GameService.resume`, as a saved game would be, and the time
  with it.
- `render()` sets up the TestBed, so a spec that changes a setting first
  stores it, or changes it after rendering.
- Find a square by its role and accessible name, such as
  `getByRole("gridcell", { name: "Blank, notes 1 9" })`, or by its place
  with `squareAt`. Press a key with user-event, or with `fireEvent.keyDown`
  for a key's code and character a layout pairs differently, as AZERTY's
  top row does.
- The bar asks `GameViewportService` what fits, so its specs set the
  screen with `installFakeViewport()`.
- jsdom has no `matchMedia`, so the result card opens at once rather than
  after the board's wave (`WAVE_MS`, in `src/app/board/board_view.ts`).
  Its timing specs install a fake viewport, which allows motion, and fake
  timers after `render`.
- The board's shading and keys are plain functions, `boardView()` and
  `shadeOf()` in `board_view.ts` and `boardKey()` in `board_keys.ts`, with
  table specs beside them; the board's own spec checks them through the DOM
  once each.
- jsdom has no `ResizeObserver` either, so the hint's words always fit their
  room. `src/app/hint/hint.component.spec.ts` stubs one that reports the
  heights it is given, to reach the short form and the sheet.

## Contrast

`src/app/board/contrast.spec.ts` checks every palette in `@fz/style`'s
`THEMES` with `@fz/style/testing`'s helpers. It compiles the board's own
stylesheet, reading each shade and the player's ink from it, and holds the
givens, the player's digits and the notes to 4.5:1 on every shade, a
marked digit on the panel, and the lines and the selection's outline to
3:1.
