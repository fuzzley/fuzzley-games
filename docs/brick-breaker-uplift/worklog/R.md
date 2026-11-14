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
