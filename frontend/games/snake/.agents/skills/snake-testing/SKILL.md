---
name: snake-testing
description: How Snake runs and writes its specs — its Vitest setup with headless Phaser installed first, the coverage floor on its rules and view, runs drawn as pictures with runFrom, games played with playToTheEnd, endedGame and wonGame, seeded with provideFixedSeed, the scene run for real with runScene and a fake shell, the shell's specs on provideFakePhaserCanvas, and the contrast spec over every palette. Triggers on: snake spec, snake test, runFrom, pictureOf, run picture, playToTheEnd, endedGame, provideFixedSeed, flaky snake spec, FakeShell, startBoard, snake scene spec, snake coverage, frontend/games/snake tests.
---

# Testing Snake

This skill covers how Snake runs its specs and what they share. The
patterns every Angular workspace's specs follow (Testing Library by role,
user-event, jest-dom, zoneless change detection, fake timers, what jsdom
keeps and lacks) are the repository's `angular-testing` skill's, the
headless Phaser harness is `phaser-core`'s, and the rules every spec
follows are in `.agents/AGENTS.md`, under "Writing Unit Tests". Paths are
relative to `frontend/games/snake/`.

## Commands and Coverage

Run these from `frontend/games/snake/`, or as
`yarn workspace snake <script>` from `frontend/`.

- **Run Tests**: `yarn test` (the whole suite once, with coverage) or
  `yarn test:watch`. `yarn vitest run <path>` runs one spec without
  coverage.
- **Coverage Floor**: `vitest.config.ts` holds `src/rules/` to 100% of
  statements, functions and lines and 95% of branches, and `src/view/` to
  the same but 99% of statements, short by a throw for a square a snake must
  have. `yarn test`, which CI runs, fails below either. The scene and the
  shell have no floor of their own.

## Setup

- `vitest.config.ts` is `@fz/dev/vitest`'s `angularTests()`, given the floor
  and what coverage leaves out (`src/main.ts` and `src/testing/`).
- A spec sits beside the file it tests, named after it, and runs in jsdom.
- `src/test-setup.ts` calls `@fz/phaser/testing`'s
  `installHeadlessPhaser()` before anything imports Phaser, starts Angular's
  TestBed, loads jest-dom's matchers, polyfills `<dialog>`, and clears
  `localStorage` before every test.

## The Rules and the View

- Draw a run rather than play to it: `runFrom(picture, options)`
  (`src/testing/run_picture.ts`) takes a square picture, one string a row:
  `@` the head, an arrow on each other square of the snake pointing toward
  the head, `*` the apple and `.` a free square. The board is as big as the
  picture, so a spec of a full board draws three by three. The options set
  what the picture can't show (the heading, the turns queued, the speed, the
  outcome, the steps), and `eaten` defaults to what the snake has grown.
  `pictureOf(run)` draws a run back, so a spec asserts on the board it
  expects.
- A new run is always the same: `createRun()` puts the head at (4, 8)
  heading right and the first apple at (12, 8), so eight steps right eat
  it. Later apples come from the run's seed.
- The rules and the view know no framework, so their specs call the
  functions directly and assert on what they return. `stepper.spec.ts`
  passes frame times; `snake_shapes.spec.ts` checks the path the snake is
  drawn as, glided between steps, and that each frame is written over the
  last rather than allocated anew.

## The Scene

`src/scene/snake_scene.spec.ts` runs the real scene in a headless Phaser
game through `runScene()`:

- `FakeShell` plays the shell's part of `SnakeSceneOptions`: it hands the
  scene a frame (`show(run)`), a palette and the motion and sound
  settings, and keeps the times, layouts and commands the scene hands back.
- `startBoard(setUp, insets)` runs the scene for a fake shell, with Phaser's
  keyboard on an element of its own, and draws the first frame;
  `stillness` sets the shell up for a player who prefers less motion.
  `afterEach` destroys the game.
- Drive it with the run's `advance(ms)`, `key()` and the pointer, and
  assert on the game objects (the grid's size and colors, the apple's
  place and scale, the emitter's particles, the camera's effects) or on
  what the shell kept. A headless game draws no pixels and plays no sound.
- `START`, `EATEN` and `CRASHED` are runs at the points a spec needs, built
  with the rules' own `turn()` and `step()`.

## The Shell

- Every component that shows the board runs it on
  `provideFakePhaserCanvas()`, which loads no Phaser; `FakePhaserCanvas`
  keeps the hosts, to settle a scene ready or failed. The board's spec also
  runs the scene the board hands its canvas for real, through `runScene()`,
  to check the two are wired: the layout it publishes, the keys and the
  time.
- `GameService` runs on the time it is given: `game.tick(ms)`, with
  `stepMs(speed, eaten)` for one step. `playToTheEnd(game)`,
  `endedGame(direction)` and `wonGame()` (`src/testing/play.ts`) play a
  game to its end, lost up or right, or won on `ALMOST_FULL`, a three by
  three board one apple from full, taken up with `takeUp()`.
- `GameService` seeds each run from `GAME_RANDOM`, `Math.random` unless a
  spec provides another. A run lost right eats the first apple, and the
  second where its seed lays it in the way, about one run in 70, as 4 of
  the 285 squares free lie ahead. So every spec that plays runs to an end
  provides `provideFixedSeed()`, which gives every run the same seed, one
  that lays the second apple elsewhere.
- `render()` sets up the TestBed, so a spec that changes a setting first
  stores it, or changes it after rendering.
- jsdom has no `matchMedia`, so motion isn't allowed: the result card opens
  at once, and the board's touch arrows don't show. A spec of either
  installs `@fz/game-ui/testing`'s fake viewport (`installFakeViewport()`,
  `setCoarsePointer(true)` for a touch screen) and restores it after.
- A saved run is stored before the service starts: `SavedGameService`'s
  spec writes `snake-game` with `saveRun()`'s shape, then injects it, as
  `main.ts` does on load.

## Contrast

`src/view/contrast.spec.ts` checks every palette in `@fz/style`'s `THEMES`
with `@fz/style/testing`'s helpers. It compiles the global stylesheet,
reads each palette's roles from it, builds `snakePalette()` from them, and
holds the snake, its head and the apple to 3:1 against both shades of
square, and the checker to the page's first wash.
