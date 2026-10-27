# Sudoku

The `sudoku` workspace: Sudoku, with puzzles from a graded bank and hints
that name the next step of logic. It is an Angular app on the shared
libraries, shaped like Minesweeper. What every game keeps, in
[frontend/games/AGENTS.md](../AGENTS.md), what every workspace keeps, in
[frontend/AGENTS.md](../../AGENTS.md), and the repository's rules, in
[.agents/AGENTS.md](../../../.agents/AGENTS.md), apply here too; this
workspace keeps its own for its code. Paths are relative to
`frontend/games/sudoku/`.

It is being built from `docs/sudoku-plan.md`; this file grows with it.

## Technology Stack

- **UI:** [Angular](https://angular.dev/) (standalone components, signals,
  zoneless change detection) on `@fz/style`, `@fz/ui` and `@fz/game-ui` (the
  `fuzzley-ui` skill)
- **Build Toolchain:** [Vite](https://vitejs.dev/) + [AnalogJS Vite Angular Plugin](https://analogjs.org/)
- **Test Framework:** [Vitest](https://vitest.dev/) with jsdom and Testing
  Library
- **Language:** TypeScript / HTML / Sass

## Layout

- **`src/rules/`** — the rules, with no framework. The board's squares and
  units are `cells.ts`, and sets of digits nine bits (`digits.ts`). A
  `Grid` (`grid.ts`) is a puzzle in play, a value each move replaces: the
  digits, the notes, the moves undo takes back (`history.ts`) and the hints
  used. `solver.ts` is a backtracking solver, which checks uniqueness and
  fills a grid at random; `logic.ts` solves the way a person does, one
  technique at a time, which grades a puzzle (`difficulty.ts` holds the
  levels) and names the next step for a hint. `transform.ts` turns a
  puzzle into another face of itself. `generate.ts` makes a puzzle of a
  level from a seed, and `deal.ts` deals one from the bank in `bank/`,
  through a random face. `describe.ts` puts squares, moves and hints into
  the words a screen reader and the hint say, and `saved_grid.ts` turns a
  grid into what storage keeps and back. ESLint keeps Angular, the
  libraries, RxJS and the shell out of it.
- **`src/rules/bank/`** — the puzzles the game deals, a hundred for each
  level, which `yarn generate:puzzles` writes. A puzzle is its givens, 81
  characters with `.` for a blank. `src/rules/bank.spec.ts` checks every one
  has one solution, grades at its level and keeps the level's fewest givens,
  so a puzzle edited by hand, or a change to the grader, fails it.
- **`src/app/`** — the shell. `app.component` lays out the bar and the
  stage. `styles/` holds `global.scss`, loaded once from `main.ts`, and
  `_index.scss`, the toolkit every component `@use`s.
- **`tools/`** — the scripts run from the workspace:
  `generate-puzzles.mjs`, which fills the bank from seeds 1 upward, keeping
  each puzzle that grades at its level. It writes the same bank every run,
  so regenerate it only after changing the grader or the generator, and
  expect the hard level to take about ten minutes.
- **`src/testing/`** — what specs share: `gridFrom` (`grid_picture.ts`)
  draws a grid as rows of digits, with notes by square. The app's tsconfig
  leaves it out.

## Development Commands

Run these from `frontend/games/sudoku/`, or as `yarn workspace sudoku
<script>` from `frontend/`.

- **Run Development Server:** `yarn dev` (at `http://localhost:9002/`).
- **Production Build:** `yarn build`, into `dist/`; `yarn preview` serves it.
- **Run Unit Tests:** `yarn test`, `yarn test:watch`, or
  `yarn vitest run <path>` for one spec.
- **Linting:** `yarn lint` (ESLint with `@fz/dev`'s blocks, the fence
  around `src/rules/` and the scripts' rules for `tools/`, then stylelint
  with `@fz/style`'s preset).
- **Type Checking:** `yarn typecheck` (the app, the specs, and the scripts
  in `tools/` from their JSDoc, with `tsconfig.scripts.json`).
- **Fill the Bank:** `yarn generate:puzzles` (`--count <n>` for another
  number per level).
