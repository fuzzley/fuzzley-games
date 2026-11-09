# Plan: what the games can still share

Proposed and agreed 2026-11-09, with the user's decisions under Decisions at
the end, which this plan already follows. It comes from a review of every game
under `frontend/games/` beside the libraries under `frontend/lib/`, looking
for code two or more games keep that a library could hold, as long as taking
it never makes a game's own code harder to follow. Paths are relative to
`frontend/`. Line counts are rough, from reading the files side by side.

## Where things stand

The libraries already hold most of what the games share. The code-health,
shared-UI and Asteroid Breaker review plans (`docs/archive/`) lifted the bar,
the viewport, the run's lifecycle, storage, the seeded random, the clock, the
event log, `FieldPlay`, the shapes and the scene helpers. What is left falls
into four groups:

1. **The Angular shells repeat their scaffolding.** All five games but the
   Solitaire Collection keep the same page frame in Sass, the same settings
   drawer frame, the same radio list for each setting (nine copies), the
   same `GAME_RANDOM` token, and, in the three Phaser games, the same board
   host options and board styles. Most verbatim clones in the tree are here.
2. **The breakers still copy a few small helpers.** Their rules, views and
   scenes look alike, but most of the likeness is shape, not code: each step
   diverges. A handful of small, pure helpers are copied, and one copy has a
   bug.
3. **The specs and scripts repeat their helpers.** These include palette
   roles, bar menu readers, figure readers, a Phaser layout preamble,
   screenshot defaults and a hand-written rules fence.
4. **The Solitaire Collection predates most of the libraries.** It doesn't
   depend on `@fz/core`, it hand-rolls the settings drawer's and the bar's
   styles, and its canvas has a bug the library's cards would fix.

None of this calls for a base class. The scenes, painters, steering, run
state machines, saved-game validators and app components were all weighed
and stay in their games; "Not lifted" below says why.

## The bar for a lift

A piece moves into a library only when all of these hold:

- **Two or more games use it, and it means the same thing in each.** This is
  `lib/core/AGENTS.md`'s rule, applied to every library.
- **Its API is small:** a few parameters, no flags or modes that switch
  between one game's meaning and another's, and at most one type parameter
  the caller never writes.
- **Each adopting game's code gets shorter and reads at least as plainly.**
  Game content stays in the game: labels, tables, catalogs, physics, art.
- **It respects the fences.** Rules may import only `@fz/core`, and views
  only `@fz/core` and `@fz/phaser`'s pure entries. So anything a rules or
  view file needs goes into those, not `@fz/game-ui`.

As before, each lift is built in one game and adopted by the others in the
same branch, so no copy is left behind.

---

## Phase 0: fixes found on the way

These are bugs and drift the review came across. Each stands alone; three of
them are fixed for free by a lift below.

| #   | Where                                                                         | What                                                                                                                                                                                                                                                                                                                                                                                               | Fixed by |
| --- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| F1  | Solitaire `src/ui/app/component/game_canvas/game_canvas.component.html:30-37` | "The board couldn't be loaded" sits in the `[fzCanvasPlaceholder]`. `@fz/phaser`'s unencapsulated canvas stylesheet hides that whenever `data-state` isn't `loading`, failed included (`lib/phaser/src/canvas/phaser_canvas.component.scss`). So a failed board shows nothing and says nothing to a screen reader. The spec passes only because jsdom applies no styles. **Confirm in a browser.** | 6.1      |
| F2  | Brick Breaker `src/view/steering/steering.ts:79-94`                           | Held keys are two booleans. Holding ArrowLeft and KeyA and letting go of one stops the paddle. Asteroid Breaker's steering counts codes and gets this right.                                                                                                                                                                                                                                       | 2.2      |
| F3  | Sudoku `src/app/app.component.ts:58-60`                                       | `covered` counts settings, help and confirm, but not the hint sheet or the result dialog, so the clock keeps running under them. They should stop it, as every other dialog does (decision 1). `DialogService.anyOpen()` counts every dialog.                                                                                                                                                      | 4.6      |
| F4  | Asteroid Breaker and Brick Breaker How to play                                | Asteroid Breaker asks the board for pictures only while How to play is open (`app.component.ts:58-60`). Brick Breaker binds `board.pictures()` always (`app.component.html:25`). Brick Breaker takes Asteroid Breaker's way, the later design (decision 4).                                                                                                                                        | n/a      |
| F5  | Brick Breaker `tools/capture-screenshots.mjs:49-52`                           | Copies `SAVED_GAME_KEY` and `SAVED_GAME_VERSION = 1` by hand. Asteroid Breaker hands its scripts these through `src/testing/screenshot_api.ts` and `script_api.ts`; Brick Breaker should take the same pattern.                                                                                                                                                                                    | n/a      |
| F6  | Minesweeper `src/rules/saved_field.ts`, Sudoku `src/rules/saved_grid.ts`      | Each embeds and checks its own `version: 1` inside an entry its shell already wraps in `writeVersioned()`. The inner check is redundant, and dropping it still reads old entries.                                                                                                                                                                                                                  | n/a      |
| F7  | Sudoku `src/rules/describe.ts:225`                                            | A private `listOf` ("1, 3 and 8") shadows `@fz/core/json`'s `listOf`, a different thing. Rename it, e.g. to `inWords`.                                                                                                                                                                                                                                                                             | n/a      |

## Phase 1: quick wins

These need no new design. Most are one-line moves.

**1.1 `GAME_RANDOM` into `@fz/game-ui/random`.**

- The same token, `factory: () => Math.random`, is declared five times:
  - Asteroid Breaker and Brick Breaker `src/app/tokens.ts`
  - Snake, Minesweeper and Sudoku `src/app/play/game.service.ts`
- The games-follow-ups plan left it "for later, if a third game needs one".
  Five do now.
- Saves about 5 lines a game, and the specs import it from the library.

**1.2 `recordOf()` where a stats service spells out its keys.**

- Snake, Minesweeper and Sudoku `src/app/stats/stats.service.ts` write
  `{ slow: each("slow"), … }` by hand.
- The breakers already use `@fz/core/records`' `recordOf()` for the same job.
- Saves about 7 lines a game.

**1.3 `RunStart extends RunNumber`.**

- Snake `rules/run.ts:50`, Brick Breaker `rules/run/run.ts:61` and Asteroid
  Breaker `rules/run/run.ts:57` re-spell `@fz/core/run_numbers`' `id` and
  `seed`.
- All three shells already build the start as `{ ...numbers.next(), … }`.

**1.4 One rules fence for the games without Phaser.**

- Minesweeper's and Sudoku's `eslint.config.js:17-43` are the same 27
  hand-written lines.
- They are a weaker copy of `phaserGameLayers()`'s `RULES_FENCE` and
  `deterministic()` (`lib/dev/src/eslint.ts`).
- Change: `@fz/dev/eslint` exports `gameRules()`, those two over
  `src/rules/**`.
- Neither game's rules read a clock, `Math.random()`, the page or storage
  today (checked), so the stricter fence should pass as it stands.

**1.5 The Phaser boards' host options.**

- Snake, Brick Breaker and Asteroid Breaker each declare the same 22-line
  `HostOptions`, differing only in `title` (`src/app/board/board.component.ts`).
- Change: `@fz/phaser/canvas` exports `boardHostOptions(title, keyboardTarget)`.
- Beside `rectAttribute()`, `@fz/phaser/layout` gains `cssRectStyle(rect)`,
  the focus ring's style, which Snake and Brick Breaker write identically.

## Phase 2: `@fz/core`, the run's words and a few small helpers

**2.1 `@fz/core/run`: the stages and keys every run shares.**

- `RunStage` and `RunCommand` live in `@fz/game-ui/run_lifecycle`, which the
  rules and the views can't import. So:
  - Each game re-spells the stages (Snake `rules/run.ts:10`, Brick Breaker
    `rules/run/run.ts:18`, Asteroid Breaker `rules/run/run.ts:14`).
  - Each writes the shared key map by hand in its view: Escape pauses, P
    toggles, Enter and NumpadEnter go (Brick Breaker
    `view/steering/controls.ts:21-24`, Asteroid Breaker `:18-23`, Snake
    `view/controls.ts:24-28`).
  - Each writes "under way" (`playing || paused`) and "ended"
    (`over || won`) again, four and three times.
- Change: one entry holds `RunStage`, `RunCommand`, `RUN_KEYS`, `isUnderWay()`
  and `hasEnded()`, and `@fz/game-ui` re-exports the two types.
- In the games:
  - A game writes `{ ...RUN_KEYS, Space: "launch", … }`; Snake keeps its
    `Space: "toggle"`.
  - Asteroid Breaker writes `Exclude<RunStage, "won">`.
- About 30 lines go across the three games, and the keys "every game
  shares" are written once, as `RunLifecycle`'s doc already claims they are.

**2.2 `HeldKeys` in `@fz/core/keys`: keys held, the last pressed winning.**

- Brick Breaker's paddle (`view/steering/steering.ts:53-94, 175-180`) and
  Asteroid Breaker's turn (`:86-93, 154-172, 271-278`) are the same
  algorithm under different names.
- API: `new HeldKeys(keyOf)`, with `press(code)`, `release(code)`,
  `isHeld(k)`, `axis(neg, pos)` and `letGo()`. It has no options.
- Built on Asteroid Breaker's version, which counts codes and ignores
  repeats, it fixes F2.
- Brick Breaker's scene stops mapping codes itself (`bricks_scene.ts:430,
457-461`).

**2.3 `Turns<T>` into `@fz/core/turns`.**

- Asteroid Breaker's `scene/painters/turns.ts` (32 lines, with a spec) is a
  pool of flourish records played round-robin.
- Brick Breaker hand-rolls it twice in `scene/painters/effects_painter.ts:44-49,
97-130` (`ringsAt`/`nextRing`, `fadesAt`/`nextFade`).
- It knows no Phaser, as `FrameSounds` doesn't, so it belongs in core.

**2.4 Multiplier tiers in `@fz/core/math`.**

- `multiplier()` is the same loop in Brick Breaker
  `rules/field/scoring.ts:10-15` and Asteroid Breaker `:80-85`.
- Their tables are the same shape and values: Brick Breaker's `STREAK`,
  Asteroid Breaker's `CHAIN`.
- Both How to play pages word the table with the same `reverse().map()`
  (`help.component.ts:24-27` and `:28-31`).
- Change: `MultiplierTier`, `multiplierAt(count, tiers)`, and
  `tierWords(tiers, noun)` in `@fz/core/format`.
- The tables stay in each game's tuning, `satisfies readonly MultiplierTier[]`.

**2.5 `CountsById<K>` and `withHigherCount()` beside `countsByIdOf()`.**

- Both breakers re-spell the type `countsByIdOf()` already returns (Brick
  Breaker `rules/run/stats.ts:18`, Asteroid Breaker `:32`).
- Both hand-write "keep it if it beats the best" (Brick Breaker `:80-92`,
  Asteroid Breaker `:164-180`).
- The writer returns the same record when nothing beats it, so the callers'
  early returns keep working.

**2.6 `EventLogView<E>` in `@fz/core/event_log`.**

- `Pick<FieldEventLog, "latest" | "forEachSince">` is declared word for word
  in both breakers' `view/field/frame.ts`.

## Phase 3: `@fz/phaser`, layout and scene helpers

**3.1 The steps of `fitCells()` as pure helpers in `@fz/phaser/layout`.**

- Asteroid Breaker's field takes a fractional unit, so it can't use
  `fitCells()`. Instead it copies the steps inside it:
  - `stageOf()` and `frameOf()` (`view/field/field_metrics.ts:353-379`);
  - the conversion to CSS, three times (`field_metrics.ts:214-219`,
    `app/board/board.component.ts:414-425` and inside `fitCells()`);
  - its `PixelRect`, which is `CssRect`'s shape.
- Change: export `PixelRect`, `roomInside(viewport)`,
  `framePixels(frameCss, pixelRatio)` and `cssRectOf(rect, pixelRatio)`, with
  `fitCells()` rebuilt on them and behaving the same.
- Asteroid Breaker loses about 35 lines and rounds the insets exactly as
  every other board does.

**3.2 `viewportOf(scene, insets)` and `canvasChanged(scene, last)` in
`@fz/phaser/scene`.**

- All three scenes build a `Viewport` from the scale, `pixelRatioOf()` and the
  insets, then test the same three fields for a change:
  - Brick Breaker `bricks_scene.ts:338-367`
  - Asteroid Breaker `belt_scene.ts:422-448`
  - Snake `snake_scene.ts:135-156`
- Each keeps its own extra checks: the finger room, the torus, the insets.

**3.3 `strokeShareArc(graphics, x, y, radius, share)` in `@fz/phaser/scene`.**

- An arc that empties from twelve o'clock: `RING_TOP = -π/2` and the same
  `arc()` call, three times.
- Both `tag_painter.ts` files and Asteroid Breaker's `deck_painter.ts:119-123`.

**3.4 `ColorMode` for the views.**

- `PaletteMode = "light" | "dark"` in both breakers'
  `view/colors/palette.ts` copies `@fz/style/themes`' `ColorMode`.
- The view fence keeps it out.
- Change: `phaserGameLayers()` lets the views import `@fz/style/themes` by
  type. Asteroid Breaker already widens the fence for `@fz/style/fuzzball`.

## Phase 4: the shells, `@fz/game-ui`, `@fz/ui` and `@fz/style`

**4.1 The page frame, written once.**

- `styles/_index.scss` is byte-identical in all five games, down to the
  hand-kept `show` list of bar mixins, so a new mixin means five edits.
- `styles/global.scss` is identical in four; Minesweeper lacks
  `overscroll-behavior: none`.
- `app.component.scss` opens with the same frame in all five: `:host` fixed,
  `bar-size($compact: true)` when compact, and `.stage` inset by the bar on
  each side it stands.
- Change:
  - `@fz/game-ui/toolkit` forwards `@fz/style` with the breakpoints and the
    bar's mixins, and each `_index.scss` becomes that one `@forward`.
  - A global, `@use "@fz/game-ui/global"`, loads `@fz/style`'s and publishes
    the bar's size.
  - A `game-frame($stage: ".stage")` mixin emits the frame. Each game adds its
    own `.stage` rules after it.
- About 30 lines a game. Minesweeper gains `overscroll-behavior: none`, as
  Sudoku, which also scrolls its stage, already has.

**4.2 One choice list for settings and the bar.**

- The same block (`.choice-list`, `fzRadioGroup`, a `@for` of
  `button role=radio [aria-checked]` with `.name` and `.desc`) appears nine
  times:
  - Snake `settings.component.html`, three copies
  - Brick Breaker and Asteroid Breaker, two each
  - Sudoku and Minesweeper, one each
- Each comes with a `computed()` that maps ids to `{ id, name, detail,
checked }`. The three Phaser games map the same speeds again for
  `<fz-bar-choice>`.
- Step 1, in `@fz/style`: the `.choice-list` and `.choice` rules nested in
  `settings-drawer` (`toolkit/_dialogs.scss:400-427`) become a
  `choice-list` mixin. `settings-drawer` includes it, and the Solitaire
  Collection's `option_group` can include it too (6.4).
- Step 2, in `@fz/ui/radio_group`: `<fz-choice-list [options] [value]
labelledBy describedBy (choose)>`. `ChoiceOption<Id>` is
  `BarChoiceOption<Id>`'s shape, so one constant per setting feeds both the
  bar and the drawer.
  - It emits every press, since Minesweeper re-chooses Custom to open its
    editor; each game keeps its "same as now" guard.
  - It keeps the five games' rule that a choice is named by all its text.
- About 15-25 lines a use, roughly 150 in all.

**4.3 `<fz-settings-drawer>` in `@fz/game-ui`.**

- Every `settings.component.html` opens with the same 15 lines and closes the
  same way: the dialog labelled Settings, the drawer, its header with
  `<h2>`, the "Close settings" button and its icon, and the content.
- Change: the component draws the frame and projects the settings, with
  `fz-dialog`'s `open` and `closed`.
- The work is in the Sass. The frame's half of `settings-drawer` moves into
  the component, and each game's stylesheet includes `setting-fields` at its
  top level, since `.drawer .x` can't reach projected nodes. Brick Breaker's
  `.range` rule moves up a level.
- Do it with 4.2. About 20 lines a game.

**4.4 The Phaser boards' styles in `@fz/style`'s `_boards.scss`.**

- Snake, Brick Breaker and Asteroid Breaker repeat the same nine-declaration
  `:host` in `board.component.scss`: a size container, no outline, no touch
  action and no callout.
- They repeat the same `.ring` with `:host(:focus-visible) .ring`.
- Change: `canvas-board-host` and `board-focus-ring($offset)`. About 15
  lines a game.

**4.5 Two small bar mixins.**

- `bar-figures-paired` in `@fz/game-ui`'s `_bar.scss`: the score over the
  ships or lives in one card is 20 lines verbatim in Asteroid Breaker
  `bar.component.scss:46-66` and Brick Breaker `:84-104`.
- `segmented` in `@fz/style`, included from `setting-fields`: Minesweeper's
  `.segmented` (`settings.component.scss:60-87`) and the Solitaire
  Collection's `.segmented-control` (`option_group.component.scss:34-66`) are
  near-verbatim copies.

**4.6 Sudoku takes what the libraries already do.**

- Its `covered` becomes `DialogService.anyOpen()`.
- Its deal-focus effect becomes `refocusWhenUncovered(board, game.deals)`.
- This settles F3 as decision 1 asks: every dialog stops the clock, and the
  board takes the focus back as the last one closes.

**4.7 `keepSaved()` in `@fz/ui/storage`: the saved game's skeleton.**

- All five `play/saved_game.service.ts` share the same steps:
  - restore first;
  - an effect that keeps;
  - `keepOnLeave()`;
  - keeping as "`writeVersioned()` if there is something to save, else
    `remove()`";
  - restoring as "`readVersioned()`, and nothing if nothing was kept".
- What differs is what each saves and restores, and which signals trigger a
  write. Snake and the breakers track three and leave the write untracked;
  Minesweeper and Sudoku track everything they read.
- API: `keepSaved({ key, version, save, restore, track? })`, where
  - `save()` returns the fields to keep, or null to forget them;
  - `restore(saved)` takes what was kept back up;
  - `track()` reads the signals a write follows, and without it the write
    follows what `save()` reads.
- **Spike it in Snake first.** Adopt it in the other four only if Snake's
  service gets shorter and still says plainly what triggers a write.
- About 15 lines a game.

**4.8 `<fz-help-dialog>` in `@fz/game-ui`, after 4.3.**

- Every `help.component.html` opens with the same 11 lines: the dialog
  labelled How to play, the card, "Close How to play" and the `<h2>`.
- Change: the frame is a component, as the settings drawer's is in 4.3, with
  `fz-dialog`'s `open` and `closed`.
- `help-card` splits as `settings-drawer` does. The frame's half moves into
  the component; the text's half (`help-text`, and a `help-controls` for the
  keys' table) is what a game's stylesheet includes at its top level, since a
  projected table is out of `.card`'s reach.

**4.9 The overflow menu's shared items in `@fz/game-ui/bar_overflow`.**

- `viewport.barHome() === "none" ? withHomeLink(items) : items` is in all
  five bars, so `withHomeLink(items, barHome)` takes the bar's home and leads
  with the link only when it is `none`.
- `HELP_MENU_ACTION` and `SETTINGS_MENU_ACTION` join `soundMenuAction()`, so
  "How to play" and "Settings" are worded once for five games.

**4.10 `fuzzleyStyle()` writes the head tags it owns.**

- Every page that uses `@fz/style`'s Vite plugin writes its tags by hand,
  each with a comment: the `theme.js` script and the three icon links. That
  is the site and all six games. The comments have begun to drift between
  games.
- Change: the plugin's `transformIndexHtml` writes them at the head's top, at
  the app's base (`theme.js` in a game, `/theme.js` on the site). Each page
  drops its own copies, and `lib/style/src/build/vite.spec.ts` holds what it
  writes.
- Each page keeps `theme-color` itself, since its starting color is its own:
  white, or the Solitaire Collection's felt. It keeps its search and
  link-preview block too, which is each game's content.

## Phase 5: spec and script helpers

| #    | Helper                                                                                                                                                      | Home                                                  | Copies today                                                                                                                                                                       |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5.1  | `openBarMenu(user)`, `barChoice(label)`, `chooseInBar(user, label, name)`                                                                                   | `@fz/game-ui/testing` (the library owns these labels) | 5 copies of each, in every game's `bar.component.spec.ts`                                                                                                                          |
| 5.2  | `figure(term, within?)`, `figures(within?)`, which throw on a missing term                                                                                  | `@fz/ui/testing`                                      | 7 of `figure`, 5 of `figures`/`tallyLines`, across bar, result and card specs                                                                                                      |
| 5.3  | `installFakeViewport()` restoring itself with `onTestFinished`, as `setPageVisibility()` does                                                               | `@fz/ui/testing`                                      | 28 hand-written `viewport?.restore()` calls in 21 spec files. Check that `onTestFinished` works from a `beforeEach` first.                                                         |
| 5.4  | `stylesheetPalettes(globalScss)`, giving `role()` and `rolesIn()`, plus `paintRoles()` cleaning up after itself                                             | `@fz/style/testing`                                   | Brick Breaker's and Asteroid Breaker's `src/testing/roles.ts` differ only in `ROLES`, and Snake writes the same inline in `board_palette.spec.ts:23-47`                            |
| 5.5  | `browserKey(code, key?)`: export the private `KEY_CODES` table                                                                                              | `@fz/phaser/testing`                                  | `SPACE = { key: " ", code: "Space", keyCode: 32 }` in three games, used 15 times                                                                                                   |
| 5.6  | `runShownScene(fake, board)`: the scene the fake canvas was shown, on the board's element, cleaned up with `onTestFinished`                                 | `@fz/phaser/testing`                                  | 4 copies in the three Phaser boards' and Asteroid Breaker's app specs                                                                                                              |
| 5.7  | `checkPhaserLayout(devtools, check)` with the 2× shapes and turns                                                                                           | `@fz/dev/layout`                                      | the same preamble and concatenation in Snake's, Brick Breaker's and Asteroid Breaker's `tools/check-layout.mjs`                                                                    |
| 5.8  | `SCREENSHOT_VIEWPORT`, a default margin on `thumbRegionAround()`, `siteImagesFolder(root, id)`, and `takenUpBoard(page, board, { score })`                  | `@fz/dev/screenshots`                                 | the viewport in all 5 scripts, the margin in 4, the folder in 5; the taken-up check in the 3 Phaser games                                                                          |
| 5.9  | `recordingPrinter()`: promote `printing()` from `lib/dev/src/screenshots.spec.ts`                                                                           | `@fz/dev/script`                                      | 4 copies in the tools' specs                                                                                                                                                       |
| 5.10 | `FRAME_MS`, `playUntil(game, steer, done, frameMs?)` and `playFor(game, ms, steer)`, over any game with a `tick(ms, steer)`, failing past a minute's frames | `@fz/game-ui/testing`                                 | Brick Breaker's and Asteroid Breaker's `src/testing/play.ts`, the same but for Brick Breaker's `frameMs`; each game keeps its own small levels or waves and the moves it steers by |
| 5.11 | `drawnIn(frame, kind, color)` and `frameNamed(frames, name)`                                                                                                | `@fz/phaser/testing/pure`                             | the same 15 lines in both breakers' `src/testing/art_frames.ts`                                                                                                                    |

## Phase 6: the Solitaire Collection onto the libraries

**6.1 The canvas's own cards.**

- `<fz-canvas-cards [canvas]="canvas">` in a `board-card-layer()`, as Snake's
  board has it, replaces `hasInitializationFailed` and `isSlow` and their
  branches in the placeholder. This fixes F1.
- The placeholder keeps the skeleton and "Loading Klondike…".
- The spec finds the alert by its role.

**6.2 Take `@fz/core`.**

- `seededRandom` (`src/engine/core/random/seeded_random.ts`) is Mulberry32,
  as `createRandom` is. One keeps its state unsigned, the other signed, and
  every step is taken mod 2³².
- Run side by side over 20,000 seeds (negatives, fractions, NaN and seeds of
  2³² and over among them), 200 draws each, the two never differed.
- Its one seeded use is Montana's gaps, drawn again from the stored order;
  deals use `Math.random()` and store the order dealt.
- **Pin Montana's gaps for a fixed deal in a spec before the swap.**
- Keep `shuffle()`, whose order differs from `shuffled()`'s and would change
  deals, and `seedFrom()`, which core has no match for.
- With the dependency in:
  - the local clamps (`pile_layout.ts:103`, `game_browser.component.ts:426`)
    become `clamp()`;
  - `table_felt.ts:21, 33-35` become `keysOf()` and `isKeyOf()`;
  - the hand-written plurals in `game_browser.component.ts` become
    `count()`.
- Amend `lib/core/AGENTS.md`'s note that the Solitaire Collection keeps its
  own seeded random.

**6.3 `formatClock()` for the clock.**

- `game_metrics.service.ts:106-113` writes its own `mm:ss`.
- Taking `@fz/game-ui/stopwatch`'s shows "0:05" for "00:05" and "1:01:15"
  for "61:15", as Minesweeper and Sudoku do (decision 2).
- Update the eight expectations in
  `test/ui/app/service/game_metrics.service.spec.ts`; the victory card
  follows on its own.

**6.4 The settings drawer's and option group's styles.**

- `settings_drawer.component.scss:5-63` re-creates `settings-drawer`, its
  scroll-fix comment copied with it.
- `option_group.component.scss` re-creates `setting-fields`, the choice list
  (4.2, step 1) and the segmented control (4.5).
- Taking the mixins renames a few classes (`.btn-close` → `.close`,
  `.setting-group` → `.setting`, `.setting-note` → `.setting-desc`) and
  saves about 130 lines.
- The games-follow-ups plan left this drawer alone because it would mean
  rewriting its template. Decision 3 reopens that: the choice-list mixin
  makes the change mostly renames now.
- Watch for one thing: the drawer's `below("phone")` padding has to move
  inside `.drawer`, which the mixin's nested header rule outranks otherwise.
- In the same pass, How to play's `&times;` close button becomes
  `<fz-icon name="close">` with `close-button`.

**6.5 The header's actions on `bar-actions`.**

- `header_bar.component.scss:96-130` hand-rolls the tap target, the turning
  gear and the round, label-hidden actions below `desktop`.
- Solitaire keeps its tighter gap through `--fz-bar-gap`.

**6.6 Dead and doubled CSS in `src/ui/app/styles/_animations.scss`.**

- `@keyframes pulse` is unused; its comment names the confirm dialog, which
  now uses `fz-pulse`.
- The reduced-motion block copies `@fz/style`'s `base/_document.scss`, whose
  layered `!important` already wins.

---

## Not lifted

Each of these looks like a copy but would need options, hooks or type
parameters to bridge games that differ on purpose:

- **`newGameQuestion()` for Minesweeper and Sudoku** (declined, decision 5).
  They copy `RunLifecycle`'s question with "game" for "run", but they don't
  extend it, the noun would become a parameter, and the wording is content.
- **The Solitaire Collection's header figures on `bar-figures`, and its
  victory card on `result-card`** (declined for now, decision 5).
  - The figures are `role="status"` live regions, which can't sit in a
    `<dl>`. Moving them means announcing through `AnnouncerService` first.
  - The card's one sunken well would become separate cards, which is a
    design call.
- **A base scene class.** The three scenes share an outline (create,
  measure, bake, paint, listen), but every step diverges:
  - Brick Breaker: finger room and a field that reshapes.
  - Asteroid Breaker: two cameras, the deck and the torus.
  - Snake: no `FieldPlay` and no held keys.

  A base would need about eight hooks. 3.2 and 2.6 take what is truly common.

- **A shared `Painter` or `TagPainter`.** The interfaces share one method,
  and the tags differ in placement, color, zoom and the effect they read.
  Only the arc (3.3) is common.
- **Steering as a whole:** Brick Breaker's taps and drags, Asteroid
  Breaker's stick, deck and mouse aim, and Snake's swipes. Only the held
  keys (2.2) are common.
- **The breakers' bar, result and board-card components.** The 88-line
  overlap is the same layout over different content (pilots and balls,
  sectors and levels, the Custom slider). The content projected into
  `<fz-game-bar>` is fine as it is.
- **A wrapper for the bar's trailing actions.** It would project as one
  node, which `bar-actions` couldn't reach, as `bar_pause`'s doc explains.
- **A base for `app.component.ts`, and the settings and stats services.**
  About 10 shared lines each, and `storedSignal()` already is the
  abstraction.
- **The breakers' per-speed stats** (`withRunStarted()`, `isNewBest()`). A
  shared version needs three type parameters to save about 20 lines.
- **The run state machines, saved-game validators, field events, data-file
  loaders (`poolOf`), progress rules and announcer phrasing.** Each is game
  rules or wording over helpers core already holds.
- **`Draws` and `nextDraw()`.** Brick Breaker's seed sits under `setup`, so
  sharing touches about 38 call sites to save 6 lines.
- **`Span`, `swing()`, a shared detune, `hiddenImages()` and `onPointers()`.**
  Each saves two or three lines a site.
- **Snake's stepper, and `sweepShot()` with `sweepPoint()`.** Already weighed
  and kept apart in the Asteroid Breaker review.
- **The autopilots, picture parsers, `holdEvery*()`, kept runs and report
  scripts.** These are game content; the reports already share
  `@fz/dev/report` and `/script`.
- **The configs and `test-setup.ts`.** They are already thin calls on
  `@fz/dev`'s presets, and a further layer would hide what each checks.
- **In the Solitaire Collection:**
  - The JSON reader, whose errors name the path that bug reports rely on.
  - `shuffle()` and `seedFrom()`.
  - The header's markup.
  - The rail's placement.
  - The Phaser adapter's textures, drawn asynchronously or resized in place.
  - The tabbed rules book.

## Order

1. **Phase 0 and Phase 1.** One small branch: the fixes, plus the moves that
   need no design.
2. **Phase 2 and Phase 3.** One branch over the three Phaser games, since
   2.1, 2.2 and 3.2 touch the same scenes and views.
3. **Phase 4.** One branch, in this order:
   - 4.1 first.
   - 4.2 and 4.3 together, being the largest template change; 4.8 follows
     them, the same move for How to play. Adopt 4.2's step 1 before Phase 6's
     6.4.
   - 4.7 as a spike in Snake, adopted by the others only if it reads better
     there.
   - 4.10 last, since it touches the site's `index.html` as well as the six
     games'.
4. **Phase 5.** One branch, any time after Phase 1; it touches only specs and
   tools.
5. **Phase 6.** One branch: 6.1 first, as a fix, then 6.2 with its pinning
   spec, then the styles.

Every phase ends as the others did: `yarn verify`, `yarn check:layout`, and
each touched game played in a browser at a roomy window and an upright and a
sideways phone.

## Decisions

The user decided these on 2026-11-09:

1. **Sudoku's hint sheet and result dialog (F3, 4.6): yes.** They stop the
   clock, as every other dialog does: Sudoku takes
   `DialogService.anyOpen()` and `refocusWhenUncovered()`.
2. **The Solitaire Collection's clock (6.3): yes.** It takes `formatClock()`,
   so "00:05" becomes "0:05", as in Minesweeper and Sudoku.
3. **The Solitaire Collection's drawer (6.4): yes.** The earlier decision to
   leave it alone is reopened; it takes `settings-drawer`, `setting-fields`,
   `choice-list` and `segmented`.
4. **How to play's pictures (F4): yes.** Brick Breaker draws them only while
   How to play is open, as Asteroid Breaker does.
5. **The items left open:**
   - **Taken:** the saved game's skeleton, as a spike first (4.7); How to
     play's frame (4.8); the overflow menu's shared items (4.9); the head
     tags `fuzzleyStyle()` owns (4.10); the breakers' frame loops (5.10);
     and the art frames' readers (5.11).
   - **Declined:** a shared new-game question for Minesweeper and Sudoku,
     and the Solitaire Collection's header figures and victory card, both
     under Not lifted.
