---
name: brick-breaker-testing
description: How Brick Breaker runs and writes its specs — its Vitest setup with headless Phaser installed first, the coverage floor on its rules and view, fields drawn as pictures with fieldFrom and throwBall, the autopilot that holds every level to being cleared, the saved game's round trip, the scene run for real with runScene and a FakeShell, the shell's specs on its small levels through provideSpecLevels and tick, and the contrast spec over every palette. Triggers on: brick breaker spec, brick breaker test, fieldFrom, throwBall, playWithoutBall, autopilot spec, playLevel, FakeShell, startBoard, provideSpecLevels, SPEC_LEVEL, playToClear, keptRun, brick breaker coverage, frontend/games/brick-breaker tests.
---

# Testing Brick Breaker

This skill covers how Brick Breaker runs its specs and what they share. The
patterns every Angular workspace's specs follow (Testing Library by role,
user-event, jest-dom, zoneless change detection, fake timers, what jsdom
keeps and lacks) are the repository's `angular-testing` skill's, the
headless Phaser harness is `phaser-core`'s, and the rules every spec
follows are in `.agents/AGENTS.md`, under "Writing Unit Tests". Paths are
relative to `frontend/games/brick-breaker/`.

## Commands and Coverage

Run these from `frontend/games/brick-breaker/`, or as
`yarn workspace brick-breaker <script>` from `frontend/`.

- **Run Tests**: `yarn test` (the whole suite once, with coverage) or
  `yarn test:watch`. `yarn vitest run <path>` runs one spec without
  coverage. The whole suite takes minutes, most of them the autopilot
  playing every level at every preset speed.
- **Coverage Floor**: `vitest.config.ts` holds `src/rules/` and `src/view/`
  to 100% of statements, functions and lines and 95% of branches.
  `yarn test`, which CI runs, fails below either. The scene and the shell
  have no floor of their own.

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
  (`src/testing/field_picture.ts`) lays a field out from a picture of its
  bricks, a row of up to 13 characters from the top, in the shared legend's
  characters (`src/rules/legend.ts`: `o` plain, `2` to `4` tough, `#` steel,
  `*` blast, `?` gift, `~` ghost, `+` regrowing, `.` none). The options set
  what a picture can't show: the speed, the seed, the pace, the chance of a
  capsule, the capsules that may fall, the one every gift gives and the
  field's height, 30 by default, as a tall screen makes it up to 45.
  `KEEPER` is a picture of one brick far down the field, so a level doesn't
  clear while a spec plays on.
- A field is in play once a ball is: `throwBall(field, x, y, degrees)` puts
  one at a place heading at an angle from straight up, and
  `playWithoutBall(field)` puts it in play with none, for what falls or
  rises. `stepTimes(field, n)` steps it; `brickAt()`, `ballOf()`,
  `eventsOf()`, `lastEvent()` and `headingOf()` read it back.
- A field changes in place, from records made once, so a spec asserts on
  the records after the steps, and on the events the field logged.
- The rules and the view know no framework, so their specs call the
  functions directly and assert on what they return.

## The Levels and the Autopilot

- `src/rules/levels.spec.ts` holds every level to parsing, ids and names of
  its own, a needed brick a ball can reach and a pace that never falls
  within a set.
- `src/rules/catalog.spec.ts` holds the catalogs to their rules, and the
  levels to using every brick kind and letting every capsule first fall at
  the level its `from` names.
- `src/rules/autopilot.spec.ts` has `src/testing/autopilot.ts` play every
  level at every preset speed, all but Custom (`PRESET_SPEEDS`,
  `playLevel()`, from the level's number as the seed), and holds each to
  being cleared within eight minutes of game time, its last three bricks
  within one; and plays them again on the tallest
  field (`TALLEST_FIELD`), held only to being cleared within eight minutes
  stretched as far as the paddle lies farther from the bricks
  (`limitsOf()`), since luck decides more of a taller field's endgames. A
  spec of the autopilot itself lays a level out of the bricks it draws
  (`entryOf()`).
- `yarn report:levels` plays the same games, `--seeds <n>` many more, and
  `--height <n>` on a taller field, for tuning; a slow endgame on one seed
  in many is luck, but one that leaves the same bricks for last is a level
  to redraw.

## The Saved Game

- `src/rules/saved_game.spec.ts` builds its fields on three levels of its
  own: one of every kind, a row, and a crowd of every brick that changes as
  it is played.
- Its round trip plays the crowd in takes of 7 steps, keeping, reading back
  and taking up the run and its field at each, and expects every state a
  take-up must keep to have been reached: a fuse lit, a ghost shown, a
  regrowing brick broken and grown back, a tough brick worn, streak points,
  draws and a ball lost. A new state kept on a brick or the field belongs in
  that list.
- A spoiled entry is a stored game read back from JSON (`stored()`) with one
  thing changed, and each is expected to be refused.
- `keptRun()` (`src/testing/kept_run.ts`) keeps a run begun at a level, the
  bricks it names broken or worn through the rules, as the screenshots'
  script stores one.

## The View

- `src/testing/art_frames.ts` draws the atlas in one palette
  (`ART_PALETTE`) at one scale (`ART_SCALE`), and finds a frame by its name
  (`frameNamed()`), so the art's specs check the commands a frame is drawn
  with.
- `src/view/contrast.spec.ts` checks every palette in `@fz/style`'s
  `THEMES` with `@fz/style/testing`'s helpers: it compiles the global
  stylesheet, reads each palette's roles from it, builds `bricksPalette()`
  from them, and holds the tints, the kinds, the balls, the capsules, the
  paddle and the glow to 3:1 against the field, and the outline and the
  marks against what they cross.

## The Scene

`src/scene/bricks_scene.spec.ts` runs the real scene in a headless Phaser
game through `runScene()`:

- `FakeShell` plays the shell's part of `BricksSceneOptions`: it hands the
  scene a field (`showField(rows)` for a new one, as a level starts), a
  palette, the motion, touch and sound settings and the chimes, and keeps
  the frames' times and steering, the layouts, the commands and the
  pictures the scene hands back.
- `startBoard(setUp, prepare)` runs the scene for a fake shell, with
  Phaser's keyboard on an element of its own, and draws the first frame;
  `stillness` sets the shell up for a player who prefers less motion.
  `afterEach` destroys the game.
- Drive it with the run's `advance(ms)`, keys on the element Phaser's
  keyboard listens on (the board's `keys`) and the pointer, and change the
  shell's field as the rules would; assert on the game objects
  (`imagesIn()`, `shardsOf()`, their frames, places and visibility) or on
  what the shell kept. A headless game draws no pixels and plays no sound.

## The Shell

- Every component that shows the board runs it on
  `provideFakePhaserCanvas()`, which loads no Phaser; `FakePhaserCanvas`
  keeps the hosts, to settle a scene ready or failed. The board's spec also
  runs the scene the board hands its canvas for real, through `runScene()`,
  and plays a level to its end through it.
- `GameService` plays the small levels of `src/testing/play.ts`, handed to
  it with a seed of its own (`provideSpecLevels()`): `SPEC_LEVELS`, each set
  up to come to one thing soon, by its number in `SPEC_LEVEL` (`blasts`,
  `wide`, `steel`, `few`, `lives`, `laser`, `catch` and `last`), or
  `TWO_SETS`. It runs on the time it is given: `game.tick(FRAME_MS, steer)`,
  steered `STILL`, `under()` the ball, `awayFrom()` it or `underCapsule()`;
  `playUntil()`, `playFor()`, `loseBall()`, `playToClear()` and
  `clearToNext()` play on to a point.
- `render()` sets up the TestBed, so a spec that changes a setting first
  stores it, or changes it after rendering.
- jsdom has no `matchMedia`, so motion isn't welcome: the cards open at the
  next frame, and the board is no touch screen. A spec of the waits, or of
  a finger, installs `@fz/game-ui/testing`'s fake viewport
  (`installFakeViewport()`, `setCoarsePointer(true)` for a touch screen) and
  restores it after.
- A saved game is stored before the service starts: `SavedGameService`'s
  spec writes `brick-breaker-game` through the rules' `saveGame()`, then
  injects it, as `main.ts` does on load. The app's spec renders the app as
  `main.ts` starts it, over a stored run, on fake timers (`setTimeout` and
  `clearTimeout` alone), and moves them on by `@fz/ui/announcer`'s
  `ARRIVAL_MS` for the live region to say where the run stands, rather
  than racing a real wait.
