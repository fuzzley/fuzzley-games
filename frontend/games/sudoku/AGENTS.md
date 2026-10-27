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
- **`src/app/`** — the shell, one folder per feature, each holding its
  components and services together, as in Minesweeper. `app.component`
  lays them out, with the `<fz-announcer>` every move is announced through,
  and takes back a move on Ctrl+Z anywhere outside a dialog.
  - `play/` — `GameService` holds the game in play and the square
    selected, runs its clock on `@fz/game-ui/stopwatch`, makes every move
    and says what it did through `@fz/ui/announcer`, gives hints, and asks
    through `@fz/ui/confirm` before a new deal throws a game away.
  - `board/` — the grid of squares.
  - `pad/` — the number pad: a key for each digit with how many are left,
    the tools (Notes, Erase, Undo and Hint), and the hint's words.
  - `settings/` — `SettingsService`, the level and the assists the player
    chose. `stats/` — `StatsService`, the games played and solved and the
    best times.
  - `styles/` — `global.scss`, loaded once from `main.ts`, and
    `_index.scss`, the toolkit every component `@use`s, which emits no CSS.

  A new feature gets a folder of its own, named for what it does, never for
  the kind of code in it.

- **`tools/`** — the scripts run from the workspace:
  `generate-puzzles.mjs`, which fills the bank from seeds 1 upward, keeping
  each puzzle that grades at its level. It writes the same bank every run,
  so regenerate it only after changing the grader or the generator, and
  expect the hard level to take about ten minutes.
- **`src/testing/`** — what specs share: `gridFrom` (`grid_picture.ts`)
  draws a grid as rows of digits, with notes by square, and `solvedBut`
  draws the player's digits that solve `EASY` but for the squares named;
  `playOn` (`game.ts`) puts a grid in play. The app's tsconfig leaves it
  out.

## The Board and the Pad

- **The board is a grid,** Angular Aria's `ngGrid`, with one tab stop, the
  selected square, which the arrow keys, Home and End move. A digit key
  places its digit, Shift with it adds a note, and N turns Notes mode on;
  Backspace, Delete or 0 erases; H shows a hint, and H again or Enter
  fills it in. Digits are read by the key's code, so an AZERTY keyboard's
  top row places them unshifted, and letters by their character. One-key
  shortcuts work only while a square has focus (WCAG 2.1.4). The grid
  listens once for each kind of event and finds the square from the
  target.
- **The squares are shaded by the selected one:** its row, column and box,
  the squares holding its digit, and a hint's square and the squares that
  show why. The view model (`board.component.ts`) picks one shade a square,
  the strongest reason first, and a square with a marked digit, one that
  repeats or, with the assist on, is wrong, is never shaded, so the danger
  color stays on the panel it clears 4.5:1 on.
- **Its colors are the palette's,** but for the player's ink, in
  `src/app/board/_inks.scss`, the one stylesheet stylelint lets write a
  color. `src/app/board/contrast.spec.ts` holds the givens, the player's
  digits and the notes to 4.5:1 on every shade, in every palette, and the
  lines and the selection's outline to 3:1, so a palette that breaks it
  needs the ink or the shades changed with it.
- **The stage decides the layout** by a container query: on a wide stage
  the pad sits beside the board as a block of three by three, and on a tall
  one under it, as a row. `app.component.scss` works out the board's side
  from the stage, each square 32 to 64px across, and the room left for the
  hint's words.
- **A key on the pad pressed with a mouse or a finger hands the focus back
  to the board,** so the player goes on typing; one pressed from the
  keyboard keeps it. Undo and Hint are dimmed with `aria-disabled`, never
  disabled, so the focus never falls off them.

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
