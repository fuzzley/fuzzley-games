# Sudoku

The `sudoku` workspace: Sudoku, with puzzles from a graded bank and hints
that name the next step of logic. It is an Angular app on the shared
libraries, shaped like Minesweeper. What every game keeps, in
[frontend/games/AGENTS.md](../AGENTS.md), what every workspace keeps, in
[frontend/AGENTS.md](../../AGENTS.md), and the repository's rules, in
[.agents/AGENTS.md](../../../.agents/AGENTS.md), apply here too; this
workspace keeps its own for its code. Paths are relative to
`frontend/games/sudoku/`.

## Technology Stack

- **UI:** [Angular](https://angular.dev/) (standalone components, signals,
  zoneless change detection) on `@fz/style`, `@fz/ui` and `@fz/game-ui` (the
  `fuzzley-ui` skill), with `@fz/core`'s helpers in the rules
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
  levels) and names the next step for a hint. `hint.ts` picks the hint for
  a board: a wrong digit, then notes that leave out their square's digit,
  then logic's next step, checked against the solution. `transform.ts` turns a
  puzzle into another face of itself. `generate.ts` makes a puzzle of a
  level from a seed, and `deal.ts` deals one from the bank in `bank/`,
  through a random face. `describe.ts` puts squares, moves and hints into
  the words a screen reader and the hint say, and `saved_grid.ts` turns a
  grid into what storage keeps and back. ESLint keeps Angular, the
  libraries but `@fz/core`, RxJS and the shell out of it.
- **`src/rules/bank/`** — the puzzles the game deals, a hundred for each
  level, which `yarn generate:puzzles` writes. A puzzle is its givens, 81
  characters with `.` for a blank. `src/rules/bank.spec.ts` checks every one
  has one solution, grades at its level and keeps the level's fewest givens,
  and that every step logic takes on it, grading or hinting, agrees with the
  solution (`agrees()`), so a puzzle edited by hand, or a change to the
  grader, fails it.
- **`src/app/`** — the shell, one folder per feature, each holding its
  components and services together, as in Minesweeper. `app.component`
  lays them out, with the `<fz-announcer>` every move is announced through,
  and takes back a move on Ctrl+Z anywhere outside a dialog.
  - `play/` — `GameService` holds the game in play and the square
    selected, runs its clock on `@fz/game-ui/stopwatch`, makes every move
    and says what it did through `@fz/ui/announcer`, gives hints, and asks
    through `@fz/ui/confirm` before a new deal throws a game away;
    `SavedGameService`, which `main.ts` starts before the board shows,
    keeps the game in progress and takes it up after a reload.
  - `board/` — the grid of squares. Its view model, each square's digit,
    notes, shade and label, is `boardView()` in `board_view.ts`, and the
    key map is `boardKey()` in `board_keys.ts`, plain functions the
    component calls.
  - `pad/` — the number pad: a key for each digit with how many are left,
    the tools (Notes, Erase, Undo and Hint), and room for the hint's words.
  - `hint/` — the hint's words in that room: all of them where they fit,
    else the title and what to do with "Why?", which opens the rest in a
    sheet over the pad, as it opens by itself where not even that fits. It
    measures both forms in hidden copies, and the sheet's clear backdrop
    leaves the board, shaded by the hint, in sight.
  - `bar/` — `BarComponent` fills the libraries' `<fz-game-bar>` with the
    level, the time and the actions, and moves them into
    `<fz-bar-overflow>` on a compact screen.
  - `settings/` — the settings drawer (the level, the assists and the
    palette) and `SettingsService`, which keeps what the player chose.
  - `stats/` — `StatsService`, the games played and solved and the best
    times.
  - `result/` — the card over a solved puzzle, which opens once the
    board's wave has run. `help/` — How to play.
  - `styles/` — `global.scss`, loaded once from `main.ts`, and
    `_index.scss`, the toolkit every component `@use`s, which emits no CSS.

  A new feature gets a folder of its own, named for what it does, never for
  the kind of code in it.

- **`src/testing/`** — what specs share: `gridFrom` (`grid_picture.ts`)
  draws a grid as rows of digits, with notes by square, and `solvedBut`
  draws the player's digits that solve `EASY` but for the squares named;
  `playOn` (`game.ts`) puts a grid in play. The app's tsconfig leaves it
  out.
- **`tools/`** — the scripts run from the workspace. `check-layout.mjs`
  checks the build's layout in headless Chrome.
  `generate-puzzles.mjs` fills the bank from seeds 1 upward, keeping each
  puzzle that grades at its level, trying seeds side by side in worker
  threads. It writes the same bank every run, so regenerate it only after
  changing the grader or the generator; on eight workers it takes about a
  minute and a half, most of it the hard level's.
  `capture-screenshots.mjs` makes the screenshots the site shows.

## Adding a Technique

A technique, such as a Skyscraper or an XYZ-Wing, touches these places,
and the compiler asks for most of them:

1. `TECHNIQUES` in `src/rules/logic.ts`, in its place by difficulty, and
   its search in `FINDERS` beside it, a generator of the steps it finds.
2. `TECHNIQUE_LEVELS` in `src/rules/difficulty.ts`, and the level's `asks`
   in `LEVEL_INFO` if its words should name it.
3. `TECHNIQUE_NAMES` and `eliminationWords()` in `src/rules/describe.ts`,
   the hint's title and sentence, with a spec of the words.
4. A puzzle in `NEEDS` in `src/rules/logic.spec.ts` that logic solves with
   the technique and can't without it.
5. `yarn test`. The bank's spec checks every step the new technique takes on
   the bank against the solution, and fails where the grader now grades a
   puzzle at another level; then `yarn generate:puzzles` writes the bank
   again, and the help's words on the levels may need it too.

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
  the squares holding its digit, and a hint's square, the squares its words
  name, and, lighter, the rest of the unit the square is the one place left
  in (`shownBy()` in `src/rules/logic.ts`). The view model (`board_view.ts`)
  picks one shade a square, the strongest reason first, and a square with a
  marked digit, one that repeats or, with the assist on, is wrong, is never
  shaded, so the danger color stays on the panel it clears 4.5:1 on.
- **Its colors are the palette's,** but for the player's ink, in
  `src/app/board/_inks.scss`, the one stylesheet stylelint lets write a
  color. `src/app/board/contrast.spec.ts` holds the givens, the player's
  digits and the notes to 4.5:1 on every shade, in every palette, and the
  lines and the selection's outline to 3:1, so a palette that breaks it
  needs the ink or the shades changed with it.
- **The stage decides the layout** by a container query: on a wide stage
  the pad sits beside the board as a block of three by three, and on a tall
  one under it, as a row. `app.component.scss` works out the board's side
  from the stage, each square 32 to 80px across, the keys growing with it on
  a large stage, and the room left for the hint's words.
- **A key on the pad pressed with a mouse or a finger hands the focus back
  to the board,** so the player goes on typing; one pressed from the
  keyboard keeps it. Undo and Hint are dimmed with `aria-disabled`, never
  disabled, so the focus never falls off them.

## Styling

Every component stylesheet opens with `@use "../styles" as *;`, which
brings in `@fz/style`'s mixins and `@fz/game-ui`'s breakpoints, and nothing
else. The frontend's Angular and Sass rules apply; on top of them:

- **Only the player's ink is a color,** in `src/app/board/_inks.scss`, the
  one stylesheet stylelint lets write one.
- **The sizes come from the stage,** a size container named `stage`: the
  board's side and the pad's layout follow its size and orientation, not
  the viewport's.
- **The bar reads `@fz/game-ui/viewport`'s `GameViewportService`,** which
  applies the games' compact test in code and says where the bar stands
  and what fits in it.
- **The pencil, the eraser and the bulb** were added to `@fz/ui`'s icons for
  the pad. The dialogs' cards, close buttons, headings and choice tiles are
  `@fz/style`'s mixins, which every game's dialogs share.

## What It Keeps

Each entry is in `localStorage`, versioned
(`LocalStorageService.writeVersioned()`), and its reader drops what it
can't trust rather than failing:

- `sudoku-settings`: the level and the assists.
- `sudoku-stats`: each level's games played and solved, and its best time
  without hints. A restart is the same game, and a puzzle played again
  after it was solved isn't counted.
- `sudoku-game`: the game under way, its time, whether it is such a
  replay, and the grid as `saved_grid.ts` writes it, history and hints
  included, so undo outlives a reload. It is written once a move and again as the page goes out of
  sight, and forgotten once the puzzle is solved. `restoreGrid()` solves
  the givens again, so an edited entry can't hand the game a wrong
  solution.

## In This Repository

What every game keeps is in `frontend/games/AGENTS.md`. Here:

- **The site serves it at `/play/sudoku/`,** and its `game.json` names it
  Sudoku, as the site's catalog must.
- **Its screenshots** are in `public/docs/screenshots/sudoku/`, and
  `yarn capture:screenshots` makes them again.
- **The browser's toolbar takes the page's color** (`THEME_COLOR_ROLE` in
  `src/main.ts`), and the settings offer the palette.
- **Accessibility.** The rules are the repository's `web-game-accessibility`
  skill's. Every overlay is an `<fz-dialog>`, the board is the grid above,
  every move is announced, and so is a move that does nothing, with why
  (`describeRefusal()`), and what Undo brought back (`describeUndo()`), and
  the pad gives touch every key.

## Development Commands

Run these from `frontend/games/sudoku/`, or as `yarn workspace sudoku
<script>` from `frontend/`. The root's `yarn lint`, `yarn typecheck`,
`yarn test` and `yarn build` run this workspace's with the others'.

- **Run Development Server:** `yarn dev` (at `http://localhost:9002/`; the
  Solitaire Collection's uses 9000 and Minesweeper's 9001). The site's dev
  server serves the build `yarn start` made when it started; `yarn dev:all`,
  from `frontend/`, serves this dev server there instead.
- **Production Build:** `yarn build`, into `dist/`; `yarn preview` serves it.
- **Run Unit Tests:** `yarn test` (the whole suite once, with coverage,
  failing below the floor `vitest.config.ts` sets for `src/rules/`),
  `yarn test:watch`, or `yarn vitest run <path>` for one spec, which leaves
  the floor alone.
- **Linting:** `yarn lint` (ESLint with `@fz/dev`'s blocks, the fence
  around `src/rules/` and the scripts' rules for `tools/`, then stylelint
  with `@fz/style`'s preset).
- **Type Checking:** `yarn typecheck` (the app, the specs, and the scripts
  in `tools/` from their JSDoc, with `tsconfig.scripts.json`).
- **Check the Layout:** `yarn check:layout` (runs
  `tools/check-layout.mjs` on the build `yarn build` made: in headless
  Chrome, at a roomy window, an upright phone and one on its side, the page
  reports no error and doesn't scroll, the board is square with 81 squares
  of one size, and the board and the pad lie in the window).
- **Fill the Bank:** `yarn generate:puzzles` (`--workers <n>` to run more
  or fewer threads than the default 8, `--count <n>` for another
  number per level).
- **Capture Screenshots:** `yarn capture:screenshots` (runs
  `tools/capture-screenshots.mjs` against the running dev server in headless
  Chrome, through `@fz/dev/chrome`: a Medium deal from a fixed seed, a
  third of it filled by hints, with notes in a few squares and a square
  selected, at 1280 × 720 and 2× on Midnight blue, written to
  `public/docs/screenshots/sudoku/` as the site's `preview.webp`
  (2560 × 1440) and `thumb.webp` (576 × 324, the board and the pad) by
  `@fz/dev/screenshots`; `--url` names another server, and
  `--chrome <path>` or `CHROME_PATH` picks the browser).

## Tests

The repository's rules for specs apply. A spec sits beside the file it
tests, named after it. This workspace's `sudoku-testing` skill, in
`.agents/skills/`, covers its setup and fixtures, and the repository's
`angular-testing` the patterns every Angular workspace's specs share. The
rules' specs draw their grids with `gridFrom`, and the shell's play on one
with `playOn`, rather than dealing at random.
