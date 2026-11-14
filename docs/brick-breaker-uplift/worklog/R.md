# Stream R's log

Stream R builds the rules of the thirty levels, the seeker, double pay and
stars (`../implementation-plan.md` §6, R1 to R3), in the worktree
`bbu/R`. Paths are relative to `frontend/games/brick-breaker/` unless they
start with `docs/` or `frontend/`.

## R1. The thirty

### 2026-11-14: before any change

- The branch held the integration tip, 79b1ed92.
- `yarn report:levels --seeds 12` on it took 70 s and printed exactly what
  the plan's `levels/report-before.txt` holds. Saved as
  `docs/brick-breaker-uplift/levels/report-r1-before.txt`.

### 2026-11-14: a level's layout, and bests kept by it (C5)

- `LevelData.layout`, a whole number from 1, left out for the first
  (`FIRST_LAYOUT`, in `level.ts` beside `TINTS`); `layoutOf()` reads it
  from the data, and `parseLevel()` refuses one that isn't whole or is
  below 1, and hands it on as `Level.layout`. `fieldFrom()` lays its
  pictured level on the first.
- `Stats.layouts`: the layout each level's bests were made on, for every
  level with bests. `statsOf()` keeps a level's bests only where the layout
  stored, or the first where none is, is the one it has now, so stats
  stored before this change read as made on layout 1, and a layout stored
  as anything but that number drops the bests. `withLevelPoints()` takes
  the level's data (its id and layout) rather than its id, and writes the
  layout with a best. The stored entry keeps version 1.
- `StatsService.recordLevel()` keeps its signature, so `GameService` and
  the levels dialog's spec are untouched: it finds the level by its id among
  `GAME_LEVELS` and hands its data on. A level the game doesn't have keeps
  nothing, which `statsOf()` would have dropped at the next read anyway.
- `stats.spec.ts` reads stats for levels of its own (two as first drawn, one
  redrawn at layout 2), so the game's redraws don't move it.

Added to another stream's files (P's `src/app/stats/`): the lookup in
`recordLevel()`; in its spec, `layouts` in two expected values, and two
specs (the layout stored for a redrawn level; nothing kept for a level the
game doesn't have). Added to `src/testing/field_picture.ts`: `layout` in
`fieldFrom()`'s level.

Choices where the plan was silent:

- A layout stored as anything but a number, `null` among them, drops the
  bests; only a level with no layout stored at all reads as on the first.
- The stats write a layout for every level with bests, 1 included, rather
  than only a raised one: C5 reads "the layout each level's bests were made
  on, missing for one made before this slice".
- The stats aren't checked against a level's layout as a best is kept: the
  stats come only from `statsOf()` over the same levels, which already let
  another layout's bests go.

Checks, after the review's fixes: the workspace's `lint`, `typecheck` and
`test` (59 files, 2,012 specs, 11.7 s with six workers), and the root's
`lint`.

Review (a fresh reviewer, on the staged change):

1. The spec of bests dropped for another layout used `toMatchObject()`
   with empty records, which match anything, so it passed with the code
   broken. Fixed: it reads the levels and layouts and expects them `toEqual`
   empty.
2. A stored `null` layout read as the first, and an id named like an
   inherited key (`constructor`) read the prototype's. Fixed: the layout is
   read only from the record's own key (`Object.hasOwn()`), and the spec
   gains `null` as a third way to drop the bests.
3. Two paragraphs of `AGENTS.md` weren't re-wrapped, and the `statsOf()`
   clause ran into the list of movers. Fixed: a sentence each, re-wrapped,
   and "the bests made on the one before".
4. The content skill didn't lead a redraw to `layout`. Fixed: `layout` and
   `redraw` among its triggers, and the report's step says a redraw of a
   level that has shipped raises its `layout`.

### 2026-11-14: the four redraws

- Stripes, Checker, Shelf and Vault take their bricks from
  `docs/brick-breaker-uplift/levels/revisions.json`, each at `"layout": 2`,
  their ids, names, paces and pools as they were, so the progress on them
  stays and their bests start again.
- `yarn report:levels --seeds 12` on this commit took 70 s and printed
  exactly what the plan's `levels/report-after.txt` holds, all thirty
  levels: the redraws play as the plan's copy played them.
- The workspace's `AGENTS.md` and skills name none of the four, so neither
  changes.
- The plan's `mocks/make-mocks.mjs` and `levels/check-levels.mjs` took the
  bricks before a redraw from the game's files, which now hold the redraw.
  Each redraw in `levels/revisions.json` now keeps its bricks before as
  `was`, taken from 79b1ed92, which both scripts read (and
  `art/levels.mjs`'s `LevelData` types). `make-mocks.mjs` run again writes
  the three sheets byte for byte as committed, and `check-levels.mjs` says
  Stripes was 78 bricks again.

Checks: the workspace's `lint`, `typecheck` and `test` (59 files, 2,012
specs, 11.5 s with six workers, every level cleared at every speed in
time), and the root's `lint`.

Review (a fresh reviewer, on the staged change):

1. The plan's mock script would draw the redraw on both sides of
   `level-changes.svg` the next time it ran, and `check-levels.mjs` already
   printed "was 50 and 50" for Stripes: both read the bricks before from the
   game. Fixed as above, with `was` in `revisions.json`.
2. `stats.spec.ts` named its level on the first layout "stripes", which is
   now the game's redrawn one, so it read as the opposite of the game.
   Fixed: its levels are `first`, `second` and `redrawn`.

### 2026-11-14: the seven pictures' tints

Each picture took its rows' stripes; each now has tints of its own, as
Rocket and Finale have, in `TILE_INKS`' order (1 red, 2 orange, 3 amber,
4 green, 5 teal, 6 blue, 7 violet, 8 pink). No brick changes, so no layout
does. Steel, blast and gift bricks are drawn in colors of their own
whatever their tint; by the custom Rocket and Finale set, steel is left
`.` and a blast or gift brick is marked with the tint of the part it sits
in, so the grid reads as the picture.

- **Pyramid:** a face in the sun, amber (3), from the left to the middle
  column, and a face in shade, orange (2), to the right. Weighed: none
  other; the two faces were the first choice and held.
- **Arch:** a toy rainbow, as a playroom has: the rim of tough bricks red
  (1), and inside it two bands by their distance from the rim, amber (3)
  and green (4); the red band runs down the pillars to the floor. Weighed:
  red, orange, amber, whose warm bands ran together; red, amber, blue,
  which read less as a rainbow.
- **Diamond:** a gem, deepening from its heart: plain bricks teal (5), the
  ring of twos blue (6), the rim of threes violet (7). Weighed: blue and
  teal alone, flatter; a playing card's red diamond in red, pink and orange,
  which read as a blot.
- **Castle:** blue stone (6), red caps on the towers (1), lit windows amber
  (3), and the keep's body amber (3), its gifts marked 3. Weighed: a teal
  body, too near the blue stone; violet stone over an orange body, fine but
  less of a castle.
- **Lanterns:** an orange beam (2), paper lanterns amber (3) round their
  blast bricks, a row hanging from the beam and a row set in a blue wall
  (6), over a violet floor (7). Weighed: red lanterns, which lost their red
  blast bricks inside them; pink lanterns in the wall; a violet beam, which
  ran into the floor's frame.
- **Gears:** an amber hub (3) in each ring of blast bricks, which are marked
  3 and keep their own color, the steel teeth left alone, over a bed of
  three rows in blue (6), the tough rows deeper by the palette's own mix.
  Weighed: a violet bed; a teal bed with red hubs, lost among the red blast
  bricks.
- **Hourglass:** a violet frame top and bottom (7), sand amber (3) in both
  bulbs. Weighed: a red or an orange frame, both nearer the sand.

How they were judged: each drawn as a page of cells in the light and dark
inks, the choices above beside each other (a scratch page, not kept: it was
a means to the choice, and the log names what it weighed), then the chosen
ones looked at in the game, served on port 9404 in a headless Chrome page
of its own, at 1280 × 720: Pyramid, Arch, Diamond, Castle, Lanterns, Gears
and Hourglass on the default light palette, and Castle on Midnight blue.
Each read as its picture, the marks and the tough bricks' deeper tints
clear on every tint. The redrawn Stripes showed its notch. The page was
closed and the server stopped.

The content skill now names the eight tints by number, says that steel,
blast and gift bricks are drawn in their own colors whatever their tint,
the custom for marking them, and that tints change no play, so no layout.

The plan's `art/sheet-field.mjs` draws the game's Castle with the game's
tints, so `art/make-art.mjs` run again would draw it in these; that is the
game as it now is, so it is left reading the game. `mocks/make-mocks.mjs`
run again writes its sheets as committed.

Checks: the workspace's `lint`, `typecheck` and `test` (59 files, 2,012
specs, 15.7 s with six workers), and the root's `lint`.

Review (a fresh reviewer, on the staged change):

1. The skill said steel, blast and gift bricks' own colors were why steel
   is left `.` and the others tinted, as if their tints showed. Fixed: the
   skill says they are drawn in their own colors whatever their tint, and
   that leaving steel `.` and marking the others is a custom, Finale's and
   Rocket's; it numbers the eight tints.
2. The log's Gears and Castle bullets described rings and gifts as amber,
   which draw in their own colors. Fixed: they say what shows and what is
   only marked.
3. The comparison pages weren't kept and the log didn't name the choices
   weighed. Answered: each bullet now names what was weighed and why it
   lost; the pages were scratch, drawn by a throwaway script, and aren't
   the plan's assets, so they stay out of the tree.
4. The Lanterns bullet read as both rows set in the wall. Fixed.
5. The notes came after Checks, unlike the earlier entries. Fixed.
