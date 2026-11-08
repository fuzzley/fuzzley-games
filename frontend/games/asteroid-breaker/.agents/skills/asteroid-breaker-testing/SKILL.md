---
name: asteroid-breaker-testing
description: How Asteroid Breaker runs and writes its specs — its Vitest setup with headless Phaser installed first, the coverage floor on its rules and view, fields drawn as pictures with fieldFrom, the autopilot that holds every wave and Endless's first thirty to being cleared, the saved game's specs, the scene run for real with runScene and a FakeShell, the shell's specs on its small waves through provideSpecWaves and tick, the contrast spec over every palette, and the layout check. Triggers on: asteroid breaker spec, asteroid breaker test, fieldFrom, KEEPER, placeRock, placeComet, placeStray, autopilot spec, playWave, ENDLESS_PLAYED, report:waves, FakeShell, startBoard, provideSpecWaves, SPEC_WAVE, SPEC_WAVES, playToClear, clearToNext, endRun, keptRun, runUnderWay, RunFrames, run_frames, check:layout, asteroid breaker coverage, frontend/games/asteroid-breaker tests.
---

# Testing Asteroid Breaker

This skill covers how Asteroid Breaker runs its specs and what they share.
The patterns every Angular workspace's specs follow (Testing Library by
role, user-event, jest-dom, zoneless change detection, fake timers, what
jsdom keeps and lacks) are the repository's `angular-testing` skill's, the
headless Phaser harness is `phaser-core`'s, and the rules every spec
follows are in `.agents/AGENTS.md`, under "Writing Unit Tests". Paths are
relative to `frontend/games/asteroid-breaker/`.

## Commands and Coverage

Run these from `frontend/games/asteroid-breaker/`, or as
`yarn workspace asteroid-breaker <script>` from `frontend/`.

- **Run Tests**: `yarn test` (the whole suite once: the `dom` and `pure`
  projects with coverage, then the `sim` project without) or
  `yarn test:watch`. `yarn vitest run --project <project> <path>` runs one
  spec without coverage, starting its project alone: `pure` for the rules,
  the view and `src/testing/`, `dom` for the scene, the shell and
  `src/testing/belt_board.ts`, and `sim` for the simulations. Without
  `--project`, Vitest starts all three, Analog's plugin among them, and a
  spec of the rules takes three times as long. The whole suite takes
  minutes, most of them the autopilot playing every wave at every speed on
  three fields.
- **Coverage Floor**: `vitest.config.ts` holds `src/rules/` and `src/view/`
  to 100% of statements, functions and lines and 95% of branches, and
  `src/scene/` and `src/app/` a little under what their specs reach (the
  scene 98% of statements, 92% of branches, 100% of functions and 99% of
  lines; the shell 98, 97, 97 and 98), raised as they rise, so a part
  without specs fails the run. `yarn test`, which CI runs, fails below any
  of them. `src/testing/` is measured with no floor, so what of it goes
  untested shows. Coverage measures the `dom` and `pure` projects
  together, not `sim`, so what only the simulations reach, `every_wave.ts`
  and most of `every_layout.ts` among it, counts as untested.
- **Check the Layout**: `yarn build`, then `yarn check:layout`
  (`tools/check-layout.mjs`), which opens the build in a headless Chrome at
  `@fz/dev/layout`'s shapes and turns, with the deck shown, and holds the
  field to its shape, its short side of 40 units and the room it fills
  (`data-room`), and the deck's zones off it and the bar.

## Setup

- `vitest.config.ts` is three Vitest projects made of `@fz/dev/vitest`'s
  pieces, under one `coverage()` given the floors and what coverage leaves
  out (`src/main.ts` and the setup). Each is a config of its own, so each
  starts only what its specs need:
  - `pure`, the specs of the rules and the view (`LAYER_SPECS`) and of
    `src/testing/`, but for the simulations and the specs of the helpers
    that run the scene (`SCENE_HELPER_SPECS`, `belt_board.spec.ts`), in
    Node (`nodeSpecs()`);
  - `sim`, the specs that play every wave or lay every wave out
    (`SIMULATIONS`), in Node too, without coverage;
  - `dom`, every other spec, the scene's, the shell's and the scene
    helpers', in jsdom after the setup below, as `angularSpecs()` runs
    them, with Analog's plugin, which gives it its pool. It takes whatever
    the other two don't, so a spec in a new folder runs in jsdom rather
    than in neither.
- A spec sits beside the file it tests, named after it, and its folder
  sets its project, but for a helper that runs the scene, whose spec's name
  joins `SCENE_HELPER_SPECS`. One of the rules, the view or `src/testing/`
  has no page, so what needs one is the scene's or the shell's to test.
- `dom` leaves the measured code both it and `pure` load, the rules', the
  view's and `src/testing/`'s, but not their specs, which lint keeps free
  of Angular but by type (`SHARED_CODE`), to Vite's oxc rather than to
  Analog's plugin: the plugin's `transformFilter` passes it by, and
  `oxc.include` turns oxc back on for it, which the plugin turns off.
  Coverage adds a file's two runs up only where both compiled it alike:
  compiled two ways, each of its functions would count twice, untested in
  the project that never calls it, and the rules would fall below their
  floor.
- Vitest keys the modules it caches on disk without the config of a
  project declared with `extends: false`, which has no config file of its
  own, so `keyedByThisConfig()` adds `vitest.config.ts` to `dom`'s key: a
  change to what Analog's plugin passes by is compiled afresh, not read
  from the cache.
- Vitest watches through the config's own Vite server, not `dom`'s, so
  `forwardAddedAndRemoved()` hands `dom`'s each file added or removed, for
  Analog's plugin to take a new component into its program while
  `yarn test:watch` runs.
- A helper whose answer a spec trusts has a spec of its own beside it, so
  one that answered wrongly can't let a spec pass that tests nothing:
  `art_frames.ts`'s `within()`, `distanceToEdge()` and `edgeOf()`,
  `crossings.ts`'s `entryOf()` and `entriesOf()`, `every_layout.ts`'s
  `nearness()`, `canvases.ts`'s `boardOf()`, `field_picture.ts`'s
  `fieldFrom()` and what it refuses, and `belt_board.ts`'s `strokesOf()`,
  against a `Graphics` Phaser really drew in.
- `src/test-setup.ts` calls `@fz/phaser/testing`'s
  `installHeadlessPhaser()` before anything imports Phaser, starts Angular's
  TestBed, loads jest-dom's matchers, polyfills `<dialog>`, and clears
  `localStorage` before every test.

## The Rules

- Draw a field rather than play to it: `fieldFrom(rows, options)`
  (`src/testing/field_picture.ts`) lays a field out from a picture, a row
  of characters for each 4 units down (`CELL`), each a cell that many units
  across: `B` a boulder, `L`, `M` and `S` a large, a medium and a small
  rock of the options' kind, each still in its cell's middle, `^` the ship,
  its nose up, and `.` or a space nothing. The field is 72 by 40 unless the
  options give its `torus`; they set what a picture can't show: the seed,
  the pace, the kind, the chance of a pickup and the pool, the strays and
  the comets, the crew and the points. `KEEPER` is a picture of one large
  rock, so a wave doesn't clear while a spec plays on.
- `placeRock()`, `placePickup()`, `catchOn()`, `placeStray()` and
  `placeComet()` put more on a field; `stepTimes(field, n)` steps it;
  `shipOf()`, `wholeRocks()`, `floatingPickups()`, `loggedOn()` and
  `kindsLoggedOn()` read it back, and `speedOf()` how fast a rock, the ship, a
  shot or a pickup on it flies.
- A stray or a comet comes in off an edge as `comeIn()`
  (`src/rules/hazards/crossing.ts`) puts it, and
  `src/testing/crossings.ts` reads where it waits (`entryOf()`) and holds a
  run of them, over many seeds, to every edge, their margin and their tilt
  (`entriesOf()`).
- A field changes in place, from records made once, so a spec asserts on
  the records after the steps, and on the events the field logged.
- The rules and the view know no framework, so their specs call the
  functions directly and assert on what they return.
- A spec of the records, in the rules or the shell, gives what a change in
  a run brings to them with `src/testing/records.ts`'s `runRecords()`,
  nothing but what it names.

## The Waves and the Autopilot

- `src/rules/waves/waves.spec.ts` holds every wave to parsing, ids and names
  of its own, and every sector to its ten; `src/rules/catalog/catalog.spec.ts`
  holds the catalogs to their rules, and the waves to laying every rock kind
  and letting every pickup first come at the wave its `from` names.
- `src/rules/field/every_layout/` lays every wave out, in every formation, on
  the narrowest and the widest fields, either way up, and holds each rock to
  starting far enough from the ship on a course that keeps clear of it: a
  file for each speed, each passing its own file to
  `src/testing/every_layout.ts`'s `holdEveryLayout()`, which lays out the
  speed the file is named for, so Vitest lays the speeds out side by side.
  `src/rules/field/spawn.spec.ts` holds the rest of `layOut()`, and that the
  folder keeps a file for every speed.
- `src/rules/waves/endless.spec.ts` holds Endless's waves 31 to 60, over many
  seeds, and some past them, to their budget, their share of iron, their
  crystal and the cap, to the climb, and to being the same for the same
  seed.
- `src/rules/waves/every_wave/` has `src/testing/autopilot.ts` play every
  wave at every speed (`playWave()`, from the wave's number as the seed) on
  the narrowest field and the widest, on its side and upright (`FIELDS`:
  `NARROWEST`, `WIDEST`, `TALLEST`), and holds each to being cleared within
  four minutes of game time (`AUTOPILOT_LIMIT`), meeting a comet and a stray
  where the wave sends them, its tally adding up to its score; and `src/rules/waves/every_endless_wave/`
  Endless's 31 to 60 (`ENDLESS_PLAYED`) the same, with nothing able to take
  the ship. Each keeps a file for each speed, passing its own file
  (`import.meta.filename`) to `src/testing/every_wave.ts`'s `holdEveryWave()`
  or `holdEveryEndlessWave()`, which play the speed the file is named for,
  since Vitest plays a file's specs one after another but the files side by
  side.
- `src/rules/waves/autopilot.spec.ts` holds the autopilot itself, and those
  folders to a file for every speed: a spec of a frame of the autopilot's
  draws a field and reads the steering `pilot()` gives it.
- `yarn report:waves` plays the same games, `--seeds <n>` many more,
  `--field wide` or `--field tall` on the larger fields, and `--endless`
  Endless's, for tuning (the workspace's `AGENTS.md`).

## The Saved Game

- `src/rules/run/saved_game.spec.ts` keeps a run (`saveGame()`) and takes
  it up (`restoreGame()`, `readRun()`) with its field (`takeUpField()`),
  Endless's among them, its wave made again from the run's seed, and
  `src/rules/field/kept_field.spec.ts` keeps its field (`savedField()`),
  reads it back (`readField()`) and lays it out again
  (`layOutKeptField()`). Both start from
  `src/testing/run_under_way.ts`'s run under way and its field, played a
  second (`runUnderWay()`, `playedField()`).
- A spoiled entry is a stored game read back from JSON with one thing
  changed (`Spoil`). Each is written once, in a table named for the check
  it spoils (`KNOWN_WAVE_SPOILS`, `CREW_SPOILS`, `STATE_SPOILS` and the
  rest), which that check's own spec holds to failing it, so a spoil can't
  pass by failing another, and the reader's spec holds to being refused.
- `src/app/play/saved_game.service.spec.ts` keeps a run through the
  service and takes it up after a reload (`reload()`, a new TestBed), as a
  page loaded again would.
- `keptRun()` (`src/testing/kept_run.ts`) keeps a run begun at a wave, on
  a field of a shape, played by the autopilot until the wave's first stray
  is as near as it names (`playField()`'s `untilStep`), which the
  screenshots take up (`tools/capture-screenshots.mjs`).

## The View

- `src/view/run_frames.spec.ts` plays a run's frames as the shell does,
  over fields drawn with `fieldFrom()` and waves of its own, and asserts on
  what each frame changed and what it said. It takes nothing from
  `src/testing/play.ts`, which imports the shell's tokens, so it runs
  without Angular, as every spec of the view does.
- `src/testing/art_frames.ts` draws the atlas in one palette
  (`ART_PALETTE`) at one scale (`ART_SCALE`), and finds a frame by its name
  (`frameNamed()`), so the art's specs check the commands a frame is drawn
  with.
- `src/view/colors/contrast.spec.ts` checks every palette in `@fz/style`'s
  `THEMES`: it compiles the global stylesheet, reads each palette's roles
  from it, builds the field's palette from them, and holds every rock, the
  ship, the shots, the pickups, the comet, the strays and the pilots to 3:1
  against what they are drawn on, the marks and outlines against what they
  cross, and the deck's symbols at rest against its buttons and its knob
  against the stick's base.

## The Scene

`src/scene/belt_scene.spec.ts`, `src/scene/flourishes.spec.ts` and
`src/scene/flourish_player.spec.ts` run the real scene in a headless Phaser
game through `runScene()`:

- `FakeShell` (`src/testing/belt_board.ts`) plays the shell's part of
  `BeltSceneOptions`: it hands the scene a frame, a palette, the motion,
  sound and board settings, and keeps the frames' times and steering, the
  layouts, the commands and what the scene hands back at each bake to
  picture How to play's art with (`bakes`), which `askPictures()` asks as
  the board does; `withShip`, `stillness`, `stepping` and `reshaping`,
  which shapes the field to each room the scene lays it out in, as the game
  does a paused one, set it up.
- `startBoard()` runs the scene for a fake shell and draws the first frame,
  and destroys the game and removes the board's element as the test
  finishes (`onTestFinished`); a spec that calls `runScene()` itself
  cleans up after itself.
- Drive it with the run's `advance(ms)`, keys and the pointer, and change
  the shell's frame as the rules would; assert on the game objects
  (`imagesIn()`, `strokesOf()`, `metricsOf()`, `zoomOf()`, `shardTints()`,
  the field camera's `scrolledBy()`), the sounds (`humsIn()` after
  `cacheSounds()`) or on what the shell kept. A headless game draws no
  pixels and plays no sound.
- `flourish_player.spec.ts` steps no frame: it plays each flourish through
  a `FlourishPlayer` of its own, on the running scene's painters, then has
  the painter draw from a `PaintContext` it writes, at a time of its own.

## The Shell

- A component that shows the board runs it on
  `provideFakePhaserCanvas()`, which loads no Phaser. The board's spec also
  runs the scene the board hands its canvas for real, through `runScene()`.
- What a frame of play comes to is `RunFrames`'s, which the view's spec
  holds; the shell's spec holds `GameService` to taking it into the run
  and what is its own, the records and the live region, and to beginning
  each run with none of the last one's (`ownOf()`).
- `GameService` plays the small waves of `src/testing/play.ts`, handed to
  it with a seed of its own (`provideSpecWaves()`): `SPEC_WAVES`, by their
  numbers in `SPEC_WAVE` (`pebble`, `gift` and `last`), past which Endless
  begins at wave 4; or `STRAY_WAVES`, `GAINED_WAVES`, `CHAIN_WAVES` and
  `SECTOR_WAVES`, each set up for one thing. It runs on the time it is
  given: `game.tick(FRAME_MS, steer)`, steered `STILL`, by `shoot()`,
  `ram()`, `toPickup()` or `toStray()`; `playUntil()`, `playFor()`,
  `loseShip()`, `endRun()`, `bringStraysHome()`, `chainUp()`,
  `playToClear()` and `clearToNext()` play on to a point. A run under way
  asks before it is thrown away, which a spec answers through
  `ConfirmService`'s `accept()` or `cancel()`.
- jsdom has no `matchMedia`, so motion isn't welcome and the board is no
  touch screen. A spec of the waits, or of a finger, installs
  `@fz/game-ui/testing`'s fake viewport and restores it after.
- The app's spec renders the app as `main.ts` starts it on fake timers
  (`setTimeout` and `clearTimeout` alone), and moves them on by
  `@fz/ui/announcer`'s `ARRIVAL_MS` for the live region to speak, rather
  than racing a real wait.
