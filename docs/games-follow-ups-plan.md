# The other games' follow-ups

Brick Breaker's build (`docs/archive/brick-breaker-execution-plan.md`,
merged into `main` as `8d6095c6` on 2026-10-30) found problems in the
games before it, and pieces each game copies, which it left for the user.
The user asked for them to be addressed once Brick Breaker was merged. This
plan lists them, in the order they are built, and how the work runs; the
log is at its end.

## How the work runs

- **One branch,** `games-follow-ups`, cut from `8d6095c6`, `main`'s tip.
- **A step is a commit,** in the repository's form (`fix(snake): …`),
  once the workspaces it touched pass their `lint`, `typecheck` and `test`,
  and `yarn prettier:check` passes. What it adds is covered by specs, the
  docs it makes untrue are brought up to date in the same commit, and the
  log has its entry.
- **Every commit is reviewed.** Once it lands, a fresh agent reviews it,
  with a focus on readability, engineering practice and the language's
  style guide and idioms, and edits nothing. Every finding is answered in
  the log, taken or not, with why. The fixes are a commit of their own,
  reviewed with the next step; the last fixes get a review of their own.
- **QA checkpoints:** G-Q1 after the fixes, G-Q2 after the lifts, each
  with `yarn verify`, `yarn check:layout` and the games played in a
  browser, logged.
- **Nothing is pushed, and nothing reaches `main`, without the user's
  go-ahead.**

## Part 1: the fixes

- **G1. Each key event once.** Phaser's keyboard plugin hands over every
  key event of a frame again with each new one, so a frame of three keys
  repeats the first. Brick Breaker's scene keeps the events it took in a
  `WeakSet`; Snake's has no guard, so it could repeat a turn. A helper in
  `@fz/phaser/scene` listens for keys pressed or let go and hands each over
  once, both scenes use it, and its spec holds a frame of several keys to
  one call each. The `phaser-core` skill and `@fz/phaser`'s `AGENTS.md`
  name it.
- **G2. Snake's card buttons keep their keys.** Space on the focused Resume
  or New Game bubbles to the board, where the scene acts on it and
  Phaser's capture cancels the button's own click, so the focus is left on
  a button that goes. The buttons keep their keydown and keyup, as Brick
  Breaker's do, the scene's guard for Enter on a button goes, and the
  board's description of its keys says a card's button takes Space and
  Enter itself. Specs send Space with its key code, down and up, on each
  button.
- **G3. Snake's specs play the same apples every run.** `GameService`
  seeds its runs from `Math.random` unless given `GAME_RANDOM`, and no spec
  gives it one, so 13 seeds in 1,000 drop the second apple in the path of a
  run heading right, and the result spec counts a score of 2 where it
  expects 1. Not load, as Brick Breaker's log guessed. The specs that play
  runs to an end get a fixed seed from a helper in `src/testing/play.ts`.
- **G4. Snake's screenshot script waits for a host not yet rendered,** as
  Brick Breaker's does since B13's review.
- **G5. The dialogs' comment.** Snake, Minesweeper and Sudoku say their
  confirmation is last "so it opens over" the settings. `<fz-dialog>` opens
  with `showModal()`, so a dialog stacks over those opened before it
  wherever it sits, and the comment goes, as Brick Breaker's did.
- **G-Q1.** `yarn verify`, `yarn check:layout`, and Snake played in a
  browser: keys in quick succession, Space on Resume and on New Game.

## Part 2: the lifts

- **G6. The settings drawer's styles.** Minesweeper, Sudoku, Snake and
  Brick Breaker each copy the drawer: its panel, header, close button, the
  settings and their labels and descriptions, and the choice tiles; and
  three of them a checkbox row. They become a mixin, `settings-drawer`,
  in `@fz/style`'s `_dialogs.scss`, beside `help-card` and `result-card`,
  the whole cards a game's dialogs already share, rather than in
  `@fz/game-ui` as Brick Breaker's plan named, which holds no dialog's
  styles. Each game keeps only what is its own, such as Minesweeper's
  custom board. `toolkit.spec.ts` checks what it writes, and the drawers are
  compared in a browser before and after.
- **G7. `arpeggio()`.** Brick Breaker's sound script strikes a chord's
  notes one after another, as Snake's chime does by hand. It moves into
  `@fz/dev/sounds`, with a spec, and both scripts use it;
  `yarn build:sounds` writes the same bytes in both games.
- **G8. The layout check's runner.** Sudoku's, Snake's and Brick Breaker's
  `tools/check-layout.mjs` each parse the same command line, serve the
  build with Vite's `preview()`, start Chrome, print what is wrong and set
  the exit code. That becomes one function in `@fz/dev/layout`, given the
  game's checks, with a spec, and each script keeps only its inspection and
  which checks it runs. `yarn check:layout` passes in all three.
- **G-Q2.** `yarn verify`, `yarn check:layout`, the four drawers looked at
  in a browser, and the sounds' files unchanged.
- **G9.** This plan and its log move to `docs/archive/`.

## Work log

### G1: each key event once

- **Built:** `onKeyDown()` and `onKeyUp()` in `@fz/phaser/scene`
  (`src/scene/keys.ts`). Each listens on the scene's keyboard and keeps the
  events it handed over in a `WeakSet` of its own, so each listener hears an
  event once. A scene with no keyboard hears nothing, as before.
- **Brick Breaker's scene** hears its keys through them, and its own
  `WeakSet` and `isNew()` went. Its key handler is `press()` now, since
  `onKeyDown` is the helper's name.
- **Snake's scene** hears its keys through `onKeyDown()`. A new spec sends
  four keys in one frame and expects four commands. Without the helper it
  got nine, `["up", "left", "up", "left", …]`: the replay was real in
  Snake, and could turn the snake twice.
- **Specs:** `keys.spec.ts` sends four keys pressed, and three let go, in
  one frame, a key pressed again a frame later, and a key pressed and let
  go, each to its own listener. Without the `WeakSet` both frames of several
  keys fail.
- **Docs:** `@fz/phaser`'s `AGENTS.md` lists the helpers; the
  `phaser-core` skill says to hear the keys through them, and why; both
  games' `AGENTS.md` say their scenes do.
- **Checks:** lint, typecheck and test pass in `@fz/phaser` (261 tests),
  Snake (396) and Brick Breaker (1,753); Prettier and the references pass.

### G2: Snake's card buttons keep their keys

- **Built:** Resume and New Game, the two buttons on the cards over the
  board, keep their keydown and keyup (`keepKey()`, which stops the event
  at the button), as Brick Breaker's cards do. Space on a focused Resume
  bubbled to the board: the scene heard it and went on, and Phaser's
  capture cancelled the keyup the browser clicks the button at, so the card
  went with the focus on it. Now the button takes the key, and its click
  hands the board the focus. Reload is left as it is: it shows only when
  the board couldn't be drawn, so no scene hears the keys.
- **The scene's guard went:** it ignored Enter on a button over the board,
  which no key from a card's button reaches now. Its spec went with it.
- **Words:** the board's description of its keys ends "On a card's button,
  the keys are the button's: Space and Enter press it." Snake's
  `AGENTS.md` says so where it describes the run and the board.
- **Specs:** with the real scene, Space sent with its key code, down and
  up, on Resume and on New Game: neither event is cancelled and the scene
  hears neither, so the run stays paused, and no run starts. Without the
  keydown binding both fail with `[false, true]`, and without the keyup
  binding with `[true, false]`.
- **Checks:** Snake's lint, typecheck and test (397) pass, and Prettier.
