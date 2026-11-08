# Work log: Asteroid Breaker's review

The log of `docs/asteroid-breaker-review-plan.md` as it is built: what each
step built, where it went other than planned and why, what was measured, and
each review comment answered, taken or not. It is deleted once every step is
built and merged.

## How the work is running

- **Branches.** Parts 1 to 3 on `asteroid-breaker-review`, cut from `main` at
  `f896a336`, its first commit the plan (`40ed597e`).
- **Side by side.** The steps run in four tracks, each in a git worktree of
  its own under `../fg-wt/`, on a branch cut from `asteroid-breaker-review`'s
  tip: `ab-tests` (findings 3 to 8), `ab-shell` (2, 9, 10 and the shell's
  part of 17), `ab-scene` (1, 11, 12, 15 and the view's and scene's part of 17) and `ab-rules` (13, 14 and 16). Each step is built and staged in its
  worktree, reviewed there by a fresh agent as the `commit-review-process`
  skill says, committed there, then picked onto `asteroid-breaker-review`,
  where its log entry joins it and the game's checks run again over the
  steps before it.
- **The order on the branch** is the order the steps finish in, not the
  plan's numbering, since the tracks touch different files.

## The steps

### Step 1: finding 1, a crystal's shards and dust in its body's ink

Built as planned on `ab-scene`. `BeltScene.flourish()` colors the shards
and the dust with `rockColor(rockKindOf(event), palette)`, so a broken
crystal sprays a stone's ink. No other flourish colors by a rock's kind: a
held hit's flash is `glint`, its spark `flame`, the rings `ringColorOf()`
and a lost ship's burst `accent`. The new cases failed before the fix,
getting violet `0x7a4fd0` for stone's `0x8b7f70`. 4,763 tests pass.

The review:

1. _The specs couldn't tell "its body's color" from "always a stone's":_
   every rock they broke was a stone or a crystal, so a scene that passed
   `palette.rocks.stone` would have passed too. Taken: the shards and the
   dust are each a table that breaks an ice rock (its own ink) and a
   crystal (a stone's), and each fails both with the old code and with
   stone's ink written in.
2. _`puff()`'s doc told the caller's choice:_ taken. It says "in a color",
   as its siblings do, and `rockColor()`'s doc, where the choice is made,
   names the dust beside the shards.

### Step 2: finding 2, every wave waits in "ready"

Built on `ab-shell`. `startWave()` turns `"ready"` into `"playing"` only,
and the new `nextWave()` turns `"cleared"` into the next wave, `"ready"`.
The shell's first move of any wave calls `startWave()`; only the run's first
wave counts the run, keeps its sector as reached and says the wave, as
before. The Ready card shows by the outcome alone, and the crosshair only
while `"playing"`. 4,778 tests pass.

Where it went other than planned, each to keep what the player sees and
what is kept as it was:

- **`isInProgress()` counts a `"ready"` run past its first wave,** so New
  game still asks before throwing away a run waiting at wave 2, and it
  stays saved. Without it the saved game was dropped there.
- **`resume()` takes the field's steps:** a paused wave whose field never
  moved goes back to `"ready"`. A run reloaded between waves is taken up
  paused, as before, and on going on shows the Ready card, as before;
  without this it came back `"playing"` with no card.
- **`setRoom()` and `tune()` ask `yetToBegin()`** (the field has no steps),
  where they read `waitingState`, so a run reloaded paused between waves is
  still laid out afresh for its room rather than stretched from the
  startup layout.
- **`saved_game.ts` changed in two lines,** to call `nextWave()`.
- **`GameService.waiting` is gone** rather than a `computed` (review, 3).

The review:

1. _Forgetting a thrown-away run hung on `crew()` alone:_ throwing away a
   run waiting at wave 2 goes `"ready"` to `"ready"`, so the saved game's
   effect re-ran only because `createCrew()` makes a new record. Taken: the
   effect tracks `runs()`, which changes exactly when another run begins,
   with a spec.
2. _`restoreGame()` accepts no field at the first wave,_ which `saveGame()`
   never writes, and which would now count the run's start again on its
   first move. Not taken here, since `restoreGame()` was being split into
   named checks on `ab-rules` at the same time; it goes in with that.
3. _`waiting` had no reader left but specs,_ which held it beside the
   outcome. Taken: it goes, with those fields.
4. _Three specs passed if their first move did nothing:_ taken; each holds
   the outcome to `"playing"` too.

### Step 9a: finding 11, the effects painter split and the field's camera

Built on `ab-scene`, the first of two commits for finding 11.
`EffectsPainter` is four painters, `TrailPainter`, `ExhaustPainter`,
`DebrisPainter` (the shards, the dust and the sparks) and `RingPainter`,
sharing `Turns.play()`, and a `FieldCamera` owns the field camera's
viewport, color, kick and shake, the one place its scroll is written.
`EXHAUST_MS` joins `timing.ts`, and the arithmetic moves to
`src/view/effects/flourish.ts`, under the view's floor: `exhaustDue()`,
`trailOutlinesLaid()` and `cameraShift()`. 4,779 tests pass, and
`view/effects` is covered whole.

Where it went other than planned:

- **Two commits,** this and the flourish player.
- **The exhaust is a painter of its own,** which the plan didn't place,
  and the sparks go with the shards and the dust.
- **`FieldCamera` also owns the field's color,** and is a `Painter`, last in
  the list, so finding 12's `start?()` reaches it. The camera's `ignore()`
  of the frame and the deck stays in the scene for finding 17.
- **The helpers take steps,** as the field counts them: `exhaustDue()`
  takes the steps since the last draw, `trailOutlinesLaid()` those since
  the dash.
- **No spec of `FieldCamera`'s own:** its viewport and color are held by
  the scene's "the cameras" specs, its kick and shake by the flourishes',
  and its arithmetic by `cameraShift()`'s.
- **The scroll is summed in another order,** the shift added to the rest
  rather than the kick taken off first, which can differ in the last bit
  only.

The review found no bug, and checked the draw order, the arithmetic and
every reset line by line:

1. _`exhaustDue()` was listed among the motions held still where motion
   isn't welcome, but didn't take `motion`;_ the scene checked it, outside
   any floor. Taken: it takes `motion`, with a spec.
2. _The shared `play()` was half used:_ `PointsPainter` set its record by
   hand, and every caller paired `take()` with `play()`. Taken: `Turns.play()`
   takes, starts and returns the next record, and `Scored` extends
   `Playing`.
3. _`ExhaustPainter.draw`'s doc read two ways:_ taken.

### Step 9b: finding 11, the flourish player

Built on `ab-scene`. `BeltScene.flourish()`'s switch is a `FlourishPlayer`
(`src/scene/flourish_player.ts`), given the painters and the field's camera
it plays each `Flourish` on, with a spec of its own. The scene writes its
`PaintContext` in `stage()`, before the frame's events play rather than as
it draws, so the player reads it; the values are the same at both points.
The scene's field is `flourishPlayer`, so it isn't taken for an event's
list of flourishes. 4,793 tests pass, and the player is covered whole.

The review found it correct:

1. _No spec held that the context is written before the events play:_
   moving `stage()` below them passed every spec, though a theme change
   would then color the shards in the old palette and a dash on a new
   field would lay no outline. Taken: two scene specs, a palette changed
   on the frame a rock breaks and a dash on a new field's first frame,
   which fail exactly when `stage()` is moved.
2. _`scrolledBy()`, `MIDDLE` and the shards' tints were copied between
   two specs:_ taken; they are in `src/testing/belt_board.ts`.
3. _The player's spec built its events by hand, two with a kind that
   never calls for shards or dust, and didn't hold a ring's radius:_ taken.
   Its events come from a `FieldEventLog`, but a lost ship with no pilot,
   which the log never makes, and the ring's radius is held.
4. _A redundant `Readonly<>` and a long line in `AGENTS.md`:_ taken.

### Step 10a: finding 13, the kept field a file of its own

Built on `ab-rules`. The field's half of the saved game is
`src/rules/field/kept_field.ts`: `SavedField`, `readField()`, its rocks
checked from a table keyed by the saved rock's keys, and
`layOutKeptField()`. `saved_game.ts` keeps the run's half, `readRun()`,
`takeUpField()` and `waveSoFar()`, and `restoreGame()` joins them. The `||`
chains are named, exported checks, each with a table of spoiled values
held to failing it alone, and the same tables held to the reader's
refusal. The readers moved here take finding 16's `read…` verb now, so
they aren't renamed twice. 4,910 tests pass.

Where it went other than planned:

- **`bringShip()` stays in `field.ts`, exported,** where the plan moved it
  to the kept field: `field.ts` would then import `kept_field.ts`, which
  imports `fieldFor()` from it, a cycle at runtime the rules don't have.
- **The kept field imports nothing from `run/`** but the `WaveStart` type
  `field.ts` already did (review, 1). `layOutKeptField()` takes the wave,
  its setup and `WaveSoFar`, and `saved_game.ts` works those out of the
  run.
- **The rock table types each key's own guard,** so a check of the wrong
  type fails to compile, as a missing one does.
- **`src/testing/run_under_way.ts`** holds the run and fields both specs
  need, and the spoils' type.
- **A stored run with no field at the wave it began at is refused**
  (`hasClearedAWave()`, in `run.ts`), the comment finding 2's review left
  here. The review's premise was wrong in one point: `saveGame()` could
  write one, for a `"playing"` run whose field hadn't moved, a state the
  shell never reaches but `app.component.spec.ts`'s `storeRun()` built. It
  keeps nothing for that now, as its doc promised, and `storeRun()` steps
  its field once. No player can hold such an entry, so none loses a run.

The first review:

1. _`field/` imported `run/` at runtime_ (`waveStart`, a whole `Run`,
   `waveSoFar()`), a coupling finding 14 is set to remove. Taken, as above.
2. _`hasMoved()` also checked `lastDropAt <= steps`:_ taken; that is
   `hasDroppedInTime()`, with its own spoils.
3. _The run's fixture had as many strays as were banked,_ so passing the
   wrong count to `hasSoundCrew()` went unnoticed: taken, with a case where
   they differ.
4. _Two tables named `WAVE_SPOILS`, and `Spoil` written twice:_ taken.
5. _`KeptRockKey` exported for no reader, and `AGENTS.md` calling the
   private table exported:_ taken.
6. _The first-wave entry_ (from finding 2's review): taken, as above.

The fix to 1 reshaped the change, so it was reviewed again. It found every
old clause in place with the same bounds:

1. _`pilotsOf()` built copies only to drop them, and missed the rename:_
   taken; `isPilots()` is a guard, with a spoil that tells `every` from
   `some`.
2. _Some spoils sat off the boundary,_ so a flipped comparison passed:
   taken. They come from `fillFor()`, `stepsIn()`, `FIELD_LONGEST_SIDE`,
   `FIELD_SHORT_SIDE` and `ROCK_OUTLINES`, at one past to fail and exact to
   pass, and flipping each comparison fails a spec.
3. _The spoils' tuple was written out six times:_ taken; `Spoil<T>`.
4. _`hasClearedAWave()` repeated `isInProgress()`'s test:_ taken; it is in
   `run.ts`, and `isInProgress()` calls it.
5. _Two stale docs:_ taken.
6. _`readRun()` takes a checked record and `readField()` takes `unknown`:_
   not taken; `restoreGame()` needs the record for `tuned` and `field`.

### Step 3: finding 3, the simulations out of the coverage run

Built on `ab-tests`. Each breaker's Vitest config has two projects: `unit`,
every spec as before, and `sim`, the specs that play or lay out every wave
or level (this game's nine files in `every_wave/`, `every_endless_wave/`
and `every_layout/`, Brick Breaker's three in `every_level/`), in Node and
without coverage. `test` is the plan's two runs, each handed `"$@"`.

Measured on this machine, with other work running beside it:

| Workspace        | Before | After  | `--maxWorkers=1` before | after    |
| ---------------- | ------ | ------ | ----------------------- | -------- |
| Asteroid Breaker | 64.5 s | 42.8 s | 7 m 47 s                | 3 m 31 s |
| Brick Breaker    | 47.7 s | 27.2 s | 1 m 50 s                | 1 m 28 s |

This game's CPU fell from 546 s to 287 s. Scaling CI's 368 s by the
single worker's ratio gives about 165 s, near the plan's 150 s. Brick
Breaker's simulations were 4.2 times slower under coverage, not 3. Its
branches fell from 97.8% to 97.53%, since only its simulations reach
`hardSolid` in `field.ts`, still above the floor of 95; this game's
figures are unchanged.

Where it went other than planned:

- **The plan's worry about `"$@"` held.** Yarn 4.18.1's shell appends a
  script's arguments to its last command unless the script names them;
  with `"$@"` both runs got `--maxWorkers=25%`, and with no arguments
  neither got an empty one.
- **Vitest 5's inline projects inherit the root's config,** so `sim` sets
  `extends: false`; inheriting, it took `src/test-setup.ts` and crashed in
  Node.
- **`unit` pins `pool: "vmThreads"`.** A project sharing the root's server
  takes the `test` Vitest captured before Analog's config hook sets the
  pool, so it ran in `forks`, and 147 of the shell's specs failed. The
  site's `app` project has the same gap today, running in `forks`; finding
  21 takes it up with the projects' lift.
- **`yarn vitest run <path>` stays in the docs** for now, since naming the
  project saved nothing with one project holding the Analog plugin.

The review found no bug, and confirmed `"$@"` in Yarn's bundle, that
`extends: false` is needed, and that every spec but the simulations runs
once, as before, under the same floors:

1. _The `"$@"` rule sat inside the root's layout bullet,_ turning the next
   sentence's "Its" to the workspace: taken; it is under Run Unit Tests.
2. _The pool comment could be read as its opposite:_ taken.
3. _The `vmThreads` rule holds for anyone building projects from
   `@fz/dev`'s pieces,_ so it belongs in its `AGENTS.md` once: taken.
4. _"Play every level or wave"_ left out the layouts: taken.

### Step 7a: finding 9, the frame step in the view

Built on `ab-shell`, the first of finding 9's four commits. What
`GameService` did each frame, `playOn()`, `startWave()`, `hear()`,
`takeIn()`, `sayWave()`, `openAfter()` and the gathered news, is
`RunFrames` (`src/view/run_frames.ts`): `advance()` plays a frame and
returns what it changed in the run, in one record used again each frame,
and `news()` what to say. `tick()` applies it: the run, the records, the
signals and the words. Thirteen of the shell's specs moved to the view's,
which covers it whole; `src/testing/play.ts` lost the chain's fixtures only
those used. 4,956 tests pass.

The records are now kept once a frame, from the run before and after it,
where they were kept at a wave's start and again as the frame's news was
taken in. The one call that adds, a `recordStrays()` of nothing on a
frame where only the first move changed the run, changes nothing, and no
record is kept twice.

The review compared every path through the old `GameService`, and found
the outcomes, the records, the words and their order unchanged:

1. _The deviation as first written was wrong:_ the records were never kept
   at each step within a frame. Taken: written as above.
2. _No spec held where a run's end falls in a frame's words,_ since a lost
   last ship says nothing, so putting the end first passed. Taken: a frame
   where the run begins and ends hears the wave, then the end; and a spec
   that a run begun isn't begun again the frame after.
3. _`step()` clashed with the game's step,_ the field's 1/120 s: taken;
   `advance()`, as `FieldPlay` calls a frame.
4. _The docs of `chain` and `moved` were wrong:_ taken.
5. _A ternary hid `start()`'s work, `keep()` took a bare flag, one wait
   used `CLEARED_MS` where its sibling used the delay's function, and the
   testing skill's triggers left out `RunFrames`:_ taken.

### Step 9c: finding 12, the painter contract

Built on `ab-scene`. This game's `Painter.refresh?()` takes nothing, since
none of its painters read the `Baked` it was handed, and `rebake()` builds
none; its fields join `PaintContext`. `Painter` gains `start?(field)`, which
`startField()` calls on every painter in its loop, the nine that were reset
or fitted by name, `FieldCamera` among them. The scene's parts are one
`BeltKit` record of `readonly` members behind a `kit` getter, made in
`create()` by `makeKit()` as one literal, in the order the parts were made
before, and `RockPainter`'s and `ShotPainter`'s slots are `readonly Copies[]`.
Brick Breaker's `Painter`, whose paddle reads the `Baked`, keeps it. 4,811
tests pass.

Where it went other than planned:

- **The parts are a record behind one getter,** not `readonly` fields: a
  `readonly` field can be set only in the constructor, and Phaser's
  `this.add` exists only once `create()` runs. The getter throws before
  then, where a field would have read as `undefined`.
- **`FieldCamera` fills the field's color as it draws,** whenever the
  palette's changes, since `bake()` runs before the parts exist; the first
  frame's color is still set before the first render.
- **The sounds are made earlier in `create()`,** so every part goes into
  the record at once; making them only queues a load.

The review found no bug: the same nine painters start on a new field, in
the same order, and the first frame's color comes before its render.

1. _Seventeen getters passed a field through,_ against Google's guide, each
   name written five times. Taken: one `kit` getter over the record, its
   members documented on `BeltKit`, and the specs read `scene.kit.rocks`.
2. _`AGENTS.md` said a new painter couldn't be left out,_ though the list
   is written by hand, and `painters` defaulted to `[]`, so starting a
   field too early would start nothing without a word. Taken.
3. _The slots' hidden names were uneven, and three docs read two ways:_
   taken.

The fix to 1 reshaped the change, so it was reviewed again, and found no
bug:

1. _The `kit` getter only hid a field,_ and read `undefined` before
   `create()`: taken; it throws a clear error until the kit is made.
2. _`makeKit()` read `this.steering`:_ taken; it takes it.
3. _Two docs were wrong:_ taken.
4. _Some short doc comments were rewrapped beside long ones left alone:_
   checked; each short one removed was rewritten, not rewrapped, and none
   in the touched files now runs past 100 characters.

### Step 10b: finding 14, each part of the rules takes only its part of the field

Built on `ab-rules`. Each module declares the part of the field it acts on,
beside it, as the rocks, the drops, the scoring and the crew already did:
`CrossingField`, `CometField`, `StrayField`, `PickupField`, `StretchField`,
`MarkField` and `TallyField`, and a function that needs less takes a `Pick`
of its part. `WaveStart` is `field.ts`'s. A trait's step rule is typed over
a read-only `CourseField` (the ship, the torus, the pace and the rocks'
speed), which `liesFairly()` builds from those four keys alone, so the
compiler keeps the promise the doc made. `stepShots(field, fire)` takes a
`ShotField`, with no defaults, and `pull()` takes the field and the ship.
`crossing.spec.ts` builds a `CrossingField` rather than a pictured field.
The simulations pass unchanged.

Where it went other than planned:

- **Interfaces beside each module rather than `Pick`s of `Field`,** as the
  rocks' and the others' are, so none of these modules imports `Field`.
  `Field` and the run leave the cycle of type imports; seven modules that
  were tied together already (the events, the pilots, the strays, the
  scoring, the rocks, the drops and the pickups) stay in it.
- **`flyFairly()` keeps its six parameters:** it has two private callers,
  each argument means something else, and folding the direction and the
  speed together risked how the halving rounds.

The review found no bug: the course hands the step rules exactly what they
read, and the shots read the same gunnery and flight.

1. _`AGENTS.md` said a spec builds no more of a field than its part,_
   though the comets', strays' and pickups' rightly play whole fields:
   taken; "need build".
2. _The content skill didn't say what a step rule can reach:_ taken; it
   names `CourseField`, and an effect's rule `PickupField`.
3. _The strays imported the pickups' `Effects` for one field,_ a new edge
   in the cycle: taken; `StrayField` declares the one field it reads.
4. _`EffectField` asked for a whole `Ship` and `TallyField` for writable
   counts:_ taken; a `Readonly<Place>` and a `Readonly<TallyField>`, and
   `EffectField` is `PickupField`, after its module.

### Step 12a: finding 16, the rocks' points counted as they score

Built on `ab-rules`. The field counts its rocks' points, `rockPoints`, as
`scoreBreak()` scores them, only when `score()` did, so a run that is over
counts none; and `tallyOf()` is a sum of the counts kept, no longer seeing
the score. The saved field keeps the count as an optional `rockPoints`; a
game saved before it works the count out as it did (`rockPointsKept()`),
so no run is dropped. `pointsOf()` is gone, with its spec and its mention.
The catalog's `rockPoints(kind, size)` is `pointsFor()`, so the name means
one thing.

The review found every way a rock scores counting exactly what it adds,
and old saves, new ones, and a new save read by a build cached from
before, all sound:

1. _The run's check let a field kept with too few rocks' points through,_
   which no build writes, since a kept field's points are its rocks', its
   chain's and its strays' exactly; its tally would not add up. Taken,
   after checking that: a kept count must make the sum exactly, and an old
   save is held as before. The specs' played field now scored what its run
   says.
2. _No spoil tried the sum:_ taken; one overflows it by the rocks and the
   chain together.
3. _Nothing would catch a new source of points missing from the tally:_
   taken. The autopilot's report says whether a cleared wave's tally adds up
   to its score, and every wave's simulation holds it, Endless's too.
4. _`rockPoints` named the catalog's points for one rock and the wave's
   total:_ taken; the catalog's is `pointsFor()`.
5. _Two specs repeated their neighbours' setup, and six docs were
   rewrapped:_ the specs are folded into their neighbours. The docs ran
   past 100 characters, so they are wrapped by finding 17's rule; not
   taken.

### Step 7b: finding 9, the records a function of the run

Built on `ab-shell`, the second of finding 9's four commits. What a change
in a run brings to the records is `recordsOf(before, after, waves)` in
`src/rules/run/stats.ts`: the run started, the strays brought home, the
sectors reached, every written wave cleared, and its end, or none of it for
a run taken up, which brings only its wave's sector. `withRecords()` keeps
it. `StatsService.record()` and `ProgressService.record()` take the record
whole, each with one write, and `GameService.keep()` hands it to them
behind its one check of a run flown on tuned numbers. `recordStart()`,
`recordEnd()`, `recordClearedAll()`, `recordStrays()`, `reachWave()` and
`endOf()` are gone; the rules' spec covers every way a run changes.

Where it went other than planned:

- `FrameChange` lost `begun`: a run started is read from the runs before
  and after, as the rest is.
- The records are written once a frame, where each part was its own write.

The review found no change in what is kept:

1. _`RunRecords` held the speed twice,_ once and in its end: taken; the end
   is the score, wave and sector, and `withRecords()` and `record()` add the
   speed.
2. _`ProgressService` wrote once per sector reached:_ taken; `record()` adds
   them with one write, and `recordReached()` is gone.
3. _`keep()`'s doc opened with more than a sentence:_ taken.
4. _Five docs were rewrapped:_ each ran past 100 characters; not taken.

### Step 4: finding 4, the specs that touch no page run in Node

Built on `ab-tests`. Asteroid Breaker's specs run in three Vitest projects:
`dom`, with jsdom, the setup and Analog's plugin; `pure`, the rules', the
view's and `src/testing/`'s specs, in Node with none of them; and `sim`, as
step 3 left it. `dom` runs every spec the other two don't, so none runs in
neither. `atlasSize()` moved from `@fz/phaser/scene` to `@fz/phaser/shapes`
beside `pack()`, in `packing.ts`, so the art's spec loads no Phaser. The
whole run's median went from 45.6 s to 37.6 s, and one rules spec run with
`--project pure` from 8.5 s to 2.4 s.

Where it went other than planned:

- `dom` pins no pool: its own Analog plugin sets one.
- Coverage counted the rules and the view twice, once as each project
  compiled them, so `dom` leaves them to oxc, as `pure` does, through
  Analog's `transformFilter`.
- The projects are built from `@fz/dev`'s `angularSpecs()` and
  `nodeSpecs()`, and one `atlasSize()` spec stays in the scene's, where
  `bakeAtlas()` uses it.

The review:

1. _The code left to oxc took in `src/testing/`,_ which lint doesn't keep
   free of Angular: taken; only the rules and the view.
2. _A file added while `yarn test:watch` ran might not reach Analog's
   plugin,_ which watches through the project's own server: taken; a plugin
   hands each add and removal on.
3. _The comments on oxc and the projects were out of date, and the pattern
   was written by hand:_ taken; it is built from the config's folder.
4. _A spec kept a comment about the jsdom it no longer runs in:_ taken.
5. _`dom` listed its specs, so a new folder's would run in no project:_
   taken; it runs every spec but the other two's.
6. _`Packing<T>` wasn't exported, and the scene's spec reached past the
   index:_ taken.

### Step 7c: finding 9, a run's own state one record

Built on `ab-shell`, the third of finding 9's four commits. What is a run's
own, the run, whether it was flown on tuned numbers, its chain, its tally,
the Cleared card, a new best, every wave cleared, the strays brought home
and the result card, is one `RunState` record in one signal, which
`begin()` replaces whole as a run starts, changes speed, tries again or is
taken up, so nothing of one run reaches the next. The public signals are
`computed` views of it. A frame folds into it through `withFrame()`, which
returns the same record on a quiet frame, so a frame of play still makes
nothing. `show()`, `showField()` and the eight signals are gone, and the
service's fields are made in its constructor, so their order can't break
startup. 3,375 tests pass.

Where it went other than planned:

- `takeUp()` hands `begin()` the kept field, where it laid out a fresh one
  first and threw it away.
- `setRoom()` and `tune()` only lay the wave out again: the resets
  `showField()` made there never changed anything, as a field that hasn't
  moved always has a chain of 1 and no Cleared card.
- Brick Breaker's `GameService` keeps its signals, as finding 9 asked of
  this game alone.

The review compared each public method's signals with the old service, and
found them the same, the quiet frame making nothing and the views drawn no
more often:

1. _`nextWave()` and `takeUp()` built their records untyped,_ so a
   misspelt key would compile and skip its reset: taken; both are
   `RunState`.
2. _The new specs tested fewer fields than their titles,_ as most held
   their starting values before the act: taken. They try again with the
   result card open and a stray brought home, and take up a run with the
   result card open, put away, or the Cleared card showing. Each field of
   the record carried over by `begin()` fails at least one.
3. _`takeUp()` called `begin()` in two branches, and `keep(state, before)`
   reversed `recordsOf()`'s order:_ taken.

### Step 12b: finding 16, the rules' tidy-ups

Built on `ab-rules`. An event's record is written once: `BLANK_EVENT`, a
frozen record of every field but the serial, which `blankEvent()` spreads as
the log is made and `record()` resets a reused record from with
`Object.assign()`, so an event still makes nothing. `createEffects()` is
`recordOf(EFFECT_KINDS, …)`, and the content skill loses the step that kept
its list. `steerField()` copies the steer with `Object.assign()`. The names
that collided are their own: Endless's `buyRocks` and `ENDLESS_PACE`, the
lodestone's `pullTowardShip`; and every reader of stored records in the
rules is `read…` (`readStats`, `readSpeedStats`, `readReached`). The ship's
clamp is `clamp()`, every `Math.PI` outside `angles.ts` a fraction of
`TURN`, the pilots' middle `middleOf()`, and the ring's margin `RING_GAP`.
Every wave plays as before.

Where it went other than planned:

- The margin names the `1` alone, not `ROCK_RADIUS.large + 1`: subtracting
  one combined constant rounds differently for about 4% of field widths,
  so the rings would no longer lie where they did.
- The events spec's table of every way a record is filled became one test
  that fills five records between them with every field, then comes round
  the ring and expects them blank; the compiler now keeps the blank whole.
- `restoreGame()` keeps its name, as `saveGame()`'s pair.

The review found nothing changed in what the rules do:

1. _The one test couldn't see `reach`,_ since the event that refilled each
   record writes it: taken; a pickup's fading takes the blast's record.
2. _The golden angle still used `Math.PI`:_ taken.

### Step 11a: finding 15, the trace, and the bake it called for

Measured on `ab-trace`, at the branch's tip after finding 3, on the game's
production build served by `vite preview`, in headless Chrome at 2× with
the CPU throttled ×6, through `@fz/dev/chrome`, sampling the main thread
every 250 µs. Chrome's default WebGL here is SwiftShader, which made
steady play itself 114 ms a frame, so the runs passed `--use-angle=gl-egl`
to draw on the GPU; steady play is then 16.7 ms a frame, the main thread a
third busy. The scripts are kept in `/tmp/ab-trace/` for the measure after.

| Scenario                                    | Frames: mean / p95 / max        | Over 50 ms  | Rebakes | Bake, encodes in it | Encodes alone | Points' text |
| ------------------------------------------- | ------------------------------- | ----------- | ------- | ------------------- | ------------- | ------------ |
| A drag, 1280×720 to 800×600, a size a frame | 590–671 / 783–1000 / 850–1133   | 59–60 of 61 | 59–60   | 81–83%              | 6–7%          | 3%           |
| A phone turned, 390×844 to 844×390, at 3×   | 21.4–21.7 / 16.8 / 583–600      | 2 of 140    | 1       | 515–519 ms          | 42–45 ms      | none         |
| A chain of blasts, wave 15 (Fuse), 13 lit   | 18.3–19.3 / 16.8–33.3 / 100–117 | 3–4 of 160  | 0       | none                | none          | 3–4%         |

- **The drag rebakes every frame,** at 510 to 575 ms a bake: 60 rebakes
  through 59 distinct units, which pass only 12 whole device pixels. At
  real speed Chrome merged the sizes into five over four frames, with three
  rebakes, the bake still two thirds of the time.
- **A quarter of the drag goes on a blank atlas.** `@fz/phaser`'s
  `bakeTexture()` sizes and clears its canvas texture before drawing, which
  uploads the empty atlas twice and reads it back once, before
  `generateTexture()` uploads the real one.
- **The turn bakes the same atlas again,** since the unit is the same both
  ways up.
- **The points' text shows in the chain:** in its worst frame, `setText()`
  takes 27 to 35 ms of 100 to 117, the uploads 12 to 17 ms. A pool of 12
  labels took 22 writes in one frame. And `PointsPainter.style()` restyles
  all twelve on every change of the field's unit, so each frame of the drag
  draws and uploads 36 texts.

So by the plan's decision 5: the bake shows, and the baked unit is rounded
down to a whole device pixel and How to play's pictures are encoded when
asked for; the points' uploads show, and the points are drawn from digits
baked into the atlas; and `rechargeRing()` takes an `into` record. The
blank atlas is `@fz/phaser`'s, so its fix goes with the library's lifts,
on `phaser-lifts`.

Built on `ab-trace`, from that. `bakedScale()` bakes at the field's unit
rounded down to a whole device pixel, from 1 to the most it bakes at, and
the field's images are scaled up by what's left (`PaintContext.zoom`); the
positions, the lines, the deck and the hit test keep the true unit. The
scene checks the bake once a frame, after both fits, against the layout
the frame draws, so a drag bakes once a pixel and a turn not at all. A
bake no longer encodes How to play's pictures: it hands the shell a
function that encodes them on its first call and keeps them until the next
bake, which How to play calls only as it opens. `rechargeRing()` writes
into the deck painter's own record. `wholePixels()` is the one tolerance a
size is held to a whole pixel by.

Where it went other than planned:

- A turn still baked once: the first fit, before the field took its new
  shape, asked for a bake, so the check moved after both.
- `PointsPainter.style()` is left for the digits: keying it on the baked
  unit would draw the text at a smaller size, scaled up.
- Brick Breaker still encodes its pictures at every bake; finding 15 is
  this game's.

The review found the floor, the check and the pictures sound, every image
in the field's camera scaled and nothing outside it:

1. _No spec held a rebake at a new pixel ratio_ where the unit's whole
   pixels stay the same, as a browser zoom does: taken, by the scaler's
   zoom, the deck's atlas checked too; `AGENTS.md` says so.
2. _A spec asked for the pictures twice within one frame,_ so it would pass
   if every frame baked: taken; a frame passes between.
3. _`picture()` encoded the `pictures` field, and the fake shell's
   `pictures` counted bakes:_ taken; `encodePictures()` and `bakes`.
4. _The same tolerance was written in two files:_ taken; `wholePixels()`.
5. _A spec restored its mocks twice:_ taken.

### Step 5: finding 5, floors under the scene and the shell

Built on `ab-tests`. The scene is held to 98/92/100/99 and the shell to
98/97/97/98, as planned; on the branch's tip they stand at
98.82/93.07/100/100 and 99.42/98.73/98.56/99.33. `src/testing/` is
measured, with no floor, and the helpers the specs trust have specs of
their own: `art_frames`, `crossings`, `every_layout`'s `nearness()`,
`canvases` and `field_picture` in Node, and `belt_board`'s `strokesOf()`
against a `Graphics` Phaser really drew, in `dom`.

Where it went other than planned:

- The helpers both projects load are left to oxc in `dom` too, so their
  functions aren't counted twice; lint lets `src/testing/` take Angular by
  type alone, so none of it needs Analog's compile.
- Vitest's module cache left a project declared with `extends: false` out
  of its key, so `dom` kept old output after a config edit;
  `keyedByThisConfig()` keys it by the config's text.

The review found the floors as planned and covering every folder, each
spec in exactly one project and no file counted twice:

1. _Whether an entry heads toward the middle was tried on the left edge
   alone,_ so a wrong branch for the other three passed: taken; all four,
   both ways.
2. _A circle's edge was held only to its radius,_ so sixteen copies of one
   point passed: taken; the points reach every side.
3. _The pattern that sends `belt_board.spec.ts` to `dom` sent any spec
   whose name began with it:_ taken; the whole name, written so the folder
   itself isn't matched.
4. _The cache's reason was written for every inline project:_ taken; one
   declared with `extends: false`.
5. _The code left to oxc took in the helpers' specs:_ taken; not specs.
6. _A line of `AGENTS.md` ran far past its paragraph:_ taken.

### Step 7d: finding 9, the debug menu's numbers a service of their own

Built on `ab-shell`, the last of finding 9's four planned commits.
`TuningService` (`src/app/settings/tuning.service.ts`), beside the menu
that writes to it, holds the numbers, `retuned` as a `computed` of them in
place of the copy `GameService` kept by hand, `tune()`, `reset()`, and
`onTune()`, which tells a listener of each tuning at once and returns the
function that stops it. `GameService` listens for as long as it lives:
a wave yet to begin is laid out again, and one under way takes the numbers
at once, as before. The settings drawer reads and writes the service, and
its specs moved with it.

Where it went other than planned:

- A listener, not an `effect`: an effect runs at the next change
  detection, so the field could step a frame on the old numbers, and a run
  whose numbers were put back before its first move would keep records it
  shouldn't.
- Whether a run was flown on tuned numbers is still set by a frame on
  which the field moved, not as a run begins, for the same run.

The review found nothing changed for the player on any path:

1. _`onTune()` gave back no way to stop listening,_ and nothing tied the
   game's listener to its life: taken; a `Set`, an unsubscribe, and
   `DestroyRef`.
2. _What was left in `GameService` of a run's state is pure:_ taken, as a
   commit of its own (step 7e).
3. _`retune()` took the numbers from its argument in one branch and the
   signal in the other:_ taken; the listener is told nothing, and reads
   the signal.
4. _The docs named the one listener and the effect not used:_ taken.
5. _A spec's title promised the field, and checked the numbers:_ taken.

### Step 6c: finding 8, the rules' specs tidied

Built on `ab-rules`, the rules' part of finding 8. `describe("stepField")`
nests its 57 tests by what they play: flying and firing, shots meeting
rocks, losing a ship, clearing the wave, the order of a step, the player's
first move and the next ship, three that never step the field moving to
`describe("fieldFor")`. Each test moved as it was, but three titles that
lose "in the step" to their block's name. `rocks.spec.ts` and
`drops.spec.ts` read their events and rocks through `field_picture.ts`'s
`loggedOn()`, `kindsLoggedOn()` and `wholeRocks()`, where they kept their
own; one `speedOf()` there takes the place of three copies and four
`Math.hypot()`s; and the four specs' `fieldOf()`s, which did four things,
are named for what they return. The rules' specs run the same 1,511 tests.

Where it went other than planned:

- Finding 8 is split by whose files it touches: this is the rules' part;
  the scene's, the shell's and the helpers' go with their tracks.

The review found every moved test checking what it did, and each helper
reading the window it replaced:

1. _`drops.spec.ts` kept a copy of the last event's reader:_ taken.
2. _`field_picture.ts`'s `eventsOf()` returned kinds, beside `loggedOn()`'s
   events,_ which the skill had to explain: taken; `kindsLoggedOn()`.
3. _The shell's spec still worked a ship's speed out by hand:_ not taken
   here, as another step was changing that spec; it goes with the shell's
   spec tidy-ups.

### Step 7e: finding 9, a run's own state in the view

Built on `ab-shell`, from the last review of finding 9. `RunState`,
`newRunState()` and `withFrame()` moved from the shell to
`src/view/run_state.ts`, beside `RunFrames`, `withFrame()` handed whether
the numbers are tuned; so the fold of a frame into a run's state, and the
rule that a run flown on tuned numbers keeps no records, are specced in
Node under the view's floor, 19 specs that each fail if a clause of either
is dropped. `GameService` keeps the signal and calls them, and is down
from 739 lines to 655 (753 before step 7d).

The review found the body of `withFrame()` the same, `retuned()` now read
every frame outside any reactive context and making nothing, and the
shell's wiring of it still held by its specs:

1. _`nextWave()`, `takeUp()` and `closeResult()` still build their changes
   to the record in the shell:_ not taken. The shell's specs hold each,
   `keep()` needs the services' answers, and a new field takes its default
   from `newRunState()` in the view already.
2. _Eighteen calls in the spec ended in a bare `true` or `false`:_ taken;
   `RETUNED` and `AS_WRITTEN`.
3. _A paragraph of `AGENTS.md` had a short line, and a doc was rewrapped
   in the move though it was under 100 characters:_ taken.

### Step 12c: finding 17, how far each piece of the art reaches

Built on `ab-scene`, the first of finding 17's commits for the view and the
scene. Each piece of the art that wraps says how far it reaches, which its
painter draws its copies across an edge by: its own extent, and the widest
a line gets, `MOST_LINE`, a third of a unit, at the 6 CSS px a unit the
layout check holds a field to, at any pixel ratio, once the bake rounds the
unit down; mitred out at a sharp corner for the rocks and the ship
(`MOST_MITER`), and the ship's covering its rings. The specs hold every
frame within its reach at the layout check's smallest unit at each pixel
ratio, through the bake, and at the baked scales. `copyOffsets()`, beside
`copyShift()` in `src/rules/torus.ts`, works the copies across the edges
out once, for the copies and the rings; `Copies.showBetween()`,
`toCanvas()` taking coordinates and `wrappedBetween()` leave the painters
no scratch place and none of the six hand-written `betweenOnAxis()` pairs;
and where the ship is drawn goes into the paint context once a frame.

Where it went other than planned, all seen only at an edge, where a copy
now shows as soon as any of its pixels would:

| Reach          | Was          | Now                                   |
| -------------- | ------------ | ------------------------------------- |
| `SHOT_REACH`   | 0.5          | 0.693                                 |
| `PICKUP_REACH` | 1.1, at rest | 1.242, at rest, and breathing with it |
| `RIM`          | 0.5          | 0.667                                 |
| `SHIP_REACH`   | 2            | 2.187                                 |
| A ring         | its radius   | and half its stroke                   |

At 110% browser zoom on a 1× display, the shot's outline reached 0.663
and a pickup's 1.21, and at the smallest unit the bake now draws, the
ship's 2.04, so each copy showed late by a part of a pixel; a ring's
showed 0.125 units late at any scale.

The change had three reviews, the first two reshaping it:

1. _The scales the specs held the reaches at left out the layout's
   smallest unit at a fractional pixel ratio,_ where a line is widest in
   units, so the reaches fell short there: taken; then _a ratio just above
   1, as a browser's zoom gives, was wider still,_ and the bake about to
   round the unit down: taken, as the bound `MOST_LINE` and the scales
   built through the bake.
2. _No spec held a pickup's reach breathing with it:_ taken.
3. _`copyOffsets()` was put in the view's frame module,_ not beside
   `copyShift()` as planned: taken.
4. _The context's field was named like the function that works it out:_
   taken; `shipDrawn`.
5. _A ring's copies were drawn by its radius,_ though its stroke is
   centred on it: taken.
6. _The painters kept a scratch place still, only moved:_ taken;
   `Copies.showBetween()`.
7. _The ship's reach followed its fins alone,_ though its ring is farther
   at most scales: taken; whichever is farther.
8. _At the bake's smallest unit the shot reaches its bound exactly,_ so
   the spec passed by rounding: taken; with a hair of slack, as the others.
9. _`reachOf()`, which the reach specs trust, had no spec:_ taken.
10. _Nits: the specs in two forms, a `Readonly` that added nothing, the
    autopilot's own `SHOT_REACH` meaning its range (now `SHOT_RANGE`), a
    spec's context with no ship, `AGENTS.md` missing the mitre:_ taken.

### Step 12d: finding 17, the debug menu a component of its own

Built on `ab-rules`, its own track's work done. The debug menu, half of the
settings drawer's code and template, is `<app-debug-tuning>`, which reads
and writes `TuningService` and keeps only what the last Copy said and
whether its lines show; the drawer hosts it where the section was, and its
own stylesheet is the shared drawer's alone, as Snake's is. Its spec moved
with it, the drawer's keeping whether the menu shows. Every element of the
drawer has the same box and computed style, and the same accessible tree,
in Chrome before and after.

Where it went other than planned:

- The drawer's mixin can't reach into a child's view, so the menu's
  stylesheet draws the parts of the drawer it is made of as the mixin
  draws them. A mixin of those parts, split from the drawer's, as
  `help-text` was from the help card, would leave no copy: it goes with
  `@fz/style`'s lifts, on `ui-lifts`.
- A spec covers a Copy the browser refuses, which none did.

The review found the move faithful:

1. _The copy left out how a check's description sits beside it,_ which no
   check in the menu has yet: taken.
2. _A mixin split out of the drawer's would remove the copy:_ later, as
   above.
3. _The menu's own rule came before the copied rule it overrides:_ taken.
4. _The class doc restated the code:_ taken.

### Step 12e: finding 17, the layers, the deck and the specs' helpers

Built on `ab-scene`, the second of finding 17's commits for the view and
the scene. Each layer names the camera that draws it (`LAYER_CAMERAS` in
`src/view/field/layers.ts`), and the scene's two cameras ignore what
`drawnBy()` gives the other, where `FIELD_LAYERS` and an `ignore()` of the
frame and deck said it twice. A held hit's flash is a layer of its own,
between the ship's and the effects', just where its painter's order put it
in the effects layer, so it draws the same; `depthOf()`, used only by its
spec, is gone, and the spec holds `LAYERS` as it is. The deck painter
reads the steering from the paint context, set once to the live steering
(`SteeringView`), as every other painter reads what it draws; `press()`
says whether the key flies the ship, so the scene looks it up once;
`effects.ts` says why a held hit borrows a break's sound rather than how it
came to; and `flourishes.spec.ts` logs a lost ship and reads what plays
through helpers.

Where it went other than planned:

- The scene's font from its options goes with the points' digits (step
  11b), which bake it.

The review found every object drawn by the camera it was, in the same
order, and the steering live:

1. _The camera spec saw only layers,_ so an object left outside one would
   be drawn by both cameras unseen: taken; the scene holds layers alone.
2. _The layers' spec restated the code:_ taken; literal lists.
3. _The order's doc spoke of depth, which nothing sets:_ taken.
4. _The context's steering, set once, could be written over:_ taken;
   `readonly`, and `AGENTS.md` says so.
5. _Nits: a spec's interface named like `turns.ts`' own, a title leaving
   out the flash, a steering title that said itself twice:_ taken.

### Step 6a: finding 6, lint keeps the rules and the view to what they are handed

Built on `ab-tests`. A `deterministic()` block in `eslint.config.js` holds
the rules' and the view's code, but their specs, off the clock
(`Date.now`, `performance`, an argument-less `new Date()` or `Date()`,
timers and frame callbacks), off randomness (`Math.random`, `crypto`),
off the page (`window` and every name it goes by, `document`,
`navigator`, `location`, `matchMedia`, `getComputedStyle`, the window's
size and ratio, its listeners) and off what is stored (`localStorage`,
`sessionStorage`, `indexedDB`, `caches`, `cookieStore`, `fetch`), each with
a message saying why: so a run plays the same again from its seed and its
frames, in Node as on the page. The fences also refuse `@fz/core/random`'s
`randomSeed()`, the one unseeded draw the rules could import. Nothing in
the code trips any of it; Brick Breaker's and Snake's rules and view pass
it too, so finding 21 can lift it as it is, its messages made general.

The review found the rules' behaviour, the block's files and its place
sound, nothing after it replacing a rule:

1. _`randomSeed()` reached `Math.random` through an import the fences
   allow:_ taken; refused in the fences, where a second import rule in this
   block would have replaced them.
2. _`performance` was caught only at `.now`:_ taken; the global.
3. _The window's other names, and the page's readers that name no listed
   global, got through:_ taken.
4. _The commit's type:_ `build`, as the repository's lint changes are.
5. _The storage message gave the rule as its reason:_ taken.

### Step 8a: finding 10, the board's cards a component of their own

Built on `ab-shell`, the first of finding 10's commits. The cards over the
field, the ready, paused, cleared, failed and slow ones, with the eleven
computeds that pick and word them and their buttons, are
`<app-board-card>`. The board tells it where the scene is
(`canvasState`, `slow`) and how the ship flies (`board`), and it hands the
board back the focus after Resume or Next wave (`handBack`), as the bar
does. Its host is the layer the board places over the field, its styles
moved with it unchanged, so the cards look and read as before and the
focus moves in the same click. Its 28 specs run with no canvas; the
board's keep seven, for what it tells the card and the focus it takes
back. The specs' `SPACE`, `ROOMY`, `pauseIn()`, `clearIn()` and `endIn()`,
which both specs need, are `src/testing/play.ts`'s.

Where it went other than planned:

- `play.ts` has no spec of its own, as the helpers that drive the shell
  have none: it needs the shell's tokens, which `pure` can't load.

The review found the same look, reading and focus:

1. _The card said the player went on, which the bar calls handing back,
   and said it even when nothing went on:_ taken; `handBack`, with the
   bar's words.
2. _The `canvas` input held the canvas's state:_ taken; `canvasState`.
3. _Both specs copied the same helpers:_ taken; `play.ts`.

### Step 6d: finding 8, the helpers' copied numbers

Built on `ab-rules`, the helpers' part of finding 8. The pictured field's
cap on rocks and pickups at once are the rules' `ROCK_CAP` and
`PICKUPS_AT_ONCE`, not copies of their numbers. `canvases.ts`'s bar and
rail sizes, which can't be imported from `@fz/game-ui`'s Sass, are held to
it by a spec that compiles the app's own stylesheets, the global one and
the app component's, with `@fz/style/testing`'s `compileStylesheet()` and
reads the sizes they publish, so a size changed in either, or an include
of the bar's size dropped from the page, fails it. `stepsBetween()` has a
spec of its own; `LAYOUT_SEEDS` is `readonly`; `numbers.ts` is in
`AGENTS.md` and the testing skill; `belt_board.ts` imports the scene once;
and the shell's spec reads a ship's speed through `speedOf()`.

The review:

1. _The spec compiled the bar's mixin alone, not the page's stylesheets,_
   so the page could be wrong and the spec pass, and it found the package
   by a route of its own: taken.
2. _`stepsBetween()`, which four specs trust to find a step the wrong way,
   had no spec:_ taken.
3. _A doc spelled the sizes out a third time, and a sentence of
   `AGENTS.md` described the wrong thing:_ taken. The board's margin,
   copied into `canvases.ts` from the board, waits for the board's own
   step to finish (step 8).

### Step 12f: finding 17, the "Still loading" status region

Built on `ab-rules`. The board's card holds a visually hidden status region
from the start, empty until the board turns slow, then holding "Still
loading the board. It can take a while on a slow connection." Words added
to a region already in the page are announced, where a `role="status"`
inserted with its words already in it may not be. The region empties once
the board is drawn or fails, and a removal isn't announced. It uses no
`@fz/ui`, so it moves with the card into `@fz/phaser/canvas` (finding 19).
The words are a `loadingWords` computed, and the card's two lines and the
region's words are read from one constant.

Where it went other than planned:

- The visible slow card loses its `role="status"` and is hidden from
  assistive technology, so the words aren't read twice. It holds nothing
  focusable, and the region keeps the same words, readable in browse mode.

The review found the region announced, and once, nothing visible changed,
and every other card state untouched:

1. _The spec that the words are said once couldn't fail:_ its observer
   threw the records away, and its act changed an input the slow card
   ignores. Taken; the spec is gone, since the same-element check and the
   card's being hidden already hold "once".
2. _The check that the slow card offers nothing to press skipped the
   hidden card:_ taken; it looks inside hidden elements.
3. _The spec's `tell()` dropped the `handBack` listener on each rerender:_
   taken.
4. _The template compared the card's state itself, against "templates
   bind, they do not compute", and the copy lived twice:_ taken; a
   computed, and one constant for both.

### Step 8b: finding 10, the haptics driven by the field's events

Built on `ab-shell`, the second part of finding 10. The phone buzzes as
each frame calls for: `RunFrames` sets a frame's buzz from the field's
`"lost"` event and from the run's clearing as it takes the field in, a loss
outranking a clearing in the same frame, and `HapticsService`, beside
`GameService` in `src/app/play/`, buzzes it from `GameService.tick()` if
the setting allows and the device can. The board's effect and `buzzOf()`,
which compared two runs, are gone, with their specs, which moved to
`RunFrames`', `GameService`'s and the service's.

Both of the plan's suspicions held, reproduced through the old code before
the change: a ship lost in the step a shot's points gain another buzzed
nothing, the two cancelling in the ship count, and a ship lost early in a
frame that a blast's clearing ends buzzed for the loss alone, which is
kept on purpose, the loss being the one a player can miss.

Where it went other than planned:

- The cleared buzz comes from the run's clearing, not the field's
  `"cleared"` event, since a field also logs `"cleared"` when a shot or a
  blast clears it after its last ship is lost, which ends the run rather
  than clearing it.
- The buzz comes in the frame's own tick rather than at Angular's next
  change detection, at most a frame sooner.

The review found no bug, and the specs failing for each clause removed:

1. _A loss outranks a clearing only within one frame, so at 60 Hz a
   clearing a few frames after a loss buzzes and cuts the loss's buzz
   short:_ the doc says "in the same frame" now. A rule by time, a
   clearing within the loss's buzz not buzzing, would change what a
   player feels beyond the plan, as it did before this change too, so it
   is left for the user.
2. _Most of the service's spec tested `GameService`, with copies of its
   helpers, and the service sat in `settings/` though only `GameService`
   calls it:_ taken; the play-driven specs are in `GameService`'s spec,
   with its helpers, and the service is in `play/`.
3. _Half of a spec tested a late effect that no longer exists:_ taken; it
   is gone.
4. _No spec held that an ended run's frames buzz nothing:_ taken.
5. _Names and wording:_ taken.

### Step 6b: finding 7, the tools' contract with the source

Built on `ab-tests`. `report:waves` and `capture:screenshots` each load one
typed entry from `src/testing/`, `report_api.ts` and `screenshot_api.ts`,
held to a contract, `script_api.ts`, that imports nothing, and the scripts
`@import` its types, so a rename in the rules or the autopilot fails `tsc`
on the entries and one in the contract fails it on the scripts. The entries'
specs pin what they hand on, the fields, the waves, Endless and the speeds,
since coverage can't see the entries as the scripts load them through
Vite's `runnerImport`. The helpers the scripts load are fenced from Angular
and kept off the clock as the rules are, by a named list, `SCRIPT_HELPERS`,
whose fence flags an import of a file not on it. The saved game's version
is the rules', beside `SavedGame`, and the screenshots stamp the run they
keep with it through a pure `shownRun()`. Each script runs through a
`run()` that returns its exit code, 0, 1 for a wave not cleared or nothing
answering, and 2, with a usage, for an option it can't read or a `--url`
that is no `http` or `https` address, its command line read by one shared
`readArgs()` in `tools/command_line.mjs`.

Where it went other than planned:

- `tools/command_line.mjs` holds what both scripts read their command line
  with, and moves into `@fz/dev` with finding 21, which `lib/dev` waits
  for.
- "Nothing answers at" was a thrown error with a stack; it is a printed one
  now, still exit 1.
- The rules are fenced off `src/testing/` too, which nothing held before.

The first review found nothing broken:

1. _Nothing pinned what the entries map to, and coverage shows them unrun:_
   taken; the entries' own specs, in `pure`.
2. _The exit codes lived in an unspecced `main()`:_ taken; `run()`, specced
   for 0, 1 and 2.
3. _`isUsageError()` three times and `Stop` twice, and a hand-typed
   `values`:_ taken in the game, `tools/command_line.mjs`; `lib/dev`'s copy
   waits for finding 21.
4. _The fence named its files, and `deterministic()` didn't cover them:_
   taken; both apply.
5. _The saved game's key and version were copies:_ the version taken, into
   the rules; the key stays a copy, naming its source, as the fenced
   entries can't import the shell.
6. _A list that could miss a field name, and long lines:_ taken.

The second review, of what the answers added, found no blocker:

1. _The list held only by a comment:_ taken; its fence flags an import of a
   file not on it.
2. _The version's stamping checked on one side only:_ taken; `shownRun()`.
3. _A `--url` with no scheme read as a dead server, and exit 1 unspecced:_
   taken.
4. _Specs played the torus `playWave()` defaults to, so a dropped field
   passed:_ taken; the widest.
5. _The scripts shared the pieces of reading a command line but not the
   pattern:_ taken; `readArgs()` and `CONSOLE`.
6. _Docs said `saveGame()` stamps the version, which the shell does:_
   taken.
7. _The rules weren't fenced off `src/testing/`:_ taken.

### Step 6e: finding 8, the lint configs linted and type-checked

Built on `ab-tests`, the last of finding 8's small points.
`eslint.config.js` and `stylelint.config.js` are linted as the scripts
under `tools/` are, by `@fz/dev`'s `scripts()` block, and type-checked from
their JSDoc in `tsconfig.scripts.json`, under `checkJs` and `strict`, which
the solution now references, as the other games' do, so an editor checks
them, and the scripts, as `tsc` does. Neither config needed a fix.

Where it went other than planned:

- The other games, the site, the libraries and the root's config have the
  same gap, which finding 21 takes up with the fences: nothing in
  `lib/dev` changes here.

The review found both configs checked and nothing else matching them:

1. _The solution didn't reference `tsconfig.scripts.json`, so an editor
   checked the configs, and the scripts, without `checkJs`:_ taken.
2. _`AGENTS.md`'s Linting line hung the configs off the wrong phrase and
   left out `tools/`:_ taken.

### Step 8c: finding 10, `onLayout` handed what the scene worked out

Built on `ab-shell`, the last part of finding 10. The scene hands
`onLayout` one `FieldLayout`, the canvas, the field's shape, its metrics,
the room among them, and the deck's zones or none, which `measure()` builds
once and keeps. The board publishes `data-field`, `data-room`, `data-deck`,
`--across` and `--down` from it rather than working out `fieldMetrics()`
and `deckLayout()` again from a torus read before `setRoom()`. `deckOf()`
lays the deck's parts out in the zones the scene works out once, rather
than working them out itself. Published on the old build and the new, at
every layout shape and the smallest phone at one and two device pixels to
one, both turns, with the deck shown and not, the board's values are the
same.

Where it went other than planned:

- `deckOf()` takes the zones, as the scene kept only the deck's parts,
  which carry the stick's zone but not the buttons'.
- The record carries the torus, which `--across` and `--down` read.

The review found no bug and nothing a player would see:

1. _Every spec of the published room and zones ran at one device pixel to
   one, where the board's conversion to CSS pixels changes nothing:_ taken;
   a spec at two to one, which fails with the conversion dropped.
2. _Guards in the deck's spec that followed from others:_ taken.
3. _`deckOf()` could be handed a board its zones weren't laid out for:_
   taken; its doc says it lays out in the zones `deckLayout()` laid out
   for this board, and the parameter is `zones`.
4. _A spec helper worked out the field's shape twice:_ taken.
5. _The scene copied four fields into the record each layout:_ taken; it
   keeps the record `measure()` builds.

### Step 6f: finding 8, the board spec's noise and the field's margin

Built on `ab-shell`, once the board's own step was done. The board spec
that fails the scene on purpose provides an `ErrorHandler` that collects
what it is handed, `collectErrors()`, and asserts on it, so the suite
prints no error it expects. The field's margin, `MARGIN_CSS_PX`, is in the
view's `field_metrics.ts` beside the frame, which the board and
`canvases.ts` both read, rather than a copy of its numbers in the
specs' helpers, and the board binds `--margin` and `--frame` from the two
constants, where its stylesheet wrote them out again.

Where it went other than planned:

- The stylesheet's own `--margin` and `--frame` are gone: the board's
  bindings are set in the tick that creates it, before any paint, so they
  never showed.
- The noise didn't show where an agent ran the suite: Vitest's reporter
  for agents hides a passing spec's output. Run with
  `--reporter=default`, the suite printed this one error and nothing else.

The review found it correct, and nothing a player or the layout check sees
changed:

1. _`--frame` was a copy of `FRAME_CSS_PX` in the stylesheet, as the
   margin had been:_ taken.
2. _The margin's binding was specced for compact screens alone, through a
   fixture:_ taken; both, against the constant.
3. _The collecting `ErrorHandler` is written out in `@fz/phaser`'s spec
   too, and Brick Breaker's and Snake's board specs print the same
   error:_ not taken here; one helper in `@fz/phaser/testing`, adopted by
   all three, goes with finding 19's branch.

### Step 11b: finding 15, the points from lettered digits

Built on `ab-trace`, the points' half of finding 15 and finding 17's
small point on the font. The points are lettered in the page's font,
`fillText` and `strokeText` with a `Text`'s round joins, into an atlas of
their own, `belt-points`, at the field's whole unit, uncapped, each glyph
at each quarter-pixel step of the pen, which is what Chrome rounds a pen
to; and lettered again only as that unit, the font or the palette
changes. `src/view/art/points_art.ts` measures them, lays a label out as a
`Text` would, its box, baseline and kerning, and packs the atlas, in pure
code. Each label is stamped once, as it shows, into a room of its own on a
`DynamicTexture`, its outlines and then its fills, and shown and faded as
one image, zoomed by what the whole unit leaves, as a `Text`'s canvas is
stretched. A score uploads no canvas, and a new unit restyles nothing. The
board reads the page's font family and waits for its face with the
scene's import, 1.5 s at most, and should the face come later, the points
are lettered again; the family reaches the scene through its options,
not the global `getComputedStyle()`.

Compared in headless Chrome at 2× against the build before, at the same
frames: at a whole unit the labels are the same to the pixel, fading ones
too; at 29.75, lettered at 29 and zoomed, and at 44.85, above the field's
cap, their ink is within a device pixel and as sharp.

Where it went other than planned:

- A first design lettered the digits into the field's atlas, at its unit,
  capped at 32, and showed each character as an outline and a fill image,
  through a write hook added to `@fz/phaser`'s bakes. Its review found
  the points blurred above the cap and fading unlike a `Text`, so the
  points have an atlas and a sheet of their own, and `@fz/phaser` is
  touched only in its headless context, which measures text now.

The first review, of the first design:

1. _Above the cap the points were a blurred zoom of a small bake, where a
   `Text` was always sharp:_ taken; an atlas of their own, uncapped.
2. _Each character's images faded alone, their outlines overlapping the
   next's, and the outline's cut left the fill's edge a ring:_ taken; a
   label stamped once and faded as one image, its outline uncut.
3. _The board could wait for ever for the face, and a face come late was
   never used:_ taken; 1.5 s at most, and lettered again as it comes.
4. _Specs checked a packing that never ships, and a layout by the
   painter's own numbers:_ taken; one packing for both, and the images'
   bounds.
5. _`@fz/phaser`'s hook wrote without saving the context or clipping a
   frame:_ moot; the hook is gone.
6. _Nits:_ taken.

The second review, of the rework, found no bug:

1. _Nothing checked where the atlas writes each glyph, or where its frames
   lie:_ taken.
2. _Nothing held that a board gone stops waiting for the face:_ taken, and
   the wait chained on the load itself rather than a listener.
3. _The loop setting every image's frame after a lettering does nothing a
   player sees:_ kept; it holds the scene's rule that every image takes
   up its frame anew after a bake, which its spec checks for all.
4. _Names that clashed or read twice:_ taken.
5. _Small points:_ taken, but for lettering again after a lost context,
   which Phaser's canvas texture would survive: kept, as `bakeTexture`
   does.

Measured again after step 11a, at the bake's commit, with the same scripts, flags
and runs, before → after:

| Scenario         | Frames: mean / p95 / max                                     | Over 50 ms    | Rebakes    | Bake, encodes in it                     | Encodes alone | Points' text     |
| ---------------- | ------------------------------------------------------------ | ------------- | ---------- | --------------------------------------- | ------------- | ---------------- |
| The drag         | 590–671 / 783–1000 / 850–1133 → 124–135 / 567–667 / 750–967  | 59–60 → 58–60 | 59–60 → 11 | 30.4–33.8 s, 81–83% → 5.2–6.2 s, 51–54% | 2.3–2.8 s → 0 | 3% → 11–12%      |
| The phone turned | 21.4–21.7 / 16.8 / 583–600 → 17.3–17.5 / 16.8 / 83–100       | 2 → 1–2       | 1 → 0      | 515–539 ms → none                       | 42–45 ms → 0  | none             |
| The chain        | 18.3–19.3 / 16.8–33.3 / 100–117 → 18.5–18.6 / 16.8 / 117–133 | 3–4 → 3–5     | 0          | none                                    | none          | 44–60 → 44–46 ms |

- The drag bakes once a whole device pixel, 11 times for the 11 pixels it
  passes, and takes 10.5 to 11.6 s where it took 36 to 40. A bake still
  costs 475 to 560 ms, of which `@fz/phaser`'s blank atlas is 125 to 195.
- Its frames without a bake still run over 50 ms: Phaser's own resize of
  the canvas takes about 37 ms of each, and `PointsPainter.style()`, which
  follows the field's unit and not the baked one, 18.5 ms.
- The turn bakes nothing; its worst frame is the canvas's resize.

And after this step, at the points' commit, after 11a → after 11b:

| Scenario         | Frames: mean / p95 / max                                   | Over 50 ms    | Rebakes | Bake, encodes in it                   | Encodes alone | Points' text                                               |
| ---------------- | ---------------------------------------------------------- | ------------- | ------- | ------------------------------------- | ------------- | ---------------------------------------------------------- |
| The drag         | 124–135 / 567–667 / 750–967 → 112–134 / 650–683 / 800–1267 | 58–60 → 23–30 | 11 → 11 | 5.2–6.2 s, 51–54% → 5.5–6.8 s, 53–58% | 0 → 0         | 1.14–1.36 s, 11–12% → 0.61–0.75 s, 6%                      |
| The phone turned | 17.3–17.5 / 16.8 / 83–100 → 17.1–17.2 / 16.7–16.8 / 83     | 1–2 → 1       | 0 → 0   | none                                  | none          | none                                                       |
| The chain        | 18.5–18.6 / 16.8 / 117–133 → 18.5 / 16.8 / 100             | 3–5 → 3       | 0       | none                                  | none          | `setText` 44–46 ms → none; all the points 73–77 → 63–67 ms |

- Frames without a bake: a mean of 38–48 ms, down from 56–59; over 50 ms in
  10–16 of 72–79, down from 47–49 of 74–75.
- Those still over 50 ms: Phaser's own resize of the canvas, 39–66 ms, and
  Chrome's native work, 14–25 ms; nothing of the points.
- A re-lettering of the points: 11 in the drag, each in a frame that
  rebakes the field's atlas, at the same whole unit; 40–116 ms at ×6,
  median 48–57; its atlas drawn in 40–50 ms, half of it the upload; 7–12% of
  its frame. None at the turn, none at a score.
- A score: no canvas uploaded; the label stamped, 5–8 ms in the chain's
  worst frame, and the sheet rendered, 16.6 ms there and about 7 in a frame
  of 12 scores.
- The chain's points: 29–30 ms in its worst frame, of 22 scores, against
  36–38 (`setText` 24–32 of it, uploads 12–14); 63–67 ms all told, against
  73–77.
- The worst frames: the drag's 11 bakes, 467–1267 ms, `@fz/phaser`'s blank
  atlas still in them; the turn's resize of the canvas, 83 ms; the chain's
  100 ms, Phaser's render 23–27, the points 29–30, the rules 16–17.
- The drag at the speed of a hand: unchanged, 3 rebakes, its worst frame
  850–867 ms against 800–817.
- Unexpected: the sheet's render about as dear as the uploads it replaced,
  so the chain's worst frame gains only 7–8 ms; the gain is the drag's.

The chain's sheet, rendered once a frame of scores, and Phaser's resize of the
canvas, and `@fz/phaser`'s blank atlas in a bake, are what is left; the last
goes with `phaser-lifts`.

### Step 13: QA of the branch

`yarn verify` passes, in 2 min 35 s, and `yarn check:layout` holds every
game at each shape and turn. Played in headed Chrome on the site's
production build, Asteroid Breaker passes all nine checks and Brick Breaker
plays as before, with no error or warning in either console:

- **The waves:** wave 1 and, after a clear, wave 2 wait in "ready" for a
  move, and a crystal breaks in its body's ink, no violet left in the
  frames after it.
- **The points:** labels rise and fade as plain outlined text, sharp at 1×
  and at 2560×1440.
- **The cards:** Paused, Cleared, Ended and, with the CPU throttled 20× on
  slow 3G, Still loading show, and the focus stays on the board through
  every card and dialog.
- **The rest:** How to play shows its 17 pictures; the debug menu shows
  with `?debug` and not without; the haptics toggle, and buzz `[80]` for a
  ship lost and `[30, 60, 30]` for a wave cleared; the field lays out again
  at each size, with the deck on a phone; a reload takes the run up paused;
  and a run lost shows its result and the Ended card.

Seen and left, none from this branch:

- A key pressed and released within one frame doesn't start a waiting wave,
  since the first move is read from what is held at a frame; a player's
  press lasts longer.
- Two labels clamped to the same spot at the field's edge overlap.
- On a slow load the Ready card shows over the placeholder until Still
  loading takes its place at 8 s.
- The Cleared tally reads "No ship lost 0" in a wave a ship was lost in.
- Both boards read the pixel ratio once, which finding 19's
  `watchCanvasViewport()` answers on `phaser-lifts`.
- `yarn verify` prints Node's warning that `localStorage` needs
  `--localstorage-file`, from the Solitaire Collection's test setup.

## Part 4, on `core-lifts`

### Step 14a: finding 18, the stepper and a count up to a mark

Built on `cl-clock`. `@fz/core/clock`'s `createStepper(stepMs,
maxStepsPerFrame)` is what each breaker's byte-identical `stepper.ts` was,
which now binds it to its field's step, their specs gone for the
library's, and each breaker's play holds the binding to the tuning's step
and its most steps a frame. A `Countdown` there counts a frame's time up to
a mark and says so once, which `FieldPlay`'s card wait, Brick Breaker's
serve after a loss and Snake's result card take, each a counter of its own
before. Each breaker's play writes its frame as its `FieldFrame` with
`PlayFrame`, rather than restating `alpha`.

Where it went other than planned:

- Snake's stepper stays its own: its step's length changes as it eats,
  worked out again within a frame, so a fixed step doesn't fit it. Its
  result card's wait was a count up to a mark, which takes `Countdown`.
- The frame is an intersection, `FieldFrame & PlayFrame`: an interface
  extending both fails, as `alpha` is `readonly` in one and not the other.
- On a frame whose time is not a number, Snake's result card now opens at
  once, as the breakers' cards already did, where it never opened before;
  Phaser hands no such frame. Treating one as no time, as `advanceClock()`
  does, would change all three, and is left.

The review found the lifts sound:

1. _The breakers' stepper specs gone, nothing held each game's binding,
   its most steps a frame or its unit:_ taken; two specs in each play.
2. _Nothing held that Snake's new run stops the result card's wait:_
   taken.
3. _`Countdown`'s handling of a negative or not-a-number frame was
   unstated:_ taken; its doc says it, and its spec pins both.

### Step 14b: finding 18, the readers of stored JSON

Built on `cl-json`. `@fz/core/json` takes `isFiniteNumber()`, `listOf()`,
a list read item by item or `null`, and `isListOf()`, a list whose every
item passes a check; `@fz/core/records` takes `isOneOf()` and `isKeyOf()`.
Asteroid Breaker's kept rocks, crew and finite numbers, Brick Breaker's
climb, Snake's squares and turns, Sudoku's history and notes, and each
game's stored choices and catalog ids read through them, the copies gone,
each game's own guards, such as `isSpeed()`, kept as their names over
them. Brick Breaker's and Sudoku's whole-number checks take `isWhole()`.
What each stored entry reads as is unchanged.

Where it went other than planned:

- `isListOf()` is new: the crew, Snake's turns and Sudoku's notes are
  checked, not read, and finding 13's review refused building a copy only
  to throw it away.
- Left as they are: the Solitaire Collection's reader, as it takes nothing
  from `@fz/core` and throws naming the path; Minesweeper's mines, which
  build a mask and refuse a square twice; and Brick Breaker's bricks, whose
  list holds empty cells by index.

The review found every replaced reader the same on every input:

1. _Snake's movement setting had no spec of a value it doesn't know:_
   taken.
2. _Snake's apple spec was refused before its length was checked:_ taken;
   a square of three numbers.
3. _An `it.each` titled a list case as a string:_ taken.
4. _The `fuzzley-ui` skill's description ran past 1,024 characters:_
   taken; 979, its `@fz/core` summary left to its table.
5. _Two whole-number checks were `isWhole()` written out:_ taken.

### Step 14c: finding 18, the curves, the marks and the seeds

Built on `cl-math`. `@fz/core/math` takes `lerp()`, `shareDone()`,
`easeOutCubic()`, `fadeAlpha()` and `nextMarkAfter()`, and
`@fz/core/random` takes `mixSeed(seed, n, stream)`, its streams named,
`"draw"`, `"field"`, `"makeup"` and `"scenery"`, each keeping its old
constant, and their first seeds pinned. Both breakers' `between()`,
Endless's own copy of it, their curves, the next ship's and the next
life's marks and every seed mixed by hand go for them, and Brick
Breaker's lull and autopilot and Snake's glide lerp through `lerp()`.
Every number is the same: each mixing site's first seeds are pinned in
its own spec, and a dump of every seed, wave, constellation, curve and
mark over 71 seeds, taken before and after, is the same to the byte.

Where it went other than planned:

- `nextShipAfter()` and `nextLifeAfter()` stay, a line each over
  `nextMarkAfter()`, holding each game's marks, which its saved game is
  checked against.
- The ease is `easeOutCubic()`, neither game's word for it.
- `a + (1 - a) * t`, from a floor up to full, is left as written at three
  places.

The review found every number the same:

1. _No row of the marks' spec sat just below a later mark, so rounding
   for flooring passed:_ taken.
2. _Nothing held `lerp()` to its order, whose result can round short of
   the second number:_ taken; pinned, and its doc says so.
3. _A new stream could go unpinned:_ taken; the pins are a record of
   every stream, which the type checker holds.
4. _The streams' doc claimed oddness keeps them apart:_ taken.
5. _Mixing a seed by hand isn't kept out by lint:_ not taken here; it goes
   with finding 21's fences on `dev-lifts`.

### Step 14d: QA of `core-lifts`

`yarn verify` passes, in 2 min 38 s, and `yarn check:layout` holds every
game it checks. Played in headed Chrome, Asteroid Breaker, Brick Breaker,
Snake, Sudoku and Minesweeper each load with no error or warning, play,
keep a setting changed and take a run up again after a reload, its save
the same, a saved run from before the branch among them. The waits come
in at their numbers: the result cards at 500, 600 and 600 ms, the Cleared
cards at 800 and 700, Brick Breaker's serve a frame inside its second, as
before. A run at 9,995 gains a ship at 10,000, its next at 30,000, and
one at 19,950 a life at 20,000, its next at 60,000.

`@fz/core`'s floor stays at 100 on every count. It has no `src/testing/`,
so the rule that a library counts its own with no floor reaches it with
its first helper, and is written down with `@fz/dev`'s, on `dev-lifts`.

Seen and left: a rock's position taken up again can differ in its last
digit once the field is laid out anew, which the branch's readers, passing
the stored numbers through, don't touch.

## Part 4, on `dev-lifts`

### Step 15a: finding 22, the compiler

Built on `dl-compiler`. `@fz/dev/tsconfig/scripts.json` takes the base
preset's `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature`,
`noImplicitReturns` and `noFallthroughCasesInSwitch`, the two presets each
saying their checks are kept in step. All 27 errors come from the first
flag, 5 in the root's scripts and 22 in the Solitaire Collection's, as the
plan counted: a match's groups and a split's first piece given a default, a
pixel's channels read as 0 past the buffer, a contrast taken through
`Math.max()` and `Math.min()`, the sheet's cut walking the rows and columns
`findCards()` already counted, and `drawEach()`'s workers sharing one
iterator. The atlas, its preview and the 41 games' thumbnails are written
again byte for byte. Asteroid Breaker's app, specs, configs and scripts take
`exactOptionalPropertyTypes`: `PhaserHost`'s four fields that are set back
to `undefined` and `ImageOptions`' `region` and `resize` allow it, as their
readers do, and `angular()` reads angular-eslint's processor once, thrown
for where it is missing, since the flag won't pass on one typed as maybe
missing.

Where it went other than planned:

- 12 errors, not 7: the rocks' points' specs, newer than the plan, set
  `rockPoints: undefined` five times, and `angular()` is reached once the
  game's scripts program takes `eslint.config.js`. The specs now leave the
  key out, as a field kept before the points were counted does.
- Measured for the base preset's "later", distinct errors after this step,
  a dash where the workspace has no such program:

  | Workspace                                                   | Base-preset programs                                        | Scripts, if `scripts.json` took it too |
  | ----------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------- |
  | Solitaire Collection                                        | 61, 29 of them one optional `random` in `DeckSourceOptions` | 2                                      |
  | Brick Breaker                                               | 3                                                           | 1                                      |
  | `@fz/phaser`                                                | 1                                                           | —                                      |
  | site                                                        | 1                                                           | 0                                      |
  | Minesweeper, Snake, Sudoku                                  | 0                                                           | 1 each                                 |
  | root                                                        | —                                                           | 2                                      |
  | `@fz/core`, `@fz/dev`, `@fz/style`, `@fz/ui`, `@fz/game-ui` | 0                                                           | —                                      |

- A heading in `@fz/dev`'s `AGENTS.md`, run into the bullet above it, set
  apart again.

The review found no script's output changed:

1. _Widening `rockPoints` to `number | undefined` made a spec shortcut the
   saved type, which no real data holds:_ taken; the type stays `?: number`,
   the specs leave the key out through `keptUncounted()`, the two table
   rows their own cases on it, and each rewritten spec fails with the
   uncounted branch broken.
2. _The libraries' sources are held to a flag only this game's typecheck
   turns on:_ taken; `angular()`'s comment names it, and `@fz/dev`'s and
   `@fz/phaser`'s `AGENTS.md` say so in their checks.
3. _`scripts.json` copies the base's checks rather than extending it:_
   taken in its smaller form; each preset says the two are kept in step,
   since extending would bring the base's `noImplicitOverride` and emit
   options with it.
4. _`drawEach()`'s one cast could go:_ taken; the workers share one
   iterator, the cast, its counter and its comment gone.
5. _A pixel read as 0 past the buffer would hide a future bug:_ not taken;
   every index is bounded by its own loop over the buffer, and
   `readUInt8()` costs per pixel in loops of some 22 million. The
   contrast's defaults, which could never apply, go.

### Step 15b: finding 21, the layer fences and every config linted

Built on `dl-fences`. `@fz/dev`'s `eslint.ts` takes
`phaserGameLayers({ viewAllows, heldAsRules })`, the rules → view → scene
→ app fences the three games drawn with Phaser each wrote out, with step
6a's `deterministic()` in it and `Math.imul()` refused beside it for
`@fz/core/random`'s `mixSeed()`. Asteroid Breaker lets its view take
`@fz/style/fuzzball` (`viewAllows`, an entry only, anything else thrown
for) and holds the helpers its scripts load as the rules are
(`heldAsRules`); Brick Breaker and Snake take the block whole, and their
rules and views pass `deterministic()` as they are. The block is specced
layer by layer, each fence, global and exemption failing a case once it is
dropped. Every workspace's ESLint and Stylelint configs, and the root's,
are linted by `scripts()` and type-checked from their JSDoc in a
`tsconfig.scripts.json` that each solution references, each config going
from no rules to the block's 142; `@fz/core`'s, `@fz/dev`'s and
`@fz/style`'s `tsconfig.json` become solutions over a `tsconfig.lib.json`,
as `@fz/ui`'s is, `tsc` checking the same files with the same options.

Where it went other than planned:

- The view's fence is an allow-list now, every `@fz/*/*` entry refused
  but `@fz/core`'s, `@fz/phaser`'s pure ones and `viewAllows`, tighter
  than any game's copy: bare `@fz/phaser`, `@fz/dev` and any library to
  come are refused too, which no view imports.
- Brick Breaker's and Snake's rules gain the fences only Asteroid Breaker
  had, against the specs' helpers and `randomSeed()`.
- `@fz/core` takes `@types/node` for its scripts' program.
- A `tsconfig.json` with files of its own can't reference a `noEmit`
  project (TS6306, TS6310), hence the three solutions.

The review found no fence or message lost or loosened:

1. _Parts of the block could be dropped with the specs green: the view's
   `randomSeed()` case imported nothing, and the scene's and shell's
   libraries, the rules' other libraries and a rules spec's import of the
   view had no case:_ taken; each a case, and each dropped once to see it
   fail.
2. _Brick Breaker's autopilot and kept run, which its scripts load, are
   held to nothing, though its new doc leans on their determinism:_ not
   taken here; the autopilot imports the view's `GLOW_BRICKS`, which the
   rules' fence refuses, so holding it means moving that first. Its doc
   says lint doesn't hold it yet; a follow-up.
3. _The three new solutions carried no compiler options, so a tool reading
   the solution, Vite among them, saw none:_ taken; each extends the preset
   its leaf used, the leaf the solution, as `@fz/ui`'s do.
4. _A type named for a list held one pattern and allowed neither `group`
   nor `regex`; `heldAsRules`' type was inline; a `viewAllows` path the
   fence would still refuse was taken without a word:_ taken;
   `RestrictedImportPattern`, `HeldAsRules` and the throw.
5. _The docs didn't say `testing` is a name the fences keep, a line ran
   past the width, and the two lists of `@fz/phaser`'s pure entries didn't
   point at each other:_ taken.

### Step 15c: finding 21, the test projects, and `@fz/dev`'s floors

Built on `dl-projects`. `@fz/dev`'s `angularTests()` takes
`projects: { root, pure, domSpecs?, sim? }` and builds steps 3 to 5's
`dom`, `pure` and `sim` from them, each with `extends: false`: `dom` in
jsdom through Analog, `pure` in Node over the folders given, minus the
`domSpecs` names and the simulations, and `sim` in Node without coverage.
Step 5's cache key and the watcher's forwarding move with them, the key,
`keyedBy()`, now over `@fz/dev`'s `vitest.ts`, the pure folders and the
workspace's `tsconfig.json` and `tsconfig.spec.json`. Asteroid Breaker's
config moves onto it, its 99 spec files placed as before, and Brick
Breaker and Snake take it: their rules and views run in Node, Brick
Breaker's `every_level/` in `sim` from a `test` script that runs Vitest
twice, as Asteroid Breaker's does. `angularSpecs()` names Analog's pool,
so the site's `app` runs in `vmThreads` as Analog means it to, not in
`forks`. `@fz/dev` counts its `src/testing/`, under floors raised to just
under its figures, 93/95/95/93, and `frontend/AGENTS.md` says once that
every library counts its own with no floor of its own. Every spec runs
once, each game's coverage is the same row for row, and the root's
`yarn test` takes 65 s against 68 s.

Where it went other than planned:

- The projects are an option of `angularTests()`, not a function of
  their own.
- Brick Breaker's and Snake's `src/testing/` stay with `dom`: Brick
  Breaker's reaches Angular's tokens and providers, Snake's `TestBed`, and
  a pure folder must hold nothing Analog's plugin must compile.
- `@fz/dev`'s floors went up twice, once its specs reached the moved
  filter and key.
- A root run under a load of 31 timed Brick Breaker's first app spec out
  at 5 s; it takes 0.4 s alone, before and after, and every other run
  passed.

The review found every spec placed once:

1. _A `domSpecs` name in a pure folder outside `src/` ran in no project:_
   taken; `dom` takes the pure folders' specs too, its exclude keeping
   only those names, and the placement spec holds a `tools/` one.
2. _Nothing failed with the cache key or Analog's filter dropped:_ taken;
   the filter and oxc's pattern come from one function, a spec calls
   Analog's own transform at a pure path and at a control, and two specs
   hold the key to the pure folders and the tsconfigs, each safeguard
   dropped once to see it fail.
3. _The rule a pure folder keeps read as a consequence, only Asteroid
   Breaker's lint holds it, and two doc comments opened with two
   sentences:_ taken; written as a requirement, and Brick Breaker's and
   Snake's `src/testing/` left to `dom`.
4. _Three slips of wording:_ taken.
5. _The `src/testing/` rule sat in how to run the specs:_ taken; in the
   libraries' bullet.
6. _The key left out the tsconfigs Analog and oxc compile by:_ taken, the
   workspace's own two, the presets they extend not followed.

### Step 15d: finding 21, the screenshot scripts and the reports

Built on `dl-scripts`. `@fz/dev/script` takes what every Node script
shares: step 6b's `readArgs()`, `misread()`, `stopWith()`, `isStop()` and
`CONSOLE`, so every script has a `--help` and exits 2 with what is wrong
and the usage, and `importThroughVite()`, the `runnerImport` loader five
scripts and the site's catalog kept, loading Vite only when called, which
lint now holds. `@fz/dev/screenshots`' `runScreenshotScript()`, shaped
like `runLayoutScript()`, takes every game's capture: the command line, a
server that must answer within five seconds, Chrome, the page set up
before the game starts (palette, storage, clocks and a seeded
`Math.random`, in one `preparePage()` specced from the source it sends),
the wait for it to draw through the layout check's `settle()`, the Phaser
canvas's selectors, `describePhaserPage()`, and `thumbRegionAround()`,
which rounds before it keeps the region on the capture's whole pixels.
`@fz/dev/report` prints Asteroid Breaker's and Brick Breaker's tables
alike and returns the exit code. Each game's script keeps only the states
it captures and how it sets them up, and Asteroid Breaker's
`tools/command_line.mjs` goes. Every capture, report and puzzle bank is
the same, byte for byte where the game draws the same twice, but for the
fixes below.

Where it went other than planned:

- Fixed with the lift: Brick Breaker's, Snake's and Sudoku's thumbnails
  could ask `sharp` for a pixel past a 2× capture's edge; every script
  that threw a stack on a bad command line, Sudoku's puzzle generator
  among them, exits 2 with the usage; a server that doesn't answer, and
  Sudoku's or Minesweeper's board that never shows, end in one line and
  exit 1.
- Brick Breaker's report's names column is as wide as its longest name,
  and its headings lose their trailing spaces, as Asteroid Breaker's do;
  the Solitaire Collection's script says `yarn dev`.
- `settle()` answers whether the page drew rather than throwing, and the
  layout check throws its own "Nothing matched", word for word as before.
- Brick Breaker's `tools/` specs run in its `pure` project, its report's
  first spec among them.

The first review found nothing a capture would show:

1. _No spec ran the page's setup from the source sent, so a constant it
   read from its module would fail only in Chrome:_ taken.
2. _Vite was imported where the scripts load it:_ taken; lazily, and lint
   refuses a value import of it in the modules the scripts take.
3. _Two names meant two things each:_ taken; `allowPositionals` and
   `nameLabel`.
4. _Copies stayed: the region's typedef, the canvas's selectors, two
   games' `describePage()`, the site's loader and Sudoku's generator's
   command line:_ taken, each lifted or adopted.
5. _The runner's doc didn't say what it throws, and its server check
   could wait forever:_ taken; five seconds.
6. _`settled()` read every failure as a timeout:_ taken.
7. _Three nits:_ taken.

The second found the fixes right, and:

1. _`settled()` spotted a timeout by retyping `settle()`'s message:_
   taken; `settle()` answers `true` or `false`.
2. _Nothing ran `describePhaserPage()` from the source sent:_ taken.
3. _Brick Breaker's rewritten report had no spec:_ taken; 15 cases on a
   fake level set, its slow endgame's rule among them.
4. _Sudoku and Minesweeper ignored whether the board showed:_ taken.
5. _Nothing kept Vite lazy:_ taken; the lint rule above.
6. _Nits: two ways to check for a stop, a usage helper in the wrong
   module, the layout runner printing otherwise than the screenshots', a
   wait tuned to one game:_ taken; `isStop()`, `wrapped()` in
   `@fz/dev/script`, `runLayoutScript()` taking the same printers, and
   the wait an option at 800 ms.

### Step 15e: finding 21, the rectangles a board writes for the layout check

Built on `dl-rects`, a copy step 7e's review left to this finding. The
three games drawn with Phaser each wrote a rectangle as "x y width height"
into `data-field`, `data-board`, `data-room` and `data-deck`, Asteroid
Breaker through its own `rectWords()`, the others inline, and five places
split it back by hand. The format has one writer now,
`@fz/phaser/layout`'s `rectAttribute()` and `namedRectsAttribute()`
beside `CssRect`, the latter taking `[name, rect]` pairs in their order,
and one reader, `readRect()` and `readNamedRects()` in `@fz/dev`'s
`board_page.ts`, an entry of its own, `@fz/dev/board-page`, which imports
nothing, so the board specs read with it without loading Vite. A function
the page runs reaches its helpers through `Page.evaluateWith()`, which
declares them by their names around it, and the layout check's
inspections, Asteroid Breaker's `check-layout.mjs` and
`describePhaserPage()` read through them. Every attribute is the same
text, byte for byte over 6,048 rectangles against the old writers, and
`check:layout` holds.

Where it went other than planned:

- `@fz/dev` writes `CssRect`'s shape out again as `CanvasRect`: importing
  `@fz/phaser` would make the two libraries need each other.
- A page function calls the readers as names of its own module: Vitest
  rewrites an imported call (`(0, __vite_ssr_import_0__.readRect)(…)`),
  and that text is what `String(fn)` sends. So `describePhaserPage()`
  moves into `board_page.ts`.
- The board's reader takes any run of spaces, as the deck's always did,
  and refuses `" 20 25 260"`, which it read as x = 0; a canvas whose board
  writes no rectangle reads as no board, not a 0×0 one at its corner.
- Brick Breaker's and Snake's board specs read the attribute back rather
  than matching a pattern; `@fz/phaser`'s spec pins the text.

The review found every attribute's text the same:

1. _The readers came through `@fz/dev/layout`, which loads Vite, and three
   spec tsconfigs changed only for that:_ taken; `@fz/dev/board-page`, and
   the three tsconfigs as they were.
2. _"Call them by those names" hid a trap, a call through an import that
   Vitest rewrites:_ taken; written where the names are promised, and the
   page's functions kept in `board_page.ts`.
3. _The inspection with no box handed, how the helpers are declared and
   their order weren't held:_ taken.
4. _Two docs claimed more than the code does:_ taken.
5. _A helper with no name, or one given twice, would send broken source
   the page reports as its own:_ taken; thrown for in Node.
6. _A mutable list of readers, and a record whose integer-like names move
   to the front and whose names the reader could misread:_ taken;
   `readonly`, pairs, and a name refused unless one word free of commas.
