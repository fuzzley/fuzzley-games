---
name: brick-fuzz-pop-content
description: What adding a level, a set of levels, a brick kind or a brick trait to Brick Fuzz Pop takes, with the files to write, the order they land in and the checks that hold each. Triggers on: frontend/games/brick-fuzz-pop level, level set, brick kind, brick trait, LEVEL_SETS, BRICK_KINDS, LEGEND, TRAIT_RULES, build.mjs, CASUAL_FLOORS.
---

# Adding to Brick Fuzz Pop

What each addition to the game takes. How the specs run, how the
certificates and the floors are found and replayed, and what to do when a
replay or a floor fails are the
[`brick-fuzz-pop-testing`](../brick-fuzz-pop-testing/SKILL.md) skill's. The
design and the kinds' table ("The bricks") are in
`docs/archive/brick-fuzz-pop/plan.md`. Paths are relative to
`frontend/games/brick-fuzz-pop/`.

## What Holds an Addition

- **The compiler asks for what a new kind or trait needs.** The catalog's
  ids are a type (`BrickKindId`, from `BRICK_KINDS` in
  `src/rules/catalog/bricks.ts`). The records keyed by them, or by a
  trait's kind, fail `yarn typecheck` until each has its entry: `BRICK_ART`
  (`src/view/art/art.ts`), `BRICK_COLORS`
  (`src/view/colors/brick_colors.ts`) and `TRAIT_RULES`
  (`src/rules/bricks/trait_rules.ts`). So does a kind with no character in
  `LEGEND` (`src/rules/levels/legend.ts`), which is keyed by character:
  `src/rules/levels/legend.spec.ts` types its kinds against the catalog's
  ids.
- **How to play, the In this wall panel, the Ready card and the scene's
  pictures read the catalog,** so a new kind changes none of them.
- **The specs hold the rest:**
  - `src/rules/levels/levels.spec.ts`: the rules a level keeps, each kind
    first used at its level, and each drafted wall's rows, bricks and hits.
  - `src/rules/catalog/catalog.spec.ts`: every kind's fields as the
    catalog's rules have them, in its levels' order.
  - `src/rules/levels/legend.spec.ts`: a character for every cataloged
    kind, its hits within its kind's, and each brick's tint.
  - `src/rules/levels/every_level/` and `src/rules/levels/every_floor/`:
    every level's certificate on every depth, its par, and the careless
    player at its set's floor.
  - The specs in `src/view/art/`: every look of every kind in the atlas's
    frames, each kind unlike the others, and every frame within its cell.
  - `src/view/colors/brick_colors.spec.ts` and
    `src/view/colors/contrast.spec.ts`: every kind colored by its tint, its
    pair or its own inks, and those inks against the field in every
    palette.

## A Level

Its block in its set's file in `src/rules/levels/`, with the four keys of
`LevelData` (`src/rules/levels/levels.ts`) and no other, which
`parseLevel()` refuses.

- **Its `id` is for good.** The records, the progress, the certificates and
  the pars are kept by it. `build.mjs` makes it from the draft's `name`, so
  a level renamed takes a new id.
- **Its `bricks`** are a row of nine of the legend's characters for each of
  the wall's rows, from the top, `.` for none. Read `LEGEND` for the
  characters: each names a kind, its hits and the faces a plated brick's
  plates cover, and `@` and `&` are a wall's first and second pair of
  portals.
- **Nobody picks a tint.** `tintOf()`, beside the legend, gives each brick
  its own from where it stands.

### The Rules a Wall Keeps

`parseLevel()` refuses a wall that breaks the first three, naming the level
and the row at fault, and `src/rules/levels/levels.spec.ts` holds every
level to the rest:

- `WALL_ROWS` rows, the highest and the lowest not air, and no more than
  `MOST_AIR` rows of air together, so a jump is earned by breaking bricks.
- A portal mark used twice or not at all, a pair no more than `TWIN_ROWS`
  rows apart, and no second pair (`&`) without a first (`@`).
- A row of steel from side to side only in the wall's top course: over
  everything, or with no air over it and a portal past it.
- An id and a name no other level has, no brick the level needs sealed in,
  and no more cages than `MOST_FRIENDS`.
- In the wall's lowest row, nothing the level needs with more than 3 hits,
  and not every brick plated toward the floor.
- No kind before its `firstLevel`, and each kind first used at that level.

### Drawing It

A wall is drawn in `docs/archive/brick-fuzz-pop/levels/build.mjs`'s
`DRAFTS`: a `name`, a `boon`, its `courses`, each a few rows top first, and
its `order`, the courses by letter from the lowest up, a digit in it the
rows of air before the next course in place of one. Every portal is drawn
`@`, and the script marks a wall's second pair `&`. `SETS` takes the drafts
nine at a time, in order, so a level added rather than redrawn moves every
later set's.

`node docs/archive/brick-fuzz-pop/levels/build.mjs` writes every set's draft
beside itself, from any folder. Copy the set's file into `src/rules/levels/`
as it is written, and give a new level its row in `levels.spec.ts`' table of
the drafts, which nothing else asks for.

**A level's number is its place across the sets.** A level put before
others moves their numbers, and with them the seeds of their floors' games
and the `firstLevel` the catalog must give each kind they bring in. The
screenshots (`tools/capture-screenshots.mjs`) and the layout check
(`LAYOUT_RUN`, `tools/stored_run.mjs`) keep a run on a level by its number,
and a line certified anew under the screenshots' run moves it.

### Then

1. `yarn vitest run --project pure src/rules/levels`, which parses it and
   holds it to the rules above.
2. `yarn certify:levels --set <set id>`, or `--level <id or number>`, for
   its lines and its pars.
3. `yarn vitest run --project sim src/rules/levels`, which replays its
   lines on every depth and holds the careless player to its set's floor.
4. `yarn report:levels`. A level under its set's floor is redrawn from its
   courses, or eased, and certified again, until its floor spec passes on
   its own seeds.

The testing skill's "The Certificates and the Floors" and "When a Replay
Fails" say how the scripts and the specs work, and what to do when one
fails.

## A Set

- **Its drafts,** nine in `build.mjs`'s `DRAFTS`, and its entry in that
  script's `SETS`, which writes its file.
- **Its file** in `src/rules/levels/`, an `id`, a `name` and its `levels`,
  imported in `src/rules/levels/levels.ts` and placed in `LEVEL_SETS`.
- **Its floor,** the times in 100 the careless player must clear each of
  its levels, in `CASUAL_FLOORS` (`src/testing/casual.ts`).
- **Its three floor specs,**
  `src/rules/levels/every_floor/<set id>_11.spec.ts`, `_13` and `_22`, each
  `holdEveryFloor(import.meta.filename)`, as every set's are.
- **Its certificates,** `yarn certify:levels --set <set id>`, imported into
  `CERTIFICATES` (`src/testing/every_level.ts`). The debug menu finds the
  file on its own. `src/testing/every_level.spec.ts` fails while a set in
  `LEVEL_SETS` lacks its certificates or its floor specs.
- **Its kinds,** if it brings any in: a file in `src/rules/catalog/kinds/`,
  spread into `BRICK_KINDS` in its set's place.

## A Brick Kind With Traits That Exist

1. **Its art, first, unwired.** A `KindArt` (`src/view/art/art.ts`) in its
   own file of `src/view/art/kinds/`, specced beside it: the frames a brick
   of the kind stacks (`layersOf()`) and the frames it brings to the atlas
   (`frames()`), each named in `FRAMES` and `FRAME_NAMES`
   (`src/view/art/frames.ts`). A kind drawn in inks of its own takes them
   from `wallPalette()`'s `kinds` (`InkedKind`,
   `src/view/colors/palette.ts`), which the contrast spec holds.
   `BRICK_ART` can't take it yet: it refuses an id the catalog lacks.
2. **Its character** in `LEGEND`, with hits its kind allows, if the legend
   lacks it. It lands with the catalog entry, as `yarn typecheck` refuses a
   kind either lacks. The legend spec counts the kinds, so a new one moves
   that count.
3. **Its catalog entry, its `BRICK_ART` line and its `BRICK_COLORS` line,
   in one commit,** as the compiler refuses any without the others.
   - The entry goes in its set's file of `src/rules/catalog/kinds/`, where
     its place is its place in How to play, in the order the levels bring
     the kinds in. `BrickKind`'s docs say what each field holds, and the
     catalog spec holds them to one another. Its `name` and `about` are
     player text: the `player-text` skill has the shape of a catalog line.
   - The `BRICK_ART` line goes in the catalog's order, as `art.spec.ts`
     holds its ids to it.
   - The `BRICK_COLORS` line is the color its bricks and their shards
     take: its tint's ink, its pair's inks' body, or its own inks'
     (`inked()`).
4. **A level that brings it in,** at its `firstLevel`, which comes with its
   set. The levels spec holds a kind to its first level only once the
   levels reach it, so a kind is cataloged before its set's levels are
   built.

Some specs list every kind by hand, to edit with it: the catalog spec's ids
in order, `src/rules/flight/cast.spec.ts`'s reaches and
`src/rules/grid.spec.ts`'s shapes, `src/view/art/atlas_frames.spec.ts`'s
frames in order, `src/view/colors/brick_colors.spec.ts`'s `TINTED` and
`PAIRED` for a kind colored by its tint or its pair,
`src/testing/art_frames.ts`'s `looksOf()` for one colored by its pair, and
the spec that holds its set's kinds, beside its kinds file or in the catalog
spec.

## A Brick Trait

- **A member of the `BrickTrait` union** (`src/rules/catalog/bricks.ts`),
  with its settings.
- **Its rule** in a file of its own in `src/rules/bricks/traits/`, a
  `TraitRule` (`src/rules/flight/hooks.ts`), whose doc gives the four
  moments of a flight a rule can act at, and the `Hooks` it acts through.
  Its place in `TRAIT_RULES`, and in the stand-ins' `STAND_IN_RULES`
  (`src/testing/stand_ins.ts`): the compiler asks for both.
- **What no hook does yet** is a new member of `Hooks`, which the flight's
  `Flying` (`src/rules/flight/flight.ts`) implements.
- **A trait that acts between rounds** rather than in a flight does so
  where the wall comes down, as `regrow()` does in
  `src/rules/wall/lower.ts`.
- **A trait that lets a shot reach a brick a new way** is taught to
  `sealedIn()`, the flood fill of `src/rules/levels/levels.spec.ts`, which
  knows only the open field, portals and zaps.
- **A new kind of event** it adds to `FlightEvent`
  (`src/rules/flight/events.ts`, in the order its doc gives) needs:
  - its sound and flourishes in `effectsOf()`
    (`src/view/effects/effects.ts`), and its case in `RoundPlay`'s
    `takeIn()` (`src/view/round_play.ts`), which the compiler and lint
    hold to every kind;
  - its place among a moment's events where `fly()` orders them and where
    `orderProblemsOf()` (`src/testing/flight_fixtures.ts`) checks them, a
    fuzzball's event a rank in each's table, `BALL_RANK` and `BALL_ORDER`,
    which the compiler asks for;
  - its drawing in the scene's painters.
- **A trait that changes how a cataloged kind's shot plays fails the
  replays,** and is certified again as the testing skill's "When a Replay
  Fails" says.
