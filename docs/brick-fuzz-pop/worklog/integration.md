# Work log: Brick Fuzz Pop, integration

The log of [`implementation-plan.md`](../implementation-plan.md) as it is
built: what each package built, where it went other than planned and why,
what the checks reported, each review comment and what became of it, and
the numbers worth keeping. This file is the integrator's; each stream keeps
its own beside it (`rules.md`, `proof.md`, `art.md`, `view.md`), so no two
agents write the same file. The whole folder is deleted once the game is
built and ready to merge into `main`, as the user asked on 2026-11-10; the
commits that delete it hold it.

## How the work runs

- **Branches.** Part 1 is built on `brick-fuzz-pop-lift`, cut from `main` at
  `9fbc77ad`. Part 2 is built on `brick-fuzz-pop`, cut from its tip once Q1
  passes (§7.4). Nothing is pushed and nothing reaches `main` without the
  user's word.
- **Worktrees.** Each branch has a worktree of its own under
  `/home/dev/Projects/personal/bfp-wt/`, with its own `yarn install` (8 s
  from the cache): `integration/` holds the integration branch, and
  `rules/`, `proof/`, `art/` and `view/` hold the streams' `bfp/<stream>`
  branches. The main checkout stays on `main`, untouched, since another
  session's files sit in it.
- **Streams.** One agent per stream, as §7.2's table gives them, each with
  its packages by id, §5's contracts, §7.3's files and a reminder never to
  push or touch `main`. Each runs its own checks with `--maxWorkers=4`, and
  only the integrator runs a full `yarn verify`.
- **Reviews.** Every commit, in every stream, follows the
  `commit-review-process` skill: the change staged, a fresh
  `general-purpose` agent reviewing it with only the project's and the
  package's context, every comment answered in the stream's log, then the
  commit.
- **Merging.** The integrator rebases each finished stream onto the
  integration branch in the order the plan lists, runs the touched
  workspaces' checks, and fast-forwards, so the history stays linear. A
  phase's last merge runs `yarn verify` and `yarn check:layout`.
- **Q3 is the user's.** The build stops after U2 and T1 for the user to
  play the first nine levels, as `plan.md`'s QA table says.

## Part 1: the lifts

### Wave 0 started (2026-11-10)

- `brick-fuzz-pop-lift` cut from `main` at `9fbc77ad`, with this log as its
  first commit.
- Baselines taken on `9fbc77ad` for Q1: Brick Breaker's `report:levels` and
  Asteroid Breaker's `report:waves`, kept in the session's scratchpad to be
  compared with the same reports after the lifts.
- The streams: rules L1 and L6, proof L2 and L7, art L4 and L5, view L3 and
  L8.

### L1, L6, L2 and L7 merged (2026-11-10)

- **The rules stream** (L1, L6) was fast-forwarded onto
  `brick-fuzz-pop-lift`: `d8681067` (`@fz/core/sweep`, Brick Breaker on it)
  and `cd70fd15` (`variantOfSpec()`). Its log is `rules.md`. Brick Breaker's
  `report:levels` after L1 is byte-identical to the baseline.
- **The proof stream** (L2, L7) was cherry-picked on top: `f2417b44`
  (`phaserGameLayers({ exact })`) and `87fad841` (`allOrNone`). Its log is
  `proof.md`. No conflicts: it touches only `frontend/lib/dev/`.
- **Where the lifts went other than planned,** both taken as they stand:
  - `sweepPoint(move, x, y, reach)` takes the reach as an argument, and
    `sweepCorner()` hands it `move.r`, so Brick Breaker's results are the
    same to the bit.
  - `variantOfSpec(file, variants, folder)` takes the folder as a third
    argument, since both games already checked it, and allows numeric
    variants, so P3 can name its files for depths. The plan's L6 row still
    shows two arguments: L9 updates it.
- **Left for L9:** the `fuzzley-ui` skill's `@fz/core` row (sweep and
  `variantOfSpec()`), the `phaser-core` skill on `exact`,
  `frontend/AGENTS.md`'s "Check the Layout" on decks shown all or none, and
  core's `AGENTS.md` saying the sweep is exact by review.
- **The streams' scratch files** collided in the session's shared
  scratchpad, so each now keeps its own subfolder there.

### K1–K3 started early (2026-11-10)

K1 needs only L1 and L2, so K1, K2 and K3 started on `bfp/start`, cut from
`87fad841`, while the art and view streams still build L3, L4, L5 and L8.
Their commits move onto `brick-fuzz-pop` once Part 1 is whole and Q1
passes, so the critical path doesn't wait on the last lifts. Their log is
`start.md`.

### L9: the docs

- **Date.** 2026-11-10.
- **What changed,** each against the code it describes, on
  `brick-fuzz-pop-lift` with all eight lifts:
  - `frontend/lib/core/AGENTS.md`: the sweep's rule already said it is
    exact by review and held by its bit-identity spec; it now says why no
    lint holds it, as `phaserGameLayers({ exact })` covers only a game's
    own files.
  - `frontend/lib/phaser/AGENTS.md`: the shared inks are the numbers Phaser
    takes, which a shell writes with `cssHex()`; and `outlineRoundRect()` is
    meant for an atlas, since a WebGL `Graphics` thins a path's points, as
    the `phaser-core` skill says.
  - `.agents/skills/phaser-core/SKILL.md`: the `@fz/dev` bullet names
    `exact`, "Phaser 4's surprises" gains the path threshold, with
    `outlineRoundRect()`'s band as the case it breaks, and the triggers
    gain the inks, the areas, the drivers, exact arithmetic and the
    threshold.
  - `.agents/skills/fuzzley-ui/SKILL.md`: triggers for the sweep,
    `variantOfSpec()`, the inks, the areas, `<fz-debug-tuning>` and the
    three icons, and the description names `@fz/phaser`'s shared inks and
    areas; the `@fz/phaser` row names the shapes and inks, the paragraph
    under the table names `@fz/core/sweep` and `variantOfSpec()`,
    and "Reach for the library first" gains a row each for the inks, the
    areas, the sweep and a spec's variant. The `@fz/ui` and `@fz/game-ui`
    rows were already true.
  - `.agents/skills/angular-testing/SKILL.md`: the `@fz/phaser/testing`
    bullet names L8's drivers. The `@fz/core/testing` bullet already named
    `variantOfSpec()`.
  - `frontend/AGENTS.md`: "Check the Layout" says a deck fails for a zone
    it must show, and that one shown all or none may show none.
  - `frontend/games/AGENTS.md`: the copy of core's list names its spec
    helpers, the frame loop and `variantOfSpec()`, which the breakers took
    up in place of copies; its one short line is rewrapped.
  - `brick-breaker-testing`: the scene spec drives the mouse's other
    buttons and a touch the browser takes away, as L8's cases do.
  - `docs/brick-fuzz-pop/implementation-plan.md`: §4's L6 row takes three
    arguments and numbers; P3 passes its folder; A2's outlines are one
    command each, filled rightly once baked; S1 says an outline reaches the
    screen through the atlas, or needs the game's threshold at 0, pointing
    to `phaser-core` for why, and that `dashes()` gives `{ from, to }`
    pairs; S2 names the drivers; U1 writes the bricks' and the friends'
    inks as CSS with `cssHex()`; and a new §13 lists what each lift built
    differently and the games' names it took.
- **Left as they were:**
  - `@fz/dev`'s, `@fz/ui`'s and `@fz/game-ui`'s `AGENTS.md`, both breakers'
    `AGENTS.md`, `brick-breaker-content`, `asteroid-breaker-content` and
    `asteroid-breaker-testing`: each lift's stream brought them up to date,
    and each sentence on the lifts holds against the code.
  - Solitaire's `solitaire-testing` names no `pointer()` argument.
  - A1 calls neither `outlineRoundRect()` nor `dashes()`, and takes the
    inks as they were built.
  - The rest of §4, §1's and §4's names of what the lifts took
    (`LIGHT_INKS`, `speedOfSpec`, `tuning.service.ts` and the rest), and
    "L2 spelled out" and "L3 spelled out", are Part 1's history; §13 says
    what was built and that those names are gone. The L6 row alone is
    updated, as the merge of L1 and L6 above leaves it to L9, since P3
    reads its signature. "L3 spelled out"'s sentence on Asteroid
    Breaker's no-records rule stays: whether Brick Breaker takes the rule
    is the user's question.
  - `plan.md` names Brick Breaker's `src/rules/sweep.ts` as what L1.1
    takes from, which is history; `implementation-plan.md` is the newer,
    and its §13 says what was built.
  - Asteroid Breaker's `src/view/colors/inks.ts`, which the skills still
    name, keeps its rocks' inks.
- **Checks.** The root's `yarn lint`, `skills:check` among it, passes,
  before the review and after its fixes. No code changed, so no
  workspace's typecheck or tests were run.
- **The review.** A fresh agent checked each changed sentence against the
  code, Phaser's source among it, and found §13's eight items, the plan's
  package edits, the drivers, the sweep and `variantOfSpec()` rows and the
  entries left as they were all true.
  1. The path threshold was imprecise: a `Graphics` thins strokes too,
     compares each point with the last one it kept, across and down, in
     screen pixels, and its own `pathDetailThreshold` can only raise the
     game's (`GraphicsWebGLRenderer.js` takes the larger), whatever
     Phaser's doc says; and the band loses its join only where its line is
     no wider than the threshold. Fixed in `phaser-core`, which now says
     each. `areas.ts`'s doc comment stays: it names the game's
     `render.pathDetailThreshold` rightly, if less exactly, and this
     change edits code only where a comment is untrue.
  2. §4's L6 row was rewritten where the rest of §4 is kept as history.
     Left: the merge of L1 and L6 above leaves the row to L9, since P3
     reads the signature there, and §13 records the change; the entry now
     says so.
  3. The `@fz/phaser` names were triggers of `fuzzley-ui` alone, though
     `phaser-core` documents them. Fixed: `phaser-core`'s triggers gain
     them, the drivers and the threshold; `fuzzley-ui` keeps its own, for
     the rows it gained, and its description now names the inks and areas
     those rows cover.
  4. The threshold was explained in four places. Fixed:
     `lib/phaser/AGENTS.md` and S1 point to `phaser-core`, and S1 keeps
     only what the package must do. `areas.ts`'s comment stays, as above.
  5. §13 said "the packages … that call it" of the lifts, and that every
     name §1 and §4 give is gone, though Asteroid Breaker's
     `src/app/tokens.ts` and `src/view/debug_tuning.ts` stay. Fixed: "that
     use them", and the paragraph says those two stay, holding `TUNING`
     and `Feel`.
  6. Nits:
     - `frontend/games/AGENTS.md` rewraps five lines. Left: the short line,
       left by L1, is in the paragraph this change edits.
     - `frontend/AGENTS.md`'s parenthetical repeats `@fz/dev`'s rule. Left:
       "Check the Layout" lists what fails, and a deck shown all or none
       that shows none doesn't, which the merge above left to L9;
       `lib/dev/AGENTS.md` keeps the rule whole.
     - Core's "reads only a game's own files" is "covers only". Fixed.

  The fixes correct the change rather than reshape it, so it had no second
  review.

### L3, L4, L5 and L8 merged (2026-11-10)

- **The art stream** (L4, L5) was cherry-picked as `d26ef28a` (the inks)
  and `cc4287a9` (the areas). `outlineRoundRect()` was reshaped into one
  polygon after its first review found a seam in the baked atlas, and had a
  second review. Asteroid Breaker's `dashedRing()` stays as it was, since
  `dashes()` didn't make it shorter. Its log is `art.md`.
- **The view stream** (L3, L8) was cherry-picked as `cb2401fc` (the debug
  menu) and `9ba915e9` (the icons and drivers). `SceneRun.pointer()`'s
  fourth argument is now an options object, `{ on, button }`, and a mouse
  event carries the buttons held, so Solitaire's three calls changed with
  it. Its log is `view.md`.
- **Held for the user:** Brick Breaker's ball-speed slider is now reached
  at `?debug` in a production build, and a run at a slower ball still keeps
  its records. L3 asked Brick Breaker only for its tokens and the slider, so
  the rule Asteroid Breaker keeps (a run on retuned numbers keeps no
  records) was not added to it; adding it changes Brick Breaker's saved
  game. The question goes to the user at Q3.
- All eight cherry-picks applied without a conflict.

### L10: Q1 (2026-11-10)

- **`yarn verify`** on `9ba915e9` passes: every workspace's lint,
  typecheck, tests and the build. Among them `@fz/core` 367 tests,
  `@fz/dev` 529, `@fz/game-ui` 330, `@fz/phaser` 706, `@fz/ui` 315, Brick
  Breaker 2,000 (`dom` and `pure`; its `sim` runs in `test:coverage`),
  Asteroid Breaker 5,219, Solitaire 6,874.
- **`yarn check:layout`** holds every shape and turn for Sudoku, Snake,
  Brick Breaker and Asteroid Breaker, in 18 s.
- **The reports** are byte-identical to the baselines taken on `9fbc77ad`:
  Brick Breaker's `report:levels` and Asteroid Breaker's `report:waves`.
- **In a browser** (headed Chrome), both games at `?debug` in the
  production build (`yarn preview`): the menu sits in Settings, each slider
  moves its number and its `aria-valuetext`, Reset puts them back, Copy
  copies, and with the clipboard stubbed out it says so and opens the
  lines. Without `?debug` there is no menu. A level of each was cleared by
  keys, by mouse and by touch in its dev server, the bar's Pause froze it,
  and Brick Breaker's Finale and Asteroid Breaker's rings were looked at in
  two palettes each: no wrong ink, seam or missing dash. Neither console
  logged an error or warning.
- **Noticed, not changed:** nothing in Asteroid Breaker says that a run on
  retuned numbers keeps no records, as before the lift; its lines in the
  debug drawer scroll sideways.
- **Q1 passes.** Part 1 is whole on `brick-fuzz-pop-lift` at the commit
  that records this.

## Part 2: the game

### Wave 1: K1, K2 and K3 merged (2026-11-10)

- `brick-fuzz-pop` was cut from `brick-fuzz-pop-lift` at `df83b1cd`, the
  commit that records Q1, and `bfp/start`'s three commits were
  cherry-picked onto it: `d8aa9333` (K1, the workspace), `ea3dc646` (K2,
  the contracts) and `28f33174` (K3, the aims). Their log is `start.md`,
  which lists every decision K2 made about the contracts; the streams are
  pointed at it.
- On the integration branch: the workspace's lint and typecheck pass, its
  427 tests pass with coverage at 99.28 / 97.15 / 100 / 99.5 (the rules and
  the view at 100%), and `build:aims` leaves the tree unchanged.
- **K2 differs from §5.4 in one name:** `RoundView.events` is an
  `EventLogView<LoggedEvent>`, a `{ serial, event }` record, since
  `@fz/core`'s log numbers its events and `EventLogView<FlightEvent>`
  doesn't compile.
- **What the integrator checks at each merge:** a new file under
  `src/testing/` against `eslint.config.js`' `HELD_AS_RULES`, since the
  config holds only the held files that exist; P3 drops `test:coverage`'s
  `--passWithNoTests`.
- **A1 started before K2 landed,** since it needs only K1 and L4; the art
  stream rebases before A2.

### Wave 2 started (2026-11-10)

- **Five streams, not four.** The plan's view-and-shell stream was split:
  `view` builds V1–V4 and a new `shell` stream builds U3–U6 beside it
  (`bfp/shell`, its log `shell.md`), since §6 says two agents can share
  U3–U6, they own different folders from V1–V4, and the integrator's own
  hands are free until wave 3. The machine had 17 GB free with the four
  Part 1 streams running, so a fifth fits; certification still runs alone.
- **Each stream stops after every commit** and reports; the integrator
  merges it onto `brick-fuzz-pop` and replies with the next package, and
  tells a stream to rebase when it needs another's work (R5 before R6, R6
  before P2, R7 before U4).
- **The rules every stream keeps** (worktree, ports, contracts, the review,
  the log) were written once for all five, so each brief holds only its
  packages.

### A1 merged (2026-11-10)

- `d4f0283a`, fast-forwarded: the field's palette from the page's roles,
  the special kinds' own inks, and contrast held to 3:1 in all four
  palettes (480 cases). The workspace has 948 tests, coverage 99.34 / 97.2
  / 100 / 99.54.
- Where the palette departs from the art: the fuzzball's eyes, steel's frame
  and rivets and the wool's stitches are cut out in the field's color, since
  the art's colors fall under 3:1 in Soft pastel; steel is 0.6 of the text
  over the field so a cage's bars keep 3:1.
- **For Q3:** the coral friend sits 6 to 7.5 CIE76 from the hot shot in
  three palettes, and the violet one 9.4 from Soft pastel's accent. Which
  friend gets which ink is the rules' choice; the user may want to see it.
- `FIELD_ROLES` is in `src/view/colors/palette.ts`, not the board, for U1.

### R5 merged (2026-11-10)

- `350b24df`, cherry-picked: `src/rules/wall/lower.ts`' `lowerWall(wall,
depth)`, returning `{ wall, rowsDown, jumped, sunk, lost }` and calling
  `regrow()` itself, and `isCleared()`. 1,061 tests, coverage 99.36 / 97.37
  / 100 / 99.56. A spec brings down all eleven of K2's fixtures' walls to
  their next walls.
- Until X2 catalogs the portal, R5's specs stand steel with a twin in its
  place. The rules stream was told what R6 gets from it.

### R1 and U3 merged (2026-11-10)

- **R1**, `eaaa1532`: `grid.ts` (faces, corners, cells, `brickAt()`,
  `brickBox()`, `shapeOf()`, `boxesIn()`) and `src/testing/wall_picture.ts`'s
  `wallFrom()`, which `eslint.config.js`' `HELD` now holds, as
  `HELD_AS_RULES` names it. The legend takes `grid.ts`' face names. 1,115
  tests. The spec-only `?` kind waits for R3, since `Brick.kind` is a
  `BrickKindId`; R3 may hand `fly()` the catalog so a spec can give it one.
- **Asked of the integrator by R1's review:** `Brick.plates`' doc to point
  at `FieldFace`, `legend.spec.ts`' comment and names, and the fixtures to
  draw with `wallFrom()`. Kept for an integrator commit to K2's files.
- **U3**, `c1fb0942`: the settings drawer, `<app-settings>` (`open` in,
  `closed` out), with `Aiming` (`byPointer`, `pullBack`, `pointAndHold`) and
  `FlightSpeed` (`normal`, `fast`) in `settings.service.ts`, since V2 and V4
  aren't in yet; U1 maps them onto steering and speeds. 1,150 tests. The
  shell stream adds `src/app/styles/_index.scss` in U5.

### K2 tidied (2026-11-10)

- The integrator's commit, built in the `start` worktree as R1's review
  asked: `Brick.plates`' doc points at `grid.ts`' `FieldFace`,
  `legend.spec.ts` uses `grid.ts`' face names, and the fixtures draw their
  eleven walls with `wallFrom()`, each fixture's start and round
  byte-identical before and after. The workspace's `AGENTS.md` now covers
  the grid, the wall's descent, the colors, the settings and the testing
  helpers. Its log is in `start.md`.
- R5's `lower.spec.ts` keeps its own `wallOf()`; the proof stream is asked
  to move it onto `wallFrom()`.

### V1 and U5 merged; N1 moved to the shell stream (2026-11-10)

- **V1**, `4c6cc264`: `fieldShape()`, `fieldMetrics()`, `toCanvas()` and
  `toField()` (the last two can write into a record they are handed), with
  the constants the board and the scene share (`MARGIN_CSS_PX`,
  `FLOOR_BAND`, `LINTEL`, the panels' gap and width), `hasRoom()`,
  `bandPixels()` and `lintelPixels()`, and `src/testing/canvases.ts`. Its
  first review's fixes reshaped `fieldMetrics()`, so it had a second. 2,154
  tests; its spec checks every row of the table of shapes.
- **For S1, U1 and T1:** the 2 px frame sits in the canvas's margin, not
  the room; the panels come from `metrics.panels`, which can differ from
  `shape.panels` mid-flight; T1's `--down` is depth + band + lintel.
- **Watch at T1:** a one-pixel resize keeps the depth and the unit at
  every shape of the table at a pixel ratio of 1, but at 2 a small phone on
  its side sits a pixel below a step.
- **U5**, `89b4b840`: How to play, `<app-help>` (`open` and `pictures` in,
  `closed` out), every brick from the catalog, the letter keys named by
  where they sit, and `src/app/styles/_index.scss`. 2,174 tests. Its key
  codes (`KeyF` held, `KeyX`, `KeyP`, `KeyR`, WASD as the arrows) were sent
  to the view stream for V2's controls.
- **N1 moved from the art stream to the shell stream,** which would
  otherwise wait for R7 before U4; the art stream's chain (A2, a large
  package, then A3) is the longer one before S2.

### P1 merged (2026-11-10)

- `321ce8bd`: Warm-up's nine walls parsed from their pictures
  (`level.ts`, `levels.ts`, `warm-up.json`, `levelStart(level, depth)`),
  held to every rule a level keeps, a sealed brick found by a flood fill;
  `isBoon()` added to `shot.ts`; R5's spec moved onto `wallFrom()`. 2,347
  tests. All 36 drafts parse but for kinds not yet cataloged.
- **Decided:** a level's own legend and grid of tints, which `plan.md`
  allows and no draft uses, stay unsupported; `unknownKey()` refuses them
  loudly until a level needs one.
- `wall_picture.ts` gives the portal's `&` another tint than `tintOf()`;
  the rules stream moves `wallFrom()` onto `tintOf()` in its next commit.
- Left for X1 and X2: specs of `sealedIn()` for blasts, X zaps, portals and
  plates, which it handles but nothing yet holds.

### N1 merged; V4 moved to the shell stream (2026-11-10)

- **N1**, `69c428c6`: the twenty sounds synthesized into one sprite
  (`src/scene/sounds/sounds.wav`, 8.35 s, 267,244 bytes, the same SHA-256
  every build) by `yarn build:sounds`, a spec holding the sprite's map to
  `SOUNDS` (in `tools/build-sounds.spec.ts` until S1's scene spec takes it),
  and `soundLab()` in the Vite config, with eight scenes of a round, to tune
  the sounds at Q3. 2,351 tests.
- **V4 moved from the view stream to the shell stream,** which would
  otherwise wait for R7 again; it sits beside the sounds (the lab's break
  detune moves onto V4's `detuneOf()`), and the view stream keeps V2 and V3.

### R2 merged (2026-11-10)

- `516f0a8a`: `cast()`, walking the field a unit at a time, held on 2,000
  seeded random walls to `src/testing/cast_reference.ts`, a scan of every
  brick, with `src/testing/stand_ins.ts` standing in for the bumper and the
  portal until X2. `BrickKinds` added to the catalog and
  `src/rules/flight/benchmarks` to `sim`. Then `b0e1757e`: `wallFrom()`
  tints through `tintOf()`. Fast-forwarded; 2,380 tests and the benchmark.
- **The benchmark:** `cast()` median 2.7 µs, p99 20–24 µs; a scan of every
  brick median 46–62 µs, p99 524–675 µs.
- **Left to R3:** portal crossings, the spec-only `?` kind, and whether
  `fly()` gathers a contact within `AT_ONCE` just past a cast's limit.
- **For X2:** `wallFrom()` gives portals `twin: null`; the pairing is
  `levels.ts`' private `twinsOf()`.
- **For the integrator:** the workspace's `AGENTS.md` names the flight's
  benchmark under `sim`.

### A2 merged; S1 started early (2026-11-10)

- **A2**, `a071a318`: the bricks' art for the first five kinds, nine files
  at 100%, the atlas 518 × 778 at 128 device px a unit (21 frames), baking at
  every unit from 1 to 16 device px at ratios 1 to 3. Two review rounds; the
  second found an odd-width outline a pixel off-centre, a crack within 1 px
  of a pip at 38 px a unit, and the inside-the-tile spec ignoring the tile's
  rounded corners, all fixed, the specs now trying every whole unit from 30
  CSS px to 128 device px. 2,612 tests.
- **S1 started** in a sixth worktree, `bfp/scene` (log `scene.md`), since
  V1, A2 and K2, all it needs, have landed. Wave 3's S1 and S2 are the
  integrator's in the plan; an agent builds them for it. The machine had 17
  GB free and a load of 8 with five streams running.

### V4 merged (2026-11-10)

- `5f1160df`, from the shell stream: `src/view/effects/effects.ts`'
  `FlightEffects` (`begin(boon)`, `effectsOf(event)`), `beatEffectsOf()`,
  `detuneOf()`, `createFrameSounds()` and `flourishesOf()`; `flourish.ts`'s
  overshooting ease and its scales; `timing.ts`' `STEP_MS` (260),
  `JUMP_MS` (480), each flourish's duration, `clearedDelayMs()` and
  `resultDelayMs()`. The sound lab's break detune now reads `detuneOf()`.
  2,712 tests.
- **Decided, no contract changed:** §6's `effectsOf(event)` can't tell a
  punch from a plain break, nor a bumper from steel, from one event, so it
  is a method of a reader that goes through the flight in order and reads
  each fuzzball's turn at the strike's moment; K2's order rule (a turn
  before its strike) is what makes that sound, so a `punched` field on the
  strike isn't needed. `begin()` needs the round's boon, which `RoundView`
  doesn't carry, so V3's `RoundPlay` owns the `FlightEffects`.
- The shake is a camera shift in CSS pixels (`shakeOf()`), not Phaser's
  `camera.shake()`; the result card waits 500 ms even without motion.
- The shell stream builds U4's level choice and result card against narrow
  inputs while R7 is built; `stats/` and U6 follow R7.

### V2 merged (2026-11-10)

- `3384017d`: steering. `controls.ts` (`FieldCommand`, the keys by
  `event.code`, matching C7 and How to play's table), `steering.ts`
  (`Steering`, `Steer`, `PointerView`, each pointer aiming its own way, pull
  back with a dead zone and notches, point and hold, the wheel a quarter
  degree, a cancelled touch, a second finger or a lost pointer calling the
  shot off). Two reviews, since the first's fixes reshaped point and hold.
  2,872 tests.
- **Decided:**
  - `Steering.read()` needs where the fuzzball waits, which §5.4's scene
    options don't give, so S2 adds a `waitingX()` option fed from V3's run
    state.
  - **C8 is met in the steering, not in `GameService`:** `keyDown()` takes
    Escape and calls a building charge off, and lets it through to pause
    otherwise, since only the steering knows a charge is building. U1 adds
    no `command()` override, but specs both cases end to end.
  - `PointerView` has no `downTime` or `upTime`: a held press flies at the
    charge the meter showed, timed by the frames, as Space is.
- `MOST_FINGERS` is read only by the scene, so S2's spec holds it.

### R7 and U4's first part merged (2026-11-10)

- **R7**, `cfb6b894`: the run (`run.ts`: `createRun`, `startLevel`,
  `pause`, `resume`, `nextLevel`, `takeRound` at a release and `landRound`
  when the flight lands, the level's end waiting in `run.ending` so the last
  flight can be paused), `scoring.ts`, `stars.ts` (`MOST_STARS`, par read
  from a stub `par.json` the same at every depth until P3), `describe.ts`,
  `progress.ts`, `stats.ts` (with the private `withLowerCount()` for rounds)
  and `saved_game.ts` at version 1. `FRIEND_INKS = 8` added to `tuning.ts`.
  Two reviews; 3,195 tests, every file of `run/` at 100%.
- **U4's first part**, `c75145ee`: `<app-levels>` (each set's levels, their
  stars and best, from plain `marks`) and `<app-result>` (the result card at
  a run's end), both taking inputs only. 3,225 tests.
- The proof stream builds `wallScore()` while R6 is built; the shell stream
  builds `stats/` and U6 on R7.

### U4's second part merged (2026-11-10)

- `7bde6bfb`: `StatsService` (stored as `brick-fuzz-pop-stats`, version
  1; `recordEnd()` asks `isNewBest()` before `withRunEnded()`),
  `ProgressService` (`brick-fuzz-pop-progress`, version 1) and
  `levelMarksOf()` for the levels dialog, which now takes `MOST_STARS` from
  `run/stars.ts`. 3,244 tests.
- **For U1:** the services read `LEVELS` until U1's `GAME_LEVELS` token; a
  run on retuned numbers records nothing in either store.
- **For the integrator's next docs commit:** the workspace's `AGENTS.md`
  gains both stores under "What It Keeps", `src/app/stats/`, `levels/`,
  `run/`, `src/view/effects/`, the sounds, `build:sounds`, the sound lab and
  the flight's benchmark under `sim`.

### P2's first part merged (2026-11-10)

- `f27bab27`: `src/testing/wall_score.ts`' `wallScore(round, rounds)`,
  the sketch's `score()` as C13 spells it, its nine constants named, held
  as rules. 3,260 tests. The solver and the careless player wait for R6's
  `playRound()`; with them the proof stream adds `lowestNeededRow()` beside
  `lower.ts`' `isNeeded()`, so the danger, the jump and the solver's margin
  read one rule.

### A3 merged; U1 split across streams (2026-11-10)

- **A3**, `1eaf55bb`: `fuzzball_art.ts`, the fuzzball at charges 0 to 5
  (the fur turning out, 6% longer a charge, straight from charge 3, sparks
  at 5 only), the hot shot under four tongues of flame, a friend in each of
  the eight inks, and one eyes frame, each outlined in the mark. The atlas
  has 37 frames, 712 × 892 at 128 px a unit; a bake draws about 15,600
  shapes, so the scene bakes once per unit and palette. `frames.ts` gained
  `INKS`, `PIPS`, `CRACKS`, `CHARGES` and `FRAMES.eyes` (60 names). Two
  reviews; 3,365 tests.
- **U1 is split** so its parts run beside S1 and V3: the art stream builds
  the panels (`src/app/panels/`), the shell stream the bar's pieces after
  U6, and a fresh agent the core (`GameService`, the board, the wiring) once
  S1 and V3 land.

### U6 merged (2026-11-10)

- `f56e4f35`: `SavedGameService` (`brick-fuzz-pop-game`, version 1),
  keeping the run under way as each round is released and taking it up
  again, paused, as the page loads (C9), over `KeptGame` and its
  `KEPT_GAME` token. 3,379 tests. U3–U6 are all in.
- **For U1's core:** `GameService` implements `KeptGame` and provides it
  as `KEPT_GAME`; `nextStart` is the flying round's `round.next`, set in
  the same turn as the run at a release, or `restoreGame()` refuses the
  save and the run is lost; something injects `SavedGameService` at
  startup, as Brick Breaker's `main.ts` does in an app initializer.
- The shell stream builds U1's bar next.

### S1 merged (2026-11-10)

- `68648646`, fast-forwarded: `wall_scene.ts` in Brick Breaker's order
  over `@fz/phaser/scene`'s helpers, `atlas.ts` (baked once per palette
  and unit, and on a restored context), `FieldPainter` (the frame, the
  band, the lintel, the jump line in dots of three, the danger line) and
  `WallPainter` (a pool made once, the wall eased down by `wallDrop`).
  `src/scene/` at 100%; two reviews; 3,482 tests. The game builds (95 KB
  of script until U1 mounts the scene).
- **The one stand-in left** is `Guide` in `src/scene/stand_ins.ts`, until
  R6; `tick` gets a fixed unsteered `Steer` until S2 brings `Steering` and
  `waitingX()`.
- **For V3:** `wallDrop` is 1 while the wall is still; a wall that comes
  down is handed over at once with `wallDrop` 0 and eases to 1.
- **For U1:** `onLayout` hands over the whole `FieldMetrics`; `Pictures` is
  `{ bricks }`, which U5's `HelpPictures` takes whole; the lintel's "N rows
  waiting" is DOM.
- **Asked:** the proof stream exports `neededBelow()` with its coming
  `lowestNeededRow()`, so the scene's jump count and the announcer share
  it. The scene stream closes S1's open items (the danger line's warning,
  `browserKey`'s missing keys, the sprite-map case left in
  `build-sounds.spec.ts`) while V3 is built.

### R3 merged; `Flight.length` to change (2026-11-10)

- `e4463e21`: `fly()` flies a round's fuzzballs on one clock, many from the
  start, with the hooks (`spawn`, `teleport`, `kick`, zaps waiting their
  turn) driven by stand-in kinds that exist only in the specs (`PRISM`,
  `WOOL`, `CAGE` in `stand_ins.ts`), boredom and the caps, the hot shot's
  bounce, and the random flights (`src/testing/random_flights.ts`): every
  flight ends, none passes a cap, no fuzzball nearer a box than its radius,
  the events in order, the tracks at unit speed. One fuzzball on a random
  wall: median about 40 µs, p99 about 1.4 ms. 3,561 tests.
- **Decided in R3:** a cast runs to its limit plus `AT_ONCE`, a contact at
  or before the limit met with all at once with it, one only past it left
  for the next move; a portal lets a fuzzball out at its twin's middle,
  since leaving at the edge overlapped a neighbour's box; `fly()` takes the
  trait rules, with no default; the landing's x is unclamped and R6 clamps
  `next.x`.
- **A contract changes:** `Flight.length` was the last landing's `at`, but
  a zap chain can still be landing after it, so §5.5's skip would cut it.
  It becomes the later of the last landing and the last event, in
  `events.ts`, the checkers and `fly()`. The rules stream makes it as a
  commit of its own before R4; the view stream writes V3's skip against
  `length` as the end of everything.

### V3 merged, and the scene's spec brought up to it (2026-11-10)

- **V3**, `df40ae45`, from the view stream: `round_play.ts`' `RoundPlay`
  (a level's rounds played back a frame at a time on `FLIGHT_PACE`, fast
  forward, skip and the wall's step and jump, its end at `flight.length`)
  and `run_state.ts`' `RunState`, `newRunState()`, `withFrame()` and
  `withNewsSaid()`. `RoundView` gained `rowsDown` and `beats`, and
  `LoggedEvent` its `effects`; one log serves the whole level. Two reviews.
- **It broke the integration branch's typecheck:** S1's scene spec, written
  before it, built a `RoundView` without the two new fields. The
  integrator's commit after it gives the spec's `viewOf()` both, rows down
  passed by `bringDown()` as the review asked; 3,703 tests. A field added to
  a contract's type must be added to every spec that builds one, so such a
  change now goes out to every stream that builds the type.
- **For U1:** `PlayOptions.pace` is `FLIGHT_PACE` until U2's sliders; the
  settings' `FlightSpeed` is the view's, so U1 imports the view's.
- **For the rules:** the zap event doesn't say how many hits it takes, so
  the view takes `ZAP_HITS`, which `catalog.spec.ts` holds every zapper to;
  X1's bomb may want the event to say it.
