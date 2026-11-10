# Work log: Brick Fuzz Pop, view and shell stream

The view and shell stream's log of
[`implementation-plan.md`](../implementation-plan.md): its packages, what each
built, where it went other than planned and why, what the checks reported,
each review comment and what became of it, and the numbers worth keeping.

## Part 1

### L3: `@fz/game-ui/debug_menu`

**2026-11-10.** Asteroid Breaker's debug menu, lifted into the library and
adopted by both breakers.

**What was built.**

- `frontend/lib/game-ui/src/debug_menu/`, a new entry:
  - `DEV_BUILD` and `DEBUG_MENU`, the tokens Asteroid Breaker's `tokens.ts`
    held, so `DEBUG_MENU` is a development build or `?debug` in the page's
    address.
  - `createTuning(tuned)`, which returns a `Tuning<T>` (`tuning`, `retuned`,
    `tune(id, value)`, `reset()`, `onTune()`): Asteroid Breaker's
    `TuningService` and `isRetuned()` as a plain function, the game's own
    numbers kept nowhere.
  - `<fz-debug-tuning>` (`DebugTuningComponent<Id>`), Asteroid Breaker's
    menu with its numbers taken out: inputs `sliders` (`ShownSlider<Id>`, a
    `TuningSlider<Id>` with its `value` and `valueText`) and `lines`,
    outputs `tune` (`SliderMove<Id>`) and `resetNumbers`. It holds the
    sliders, an `<ng-content>` slot after them for a game's own controls,
    Reset the numbers, Copy the numbers, a `role="status"` line and a
    `<details>` with the lines, inside a region named Debug.
- **Asteroid Breaker adopts it entirely.** `tokens.ts` loses `DEV_BUILD` and
  `DEBUG_MENU` and gains `TUNING`, `createTuning(TUNED)` as a root token,
  which replaces `TuningService`. `app-debug-tuning` and its service are
  gone; the settings drawer shows `<fz-debug-tuning>` with the sliders, the
  lines of `tuning.ts`, and the shots' switch projected into its slot. Its
  rule that a run on retuned numbers keeps no records stays in
  `GameService`, unchanged. Its source, markup and styles shrank by about
  225 lines, not counting specs.
- **Brick Breaker adopts the tokens and its one slider.** `tokens.ts` loses
  its own `DEBUG_MENU`, which was `import.meta.env.DEV` alone, so the slider
  now shows at `?debug` in a production build too. The slider is
  `<fz-debug-tuning>`'s, named Ball speed (the "(debug)" in its name is the
  region's heading now), described by what it comes to at the run's speed,
  and the game gains Reset the numbers and Copy the numbers.
- Docs: `frontend/lib/game-ui/AGENTS.md` (the entry), its `package.json`'s
  description (its `exports` already map `./*` to `src/*/index.ts`), the
  `fuzzley-ui` skill (the description, its triggers, the library's row and
  a row of its own), and both games' `AGENTS.md`.

**Choices the plan didn't make.**

1. **`resetNumbers`, not `reset`, for the output.** `reset` is a DOM
   event's name, which `@angular-eslint/no-output-native` (in
   `tsRecommended`) refuses as an output's.
2. **A number or a switch.** The plan types `createTuning()`'s numbers as
   `Readonly<Record<string, number>>`, but Asteroid Breaker tunes a boolean
   too (`carryShip`), and an interface takes no index signature. So
   `T extends TunedValues<T>`, a mapped type of `number | boolean` over
   `T`'s own keys, which keeps `retuned`'s `!==` right.
3. **The "copied" state follows the lines.** Asteroid Breaker forgot a
   successful copy at each of its own actions; the library can't see a
   game's own controls, so it uses a `linkedSignal` over `lines`: a copy
   that worked is forgotten once the lines change, whatever changed them,
   and a failure stays, as the lines it shows follow the numbers.
4. **Asteroid Breaker's `Tuning` is now `Feel`,** since the library's
   holder is `Tuning<T>`. Its view keeps a `TuningSlider` of its own, the
   library's shape, as the view's fence takes no shell library, not even
   by type.
5. **Both games show the menu from their settings component.** Asteroid
   Breaker's wrapper would have had the library component's class name, and
   Brick Breaker's slider already lived in its settings.
6. **Brick Breaker's lines are `speed.ts`'s, not `tuning.ts`'s:** each
   preset speed's `base:` and `top:` at the scale, to three places, under
   the record that holds them (`SPEED_INFO.relaxed`, `NORMAL`, which Custom
   spreads, and `SPEED_INFO.fast`), since the ball's speeds live there. They
   sit in `src/app/settings/debug_tuning.ts` with the slider, typed by the
   library's `TuningSlider`, and its spec holds them to `speed.ts`'s own
   lines. The library's
   `<summary>` says "The lines to paste back", naming no file.
7. **A slider may have a description.** Brick Breaker's slider was
   described (`aria-describedby`) by what the scale comes to at the run's
   speed. `ShownSlider` takes an optional `description`, shown beneath the
   slider and linked to it, so the adoption loses nothing; U2's bored
   distance, which voids the certificates, needs the same. Added at the
   review.
8. **Brick Breaker's source grew by about 45 lines,** against the bar's
   "every workspace that adopts it gets shorter": it gains Reset and Copy,
   the lines Copy needs and the module that holds them. Its markup shrank.
9. **Brick Breaker keeps records at any scale.** At `?debug` in production
   the slider now reaches the player's real records, which a slower ball
   makes easier. Asteroid Breaker's rule against that wasn't asked of Brick
   Breaker, so the behaviour is unchanged and its `AGENTS.md` says so; it is
   the user's to decide.

**Checks** (after the second review's fixes):

- `@fz/game-ui`: lint and typecheck clean; `test:coverage` 330 specs in 27
  files, 100% of statements, functions and lines and 99.34% of branches (the
  one branch short is `bar_choice`'s, as before), over its floor of 100, 99,
  100 and 100. The entry's own specs are 36: the tokens 8, `createTuning()`
  8 and the menu 20.
- Asteroid Breaker: lint and typecheck clean; `test` 5221 specs in 95 files,
  `sim` among them.
- Brick Breaker: lint and typecheck clean; `test` 2034 specs in 61 files,
  `sim` among them.
- The root's `yarn lint` clean.

**The mutation pass.** 40 mutations, each run against the specs of what it
touched: the tokens' `||` and `?debug`, `DEV_BUILD`'s value, `retuned`'s
comparison and `some`, each `tell()`, `reset()`'s set, the listener's
removal, `tune()` spreading over the game's own numbers, both arms of the
copy's `linkedSignal`, the clipboard's check, a failure opening the lines,
the words, the moved value, each id, every binding of a slider, the slot,
the `<details>`'s toggle, the status's role, and each game's wiring (the
slider, the switch, Reset, the lines, the value's words, `TUNING`'s start,
Brick Breaker's range and rounding).

- **Survived, equivalent:** `if (!clipboard)` as `clipboard === undefined`,
  since the clipboard is an object or missing.
- **Would have survived, so specced before the pass:** two menus sharing the
  heading's id, since both headings say Debug (the spec now holds every id
  on the page apart); Asteroid Breaker's switch stuck on after Reset, since
  the specs read the numbers but not the box (it is now checked); and Brick
  Breaker's slider's range, which nothing read (its least, most and step
  are now).

**The review:**

1. **Brick Breaker's records are open to the slider at `?debug`.** Left as
   it is, and raised with the user. L3 asks for the slider at `?debug`, so
   keeping Brick Breaker's menu to development builds would undo what the
   plan asks. "L3 spelled out" says "Asteroid Breaker's rule comes with it",
   which could mean every game that takes the menu keeps no records from a
   retuned run; L3's own steps keep the rule in Asteroid Breaker and ask
   Brick Breaker for its tokens and slider alone, so it is read here as
   Asteroid Breaker's and Brick Fuzz Pop's. In Brick Breaker the rule would
   be new behaviour, and to hold through a reload the saved game would have
   to carry a flag, as Asteroid Breaker's does, which changes a stored
   format. Its
   `AGENTS.md` had two passages that disagreed ("keeps nothing" and "keeps
   its records"). They now both say it stores no scale, and that a run at
   one keeps its records.
2. **The sentence lost its link to the slider.** Fixed (choice 7):
   - `ShownSlider` takes an optional `description`. The menu shows it under
     its slider and links it with `aria-describedby`.
   - Brick Breaker passes its sentence without the "×1.50:" the value
     already shows.
   - Its specs query the slider by its description again.
   - The library specs one slider described and one not.
3. **The lines weren't held to `speed.ts`.** Fixed (choice 6):
   - The slider, `formatScale()` and `speedLines()` moved to
     `src/view/debug_tuning.ts` (and to `src/app/settings/` at the second
     review). Its spec holds each line to `speed.ts`'s own and the output at
     ×1.05.
   - Each header names the record that holds its numbers: `NORMAL` for
     Normal's, not a "normal" that `speed.ts` doesn't have.
   - The scale's words are written once.
4. **An import out of order** in Brick Breaker's settings spec: moved.

The fixes added API (`description`) and a module, so the change had a second
review. Its 8 mutations, all killed: the description given to every slider,
its link, its id, Normal's record's name, the slider's step, the scale's
places, a top off `speed.ts`'s, and the description ignoring Custom's
percent.

**The second review:**

1. **Brick Breaker's debug module sat in `src/view/` with a copy of the
   library's slider shape.** Moved to `src/app/settings/debug_tuning.ts`,
   where the shell may import the library: the slider `satisfies
TuningSlider<"ballSpeedScale">`, and `unitsOf()` joined `formatScale()`
   there, with a spec of its own. Asteroid Breaker's stays in its view, as
   it also gives the numbers to the field (`tuneField()`), which is the
   view's work.
2. **A slider's id could clash with the menu's own,** one named `heading`,
   or one named after another's description. Fixed: the input is
   `<menu>-slider-<id>` and the description `<menu>-description-<id>`, each
   kind under a word of its own. The review's `<menu>-slider-<id>-description`
   would still clash with a slider named `<id>-description`. A spec holds a
   menu of `heading`, `speed` and `speed-description`, the last two
   described, to six ids apart.
3. **Asteroid Breaker's `AGENTS.md` listed `TUNING` among what a spec hands
   in.** Fixed: it is one `createTuning()` of `TUNED`, made at the root,
   that the drawer and `GameService` share.
4. **Brick Breaker's debug specs leaned on the build being a development
   one.** Fixed: they provide `DEBUG_MENU` as true, and the spec without
   the menu is named "offers no debug menu where DEBUG_MENU says not to".
5. **Nits.**
   - `resetBallSpeed()`'s `setBallSpeedScale(1)` repeats `GameService`'s
     `signal(1)`. Left: a scale of 1 is the speed's own by what a scale is,
     not a tuned default, and the method's doc says so; a constant or a
     `resetBallSpeedScale()` would put a line into `game.service.ts`, which
     other streams touch, for no behaviour.
   - The library's `AGENTS.md` said "the game's own (`tuned`)": now "the
     game's own, as `tuned` gives them". Fixed.

Its 5 mutations: the input's id without its word, the description's as the
review had it, without the slider's id and without the menu's, and
`unitsOf()` to whole units. One survived, the description's id without the
menu's, as the two-menu spec's sliders had no description; they have one
now, and it is killed. These fixes are the ones the review asked for, the
ids' scheme a step past its own, so they had no third review.

### L8: icons and scene drivers

**2026-11-10.** Three icons for Brick Fuzz Pop's bar, and the drivers its
scene specs need for the wheel, a right click and a cancelled touch.

**What was built.**

- `@fz/ui/icon` gains `fast-forward` (play's arrowhead twice), `skip`
  (play's arrowhead against a bar) and `star` (five points), all three
  filled, as play and pause are and as the hearts are in a row. A new spec
  holds every icon to a drawing unlike any other.
- `@fz/phaser/testing`'s `SceneRun`:
  - `pointer()`'s fourth argument is now `PointerOptions`: `on`, the
    element it took before, and `button`, a `MouseButton` from 0 to 4, the
    main one when not given, which a press or a release names. Every event
    carries the buttons still held, each button's bit as a browser sets it
    (main 1, right 2, middle 4, back 8, forward 16), so a move with none
    pressed is a hover, and letting go of one of two leaves the other held.
  - `wheel(deltaY, x, y)` turns the wheel over the canvas, with the buttons
    held, which Phaser raises as `wheel` with the pointer at the point and
    the delta.
  - `touch("cancel", …)` sends `touchcancel`, the finger gone from
    `touches`, which no listener can stop, as a browser's, and which Phaser
    raises as a `pointerup` whose `wasCanceled` is true.
  - The two types are exported from `@fz/phaser/testing`.
- Brick Breaker's scene spec gains "doesn't launch at a press of" the middle,
  right, back and forward buttons, "doesn't launch at a touch the browser takes
  away", and "launches at a tap after a touch the browser took away", the first
  finger moved past a tap's reach before it is taken away, so a scene that kept
  it would refuse the tap. The scene already did the right thing in each: its
  `Steering` launches only at the main button and drops a cancelled tap. No game
  code changed.
- Docs: `frontend/lib/phaser/AGENTS.md`'s harness sentence, the
  `phaser-core` skill's "Input is a browser's", and
  `frontend/lib/ui/AGENTS.md`'s icon bullet, which names the filled ones and
  the new spec.

**Choices the plan didn't make.**

1. **`pointer()`'s element moved into an options object.** The plan asks
   for a `button` option; a fifth positional argument after an optional
   `on` would make a right click on the canvas pass `undefined` first. Four
   calls passed `on`: the probe's own, and three in Solitaire's
   `board_input_manager.spec.ts`, a press on the page's chrome, now
   `{ on: chrome }`. So Solitaire is a touched workspace.
2. **`buttons` is what is held.** The old driver sent 1 at every press and
   move and 0 at every release. Phaser's pointer takes `buttons` from each
   down, move, up and wheel event, and reads it for `leftButtonDown()`,
   `noButtonDown()` and the rest, so the driver keeps the buttons held in
   the run, as a browser does. No scene reads `buttons` today; Phaser's drag
   reads `primaryDown`, which only a press and a release set, so the
   hovers that now send 0 change nothing a spec saw.
3. **The star is filled.** It will sit small in a row, as Minesweeper's
   hearts do, where an outline thins away.

**Checks** (after the review's fixes):

- `@fz/ui`: lint and typecheck clean; `test:coverage` 315 specs in 24
  files, 96.81% of statements, 86.84% of branches, 99.21% of functions and
  98.17% of lines, over its floor of 96, 84, 99 and 97.
- `@fz/phaser`: lint and typecheck clean; `test:coverage` 637 specs in 50 files,
  99.17, 95.82, 99.72 and 99.55, over its floor of 99, 95, 99 and 99.
  `run_scene.ts`'s one line not run is the start's timeout, as before.
- Brick Breaker: lint and typecheck clean; `test` 2040 specs in 61 files,
  `sim` among them.
- Solitaire: lint and typecheck clean; `test` 6874 specs in 172 files.
- The root's `yarn lint` clean.

**The mutation pass.** 16 mutations: the default button, the button given
ignored, `buttons` always the main bit, the middle's and right's bits
swapped, back's as forward's, a button held at a release, the wheel turned
the other way, at `y` for `x`, or sent as a mouse move, a cancelled finger
left in `touches`, the star outlined, fast-forward drawn as play, skip
without its bar, fast-forward out of the names, and in Brick Breaker's
`Steering` any button launching and a cancelled tap launching.

- **Survived, so specced:** fast-forward drawn as play. The spec of
  drawings unlike any other compared each svg's `innerHTML`, which holds
  an anchor for every `@case`, at a place of its own, so no two icons'
  could match. It now compares the shapes alone, and the mutation is
  killed.
- **Survived, equivalent:** a cancelled finger left in `touches`, since
  Phaser reads only `changedTouches` at a `touchcancel`; and skip without
  its bar, still a drawing of its own, which no spec can call wrong.

**The review:**

1. **Solitaire's specs still passed the element as the fourth argument.**
   Three presses on the page's chrome in `board_input_manager.spec.ts`
   would have failed its typecheck, and at run time pressed the canvas
   instead. Fixed: `{ on: chrome }`, and Solitaire's lint, typecheck and
   tests run with the rest. The search before the change looked for a
   fourth argument after two plain ones, and Solitaire's spread
   `...inside(sprite)`.
2. **"Launches at a tap after a touch the browser took away" passed with
   the cancelled finger kept,** as Phaser hands the next finger the same
   pointer and the tap then looks fresh. Fixed: the first finger moves 30
   pixels before it is taken away, so a kept one has gone too far for a
   tap. The review's mutation, a cancelled finger never let go, is killed.
3. **`buttons` followed the call, not what was held:** a hover sent 1, the
   wheel 0 with a button down, and letting go of one of two buttons 0.
   Fixed: the run keeps the buttons held, a move names no button, and the
   wheel carries them. Specs: a hover, a right-button drag and a hover
   after it (`[0, 2, 0]`), the wheel with the middle button held, and
   letting go of the right button with the main one still down.
4. **A `touchcancel` could be stopped,** which a browser's can't. Fixed,
   with a spec that reads `cancelable` off the event.
5. **Nits,** all fixed: fast-forward's comment no longer says its
   arrowheads are play's; `FILLED`'s comment is split in three; the
   `pointer()` doc gives the buttons a paragraph of their own; and the
   unwrapped lines in `frontend/lib/phaser/AGENTS.md` and this entry are
   wrapped.

After the review, 7 more mutations: a cancelled finger kept in Brick
Breaker's `Steering`, a release clearing every button, a press forgetting
those held, the wheel holding none, a move naming the button given, a
cancel that can be stopped (before its spec), and the default button the
right. One survived, equivalent: a move naming the button, since Phaser's
pointer takes no `button` from a move. The cancel's `cancelable` survived
too before its spec, as Phaser's `preventDefault()` there only skips its
window handler's second, empty, pass; the spec kills it. The fixes are the
ones the review asked for, in the files the change already touched but
Solitaire's spec, so they had no second review.

## Part 2

### V1: the field's shape and metrics

**2026-11-10.** `fieldShape()`, `fieldMetrics()`, `toCanvas()` and
`toField()` in `src/view/field/field_metrics.ts`, by "The field" and answer
1, specced at every row of `plan.md`'s table of shapes.

**What was built.**

- `fieldShape(viewport)`: the room is `roomInside()`, the canvas inside the
  insets the board declares; the unit is the smaller of the room's width
  over 9 and its height over 12.1 (11 rows, the band's 0.6 and the lintel's
  0.5), in whole device pixels; the depth is as many whole rows as the
  height holds past 1.1 units, 11 to 22; what is left thickens the band to
  1.1, then the lintel; `panels` where a panel 12 CSS px from the cells
  would be 172 wide or more, which is 184 spare a side.
- `fieldMetrics(viewport, shape)`: the cells centered across the room on
  whole device pixels, the lintel's top to the band's bottom centered down
  it (filling it, on the room the shape was made for), and the panels
  either side, as tall as the field from the lintel's top to the band's
  bottom, through `cssRectOf()`.
- `hasRoom(viewport)`: whether the canvas has room inside its insets, which
  a hidden board's has not.
- `toCanvas()` and `toField()`, between field units (y up from the floor)
  and device pixels.
- Added to the contract file beside V1's four: `Place`, `MARGIN_CSS_PX`
  (12 compact, 24 roomy), `FRAME_CSS_PX` (2), `FLOOR_BAND` (0.6 to 1.1),
  `LINTEL` (0.5 to 1), `PANEL_GAP_CSS_PX` (12), `PANEL_WIDTH_CSS_PX` (172
  to 320), `hasRoom()`, `lintelPixels()` and `bandPixels()`.
- `src/testing/canvases.ts`: `boardCanvas()`, the canvas a board has in a
  window, less the bar (73 CSS px roomy, 60 compact) or the rail (64) on a
  compact screen on its side, its insets the margin, and `CHROME_CSS_PX`;
  `canvases.spec.ts` holds the three numbers to `@fz/game-ui`'s Sass, the
  roomy bar and the rail through the app's `global.scss` and the compact
  bar through `src/testing/compact_bar.scss`, which includes
  `bar-size($compact: true)` until U1's `game-frame` publishes it.
- `tsconfig.spec.json` takes `rewriteRelativeImportExtensions`, as K1 said
  a spec importing `@fz/dev/layout` needs.

**Choices the plan didn't make.**

1. **The margin is the canvas's insets,** as Brick Breaker's `--room` is:
   the board declares `MARGIN_CSS_PX` as `--fz-canvas-inset-*`, so
   `fieldShape(viewport)` needs nothing beyond §5.4's one argument.
2. **The frame isn't taken from the room.** The table's numbers keep the
   room whole: a roomy window's 679 CSS px hold 56 px a unit only without a
   2 px frame top and bottom (675 / 12.1 is 55.8), and its panels' 231 and
   297 are measured from the cells. So the frame lies in the margin, and
   `fieldShape()` uses `roomInside()` but not `framePixels()`, which V1
   names; S1 draws the frame at `framePixels(FRAME_CSS_PX, ratio)`. A spec
   holds the frame narrower than the least margin and the panels' gap.
3. **The band and the lintel are exact in units,** as the rule gives them,
   so the table's one-place figures are theirs (a tall phone's band is
   0.851, "0.9"). `lintelPixels()` rounds the lintel up, never under half a
   unit, and `bandPixels()` the band down; on the room the shape was made
   for, they fill what the room spares the cells to the device pixel (the
   tall phone's 18.5 and 31.5 px are 19 and 31). S1 and the board take
   them rather than rounding their own.
4. **Past 22 rows,** where the cap leaves more than "a row's worth", the
   band is 1.1, the lintel 1.0 (`LINTEL.most`, the most it takes under the
   cap too) and the field centered in the room.
5. **A shape on another room,** as a round flies on through a resize, keeps
   its depth, band and lintel, as "the flight ends in the field it began
   in", and its unit too while the field overruns the room by a CSS pixel at
   most, counted in whole device pixels (`Math.ceil()` of the ratio, as
   `widthOf()` counts one), which the margin takes; so a pixel's jitter, or
   the first pixel of a drag, bakes no art again. A room that grows keeps
   the unit until the round ends. A field that overruns by more, or a pixel
   ratio changed since, takes the largest whole unit that fits, as Brick
   Breaker's `fieldMetrics(viewport, down)` does. The panels follow the
   metrics' own spare, so `shape.panels` and `metrics.panels` can differ
   mid-flight either way, and U1 places and shows the panels from
   `metrics.panels`.
6. **The panels' spare is the narrower side's,** an odd pixel going to the
   right, and both panels take its width; the gap and the widths are whole
   device pixels.
7. **`toCanvas()` and `toField()` take an optional place to write into,**
   after Asteroid Breaker's (whose is required; optional here, so §5.4's
   form stands), so S2 can place sixteen fuzzballs a frame without
   allocating; called with three arguments, they make a new place, which
   their doc says a frame's drawing never asks for.
8. **Whole numbers within 1e-6,** Asteroid Breaker's `wholePixels()`: a
   unit is a whole number of a quotient a hair under one (760 / 19 may
   round to 39.999…), and a spec holds 617 / 12.1, a hundredth under 51,
   to 50.
9. **A room with no area** gets the least field at a unit of a device pixel.
   §5.4's `fieldShape()` takes no last shape, as Asteroid Breaker's does, so
   `hasRoom()` says when a caller keeps the shape and the layout it has and
   lays nothing out: a hidden board's zero box would otherwise send the
   wall's top rows over the ceiling, and `fieldMetrics()` on it would bake
   the art at a pixel a unit.
10. **"A resize of one pixel changes neither the depth nor the unit" is
    held at the table's thirteen windows,** a CSS pixel wider, narrower,
    taller and shorter. No spec can hold it everywhere: at 2× a small
    phone on its side has 592 device px down, 48.9 units, and a CSS pixel
    taller makes 49. A whole unit changes only at such a step, never at
    every pixel as Asteroid Breaker's fraction did.
11. **The bar's sizes are the spec helper's** (`CHROME_CSS_PX`), the
    numbers the table's rooms were worked out from, held to `@fz/game-ui`'s
    as Asteroid Breaker's `canvases.spec.ts` holds its own.
12. **No `frame.ts` or `layers.ts`.** `plan.md`'s W7.1 names them; §6's V1
    doesn't, K2's `RoundView` is what `frame.ts` was, and the layers are
    the scene's (S1).

**Checks** (after the reviews' fixes). The workspace's `lint` and
`typecheck` pass; `test:coverage` passes, 1431 tests in 14 files,
`field_metrics.spec.ts` 998 of them (the table's rows, the resize at each,
the unit kept through a pixel's resize mid-flight at 1×, 1.5×, 2× and
2.625×, the layout check's twelve shapes, and rules held over 72 rooms at
1×, 2× and 2.625×) and `canvases.spec.ts` 6; `field_metrics.ts` and
`canvases.ts` at 100% of statements, branches, functions and lines. The
root's `yarn lint` passes.

**The mutation pass.** 67 mutants of `field_metrics.ts`: the least unit,
the columns, the least field down, the tolerance, the depth's clamp and
its rounding, the spare's floor, the band's and the lintel's shares and
bounds, every constant, the panels' test, gap, widths, places and height,
the metrics' unit, top, ceiling and spare, both roundings of the pixels,
and both ways of `toCanvas()` and `toField()`. 62 were killed at once. Five
survived and got specs: a tolerance of 1e-2 (617 / 12.1), `fieldMetrics()`'s
least unit of 0 (a room with no area), the odd pixel down set above the
field rather than below (a shrunk room's field, now held to the pixel), the
panel's least width not scaled by the pixel ratio (183 spare at 2×), and
the shape's pixel ratio always 1 (a phone at 2×, 81 device px a unit). None
is equivalent.

The review's fixes were mutated too: 22 mutants of the unit a shape keeps in
another room, `hasRoom()` and the helpers the unit's fit and the field's
height moved into, and the first 67 run again on the reworked code. Six
survived and got specs: the width's slack dropped, ignored, doubled or one
device pixel at 2×, the height's slack doubled (a field filling its room's
width, 384 CSS px across, in rooms a pixel and two narrower and shorter, at
1× and 2×), and the refit's tolerance dropped (a shape made at 1× refitted
at 2×, 766 / 12.77 being 59.999…). After the second review, seven more of
the slack (the ratio as it is, rounded down, one more, none, dropped down or
across, the ratio's check) were all killed, the first by the table's resize
at 2.625×. Every mutant of every pass is killed.

**Numbers worth keeping.** At 2×, a phone upright is 81 device px a unit
(40.5 CSS), 17 deep, its lintel 0.66; a small phone on its side 48 (24
CSS, the layout check's floor exactly); a tablet on its side 115, its
panels 295 CSS px.

**The review:**

1. **A field a pixel shorter than its shape's room dropped the unit
   mid-flight,** since the shape fills its room exactly: the upright phone's
   on a room of 759 refitted to 39, baking the art twice and jumping the
   field. Fixed: `fieldMetrics()` keeps the shape's unit while the field
   overruns the room by a CSS pixel at most, in whole device pixels, and in
   a larger room, refitting only past that or at another pixel ratio (choice
   5). Specs: every row of the table, a CSS pixel narrower and shorter, at
   1× and 2×; the edges of the slack; a larger room; a changed pixel ratio.
2. **A room with no area gave a plausible shape with no way to tell.**
   Fixed: `hasRoom()`, which `fieldShape()`'s doc names (choice 9), with
   specs.
3. **`CHROME_CSS_PX` wasn't held to `@fz/game-ui`.** Fixed:
   `canvases.spec.ts` compiles the app's global stylesheet for the roomy
   bar and the rail, and `compact_bar.scss` for the compact bar until U1's
   frame publishes it.
4. **The optional `into` hides an allocation.** Left: §5.4 gives the
   three-argument form, so the default stays; the doc now says a frame's
   drawing passes a place (choice 7).
5. **Nits.** The unit's fit is said once (`unitFitting()`), and
   `fieldMetrics()`'s doc says the field fills its room "unless the most
   rows leave some spare". The spec that holds the frame narrower than the
   least margin and the panels' gap compares constants; it stays, as it
   holds the rule choice 2 rests on, which no layout reads.
6. **On the choices,** the reviewer agreed with the rest, and asked for
   choice 5 to say U1 shows the panels from `metrics.panels`, which it now
   does.

**The second review** (the first's fixes reshaped the change):

1. **At a fractional pixel ratio a CSS pixel shorter still refitted the
   unit,** as the slack was the ratio itself and a CSS pixel there is 2 or
   3 whole device pixels at 2.625 (an upright phone's room of 1994 going to
   1991 refitted 106 to 105). Fixed: the slack is `Math.ceil()` of the
   ratio, and the table's resize mid-flight runs at 1.5× and 2.625× too.
2. **`hasRoom()` kept the shape but not the layout,** while choice 9 said
   it kept the art from baking at a pixel a unit. Fixed: its doc says a
   caller keeps the shape and the layout and lays nothing out, and choice 9
   says so.
3. **One `it.each` named for the kept unit also held the refits.** Fixed:
   split in two.
4. **Choice 7 called the optional place Asteroid Breaker's pattern,**
   whose is required. Fixed in the wording.
5. **The margin's insets were written three times.** Fixed:
   `marginInsets()` in `src/testing/canvases.ts`, used by the helper and
   both specs.

### V2: steering

**2026-11-10.** `src/view/steering/controls.ts` and `steering.ts`: the keys
by `event.code`, and `Steering`, which turns the keys, the mouse and the
fingers into the shot being aimed a frame at a time, by "Controls", C7 and
C8.

**What was built.**

- `controls.ts`: `commandOfKey()` (`RUN_KEYS` spread in, X skips, R reads
  the wall's lowest rows), `steerKeyOf()` (the arrows, A, D, W and S, and
  Space) and `heldKeyOf()` (F, fast-forward, for `HeldKeys`), with their
  names, `FieldCommand`, `SteerKey` and `HeldKey`. They match the
  integrator's table and `plan.md`'s "Controls" and "Accessibility".
- `steering.ts`: `PointerView` (`id`, `x`, `y`, `wasTouch`, and Brick
  Breaker's `button` and `wasCanceled`), `KeyPress`, `Steer` (`aim`,
  `charge`, `release`, `fast`, `keyed`), `aimToward()`, `chargeAfter()`,
  `PointerAiming`, `PointerAimings`, `BY_POINTER`, `DEAD_ZONE` (0.5),
  `PULL_NOTCH` (0.9), `HOLD_NOTCH_MS` (250), `EDGE_CSS_PX` (16),
  `MOST_FINGERS` (2), `STRAIGHT_UP` (328) and `Steering`:
  `keyDown()`, `keyUp()`, `pointerDown()`, `pointerMove()`, `pointerUp()`,
  `wheel()`, `callOff()`, `letGo()`, `measure()`, `aimWith()` and
  `read(deltaMs, from)`.
- No contract file is touched; every name is the view's own and new.

**Choices the plan didn't make.**

1. **One way of aiming per kind of pointer** (`PointerAimings`, `mouse` and
   `finger`), handed in by `aimWith()`; `BY_POINTER` is the settings'
   "by the pointer", which U1 resolves to it. A pointer takes its way as it
   presses, so a setting changed mid-press waits for the next.
2. **Escape (C8) lives in `Steering.keyDown()`,** not in `GameService`: the
   pause key while a charge builds (a pointer pressed, or a charge the keys
   chose) calls it off and is taken, so the scene hands the shell "pause"
   only otherwise. Only the steering knows whether a charge builds, so
   `GameService` would otherwise have to ask the scene. `plan.md`'s
   "Controls" and C8 say `GameService` overrides `command()` for it; U1
   needs no such override for Escape. The steering doesn't know the
   round's phase: a charge keyed during a flight is the next shot's, and
   Escape calls it off rather than pausing, as it does any charge building;
   the scene reads the steering every frame, as Brick Breaker's does, so a
   shot let fly under a card reaches a paused round, which ignores it; and
   the round reads a shot let fly only while it aims (V3). The class's doc
   says what the scene owes it.
3. **The charge resets to none after each shot** and as a press starts, so
   a pull back or a hold begins from nothing whatever the keys chose; the
   aim stays where it was.
4. **Point and hold flies at the charge the meter last showed,** which
   counts the frames' time in `read()`, the clock Space flies by too, so
   what the player sees is what flies, at 30, 60 or 144 frames a second
   alike. The hold goes 0 to 5 and back to 0 every 2.5 s. So `PointerView`
   leaves out the `downTime` and `upTime` V2 names: nothing reads them
   (the review's 2).
5. **A pointer aims from where the fuzzball waits,** which
   `read(deltaMs, from)` takes each frame. §5.4's scene options don't give
   the scene that place (`RoundStart.x`, which V3's run state holds), so
   S2 needs one added. A mouse at rest is aimed at again as the fuzzball
   waits somewhere new, until the keys, the wheel, a drag, or settings that
   no longer have it point aim instead; a finger isn't, as it is lifted
   (or, held through a round's end, until it moves). A mouse's press
   doesn't aim, since its moves have, so a nudge of the wheel or the keys
   since flies. A pointer within a radius of the fuzzball's middle keeps
   the aim, so a press on the fuzzball doesn't swing it.
6. **A press anywhere on the canvas starts a shot,** not only on the field,
   as Brick Breaker's does. A shot flies as its last move left it, wherever
   it is let go (Phaser's up-outside, which S2 hands `pointerUp()`): a
   finger's moves go on past the canvas, as a touch stays with the element
   it began on, so "the canvas keeps the pointer" holds for it; Phaser
   hears a mouse move only over the canvas, so a mouse's guide stops at its
   edge, and the shot flies as the guide showed, not from where it is let
   go over the bar. S2 may capture the pointer so a mouse's moves past the
   canvas arrive too.
7. **The 16 CSS px are from the canvas's sides,** for a finger only, since
   the view knows the canvas and not the screen; on a phone upright they
   are the screen's. On a phone on its side the rail's side is held too,
   inside the 12 CSS px margin and 4 more. `measure(metrics, canvas)` takes
   the canvas with the metrics.
8. **A second press calls the shot off,** whichever pointer it is, which
   needs the scene to follow two fingers (`MOST_FINGERS`, as Asteroid
   Breaker's scene adds pointers for its own), since Phaser follows one
   unless told; a finger left to the browser at a side is not a press, and
   its moving and letting go are ignored.
9. **The mouse's right button calls a charge off,** pressed or with the
   keys' charge; the middle, back and forward buttons do nothing, and
   letting go of one while the main button is held flies nothing.
10. **The wheel turns one aim per event,** away from the player turning
    left, as a pointer's aim does; a sideways scroll, no turn up or down,
    does nothing. A trackpad's flick sends dozens of events, each an aim;
    a playtest may ask for the turn to follow the scroll's size instead.
11. **Space lets a held press fly too,** at the charge the meter shows, and
    the first shot let fly in a frame is the one `read()` hands on, at the
    aim and charge it flew with.
12. **`Steer.keyed`** says the keys changed the aim or the charge this
    frame, for the shell's announcer, so a pointer's aim, which moves
    every frame, isn't read out.
13. **A heading under the floor's line takes the end on its side,** and
    straight down the right-hand one (aim 0). Aims are snapped with
    `tuning.ts`'s constants (`FIRST_AIM_DEGREES`, `AIMS_PER_DEGREE`)
    rather than searched in `AIMS`, which is the same aim for every angle
    the specs try.

**Checks.** The workspace's `lint`, `typecheck`, `test` and
`test:coverage` pass, after both reviews' fixes, 2334 tests in 25 files,
160 of them new (`controls.spec.ts` 29, `steering.spec.ts` 131);
`controls.ts` and `steering.ts` at 100% of statements, branches, functions
and lines. The root's `yarn lint` passes.

**The mutation pass.** 90 mutants of `steering.ts`: the floor's wrap,
the aim's rounding and clamps, the hold's cycle, notch and triangle, the
charge's steps, each key's taken and its step, Shift, the repeat, the first
release, Escape's two conditions, every button test, the side test and its
scaling, the second press, each pointer's way and id, the cancelled touch,
the meter's clock, the dead zone's bound and charge, every reset in
`callOff()`, `letGo()` and `read()`, the wheel's sign and every constant;
and 13 of `controls.ts`, each key dropped or swapped. 74 of the first 90
were killed. Sixteen survived:

- The heading straight down at the wrap's bound, given a row.
- The mouse's other buttons pressing, its side ignored like a finger's, a
  second press taking over, a finger moving unpressed aiming, a pressed
  mouse pulling rather than pointing, and another pointer's letting go
  flying: each given a spec.
- The press's resets of the held time and the pull's dead zone, which
  `callOff()` already made, so they went; the pull's "armed" became
  `pullTo()`'s result. The charge's reset as a press starts got a spec.
- The released aim read live, given a turn after the release.
- The dead zone's bound (`>=`), and its charge left standing, given specs.
- `DEAD_ZONE`, `PULL_NOTCH` and `EDGE_CSS_PX` changed, which the specs had
  counted from the constants: they now count in plain numbers (a drag of
  1.39 and 1.4 units; a press at 15 and 16 CSS px from either side, and 31
  and 32 device px at 2×).

27 mutants of the reworked code, these and their neighbours, were all
killed, and the 13 of `controls.ts` too. After the review's fixes, the
first 117 were run again, all that still applied killed, with 25 more of
the fixes: the mouse's place kept and aimed at again, what clears it (the
keys, a drag, a finger), the pointed press let go where it is, the press's
way against the settings, the canvas kept by `measure()` and the sides
measured from it. All were killed. After the second review's fixes, every
set was run again, and 16 more of those fixes: the mouse's press, the
settings forgetting the mouse's place, the sideways scroll, the up
measured again, the armed drag kept and reset, and `MOST_FINGERS`. Two
survived and got specs: the place forgotten at any change of the settings,
and the armed drag kept after a shot. `MOST_FINGERS` at 1 survives, as the
view reads it nowhere: S2's scene, which adds the pointers, holds it.

**Numbers worth keeping.** Straight up is aim 328; 45° is 148. On an
upright phone at 40 device px a unit, a pull of 1.4 units, 56 px, is the
first notch, and 5 units, 200 px, the most.

**The review:**

1. **A pointed press let go past the canvas re-aimed there,** at an aim the
   guide never showed (along the floor, under its line), since Phaser hears
   a mouse move only over the canvas but its letting go anywhere. Fixed: a
   pointed press flies at the aim the guide last showed (choice 6); specs
   for a mouse let go past the canvas, and a move before letting go.
2. **The held charge ran on two clocks,** the meter on the frames' time and
   the shot on the pointer's `upTime - downTime`, which Phaser's smoothed
   and capped delta can part by a notch after a hitch, and which a second
   button held leaves stale. Fixed: the shot flies at the charge the meter
   showed, as Space's does, and `PointerView` drops the two times (choice
   4). The spec at 30, 60 and 144 frames a second holds the meter's charge
   over 1.3 s and the shot flying at it.
3. **A mouse at rest kept its old angle as the fuzzball waited somewhere
   new.** Fixed: the mouse's place on the field is kept, and `read()` aims
   at it from where the fuzzball waits until the keys, the wheel or a drag
   aim instead (choice 5); specs for each, and for a finger lifted.
4. **Escape is decided without the round's phase.** Kept in the steering,
   which alone knows a press is held; choice 2 names the phase question,
   and the class's doc says what the scene owes it (a read every frame,
   up-outside to `pointerUp()`, two fingers, `letGo()` as the player looks
   away) and that the round reads a shot let fly only while it aims.
5. **Phaser follows one finger unless told.** Fixed: `MOST_FINGERS` (2),
   which the class's doc and choice 8 name for S2's `addPointer()`.
6. **No spec held a press to the way it began with.** Fixed: a spec
   changes the settings mid-press.
7. **Nits.** `POINTER_AIMINGS` went: `PointerAiming` is a plain union,
   and U1 maps the settings' `Aiming` to `PointerAimings`. `Steering` keeps
   the `Viewport` and measures the sides from its width and pixel ratio.

**The second review** (the first's fixes reshaped point and hold):

1. **A mouse's press threw away a nudge,** re-aiming at the pointer, so a
   click after the wheel or the keys flew at an aim the guide no longer
   showed. Fixed: a mouse's press doesn't aim, as its moves have; a
   finger's does (choice 5). Spec: the wheel, then a click in place.
2. **The mouse's place still aimed once the settings had it pull back.**
   Fixed: `aimWith()` forgets it then, and keeps it while the mouse still
   points; specs for both. A finger held through a round's end keeps its
   aim until it moves, left as it is (choice 5).
3. **A mouse's pull back let go past the canvas was measured there,** where
   the guide never was. Fixed: every shot flies as its last move left it,
   a pull back's dead zone included, so `pullTo()` keeps whether the drag
   is armed again (choice 6); a finger's moves go on past the canvas. Specs:
   a mouse's drag let go over the bar, and a tap after a drag that flew.
4. **The scene can't give the class where the fuzzball waits, nor say the
   run paused.** The first is a contract change for the integrator (choice
   5). The second is dropped: the class's doc no longer promises `letGo()`
   on a pause, since the scene reads the steering every frame and a paused
   round ignores a shot let fly (choice 2).
5. **The wheel.** A sideways scroll no longer turns, nor stops the aim
   following a mouse at rest; a spec holds it. A trackpad's flick is noted
   in choice 10.
