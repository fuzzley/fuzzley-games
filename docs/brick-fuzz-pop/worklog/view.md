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
