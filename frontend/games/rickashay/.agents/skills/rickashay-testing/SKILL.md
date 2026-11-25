---
name: rickashay-testing
description: How Rickashay's specs run and are written: its Vitest projects, shots flown at walls drawn as pictures, certificates, marks, rally lines and checks, the scripts' kept runs, the scene's fake shell and the shell's scripted rounds. Triggers on: frontend/games/rickashay spec, flyAt, FLIGHT_FIXTURES, certify:levels, report:levels, every_check, LEVEL_MARKS, HELD_AS_RULES, provideSpecPlay, FakeShell.
---

# Testing Rickashay

How Rickashay's specs run, and the helpers they share. What every wall
game's specs do alike is the library's
[`brick-wall-testing`](../../../../../lib/brick-wall/.agents/skills/brick-wall-testing/SKILL.md)
skill's: the certificates replayed and the floors held through
`@fz/brick-wall`'s testing entries, what to do when a replay or a floor
fails, slow specs and the benchmarks, the shell's cases kept in the
library, and the mutation pass. The patterns of every Angular workspace's
specs are the `angular-testing` skill's, the headless Phaser harness is
`phaser-core`'s, and the rules every spec follows are in
`.agents/AGENTS.md`, under "Writing Unit Tests". Paths are relative to
`frontend/games/rickashay/`, where the commands run.

## Commands and Coverage

`vitest.config.ts` sets a spec's project by its folder:

- **`pure`, in Node:** `src/rules/`, `src/view/`, `src/testing/` and
  `tools/`, but for `sim`'s folders. The layout check's inspection is the
  one spec here that lays out a page, in jsdom.
- **`sim`, in Node, never with coverage:** the replays in
  `src/rules/levels/every_level/`, the floors in
  `src/rules/levels/every_floor/`, the checks in
  `src/rules/levels/every_check/` and the benchmarks in
  `src/rules/flight/benchmarks/`.
- **`dom`, in jsdom:** every other spec under `src/`, the scene's and the
  shell's. A spec in a new folder outside those runs here until the config
  names its folder.

Then:

- **Run one spec, or a folder's,** with
  `yarn vitest run --project <project> <path>`. `yarn test` runs the three
  projects once, and `yarn test:coverage` runs `dom` and `pure` with
  coverage, then `sim` without.
- **A line only `sim` reaches counts as untested.** `vitest.config.ts`
  holds the rules and the view to their floor, the scene and the shell to
  theirs, and the helpers held as the rules are to the rules'. The rest of
  `src/testing/`, and `tools/`, are measured with none.
- **A helper that finds or holds a certificate, or that a script loads, is
  held as the rules are.** It goes on `HELD_AS_RULES` in `eslint.config.js`,
  which holds it to the rules' fence and their exact arithmetic, so a line
  found in Node clears its level in every browser, and on the list of
  helpers `vitest.config.ts` holds to the rules' floor. Neither list takes
  a glob. Nothing a script loads may import Vitest, as
  `@fz/brick-wall/testing/holders` and `src/testing/every_level.ts` do, so
  `src/testing/certify_api.ts` keeps its own copy of the floor games' count
  and stride, which its spec holds to the holders'.
- **A helper in `src/testing/` whose answer a spec trusts has a spec of its
  own beside it,** so one that answers wrongly can't let a spec pass that
  tests nothing. A change to one that has none yet adds its spec first.
- **Never edit a file a script writes.** `tools/build-sounds.spec.ts` fails
  while `src/scene/sounds/` isn't what `yarn build:sounds` makes, and the
  checks fail for a mark or a line not as `yarn certify:levels` found it.
  Change the script, or what it reads, and run it.

## The Rules

- **Draw a wall rather than play to it.**
  `wallFrom(rows, WALL_LEGEND, { lowestRow })`, from
  `@fz/brick-wall/rules/level_picture`, lays a wall out from a picture: a
  row of nine of the legend's characters for each of its rows, from the
  top, read against `WALL_LEGEND` (`src/rules/levels/legend.ts`).
- **Fly a shot at it** with `flyAt()` (`src/testing/shots.ts`). Its
  `PictureShot` says what a shot is unless told: on a field `SHOT_DEPTH`
  (11) deep, the picture's lowest row in field row 5, from the floor's
  middle at 45°, by `FLIGHT_RULES` and the game's trait rules. `startAt()`
  gives the round's start and `aimAt()` an aim by its degrees; `eventsOf()`
  picks a flight's events of a kind, `timeless()` drops an event's moment,
  and `near()` matches a number as near as the flight's arithmetic finds
  it. A trait's spec, and any rule's but the flight's and the round's own,
  flies through it rather than call `fly()` itself.
- **The fixtures are worked out by hand.** `FLIGHT_FIXTURES`
  (`src/testing/flight_fixtures.ts`) are rounds made by hand: each a start,
  a shot, the rules it is flown by and the round it plays, worked out by
  the file's own flier as the design's "The flight" says. They fly by
  `STAND_INS`, beside them in `src/testing/`: the game's trait rules, with
  rules made up for the specs where a trait's own is still to write.
  `src/rules/flight/flight.spec.ts` and `src/rules/round/round.spec.ts`
  hold `fly()` and `playRound()` to them, and the view, the scene and the
  shell are specced against them. A change that moves a round means working
  that fixture out again by hand.
- **Every flight is held to checks over seeded random walls.**
  `src/rules/flight/cast_properties.spec.ts` holds `cast()` to a scan of
  every face (`castByScan()`, `src/testing/cast_reference.ts`) and to the
  flights it flies alone (`src/testing/random_flights.ts`).
  `src/rules/flight/guide_properties.spec.ts` and
  `src/rules/round/round_properties.spec.ts` hold `guideOf()` and
  `playRound()` to leaving what they are handed as it was, and to the same
  answer at a wall flown before or never. Each helper's doc says what it
  finds.

## The Certificates, the Marks and the Checks

`yarn certify:levels` writes three files a set in `src/rules/levels/`: the
lines to `certificates/<set>.json`, each shot an aim's index; each level's
par and rally mark on each depth to `marks/<set>.json`; and the lines that
reach the marks to `lines/<set>.json`. A rally mark is the middle of the
best rallies of the careless player's floor games, so it moves with the
games the floors are held to. `--set`, `--level` and `--depth` certify only
those, and write only the files of the sets they touch, each level's par
worked out again from its set's lines.

- **The marks are listed once,** `LEVEL_MARKS`
  (`src/rules/levels/level_marks.ts`). The game's stars read it through
  `GAME_MARKS` (`src/app/tokens.ts`), the replays through `every_level.ts`'
  `MARKS`, and the scripts' kept runs too.
- **`src/rules/levels/every_level/`** replays, on its depth, every level's
  certificate at the par its marks give, and its rally line to its rally
  mark (`rallyLineProblem()`).
- **`src/rules/levels/every_floor/`** holds the careless player to each
  set's floor, `CARELESS_FLOORS` (`src/testing/line_play.ts`).
- **`src/rules/levels/every_check/`** checks each set on one depth, its own
  in `CHECK_DEPTHS` (`src/testing/every_level.ts`), where its levels come
  nearest a check: aims drawn blind clear each level `BLIND_CEILING` times
  in 100 at most (`src/testing/blind.ts`), its sweet spot is
  `LEAST_SWEET_SPOT` or wider (`src/testing/sweet_spot.ts`), and its rally
  mark and line are those its floor games set (`src/testing/rally_mark.ts`).
  One depth a set keeps `sim` inside CI's time.
- **`yarn report:levels`** prints the design's table of the drafts over
  the game's levels on every depth, then a line for each level that falls
  short of a check, and exits with 1 where one does. It plays more games
  than the specs, so the two can disagree either way.
- **The specs that read hand-made marks keep their own:**
  `src/testing/warm_up_marks.json`, which the shell's specs and the run's
  and the stars' specs play on, over Warm-up's levels alone
  (`WARM_UP_LEVELS`). Certifying never moves it, so their figures stay
  worked out by hand.

## When a Replay or a Check Fails

The [`brick-wall-testing`](../../../../../lib/brick-wall/.agents/skills/brick-wall-testing/SKILL.md)
skill's "When a Replay Fails" and "When a Floor Fails" say what to do.
What is Rickashay's own:

- **A replay holds three things:** the level's line, its par in its set's
  marks, and its rally line to its rally mark, which `rallyLineHolds()`
  (`src/testing/rally_mark.ts`) replays rather than the solver. Its message
  says which failed.
- **A rule changed on purpose stales the files of every set whose walls it
  meets.** Certify each such set again (`--set <id>`), read the diff of its
  marks, and say in the change's body which pars and rally marks moved: the
  stars are earned against them. A trait's rule acts only on bricks of its
  kind, so a set whose walls hold none keeps its files.
- **A check that finds a rally mark or line stale** means the floor games
  moved: a change to the flight, to the careless player, to `linePlayOf()`'s
  shots or `wall_score.ts`, or to the level. Certify its set again only
  once that change is meant.
- **A level over the blind ceiling, under the least sweet spot or under
  its floor is redrawn,** as the `rickashay-content` skill's "Redrawing a
  Level" says, and certified again.

## The View

- **The art's specs draw in one palette at one scale,** `ART_PALETTE` at
  `ART_SCALE` (`src/testing/art_frames.ts`), each kind's frames from its
  art's `frames()`, found by `@fz/phaser/testing/pure`'s `frameNamed()`. A
  spec that must hold every scale the art is drawn at takes them from
  `scalesAt()`, at each of `PIXEL_RATIOS`. The file's other helpers measure
  and round what a frame draws.
- **A spec of the layout** takes the canvas a board has in a window from
  `boardCanvas()` (`@fz/brick-wall/testing/canvases`).
- **The field's contrast** is `src/view/colors/contrast.spec.ts`'s for the
  game's own colors, in each palette `PALETTES` (`src/testing/roles.ts`)
  reads from the global stylesheet, and
  `frontend/lib/brick-wall/src/view/contrast.spec.ts`'s for those every
  wall game draws in.

## The Scene

`src/scene/rickashay_scene.spec.ts` runs the real scene in a headless
Phaser game. A new case uses what the spec already has:

- **`FakeShell`** plays the shell's part of `RickashaySceneOptions`. It
  shows a round's view set by hand (`round`, `show()`), or aims a fixture's
  round (`aim()`), which each tick then plays on through the view's
  `RoundPlay`, as the game does. It keeps the ticks, the aims, the
  layouts, the commands and the pictures the scene hands it, and runs
  `inFirstTick` before its first tick plays on.
- **`startBoard(setUp, canvas)`** runs the scene for a fake shell through
  `@fz/phaser/testing`'s `runKeyedScene()` and draws the first frame. Drive
  it with the run's `advance(ms)`, the keys and the pointer, and the spec's
  own `resizeTo()`.
- **Assert on the painters' pools,** each made once: their frames, places,
  depths and visibility, through the spec's readers and
  `@fz/phaser/testing`'s.
- **Read a bake from what it was handed.** The wall and the field are drawn
  on textures of their own, which a headless game draws nothing on.
  `startBoard()` spies on every bake's commands first, through
  `@fz/brick-wall/testing/bakes`' `recordBakes()`, and `framesAt()` reads
  the frames the wall's bake shows in a cell.

## The Shell

- **Script the rounds.** `provideSpecPlay(rounds)`
  (`src/testing/spec_play.ts`) hands `GameService` the game's first three
  levels (`SPEC_LEVELS`), Warm-up's hand-made marks (`SPEC_MARKS`), a
  random that always gives the same seed, and a round player.
  `scriptedRounds(...)` plays the rounds named in turn, the last again once
  they run out, each with a fixture's flight; `SpecRound` names what a
  round can come to. A spec that wants the real rules hands it
  `playRound()`.
- **Play a frame at a time** with `release()`, `playOut()`,
  `playRoundOut()` and `playUntilCard()`, steered `STILL` or `RELEASE`, and
  `@fz/core/testing`'s `FRAME_MS` and `playUntil()`.
- **A level played through as a player plays it** is
  `src/app/played_through.spec.ts`'s: the app, its board, its scene run for
  real and its steering, by the keys, the mouse and a finger.
- **The debug menu's certificates and rally lines** are files a spec
  hands `CERTIFICATE_FILES` and `RALLY_LINE_FILES`: `filesHolding()`, in
  `src/testing/lines.ts`.

## The Saved Game

`src/rules/run/saved_game.spec.ts` keeps a run (`STORED`) and spoils it one
thing at a time (`tampered()`, `tamperedStart()`). **A spoil is written
once, in the table named for the check it spoils** (`TALLY_SPOILS`,
`PLACE_SPOILS`, `SHOT_SPOILS`). The checks of the frame every wall game
keeps, and of its wall, are `@fz/brick-wall/rules/saved_wall`'s, whose spec
spoils them over kinds made up for it, so this one keeps tables only for
the game's own.

## The Scripts

- **A script loads the game's code only through an entry in
  `src/testing/`,** through Vite: `certify_api.ts`, `report_api.ts` and
  `screenshot_api.ts`, the last typed for the scripts by `script_api.ts`,
  which imports nothing. Each is held as the rules are, and its spec holds
  what the script reads of it.
- **The layout check and the screenshots take up a run kept by the
  rules** (`keptRun()`, `src/testing/kept_run.ts`), stored as the game
  stores one by `tools/stored_run.mjs`. The layout check's `LAYOUT_RUN`
  plays a round of level 1 straight up and raises the score to five
  figures, the longest the check holds beside the game's name.
- **The layout check inspects only pages at rest:** a level waiting for its
  first shot and the run taken up paused, with Release with a button off
  and on. A pass that waited on game time, a flight landing or a card,
  would wait on frames, which CI's Chrome draws in software a few a second:
  such a pass takes `@fz/dev/layout`'s `readyTimeoutMs`.
- **The screenshots are taken on a steady clock.** The page runs on frames
  16 ms apart from before its own scripts, and its `Math.random` from a
  seed, so the flight `yarn capture:screenshots` holds 64 frames in stands
  at the same moment every time, and a retake matches to the pixel. Its
  `RUN` plays the first two shots of Gatehouse's certificate on 11 deep,
  which `tools/capture-screenshots.spec.ts` holds. A line certified anew
  there fails that spec until `RUN` takes the new shots, and a change to
  the flight, its pace or its look moves what the images show: retake
  them, and look at them.

## The Mutation Pass

A change to the rules, the view or a helper held as the rules are ends with
a mutation pass, as the `brick-wall-testing` skill's "The Mutation Pass"
says. The replays, the floors and the checks in `sim` say only that a line,
a floor or a mark moved, so a rules mutant only they kill still wants a
spec in `pure` that names what broke.
