# Work log: Sudoku

The log of [the Sudoku plan](sudoku-plan.md), kept so the work can pause and
resume. Newest entries last. It is deleted when the work is done; git
history keeps it.

## How to resume

- The library lift (S1) is on the branch `library-lift`, cut from `main` at
  `67c4436`, with the plan and this log as its first commit. Sudoku itself
  (S2 on) is on `sudoku`, cut from `library-lift`, so `library-lift` can be
  merged to `main` on its own first (decision 10). Nothing is pushed: a push
  to `main` deploys.
- The user said "Implement the sudoku game planned in a previous session"
  (2026-10-27), which takes the recommendation in every decision: Angular
  alone; a graded bank dealt through the symmetries; four levels, Easy
  first; repeats always marked, the solution checked only as an assist, no
  lives; hints that name the next step, counted, with no best time; notes
  with the N key, Shift and automatic clearing; undo without redo, kept
  across a reload; settings, stats and the game kept; the three lifts and
  three icons; and the lift merged first, Sudoku once, with a fresh
  `added` date.
- S0's mock was not made: the user asked for the game itself, not for a
  mock to approve first. The design is the plan's, and the screenshots
  sent along the way stand in for the mock.
- Each phase ends with `yarn verify` green from `frontend/`, and a commit.
- The status table says where things stand; the entries below it say what
  was found on the way.

## Status

| Phase | What                             | State |
| ----- | -------------------------------- | ----- |
| S0    | The bank spike                   | done  |
| S1    | The library lift                 | done  |
| S2    | Scaffold the workspace           | done  |
| S3    | The rules                        | done  |
| S4    | The solver, the grader, the bank | done  |
| S5    | The new icons                    | done  |
| S6    | The board and the pad            | done  |
| S7    | The bar and the dialogs          | done  |
| S8    | Storage                          | to do |
| S9    | The checks                       | to do |
| S10   | Screenshots and docs             | to do |
| S11   | Ship                             | to do |

## Entries

### 2026-10-27: start

- Branch `library-lift` created from `main` at `67c4436`.
- Baseline `yarn verify` run on the clean branch, its output and both
  games' `dist/` kept in the session's scratchpad (`baseline/`) for S1's
  before-and-after comparison. It passed in 6m09s, slowed by the spike
  running beside it.

### 2026-10-27: S0, the bank spike

- **No throwaway code.** The solver, the grader and the generator were
  written as S3 and S4 will commit them, in the scratchpad, and timed in
  Node through Vite's `runnerImport()`, as the bank script will load them.
- **The grader solves as the plan says,** easiest technique first:
  hidden then naked singles; pointing, claiming, naked and hidden pairs;
  naked and hidden triples and the X-Wing; the Swordfish and the XY-Wing.
  A board it solves has one solution, since each step follows from the
  digits before it, so generating needs no backtracking check.
- **The generator takes givens away only while logic at the level still
  solves what is left,** rather than down to a minimal puzzle that is then
  graded. A minimal random puzzle is rarely Hard or Expert; this way every
  try ends at the level or below it. Each try takes about 20 ms.
- **A floor of givens for the easy levels:** the first run's Easy puzzles
  kept only 28.6 givens on average, which singles alone solve but slowly.
  Easy keeps at least 36 and Medium 30 (`fewest` in `difficulty.ts`);
  Hard and Expert have no floor.
- **100 puzzles a level,** from seeds 1 up, took: Easy 100 tries (1 s,
  36.1 givens on average), Medium 2,700 tries (36 s, 30.1), Hard 15,065
  tries (355 s, 27.7), Expert 2,057 tries (56 s, 28.3). Hard is the
  rarest: a grid whose logic reaches past pairs mostly reaches past
  triples too.
- **The bank ships in the main bundle:** 8,401 bytes raw a level, and
  3,216, 2,941, 2,801 and 2,849 bytes gzipped, 11.5 kB in all, under the
  plan's 20 kB. So dealing is synchronous, as Minesweeper's is, and the
  board never waits on a chunk. With the symmetries, 100 a level is plenty:
  every deal looks different.
- **Hints, tried by solving one puzzle a level by hints alone:** every
  hint was right and every puzzle came out solved, in under 25 ms for all
  of a puzzle's hints. A hint looks for the least work (a single, else one
  elimination that leaves a single, else the easiest elimination and the
  same again), then drops each elimination the rest can do without, which
  took one Hard hint from six steps to three.
- **Not done: listening with NVDA and Narrator,** which a session here
  can't. The board names a square by what it holds and leaves its place to
  Angular Aria's `aria-rowindex` and `aria-colindex`, as Minesweeper's
  does; S9 leaves the listening to the user.

### 2026-10-27: S1, the library lift

- **`@fz/game-ui`:** `GameViewportService.barHome`, the link home the bar
  has room for; `withHomeLink(items, href)` in `bar_overflow/home_link.ts`;
  `formatClock()` in `stopwatch/format_clock.ts`, which writes "2:13", or
  "1:02:13" past an hour. Each has its spec.
- **`@fz/style`:** `toolkit/_dialogs.scss`, forwarded from the toolkit,
  holds `dialog-card($width)`, `close-button`, `field-label` and
  `choice-tile`, Minesweeper's four with its declarations in its order.
  `toolkit.spec.ts` checks what each writes.
- **Minesweeper** binds its bar's `home` to `barHome`, leads its overflow
  menu with `withHomeLink()`, shows its clock and result through
  `formatClock()` (dropping `formatTime()` and its four specs), and lost
  `src/app/styles/_mixins.scss`, every mixin in it now the toolkit's.
  Its clock past an hour reads "1:02:13" where it read "62:13", the one
  visible change.
- **The Solitaire Collection** takes `barHome` and `withHomeLink()` too,
  and the toolkit's `field-label` and `choice-tile` in place of its own
  `field-label` and `swatch-option`, which had the same declarations in
  another order. It keeps its "02:13" clock and its `panel-card`.
- **No pixel changed:** rather than screenshots, the check compared what
  the builds style with. A script in the scratchpad
  (`s1/styles.mjs`) lists every rule of each game's stylesheets and of the
  component styles compiled into its scripts, each rule's declarations
  sorted. Minesweeper's 235 rules and the Solitaire Collection's 402 are
  the baseline's, byte for byte.
- `@fz/style`'s and `@fz/game-ui`'s `AGENTS.md`, the `fuzzley-ui` skill,
  both games' `AGENTS.md` and `solitaire-styles` name the new pieces.
- **`yarn verify` passed** (3m51s) once Prettier had put the new spec's
  quotes right: `@fz/game-ui` 98 tests (84), `@fz/style` 243 (237),
  Minesweeper 351 (355), every other suite as the baseline's.

### 2026-10-27: S2, scaffold the workspace

- Branch `sudoku` cut from `library-lift` at `d49e63e`.
- **`frontend/games/sudoku/`,** copied from Minesweeper: `package.json`
  (`sudoku`, Minesweeper's ranges, without `@angular/forms`), the
  tsconfig solution, `src/test-setup.ts`, `LICENSE`, and configs on
  `@fz/dev`'s presets: `gameConfig({ port: 9002, name: "Sudoku" })`,
  `angularTests()` with the floor on `src/rules/` already in, the ESLint
  blocks with the fence around `src/rules/`, and `@fz/style`'s stylelint
  preset. `README.md`, and an `AGENTS.md` with `CLAUDE.md` beside it, say
  only what exists; both grow with the phases.
- **The script and its tsconfig wait for S4.** `tsconfig.scripts.json`
  and `tools/` come with the bank's script: `tsc` fails on a project with
  no files, and ESLint on a folder that doesn't exist.
- **The page:** `index.html` with Minesweeper's tags, Sudoku's words, and
  the canonical address and link preview at `/play/sudoku/`. `src/main.ts`
  boots a shell of the bar and an `<h1>`, bound to `GameViewportService`,
  `barHome` among it, with one spec.
- `yarn install` added the workspace to the lockfile. It warns that
  `sudoku` doesn't provide `@angular/forms`, which `@angular/cdk` asks
  for, as every workspace but Minesweeper's does.
- **`yarn verify` passed** (4m16s) on the second run. The first failed the
  reference check, which caught `src/rules/` named in `AGENTS.md` before
  it existed. The bare shell builds to 137.5 kB of script, 45.9 kB
  gzipped.

### 2026-10-27: S3, the rules

- **The phases' line moved with the imports.** `puzzle.ts` solves its
  givens, so the solver came into S3; `Level` is `difficulty.ts`'s, which
  names the grader's techniques, so `logic.ts` came too. S4 keeps the
  generator, the bank and its script, `deal.ts`, and `describe.ts` and
  `saved_grid.ts`, which need the grader.
- **In:** `cells.ts`, `digits.ts` (sets of digits as nine bits, which the
  plan put in `grid.ts`), `random.ts` (Mulberry32, with `shuffled()`),
  `json.ts`, `format.ts`, `solver.ts`, `logic.ts`, `difficulty.ts`,
  `puzzle.ts`, `history.ts`, `grid.ts` and `transform.ts`, each with its
  spec, and `src/testing/grid_picture.ts`: `gridFrom` draws a grid as nine
  rows of givens, the player's digits the same way and notes by square
  (`{ r1c3: "148" }`), and refuses givens without one solution, a digit
  over a given or a note under a digit.
- **The grid** keeps every square's digit, the givens' among them, so its
  queries read one list. Placing the digit a square holds takes it away;
  one move is one undo step however many notes it clears; a restart keeps
  the hints counted, since what a hint showed stays shown.
- **The levels are a table:** each technique's easiest level, rather than
  each level's hardest technique, which needed a search with a fallback no
  spec could reach.
- **The floor is the plan's,** 100% of statements, lines and functions and
  95% of branches over `src/rules/`, and the rules meet it at 100, 100, 100
  and 99.6. `noUncheckedIndexedAccess` makes every read of a list a branch
  with a fallback no spec reaches, so the reads go through `at()`,
  `peersOf()` and `unitsOf()` in `cells.ts`, each tested off the board's
  end once. Strings are split with `Array.from`, as typescript-eslint's
  `no-misused-spread` asks.
- **The grader's specs** hold a puzzle from the bank for each technique
  that logic solves with every technique and can't with that one withheld,
  and a puzzle with one solution logic can't finish. A hint's chain is
  pinned on three boards: pointing before a naked single; pointing and an
  XY-Wing before a hidden single; and a board where the easiest
  eliminations lead elsewhere, whose six steps prune to a hidden triple and
  pointing.
- **`yarn verify` passed** (4m13s): Sudoku 168 tests.

### 2026-10-27: S4, the generator and the bank

- **In:** `generate.ts` (`grade()` and `generate(level, seed)`, the
  spike's), `deal.ts`, which deals a bank puzzle through a random face and
  takes the bank as a parameter so a spec can hand it a broken one,
  `describe.ts` and `saved_grid.ts`, each with its spec, and
  `bank.spec.ts`, which holds every banked puzzle to one solution, its
  level's grade and its level's fewest givens.
- **The bank:** `tools/generate-puzzles.mjs` (`yarn generate:puzzles`)
  wrote it from seeds 1 up, in the spike's numbers of tries: Easy 100,
  Medium 2,700, Hard 15,065, Expert 2,057. It took 12m57s, Hard 620 s of
  it, against the spike's 355 s, with the board's work running beside it.
  Each level is 8,703 bytes of JSON, a puzzle a line. `tsconfig.scripts.json`
  and the scripts' ESLint block came with the script, as S2 left them to.
- **The words** are pinned in `describe.spec.ts`. A hint puts "the"
  before its digits ("In box 9, the 1, 4 and 8 can only go in the same
  three squares"), since a bare digit after a box's number read as part of
  it.
- **A saved grid is trusted only as far as it holds up:** `restoreGrid()`
  solves the givens again and refuses a digit over a given, a note under a
  digit, a move on a given and any field of the wrong shape.
- **The rules' coverage:** 100% of statements, functions and lines, and
  97.98% of branches, over the floor's 95. Sudoku 256 tests.

### 2026-10-27: S5, the new icons

- `@fz/ui` draws `pencil`, `eraser` and `bulb`, outlines in the set's
  24-unit grid and 2-unit stroke, so the four tools on the pad (with
  `undo`) read alike. The icon spec draws every name in `ICON_NAMES`, the
  new ones among them. How they look is S9's to check, on the pad.

### 2026-10-27: S6, the board and the pad

- **In:** `GameService` (`play/`), `SettingsService` and `StatsService`,
  the board (`board/`) and the pad (`pad/`), and `app.component` laying
  them out, each with its spec, and `playOn` in `src/testing/game.ts`.
  `solvedBut`, which two of the rules' specs each kept a copy of, moved
  into `grid_picture.ts` for the shell's specs too.
- **The contrast spec changed three of the plan's choices.** With the
  plan's shading (an 18 to 28% tint of the accent or the warning under
  the selection and the hint), Soft pastel's muted notes, its danger color
  and Minesweeper's blue ink all fell under 4.5:1. So the shades are
  lighter (12 to 22%), the player's ink is a deeper blue in a light
  palette and a paler one in a dark one (`#1e40af` and `#bfdbfe`), notes
  are in the text's color, the selected square's digit among them on an
  accent chip, and a square with a marked digit is never shaded, since
  the danger color clears 4.5:1 only on the panel itself.
- **The selection has an outline,** an inset ring of the accent, held to
  3:1 on its shade, so it shows after a click, when the focus ring
  doesn't, and on a hint's square, whose warning tint wins the shade.
- **A hint shows its words on the pad,** under the tools beside the board
  or between the board and the pad under it, where the room left over is
  reserved for them so nothing moves when one appears. They aren't a live
  region; the announcer has said them. While a hint shows, Hint reads
  "Fill in", or "Take out" for a wrong digit.
- **N and H are read by their character,** as Minesweeper reads F, and
  Ctrl+Z too; only the digits go by the key's code.
- **The layout:** the stage is a size container named `stage`;
  `app.component.scss` works out `--side`, the board's, from it, each
  square 32 to 64px across, and `--hint-room`; the pad follows the same
  container's orientation. On a 375 × 812 phone the board is 351px across;
  at 740 × 360, beside the rail, it fills the height with the pad beside
  it. Checked in the browser pane in Casino night and Soft pastel, with
  notes, a repeat, a hint and its fill.
- **Not yet:** the bar is still S2's shell, so its title shows in the
  rail on a phone on its side; S7 brings the bar, the time and the dialogs,
  and the result card that `GameService.resultOpen` waits for.
- **`yarn verify` passed** (4m39s): Sudoku 406 tests.

### 2026-10-27: S7, the bar and the dialogs

- **In:** `<app-bar>`, the settings drawer, the result card and How to
  play, each with its spec, wired into `app.component` as Minesweeper's
  are, the confirmation last so it opens over the drawer.
- **The bar** is Minesweeper's, less the mines, the lives and Flag mode:
  the title and the level's badge, the time, and Restart, New Game, How to
  play and Settings, the last three in the overflow menu on a compact
  screen, led by the link home where `barHome` leaves it no room.
- **The settings:** the levels are radios (`fzRadioGroup`) named with what
  each asks, and choosing one deals after the confirmation; the assists are
  checkboxes, each described by a line under it (`aria-describedby`), in a
  group named "Assists" rather than a fieldset, whose legend wouldn't take
  the drawer's label style.
- **The result card** shows the trophy, "Solved!", the level, and the time,
  the best time (or the hints used, with a line saying why there is no
  best time) and the puzzles solved, with New Game first and Close. It
  opens 1.3 s after the solve, once the board's wave has run, and at once
  where the player prefers less motion or the browser can't say (jsdom).
- **How to play** is the rule, notes, hints, mistakes and the controls,
  mouse and touch in one column, since they are the same here. Its
  stylesheet is Minesweeper's, copied whole; a help card's table is a
  candidate for `@fz/style`'s dialog mixins once a third game wants one.
- Checked in the browser pane: the bar at 800 × 600, a puzzle solved by
  hints, its wave and its card, and the drawer; and at 375 × 812, the
  compact bar, a tap on a square and on 7, which placed it, said "7." and
  gave the square the focus back.
- **`yarn verify` passed** (4m43s) on the second run: the first stopped
  after the lint step without saying why, and passed untouched when run
  again. Sudoku 449 tests; its script is 336 kB, 100.9 kB gzipped, against
  Minesweeper's 104.4.
