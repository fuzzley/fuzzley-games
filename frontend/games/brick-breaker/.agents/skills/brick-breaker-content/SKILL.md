---
name: brick-breaker-content
description: What adding a level, a set, a place, a capsule, a kind of effect, a ball kind, a brick kind or a brick trait to Brick Breaker takes, and what no check asks for. Triggers on: frontend/games/brick-breaker levels, level design, redraw, layout, tints, mark, report:levels, BRICK_KINDS, CAPSULES, BALL_KINDS, TRAIT_RULES, EFFECT_RULES.
---

# Adding to Brick Breaker

What each addition to the game takes, and what no check asks for. How its
specs run is in the `brick-breaker-testing` skill. Paths are relative to
`frontend/games/brick-breaker/`.

## How the Game Holds What It Plays

- **Three catalogs,** in `src/rules/catalog/`, list everything a level can
  hold: `BRICK_KINDS` (`bricks.ts`), `BALL_KINDS` (`balls.ts`) and
  `CAPSULES` (`capsules.ts`). An entry's fields are its interface's there.
  How to play shows every entry, with no change of its own.
- **Records keyed by the catalogs' ids** make the compiler ask for what a
  new entry needs: its art, its symbol, its color, its rule. So add the
  id, run `yarn typecheck`, and write what it asks for. The sections below
  say where each goes, and what the compiler can't ask for.
- **The levels** are JSON, a file for each set in `src/rules/levels/`,
  listed in order in `LEVEL_SETS` (`src/rules/levels/levels.ts`) and
  numbered from 1 across the sets (`LEVELS`).
- **The counts are written by hand** in `index.html`'s descriptions
  ("50 levels") and in `README.md` (the levels, sets, capsules, kinds of
  ball and each brick kind by name). No check holds them.
- **Each section names the spec that holds its piece.** Run one with
  `yarn vitest run --project pure <path>` from
  `frontend/games/brick-breaker/`. The specs that play every level are the
  `sim` project's.

## A Level

Its block in a set's file, as `src/rules/levels/basics.json` shows.
`LevelData` (`src/rules/levels/levels.ts`) says what each key holds, and
`parseLevel()` throws for one it can't read, naming what is wrong. What
neither says:

- **`id` is for good.** The records, the progress and the stars are kept
  by it, so it never changes once shipped.
- **Redrawing a shipped level's bricks raises its `layout`,** a whole
  number from 1, left out for the first. The bests made on the old bricks
  are then let go, while the progress and the stars, kept by the id, stay.
  No check asks for it. Changing `tints` changes no play, so `layout`
  stays.
- **`bricks` are drawn in the shared legend's characters,** `LEGEND` in
  `src/rules/levels/legend.ts`. A `legend` of the level's own adds
  characters, each a kind with its hits or the capsule a gift gives. Only
  the shared legend draws a portal or a slider, as its pair or its way is
  the character's.
- **`tints` make a picture:** 1 red, 2 orange, 3 amber, 4 green, 5 teal,
  6 blue, 7 violet and 8 pink, `.` for the row's. Steel, blast, gift and
  regrowing bricks, cages, keys, gates, bumpers and portals are drawn in
  colors of their own whatever their tint, and a tough or plated brick
  takes its tint a little deeper. By custom a picture leaves steel `.`,
  as Finale does, and gives a blast or gift brick the tint of the part it
  sits in, as Rocket does, so the grid reads as the picture.
- **Leave a row between a portal and the bricks a ball is meant to come
  out to.** A brick in the row above or below a portal is met at once by a
  ball coming out toward it, which turns while still within the disc and
  goes straight back through.
- **Leave a train of sliders room in its row.** Sliders that touch and head
  one way step together, and turn at a wall or an unbroken brick.
- **Its number is its place across the sets.** A level put before others
  moves their numbers, and with them the level each capsule first falls
  from (its `from`), the seed the autopilot plays each level from, and the
  runs two scripts keep by a level's number and its bricks' places: Rocket,
  level 9, in `tools/capture-screenshots.mjs` (`RUN`), and Fuse, level 13,
  in `tools/stored_run.mjs` (`CLEARING_RUN`). `keptRun()` throws for a
  place with no brick.

Then:

1. `yarn vitest run --project pure src/rules/levels/levels.spec.ts src/rules/catalog/catalog.spec.ts`.
2. `yarn vitest run --project sim src/rules/levels/every_level/`, which
   plays it from its number as the seed.
3. `yarn report:levels`, then `yarn report:levels --seeds 20`. Its middle
   time should sit with its set's, rising through the game, and never past
   2:00 at Relaxed on the least field, which the report marks `+`. A long
   endgame (`!`) on one seed in many is luck. On many seeds, leaving the
   same bricks for last, it is a level to redraw. Its `away` is the longest
   the paddle had no ball to meet: a ball held out of its reach, in a
   sealed room or above a wall, shows there only while no other ball is in
   play. Past a minute the report marks it `^`, a play that hangs, which no
   spec holds. `--height 45` plays it on the tallest field, as an upright
   phone shows it.
4. `yarn report:levels --marks`, and its `mark` set to what it prints. A
   redraw sets it again; a star won under the old mark is kept.

What drags an endgame, or holds the ball away from the paddle:

- **Bricks the ball seldom reaches:** bricks above steel, a channel one
  cell wide at a wall, the inner corners of an enclosure, a corridor two
  rows high between steel, and bricks shaded from below by a single steel
  cell. A steel floor under bricks traps the ball above them, and clears
  them fast.
- **Plated bricks.** A ball breaks one only from above or a side, and
  neither the autopilot nor a seeking ball turns toward one, so the last
  of them are met by chance. One against a side wall drags most, and one
  of two hits (`U`) far more than one of one (`u`): Pachinko's cups are of
  one hit.
- **Bricks met only through a portal.** Neither the autopilot nor a
  seeking ball aims at a portal, so the ball comes through by chance. A
  blast right over the room's portal, where a ball coming out meets it at
  once, has the whole room in its reach and clears it at the first entry,
  as in Two rooms. A row left open between the portal and the bricks does
  not help.
- **A room behind a portal, or a pocket left only by narrow channels,**
  holds the ball away from the paddle (`away`, `^`). Switchyard shows the
  shape that doesn't: each key's room a shaft one cell wide at a wall,
  steel over and under it and its key over its portal, so every ball that
  comes out goes straight back.
- **Two bumpers can hold a ball between them** where their middles lie on
  a line flatter than the flattest a ball travels (`FLATTEST`, 20°) and
  near enough that a ball leaving one at the flattest still meets the
  other: within 0.86 units of its middle. Pinball's lowest bumper lies 6
  units across and three rows below each of the other two, on a line of
  27°, and those two, level and 12 units apart, are too far for a ball at
  20° to meet both.

## A Set

- **Its file in `src/rules/levels/`,** as `LevelSetData` describes it,
  imported in `src/rules/levels/levels.ts` and placed in `LEVEL_SETS`.
- **Its `place`** is one of `PLACES`. One new to the game needs its art,
  as "A Place" below says.
- **Its `nudge`** says where a lull's nudge turns a ball in its levels
  (`NUDGES` in `src/rules/levels/level.ts`): `walls`, the default, or
  `unbreakable`, off anything that can't break, as Machines does and a set
  after it would, so a ball looping off steel or bumpers is turned out of
  its loop.
- **The levels spec lists each set's place by its id,** in `placeOf`'s
  spec, and its nudge, in another. A new set adds its own to both.
- **Its paces start about where the last set's end,** kept so by hand: the
  levels spec holds the paces from falling only within a set. A set that
  asks for thought rather than speed starts lower, as Friends does after
  Tricks.

## A Place

- **A member of `PLACES`** (`src/rules/levels/levels.ts`), its id what a
  set's `place` names.
- **Its art in `PLACE_ART`** (`src/view/places/places.ts`), which the
  compiler asks for, as `PlaceArt` describes it. Its `Motif` goes in
  `src/view/places/motifs.ts`: a few shapes about a middle, in shares of
  their size.
- **The places spec and `src/view/places/motifs.spec.ts` hold it** with no
  line added: its tile's commands inside the tile at every scale, its
  contrast between 1.05:1 and 1.2:1 against the field and the page in
  every palette, and its motif to its ink, to two thirds of its size and
  to no polyline's corner sharper than `SHARPEST`. The scene tiles the
  field with it, and the board masks the page with it, with nothing more
  to add.
- **Look at it in a browser too,** in greyscale, with three balls in play:
  the ball still shows first.

## A Capsule With an Effect That Exists

- **Its entry in `CAPSULES`,** among the others by its `from`, as the
  catalog spec holds them in the order they join the pool. The spec holds
  its `from` to the first level it can fall in, so that level's pool takes
  it: the level names no `capsules` of its own, or names this one.
- **A bad one `pays` 2 and says so in its `about`** ("score double"), and
  its effect lasts a time, as the catalog spec holds. A good one leaves
  `pays` out.
- **Its symbol in `SYMBOLS`** (`src/view/art/symbols.ts`), drawn in a
  square in shares of it, reaching no further than its edges. The compiler
  asks for it, and for a new tone's shape in `CAPSULE_ART`
  (`src/view/art/art.ts`).

## A New Kind of Effect

- **A new kind is a new group.** Catching a capsule replaces whatever of
  its effect's kind is in play, and runs beside the other kinds', so an
  effect that must end another is a variant of that one's kind, as
  `paddle-mode`'s two modes are.
- **A member of the `CapsuleEffect` union**
  (`src/rules/catalog/capsules.ts`).
- **Its rule in `EFFECT_RULES`** (`src/rules/bricks/capsules.ts`), its
  place there being its tag's place under the paddle. Most set a field of
  `Field` the rules read as they play, as `seek` sets `seeking`, which
  `src/rules/field/seeker.ts` reads.
- **Its record in `createEffects()`.** The compiler asks for each.
- **The saved game needs nothing:** the effects in play aren't kept across
  a reload.

## A Ball Kind

- **Its entry in `BALL_KINDS`.**
- **Its fur in `FUR`** (`src/view/art/fuzzball_art.ts`), combed into a
  shape of its own so it shows apart from the other kinds without its
  color, and its color in `bricksPalette()`'s `balls`
  (`src/view/colors/palette.ts`). The compiler asks for both.
- **A capsule that makes it,** its effect
  `{ kind: "ball", ball: "<id>", ms }`, which the catalog spec asks for.
- **One that `passes` breaks what it passes through at a hit,** as the
  catalog spec holds, so the physics needs nothing new. Every ball's
  radius is `BALL_RADIUS`: a kind of another size is no catalog entry
  alone.

## A Brick Kind With Traits That Exist

- **Its entry in `BRICK_KINDS`.**
- **Its look in every tint and state in `BRICK_ART`**
  (`src/view/art/brick_art.ts`), and How to play's picture in
  `PICTURED_BRICKS` (`src/view/art/art.ts`). The compiler asks for both,
  and `src/view/art/brick_art.spec.ts` holds every state of it to a frame
  the atlas holds. It stands on the slab (`BRICK_SLAB`), with marks that
  tell it apart by their shape. A round kind is a disc on no slab, as a
  bumper and a portal are drawn through `@fz/phaser/bricks`'
  `bumperMark()` and `portalMark()`.
- **A look the legend lays, or the field changes,** is a frame for each. A
  portal reads its pair and a slider its heading from the `BrickLook`, and
  a cage reads the friend the field frees next from the `CellField` its
  `frameOf()` is handed.
- **Its colors.** A color of its own goes in `bricksPalette()`'s `bricks`
  (`src/view/colors/palette.ts`), its kind joining `UntintedKind`, and the
  contrast spec holds it with no line added. An ink its marks take beside
  the marks' own color goes in `kindInks`, and joins the contrast spec by
  hand: 3:1 against what it is drawn on for one that tells a kind, and
  nothing for one that only shades, as the gift's ribbon and the moss's
  shadow do. Two looks of a kind told apart by ink alone, as a portal's
  two pairs are, the contrast spec holds apart by hue (`deltaE()`), and a
  mark of another shape tells them apart besides.
- **Its character** in the shared legend, or a level's own.
- **Its voice.** The effects spec's `VOICES_OF_KINDS` asks for it, and its
  `EVERY_KIND` field gains its character. A kind knocks as it holds and
  bloops as it breaks, or rings as steel if it never breaks, with nothing
  written. One with a voice of its own takes a line in `VOICES`
  (`src/view/effects/effects.ts`).
- **A sound of its own** is a recipe in `RECIPES` (`tools/build-sounds.mjs`)
  and its name in `SOUNDS` (`src/view/effects/effects.ts`), in the same
  order. `yarn build:sounds` writes the sprite, and the sounds' spec fails
  until the one checked in is what it writes.
- **A level that brings it in.** The catalog spec fails while a kind is
  used by none.

## A Brick Trait

- **A member of the `BrickTrait` union** (`src/rules/catalog/bricks.ts`),
  and its rule in `TRAIT_RULES` (`src/rules/bricks/bricks.ts`), which the
  compiler asks for. `TraitRule` names the moments a rule acts at.
- **Any state it keeps is a field of `Brick`,** set by its rule's `laid`.
- **The saved game keeps that state.** In `src/rules/run/saved_game.ts`
  its key joins `KEPT_OF_BRICK`, and `restoredBrick()` reads it and
  refuses a state no run comes to, which the compiler asks for. Its spec's
  round trip gains the state too, as the `brick-breaker-testing` skill's
  "The Saved Game" says, or a take-up that drops it fails nothing.
- **If it makes a kind round,** a disc at its cell's middle rather than a
  box, as `bumps` and `jumps` do, three places take it by hand. Its kinds
  join `ROUND` (`src/rules/bricks/bricks.ts`) through a set of their own,
  as `BUMPERS` and `PORTALS` do, so the travel leaves the cell open about
  it. `findContacts()` (`src/rules/field/travel.ts`) gains a branch that
  meets its disc with `noteDisc()`, as a bumper's does. And the slab spec
  in `src/view/art/brick_art.spec.ts` leaves its trait out, beside `bumps`
  and `jumps`.
- **If it moves a brick,** as `slides` does, it moves it as
  `src/rules/bricks/sliders.ts` does: `Brick.cell` changes with the
  field's list, each brick moved records `slid` with its way, by which
  `BrickPainter` (`src/scene/painters/brick_painter.ts`) slides its
  picture, and the saved game's `restoredPlace()` refuses a cell no move
  comes to.
- **An event it records** is a member of `FieldEventKind`
  (`src/rules/field/events.ts`) and an entry in `EVENT_EFFECTS`
  (`src/view/effects/effects.ts`), its sound and its flourishes. The
  compiler asks for that, and for its line in the effects spec's
  `VOICES_OF_EVENTS`. A sound of its own is made as a kind's is, above.
- **Its look in `BRICK_ART`,** for each state a player must tell apart.
