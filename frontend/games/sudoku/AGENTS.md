# Sudoku

Sudoku is an Angular app that deals its puzzles from a graded bank, and these
rules are its own; the games', in [frontend/games/AGENTS.md](../AGENTS.md),
the frontend's and the repository's apply too.

- **Before writing or changing a spec, read the `sudoku-testing` skill,**
  which has the fixtures that draw a grid and put one in play.
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
