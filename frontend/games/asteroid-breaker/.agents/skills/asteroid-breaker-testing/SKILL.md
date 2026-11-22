---
name: asteroid-breaker-testing
description: How to run and write Asteroid Breaker's specs — which Vitest project a spec runs in, the coverage floors, and what src/testing/ holds for the rules, the autopilot, the saved game, the scene and the shell. Triggers on: frontend/games/asteroid-breaker spec, fieldFrom, playWave, startBoard, FakeShell, provideSpecWaves, keptRun, report:waves, check:layout.
---

# Testing Asteroid Breaker

How Asteroid Breaker's specs run, and what `src/testing/` holds for them.
What every Angular workspace's specs share is the `angular-testing` skill's,
the headless Phaser harness is `phaser-core`'s, and the rules every spec
follows are in `.agents/AGENTS.md`, under "Writing Unit Tests". Paths are
relative to `frontend/games/asteroid-breaker/`.

## Commands and Coverage

Run these from `frontend/games/asteroid-breaker/`.

- **Run one spec with `yarn vitest run --project <project> <path>`.** A
  spec sits beside the file it tests, and its folder sets its project:
  - `pure`, in Node: `src/rules/`, `src/view/`, `src/testing/` and `tools/`;
  - `sim`, in Node: the folders that play or lay out every wave,
    `src/rules/waves/every_wave/`, `src/rules/waves/every_endless_wave/`
    and `src/rules/field/every_layout/`;
  - `dom`, in jsdom: every other spec under `src/`, the scene's and the
    shell's.
- **What needs a page is the scene's or the shell's to test.** A spec of
  the rules, the view or `src/testing/` runs in Node, with no DOM, TestBed
  or Phaser game.
- **`yarn test` runs the whole suite, which takes minutes,** most of them
  the autopilot's. `yarn test:coverage`, which CI runs, measures `dom` and
  `pure`, then runs `sim` without coverage.
- **The floors are in `vitest.config.ts`.** `src/rules/` and `src/view/`
  are held to 100% of statements, functions and lines and 95% of branches,
  `src/scene/` and `src/app/` a little under what their specs reach.
- **What only the simulations reach counts as untested,** since coverage
  leaves `sim` out. A branch of the rules needs a spec of its own in
  `pure`, however often the autopilot flies through it.
- **A helper in `src/testing/` whose answer a spec trusts has a spec of
  its own beside it,** as `src/testing/field_picture.spec.ts` is, so one
  that answered wrongly can't let a spec pass that tests nothing. One held
  by the spec of what it reads needs none: `src/testing/pilots.ts`'s
  `poseIn()` by the pilot's, `src/testing/belt_board.ts`'s readers by the
  scene's.
- **Check the layout with `yarn build`, then `yarn check:layout`.** The
  header of `tools/check-layout.mjs` lists what it holds.

## The Rules

- **Draw a field rather than play to it.** `fieldFrom(rows, options)`
  (`src/testing/field_picture.ts`) lays one out from a picture. Its doc
  comment gives the characters, and `PictureOptions` what a picture can't
  show. `KEEPER` is a picture of one large rock, which keeps a wave from
  clearing while a spec plays on.
- **Put more on it with the same file's helpers:** `placeRock()`,
  `placeShot()`, `placePickup()`, `catchOn()`, `placeSpark()`,
  `placeStray()`, `placeLoose()`, `placeComet()` and `placeBurr()`.
  `stepTimes(field, n)` steps it. `shipOf()`, `wholeRocks()`,
  `floatingPickups()`, `loggedOn()`, `kindsLoggedOn()` and `speedOf()` read
  it back.
- **Assert on the field's records and the events it logged,** after the
  steps. A field changes in place, from records made once.
- **Step the field once before a blast is to hit a rock a spec placed.** A
  blast, or a set piece's vent, passes by a rock laid on the step it goes
  off (`hitWithin()`).
- **A stray, a comet or a burr coming in off an edge is read with
  `src/testing/crossings.ts`:** `entryOf()` says where one waits, and
  `entriesOf()` holds a run of them, over many seeds, to every edge, their
  margin and their tilt.
- **What a change in a run brings to the records is `runRecords()`**
  (`src/testing/records.ts`), nothing but what the spec names.
- **A table held to rising or falling takes its differences from
  `stepsBetween()`** (`src/testing/numbers.ts`), as
  `src/rules/tuning.spec.ts` does.

## The Waves and the Autopilot

- **Three folders of simulations hold every wave,** in `sim`:
  - `src/rules/waves/every_wave/` has the autopilot play every wave at
    every speed on three fields (`FIELDS` in `src/testing/autopilot.ts`),
    each cleared within four minutes of game time (`AUTOPILOT_LIMIT`),
    meeting the comet, the stray and the burr it sends, its tally adding
    up to its score;
  - `src/rules/waves/every_endless_wave/` plays Endless's waves 31 to 60
    (`ENDLESS_PLAYED`) the same, with nothing able to take the ship;
  - `src/rules/field/every_layout/` lays every wave out, in every
    formation, on the same fields, each rock far enough from the ship on a
    course that keeps clear of it.
- **Each folder keeps a file for each speed, which only calls its
  holder** with its own file (`holdEveryWave(import.meta.filename)`), so
  Vitest runs the speeds side by side. A check on every wave goes in the
  holder: `src/testing/every_wave.ts` or `src/testing/every_layout.ts`.
  `src/rules/waves/autopilot.spec.ts` and `src/rules/field/spawn.spec.ts`
  hold each folder to a file for every speed.
- **Play a wave in a spec of your own with `playWave()`,** given its entry
  and a speed, from its number as the seed unless given another.
  `playField()` plays a field the spec made, to `untilStep` if given. Both
  return an `AutopilotReport`.
- **The autopilot's own spec is `src/rules/waves/autopilot.spec.ts`.** A
  spec of one frame of it draws a field and reads the steering `pilot()`
  gives it.
- **`yarn report:waves` plays the same games, for tuning:** `--seeds <n>`
  many more, `--field wide` or `--field tall` on the larger fields, and
  `--endless` Endless's. The `asteroid-breaker-content` skill says what to
  read in it.
- **A script under `tools/` takes the game's code through one entry,**
  loaded through Vite: `REPORT_API` (`src/testing/report_api.ts`) or
  `SCREENSHOT_API` (`src/testing/screenshot_api.ts`), each typed by
  `src/testing/script_api.ts`, which imports nothing. What a script newly
  needs is added to the type there, then to the entry, then to the entry's
  spec (`src/testing/report_api.spec.ts` or
  `src/testing/screenshot_api.spec.ts`): coverage doesn't see what a
  script loads through Vite, so nothing fails for a field left untested.
- **A script's spec sits beside it,** in `pure`, and calls the script's
  `run()` with a command line and where to print, as
  `tools/report-waves.spec.ts` does. `tools/build-sounds.spec.ts` holds the
  sprite in `src/scene/sounds/` and the view's mix (`SOUNDS`) to the
  recipes in `tools/sounds/`.

## The Saved Game

- **Both specs start from `src/testing/run_under_way.ts`:** `runUnderWay()`
  is a run on its third wave, and `playedField()` its field, played a
  second. `src/rules/run/saved_game.spec.ts` keeps a run and takes it up,
  and `src/rules/field/kept_field.spec.ts` its field.
- **A spoiled entry is written once, in the table named for the check it
  spoils** (`KNOWN_WAVE_SPOILS`, `CREW_SPOILS`, `STATE_SPOILS` and the
  rest, each row a `Spoil`). That check's own spec holds each row to
  failing it, so a spoil can't pass by failing another check, and the
  reader's spec holds each to being refused.
- **`src/app/play/saved_game.service.spec.ts` takes a run up after
  `reload()`,** a new TestBed, as a page loaded again would.
- **The scripts take up runs the rules keep,** so they store a run in
  whatever shape the rules save. `keptRun()` and `clearingRun()`
  (`src/testing/kept_run.ts`) reach them through `SCREENSHOT_API`, and
  `tools/stored_run.mjs` stores each under the rules' `SAVED_GAME_VERSION`.
  `keptRun()` is the screenshots' (`tools/capture-screenshots.mjs`), played
  by the autopilot until its wave's first stray is near. `clearingRun()`
  is the layout check's (`CLEARING_RUN`, the last written wave), and clears
  its wave as soon as it goes on. `tools/capture-screenshots.spec.ts` and
  `tools/stored_run.spec.ts` hold both.

## The View

- **A spec of the view runs without Angular.** It takes nothing from
  `src/testing/play.ts`, which imports the shell's tokens.
  `src/view/run_frames.spec.ts` plays a run's frames as the shell does,
  over fields drawn with `fieldFrom()` and waves of its own.
- **An art spec checks the commands a frame is drawn with.**
  `src/testing/art_frames.ts` draws the field's atlas once (`ART_FRAMES`,
  in `ART_PALETTE` at `ART_SCALE`). Find a frame by its name with
  `@fz/phaser/testing/pure`'s `frameNamed()`, and its commands by their
  kind and color with `drawnIn()`. A piece that wraps is held, at every
  scale in `ART_SCALES`, to drawing within the reach the scene draws its
  copies by (`reachOf()`).
- **`src/view/colors/contrast.spec.ts` holds each color to 3:1 against
  what it is drawn on, in every palette of `THEMES`.** It reads each
  palette's roles from the global stylesheet (`PALETTES`, in
  `src/testing/roles.ts`). It takes every rock kind's ink from the
  palette, and checks what is lit, as a rock is, at its darkest and
  brightest faces too (`faceExtremes()`). Any other new color joins it by
  hand.
- **`src/view/places/quiet.spec.ts` holds every place in `PLACE_IDS`
  quiet,** in every palette, on a wide field and a tall one: nothing large
  in it stands out from the field by more than 1.3 to 1, and its landmark
  does by more than 1.1, so a place that painted none fails.

## The Scene

- **Start the real scene with `startBoard(setUp, canvas)`**
  (`src/testing/belt_board.ts`). It runs the scene headless for a
  `FakeShell`, through `@fz/phaser/testing`'s `runKeyedScene()`, draws the
  first frame, and destroys the game as the test finishes. It returns the
  shell, the run, the scene and the element its keys listen on. A spec
  that calls `runScene()` itself destroys its run, as
  `src/app/board/board.component.spec.ts` does.
- **`FakeShell` plays the shell's part.** Change its fields as the rules
  or the settings would (`field`, `colors`, `welcomesMotion`, `switches`,
  `thrusts`, `lodestoneOn`, `times`, `setting`, `typeface`), and read what
  it kept: `ticks`, `layouts`, `commands` and `bakes`. `withShip`,
  `stillness`, `stepping` and `reshaping` set one up, handed to
  `startBoard()`.
- **Drive it with the run's `advance(ms)`, keys and the pointer, and
  assert on the game objects.** `@fz/phaser/testing` reads them with
  `imagesIn()`, `commandsOf()` and `strokesOf()`. `belt_board.ts` adds
  `metricsOf()`, `zoomOf()`, `pointsZoomOf()`, `scrolledBy()` and
  `shardTints()`, and reads what a `Graphics` draws as `trianglesOf()`,
  `linesOf()`, `roundsOf()` and `bandsOf()`. The lights the rocks are lit
  by are the scene's `lights`.
- **A spy is the only witness of a sound.** The sprite isn't loaded
  headless, so a spec spies on `SpritePlayer`'s `play()`, and on
  `LayerPlayer`'s `hold()` and `fetch()` for the beds, both
  `@fz/phaser/sound`'s. `humsIn()` counts the hums a scene holds, after
  `@fz/phaser/testing`'s `cacheSounds()`, given the scene's `SOUNDS_KEY`.
- **A thing drawn through `Copies` lies in its layer only while it
  shows.** So `imagesIn()` and `layersOf()` find only the copies that
  show, and a hidden copy keeps the frame, tint, turn, scale and opacity it
  last showed with. A spec that counts every game object the scene holds
  counts with `objectsHeldBy()`, which adds those hidden out of their
  layers. A layer draws its children by their depths (`keepJoinOrder()`,
  in `src/scene/layer_order.ts`), so a spec of the order of things that
  hide reads their depths.
- **`src/scene/flourish_player.spec.ts` steps no frame.** It plays each
  flourish through a `FlourishPlayer` of its own, on the running scene's
  painters, then has the painter draw from a `PaintContext` it writes, at a
  time of its own.

## The Shell

- **A component that shows the board runs it on
  `provideFakePhaserCanvas()`,** as `phaser-core` says. The board's spec
  also runs the scene its canvas was shown, through `runShownScene()`. A
  card over the field is `<app-board-card>`, whose spec renders it alone,
  with no canvas (`src/app/board/board_card.component.spec.ts`).
- **`GameService` plays small waves, on the time a spec gives it.**
  `provideSpecWaves()` (`src/testing/play.ts`) hands it `SPEC_WAVES`, by
  their numbers in `SPEC_WAVE` (`pebble`, `gift` and `last`), past which
  Endless begins at wave 4, or `STRAY_WAVES`, `ONE_STRAY_WAVES` or
  `SECTOR_WAVES`, each set up for one thing, and a seed that is always the
  same. A frame is `game.tick(FRAME_MS, steer)`, steered `STILL` or by
  `shoot()`, `ram()`, `toStray()` or `toSpark()`.
- **Play on to a point with the same file's helpers:** `playToClear()`,
  `clearIn()`, `clearToNext()`, `pressOn()`, `pauseIn()`, `endRun()`,
  `endIn()`, `knockOneLoose()`, `bringStraysHome()`, `gatherSparks()` and
  `takeUpCharged()`, each with its doc comment. `FRAME_MS`, `playUntil()`
  and `playFor()` are `@fz/core/testing`'s.
- **How a spec goes on from the Cleared card decides what follows.**
  `pressOn()` goes on as a flight key does, `command("go")` and then a
  frame holding it. That starts the next wave or, into a sector's first,
  leaves it waiting under the sector's card until a fresh move.
  `clearToNext()` goes on by Next wave (`nextWave()`), which holds no
  press.
- **jsdom welcomes no motion, and its board is no touch screen,** having
  no `matchMedia`. So the Cleared card's sum shows whole at once
  (`tallyMs()` is `TALLY_COUNT_MS`). A spec of it counting up, of a wait or
  of a finger installs `@fz/game-ui/testing`'s fake viewport first.
- **The specs' sectors have no words of what is new there,** so a spec of
  the sector's card hands it the game's own `WAVES`.
- **A run under way asks before it is thrown away,** which a spec answers
  through `ConfirmService`'s `accept()` or `cancel()`.
- **A field added to `RunState` joins `ownOf()` and `BEGUN_OWN`** in
  `src/app/play/game.service.spec.ts`, which hold each run to beginning
  with none of the last one's. Nothing fails for one left out.
- **jsdom has no `navigator.vibrate()`,** so a spec of the phone's buzz
  stands a buzzer in for it, as `src/app/play/haptics.service.spec.ts`
  does.
- **The pilots are pictures, hidden from a screen reader, so no role
  finds them.** `src/testing/pilots.ts` reads those an element draws:
  their colors (`pilotsIn()`, against `inkOf()`), each one's color and face
  (`posesIn()`), the first's face and lift (`poseIn()`), and which is
  ringed as the pilot at the controls (`ringedIn()`).
- **The app's spec fakes `setTimeout` and `clearTimeout` alone,** and
  moves them on by `@fz/ui/announcer`'s `ARRIVAL_MS` for the live region to
  speak, rather than racing a real wait.
