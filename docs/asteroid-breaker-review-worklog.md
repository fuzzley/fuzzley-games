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
