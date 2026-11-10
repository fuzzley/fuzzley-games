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

### K3: the aims

**2026-11-10.**

**What was built.**

- `tools/build-aims.mjs`: writes `src/rules/aims.ts`, each of the 657 aims'
  heading as `[dx, dy]`, `Math.cos()` and `Math.sin()` of
  `(FIRST_AIM_DEGREES + aim / AIMS_PER_DEGREE) × π / 180`, each number
  written with `String()`. It takes the three numbers from
  `src/rules/tuning.ts`, which Node 26 loads with its types stripped, and
  exports `aimsSource()`, the file's text, `degreesOf()`, `angleOf()` and
  `AIMS_FILE`. `tuning.ts`'s opening comment says Node loads it so, which
  keeps it to syntax Node can strip and to imports of types.
- `src/rules/aims.ts`: `AIMS`, a `readonly (readonly [dx, dy])[]`, 657
  pairs, 29,793 bytes, in the form Prettier gives it, so the root's format
  check passes it as written.
- `src/rules/aims.spec.ts`: 657 pairs; aims 0, 1, 3, 328 and 656 at 8°,
  8.25°, 8.75°, 90° and 172°; each pair exactly its angle's cosine and sine
  in this Node, each a unit long within 1e-15, each a quarter of a degree
  from the one before by the headings alone (their dot product within
  1e-15 of cos 0.25°); and the file byte for byte what `aimsSource()` makes
  now.
- `package.json`: `build:aims`, and `lint` covers `tools`.
- `tsconfig.spec.json`: `allowJs`, so the spec takes the script's types
  from its JSDoc.
- The workspace's `AGENTS.md` names the aims, the script and its command.

**Choices the plan didn't make.**

1. **The export is `AIMS`,** a list indexed by aim, each pair a labelled
   tuple, `[dx: number, dy: number]`.
2. **Each heading is Node's cosine and sine of its own angle,** nothing
   more: aim 328, straight up, is `[6.123233995736766e-17, 1]`, and aim
   656 − i mirrors aim i only to within 3e-16 (aim 0's `dy` ends …6544,
   aim 656's …6574). The plan asks no more; a stream that wants
   mirrored walls to play exactly mirrored would make the script write the
   left half as the right half's negatives, and the spec would still hold.
3. **The spec rebuilds the file in memory** by importing the script, so a
   change to the script, the tuning or Node's `Math.cos()` fails it until
   `yarn build:aims` is run. The specs may use `Math.cos()`, which the
   rules' lint ignores in specs; the script is linted as a script.
4. **The spec holds each number to its cosine or sine exactly,** not
   within the plan's 1e-15, which it implies: a number written with fewer
   digits than `String()` writes, which wouldn't read back as Node's,
   would still lie within 1e-15. The spec runs in the Node that wrote the
   file, and a Node whose `Math.cos()` moved would fail the byte check
   anyway.
5. **`tsconfig.spec.json` takes `allowJs` and nothing more.** Brick
   Breaker's `tsconfig.node.json` also sets `noEmit` and
   `allowImportingTsExtensions`, but `noEmit` in the specs' config stops
   Analog's plugin, which compiles with it, emitting the shell's component,
   and the shell's spec failed. Without them, `tsc` still resolves the
   script's import of `tuning.ts` and types it.

**Checks.** The workspace's `lint`, `typecheck`, `test` and
`test:coverage` pass: 427 tests in 12 files, the rules and the view at
100%; the script at every line but its `import.meta.main` branch, which
`yarn build:aims` runs. `yarn workspace brick-fuzz-pop build:aims` leaves
the file's bytes as they were (the same SHA-256 before and after, and a
clean tree after the commit). The root's `yarn lint` passes.

**The mutation pass.** Fourteen mutants. Twelve changed the script and
rebuilt the file with it, so the file matched the script and only the
numbers' specs stood in the way: one aim short, the first aim a degree up,
aims a fifth of a degree apart, a degree's four aims alike (by its degrees
or by its headings), degrees over 181, cosine and sine swapped, cosines
written to 14 places or to 16 digits, sines to 16 digits or rounded to 32
bits, and each pair the next aim's. Two left the other side alone: the
script changed with the file not rebuilt, and the file edited by an ulp
(aim 328's `dx` to 0). All fourteen were killed. The four aims alike and
the 16 digits are the review's; the first pass, of ten, had let them
through, as the review found.

**The review:**

1. **The specs would pass with a degree's four aims alike,** since the
   cosine and sine specs took their angles from the script's `angleOf()`,
   pinned only at whole degrees. Fixed: `degreesOf()` is pinned at aims 0,
   1, 3, 328 and 656, and each heading is held a quarter of a degree from
   the one before by the headings alone.
2. **Nothing held the numbers "to the bit".** Fixed: the cosines and sines
   are held exactly (the fourth choice).
3. **`tuning.ts` didn't say Node loads it as it is.** Fixed: its opening
   comment does.

### K2 tidied: the faces named once, and the fixtures' walls drawn by `wallFrom()`

**2026-11-10.**

**What changed.** The tidy-ups of K2's contract files that R1's review
asked of the integrator (its first two comments), made by the integrator's
spare, and the workspace's `AGENTS.md` brought up to what R1, R5, A1 and
U3 built:

- `Brick.plates`' doc comment, in `src/rules/wall/wall.ts`, no longer says
  which of `SIDE`'s bits faces the floor: it calls the plates a set of the
  `FieldFace` bits `src/rules/grid.ts` names, where the mapping is said
  once. It names the file rather than linking the type, since `grid.ts`
  imports `wall.ts`.
- `src/rules/levels/legend.spec.ts`, the levels' folder's, edited here as
  the integrator's: its plated cases spell their plates with `grid.ts`'
  `FLOORWARD`, `CEILINGWARD`, `LEFT` and `RIGHT` rather than `SIDE`'s bits,
  and its comment points at `grid.ts` rather than restating the mapping.
  The same five cases, and 71 tests, as before.
- `src/testing/flight_fixtures.ts` draws its eleven walls with
  `wallFrom(picture, { lowestRow })`, and its own `wallOf()` and `brickOf()`
  are gone, with the imports only they used. Its opening comment names
  `wallFrom()`. Every fixture's wall was one `wallFrom()` draws, so none was
  left as it was: the two made a brick alike (whole, the legend's plates,
  the tint `wallRow % 8` for a plain or tough brick and 0 for any other, no
  twin), no fixture holds a portal, and each picture's rows are nine wide,
  which `wallFrom()` alone checks. A fixture that needs a portal's twin now
  needs `wallFrom()` to draw one, which R1's seventh choice leaves to X2.
- `AGENTS.md`: the grid and its faces, `lowerWall()` and `isCleared()`,
  `src/view/colors/` with `FIELD_ROLES`, `wallPalette()` and `TINT`, and the
  settings drawer, which nothing opens yet; a list of what the specs share
  in `src/testing/`, the fixtures, `wall_picture.ts` and `roles.ts`; and a
  "What It Keeps" naming `brick-fuzz-pop-settings`, as
  `frontend/games/AGENTS.md` asks every game to list its keys.

**The fixtures, compared.** Before the change, a script bundled the
fixtures with esbuild and wrote each fixture's `start`, `round`, `shot` and
`levelBoon` with `JSON.stringify()`, 84,663 bytes for the eleven; after it,
the same script, its bundle now drawing with `wallFrom()`, wrote a file
identical byte for byte (the same SHA-256).

**Checks.** The workspace's `lint`, `typecheck`, `test` and
`test:coverage` pass: 1,150 tests in 20 files, as many as before; the rules
and the view at 100%, and the fixtures' file at 99.65% of statements, the
one throw left unreached `sure()`'s, for a fixture drawn wrong, now that
`brickOf()`'s has gone. The root's `yarn lint` passes, its reference check
finding every backticked path of `AGENTS.md`.

**The mutation pass.** None, for a change to docs and a refactor of
fixtures whose output is compared byte for byte above.

**The review:** a fresh agent found the code correct, the legend's spec
still able to fail (`grid.spec.ts` ties each face to its `SIDE` bit, the
legend's spec each plate to a face), and every other claim of `AGENTS.md`
true of the code.

1. **`AGENTS.md` said `src/view/colors/` holds every ink the field draws,
   mixed from the page's roles,** where the tints and the friends are the
   mode's own inks and the shading is A2's art's. Fixed: `wallPalette()`
   gives a palette's colors from the roles and the mode's tile and fuzzball
   inks, every color a rule of contrast covers, but not the shading.
2. **Nothing said `wall_picture.ts` is held as the rules are,** which
   whoever adds `?` (R3) or the portals (X2) to `wallFrom()` should know.
   Fixed: its line in `AGENTS.md` says so, and why.
3. **"What It Keeps" sat after "Tests",** where the breakers, Snake and
   Sudoku put it before the commands. Fixed: it follows "Layers".
4. **The legend's spec's comment read as the field's own faces.** Fixed:
   "A plate covers a brick's faces, as grid.ts names them."
5. **Beyond this change:** R5's `lower.spec.ts` keeps a copy of its own of
   `wallOf()` and `brickOf()`, a third, which its eighth choice leaves for
   R6 or a later package to move onto `wallFrom()`. Left: the file is the
   proof stream's.
