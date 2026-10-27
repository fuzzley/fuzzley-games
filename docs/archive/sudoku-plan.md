# Plan: Sudoku, an Angular game on the shared libraries

Proposed 2026-10-27, and built the same day: the user said "Implement the
sudoku game planned in a previous session", asking for a detailed work log
and regular commits, which took the first option, the recommendation, in
each of the decisions at the end, and skipped S0's mock, since the user
asked for the game itself. S1 was built on the branch `library-lift`, cut
from `main`, and S2 to S10 on `sudoku`, cut from it, each phase its own
commit with `yarn verify` green; the "As built" notes under each phase say
what came of it. The work log, deleted at S10, is in git's history as
`docs/sudoku-worklog.md`. The plan and its notes describe the code as it
was, so check a path against the tree before following one.

This plan builds Sudoku as the third game hosted on fuzzley.games. It is an
Angular app on the shared libraries, shaped like Minesweeper: the rules are
written in TypeScript with no framework, and the shell around them is
standalone components holding the game in signals. The site already lists
Sudoku as a Classic still to come. When the plan is done, that entry links to
a game that is live at `/play/sudoku/`.

## Where things start

- **The site** lists Sudoku in Classics with no `play` entry
  (`frontend/site/src/app/provider/games.ts`, added 2026-10-11): "Fill the
  grid so every row, column and box has 1 to 9." Its picture is
  `frontend/site/public/thumbnails/sudoku.svg`, the kind of drawing a game
  still to come shows.
- **Two games are built here.** The Solitaire Collection draws its table with
  Phaser 4 inside an Angular shell. Minesweeper is Angular alone on the
  libraries: its rules live in `src/rules/` behind an ESLint fence, and its
  shell lives in `src/app/`, one folder per feature.
  `frontend/games/AGENTS.md` names Minesweeper as the game to copy.
- **The libraries** supply everything around a board. `@fz/style` gives the
  palettes, tokens, fragments and mixins. `@fz/ui` gives the dialog,
  confirmation, announcer, theme picker, icons, radio group and storage.
  `@fz/game-ui` gives the bar, its overflow menu, the viewport, the
  breakpoints and the stopwatch. `@fz/dev` gives the Vite, Vitest, ESLint
  and tsconfig presets and the screenshot helpers.
- **Weights, measured from the builds now in the tree.** Minesweeper's whole
  script is 356 kB, or 103 kB gzipped; that covers Angular, the libraries and
  the game. Its styles are 3 kB gzipped. The Solitaire Collection's Phaser
  chunk alone is 1,367 kB, or 354 kB gzipped, and its own code adds another
  192 kB gzipped.
- **Code the games already copy from each other.** A third game would make
  each of these three copies:
  - which link home the bar has room for, and an overflow menu that starts
    with that link when the bar has none. The same `home` computation appears
    in Minesweeper's `src/app/bar/bar.component.ts` and in the Solitaire
    Collection's `src/ui/app/component/header_bar/header_bar.component.ts`;
  - the settings' heading and choice tiles. Minesweeper's `field-label` and
    `choice-option` (in `src/app/styles/_mixins.scss`) copy the Solitaire
    Collection's `field-label` and `swatch-option`. The same file also holds
    Minesweeper's dialog `card` and `close-button`;
  - the clock's text: Minesweeper's `formatTime()` writes "2:13" and the
    Solitaire Collection's `formatElapsed()` writes "02:13";
  - Mulberry32, in Minesweeper's `src/rules/random.ts` and the Solitaire
    Collection's `src/engine/core/random/seeded_random.ts`, and Minesweeper's
    JSON guards in `src/rules/json.ts`.
- **Ports.** 9000 is the Solitaire Collection's and 9001 is Minesweeper's, so
  Sudoku's dev server takes 9002.
- **CI needs nothing new.** The root's scripts run every workspace under
  `games/*`. Dependabot watches `frontend/` as a whole. `check-image.sh`
  checks every slug in `games.json`. The `Dockerfile` copies all of
  `frontend/`.

## Phaser or Angular

The recommendation is Angular alone, as the user leans (decision 1). A
Sudoku board is 81 squares. Each one changes when the player taps it or
presses a key, and nothing on the board moves on its own.

|                             | Angular: the board in the DOM                                                                        | Phaser: the board on a canvas                                                                                                      |
| --------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| What moves                  | Nothing needs to. A digit appears and a square shades, and a CSS transition covers the rest          | A scene graph, tweens and sprite batching, none of which Sudoku uses                                                               |
| Screen readers and keyboard | Angular Aria's grid, as on Minesweeper's board: one tab stop, the arrow keys, and every square named | A canvas is opaque. Each square would need a hidden DOM twin before a screen reader could reach it: a second board to keep in step |
| Digits                      | Text, sharp at any zoom or pixel density, which grows with the browser's text size                   | Text drawn into textures sized for the screen's density. The Solitaire Collection's `docs/card-sharpness.md` records that work     |
| The palette                 | Tokens read with `var()`, which change with the palette and need no code                             | Each color read through `ThemeService.role()`, with the board redrawn whenever it changes                                          |
| Weight                      | About Minesweeper's 103 kB gzipped                                                                   | The same 103 kB plus Phaser's 354 kB gzipped                                                                                       |
| Specs                       | Testing Library in jsdom, by role and name, as Minesweeper's specs do                                | jsdom can't draw a canvas, so Phaser has to be mocked (`test/support/phaser_mocks.ts`)                                             |
| Layout                      | A CSS grid sized in container query units, as Minesweeper's board is                                 | Layout math and a resize handler written for the game                                                                              |
| What it reuses              | Minesweeper's whole shape, and every library piece                                                   | The libraries, for the shell only                                                                                                  |

Phaser earns its place in the Solitaire Collection, where cards are dragged,
fanned and flown across a table. On a Sudoku board, the most Phaser could add
is a flourish when the puzzle is solved. CSS can do that as well, and can
leave it out for a player who prefers reduced motion.

## The approach

- **Minesweeper's shape.** `src/rules/` holds the rules with no framework,
  and ESLint keeps Angular, the libraries and the shell out of it. `src/app/`
  holds the shell, one folder per feature. `src/testing/` holds the specs'
  pictures and helpers, and `tools/` holds the scripts.
- **Puzzles come from a graded bank** (decision 2). A script generates the
  bank, a logic solver grades it, and the bank is committed. Each puzzle is
  dealt through Sudoku's symmetries, which turn every stored puzzle into a
  vast number of different-looking puzzles of the same level.
- **Logic, never guessing.** Every puzzle dealt can be solved by the
  techniques the grader knows. That is how a hint can always name the next
  step.
- **Lift into the libraries before building on them** (decision 9). Code the
  games already copy is moved into the libraries before Sudoku is built, so
  Sudoku never becomes the third copy.

## The puzzles

### Generating and grading

- A puzzle is 81 squares, some given and the rest blank, with exactly one
  solution. It is written in the usual way: 81 characters, row by row, with
  `.` for a blank.
- `src/rules/solver.ts` is a backtracking solver over bitmasks that tries
  the square with the fewest candidates first. `solve()` returns the
  solution. `countSolutions(givens, 2)` stops once it finds two, which is how
  uniqueness is checked. Each puzzle takes a millisecond or so.
- `src/rules/logic.ts` is the grader. It solves the way a person does, one
  technique at a time, trying the easiest first, and records each step:
  - naked and hidden singles;
  - locked candidates (pointing and claiming), and naked and hidden pairs;
  - naked and hidden triples, and the X-Wing;
  - the Swordfish and the XY-Wing.

  A puzzle's level is the hardest technique its solution needs. A puzzle the
  grader can't finish is never dealt.

- `src/rules/generate.ts` fills a grid at random from a seed. It then removes
  givens in pairs that mirror each other through the center, as long as the
  puzzle still has one solution, and grades the result. It keeps the puzzle
  if it lands at the level wanted.
- `tools/generate-puzzles.mjs` (`yarn generate:puzzles`) loads
  `generate.ts` through Vite's `runnerImport()`, the same way
  `@fz/dev/game-manifest` loads a collection's catalog. It writes about 200
  puzzles per level to `src/rules/bank/<level>.json`, as 81-character
  strings. It starts from a fixed seed, so running it twice writes the same
  bank. The bank is committed like the screenshots are, and the script is
  run again only to change it.
- `src/rules/bank.spec.ts` uses the solver to check that every puzzle in the
  bank has one solution, and the grader to check that it sits at its level.
  A bug in either one can't ship a bad puzzle without a failing spec.

### Dealing

- `src/rules/transform.ts` applies Sudoku's symmetries: relabeling the
  digits, shuffling the three bands and the rows inside each band, shuffling
  the three stacks and the columns inside each stack, and transposing. Each
  symmetry keeps a puzzle's single solution and its level. Combined, they
  turn one puzzle into as many as 1.2 trillion that look different.
- A deal is a level and a seed. The seed picks a puzzle from the bank and a
  transform to apply, and the same seed always deals the same puzzle. That
  lets specs and screenshots use fixed puzzles. It also means a daily puzzle
  or a shared puzzle link would need only a seed (neither is in this plan).
- **How the banks load:** if all four come to under 20 kB gzipped, they go
  in the main bundle. Otherwise each level becomes its own chunk, fetched
  with `import()` the first time that level is dealt. S0 measures which
  case applies. A saved game carries its own givens, so taking one up never
  needs the bank.

## The rules

These live in `src/rules/`, with a spec beside each file:

- `cells.ts`: the squares, numbered 0 to 80 row by row; the row, column and
  box of each square; the 27 units (9 rows, 9 columns, 9 boxes); and each
  square's 20 peers. All of these are computed once.
- `puzzle.ts`: `Puzzle`, which holds the givens, the solution and the level,
  and is read from and written as 81 characters.
- `grid.ts`: `Grid`, a puzzle in play. Like Minesweeper's `Field`, it is a
  value that each move replaces, so the shell can hold it in a signal. It
  holds each square's digit, each square's notes (a set of nine bits), the
  undo history, the number of hints used, and the outcome (`playing` or
  `solved`).
  - The moves are `place`, `erase`, `toggleNote`, `undo` and `restart`. The
    queries are `conflicts()` (squares whose digit repeats in a unit),
    `wrong()` (squares that disagree with the solution) and
    `remaining(digit)`.
  - Placing a digit on a given does nothing. Placing the digit a square
    already holds takes it away. Placing a digit clears that square's notes
    and, when that assist is on, removes the digit from its peers' notes.
  - One move is one undo step, however many squares it changes.
  - The puzzle is solved when every square holds the solution's digit. A full
    grid with a mistake in it is not solved, and the game says so.
- `history.ts`: the moves that undo takes back. Each one records the squares
  it changed, before and after, so a move undoes all at once and the history
  can be stored as JSON.
- `solver.ts`, `logic.ts`, `generate.ts` and `transform.ts`, as described
  above. `deal.ts` picks a puzzle by level and seed.
- `difficulty.ts`: the levels, their names, and the techniques each one
  allows.
- `describe.ts`: what a square shows and what a screen reader calls it; what
  a move did; and the words a hint uses.
- `saved_grid.ts`: a grid as JSON, and the checks that make a restored grid
  trustworthy.
- `random.ts`, `json.ts` and `format.ts` (`count()`) are copied from
  Minesweeper. The fence keeps the libraries out of the rules, and these
  files total about 30 lines.

The specs draw a grid as a picture, the way Minesweeper's draw a field. A
grid is two pictures of nine rows each: the givens (`"53..7...."`) and the
player's digits, with notes as a map (`{ r1c3: "148" }`). The helper refuses
givens that don't have exactly one solution, just as `fieldFrom` refuses a
number that doesn't match its count. The coverage floor on `src/rules/` is
near 100%, as Minesweeper's is.

## What it takes from the libraries

| Need                                   | Piece                                                                                                                                                                      |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The build, the palette before paint    | `gameConfig({ port: 9002, name: "Sudoku" })` from `@fz/dev/vite`, which adds `fuzzleyStyle()`; `theme.js` and the icons first in `index.html`                              |
| Tokens, Figtree, reset, fragments      | `@use "@fz/style/global"` in `src/app/styles/global.scss`                                                                                                                  |
| Colors                                 | Palette roles and tints: `--fz-text` for givens, `--fz-muted` for notes, `--fz-wash-*` for shading, `--fz-accent-wash` for the selected square, `--fz-danger` for a repeat |
| Surfaces                               | `--fz-panel` for the board, `--fz-float` for the dialogs' cards, `--fz-bar-glass` through the bar                                                                          |
| Buttons, badges, hidden text           | `.fz-button` with its tones and shapes; `.fz-badge` for the level; `.fz-visually-hidden`                                                                                   |
| Mixins                                 | `fz.tap-target`, `fz.transition()`, `fz.flex-center`, plus the dialog mixins lifted in S1                                                                                  |
| The palette in code, the toolbar color | `ThemeService`, with `THEME_COLOR_ROLE` set to `page`, as in Minesweeper                                                                                                   |
| Choosing a palette                     | `<fz-theme-picker>` in the settings                                                                                                                                        |
| Dialogs, the question before a loss    | `<fz-dialog>`; `ConfirmService.ask()` with one `<fz-confirm-dialog>`                                                                                                       |
| What a move did                        | `AnnouncerService.say()` with one `<fz-announcer>` in the root template                                                                                                    |
| Icons                                  | Existing: `restart`, `plus`, `settings`, `help`, `more`, `home`, `time`, `trophy`, `close`, `undo`, `tick`. New, in S5: `pencil` (notes), `eraser` and `bulb` (hint)       |
| The level, which deals a new game      | `[fzRadioGroup]`, whose arrow keys move without choosing                                                                                                                   |
| Storage                                | `LocalStorageService` with `writeVersioned()`; `BROWSER_STORAGE` for the specs                                                                                             |
| The bar                                | `<fz-game-bar>`, `<fz-bar-overflow>`, `game-ui.bar-size()`, and the link home lifted in S1                                                                                 |
| The game's shape                       | `GameViewportService`; `@fz/game-ui`'s `compact`, `phone-portrait` and `phone-landscape` mixins; `installFakeViewport()` in the specs                                      |
| The clock                              | `StopwatchService`, and `formatClock()` lifted in S1                                                                                                                       |
| The board by keyboard                  | Angular Aria's `ngGrid`, `ngGridRow` and `ngGridCell`                                                                                                                      |
| Checks                                 | `@fz/dev`'s ESLint blocks, `tsconfig/angular.json` and `angularTests()`; `@fz/style/stylelint`; `installDialogPolyfill`; `@fz/style/testing` for the contrast spec         |
| Screenshots                            | `@fz/dev/chrome` and `@fz/dev/screenshots`' `writeSiteImages()`                                                                                                            |

The result card, the stats, the saved game and the "How to play" text stay
Sudoku's own, as Minesweeper's do (decision 9).

## The design

This section describes what the S0 mock shows. The user approves the mock
before anything is built. The look is plain and conventional: a classic
Sudoku grid wearing the palette.

### Layout

- **The three shapes Minesweeper has, at the same widths.** On a roomy
  screen the bar runs across the top. On an upright phone the bar sits along
  the bottom, compact. On a phone on its side the bar is a rail down the end.
- **The board and the number pad share the stage.** When the stage is wider
  than it is tall (a desktop, or a phone on its side), the pad sits beside
  the board as a 3 × 3 block of digits, with its tools underneath. When the
  stage is taller (an upright phone, or a narrow window), the pad sits under
  the board as a row of nine digits, with a row of tools below that. The
  stage decides by a container query, not the viewport.
- **The board takes the largest square that fits** beside or above the pad,
  with each square between 32 and 64 CSS px. On a 375 × 667 phone, the board
  is about 351 px across, or 39 px per square, and the pad's two rows fit
  between it and the bar. On a 320 px phone, each square is still 32 px.

### The board

- **Lines:** thin lines between squares and thick lines between boxes, on
  the panel.
- **Digits:** givens are bold, in the text color. The player's digits are
  regular weight in a color of their own: the accent, if it clears 4.5:1 on
  a square in every palette, otherwise an ink kept in `_inks.scss`, as
  Minesweeper keeps its numbers' inks. So a given and an entered digit
  differ in weight as well as color.
- **Notes** are small muted digits on a 3 × 3 grid inside the square. Each
  digit has a fixed place: 1 at the top left, 9 at the bottom right.
- **Shading:** the selected square's row, column and box get the lightest
  wash. Every square holding the selected square's digit gets a stronger
  wash. The selected square itself gets the accent's wash, plus the focus
  ring while the board has focus. The contrast spec keeps every digit at
  4.5:1 or more on every one of these.
- **A digit that repeats in a row, column or box** is drawn in
  `--fz-danger` on every square involved, with a mark beside it (an
  underline, unless the mock settles on something better), so the color is
  never the only signal. With the "Mark mistakes" assist on, a digit that
  disagrees with the solution is marked the same way.
- **Solved:** a short wave of the accent runs across the boxes (skipped for
  a player who prefers reduced motion), then the result card opens.

### The number pad

- **Digits 1 to 9.** Each shows how many of that digit are left to place.
  A digit placed nine times shows a tick and says "all placed" in its name.
  It stays pressable, since one of the nine may be wrong.
- **Tools:** Notes (a toggle, with `aria-pressed`), Erase, Undo and Hint.
  Undo and Hint sit on the pad, within reach of a thumb, rather than in the
  bar.
- **Focus.** One square is always selected; at a deal it is the first blank
  square. Pressing a pad key with a mouse or finger hands the focus back to
  the selected square, so the player can keep typing. Pressing a pad key
  from the keyboard (Enter or Space) leaves the focus on the pad.

### The bar

- **Lead:** the link home, which the S1 lift decides, then the title, an
  `<h1>` reading "Sudoku", with the level as a badge. On a compact screen,
  the title is read to screen readers but not shown.
- **Status:** the time. It is not a live region.
- **Actions:** New Game, Restart, How to play and Settings. On a compact
  screen: New Game, plus the overflow menu holding Restart, How to play and
  Settings, as in Minesweeper.

### Play

| Action                   | Mouse                 | Touch                 | Keyboard                                                       |
| ------------------------ | --------------------- | --------------------- | -------------------------------------------------------------- |
| Select a square          | Click                 | Tap                   | Arrows, <kbd>Home</kbd>, <kbd>End</kbd>, with Ctrl for corners |
| Place a digit            | Click it on the pad   | Tap it on the pad     | <kbd>1</kbd>–<kbd>9</kbd>                                      |
| Add or remove a note     | The pad in Notes mode | The pad in Notes mode | <kbd>Shift</kbd> + digit, or the digit in Notes mode           |
| Turn Notes mode on / off | Notes on the pad      | Notes on the pad      | <kbd>N</kbd>                                                   |
| Erase                    | Erase on the pad      | Erase on the pad      | <kbd>Backspace</kbd>, <kbd>Delete</kbd> or <kbd>0</kbd>        |
| Undo                     | Undo on the pad       | Undo on the pad       | <kbd>Ctrl</kbd>+<kbd>Z</kbd>                                   |
| Hint                     | Hint on the pad       | Hint on the pad       | <kbd>H</kbd>                                                   |

- **Digit keys are read by `event.code`, not `event.key`.** That way an
  AZERTY keyboard's top row places a digit without Shift, and Shift adds a
  note on every layout. Shift with a numpad digit is a navigation key on
  Windows, so on a numpad, notes go through Notes mode.
- **Single keys work only while a square has focus**, which WCAG 2.1.4
  requires of one-key shortcuts, as Minesweeper's F does. Ctrl+Z works
  anywhere outside a dialog.
- **Screen readers.** The board is a grid named "Sudoku, 9 rows by 9
  columns". Each square's name says what it holds: "7, given", "7",
  "Blank", "Blank, notes 1 4 8" or "7, repeats in column 5". S0's spike
  decides whether the square's position also goes in its name or comes from
  `aria-rowindex` and `aria-colindex`, by listening to NVDA and Narrator.
  The one polite live region says what each move did: "7.", "Note 3.",
  "Erased.", "Row 4 done.", "7 repeats in column 5.", "Every square is
  filled, but something is wrong." and "Solved in 12:34.".
- **The clock** starts when a puzzle is dealt and pauses while the page is
  out of sight (`StopwatchService` already does this). A game counts as
  played from its first digit or note.
- **Restart** clears the player's digits, notes and history and keeps the
  puzzle. **New Game** deals a fresh puzzle at the same level. Both ask
  first while a game is under way.
- **The page opens on a puzzle**, either the game taken up from before a
  reload or a fresh deal at the last level played. The board never shows
  empty: the app's initializer waits for the deal.

### Hints

Hints are decision 5.

- **The first press** checks the board first. If a digit on it is wrong, the
  hint selects that square and says so ("This 7 doesn't belong here."),
  whether or not "Mark mistakes" is on. Otherwise, it selects the square
  that logic fills next, shades the squares that prove it, and explains in
  plain words: "Hidden single: 7 has one place left in box 5." When that
  square needs a harder technique first, the hint names the technique: "An
  X-Wing on 6, in rows 2 and 8, leaves 4 as the only digit here."
- **The second press**, or Enter on the square, fills it in. Undo can take
  it back.
- **Hints are counted.** A puzzle solved with a hint counts as solved but
  can't set a best time.

### Dialogs

- **Settings:**
  - **Level:** Easy, Medium, Hard and Expert, each tile saying what the
    level asks of the player ("Singles only", "Pairs and pointing",
    "Triples and X-Wings", "Swordfish and XY-Wings"). Choosing a level deals
    a new puzzle, after the confirmation if a game is under way.
  - **Assists,** which cost nothing to change mid-game, so they are plain
    checkboxes: "Mark mistakes" (off) and "Remove notes as digits go in"
    (on).
  - **Theme:** `<fz-theme-picker>`.
- **The result:** an alert dialog over the board showing the trophy,
  "Solved!", the level, and the figures: the time, the best time (or the
  hints used, when there were any), and puzzles solved out of played, with
  "New best time" when it is one. New Game comes first, and Close leaves the
  solved board to look at. There is no loss card, since a game can't be
  lost.
- **How to play:** the rule in one sentence, notes, hints, the assists, and
  the controls table above.
- **The confirmation:** "Start a new game?" and "The game in progress will
  be lost.", with Cancel focused first, as in Minesweeper.

### What it keeps

Each key is stored with `writeVersioned()`:

- `sudoku-settings`: the level and the assists.
- `sudoku-stats`: for each level, the games played, the games solved, and
  the best time without hints.
- `sudoku-game`: the game under way, with its givens, the player's digits,
  the notes, the history, the hints used, the time and the level. It is
  taken up again on load. A long game's history of a few hundred moves comes
  to a few kilobytes.

Each reader drops anything it can't trust: givens without exactly one
solution, a digit written over a given, or a note outside 1 to 9. The solver
re-solves the stored givens on restore, so an edited save can't hand the
game a wrong solution.

## Phases

The library lift (S1) is merged to `main` on its own first, because it
changes the two live games. Sudoku itself is built on one branch, `sudoku`,
with at least one commit per phase. A work log (`docs/sudoku-worklog.md`)
records where things stand, so the work can be paused and resumed; it is
deleted at the end, as the earlier plans' logs were. Every phase ends with
`yarn verify` green and with the docs its changes touch brought up to date.
S1 touches none of the files S2 to S4 touch, so it can run alongside them;
S7 needs S1 to be finished.

### S0: the mock, and a spike (small; first)

- **Mock:** a private page built from the real tokens, as the shared UI and
  Minesweeper mocks were. It shows:
  - the game in Classic felt and Midnight blue on a wide screen, and in a
    dark palette on an upright phone and on a phone on its side;
  - the board mid-game: givens, entries, notes, the selected square and its
    shading, a repeat, and a marked mistake;
  - the pad, with counts, a digit all placed, and Notes on;
  - the bar, with its overflow menu open;
  - a hint, shown and then filled;
  - the settings, the confirmation, the result and How to play;
  - the three new icons.

  Nothing is built until the user approves the mock.

- **Spike (thrown away):**
  - **The grid:** a zoneless app with a 9 × 9 `ngGrid` that reads digit keys
    by `event.code`, keeps the selected square while the focus visits a pad
    and comes back, and lets us listen to what NVDA and Narrator say while
    moving across squares named with and without their position.
  - **The bank:** a rough solver and grader, timed in Node. How many tries
    does an Expert puzzle take? How long do 200 puzzles per level take? How
    large is the bank gzipped? The answers set the bank's size, each level's
    techniques, and whether the banks ship as separate chunks. S3 and S4
    write the real code, with specs; the measurements go in the work log.

- **As built:** no mock; the design is this plan's, checked in the browser
  as each phase landed. The spike was the real solver, grader and generator,
  written as S3 and S4 committed them and timed in Node: 100 puzzles a level
  took 100 tries at Easy, 2,700 at Medium, 15,065 at Hard and 2,057 at
  Expert, about seven minutes in all, and the bank came to 11.5 kB gzipped,
  so it ships in the main bundle and dealing is synchronous. Easy keeps at
  least 36 givens and Medium 30. Listening with NVDA and Narrator was left to
  the user; a square is named by what it holds, its place left to
  `aria-rowindex` and `aria-colindex`.

### S1: the library lift (medium)

Decision 9. This phase is on its own branch, merged first.

- **`@fz/game-ui/viewport`:** `GameViewportService.barHome`, the link home
  the bar has room for, replacing the `home` computation in both games.
- **`@fz/game-ui/bar_overflow`:** `withHomeLink(items, href)`, which puts
  the link home at the head of the overflow menu, as both games now do by
  hand.
- **`@fz/game-ui/stopwatch`:** `formatClock(seconds)`, which writes "2:13",
  or "1:02:13" past an hour. Minesweeper adopts it in its bar and result
  card. The Solitaire Collection keeps its "02:13", its own look.
- **`@fz/style`'s toolkit:** `field-label`, `choice-tile` (Minesweeper's
  `choice-option`, which is the Solitaire Collection's `swatch-option` with
  the same declarations), `dialog-card($width)` and `close-button`.
  Minesweeper adopts all four. The Solitaire Collection adopts the first
  two. Its `panel-card` reads a surface of its own, so it stays.
- **Checks:** each piece gets a spec in its library (`toolkit.spec.ts`
  compiles the mixins). Screenshots of both games before and after, in every
  palette, show no pixel changed. The `fuzzley-ui` skill and the libraries'
  `AGENTS.md` files name the new pieces.

- **As built:** as planned, on `library-lift`. Instead of screenshots, a
  script compared every style rule both games' builds compile to, each
  rule's declarations sorted: Minesweeper's 235 rules and the Solitaire
  Collection's 402 were the baseline's, byte for byte. Minesweeper's clock
  past an hour reads "1:02:13" where it read "62:13".

### S2: scaffold the workspace (small)

- **`frontend/games/sudoku/`,** copied from Minesweeper:
  - `package.json` (`sudoku`, private, Minesweeper's ranges, without
    `@angular/forms`, since there is no form, and with
    `generate:puzzles`);
  - `vite.config.ts` (`gameConfig({ port: 9002, name: "Sudoku" })`) and
    `vitest.config.ts` (`angularTests()`, with the floor on `src/rules/`);
  - `eslint.config.js` (the blocks and the fence around `src/rules/`);
  - the tsconfig solution, `stylelint.config.js` and `src/test-setup.ts`;
  - `LICENSE`, `README.md`, and `AGENTS.md` with `CLAUDE.md` beside it.
- **The page:** `index.html` with `lang="en"`, the title "Sudoku",
  `theme.js` and the icons first, `theme-color`, the description, the
  canonical address (`https://fuzzley.games/play/sudoku/`), the link preview
  and JSON-LD tags Minesweeper's page carries, `<app-root>`, and a
  `<noscript>`. `src/main.ts` boots an empty shell: the bar and an `<h1>`.
- **Run:** `yarn install` from `frontend/`.
- **Verify:** `yarn verify` builds the new workspace. `games.json` doesn't
  list it yet, so the site doesn't serve it.

- **As built:** as planned, but `tsconfig.scripts.json`, `tools/` and the
  `generate:puzzles` script came with S4's script, since `tsc` fails on a
  project with no files.

### S3: the rules (medium)

`cells.ts`, `puzzle.ts`, `grid.ts`, `history.ts`, `transform.ts`,
`deal.ts`, `difficulty.ts`, `describe.ts`, `saved_grid.ts`, `random.ts`,
`json.ts` and `format.ts`, each with its spec. `src/testing/` gets the
grid picture helper. The coverage floor on `src/rules/` goes in at this
phase.

- **As built:** the line between S3 and S4 moved with the imports:
  `puzzle.ts` solves its givens and `difficulty.ts` names the grader's
  techniques, so `solver.ts`, `logic.ts` and `difficulty.ts` came into S3,
  with `digits.ts` (sets of digits as nine bits) beside `cells.ts`; `deal.ts`,
  `describe.ts` and `saved_grid.ts` went to S4. The floor is 100% of
  statements, functions and lines and 95% of branches; reads go through
  `at()`, `peersOf()` and `unitsOf()` so `noUncheckedIndexedAccess` leaves no
  fallback a spec can't reach.

### S4: the solver, the grader and the bank (large)

- `solver.ts`, `logic.ts` and `generate.ts`, each with its spec. The grader's
  specs give each technique a position that needs it and one that doesn't.
- `tools/generate-puzzles.mjs`, then the bank in `src/rules/bank/`, then
  `bank.spec.ts`.
- `deal.ts` loads the banks the way S0's measurements decided.

- **As built:** as planned, with `deal.ts`, `describe.ts` and
  `saved_grid.ts`. The bank took 12m57s to write, Hard 620 s of it.

### S5: the new icons (small)

`pencil`, `eraser` and `bulb` go into `@fz/ui`'s `ICON_NAMES` and its
template, drawn as the mock settled, with the icon spec's cases. Neither
other game uses them, and their specs show nothing changed for them.

- **As built:** the three icons, outlines like `undo` beside them on the
  pad.

### S6: the board and the pad (large)

- **`GameService`** (`src/app/play/`): the grid held in a signal, the
  selected square, Notes mode, the moves, undo, hints, the clock on
  `StopwatchService`, the announcer, and the confirmation through
  `ConfirmService`. `GAME_RANDOM` supplies the seeds, as Minesweeper's does.
- **`<app-board>`:** the grid on `ngGrid`, the squares, the shading, the
  keys, and the size worked out from its container.
- **`<app-pad>`:** the digits, their counts and the tools, laid out in a
  row or a block as the stage decides.
- **The styles:** squares built from palette roles, and the entry ink in
  `_inks.scss` if one is needed.
- **`contrast.spec.ts`:** givens, entries, notes and repeats at 4.5:1 or
  more on every shading, in every palette; the focus ring at 3:1.
- **Specs** through Testing Library, by role and name. A click selects. A
  digit places. Shift with a digit adds a note. N toggles Notes. Backspace
  erases. A repeat is marked and announced. Undo restores the board. A hint
  selects a square and then fills it. A solved board opens the result.
  Focus goes back to the board after a new deal.

- **As built:** the contrast spec changed three of the design's choices.
  With 18 to 28% tints under the selection and a hint, Soft pastel's muted
  notes and its danger color fell under 4.5:1, so the shades are 12 to 22%,
  the player's ink is a deeper blue in a light palette and a paler one in a
  dark one (`#1e40af` and `#bfdbfe`), notes are in the text's color with the
  selected square's digit on an accent chip, and a square with a marked
  digit is never shaded. The selection is outlined in the accent as well.
  A hint's words show on the pad, and Hint reads "Fill in", or "Take out"
  for a wrong digit, while one shows. N, H and Ctrl+Z are read by their
  character, digits by the key's code.

### S7: the bar and the dialogs (medium)

- **`<app-bar>`** on `<fz-game-bar>` and `<fz-bar-overflow>`, with S1's
  `barHome` and `withHomeLink()`.
- **The settings, result and How to play dialogs** on `<fz-dialog>`, styled
  with S1's mixins.
- **Specs** for each: what it shows, what it does, and that focus returns
  afterward.

- **As built:** as planned. The result card opens 1.3 s after the solve,
  once the board's wave has run, at once where motion is unwelcome. How to
  play's stylesheet is Minesweeper's, copied whole.

### S8: storage (medium)

- `SettingsService`, `StatsService` and `SavedGameService`, under the three
  keys above, written once per move and again as the page goes out of
  sight, as Minesweeper's are.
- Every reader tolerates an entry that is missing, from an old version, or
  broken. The specs use an in-memory store.

- **As built:** as planned; the settings and the stats were kept from S6.
  A fresh deal no move has touched isn't kept.

### S9: the checks (medium)

- **By hand:** solve a puzzle by keyboard alone, by touch in Chrome's
  device mode (and on a real phone if one is at hand), and by mouse, in a
  light palette and a dark one. Type digits with an AZERTY layout. Move
  through a few squares with NVDA or Narrator. Read the accessibility tree in
  DevTools. Run Lighthouse's accessibility audit.
- **Size:** the gzipped page compared with Minesweeper's 103 kB plus the
  bank.

- **As built:** everything but NVDA and Narrator, left to the user.
  Lighthouse scored accessibility 100; its one flag, the digit keys' names
  not holding their visible counts, was fixed by naming each key by its text.
  The script came to 100.9 kB gzipped, against Minesweeper's 104.4.

### S10: screenshots and docs (small)

- **`tools/capture-screenshots.mjs`:** deals Medium from a fixed seed,
  fills about a third of the board through hint steps, adds a few notes and
  selects a square. It writes `public/docs/screenshots/sudoku/` through
  `writeSiteImages()`, with the thumbnail cropped to the board. The palette
  is Midnight blue, because Casino night is Minesweeper's and the Solitaire
  Collection's tables are green.
- **Sudoku's docs:** its `AGENTS.md` (stack, layout, the board, storage
  keys, commands and tests), its `README.md`, and a `sudoku-testing` skill in
  `.agents/skills/`. Then run `node .agents/link-claude-skills.mjs`.
- **Lists that name the games:** `.agents/AGENTS.md`, `frontend/AGENTS.md`,
  `frontend/games/AGENTS.md` (the ports become "9002 Sudoku's, so the next
  game takes 9003"), `frontend/lib/dev/AGENTS.md`, `docs/operations.md`,
  the root `README.md`, and the skills `fuzzley-ui`,
  `web-game-accessibility` (the number pad, as how a game takes digits) and
  `angular-testing`.
- **Finish:** delete the work log.

- **As built:** as planned. The first capture showed a note's chip stretch
  its row, which the specs couldn't see; the board's tracks became
  `minmax(0, 1fr)` and the chip no bigger than a note's place. The
  thumbnail is the board and the pad, widened to the thumbnail's shape.

### S11: ship (small)

- **Wire the game into the site:**
  - `frontend/site/games.json` gets `"sudoku": { "workspace": "games/sudoku" }`;
  - the catalog entry gets `play: { build: "sudoku" }` and an `added` date
    (decision 10);
  - `public/thumbnails/sudoku.svg` is deleted, since a hosted game's picture
    is its own screenshot;
  - the meta description in `frontend/site/index.html` names Sudoku;
  - the fixtures in `frontend/site/tools/vite-plugins.spec.ts` that use
    Sudoku as a game still to come switch to Reversi.
- **Check the image:** run `yarn verify`, build the Docker image, run
  `.github/scripts/check-image.sh`, and play `/play/sudoku/` in the image
  with the console open.
- **Merge:** on the user's go-ahead, merge to `main` and push. Verify
  promotes `live` and Cloud Run deploys it. Play the game on
  fuzzley.games.
- **Rollback:** `git push --force origin <last good commit>:live`, then
  revert the merge on `main`.

## Decisions

The first option in each is the recommendation.

1. **Angular alone, with the board in the DOM.** Or Phaser draws the board
   inside an Angular shell, as in the Solitaire Collection: 354 kB gzipped
   more, a canvas screen readers can't reach, and digits drawn into
   textures.
2. **Puzzles come from a graded bank** that a script writes and the specs
   check, dealt through Sudoku's symmetries. Or the browser generates each
   puzzle in a Web Worker: no bank, but no quick promise of a level, since
   an Expert puzzle can take many tries. Or use a published collection,
   which brings its license with it.
3. **Four levels, set by the hardest technique needed:** Easy, Medium, Hard
   and Expert, with Easy dealt first. Or three levels, Easy to Hard, like
   Minesweeper's. Or deal Medium first, as Minesweeper does.
4. **Mistakes:** a digit that repeats in a row, column or box is always
   marked, since the board already shows it. Checking against the solution
   is an assist, off by default. There are no lives and no losing. Or lives,
   as in Minesweeper: three wrong digits end the game. Or never check
   against the solution at all.
5. **Hints name the next logical step, then fill it in.** They are counted,
   and a puzzle solved with one sets no best time. Or a hint simply reveals
   the selected square's digit. Or there are no hints.
6. **Notes:** a Notes toggle on the pad, the N key, and Shift with a digit.
   Placing a digit clears it from its peers' notes (an assist, on by
   default). "Fill in every note" stays out of this plan. Or notes with no
   automatic clearing. Or add "Fill in every note" as a pad tool.
7. **Undo goes back as far as the game goes, kept across a reload, with no
   redo.** Or undo plus redo, with a `redo` icon and Ctrl+Y. Or undo only
   within a visit.
8. **What it keeps:** the settings; games played, solved and the best time
   for each level; and the game in progress with its notes and history. Or
   the same without stats. Or nothing beyond the visit.
9. **New in the libraries: only what a third copy would repeat.** That
   means the bar's link home, the four dialog mixins and `formatClock()`,
   each adopted by the games already using it, pixel for pixel, plus three
   icons. The result card, the stats and the saved game stay each game's
   own until the games mean the same thing by them. Or copy everything a
   third time and lift it later. Or also lift the result card
   (`<fz-game-result>`), which changes the Solitaire Collection's victory
   card.
10. **Shipping:** the library lift merges on its own first. Sudoku merges
    once, linked from the catalog in the same commit, with its `added` date
    moved to that day so the catalog badges it new for 30 days. Or merge
    everything at once. Or keep `added` at 2026-10-11, whose badge runs out
    on 2026-11-10.

## Risks

- **Expert puzzles are rare** among puzzles generated at random, so the
  script may run for a long time. S0 measures this. If it is too slow, the
  bank holds fewer Expert puzzles; the symmetries still make every deal
  look different.
- **A grader bug could mislabel a level, or a puzzle with two solutions
  could slip in.** `bank.spec.ts` checks every stored puzzle with the
  independent backtracking solver and with the grader, and the transforms
  are specified to keep both properties.
- **A hint from a wrong position would mislead.** The hint checks the
  player's digits against the solution before it reasons.
- **Keyboards differ.** Reading `event.code` handles AZERTY. Notes on a
  numpad go through Notes mode. S9 tries both.
- **`@angular/aria` is young** (pinned `~22.2.0`). Minesweeper's board runs
  on its grid. The spike checks digit keys and focus moving to the pad and
  back, and a roving tab stop of the game's own remains the fallback.
- **The library lift touches both live games.** Pixel comparisons in every
  palette, and a merge of its own, keep any regression apart from Sudoku.
- **The pad and the board compete for a small screen.** The mock covers
  320 px; squares never shrink below 32 px.

## Not in this plan

- A daily puzzle, or a link that shares a puzzle. Both are a seed away once
  this plan is built.
- Entering a puzzle of the player's own, variants (Killer, diagonal,
  6 × 6, 16 × 16), coloring squares, "Fill in every note" (decision 6),
  a pause that hides the board, sound, and shared scores.
- A library for framework-free helpers (Mulberry32, the JSON guards), so
  the games' rules could share them across the fence.
- Lifting the result card, the stats or the saved game into the libraries
  (decision 9).
- A Content Security Policy for `/play/sudoku/`. No game carries one, and
  Sudoku loads nothing from another origin.
- Reversi, the other Classic still to come.
