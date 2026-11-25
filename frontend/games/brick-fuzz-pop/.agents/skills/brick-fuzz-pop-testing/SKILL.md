---
name: brick-fuzz-pop-testing
description: How Brick Fuzz Pop's specs run and are written, with its three Vitest projects, walls drawn as pictures, its certificates, pars and floors, the scene's fake shell and the shell's scripted rounds. Triggers on: frontend/games/brick-fuzz-pop spec, wallFrom, flyPicture, FLIGHT_FIXTURES, certify:levels, report:levels, every_level, par.json, provideSpecPlay, FakeShell.
---

# Testing Brick Fuzz Pop

How Brick Fuzz Pop's specs run, and the helpers they share. What every
wall game's specs do alike is the library's
[`brick-wall-testing`](../../../../../lib/brick-wall/.agents/skills/brick-wall-testing/SKILL.md)
skill's: what to do when a replay or a floor fails, slow specs and the
benchmarks, the shell's cases kept in the library, and the mutation pass.
The patterns of every Angular workspace's specs are the `angular-testing`
skill's, the headless Phaser harness is `phaser-core`'s, and the rules
every spec follows are in `.agents/AGENTS.md`, under "Writing Unit Tests".
Paths are relative to `frontend/games/brick-fuzz-pop/`, where the commands
run.

## Commands and Coverage

`vitest.config.ts` sets a spec's project by its folder:

- **`pure`, in Node:** `src/rules/`, `src/view/`, `src/testing/` and
  `tools/`, but for `sim`'s folders.
- **`sim`, in Node, never with coverage:** the replays in
  `src/rules/levels/every_level/`, the floors in
  `src/rules/levels/every_floor/` and the benchmarks of `cast()`, `fly()`
  and `playRound()` in `src/rules/flight/benchmarks/`.
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
  `src/rules/flight/flight.spec.ts` holds `fly()`, whole and dropped, in
  seeded batches, to `orderProblemsOf()` and `trackProblemsOf()`
  (`flight_fixtures.ts`) and to `clearanceProblemsOf()` and
  `dropProblemsOf()` (`src/testing/random_flights.ts`).
  `src/rules/flight/cast.spec.ts` holds `cast()` to a scan of every brick
  (`castByScan()`, `src/testing/cast_reference.ts`). Each one's doc says
  what it finds.

## The Certificates and the Floors

- **A certificate,** as the `brick-wall-testing` skill has it, is here a
  line of shots, each an aim's index and a charge. `yarn certify:levels`
  finds them over the game's play of a line (`linePlayOf()`,
  `src/testing/solver.ts`), and writes them to
  `src/rules/levels/certificates/<set>.json`. It writes each level's par on
  each depth, half as many rounds again (`@fz/brick-wall/rules/par`'s
  `parFrom()`), to `src/rules/levels/par.json`.
- **The replays and the floors,** in `src/rules/levels/every_level/` and
  `src/rules/levels/every_floor/`, are the `brick-wall-testing` skill's,
  through `src/testing/every_level.ts`. A replay plays its line through
  `playRound()` and holds its par to `par.json`. The careless player plays
  over `linePlayOf()`, and must clear each level at least `CASUAL_FLOORS`
  times in 100, its games the first `playCasually()` plays for the report.
- **`yarn report:levels`** plays 40 games a level unless `--seeds` says
  otherwise, on the floors' three depths or each `--depth` given, and
  marks `!` a level under its floor.
- **The screenshots' run follows its certificate.** The screenshots and
  the layout check's second pass hand a page a run kept by the rules
  (`keptRun()`, `src/testing/kept_run.ts`), stored by
  `tools/stored_run.mjs`. `tools/capture-screenshots.spec.ts` holds the
  screenshots' `RUN` to the first shot of its level's line on its depth. A
  line certified anew there with another first shot fails it until `RUN`
  takes that shot and `yarn capture:screenshots` runs again.

## When a Replay or a Floor Fails

The [`brick-wall-testing`](../../../../../lib/brick-wall/.agents/skills/brick-wall-testing/SKILL.md)
skill's "When a Replay Fails" and "When a Floor Fails" say what to do.
What is Brick Fuzz Pop's own:

- **A replay holds the line and its par in `par.json`.** If its message
  says only that the level's par isn't the one its certificate earns, the
  line clears its level and `par.json` is stale against `parFrom()`, as
  when `PAR_SHARE` is retuned. Certify any one level again
  (`--level 1 --depth 11`): that keeps every other line and writes every
  level's par from every line.
- **A level with no line,** or one under its floor on its own seeds, is
  redrawn from its courses, as the `brick-fuzz-pop-content` skill's
  "Drawing It" says, or eased, and certified again.
  `yarn report:levels --depth <n>` plays a floor spec's games and more.

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
- **Its specs hold only its wiring of the library's driver, records and
  report:** the rules and boon a round plays on, its words, the drop, the
  line and the debug menu, what its own stores keep as its flights land, a
  drop's and a hidden page's among them, and what its report keeps and
  plays again.
- **The debug menu's certificates** are a file a spec hands
  `CERTIFICATE_FILES`: `filesCertifying()`, in `src/testing/certificates.ts`.
- **How a spec plays the flight out before reading the records,** waits
  for what loads on demand or holds a load, runs the board on a fake canvas
  and gives the window a size, is the `brick-wall-testing` skill's "The
  Shell".

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

Every change here ends with a mutation pass, as the `brick-wall-testing`
skill's "The Mutation Pass" says, its survivors named in the commit's body.
