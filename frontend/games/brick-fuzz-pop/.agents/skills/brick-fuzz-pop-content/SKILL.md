---
name: brick-fuzz-pop-content
description: What adding to Brick Fuzz Pop takes — a level, a set of levels, a brick kind or a brick trait — the files to write, the legend and the rules a wall keeps, the catalog and the typed records the compiler holds complete, the order a kind's art and its catalog entry land in, the certificates, par and the careless player's floor, and the specs that check each. Triggers on: brick fuzz pop level, brick fuzz pop new level, brick fuzz pop level design, brick fuzz pop level set, brick fuzz pop brick kind, brick fuzz pop brick trait, brick fuzz pop legend, brick fuzz pop LEVEL_SETS, brick fuzz pop BRICK_KINDS, brick fuzz pop BRICK_ART, brick fuzz pop TRAIT_RULES, brick fuzz pop LEGEND, brick fuzz pop tintOf, brick fuzz pop parseLevel, brick fuzz pop build.mjs, brick fuzz pop redraw, brick fuzz pop floor, CASUAL_FLOORS, brick fuzz pop certify, frontend/games/brick-fuzz-pop levels.
---

# Adding to Brick Fuzz Pop

This skill walks through what each addition to the game takes. The layers
and the rest of the code are in the workspace's `AGENTS.md`; how the specs
run, how the certificates and the floors are found and replayed, and what
to do when a replay or a floor fails are the
[`brick-fuzz-pop-testing`](../brick-fuzz-pop-testing/SKILL.md) skill's. The
design, the kinds' table ("The bricks") and the rules a level keeps are in
`docs/archive/brick-fuzz-pop/plan.md`. Paths are relative to
`frontend/games/brick-fuzz-pop/`.

## How the Game Holds What It Plays

- **The catalog,** `BRICK_KINDS` in `src/rules/catalog/bricks.ts`, is every
  kind a level can hold, spread from a file a set in
  `src/rules/catalog/kinds/`, in How to play's order, written
  `as const satisfies`, so its ids are a type (`BrickKindId`).
- **Records keyed by those ids,** or by a trait's kind, make the compiler
  ask for what a new entry needs: `BRICK_ART` (`src/view/art/art.ts`) its
  art, `BRICK_COLORS` (`src/view/colors/brick_colors.ts`) the color its
  bricks and their shards take, and `TRAIT_RULES`
  (`src/rules/bricks/trait_rules.ts`) a trait's rule. How to play, the In
  this wall panel and the Ready card read the catalog (`helpEntries()`,
  `kindIntroducedAt()`), and the scene bakes a picture of each kind
  (`src/scene/pictures.ts`), with no change of their own.
- **The levels** are JSON, a file a set in `src/rules/levels/`, listed in order
  in `src/rules/levels/levels.ts` (`LEVEL_SETS`) and numbered from 1 across the
  sets (`LEVELS`). Each is a copy of its draft in
  `docs/archive/brick-fuzz-pop/levels/`, which
  `docs/archive/brick-fuzz-pop/levels/build.mjs` writes from each wall's
  courses.
- **The checks** that hold it whole:

  | Check                      | Where                                                            | What it holds                                                                                                                                                                     |
  | -------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | The compiler               | everywhere                                                       | Every cataloged kind has its art, its color and its legend character, every legend character a cataloged kind, and no art or color a kind the catalog lacks; every trait its rule |
  | `parseLevel()`             | `src/rules/levels/levels.ts`                                     | A wall's shape, its characters, its air, its portals and its steel                                                                                                                |
  | The levels spec            | `src/rules/levels/levels.spec.ts`                                | The rest of plan.md's rules a level keeps, each kind first used at its level, and each draft as plan.md's table has it, but Switchboard, eased since                              |
  | The catalog spec           | `src/rules/catalog/catalog.spec.ts`                              | Every kind's name and sentence, its hits, points and traits as the catalog's rules have them, in its levels' order                                                                |
  | The legend spec            | `src/rules/levels/legend.spec.ts`                                | A character for every cataloged kind, its hits within its kind's, and each brick's tint                                                                                           |
  | The replays and the floors | `src/rules/levels/every_level/`, `src/rules/levels/every_floor/` | Every level's certificate on every depth, its par, and the careless player at its set's floor                                                                                     |
  | The art's specs            | `src/view/art/`                                                  | Every look of every kind in the atlas's frames, each kind unlike the others, and every frame within its cell                                                                      |
  | The colors' spec           | `src/view/colors/brick_colors.spec.ts`                           | Every cataloged kind colored by its tint, its pair or its own inks                                                                                                                |
  | The contrast spec          | `src/view/colors/contrast.spec.ts`                               | A kind's inks against the field in every palette                                                                                                                                  |

## A Level

Its block in its set's file, and nothing else, as `parseLevel()` refuses a
key no level has:

- `id`, kebab-case, for good: the records, the progress, the certificates
  and the pars are kept by it. `name`, what the player sees.
- `boon`, what the shot after each jump gets: `"hot"` or `"triple"`
  (`Boon`, in `src/rules/shot.ts`).
- `bricks`: a row of nine characters for each of the wall's rows, from the
  top, in the legend's characters (`LEGEND`, in
  `src/rules/levels/legend.ts`), `.` for none. Read the legend for the
  characters: each names a kind, its hits and the faces a plated brick's
  plates cover, and `@` and `&` are a wall's first and second pair of
  portals.

Nobody picks a tint: `tintOf()` gives a plain or tough brick its row's, the
eight taking turns from the wall's lowest row up; a cage its number among
the wall's cages, from the lowest row up and left to right, which is the
ink of the friend it frees; a portal its pair's mark; and every other kind
0, as it keeps inks of its own.

### The Rules a Wall Keeps

`docs/archive/brick-fuzz-pop/plan.md`'s "The rules a level keeps", as the code
holds them. `parseLevel()` refuses, naming the level, and the row where one is
at fault:

- fewer or more rows than `WALL_ROWS`, a row not nine wide, a character the
  legend lacks, and a highest or lowest row of air;
- more than `MOST_AIR` rows of air together, so a jump is earned by
  breaking bricks;
- a portal mark used other than twice, a pair more than `TWIN_ROWS` rows
  apart, and a second pair (`&`) with no first (`@`);
- a row of steel from side to side anywhere but the wall's top course: over
  everything, or with no air over it and a portal past it.

`levels.spec.ts` holds every level to the rest:

- an id and a name no other level has;
- no brick the level needs sealed in, by a flood fill of its own
  (`sealedIn()`): a fuzzball reaches every cell but those of solid bricks
  that never break, from under the wall, over its top row and through a
  portal to its twin, and each zapper it reaches zaps what its pattern
  reaches, chained within one round's rows. A trait that reaches a brick
  any other way needs teaching there;
- no more cages than a crew's friends (`MOST_FRIENDS`);
- nothing the level needs in the wall's lowest row with more than 3 hits,
  and not every brick there plated toward the floor;
- no kind used before the level that brings it in (its `firstLevel`), and
  each kind first used at that level;
- each drafted wall's rows, needed bricks and hits as plan.md's table of
  the drafts has them, but Switchboard's, eased since in `build.mjs`, a row
  of the table in the spec for each.

### Drawing It

A wall is drawn in `docs/archive/brick-fuzz-pop/levels/build.mjs`'s `DRAFTS`, a
`name`, a `boon`, its `courses`, each a few rows top first, and its
`order`, the courses by letter from the lowest up, a digit in it the rows
of air before the next course in place of one. Every portal is drawn `@`,
and the script marks a wall's second pair `&`. `SETS` takes the drafts
nine at a time, in order, so a level added rather than redrawn moves every
later set's, and a set takes its entry there.

`node docs/archive/brick-fuzz-pop/levels/build.mjs` writes every set's draft
beside itself, from any folder, and `pictures` after it prints plan.md's
appendix. Copy the set's file into `src/rules/levels/` as it is written, and
give a new level its row in `levels.spec.ts`' table of the drafts, which nothing
else asks for.

Its number is its place across the sets: a level put before others moves
their numbers, and with them the seeds of their floors' games and the
`firstLevel` the catalog must give each kind they bring in. The
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

- Its drafts, nine in `build.mjs`'s `DRAFTS`, and its entry in that
  script's `SETS`, which writes its file.
- Its file in `src/rules/levels/`, an `id`, a `name` and its `levels`,
  imported in `src/rules/levels/levels.ts` and placed in `LEVEL_SETS`. The
  Levels dialog shows each set under its name.
- Its floor, the times in 100 the careless player must clear each of its
  levels, in `CASUAL_FLOORS` (`src/testing/casual.ts`).
- Its three floor specs, `src/rules/levels/every_floor/<set id>_11.spec.ts`,
  `_13` and `_22`, each `holdEveryFloor(import.meta.filename)`, as every
  set's are.
- Its certificates, `yarn certify:levels --set <set id>`, imported into
  `CERTIFICATES` (`src/testing/every_level.ts`); the debug menu finds the
  file on its own. `src/testing/every_level.spec.ts` fails while a set in
  `LEVEL_SETS` lacks its certificates or its floor specs.
- Its kinds, if it brings any in: a file in `src/rules/catalog/kinds/`,
  spread into `BRICK_KINDS` in its set's place.

## A Brick Kind With Traits That Exist

1. **Its art, first, unwired.** A `KindArt` in its own file of
   `src/view/art/kinds/`, specced beside it: the frames a brick of the kind
   stacks (`layersOf()`, reading a `KindLook`, a brick's look but its kind,
   so art for an uncataloged kind can be asked) and the frames it brings
   to the atlas (`frames()`), each named in `FRAMES` and `FRAME_NAMES`
   (`src/view/art/frames.ts`). A kind
   drawn in inks of its own takes them from `wallPalette()`'s `kinds`
   (`InkedKind`, `src/view/colors/palette.ts`), which the contrast spec
   holds. `BRICK_ART` can't take it yet: its record is held to the
   catalog's ids, and refuses one the catalog lacks.
2. **Its character** in `LEGEND`, with hits its kind allows, if the legend
   lacks it, with its entry: the legend spec types the catalog's ids as
   the legend's, and `parseLevel()` and `wallFrom()` lay a character's kind
   out as a cataloged one, so `yarn typecheck` refuses a kind either lacks.
   The legend spec counts plan.md's kinds, so one beyond them moves that
   count.
3. **Its catalog entry, its `BRICK_ART` line and its `BRICK_COLORS` line,
   in one commit,** as the compiler refuses any without the others, the
   `BRICK_ART` line in the catalog's order, as `art.spec.ts` holds its ids
   to it. `BRICK_COLORS` (`src/view/colors/brick_colors.ts`) is the color
   a brick of the kind is drawn in, which its shards take: its tint's ink,
   its pair's inks' body, or its own inks' (`inked()`), kept apart from the
   art so the shell can show it without loading the art; its spec holds
   every cataloged kind to one of the three. The entry, in its
   set's file of `src/rules/catalog/kinds/`, where its place is its place
   in How to play:
   - `name`, a capital and lower-case words, and `about`, a sentence for
     How to play;
   - `hits`, the fewest a legend gives it, and `mostHits`, the most, or
     `"never"` and 0 for one that never breaks, which takes the `never`
     trait too;
   - `needed`, exactly when it breaks; `points`, for each hit it had whole,
     so a kind of two hits scoring 50 has 25; `solid`, unless it teleports;
   - `firstLevel`, the level that brings it in, as plan.md's table of the
     bricks names it, the catalog kept in the order the levels bring the
     kinds in;
   - `traits`, each with its settings.

   Its shape follows from its traits (`shapeOf()`, `src/rules/grid.ts`):
   round for one that kicks, open for one not solid, else a box.

4. **A level that brings it in,** at its `firstLevel`, which comes with its
   set: the levels spec holds a kind to its first level only once the
   levels reach it, so a kind is cataloged before its set's levels are
   built.

The specs that take a new kind up on their own: the catalog spec's rules for
every kind, the legend spec, the levels spec's laying out of every cataloged
character, the art's specs over every kind and every frame, How to play's
picture of every kind in `src/scene/wall_scene.spec.ts`, and the random
flights and the reference cast, which draw from the catalog. The ones that
list every kind, to edit with it: the catalog spec's ids in order,
`src/rules/flight/cast.spec.ts`'s reaches and `src/rules/grid.spec.ts`'s
shapes, `src/view/art/atlas_frames.spec.ts`'s frames in order,
`src/view/colors/brick_colors.spec.ts`'s `TINTED` and `PAIRED` for a kind
colored by its tint or its pair, `src/testing/art_frames.ts`'s `looksOf()`,
which gives a portal its pairs for tints and every other kind the eight
inks, for one colored by its pair, and the spec that holds its set's kinds
to plan.md's table, beside its kinds file or in the catalog spec.

The specs that fly a stand-in for a kind from `src/testing/stand_ins.ts`,
as the testing skill says, can move to the real kind's character, the
stand-in going once no spec uses it.

## A Brick Trait

- A member of the `BrickTrait` union (`src/rules/catalog/bricks.ts`), with
  its settings.
- Its rule in a file of its own in `src/rules/bricks/traits/`, a
  `TraitRule` (`src/rules/flight/hooks.ts`) at the moments it acts in a
  flight: `struck` before a strike's hits are taken, setting whether it
  hurts and earths on the `Struck` it is handed; and `broken` as the brick
  breaks, `met` as a fuzzball meets its disc and `entered` as a fuzzball's
  middle crosses into its cell, each acting through `Hooks`. Its place in
  `TRAIT_RULES`, and in the stand-ins' `STAND_IN_RULES`; the compiler asks
  for both.
- What no hook does yet is a new member of `Hooks`, which the flight's
  `Flying` (`src/rules/flight/flight.ts`) implements.
- A trait that acts between rounds rather than in a flight does so where
  the wall comes down, as `regrow()` does in `src/rules/wall/lower.ts`.
- A new kind of event it adds to `FlightEvent`
  (`src/rules/flight/events.ts`, in the order its doc gives) needs its
  sound and flourishes in `src/view/effects/effects.ts`, whose
  `effectsOf()` the compiler holds to every kind of event, and its drawing
  in the scene's painters.
- Each level's certificate replays the flight: a trait that changes how a
  cataloged kind's shot plays fails the replays, and is certified again
  as the testing skill says.
