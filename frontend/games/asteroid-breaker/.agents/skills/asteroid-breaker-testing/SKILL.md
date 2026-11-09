---
name: asteroid-breaker-testing
description: How Asteroid Breaker runs and writes its specs — its Vitest setup with headless Phaser installed first, the coverage floor on its rules and view, fields drawn as pictures with fieldFrom, the autopilot that holds every wave and Endless's first thirty to being cleared, the saved game's specs, the scene run for real with runScene and a FakeShell, the shell's specs on its small waves through provideSpecWaves and tick, the contrast spec over every palette, and the layout check. Triggers on: asteroid breaker spec, asteroid breaker test, fieldFrom, KEEPER, placeRock, placeComet, placeStray, autopilot spec, playWave, ENDLESS_PLAYED, report:waves, FakeShell, startBoard, provideSpecWaves, SPEC_WAVE, SPEC_WAVES, playToClear, clearToNext, endRun, keptRun, runUnderWay, RunFrames, run_frames, withFrame, run_state, check:layout, REPORT_API, SCREENSHOT_API, script_api, readArgs, shownRun, asteroid breaker coverage, frontend/games/asteroid-breaker tests.
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
  the view, `src/testing/` and `tools/`, `dom` for the scene and the
  shell, and `sim` for the simulations. Without
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
  of them. `src/testing/` and the scripts under `tools/` are measured with
  no floor, so what of them goes untested shows; what the scripts load
  through Vite escapes it, so `src/testing/report_api.spec.ts` and
  `src/testing/screenshot_api.spec.ts` measure their entries. Coverage
  measures the `dom` and `pure` projects together, not `sim`, so what only
  the simulations reach, `every_wave.ts` and most of `every_layout.ts`
  among it, counts as untested.
- **Check the Layout**: `yarn build`, then `yarn check:layout`
  (`tools/check-layout.mjs`), which opens the build in a headless Chrome at
  `@fz/dev/layout`'s shapes and turns, with the deck shown, and holds the
  field to its shape, its short side of 40 units and the room it fills
  (`data-room`), and the deck's zones off it and the bar.

## Setup

- `vitest.config.ts` is `@fz/dev/vitest`'s `angularTests()`, given the
  floors, what coverage measures and leaves out (`src/main.ts` and the
  setup) and the folders of its three Vitest projects, each a config of its
  own, so each starts only what its specs need:
  - `pure`, the specs of the rules, the view, `src/testing/` and the
    scripts under `tools/`, in Node, but for the simulations;
  - `sim`, the specs that play every wave or lay every wave out, in Node
    too, without coverage;
  - `dom`, every other spec, the scene's and the shell's, in jsdom after
    the setup below, with Analog's plugin. It takes whatever the other two
    don't, so a spec in a new folder under `src/` runs in jsdom rather than
    in neither.
- A spec sits beside the file it tests, named after it, and its folder
  sets its project, so a spec of `src/testing/` runs in Node.
  `belt_board.ts`, the one helper there that runs the scene, has no spec:
  what it reads a scene with is `@fz/phaser/testing`'s, specced there. One
  of the rules, the view or `src/testing/` has no page, so what needs one is
  the scene's or the shell's to test.
- `dom` leaves the code of `pure`'s folders to Vite's oxc rather than to
  Analog's plugin, as `frontend/lib/dev/AGENTS.md` says: coverage adds a
  file's two runs up only where both compiled it alike, and compiled two
  ways, each of its functions would count twice, untested in the project
  that never calls it, and the rules would fall below their floor. So lint
  lets `src/testing/` take Angular by type alone.
- A helper whose answer a spec trusts has a spec of its own beside it, so
  one that answered wrongly can't let a spec pass that tests nothing:
  `art_frames.ts`'s `within()`, `distanceToEdge()` and `edgeOf()`,
  `crossings.ts`'s `entryOf()` and `entriesOf()`, `every_layout.ts`'s
  `nearness()`, `canvases.ts`'s `boardOf()`, against the bar's and the
  rail's sizes compiled from the app's stylesheets, `numbers.ts`'s
  `stepsBetween()` and `field_picture.ts`'s `fieldFrom()` and what it
  refuses. `@fz/phaser/testing`'s readers, `strokesOf()` among them, are
  held by the library's specs, against what Phaser really drew.
- `src/test-setup.ts` calls `@fz/phaser/testing`'s
  `installHeadlessPhaser()` before anything imports Phaser, starts Angular's
  TestBed, loads jest-dom's matchers, polyfills `<dialog>`, gives the page
  `document.fonts`, which jsdom lacks and the board waits on, its faces
  there at once, which a spec makes arrive late by holding back `load()`
  and answering `check()`, and gives each test's app a store of its own in
  memory (`provideMemoryStorage()`).

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
- A spec that holds a table of the rules to rising or falling, the rocks'
  sizes and speeds and the chain's rows in `src/rules/tuning.spec.ts` or
  each kind's points in `src/rules/catalog/catalog.spec.ts`, takes how
  much each number differs from the one before from
  `src/testing/numbers.ts`'s `stepsBetween()`, and asserts none goes the
  wrong way.

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
  where the wave sends them, its tally adding up to its score; and
  `src/rules/waves/every_endless_wave/` Endless's 31 to 60
  (`ENDLESS_PLAYED`) the same, with nothing able to take the ship. Each
  keeps a file for each speed, passing its own file (`import.meta.filename`)
  to `src/testing/every_wave.ts`'s `holdEveryWave()` or
  `holdEveryEndlessWave()`, which play the speed the file is named for,
  since Vitest plays a file's specs one after another but the files side by
  side.
- `src/rules/waves/autopilot.spec.ts` holds the autopilot itself, and those
  folders to a file for every speed: a spec of a frame of the autopilot's
  draws a field and reads the steering `pilot()` gives it.
- `yarn report:waves` plays the same games, `--seeds <n>` many more,
  `--field wide` or `--field tall` on the larger fields, and `--endless`
  Endless's, for tuning (the workspace's `AGENTS.md`). It loads them
  through `src/testing/report_api.ts`'s `REPORT_API`, typed by
  `src/testing/script_api.ts`, which imports nothing, so the script is
  checked against it and a name changed in the autopilot fails to compile
  there; `src/testing/report_api.spec.ts` holds `REPORT_API` to the waves,
  the fields and the plays the autopilot's spec has.
  `tools/report-waves.spec.ts` holds its command line, the lines it prints
  and the code it exits with (`run()`, handed a small API of its own and
  where to print), and that it loads the autopilot's `playWave()` through
  Vite. Its command line and the screenshots' script's are read the same
  way, by `@fz/dev/script`'s `readArgs()`, and its table is laid out by
  `@fz/dev/report`'s `printReport()`, whose own specs, in `frontend/lib/dev`,
  hold the layout and the readers every report shares.

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
  screenshots take up (`tools/capture-screenshots.mjs`), loading it through
  `src/testing/screenshot_api.ts`'s `SCREENSHOT_API`, with the version the
  run is kept under (`SAVED_GAME_VERSION`), which
  `src/testing/screenshot_api.spec.ts` holds to the rules'.
  `tools/capture-screenshots.spec.ts` keeps the script's run (`RUN`) so,
  stamped with that version and taken up by the rules (`shownRun()`), and
  holds its command line, `--url` among it, and the code it exits with for
  one that captures nothing (`run()`); the thumbnail's region, and the rest
  of what `runScreenshotScript()` does for every game, are held by
  `@fz/dev/screenshots`' own specs, in `frontend/lib/dev`.

## The View

- `src/view/run_frames.spec.ts` plays a run's frames as the shell does,
  over fields drawn with `fieldFrom()` and waves of its own, and asserts on
  what each frame changed, its buzz among it, and what it said. It takes
  nothing from `src/testing/play.ts`, which imports the shell's tokens, so
  it runs without Angular, as every spec of the view does.
  `src/view/run_state.spec.ts` folds a frame's change, written by hand, into
  what is a run's own (`withFrame()`), and holds which frames fly a run on
  tuned numbers.
- `src/testing/art_frames.ts` draws the atlas in one palette (`ART_PALETTE`)
  at one scale (`ART_SCALE`), as `ART_FRAMES`, so the art's specs check the
  commands a frame is drawn with, finding the frame by its name and its
  commands by their kind and color with `@fz/phaser/testing/pure`'s
  `frameNamed()` and `drawnIn()`; at every scale a field is drawn at
  (`ART_SCALES`), they hold what each piece that wraps draws within the
  reach the scene draws its copies by (`reachOf()`).
- `src/view/colors/contrast.spec.ts` checks every palette in `@fz/style`'s
  `THEMES`: it reads each palette's roles from the global stylesheet, by
  the names the board reads them by (`PALETTES.rolesIn()`, from
  `src/testing/roles.ts`), builds the field's palette from them, and holds
  every rock, the ship, the shots, the pickups, the comet, the strays and
  the pilots to 3:1 against what they are drawn on, the marks and outlines
  against what they cross, and the deck's symbols at rest against its
  buttons and its knob against the stick's base.

## The Scene

`src/scene/belt_scene.spec.ts`, `src/scene/flourishes.spec.ts` and
`src/scene/flourish_player.spec.ts` run the real scene in a headless Phaser
game through `runScene()`:

- `FakeShell` (`src/testing/belt_board.ts`) plays the shell's part of
  `BeltSceneOptions`: it hands the scene a frame, a palette, the motion,
  sound and board settings and the points' font (`typeface`, in
  `SHELL_FONT`, which a spec replaces as the page would on loading a face
  late), and keeps the frames' times and steering, the layouts the scene
  hands it (`FieldLayout`), the commands and what the scene hands back at
  each bake to picture How to play's art with (`bakes`), which
  `askPictures()` asks as the board does; `withShip`, `stillness`,
  `stepping` and `reshaping`, which shapes the field to each room the scene
  lays it out in, as the game does a paused one, set it up.
- `startBoard()` runs the scene for a fake shell through
  `@fz/phaser/testing`'s `runKeyedScene()` and draws the first frame; the
  game is destroyed and the board's element removed as the test finishes.
  A spec that calls `runScene()` itself cleans up after itself.
- Drive it with the run's `advance(ms)`, keys and the pointer, and change
  the shell's frame as the rules would; assert on the game objects
  (`@fz/phaser/testing`'s `imagesIn()` and `strokesOf()`, and
  `metricsOf()`, `zoomOf()`, `pointsZoomOf()`, `shardTints()`, the field
  camera's `scrolledBy()`), the sounds (`humsIn()` after
  `@fz/phaser/testing`'s `cacheSounds()`, given the scene's `SOUNDS_KEY`)
  or on what the shell kept. A
  headless game draws no pixels and plays no sound.
- `flourish_player.spec.ts` steps no frame: it plays each flourish through
  a `FlourishPlayer` of its own, on the running scene's painters, then has
  the painter draw from a `PaintContext` it writes, at a time of its own.

## The Shell

- A component that shows the board runs it on
  `provideFakePhaserCanvas()`, which loads no Phaser. The board's spec also
  runs the scene the board hands its canvas for real, through
  `runShownScene()`.
  The cards over the field are `<app-board-card>`, whose spec renders it
  alone, with no canvas, given what the board tells it (how the ship flies);
  the board's spec holds only that it tells it so, that it gives way to the
  canvas's own, which the board hands it (`@fz/phaser/canvas`'s
  `<fz-canvas-cards>`, whose words, region and Reload the library's spec
  holds), and that the board takes back the focus as the player goes on from a
  card. A spec that fails the scene on purpose has the app's `ErrorHandler`
  collect what the canvas hands it, as the board's does
  (`@fz/phaser/testing`'s `collectErrors()`), and asserts on that, so the run
  prints no error it expects.
- What a frame of play comes to is `RunFrames`'s, and how it folds into
  what is a run's own `withFrame()`'s, which the view's specs hold; the
  shell's spec holds `GameService` to taking it into its signals, the
  records, the live region and the phone's buzz, and to beginning each run
  with none of the last one's (`ownOf()`); `HapticsService`'s holds the
  buzz to where the settings say to. Both stand a buzzer in for
  `navigator.vibrate()`, which jsdom lacks.
- `GameService` plays the small waves of `src/testing/play.ts`, handed to
  it with a seed of its own (`provideSpecWaves()`): `SPEC_WAVES`, by their
  numbers in `SPEC_WAVE` (`pebble`, `gift` and `last`), past which Endless
  begins at wave 4; or `STRAY_WAVES`, `GAINED_WAVES`, `CHAIN_WAVES` and
  `SECTOR_WAVES`, each set up for one thing. It runs on the time it is
  given: `game.tick(FRAME_MS, steer)`, steered `STILL`, by `shoot()`,
  `ram()`, `toPickup()` or `toStray()`; `playUntil()`, `playFor()`,
  `loseShip()`, `endRun()`, `bringStraysHome()`, `chainUp()`,
  `playToClear()` and `clearToNext()` play on to a point, and `pauseIn()`,
  `clearIn()` and `endIn()` until the Paused, Cleared or Ended card shows.
  `FRAME_MS`, `playUntil()` and `playFor()` are `@fz/core/testing`'s.
  `ROOMY` is how the board lays the field out on a roomy screen with no
  touch, and `SPACE` the key as a browser sends it, made by
  `@fz/phaser/testing`'s `browserKey()`. A run under way
  asks before it is thrown away, which a spec answers through
  `ConfirmService`'s `accept()` or `cancel()`.
- jsdom has no `matchMedia`, so motion isn't welcome and the board is no
  touch screen. A spec of the waits, or of a finger, installs
  `@fz/game-ui/testing`'s fake viewport, which takes itself off after.
- The app's spec renders the app as `main.ts` starts it on fake timers
  (`setTimeout` and `clearTimeout` alone), and moves them on by
  `@fz/ui/announcer`'s `ARRIVAL_MS` for the live region to speak, rather
  than racing a real wait.
