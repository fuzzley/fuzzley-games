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
  key event of a frame again with each new one, so from the third key of a
  frame on, every key before it is handed over again. Brick Breaker's scene keeps the events it took in a
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

### G3: Snake's specs play the same apples every run

- **Cause:** Brick Breaker's log put the result spec's one failure, 2, 2
  and 5 for 1, 1 and 4, down to load. It wasn't. `GameService` seeds each
  run from `GAME_RANDOM`, which is `Math.random` unless a spec provides
  another, and none did. A run lost heading right eats the first apple,
  always at (12, 8), then crashes four squares on, and the second apple
  falls where the seed says. A probe over 1,000 sources found 13 that lay
  it in those four squares (0.121, 0.154, … 0.983), so the run eats two.
- **Built:** `provideSeededRuns()` in `src/testing/play.ts` gives every run
  the same seed, from a source of 0.5, which lays the second apple out of
  the way. The result spec renders with it. With 0.121 in its place, the
  spec fails as it did once, with 2, 2 and 5.
- **The other specs:** the others that play a run right count only whether
  it ate, which the first apple settles, and Saved game's eight steps right
  end on the first apple, so they keep `Math.random`.
- **Docs:** `endedGame()`'s doc says a run lost right may eat the second
  apple too. The `snake-testing` skill says where later apples come from,
  and when a spec provides `provideSeededRuns()`.
- **Checks:** Snake's lint, typecheck and test (397) pass, and Prettier and
  the references.

### G1's review (b8928cbf)

The reviewer found the fix sound, and proved its findings in a scratch
copy: a raw listener given three keys in a frame heard five, the helper's
listeners were gone after a restart, and a key is heard before any
`advance()`. Every finding was taken but the last nit, as said.

1. **"A frame of three keys repeats the first" was wrong.** From the third
   key of a frame on, every key before it is handed over again: four keys
   give 1 + 1 + 3 + 4 = 9, as G1's own count says. **Fixed** in the
   helper's doc, the `phaser-core` skill and this plan's G1. A probe here
   gave `A, B, A, B, C, A, B, C, D` for four keys.
2. **The skill's testing rule was stale:** "press at most two keys a
   frame, since with a third Phaser sends the earlier ones again". **Fixed:**
   a scene that hears the keys through the helpers takes any number a
   frame, and Phaser's own key events hand the earlier ones over again.
3. **The helpers' docs read as once per press.** A held key's repeats are
   events of their own, and both scenes still check `event.repeat`.
   **Fixed:** `onKeyDown()`'s doc says a held key's repeats are among the
   keys, and each exported doc says why to use it, on hover, and that it
   lasts until the scene ends.
4. **Spec gaps.** **Fixed:** "stop once the scene has ended", as each
   sibling helper has, and "hands every listener each key", which a
   module-wide `WeakSet` fails (tried: it does).
5. **A spec of both helpers sat under `onKeyUp`.** **Fixed:** it is on the
   outer `describe`, "hand each helper only its own kind of key event".
6. **Snake's handler was still `onKey()`,** where `on…` now means
   subscribing. **Fixed:** `press()`, as Brick Breaker's.
7. **Two awkward sentences** in the games' `AGENTS.md`. **Fixed:** "each
   key event once", and "its swipes".
8. **The skill named only `ANY_KEY_DOWN` and `ANY_KEY_UP`,** where the
   per-key events replay too. **Fixed:** "not the keyboard's own key
   events".
9. **`(event: KeyboardEvent) => void` three times.** **Fixed:** a
   `KeyListener` type, exported beside the helpers, since their signatures
   name it.
10. **`runScene()`'s `key()` said Phaser hears a key on the next frame.** It
    hears it at once and forgets the frame's keys as the frame ends.
    **Fixed** in its doc and the skill's testing rule.

- **Not taken:** G4's line in the plan says what changes, not what goes
  wrong today. Its log entry will.

### G3's review (d76297f2)

The reviewer confirmed the diagnosis in a script of its own: the same 13
sources, 0.5 eating one and 0.121 two, and 1.42% over a million runs of
`Math.random`, as 4 of the 285 squares free lie ahead. It found no other
spec the seed could fail today. Every finding was taken.

1. **`endedGame()`'s doc ended on a negation,** and held a fact of the
   helper's. **Fixed:** "and now and then the second, which
   `provideFixedSeed()` rules out".
2. **The helper's name and doc were vague:** every run has a seed, and it
   returns a provider. **Fixed:** `provideFixedSeed()`, "Returns a provider
   that gives every run the same seed, one whose second apple falls out of
   the way of a run heading right."
3. **The plan said the specs that play runs to an end get a fixed seed;
   only one did.** Leaving chance as the default leaves the next spec of a
   run's score flaky one time in 70. **Fixed** the other way round from G3's
   entry: every spec that plays runs to an end provides it, the board's,
   the result's, `GameService`'s and `SavedGameService`'s, as Brick
   Breaker's specs all provide their seed.
4. **The skill's sentence was imprecise, and in the rules' section.**
   **Fixed:** under The Shell, "`GameService` seeds each run from
   `GAME_RANDOM`, `Math.random` unless a spec provides another", with the
   rate as its cause, one run in 70, rather than a sample.
5. **"A probe over 1,000 sources"** is clearer as 1,000 values of the
   random source, 0.000 to 0.999, as this entry has it.
6. **`renderEnded()`'s doc** had the seed wedged in. **Fixed:** its doc is
   as it was, and the provider says what it does.

- **Left for later, as the reviewer suggests:** `GAME_RANDOM` is Snake's
  and Brick Breaker's alike, worth a shared token if a third game needs
  one.
- **Checks:** Snake's lint, typecheck and test (397) pass, and Prettier and
  the references.

### G2's review (7a115b83)

The reviewer found the fix right, and proved its findings on the commit's
code in a scratch copy, with probe specs run with and without the
bindings. Nothing above the board loses these keys: the play room
listens to focus, visibility and presses, and no other key listener
stands above the board. Every finding was taken.

1. **The New Game spec's `runs` check couldn't fail:** `newGame()` waits a
   microtask on whether a run would be lost, so a run the scene started
   began after the assertion. **Fixed:** the spec waits for it, as Brick
   Breaker's does, and keeps `fireEvent` with a comment on why: the
   scene's own Space starts a run too, so only the events say which heard
   it.
2. **The Resume spec checked the mechanism, not the fix.** **Fixed:** it
   presses Space, then Enter, on the focused Resume with user-event, and
   expects the run going and the board focused. Without the directive
   both fail, as does the New Game spec, and the click spec passes.
3. **New Game doesn't hand the board the focus; the app does,** as the run
   begins. **Fixed:** the docs say so, and an app spec presses Space on
   the card's New Game and finds a new run and the board focused.
4. **The reason sat in a loose HTML comment,** and read poorly.
5. **Snake and Brick Breaker shared `keepKey()` word for word,** with its
   comment, and the next Phaser game would need it too. **Fixed, for 4
   and 5 both:** `KeepKeysDirective` (`fzKeepKeys`) in
   `@fz/phaser/canvas`, its doc giving the reason once, with a spec that
   runs a scene capturing Space on a board with a kept button and a plain
   one: the kept one's keys are neither cancelled nor heard, the plain
   one's are both. Both games' card buttons use it, and their
   `keepKey()` and comments went. The docs lead with the cause: the board
   is Phaser's keyboard target, so the cards' buttons keep their keys.
   - **The `phaser-core` skill said a captured key has its default
     prevented everywhere.** Phaser listens and prevents only on its
     target (`KeyboardManager.js`), as the fix relies on. **Fixed** there
     and in both games' `AGENTS.md`, and the skill says to put
     `fzKeepKeys` on a button over the board, and why.
6. **The log said New Game's click hands the board the focus, and that "no
   run starts" was checked.** Both are put right above.

- **Found on the way:** G3's review entry wanted a blank line Prettier adds,
  which this commit has.
- **Checks:** lint, typecheck and test pass in `@fz/phaser` (265 tests),
  Snake (399) and Brick Breaker (1,753), and Prettier and the references.
  A lint error came first: inline in Phaser's config, whose keyboard
  target is `any`, `screen.getByRole()` took `any` for its type, so the
  spec names the board first.

### G4: Snake's screenshot script waits for a host not yet rendered

- **What went wrong:** `describePage()` in
  `tools/capture-screenshots.mjs` waited while the canvas host said
  `loading`, and a host not yet rendered says nothing, so the wait ended
  at once on a page that hadn't drawn the canvas yet. The 800 ms after it
  usually covered it, and a slow first load would capture an empty board.
- **Built:** a host not yet rendered counts as loading, as Brick Breaker's
  script has since B13's review, with the same comment.
- **Checks:** Snake's lint and typecheck pass (the script is checked from
  its JSDoc). The script is run against Snake's dev server at G-Q1.

### G5: the dialogs' comment

- **What went wrong:** Snake, Minesweeper and Sudoku said their
  `<fz-confirm-dialog />` comes last "so it opens over the settings when a
  change would lose" a game. `<fz-dialog>` opens with `showModal()`, which
  puts a dialog in the top layer over every one opened before it, wherever
  it sits in the page, so the order of the elements decides nothing.
- **Built:** the comment went from all three, as it went from Brick
  Breaker's in B8.2's review. The confirmation stays where it is.
- **Checks:** the three games' lint and test pass (Minesweeper 376,
  Sudoku 591, Snake 399), and Prettier.

### G-Q1: the fixes, checked

At `5b5569c1`, with G2's review fixes in and G4's and G5's reviews under
way.

- **`yarn verify`:** lint, typecheck, test and build pass in every
  workspace, in 7:51. The tests: `@fz/phaser` 265, Snake 399, Brick
  Breaker 1,753, Minesweeper 376, Sudoku 591, the Solitaire Collection
  6,872, and the libraries' and the site's.
- **`yarn check:layout`:** Sudoku's, Snake's and Brick Breaker's layouts hold at
  every shape and turn.
- **Snake, from its dev server in Chrome:**
  - With the run paused and Resume focused, a real Space went on with the
    run and left the focus on the board; so did a real Enter.
  - Four P presses sent in one task, so in one frame, left a paused run
    paused: four toggles. Before G1 the scene would have heard nine, and
    gone on.
  - Once a run ended and its result was closed, a real Space on the card's
    New Game began a new run, with the focus on the board.
  - The console stayed clean.
- **Snake's screenshot script** (G4) ran against the dev server, took up
  its run with a score of 12, and wrote both images byte for byte as they
  were.
- **Brick Breaker on fuzzley.games,** once its merge went live (`8d6095c`
  in `version.json`): its card in Arcade links `/play/brick-breaker/`, the
  level drew, Space launched the ball, a brick broke for 50, the ball was
  lost to a still paddle and announced ("Ball lost. 2 lives left."), and
  the console stayed clean.

### G6: the settings drawer's styles

- **Built:** `settings-drawer`, a mixin in `@fz/style`'s `_dialogs.scss`
  beside `help-card` and `result-card`, applied to the drawer's element and
  naming the classes it styles: the panel, frosted, the window's height at
  its end; `.drawer-header` with its `h2` and `.close`; `.drawer-content`,
  which scrolls; `.setting`, `.setting-label` and `.setting-desc`;
  `.choice-list` and its `.choice` tiles, each a `.name` over a `.desc`;
  and `.check`, a checkbox beside its label with a description under it.
  The comments the copies carried, on the top layer and the muted
  description's contrast, are in the mixin.
- **The games:** Snake's, Sudoku's and Brick Breaker's drawer stylesheets
  are now `.drawer { @include settings-drawer; }` alone, and Minesweeper's
  that and its own custom board and segmented control. Their checkbox rows
  were `.assist`, Sudoku's word for its assists; the library calls them
  `.check`, and the three templates do too. The four stylesheets, 530
  lines, are now 102: five lines each, and Minesweeper's 87.
- **Compared in Chrome:** each game's drawer opened from its dev server at
  1440 × 900, before (G6 stashed, the templates still `.assist`) and after,
  with 44 computed properties and the box of every element in the drawer
  read: Minesweeper's 63 elements, Sudoku's 65, Snake's 79 and Brick
  Breaker's 67, with no difference in any.
- **Specs:** `toolkit.spec.ts` holds the drawer to the window's height and
  its dialog's end, its checked choice tile to the accent, and a check's
  description to the column beside the box.
- **Docs:** `@fz/style`'s `AGENTS.md` and the `fuzzley-ui` skill list the
  mixin with the whole dialogs; Minesweeper's and Sudoku's `AGENTS.md`
  name the drawer among the dialogs' shared mixins.
- **Checks:** lint, typecheck and test pass in `@fz/style` (251 tests),
  Minesweeper (376), Sudoku (591), Snake (399) and Brick Breaker (1,753),
  and Prettier and the references.
