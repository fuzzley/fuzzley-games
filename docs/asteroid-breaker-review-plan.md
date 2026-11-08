# Plan: a review of Asteroid Breaker, and what to improve

Reviewed 2026-11-08 at `f896a336`, `main`'s tip, eight days after Asteroid
Breaker shipped. The same day the user took every recommendation, so each
finding below states the change as decided, and the decisions are listed at
the end. Nothing is built yet. The review covers `frontend/games/asteroid-breaker/` (its rules, view,
scene, shell, specs, tools and configs) and the shared code it stands on
(`@fz/core`, `@fz/phaser`, `@fz/game-ui`, the `@fz/ui` entries it imports
and `@fz/dev`), read beside Brick Breaker and Snake, which share its shape.
It looks for what would make the code easier to read, reuse, test and
change, and for where it strays from the repository's rules, Google's
TypeScript style guide, and Angular's, Phaser's and Vitest's own practice.
Paths are relative to `frontend/games/asteroid-breaker/` unless they start
with `frontend/`, and line numbers are as of `f896a336`.

Each finding gives a **priority** (High, Medium or Low), a rough **effort**
(S under an hour, M a few hours, L a day or more), what was found, and the
change decided, with its trade-offs where it has any. Findings already
listed under "Left for the user" in
`docs/archive/asteroid-breaker-execution-plan.md` say so, and say what is
new.

## Where things stand

The game is in very good health. This plan tidies, lifts copies into the
libraries and makes the suite cheaper. It rescues nothing.

- **The checks pass, and the code is disciplined.** `yarn lint` (21 s) and
  `yarn typecheck` (13 s) pass clean. Outside the specs there is one
  `eslint-disable` (an `autofocus` in the result card), no `as unknown as`,
  no non-null assertion, no `public` keyword, no `@HostListener` or
  `@Input`, and no `TODO`.
- **The tests are thorough.** 81 spec files and 4,760 tests pass in 47 s on
  this 24-core machine (525 s of CPU), covering 99.7% of statements, 97.7%
  of branches, 99.7% of functions and 99.9% of lines. The specs follow
  arrange, act, assert, read fields as pictures (`fieldFrom()`), run real
  Phaser headless and use real services. Of the 108 tests written in
  `GameService`'s spec and the 63 in the board's, none makes three or more
  assertions.
- **The layers hold.** The rules have 304 functions with a median of 6
  lines. Only three run past 45 lines, all of them saved-game validators.
  The rules and the view have no import cycle at runtime, and nothing in
  the rules reads the clock or `Math.random`. The catalogs are
  `as const satisfies`, and `TRAIT_RULES`, `EFFECT_RULES`, `LAYOUTS`,
  `ROCK_ART` and `EVENT_EFFECTS` are mapped over their unions, so new
  content without its rule or its art fails to compile.
- **The shell is modern Angular:** standalone components, `inject()`,
  `input()` and `output()`, `host` bindings, `@let`, `@switch` with
  `@default never;`, no RxJS and no lifecycle hooks. The field, which
  changes 120 times a second, stays out of signals.
- **But it is CI's slowest workspace.** On CI run 42451470682 (this
  commit), its suite took 368 s and finished last, holding `yarn test` at
  6 m 42 s of the 9 m 9 s `verify` step. The next slowest, the Solitaire
  Collection's, took 227 s.

What the review found falls into four kinds:

1. **Two things that behave wrongly:** a broken crystal sprays the wrong
   color, and a wave after the first can be paused before it starts while
   the first can't (findings 1 and 2).
2. **A suite that costs more than it must,** with no floor under the
   scene, the shell or the helpers the specs trust (findings 3 to 8).
3. **A few classes that do too much,** where logic sits out of reach of
   the view's floor: `GameService`, `BoardComponent`, `BeltScene`,
   `EffectsPainter`, and the saved game's validators (findings 9 to 17).
4. **Copies kept in step by hand** across the three games drawn with
   Phaser, several now past the libraries' "two workspaces need it" bar,
   and one fix that reached only this game's copy (findings 18 to 22).

## Summary

| #   | Finding                                                         | Priority | Effort |
| --- | --------------------------------------------------------------- | -------- | ------ |
| 1   | A crystal's shards and dust take its gem's ink, not its body's  | High     | S      |
| 2   | A wave after the first can be paused before its first move      | Medium   | M      |
| 3   | The simulation specs run under coverage, which triples them     | High     | S–M    |
| 4   | Specs with no DOM pay for jsdom, TestBed and Analog             | Medium   | M      |
| 5   | The scene, the shell and the specs' helpers have no floor       | Medium   | S–M    |
| 6   | Nothing in lint keeps the rules deterministic                   | Low      | S      |
| 7   | The tools' contract with the source is unchecked                | Low      | S–M    |
| 8   | Spec tidy-ups                                                   | Low      | S      |
| 9   | `GameService` does about twelve jobs                            | High     | M–L    |
| 10  | `BoardComponent` does about nine                                | Medium   | M      |
| 11  | `BeltScene` and `EffectsPainter` hold logic the view could test | Medium   | M      |
| 12  | The painter contract is half applied                            | Low      | S–M    |
| 13  | `saved_game.ts` is two modules, with the rules' longest code    | Medium   | M      |
| 14  | The whole `Field` is passed where a part of it would do         | Medium   | M      |
| 15  | A resize may rebake the whole atlas every frame                 | Medium   | M      |
| 16  | The rules' tidy-ups                                             | Low      | S      |
| 17  | The view's, the scene's and the shell's tidy-ups                | Low      | S      |
| 18  | `@fz/core` takes what both breakers copy                        | Medium   | S–M    |
| 19  | `@fz/phaser` takes the scenes' and the boards' copies           | Medium   | M      |
| 20  | `@fz/ui` and `@fz/game-ui` take the shells' copies              | Medium   | M–L    |
| 21  | `@fz/dev` takes the fences and the scripts' copies              | Medium   | M      |
| 22  | The libraries' own loose ends                                   | Low      | S–M    |

## Part 1: what behaves wrongly

### 1. A crystal's shards and dust take its gem's ink, not its body's

**Priority:** High. **Effort:** S.

**What was found.** `BeltScene.flourish()` colors a broken rock's shards
and dust with `palette.rocks[rockKindOf(event)]`
(`src/scene/belt_scene.ts:329` and `:340`). A crystal's ink is its gem's
(`src/view/colors/inks.ts:8`), while `rockColor()`
(`src/view/art/rock_art.ts:348`) maps a crystal to a stone's body, and its
doc says that is the color "its shards take". The worklog decided the same
(`docs/archive/asteroid-breaker-worklog.md:2803`). Only the bake calls
`rockColor()`, so a broken crystal sprays violet where it should spray
stone. `src/scene/flourishes.spec.ts` checks a stone's shards and dust
only.

**Change.** Both calls take `rockColor(rockKindOf(event), palette)`, and
the flourishes' spec breaks a crystal and holds its shards and its dust to
a stone's ink.

### 2. A wave after the first can be paused before its first move

**Priority:** Medium. **Effort:** M.

**What was found.** The first wave waits in the `"ready"` outcome, which
`pause()` (`src/rules/run/run.ts:123`) leaves alone, so the bar's Pause is
dimmed and looking away pauses nothing. A later wave starts as `"playing"`
with `GameService.waiting()` true (`startWave()`, `run.ts:117`), and
`GameService.pause()` (`src/app/play/game.service.ts:342`) doesn't look at
`waiting`. So on wave 2 and after, Pause is live while the Ready card shows,
and looking away swaps the Ready card for the Paused one, which then needs
"go on" before the wave can begin. The review's throwaway spec confirmed
both: wave 1 stays `["ready", true]`, wave 2 becomes `["paused", true]`.
The cause is that `waiting` says again what `"ready"` means, for the first
wave only.

**Decided: every wave waits in `"ready"`** (decision 1). A guard in
`pause()` and the bar would have hidden the symptom and kept the two
meanings; this removes the second one.

- `startWave()` turns `"ready"` into `"playing"` only, and a new
  `nextWave()` turns `"cleared"` into the next wave, `"ready"`. The first
  move of any wave calls `startWave()`.
- The run is counted as started (`StatsService.recordStart()`) at the
  first move of its first wave only, as today.
- `GameService.waiting` becomes a `computed` of `outcome() === "ready"`,
  and its `waitingState` goes, with the three places that set it
  (`game.service.ts:479`, `:556` and `:723`).
- So on every wave, Pause is dimmed and looking away does nothing until
  the first move, as on wave 1 today, and the Ready card shows by the
  outcome alone.
- The saved game keeps no outcome, as a run is always taken up paused, so
  its stored shape doesn't change. Its writer already keeps a wave not
  yet moved as not yet begun.
- Specs: wave 2 waiting holds `"ready"` through `pause()` and the room
  being left, its Pause is dimmed, and a run cleared to wave 2 and
  reloaded is taken up paused as before.

## Part 2: the test suite

### 3. The simulation specs run under coverage, which triples them

**Priority:** High. **Effort:** S–M.

**What was found.** `yarn test` is `vitest run --coverage` over every spec,
including the nine files of `src/rules/waves/every_wave/`,
`src/rules/waves/every_endless_wave/` and `src/rules/field/every_layout/`,
which play every wave or lay every wave out. V8 coverage makes them about
3.2 times slower: `every_wave/normal` takes 9.0 s without it and 29.5 s
with it, and `every_layout/normal` 11.5 s and 37.3 s. The nine files cost
about 103 s of CPU without coverage and 330 s with it.

The coverage buys nothing. The 28 other rules specs alone hold `src/rules/`
to 100% of statements, functions and lines and 99.2% of branches, above its
floor of 100, 95, 100 and 100.

On CI's four cores, `--maxWorkers=25%` gives each workspace one worker, so
the per-speed split made on 2026-11-07 helps this machine but not CI, where
the nine files run one after another.

**Decided: the simulations run without coverage, here and in Brick
Breaker** (decision 2). A Vitest project of their own, `sim`:

```json
"test": "vitest run --coverage --project unit \"$@\" && vitest run --project sim \"$@\""
```

The `"$@"` matters: the review read Yarn 4.18.1's shell as appending a
script's arguments to the last command of a chain unless the script
names them, which would hand the root's `--maxWorkers=25%` to the second
run only. Check that while building it. Brick Breaker's
`src/rules/levels/every_level/` takes the same split.

**Expected effect.** About 150 s for this workspace on CI, so `yarn test`
is bound by the Solitaire Collection's 227 s, roughly 80 s off `verify`;
locally, about 35 to 40 s less CPU. The per-speed split, its guard
(`speedOfSpec()`), and the independent `nearness()` check stay as they are.

**Later, if CI is still slow.** The review measured the same simulations
run from one esbuild bundle at about a third of their time from source
modules (90 plays of every written wave: 8.0 s against 3.1 s; 4,320
layouts: 10.5 s against 3.4 s), the module runner's cost on millions of
calls across modules. It is a bigger change for a smaller gain once
finding 3 is built, so it is left for then.

### 4. Specs with no DOM pay for jsdom, TestBed and Analog

**Priority:** Medium. **Effort:** M.

**What was found.** `@fz/dev`'s `angularTests()`
(`frontend/lib/dev/src/vitest.ts:77`) runs every spec in jsdom, behind
`src/test-setup.ts`'s TestBed, jest-dom and headless Phaser, with Analog's
plugin. A rules spec such as `src/rules/draws.spec.ts` takes 9.2 s of wall
time today, of which the test is about 10 ms; in a Node project it takes
1.8 s. Analog's plugin alone costs about 6.6 s of startup. 52 of the 53
rules and view spec files (2,427 tests) pass unchanged in Node. The one
exception, `src/view/art/art.spec.ts`, imports `atlasSize()` from
`@fz/phaser/scene`, which loads Phaser and so needs a window, though the
function is packing arithmetic
(`frontend/lib/phaser/src/scene/bake_atlas.ts:93`).

**Change.** Three Vitest projects, as the site already has
(`frontend/site/vite.config.ts:55`): `dom`, jsdom with Analog, for
`src/app/` and `src/scene/`; `pure`, `nodeSpecs()`, for `src/rules/`,
`src/view/` and `src/testing/`; and finding 3's `sim`. Analog goes on `dom`
only. `atlasSize()` moves to `@fz/phaser/shapes`, beside `pack()`. The docs'
`yarn vitest run <path>` becomes `yarn vitest run --project pure <path>`,
since without `--project` Vitest starts every project (2.8 s against 8.8 s
measured). Once it is proven here, finding 21 makes the three projects
`@fz/dev`'s `angularTests()`, and Brick Breaker and Snake take them there.

### 5. The scene, the shell and the specs' helpers have no floor

**Priority:** Medium. **Effort:** S–M.

**What was found.**

- `vitest.config.ts` floors `src/rules/**` and `src/view/**` only. The
  scene measures about 98.9% of statements and 93.0% of branches, and the
  shell about 99.4% and 98.8%, but nothing keeps them there. Sudoku floors
  its shell "so a feature without specs fails the run".
- `src/testing/**` is left out of coverage, and only `kept_run.ts` has a
  spec. Several helpers hold logic that specs trust: `within()`,
  `distanceToEdge()` and `edgeOf()` in `art_frames.ts`, `entryOf()` and
  `entriesOf()` in `crossings.ts`, `strokesOf()` in `belt_board.ts`, which
  parses Phaser's command buffer, `nearness()` in `every_layout.ts`, the
  oracle for a fair layout, and `boardOf()` in `canvases.ts`. If `within()`
  always answered true, `src/view/art/rock_art.spec.ts:189` would pass
  without testing anything. Brick Breaker's review found the same gap in
  `inspectPhaserBoard()` (its R12).

**Change.** Floors for `src/scene/**` (98, 92, 100, 99) and `src/app/**`
(98, 97, 97, 98), a little under today's figures, raised as they rise. Short
specs for the helpers above, `fieldFrom()`'s throws among them, and
`src/testing/**` counted in the report with no floor, so what goes untested
shows; finding 22 makes that the rule for every library's `src/testing/`
too.

### 6. Nothing in lint keeps the rules deterministic

**Priority:** Low. **Effort:** S.

**What was found.** The simulations, the saved games, Endless's waves made
again from a seed and `keptRun()` all rely on the rules and the view never
reading the clock, `Math.random` or the page. Today none does, but
`eslint.config.js` fences imports only.

**Change.** For `src/rules/**` and `src/view/**`, but their specs:
`no-restricted-properties` for `Math.random`, `Date.now` and
`performance.now`, `no-restricted-globals` for `window`, `document`,
`localStorage`, `setTimeout` and the like, and `no-restricted-syntax` for
`new Date()`. Finding 21 moves the fences into `@fz/dev`, where these
rules then hold for every game drawn with Phaser.

### 7. The tools' contract with the source is unchecked

**Priority:** Low. **Effort:** S–M.

**What was found.**

- `tools/report-waves.mjs:191` loads the autopilot through Vite's
  `runnerImport` and casts what it gets to its `Rules` typedef, and
  `tools/capture-screenshots.mjs:146` does the same for `keptRun()` and
  `formatPoints()`. Renaming `playWave()`, `ENDLESS_PLAYED` or `keptRun()`
  passes lint, typecheck and the tests, and the script fails only when run.
- `src/testing/autopilot.ts` and `kept_run.ts` must stay loadable without
  the Angular plugin, but `eslint.config.js` puts no fence on
  `src/testing/`.
- `report:waves` lays its names out in 16 characters (`NAME_WIDTH`,
  `report-waves.mjs:43`), though "30 Eye of the storm" takes 19, so three
  rows run out of their columns; and `--help` or `--seeds x` ends in a
  stack trace where the screenshot script prints its usage.

**Change.** A TypeScript entry for each script (for example
`src/testing/report_api.ts`) exporting one typed object, so a rename fails
`tsc`; the rules' fence over the helpers the scripts load; the name width
taken from the longest name; and a usage message and exit code 2 for a bad
option, as `@fz/dev/layout`'s `runLayoutScript()` does. The scripts' pure
functions, such as the report's columns, are exported and specced in
`pure`, as the site's `tools/*.spec.ts` are.

### 8. Spec tidy-ups

**Priority:** Low. **Effort:** S.

- **Copied constants.** `src/testing/field_picture.ts:98` and `:104` write
  `?? 48` and `?? 2` where `ROCK_CAP` and `PICKUPS_AT_ONCE` exist, so a
  change to either leaves every pictured field at the old number.
  `src/testing/canvases.ts:33` copies `@fz/game-ui`'s bar and rail sizes
  from its Sass (`frontend/lib/game-ui/src/_index.scss:9`). The first two
  are imported. The sizes can't be imported from Sass, so a spec compiles
  the partial with `sass`, already a devDependency, and holds
  `canvases.ts` to its sizes.
- **Names.** `field_picture.ts`'s `eventsOf()` returns event kinds, while
  `rocks.spec.ts`'s `eventsOf()` returns events and its `logged()` returns
  kinds; `speedOf` is written four times; `fieldOf` has four signatures in
  four specs. `rocks.spec.ts` takes `field_picture.ts`'s helpers, and one
  `speedOf` is exported.
- **Long blocks.** `describe("stepField")` in `src/rules/field/field.spec.ts`
  holds about 60 tests over 700 lines; nest them by theme (flying and
  firing, shots meeting rocks, losing a ship, clearing, the next ship).
  `flourishes.spec.ts` writes `addPilot("lost", …)` eleven times and the
  "nothing playing" snapshot twice.
- **Noise.** `src/app/board/board.component.spec.ts:766` makes the scene
  fail on purpose, and the error is printed in every run of the suite.
  Provide an `ErrorHandler` that collects it, and assert on that.
- **Small points.** `LAYOUT_SEEDS` is a mutable `number[]`;
  `src/testing/numbers.ts` is missing from `AGENTS.md`'s Tests and the
  testing skill; `eslint.config.js` and `stylelint.config.js` are neither
  linted nor type-checked; `belt_board.ts` imports `../scene/belt_scene`
  twice.

## Part 3: Asteroid Breaker's own structure

### 9. `GameService` does about twelve jobs

**Priority:** High. **Effort:** M–L.

**What was found.** `src/app/play/game.service.ts` is 738 lines, with 13
writable signals, 8 plain mutable fields and 8 injected services. It holds
the run's states, steps the frame, gathers what to say, keeps the records,
applies the debug menu's tuning, asks before a run is lost, writes the
speed to the settings, feeds the saved game, shapes the field to its room,
times the cards, counts runs for the focus and gates play on the board
being drawn. In particular:

- `begin()` (`:706`) resets seven pieces of a run's state by hand and
  `showField()` (`:721`) three more, and `takeUp()` (`:464`) sets three of
  them again after `begin()`. A field left out of `begin()` carries into
  the next run without a word.
- Whether a run was flown on tuned numbers is checked four times
  (`if (!this.retunedRun)` at `:552`, `:582`, `:594` and `:612`), and
  `retuned` (`:512`) is a hand-kept copy of `isRetuned(tuningState())`.
- The field initializers depend on their order: `runState` (`:140`) and
  `wavePlay` read `held`, `tuningState` and `torus` as they are made, so
  moving a declaration breaks startup at runtime, past the compiler.
- To check that a tuned run keeps no records, the spec must clear three
  waves and end the run (`game.service.spec.ts:1113`).

The frame step is code the view's floor would hold, but it sits in the
shell, which has none (finding 5).

**Change.** Do for the run what Brick Breaker's R8 and R10 did for its
level:

- **The frame step goes to the view,** beside `WavePlay`: a class that
  takes the field's news since the last frame and returns what changed in
  the run and what to say (`playOn`, `hear`, `takeIn`, `news` and
  `openAfter` today), tested in Node under the view's floor.
- **The records are a pure function** in `src/rules/run/stats.ts`, such as
  `recordsOf(before, after)`, applied by `StatsService` and
  `ProgressService` behind one check of whether the run was tuned.
- **A run's own state is one record** in one signal, replaced whole by
  `begin()`, so nothing of one run can reach the next.
- **The debug menu's tuning is a small service** of its own, and
  `retuned` a `computed`.

What is left of `GameService` is the run's signals and the calls into
Angular's services, and its 1,406-line spec splits along the same lines.

### 10. `BoardComponent` does about nine jobs

**Priority:** Medium. **Effort:** M.

**What was found.** `src/app/board/board.component.ts` (556 lines)
describes the board to assistive technology, publishes what the layout
check reads (`data-field`, `data-room`, `data-deck`, `--across`, `--down`,
`--pixel-ratio`), measures itself, works out the cards (eleven `computed`s,
`:198` to `:276`), wires the scene, hands the focus on, buzzes the phone,
says when the field is drawn and works out where the deck shows. Besides:

- `onLayout` (`:300`) works out `fieldMetrics(…).room` and `deckLayout()`
  again, though the scene has just worked out both
  (`src/scene/belt_scene.ts:448`), and gets them right only by reading
  `game.frame().field.torus` before `setRoom()`.
- `buzzAsTheRunChanges()` (`:436`) compares two `Run`s in an effect, so the
  changes between two of its runs merge. `buzzOf()` compares
  `flying.length`, so a ship lost and one gained in the same frame would
  cancel. That is plausible but unverified; the field's events, which
  `GameService` already hears, would say it exactly.

**Change.** The cards become `<app-board-card>`, with their inputs and
computeds, so the spec's cards block (`board.component.spec.ts:504` to
`:800`) runs without the fake canvas. Haptics become a small service driven
by the field's events. The scene hands `onLayout` the metrics and the
deck's zones it already has. Measuring moves to `@fz/phaser` (finding 19),
and the rectangles' strings to a helper beside `@fz/dev/layout`'s reader,
which Brick Breaker and Snake write inline too.

### 11. `BeltScene` and `EffectsPainter` hold logic the view could test

**Priority:** Medium. **Effort:** M.

**What was found.** `src/scene/belt_scene.ts` (587 lines) dispatches every
flourish in an 80-line `switch` (`flourish()`, `:316`), binds the keys and
fingers and lets go of them as the player looks away (`:520` to `:579`),
measures and bakes (`:419` to `:502`), and points the field's camera, whose
scroll `EffectsPainter` also moves for the kick and the shake
(`src/scene/painters/effects_painter.ts:510`).
`effects_painter.ts` (531 lines) keeps flourish timings of its own
(`:37` to `:75`, `EXHAUST_MS` the only `*_MS` outside
`src/view/effects/timing.ts`), the exhaust's emission arithmetic (`:387`),
and when a dash's trail lays an outline (`:488`). The scene has no
coverage floor, so this logic escapes the one its siblings in
`src/view/effects/flourish.ts` meet.

**Change.**

- A `FlourishPlayer` in `src/scene/` that maps each `Flourish` to its
  painter's call, specced on its own.
- A `FieldCamera` that owns the field camera's viewport, scroll, kick and
  shake, so the scroll is written in one place.
- `EffectsPainter`'s timings and its pure helpers, such as
  `exhaustDue(carried, dtMs)` and `trailOutlinesLaid(field, dash)`, move to
  `src/view/effects/`, under the view's floor; the painter splits into the
  shards and dust, the trail, the rings and the camera.
- The input and focus binding moves to `@fz/phaser` (finding 19).

### 12. The painter contract is half applied

**Priority:** Low. **Effort:** S–M.

**What was found.** `Painter.refresh?(baked)` (`src/scene/painters/painter.ts:45`)
hands each painter what the atlas was baked at, but all ten of this game's
painters declare `refresh(): void`, and `rebake()` (`belt_scene.ts:494`)
builds a `Baked` for nobody; only Brick Breaker's paddle painter reads it.
Most `refresh()` bodies are the same loop over `Copies`. `startField()`
(`belt_scene.ts:508`) resets the effects, the points, the rocks and the
strays, and fits the rocks and the shots, each by name, so a new painter
can be missed there. The scene keeps 13 public fields writable
(`:128` to `:152`), and `RockPainter.bodies`, `taken` and
`ShotPainter.shots` are mutable arrays, read by specs.

**Change.** This game's `Painter` drops the `Baked` parameter, which
none of its painters needs, and `rebake()` stops building one (Brick
Breaker's interface, whose paddle reads it, keeps it); `Painter` gains an
optional `start?(field)` that the scene calls in its loop as it does
`draw()`; and the fields become `readonly`, the arrays `readonly Copies[]`.
A `retakeFrames(scene, atlas)` in `@fz/phaser/scene`, which points every
image on a baked texture at its frame again, would remove most `refresh()`
bodies here, in Brick Breaker and in Snake.

### 13. `saved_game.ts` is two modules, with the rules' longest code

**Priority:** Medium. **Effort:** M.

**What was found.** `src/rules/run/saved_game.ts` (534 lines) keeps both
the run's saved form (`SavedGame`, `saveGame()`, `restoreGame()`) and the
field's (`SavedField`, `restoredField()`, `restoredRock()`,
`takeUpField()`). Its validators are the three most complex functions in
the rules: `restoreGame()` (73 lines, 29 branches, two `||` chains of 11
and 10 terms), `restoredField()` (22 branches) and `restoredRock()` (22).
Each kept rock key is written three times: taken apart, checked and
returned. `takeUpField()` writes ten counters across the field, its strays
and its comets from `run/`, and its last two lines repeat `field.ts`'s
private `bringShip()`. A dropped save gives no reason, though `parseWave()`
names what is wrong.

**Change.** The field's half moves to `src/rules/field/kept_field.ts`,
taking `bringShip()` from `field.ts`. `restoreGame()` splits into a
`restoredRun()` and the field's part, its `||` chains into named checks
(the run's numbers in range, a sound crew). The rock check is driven from
a table typed `Record<KeptRockKey, Check>`, so each key is written once.
A dropped save still says nothing to the player, but the checks are named
and exported, so a spec that spoils one value is held to failing that
check, not passing by failing another. Finding 18's `listOf()` and `isFiniteNumber()` shorten the rest.

### 14. The whole `Field` is passed where a part of it would do

**Priority:** Medium. **Effort:** M.

**What was found.**

- The rocks, the drops, the scoring and the crew declare the part of the
  field they need (`RockField`, `DropField`, `ScoreField`, `CrewField`);
  the comets, the strays, the crossings, the pickups, `fill.ts` and parts of
  `scoring.ts` take the whole `Field`. So the comet and stray specs must
  build a whole field, and 13 modules form a cycle of type imports only
  (`WaveStart` is defined in `run/run.ts:55` and imported back by
  `field/field.ts:73`). It is harmless at runtime, but it shows `Field`
  has become the one type everything leans on.
- `liesFairly()` (`src/rules/field/spawn.ts:70`) flies a copy of a rock
  over `{ ...field, ship }`, about 40 keys copied a call, which still
  shares the field's `events`, `rocks` and `pickups`. That a trait's step
  rule touches the rock alone is promised only by a doc comment
  (`rocks/rocks.ts:114`); a rule that logged an event would log phantoms
  each time a wave is laid out.
- `stepShots()` (`src/rules/ship/shots.ts:126`) takes seven positional
  parameters, two with defaults (`gunnery = TUNED_GUNNERY`,
  `flight = TUNED_FLIGHT`), so a new caller that forgets
  `field.gunnery` ignores the debug menu without a word. `pull()` and
  `flyFairly()` take six.

**Change.** `CometField`, `StrayField`, `CrossingField` and `EffectField`
as `Pick`s of `Field`, and `WaveStart` defined in `field.ts`; a step rule
typed over a read-only `CourseField` (the ship, the torus, the pace and the
rocks' speed), which `liesFairly()` builds with those four keys alone, so
the compiler keeps the promise; and a `ShotField` for `stepShots()`, with
the defaults gone (specs pass `TUNED_*`).

### 15. A resize may rebake the whole atlas every frame

**Priority:** Medium. **Effort:** M, after a measurement.

**What was found.** The field's unit is a fraction of a device pixel by
design, and `bakedScale()` (`src/view/art/shapes.ts:41`) bakes at it, up to
32 device pixels. So below that, nearly every frame of a resize or a turn
changes the unit, `measure()` (`belt_scene.ts:448`) calls the bake stale,
and `bake()` draws about 160 frames again and encodes the 17 pictures of
How to play as PNGs (`textures.getBase64`) for the shell. The zoom
(`unit / baked.unit`) already draws a bake a little off its unit, and the
build's performance trace never traced a resize. In the same vein:
`PointsPainter` calls `setText()` on its `Text` objects for every score,
each a canvas texture drawn and uploaded, which a chain of blasts does
several times in a frame; and `rechargeRing()`
(`src/view/steering/deck.ts:145`) makes a new record each frame the dash
recharges, though the scene's `update()` promises it makes none.

**Decided: measure, then act on what the trace shows** (decision 5).

- **First, a trace** in headless Chrome at 2×, throttled as the build's
  were (×6): a window dragged from 1280 × 720 to 800 × 600, a phone turned,
  and a wave with a chain of blasts, logged in the work log.
- **If the bake shows,** it bakes at the unit rounded down to a whole
  device pixel, so a drag rebakes once a pixel rather than once a frame,
  and the zoom covers the rest; and the scene encodes How to play's
  pictures only when the board asks for them as How to play opens, keeping
  them until the next bake, rather than at every bake. A spec holds a
  resize within one device pixel to no rebake.
- **If the points' uploads show** in the chain, the points are drawn from
  digits baked into the atlas; else they stay `Text`.
- **Either way,** `rechargeRing()` takes an `into` record, as `toCanvas()`
  does, so the scene's `update()` keeps its promise to make nothing.

### 16. The rules' tidy-ups

**Priority:** Low. **Effort:** S.

- **`tallyOf()` gets the rocks' points by subtraction**
  (`src/rules/field/scoring.ts:127`: the score less the chains, the strays,
  the clearing and the clean bonus), so a new source of points lands in
  "Rocks" without a word; the worklog records it showing −200 once
  (A12.2.1), mended with a check on restore. Decided (decision 6): the
  field counts the rocks' points as `scoreBreak()` scores them, and the
  tally is a sum. The saved game keeps the count as an optional field, as
  `AGENTS.md` says a field added later is, and a game saved before it
  works the count out as today, so no player's run is dropped; the check
  on restore stays for those.
- **Dead code.** `pointsOf()` (`scoring.ts:136`) has no caller but its spec.
  It goes, with its spec and its mention in `AGENTS.md`; the Cleared card
  shows no total, as designed.
- **Records written twice.** `blankEvent()` and `record()`
  (`src/rules/field/events.ts:122` and `:274`) each write the same 16
  fields, guarded by a 25-line spec; a frozen blank and `Object.assign()`
  write them once, still making nothing. `createEffects()` lists the six
  effect kinds by hand where `recordOf(EFFECT_KINDS, …)` would, which takes
  a step out of the content skill's list. `steerField()` copies seven
  fields one by one, where `Object.assign(field.steer, steer)` does it.
- **Names that collide.** Two private `rocksOf` in `src/rules/waves/`, one
  checking a wave's data and one spending a budget; two `PACE`s, a bound of
  0.8 to 1.4 in `waves.ts` and a climb to 1.6 in `endless.ts`; two private
  `drift`s, a lodestone's pull and a pickup's float. Each takes a name of
  its own (`buyRocks`, `ENDLESS_PACE`, `pullTowardShip`). Readers of stored
  JSON are called both `xOf` and `restoredX`; they take one verb, `read…`
  for a reader that answers `null`, keeping `parse…` for one that throws.
- **By hand where a helper exists.** A clamp in `src/rules/ship/ship.ts:358`;
  `Math.PI` in `hazards/crossing.ts` and `ship/ship.ts` where the rest use
  `TURN`; the field's middle worked out in `ship/pilots.ts:352` beside
  `middleOf()`. Each takes the helper, and the unnamed margin,
  `ROCK_RADIUS.large - 1` in `field/spawn.ts:136`, a name.

### 17. The view's, the scene's and the shell's tidy-ups

**Priority:** Low. **Effort:** S.

- **Sizes restated beside the art.** `PICKUP_REACH`, `SHOT_REACH` and
  `RIM` in the painters copy the art's sizes in `src/view/art/art.ts`,
  which the ship's art exports for itself (`SHIP_REACH`). Each art piece
  exports its reach, with a spec that it covers what is drawn, so resizing
  the art can't make copies pop at the edges.
- **The wrap written twice.** `drawRings()` (`effects_painter.ts:447`)
  works out the copies across the edges again, as `Copies` does; one
  `copyOffsets()` beside `copyShift()` serves both.
- **Scratch records for a call.** `toCanvas(metrics, place, into)` takes a
  `Place`, so six painters keep a scratch one. A `toCanvas()` that takes
  `x` and `y`, and a `wrappedBetween()`, remove them and the six
  hand-written `betweenOnAxis()` pairs. The ship's drawn place, worked out
  by three painters, goes into the `PaintContext` once a frame.
- **Layers and cameras said twice.** Which camera draws which layer is
  both `FIELD_LAYERS` (`belt_scene.ts:107`) and `ignore([frame, deck])`
  (`:236`); and the rock's flash is drawn in the effects layer, its order
  set by which painter is made first. Each layer names its camera in
  `src/view/field/layers.ts`, and the flash gets a layer of its own.
  `depthOf()` there is used only by its spec, so it goes, and the spec
  holds the order of `LAYERS` itself.
- **The debug menu is half of the settings drawer**
  (`src/app/settings/settings.component.ts:117` to `:145` and `:176` to
  `:218`, and the template's `:141` to `:202`): it becomes
  `<app-debug-tuning>`, its spec moving with it.
- **The "Still loading" card** (`board.component.html:72`) is a
  `role="status"` inserted with its words already in it, which the
  `web-game-accessibility` skill says may go unannounced. A status region
  stays in the page from the start, empty until the canvas turns slow. The
  announcer can't do it once finding 19 lifts the card into
  `@fz/phaser/canvas`, which depends on no `@fz/ui`, so the region is the
  fix that survives the lift.
- **Docs.** 266 lines of doc comments in the game's source run past 100
  characters, against 50 in Brick Breaker's, since Prettier doesn't wrap
  comments; they are wrapped as each file is touched by this plan.
  `src/view/effects/effects.ts:109` tells the plan's history, which the
  documentation rules leave out, so it goes.
- **Small points.** `belt_scene.ts:220` reads the font from the global
  `getComputedStyle()`, which the scene's options hand it instead; the deck
  painter takes `Steering` by its constructor where every other painter
  reads the `PaintContext`, which takes the deck's state; and `press()`
  looks a key up once rather than twice (`:569`).

## Part 4: code shared with the other games

The libraries' rule is that a helper moves into one once two workspaces
need it. Each item below is past it, and most are verbatim. Each lift is
built in one game, then adopted by the others in the same branch, so no
copy is left behind.

### 18. `@fz/core` takes what both breakers copy

**Priority:** Medium. **Effort:** S–M.

- **`stepper.ts` and its spec are byte-identical** in both breakers. Each
  only binds its own constants, so `@fz/core/clock` offers the factory.
- **`between()`** (`src/view/field/frame.ts:75`) is Brick Breaker's word for
  word, and `shareDone()`, `fadeAlpha()` and `spread()` in
  `src/view/effects/flourish.ts` are its `shareDone()`, `fadeAlpha()` and
  `growScale()`. They go to `@fz/core/math` as `lerp()` and the curves.
- **`nextShipAfter()`** (`src/rules/run/run.ts:185`) is Brick Breaker's
  `nextLifeAfter()`: `nextMarkAfter(score, first, every)`.
- **Seeds mixed by hand.** `seed ^ Math.imul(n, K)` is written at four
  places with four unnamed constants (`run/run.ts:167` and Brick Breaker's
  with `0x85ebca6b`, `waves/endless.ts:121`, `view/field/specks.ts:48`).
  Saved games and Endless's waves depend on these numbers, but only
  `drawAt()`'s are pinned. `mixSeed(seed, n, stream)` in `@fz/core/random`,
  its streams named and their first outputs pinned by its spec; the
  numbers themselves never change.
- **Readers of stored JSON.** `isFiniteNumber()` was left with one use
  (execution plan, A12.2.1); Brick Breaker now writes it inline. "A list
  whose every item reads, else `null`" is written by hand here
  (`pilotsOf()`), in Snake, Sudoku and, in a variant, Minesweeper.
  `isFiniteNumber()` and `listOf(value, read)` join `@fz/core/json`.
  `isOneOf()` and `isKeyOf()`, already listed for `@fz/core/records`, go
  with them.
- **A count up to a mark.** The card's wait in `FieldPlay`
  (`frontend/lib/core/src/field_play.ts:75`) and Brick Breaker's
  `serveAfterLoss()` count time to a threshold the same way; a `Countdown`
  serves both. And both games' plays write their frame as
  `interface Frame extends FieldFrame { alpha: number }`, restating
  `PlayFrame` (`field_play.ts:13`), the shape `FieldPlay` asks of a frame;
  they extend it instead.

Not lifted: the run's states (Brick Breaker's has `won`), and
`sweepShot()` with Brick Breaker's `sweepPoint()`, which solve one equation
but treat a graze differently on purpose.

### 19. `@fz/phaser` takes the scenes' and the boards' copies

**Priority:** Medium. **Effort:** M.

- **Letting go as the player looks away.** `letGoWhenAway()`
  (`belt_scene.ts:543`) is Brick Breaker's (`bricks_scene.ts:451`) but for a
  comment. With the modifier check (`ctrlKey || altKey || metaKey`, in four
  places) and the scene key counter (`private static built = 0`, in four
  scenes, the Solitaire Collection's among them), these become
  `onPlayerAway()`, `isShortcut()` and `uniqueSceneKey()` in
  `@fz/phaser/scene`, beside `picturesOf()` for How to play's pictures and
  finding 12's `retakeFrames()`.
- **The board measures what the scaler measures.** `canvasOf()`
  (`src/app/board/board.component.ts:489`) and Brick Breaker's `roomOf()`
  read the `--fz-canvas-inset-*` properties by hand, through the global
  `getComputedStyle()`, as `ViewportScaler`'s private `readInsets()` does.
  And the placeholder's pixel ratio is `canvasPixelRatio()`, worked out
  once, while the scaler budgets past 2× (`pixelRatioFor()`,
  `frontend/lib/phaser/src/host/viewport_scaler.ts:272`): at 2.5× on a
  large window, the scene draws at 2 and the placeholder works at 2.5, and
  neither follows a change of zoom. The inset reader and `pixelRatioFor()`
  move to `@fz/phaser/layout`, read through the element's own window, and
  `@fz/phaser/canvas` offers a `watchCanvasViewport()` both boards take.
- **The shapes' transforms.** `src/view/art/shapes.ts` (344 lines) holds
  `centered()`, `bounded()`, `shifted()` and `scaledBy()`, exhaustive
  `switch`es over the library's `DrawCommand`, and the points of an arc, a
  curve and an ellipse. In `@fz/phaser/shapes`, a new kind of command fails
  the library's build rather than one game's. `LINE = 0.06` and the small
  builders (`disc`, `rim`, `stroke`, `dot`) are copied in Brick Breaker.
  `pack()` documents that it packs in the order given, and `art.ts` sorts
  before it twice; it sorts itself. The builders take one convention as
  the transforms move in (finding 22).
- **The slow and failed cards** and `reload()` are the same in three
  boards; `@fz/phaser/canvas` already knows `slow` and `failed`, and draws
  them, with finding 17's status region kept in the page.
- **The specs' scaffolding.** `strokesOf()` (`src/testing/belt_board.ts:250`)
  reads Phaser's command buffer by its private opcodes, and Brick
  Breaker's and Snake's specs compare raw command buffers, so a Phaser
  release that renumbers them breaks three games' specs at once. One
  reader in `@fz/phaser/testing`, pinned against real Phaser, serves all
  three. With it go `objectsIn()` and `imagesIn()`, which have already
  drifted (Brick Breaker's look into nested layers), `viewport()` (four
  copies), `startBoard()`'s keyboard and teardown (three), `cacheSounds()`,
  a `FakeResizeObserver` (three specs) and `rgbOf()`, now in a third
  game's contrast spec, the trigger the execution plan set for it.

### 20. `@fz/ui` and `@fz/game-ui` take the shells' copies

**Priority:** Medium. **Effort:** M–L.

- **Saving as the page is hidden.** This game keeps its run on
  `visibilitychange` as well as `pagehide`
  (`src/app/play/saved_game.service.ts:56`); Brick Breaker and Snake listen
  for `pagehide` only. The execution plan logged Brick Breaker's gap;
  Snake has it too. A `keepOnLeave(save)` in `@fz/ui/storage`, which
  listens to both and lets go through `DestroyRef`, closes it in all three.
- **Stored state, one pattern in 19 services.** The settings, stats,
  progress and saved-game services each read a versioned entry into a
  signal and write it back on a change; this game's three differ from
  Brick Breaker's in names and keys, and their specs write
  `store()`/`stored()` four times. A `storedSignal({ key, version, read })`
  in `@fz/ui/storage` makes each a few lines over its rules, with the
  round trip specced once. The settings service was already listed.
- **The focus handed back to the board.** The effect in
  `src/app/app.component.ts:80`, with its `focusedRun` and `wasCovered`, is
  Brick Breaker's and Snake's line for line. Each `covered` lists every
  dialog by hand, so a dialog left off it leaves the board live under it.
  `@fz/ui/dialog` keeps an "any dialog open" signal, which every
  `<fz-dialog>` joins while its `open` input holds, the confirm's among
  them, so no game lists its dialogs; and a
  `refocusWhenUncovered(target)` in `@fz/game-ui/play_room` reads it and
  the runs, holding the effect once.
- **The field's palette.** `src/app/board/field_palette.ts` and its spec
  are Brick Breaker's but for the roles, and Snake writes the same inline.
  `ThemeService.role()` makes a new `computed` at each call; a
  `ThemeService.roles(record)` returns them in one.
- **The bar** is still mostly a copy: 126 of its template's non-blank
  lines and 138 of its stylesheet's are Brick Breaker's unchanged. Its
  styles go to `@fz/game-ui`'s bar partial and Pause and Sound become
  components there, as already listed. The figures are new: a mixin for
  their styles first, and a `<fz-bar-metric>` only if the three games'
  markup for them comes out the same once the styles are shared. The
  compiled styles of the three bars are compared before and after, as
  Sudoku's review did for its lift.
- **The run's lifecycle** (decision 4). 314 non-blank lines of
  `GameService` are Brick Breaker's unchanged: pausing, going on, a new
  game, a new speed, trying again, the drawn gate, the questions before a
  run is lost and the gathered news. Once finding 9 has drawn the seam in
  this game, the shared lines are counted again, and what is still the
  same word for word moves: the framework-free part to `@fz/core`, beside
  `FieldPlay`, and the confirming and announcing to `@fz/game-ui`. Brick
  Breaker and Snake take it in the same branch. It is the largest lift, so
  it goes last; if finding 9 leaves fewer than about 100 non-blank lines
  in common, the work log says so and the copies stay.

### 21. `@fz/dev` takes the fences and the scripts' copies

**Priority:** Medium. **Effort:** M.

- **The layer fences.** `eslint.config.js` is 128 lines here, 124 in Brick
  Breaker and 124 in Snake, the same rules → view → scene → app blocks but
  for this game's view taking `@fz/style/fuzzball`. A fourth game copying a
  stale one, or a fence tightened in one game only, weakens the
  architecture without a word. A `phaserGameLayers({ viewAllows })` block
  in `frontend/lib/dev/src/eslint.ts`, beside `typescript()`, `angular()`
  and the rest, with finding 6's rules in it.
- **The screenshot scripts.** `thumbRegion()` is in four games' scripts;
  this game's alone rounds before it clamps, and the others' can ask
  `sharp` for a pixel past the capture at 2×. The command line (five
  copies), the "Nothing answers at" check (six), `preparePage()` (five),
  `runnerImport` loaders (five) and the loops polling `data-state` (which
  `settle()` in `frontend/lib/dev/src/layout_page.ts:9` already does) are
  copies too. `thumbRegionAround()` in `@fz/dev/screenshots`, specced on
  both edges, and a `runScreenshotScript()` shaped like
  `runLayoutScript()`, which owns the command line, the check and Chrome.
  Already listed for `thumbRegion()` and the loader; the rest is new.
- **The reports.** About half of `tools/report-waves.mjs` is Brick
  Breaker's `report-levels.mjs`; a shared report helper follows once
  finding 7 has fixed this one.
- **The test projects.** Once findings 3 and 4 have proven the `dom`,
  `pure` and `sim` projects here, `angularTests()` offers them, given each
  game's folders for each, and Brick Breaker and Snake take them, so every
  game drawn with Phaser runs its rules in Node, and its simulations, where
  it has any, without coverage.

### 22. The libraries' own loose ends

**Priority:** Low. **Effort:** S each.

- **`writeVersioned()`** (`frontend/lib/ui/src/storage/local_storage.service.ts:59`)
  writes `{ version, ...value }`, so a value with a `version` field
  overwrites the real one. Write `{ ...value, version }`, typed so a value
  can't carry one.
- **Exports wider than their use.** `@fz/phaser/host` exports `PhaserHost`,
  `ViewportScaler` and six more that no game imports, inviting one to build
  a host directly and bypass the lazy canvas that keeps Phaser out of the
  first download; only `HostOptions`, `HostedScene` and
  `SceneSurroundings` are used outside. `progressOf()`, `fitsWordmark`,
  `fitsHomeButton`, `MAX_PIXEL_RATIO` and `pngOfSize()` have no caller
  outside their own file; the announcer's `notePlaced()` and
  `noteEarlyWordsSaid()` are public though only `<fz-announcer>` may call
  them. `@fz/phaser/host`'s index keeps the three types alone, the library
  importing the rest by path; the others become private to their files;
  and the announcer's two go behind a token only `<fz-announcer>` injects.
- **Seams for specs.** `BROWSER_STORAGE` has no user outside `@fz/ui`,
  and 32 game spec files touch the global `localStorage`, five games'
  setup clearing it. A `provideMemoryStorage()` in `@fz/ui/testing` gives
  each TestBed its own. `FakeViewport` fixes the color scheme to light and
  motion to welcome, with no setter, so no spec can reach a dark default or
  reduced motion through it; it gains `colorScheme` and `reducedMotion`
  beside its size, and `ThemeService`'s dark default gets its spec.
  `StopwatchService` reads `Date.now()` itself; it takes a `NOW` token,
  `Date.now` by default.
- **Floors with slack.** `@fz/dev`'s floor sits about ten points under its
  figures (83/92/89/82 against 92.6/95.6/94.2/92.7); `@fz/game-ui`'s
  branches 95 against 99.2. And `@fz/dev` leaves its `src/testing/` out
  while `@fz/ui` counts its own, where the dialog polyfill's 55% of
  branches drags the figure. Each floor rises to just under its figure,
  rounded down, and every library counts its `src/testing/` with no floor
  of its own, as finding 5 does for this game, so what goes untested shows.
- **The shapes' builders** take a place three ways: `rect(area, …)`,
  `circle(x, y, …)` and `line(from, to, …)`, with radius, width and color
  side by side as numbers; `extentOf()` returns an unnamed four-number
  tuple. Decided (decision 7): one convention, the geometry as a named type
  (`Area`, a `Point` and a radius, a list of `Point`s) and the style as a
  trailing object (`{ color, width }`), with `extentOf()` returning an
  `Area`. It is built with finding 19's shapes lift, in the same branch,
  since that moves the transforms over the same commands, and every game's
  art is moved to it there, the atlases compared pixel for pixel before
  and after.
- **The compiler** (decision 8). `@fz/dev/tsconfig/scripts.json` lacks the
  base preset's `noUncheckedIndexedAccess`,
  `noPropertyAccessFromIndexSignature`, `noImplicitReturns` and
  `noFallthroughCasesInSwitch`; this game's tools already pass all four,
  the root's scripts give 5 errors and the Solitaire Collection's 22. The
  preset takes all four now, and those 27 are fixed with it.
  `exactOptionalPropertyTypes` raises only 7 errors over this game's whole
  program, five in `PhaserHost` and two in the screenshots' helpers: this
  game's tsconfig takes it now, with those 7 fixed. The base
  preset takes it later, once each other workspace's count is measured.
- **Small points.** `EventLog.next()` hands back a used record, so a writer
  that skips a field leaks the last event's; its doc says every writer
  sets every field, which this game's `record()` already does, rather
  than the log resetting fields on a path meant to cost nothing.
  `withHomeLink()` asks for the `href` the bar already defaults to `/`, so
  six bars write `HOME_HREF = "/"`; it defaults to `/` too, and the six
  constants go.

## Considered and left alone

- **Sampling seeds, or fewer formations,** in `every_layout/`. The
  formations' cross product was chosen in A5.2, and finding 3 recovers more
  time without weakening anything.
- **Bundling the simulations with esbuild** for a further 3×: revisit only
  if CI is still slow after finding 3 (see there).
- **Splitting `field.spec.ts` and `rocks.spec.ts` into files.** They are
  long because the rules are covered, at about 14 lines a test; nesting
  (finding 8) is enough. Moving the traits to `rocks/traits.ts` would take
  370 lines of `rocks.spec.ts` with it, and can wait for the next trait.
- **The fractional unit, and `stageOf()`/`frameOf()` beside `fitCells()`,**
  both chosen in the build; finding 15 is about the bake's cost only.
- **`Math.random()` in `EffectsPainter`'s shards and exhaust.** It is
  cosmetic, in the scene, and no spec reads it.
- **`changeDetection`.** Leaving it out is right: Angular 22 makes
  `OnPush` the default.
- **`Clock` as a class.** Its record and `advanceClock()` read plainly;
  `carried` being writable is the one wart, and nothing outside writes it.

## The order of work

Parts 1 to 3 come first, on one branch, and Part 4 after, a branch for each
library (decision 3). Each step is a commit, or a few where it says so.

**Branch `asteroid-breaker-review`,** cut from `main`'s tip:

1. **Finding 1:** a crystal's shards and dust in its body's ink, with its
   spec.
2. **Finding 2:** every wave waits in `"ready"`.
3. **Finding 3:** the `sim` project here, and Brick Breaker's
   `every_level/` taken out of its coverage run the same way.
4. **Finding 4:** the `dom` and `pure` projects, `atlasSize()` moved to
   `@fz/phaser/shapes` with them.
5. **Finding 5:** the scene's and the shell's floors, and the helpers'
   specs.
6. **Findings 6, 7 and 8:** the lint guard, the tools and the specs'
   tidy-ups, a commit each.
7. **Finding 9:** `GameService` split, in a commit for each part it gives
   up (the frame step, the records, a run's own state, the tuning).
8. **Finding 10:** the board's cards, its haptics and `onLayout`.
9. **Findings 11 and 12:** the scene's flourishes, its camera and the
   effects painter, then the painters' contract.
10. **Findings 13 and 14:** the kept field, then the parts of `Field`.
11. **Finding 15:** the trace, logged, then what it calls for.
12. **Findings 16 and 17:** the rules' tidy-ups, then the view's, the
    scene's and the shell's.
13. **QA:** `yarn verify`, `yarn check:layout`, and Asteroid Breaker and
    Brick Breaker played in a browser.

Steps 1 to 12 touch only `frontend/games/asteroid-breaker/`, but for Brick
Breaker's test split in step 3 and `atlasSize()`'s move in step 4.

**Then a branch for each library,** each cut from `main` once the one
before it is merged, every game with a copy adopting the lift in the same
branch, and finding 22's items going with the library they touch:

14. **`core-lifts`:** finding 18, with `@fz/core`'s floor and the
    `src/testing/` rule.
15. **`dev-lifts`:** finding 21 (the fences with finding 6's rules, the
    screenshot and report scripts, the test projects), and finding 22's
    compiler items.
16. **`phaser-lifts`:** finding 19, with finding 22's shapes convention,
    the host's exports and `@fz/phaser`'s floor.
17. **`ui-lifts`:** finding 20 but the run's lifecycle, with finding 22's
    `writeVersioned()`, seams, exports and the floors of `@fz/ui` and
    `@fz/game-ui`.
18. **`run-lifecycle`:** finding 20's last item, if its count after
    finding 9 holds it worth lifting.

Each library branch ends with its own QA: `yarn verify`,
`yarn check:layout`, and every game it touched played in a browser.

## How the work runs

As the earlier reviews ran:

- **A step is a commit** in the repository's form (`fix(asteroid-breaker): …`),
  once the workspaces it touched pass their `lint`, `typecheck` and `test`
  and `yarn prettier:check` passes. What it adds is covered by specs, and
  the docs it makes untrue (`AGENTS.md`, the skills) change in the same
  commit.
- **Every commit is reviewed before it is made,** as the
  `commit-review-process` skill says, and a work log,
  `docs/asteroid-breaker-review-worklog.md`, answers each finding of the
  review, taken or not, with why. It is deleted once every step is built.
- **Steps that touch different files run side by side,** each in a git
  worktree of its own, and are put on the branch in turn once reviewed.
- **A step that turns out other than planned** is built as found, and the
  log says how and why; one that would change what a player sees or what
  is kept beyond what this plan says waits for the user.
- **Each branch is merged into `main` locally once its QA passes,** and
  pushed once every branch is built, as the user said on 2026-11-08.

## Decisions

On 2026-11-08 the user took every recommendation. Decisions 4, 7 and 8
had none when the review was first written; the ones below were added as
the plan was updated to take them all.

1. **Pausing before the first move (finding 2):** every wave waits in
   `"ready"`, rather than a guard in `pause()` and the bar.
2. **The simulations (finding 3):** run without coverage, here and in
   Brick Breaker.
3. **The scope:** Parts 1 to 3 first, on one branch; Part 4 after, a
   branch for each library.
4. **The run's lifecycle (finding 20):** lifted after finding 9, last, if
   about 100 non-blank lines or more are still shared once it is built.
5. **The rebake (finding 15):** measured first; the baked unit rounded and
   the pictures encoded on demand only if the trace shows the cost.
6. **The rocks' points (finding 16):** counted as they are scored, kept as
   an optional count in the saved game.
7. **The shapes' builders (finding 22):** one convention, built with
   finding 19's shapes lift.
8. **The compiler (finding 22):** the stricter scripts preset for every
   workspace now; `exactOptionalPropertyTypes` for this game now, and for
   the base preset once each workspace's count is measured.
