---
name: asteroid-breaker-testing
description: How Asteroid Breaker runs and writes its specs — its Vitest setup with headless Phaser installed first, the coverage floor on its rules and view, fields drawn as pictures with fieldFrom, the autopilot that holds every wave and Endless's first thirty to being cleared, the saved game's specs, the scene run for real with runScene and a FakeShell, the shell's specs on its small waves through provideSpecWaves and tick, the contrast spec over every palette, and the layout check. Triggers on: asteroid breaker spec, asteroid breaker test, fieldFrom, KEEPER, placeRock, placeComet, placeStray, autopilot spec, playWave, ENDLESS_PLAYED, report:waves, FakeShell, startBoard, provideSpecWaves, SPEC_WAVE, SPEC_WAVES, playToClear, clearToNext, endRun, keptRun, check:layout, asteroid breaker coverage, frontend/games/asteroid-breaker tests.
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

- **Run Tests**: `yarn test` (the whole suite once, with coverage) or
  `yarn test:watch`. `yarn vitest run <path>` runs one spec without
  coverage. The whole suite takes minutes, most of them the autopilot
  playing every wave at every speed on three fields.
- **Coverage Floor**: `vitest.config.ts` holds `src/rules/` and `src/view/`
  to 100% of statements, functions and lines and 95% of branches.
  `yarn test`, which CI runs, fails below either. The scene and the shell
  have no floor of their own.
- **Check the Layout**: `yarn build`, then `yarn check:layout`
  (`tools/check-layout.mjs`), which opens the build in a headless Chrome at
  `@fz/dev/layout`'s shapes and turns, with the deck shown, and holds the
  field to its shape, its short side of 40 units and the room it fills
  (`data-room`), and the deck's zones off it and the bar.

## Setup

- `vitest.config.ts` is `@fz/dev/vitest`'s `angularTests()`, given the floor
  and what coverage leaves out (`src/main.ts` and `src/testing/`).
- A spec sits beside the file it tests, named after it, and runs in jsdom.
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
  `shipOf()`, `wholeRocks()`, `floatingPickups()`, `eventsOf()` and
  `loggedOn()` read it back.
- A field changes in place, from records made once, so a spec asserts on
  the records after the steps, and on the events the field logged.
- The rules and the view know no framework, so their specs call the
  functions directly and assert on what they return.

## The Waves and the Autopilot

- `src/rules/waves/waves.spec.ts` holds every wave to parsing, ids and names
  of its own, and every sector to its ten; `src/rules/catalog/catalog.spec.ts`
  holds the catalogs to their rules, and the waves to laying every rock kind
  and letting every pickup first come at the wave its `from` names.
- `src/rules/field/spawn.spec.ts` lays every wave out, in every formation, on
  the narrowest and the widest fields, either way up, and holds each rock to
  starting far enough from the ship on a course that keeps clear of it.
- `src/rules/waves/endless.spec.ts` holds Endless's waves 31 to 60, over many
  seeds, and some past them, to their budget, their share of iron, their
  crystal and the cap, to the climb, and to being the same for the same
  seed.
- `src/rules/waves/autopilot.spec.ts` has `src/testing/autopilot.ts` play every
  wave at every speed (`playWave()`, from the wave's number as the seed) on
  the narrowest field and the widest, on its side and upright (`NARROWEST`,
  `WIDEST`, `TALLEST`), and holds each to being cleared within four minutes
  of game time (`AUTOPILOT_LIMIT`), meeting a comet and a stray where the
  wave sends them; and Endless's 31 to 60 (`ENDLESS_PLAYED`) the same, with
  nothing able to take the ship. A spec of a frame of the autopilot's draws
  a field and reads the steering `pilot()` gives it.
- `yarn report:waves` plays the same games, `--seeds <n>` many more,
  `--field wide` or `--field tall` on the larger fields, and `--endless`
  Endless's, for tuning (the workspace's `AGENTS.md`).

## The Saved Game

- `src/rules/run/saved_game.spec.ts` keeps a run and its field
  (`saveGame()`), takes it up (`restoreGame()`) and lays its field out
  again (`takeUpField()`), Endless's among them, its wave made again from
  the run's seed.
- A spoiled entry is a stored game read back from JSON with one thing
  changed, and each is expected to be refused.
- `src/app/play/saved_game.service.spec.ts` keeps a run through the
  service and takes it up after a reload (`reload()`, a new TestBed), as a
  page loaded again would.
- `keptRun()` (`src/testing/kept_run.ts`) keeps a run begun at a wave, on
  a field of a shape, played by the autopilot until the wave's first stray
  is as near as it names (`playField()`'s `untilStep`), which the
  screenshots take up (`tools/capture-screenshots.mjs`).

## The View

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

`src/scene/belt_scene.spec.ts` and `src/scene/flourishes.spec.ts` run the
real scene in a headless Phaser game through `runScene()`:

- `FakeShell` (`src/testing/belt_board.ts`) plays the shell's part of
  `BeltSceneOptions`: it hands the scene a frame, a palette, the motion,
  sound and board settings, and keeps the frames' times and steering, the
  layouts, the commands and the pictures the scene hands back; `withShip`,
  `stillness` and `stepping` set it up.
- `startBoard()` runs the scene for a fake shell and draws the first frame,
  and destroys the game and removes the board's element as the test
  finishes (`onTestFinished`); a spec that calls `runScene()` itself
  cleans up after itself.
- Drive it with the run's `advance(ms)`, keys and the pointer, and change
  the shell's frame as the rules would; assert on the game objects
  (`imagesIn()`, `strokesOf()`, `metricsOf()`), the sounds (`humsIn()`
  after `cacheSounds()`) or on what the shell kept. A headless game draws
  no pixels and plays no sound.

## The Shell

- A component that shows the board runs it on
  `provideFakePhaserCanvas()`, which loads no Phaser. The board's spec also
  runs the scene the board hands its canvas for real, through `runScene()`.
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
