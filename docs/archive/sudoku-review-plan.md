# Plan: a review of Sudoku, and what to improve

Reviewed 2026-10-27, the day Sudoku shipped (`c140884`), and built the same
day on the branch `sudoku-review`, cut from `main`, with a commit for each
step. The user's decisions are at the end, and an "As built" note under each
finding says what came of it. The plan and its notes describe the code as it
was, so check a path against the tree before following one. The review covers
`frontend/games/sudoku/`: its folders, its rules, its shell, its specs and
tools, and how it sits beside Minesweeper, the Solitaire Collection and the
libraries in `frontend/lib/`. It looks for what would make the code easier to
read, extend, maintain and test. Paths are relative to
`frontend/games/sudoku/` unless they start with `frontend/`.

Each finding gives a **priority** (High, Medium or Low), a rough **effort**
(S under an hour, M a few hours, L a day or more), what was found, the
proposed change, and its pros and cons. The decisions the user made are
listed at the end.

## Where things stand

The code is in very good health. This plan tidies and adds safety nets. It
doesn't rescue anything.

- **The shape is right.** `src/rules/` holds the game with no framework,
  behind an ESLint fence, as pure functions over an immutable `Grid`. The
  shell in `src/app/` has one folder per feature, built on signals,
  `inject()`, computed view models and zoneless change detection. Randomness
  and storage come in through injection tokens. Every stored entry carries a
  version, and every reader drops what it can't trust.
- **The tests are strong.** There are 29 spec files and 462 tests, which run
  in about 12 s. Together they cover 99.4% of statements and 96% of branches;
  the rules alone cover 100% of their lines. The specs draw grids as pictures
  (`gridFrom`, `solvedBut`) rather than dealing at random. `bank.spec.ts`
  holds every stored puzzle to one solution and to its level, and
  `contrast.spec.ts` holds every shade to WCAG contrast in every palette.
- **It's fast.** Measured in Node over the whole bank, a hint takes 0.04 ms
  at the median, 2.7 ms at the 99th percentile and 36.5 ms at worst (on
  Hard). A deal takes about 1 ms.
- **It follows the libraries.** Every overlay is an `<fz-dialog>`. The
  question asked before a game is lost goes through `ConfirmService`, and
  every move is announced through `AnnouncerService`. The bar is
  `<fz-game-bar>`, and the board is an Angular Aria grid.

What the review found falls into four kinds:

1. **One promise isn't checked.** The game promises that hints follow from
   logic, yet no spec checks that each step logic takes agrees with the
   solution (finding 1).
2. **Logic sits where it's hard to test.** Some pure logic lives inside the
   shell, where only TestBed and the DOM can reach it (findings 2 and 3).
3. **Copies kept in step by hand.** Minesweeper and Sudoku hold the same bar
   actions, the same save-on-hide wiring, the same small helpers and the same
   dialog styles (finding 5).
4. **Small gaps.** A move that does nothing says nothing to a screen reader
   (finding 4), and there are minor drifts and tidy-ups (findings 6 to 13).

## Summary

| #   | Finding                                                      | Priority | Effort |
| --- | ------------------------------------------------------------ | -------- | ------ |
| 1   | The grader's soundness is assumed, not checked               | High     | S      |
| 2   | The hint's logic lives in the shell                          | Medium   | S      |
| 3   | The board's shading and keys can only be tested via the DOM  | Medium   | M      |
| 4   | A move that does nothing says nothing; Undo doesn't say what | Medium   | S      |
| 5a  | The bar's actions, copied in three games                     | Medium   | M      |
| 5b  | Saving on page hide, copied in two games                     | Low      | S      |
| 5c  | Framework-free helpers, copied in three games                | Low      | M      |
| 5d  | How to play's and the result's stylesheets                   | Low      | S      |
| 6   | Adding a technique touches five places                       | Low      | S      |
| 7   | The result card's delay copies the stylesheet's timing       | Low      | S      |
| 8   | A restored history isn't held to the grid's own rules        | Low      | S      |
| 9   | Small tidy-ups                                               | Low      | S      |
| 10  | Tightening a few specs                                       | Low      | S      |
| 11  | A hint could also check the notes                            | Low      | M      |
| 12  | The bank takes 13 minutes to write                           | Low      | M      |
| 13  | Nothing checks the layout in a real browser                  | Low      | L      |

## Findings

### 1. The grader's soundness is assumed, not checked

**Priority:** High. **Effort:** S.

**What was found.** In `src/rules/logic.ts`, `solveByLogic()` reports
`solved` when every square holds a digit, not when every square holds the
right one. `grade()` (`src/rules/generate.ts`) trusts that flag, and
`bank.spec.ts` checks uniqueness with the backtracking solver but never
compares what logic filled in with the solution. Suppose a technique had a
bug that ruled out a true candidate. Logic could then fill a wrong grid,
`grade()` would still give it a level, and every spec would pass.

Hints rely on the same steps. `hintFor()` (`src/app/play/game.service.ts`)
fills in `chain.placement.digit` without checking it against
`grid.puzzle.solution`. A wrong step would show a player a wrong digit with
a confident reason, which breaks the game's main promise.

Today the steps are sound. A script run for this review checked every step
the grader takes over all 400 puzzles in the bank (21,390 steps) and every
hint in a full playthrough by hints (20,177 hints). Each one agreed with the
backtracking solver's solution, and the run took about 3 s. But nothing
keeps it that way. The most likely way to break it is the most likely next
change: adding a technique (finding 6).

**Proposal.**

- Add a pure check to `logic.ts`:

  ```ts
  /** Returns whether a step agrees with a solution: it places the solution's
   * digit, or rules out none of them. */
  export function agrees(step: Step, solution: readonly number[]): boolean;
  ```

- `bank.spec.ts`: for every puzzle, every step of `solveByLogic()` agrees
  with `solve()`'s solution, and so does every chain `nextPlacement()` gives
  in a playthrough by hints. With `agrees()` the assertion is a single
  `expect(steps.filter((s) => !agrees(s, solution))).toEqual([])`, with no
  branching in the spec.
- The hint guards itself. A chain with a step that doesn't agree is treated
  as no hint ("No hint: logic finds no next step here."), and the shell logs
  `console.error` so the bug shows in development. This guard moves into the
  rules with finding 2.

**Pros.** It pins the game's main promise with a spec of about ten lines.
It catches the most likely bug in the most likely future change, and a
player could never be shown a wrong digit. It adds about 3 s to the suite.

**Cons.** It makes the suite slower; checking ten puzzles a level instead
of all 400 would cost under a second, but would also catch less. The guard
in the hint can never fire while the spec passes, so it is defense in
depth, not new behavior.

**As built.** `agrees()` is in `logic.ts`, and `bank.spec.ts` holds every
grading step and every step of every hint in a playthrough by hints to the
backtracking solver's solution, in about 3 s. `hintFor()` treats a chain
with a step that disagrees as no hint; its spec reaches the guard by passing
`hintFor()` a chain of its own. It logs nothing: the rules have no console,
and the bank's spec is what catches a wrong step.

### 2. The hint's logic lives in the shell

**Priority:** Medium. **Effort:** S.

**What was found.** `game.service.ts` (331 lines) holds three pure
functions and a type that need nothing from Angular: `hintFor()`, the
`Hint` interface and `firstBlank()`. Because they live in the shell, the
rules' 100% floor doesn't cover them, and their specs have to go through
`TestBed`, `playOn()` and the announcer to reach them. The rest of
`GameService` coordinates moves, the clock, stats, announcements and the
result card, which is a full job already.

**Proposal.** Move them to `src/rules/hint.ts`, with a `hint.spec.ts` that
draws grids with `gridFrom`:

```ts
/** Says what a hint points at, until the board changes. */
export interface Hint {
  readonly kind: "step" | "mistake";
  readonly index: number;
  readonly digit: number;
  readonly shown: readonly number[];
  readonly title: string;
  readonly text: string;
}

/** Returns the hint for a board: a wrong digit, else logic's next step. */
export function hintFor(grid: Grid): Hint | null; // with finding 1's guard

/** Returns the first blank square, where a fresh deal puts the selection. */
export function firstBlank(grid: Grid): number;
```

`GameService` then imports them as it imports `place()` and `undo()`. Keep
the specs of what the service does around a hint in `game.service.spec.ts`:
selecting the square, counting the hint, announcing it, filling it on the
second press. Move the specs about which hint comes out of which board
("a wrong digit before anything else", "logic stalls") to `hint.spec.ts`.

**Pros.** The hint, the part of Sudoku most likely to grow (finding 11),
sits behind the fence and under the floor. Its specs need no TestBed, and
`GameService` keeps only coordination.

**Cons.** A little churn, and `Hint` carries words (`title`, `text`), which
the rules already own in `describe.ts`, so that is consistent.

**As built.** `src/rules/hint.ts` holds `Hint`, `hintFor()`,
`firstBlank()` and `fillHint()`, the move the second press makes, with
`hint.spec.ts` beside it. The board where logic stalls moved to
`src/testing/grid_picture.ts` as `STALLED`, which both specs draw.

### 3. The board's shading and keys can only be tested through the DOM

**Priority:** Medium. **Effort:** M.

**What was found.** `src/app/board/board.component.ts` (248 lines) holds two
pieces of pure logic inside the component:

- **The view model.** The `rows` computed is about 45 lines. It works out
  each square's shade "the strongest reason first" (hinted, selected, same
  digit, shown, related), and the rule that **a marked square is never
  shaded**. `contrast.spec.ts` and `AGENTS.md` depend on that rule: the
  danger color clears 4.5:1 only on the panel. Yet
  `board.component.spec.ts` tests only `selected`, `related`, `same` and
  none. Nothing tests `hinted`, `shown`, which shade wins when two apply, or
  the marked-never-shaded rule. A refactor could break the contrast
  guarantee with every spec still green.
- **The key map.** `onKeydown()` and `digitOf()` turn a key into a move:
  digits by code, Shift for notes, the numpad's Shift quirk, N, H, Enter on
  a hinted square, and erase on four codes. Each case can only be tested by
  rendering the board and firing events.

Every computed run also rebuilds all 81 cell views, with their screen-reader
labels, when only the selection moved. At 81 squares that costs nothing
measurable, so this is about clarity, not speed.

**Proposal.**

- `src/app/board/board_view.ts`, plain TypeScript with no Angular:
  `Shade`, `CellView`, `shadeOf()` and `boardView(grid, selected, hint,
markMistakes)`. The component's computed becomes a single call. A
  table-driven `board_view.spec.ts` covers every pair of reasons, so the
  precedence is written down, and holds the marked-never-shaded rule as its
  own named test.
- `src/app/board/board_keys.ts`: `boardKey(event)` returns a small union,
  `{ kind: "digit", digit, note } | { kind: "erase" } | { kind: "notes" } |
{ kind: "hint" } | { kind: "fill-hint" } | null`. It takes the event's
  `code`, `key` and modifiers, so a spec passes plain objects.
  `onKeydown()` becomes a `switch` on the result. A table spec covers
  AZERTY, the numpad, modifiers and the letters.
- Optionally, split the view into two computeds: what depends on the grid
  (digit, notes, marked, label) and what depends on the selection (shade,
  tabindex). Then moving the selection doesn't rebuild the labels.

**Pros.** The board's two densest rules become tables a reader can scan,
and the contrast spec's assumption gets a spec of its own. The component
keeps only the wiring: focus, events and the effect. The existing DOM specs
stay as they are.

**Cons.** Two more files. Some cases end up tested twice, once as a table
and once through the DOM; the DOM specs could be trimmed to one per kind of
key.

**As built.** `board_view.ts` holds `boardView()` and `shadeOf()`, with the
note's text and the square's tab index in the view, and `board_keys.ts`
holds `boardKey()`, with a fifth kind, `enter`: the component fills the
hint only if it is on the selected square. Both have table specs, with the
marked-never-shaded rule as its own test. The split into two computeds was
left out. Three DOM specs cover a key or a click off the squares and Enter
with no hint.

### 4. A move that does nothing says nothing; Undo doesn't say what

**Priority:** Medium. **Effort:** S.

**What was found.** `GameService.move()` returns quietly when a move
changes nothing: a digit typed on a given, Erase on an empty square, or any
key after the puzzle is solved. A sighted player sees nothing change and
understands why. A screen reader user hears silence and can't tell a
refused key from a missed one. `undo()` announces "Undone." without saying
what came back, so the user has to move to the square and listen. Accessible
play is one of the repository's standing priorities (the
`web-game-accessibility` skill), and announcing every move is a rule in
Sudoku's `AGENTS.md`.

**Proposal.** Add two pure functions beside `describeMove()` in
`src/rules/describe.ts`, each with specs:

- `describeUndo(before, after)`: "Undone: 6 taken out of row 1, column 1.",
  "Undone: note 3 back.", "Undone: 6 back in row 1, column 1."
- `describeRefusal(grid, index)`: "Row 1, column 4 is given.", "Nothing to
  erase.", or nothing at all once the puzzle is solved (the result card is
  open).

`GameService.move()` and `undo()` say these instead of staying silent.

**Pros.** It closes the one gap where the game gives a screen reader user
less than it shows on screen, with small pure functions that fit the rules'
pattern.

**Cons.** More announcements, which can feel chatty. The words should be
checked with NVDA or Narrator, which the build plan's S9 left to the user.
The spoken text changes, so `game.service.spec.ts` changes with it.

**As built.** As proposed, in the proposed words, and one more refusal: a
note on a square with a digit says "Row 1, column 1 holds a 6, so it takes
no notes." Undo names notes too: "Undone: note 3 taken out of row 1,
column 1.", or "Undone: notes 1, 3 and 6 back in row 1, column 1." after
an erase.

### 5. Copies the games keep in step

Decision 9 of the Sudoku plan (`docs/archive/sudoku-plan.md`) lifted only
what a third copy would repeat. It left the result card, the stats and the
saved game in each game "until the games mean the same thing by them", and
put a library for framework-free helpers out of scope. Now that Sudoku has
shipped, these are the copies that remain, graded by whether the games
really mean the same thing.

#### 5a. The bar's actions, copied in three games

**Priority:** Medium. **Effort:** M.

**What was found.** `src/app/bar/bar.component.ts` matches Minesweeper's
line for line, apart from the figures each bar shows: `HOME_HREF`,
`MenuAction`, `OVERFLOW_ACTIONS`, `overflowItems` and `chooseFromMenu()`.
The actions block of the template (Restart, New Game, How to play, the
overflow menu, Settings) is also identical, along with the `@if
(!viewport.isCompact())` dance around each action and the `.action`,
`.btn-text` and turning-gear rules in the SCSS. The Solitaire Collection's
`header_bar.component.ts` has the same skeleton with two more actions
(`rules`, `bug`). That makes three copies of the bar's behavior on a
compact screen, which every new game would copy again.

**Proposal.** Pick one:

- **A. `<fz-game-actions>` in `@fz/game-ui`** (recommended). It takes
  `compact`, `home` and `homeHref`, plus a list of extra actions, and emits
  `newGame`, `restart`, `help`, `settings` and `action(id)`. On a roomy
  screen it shows the buttons; on a compact one, New Game and the overflow
  menu, led by `withHomeLink()` when `home` is `none`. Its host is
  `display: contents`, so each button still lays out as a direct child of
  the bar's `.actions`. That keeps `<fz-game-bar>`'s rule that nothing
  inside the bar becomes a containing block. Each game projects it with
  `fzBarActions`.
- **B. Lift only the TypeScript:** `STANDARD_OVERFLOW_ACTIONS`, and an
  `overflowFor(barHome, actions, href)` helper. The templates stay copied.
- **C. Leave it.** Three copies, about 60 lines each.

**Pros (A).** A new game's bar shrinks to its title and figures. The
overflow's behavior, labels and accessibility live in one tested place, and
a fix reaches every game at once.

**Cons (A).** It changes all three live games, so it needs the same care S1
took: compare the compiled style rules before and after, and merge alone.
The Solitaire Collection's extra actions have to fit the inputs, and
`display: contents` has had accessibility bugs on buttons in older browsers,
though this host is only a wrapper, not a button.

**As built.** Left as it was: the user chose C, the three copies.

#### 5b. Saving on page hide, copied in two games

**Priority:** Low. **Effort:** S.

**What was found.** The constructors of the two `SavedGameService`s
(`src/app/play/saved_game.service.ts` and Minesweeper's) are the same 20
lines: an `effect` that keeps the game after every change, plus
`visibilitychange` and `pagehide` listeners and their removal on destroy.
Only `keep()` and `restore()` differ, and those really are each game's own.

**Proposal.** Add a helper to `@fz/ui/storage` or `@fz/game-ui`, for
example `keepOnChangeAndHide(keep: () => void): void`, called from an
injection context. It runs the effect and the two listeners and cleans them
up. Each game's service keeps its key, its shape and its checks.

**Pros.** One tested place for a piece that is easy to get subtly wrong
(the `bfcache`, a `freeze` event, the listener order). Each game's service
then reads as what it stores and nothing else.

**Cons.** Only two copies, since the Solitaire Collection saves
differently, so the rule of three isn't met yet. It saves about 20 lines a
game.

**As built.** Left as it was, in each game, as the user chose.

#### 5c. Framework-free helpers, copied in three games

**Priority:** Low. **Effort:** M.

**What was found.** `src/rules/json.ts` (`isRecord`, `isWhole`) is
byte-for-byte Minesweeper's. `format.ts` (`count()`) is identical but for
its comment, and so is its spec. In `random.ts`, `createRandom()`
(Mulberry32) and `randomSeed()` are identical; Sudoku adds `shuffled()`.
The Solitaire Collection keeps its own Mulberry32 and shuffle
(`src/engine/core/random/`) and JSON reader (`src/engine/core/common/`),
and `@fz/ui/storage` keeps a private `isRecord`. The rules' fences in
`eslint.config.js` keep `@fz/*` out, so the rules can't share these today.

There's a reason beyond tidiness. Mulberry32's sequence is a contract:
Minesweeper's saved fields and the screenshot scripts' seeds depend on it
never changing. A shared copy with a spec that pins its first outputs makes
that contract visible.

**Proposal.** Add a new library, `@fz/core` (`frontend/lib/core`), with no
framework: `random` (`createRandom`, `randomSeed`, `shuffled`), `json`
(`isRecord`, `isWhole`) and `format` (`count`). Each game's fence allows
`@fz/core` alongside its own files. `@fz/ui/storage` imports `isRecord`
from it. The Solitaire Collection's engine can adopt it later, on its own
schedule.

**Pros.** A single copy of each helper, with Mulberry32's sequence pinned
by a spec. Each new game starts with these instead of copying a fourth
time.

**Cons.** A whole workspace (package, tsconfig, ESLint, Vitest config,
`AGENTS.md`, constraints) for about 40 lines of code. Each game's fence
gets an exception. The build plan put this out of scope on purpose, so it
is a judgment call.

**As built.** `frontend/lib/core` is `@fz/core`, with `random`, `json` and
`format` entry points and every line covered. Sudoku and Minesweeper import
them, their copies and those copies' specs gone, and `@fz/ui`'s storage
imports `isRecord()`. Each game's fence lets `@fz/core` through, and the
library's own ESLint config lets it import nothing but its own files.
`random.spec.ts` pins the first three numbers seed 1 gives. The Solitaire
Collection keeps its own.

#### 5d. How to play's and the result's stylesheets

**Priority:** Low. **Effort:** S.

**What was found.** `src/app/help/help.component.scss` is byte-for-byte
Minesweeper's ("copied whole", says the build plan). The two
`result.component.scss` files differ only in a few rules.

**Proposal.** Move the shared declarations into `@fz/style`'s dialog
toolkit, for example a `help-card` mixin for the card and the controls
table, and a `result-figures` mixin for the figures and the "new best"
line. The games keep their own differences.

**Pros.** Dialog styles stay alike across games, which is the reason the
four dialog mixins were lifted in S1.

**Cons.** It's styling only, and it changes two live games, so it needs
the compiled-rules comparison S1 used.

**As built.** `@fz/style`'s `_dialogs.scss` has `help-card`, `result-card`
and `corner-close-button`. Both games' help stylesheets are the one
include, and their result stylesheets keep only the icon's color, Sudoku's
note and Minesweeper's close button. Compiled, every selector of both
games' cards keeps the same declarations, each now under `.card`, which
holds them all.

#### 5e. Settings and stats: no change for now

The `SettingsService`s and `StatsService`s share a shape (read and
validate, update and write) but mean different things: won or solved,
Custom with no best time, hints that rule out a best. Decision 9 still
holds. If a third Angular game repeats the shape, consider a small
`persistedState({ key, version, parse, fallback })` in `@fz/ui/storage`
then, not now.

### 6. Adding a technique touches five places, and one can be skipped silently

**Priority:** Low. **Effort:** S.

**What was found.** A new technique (a Jellyfish, a Skyscraper, an XYZ-Wing)
needs changes in five places: `TECHNIQUES` and the `findAll()` switch in
`logic.ts`, `TECHNIQUE_LEVELS` in `difficulty.ts`, `TECHNIQUE_NAMES` and
`eliminationWords()` in `describe.ts`, and possibly `LEVEL_INFO.asks`. The
compiler enforces most of these through `Record<Technique, …>` and
exhaustive switches, which is good. One gap remains: `NEEDS` in
`logic.spec.ts` is a `Partial<Record<Technique, string>>`, so a technique
can ship with no puzzle proving it's needed and sufficient. `AGENTS.md`
also doesn't list the steps, and regenerating the bank afterwards (finding 12) isn't mentioned anywhere near the code.

**Proposal.**

- Type `NEEDS` as `Record<Exclude<Technique, "hidden-single">, string>`, so
  a technique without its proving puzzle fails to compile.
- Replace the `findAll()` switch with a
  `FINDERS: Readonly<Record<Technique, (state: State) => Iterable<Step>>>`
  table beside `TECHNIQUES`, so a technique's order and finder sit together.
- Add "Adding a technique" to Sudoku's `AGENTS.md`: the five places,
  finding 1's soundness spec, then `yarn generate:puzzles` and what the
  bank's spec will say.

**Pros.** The game's most natural direction for growth becomes a checklist
the compiler mostly enforces.

**Cons.** Small changes. The words still live apart from the logic, but
that split (logic in `logic.ts`, words in `describe.ts`) is the right one
to keep.

**As built.** As proposed: a `FINDERS` table beside `TECHNIQUES`, `NEEDS`
typed so a technique without its puzzle doesn't compile, and "Adding a
Technique" in Sudoku's `AGENTS.md`.

### 7. The result card's delay copies the stylesheet's timing

**Priority:** Low. **Effort:** S.

**What was found.** `WAVE_MS = 1300` in
`src/app/result/result.component.ts` restates `board.component.scss`'s
wave: 600 ms of animation after a delay of up to 16 × 40 ms, which comes to
1,240 ms. Changing either one leaves the other behind. `waveMs()` also
repeats the stylesheet's `prefers-reduced-motion` query in TypeScript,
behind an `eslint-disable` for jsdom. `ThemeService` has the same guard,
while `GameViewportService` already wraps `matchMedia` safely.

**Proposal.** Pick one:

- **A.** The board sets the wave's timing as custom properties
  (`--wave-step`, `--wave-run`) from constants in `board_view.ts` (finding
  3). `ResultComponent` reads the same constants, so there's a single
  source.
- **B.** The board emits `waveDone` on the last square's `animationend`.
  The result opens on that event, or at once when motion is reduced.

Either way, a `reducedMotion` signal on `GameViewportService` (which already
owns the games' media queries) replaces the hand-rolled query.

**Pros.** No silent drift, and the `eslint-disable` goes.

**Cons (B).** `animationend` doesn't fire in jsdom or under reduced motion,
so B needs its fallback anyway. A is simpler.

**As built.** Option A. `board_view.ts` holds `WAVE_RUN_MS`,
`WAVE_STEP_MS` and `WAVE_MS` (1,240 ms, where the card waited 1,300), the
board binds the first two as `--wave-run` and `--wave-step`, and the card
waits `WAVE_MS`. `GameViewportService` gained `allowsMotion`, and the fake
viewport answers the motion query as a system with no preference.

### 8. A restored history isn't held to the grid's own rules

**Priority:** Low. **Effort:** S.

**What was found.** `restoreGrid()` (`src/rules/saved_grid.ts`) checks that
every change in the history is in range and touches no given. It doesn't
check the grid's own rule that a square with a digit has no notes. An entry
edited in `localStorage` could make undo put a digit and notes in the same
square. Only a hand edit can reach this, and nothing crashes.

**Proposal.** `unpackMove()` rejects a `before` or `after` that holds both
a digit and notes. Optionally, the last move's `after` must match the
board as stored.

**Pros.** The reader then drops everything it can't trust, as
`frontend/games/AGENTS.md` asks.

**Cons.** It guards against tampering only.

**As built.** A stored change whose square holds a digit with notes, before
or after, drops the saved game, and so does a last move whose `after`
doesn't match the board.

### 9. Small tidy-ups

**Priority:** Low. **Effort:** S, all together.

- **Templates bind; they don't compute** (`frontend/AGENTS.md`). Three
  bindings break the rule: the board's host binding `'game.grid().outcome
=== "solved"'`, the cell's `[tabindex]="cell.selected ? 0 : -1"` and the
  note's `note.digit || ""`. Meanwhile `PadComponent.canHint` re-derives
  `outcome === "playing"`, though `GameService` owns `canUndo`. Add
  `GameService.solved` and `canHint`, and put `tabIndex` and the note's text
  in the cell view (finding 3).
- **`history.ts` mixes the model with its storage.** It holds `Square`,
  `Change` and `Move`, and also `packHistory()` and `unpackHistory()`, the
  format storage keeps. Move the packing into `saved_grid.ts`, the module
  that owns the stored shape, and `history.ts` becomes the move types alone.
- **The nine lines are written out three times.** `NINE` is private in
  `cells.ts`; `transform.ts`'s `IDENTITY` and the board's rows write
  `[0, 1, …, 8]` out by hand. Export one `LINES` from `cells.ts`.
- **`SettingsComponent.setAssist()`** takes the `Event` and checks
  `instanceof HTMLInputElement`. A template reference passes the boolean
  directly: `(change)="setAssist('markMistakes', box.checked)"`.
- **Stale numbers.** `tools/generate-puzzles.mjs` says Hard takes "about
  six minutes", while `AGENTS.md` says "about ten". The build plan measured
  620 s for Hard and 12 min 57 s in all. Give one figure in one place.

**As built.** All five. `GameService` gained `solved` and `canHint`; the
packing went into `saved_grid.ts` as private functions, and
`history.spec.ts` into `saved_grid.spec.ts`; `cells.ts` exports `LINES`;
the checkboxes pass `box.checked`; and the generator's numbers are its new
ones (finding 12).

### 10. Tightening a few specs

**Priority:** Low. **Effort:** S.

- **A spec that can't fail.** "Deals a new puzzle when the player goes
  ahead" in `game.service.spec.ts` asserts
  `expect(game.grid().puzzle).not.toBe(before.puzzle)`. Every deal builds a new
  object, so the test would pass even if New Game dealt the same puzzle.
  Provide a seeded `GAME_RANDOM` and compare the givens.
- **No floor under the shell.** `vitest.config.ts` sets a floor on
  `src/rules/` only. The shell sits at 97 to 100% with nothing holding it
  there. Add a floor a little under today's figures for `src/app/` (for
  example 95% statements, 85% branches, 100% functions and lines), as the
  libraries set theirs. Minesweeper could take the same.
- **Shading coverage** is finding 3.

**As built.** The new-deal spec deals from `createRandom(7)` and compares
the givens with `EASY`'s, and the shell's floor is 95% of statements, 85%
of branches and every function and line. Minesweeper has no floor on its
shell yet: its bar sits at 86% of statements and 60% of branches.

### 11. A hint could also check the notes

**Priority:** Low (an enhancement, needing a decision). **Effort:** M.

**What was found.** A hint checks the player's digits against the solution
first, but never their notes. A square whose notes leave out its own digit
is the most common way a player gets stuck. The next hint then reasons from
the digits alone, so its explanation may not match what the player sees on
the board.

**Proposal.** After the wrong-digit check, and before logic, a hint points
out the first noted square whose notes leave out its solution digit: "The
notes at row 3, column 4 leave out a digit that square can hold." The
second press adds the missing note. This lives in `hint.ts` (finding 2).

**Pros.** Many Sudoku apps offer this, and it catches the mistake that's
hardest to find.

**Cons.** It changes what a hint does, and since a hint costs a best time,
it costs a best time to fix notes. That's a product choice for the user. It
also reveals a little about the solution, as the wrong-digit hint does
already.

**As built.** As proposed, as a third kind of hint, `note`, titled "A
missing note"; the pad's tool reads "Add note" while one shows, and How to
play says what a hint checks.

### 12. The bank takes 13 minutes to write

**Priority:** Low. **Effort:** M.

**What was found.** `tools/generate-puzzles.mjs` runs in one thread: 12 min
57 s in all, 620 s of it for Hard. It runs again only after a change to the
grader or the generator, but that's exactly when someone is iterating.

**Proposal.** Run each level in a `worker_threads` worker, or split each
level's seeds across workers. The output stays the same if every worker
tries a fixed range of seeds and the results are merged in seed order.

**Pros.** Close to four times faster on four cores, and it stays
deterministic.

**Cons.** More code in a script that rarely runs, and the Vite
`runnerImport()` has to load once per worker.

**As built.** Workers try four seeds at a time, and a seed's puzzle is kept
only once every seed before it has been tried. On eight workers, the
default, the whole bank took 1 min 32 s, and came out byte for byte the
bank before, which also showed the grader and the deal untouched by
findings 5c and 6.

### 13. Nothing checks the layout in a real browser

**Priority:** Low (optional, repository-wide). **Effort:** L.

**What was found.** jsdom has no layout, so the specs can't see the
container queries that size the board and place the pad. S10 found a note's
chip stretching its row only from a screenshot. No workspace in the
repository has a browser-level check, though `@fz/dev/chrome` already
drives headless Chrome for the screenshot scripts.

**Proposal.** Add a `yarn check:layout` script on `@fz/dev/chrome`. At the
three shapes (roomy, phone portrait, phone landscape) it would check that
the board is square, that its 81 squares are equal, that the pad fits
without scrolling, and that the console shows no errors. Run it in CI after
the build.

**Pros.** It covers the one layer no spec reaches, and it would guard every
game if it were built generically.

**Cons.** It needs Chrome in CI, it's slower and flakier than jsdom, and it
belongs to the whole repository, not just Sudoku, so it's a bigger decision
than this review.

**As built.** `@fz/dev/layout`'s `checkLayout()` opens a game at a roomy
window, an upright phone and one on its side, and fails on an error the
page reports, a page that scrolls, or what the game's own inspection
finds. Sudoku's `tools/check-layout.mjs` serves its build with Vite's
`preview()` and holds the board square, its squares one size, and the
board and pad in the window, in about 4 s. The root's `yarn check:layout`
runs every game's that has one, and the Verify workflow runs it after
`yarn verify`; that step had not yet run on GitHub's runner when this was
written.

## Considered and left alone

- **Moving the hint into a Web Worker.** It's 36.5 ms at worst in Node, and
  far less at the median. Measure on a low-end phone before adding one.
- **Skipping `countSolutions()` on every deal.** It costs about 1 ms, and
  the check is worth having.
- **The throwaway deal at startup** when a saved game is taken up. That
  costs about 1 ms too.
- **Splitting `logic.ts` (620 lines) into a folder.** It's cohesive and
  well commented. Revisit if techniques are added (finding 6).
- **Making the board size a parameter** for 6 × 6 or 16 × 16. Variants are
  out of scope, and the fixed 9 keeps the code plain.
- **Redo** (decision 7 of the build plan) and **lifting stats and settings
  wholesale** (5e).

## A note for later: seeds are not durable

The build plan said a daily puzzle or a shared link is "a seed away". A
seed's deal depends on the bank's content and order, `transform.ts`, and
Mulberry32. Regenerating the bank (finding 6, finding 12) changes what
every seed deals. A shared link or a daily puzzle should therefore carry
the givens (81 characters, or a compact encoding), or name a bank version.
Saved games are safe already, since they store their givens.

## Suggested order

1. **Findings 1 and 2 together** (S): `agrees()`, the soundness spec, and
   `hint.ts` with its guard. This is the High item and its natural home.
2. **Finding 3** (M): `board_view.ts` and `board_keys.ts` with their table
   specs, along with finding 9's template tidy-ups and finding 7's option A.
3. **Finding 4** (S): `describeUndo()` and `describeRefusal()`, then a
   listen with NVDA or Narrator.
4. **Findings 6, 8, 9 and 10** (S): the remaining small Sudoku-only items.
5. **Finding 5a** (M), on its own branch and merged alone like S1, with a
   comparison of the compiled styles in all three games. 5b to 5d follow
   if the user wants them.
6. **Findings 11, 12 and 13** only on the user's word.

Steps 1 to 4 touch only `frontend/games/sudoku/`. Step 5 touches the
libraries and every game.

## Decisions for the user

The user decided on 2026-10-27:

1. **The bar's actions (5a):** C, leave the three copies.
2. **Saving on page hide (5b):** keep it in each game for now.
3. **Framework-free helpers (5c):** add `@fz/core`.
4. **Dialog stylesheets (5d):** lift them to `@fz/style`; a new game can
   still write its own.
5. **Announcements (4):** take the proposed words now.
6. **Notes in hints (11):** add the check.
7. **The generator (12) and a layout check (13):** both, now.
