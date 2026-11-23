---
name: brick-fuzz-pop-testing
description: How Brick Fuzz Pop's specs run and are written, with its three Vitest projects, walls drawn as pictures, the certificates and the floors, what to do when a replay fails, and the mutation pass. Triggers on: frontend/games/brick-fuzz-pop spec, wallFrom, flyPicture, FLIGHT_FIXTURES, certify:levels, report:levels, every_level, provideSpecPlay, FakeShell, SIM_TIMEOUT_MS.
---

# Testing Brick Fuzz Pop

How Brick Fuzz Pop's specs run, and the helpers they share. The patterns of
every Angular workspace's specs are the `angular-testing` skill's, the
headless Phaser harness is `phaser-core`'s, and the rules every spec follows
are in `.agents/AGENTS.md`, under "Writing Unit Tests". Paths are relative
to `frontend/games/brick-fuzz-pop/`, where the commands run.

## Commands and Coverage

`vitest.config.ts` sets a spec's project by its folder:

- **`pure`, in Node:** `src/rules/`, `src/view/`, `src/testing/` and
  `tools/`, but for `sim`'s folders.
- **`sim`, in Node, never with coverage:** the replays in
  `src/rules/levels/every_level/`, the floors in
  `src/rules/levels/every_floor/` and the benchmarks in
  `src/rules/flight/benchmarks/`.
- **`dom`, in jsdom:** every other spec under `src/`, the scene's and the
  shell's. A spec in a new folder outside those runs here until the config
  names its folder.

Then:

- **Run one spec, or a folder's,** with
  `yarn vitest run --project <project> <path>`. `yarn test` runs the three
  projects once, and `yarn test:coverage` runs `dom` and `pure` with
  coverage, then `sim` without.
- **A line only a replay reaches counts as untested.** Coverage measures
  `dom` and `pure`, not `sim`, so the rules' own specs hold the rules to
  their floor. `vitest.config.ts` has the floors; `src/testing/` and
  `tools/` are measured with none.
- **Never edit a file a script writes.** `tools/build-sounds.spec.ts`
  fails while `src/scene/sounds/` isn't what `yarn build:sounds` makes.
  Change the script and run it.
- **A helper in `src/testing/` whose answer a spec trusts has a spec of its
  own beside it,** so one that answers wrongly can't let a spec pass that
  tests nothing. A change to one that has none yet adds its spec first.

## The Rules

- **Draw a wall rather than play to it.**
  `wallFrom(rows, WALL_LEGEND, { lowestRow })`, from
  `@fz/brick-wall/rules/level_picture`, lays a wall out from a picture: a
  row of nine of the legend's characters for each of its rows, from the
  top, read against `WALL_LEGEND` (`src/rules/levels/legend.ts`).
  `levelFrom()` (`src/testing/level_picture.ts`) makes a level of one.
- **Fly a shot at it** with `flyPicture()` (`src/testing/flights.ts`). Its
  `PictureShot` says what a shot is unless told. It stands the wall's
  lowest row in field row 3, where `wallFrom()` alone stands it in row 1.
  `eventsOf()` picks a flight's events of a kind, and `near()` matches a
  value's numbers as near as the flight's arithmetic finds them.
- **Draw the real kinds, not the stand-ins.** `STAND_INS`
  (`src/testing/stand_ins.ts`) is the catalog with a made-up bumper in the
  row zapper's place and a portal in the column zapper's, so a picture's
  `-` is a bumper and its `|` a portal. They fly by `STAND_IN_RULES`, under
  which plates and shells do nothing. Specs of the flight, the cast, the
  grid and the round still fly them. A new spec draws the cataloged `B`,
  `P`, `@` and `&`. `struckOf()`, in that file, is a strike as a trait's
  rule sees it, for a trait's own spec.
- **The fixtures are worked out by hand.** `FLIGHT_FIXTURES`
  (`src/testing/flight_fixtures.ts`) are rounds made by hand: each a start,
  a shot, the level's boon and the round it plays. `flight.spec.ts` and
  `round.spec.ts` hold `fly()` and `playRound()` to them, and the view, the
  scene and the shell are specced against them. A change that moves a
  round means working that fixture out again by hand.
- **Every flight is held to checks over seeded random walls.**
  `src/rules/flight/flight.spec.ts` holds `fly()`, whole and dropped, to
  `orderProblemsOf()` and `trackProblemsOf()` (`flight_fixtures.ts`) and to
  `clearanceProblemsOf()` and `dropProblemsOf()`
  (`src/testing/random_flights.ts`). `src/rules/flight/cast.spec.ts` holds
  `cast()` to a scan of every brick (`castByScan()`,
  `src/testing/cast_reference.ts`). Each one's doc says what it finds.

## The Certificates and the Floors

- **A certificate** is a line of shots, each an aim's index and a charge,
  that clears a level on a depth: in as many rounds as it has shots, no
  brick the level needs ever coming down to the row over the floor's
  (`lineHolds()`, `@fz/brick-wall/testing/solver`). `yarn certify:levels`
  finds them on `@fz/dev/certify`'s pool with the library's solver, over
  the game's play of a line (`linePlayOf()`, `src/testing/solver.ts`), and
  writes them to `src/rules/levels/certificates/<set>.json`. It writes each
  level's par on each depth, half as many rounds again
  (`@fz/brick-wall/rules/par`'s `parFrom()`), to `src/rules/levels/par.json`.
  A run writes the same bytes as the last unless a line changed.
- **`src/rules/levels/every_level/`** has a file for each depth, 11 to 22,
  each `holdEveryCertificate(import.meta.filename)`
  (`src/testing/every_level.ts`, over `@fz/brick-wall/testing/holders`). It
  replays every level's line on that depth through `playRound()`, and holds
  the line to `lineHolds()` and its par to `par.json`.
- **`src/rules/levels/every_floor/`** has a file for each set on 11, 13 and
  22 deep (`<set>_<depth>.spec.ts`), each
  `holdEveryFloor(import.meta.filename)`. The careless player
  (`@fz/brick-wall/testing/holders`' `floorGames()`, over the game's play
  of a line, `linePlayOf()`) must clear each of the set's levels at least
  `CASUAL_FLOORS` times in 100, over `FLOOR_SEEDS` games from the level's
  own seeds: the games `playCasually()` plays first for the report.
- **`src/testing/every_level.spec.ts`** fails for a file either folder
  lacks, or has too many of.
- **`yarn report:levels`** plays the careless player over more games, 40 a
  level unless `--seeds` says otherwise, on those three depths or each
  `--depth` given. Its first games are the floor specs' own. It marks `!` a
  level under its floor and exits with 1 where one is. It is how a level
  is tuned to its floor.
- **The screenshots' run follows its certificate.** The screenshots and
  the layout check's second pass hand a page a run kept by the rules
  (`keptRun()`, `src/testing/kept_run.ts`), stored by
  `tools/stored_run.mjs`. `tools/capture-screenshots.spec.ts` holds the
  screenshots' `RUN` to the first shot of its level's line on its depth. A
  line certified anew there with another first shot fails it until `RUN`
  takes that shot and `yarn capture:screenshots` runs again.
- **To watch a line play,** use the debug menu's Play the certificate, in a
  development build or at `?debug` in a production one. It plays the line
  of the level in play on the field's depth.

## When a Replay Fails

A spec in `every_level/` holds two things at once: that the level's line
still holds, and that `par.json` gives the level the par its line earns.
Its message says to run `yarn certify:levels`. Don't, until you know why it
failed:

1. **See which of the two failed,** in the message. If it says only that
   the level's par isn't the one its certificate earns, the line clears its
   level and `par.json` is stale against `parFrom()`, as when `PAR_SHARE`
   is retuned. Certify any one level again (`--level 1 --depth 11`): that
   keeps every other line and writes every level's par from every line.
2. **If the line no longer holds, ask whether the change meant to change a
   round.** A replay reads only the rules, `@fz/core`'s sweep and
   arithmetic, the levels' walls, `par.json`, and the solver's
   `replayLine()` and `lineHolds()`. The view, the scene and the shell
   can't fail one. If the change wasn't meant to change how a shot plays,
   the failed replay is the bug: find what differs, and keep the
   certificates.
3. **If it was meant to,** the fixtures whose rounds meet the change fail
   too. Work their rounds out again by hand, and mend the specs of the
   view, the scene and the shell that read them. A change to a level's
   wall or to `levelStart()` fails no fixture, as the fixtures draw their
   own walls and starts.
4. **Certify again only what the change touches:** `--set <id>`,
   `--level <id or number>` or `--depth <n>`, the other lines kept as
   written. It takes every core, so it waits its turn in the queue
   `yarn verify:changed` keeps; certify one thing at a time, as a second
   run waits for the first.
5. **Read the diff** of the certificates and `par.json`. A par that moved
   moves the stars the level gives, and a line that moved under the
   screenshots' run moves the screenshots. Commit them in the change that
   moved them.
6. **A level with no line** (the script exits with 1, leaving it none on
   that depth) is one the change made too hard to clear within
   `SOLVER_ROUNDS` with a row to spare. Redraw its wall from its courses,
   as the `brick-fuzz-pop-content` skill's "Drawing It" says, or rethink
   the change.

A floor that fails (`every_floor/`) says how often the careless player
cleared the level in its twenty games. Those games are the gate, and their
seeds are the level's number's (`number * SEED_STRIDE + game`). So adding,
taking away or moving a level seeds every level after it anew, and a change
to the careless player, the order of `linePlayOf()`'s shots or
`wall_score.ts` moves every floor: any can fail a level nobody touched.
`yarn report:levels --depth <n>` plays the same games and more, which tells
a level under its floor from twenty unlucky games. But the spec must pass
on its own seeds, so a level that fails them is redrawn or eased until it
does, and certified again.

## Slow Specs and the Benchmarks

- **A test in `sim` that can run past half a second alone takes
  `SIM_TIMEOUT_MS`** (`src/testing/timing.ts`) as its describe's `timeout`,
  since `yarn test` runs `sim` beside every workspace's specs.
- **A long check in `pure` is split into seeded batches,** each well inside
  Vitest's 5 s, as the random walls of `src/rules/flight/flight.spec.ts`
  are: `yarn test:coverage` runs `pure` two or three times slower. Only a
  search no batch can split hands its hook or its test `SIM_TIMEOUT_MS`.
- **The benchmarks hold one time only.** `src/rules/flight/benchmarks/`
  prints `cast()`'s, `fly()`'s and `playRound()`'s times at their median
  and 99th percentile, and holds none of them, as no runner times anything
  alike twice. Only `guide.spec.ts` holds one, `guideOf()`'s 99th
  percentile, under a bound.
  `yarn vitest run --project sim --reporter=verbose src/rules/flight/benchmarks`
  shows the times without the replays and the floors.

## The View

- **The art's specs read one atlas:** `ART_FRAMES`
  (`src/testing/art_frames.ts`), drawn in `ART_PALETTE` at `ART_SCALE`,
  searched with `@fz/phaser/testing/pure`'s `frameNamed()` and `drawnIn()`.
  `looksOf()` gives every look a kind's brick can take, and the file's
  other helpers measure and round what a frame draws.
- **A spec of the layout** takes the canvas a board has in a window from
  `boardCanvas()` (`@fz/brick-wall/testing/canvases`).
- **The field's contrast** is `src/view/colors/contrast.spec.ts`'s for the
  game's own colors, in each palette `PALETTES` (`src/testing/roles.ts`)
  reads from the global stylesheet, and
  `frontend/lib/brick-wall/src/view/contrast.spec.ts`'s for those every
  wall game draws in.

## The Scene

`src/scene/wall_scene.spec.ts` runs the real `WallScene` in a headless
Phaser game. A new case uses what the spec already has:

- **`FakeShell`** plays the shell's part of `WallSceneOptions`. It shows a
  wall standing (`showWall()`) or coming down (`bringDown()`), a fixture's
  round aimed (`aim()`) or let fly (`fly()`), which its ticks play on, or a
  round set by hand reaching events (`reach()`) and beats (`beat()`). It
  keeps the ticks, the steering, the layouts and the commands the scene
  hands it.
- **`startBoard(setUp, canvas)`** runs the scene for a fake shell through
  `@fz/phaser/testing`'s `runKeyedScene()` and draws the first frame. Drive
  it with the run's `advance(ms)`, the keys and the pointer, and the spec's
  own `resizeTo()` and `frameUntil()`.
- **Assert on the painters' pools,** each a public readonly list made once
  (`scene.wall.swellings`, `scene.guide.dots`, `scene.field.countDots`):
  their frames, places, depths and visibility, through the spec's readers
  (`swellAt()`, `placeAt()`, `layerPlaceOf()`) and `@fz/phaser/testing`'s.
- **Read a bake from what it was handed.** The wall and the field are drawn
  on textures of their own, which a headless game draws nothing on.
  `startBoard()` spies on every bake's commands first, `recordBakes()`
  reads those a bake of a key was handed from the moment it is called, and
  `framesAt()` reads the frames the wall's bake shows in a cell.

## The Shell

- **Script the rounds.** `provideSpecPlay(rounds)` (`src/testing/play.ts`)
  hands `GameService` the game's first three levels (`SPEC_LEVELS`), a
  random that always gives the same seed, and a round player.
  `scriptedRounds(...)` plays the rounds named in turn, the last again once
  they run out, each with a fixture's flight and points of the spec's own
  (`SPEC_POINTS`); `SpecRound` names what a round can come to. A spec that
  wants the real rules hands it `playRound()`.
- **Play a frame at a time** with `release()`, `playOut()`,
  `playRoundOut()` and `playUntilCard()`, steered `STILL` or `RELEASE`, and
  `@fz/core/testing`'s `FRAME_MS` and `playUntil()`.
- **Play the flight out before reading the records.**
  `@fz/brick-wall/app/records` keeps a level's clear and a run's end as
  the flight lands, so a spec that reads `StatsService` or
  `ProgressService` plays it out first.
- **Spec what every wall game's shell does in the library.** The round's
  driver, the records and the bug report's state and load are
  `@fz/brick-wall`'s, and their cases go in its specs beside them, in
  `frontend/lib/brick-wall/src/app/`, over its made-up games. This
  workspace's specs hold only its wiring of them: the rules and boon a
  round plays on, its words, the drop, the line and the debug menu, what
  its own stores keep as its flights land, a drop's and a hidden page's
  among them, and what its report keeps and plays again.
- **Wait for what loads on demand.** The shell loads How to play as it
  first opens, and the debug menu where it is offered, through
  `@fz/ui/on_demand`'s `onDemand()`, each load a pending task. So after
  pressing How to play, a spec awaits `whenStable()` before looking in it.
  The menu loads its certificates from `CERTIFICATE_FILES`, which a spec
  hands a file of its own (`filesCertifying()`, in
  `src/testing/certificates.ts`). No pending task holds that load, so a
  spec waits for the menu and its certificates with
  `@fz/brick-wall/testing/settled`'s `loadsSettled()`, and for the game's
  own files, a dynamic import, with `vi.waitFor()`.
- **Hold a load to see what shows meanwhile,** or once a chunk can't be
  fetched. A spec hands `LOAD_HELP` or `LOAD_DEBUG_MENU` a held load
  (`heldLoad()`, in `src/testing/loads.ts`) and lets it `arrive()` or
  `fail()` with `OFFLINE`, collecting the error (`collectErrors()`). Till
  then the load's pending task keeps `whenStable()` and `loadsSettled()`
  waiting, so the spec shows the page with `detectChanges()`, and settles
  only once the load is let go.
- **The board runs on a fake canvas,** `@fz/phaser/testing`'s
  `provideFakePhaserCanvas()`, and the board's own spec also runs its scene
  for real through `runShownScene()`. The `phaser-core` skill covers both,
  with `collectErrors()`, `watchResizes()` and `resize()`.
  `@fz/dev/board-page`'s `readRect()` and `readNamedRects()` read back what
  the board writes for the layout check.
- **The wall doesn't ease until a spec installs a viewport.** jsdom answers
  no media query, so `GameService.motion()` is false until
  `@fz/game-ui/testing`'s `installFakeViewport()` gives the window a size.

## The Saved Game

`src/rules/run/saved_game.spec.ts` keeps a run (`STORED`) and spoils it one
thing at a time (`tampered()`). **A spoil is written once, in the table
named for the check it spoils** (`JUMP_SPOILS`, `PLACE_SPOILS`,
`CREW_SPOILS` and the rest). That check's own spec holds each of its
spoils to failing it, so a spoil can't pass by failing another, and the
reader's spec holds each to being dropped. The checks of the frame every
wall game keeps, and of its wall, are `@fz/brick-wall/rules/saved_wall`'s,
whose spec spoils them the same way over kinds made up for it, so this one
keeps tables only for the game's own: its jumps, and a round's place, crew
and boon. It holds `readStart()` to the library's checks with a few cases
written in its own table, and `restoreGame()` to the stars and points the
game hands in.

## The Mutation Pass

Every change here ends with a mutation pass. It breaks the change one thing
at a time, runs the specs, and names what survived, and why, in the commit's
body:

- **A mutant** is one bound (`<` for `<=`), condition (dropped, inverted or
  always true), constant (halved, doubled, nothing), argument, call or line
  (left out), or order (two layers or painters swapped), in the change's
  own code and in the specs' helpers it trusts.
- **Apply each with `yarn mutants`** (`frontend/tools/mutants.mjs`), from
  the frontend's folder, over a list kept outside the repository: each
  mutant a text replacement that must match once in its file, and the
  project and folder whose specs should kill it (`yarn mutants --help`
  gives the form). It waits its turn in the queue `yarn verify:changed`
  keeps, runs those specs with no mutant in place, then with each, puts the
  file back whether they passed, failed or were stopped, and prints the
  table for the commit's body, a replacement that matched nothing shown as
  such, not as a survivor or a kill. Never stash or check out over the
  change while doing it.
- **Name only the project and folder** whose specs should kill it, which
  the script runs without coverage, as
  `"project": "dom", "folder": "src/scene"` for the scene's, and
  `"project": "pure", "folder": "src/rules/flight"` for the flight's. The
  replays in `sim` say only that a line stopped holding, so a rules mutant
  only they kill still wants a spec in `pure` that names what broke.
- **Every survivor gets a spec** that fails on it. The one exception is a
  mutant equivalent to the code, which no input can tell from it, as `<=`
  for `<` between values that are never equal. Name in the commit's body
  the count, what was killed, and each survivor, with the spec that now
  kills it or why it is equivalent.
