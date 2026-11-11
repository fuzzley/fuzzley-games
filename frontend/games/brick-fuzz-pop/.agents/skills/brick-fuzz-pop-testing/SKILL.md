---
name: brick-fuzz-pop-testing
description: How Brick Fuzz Pop runs and writes its specs — its three Vitest projects and what runs where, the coverage floors, walls drawn as pictures with wallFrom and flyPicture, the hand-made flight fixtures, the certificates every level's line is replayed from and the careless player's floors, yarn certify:levels and report:levels, what to do when a replay or a floor fails, the run kept by the rules for the screenshots and the layout check, the flight's benchmarks and SIM_TIMEOUT_MS, the scene run for real with a FakeShell, the saved game's spoiled entries, the shell's specs on scripted rounds through provideSpecPlay and runShownScene, and the mutation pass. Triggers on: brick fuzz pop spec, brick fuzz pop test, wallFrom, levelFrom, flyPicture, FLIGHT_FIXTURES, orderProblemsOf, trackProblemsOf, STAND_INS, playRoundBy, randomFlight, castByScan, brick fuzz pop certificate, certify:levels, replayLine, lineHolds, solveLevel, holdEveryCertificate, holdEveryFloor, playCasually, CASUAL_FLOORS, brick fuzz pop report:levels, brick fuzz pop every_level, every_floor, brick fuzz pop par.json, SIM_TIMEOUT_MS, brick fuzz pop benchmarks, brick fuzz pop saved game spec, KNOWN_LEVEL_SPOILS, brick fuzz pop keptRun, brick fuzz pop SCREENSHOT_API, brick fuzz pop capture:screenshots, WallScene spec, brick fuzz pop FakeShell, provideSpecPlay, scriptedRounds, playRoundOut, playUntilCard, brick fuzz pop runShownScene, brick fuzz pop mutation pass, brick fuzz pop coverage, frontend/games/brick-fuzz-pop tests.
---

# Testing Brick Fuzz Pop

This skill covers how Brick Fuzz Pop runs its specs and what they share. The
patterns every Angular workspace's specs follow (Testing Library by role,
user-event, jest-dom, zoneless change detection, fake timers, what jsdom
keeps and lacks) are the repository's `angular-testing` skill's, the
headless Phaser harness is `phaser-core`'s, and the rules every spec
follows are in `.agents/AGENTS.md`, under "Writing Unit Tests". Paths are
relative to `frontend/games/brick-fuzz-pop/`.

## Commands and Coverage

Run these from `frontend/games/brick-fuzz-pop/`, or as
`yarn workspace brick-fuzz-pop <script>` from `frontend/`.

- **Run Tests:** `yarn test` (the whole suite once, without coverage),
  `yarn test:coverage` (the `dom` and `pure` projects with coverage, then
  `sim` without) or `yarn test:watch`.
  `yarn vitest run --project <project> <path>` runs one spec, or a folder's,
  starting its project alone: `pure` for the rules, the view,
  `src/testing/` and `tools/`; `sim` for the replays, the floors and the
  benchmarks; `dom` for the scene and the shell. Without `--project`,
  Vitest starts all three, Analog's plugin among them.
- **Coverage Floors:** `vitest.config.ts` holds `src/rules/` and
  `src/view/` to a floor near 100%, and `src/scene/` and `src/app/` to one
  a little under what their specs reach, so a part without specs fails the
  run; the config holds the numbers. `src/testing/` and the scripts in
  `tools/` are measured with no floor, so what of them goes untested shows.
  A floor holds for the whole suite, so never run one spec with
  `--coverage`: it fails every floor the spec doesn't reach. Coverage
  measures `dom` and `pure` together, not `sim`, so a line only a replay
  reaches counts as untested: the rules' own specs hold the rules to their
  floor.
- **Files Held to a Script:** `src/rules/aims.spec.ts` fails while
  `src/rules/aims.ts` isn't what `yarn build:aims` writes, and
  `tools/build-sounds.spec.ts` while `src/scene/sounds/` isn't what
  `yarn build:sounds` makes. Change the script and run it; never edit what
  it writes.
- **Check the Layout:** `yarn build`, then `yarn check:layout`
  (`tools/check-layout.mjs`), which opens the build in a headless Chrome at
  each shape and turn, then again over a run kept by the rules, which each
  page takes up; the workspace's `AGENTS.md` says what it holds.

## Setup

- `vitest.config.ts` is `@fz/dev/vitest`'s `angularTests()`, given the
  floors, what coverage measures (`src/` and `tools/`, but `src/main.ts`)
  and the folders of its three projects, each a config of its own, so each
  starts only what its specs need:
  - `pure`, in Node: `src/rules/`, `src/view/`, `src/testing/` and
    `tools/`, but for `sim`'s folders;
  - `sim`, in Node, without coverage: `src/rules/levels/every_level/`,
    `src/rules/levels/every_floor/` and `src/rules/flight/benchmarks/`;
  - `dom`, in jsdom after the setup below, with Analog's plugin: every
    other spec under `src/`, the scene's and the shell's. It takes what the
    other two don't, so a spec in a new folder runs in jsdom rather than in
    neither.
- A spec sits beside the file it tests, named after it, and its folder sets
  its project; the specs in `sim`'s folders test no one file. `dom`
  compiles `pure`'s folders with Vite's oxc, as `pure` does, rather than
  with Analog's plugin, so coverage adds a file's two runs up rather than
  counting each function twice. That is why lint lets `src/testing/` take
  Angular by type alone: none of it may declare what only Analog's plugin
  compiles, such as a decorated class.
- `src/test-setup.ts` calls `@fz/phaser/testing`'s
  `installHeadlessPhaser()` before anything imports Phaser, starts
  Angular's TestBed, loads jest-dom's matchers, polyfills `<dialog>`, gives
  the page a `document.fonts` whose faces are there at once (a spec makes
  one arrive late by holding back `load()` and answering `check()`), and
  gives each test's app a store of its own in memory
  (`provideMemoryStorage()`).
- The helpers the solver, the careless player and the scripts run
  (`HELD_AS_RULES` in `eslint.config.js`) are linted as the rules are: their
  fence, off the clock and the page, and the exact arithmetic
  (`exact: true`) every engine rounds alike, so a line found in Node replays
  in every browser. A file of `src/testing/` they come to import joins that
  list, as lint says.
- A helper whose answer a spec trusts wants a spec of its own beside it,
  so one that answered wrongly can't let a spec pass that tests nothing:
  `wall_picture.ts`, `flight_fixtures.ts`, `random_flights.ts`,
  `solver.ts`, `casual.ts`, `wall_score.ts`, `every_level.ts`,
  `kept_run.ts`, `screenshot_api.ts`, `art_frames.ts` and `canvases.ts`
  have one. `cast_reference.ts`'s `castByScan()`, `flights.ts`'s `near()`,
  `timing.ts`'s `quantile()`, `stand_ins.ts`'s kinds and `play.ts`'s
  scripted rounds have none yet, though `cast()`, the flight's specs, the
  guide's bound, the traits' specs and the shell's trust them; a change to
  one wants its spec first.

## The Rules

- **Draw a wall rather than play to it.** `wallFrom(rows, { lowestRow })`
  (`src/testing/wall_picture.ts`) lays a wall out from a picture, a row of
  nine characters for each of its rows from the top, in the legend's
  characters (`src/rules/levels/legend.ts`: `o` a brick, `2` to `6` tough,
  `#` steel, `.` none, and the rest it lists), each brick whole and tinted
  as a level's are and each portal twinned with the other of its mark
  (`twinsIn()`), its lowest row in field row 1 unless told. It throws for
  a row not nine wide, a portal's mark used once or more than twice, or a
  character the legend lacks.
  `levelFrom()` (`src/testing/level_picture.ts`) makes a level of one;
  `NO_HITS` are rules under which no shot takes a hit, and `HIGH_BRICK` a
  level that loses to them after a jump.
- **Fly a shot at it.** `flyPicture()` (`src/testing/flights.ts`) flies
  one at a pictured wall by the bricks' own rules, on a field 11 deep, from
  the floor's middle straight up, uncharged, the wall's lowest row in field
  row 3, with no friends behind it, unless its options give the row, the
  place, the angle in degrees, the charge, a hot shot, the friends or the
  kinds; `eventsOf()` picks a flight's events of a kind, and `near()`
  matches a number as near as the flight's arithmetic finds it.
- **Stand-ins** from `src/testing/stand_ins.ts`, made up before their
  kinds were cataloged and still flown by the flight's, the cast's, the
  grid's, the round's and the random flights' specs: a bumper, a portal and a prism, and
  `STAND_IN_RULES`, the rules they fly by, each brick's own but for plates
  and shells, which do nothing there. `STAND_INS` is the catalog with the
  bumper in the row zapper's place and the portal in the column zapper's,
  so a picture's `-` is a bumper and its `|` a portal; the prism joins a
  catalog a spec makes for itself, as `random_flights.ts` does. A spec
  hands them to `playRoundBy()`, whose wall still comes down and is found
  cleared by the catalog's kinds, so a stand-in is needed as the zapper it
  replaces is. A new spec draws the real kinds, `B`, `P`, `@` and `&`,
  rather than these. `struckOf()` is a strike as a brick's rules see it.
- **Every flight is held to its checks.** `random_flights.ts` draws seeded
  flights at random walls (`randomFlight()`) and finds where a fuzzball
  came nearer a brick than it may (`clearanceProblemsOf()`);
  `flight_fixtures.ts`'s `orderProblemsOf()` and `trackProblemsOf()` find
  where a flight's events leave the order and the paths
  `src/rules/flight/events.ts` describes. `src/rules/flight/flight.spec.ts`
  holds `fly()` to all three over its seeded random flights.
  `cast_reference.ts` casts by a scan of every brick (`castByScan()`), on
  seeded walls and shots (`randomField()`, `randomShot()`), which `cast()`
  is held to.
- **The fixtures.** `FLIGHT_FIXTURES` are eleven rounds made by hand
  (`plain`, `punch`, `punchThrough`, `zap`, `columnZap`, `hotShot`,
  `triple`, `friend`, `bored`, `cleared`, `lost`), each a start, a shot, the
  level's boon and the round it plays, worked out by hand. They hold the
  rules: `flight.spec.ts` holds `fly()` to each fixture's flight, and
  `src/rules/round/round.spec.ts` holds `playRound()` to each fixture's
  round (`near()`); and the view, the scene and the shell are specced
  against them. `flight_fixtures.spec.ts` holds each to the order, the
  paths and its own wall, so a fixture shows only what a flight could.
- The rules know no framework, so their specs call the functions directly
  and assert on what they return.

## The Certificates and the Floors

- **A certificate** is a line of shots, each an aim's index and a charge,
  that clears a level on a depth: cleared in as many rounds as it has
  shots, no brick the level needs ever coming down to the row over the
  floor's (`lineHolds()`). `yarn certify:levels` finds them with the
  solver (`solveLevel()` in `src/testing/solver.ts`: greedy at every fourth
  aim, then a beam of 4, then every aim, `SEARCHES`, within
  `SOLVER_ROUNDS`), and writes them to
  `src/rules/levels/certificates/<set>.json`, with each level's par on each
  depth, half as many rounds again (`parFrom()`), to
  `src/rules/levels/par.json`, the same bytes every run.
- **`every_level/`** holds a file for each depth, 11 to 22, each calling
  `holdEveryCertificate(import.meta.filename)` (`src/testing/every_level.ts`),
  which takes its depth from the file's name and replays every level's
  line on it through `playRound()` (`replayLine()`), holding it to
  `lineHolds()` and its par to `par.json`.
- **`every_floor/`** holds a file for each set on 11, 13 and 22 deep
  (`<set>_<depth>.spec.ts`), each calling `holdEveryFloor()`, which holds
  the careless player (`playCasually()` in `src/testing/casual.ts`, the best
  by `wallScore()` of `CASUAL_LOOKS` seeded shots a round) to clearing each
  of the set's levels at least `CASUAL_FLOORS` times in 100, over
  `FLOOR_SEEDS` games, each from the level's own seeds.
- `src/testing/every_level.spec.ts` holds both folders to a file for each
  depth, or set and depth, and no other, so a file can't go missing. A set
  added to `LEVEL_SETS` needs its certificates in `CERTIFICATES`, its floor
  in `CASUAL_FLOORS` and its three files in `every_floor/`.
- **`yarn report:levels`** plays the careless player over forty games a
  level on 11, 13 and 22 deep, or each `--depth` given, `--seeds` as many
  as asked, its first games the floor specs' own, marks `!` a level under
  its floor, and exits with 1 where one is. It is how a level is tuned to
  its floor.
- Both scripts load what they play through Vite, `CERTIFY_API` and
  `REPORT_API`, typed by `src/testing/script_api.ts`, which imports
  nothing, so a name changed in the rules fails to compile there. Their
  specs in `tools/`, in `pure`, run them whole as `run()`, over levels and
  an API of their own, and the certifier's on a real pool of threads too.
- **A run kept by the rules** (`keptRun()`, in `src/testing/kept_run.ts`,
  held as the rules are) is a level begun on a depth and played a round a
  shot, as the saved game keeps it, which `yarn capture:screenshots` and
  the layout check hand a page to take up, loading it through
  `SCREENSHOT_API` and storing it with `tools/stored_run.mjs`.
  `tools/capture-screenshots.spec.ts` holds the screenshots' `RUN` to the
  first two shots of its level's line on its depth, so a line certified
  anew there fails it until `RUN` takes the new shots and the screenshots
  are captured again.
- In a development build, and at `?debug` in a production one, the debug
  menu's Play the certificate plays the level in play's line on the
  field's depth (`CertificatesService`), and the menu says when retuned
  numbers leave the certificates stale (`staleCertificates()`).

## When a Replay Fails

A spec in `every_level/` holds two things at once: that the level's line
still holds (`holds`), and that `par.json` gives the level the par its line
earns (`par`, by `parFrom()`). Its message names the level, the depth, how
many shots its line has, the rounds it took, whether it cleared and the
lowest row its needed bricks came down to, and says to run
`yarn certify:levels`. Don't, until you know why it failed:

1. **See which of the two failed,** in the diff Vitest prints. If `holds`
   is still true and only `par` differs, the line clears its level and
   `par.json` is stale against `parFrom()`, as when `PAR_SHARE` is
   retuned: certify any one level again (`--level 1 --depth 11`), which
   keeps every other line and writes every level's par from every line.
2. **If the line no longer holds, ask whether the change meant to change a
   round.** A replay reads only the rules (the flight, the kinds and their
   traits, the tuning, the aims, the wall's lowering, `parseLevel()`,
   `levelStart()`, `shotOf()` and `playRound()`), `@fz/core`'s sweep and
   arithmetic, the levels' walls, `par.json`, and the solver's
   `replayLine()` and `lineHolds()`; the view, the scene and the shell
   can't fail one. If the change wasn't meant to change how a shot plays,
   a failed replay is the bug: find what differs, and keep the
   certificates. If it was, the fixtures whose rounds meet the change fail
   too: work their rounds out again by hand, and the specs of the view,
   the scene and the shell that read them. A change to a level's wall or
   to `levelStart()` fails no fixture, as the fixtures draw their own walls
   and starts.
3. **If it did,** certify again only what it touches: `--set <id>`,
   `--level <id or number>` or `--depth <n>`, the other lines kept as
   written. It uses every core, so certify one thing at a time, and nothing
   beside it that needs them.
4. **Read the diff** of the certificates and `par.json`: a par that moved
   moves the stars the level gives, and a line that moved under the
   screenshots' run moves the screenshots. Commit them in the change that
   moved them.
5. **A level with no line** (the script exits with 1, leaving it none on
   that depth) is one the change made too hard to clear within
   `SOLVER_ROUNDS` keeping a row to spare: redraw its wall from its courses
   (`docs/brick-fuzz-pop/levels/build.mjs`, then copy its set's JSON into
   `src/rules/levels/`), or rethink the change.

A floor that fails (`every_floor/`) says how often the careless player
cleared the level in its twenty games. Those games are the gate, and their
seeds are the level's number's (`number * SEED_STRIDE + game`), so adding,
taking away or moving a level seeds every level after it anew, and a change
to `casual.ts` or `wall_score.ts` moves every floor: either can fail a level
nobody touched. `yarn report:levels --depth <n>` plays the same games and
more, `--seeds` as many as asked, which tells a level under its floor from
twenty unlucky games; but the spec must pass on its own seeds, so a level
that fails them is redrawn or eased until it does, and certified again.

## The Benchmarks

`src/rules/flight/benchmarks/`, in `sim`, prints `cast()`'s, `fly()`'s and
`playRound()`'s times at their median and 99th percentile, against the
plan's, but holds none of them to a time, as no runner times anything
alike twice; only `guide.spec.ts` holds one, `guideOf()`'s 99th percentile,
under a bound. `random_rounds.spec.ts` plays ten thousand seeded random
shots at random walls, none throwing, none capped and none coming nearer a
brick than a fuzzball may.
`yarn vitest run --project sim --reporter=verbose src/rules/flight/benchmarks`
shows the times without the replays and the floors. A test in `sim` that can run past half a second alone
takes `SIM_TIMEOUT_MS` (`src/testing/timing.ts`) as its describe's
`timeout`, since `yarn test` runs `sim` beside every workspace's specs.

## The View

- `src/testing/art_frames.ts` draws the atlas in one palette
  (`ART_PALETTE`) at one scale (`ART_SCALE`), as `ART_FRAMES`, which the
  art's specs search with `@fz/phaser/testing/pure`'s `frameNamed()` and
  `drawnIn()`; `PIXEL_RATIOS` are the ratios they check the art at,
  `everyScale()` every whole unit from 24 CSS px to 128 device px at one,
  and `distanceToSegment()` and `pastRoundRect()` measure where a point
  lies.
- `src/view/colors/contrast.spec.ts` reads each of the four palettes from
  the global stylesheet (`PALETTES`, in `src/testing/roles.ts`) and holds
  the field's inks to contrast in each.
- `src/testing/canvases.ts` gives the canvas a board has in a window
  (`boardCanvas()`), less the bar or the rail (`CHROME_CSS_PX`, which its
  spec holds to `@fz/game-ui`'s Sass), for the specs of the layout.

## The Scene

`src/scene/wall_scene.spec.ts` runs the real `WallScene` in a headless
Phaser game:

- Its `FakeShell` plays the shell's part of `WallSceneOptions`: it shows a
  wall standing (`showWall()`) or coming down (`bringDown()`), a round set
  by hand reaching events with the flourishes and sound each calls for
  (`reach()`) and beats (`beat()`), or a fixture's round aimed (`aim()`) or
  let fly (`fly()`), which its ticks play on; it casts the guide for the
  steering (`casting`), and hands over the palette, the field's shape, the
  motion (`stillness`), the sound and the chrome. It keeps the ticks, the
  steering, the layouts, the commands, and what each bake hands back to
  picture How to play's kinds with (`askPictures()`).
- `startBoard(setUp, canvas)` runs the scene for a fake shell through
  `@fz/phaser/testing`'s `runKeyedScene()` and draws the first frame; the
  game goes as the test finishes. Drive it with the run's `advance(ms)`,
  the keys and the pointer, and the spec's own `resizeTo()` and
  `frameUntil()`, each handed the board.
- Assert on the painters' pools, which each holds as a public readonly list
  made once (`scene.wall.swellings`, `scene.guide.dots`,
  `scene.field.countDots`), their frames, places, depths and visibility,
  through the spec's readers (`swellAt()`, `placeAt()`, `layerPlaceOf()`)
  and `@fz/phaser/testing`'s (`imagesIn()`, `objectsIn()`, `commandsOf()`,
  `colorsOf()`, `watchUploads()`). A headless game draws no pixels and plays
  no sound, so what a frame looks like is checked in a browser.
- The wall and the field are drawn on bakes, textures of their own, which a
  headless game draws nothing on, so the spec reads what each was handed:
  `startBoard()` spies on every bake's commands first, `recordBakes()`
  reads those a bake of a key was handed from the moment it is called, in
  order, and `framesAt()` reads the frames the wall's bake shows in a cell,
  as the commands it rendered stamped and cleared them.

## The Shell

- `provideSpecPlay(rounds, levels)` (`src/testing/play.ts`) hands
  `GameService` the game's first three levels (`SPEC_LEVELS`), a random
  that always gives the same seed (`SPEC_RANDOM`), and a round player:
  `scriptedRounds(...)` plays the rounds named in turn, the last again
  once they run out, each a fixture's flight and points of the spec's own
  (`SPEC_POINTS`): `"step"` brings the wall a row down, `"freed"` a row
  down with a friend freed in `FREED_INK`, `"jump"` a jump down with the
  level's boon, `"cleared"` empties it, and `"lost"` brings it a row down
  and the level is lost. A spec that wants the real rules hands it
  `playRound()`.
- Play them a frame at a time: `release()`, `playOut()`, `playRoundOut()`
  and `playUntilCard()`, steered `STILL` or `RELEASE`, with
  `@fz/core/testing`'s `FRAME_MS` and `playUntil()`.
- The shell loads How to play as it first opens, and the debug menu where
  it is offered, through `onDemand()` (`src/app/on_demand.ts`), each load
  a pending task, so a spec waits for it with `whenStable()`: after
  pressing How to play, before looking in it. The menu loads its
  certificates from `CERTIFICATE_FILES`, which a spec hands a file of its
  own (`filesCertifying()`, in `src/testing/certificates.ts`); no pending
  task holds that load, so a spec waits for the menu and its certificates
  with `loadsSettled()`, and for the game's own files, a dynamic import,
  with `vi.waitFor()`.
- To see what shows while a chunk is on its way, or once it can't be
  fetched, a spec hands `LOAD_HELP` or `LOAD_DEBUG_MENU` a held load
  (`heldLoad()`, in `src/testing/loads.ts`) and lets it `arrive()` or
  `fail()` with `OFFLINE`, collecting the error (`collectErrors()`). Till
  then the load's pending task keeps `whenStable()` and `loadsSettled()`
  waiting, so the spec shows the page with `detectChanges()`, and settles
  only once the load is let go.
- A component that shows the board runs it on `@fz/phaser/testing`'s
  `provideFakePhaserCanvas()`, which loads no Phaser; the board's spec also
  runs the scene it hands its canvas for real, through the library's
  `runShownScene()`. A spec that fails the scene on purpose has the app's
  `ErrorHandler` collect what the canvas hands it (`collectErrors()`); the
  board measures its room as a `ResizeObserver` reports it, so a describe
  of the room calls `watchResizes()`, and `resize()` lays the board out at
  a size, both the library's too. `@fz/dev/board-page`'s `readRect()` and
  `readNamedRects()` read back what the board writes for the layout check.
- jsdom answers no media query, so `GameViewportService` reads its window
  as roomy, wider than tall, pointed at with a mouse and asking for no
  motion: `GameService.motion()` is false, and the wall doesn't ease, until
  a spec installs `@fz/game-ui/testing`'s `installFakeViewport()`, which
  gives the window a size and takes itself off after.

## The Saved Game

- `src/rules/run/saved_game.spec.ts` keeps a run (`STORED`) and spoils it
  one thing at a time (`tampered()`). Each spoil is written once, in a
  table named for the check it spoils (`KNOWN_LEVEL_SPOILS`,
  `DEPTH_SPOILS`, `ROUND_SPOILS`, `STAR_SPOILS`, `SCORE_SPOILS`,
  `PLACE_SPOILS`, `CREW_SPOILS`, `BOON_SPOILS`), which that check's own
  spec holds to failing it, so a spoil can't pass by failing another, and
  the reader's spec holds to being dropped.
- `src/app/play/saved_game.service.spec.ts` gives each test a
  `MemoryStorage` of its own, stores the entry before the service is
  injected, as a page loaded again would find it, and reads back what it
  keeps.

## The Mutation Pass

A mutation pass, which the build-out's plan
(`docs/brick-fuzz-pop/implementation-plan.md`) asks of each package, breaks
a change one thing at a time, runs the specs, and logs what survived in the
stream's log under `docs/brick-fuzz-pop/worklog/`:

- **A mutant** is one bound (`<` for `<=`), condition (dropped, inverted or
  always true), constant (halved, doubled, nothing), argument, call or line
  (left out), or order (two layers or painters swapped), in the change's
  own code and in the specs' helpers it trusts.
- **Apply each as a text replacement** that must match once in its file,
  run the specs, then put the file back whether they passed or failed, from
  a script kept outside the repository, so a replacement that matched
  nothing shows as such rather than as a survivor or a kill. Never stash or
  check out over the change while doing it.
- **Run only the project and folder** whose specs should kill it, without
  coverage: `yarn vitest run --project dom src/scene` for the scene's,
  `--project pure src/rules/flight` for the flight's. The replays in `sim`
  say only that a line stopped holding, so a rules mutant only they kill
  still wants a spec in `pure` that names what broke.
- **Every survivor gets a spec** that fails on it. The one exception the
  logs make is a mutant equivalent to the code, which no input can
  tell from it, as `<=` for `<` between values that are never equal. Log
  the count, what was killed, and each survivor, with the spec that now
  kills it or why it is equivalent.
