---
name: brick-breaker-content
description: What adding to Brick Breaker takes — a level, a set of levels, a capsule, a new kind of effect, a ball kind, a brick kind or a brick trait — the files to write, the catalogs and typed records the compiler holds complete, what the saved game must keep, and the specs and the autopilot's report that check each. Triggers on: brick breaker level, new level, level design, level set, brick kind, brick trait, capsule, power-up, seeker, double pay, ball kind, BRICK_KINDS, CAPSULES, BALL_KINDS, TRAIT_RULES, EFFECT_RULES, EVENT_EFFECTS, voice, sound, build-sounds, legend, tints, layout, redraw, place, PLACE_ART, backdrop, pace, drops, mark, streak mark, report:levels, long level, frontend/games/brick-breaker levels.
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
  listed in order in `src/rules/levels/levels.ts` (`LEVEL_SETS`) and
  numbered from 1 across the sets (`LEVELS`).
- **The checks** that hold it whole:

  | Check               | Where                               | What it holds                                                                                                                                   |
  | ------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
  | The compiler        | everywhere                          | Every trait and effect has its rule, and every brick, ball and capsule its art                                                                  |
  | The catalog spec    | `src/rules/catalog/catalog.spec.ts` | Every entry's name and sentence, the weights, every kind used by a level, every capsule able to fall from its level                             |
  | The levels spec     | `src/rules/levels/levels.spec.ts`   | Every level parses, its id and name its own, needed bricks in reach, a key for a gate, a pace that never falls in a set, every set in its place |
  | The autopilot specs | `src/rules/levels/every_level/`     | Every level cleared at every preset speed in eight minutes, its last bricks in one; and in time on the tallest field                            |
  | The contrast spec   | `src/view/colors/contrast.spec.ts`  | Every color against the field, and the outline and the marks against what they cross, in every palette                                          |
  | The places spec     | `src/view/places/places.spec.ts`    | Every set's place drawn, each tile's commands inside it, and every place dim over the field and the page, in every palette                      |
  | The scene spec      | `src/scene/bricks_scene.spec.ts`    | Every kind, in every state, drawn from a frame of the atlas                                                                                     |
  | The effects spec    | `src/view/effects/effects.spec.ts`  | Every event's sound and flourishes, and every kind's voice, each written in a record the compiler holds complete                                |
  | The sounds' spec    | `tools/build-sounds.spec.ts`        | The sprite checked in is what `tools/build-sounds.mjs` writes now, its sounds `SOUNDS`, in order                                                |

## A Level

Its block in a set's file:

- `id`, kebab-case, for good: the records and the progress are kept by it,
  so it never changes once shipped. `name`, what the player sees.
- `layout`, the number of the layout its bricks are in, a whole number
  from 1, left out for the first. Redrawing a level that has shipped raises
  it, so the bests made on the old bricks are let go, while the progress
  and the stars, kept by the id, stay.
- `bricks`: a row of 13 characters for each of up to 16 rows, from the
  top, in the shared legend's characters (`src/rules/levels/legend.ts`):
  `o` plain, `2` to `4` tough, `#` steel, `*` blast, `?` gift, `~` ghost,
  `+` regrowing, `c` cage, `u` and `U` plated, of one hit and two, `k` key,
  `=` gate, `.`
  none. A `legend` of its own adds characters, each a kind with its hits or
  the capsule a gift gives.
  A level with a gate has a key, whose last opens it.
- `tints`, if it is a picture: each brick's tint, 1 to 8, in the same shape,
  `.` for its row's; without them each row takes the next tint, as stripes.
  The eight are `@fz/phaser/color`'s `TILE_INKS`: 1 red, 2 orange,
  3 amber, 4 green, 5 teal, 6 blue, 7 violet and 8 pink. Steel, blast,
  gift and regrowing bricks are drawn in colors of their own, whatever
  their tint. By
  custom a picture leaves steel `.`, as Finale does, and marks a blast or
  gift brick with the tint of the part it sits in, as Rocket does, so the
  grid reads as the picture. Changing tints changes no play, so no bests:
  `layout` stays.
- `pace`, the ball's speed against its speed's own, which never falls
  within a set; `mark`, the streak its third star asks for, which
  `yarn report:levels --marks` prints by one rule for every level, and at
  which the field rings the ball and writes the count as at a streak's
  step; `drops`,
  the chance a needed brick lets a capsule fall, if not its set's;
  `capsules`, the pool, if not every capsule whose level has come.

Its number is its place across the sets: a level put before others moves
their numbers, and with them the levels each capsule first falls from. The
screenshots keep a run on level 9, Rocket, by the places of its bricks
(`tools/capture-screenshots.mjs`), and `keptRun()` throws for a place with
no brick.

Then:

1. `yarn vitest run --project pure src/rules/levels/levels.spec.ts src/rules/catalog/catalog.spec.ts`.
2. `yarn vitest run --project sim src/rules/levels/every_level/`, which
   plays it from its number as the seed.
3. `yarn report:levels`, then `yarn report:levels --seeds 20`: its middle time
   should sit with its set's, rising through the game, and never past 2:00 at
   Relaxed on the least field, which the report marks `+`; a long endgame
   (`!`) on one seed in many is luck, but on many seeds, leaving the same
   bricks for last, it is a level to redraw, raising its `layout` once it has
   shipped. `--height 45` plays it on the tallest field, as an upright phone
   shows it.
4. `yarn report:levels --marks`, and its `mark` set to what it prints. A
   redraw sets it again; a star won under the old mark is kept
   (`src/rules/run/stars.ts`).

What drags an endgame, as the levels so far have shown: bricks above steel,
a channel one cell wide at a wall, the inner corners of an enclosure, a
corridor two rows high between steel, and bricks shaded from below by a
single steel cell. A steel floor under bricks traps the ball above them,
and clears them fast.

Plated bricks drag an endgame too. A ball breaks one only from above or a
side, and neither the autopilot nor a seeking ball turns toward one, so the
last of them are met by chance. One against a side wall, with a side fewer
to be met from, drags most.

## A Set

Its file in `src/rules/levels/`, with its `id`, `name`, `place` (one of
`PLACES` in `src/rules/levels/levels.ts`, which `placeOf()` checks:
`playroom`, `workshop`, `funfair`, `garden` or `arcade`), `drops` (the chance
of a capsule its levels share) and `levels`, imported in
`src/rules/levels/levels.ts` and placed in `LEVEL_SETS`. Its place's look is
its art in `PLACE_ART` (`src/view/places/places.ts`), which a place new to
the game needs, as "A Place" below says. The Levels dialog
shows each set under its name. The levels spec lists each set's place by its
id, so a new set adds its own there. It holds a set's paces from falling only
within it, so a new set's paces start where the last set's end, kept so by
hand: Basics runs 1 to 1.06, Steel 1.06 to 1.12 and Tricks 1.12 to 1.2. A set that asks for
thought rather than speed starts lower: Friends runs 1.12 to 1.18.

## A Place

- A member of `PLACES` (`src/rules/levels/levels.ts`), its id what a set's
  `place` names.
- Its art in `PLACE_ART` (`src/view/places/places.ts`), which the compiler
  asks for: its `Motif`, in `src/view/places/motifs.ts`, a few shapes about
  a middle in shares of their size, of which a pick from 0 to 1 chooses one
  and turns it; whether a drawing board's grid lies under them; and how
  much of the text it takes over the field and, a little more, over the
  page.
- The places spec holds its tile's commands inside it at every scale a
  field is drawn at, and it to 1.05:1 to 1.2:1 against the field and the
  page in every palette, so it reads but never competes with what is
  played; the motifs spec, `src/view/places/motifs.spec.ts`, holds its
  motif, as it holds every one of `PLACES`, to its ink, to two thirds of
  its size and to no polyline's corner sharper than `SHARPEST`, as
  `coverOf()` counts on. The scene tiles the field with it, and the board
  masks the page with it, with nothing more to add. Look at it in a
  browser too, in greyscale, with three balls in play: the ball still
  shows first.

## A Capsule With an Effect That Exists

- Its entry in `CAPSULES`: its `name` and `about`, its `tone` (`bad` ones
  never fall at Relaxed), its `weight` against the others in a pool, the
  level it first falls `from`, and its `effect`. A bad one `pays` 2: bricks
  pay double while its effect is in play, after the streak's multiplier,
  which its `about` says ("pay double"), and its effect lasts a time, as the
  catalog spec holds; a good one leaves `pays` out.
- Its symbol in `SYMBOLS` (`src/view/art/symbols.ts`), drawn in a square
  in shares of it, reaching no further than its edges, which the compiler
  asks for; its tag under the paddle is drawn from the same. Its tone's
  shape, in `CAPSULE_ART` (`src/view/art/art.ts`), lays it across the
  capsule's face, and a bad one's gold lip says it pays double; the
  compiler asks for a new tone's.
- The announcer says its name as it is caught, and "Double pay." for one
  that pays; How to play lists it.

## A New Kind of Effect

- A member of the `CapsuleEffect` union (`src/rules/catalog/capsules.ts`):
  its kind is its group, so catching one replaces whatever of its kind is
  in play, and runs beside the other groups' effects, as the Seeker's
  `seek` runs beside a fire or blast ball's `ball`. Each group in play
  shows a tag under the paddle, in `EFFECT_RULES`' order (`EFFECT_KINDS`).
- Its rule in `EFFECT_RULES` (`src/rules/bricks/capsules.ts`): `start` as it is
  caught, and `end` to undo it as its time runs out, the next of its group
  is caught, or a life is lost. Most set a field of `Field` the rules read
  as they play, as `seek` sets `seeking`, which `src/rules/field/seeker.ts`
  reads.
- Its record in `createEffects()`. The compiler asks for each.
- The effects in play aren't kept across a reload, so the saved game needs
  nothing.

## A Ball Kind

- Its entry in `BALL_KINDS`: its `damage` (a number of hits, or `breaks`),
  whether it `passes` through what it breaks, whether it `reaches` the
  bricks around, and its `speed`.
- Its fur in `FUR` (`src/view/art/fuzzball_art.ts`), combed into a shape
  of its own so it shows apart from the other kinds without its color, and
  its color in `bricksPalette()`'s `balls` (`src/view/colors/palette.ts`);
  the compiler asks for both. Only a normal ball's fur lifts with the
  streak (`STREAK_FUR`); another kind keeps its own at any streak.
- A capsule whose effect is `{ kind: "ball", ball: "<id>", ms }`.
- The physics needs nothing new while one that passes breaks what it
  passes through at a hit, as the catalog spec holds. Every ball's radius
  is `BALL_RADIUS`: a ball of another size needs a `size` here, which the
  move `src/rules/field/travel.ts` sweeps, the paddle's reach and the check
  that no ball sits where a regrowing brick would grow read where they now
  read `BALL_RADIUS`.

## A Brick Kind With Traits That Exist

- Its entry in `BRICK_KINDS`: its `name` and `about`, its `hits` and
  `mostHits`, whether a level `needed` it broken, its `points` for each hit,
  and its `traits`.
- Its look in every tint and state in `BRICK_ART`
  (`src/view/art/brick_art.ts`), on the slab (`BRICK_SLAB`) with marks that
  tell it apart by their shape, and How to play's picture in
  `PICTURED_BRICKS` (`src/view/art/art.ts`); the compiler asks for both. A
  color of its own, as steel's, blast's, gift's and a regrowing brick's
  earth, goes in `bricksPalette()`'s `bricks`, and an ink its marks take
  beside the marks' own color in its `kindInks`. The contrast spec holds
  an ink that tells a kind to 3:1 against what it is drawn on, and leaves
  out one that only shades, as the gift's ribbon and the moss's shadow
  do. A kind that `regrows` shows the ring a regrowing brick fills as it
  grows back while it is broken (`regrowingFrame()`, which `cellFrame()`
  picks), with nothing more.
- Its character in the shared legend, or a level's own legend.
- Its voice: the sound of a hit it holds and of its breaking, which the
  effects spec's `VOICES_OF_KINDS` asks for, and its field of every kind
  (`EVERY_KIND`) holds one of. A kind knocks as it holds and bloops as it
  breaks, or rings as steel if it never breaks; one that sounds in a voice
  of its own takes its line in `VOICES` (`src/view/effects/effects.ts`),
  and a sound of its own is a recipe in `tools/build-sounds.mjs` and a name
  at the end of `SOUNDS`, written into the sprite by `yarn build:sounds`.
  A broken brick's sound, whichever, rises along the streak.
- A level that brings it in: the catalog spec fails while a kind is used by
  none.

## A Brick Trait

- A member of the `BrickTrait` union (`src/rules/catalog/bricks.ts`).
- Its rule in `TRAIT_RULES` (`src/rules/bricks/bricks.ts`), at the moments it
  acts: `laid` as the level lays the brick out, `hit` before a hit's
  damage, `broken` as it breaks, and `step` at each step; the compiler asks
  for the rule.
- Any state it keeps on `Brick`, set by its rule's `laid`.
- An event it records, as a cage's freeing records `freed`: a member of
  `FieldEventKind` (`src/rules/field/events.ts`), and its entry in
  `EVENT_EFFECTS` (`src/view/effects/effects.ts`), its sound and the
  flourishes it plays, which the compiler asks for, as the effects spec's
  `VOICES_OF_EVENTS` does. A sound of its own is made as a kind's is,
  above.
- **The saved game keeps that state:** in `src/rules/run/saved_game.ts`, its
  key joins `KEPT_OF_BRICK`, from which `SavedBrick` is typed and by which
  `savedField()` writes it and `takeUpField()` lays it on the new field,
  and `restoredBrick()` reads it and refuses a state no run comes to; the
  compiler asks for that. In `src/rules/run/saved_game.spec.ts`, the round
  trip's crowd gains a brick with the trait, and `PLAYED_STATES` the
  state, so a take-up that drops it fails.
- Its look in `BRICK_ART`, for each state a player must tell apart.
