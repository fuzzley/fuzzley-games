---
name: brick-breaker-content
description: What adding to Brick Breaker takes — a level, a set of levels, a capsule, a new kind of effect, a ball kind, a brick kind or a brick trait — the files to write, the catalogs and typed records the compiler holds complete, what the saved game must keep, and the specs and the autopilot's report that check each. Triggers on: brick breaker level, new level, level design, level set, brick kind, brick trait, capsule, power-up, ball kind, BRICK_KINDS, CAPSULES, BALL_KINDS, TRAIT_RULES, EFFECT_RULES, legend, tints, pace, drops, report:levels, frontend/games/brick-breaker levels.
---

# Adding to Brick Breaker

This skill walks through what each addition to the game takes. The layers
and the rest of the code are in the workspace's `AGENTS.md`, and how its
specs run in the `brick-breaker-testing` skill. Paths are relative to
`frontend/games/brick-breaker/`.

## How the Game Holds What It Plays

- **Three catalogs,** in `src/rules/catalog/`, list everything the levels
  can hold: `BRICK_KINDS` (`bricks.ts`), `BALL_KINDS` (`balls.ts`) and
  `CAPSULES` (`capsules.ts`). Each is a readonly object written
  `as const satisfies`, so its ids are a type, in How to play's order. How
  to play shows every entry, its name, its sentence and its picture, with
  no change of its own.
- **Records keyed by those ids** make the compiler ask for what a new entry
  needs: its art, its symbol, its color, its rule. A new id that compiles
  has everything drawn and played.
- **The levels** are JSON, a file for each set in `src/rules/levels/`,
  listed in order in `src/rules/levels.ts` (`LEVEL_SETS`) and numbered from
  1 across the sets (`LEVELS`).
- **The checks** that hold it whole:

  | Check              | Where                            | What it holds                                                                                                       |
  | ------------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
  | The compiler       | everywhere                       | Every trait and effect has its rule, and every brick, ball and capsule its art                                      |
  | The catalog spec   | `src/rules/catalog.spec.ts`      | Every entry's name and sentence, the weights, every kind used by a level, every capsule able to fall from its level |
  | The levels spec    | `src/rules/levels.spec.ts`       | Every level parses, its id and name its own, a needed brick a ball can reach, a pace that never falls in a set      |
  | The autopilot spec | `src/rules/autopilot.spec.ts`    | Every level cleared at every speed within eight minutes of game time, its last three bricks within one              |
  | The contrast spec  | `src/view/contrast.spec.ts`      | Every color against the field, and the outline and the marks against what they cross, in every palette              |
  | The scene spec     | `src/scene/bricks_scene.spec.ts` | Every kind, in every state, drawn from a frame of the atlas                                                         |

## A Level

Its block in a set's file:

- `id`, kebab-case, for good: the records and the progress are kept by it,
  so it never changes once shipped. `name`, what the player sees.
- `bricks`: a row of 13 characters for each of up to 16 rows, from the
  top, in the shared legend's characters (`src/rules/legend.ts`): `o` plain,
  `2` to `4` tough, `#` steel, `*` blast, `?` gift, `~` ghost, `+`
  regrowing, `.` none. A `legend` of its own adds characters, each a kind
  with its hits or the capsule a gift gives.
- `tints`, if it is a picture: each brick's tint, 1 to 8, in the same shape,
  `.` for its row's; without them each row takes the next tint, as stripes.
- `pace`, the ball's speed against its speed's own, which never falls
  within a set; `drops`, the chance a needed brick lets a capsule fall, if
  not its set's; `capsules`, the pool, if not every capsule whose level has
  come.

Its number is its place across the sets: a level put before others moves
their numbers, and with them the levels each capsule first falls from. The
screenshots keep a run on level 9, Rocket, by the places of its bricks
(`tools/capture-screenshots.mjs`), and `keptRun()` throws for a place with
no brick.

Then:

1. `yarn vitest run src/rules/levels.spec.ts src/rules/catalog.spec.ts`.
2. `yarn vitest run src/rules/autopilot.spec.ts`, which plays it from its
   number as the seed.
3. `yarn report:levels`, then `yarn report:levels --seeds 20`: its middle
   time should sit with its set's, rising through the game, and a long
   endgame (`!`) on one seed in many is luck, but on many seeds, leaving
   the same bricks for last, it is a level to redraw.

What drags an endgame, as the levels so far have shown: bricks above steel,
a channel one cell wide at a wall, the inner corners of an enclosure, a
corridor two rows high between steel, and bricks shaded from below by a
single steel cell. A steel floor under bricks traps the ball above them,
and clears them fast.

## A Set

Its file in `src/rules/levels/`, with its `id`, `name`, `drops` (the
chance of a capsule its levels share) and `levels`, imported in
`src/rules/levels.ts` and placed in `LEVEL_SETS`. The Levels dialog shows
each set under its name. The levels spec holds a set's paces from falling
only within it, so a new set's paces start where the last set's end, kept
so by hand: Basics runs 1 to 1.06, Steel 1.06 to 1.12 and Tricks 1.12 to
1.2.

## A Capsule With an Effect That Exists

- Its entry in `CAPSULES`: its `name` and `about`, its `tone` (`bad` ones
  never fall at Relaxed), its `weight` against the others in a pool, the
  level it first falls `from`, and its `effect`.
- Its shape in `CAPSULE_ART` (`src/view/art.ts`) and its symbol in
  `SYMBOLS` (`src/view/symbols.ts`); the compiler asks for both, and its
  tag under the paddle is drawn from the same.
- The announcer says its name as it is caught; How to play lists it.

## A New Kind of Effect

- A member of the `CapsuleEffect` union (`src/rules/catalog/capsules.ts`):
  its kind is its group, so catching one replaces whatever of its kind is
  in play.
- Its rule in `EFFECT_RULES` (`src/rules/capsules.ts`): `start` as it is
  caught, and `end` to undo it as its time runs out, the next of its group
  is caught, or a life is lost.
- Its record in `createEffects()`. The compiler asks for each.
- The effects in play aren't kept across a reload, so the saved game needs
  nothing.

## A Ball Kind

- Its entry in `BALL_KINDS`: its `damage` (a number of hits, or `breaks`),
  whether it `passes` through what it breaks, whether it `reaches` the
  bricks around, and its `speed`.
- Its look in `BALL_ART` (`src/view/art.ts`) and its color in
  `bricksPalette()`'s `balls` (`src/view/palette.ts`); the compiler asks
  for both.
- A capsule whose effect is `{ kind: "ball", ball: "<id>", ms }`.
- The physics needs nothing new while one that passes breaks what it
  passes through at a hit, as the catalog spec holds. Every ball's radius
  is `BALL_RADIUS`: a ball of another size needs a `size` here, which the
  sweep, the paddle's reach and the check that no ball sits where a
  regrowing brick would grow read where they now read `BALL_RADIUS`.

## A Brick Kind With Traits That Exist

- Its entry in `BRICK_KINDS`: its `name` and `about`, its `hits` and
  `mostHits`, whether a level `needed` it broken, its `points` for each hit,
  and its `traits`.
- Its look in every tint and state in `BRICK_ART`
  (`src/view/brick_art.ts`) and How to play's picture in `PICTURED_BRICKS`
  (`src/view/art.ts`); the compiler asks for both. A color of its own, as
  steel's, blast's and gift's, goes in `bricksPalette()`'s `bricks`, which
  the contrast spec then needs to hold.
- Its character in the shared legend, or a level's own legend.
- A level that brings it in: the catalog spec fails while a kind is used by
  none.

## A Brick Trait

- A member of the `BrickTrait` union (`src/rules/catalog/bricks.ts`).
- Its rule in `TRAIT_RULES` (`src/rules/bricks.ts`), at the moments it
  acts: `laid` as the level lays the brick out, `hit` before a hit's
  damage, `broken` as it breaks, and `step` at each step; the compiler asks
  for the rule.
- Any state it keeps on `Brick`, set by its rule's `laid`.
- **The saved game keeps that state:** in `src/rules/saved_game.ts`, its
  key joins `KEPT_OF_BRICK`, from which `SavedBrick` is typed and by which
  `savedField()` writes it and `takeUpField()` lays it on the new field,
  and `restoredBrick()` reads it and refuses a state no run comes to; the
  compiler asks for that. In `src/rules/saved_game.spec.ts`, the round
  trip's crowd gains a brick with the trait, and `PLAYED_STATES` the
  state, so a take-up that drops it fails.
- Its look in `BRICK_ART`, for each state a player must tell apart.
