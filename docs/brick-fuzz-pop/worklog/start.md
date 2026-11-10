# Work log: Brick Fuzz Pop, the start (K1–K3)

The start of Part 2, from [`implementation-plan.md`](../implementation-plan.md)'s
§6: the workspace (K1), the contracts every stream codes against (K2) and
the aims (K3), built by one agent standing in for the integrator.

## Part 2's start

### K1: the workspace

**2026-11-10.**

**What was built.** `frontend/games/brick-fuzz-pop/`, from Brick Breaker's
and Asteroid Breaker's:

- `package.json` (`brick-fuzz-pop`, private, the same dependencies as the
  breakers) with only the scripts whose tools exist: `dev`, `start`, the
  three builds, `preview`, `test`, `test:coverage`, `test:watch`,
  `typecheck`, `lint` and `lint:styles`. `build:aims` and the rest join with
  the packages that write their tools.
- `vite.config.ts`: `gameConfig({ port: 9006, name: "Brick Fuzz Pop" })`.
- `vitest.config.ts`: Asteroid Breaker's four floors, on the rules and the
  view (100/95/100/100), the scene (98/92/100/99) and the shell
  (98/97/97/98); coverage over `src/**/*.ts` and `tools/**/*.mjs`, as
  Asteroid Breaker's measures its helpers and scripts with no floor; `pure`
  over `src/rules`, `src/view`, `src/testing` and `tools`; `sim` over
  `src/rules/levels/every_level` and `src/rules/levels/every_floor`.
- `eslint.config.js`: Asteroid Breaker's blocks, with
  `phaserGameLayers({ heldAsRules, exact: true })` and the nine held files
  §5.1 names, and Asteroid Breaker's block that holds the other specs'
  helpers to Angular by type alone.
- The tsconfig solution (app, spec, node, scripts) and
  `stylelint.config.js`, as Brick Breaker's.
- `src/test-setup.ts`: the headless Phaser, TestBed, the dialog polyfill,
  Asteroid Breaker's `document.fonts` stub and a store in memory for each
  test.
- `index.html`, with the game's description and its structured data but no
  link preview image, which T2 captures.
- `src/main.ts` and an `AppComponent` whose `<main>` holds the game's name
  as its heading, on `@fz/game-ui`'s global stylesheet, and its spec.
- `LICENSE`, `README.md`, a short `AGENTS.md` describing only what exists
  (the layers' fences, the exact arithmetic, the commands, the projects and
  the floors), and `CLAUDE.md`.
- `frontend/yarn.lock` gains the workspace. `games.json` doesn't list it,
  and the site's catalog doesn't name it, until U2.

**Choices the plan didn't make.**

1. **The held files are filtered to those that exist.**
   `phaserGameLayers()` throws for a held file the workspace doesn't have,
   so `eslint.config.js` lists all nine of §5.1's (`HELD_AS_RULES`) and
   holds those written so far (`HELD`). Each is held from the commit that
   writes it, with no edit to the config. The cost is the library's check
   for a missing file: a helper written under a name the list doesn't have
   is held by nothing, and lints as quietly as a held one. So the
   integrator checks each new file of `src/testing/` against the list as
   it merges the package that writes it, and once all nine exist (the last
   is `screenshot_api.ts`, at T2) the filter goes and `HELD_AS_RULES` is
   handed on as it is.
2. **`test:coverage` runs `sim` with `--passWithNoTests`.** Vitest exits
   with 1 when a project it is asked for finds no spec, and the two `sim`
   folders don't exist until P3. `yarn test` runs every project at once and
   passes with `dom`'s spec alone. P3 drops the flag in the commit that
   writes the first `sim` spec, so a folder renamed on one side only fails
   again rather than running the replays in `pure`, under coverage.
3. **`lint` names no `tools` folder yet.** ESLint fails on a path that
   matches nothing, so K3 adds `tools` with its first script.
4. **`tsconfig.spec.json` is Brick Breaker's,** without Asteroid Breaker's
   `rewriteRelativeImportExtensions`, which only a spec importing
   `@fz/dev/layout` needs. V1 asks for it with its layout spec.
5. **The repository's and the frontend's lists of games don't name it
   yet.** D1 does, as `frontend/games/AGENTS.md`'s "Adding a game" asks
   once the game is one.
6. **The shell is Asteroid Breaker's first one,** its name in a `<main>`
   at the middle of the page, on `@fz/game-ui`'s global stylesheet, as
   Brick Breaker's is now, rather than `@fz/style`'s alone.
7. **`frontend/games/AGENTS.md` gives 9006 to Brick Fuzz Pop** and
   says the next game takes 9007, since the workspace now takes 9006. The
   rest of that file's list of games waits for D1.

**Checks.** The workspace's `lint`, `typecheck`, `test` and
`test:coverage` pass: one spec, 100% of the shell's two statements; `sim`
finds no spec and passes. `build` writes `dist/` with `game.json` naming
"Brick Fuzz Pop", 95 KB of script (31 KB gzipped). `yarn workspace
brick-fuzz-pop dev` served the page on port 9006 (on `localhost`, which is
`::1` here), and headless Chrome found the `main` landmark and its heading
"Brick Fuzz Pop", with no error in the console. The root's `yarn lint`
passes.

**The mutation pass.** K1 has no logic of its own to break: the shell is
a template, and the configs are the presets'. The checks themselves were
tried instead: `sim` without `--passWithNoTests` exits with 1, as the
second choice says.

**The review:**

1. **The filter of held files turns the library's check for a missing
   file off, with no end.** Fixed: the config's comment and the first
   choice now say a misnamed file is held by nothing, that the integrator
   checks each new helper against the list as it merges, and that the
   filter goes once all nine exist.
2. **`--passWithNoTests` has no end either.** Fixed: the second choice
   says P3 drops it with the first `sim` spec, and why.
3. **The names were the wrong way round.** `HELD` named the nine and
   `SCRIPT_HELPERS`, Asteroid Breaker's name for what its scripts load, the
   files held. Fixed: `HELD_AS_RULES` is §5.1's list and `HELD` those
   written.
4. **`frontend/games/AGENTS.md` still said the next game takes 9006.**
   Fixed in this commit (the seventh choice).
5. **The entry lacked its commit and its review.** The review is this
   list. The task this log is kept for asks for no commit hashes, so the
   entries leave them out; the commits are found by their subjects.

### K2: the contracts

**2026-11-10.**

**What was built.** Every type and name of §5.3 and §5.4 that K2's file
list covers, with the few functions it asks for, each specced:

- `src/rules/tuning.ts`, `shot.ts` (`Charge`, `Boon`, `Aim`, `Shot`,
  `isAim()`, `isCharge()`), `wall/wall.ts` (`Brick`, `Wall`, `Thirds`,
  `thirdsOf()`), `round/round.ts` (`Crew`, `RoundStart`, `RoundResult`,
  `RoundOutcome`, `Round`, `RoundRules`, `RULES`, and a `playRound()` that
  throws "Not yet: R6 writes playRound().") and `flight/events.ts` (the
  events, `Waypoint`, `BallTrack`, `Flight` and `positionAt()`).
- `catalog/bricks.ts` (`BrickTrait`, `BrickKind`, `BRICK_KINDS`,
  `BrickKindId`, `BRICK_KIND_IDS`) with `kinds/warm_up.ts`, the brick,
  tough, steel and the row and column zappers, and empty `sparks.ts`,
  `tricks.ts` and `thick_walls.ts`; `catalog.spec.ts`.
- `levels/legend.ts`: a character for each of the sixteen kinds' bricks,
  C12's among them.
- `src/view/field/field_metrics.ts` (`FieldShape`, `FieldMetrics`),
  `src/view/effects/effects.ts` (`SOUNDS`, `SoundName`),
  `src/view/art/frames.ts` (`FRAMES`, the builders of the 59 frame names,
  `FrameName` and `FRAME_NAMES`), `src/view/round_play.ts` (`RoundView`) and
  `src/view/run_state.ts` (`RoundPhase`).
- `src/testing/flight_fixtures.ts`: `FLIGHT_FIXTURES`, eleven rounds made
  by hand (a plain shot, a punch, a punch through the wall to the ceiling,
  a row zapper's zap and the jump it earns, a column zapper's, a hot shot's
  bounce off the floor, a triple shot, a friend, a bored fuzzball's yawn, a
  level cleared and one lost), each with its start, shot, level boon and
  `Round`, the next start worked out from its events; `orderProblemsOf()`,
  which holds a flight's events to `Flight.events`' order, for R3 to hold
  `fly()` with; and `trackProblemsOf()`, which holds its tracks to its
  events.
- The workspace's `AGENTS.md` says what the rules, the view and the
  fixtures now hold.

**Choices the plan didn't make.**

1. **Kind ids are camel case:** `brick`, `tough`, `steel`, `rowZapper`,
   `columnZapper`. The legend names the other eleven (`crossZapper`,
   `xZapper`, `bomb`, `wool`, `cage`, `bumper`, `prism`, `portal`,
   `plated`, `shell`, `moss`), and `legend.spec.ts` assigns
   `BRICK_KIND_IDS` to `readonly LegendKindId[]`, so a kind cataloged under
   an id the legend doesn't use fails to compile.
2. **`points` is per hit the brick had whole,** before the streak's
   multiplier: 10 for the brick and for each of a tough brick's hits, 30 for
   a zapper, 0 for steel. A break scores `points × full × multiplierAt()`.
   So plan.md's "50 for a cage", whose cage has two hits, is `points: 25` in
   X1's entry, as `BrickKind.points`' doc comment says.
3. **A zapper's `reach`** is `COLUMNS` for a row and `MOST_DEPTH` for a
   column, as far as the ceiling of the deepest field; rows over the
   ceiling are out of play anyway.
4. **The catalog adds** `brickKind(id)`, `isBrickKindId()`,
   `hasTrait(id, kind)`, `TraitKind` and `TraitOf` to §5.3's names. The
   three empty sets are `{} as const satisfies` the record, which keeps
   `BrickKindId` the five ids.
5. **The legend's entries** are `LegendBrick`s, `{ kind, hits, plates }`,
   `kind` a string, since eleven kinds aren't cataloged yet, with
   `LegendKindId` the kinds it names; `NO_BRICK` is `"."`. C12's spare
   characters are `T` (a shell of 3), `V` (plated floorward, 3) and `^`
   (plated ceilingward, 2).
6. **Plates are `SIDE`'s bits,** whose `top` is the face toward this
   field's floor, as §5.2's y-down rows have it. `legend.ts` names
   `FLOORWARD` and `CEILINGWARD` for itself until R1's `grid.ts`, where §5.2
   states the mapping once; R1 replaces them with its own.
7. **`Brick.tint`** is the row's tint for a plain or tough brick, a
   portal's pair (0 or 1, drawn `portal-<tint + 1>`) for a portal, and 0
   otherwise; `hits` is 0 for a kind that never breaks.
8. **`thirdsOf()` throws a `RangeError`** for a depth that isn't a whole
   number from 11 to 22. `jumpLine` is `depth − jump`, the row the jump line
   runs under the top third at, and `opensOn` is `depth − 2 × jump`.
9. **`positionAt()` makes a new `Waypoint` each call** and, at a moment two
   waypoints share, answers the later, where the fuzzball flies on from. V3
   may want one that writes into a record it is handed.
10. **What the events say:** a strike's `charge` is what the fuzzball flies
    on with, and `earthed` is true only when the brick took a charge the
    fuzzball had, never a hot shot's; a strike on steel takes no hit and
    leaves none. A zap's `reaches` lists, by cell, the bricks it takes hits
    off, so steel isn't among them. A break's `streak` counts the round's
    breaks, this one among them, and its `points` are scored at that
    streak.
11. **The order at one moment:** the fuzzballs' events first, then the zaps
    that land then, by cell, since §5.3's rule doesn't place a zap among
    the fuzzballs'. A turn goes before the strike it came with, as the
    kinds' order has it, and a free right after its cage's break.
12. **`land`'s `x` is where the middle touched the floor,** the track's
    last place. The next round's `x` holds it `SIDE_MARGIN` off the side
    walls, as the fixtures do and R6 will.
13. **The outcome:** `points` counts the jump's `JUMP_POINTS`; `rowsDown`
    is 0 once the level is cleared; `next` is made when the level is
    cleared or lost too, as `Round.next` says, its wall keeping each brick's
    cell, broken and sunk bricks null and `lowestRow` down by `rowsDown`.
14. **`playRound()`'s parameters start with `_`,** which lint's rule for
    unused arguments asks of a stub.
15. **`FieldMetrics`' rectangle is the cells,** 9 by `depth` in device px,
    the ceiling at `y`, and `css` the same in CSS px. `ArtScale` comes from
    `@fz/phaser/shapes` and `CssRect` from `@fz/phaser/layout`.
    `fieldShape()`, `fieldMetrics()`, `toCanvas()` and `toField()`, and
    with them `Viewport`, are V1's.
16. **`RoundView.events` is an `EventLogView<LoggedEvent>`,** a
    `LoggedEvent` being `{ serial, event }`, the flight's own event
    numbered. §5.4's `EventLogView<FlightEvent>` doesn't compile, since the
    log numbers its records, and its records are filled in place: a union
    of readonly events couldn't be, and a record reused for another kind
    would keep the old kind's fields. So V3 points a record at the next
    event, and readers read `record.event`.
17. **`round_play.ts` and `run_state.ts` are written,** though K2's list
    doesn't name them, since §5.4 spells out `RoundView` and `RoundPhase`.
    `RunState`, whose fields wait on R7's run, is V3's; the scene's
    options, `KindArt` and `BRICK_ART` are S1's and A2's.
18. **Frames:** `Ink` is 0 to 7, so `friend-0` to `friend-7`, for answer
    5's eight inks; 59 names in all.
19. **`tuning.ts` holds the rest of plan.md's numbers** beside §5.3's six:
    the aims (657, from 8°, 4 a degree), `FIRST_X`, `LAUNCH_GAP`,
    `TRIPLE_MATES`, `MOST_FRIENDS`, `MOST_FUZZBALLS`, `BORED`,
    `MOST_FLIGHT`, `STILL_TURNS`, `HOT_BOUNCES`, `ZAP_HITS`, `ZAP_DELAY`,
    `GUIDE_PAST_TURN`, `AT_ONCE`, `JUMP_POINTS`, `STREAK`, `STAR_POINTS`,
    `TWO_STARS_PAST_PAR` and `PAR_SHARE`. `RULES` hands on only `bored`.
20. **The fixtures:** fields 11 deep but the bored one's, 22; walls drawn
    from pictures in the legend's characters, a plain or tough brick in the
    tint `wallRow % 8`; a hot shot launched at charge 5, `hot`, whatever
    was charged; a bored fuzzball's yawn at 60 units from its launch, then
    a drop straight down. A character of a fixture's picture that is no
    cataloged kind's throws, rather than leaving a gap. `trackProblemsOf()`,
    beyond what K2 asks, holds each track to unit speed within 1e-9 but at
    a portal, each place to an event, the launch and landing to the track's
    ends and the landing to the floor, each heading to a unit long and
    within 1e-9 of its next leg's line, `length` to the last landing and
    `capped` to a count.
21. **A fuzzball that turns again where it stands,** at the same moment, as
    `STILL_TURNS` counts, turns at one waypoint, and only its last turn
    there heads along the next leg; its turns come before its strikes, as
    the kinds' order has it.

**Checks.** The workspace's `lint`, `typecheck`, `test` and
`test:coverage` pass: 416 tests in 11 files, the rules and the view at
100% of statements, branches, functions and lines; the fixtures' file at
99.3% of statements, the throws for a fixture drawn wrong never reached.
The root's `yarn lint` passes. `legend.spec.ts` compared a legend character
to `NO_BRICK`, which the compiler rejected; it now checks
`isKeyOf(NO_BRICK, LEGEND)`.

**The mutation pass.** 71 mutants, one at a time: 10 on `thirdsOf()`'s
bounds and arithmetic, 12 on `positionAt()`, 25 on the ordering checker and
24 on the track checker. 64 were killed at once. Five survivors got specs:
`positionAt()` searching one waypoint short (now a landing whose last leg
rounds, 4.5 + (0.1 − 4.5)), a strike's break not following a break of a
higher cell (two strikes at a moment), the yawn and the landing swapped in
the kinds' order (every kind at one moment), a landing off the floor, and
the earlier of a portal's two places (a turn as a fuzzball comes out).
Two are equivalent: `positionAt()`'s search starting at the first waypoint
rather than the second, and halving up rather than down, both find the
same waypoint.

The review's fixes were mutated too: 9 mutants of the heading check and
the still turns, of which three survived. Two got specs (a turn followed
by a strike at its moment, and a turn as another fuzzball turns), and one
is equivalent: a heading square to a leg of no length, which a turn never
has, as the later of two shared waypoints is the one it turns at.

**The review:**

1. **The checkers failed flights R3 will write: still turns and short
   legs.** Fixed: a still turn keeps one waypoint, and only its last turn
   is held to the next leg (choice 21); a heading is held to a unit long
   and to the leg's line, by how far the leg's end lies off it, so a short
   leg's rounding doesn't count. Specs: two turns at one place and moment,
   a leg of a millionth of a unit at moment 100, headings aslant and back.
   The order the reviewer called natural, turn, strike, turn, strike, is
   not §5.3's: its rule puts a fuzzball's events at a moment in the kinds'
   order, so turns first, which the checker already takes.
2. **Nothing held a fixture's events to its own wall.** Fixed: a picture's
   character that is no cataloged kind's throws, and a spec replays each
   fixture's strikes, zaps and breaks on its start's wall (hits taken and
   left, each zap's reach, each break's kind and its brick at 0).
3. **`FlightEvent & NumberedEvent` couldn't be filled in place.** Fixed:
   `LoggedEvent` (choice 16).
4. **The cage's 25 a hit was nowhere said.** Fixed: choice 2 and
   `BrickKind.points`' doc comment.
5. **Nits.** The spec that took a turn out of a portal was named "finds",
   now "takes"; the banner comments are gone; choice 6 says R1 replaces the
   legend's `FLOORWARD` and `CEILINGWARD`.
