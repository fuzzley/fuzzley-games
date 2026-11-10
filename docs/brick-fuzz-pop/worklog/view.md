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
   menu of `heading`, `speed` (described) and `speed-description` to five
   ids apart.
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
