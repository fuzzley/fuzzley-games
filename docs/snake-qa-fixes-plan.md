# Plan: fixing what the Snake QA found

Written 2026-10-29 from `docs/snake-qa-findings.md`, against `main` at
`6565c77`. It fixes all twelve findings, in thirteen steps, each a commit on
a branch `snake-qa-fixes` cut from `main`, to be fast-forwarded into `main`
at the user's word, which puts it live. Where a finding offered options,
this plan takes the findings' recommendation; the choices that are the
user's are under "Decisions", each with the default this plan assumes.
Paths are relative to `frontend/`.

## Where things stand

- **Three findings are in the libraries,** so other games share them:
  the canvas left at a mid-turn size (finding 1) is `@fz/phaser`'s
  `ViewportScaler`, which the Solitaire Collection uses too; the failure
  card on a slow download (finding 2) is `<fz-phaser-canvas>`'s timeout,
  which the Solitaire Collection reports as "Board initialization timed
  out"; and the rail's cut-off ⋮ button (finding 4) is `@fz/game-ui`'s
  rail, which Minesweeper shows too.
- **`main` is ahead of the build tested.** The speed badge now opens a
  menu (`<fz-bar-choice>`) and stands 30 px tall on the rail rather than
  18, so Snake's rail needs 370 px: its ⋮ button spans 318 to 362 px at
  every short size, measured on a local build of `6565c77`. Finding 4 now
  bites at 640 × 360 and 750 × 342 as well as 320 px tall.
- **The layout check missed every layout finding.** `yarn check:layout`
  loads each game fresh at three shapes (`SHAPES` in
  `lib/dev/src/layout.ts`: 1280 × 800, 390 × 844, 844 × 390). None turns
  the phone, none is a small phone, and none looks at the bar.
- **The keys can't start a run before the scene arrives** (finding 8): they
  and the swipes reach the game through the scene's input. Only the
  on-screen arrows, which call `GameService.turn()` from the shell, can.
- **The QA's documents are untracked:** the two plans, the findings and
  three screenshots in `docs/`. The branch commits them first.

## What the player gets

- Turning the phone pauses the run, and the board comes back at full size.
- A slow connection sees "Still loading the board", never a false failure,
  and the arrows wait for the board.
- Small phones get a usable board: 17 px squares or more on an iPhone SE in
  Safari, upright or sideways.
- The ⋮ button is always on screen; on a short phone held sideways the link
  home moves into its menu.
- After a game ends, the board says how to play again, and Enter or Space
  does it.
- A stray click beside the board, or Tab to the arrows, no longer strands
  the keys; the direction back goes on from a pause.
- A few words put right, and nginx stops naming its version.

## The changes

### 1. The canvas sized where the layout settles (finding 1)

`@fz/phaser`. **Change:** in `lib/phaser/src/host/viewport_scaler.ts`,
`start()` watches the parent first, and listens to the window's `resize`
only when `watchParent` returns null (no `ResizeObserver`, or a parent that
isn't an element). `stop()` removes whichever it added. The pixel-ratio
media query stays, for a ratio that changes while the CSS size doesn't.

A `ResizeObserver` reports after layout, and again whenever the box ends a
frame at a size other than the one it last reported. So if the shell moves
the bar a frame after the window's `resize`, the observer reports the
in-between size and then the settled one, and the canvas follows both;
the window's `resize`, which comes before the shell has moved anything, no
longer sizes it on its own.

**Specs** (`lib/phaser/src/host/viewport_scaler.spec.ts`):

- With a watcher: the window's `resize` alone changes nothing, and the
  parent's report sizes the canvas. This replaces "resizes the canvas when
  the window resizes", "rewrites the CSS size on a resize taken at a pixel
  ratio of 1", "reads the inset afresh when the window changes size" and
  "ignores a count from before a resize the browser has yet to report",
  each now driven by the report, or the last by a change of pixel ratio.
- Without one (a watch that returns null): the window's `resize` sizes the
  canvas, as those specs did.
- The bug, as a spec: a 390 × 390 parent goes to 330 × 330, the window
  fires `resize`, and the parent goes back to 390 × 390 with no report; the
  canvas is still 390 CSS px.
- "releases every listener on stop", for both cases.

**Watch for:** the Solitaire Collection, whose canvas fills its stage.
Check it turns cleanly in emulation (see "Checking it").

### 2. A slow download is not a failure (finding 2)

`@fz/phaser`, Snake and the Solitaire Collection. **Change:**

- `lib/phaser/src/canvas/phaser_canvas.component.ts`: after
  `READY_TIMEOUT_MS` (8 s) with no scene, the canvas sets a new signal,
  `slow`, also on the element as `data-slow`, and stays `loading`. It
  reports `failed` when the source rejects, as now, or after a new
  `GIVE_UP_MS` of 60 s with no scene, for a download that hangs. A scene
  ready after either still settles `ready`, as now, and a new scene starts
  again at `loading`, not slow. `CanvasState`'s comment says so.
- Snake, `games/snake/src/app/board/board.component.{ts,html}`: the `Card`
  type gains `"slow"`, a card with `role="status"`: "Still loading the
  board" over "It can take a while on a slow connection.", with no button.
  The failure card, `role="alert"` with Reload, shows only on `failed`.
- The Solitaire Collection,
  `games/solitaire/src/ui/app/component/game_canvas/game_canvas.component.{ts,html}`:
  "Board initialization timed out" would now show only on a real failure,
  so it reads "The board couldn't be loaded. Reloading the page may help.";
  while slow, "Still loading {{ gameName() }}…".

**Specs:** `phaser_canvas.component.spec.ts`, with fake timers: slow at 8 s
and still loading; ready after slow is ready and no longer slow; a rejected
source fails at once; 60 s with no scene fails; a new scene clears slow.
Snake's `board.component.spec.ts`: the slow card is a status with its words
and no button; the failure card only on a failure (`FakeShownScene.fail()`
from `provideFakePhaserCanvas()`). The Solitaire Collection's game canvas
spec, for its words.

### 3. The link home leaves a short rail (finding 4)

`@fz/game-ui`, for every game. **Change:**

- `lib/game-ui/src/breakpoints/index.ts`: a new
  `HOME_BUTTON_MIN_RAIL_HEIGHT_PX = 380`, the height below which a rail has
  no room for the home button. Snake's rail, the tallest, needs 370 px with
  it. So 320, 342, 360 and 375 px tall phones lose it from the rail, and
  390 px and taller keep it. `_index.scss` gets the same height for the
  Sass below, and `breakpoints.spec.ts` holds the two equal.
- `lib/game-ui/src/viewport/game_viewport.service.ts`: a query for a window
  under that height, and `barHome` is `none` on a phone on its side below
  it, as it is on one upright under 360 px wide. Every game already leads
  its overflow menu with `withHomeLink()` when `barHome` is `none`:
  Snake's, Sudoku's and Minesweeper's `src/app/bar/bar.component.ts`, and
  the Solitaire Collection's `header_bar.component.ts`. Check each reads
  `barHome`, not `fitsHomeButton`.
- `lib/game-ui/src/game_bar/game_bar.component.scss`: below the same height,
  the rail's gaps go from `--fz-space-2` to `--fz-space-1`. Without the home
  button Snake's rail needs 318 px, which leaves 2 px at 320; the tighter
  gaps give back about 20 more.

**Specs:** `game_viewport.service.spec.ts` with `installFakeViewport()`:
`barHome` is `none` at 568 × 320 and 750 × 342, `icon` at 844 × 390, and
upright as before. One game's bar spec (Snake's) finds the link home in the
overflow menu at 568 × 320.

### 4. Arrows that give the board room (finding 3)

Snake. **Change:**

- `games/snake/src/app/arrows/arrows.component.scss`: `--arrow` stays 64 px,
  and drops to 44 px (with a 24 px icon, and `--fz-space-3` under the pad
  rather than `--fz-space-6`) on a short stage: under 560 px tall upright,
  or under 540 px wide on its side, read from the `stage` size container
  `app.component.scss` declares. The figures, in CSS px:

  | Size                           | Squares now | With 44 px keys |
  | ------------------------------ | ----------- | --------------- |
  | 375 × 553, iPhone SE in Safari | 13.5        | about 17.5      |
  | 568 × 320, sideways            | 14          | about 17.4      |
  | 320 × 480                      | 9           | about 13        |

  At 320 px wide the width already holds the board to 296 px, and the pad
  under it leaves about 224 px of height: no key size reaches 16 px
  squares there (decision 2).

- `games/snake/src/app/board/board.component.scss`: on a small board (the
  board's own size container under 280 px either way), the card sets
  smaller type and padding and sits centered rather than a quarter down,
  so it stays inside the board. That keeps the Ready card's words whole at
  320 × 480.

**Specs:** none in jsdom, which has no layout; step 5's check holds it.

### 5. Layout checks that turn the phone, try small phones and look at the bar

`@fz/dev` and every game's `check:layout`. It comes after steps 1, 3 and 4,
since it fails without them. **Change:**

- `lib/dev/src/layout.ts`: `SHAPES` gains "small phone portrait",
  375 × 553 (an iPhone SE in Safari), and "small phone landscape",
  568 × 320.
- Every check also fails on a button or link of `<fz-game-bar>` outside the
  window: a new function in `lib/dev/src/layout_page.ts`, run with
  `scrolling()` for every game, since every game wears the bar.
- `LayoutCheck` gains `turns`, pairs of shapes: the check loads the game at
  the first, waits until it is ready, switches the viewport to the second
  (`Emulation.setDeviceMetricsOverride`, with the screen's orientation),
  waits two frames and 500 ms, and runs the same inspections. It then turns
  back and runs them again. A `TURNS` export holds the phone, upright to
  sideways.
- Snake's `games/snake/tools/check-layout.mjs`: the turns, with and without
  the arrows. `inspectBoard()` also fails on a card that lies outside the
  board's rectangle. A shape of Snake's own, 320 × 480 with the arrows,
  holds its squares to 12 px rather than 16, and its card inside the board
  (decision 2).
- Sudoku's, Minesweeper's and the Solitaire Collection's checks get the new
  shapes and the bar check from `SHAPES` and `checkLayout()`. Run each: what
  fails is fixed in this step if it is small, or recorded for its game
  (decision 7). Minesweeper's ⋮ at 568 × 320 is fixed by step 3.

**Specs:** `lib/dev/src/layout.spec.ts`, for the bar check and the turns,
in the style of its present specs.

### 6. A turn of the screen pauses the run (finding 5)

Snake. **Change:** in `games/snake/src/app/app.component.ts`, an effect
follows `viewport.isPortrait()` and pauses the run when it changes, after
its first reading, beside `onVisibilityChange()`. `GameService.pause()`
already does nothing unless the run is playing, and says "Paused, with a
score of N…". The component's comment: "The run pauses whenever the page
is hidden or the screen turns".

**Specs:** `app.component.spec.ts`, with `installFakeViewport()`: mid-run, a
turn from 390 × 844 to 844 × 390 leaves the run paused and announced; at
Ready, a turn leaves it Ready.

### 7. The arrows wait for the board (finding 8)

Snake. **Change:**

- `games/snake/src/app/board/board.component.ts`: a public
  `drawn = computed(() => this.canvas().state() === "ready")`.
- `games/snake/src/app/app.component.html`: `<app-arrows [live]="board.drawn()" …>`.
- `games/snake/src/app/arrows/arrows.component.{ts,html,scss}`: a `live`
  input, true by default. While it is false a press does nothing, each
  button carries `aria-disabled="true"`, and the pad dims, after a 300 ms
  transition delay so a quick load shows no flash. After 8 s, step 2's slow
  card says why.

**Specs:** `arrows.component.spec.ts` or the app's, with
`provideFakePhaserCanvas()`: before the scene is ready, Up leaves the run
Ready and the arrows are `aria-disabled`; once `ready()`, Up starts it.

### 8. The room keeps the focus (findings 7 and 10)

Snake. Three parts, one commit.

- **A press that can't take the focus doesn't take it from the board.**
  `games/snake/src/app/app.component.ts`, a `(document:pointerdown)` host
  listener: while the focus is in the room (the board or an arrow), a
  primary press on something that can't take the focus (nothing in
  `button, a[href], input, select, textarea, [tabindex]` from the target
  up) is `preventDefault()`ed, which keeps the focus where it is. A click
  in the margins beside the board, or on the bar's Score, no longer pauses
  the run or strands the keys. A press on a control behaves as now, and
  the board itself has a `tabindex`, so its own `takeFocus()` still runs.
- **The room pauses as one.** The pause on losing the focus moves from
  `BoardComponent.onFocusOut()` to the room: `app.component.html`'s
  `.room` gets `(focusout)`, and the run pauses only when the focus leaves
  the board and the arrows together. Tab from the board to an arrow keeps
  the run going.
- **The game's keys work on a focused arrow.**
  `games/snake/src/app/arrows/arrows.component.ts`, `(keydown)` on the pad:
  `commandOfKey(event.code)` from `src/view/controls.ts`, skipping a repeat
  or a key with Ctrl, Alt or Meta as the scene does, goes to
  `game.command()`. The arrow keys and Space are `preventDefault()`ed, and
  so is Space's `keyup`, so Space pauses rather than pressing the focused
  arrow. Enter still presses the arrow, which turns its way.

**Specs:** the app's spec: a press on the stage beside the board mid-run
leaves it playing and the board focused; a press on a bar button still
does what it did. The arrows' spec: Tab from the board to Left keeps the
run playing; ↓ on the focused arrow turns down; Space pauses; Tab out of
the room to the bar pauses. The board's spec drops its focus-out specs to
the app's.

### 9. The direction back goes on (finding 9)

Snake's rules. **Change:** `games/snake/src/rules/run.ts`, `turn()`: on a
paused run, the direction back goes on straight ahead, without queuing a
turn. At Ready it still does nothing (decision 6). `GameService.turn()`
already says "Going on." when a paused run goes on, so the shell is
unchanged.

**Specs:** `run.spec.ts`, drawn with `runFrom`: paused heading right, ←
gives a playing run heading right with no turns queued; at Ready, ← gives
the same run back. `game.service.spec.ts`: ← on a paused run says "Going
on."

### 10. A card and keys for a new game after the end (finding 6)

Snake. **Change:**

- `games/snake/src/app/play/game.service.ts`: a `resultClosed` signal, true
  once `closeResult()` puts the card away and false again at each new run.
  `toggle()` (Space and P) on an ended run whose card is put away deals a
  new run. A new command, `"go"`, for Enter: it goes on with a paused run,
  deals a new one after the card is put away, and does nothing otherwise.
- `games/snake/src/view/controls.ts`: Enter is `"go"`. It isn't captured,
  since Enter scrolls nothing.
- `games/snake/src/scene/snake_scene.ts`, `onKey()`: Enter counts only when
  the board itself has the focus (the event's target is the keyboard's
  target), so Enter on a card's button, which sits inside the board,
  presses it once rather than twice.
- `games/snake/src/app/board/board.component.{ts,html}`: a card for an ended
  run once its result is put away: the result card's title ("Game over",
  or "You filled the board!"), "Score N", and a New Game button, which
  deals a run and gives the board the focus. The board's description (`#board-keys`) adds "After a
  game ends, Enter or Space starts another."

**Specs:** `controls.spec.ts` (Enter is `"go"`); `game.service.spec.ts`
(Space and Enter deal only after the card is put away; Enter goes on from a
pause; neither does anything at Ready); `snake_scene.spec.ts` (Enter from a
button inside the board sends nothing; from the board, `"go"`);
`board.component.spec.ts` (the card shows once the result is closed, not
before; its button deals a run and the board has the focus).

### 11. The words and sizes (finding 11)

Snake. **Change:**

- `src/app/settings/settings.component.ts`: "On a touch screen" reads "On a
  phone or a tablet."
- `src/app/board/board.component.{ts,html}`: the Ready card's line by the
  pointer and the arrows, with an `arrows` input from the app's
  `showArrows()`: "Swipe, or press an arrow, to start." on a touch screen
  with the arrows, "Swipe to start." without, and as now with a mouse.
- `src/app/help/help.component.html`: the Pausing paragraph adds P ("with a
  direction, Space or P, or Resume"); "W A S D" sits in a span that doesn't
  wrap; a row for starting again (New Game; Enter or Space), for step 10.
- `src/app/result/result.component.scss`: the other speeds' buttons at least
  44 px tall.

**Specs:** the settings spec's words; the board spec's Ready line at each
of the three (`setCoarsePointer()` from `@fz/game-ui/testing`); the help
spec finds P and the new row.

### 12. nginx's version off its pages (finding 12)

The image. **Change:** `server_tokens off;` in `nginx.conf.template`'s
server block, and `.github/scripts/check-image.sh` asks for
`/play/nope` and fails on a version in its body or in the `Server` header.
Docker is off on this machine, so CI is where the image check runs.

### 13. Docs

- **`AGENTS.md`s:** Snake's (the room pauses as one, a turn pauses, the
  arrows wait for the board, the slow and ended cards, Enter, and what
  `check:layout` now checks); `lib/phaser`'s (the canvas's `slow`, the 60 s
  give-up, and the scaler's sizing by the observer); `lib/game-ui`'s
  (`barHome` on a short rail, the new height, the tighter gaps);
  `lib/dev`'s (the shapes, the bar check, the turns).
- **Skills:** grep `snake-testing`, `phaser-core`, `fuzzley-ui` and
  `angular-testing` for what changed (`READY_TIMEOUT`, `resize`,
  `fitsHomeButton`, `onFocusOut`), then run
  `node .agents/check-skill-references.mjs`.
- **The QA's documents:** the findings say what fixed each, and this plan
  gets an "As built". Once it is live, all five move to `docs/archive/`,
  with the screenshots.

## Checking it

- `yarn verify` and `yarn check:layout`, from `frontend/`.
- **Snake in emulation,** on `yarn preview`, as the QA ran it: all 22 of
  the mobile plan's sizes; a turn of 390 × 844 at Ready, mid-run and with
  the ⋮ menu open; a cold load on "Slow 3G" with an arrow pressed early;
  Tab between the board and the arrows mid-run; a click in the margins at
  1920 × 1080; the ended card and Enter.
- **The other games:** the Solitaire Collection turned in emulation (step 1)
  and on "Slow 3G" (step 2's words); Minesweeper, Sudoku and the Solitaire
  Collection at 568 × 320 with the link home in ⋮ and nothing cut off.
- **Once live,** the real-device pass in the findings' "Not covered", first
  of all finding 1 on an iPhone and an Android phone.

## Suggested order

The commits, in order, each green on its own:

1. `docs:` the QA plans, findings and screenshots, as they are.
2. `fix(phaser):` the canvas sized by the observer (step 1).
3. `fix(phaser):` a slow scene is not a failure, with Snake's and the
   Solitaire Collection's words (step 2).
4. `fix(game-ui):` the link home leaves a short rail (step 3).
5. `fix(snake):` arrows that give the board room (step 4).
6. `test(dev):` layout checks that turn, try small phones and look at the
   bar (step 5).
7. `feat(snake):` a turn pauses the run (step 6).
8. `fix(snake):` the arrows wait for the board (step 7).
9. `fix(snake):` the room keeps the focus (step 8).
10. `fix(snake):` the direction back goes on (step 9).
11. `feat(snake):` a new game after the end, from the board (step 10).
12. `fix(snake):` the words and sizes (step 11).
13. `fix(nginx):` no version on its pages (step 12).
14. `docs:` the instructions, skills and QA documents (step 13).

Steps 2 to 4 and 12 touch different workspaces and could be built side by
side; 8 to 11 all touch Snake's board and shell, so they go one at a time.

## Considered and left alone

- **Measuring again a frame after `resize`,** or Snake re-applying on a new
  form factor (finding 1's B and C): a guess at Angular's timing, and a fix
  each game would have to remember.
- **Starting the 8 s from the code's arrival** (finding 2's C): it still
  leaves a long wait unexplained.
- **Hiding the arrows on small screens by default,** or a rail that scrolls
  (findings 3 and 4): the arrows are the easier way to steer, and a
  scrolling bar hides the button it can't fit.
- **Keys typed with the focus on `<body>` going to the board** (finding 7's
  B): WCAG 2.1.4, as the Sudoku QA found. Its C, words for a stranded
  board, isn't needed once a press no longer strands it.
- **A press on an arrow from the keyboard handing the focus back** (finding
  10's B): a switch user would have to Tab back after every turn.
- **A styled 404 under `/play/`** (finding 12's B): until the site has a
  static not-found page to serve.
- **What the QA noted but didn't call a finding:** two tabs, where the last
  to write wins; Snake's thumbnail, the only light one; the site's
  `llms.txt`; the wordmark's 34 px height on a 1366 px tablet; and the
  snake slowing under 6× CPU throttling, by design.

## Decisions

Each with the default this plan assumes.

1. **Finding 1:** size the canvas from the observer alone, which changes the
   Solitaire Collection's canvas too. Default: yes.
2. **Finding 3, the smallest phones:** at 320 px wide, the board can't
   reach 16 px squares with the arrows under it, whatever their size.
   Default: accept about 13 px there, with the card kept whole and Snake's
   check holding 12 px; or the arrows hidden by default on a screen that
   small.
3. **Finding 4:** the link home moves into ⋮ on a rail under 380 px tall,
   in every game, with tighter gaps there. Default: yes.
4. **Finding 5:** a turn of the screen pauses the run. Default: yes.
5. **Finding 6:** after an end, Space, P and Enter deal a new run, as well
   as the card's button. Default: yes; or Enter and the button only.
6. **Finding 9:** whether the direction back at Ready starts the run
   straight ahead too. Default: no, only from a pause, since a snake that
   hasn't moved has no "back" a player means.
7. **Step 5:** the new shapes and the bar check apply to every game's
   check, which may find problems in Sudoku, Minesweeper or the Solitaire
   Collection beyond Minesweeper's ⋮. Default: yes, fixing small ones in
   that step and recording the rest.
8. **Finding 12:** `server_tokens off;` now, the styled 404 later. Default:
   yes.
9. **Landing:** built on `snake-qa-fixes`, fast-forwarded into `main` and
   pushed at your word, which makes it live through the promote job.
