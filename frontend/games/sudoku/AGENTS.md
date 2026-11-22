# Sudoku

Sudoku is an Angular app that deals its puzzles from a graded bank, and these
rules are its own; the games', in [frontend/games/AGENTS.md](../AGENTS.md),
the frontend's and the repository's apply too.

- **Draw the grid a spec needs rather than deal one,** with `gridFrom()`
  (`src/testing/grid_picture.ts`), and put it in play with `playOn()`
  (`src/testing/game.ts`), called after `render()`, since it injects the
  game. `EASY` is the puzzle most specs play.
- **The rules read a square through `at()`, `peersOf()` and `unitsOf()`**
  (`src/rules/cells.ts`), never with a fallback of their own.
  `noUncheckedIndexedAccess` makes every read of a list a branch, and a
  fallback no spec can reach counts against the branch floor.
- **A spec reaches the hint's short form only with a `ResizeObserver`,**
  which jsdom lacks, so the hint's words always fit their room there. Stub
  the global with `FakeResizeObserver` (`src/testing/resize_observer.ts`)
  before rendering, and report the heights through it.
- **A key that a layout pairs differently is pressed with
  `fireEvent.keyDown`,** given its `code` and its `key`, as AZERTY's top
  row is (`{ code: "Digit6", key: "-" }`). user-event presses a US
  keyboard's pairs.
- **Write the bank again after changing the grader or the generator,** that
  is, anything `generate()` in `src/rules/generate.ts` runs, with
  `yarn generate:puzzles`. The game deals only from `src/rules/bank/`, so
  players go on getting the puzzles made before the change.
  `src/rules/bank.spec.ts` can pass all the same: it holds each puzzle to
  the grader, not the bank to what the script would write, so a changed
  generator, or a new technique no puzzle needs, fails nothing.
- **A one-key shortcut works only while a square has the focus.** A new one
  goes into `boardKey()` in `src/app/board/board_keys.ts`, which the board
  asks only about a key pressed on a square, never into the document's
  listener in `src/app/app.component.ts`, which takes Ctrl+Z. A lone letter
  or digit that acts anywhere on the page fires while a player dictates by
  voice (WCAG 2.1.4).
