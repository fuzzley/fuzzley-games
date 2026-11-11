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

### The bar and the AGENTS.md refresh merged; U1's core begun (2026-11-10)

- **U1's bar**, `b418c13f`, from the shell stream: `<app-bar>` with the
  level, the rounds against par, the rows left, the score and the crew,
  and `button[appFastForward]` and `button[appSkip]` beside Pause. Every
  action is a round button at every size, since labelled ones overran the
  home link at 1,200 px with a crew of seven; New game moves into the
  overflow menu on compact screens. 3,766 tests.
- **The workspace's `AGENTS.md`**, `6be0a541`, built in the `start`
  worktree: a Layout section, every folder written so far, all four stores
  and the commands.
- **U1's core** goes to the view stream (`GameService`, then the board and
  the wiring), which wrote what `GameService` holds; the shell stream
  builds the board's cards and the lint change that lets the bar's four
  `eslint-disable` comments go.

### `Flight.length` changed (2026-11-10)

- `5f0e0c27`, made by the rules stream for the integrator:
  `Flight.length` is the last event's `at`, the last landing's or the last
  zap's when a zap chain outlasts every fuzzball, in `events.ts`, `fly()`,
  `trackProblemsOf()` and §5.3's comment in the plan. A spec flies a shot
  into a row zapper one row off the floor, landing at 1 and its zap at 1.5.
  No fixture's length moved. A skip can now land zaps with no fuzzball in
  the air, and such a zap can clear a level.
- One spec failed in the first `test:coverage` run after the merge and
  passed in two runs after it, with six agents running specs on the
  machine; likely a timeout under load. The output wasn't kept, so the
  integrator's runs now keep theirs, to name the spec if it fails again.

### U1's panels merged (2026-11-10)

- `cb7c8b8c`, from the art stream: Coming next and In this wall beside a
  wide room's field, `src/app/panels/`, their inks from `cssHex()`, their
  glass off since a blur redone every frame costs frame time; `fuzzball-eyes`
  joins the plan's §5.4 table. Two reviews; 3,797 tests.
- **For U1's wiring** (sent to the view stream): the panels sit outside the
  `role="application"` element, or a screen reader's browse mode never
  reaches them; their places are computeds; In this wall's `lit` lights the
  boon's badge while a shot carrying it is aimed.
- The art stream builds U2's debug section next, standalone; its wiring
  and the site's listing come after U1 and S2.

### S1's open items merged; S2 begun (2026-11-10)

- `c706e2e3`, from the scene stream: a needed brick in row 1 gets a
  warning frame, a danger-colored band baked with `outlineRoundRect()`,
  coming down with the wall; while one stands there the danger line turns
  solid and twice as thick. The scene spec covers P, X, R and the keypad's
  Enter; `build-sounds.spec.ts`' sprite-map case went to the scene spec.
  3,814 tests.
- **Decided, for the user at Q3:** the danger line "brightens" by weight,
  not by a brighter red, which would lose contrast on the light fields and
  need a new palette role.
- **Asked of the proof stream:** export the danger rule beside
  `isNeeded()`, `lowestNeededRow()` and `neededBelow()`, so `describe.ts`,
  the scene and the view's danger beat read one rule.
- **For the docs pass:** `@fz/phaser/testing`'s `browserKey()` gives every
  letter and digit its key code from the code itself; `lib/phaser/AGENTS.md`
  and the `phaser-core` skill say it throws for a code its table lacks,
  which led the scene stream to think P, X and R were missing.
- S2 begun on the scene stream, its guide on a stand-in shaped as R6's.

### The bar's lint names, the board's cards and the round's view merged (2026-11-10)

- `776a44eb`, from the shell stream: `eslint.config.js` names the bar's
  attribute-selector components and its template's allowList for
  `bar.component.html` alone, so the four `eslint-disable` comments in
  `src/app/bar/` go. A `chore`, being config only.
- `d25aeca5`, from the shell stream: `<app-board-card>` with the Ready,
  Paused and Cleared cards, handed `card: BoardCard | null` and the help
  pictures, giving `resumeRun` and `nextLevel`; the stars from
  `starsFor()`. The crew row moved into `src/app/bar/crew.component.ts`,
  shared by the bar and the Cleared card. 3,843 tests.
- `961ed28d`, from the view stream, not yet reported when merged: the
  counterpart of S1's follow-ups. `RoundPlay` keeps `wallDrop` at 1 while
  the wall stands still, hands over the next wall at 0 as a flight ends,
  and another wall each frame a brick changes, two copies taking turns so a
  frame allocates nothing. 3,847 tests.
- **For U1's wiring** (the shell's notes): `newKind` is the kind whose
  `firstLevel` is the level's number; the card reads the board's
  `--margin`, and the board projects `<fz-canvas-cards>` into it; on
  `resumeRun` and `nextLevel` the board takes the focus back; Cleared shows
  only when another level follows.
- **A gap the plan left:** no card showed once a lost run's result was
  closed. Asteroid Breaker's board shows "ended" then, with New game; the
  shell stream adds an Ended card next, then U2's site listing.

### R4 merged (2026-11-10)

- `6379bec0`, from the rules stream: `strike()` works out the Charge rule
  for one strike from the `hurts` and `earths` flags a brick's rules leave;
  `fly()` calls it, its flights unchanged. `NEVER_RULE`, `EARTHS_RULE`,
  `ZAPS_RULE` (row and column; blast, cross and x throw with their levels),
  `notUntil()` and `TRAIT_RULES`, the later traits throwing with the levels
  plan.md's table gives. `src/testing/flights.ts` is a specs' helper, not
  held as the rules: it is off `HELD_AS_RULES` rightly. 3,890 tests.
- **The rules stream's choice, kept:** an earthed strike never passes
  through, even on a brick it breaks. Plan.md's Charge has steel, a plate
  or a bumper earth the charge and turn the fuzzball, and its brick table
  says a strike on a plated face "does nothing", so no kind yet breaks on
  an earthed strike.
- R6 next, now the critical path; its commit brings the workspace
  `AGENTS.md`'s rules section up to date for R4 and R6.
- Two `vitest` workers of the view worktree's `round_play.spec` runs were
  left spinning, orphaned, for 40 and 98 minutes; stopping them was refused
  in auto mode, then done at the user's word.

### The Ended card merged (2026-11-10)

- `397e6744`, from the shell stream: `EndedCard` joins `BoardCard`, a lost
  level (`outcome: "over"`, its level, name and score) with "Try again from
  level N", or the last level cleared (`"won"`) with New game; outputs
  `tryAgain` and `newGame`, named as the result's are. The result and the
  card share their words from `src/app/result/end_words.ts`. 3,906 tests.
- **Decided:** over a closed lost result, `RunLifecycle`'s `go()` (Enter or
  a tap) and its private `toggle()` (P) call `newGame()`, the wrong move
  under "Try again". No library change: `command()` is public, so
  GameService overrides it for this alone, taking "go" and "toggle" over a
  closed lost result and calling `tryAgain()`. C8 stays in the steering's
  `keyDown()`, as decided at A2/S2, so this is GameService's only
  `command()` override, though the plan's §6 U1 names one for C8. Sent to
  the view stream for U1 (first sent saying the override was already
  there for C8; corrected).

### U2's listing: T2 forward, then the site's image check relaxed instead (2026-11-10)

- The shell stream found that the site's build (`checkGameImages()` in
  `frontend/site/tools/vite-plugins.ts`) fails for any game the catalog
  lists with `play` unless its build ships
  `docs/screenshots/<id>/thumb.webp` and `preview.webp`, which T2 makes
  after Y1. Listing it before then would break `yarn build`, `yarn verify`
  and CI; listing it as a game to come needs a drawn image too, and
  `games.spec.ts` allows `inDevelopment` only beside `play`.
- **Decided, then superseded (below):** T2's capture script comes forward. Once U1's board plays,
  the shell stream builds `tools/capture-screenshots.mjs` at a Warm-up
  level, writes the two images from the real game, then adds the listing;
  after Y1 the same script is re-run at level 18, as T2 says. No image is
  made by hand.
- Meanwhile the shell stream takes the docs pass: the workspace
  `AGENTS.md`'s `src/app/` list (bar, board cards, panels, end words), and
  `browserKey()`'s wording in `lib/phaser/AGENTS.md` and the `phaser-core`
  skill: letters and digits get their key codes from the code itself, and
  only other codes missing from its table throw.
- **Superseded, at the user's word:** "Relax the rule so only finished
  games need a screenshot." The shell stream, after the docs pass,
  relaxes `missingImages()` so a game with `inDevelopment: true` needs no
  screenshots, gives the tile and the game's page a fallback while its
  build ships none, then adds U2's listing. T2 goes back after Y1, as the
  plan has it.

### U2's debug pieces merged; U1 split again (2026-11-10)

- `a6d1e536`, from the art stream: `src/view/debug/debug_tuning.ts` holds
  the numbers the menu tunes (the flight's pace, the guide's length and the
  bored distance), `paceOf()` and `rulesOf()`; `DebugService`
  (`src/app/debug/`) wraps `@fz/game-ui`'s `createTuning()`; and the debug
  section in the settings drawer: the depth, every level open, Play
  the certificate, and "certificates are stale" (`src/app/debug/`). Two
  reviews; 3,976 tests, 99.86 / 99.15 / 100 / 99.89.
- **Kept:** retuning any number, the five pace numbers among them, costs a
  run its records, as plan.md says ("A run played on retuned numbers keeps
  no records") and Asteroid Breaker does.
- **For R6** (sent): `guideOf()` takes the guide's length as handed, since
  the menu retunes only what the rules are handed; an `isDepth()` beside
  `thirdsOf()` would replace the 11-to-22 check that now exists three
  times.
- **For U1's wiring** (sent to the view stream): `paceOf()` to
  `RoundPlay`, `rulesOf()` to `playRound()`, `onTune()`; the depth is the
  menu's or the room's, between rounds; `startRun()` with `locked` or
  `kept`, so a kept run's `tuned` is `runOffRecord()`; a certificate's run
  keeps no records; every level open in the Levels dialog. The
  certificate loader waits for P3.
- **U1 split again:** the board (`src/app/board/board.component`, about
  1,400 lines with its spec in Asteroid Breaker) goes to the art stream,
  on the view stream's GameService; the view stream keeps GameService and
  the wiring, U2's included.

### U1's GameService merged (2026-11-10)

- `a2b95db9`, from the view stream: GameService on `RunLifecycle` plays the run,
  lays the field out on the board's room between rounds, gives the scene
  its options and is the saved game's `KeptGame` (`provideGame()`);
  `GAME_LEVELS` and `PLAY_ROUND` in `src/app/tokens.ts` (`playRound()` still
  the stub);
  `src/testing/play.ts` for the specs' scripted rounds; `main.ts` takes the
  saved game up. Its `command()` override takes Enter and P over a lost
  run's closed result to `tryAgain()`. 4,079 tests, 99.87 / 99.21 / 100 /
  99.9; every file of `src/app/` at 100%.
- **A contract change, accepted:** `RunState` gains `run`, `resultClosed`,
  `tuned` and `newBest`, and `newRunState(run, start, tuned)` takes the
  run; nothing else built one, so the merge needed nothing more.
- **What the board and GameService agree on** went to the art stream with
  the board: the board hands the game `setDrawn()`, `setRoom()` before the
  scene's first layout, `onLayout()`, `onPictures()`, `fieldCommand()` and
  a `tick()` a frame, and reads the run, the cards, the scene's options,
  the metrics, the pictures and the panels' figures.
- **To the proof stream,** idle until R6: the run's stars, which the result
  card shows and R7's run doesn't track, and a move in `run.ts` for the
  par at a new depth, which GameService's `laidOut()` works out with
  `parOf()` for now.
- **For every stream's specs:** `TestBed.resetTestingModule()` drops the
  memory store the test setup provides, and settings then leak through
  jsdom's `localStorage`; provide `provideMemoryStorage()` again after it.

### R6 merged (2026-11-10)

- `258fcffd`, from the rules stream: `playRound()` plays a round whole and
  `guideOf(start, shot, pastTurn, rules = RULES)` shows a shot past its
  first turn; `playRoundBy()`, `flightRulesOf()`, `flightStartOf()` in
  `round.ts`, `isDepth()` in `wall.ts`, `GUIDE_DOT_GAP` in `tuning.ts`, and
  `src/testing/timing.ts` for the sim benchmarks (0% in the coverage run,
  which runs no sim spec). The workspace `AGENTS.md`'s rules section covers
  R4 and R6. Two reviews; 4,199 tests, 99.67 / 99.23 / 99.38 / 99.74.
- **Kept:** `guideOf()` takes the guide's length, and the bored distance
  through `rules`, as the debug menu retunes only what the rules are
  handed; the plan's `guideOf(start, shot)` didn't foresee the menu. The
  guide flies the player's fuzzball alone: a triple shot flown whole took
  473 µs at p99, alone 44 to 87 µs.
- **Sent on:** to the scene stream, the real `Guide`, matching its stand-in
  name for name; to the view stream, that `PLAY_ROUND` now flies the
  real `playRound()` with no change, GameService handing it `rulesOf()` as
  its fourth argument, `guideOf()` for
  `GameService.guide()`, and `isDepth()` for the saved game's and the
  menu's depth checks.
- **P2 and P3 side by side, against the plan's order and owners:** the
  plan puts P3 after P2 and gives both to the proof stream. With R6 done
  the rules stream was free, and P3 needs only P2's shapes, not its search,
  so the proof stream reports the solver's, the careless player's and the
  certificate's shapes before building P2, and the rules stream builds P3
  against them meanwhile; Q2 waits on P3, so this shortens the way there.
  The run's stars and the par move, given to the proof stream in the U1
  entry, were to go to the rules stream unless the proof stream had begun
  them; it had, and finished them (below).

### The docs pass and the site's relaxed rule merged (2026-11-10)

- `07a12620`, from the shell stream: the workspace `AGENTS.md`'s `src/app/`
  list gains `bar/`, `board/`, `panels/` and `result/end_words.ts`, and
  `browserKey()`'s wording is fixed in `lib/phaser/AGENTS.md` and the
  `phaser-core` skill.
- `c4b357ae`: `missingImages()`, which `checkGameImages()` calls, holds a game in development to no
  screenshots; the tile's thumbnail and the game page's preview drop an
  image that fails to load (`(error)` and a `linkedSignal`), the page's
  stage keeping its 16:9 and its category's surface; the site lists Brick
  Fuzz Pop, `inDevelopment: true`, "Charge the fuzzball, let it fly and
  keep the bricks off the floor.", 10 minutes, as Brick Breaker's. The
  rule's words in `frontend/games/AGENTS.md`, `frontend/site/AGENTS.md` and
  `docs/operations.md` too. One conflict, in the workspace `AGENTS.md`'s
  opening, with R6's edit of it: both kept. The site's 177 tests, its
  typecheck and the root lint pass; the shell stream built the site over
  the games, and removing `inDevelopment` failed it on the missing images.
- `e600d242`: the debug menu's folders in the workspace `AGENTS.md`.
- The shell stream then fixed `run_scene.ts`' comment on `browserKey()`
  and drafted T1 while the board is built, to commit it once it runs
  green over a build with the board.
- `e1f5bf39`, from the shell stream: `run_scene.ts`' comment on
  `browserKey()` says a letter's and a digit's key code come from the code.
- **T1 drafted, uncommitted,** on the shell stream; what it needs of the
  board beyond the plan's bullet went to the art stream: `data-wall` (the
  wall's lowest row as drawn, held across a turn), `data-panels` always
  present (`""` with none), `data-field` from the lintel's top to the
  band's bottom, `data-room`, `--pixel-ratio`, `.placeholder .field`,
  `.ring` and `.card`, as Brick Breaker's board has them. Open, until the
  check runs over the real board: a 1-px resize between rounds at 2× on a
  small phone on its side moves the unit from 48 to 49 px.

### The run's stars and the par move merged; P2 and P3 begun side by side (2026-11-10)

- `e34f32ad`, from the proof stream: `Run.stars`, counted in `afterLanding()` as
  each level clears, kept by the saved game and read by `readStars()`; a
  game kept before the field reads as a star a cleared level, so
  `SAVED_GAME_VERSION` stays 1. `takeDepth(run, depth, levels, pars?)`
  moves the par onto a new depth in the rules, and GameService's
  `laidOut()` calls it (named so to keep clear of GameService's private
  `onDepth()`). 4,221 tests.
- **P2's shapes, accepted:** `solveLevel()`, `replayLine()` and
  `playCasually()`, each taking `rules`; a certificate holds the line
  alone, `[aim, charge]` pairs by level and depth, keys sorted; `par.json`
  keeps its `Pars` shape. `CASUAL_FLOORS` (90, 85, 80 and 40, as plan.md
  says) lives in `casual.ts`, which the specs and the report read and the Y
  streams set.
- The proof stream builds P2; the rules stream builds P3 against those
  shapes meanwhile, on an uncommitted stand-in, committing once P2 lands.

### S2 merged (2026-11-10)

- `b5377c55`, from the scene stream: the scene steers, plays a round's sounds
  and flourishes, and draws the fuzzballs, the guide (R6's `Guide`, its
  dots ready to draw) and the meter; four new painters; 128 guide dots and
  31 outlines pooled, 216 shards reserved and capped; the 600-frame object
  count counts the shards. The scene bakes `meter-on`, `meter-off`,
  `guide-dot`, `guide-punch` and `FLIGHT_FRAMES` itself. 4,315 tests;
  118 mutants, 7 equivalent, 2 dead branches removed. The review's three
  findings fixed: a flight's last flourishes landed a step below their
  bricks, shards weren't scaled past the atlas's largest unit, and they
  weren't a pool made once.
- **New scene options for U1:** `waitingX()`, `boon()`, `crew()` and
  `aimings()`; GameService supplies them (view stream), the board hands
  them on (art stream). `stand_ins.ts` only re-exports `Guide` for
  GameService's import, which U1 switches before the file goes.
- **A pointer lost:** Phaser has no event for it. A release outside the
  canvas lets the shot fly, a cancelled touch calls it off, and
  `onPlayerAway` lets go.
- The scene stream then rewrote the workspace `AGENTS.md`'s scene
  paragraph, and switches to the proof stream's danger rule once P2 lands.
- `f2b76a1b`, from the scene stream: the workspace `AGENTS.md`'s
  `src/scene/` entry rewritten as the scene now is, a sub-bullet a part,
  its pools named by their constants and S1's danger shown among them; S2
  off the list of packages to come. Two reviews.

### U1's wiring and U2's merged (2026-11-10)

- `7fe76bf2`, from the view stream: app.component wires the bar, the settings
  with the debug section, help, levels, the result and the saved game to
  GameService, leaving a marked slot for `<app-board>` inside `.room`; the
  debug menu's numbers reach `RoundPlay` and `playRound()`, its depth
  applies between rounds, a retuned run keeps no records, and every level
  opens while the menu says so. GameService gains `boardCard()`, `runEnd`
  (its stars from `run.stars`), the real `guide()`, `boon()` and `crew()`.
  4,430 tests and 3 sim, 99.66 / 98.49 / 99.44 / 99.77.
- **Contract names:** `kindIntroducedAt(level)` added to
  `catalog/bricks.ts`, which the review asked for in place of the shell's
  own helper; `fieldShape(viewport, depthSet = null)`. `RunState.tuned` is
  gone again, the run off the record kept by the records' `startRun()`, so
  `newRunState(run, start)`. `src/scene/stand_ins.ts` is gone, GameService
  taking `Guide` from the rules; `isDepth()` makes the saved game's and the
  menu's depth checks.
- **A slip, harmless:** the view stream soft-reset its own WIP commit to
  show the reviewer a staged diff, against the streams' rule of no
  resets; nothing was lost, and it stages without committing from now on.
- **To the art stream** with the board: the slot, `boardCard()` in place
  of the three card signals, and that the app's `(away)` only pauses, so
  the board calls the scene's `onPlayerAway()` too.
- The view stream builds the certificate loader and Play the certificate
  next, against the certificate's settled shape, with a fixture until the
  rules stream writes Warm-up's.

### P2 merged (2026-11-10)

- `de89ddbe`, from the proof stream: `solveLevel()`, `replayLine()` and
  `playCasually()` to the agreed shapes; `CertifiedShot`, `Line` and
  `shotOf()` in a new rules file, `src/rules/levels/certificate.ts`, since
  the shell's Play the certificate can't import `src/testing/`;
  `src/testing/level_picture.ts` for spec levels, off `HELD_AS_RULES`
  rightly, since only specs import it; `lower.ts` exports the danger rule,
  which `lowerWall`, `describe.ts` and `wallScore` use. Two reviews; 4,465
  tests. One conflict, in the workspace `AGENTS.md`'s opening, with the
  view stream's wiring: both kept.
- **A certificate holds** only if its replay clears, in as many rounds as
  the line is long, and no needed brick stood at `DANGER_ROW` or lower
  between rounds: `replayLine()` stops at the round that ends the level,
  so a line that cleared early would pass on `cleared` alone with a wrong
  par. Sent to the rules stream for P3.
- **Mutation survivors kept:** `SOLVER_ROUNDS` lowered to 5 (no spec wall
  needs more rounds) and three that weaken the seen-wall check, which only
  saves search work; three more equivalent.
- **Sent on:** the scene and the view switch to the danger rule (the view's
  danger beat tested `=== 1`, not the rule's `<=`); the view reads
  certificates through `certificate.ts`. The proof stream runs the solver
  and the careless player over Warm-up at every depth, outside the
  repository, as an early warning before P3 certifies for real.
- **The early warning, from the proof stream,** outside the repository
  (4 workers, 21 s wall, 81 s of CPU): every Warm-up level has a line on
  every depth, all 108 found by the first search (greedy, every fourth aim,
  beam 1) and replaying under the three-part check; the slowest Plumb line
  on 11 at 0.81 s. Over 40 careless seeds a depth, the least any level
  cleared was 95% (Plumb line on 11 and 13), against Warm-up's floor of 90;
  Gatehouse cleared 100% on 11, better than §10's "sits at 90". The script,
  reusable for later sets, stays in the session's scratchpad.
- The proof stream builds Q2's pieces that don't wait on P3 next:
  `playRound()`'s benchmark in `sim`, and the ten thousand random shots if
  the random flights don't already hold them.

### P3 merged (2026-11-10)

- `3364d566`, from the rules stream: `yarn certify:levels` (a `worker_threads`
  pool, `--set`, `--level` by id or number, `--depth` more than once,
  each line found replayed through `lineHolds()` before it is written)
  writes `src/rules/levels/certificates/<set>.json` and `par.json`, keys
  sorted, the same bytes on a second run; `yarn report:levels` on
  `@fz/dev/report`, 11, 13 and 22 deep at 40 games by default; the `sim`
  specs replay every certificate and its par (`every_level/`, a file a
  depth) and hold the careless player to its set's floor
  (`every_floor/<set>_<depth>.spec.ts`); `--passWithNoTests` is gone. Names
  added: `DEPTHS` in `wall.ts`, `lineHolds()` in `solver.ts`,
  `script_api.ts`, `certify_api.ts`, `report_api.ts` (all three on
  `HELD_AS_RULES`) and `src/testing/every_level.ts` (sim's reader of the
  certificates, off it rightly). 4,537 tests and 138 in sim.
- **Warm-up certified:** 108 lines in 5.6 s on 24 threads, all from the
  first search, 2 to 10 rounds; every level clears 100 in 100 careless
  games on 11, 13 and 22 deep but Plumb line, 95 on 11 and 13.
- **The sim project on one worker:** 13.3 s by Vitest's count, 15.0 s of
  wall, against §9's 100 s; the level specs 8.4 s of it.
- `src/testing/`'s script loaders (`certify_api.ts`, `report_api.ts`,
  `timing.ts`) show 0% and `every_level.ts` 35% in the coverage run, which
  runs neither the scripts nor sim; the folder has no floor of its own, so
  it shows, as `frontend/AGENTS.md` intends.
- **A slip, harmless:** the rules stream ran `git reset -- <path>` to
  unstage its two uncommitted stand-ins before the review, against the
  streams' rule of no resets; nothing was lost.
- The rebase conflicted in the workspace `AGENTS.md`'s opening again;
  P2's text kept, P3 off the list to come.

### The scene's danger from the rules, Q2's measures, and Q2 (2026-11-10)

- `324b49c4`, from the scene stream: `src/scene/danger.ts` goes; the field
  lights its danger line by the rules' `inDanger()` and counts the bricks
  under the jump line with `neededBelow()`, and the wall frames
  `dangerCells()` only when another wall is handed over, not each frame of
  its ease. The look is unchanged. The view's `round_play.ts` keeps the one
  remaining copy of the rule, which the view stream switches with the
  certificate loader.
- `eda5c047`, from the proof stream: `play_round.spec.ts` times `playRound()`
  in `sim`, and `random_rounds.spec.ts` plays ten thousand seeded random
  shots at random walls through `playRoundBy()`, `playRound()`'s own path,
  none throwing, capped or nearer a brick than a fuzzball may come
  (`flight.spec.ts` held 2,000 through `fly()` alone). One conflict, in
  the workspace `AGENTS.md`'s paragraph on `sim`, with P3's: both kept.
- **Kept:** `random_rounds.spec.ts` stays in `benchmarks/`, though it times
  nothing, as the review noted; the folder's line in `AGENTS.md` says it
  holds the random shots too, and a folder of its own would only add a line
  to `sim`'s list.
- **Q2, green** (plan.md's checkpoint table and §9, §11), measured here on
  the integration branch:
  - every Warm-up level certified on all twelve depths (P3, 5.6 s on 24
    threads) and each certificate replayed with its par in `sim`;
  - the ten thousand random shots, about 5 s;
  - `playRound()`: median 36 µs, 99th percentile 291 µs over 6,480 rounds
    at 108 opening walls, against 100 µs and 2 ms (the sketch: 77 µs and
    1.85 ms); `fly()` alone 39 µs and 1.3 ms, with mates or friends 158 µs
    and 3.0 ms; `guideOf()` 12 µs and 45 µs, hot 66 µs; `cast()` 1.8 µs and
    10 µs;
  - the `sim` project on one worker, as CI runs it: 150 tests in 17.6 s,
    against 100 s; each depth's replays 0.14 to 0.2 s;
  - `yarn report:levels`, 40 games 11, 13 and 22 deep: every level 100 but
    Plumb line, 95 on 11 and 13; rounds 4 to 14, Gatehouse the longest.
  - The whole workspace's `test` in CI against 195 s is timed at the
    `yarn verify` before Q3.
  - The implementation plan's §1 estimate of "70 to 100 seconds of CPU"
    for the floors overstates them: P3 holds them at twenty seeds, and the
    whole `sim` project takes 17.6 s, so §9's knob of fewer seeds isn't
    needed.

### U1's board merged: a level plays in the page (2026-11-10)

- `4300da0f`, from the art stream: `<app-board>` in app.component's slot holds
  `<fz-phaser-canvas>` and its placeholder, hands the game its room before
  the scene's first layout, hosts the panels outside its
  `role="application"` element and the cards, and carries what T1 reads
  (`data-field` from the lintel's top to the band's bottom, `data-room`,
  `data-wall`, `data-panels`, `data-outcome`, and `data-depth` besides,
  which plan.md's T1 checks; `--down`, `--pixel-ratio`; the frame an
  outline). `refocusWhenUncovered(board, game.runs)` gives the board the
  focus, and the bar's and the card's Resume give it back. Contract name
  added: `FieldMetrics.framed`. Two reviews; checked in headless Chrome
  over the real app with no console errors. 4,618 tests and 150 in sim.
- **The player looking away:** the board doesn't call the scene; the scene
  already uses `@fz/phaser`'s `onPlayerAway()` on the board's element,
  Phaser's keyboard target, and a board spec checks that the focus leaving
  lets a held key go.
- **The art stream rebased without a stash:** it copied its changes aside,
  restored the files, rebased and reapplied them with `git apply --3way`.
- **Next, toward Q3:** the shell stream runs T1 over a build and commits
  it; the art stream brings the workspace `AGENTS.md` up to date for the
  board; the scene stream plays the game in a browser as the user will at
  Q3, taking screenshots; the integrator runs `yarn verify`.
- **The first `yarn verify` over the board:** lint (35 s) and typecheck
  (37 s) passed; `test` failed on one spec, `fly.spec.ts`' benchmark, timed
  out at 5 s (5.3 s; about 2 s alone). The workspace's `test` runs `sim` beside
  `dom` and `pure`, and the root runs four workspaces at once, as CI does,
  with three agents' runs loading the machine besides. The rules stream
  gives the `sim` specs that run long an explicit timeout from one named
  constant; `verify` runs again after.
- **The root `yarn build`** passes (17 s), the site copying the game to
  `play/brick-fuzz-pop/`. The game's code is 413 KB (`index-*.js`), over
  §9's 1.2 × Brick Breaker's 339 KB (407 KB) by 6 KB; the scene's chunk 31
  KB, under its 51 KB. F1 holds the bundle, after Q3; noted for it.
- `9a4c3aaa`, from the art stream: the workspace `AGENTS.md` describes the
  board (its opening, `src/view/field/`'s `framed`, app.component's focus,
  and `board/`), and GameService's `onPictures()` and `pictures` docs say
  the board hands the pictures on once the atlas settles. It overlaps the
  view stream's certificate commit in the same two `AGENTS.md` paragraphs;
  the second to merge keeps both, and "the rest of U1" leaves the opening's
  list then, U1 being done.

### The Q3 browser check (2026-11-10)

- The scene stream played the game in a browser as the user will at Q3:
  keys, a mouse pointing and holding and pulling back, touch pulling back;
  the jump, the hot shot, the danger frames, Cleared, a level lost and
  tried again; every setting applied at once; `?debug`'s numbers, depth and
  levels; a phone turned mid-round, pausing, keeping its unit and depth
  until the fuzzball landed, then refitting with the wall the same rows
  from the floor. No console error or warning. Headless frames: median 16.7
  ms, p95 33 ms, flights no worse than idle; the headed trace's frame
  callback 0.83 ms at the median. 44 screenshots, kept outside the
  repository for the user.
- **Its findings, and who fixes each:**
  1. The lintel never says how many rows wait, which plan.md's decision 6
     gives it; on an upright phone the count then shows nowhere. The art
     stream, on the board.
  2. Try again takes two keyboard presses: the result card opens on its
     title, for a player still holding Space, and Enter there does
     nothing; plan.md says "Try again is one press". The shell stream.
  3. The bar's score and rounds change at release, ahead of the
     playback's breaks. The view stream.
  4. The announcer says "charge 0" for a hot shot. The view stream.
  5. How to play says the hot shot bounces "1 time". The shell stream.
  6. A landing's words used the depth before a turn. The view stream.
  7. The guide's dots can cover the jump line's count dots. The scene
     stream.
- `bacf0065`, from the rules stream: `SIM_TIMEOUT_MS`, a minute, in
  `src/testing/timing.ts`, taken by every `sim` suite whose tests can run
  past half a second alone (fly about 2 s, guide 1.6 s, cast 0.7 s,
  play_round 0.5 s, the random rounds' batches 0.4 to 0.6 s) and by the
  floors' suites, which later sets make up to twice as long; the
  certificates' replays, 20 ms at most, take none. Through
  `describe(name, { timeout }, …)`, with `@fz/dev` and `vitest.config.ts`
  untouched. The workspace's `test` with one worker and 36 busy threads
  beside it (load 46): 4,768 tests in 105 s, against Q2's 195 s for CI.
- **A slip, harmless:** the rules stream ran `git checkout --` on a folder
  to drop its own uncommitted edits, against the streams' rules; nothing
  else was touched.
- `faaa9706`, from the scene stream (finding 7): the jump line's count is drawn
  over the guide, on a `count` layer between `guide` and `bursts`, and
  the guide skips a dot that would stand nearer a count dot than the
  count's groups stand to each other (0.22 units edge to edge), since a
  guide dot is only 0.025 units smaller and would peek out round one;
  moving the count was refused, as plan.md puts it at the line's end. One
  review, no bug; 4,621 tests and 150 in sim.
- `77593e1d`, `3c68bc1c` and `78a950b6`, from the view stream:
  - Play the certificate: `CertificatesService` loads
    `src/rules/levels/certificates/*.json` lazily through
    `CERTIFICATE_FILES`, `readCertificates()` dropping what it can't trust,
    and `GameService.playLine()` plays the line on `RULES`, off the record
    (`RunStart.certified`). The danger beat takes `inDanger()`.
  - `levelMarksOf()` takes `everyOpen`, so the Levels dialog opens every
    level while the debug menu says so.
  - Findings 3, 4 and 6: the bar's score counts each break's points as the
    flight plays it back, and a jump's points, the stars and the round as
    it lands (the run, the saved game and the records still take the round
    in at release, so the Levels dialog shows a level cleared during its
    last flight); the Paused card and the pause words show the bar's score;
    a hot shot is said as one ("62 degrees, hot shot", through an optional
    `boon` on `describeShot()`); a round's end words use the next round as
    aimed, on the field's depth then.
  - Names added: `RunStart.certified`, `GameService.playLine()`,
    `CertificatesService`, `CERTIFICATE_FILES`, `certificateFilesOf()`,
    `readCertificates()`, `lineOf()`, `SetCertificates`, `RoundPlay.scored`,
    and `scored` on `RunState` and `PlayState`. Three reviews; 4,695 tests
    and 150 in sim, 98.58 / 97.3 / 97.69 / 98.73.
- `018eb514`, from the shell stream, T1: `tools/check-layout.mjs` on
  `checkPhaserLayout()`, `across: 9`, `down: "--down"`, the panels a deck
  `allOrNone`, and the game's own inspection (a unit of 24 CSS px or more,
  the unit, depth, band and lintel worked out from `data-room` as
  `fieldShape()` does, the field in its room and filling it, panels only
  where 184 px a side are spare). Every shape passes over a build: roomy,
  the large, small and smallest phones upright and on their side, and a
  phone turned each way.
  - **The 1-px resize at 2× on a small phone on its side:** no slack
    needed; the board writes its room once (480 × 296, a 24 px unit, 11
    rows, no panels) and never resizes.
  - **The wall after a turn** is held while the level is ready, on the row
    it opens on at the new depth, since `takeDepth()` starts a level with
    no round played again on the new depth; holding it through a turn
    mid-run needs a kept run taken up, which T2's kept run (C9) brings.
    plan.md's and the implementation plan's T1 words on it, and
    `wallRow`'s doc in board.component.ts, to be brought to that.
- `81b53b6c`, from the shell stream (findings 2 and 5): Enter on the result
  card's title presses its first button, Try again or New game after a
  win, as it goes down, its repeats, an Enter pressed before the card
  opened and Ctrl, Alt or Meta with it pressing nothing; the card still
  opens on its title, so a held Space presses nothing (Brick Breaker's
  focuses Try again, which a held Space presses as it's let go; Asteroid
  Breaker's opens on its title with no Enter). The hot shot bounces
  "once" (`howOften()`). The opening's list to come starts at T2.
- **The plans brought to T1:** plan.md's "The layout check" and the
  implementation plan's T1 now hold the wall on the row a level opens on at
  the field's depth, and T2 gains the kept run taken up with a round
  played, its wall held the same rows from the floor through both turns.
- **`yarn verify` over the branch, again,** at `81b53b6c`: green in 175
  s, Brick Fuzz Pop's 4,856 tests among every workspace's (its `test` runs
  every project, `sim`'s 150 among them, where the counts the coverage runs
  give stand apart from sim's), its own `test` 21.6 s by Vitest's count
  beside the others, against Q2's 195 s for CI; then the root
  `yarn check:layout` green in 17 s, Brick Fuzz Pop's layout holding at
  each shape and turn beside Sudoku's, Brick Breaker's, Asteroid Breaker's
  and Snake's.
- `1a0d307b`, from the art stream (finding 1): the lintel says "5 rows
  waiting", "1 row waiting" or "No rows waiting", from
  `GameService.rowsLeft()`, the bar's own number, sized to the lintel less
  the ceiling's line (14 px, 8 px on the thinnest 12 px lintel), at 8.75:1
  or more against the band in all four palettes. Screen readers skip it
  where the bar's Rows left or Coming next shows, and read it as page text
  elsewhere, not as a live region, which would speak over the announcer's
  round words. The Ready card's layer starts under the lintel. `wallRow`'s
  doc says what T1 holds. Three reviews; 4,721 tests in the coverage run
  and 150 in sim; the game builds, its layout check holds at every shape
  and turn, and the root lint passes. The root `yarn verify` last ran at
  `81b53b6c`, the merge before; this one changed the game's workspace
  alone, and its own checks ran over it.
  - **Left for later:** `lintelHidden` repeats the bar's `fitsEveryFigure`
    condition, so the two change together; and the announcer could end a
    step's and a jump's words with the rows waiting
    (`src/rules/run/describe.ts`).
- **Ready for Q3.** Total coverage reads 96.97 / 95.01 / 97.44 / 97.01
  since T1: `tools/check-layout.mjs` runs in no spec, as no game's layout
  check does, and `tools/` has no floor; every floored folder holds.

### Q3 passed; X3 merged; X1, X2, T2 and D1 begun (2026-11-11)

- **Q3, the user's:** the game in the app's browser pane from the dev
  server (port 9006), with the screenshots; the user said "Go on". The
  points put to the user at the gate stand as built, none asked changed:
  the danger line brightens by weight, not a brighter red; the friends'
  inks sit near the hot shot's or the accent in some palettes; the Levels
  dialog shows a level cleared during its last flight; Brick Breaker's
  `?debug` ball speed still keeps records in a production build; the
  game's code is 6 KB over §9's budget, for F1.
- **The streams after the gate:**
  - rules: X1 (Sparks' kinds, friends and the triple shot), then Y1;
  - proof: X2 (Tricks'), then Y2;
  - view: X3 (Thick walls'), then Y3, rather than the art stream §7.2's
    table gives it, so that one stream draws all the art;
  - art: the eleven kinds' art, X1's first, so no two streams write the
    same art files;
  - shell: T2's parts that don't wait on level 18 (the capture script at a
    Warm-up level, the site's thumb and preview, and the layout check
    taking up a kept run through both turns), with the lintel's and the
    bar's one condition and the rows waiting in the announcer's words;
  - scene: D1's `brick-fuzz-pop-testing` skill.

  Certification takes every core, so the Y streams take turns.

- `3a905937`, from the view stream, X3's first half: `SHELLED_RULE`, a
  fuzzball with no charge taking no hit off a shell and turning, the strike
  not counting toward boredom, charge, a hot shot, a zap and a blast all
  hurting it, and it earthing nothing; `REGROWS_RULE`, moss struck as any
  brick in a flight. `TRAIT_RULES` takes both where they threw.
  `flight.ts`, the round and the wall untouched. 4,731 tests.
- **The art gates every X stream:** `BRICK_ART` satisfies a record of every
  cataloged kind, so a kind is cataloged only once its art exists. Shell
  and moss's art moved to the scene stream, ahead of its skill, so X3 goes
  on; the art stream draws X1's kinds, then X2's, each merged ahead of its
  X stream's catalog commit.
- `61307b90`, from the proof stream, X2's first half: `KICKS_RULE`,
  `SPLITS_RULE`, `TELEPORTS_RULE` and `PLATED_RULE` in `TRAIT_RULES` where
  they threw, the bumper kicking, the prism splitting, the portal sending a
  fuzzball out of its twin, a plate shielding its face. 27 of 28 mutants
  killed, the survivor equivalent. Conflicts with X3's half in
  `trait_rules.ts`' imports, its spec's list of traits that throw (now the
  wool's and the cage's alone) and the workspace `AGENTS.md`'s sentence on
  the traits, each kept from both sides. 4,752 tests.
- **The order for a kind's catalog,** since `BRICK_ART` refuses both a
  cataloged kind without art and art for an uncataloged kind: the art
  lands unwired, its files specced directly; then the kind's X stream adds
  its `BRICK_ART` lines with its catalog file in one commit.
- **The early warning for the other three sets,** from the proof stream,
  outside the repository (all twelve depths, 40 careless games a depth, 2.7
  minutes on 4 workers), on the real rules where merged and stand-ins
  elsewhere (Sparks' kinds, the shell's and moss's catalog entries and
  `regrow()`, Tricks' entries as X2 plans them): every level of Sparks,
  Tricks and Thick walls has a line on every depth from the first search,
  the slowest 2.8 s, and every replay holds. None falls under its floor;
  the nearest: Switchboard (17) 88 on 13 against Sparks' 85; Labyrinth 63,
  Six-pack 50 and The Great Wall 65, each at its least on an odd depth,
  against Thick walls' 40. No redraw looks needed; Switchboard and
  Six-pack are the ones to watch when certification plays its own seeds.
- `9ef566b0`, from the rules stream, X1's first piece: `zaps.ts` plays the
  blast, the cross and the X; `RECHARGES_RULE`, wool charging the fuzzball
  that breaks it to full, a zap's or a blast's break charging no one;
  `STAND_IN_RULES` zap and recharge through the real rules, and
  `flyPicture()` takes friends. 4,758 tests. X1's catalog commit, all
  five Sparks entries with their `BRICK_ART` lines, waits on the rules
  stream for their art.
- **Decided, a contract change:** each cage owns its friend's ink, as
  plan.md says ("A cage holds one, in an ink of its own"; its art "a
  fuzzball behind them in a friend's ink"; six cages at most). The cage's
  rule had no way to give it: a rule is handed `(hooks, cell, ball, trait)`
  and every cage's tint was 0. The two choices: (a) inks by place, a
  level's cages numbered 0 to 5 as their tints, the lowest row first, then
  left to right; (b) inks by the order the friends are freed. (a), because
  (b) would leave the cage's art one fixed ink until the friend is out.
  So `parseLevel()` and `wallFrom()` give each cage its tint,
  `TraitRule.broken` takes the brick's tint as a fifth argument, and
  `flight.ts`' `brokenRule()` passes it, the one change to `flight.ts` an
  X stream makes. Its own commit on the rules stream, which brings
  `implementation-plan.md` to it (§5.3's `Brick.tint` comment, P1's tints,
  and the X/Y intro, which said no X stream touches `flight.ts`); the
  cage's art draws the ink its tint picks.
- `1a3b96d0`, from the scene stream: `SHELL_ART` and `MOSS_ART`, unwired,
  their files specced directly and their frames held to the atlas's rules
  through a `WAITING_ART` record until `BRICK_ART` takes them. Names added
  to `frames.ts`: `FRAMES.shellBody`, a shell at its last hit, and
  `THICK_HITS`. **A contract doc reworded, approved by the integrator:**
  `ThickHits` now says the hits left, the shell's and the moss's pips
  counting down from 2 with none at the last hit, as a tough brick's die, so
  damage and regrowth read below 30 CSS px where cracks drop out; only this
  art calls `FRAMES.shell()` and `FRAMES.moss()`. Two placements moved from
  `make-art.mjs` by under two hundredths of a cell, to keep a device pixel
  clear at every scale. 58 mutants killed. 4,853 tests.
- `ee817262`, `05d456eb` and `53ffd3bd`, from the shell stream:
  - T2's part that doesn't wait on level 18: `tools/capture-screenshots.mjs`
    on `runScreenshotScript()` takes up a run the rules kept, through the
    typed `screenshot_api.ts` (Gatehouse, 11 deep, its certificate's first
    two shots, Midnight blue), aims at 55° with charge 3 and writes the site's
    `thumb.webp` and `preview.webp`, which replace the site's fallback for
    the game; the layout check makes a second pass over a run taken up
    paused (`LAYOUT_RUN`), holding the wall's rows from the floor through
    both turns at every shape.
  - `showsEveryFigure()`, the one condition the bar and the lintel read.
  - The announcer's step and jump words end with the rows waiting ("…, 5
    rows waiting."; "The wall jumped 3 rows, with 5 rows waiting."), the
    only change to `describe.ts`, the proof stream's file.
  - These two close T1's "Left for later".
  - 4,882 tests and 150 in sim; the game builds and its layout check
    holds over both passes.
- `40a0ae64`, from the scene stream, D1's first piece: the
  `brick-fuzz-pop-testing` skill (the projects, the floors, the helpers and
  fixtures, the certificates and floors and their scripts, the kept run,
  what to do when a replay fails on its line or on par alone and when a
  floor fails, the benchmarks, the scene's and the shell's harnesses, the
  mutation pass), linked from the workspace `AGENTS.md`; `scriptedRounds()`'s
  doc corrected. Two reviews. Naming it in the repository's lists waits for
  D1's piece on those lists.
- X1's art (`597d49d6` on the art stream) conflicted in five art files with
  the shell's and moss's, which moved shared helpers first; the
  cherry-pick was aborted and the art stream rebases it, folding the two
  records of unwired art into one.
- `af0a32a5`, from the view stream, X3's catalog commit: the shell and moss
  in `thick_walls.ts` with their `BRICK_ART` lines, so `WAITING_ART` is
  gone; `regrow()` in `lower.ts` grows each moss brick short of its full
  hits back a hit after every round, unless the level is cleared; their
  frames added to `atlas_frames.spec.ts`.
- `deac259c` and `c678582e`, from the rules stream: the cage's ink, as
  decided above, through `tintOf()`, with the plan's three places brought
  to it. `FREES_RULE` frees the friend in the cage's
  tint, by a strike, a zap or a blast. With every trait now ruled,
  `not_until.ts`, `comesAt()` and the spec of traits that throw are gone.
  The cherry-pick conflicted in `trait_rules.spec.ts`, where X3's catalog
  had already replaced the tough-brick stand-ins with the real shell and
  moss: kept neither side's top (the throws test, the `toughWith()`
  stand-ins) and dropped the unused `BrickTrait` import. 4,928 tests and
  150 in sim, the floors held.
- **Open:**
  - X1: the art stream rebases its art (`597d49d6`); then the rules stream
    makes the proof stream's two asks (`STAND_IN_RULES` on the real kicks,
    splits and teleports rules, and `wallFrom()` pairing `@` and `&` as
    portal twins), then X1's catalog commit (`sparks.ts`), then Y1.
  - X2: its four kinds' art on the art stream, then the proof stream's
    catalog commit, which also drops "a plate" from the earths comment in
    `catalog/bricks.ts`; then Y2.
  - X3: done. Y3 waits for X1's and X2's catalogs and its turn on the
    cores.
  - T2: level 18 for the kept run, its first two shots at 11 deep,
    `AIMING` rechecked and `index.html`'s alt text, after Y1.
  - The shell stream's three notes (the `HELD_AS_RULES` filter dropped,
    `@fz/dev/layout`'s `before` handed its arguments, plan.md's words for a
    step and a jump) are reported, to merge next.
  - D1: the repository's and the frontend's lists of games, now on the
    shell stream; the `brick-fuzz-pop-content` skill once every kind is
    cataloged; the workspace `AGENTS.md`'s numbers at the end.

### X1, X2 and D1 under way (2026-11-11)

- `520d38eb`, `dd30264c` and `1b8a8da4`, from the shell stream, its three
  notes:
  - `eslint.config.js` hands all nine `HELD_AS_RULES` files to
    `phaserGameLayers()` whole, so a name the workspace lacks fails lint
    again; `HELD_AS_RULES` is exported, readonly. Its mutation pass showed
    nothing held the fence: had the helpers' later block stopped ignoring
    the held files, it would have replaced the rules' fence for them; the
    new `tools/eslint_config.spec.ts` holds every held file to the fence
    as errors.
  - `@fz/dev/layout`: a check's `before` may be `{ run, args }`
    (`BeforeLoad<A>`) as well as a bare function, so the game's check no
    longer builds its call with `new Function()`; Snake's and Asteroid
    Breaker's checks are unchanged. Specs in `lib/dev`, a type test among
    them. The root `check:layout` held for all five games with a check.
  - plan.md's words for a step and a jump end with the rows waiting.
  - 10 mutants, all killed. `@fz/dev` 531 tests; the game 4,937 and 150 in
    sim, the floors held; the root lint passes.
  - **Left for later, outside this build:** Asteroid Breaker's
    `eslint.config.js` has the same later block over its own held files,
    with no spec holding them to the fence. Carried in the Open list till
    the merge, then put to the user as a task of its own, since this log
    goes before then.
- `fed96fde`, from the art stream, X1's art, rebased as asked: the bomb,
  wool, the cage (a fuzzball behind its bars in each of the eight inks,
  `FRAMES.caged(ink)`) and the cross and x zappers, unwired and held in
  the spec's `WAITING_ART`, which the art stream kept as the one record of
  unwired art; `symbols.ts` gains `pointAt`, `EIGHTH` and `boltMark()`
  beside the scene's `turned()`; `FRAME_NAMES` 69. It conflicted again,
  with X3's catalog, which had dropped `WAITING_ART` once shell and moss
  were cataloged: kept the art stream's `atlas_frames.spec.ts` without
  shell and moss in `WAITING_ART`, with their six frames in the list of
  the atlas's; the workspace `AGENTS.md`'s art and `art_frames.ts` lines
  combined from both.
- `023d8507`, from the rules stream, the proof stream's two asks:
  `STAND_IN_RULES` on the real kicks, splits, teleports and regrows rules,
  and `wallFrom()` pairing each `@` and `&` as portal twins
  (`twinsIn()`), which throws on a mark drawn once or more than twice. 5
  of 6 mutants killed; the survivor, `wallFrom()` handing no twin, waits
  for a cataloged portal. `twinsIn()` repeats the parse's `twinsOf()`,
  left so: the parse's errors name the level, and `levels.ts` is P1's.
  5,033 tests and 150 in sim, the floors held; the root lint passes.
- **Decided, a contract change:** a plated brick is drawn as its tile and
  one frame per plating and hits left, `plated-<plating>-<hits>`, nine
  frames for the legend's three platings (floorward, floorward and both
  sides, ceilingward); any other plating throws. `plate-<face>` goes: a U
  brick stacked from per-face plates would be five layers against the
  wall painter's `MOST_LAYERS` of 3, and the levels use the legend's
  platings alone. The art stream brings `implementation-plan.md`'s frames
  table to it, and the change rides in its art commit rather than one of
  its own, as §10 asks of a contract change: only `frames.ts` and its spec
  named `FRAMES.plate`. The plan's X/Y intro still calls the cage's tint
  X1's one contract change; this one is X2's.
- `29a397ad` and `2f3d507e`, from the shell stream, D1's lists: the
  repository's `AGENTS.md` (the games under `/play/`, the stack, the
  `AGENTS.md` layers, the skills folders, `brick-fuzz-pop-testing` among
  the apps' testing skills), the frontend's and the games' `AGENTS.md`
  ("which is being built" kept for Z1), `README.md` and
  `docs/operations.md`; then, from its first review, the five shared
  skills and the three libraries' `AGENTS.md` whose lists or counts left
  the game out, as Asteroid Breaker's list commit had changed them. Each
  reviewed; the root lint passes, its reference check included.
- `89c1f540`, from the scene stream, the view stream's notes and the art
  stream's: the shell's and moss's specs take their looks and full hits
  from the catalog, with no tough stand-in; `art.spec.ts` holds every
  cataloged kind to looking unlike every other whole and to one of two
  shard colors (its own inks' body, or its tint's for the brick and the
  tough brick), so X1's five join with no edit; How to play's pictures of
  every cataloged kind are held in `wall_scene.spec.ts`; the shell's bolt
  is `symbols.ts`' `boltMark()`. 24 of 25 mutants killed, the survivor
  equivalent (steel's face and body are one ink). The bolt and the looks'
  `kind` came after its review, so they had one of their own here. X2's
  portal fits neither shard rule (its inks are `WallPalette.portals`'), so
  X2's catalog commit adds its own; told the proof stream. 5,041 tests and
  150 in sim, the floors held.
- The proof stream has X2's catalog built and waiting, uncommitted, for its
  four kinds' art: `tricks.ts`, `describe.ts` reading plates and a
  portal's pair, the traits' specs on the real kinds, no stand-ins left.
- **The bundle ahead of F1,** measured by the shell stream on a scratch
  build: the game's code 429.0 KB raw (133 KB gzip) against 407 KB (1.2 ×
  Brick Breaker's 339; Brick Breaker's own is now 345); the scene 30.7 KB
  against 51 KB; Warm-up's certificates 4.5 KB, loaded only at `?debug`.
  It grew from Q3's 413 KB with the X kinds' art and with `resource()`,
  6.4 KB that came with the certificates' loader (`77593e1d`). The 84 KB
  over Brick Breaker: the rules 29 (the aims table 25.4), the shell 23,
  the view 23 (the bricks' art 12.4, reaching the main chunk through
  `brickColor()` in the coming-next card), Angular's `resource()` 6.4.
  **Decided,** numbered as the shell stream's log numbers them:
  - trims 2 and 3 now: `CertificatesService` without `resource()` and the
    debug menu behind `@defer` (2), and the steering's two constants in a
    file of their own (3), about −16 KB;
  - trim 1 after both X catalog commits, which add `BRICK_ART` lines:
    `brickColor()` out of the art (−12.4 KB, and each kind's art stays out
    of the main chunk);
  - trim 4, How to play behind `@defer` (−7 KB), held unless still over
    after X and Y;
  - trim 5, the aims table, dropped: as float bits it is larger gzipped,
    and a half table mirrored would change 503 of the 657 aims' headings,
    every certificate with them.

  F1 reports gzip beside raw; the budget stays raw.

- `a1cff1ba`, from the scene stream, the review's two points on the bolt
  and the looks: every kind spec's look typed as a `KindLook`, with no `as
const` and no `kind`, so the compiler refuses a stray field (checked by
  putting a `kind` into each of the nine; only the brick's, the tough
  brick's and steel's had one); the shell's and moss's
  throw rows write their full hits out. 5,041 tests and 150 in sim, the
  floors held.
- **The session restarted** with the rules stream's X1 catalog, the art
  stream's X2 art and the shell stream's two bundle trims in their
  worktrees, uncommitted; each was resumed from its own tree. The proof
  stream's X2 catalog, waiting uncommitted, survived it too.
- `6984dbc6`, from the rules stream, X1's catalog commit: `sparks.ts`
  catalogs the bomb, the cross and x zappers, wool and the cage with their
  five `BRICK_ART` lines, the cage under its bars in `caged-<tint>`; with
  nothing left waiting, `WAITING_ART` and `everyFrame()` are gone. Specs:
  `sparks.spec.ts`, the catalog's order, six reach checks, a parsed level
  numbering its cages 0 to 5, a cage's tint in a pictured wall and in the
  art, and a round through a real cage whose friend joins the crew in its
  ink. The `WOOL` and `CAGE` stand-ins retired; `uncataloged()` names the
  legend's first kind not yet cataloged. Its review caught the frees and
  flight specs giving each cage the ink of its own row, which a rule
  freeing by row would pass; they now differ. 17 mutants, all killed.
  5,169 tests and 150 in sim, the floors held; the root lint passes.
- **Y1 begun:** Sparks' levels in the rules and `LEVEL_SETS`, every floor
  at 85 over 40 games (Switchboard least, 88 on 13 and 93 on 11); the
  certification has the cores now.
- `fe458efc`, from the shell stream, bundle trims 2 and 3 in one commit:
  `CertificatesService` keeps the certificates in a signal set from the
  `import()` promise rather than `resource()`, and the settings drawer
  loads the debug menu behind `@defer (on immediate)` only where it is
  offered, the menu providing the service; `BY_POINTER` and `STRAIGHT_UP`
  move to `src/view/steering/aiming.ts`, so the main chunk no longer pulls
  in `Steering`. 21.4 KB left the main chunk and Angular's `@defer`
  runtime brought back 6.1. Checked by hand on a production build: no
  menu chunk without `?debug`, Play the certificate at `?debug`, the
  new-game dialog's focus. 13 of 14 mutants killed, the survivor
  equivalent. 5,174 tests and 150 in sim, the floors held; the root lint
  passes.
  - **Measured here after X1's catalog:** the main chunk 419.3 KB raw,
    129.8 gzip, against 407; the scene 33.1 KB. X1's five kinds' art
    reaches the main chunk through `brickColor()`, which trim 1 ends, after
    X2's catalog.
  - **Left for trim 1:** `steering.ts` re-exports the two constants and
    `PointerAimings` for `wall_scene.ts`, until the scene imports them from
    `aiming.ts`. Nothing ties it to `brickColor()`; it rides in trim 1's
    commit to spare a review of its own.
- `690fadb6`, from the rules stream, **Y1**: Sparks' nine levels, copied from
  their draft and held to plan.md's table, in `LEVEL_SETS`; their
  certificates and par, every line found by the first search in 3 to 11
  rounds (the certification took about 10 s); the three
  `every_floor/sparks_*` specs at 85. The careless player's least over
  11, 13 and 22 deep: Fuse, Crossroads, Chain reaction, Wool socks and
  Honeycomb 100, Crisscross and Jailbreak 98, Powder keg 95, Switchboard 88
  (93 on 11, 100 on 22); no redraw. The review's points all taken, among
  them the debug menu's spec reading every set's certificates. 5,324 tests
  and 285 in sim, which replays every Sparks line; the floors held, the
  root lint passes.
- `bdc9ce4c`, from the rules stream, D1's last skill: `brick-fuzz-pop-content`
  (how the content is held and the checks that keep it whole; a level, its
  legend, the rules a wall keeps, drawing it with `build.mjs` and the
  order of its checks through certification and the report; a set; a kind,
  its art first, its catalog entry and `BRICK_ART` line together, the
  specs that take it up and those edited by hand; a trait), naming no kind,
  level or set and linking the testing skill for certificates and floors.
  Linked from the workspace `AGENTS.md`; the repository's lists name only
  the testing skills, as for Brick Breaker's and Asteroid Breaker's
  content skills. Its review's nine points all taken. The root lint
  passes. It lands ahead of X2's catalog, not after it as the last Open
  list had it: naming no kind, level or set, it changes with X2 only in
  its lines on `uncataloged()` and the stand-ins.
- `97756ab0`, from the art stream, X2's art: the bumper, the prism, the
  portal's two and the plated brick, unwired, in `WAITING_ART`.
  `FRAMES.plated(plating, hits)` over `PLATINGS` and `PLATED_HITS`,
  `FRAMES.plate` and `PlateFace` gone, as decided; `symbols.ts` gains
  `diamond()`; the plan's frames row brought to it; 74 frames. Two
  reviews: the plate's gap cut from the tile's own outline, so the grid's
  dots show past it and no field-colored box is painted; the U's side
  plates stop at its floorward gap; under 30 CSS px no rivets and half the
  teeth; seams at 28, 29 and 39 device px a unit and the gap at 1 to 9 px
  fixed; an
  atlas check that every polygon has three points. Shade-only contrast in
  the bumper's cap and the prism's fill, the prism's outline held to 3:1.
  It conflicted, as X1's art had, with X1's catalog, which had dropped
  `WAITING_ART`: kept the art stream's spec with only its four kinds
  waiting and X1's frames in the atlas's list; the workspace
  `AGENTS.md`'s art line combined. 5,421 tests and 285 in sim, the
  floors held.
- `5b4c33cd`, from the shell stream, T2's last part: the kept run is level 18,
  Powder keg, 11 deep, two rounds in by its certificate's first two shots;
  the aim moved from 55° to 100° at charge 3, chosen from twelve captured,
  so the guide punches through a bomb; `aimingKeys()` works out the arrow
  presses outside the page, so an aim past 90° can be set; `index.html`'s
  alt text and the workspace `AGENTS.md` follow. The layout check held
  over the new kept run. Looked at the thumb here: the level's name, the
  rows waiting, the guide through the bomb, both panels. The main chunk at
  Y1's tip measured 423.0 KB raw (132.0 gzip). 5,424 tests and 285 in sim,
  the floors held; the root lint passes.
- **Open:**
  - X2: the art is in, so the proof stream's catalog commit goes now, built
    and waiting in its tree. It carries the portal's own shard rule in
    `art.spec.ts`; the plated looks there on the legend's platings; the
    plated brick's picture with its plates in `pictures.ts` and
    `wall_scene.spec.ts`; "a plate" dropped from the earths comment in
    `catalog/bricks.ts`; and the refusal specs that go through
    `uncataloged()`, which throws once every kind is cataloged, with the
    content skill's lines on them. Then Y2.
  - Y3: after X2's catalog, on its turn at the cores.
  - Q4: the scene stream watches levels 1 to 18 on 11 and 22 deep now;
    19 to 36 after Y2 and Y3.
  - The bundle: 423.0 KB at `5b4c33cd`, 16 KB over 407. Trim 1, with the
    `steering.ts` re-export, after X2's catalog; measured again; then
    trim 4 if still over.
  - D1: the workspace `AGENTS.md`'s numbers at the end.
  - Asteroid Breaker's lint fence, outside this build: to the user at the
    merge.
  - Done since the last list: X3, X1, Y1, T2, D1's lists and both skills,
    and the shell stream's three notes.

### X2, Y2 and Y3 merged; Q4 passed; F1 under way (2026-11-11)

Sizes here are Vite's, in kB of 1,000 bytes; the gzip figures before `b849b9a6`
are `gzip -9`'s, a little under Vite's own.

- `33cf8fe6`, from the proof stream, X2's catalog commit: `tricks.ts` catalogs
  the bumper, the prism, the portal and the plated brick, with their four
  `BRICK_ART` lines; `WAITING_ART` and `everyFrame()` gone, the atlas's list
  with the 13 frames; `art.spec.ts` colors a portal's shards by its pair's inks
  and its looks, as `wall_scene.spec.ts`'s, take a portal's two pairs and the
  legend's platings; How to play's plated brick is a `v`; "a plate" gone from
  the earths comment. R reads a brick's plates and a portal by its pair's badge
  ("portal with a dot", "with a diamond", from the new `PORTAL_BADGES` in
  `legend.ts`), shut while its twin waits. `uncataloged()` retired with its
  specs, the parse's and `wallFrom()`'s refusal of an uncataloged kind with it:
  `LegendBrick.kind` is typed `BrickKindId`, so the compiler refuses a legend
  kind the catalog lacks; `wall_picture.spec.ts` keeps a character the legend
  lacks. The stand-ins stay, which the flight's, the cast's, the grid's, the
  round's and the random flights' specs still fly. 41 of 42 mutants killed, the
  survivor equivalent. 5,509 tests and 285 in sim, the floors held; the root
  lint passes. Every kind is cataloged.
  - **Left for the art stream, after trim 1:** `portal.ts` picks its badge by
    the mark's number rather than from `PORTAL_BADGES`, so R's words and the art
    could part; and `art.spec.ts` and `wall_scene.spec.ts` each work out every
    look a kind takes, which one `looksOf()` in `src/testing/art_frames.ts`
    would serve.
- `2c6c39a9`, from the proof stream, **Y2**: Tricks' nine levels, copied from
  their draft and held to plan.md's table, in `LEVEL_SETS`; their certificates
  and par, every line found by the first search on all twelve depths in 9.7 s;
  the round ranges as the sketch had them but Back door's 4 to 9 (the sketch's 4
  to 8) and Fun house's 5 to 10 (4 to 9). The careless player's least over 11,
  13 and 22 deep, against 80: Pinball and Shutters 98, Bumper cars and Fun house
  95, the rest 100; no redraw. No mutation pass, the change being data its
  replays hold. 5,658 tests and 420 in sim; the floors held, the root lint
  passes.
- **Y3 waits on Y2,** as the view stream found: a level's number comes from its
  set's place in `LEVEL_SETS`, a kind's first level is checked against it, and
  the careless player's games are seeded by it, so Thick walls certified before
  Tricks would number 19 to 27, fail its specs and play other games than its
  final ones. Its files waited in a WIP commit, undone by one soft reset after
  the rebase, as agreed.
- `829f8003`, from the shell stream, **trim 1**: `BRICK_COLORS` in
  `src/view/colors/brick_colors.ts`, typed over `BrickKindId` so a kind without
  a color fails to compile, gives a brick's shards their color by kind and tint
  (a tint's ink for the brick and the tough brick, a pair's for the portal, the
  kind's own inks for the rest); `colorOf` leaves `KindArt` and the kinds'
  files, the shard-color rules move to `brick_colors.spec.ts`, `itemAt()` to
  `src/view/items.ts`, and `wall_scene.ts` takes its aim from `aiming.ts`,
  `steering.ts`'s re-export gone. The same colors for all sixteen kinds; 12
  mutants, all killed. 5,643 tests and 420 in sim, the floors held; the root
  lint passes. **Measured here:** the main chunk 411.8 kB raw (125.0 gzip),
  Tricks' levels in it, against 406.8; the scene 54.5 kB raw (20.3 gzip), the
  bricks' art now in it, against about 51.
- **Decided:** trim 4, How to play loaded on its first opening, goes in now,
  with the debug menu and it loaded by a hand-written `import()` rather than
  `@defer`, whose runtime is 6.1 KB of the main chunk, since Thick walls' levels
  still add to it. The scene's overage goes to the user at F1 with the numbers,
  rather than the art split into a chunk of its own only to meet the measure.
- **Q4, levels 1 to 18,** watched by the scene stream through the debug menu's
  Play the certificate, on 11 and 22 deep, in a headless Chrome on its own
  server: all 36 plays cleared in their certificate's rounds, the needed bricks
  never in the danger row (row 3 the lowest, Plumb-line on 11), no console error
  or warning in play; the friends in their cages' inks and joining in order, the
  triple shot, every zap and blast, wool's sparks and every kind's art as they
  should be. Two cosmetic issues: the Cleared card wraps "5 friends freed" onto
  three lines on 22 deep, as narrow as the field; and effects (rings, shards, a
  friend's hop) draw over the lintel band and past the board's top frame, the
  count, above the canvas, still readable. Both wait for 19 to 36's watching, to
  be fixed with whatever it finds. Shots and harness in the scratchpad's
  `scene-stream/q4/`.
- `0fe10c98`, from the view stream, **Y3**: Thick walls' nine levels, copied
  from their draft and held to plan.md's table, after Tricks in `LEVEL_SETS`;
  their certificates and par, every line found by the first search in 11 s, from
  4 to 8 rounds (Overgrown) to 10 to 15 (Labyrinth, The Great Wall). The
  careless player's least over 11, 13 and 22 deep, against 40: Nutcracker and
  Thunderhead 100, Moss garden 95, Bank vault 85, Overgrown 83, Armory 80, The
  Great Wall 65, Labyrinth 63, Six-pack 50 (on 11 and 13; the sketch had 43); no
  redraw. 10 of 11 mutants killed: closing Bank vault's door passes the reach
  check, its shells being doors, but not the replays; a level's name is held to
  its draft by no spec, in any set. 5,790 tests and 555 in sim; the floors held,
  the root lint passes. W11.3's `yarn verify` and the phase's `check:layout`
  were left to F1's merges, below: `yarn verify:full` at `b849b9a6`'s,
  `check:layout` at `3221299a`'s. **All thirty-six levels are certified and
  inside their floors,** the first half of Q4.
- `b117d21e`, from the art stream, the tidy after X2 and trim 1: `portal.ts`
  draws each pair's badge from the legend's `PORTAL_BADGES`, which R reads its
  words from, a badge without a drawing failing the typecheck; `looksOf()` in
  `src/testing/art_frames.ts` gives every look a kind takes to `art.spec.ts` and
  `wall_scene.spec.ts` alike; the art specs' roles stay written out, exported as
  `ART_ROLES` and held by a spec to Classic felt's roles in the stylesheet, with
  Soft pastel's page, since `PALETTES.rolesIn("classic")` puts the field and the
  page in one white and reading the stylesheet would cost about 0.15 s in 21
  spec files. 10 of 11 mutants killed, the survivor a spec helper's. 5,798 tests
  and 555 in sim, the floors held; the root lint passes.
  - **Left:** R's side of the badges isn't tied by a spec yet; and the workspace
    `AGENTS.md` and the testing skill could name `looksOf()` and `ART_ROLES`,
    for D1's last pass.
- **F1, the certificates in two browsers,** by the proof stream on a production
  build: levels 1, 18 and 36 on 11 and 22 deep, played through the debug menu in
  headless Chrome 157 and, over WebDriver BiDi, headless Firefox 153 ESR: all
  twelve plays cleared or won in their certificate's rounds (level 36 ending
  "Every level cleared!"), no console error or warning from the game in either,
  and every figure the page shows the same in both. Differences only in what
  headless rendering and the harness make: Firefox dims behind the result dialog
  where Chrome blurs, and the focus rings and a level's first aim follow the
  harness's clicks. Safari, for the user.
- `d285a220`, from the rules stream: R's portal words held to the legend's
  badges by tint (`describe.spec.ts`), and one badge to a portal mark
  (`legend.spec.ts`), as `portal.spec.ts` holds the art's side; R's own code
  unchanged. 3 of 4 mutants killed; the survivor writes the names out while the
  list keeps them. 5,801 tests and 555 in sim, the floors held; the root lint
  passes.
- **F1, the performance traces,** by the view stream on a production build in
  the headed Chrome, level 36's longest flight (round 7 on 18 deep, 437 units,
  three fuzzballs, 41 breaks, 19.6 s): a frame's CPU time at ×6 6.92 ms at the
  median, 12.27 at p95, 20.35 at p99 and 92.4 at worst (a major GC); at ×4 4.21,
  7.43, 10.87 and 13.2; unthrottled 1.10 at the median. Over the 4 ms bar at the
  median, where Brick Breaker's (0.49) and Asteroid Breaker's (1.2 to 1.6) held
  it, only their worst frames over. The frame's time: Phaser's render about 2.4
  ms, 2.07 of it the wall's layer of images; our update 0.66; native work,
  commit and pre-paint about 2.3; DevTools itself about 0.8. The worst frames
  make a sound object per sound (2 to 3 ms), and 54 KB allocated a frame brings
  a minor GC every 1.2 s. The release frame, which plays the round, is 47 ms at
  ×6 (`playRound()` 17.7 of it). A window dragged: each resize step blocks a
  frame for 33 to 193 ms, nearly all of it Phaser's `ScaleManager` resizing the
  canvas from `@fz/phaser`'s `viewport_scaler.ts`; no layout thrash. 120 Hz
  unmeasured, the screen an RDP display at 50 Hz. Layout shift 0.00.
- **Decided:** fix the median, as F1's fixes, each in a commit of its own: the
  allocation per frame found with a heap sampling profile and cut, and
  `@fz/phaser`'s `SpritePlayer` playing pooled sounds rather than making one a
  play (both the view stream's); then the standing wall and the grid's dots
  baked into one texture, only the cells that change redrawn (the scene
  stream's, after its Q4 fixes); then trace again. §9's bar is 4 ms at the worst
  frame, which neither breaker meets, their worst frames over it too, so the
  median is the bar these fixes are held to, and the worst frames go to the user
  with F1's numbers. The release frame stays (about 8 ms unthrottled, once a
  round). The canvas's resize during a drag is `@fz/phaser`'s, shared by every
  game drawn with Phaser, so it goes to the user as a task of its own at the
  merge.
- `dec91e41`, from the shell stream, **trim 4** and `@defer` gone: `onDemand()`
  (`src/app/on_demand.ts`) loads a piece by a hand-written `import()` into a
  `ViewContainerRef`, binding its inputs and outputs, holding a pending task
  while it loads so `whenStable()` waits, a failed load reported and tried again
  at the next press; How to play loads whole at its first press, focus and
  pictures as before, and the debug menu after the drawer's first render, only
  where `DEBUG_MENU` offers it. 16 mutants, all killed; checked by hand on a
  production build. 5,813 tests and 555 in sim, the floors held; the root lint
  passes. **Measured here, every level in:** the main chunk 403.5 kB raw (122.3
  gzip), under 406.8; the scene 54.6 kB (20.4 gzip), over its 51, the bricks'
  art in it; How to play 12.9 kB and the debug menu 12.8 kB, each a chunk of its
  own.
  - **Left, a choice outside this game's code:** a tab left open across a deploy
    finds How to play's old chunk gone; reloading on Vite's `vite:preloadError`
    would mend it, for every lazy chunk, with a guard against a loop. For the
    user at the merge, with the other follow-ups.
- **F1, the input and accessibility pass,** by the rules stream on a production
  build in its own headless Chrome: mouse, keys and touch on levels 1, 18, 27
  and 36; both ways of aiming by mouse and finger; a phone turned and a window
  dragged mid-flight and between rounds; every dialog by keyboard; the four
  palettes (the least text contrast 4.67:1); a saved game taken up, mid-flight
  and between rounds; AZERTY; a lost WebGL context restored; and the
  accessibility tree: all pass. Six issues, none blocking: (1) How to play, its
  chunk slow, opens late with no busy state, takes the focus back from a board
  the player returned to, and offline does nothing; (2) Escape calling a charge
  off says nothing; (3) a lost context leaves the field blank while play goes
  on; (4) the bar's buttons but Pause read their names twice (`aria-label` and
  `title` alike); (5) the board's cards have no role or heading; (6) pointing
  and holding charges slowly for the first 120 frames under 60 fps, Phaser
  capping a frame's time. **Routed:** the four in the shell (1, 3, 4 and 5) to
  the shell stream now; the charge's words and its timing (2 and 6), in
  `GameService` and the steering, to the rules stream after the view stream's
  work on the frame's allocation, which edits them. The screen reader through a
  level, for the user.
- **Q4, levels 19 to 36,** watched by the scene stream as 1 to 18 were: every
  certificate on 11 and 22 deep ended in its line, no needed brick in the danger
  row, no console message. Tricks: bumpers kicking, the prism splitting, every
  fuzzball out of its own portal's twin and none through a shut one, R saying
  "shut", a plate earthing the charge, the U's plates without rivets on 22 deep.
  Thick walls: 932 strikes of a plain fuzzball on shells all bouncing off
  unhurt, 151 charged ones each taking a hit or two; moss growing back a hit
  after each round, 25 times, nowhere else; Bank vault's door letting the hot
  shot in; Labyrinth's portals; Six-pack's dice reading 2 to 6. **Q4 holds for
  all thirty-six levels.** Found: the diamond badge, about 6 px on 22 deep,
  reads as a dot there, the two pairs told by color alone (the art stream's);
  and rings, shards and a fuzzball's fur at a side wall draw past the frame into
  the canvas's margin, up to 174 device px.
- `c20c6571`, from the scene stream, the Q4 fixes: the Cleared card's crew wraps
  under its words (`flex-wrap: wrap-reverse`), so "N friends freed" keeps one
  line; a `rim` layer, last in `LAYERS`, where `FieldPainter`'s `drawRim()`
  draws the lintel, the ceiling and the frame over the bursts and the fuzzballs,
  by layer order alone, so no pass is added; the lintel band unchanged in every
  frame of five plays after. 11 mutants, all killed. 5,815 tests and 555 in sim,
  the floors held; the root lint passes.
- **Decided:** what draws past the frame is cut by the camera's viewport set to
  the framed field, which Phaser scissors at no pass's cost, the lost level's
  shake moved onto the viewport; the scene stream's, after the view stream's
  allocation work, which edits the effects painter, and with the wall baked into
  one texture, each in a commit of its own. The diamond badge made to read at 22
  deep goes to the art stream.
- `516c246e`, from the art stream: a portal's diamond badge hollow and larger
  (its points 0.13 of the cell, its band at least a CSS pixel round a hole of at
  least one), the discs a little larger to hold it, so the two pairs differ in
  shape at the least units; checked here on the art stream's before-and-after
  render at 29 CSS px in the four palettes. 11 mutants, all killed. 5,823 tests
  and 555 in sim, the floors held.
- `f65a2fa0` and `b08e14d4`, from the view stream, F1's first fixes: nothing of
  ours made in a frame of flight (the painters skip what isn't showing and
  redraw only on change, the scene's callbacks made once, `@fz/core`'s
  `FrameSounds` finding a sound by a map and returning at once when none was
  heard); and `@fz/phaser`'s `SpritePlayer` playing each sound on objects made
  once, up to four of a sound at once (`MOST_AT_ONCE`), the oldest restarted
  past that, each marker's config put back before a play so detune stays per
  play. Heap sampling puts a frame's 52 KB almost all in Phaser's own drawing,
  about 34 KB for images and 13 for the field's `Graphics`, which Phaser
  triangulates again each frame; ours fell from about 3.6 KB to 1.3, the sounds'
  from 1.3 to 0.1, and of that 1.3 about 1 KB is `WallPainter`'s, left to the
  scene stream's bake. The ×6 median was 7.09 ms after the first, against F1's
  6.92, and 5.98 and 6.34 over two runs after the second, p95 9.64 and 10.62
  against 12.27; but ×4 didn't move (4.21, 4.03 and 4.18), so the view stream
  reads most of that fall as the runs' spread, not the change. The worst frames
  were 17.66 and 28.32 ms at ×6, 13.96 at ×4. What a frame's time is now is
  Phaser drawing each object, which only the bake addresses. Checked here: the
  game 5,833 tests and 555 in sim, `@fz/core` 369, `@fz/phaser` 719, Snake 423,
  Brick Breaker 1,820 and 180, Asteroid Breaker 3,599 and 1,620, each with its
  lint and typecheck; the root lint passes.
  - **Known, outside the build:** with HTML5 Audio, a scene ended while the page
    is blurred throws on focus, as `hold()` destroys a held sound it had paused;
    it was so before the pool.
- `b849b9a6`, from the shell stream, F1's accessibility issues 1, 3, 4 and 5:
  How to play and the debug menu busy while their chunk loads, a pending open
  dropped by Escape or the focus leaving, a failed load announced; a lost WebGL
  context pausing the run behind a "Restoring the board" card, and no shot let
  fly while the board isn't drawn; the bar's buttons named by their tooltip
  alone, so a name is read once; the cards a `role="group"` headed by an `<h2>`.
  Outside the game: `<fz-bar-overflow>` gains `busy`, the games' global
  stylesheet rings a busy round button, Sound and More actions lose their
  `aria-label`, `@fz/dev`'s layout checks name a control by label, words, then
  title, and the shared accessibility skill says so. 67 mutants, two equivalent
  survivors. Checked here with `yarn verify:full` on the tip, every workspace's
  lint, typecheck, tests with coverage and build, in 228 s: the game 5,899 tests
  and 555 in sim.
  - **The bundle:** the main chunk is now 406.74 kB (124.73 gzip), 0.06 under
    §9's 1.2 × 339; the scene's 56.73 kB (21.44 gzip), over §9's 1.5 × 34 since
    the art went in, which goes to the user.
- `3221299a`, from the rules stream, F1's issues 2 and 6: Escape calling off a
  building charge marks the frame as keyed, so the aim is said with "charge 0"
  (or "hot shot"); and a held press charges by the frames' own clock, the time
  since the last frame between none and 100 ms (`LONGEST_FRAME_MS`), none on the
  first and none for a clock run backwards, while flights stay on Phaser's
  delta. By hand on an upright phone at 15 to 26 fps, the same hold charged 1,
  2, 5, 4 and 0 at the due times, where it had read 0, 0, 2, 2 and 3. The
  steering is in the scene's chunk, 56.84 kB now; the main chunk is unchanged. 7
  mutants, all killed. Checked here: lint, typecheck, 5,908 tests and 555 in sim
  with the floors held, and the root lint; then the game built, its main chunk
  406.74 kB and the scene 56.84 (21.47 gzip), and the root's
  `yarn check:layout`, every game that has one (Sudoku, Snake, Brick Breaker,
  Asteroid Breaker and this one) holding at each shape and turn, in 22 s.
- `b74252c0`, from the scene stream, the scissor: a `FieldCamera`
  (`src/scene/field_camera.ts`, after Asteroid Breaker's) sets the main camera's
  viewport to the frame's outer edge, scrolled to its corner, and sets it again
  on every layout; `frameBounds()` gives that rectangle and the frame's four
  bars, in `field_painter.ts` so the main chunk keeps out of it; a lost level's
  shake moves the viewport by whole device pixels, so `EffectsPainter` owns no
  camera; a pointer past the frame still steers. Two reviews, the first's
  reshaping the shake, 10 comments all taken; 16 mutants, all killed. On Q4's
  canvas-reading harness at 1280×800, nothing drawn past the frame where it had
  been: Powder keg on 11 deep 179 of 765 samples, up to 174 px out; level 12 on
  11 deep 92 of 592; level 15 on 22 deep 61 of 668. At ×6 on the scene stream's
  own GPU-headless trace, the render's median 2.23 and 2.35 ms against 2.32 on
  `c20c6571`, a frame's CPU median 5.61 and 5.71 against 5.77: the scissor costs
  nothing measurable. Checked here: lint, typecheck, 5,915 tests and 555 in sim
  with the floors held, the root lint, the build, its main chunk 406.74 kB and
  the scene's 57.38 (21.63 gzip), and the game's `check:layout`.
- `19caff15`, from the scene stream, the bake: `WallPainter` stamps each brick's
  frames into `WALL_BAKE`, one `DynamicTexture` shown by one image, again only
  for the cells whose stack changed, each cleared first, and whole on a new
  layout, depth, scale or palette and after a restored context; the wall eases
  down by moving the image, cropped at the ceiling; a swell drawn as images over
  its cleared cell, at most 16 at once (`MOST_SWELLING`), and the warning frames
  still images. `FieldPainter` stamps the cells, the band and the dots into
  `FIELD_BAKE` on the same triggers, the lines and the rim staying live
  `Graphics`. Gone: the wall's 594 stacked images, the 168 dots, the ground
  `Graphics` and `cutOver()`; `lower.ts` untouched. Both bakes matched, pixel
  for pixel in a browser, the same frames drawn as images at four setups and
  after a restored context. Two reviews, the second as the first's fixes
  reshaped the specs, which now replay what the bake drew; 10 comments, all
  answered; 34 mutants, all killed. At ×6 on the scene stream's trace against
  the scissor's, two runs each: Phaser's render median 2.23 and 2.35 ms to 1.20
  and 1.21 (its mean 2.28 and 2.37 to 1.14 and 1.15), the images' render, a
  mean, 1.01 and 1.06 to 0.20; a frame's CPU median 5.61 and 5.71 to 4.56 and
  4.46, p95 8.66 and 8.94 to 7.09 and 6.93; GC 0.09 to 0.04. Checked here: lint,
  typecheck, 5,925 tests and 555 in sim with the floors held, the root lint, the
  build, its main chunk 406.74 kB and the scene's 59.30 (22.37 gzip), and the
  game's `check:layout`.
  - **Left for the user:** `dynamicTexture()`
    (`src/scene/painters/dynamic_texture.ts`) copies Asteroid Breaker's private
    helper in `points_painter.ts`; one in `@fz/phaser/scene` would touch the
    library and that game.
- **F1's last trace,** by the scene stream on a production build of `19caff15`,
  the same flight in its GPU headless Chrome at 1280×800, about 1,174 frames a
  trace, none dropped: a frame's main-thread CPU at ×6 4.37 and 4.43 ms at the
  median, 6.98 and 7.08 at p95, 10.86 and 11.13 at p99, 13.97 and 14.56 at
  worst, 68 and 69% of frames over 4 ms; at ×4 3.00 and 2.87, 4.74 and 4.50,
  7.53 and 6.98, 9.64 and 10.13, 12 and 9% over; unthrottled 0.81 at the median
  and 2.17 at worst, none over. Two lighter ×6 traces, without the JS sampler or
  the timeline's detail, had medians of 3.81 and 3.84 and 39 to 42% of frames
  over 4 ms, so the full trace adds about 0.6 ms. The bake's own ×6 medians,
  4.56 and 4.46, are the same build and flight: the difference is the runs'
  spread. On average over the frames round the ×6 median (its 40th to 60th
  percentile): the scene's update 0.38 ms, Phaser's render 1.10, the rest of
  Phaser's frame 0.77 (its step, `gl.clear` and the `requestAnimationFrame`
  call, none of it Angular's), GC near none, and about 2.05 outside JS (the
  task's overhead 0.9, `Commit` 0.57, `PrePaint` 0.44 and about 0.15 in smaller
  events, the microtasks, `IntersectionObserver`, the layers and layout; no
  style recalc).
- **Decided:** F1's performance work ends here. The ×6 median is about 0.4 ms
  over the 4 ms bar in the full traces and a little under it in the lighter
  ones, ×4 well under; apart from the scene's 0.38 ms and what the objects drawn
  cost Phaser, what is left is the browser's and Phaser's floor, and the one cut
  seen, the layers skipping their hidden pools whole, would save 0.1 to 0.15 ms.
  The worst frames, about 14 to 14.6 ms at ×6, and the share over the bar go to
  the user with §9's worst-frame bar.
- `32a90088`, from the shell stream, **Z1** and D1's last pass: the catalog
  entry without `inDevelopment`, the build's screenshots now required, as the
  site's build checks (with the thumbnail removed it failed naming the file);
  `frontend/games/AGENTS.md` without "which is being built"; the game's
  `AGENTS.md` status left at Z2 alone and its floors in words, as the testing
  skill gives them; the README with the play URL and how the game plays, as
  Brick Breaker's has; `ART_ROLES`, `looksOf()`, `billionths()` and
  `inBillionths()` named in `AGENTS.md` and the testing skill, `looksOf()` in
  the content skill. No doc gives a test count, so none was added. One review,
  all comments answered. Checked by the shell stream on the tip: the game's
  lint, typecheck, 5,925 tests and 555 in sim, its build, the site's 177 tests
  and build, the root lint. `vitest.config.ts`'s comment puts the scene's and
  the shell's floors at Asteroid Breaker's, the docs a little under what their
  specs reach; both are true, so it stays.
- **The last checks,** on `32a90088`: `yarn verify:full`, every workspace's
  lint, typecheck, tests with coverage, 24,713 in all, and build, in 204 s;
  `yarn check:layout`, the five games with a check holding at each shape and
  turn.
- **Q6** on the site's Docker image, built with `COMMIT_SHA` at `32a90088`: a
  copy of `check-image.sh` with its base at `http://docker:8086`, since a
  container's ports are on the dind host here rather than on localhost, passes
  for the site and all seven builds; in a headless Chrome, the catalog lists
  Brick Fuzz Pop under Arcade without a badge, its page leads to
  `/play/brick-fuzz-pop/`, a round played (charge 1, 20 points) and How to play
  opened, its chunk loaded; every request 200, the console with no error, no
  warning and no "Refused to load", only DevTools' note on a form field without
  a name. **Q6 passes.**
- **Lighthouse,** Q5's, on the same image at `/play/brick-fuzz-pop/`, desktop
  and mobile: accessibility 100 and SEO 100; best practices 78, for the local
  image's plain HTTP alone, which Cloud Run serves as HTTPS; the
  agentic-browsing checks (`llms.txt`, an ARD manifest) are the site's, outside
  this build. The MCP's audit leaves performance out, so §9's layout-shift row
  stands on the trace's 0.00. Q5's other items: Q4's plays covered every level,
  the input pass levels 1, 18, 27 and 36; the screen reader and Safari are the
  user's.
- **Decided,** on the user's word to merge once done: Part 1 merges first and
  alone, as plan.md's Branches asks, since it changes the live games through the
  shared libraries (Part 2 does too, through `SpritePlayer`, `<fz-bar-overflow>`
  and `_button.scss`, landing on a lift already live). `brick-fuzz-pop-lift`
  rebased onto `origin/main`, its `yarn verify:full` (18,201 tests, in 174 s)
  and `check:layout` passing, and pushed alone as `b6f74baf`, its Verify run
  waited on; then `brick-fuzz-pop` rebased onto it, the lift's commits dropped
  as already there, checked again and pushed. The lift carries Part 1's work
  logs, so they reach `main` with it and leave with Part 2's archive commit.

**Open:**

- Here: the lift's Verify run, then Z2 by the `merge-to-main` skill. This folder
  goes to `docs/archive/brick-fuzz-pop/`, and the work log is deleted, as the
  user asked, rather than merged into one `worklog.md` as Z2 says.
- To the user at the merge: Asteroid Breaker's lint fence; reloading on
  `vite:preloadError` for lazy chunks; `@fz/phaser`'s canvas resize during a
  window's drag; the scene's chunk over §9's 51 kB; the worst frames over §9's
  bar; `dynamicTexture()` shared through `@fz/phaser/scene`; the HTML5 Audio
  throw on focus from `SpritePlayer`'s `hold()`, in every game that uses it; a
  level's name held to its draft by no spec, in any set; Brick Breaker's
  `?debug` slider keeping records; and what no tool here could check, Safari,
  real Firefox's blur behind a dialog, a screen reader through a level, and 120
  Hz.
- Done since the last list: X2, Y2, Y3, trims 1 and 4, Q4 for all thirty-six
  levels, F1 but the user's screen reader and Safari (its passes and Lighthouse,
  their six issues fixed, the scissor, the bake and the last trace), Z1, D1's
  last pass, Q6 and the lift's push.
