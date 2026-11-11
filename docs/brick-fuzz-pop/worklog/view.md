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

### V3: playing a round

**2026-11-10.** `src/view/round_play.ts` and `src/view/run_state.ts`: a
level's rounds played back one after another, by §5.5, against
`flight_fixtures`, with V4's `FlightEffects` owned by the playback, as the
integrator asked.

**What was built.**

- `RoundPlay`, made once a level: `aim(start)`, `release(round)`, `skip()`
  and `advance(deltaMs, options)`, which returns a `RoundChange`; the
  getters `view`, `start`, `round`, `phase` and `waitingX`.
  - The flight plays at 14 units a second at Normal and 22 at Fast, ×4
    while fast-forward is held, and ×2 past 8 s where the settings let
    long flights speed up: `FLIGHT_PACE`, a `FlightPace`, which each
    frame's options hand in.
  - Each event reached is logged with what it calls for, from the
    `FlightEffects` `release()` begins with the start's boon.
  - Each fuzzball in the air is placed along its track, its charge and
    whether it is hot carried from its launch, strikes and recharges.
  - The wall shows each brick as the events reached leave it.
  - As the flight ends, the wall eases down a row over `STEP_MS` or jumps
    over `JUMP_MS`, at once without motion, and comes to rest, the view
    then showing the wall the round leaves, which the change says once
    (`settled`).
  - A round that cleared or lost the level then waits, through
    `Countdown`, `clearedDelayMs()` or `resultDelayMs()` before the change
    opens its card (`opens`).
  - A pause stops all of it where it is.
- Added to `RoundView`, as additions: `rowsDown`, the rows the wall's step
  or jump brings it down, which `wallDrop` is a share of, and `beats`, a
  log of `LoggedBeat`s: the step or the jump as the flight lands, the level
  cleared then, the level lost and the danger line as the wall comes to
  rest. `LoggedEvent` gains `effects`; `BallView` names a fuzzball's
  record.
- Also in `round_play.ts`: `FlightSpeed`, `FlightPace`, `FLIGHT_PACE` and
  `PlayOptions` (`pace`, `speed`, `fast`, `speedUp`, `motion`, `paused`).
- `run_state.ts`, beside K2's `RoundPhase`: `Card` (`"cleared"` or
  `"result"`), `RoundNews` (a friend freed, a round ended), `RunState`
  (`start`, `round`, `phase`, `card`, `news`), `PlayState` (what
  `RoundPlay` holds of it), `RoundChange` (`freed`, `settled`, `opens`),
  `newRunState()`, `withFrame()`, which returns the same state for a frame
  that changed nothing, and `withNewsSaid()`. `run_state.ts` imports
  nothing of `round_play.ts`, which imports its types.
- `RoundView.events`' doc now says the numbers run on from one round of a
  level to the next, as one log serves the level.

**Choices the plan didn't make.**

1. **The 8 s count is split within a frame,** not run through `Countdown`,
   which says only that a mark is reached: the part of a frame past 8 s
   flies at twice the speed, so a flight is in the same place at the same
   moment at any rate of frames (a spec plays frames of 300 ms across the
   mark). It counts the frames' time since the release, a pause not
   counted. Fast-forward and the doubling multiply, ×8 at once.
2. **A skip lands the flight at the next frame played,** not in `skip()`,
   so all a frame comes to is in its change; a skip while paused waits for
   the run to go on.
3. **Each fuzzball is followed along its track, not searched for:** it
   keeps the leg it flies and moves on from it, as the clock only goes
   forward, writing into its record, so a frame makes nothing, where
   `positionAt()` makes a waypoint each call (K2's note 9). At a moment two
   waypoints share, it is at the later, as `positionAt()` has it, and specs
   hold the two to agree.
4. **The bricks each event leaves are worked out once, at the release:** a
   strike leaves its brick the hits it says, a zap takes `ZAP_HITS` off
   each brick it reaches, and a break leaves none; a strike or a zap on a
   cell already empty leaves it so. The zap doesn't say what it leaves, so
   the view takes `ZAP_HITS`, which `catalog.spec.ts` holds every zapping
   kind's hits to, so a kind retuned fails there first; the rules may want
   the event to say it. A brick it takes the last hits off breaks right
   after it, at the same moment, so no frame shows it below none. While the
   wall settles it is the wall the flight left, in its old place, which the
   scene draws `wallDrop × rowsDown` rows lower, so a brick the step sinks
   stays until the step is over; as it comes to rest, the view shows
   `round.next.wall`, in the same place, the sunk bricks gone and moss
   grown back, with `wallDrop` and `rowsDown` 0, so a lost level's card
   opens over the wall it left.
5. **The step and the jump both ease by `easeOutCubic()`.**
6. **Beats are a second log in `RoundView`,** as the scene must hear them
   as it hears the events. The danger beat sounds as the wall comes to rest
   with a brick the level needs in the row over the floor's
   (`isInDanger()`, private here; R7's words or S2's danger line may want
   it in the rules). A cleared level chimes as the flight lands; a lost one
   sounds as the step brings its brick down. The notch is left to whatever
   reads the charge (S2), as `RoundPlay` doesn't know the steering.
7. **The card's wait starts as the wall comes to rest,** a cleared level's
   at its landing: 700 ms with motion, and the next frame without; a lost
   level's 800 ms, or 500.
8. **`waitingX`** is the start's x while aiming, `round.next.x` from the
   moment the player's fuzzball lands, and null while it is in the air:
   S2's `waitingX()` option reads it, and `Steering.read()` aims from it.
   `next.x` is held off the side walls, so a fuzzball landing against one
   moves up to a radius as it lands, which S2 may ease.
9. **The playback's clock is `RoundPlay`'s,** not `RunState`'s, as §5.4's
   comment has it: the state is replaced only as the round, its start, its
   phase, the card or the news change, so a frame makes nothing. R7's `run`
   isn't in it, R7 not having landed; U1 or R7 adds it beside `start`.
10. **The news is data, not words:** a friend freed and a round ended, from
    which R7's `describe.ts` makes the words (what the round broke, the
    wall's step or jump, the boon earned, the danger line). A friend freed
    in a skip is news too.
11. **The logs keep 1,024 events and 16 beats,** one log of each for the
    level, numbered on from round to round. A skip may hand on more events
    than the ring holds; a reader then sees the latest, the landing whose
    sound plays among them, as the rest play nothing.
12. **A round released while another plays is ignored,** and `aim()`
    leaves whatever plays.
13. **`FlightSpeed` is the view's own,** with the settings' two names, as
    the view can't import the shell; the settings' `FlightSpeed` is the
    same union, which U1 may take from the view instead.
14. **The wall's settling counts from the frame after the landing,** and the
    card's wait from the frame after the rest: the landing frame's time
    left over goes to neither, a frame at most.
15. **A flight ends at its `length`,** which the rules stream is making
    the later of the last landing and the last event, as the integrator
    says: a zap ripples on half a unit after the break that set it off, so
    a chain set off as the last fuzzball comes down runs on past its
    landing. Its breaks and the friends it frees are reached before the
    wall settles, and a skip lands there. The specs' `RIPPLING` flight is
    built so; K2's fixtures end with a landing, where the two agree.
16. **The pace is handed in with each frame,** `PlayOptions.pace`, which
    is `FLIGHT_PACE` but where U2's debug menu tunes it, so its sliders
    move a flight in play. plan.md has the menu show the lines of
    `tuning.ts` its numbers would replace; these live in `round_play.ts`,
    as the rules never read them.

**Checks.** The workspace's `lint`, `typecheck`, `test` and
`test:coverage` pass, after the review's fixes, 3015 tests in 42 files,
142 of them new (`round_play.spec.ts` 127, `run_state.spec.ts` 15);
`round_play.ts` at 100% of statements, functions and lines and 99% of
branches (the stray fuzzball's `??`, which no flight reaches),
`run_state.ts` at 100%. The root's `yarn lint` passes.

**The mutation pass.** 16 mutants of `run_state.ts`, each comparison of
`withFrame()` dropped or turned, the news's order, the card kept and the
news kept: four survived (a start aimed again, another round in play, a
card opened as the wall settles, a friend freed in flight), each given a
spec, then all were killed. 102 of `round_play.ts`: every constant, the
waiting x, every reset in `aim()`, `release()` and the change, the pause,
the frames of no time, the speeds, the 8 s split, the skip's sounds, each
part of a launch, the charge, the landings, the wall's changes and their
moment, the following of a track, the step's time and ease, every beat,
the card's wait and delay, and the danger line. 77 were killed. Of the 25
that survived:

- Six were dead code, which went: the moment clamped to the flight's
  length, the skip's reset at the landing (`aim()` resets it), the launch's
  place copied (its first leg ends where it leaves), the tracks' and the
  balls' resets at the release, and the zap's clamp at none.
- Seventeen got specs: a second round played after the first (every reset
  in `aim()` and `release()`, the fuzzballs' states and the wall's changes
  indexed again), the wall's rows while it flies, a mate landing before
  the player, a lost level with a brick over the danger line, a round that
  leaves the level on opening no card, and a launch's first leg.
- A strike's hits taken from the brick's (`took`) rather than its `left`
  is equivalent in any flight the rules make; the 8 s count's `ms * 1` was
  no change.

The 94 that still applied were run again with 11 more (the zap's hits,
the stray, an empty cell struck or zapped, the step's clamp, the skip
ignored), and six survived: the two above, and four new. The fuzzballs'
states were made both in the constructor and at the release, so the
constructor's went; the step's clamp at 1 got a spec of a frame four steps
long; and the player's landing told from any role but a mate's got specs
of a friend and a split landing first. Those, with two more, were then
all killed.

After the review's fixes, 21 more: the pace's every number and each read
from the options, the flight's end, its reset and a zap past the landing,
the wall shown at rest, the ease's bound, and the skip's sounds. Two
survived: the end kept from a longer flight before, given a spec, and the
last landing's reset, equivalent, as every flight lands. The 16 of
`run_state.ts` were run again, all killed. After the second review's
fixes, six more: the balls written by index and cut, the flight's end
and the skip's short of `length`, and the landing's bound, all killed but
the last landing's reset again.

**Numbers worth keeping.** The specs' long flight, 982 units, plays 70 s
at Normal and lands in 39 s sped up: 112 units in the first 8 s, the rest
at 28 units a second. The wall steps in 260 ms and jumps in 480; a
cleared level's card opens 700 ms after the landing, a lost level's
800 ms after the rest, 500 without motion.

**The review:**

1. **Events past the flight's `length` were dropped.** A zap lands half a
   unit after the break that set it off, so a chain can run on past the
   last landing, which `length` was; its breaks, sounds and freed friends
   were never reached. Fixed first by ending the flight at its last event;
   then, as the integrator said the rules stream is making `length` the
   later of the two, the playback ends at `length` again (choice 15).
   Specs of a zap rippling past the landing, its events, its broken brick,
   its friend freed and a skip.
2. **A boon's release was specced only on a level's first round.** Fixed:
   specs of a boon on a later round, and a plain round after a boon's.
3. **A zap's hits are assumed.** Kept: `catalog.spec.ts` holds every
   zapping kind's hits to `ZAP_HITS`, so a retune fails there; choice 4
   says so, and the report asks the rules to say it in the event.
4. **At rest, the view kept the flight's wall until the next aim,** so a
   lost level's card opened over bricks the step had sunk. Fixed: at rest
   the view shows `round.next.wall` with no drop (choice 4); the specs of
   the wall's changes now look as the flight ends, and a spec holds the
   sunk brick gone at rest.
5. **The flight's speeds were fixed,** where U2's sliders tune them.
   Fixed: `FlightPace`, `FLIGHT_PACE`, handed in with each frame (choice
   16), with a spec for each number tuned. `timing.ts` is the shell
   stream's, so the numbers stay in `round_play.ts`. The two
   `FlightSpeed`s are left to U1 (choice 13).
6. **The landing's leftover time is dropped.** Kept, as choice 14 says: a
   frame at most.
7. **Nits.** `lastLanding` is reset for each flight; `RoundView.events`'
   doc says the numbers run on; the docs that opened with more than a
   sentence open with one; the phase is `playPhase` and `sound()` is
   `logBeat()`; `RoundChange` and `PlayState` moved to `run_state.ts`,
   which no longer imports `round_play.ts`; choice 8 says how far the
   fuzzball may move as it lands.

**The second review** (the first's fixes reshaped the flight's end, the
wall at rest and the pace):

1. **`place()` emptied `view.balls` each frame,** and V8 drops an array's
   store as its length is set to 0, so the first fuzzball pushed made a
   new one every frame. Fixed: written by index, its length cut once.
2. **`RoundView.wall`'s doc didn't say it changes in place,** where the
   rules' walls are values each round replaces, so a scene redrawing only
   on a new wall would miss every strike. Fixed: it says so, and when it
   is another wall (aimed, released, at rest).
3. **`unitsIn()`'s doc said "twice",** and `RunState`'s opened with two
   sentences. Fixed.
4. **`playTo()` played on by its units, from wherever the flight was.**
   Renamed `playOnBy()`, at `FLIGHT_PACE`'s Normal.
5. **`RIPPLING` kept the plain shot's `next`,** with the brick its zap
   breaks, and its made-up zap wasn't said to be. Fixed: its next wall
   lacks the brick, its `length` is the zap's moment, and its doc says the
   zap is made up.

### V3's view, as the scene reads it

**2026-11-10.** Before U1 hands `RoundPlay`'s view to S1's scene, the view
is brought to the two rules the scene reads it by, which V3 missed.

**What was built.** In `src/view/round_play.ts`:

- **`wallDrop` is 1 while the wall stands still,** aiming, flying and at
  rest. As the flight ends, the wall the round leaves, `round.next.wall`,
  is handed over at once with `wallDrop` 0, and eases to 1 over `STEP_MS`
  or `JUMP_MS`; S1's `WallPainter` draws it from the row it last stood
  still on, as integration's note for V3 after S1 asked. V3 eased the
  flight's own wall from 0 and showed the next only at rest, which the
  painter would have drawn a step too high from then on.
- **The view hands over another wall each frame that changes a brick,**
  as the painters redraw only a wall they haven't drawn: two copies take
  turns, the frame's first change copying the wall shown into the other,
  both sized for the round's wall as it is released, so a frame still
  makes nothing. V3 changed one copy in place, which the painters would
  never have redrawn.
- `RoundView`'s docs for `wall`, `wallDrop` and `rowsDown` say both.
- **One `RoundPlay` plays a whole game,** level after level and run after
  run, aimed at each, so its logs number their events on and the scene's
  reader of them never sees the numbers start again; the class's doc says
  so, where V3's said one a level.

**Choices the plan didn't make.**

1. **Bricks the step sinks go as the flight ends,** with the wall handed
   over, rather than once the step is over, as V3's fourth choice had it:
   the scene draws the wall it is handed, from where it last stood.
2. **A wall handed over may be written again two changes later,** so a
   reader reads the view after every frame played and compares a wall only
   with the one it read the frame before, as the doc says: the painters
   draw once a frame, and U1's tick must advance the play once a tick.
3. **The jump line's count of the bricks under it moves as the flight
   ends,** as the field painter reads the wall handed over then, a step or
   a jump before the bricks are drawn there: it counts the wall the round
   leaves, as the announcer does.

**Checks.** The workspace's `lint`, `typecheck`, `test` and
`test:coverage` pass, after the review, 3,772 tests in 64 files;
`round_play.spec.ts` has 131, `round_play.ts` at 100% of statements,
functions and lines and 99% of branches. The root's `yarn lint` passes.

**The mutation pass.** 19 mutants of the new code: when the wall is
copied, each part of the swap, the frame not counted, the copy's rows,
place and length, the wall handed over as the flight ends, `wallDrop` and
`rowsDown` at the landing, at rest, at the aim and at the start, and the
changes' reset. Five survived: the copy made at every change rather than
once a frame, twice, which the review showed hands the same wall back
after a frame of two changes, now given a spec; the copy's length cut,
equivalent within a level, whose walls are all one size; and the changes'
two resets, which the second round's spec had checked at rest, where the
view now hands over the next wall: it now looks just before the flight
ends, and both were killed. The 89 earlier mutants that still apply were
run again: all were killed but the three logged as equivalent. After the
review, five more: the copy's flag set and reset, and the copies sized at
the release, whose two survive, as they spare a frame the work of
growing them and change nothing else.

**The review:**

1. **A copy made at every change was taken as equivalent,** but a frame of
   two changes then hands back the wall of the frame before, written over,
   which the painters wouldn't redraw. Fixed: a spec of a frame that breaks
   two bricks; the mutation pass says so.
2. **The first frames to change a wall grew the copies.** Fixed: both are
   sized for the round's wall as it is released.
3. **The wall's doc let a reader compare with any wall before.** Fixed:
   it compares only with the one read the frame before, reading the view
   after every frame played (choice 2), which U1's tick keeps.
4. **The jump line's count moves as the flight ends.** Kept, and logged
   (choice 3).
5. **Nits.** The frame's count and the frame copied in became one flag;
   `wallDrop`'s doc says it is already 1 where the wall comes down at
   once; the spec of walls across frames checks one thing each.

### U1's core: GameService

**2026-11-10.** `src/app/play/game.service.ts`: the game, on `@fz/game-ui`'s
`RunLifecycle`, playing R7's run with V3's `RoundPlay` and `RunState`, with
the tokens and the specs' helpers it needs. The board, the canvas and the
wiring come next.

**What was built.**

- **`GameService`** holds V3's `RunState`, replaced whole, and one
  `RoundPlay` for the whole game. It implements `outcome`, `ended`,
  `inProgress`, `resultClosed`, `pause()`, `resume()` (which waits for
  `drawn`) and `newGame()`, with `startAt()` and `tryAgain()` beside it;
  `nextStage()` opens the next level from the Cleared card, and every
  level waits in `"ready"`. `command()` is overridden only for a lost
  run's card put away (choice 9); C8 stays in `Steering.keyDown()`.
- **The scene's options**: `tick()`, `view()`, `guide()` (null until
  R6/S2), `waitingX()`, `palette`, `shape`, `motion()`, `sound()`,
  `onLayout()`, `onPictures()` and `fieldCommand()`, which skips, reads
  the rows (R) or hands a run's command to `command()`.
- **The bar's**: `flying`, `fast` (asked from the bar, or F held), `skip()`,
  `fastForward()`, `toggleSound()` and `soundOn`; the panels' `rowsLeft`,
  `friends`, `lit`, `levelBoon`, `rounds`, `par`, `score`, `best`; the
  steering's `aimings`; and `metrics` and `pictures` as the scene last
  gave them.
- **R7's run, played.** A release starts the level, plays the round
  through the rules (`PLAY_ROUND`), takes it with `takeRound()`, and sets
  the run and the round, and so `nextStart` (`round.next`), in one value.
  The run lands with `landRound()` in the frame the flight ends.
- **The words** go to `@fz/ui/announcer`: the level as it opens, the keys'
  aim and charge, R's rows, a round as its wall comes to rest, the
  Cleared card, the run's end, pausing, going on and a game taken up.
- **The records** go through `StatsService` and `ProgressService`, none
  for a run on retuned numbers.
- **`KeptGame`**: `provideGame()` hands `KEPT_GAME` the service, and
  `takeUp()` takes a saved run up paused.
- **`src/app/tokens.ts`**: `GAME_LEVELS` (default `LEVELS`), which the
  stats, progress and saved-game services now read, and `PLAY_ROUND`
  (default `playRound`, which throws until R6).
- **`src/testing/play.ts`**: `provideSpecPlay()`, the specs' levels (the
  first three), a seeded `GAME_RANDOM`, and `scriptedRounds()`, which plays
  rounds that step, jump, free a friend, clear or lose the level, each
  with a fixture's flight, the freed round's with a friend freed at its
  strike; and helpers to release and play rounds out. `AGENTS.md` names
  it, `tokens.ts` and `GameService`.
- **`main.ts`** injects `SavedGameService` in an app initializer.
- **The settings' `FlightSpeed`** is now the view's, re-exported from
  `settings.service.ts`, which the integrator allowed.
- **`RunState` gained `run`, `resultClosed`, `tuned` and `newBest`**, so
  `newRunState(run, start, tuned)` takes the run, and a run begun replaces
  the whole state.

**Choices the plan didn't make.**

1. **The records are kept as a round is released,** from `afterLanding()`,
   as the saved game keeps the round then too: a page closed mid-flight
   loses neither the level cleared nor the best.
2. **The field's room waits for the round in the air.** `setRoom()` takes
   the shape at once while a round is aimed; with a round in the air or
   its wall settling, or a card over the level's end, the next aim takes
   it. A level with no round played, a new run's, the next level's
   or one taken up, is begun again on the room's depth, its par with it
   (the shell works the par out with `parOf()`, as R7 has no move for
   it); any other keeps its par and moves its start onto the new depth,
   the wall where it stands from the floor.
3. **The first shape is an upright phone's** (390 by 640), which the
   board's first measure replaces before the scene's first layout.
4. **A skip while paused lands the flight at once,** through a frame of no
   time unpaused, though `landRound()` lands only a run in play: the level's
   end is held until it goes on, and lands the frame after.
5. **The last level's Cleared card is the result card,** its words both
   the level's and the run's.
6. **Fast-forward asked from the bar lasts a flight;** F held lasts as long
   as it is held; `fast` is false between flights, whatever was asked.
7. **A friend freed is said in the round's words,** with the rest of what
   it came to, not on its own as it happens.
8. **A run's stars on the result card wait for the wiring,** since R7's
   run counts no stars across levels, nor does its saved game.
9. **Enter, P and a press on the board try a lost level again** once its
   result card is put away, as the board's Ended card offers, where
   `RunLifecycle` would start a new game, as integration asked; Escape
   does nothing there, and a won run's Enter starts a new game.
   `tryAgain()` takes only a lost run.

**Checks.** The workspace's `lint`, `typecheck`, `test` and
`test:coverage` pass, after the review, 3,923 tests in 69 files, and
4,081 in 81 once rebased onto `brick-fuzz-pop`;
`game.service.spec.ts` has 100, `tokens.spec.ts` 2, and `game.service.ts`, `tokens.ts` and
`src/testing/play.ts` are at 100% of statements, branches, functions and
lines, as is every file of `src/app/`. The root's `yarn lint` passes.

**The mutation pass.** 99 mutants of `game.service.ts`, each guard, each
signal the shell reads, each record kept, each word said, each part of the
room's handling and of a frame's options: 89 were killed. Three survivors
were gaps, now given specs and killed: a new game at level 1 rather than
the level the last run started at, a release while paused (which played
the flight, though the run took no round), and a level with rounds
played begun again on a new depth. Seven are equivalent: the skip's guard
(`RoundPlay.skip()` has its own, and a frame of no time moves nothing),
the run landed with no ending held (`landRound()` leaves it as it is), any
card opened over a won run (only Cleared opens over one), the state set
when the frame left it as it was (a signal set to the same value), a
start or a run moved onto the depth it has (the same value made again),
and a level begun again without its par worked out, as `par.json` gives
every level the same par at every depth today; a par that differs by
depth would show it. An earlier pass, stopped a third of the way, had
found six gaps (the Cleared card read open over the result, the boon lit
before a jump earned it, the keys' words said every frame, a room of the
same shape taken again, and pausing or going on when it changes nothing),
given specs before the full pass. Then the ten survivors again, with the
new specs, and 5 mutants of the `command()` override integration asked
for: four killed, and one equivalent (falling through to
`super.command()` after trying again, which a run waiting for its first
shot ignores). And 5 of `run_state.ts`'s new fields and `withFrame()`'s
spread, all killed. After the review, 3 more: `fast` while no flight is
in the air and `tryAgain()` over a won run, both killed, and the records
reading the level from `level()`, equivalent at the release, which the
review's eighth comment changed for clarity.

**Numbers worth keeping.** The specs' long flight is the plain fixture's
slowed 20 times, 255 units: it lands 18.2 s after its release at Normal,
13.1 s with long flights sped up. A test's second game, after
`TestBed.resetTestingModule()`, lost the per-test memory store the setup
provides and read jsdom's `localStorage`, which another test had set to
Fast, so its flights landed early; `afresh()` gives it a store again. A
mutant of the shell's spec takes about 25 s on the shared machine.

**The review:**

1. **`fast` stayed on after the flight landed,** which the bar's button
   would show pressed between flights. Fixed: it is false but in flight,
   and a spec plays a flight out after the bar asked.
2. **No spec ran the game with the saved game.** Fixed: a spec releases a
   round with `SavedGameService` keeping the game in a memory store, starts
   afresh on the same store, and finds the run paused after the round.
3. **Three specs would pass with the code broken.** Fixed: the round
   played out "at any rate of frames" played at one rate and checked a
   tautology, and is gone; fast-forward and the settings' speed compare
   the fuzzball's place after times that should match (100 ms
   fast-forwarded against 400 ms; 140 ms at Fast against 220 ms at
   Normal, released in a frame of no time); and the freed friend's words
   are checked against everything said through the playback.
4. **`laidOut()` works a par out in the shell,** as `run.ts`'s private
   `levelBegun()` does, and no spec can hold its par while `par.json` is
   flat. Kept (choice 2): a move for it in `run.ts` is the rules stream's
   to write, which integration can ask for, and the shell's would go then.
5. **The spec painted the roles by hand,** one color for all. Fixed:
   `@fz/style/testing`'s `paintRoles()` with the midnight palette's roles,
   which restores itself.
6. **A cast in the pictures' spec.** Fixed: the function handed over
   throws, as nothing calls it.
7. **`sound()` and `motion()` repeat signals.** Kept: they are the scene's
   options as U1 names them, handed over in one place; `soundOn` is the
   bar's.
8. **The records read the level from `level()`,** right only because the
   state isn't set yet. Fixed: from the landed run's level.
9. **The class doc listed when the state changes,** and missed some.
   Fixed: it changes only as the run or its round does.
10. **`tryAgain()` took a won run.** Fixed: a lost one only, as its doc and
    the cards say, with a spec.
11. **`RoundPlayer` restated `playRound()`'s signature,** and
    `src/testing/play.ts` exported a `playRound()` of its own. Fixed:
    `typeof playRound`, and the helper is `playRoundOut()`.
12. **`AGENTS.md`'s status and the view's bullet were out of date.** Fixed.

### U1's wiring and U2's

**2026-11-10.** `src/app/app.component`: the shell places the bar, the
live region, the result card, the Levels dialog, How to play, the
settings drawer and the question before a run is lost, each wired to
`GameService`; and `GameService` takes the debug menu's numbers, depth
and records, plays R6's `playRound()` and casts its `guideOf()`, and hands
the board its card and the result card the run's end. The board's place
in the room is a marked slot, as `<app-board>` is the art stream's.

**What was built.**

- **`app.component`** places `<app-bar>`, with every figure and action
  wired to the game, `<fz-announcer>`, `<app-result>` over an ended run,
  `<app-levels>`, `<app-help>`, `<app-settings>` and
  `<fz-confirm-dialog>`, and pauses the level in play as the player looks
  away from the room (`[fzPlayRoom]`'s `away`). The room is a one-cell
  grid in `<main>`, and the board's slot a comment saying what goes
  there. A level chosen in the Levels dialog starts a run there, asking
  first with one in progress, and closes it only once the run has begun;
  the result card's Choose a level puts the card away and opens it. Once
  a run has ended, the result card stays in the page with its last end
  (`lastEnd`), closed through its `open` as the next run begins.
- **The debug menu's wiring.** The flight's pace follows the numbers
  through `onTune()`, heard at once; each round is played on
  `rulesOf()` of them, and the guide past its turn on `guidePastTurn`; a
  depth set lays the field out again on the board's last room
  (`fieldShape(viewport, depthSet)`), between rounds as a resize is; a
  run begun calls `startRun()`, `locked` for a level not yet open and
  `kept` for a run taken up off the record; and `runOffRecord()` keeps
  the records, in place of `RunState.tuned`, which is gone, so
  `newRunState(run, start)` takes two. The Levels dialog opens every level
  while `everyLevelOpen()`.
- **`boardCard`**, the card the board shows: Ended over a closed result,
  Cleared once its card is due, with the level's tally and the friends
  the next round starts with, Ready, with the kind of brick the level
  brings in (the catalog's new `kindIntroducedAt()`), and Paused, with the
  score; else none.
- **`runEnd`**, what the result card shows of an ended run, its stars
  read from the run's `stars`, which the proof stream now counts.
- **`guide()`**, R6's `guideOf()` from the round aimed at the steering's
  last aim and charge, while the guide setting is on and a round waits to
  be aimed; null otherwise.
- **`boon()` and `crew()`**, the two of S2's new scene options the game
  lacked: the boon the waiting fuzzball carries (the round aimed's, the
  next round's once the flight lands, none in flight) and the crew of the
  round aimed or in play.
- **`isDepth()`** checks a depth in the saved game's `hasDepth()` and the
  debug menu's `setDepth()`, as the integrator asked.
- **`src/scene/stand_ins.ts`** is gone, `GameService` taking `Guide` from
  the rules, as the scene does.

**Choices the plan didn't make.**

1. **One commit for both,** as U2's debug wiring runs through the same
   lines of `GameService` and the app as U1's.
2. **The pace is heard through `onTune()`** rather than an effect, which
   runs later, so no frame plays on the old pace.
3. **A depth set waits for the round in the air,** as a room's resize
   does, and lays out a level with no round played afresh, its par with
   it; one with rounds played keeps its par.
4. **A depth set is the field's whatever the room:** the unit is the
   largest that fits that many rows past the thinnest band and lintel,
   and what is left thickens them.
5. **The guide is cast once** for each round aimed, set of numbers, aim
   and charge, and handed again while none changes, rather than at every
   frame.
6. **How to play asks the scene for its pictures only while it is open,**
   as the scene encodes them as they are asked for.
7. **Every level open keeps each level's stars and best,** only opening
   the locked ones.
8. **The result card comes before the Levels dialog in the page,** so
   Choose a level's card gives the focus back before the dialog takes it.

**Not here yet.** `<app-board>` in the room's slot, and with it the focus
the board takes back from the bar's Resume, the dialogs and each run
begun, wait for the art stream's board; nothing can be played in the page
until then, so the app's specs drive the game through `GameService`. The
settings drawer is handed no certificate and its Play the certificate
goes nowhere until P3's loader.

**Rebased twice.** Onto the proof stream's run stars and `takeDepth()`,
so `runEnd`'s stars are the run's own and `laidOut()` calls the rules
(the provisional count this change first kept in `GameService` went);
and onto S2, whose scene asks for `boon()` and `crew()`.

**Checks.** The workspace's `lint`, `typecheck`, `test` and
`test:coverage` pass after the review, 4,433 tests in 83 files;
`app.component.spec.ts` has 36 and `game.service.spec.ts` 135, and
`app.component.ts`, `game.service.ts`, `field_metrics.ts` and `bricks.ts`
are at 100% of statements, branches, functions and lines. The root's
`yarn lint` passes.

**The mutation pass.** 40 mutants of `game.service.ts`'s new lines, each
card and its fields, the run's end, the guide's guards and its cache, and
the debug menu's pace, rules, depth and records: 34 were killed. Five
survivors were gaps, now given specs and killed: the Cleared card's tally
read without the level's jumps, the run's end at level 1 rather than the
level it started at, and the guide's cache ignoring the numbers, the aim
or the charge, which the specs had asked for only from an empty cache.
One is equivalent: the Cleared card's friends read from the round aimed
rather than the next round's start, which are one by the time the card is
due. After S2, 3 mutants of `boon()` and `crew()`, all killed. 3 of
`fieldShape()`'s depth set: two killed, and one equivalent, the depth set
clamped, which `setDepth()` already holds to a field's. 11 of
`app.component.ts`, all killed; and 38 of its template, each figure,
action and output wired, each dialog's open and close, the confirm dialog
and the live region: 36 killed, and two gaps, now given specs and killed:
Fast-forward pressed again asking for fast still, and the result card
open whatever the game says. After the review, 3 more, all killed: every
level open dropping the levels' stars, and the result card leaving the
page, by its `@if` or by `lastEnd` keeping nothing.

**Numbers worth keeping.** In jsdom the confirm question and the result
card are `alertdialog`s, the help's pictures `presentation`, and an
element has no `checkVisibility()`. A round's points are in the score as
it is released, so a run paused mid-flight says them. A mutant of
`game.service.spec.ts` takes about 35 s on the shared machine, one of
`app.component.spec.ts` about 15 s.

**The review:**

1. **Every level open was worked out in the component, and keeping each
   level's stars had no spec.** Fixed in part: a spec holds a cleared
   level's stars while every level is open. Kept in the component:
   `level_marks.ts` is the shell stream's, and opening every level is the
   app's wiring of the debug menu; `levelMarksOf()` can take it on if that
   stream wants it.
2. **The result card left the page while open** as a new run began, so
   its dialog was never closed and the browser couldn't give the focus
   back. Fixed: `lastEnd`, a `linkedSignal` of the last end, keeps the
   card in the page once a run has ended, and its `open` closes it; a spec
   finds it closed after Try again.
3. **`newKindAt()` was a question of the catalog asked in the shell.**
   Fixed: the catalog's `kindIntroducedAt()`, specced for every kind and
   for a level that introduces none.
4. **`AGENTS.md` still listed S2 to come,** and its scene bullet, which
   this change edited, said the shot unsteered and the sounds unplayed.
   Fixed: S2 is off the list, and the scene bullet is the integrator's
   rewrite for S2, which landed as this was rebased, taken whole but for
   `stand_ins.ts`, now gone.
5. **`keepRecords()`'s doc had a line left unwrapped.** Fixed.
6. **A spec kept the rounds asked for as `unknown[][]`.** Fixed:
   `Parameters<RoundPlayer>[]`, and the debug menu's spec
   `Parameters<RoundPlayer>[3][]`.

### U2's remainder: the certificate loader and Play the certificate

**2026-11-10.** The debug menu's Play the certificate, end to end: a set's
certificates file read and checked, loaded only where the menu is offered,
the level in play's line offered on the field's depth, and played from the
level's start, off the record, on the rules' own numbers. With it, the
view's danger beat reads the rules' `inDanger()`, as the proof stream
asked.

**What was built.**

- **`src/view/debug/certificates.ts`**: `readCertificates()` reads a set's
  file, `{ [levelId]: { "11"…"22": [[aim, charge], …] } }`, into each
  level's `Line` by depth, through P2's `CertifiedShot` and `Line`, and
  drops what it can't trust: a file or a level that isn't a record, a
  depth no field has or written otherwise than as one ("011", "11.0"), and
  a line that is empty or holds anything but pairs of an aim and a charge.
  `lineOf()` finds a level's line on a depth.
- **`src/app/debug/certificates.service.ts`**: `CERTIFICATE_FILES`, the
  files by set id (`certificateFilesOf()` over an `import.meta.glob()` of
  `src/rules/levels/certificates/*.json`, lazy, so each file is a chunk of
  its own), and `CertificatesService`, whose `resource()` loads the level
  in play's set only while `DEBUG_MENU` is true, once for all its levels.
  A set with no file, or a file that fails to load, offers nothing. It
  offers the level in play's line on the field's depth (`offer`, the
  menu's `CertificateOffer`) and plays it (`play()`). Its specs read P3's
  `warm-up.json` whole, a line for each level on each depth, and play
  Hello, wall's through the real `playRound()` to its Cleared card in as
  many rounds as the line; made-up files hold the rest, the ones it can't
  trust among them.
- **`GameService.playLine(level, lineOn)`** asks first with a run in
  progress, begins the level from its start with `startRun({ certified:
true })`, the line `lineOn` gives for the depth it begins on, and then
  lets the line's next shot fly (`shotOf()`) as each round is aimed,
  whatever the player steers, on `RULES`; the player's own shots after the
  line go back to the menu's numbers. The line stops as the next level or
  another run begins.
- **`DebugService.startRun()`** takes `certified`, which keeps the run off
  the record.
- **`app.component`** hands `<app-settings>` the offer and, at Play the
  certificate, puts the drawer away so the board shows, and plays it.
- **The danger beat** in `round_play.ts` is `inDanger()` from `lower.ts`,
  so a needed brick on the floor's row sounds it too; the view's own
  `DANGER_ROW` went.

**Choices the plan didn't make.**

1. **The reader lives in the view** (`src/view/debug/`), beside the menu's
   numbers, as only the debug menu reads a file at run time; the rules
   keep the pair and `shotOf()`. The specs' `src/testing/every_level.ts`
   reads the same files its own way, throwing at what it can't read, as a
   spec should, where this one drops it, as a page should; its type is
   `SetCertificates`, so the two names don't meet.
2. **A line is played only on the field it was found on.** It is looked up
   on the field's depth before the player is asked, so nothing is asked
   with none to play, and again after, beginning nothing if the room
   changed meanwhile; and it stops once a round is aimed on another depth,
   a resize or the menu's depth, as its shots would miss there.
3. **The line's shot flies on the first frame the round is aimed,** with no
   pause to show the aim, so a line of 20 rounds takes as long as its
   flights.
4. **The player's release is ignored while the line has shots left,** and
   Pause and fast-forward work as ever; a paused level lets none fly.
5. **Play the certificate closes the settings drawer** before it asks, so
   the board shows what it plays.

**Checked in a build.** The workspace's build, P3's `warm-up.json` in
place, writes the certificates as `warm-up-*.js`, 4.45 kB, which the main
chunk names only in a lazy `import()` and holds none of; `index.html`
preloads nothing of it. (`dist/` was removed after.)

**Checks.** The workspace's `lint`, `typecheck`, `test` and
`test:coverage` pass after the review and the last rebase: 4,826 tests
in 109 files, the coverage run's 4,676 in 89 at its floors.
`certificates.ts` and `certificates.service.ts` are at 100% of
statements, branches, functions and lines, as are `game.service.ts` and
`app.component.ts`; `round_play.ts` keeps its one branch short of 100, a
fuzzball no track has. The root's `yarn lint` passes.

**The mutation pass.** 37 mutants: 11 of the reader, 6 of the service, 15
of `GameService`'s line, 1 of `startRun()`'s `certified`, 4 of the app's
wiring and 2 of the danger beat. 34 were killed, and three survivors were
gaps, now given specs and killed: a level whose lines are nothing read
without its check (it threw), Play the certificate before anything loaded
answering yes, and a release refused while paused taken as the line's
shot, which a spec now catches by going on and finding the second shot
kept. After the review, 7 more, all killed: the offer on the run's depth,
the failed load said nowhere, the line kept on another depth, no line
looked up before asking or after, and each kind of shot on the other's
numbers.

**Numbers worth keeping.** Warm-up's certificates are a 4.45 kB chunk.
Hello, wall's line on the specs' first field plays to its Cleared card
through the real rules in well under a second of the spec's time.

**Rebased** onto P3, whose `warm-up.json` the specs now read whole;
after the review, onto the scene's danger from the rules; and last onto
the art stream's board, the app's imports holding both its
`BoardComponent` and the `CertificatesService`.

**The review:**

1. **The diff reverted the branch's newest commit,** as the branch had
   moved on. Fixed: rebased, the scene's text in `AGENTS.md` kept.
2. **A line kept playing after the field changed depth,** on a field it
   wasn't found on; and Play the certificate asked before looking for a
   line, so a player could give up a run for nothing. Fixed (choice 2),
   with a spec of each: the line stops once a round is aimed on another
   depth, and is looked up before the question and after.
3. **`release()` chose the rules from the line's state,** right only while
   `tick()` takes the shot off after it. Fixed: `release(shot, rules)`,
   `tick()` handing `RULES` for the line and the menu's numbers otherwise.
4. **A file that failed to load read as "no certificate".** Fixed: the
   offer is still none, but the service says why in the console, which a
   spec holds.
5. **Two readers and two `Certificates` types for one file.** Kept apart
   (choice 1): the specs' throws and the page's drops, on purpose; mine is
   now `SetCertificates`, and the file's header says why there are two.
6. **`AGENTS.md` still listed the rest of U2 to come.** Fixed.
7. **Spec gaps:** the spec of "the level a run moves on to" started a new
   run, and is named so; a spec now holds the offer to the field's depth,
   not the run's, the two set apart by the menu's depth after a round;
   and the "no certificate has loaded" case is named for what it is, the
   menu not offered. `play()`'s doc says it resolves.

### Every level open, in levelMarksOf()

**2026-11-10.** The follow-up suggested after U2, which the coordinator
asked for once the certificates were done, though `level_marks.ts` is the
shell stream's: the debug menu's every level open moves out of
`app.component`'s `marks`, which built the marks and then copied each
with `open: true`, into `levelMarksOf()` itself, as its fourth parameter,
`everyOpen`, false unless handed. As before, a level opened that way
keeps its stars and best only once the progress has it cleared, as any
other does, so the debug menu shows no records the progress doesn't
back. The app hands it `debug.everyLevelOpen()` and nothing else
changed; no name was added to a contract.

**Checks.** The workspace's `lint`, `typecheck`, `test` and
`test:coverage` pass: 4,828 tests in 109 files, the coverage run's 4,678
in 89 at its floors, `level_marks.ts` and `app.component.ts` at 100%. The
root's `yarn lint` passes.

**The mutation pass.** 6 mutants, all killed, and the marks' 4 again
after the review: `everyOpen` ignored, joined by `&&`, true by default,
and taken to show records the progress hasn't cleared, against the marks'
spec; the app's dropping the menu's flag, and handing `true` whatever it
says, against the app's.

**The review:**

1. **The doc's second paragraph said the progress alone opens levels,**
   which `everyOpen` makes untrue. Fixed: it says the progress alone says
   what is cleared, even while every level is open.
2. **The doc's first sentence named the debug menu** in a stats helper,
   and read awkwardly. Fixed: "or every level while `everyOpen` is set".
3. **`level_marks.ts` is the shell stream's file.** The coordinator asked
   for the move; this section now says so.
4. **The new spec's name said each level kept its stars,** though one
   deliberately loses records the progress doesn't back, and it checked
   only three levels open. Fixed: two specs, one that no level is shut,
   one that stars and best show only where cleared.
5. **The section had no date, and could read as new behaviour.** Fixed.
6. **`LevelMark`'s doc in `levels.component.ts`,** older than this
   change, says `open` means the first level or one after a level
   cleared, and doesn't mention the flag. Left: the file is the shell
   stream's and the coordinator didn't ask for it; noted in the report.

### Q3's findings: the bar after the playback, a hot shot's words, and the depth

**2026-11-10.** Three findings from the scene stream's Q3 check in a
browser, which the coordinator handed this stream.

**The bar ran ahead of the playback.** The run takes a round in as it is
released, its rounds and points with it, and the bar showed the run, so
its score and rounds changed before the flight had broken anything.
`plan.md` scores a brick "as it breaks", and says nothing of when a round
counts. Now the bar's figures follow what the player sees: each break's
points as the flight plays it back, and the rest, a jump's and the
stars', as it lands, the round counted with them. `RoundPlay` counts the
points of the breaks it has reached (`scored`), `RunState` carries them
(`scored`), and `GameService`'s `rounds` and `score` take the flight in
the air back out of the run's. The run itself is as it was, so the saved
game and the records still keep a round as it is released, as `plan.md`
asks. The Paused card and the words said as a level pauses carry the
score the bar shows. The panels read the round aimed and the lit badge,
which change only as the next round is aimed or a shot flies, so none of
their figures leads the playback. One thing still does, by design: the
records keep a cleared level as its last round is released, as
`plan.md` asks, so the Levels dialog opened during that flight already
shows the level's stars and the next level open.

**A hot shot was said as "charge 0".** The plan's words for it are "hot
shot", so `describeShot()` takes the boon the shot carries, as an
optional second parameter, and says "62 degrees, hot shot" for a hot
shot; a triple shot's charge is still said, as its fuzzballs fly at it.
`GameService` hands it the waiting fuzzball's boon, and none while a
shot flies, as the fuzzball waits plain until the flight lands, so the
aim moved during any flight is said with its charge.

**The round's words used the round's own depth.** The field takes the
room's depth only as a round's wall comes to rest, in the frame the
round's words are said, so a turn of the room during a flight left them
counting the bricks to a jump on a field no longer shown. They are now
said of the next round as it is aimed, on the depth the field has as
they are said, which is what the player sees.

`SPEC_POINTS.jump` is now the zap fixture's points, its breaks' and the
jump's, so the bar's count of the breaks comes to the round's.

**Checks.** The workspace's `lint`, `typecheck`, `test` and
`test:coverage` pass: 4,842 tests in 109 files, the coverage run's 4,692
in 89 at its floors; `round_play.ts` keeps its one branch short of 100,
as before. The root's `yarn lint` passes.

**The mutation pass.** 20 mutants: 12 of `GameService`, 3 of
`RoundPlay`'s count, 3 of `withFrame()` and `newRunState()`, and 2 of
`describeShot()`. 15 were killed at once. Of the rest, the Paused card's
score was killed by the board's spec; a hot shot's words taken from the
round in the air rather than the waiting fuzzball, and a count that
added 10 a break, which the made-up flight's breaks all scored, were gaps,
now given specs and killed; `scored` set to 0 at release was dead code,
as an aimed round's state holds 0, and went (but see review item 1); and
the round's words always said of the next round aimed is equivalent, as
`describeRound()` reads the next start only for a round that leaves the
level on. After the review, 3 more: the bar's figures held back until
the next round is aimed, two ways, both killed; and `nextLevel()` keeping
the last flight's `scored`, equivalent, since the release that next reads
it is overwritten by the same frame's playback before anything shows it.

**The review:**

1. **`nextLevel()` carried the cleared level's `scored` into the next
   level's aimed state,** against `RunState.scored`'s meaning, though the
   same frame's playback overwrote it before anything read it. Fixed:
   `nextLevel()` sets it to 0, as it sets the round and the phase.
2. **The spec of the jump's points "as it lands" played on until the next
   round was aimed,** so it would pass if the bar held them back until
   then. Fixed: its helper stops as the flight lands.
3. **The records still run ahead of the playback,** the Levels dialog
   showing a level cleared during its last flight. Kept, as `plan.md`
   keeps the records at release; this section now says so.
4. **The hot shot's paragraph gave the wrong reason** for saying the
   charge during a flight. Fixed.
5. **A line of `AGENTS.md`'s `play/` paragraph ran past the margin.**
   Fixed: the paragraph reflowed.

## Part 3: after the feel gate

### X3's rules: the shell's and moss's traits

**2026-11-11.** The first of X3's two commits. The second, the shell and
moss in the catalog with their help entries and moss growing back as the
wall comes down, waits on the art: `BRICK_ART` in `src/view/art/art.ts`
`satisfies` a record of every cataloged kind, so cataloging the two
before the art stream draws them fails to compile, and the art is that
stream's. This commit plays the two traits in a flight, specced on
stand-ins, as R3 specced the traits before their kinds.

- **`SHELLED_RULE`** (`traits/shelled.ts`) shields its brick from a
  fuzzball with no charge: a plain fuzzball, or a friend, takes no hit off
  a shell and turns. Charge, a hot shot's among it, a zap and a blast hurt
  it, and nothing is earthed. The rest is the flight's own: `strike()`
  takes no hit and spends nothing, and a strike that takes no hit doesn't
  count against a fuzzball's boredom, as `plan.md` asks of "a shell it
  can't hurt". The view's clank for a strike that takes no hit
  (`src/view/effects/effects.ts`) already speaks for it.
- **`REGROWS_RULE`** (`traits/regrows.ts`) has no rule for any moment of a
  flight: moss takes hits as any brick, and grows one back only between
  rounds, which the next commit fills into `regrow()`.
- `TRAIT_RULES` plays both where it threw "not until level 28" and "29".
  Their comments naming the kinds stay, so the lines X1 and X2 change
  above them keep a line between theirs and these, and Git merges the
  map. It won't merge the rest without a hand: the imports, where X1's
  and X2's land between `not_until` and `zaps` as these do;
  `trait_rules.spec.ts`'s list of traits that throw, whose rows each
  stream takes out side by side; and `AGENTS.md`'s sentence listing the
  traits. Each conflict keeps both sides.

**Choices.**

1. **A shell's shield asks only whether a fuzzball strikes with no
   charge,** not whether it is a hot shot: a hot shot always flies at
   charge 5, so asking would change nothing.
2. **A charged fuzzball whose charge an earlier strike at the same moment
   spent** meets the shell plain, and turns off it, as the order of
   strikes at one moment (`implementation-plan.md`'s C1) says the charge
   is spent first.

**Checks.** The workspace's `lint`, `typecheck`, `test` and
`test:coverage` pass after the review: 4,881 tests in 112 files, the
coverage run's 4,731 in 92 at its floors, the two rules at 100%. The
root's `yarn lint` passes.

**The mutation pass.** 11 mutants, all killed: the shield on any cause
of strike, on any charge, on either, on a charge of 1 too, earthing as it
shields, and gone; a shell played as steel, as nothing, and moss as a
shell, in `TRAIT_RULES`; and moss shielding, or with a rule at a break.

**The review:**

1. **The log said Git merges the shared lines;** it merges the map, but
   the imports, the spec's list of traits that throw and `AGENTS.md`'s
   sentence will each need a hand. Fixed: the log says so.
2. **Two behaviours had no spec:** a fuzzball whose charge a strike at the
   same moment spent, meeting a shell (choice 2), and a shielded strike
   not counting against boredom (`implementation-plan.md`'s C2). Fixed: a
   flown spec of each, the second yawning at a boredom of 4 where a tough
   brick wouldn't.
3. **The log cited `plan.md` for C1, and called `effects.ts` the
   scene's.** Fixed.
4. **`SHELLED_RULE`'s doc read awkwardly.** Fixed, in the words suggested.
5. **`REGROWS_RULE`'s two specs came to one,** that it holds no rule.
   Fixed: one spec, `toEqual({})`. The spec of a charged fuzzball
   spending its charge on a shell passes for a tough brick too; it is
   kept, as it holds a shield on any charge off.
