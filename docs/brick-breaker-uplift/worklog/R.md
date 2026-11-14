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

### 2026-11-14: each set's place (C12)

- `LevelSetData.place`, with `PLACES` and their type `Place`
  (`playroom`, `workshop`, `funfair`, `garden`, `arcade`) in `levels.ts`:
  Basics is in the playroom, Steel the workshop, Tricks the fun fair, and
  the garden and the arcade wait for Friends and Machines. Nothing draws a
  place yet; L4 does.
- A set's file is JSON, which TypeScript reads with its strings widened, so
  `place` is text in the data, as a level's capsules are, and `placeOf()`
  checks it as a `Place`, or throws naming the set and the place. The levels
  spec holds the game's three sets to their places, by each set's id,
  takes a set in the garden and the arcade, and refuses "fun fair", as a
  slip would write it.
- `place` is required, as every set has one, so every set a spec draws
  gains `place: "playroom"`: in `levels.spec.ts`, `autopilot.spec.ts`,
  `progress.spec.ts`, `saved_game.spec.ts`, `stats.spec.ts`,
  `src/testing/play.ts`, and in P's `game.service.spec.ts` and
  `stats.service.spec.ts` (a field added to a literal, nothing else).
- The workspace's `AGENTS.md` names a set's place and `placeOf()`; the
  content skill says what a set's `place` is; both skills' lines on the
  levels spec say it holds every set to its place.

Choices where the plan was silent: `placeOf()` beside the sets rather than
`Level.place`, since a place is a set's (C12), and L4, which draws it, is
the one to say how the scene reads it.

Checks: the workspace's `lint`, `typecheck` and `test` (59 files, 2,016
specs, 11.6 s with six workers), the root's `lint`, and, as R1's last
commit to touch `src/rules`, the coverage of `pure` and `dom`, which held
the floor: every file R1 changed at 100% but `levels.ts`'s branches, whose
one gap, `line[column] ?? NO_BRICK` in `checkTints()`, was there before.

Review (a fresh reviewer, on the staged change):

1. The spec refused "attic" as no place, but the plan gives the Attic, a
   set it sketches, the attic for its place. Fixed: it refuses "fun fair",
   as a slip in a set's file would write the fun fair's id.
2. The game's places were pinned as a list by position, and the skill
   didn't say a new set must add its own. Fixed: the spec holds them by
   each set's id, and the skill's "A Set" says so.
3. `LevelEntry.number` was "its place in the game", beside a set's
   `place`. Fixed: "its number in the order played"; the report's typedef
   follows in the report's commit.
4. "Its spec" in `AGENTS.md` now followed `placeOf()`'s sentence. Fixed:
   "`levels.ts`'s spec". And `PLACE_IDS` with `Place` mixed the
   workspace's two patterns (`CAPSULE_IDS` with `CapsuleId`, `SPEEDS` with
   `Speed`). Fixed: `PLACES`, as §5.1 fixes the type's name `Place` and
   leaves the list's to R1.

Checks after the fixes: the workspace's `lint`, `typecheck` and `test`, and
the root's `lint`.

### 2026-11-14: the report's mark for a long level, and the reports

- `tools/report-levels.mjs` marks, with `--seeds` on the least field, a
  level whose middle time at Relaxed, as printed, is past 2:00: `+` after
  the time (`LONG_LEVEL_SECONDS`, at the slowest speed, `speeds[0]`, which
  the rules hand on slowest first). `+` reads as "over" and collides with
  neither `-`, a play that didn't clear its level, nor `!`, a long endgame.
  Like `!` with `--seeds`, it fails nothing. A middle that didn't clear its
  level shows `-` alone. The usage now ends with a line on all three marks,
  which `--help` prints, and the file's comment, the workspace's `AGENTS.md`
  and the content skill say what `+` means.
- The cells of a level's plays at a speed don't know the speed, so the
  report's table hands on each play with the speed it was played at
  (`Play`), from which the middle's cell reads it.
- `report-levels.spec.ts`: the usage; the mark by the middle play, past
  2:00 and not at it, while the longest is past it, at Relaxed and not at
  another speed; by the seconds printed (120.6 s marked, 120.4 s not); none
  on a taller field; none on a middle that didn't clear; and none without
  `--seeds`. Its rules hand each play its seed, so a level's plays can
  differ.
- `LevelEntry.number` in the report's typedef is "its number in the order
  played", as `levels.ts` now says it.
- `yarn report:levels --seeds 12` on R1's whole change took 70 s and
  printed exactly what the plan's `levels/report-after.txt` holds, all
  thirty levels: the tints and the places change no play. No level is past
  2:00 at Relaxed (Lanterns' 1:58 is the longest), so no `+` shows. Saved as
  `docs/brick-breaker-uplift/levels/report-r1-after.txt`. On the before
  report's figures, `+` would have fallen on Checker (2:05) and Vault
  (2:47), and not on Stripes, whose 2:00 as printed isn't past it.

The four redraws, middle time and, in brackets, the longest endgame, before
and after R1:

| Level     | Relaxed                    | Normal                    | Fast                      |
| --------- | -------------------------- | ------------------------- | ------------------------- |
| 1 Stripes | 2:00 (0:24) → 1:29 (0:20)  | 1:32 (0:14) → 1:09 (0:17) | 1:20 (0:13) → 0:55 (0:12) |
| 4 Checker | 2:05 (0:30) → 1:21 (0:19)  | 1:38 (0:19) → 1:02 (0:26) | 1:14 (0:11) → 0:54 (0:13) |
| 12 Shelf  | 1:55 (1:02!) → 1:08 (0:28) | 0:58 (0:10) → 0:55 (0:25) | 1:03 (0:47) → 0:38 (0:18) |
| 20 Vault  | 2:47 (0:44) → 1:41 (0:18)  | 2:25 (0:26) → 1:02 (0:17) | 1:40 (0:23) → 1:18 (0:14) |

Choices where the plan was silent:

- No line under the table counts the `+` levels: `@fz/dev/report`'s tallies
  count plays, and a long level is a level, not a play. Changing the
  library for a count the eye reads off one column wasn't worth a lift.
- The limit is the time as printed, rounded to the second, so a cell never
  reads `2:00+`; `!` compares steps, as the spec it mirrors does, but `+`
  has no spec behind it, and the budget is the time a reader sees.
- `+` is only for the least field, where the 2:00 was set; a taller field's
  times stretch, as `!`'s limit does, and the plan sets no budget there.

Checks, after the review's fixes: the workspace's `lint`, `typecheck` and
`test` (59 files, 2,021 specs, 11.4 s with six workers), and the root's
`lint`; the report run again with the fixed script printed the saved one
byte for byte. This commit touches neither `src/rules` nor `src/view`; the
coverage ran at the commit before.

Review (a fresh reviewer, on the staged change):

1. `+` held a taller field to the least field's 2:00, so `--seeds 20
--height 45`, as the skill suggests in turn, would mark most levels.
   Fixed: `+` marks only on the least field, said so in the usage,
   `AGENTS.md` and the skill, with a spec at `--height 35`.
2. Every seed of a spec's level played alike, so a mark judged by the
   longest or the first play would pass. Fixed: the spec's rules hand each
   play its seed, and the spec plays 100, 121 and 200 seconds (marked) and
   100, 120 and 200 (not).
3. A cell could read `2:00+`, the steps past 2:00 by less than half a
   second. Fixed: the mark compares the seconds as printed, with a spec at a
   tenth of a second a step.
4. Nothing checked the `"relaxed"` literal against the rules' speeds.
   Fixed: the mark is the slowest speed's, `speeds[0]`, which the rules hand
   on slowest first.

## R2. The seeker and double pay

### 2026-11-14: before any change

- The branch held the integration tip, d839e569, and was rebased mid-package
  onto bfc1a8c8, which holds K1 (levels 31 to 33). The work so far was set
  aside in a temporary commit for the rebase and unpacked after; the one
  collision, `restoredField()`'s last lines in `saved_game.ts`, kept both
  sides (K1's gates and R2's `darePoints`).
- `yarn report:levels --seeds 12` on bfc1a8c8 took 77 s; its first thirty
  levels print exactly what `report-r1-after.txt` holds. Saved as
  `docs/brick-breaker-uplift/levels/report-r2-before.txt`.

### 2026-11-14: double pay (C4), and the saved game's version (C20)

- `Capsule.pays`, 2 for Narrow paddle and Fast ball, left out for the rest.
  `Field.pay` is the most the effects in play pay, 1 with none, set by
  `settlePay()` in `src/rules/bricks/capsules.ts` as each effect starts and
  ends, so two at once still double and the pay ends with the last of them,
  or with the last ball lost.
- A hit scores its points times the streak's multiplier times the pay;
  `Field.darePoints` keeps what the pay added, apart from `streakPoints`.
  `LevelTally.dares` is it, which `tallyOf()` takes out of the bricks' line
  and `pointsOf()` adds back. The cleared card shows "Double pay" between
  Streaks and Bonus, only where it isn't nothing.
- Both bad capsules' `about` says bricks pay double while they last, and the
  announcer says "Narrow paddle. Double pay." (`describeCaught()`). The
  catalog spec holds a capsule to paying double, and saying so, exactly when
  it is bad. Relaxed drops no bad capsule, as before (its spec stands).
- The saved game keeps `darePoints` beside `streakPoints`, refusing one that
  isn't a count or that, with the streaks', passes the level's points.
  `SAVED_GAME_VERSION` rises to 2, once for the branch, covering K1's gates
  as well (C20). The round trip catches a Fast ball as it starts, so its
  play reaches dare points, which `PLAYED_STATES` now asks for.

Added to other streams' files: P's `src/app/board/board.component.ts`, the
"Double pay" line in `tallyLines`, and its spec's case for it;
`src/app/play/game.service.spec.ts`, `dares` in the tally's sum and two
cases (the announcer's words, the tally's dares); `src/app/levels/`'s spec,
the new spec level in its list; `src/app/play/saved_game.service.spec.ts`
and `src/app/app.component.spec.ts`, the version read from
`SAVED_GAME_VERSION` where they wrote 1, and a case for a run kept under 1.
To `src/testing/play.ts`, the spec level `dare` (before `last`, now 9): a
narrow paddle's gift the ball, kept under by `under()`, sends straight
back into the paddle, then a row of blast bricks above, paying double. In
K's and others' shared files: `Field.darePoints` and `Field.pay` in
`field.ts`.

Choices where the plan was silent:

- `Field.pay` is a field the effects set, rather than worked out at each
  hit, as the contract names it, so a hit reads one number.
- The announcer adds "Double pay." to a paying capsule's name, the card's
  words for it, rather than a longer sentence.
- How to play's Scoring paragraph (P's) is left alone: each bad capsule's
  sentence says it pays double, beside its picture.

Checks, after the review's fixes: the workspace's `lint`, `typecheck` and
`test` (59 files, 2,165 specs, 12.3 s with six workers), and the root's
`lint`.

Review (a fresh reviewer, on the staged change):

1. The change rewrote the doc comment of P's `tallyLines` into two lines,
   beyond the line it added. Fixed: the comment is P's again.
2. Five specs of when the pay starts and ends sat in `scoring.spec.ts`,
   though `settlePay()` is `bricks/capsules.ts`'s. Fixed: they are
   `capsules.spec.ts`'s "double pay", reading `Field.pay`; `scoring.spec.ts`
   keeps what a hit scores under it (once, after the multiplier, with two
   at once, with a good capsule).
3. The shell's spec that the tally adds up to the score still cleared only
   Blasts, where nothing pays double, and a second case repeated the board
   spec's 600. Fixed: the sum is checked on Blasts and on Dare, and the
   repeat is gone.
4. Smaller points, each fixed: a garbled comment in the saved game
   service's spec, removed; `playedField()`'s doc now names the dare
   points it sets; two `AGENTS.md` sentences rewrapped, one reworded ("a
   capsule caught (with its double pay)"). And the catalog spec asked a bad
   capsule to pay without asking it to last, while the field pays only for
   an effect in play: it now holds every capsule that pays to an effect of
   a time.

### 2026-11-14: the seeker (C1, C2)

- `src/rules/field/seeker.ts` is the seeker. Each step, before its travel,
  a ball in flight that seeks and rises turns toward the middle of the
  nearest brick the level needs that it can see above it, by 45° a second
  at most
  (`SEEKER_TURN`, 45 × `STEP_S` a step), then is settled by `settleBall()`
  as every turn is, so it never travels flatter than `FLATTEST`. A falling
  ball is left alone. It allocates nothing and draws nothing, so a field
  plays the same from its seed.
- The Seeker capsule (`seeker`: good, weight 4, from level 11, 12 s) is
  the effect group `seek`, which sets `Field.seeking`, and every ball in
  flight seeks while it lasts. It runs beside a fire or blast ball, as its
  spec shows. How to play gives it its sentence beside its picture.
- The lent seeker: `Field.dryBounces` counts the balls that leave the
  paddle (a serve, a bounce, a caught ball as it is let go, by a launch or
  by itself) and starts again at 0 as any brick the level needs breaks. As
  the paddle meets a ball with 3 needed or fewer (`SEEKER_LEND.needed`) and
  3 or more dry bounces (`SEEKER_LEND.bounces`), it lends that ball the
  seeker (`Ball.seeks`) and records `seeking`. The ball seeks until it
  breaks a brick the level needs, or is lost. The autopilot's spec holds
  `SEEKER_LEND.needed` to `ENDGAME` and `GLOW_BRICKS`.
- The saved game keeps `dryBounces` (a count, or refused); whether a ball
  seeks isn't kept, as no ball in flight is. The version stays 2.
- `seeking` has an entry in `EVENT_EFFECTS` with no flourish and no sound,
  and the Seeker's symbol in `SYMBOLS` is a plain target (a ring and a
  dot), for L5 to replace.
- The autopilot needs no change for the turn: it meets only falling balls
  (`ball.dy <= 0` is skipped where it picks the ball to meet), and a seeker
  turns only a rising one. A ball it aims at a brick may be turned on its
  way toward a nearer one, which it doesn't foresee, as C1 allows. Its
  line of sight moved to `grid.ts`
  (`inSight()`), which the seeker uses too: the same walk along the line,
  moved whole, so it aims exactly as before.

Choices where the plan was silent:

- The target is the nearest needed brick the ball can see above it and
  break from below, not the nearest needed brick: one whose middle is
  above the ball's, which a straight line reaches past no solid cell, and
  no plated brick. The plain nearest brick
  turned balls into steel and into plates' undersides: Mushroom's
  endgame at Relaxed failed its sim spec, and the autopilot's spec that it
  aims only at a brick it can see broke where the two shared a field. It
  is the rule the autopilot already aimed by, now in one place.
- A ball split from one that seeks doesn't seek (`splitOff()` clears it):
  the paddle lent it to one ball. `releaseBall()` clears it too, as K1's
  doc asks of every field.
- `seeking` is recorded only as a ball newly takes the lent seeker, not
  again for one that already seeks.
- The count of balls off the paddle starts again at any needed brick
  broken, by a ball, a blast or a bolt (`hitBrick()`), since all of them
  mean the endgame moved on. A lent ball's seeking ends only at a needed
  brick it strikes itself, not one its blast reaches, as its count of
  bounces does.

Added to other streams' files (each an addition): K's `travel.ts`,
`lendAtPaddle()` at the end of `meetPaddle()` and `endSeeking()` after a
strike, each with a clause in its doc; K's `bricks.ts`, the count's reset
where `needed` falls; K's `balls.ts`, `Ball.seeks`, set in `createBall()`,
`splitOff()` and `releaseBall()`; `field.ts`, `Field.seeking` and
`Field.dryBounces`, `seek()` before `travel()`, a count after each launch
and let-go, and a lost ball's seeking ended; `events.ts`, `seeking` at
the end; `tuning.ts`, `SEEKER_TURN` and `SEEKER_LEND`; `grid.ts`,
`inSight()`; F's `effects.ts` and its spec, the `seeking` entry; L's
`symbols.ts`, the `seeker` symbol. The autopilot (`src/testing/`) is R's.

Measurements (the autopilot, 24 seeds a level and speed, all 33 levels;
mean level time, then mean endgame, in seconds, Relaxed / Normal / Fast),
on the rules as committed:

| Rules                 | Level time         | Endgame         |
| --------------------- | ------------------ | --------------- |
| before                | 77.6 / 69.1 / 57.6 | 7.0 / 7.2 / 5.3 |
| the lent seeker       | 77.1 / 68.5 / 57.3 | 6.4 / 6.6 / 5.0 |
| lent, and the capsule | 78.9 / 68.7 / 58.3 | 7.0 / 6.3 / 5.1 |

Lending alone shortens endgames by 5 to 9%. The capsule, falling from
level 11, changes which capsules the seeds let fall from there on, which
moves both columns about as much as it saves. (The rows without the
capsule or lending were played with the capsule's `from` and
`SEEKER_LEND.bounces` set out of reach in a probe spec, since removed;
with both out of reach it plays exactly the figures of before.) Hedge
maze's mean endgame goes from 12.0 / 13.6 / 9.7 s to 10.7 / 9.6 / 7.9 s,
and Mushroom's from 11.6 / 13.4 / 12.7 s to 10.5 / 12.8 / 7.4 s.

`yarn report:levels --seeds 12` after (81 s) is saved as
`docs/brick-breaker-uplift/levels/report-r2-after.txt`, with levels 31 to 33. Levels 1 to 10, where only lending is new, keep their middles within
2 s, and their longest endgames shorten or hold but one (Arch at Relaxed
0:27 to 0:21, Rocket at Normal 0:29 to 0:23, Castle at Normal 0:22 to
0:17; Stripes at Fast 0:12 to 0:14). The longest endgames summed over the
33 levels go from 643 / 663 / 526 s to 595 / 607 / 453 s. From level 11
the draws change: the sum of middles goes from 43:02 / 39:25 / 32:29 to
44:36 / 40:54 / 33:12. The largest moves are Vault at Normal (middle 1:02
to 1:50), Corridors at Normal (longest endgame 0:17 to 0:43), Hedge maze
at Normal (0:46 to 0:25), Keep at Normal (middle 2:09 to 1:43) and
Mushroom: at Relaxed its middle goes from 1:13 to 1:34, at Fast its
longest endgame from 0:58 to 0:16, and one Normal play's endgame takes
1:01, past the spec's minute (`!`), where the longest before was 0:40.
The sim specs, one seed a level, all pass, and the report exits 0.
Mushroom's cap is reached only by its two side gaps; it is one for K2 to
look at with the report.

Looked at in the browser (port 9404, 1280 × 720): How to play lists the
Seeker in green with its target symbol, between Laser and Narrow paddle,
and Narrow paddle and Fast ball each say bricks pay double; no console
errors.

Checks, after the review's fixes: the workspace's `lint`, `typecheck` and
`test` (60 files, 2,211 specs, 15.8 s with six workers), the root's
`lint`, and coverage of `pure` and `dom` (100% of statements, functions
and lines in `src/rules` and `src/view`, branches at least 95% in each
file), this package's last commit to touch them.

Review (a fresh reviewer, on the staged change):

1. No spec held the seeker to the nearest brick: in each, the nearest was
   also the first the walk from the last row up finds. Fixed: a spec with
   the nearer brick in a higher row than a farther one, which fails if
   the first found is taken.
2. The spec of a ball that goes on seeking past a brick the level doesn't
   need drew steel, which never breaks, so `endSeeking()`'s check went
   unread. Fixed: it breaks a regrowing brick and still seeks, and fails
   if any break ends the seeking.
3. `AGENTS.md` and this log said the seeker changes nothing the autopilot
   foresees, but its aim does send a ball straight at a brick, which a
   seeker may bend toward a nearer one. Fixed: both say it meets only
   falling balls, which a seeker never turns, and that an aimed ball may
   be turned on its way.
4. A brick below a rising ball was a target too, which only flattened the
   ball until it skimmed at `FLATTEST`. Fixed: the target's middle must be
   above the ball's (which also spares those lines of sight), with a spec;
   the "no flatter" spec now turns toward a brick in the last row, from
   below it. This changed play, so the measurements and the after report
   above were taken again on these rules.
5. Tidying, each done: the step's turn is in degrees, as `turnBall()`
   takes it, with the one conversion of the difference; `clamp()` from
   `@fz/core/math`; `seek()` and `nearestInSight()` take a
   `Readonly<Field>`.
6. The after report carries one `!`, on Mushroom at Normal, for the
   integrator to know. Noted above and in the report to the integrator;
   K2 is the one to look at the level.

The reviewer also named, as fine, a blast's reach that breaks a needed
brick resetting the count but not ending the ball's seeking; it is
written under the choices above.
