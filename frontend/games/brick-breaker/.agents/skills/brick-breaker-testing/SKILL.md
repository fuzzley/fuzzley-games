---
name: brick-breaker-testing
description: How Brick Breaker runs and writes its specs — its Vitest setup with headless Phaser installed first, the coverage floor on its rules and view, fields drawn as pictures with fieldFrom and throwBall, the autopilot that holds every level to being cleared, the saved game's round trip, the scene run for real with runKeyedScene and a FakeShell, the shell's specs on its small levels through provideSpecLevels and tick, and the contrast spec over every palette. Triggers on: brick breaker spec, brick breaker test, fieldFrom, throwBall, playWithoutBall, autopilot spec, playLevel, FakeShell, startBoard, runKeyedScene, provideSpecLevels, SPEC_LEVEL, playToClear, keptRun, SCREENSHOT_API, script_api, shownRun, CLEARING_RUN, storedRun, stored_run, check-layout, brick breaker coverage, frontend/games/brick-breaker tests.
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

- **Run Tests**: `yarn test` (the whole suite once, without coverage),
  `yarn test:coverage` (the `dom` and `pure` projects with coverage, then
  the `sim` project without) or
  `yarn test:watch`. `yarn vitest run --project <project> <path>` runs one
  spec without coverage, starting its project alone: `pure` for the rules,
  the view and `tools/`, `dom` for the scene, the shell and `src/testing/`,
  and `sim` for the simulations. Without `--project`, Vitest starts all
  three, Analog's plugin among them. The whole suite takes minutes, most of them
  the autopilot playing every level at every preset speed.
- **Coverage Floor**: `vitest.config.ts` holds `src/rules/` and `src/view/`
  to 100% of statements, functions and lines and 95% of branches.
  `yarn test:coverage`, which CI runs, fails below either. The scene and the shell
  have no floor of their own. Coverage measures the `dom` and `pure`
  projects together, not `sim`, so what only the simulations reach counts
  as untested.

## Setup

- `vitest.config.ts` is `@fz/dev/vitest`'s `angularTests()`, given the floor,
  what coverage leaves out (`src/main.ts` and `src/testing/`) and the
  folders of its three Vitest projects, each a config of its own, so each
  starts only what its specs need:
  - `pure`, the specs of the rules and the view, but for the simulations,
    and the scripts' in `tools/`, the report's, which plays levels it makes
    up, the screenshots', which holds the run it stores to what the rules
    take up, the stored runs', which holds the layout check's to clearing
    its level, and the sounds', which holds the sprite checked in to what
    `tools/build-sounds.mjs` writes now, to the byte, in Node, with neither
    the setup below nor Analog's plugin;
  - `sim`, the specs that play every level
    (`src/rules/levels/every_level/`), in Node too, without coverage;
  - `dom`, every other spec, the scene's, the shell's and
    `src/testing/`'s, in jsdom after the setup below, with Analog's plugin.
    It takes whatever the other two don't, so a spec in a new folder under
    `src/` runs in jsdom rather than in neither. `src/testing/` is its, not
    `pure`'s, as `play.ts` hands the game Angular's providers.
- A spec sits beside the file it tests, named after it, and its folder
  sets its project, but for `src/rules/levels/autopilot.spec.ts`, which
  tests `src/testing/autopilot.ts` in `pure`. One of the rules or the view
  has no page, so what needs one is the scene's or the shell's to test. Their
  code must hold nothing Analog's plugin must compile, such as a decorated
  class: `dom` compiles it with Vite's oxc, as `pure` does, so that coverage
  counts it once (`frontend/lib/dev/AGENTS.md`).
- `src/test-setup.ts` calls `@fz/phaser/testing`'s
  `installHeadlessPhaser()` before anything imports Phaser, starts Angular's
  TestBed, loads jest-dom's matchers, polyfills `<dialog>`, and gives each
  test's app a store of its own in memory (`provideMemoryStorage()`).

## The Rules

- Draw a field rather than play to it: `fieldFrom(rows, options)`
  (`src/testing/field_picture.ts`) lays a field out from a picture of its
  bricks, a row of up to 13 characters from the top, in the shared legend's
  characters (`src/rules/levels/legend.ts`: `o` plain, `2` to `4` tough,
  `#` steel, `*` blast, `?` gift, `~` ghost, `+` regrowing, `c` cage,
  `u` and `U` plated, of one hit and two, `k` key, `=` gate,
  `O` bumper,
  `@` and `%` portals,
  `>` and `<` sliders,
  `.` none). The
  options set what a picture can't show: the speed, the seed, the pace, the
  level's mark, 5 by default, the chance of a capsule, the capsules that may
  fall, the one every gift gives and the field's height, 30 by default, as a
  tall screen makes it up to 45.
  Its `nudge` sets where a lull's nudge turns a ball, at the walls alone by
  default.
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

- `src/rules/levels/levels.spec.ts` holds every level to parsing, ids and
  names of its own, a needed brick a ball can reach, a key wherever it has
  a gate, a pace that never falls within a set and a mark that is a
  multiple of 5, 5 at least; and every set to its place.
  It holds each level to two portals of each pair or none, and its reach
  goes on from a portal's twin. A level the specs
  draw for themselves names a mark too, as every level's data does.
- `src/rules/catalog/catalog.spec.ts` holds the catalogs to their rules, and the
  levels to using every brick kind and letting every capsule first fall at
  the level its `from` names.
- `src/rules/levels/every_level/` has `src/testing/autopilot.ts` play every
  level at every preset speed, all but Custom (`PRESET_SPEEDS`,
  `playLevel()`, from the level's number as the seed), and holds each to
  being cleared within eight minutes of game time, its last three bricks
  within one; and plays them again on the tallest
  field (`TALLEST_FIELD`), held only to being cleared within eight minutes
  stretched as far as the paddle lies farther from the bricks
  (`limitsOf()`), since luck decides more of a taller field's endgames. It
  keeps a file for each preset speed, each passing its own file
  (`import.meta.filename`) to `src/testing/every_level.ts`'s
  `holdEveryLevel()`, which plays the speed the file is named for, since
  Vitest plays a file's specs one after another but the files side by side.
- `src/rules/levels/autopilot.spec.ts` holds that folder to a file for every
  preset speed, and the autopilot itself: a spec of it lays a level out of
  the bricks it draws (`entryOf()`).
- `yarn report:levels` plays the same games, `--seeds <n>` many more, and
  `--height <n>` on a taller field, for tuning; a slow endgame on one seed
  in many is luck, but one that leaves the same bricks for last is a level
  to redraw. It prints the longest each play went between two touches of
  the paddle (the autopilot's `longestAway`), and marks one past a minute
  (`^`), a play that hangs, which the specs don't hold.

## The Saved Game

- `src/rules/run/saved_game.spec.ts` builds its fields on three levels of its
  own: plain, tough, steel, hidden, regrowing and blast bricks in a row; a
  row of plain bricks; and a crowd of tough, hidden, regrowing and blast bricks
  over a row of blast bricks, a key between two gates and two trains of
  sliders.
- Its round trip plays the crowd in takes of 7 steps, keeping, reading back
  and taking up the run and its field at each, and expects every state a
  take-up must keep to have been reached: a fuse lit, a ghost shown, a
  regrowing brick broken and grown back, a tough brick worn, a gate opened,
  a slider stepped and one turned,
  streak points, dare points (a Fast ball caught as it starts pays them),
  draws, balls off the paddle since a needed brick broke (`dryBounces`), a
  best streak (`bestStreak`) and a ball lost. A new state kept on a brick
  or the field belongs in that list.
- A spoiled entry is a stored game read back from JSON (`stored()`) with one
  thing changed, and each is expected to be refused.
- `keptRun()` (`src/testing/kept_run.ts`) keeps a run begun at a level, the
  bricks it names broken or worn through the rules, as the screenshots'
  script stores one, loading it through `src/testing/screenshot_api.ts`'s
  `SCREENSHOT_API`, typed by `src/testing/script_api.ts`, with the version
  the run is kept under (`SAVED_GAME_VERSION`), which
  `src/testing/screenshot_api.spec.ts` holds to the rules'.
  `tools/capture-screenshots.spec.ts` holds the script's run (`RUN`) so,
  stamped with that version and taken up by the rules (`shownRun()`).
  A run's `pay` of 2 breaks its bricks at double pay, as under a dare, so
  the level's tally has a line for it.
- `tools/stored_run.mjs` loads `SCREENSHOT_API` (`loadScreenshotApi()`),
  through which it keeps and stores the runs the scripts hand a page
  (`storedRun()`). `tools/check-layout.mjs` checks the Cleared card
  over one (`CLEARING_RUN`): Fuse with its tough row broken at double pay
  and its fuse lit, which the page goes on with, by its Paused card's
  Resume, so the fuse clears the level with no ball launched. It gives
  the page a minute to show the card (`CLEARED_TIMEOUT_MS`): Phaser counts
  a frame as a 60th of a second at most as a game starts, so the fuse and
  the card's wait take some 90 frames, which Chrome drawing WebGL in
  software, as CI's does, draws a few a second at 2×.
  `tools/stored_run.spec.ts` holds that run to clearing its level, taken up
  by the rules and stepped with the ball on the paddle, with double pay and
  every star, so a change to Fuse or the blasts fails there, not only in
  the browser.

## The View

- `src/testing/art_frames.ts` draws the atlas in one palette (`ART_PALETTE`)
  at one scale (`ART_SCALE`), a brick 40 CSS px wide in full detail, as
  `ART_FRAMES`, and gives a scale a brick is too small at for its cracks,
  rivets and sheen (`SMALL_SCALE`) and the scales a field is drawn at, from
  the smallest unit the layout allows up (`FIELD_SCALES`), so the art's
  specs check the commands a frame is drawn with, finding the frame by its
  name and its commands by their kind and color with
  `@fz/phaser/testing/pure`'s `frameNamed()` and `drawnIn()`.
- `src/view/colors/contrast.spec.ts` checks every palette in `@fz/style`'s
  `THEMES` with `@fz/style/testing`'s helpers: it reads each palette's
  roles from the global stylesheet, by the names the board reads them by
  (`PALETTES.rolesIn()`, from `src/testing/roles.ts`), builds
  `bricksPalette()` from them, and holds the tints, the kinds, the balls,
  the friends' inks,
  the capsules, the paddle and the glow to 3:1 against the field, a hidden
  ghost to 2:1, the outline and the marks against what they cross, and the
  two pairs of portals apart by their hue, with `deltaE()`.
- `src/view/places/places.spec.ts` draws each place's tile at every scale
  of `FIELD_SCALES` and holds every command inside it, and reads each
  palette's roles as the contrast spec does, holding every place to
  1.05:1 to 1.2:1 against the field and the page: there, but dim.
  `motifs.spec.ts` beside it draws each motif about the origin at a size
  of 100 pixels, every place's from `PLACES`, and `backdrop.spec.ts`
  reads the page's tile back out of its `url()` with `decodeURIComponent()`.

## The Scene

`src/scene/bricks_scene.spec.ts` runs the real scene in a headless Phaser
game through `@fz/phaser/testing`'s `runKeyedScene()`:

- `FakeShell` plays the shell's part of `BricksSceneOptions`: it hands the
  scene a field (`showField(rows)` for a new one, as a level starts), a
  palette, the place its set is in (`whereabouts`), the motion, touch and
  sound settings and the chimes, and keeps
  the frames' times and steering, the layouts, the commands and what the
  scene hands back at each bake to picture How to play's art with
  (`bakes`), which `askPictures()` asks as the board does.
- `startBoard(setUp, prepare)` runs the scene for a fake shell through
  `@fz/phaser/testing`'s `runKeyedScene()`, with Phaser's keyboard on an
  element of its own, and draws the first frame; `stillness` sets the shell
  up for a player who prefers less motion. The game is destroyed and the
  element removed as the test finishes.
- Drive it with the run's `advance(ms)`, keys on the element Phaser's
  keyboard listens on (the board's `keys`), the pointer, at any of the
  mouse's buttons (`pointer()`'s `button`), and a finger, which
  `touch("cancel", …)` takes away as a browser does, and change the
  shell's field as the rules would; assert on the game objects
  (`@fz/phaser/testing`'s `objectsIn()` and `imagesIn()`, `shardsOf()`,
  their frames, places and visibility, and what a `Graphics` holds, read
  with `commandsOf()`, `strokesOf()` and `colorsOf()`) or on what the shell
  kept. A headless game draws no pixels and plays no sound.

## The Shell

- Every component that shows the board runs it on
  `provideFakePhaserCanvas()`, which loads no Phaser; `FakePhaserCanvas`
  keeps the hosts, to settle a scene ready or failed. The board's spec, and
  the app's for How to play's pictures, also run the scene the board hands
  its canvas for real, through `runShownScene()`, and the board's plays a
  level to its end through it. A spec that fails the scene on purpose has
  the app's `ErrorHandler` collect what the canvas hands it
  (`@fz/phaser/testing`'s `collectErrors()`), and asserts on that, so the
  run prints no error it expects. The board measures its room as a
  `ResizeObserver` reports it, which jsdom lacks, so a describe of the room
  calls `watchResizes()`, and `resize()` lays the board out at a size.
  The board's spec paints the field's roles before every spec, as the
  bench draws the next level in the palette, and holds when the scene
  encodes its pictures by spying on its textures' `getBase64()`.
- The panels' specs (`src/app/panels/`) render each panel alone, with its
  inputs, and find it as a region by its name, and a part by its heading
  (`src/testing/heard.ts`'s `partHeaded()`). What is hidden from
  assistive technology, the meter, the rings, the fuzzballs and the next
  level's picture, they read under `[aria-hidden='true']`, and a query for
  what a screen reader hears leaves that out (`ignore`).
- `GameService` plays the small levels of `src/testing/play.ts`, handed to
  it with a seed of its own (`provideSpecLevels()`): `SPEC_LEVELS`, each set
  up to come to one thing soon, by its number in `SPEC_LEVEL` (`blasts`,
  `wide`, `steel`, `few`, `lives`, `laser`, `catch`, `dare`, whose narrow
  paddle pays double as `under()` plays it and whose mark, 10, lies past
  the streak its blasts make, so it clears without its third star, and
  `last`), `TWO_SETS`, or
  `TWO_PLACES`, a level in the playroom and one in the workshop. It runs on
  the time it is given: `game.tick(FRAME_MS, steer)`,
  steered `STILL`, `under()` the ball, `awayFrom()` it or `underCapsule()`;
  `playUntil()`, `playFor()`, `loseBall()`, `playToClear()` and
  `clearToNext()` play on to a point. `FRAME_MS`, `playUntil()` and
  `playFor()` are `@fz/core/testing`'s.
- The stars' specs (`src/app/stars/`, the bench's and the board's) find
  them as the list named "Stars" and read what a screen reader hears of
  each, the star and its marks hidden, as "Lose no life, won just now"
  (`starsHeard()`, `heardIn()`); a level's stars held before a play are
  kept through `StarsService.recordWon()`, and `StarsService`'s own spec
  stores the record, and the progress, before it starts.
- `render()` sets up the TestBed, so a spec that changes a setting first
  stores it, or changes it after rendering.
- jsdom has no `matchMedia`, so motion isn't welcome: the cards open at the
  next frame, and the board is no touch screen. A spec of the waits, or of
  a finger, installs `@fz/game-ui/testing`'s fake viewport
  (`installFakeViewport()`, `setCoarsePointer(true)` for a touch screen),
  which takes itself off after.
- A saved game is stored before the service starts: `SavedGameService`'s
  spec plays a game the service keeps, or writes one into its memory
  storage, then resets the TestBed and injects the service again, as
  `main.ts` does on load. The app's spec renders the app as
  `main.ts` starts it, over a stored run, on fake timers (`setTimeout` and
  `clearTimeout` alone), and moves them on by `@fz/ui/announcer`'s
  `ARRIVAL_MS` for the live region to say where the run stands, rather
  than racing a real wait.
