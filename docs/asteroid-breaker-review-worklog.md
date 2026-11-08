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
