# Stream K's log

Stream K builds the new kinds of brick with their levels, as
`../implementation-plan.md` §6 says, in the worktree
`/home/dev/Projects/personal/bbu/K` on the branch `bbu/K`. Each package has
a heading, each commit a dated entry. Paths are relative to
`frontend/games/brick-breaker/` unless they start with `frontend/` or
`docs/`.

## K1. Friends' kinds, with levels 31 to 33

The branch held the integration tip (79b1ed92) as the package began. R1
hadn't landed, so `LevelSetData` has no `place` yet, and `friends.json`
leaves it out.

### 2026-11-14: the cage, with Hello (31)

What it does:

- `BRICK_KINDS.cage` (`c`), two hits, needed, 50 a hit, with a new trait,
  `frees`, whose `broken` rule frees a friend: a ball more, put in play at
  the cage's middle by `releaseBall()` (`balls.ts`), heading up within
  `FRIEND_SPREAD` (20°) of straight up by the field's next draw, wearing
  the next ink, and records `freed`.
- `Ball.ink`: `OWN_INK` (-1) for the player's own; a friend's is
  `Field.friendsFreed % FRIEND_INKS`, `Field.friendsFreed` counting the
  friends the level has freed. `splitOff()` hands a split ball its ink; `serve()` puts
  the player's own ink back on the record it serves, which a lost friend may
  have worn. `FRIEND_INKS` (8) is in `tuning.ts`, since the rules can't
  import `@fz/phaser/color`; `tuning.spec.ts` holds it to `FUZZBALL_INKS`'
  length in both modes.
- With every ball the field holds in play, the cage breaks and frees
  nobody, drawing nothing. A lost friend costs no life, as any ball but the
  last never did.
- A placeholder look: `placeholderArt()` in `brick_art.ts`, a plain brick in
  tint 5 for every state, and How to play's picture in `PICTURED_BRICKS`.
- `EVENT_EFFECTS.freed`, with no flourish and no sound, and its row in
  `effects.spec.ts`'s list.
- `src/rules/levels/friends.json`, id `friends`, name `Friends`, drops 0.14,
  with Hello as drafted, its `teaches` and `mark` notes dropped; placed after
  Tricks in `LEVEL_SETS`.
- `AGENTS.md` (`balls.ts`' ink, `friends.json`) and both skills' legends,
  and the content skill's paces, as Friends starts at 1.12, under Tricks'
  end, as `plan.md` asks of the set.

Choices where the plan was silent:

- A cage frees a friend only while the level is in play, as a capsule falls
  only then (`dropFrom()`): a blast lit before the last ball was lost may
  break a cage after it, and a friend then would be in flight while the
  next ball waits on the paddle. Nor does the hit that clears the level
  free one: `hitBrick()` now runs the traits' `broken` rules after it has
  counted the level cleared, as `dropFrom()` ran already. The blast's and
  the regrowing brick's rules only set timers, which a cleared field never
  reaches.
- The cage scores 50 a hit, as a tough brick does.
- `Field.friendsFreed` isn't kept by the saved game: no ball in flight is, so
  after a reload no friend is in play, and the next starts from the first
  ink again with nothing to clash with.
- The view doesn't color a friend yet: L6 draws the friends' balls in their
  inks (`FieldView.balls` hands it `ink`).
- `FRIEND_SPREAD` is in `tuning.ts`, not the trait's settings, as one kind
  frees friends, and it says how freeing works.

Added to other streams' files: `balls.ts` (`ink`, `OWN_INK`,
`releaseBall()`, a line in `splitOff()`), `field.ts` (`friendsFreed`, a
line in `serve()`), `events.ts` (`freed`), `tuning.ts` (`FRIEND_SPREAD`,
`FRIEND_INKS`), `levels.ts` (the import and `LEVEL_SETS`' last member),
`effects.ts` and its spec (`freed`), `brick_art.ts` (`placeholderArt()`,
`cage`), `art.ts` (`PICTURED_BRICKS.cage`).

Measured: Hello's autopilot middle times over 12 seeds of its own, 0:26 at
Relaxed, 0:22 at Normal, 0:21 at Fast, no life lost, no long endgame; on
the tallest field 0:40, 0:37 and 0:33.

For the integrator: `releaseBall()` sets every field of `Ball`, as
`createBall()`, `holdBall()` and `splitOff()` do, since a friend takes up
any record a ball left. A field another stream adds to `Ball`, such as
R2's `seeks` or K3's `portalled`, must be set there too.

The review, and the answers:

1. The hit that broke a cage that was the level's last needed brick freed a
   friend onto the cleared field, since the traits ran before the clearing.
   Fixed: the traits' `broken` rules now run after it, and a spec holds a
   cage that clears the level to freeing nobody.
2. The specs didn't hold that the friend's heading is the field's next
   draw, nor that a cage freeing nobody draws nothing. Fixed: a spec counts
   the draws, and the two that free nobody expect no draw and no friend
   counted, in place of one that compared two plays of one seed.
3. `releaseBall()` repeats the reset the others do, and another stream's
   new `Ball` field could miss it after the rebase. Answered with a doc
   comment on `releaseBall()` and the note above, rather than a refactor of
   `splitOff()` and `holdBall()`, which aren't K's to restyle.
4. Two docs were loose: `AGENTS.md` called `FRIEND_INKS` a list, and
   `Ball.ink` an index of `FUZZBALL_INKS`, a record of two modes. Fixed.
5. Nits: `nextDraw`'s import out of order, fixed; `expect.closeTo()` cast
   `as number`, now `as unknown` as the scene's spec does; `Field.friends`
   renamed `friendsFreed`.

Checks: `yarn lint`, `yarn typecheck` and `yarn test --maxWorkers=6`
(59 files, 2,035 specs, 15.5 s) in the workspace; the root's `yarn lint`
under the lock (3:10).

### 2026-11-14: the plated brick, with Mushroom (32)

What it does:

- `BRICK_KINDS.plated`, `u` of one hit and `U` of two, needed, 50 a hit,
  with a new trait, `plated`, whose rule is empty: the travel and the bolts
  read it through `isPlated()` (`bricks.ts`), from a set of the plated
  kinds made once, so a contact makes nothing.
- The travel (`travel.ts`) notes a plated brick's underside, its bottom
  face and corners, apart from its other sides when the ball rises
  (`UNDERSIDE`, a `Touch` of `plated`). There any ball turns, a fire ball
  too, which otherwise passes through what it breaks; the brick takes no
  hit, the speed doesn't climb, a blast ball's hit doesn't reach around,
  and the field records `plated`. From above or a side, or by a falling
  ball at a bottom corner, it takes a hit as any brick does, and a blast
  brick's blast hits it from any side, as does the reach of a blast ball's
  hit on a brick beside it, even one met at the same moment as its plate.
- A bolt reaching a plated brick is spent there, hitting nothing, and the
  field records `plated` (`bolts.ts`).
- The levels spec's reach (`shutIn()`, in `levels.spec.ts`) comes into a
  plated brick only from above or a side, with two specs of its own.
- The autopilot aims at no plated brick, whose underside the ball would
  meet (`chooseAim()`).
- Placeholder look in tint 6, `PICTURED_BRICKS.plated`,
  `EVENT_EFFECTS.plated`.
- Mushroom as drafted, its tints too.
- `AGENTS.md` (the travel, the bolts, the reach, the autopilot's aim) and
  both skills' legends.

Choices where the plan was silent:

- The underside wins a tie: a ball that meets a plated brick's bottom
  corner and the end of its side face at one moment turns there and the
  brick takes no hit, since the corner is the underside's. The travel notes
  the underside first, and a brick whose plate was met isn't among those
  struck.
- A blast ball's reach from another brick it strikes hits a plate as a
  blast brick's does, from any side, as `plan.md` has it ("A blast takes a
  hit off it from any side"), though the ball met the plate's underside at
  the same moment; only the plate's own contact sets off no reach.
- `isPlated()` is the travel's test of the trait, rather than `hasTrait()`,
  whose callback would make a closure at every brick a ball passes.
- The plated brick scores 50 a hit, as the plain and tough bricks do.

Added to other streams' files: `bolts.ts` (the spent bolt), `events.ts`
(`plated`), `effects.ts` and its spec, `brick_art.ts` and `art.ts` (the
placeholder), `autopilot.ts` (an import, a line in `chooseAim()`'s filter,
and its doc comment), `levels.spec.ts` (`isPlated()`, a test in
`shutIn()`'s flood, its doc comment, and two specs of the reach).

Measured: Mushroom's autopilot middle times over 12 seeds of its own, 1:13
at Relaxed, 1:31 at Normal, 1:17 at Fast, the longest 4:14, the longest
endgame 0:58, no life lost; over 40 seeds 1:41, 1:15 and 1:09, no endgame
past its minute. On the tallest field, over 12 seeds, 1:30, 2:09 and 1:41.
It stays as drafted.

The review, and the answers:

1. Two branches had no spec to hold them: a falling ball at a bottom
   corner, which `dy < 0` lets take a hit, and the tie at a corner, which
   `isStruck()` settled. Fixed: a spec of each. The tie's spec throws the
   ball straight across along the brick's foot, where a heading of 90°
   rounds to a hair upward, so the ball rises; it is a single point, so
   the travel now settles it by order, the underside noted first and a
   plate kept out of the bricks struck, in place of `isStruck()` at both
   loops.
2. The legend's spec checked only the hits, with a condition in its
   assertion. Fixed: it expects the two specs whole.
3. A blast ball's reach from a brick beside a plate hits the plate, even
   when the ball met the plate's underside at the same moment, which the
   log's words denied. Answered: that is `plan.md`'s "a blast takes a hit
   off it from any side"; a spec now holds it, and the log says so.
4. `levels.spec.ts`, R's file, was restyled: `isOpen` moved into a
   `canEnter()` and the flood's `if` rewrapped. Fixed: `isOpen` stays as it
   was, and the flood adds one test, through a function of its own,
   `isPlated()`.
5. Nits, all taken: the trait's doc said a bolt is turned back, not spent;
   the autopilot's new import was out of path order; two lines of
   `AGENTS.md` ran past 80 columns.

Checks: `yarn lint`, `yarn typecheck` and `yarn test --maxWorkers=6`
(59 files, 2,070 specs, 12.9 s) in the workspace; the root's `yarn lint`
under the lock (2:15).

### 2026-11-14: keys and gates, with Drawbridge (33)

What it does:

- `BRICK_KINDS.key` (`k`), one hit, needed, 100 a hit, with a new trait,
  `unlocks`, whose `broken` rule counts it off `Field.keysLeft`; the hit
  that breaks the level's last key marks every gate broken at once and
  records `opened` at the key's middle, with no cell (`openGates()`).
  `unbrokenKeys()` counts a level's keys left, for `createField()` and the
  saved game's take-up.
- `BRICK_KINDS.gate` (`=`), which never breaks, isn't needed and scores
  nothing, with a new trait, `locked`, whose rule is empty. Until it opens
  it stands as steel: `Field.solid` and `hardSolid` read it as a brick
  that can't break, so the travel turns every ball there, a fire ball too,
  and a bolt is spent on it as on steel. Once open it is broken, out of the
  balls', the bolts' and the autopilot's way, with nothing more to change.
- The announcer says "The gates are open." (`describeOpened()` in
  `describe.ts`), as `GameService` hears `opened`.
- The saved game keeps an open gate as broken, refuses a gate open while
  a key is left or shut once none is (`gatesAsKeysSay()`), lets a gate be
  broken with no hits, which no other brick that breaks may be
  (`brokenAsItComes()`, in place of the condition it replaces), and counts
  the keys left again on take-up. `SAVED_GAME_VERSION` stays.
- The levels spec's reach (`shutIn()`) floods past a gate only once it has
  reached every key, and `give %s a key for its gates` holds every level
  with a gate to having a key, each with specs of its own.
- Placeholder looks in tints 3 (key) and 7 (gate), `PICTURED_BRICKS`, and
  `EVENT_EFFECTS.opened`, with no flourish and no sound.
- Drawbridge as drafted, its `teaches` and `mark` notes dropped.
- `AGENTS.md` (`bricks.ts`, `describe.ts`, the saved game, `friends.json`,
  the reach, What It Keeps), the content skill's legend and checks, and the
  testing skill's legend, levels spec and round trip.

Choices where the plan was silent:

- `opened` is recorded at the last key's middle, as the hit that opened
  the gates was there, with no cell, as it is no one brick's.
- The key scores 100 a hit, as the blast and gift bricks do, each a brick
  a player aims for.
- A level with gates and no key never opens them, and the levels spec
  refuses one, as the package asks.
- The autopilot needs nothing new: it aims only at bricks it can see
  through `Field.solid`, which holds a shut gate as steel.
- The saved game's round trip takes a gate opened in the crowd (a row
  `=.....k.....=`), and the take-up's specs play a level of their own
  (`GATE_LEVELS`), apart from the shared `LEVELS`, whose last level
  another spec reads.
- The game service's spec plays a level of its own, handed in through
  `GAME_LEVELS`, whose two keys a row of blast bricks between them breaks
  soon after the launch.
- The hit that breaks the last key and clears the level at once still
  opens the gates, as the saved game's check asks, but says nothing of
  them, since the clearing is said; a blast that breaks it while a ball
  waits to be served says so.

Added to other streams' files: `saved_game.ts` (the take-up's count,
`gatesAsKeysSay()`, and `brokenAsItComes()` replacing one condition of
`restoredBrick()`) and its spec, `describe.ts` and its spec
(`describeOpened()`), `game.service.ts` (a line in `hear`, its doc) and its
spec, `field.ts` (`keysLeft`), `events.ts` (`opened`), `effects.ts` and its
spec, `brick_art.ts` and its spec, `art.ts`, `levels.spec.ts` (`isKey()`,
`isGate()`, `shutIn()`'s second flood, three specs) and the testing skill.

Measured: Drawbridge's autopilot middle times over 12 seeds of its own,
0:54 at Relaxed, 0:47 at Normal, 0:39 at Fast, no life lost, no long
endgame; on the tallest field 1:27, 1:17 and 1:05. It stays as drafted.

`yarn report:levels --seeds 12`, saved in
`docs/brick-breaker-uplift/levels/report-k1.txt`: levels 1 to 30 read as
`report-before.txt` does, the play it marks too long over its last bricks
being Shelf's at Relaxed, there before and R's to redraw. Friends' middle
times (Relaxed, Normal, Fast): Hello 0:26, 0:22, 0:21; Mushroom 1:13, 1:31,
1:11; Drawbridge 0:54, 0:47, 0:39. None was redrawn.

In the browser, at 1280 × 720: Drawbridge shows its gates and keys in
their placeholder tints; a run kept with every key broken, taken up, shows
the gates gone and the keys broken.

The commit also holds a spec of the plated brick, `travel.spec.ts`' "says
so once as a ball rises into its bottom face's end and corner at once",
which covers the travel noting a plate it has already noted, a branch the
last commit left without one.

The review, and the answers:

1. A gate's spec in `travel.spec.ts` broke the level's only needed brick,
   the key, so the field was cleared, and `throwBall()` put it back in
   play. Fixed: both gate specs keep a plain brick the level needs, and
   break the key beside it.
2. The hit that broke the last key and cleared the level at once recorded
   `opened` after `cleared`, which the announcer would say with the
   clearing. Fixed: `openGates()` still opens them but says nothing once
   the level is cleared, with a spec that fails without it. It checks
   `cleared` alone, so a key broken by a blast while a ball waits says so.
3. The docs' edits rewrapped lines that weren't K's: the content skill's
   table, padded wider, and paragraphs of `AGENTS.md` around `capsules.ts`,
   `takeUpField()` and `nextLifeAfter()`. Fixed: the table's row is
   reworded to fit, so no other row changes, and every edit to
   `AGENTS.md` and the skills puts its words on lines of their own,
   leaving the lines beside them as they were.
4. `restoredField()`'s and `restoredBrick()`'s doc comments didn't name the
   gates' states they now refuse or allow. Fixed.
5. A spec of the plated brick came in unmentioned. Answered: it is named
   above.
6. Nits, both taken: `describeOpened` imported in order, and `hear()`
   returns once it has said the gates are open.

Checks: `yarn lint`, `yarn typecheck`, `yarn test --maxWorkers=6` (59
files, 2,112 specs, 12.8 s) and `yarn test:coverage --maxWorkers=6`, above
its floor, in the workspace; the root's `yarn lint` under the lock (1:06).

## K2. Friends' other seven levels, 34 to 40

The branch held the integration tip (e4d98c05, with P1, R1, K1, L1, P2 and
R2) as the package began. R3 landed while it ran, making a level's `mark`
needed: once the branch was rebased onto it (d11a2092), each new level's
mark was set by C7's rule, as `yarn report:levels --marks` prints it, in the
commit that adds the level. `yarn report:levels --seeds 12` at the start read as
`report-r2-after.txt` does, line for line, so that report is K2's before and
none is saved apart.

Mushroom (32), which R2 left with an endgame of 1:01 at Normal (`!`), is
looked at in the package's last commit.

How the levels were measured: by the report, and, for a level as drafted and
as redrawn, by `docs/brick-breaker-uplift/levels/play-variants.mjs`. It
plays each way of drawing a level in `variants-k2.json`, beside it, through
the report's own table, from the seeds the report gives the level. It plays
12, as the report does, and up to 300 where a level's longest endgames
needed telling apart from luck. What it printed is `report-k2-variants.txt`.
The package's last commit saves the report of every level: `report-k2.txt`
(`--seeds 12`), the same on the tallest field (`report-k2-tallest.txt`,
`--height 45`) and from 20 seeds (`report-k2-seeds20.txt`). They hold the
figures each entry quotes, and that commit says if any has moved.

### 2026-11-14: Nest, Stepping stones, Birdhouse and Walled garden (34 to 37)

What it does:

- `friends.json` gains Nest (34), Stepping stones (35), Birdhouse (36) and
  Walled garden (37), each from its draft, with its pace, its `teaches` note
  dropped, and its `mark` the rule's rather than the draft's guess: 5 for
  each, their middle best streaks at Normal being 6, 6, 9 and 4, where the
  drafts guessed 15, 10, 15 and 15.
- Walled garden is redrawn: its floor is gates from wall to wall
  (`..#=======#..`), where the draft stood five gates between two steel
  corners (`..##=====##..`).
- `AGENTS.md`: `friends.json` holds 31 to 37.
- `play-variants.mjs`, `variants-k2.json` and `report-k2-variants.txt` in
  `docs/brick-breaker-uplift/levels/`, with Stepping stones and Walled
  garden.

Why Walled garden was redrawn: as drafted, `--seeds 12` gave it a middle of
2:22 at Relaxed (`+`) and endgames past a minute at every speed (2:15, 1:10
and 1:02, `!`); over 40 seeds, 17 of 120 plays' endgames ran past a minute.
The draft stands the room's side columns, 3 and 9, on the steel corners of
its floor: bricks shaded from below by a single steel cell, in the inner
corners of an enclosure, which the content skill lists as what drags an
endgame. With gates the floor's whole width, those columns are open from
below once the keys are broken. Over 40 seeds it took 0:57, 0:53 and 0:41,
its longest endgame 0:23, none past a minute. It is still the level the
draft drew: the keys over the wall, the gate its floor.

Stepping stones stays as drafted. `--seeds 12` holds it within the budgets,
its longest endgame 0:43. Over 300 seeds, 11 of 900 plays' endgames ran past
a minute, most at Relaxed. Its stair is plates, which a ball breaks only
from above or a side, and the autopilot aims at no plated brick, so it finds
the last ones by chance. A stair moved a column right and a row shorter, off
the left wall, had 7 of 900, within chance of the draft, so it wasn't kept.

Nest answers `plan.md`'s question of whether three friends are too many: its
three cages free three balls, and it takes 0:37, 0:39 and 0:33, beside
Hello's 0:26 and Drawbridge's 0:58, with no endgame past 0:05. The friends
make its ring quick to clear, not trivial.

Measured: each speed's middle time, Relaxed, Normal and Fast; the longest
endgame and the most lives lost at any speed, from 12 seeds; and the middle
times on the tallest field and from 20 seeds.

| Level              | 12 seeds (R / N / F) | longest endgame | lost | tallest field, 12 seeds | 20 seeds           |
| ------------------ | -------------------- | --------------- | ---- | ----------------------- | ------------------ |
| 34 Nest            | 0:37 / 0:39 / 0:33   | 0:05            | 0    | 0:52 / 0:51 / 0:49      | 0:37 / 0:39 / 0:27 |
| 35 Stepping stones | 0:57 / 0:43 / 0:31   | 0:43            | 0    | 1:11 / 0:59 / 1:11      | 0:51 / 0:37 / 0:32 |
| 36 Birdhouse       | 0:45 / 0:32 / 0:29   | 0:07            | 0    | 0:54 / 1:06 / 1:02      | 0:46 / 0:32 / 0:30 |
| 37 Walled garden   | 0:57 / 0:54 / 0:41   | 0:15            | 0    | 1:29 / 1:06 / 0:59      | 0:57 / 0:59 / 0:45 |

The `sim` specs, which play each level from its number at every speed and
on the tallest field, pass for all 37 levels in 7.5 s.

Checks: `yarn lint`, `yarn typecheck` and `yarn test --maxWorkers=6` (63
files, 2,337 specs, 13.7 s) in the workspace; the root's `yarn lint` under
the lock (2:02).

The review, and the answers:

1. Figures came from a scratch script no one could run again, and the table's
   had no saved output. Fixed: the script is `play-variants.mjs`, with the
   ways it plays in `variants-k2.json`, and prints the record whole; the
   package's last commit saves the three reports the table reads from. A
   claim of which bricks the draft of Walled garden left last, which only
   the scratch script showed, is now said from the picture.
2. `README.md` and `index.html`'s descriptions still say thirty levels in
   three sets. Taken at the commit of levels 38 to 40, where Friends is
   whole.
3. The entry didn't answer `plan.md`'s question of Nest's three friends.
   Fixed: a paragraph above.
4. Nits, all taken: a sentence without a verb, the table's lead naming
   three of its five columns, and the record's order, names, columns and
   alignment, now the script's.

The script reshaped the change, so it had a second review, and the answers:

1. The script copied the report's seeds and its table's layout, so its
   figures could drift from the report's unseen. Fixed: it prints through
   `printReport()`, which gives each level its seeds as the report does, and
   passes the least field's height as the report passes it.
2. The heading didn't pick up Mushroom's `!`, which R2 handed to K2. Fixed:
   a sentence says which commit looks at it.
3. The record printed no `+`, though its legend says the first column is
   the report's. Fixed: it marks the middle at Relaxed past 2:00, as the
   report does.
4. Most of the table waits on reports saved at the last commit, which a
   rule landing before then could move. Answered: that commit says if any
   figure here has moved.
5. A level id the file lacks was skipped without a word, and `kept` was
   never checked. Fixed: it reads its command line with `readArgs()`, exits
   with 2 naming an unknown id, throws for a `kept` that names no way, and
   takes another file with `--variants`.
6. Its JSDoc spelled out types the game exports, and cast nothing it loaded.
   Fixed: it imports `LevelEntry`, `LevelSetData`, `AutopilotReport` and
   `Speed`, and casts what Vite loads, as `report-levels.mjs` does.
7. Nits, all taken: the long sentence on how the levels were measured, and
   two constants' comments.

### 2026-11-14: Beehive, Trellis and Reunion (38 to 40)

What it does:

- `friends.json` gains Beehive (38), Trellis (39) and Reunion (40), each from
  its draft, with its pace, its `teaches` note dropped, and its `mark` the
  rule's: 15, 5 and 5, their middle best streaks at Normal being 16, 6 and
  9, where the drafts guessed 20, 10 and 25. Reunion's six friends end its
  streaks soon, as `plan.md`'s risks foresaw.
  Friends is whole: ten levels, paced 1.12 to 1.18.
- Trellis is redrawn with no plated brick against a side wall: the four
  plates at the walls of its first and fifth rows are plain bricks
  (`o.o.u.o.u.o.o` and `o.o.+.o.+.o.o`, where the draft had `u.o.u.o.u.o.u`
  and `u.o.+.o.+.o.u`). Seven plates are left, each open to a hit from both
  sides.
- `variants-k2.json` and its record gain Trellis and Reunion.
- `AGENTS.md`: `friends.json` holds 31 to 40. The content skill: Friends
  runs 1.12 to 1.18, and plated bricks drag an endgame, one against a side
  wall most.
- `index.html`'s three descriptions: forty levels. `README.md`: forty levels
  in four sets, its list of what the game holds gaining the plated brick,
  cages, keys and gates, and twelve capsules, as R2's Seeker made them.

Why Trellis was redrawn: `--seeds 12` holds it within the budgets, its
longest endgame 0:51. Over 300 seeds, though, 15 of 900 plays' endgames ran
past a minute, at every speed. Four of its eleven plates stood against a
side wall, met only from above or their one open side, and neither the
autopilot nor a seeking ball turns toward a plate. With those four plain
bricks, 3 of 900 ran past a minute, and its middle times over 300 seeds fell
a few seconds at every speed (0:38, 0:34 and 0:29, from 0:44, 0:37 and
0:33). With the four moved a column in instead, keeping all eleven plates
off the walls, 3 of 900 ran past a minute too, so the walls, not the count
of plates, were the fault. The plain one is kept as the smaller change,
four cells for eight. It is still a mesh the ball threads, its plates open
to a hit from the side.

Reunion stays as drafted, though it is the quickest of the set at Relaxed
and Normal (0:25 and 0:23), and at Fast a second behind Hello's 0:20. Its
six friends make it so, which `plan.md` foresaw ("Reunion is built on
that"), and no budget marks it. A fort of four hits, its inside two, played
for the record, takes 0:39, 0:43 and 0:38, if the user wants the set's last
level to last longer. Beehive stays as drafted.

Measured: each speed's middle time, Relaxed, Normal and Fast; the longest
endgame and the most lives lost at any speed, from 12 seeds; and the middle
times on the tallest field and from 20 seeds.

| Level      | 12 seeds (R / N / F) | longest endgame | lost | tallest field, 12 seeds | 20 seeds           |
| ---------- | -------------------- | --------------- | ---- | ----------------------- | ------------------ |
| 38 Beehive | 0:32 / 0:24 / 0:21   | 0:06            | 0    | 0:28 / 0:27 / 0:20      | 0:32 / 0:25 / 0:22 |
| 39 Trellis | 0:37 / 0:39 / 0:30   | 0:36            | 0    | 0:59 / 1:07 / 0:50      | 0:37 / 0:34 / 0:31 |
| 40 Reunion | 0:25 / 0:23 / 0:21   | 0:05            | 0    | 0:46 / 0:35 / 0:33      | 0:25 / 0:25 / 0:24 |

The `sim` specs pass for all 40 levels in 8.2 s.

Checks: `yarn lint`, `yarn typecheck` and `yarn test --maxWorkers=6` (63
files, 2,365 specs, 14.6 s) in the workspace; the root's `yarn lint` under
the lock.

The review, and the answers:

1. The skill's "one against a side wall drags most" rested on a redraw that
   both took the plates off the walls and cut them from eleven to seven.
   Answered with a third way, the four moved a column in, all eleven kept:
   3 of 900 too, so the note stands, and the log says so. The plain one is
   kept, as the smaller change.
2. The note named the autopilot's aim alone, but the seeker, lent at three
   bricks left, turns toward no plate either. Fixed in the skill and here.
3. Reunion isn't the quickest at Fast, where Hello takes 0:20. Fixed.
4. "Hardly moved" quoted 12 seeds' middles, where Normal rose. Fixed: the
   300 seeds' middles, quicker at every speed.
5. Nit, taken: `index.html` says forty levels, and only the README says
   four sets.

### 2026-11-14: Mushroom (32), its cap's tips plain, and the reports

What it does:

- Mushroom's plated row, the cap's underside, keeps its plates under
  columns 2 to 10, and its tips, columns 1 and 11, are plain bricks of the
  cap (`.ouuuuuuuuuo.`, tinted as the cap), where the draft plated all
  eleven. Its layout stays the first, as it has never shipped. Its mark
  falls from 15 to 10, as `--marks` prints it, its middle best streak at
  Normal now 11.
- `variants-k2.json` and its record gain Mushroom's six ways.
- The reports of every level: `report-k2.txt` (`--seeds 12`),
  `report-k2-tallest.txt` (`--seeds 12 --height 45`) and
  `report-k2-seeds20.txt` (`--seeds 20`).

Why Mushroom was redrawn: R2's `--seeds 12` gave a play at Normal an
endgame of 1:01 (`!`). It is no one seed's luck: over 300 seeds the draft ran
14 of 900 endgames past a minute, at every speed. Read from the picture and
the content skill, its last bricks are its plates. A ball meets them only
from above or a side, and neither the autopilot nor a seeking ball turns
toward one, so the last of them are met by chance. The cap above them is
reached only up the two gaps a cell wide at the walls. K1's 40 seeds, before
R2, had none past a minute, where 14 in 900 would give about two in 120
plays, so whether R2's seeker added to it can't be told from luck.

Five redraws were played over 300 seeds, each changing only the plated row.
Past a minute ran: with the cap's tips plain, 6 of 900; the tips left open,
11; a plate of seven, 8; two plain bricks each end, 9; a plate of five, 13.
These can't be told apart from one another, and the fall from the draft's
14 may be partly luck. Nor does a plate of fewer bricks run fewer, so the
count of plates isn't the whole of it. The plain tips are kept as the
fewest and the smallest change, two cells, and its `--seeds 12` holds no `!`
and no `+`: 1:37, 1:21 and 1:15, its longest endgame 0:57. That is close to
a re-roll. Its longest endgame of the first 12 at Relaxed rose from 0:28 to
0:57, and over 300 seeds its longest at Relaxed from 1:47 to 2:04, and its
longest play there from 5:03 to 5:27. The long endgames are the plated
brick's, in every way played. A cure would be in the autopilot or the
seeker, which aim at no plate, not in the level's data, and they are R's.

It is still the level the draft drew: a cap plated underneath, which a ball
goes up an edge to get into. Its edge now opens from below as well as from
the side. It stays the set's longest level, at every speed past a minute where the
other nine take 0:58 or less. It took 1:34 at Relaxed as drafted, under the
plan's 2:00, and no redraw played made it much quicker, so it is left so.

The reports, after the rebase onto R3:

- `report-k2.txt` marks nothing in Friends, no `!` and no `+`. The one mark
  left in it is Lanterns' (18) `+` at Relaxed (2:01), there since R2 and
  R's.
- The reports' figures for levels 34 to 40 that the entries above quote
  (from 12 seeds, the tallest field and 20 seeds) read in `report-k2.txt`,
  `report-k2-tallest.txt` and `report-k2-seeds20.txt` as quoted, so none has
  moved. The record was printed whole again after the rebase, and only
  Mushroom's part of it is new.
- On the tallest field, one play of Mushroom's at Relaxed took 2:11 over its
  last bricks, past that field's longer limit (`!`). It is the only `!` there
  of all forty levels. The spec doesn't hold a taller field's endgames, as
  luck decides more of them, and the draft wasn't played on that field, so
  whether the redraw changed it there is unknown.
- From 20 seeds, the marks are R's levels': Lanterns' `+` (2:12) and two
  plays past a minute at Relaxed, Spiral's (27) and Finale's (30).

Friends' middle times from `--seeds 12`, Relaxed, Normal and Fast, and the
marks:

| Level              | Relaxed | Normal | Fast | Mark |
| ------------------ | ------- | ------ | ---- | ---- |
| 31 Hello           | 0:26    | 0:24   | 0:20 | 5    |
| 32 Mushroom        | 1:37    | 1:21   | 1:15 | 10   |
| 33 Drawbridge      | 0:58    | 0:47   | 0:41 | 5    |
| 34 Nest            | 0:37    | 0:39   | 0:33 | 5    |
| 35 Stepping stones | 0:57    | 0:43   | 0:31 | 5    |
| 36 Birdhouse       | 0:45    | 0:32   | 0:29 | 5    |
| 37 Walled garden   | 0:57    | 0:54   | 0:41 | 5    |
| 38 Beehive         | 0:32    | 0:24   | 0:21 | 15   |
| 39 Trellis         | 0:37    | 0:39   | 0:30 | 5    |
| 40 Reunion         | 0:25    | 0:23   | 0:21 | 5    |

Friends' middle times at Relaxed add up to 7:51, Tricks' to 12:27.

In the browser, on port 9504 at 1280 × 720, with every Friends level opened
by a progress kept for it: Mushroom shows its red cap with plain red tips
either side of its plates, Birdhouse its roof, house, cage and pole, Walled
garden its keys over the steel room and the gates the floor's whole width,
and Trellis its mesh, the walls' cells plain. Until L6 draws the plate, a
plated brick is a plain slab in tint 6, so a plain brick in a row striped
that tint, as in Trellis's sixth row, looks the same.

The `sim` specs pass for all 40 levels in 8.2 s.

Checks: `yarn lint`, `yarn typecheck`, `yarn test --maxWorkers=6` and the
coverage of `pure` and `dom`, above its floor, in the workspace; the root's
`yarn lint` under the lock. Each of the two commits before this was checked
again after the rebase and its marks: the workspace's lint, typecheck and
tests at each, and the root's lint at the second.

The review, and the answers:

1. The entry claimed the plain tips halve the long endgames, but the six
   ways' counts can't be told apart, the kept one the best of five, and it
   explained them by the plates without a play to show it. Fixed: it says
   the counts can't be told apart, keeps the plain tips as the fewest and
   the smallest change, quotes the endgames that rose at Relaxed, and reads
   the plates' part from the picture.
2. The tallest field's only `!` was put down to luck with nothing to set it
   against. Fixed: it says it is the only one, and that the draft wasn't
   played there.
3. "Every figure quoted reads there" overreached the reports. Fixed: it
   names the reports' figures, and says the record was printed whole again,
   only Mushroom's part new.
4. The entry didn't say Mushroom stays the set's longest, and called a sum of
   middles what the set takes. Fixed: a paragraph on it, and the sum named
   as one.
5. Nits, taken: four long sentences split, and Lanterns' `+` from 20 seeds
   named.

## K3. Machines' kinds, with levels 41 to 43

The branch held the integration tip (2213ea2a, with P1, R1, K1, K2, L1, P2,
R2, L2, F1, R3 and F3a) as the package began. The integrator set its three
commits in another order than §6's: the bumper, then the portal with the
nudge, then the slider, whose change to `brick_painter.ts` rebases on
stream L's and F's work there.

### 2026-11-14: the bumper, with Pinball (41), and the nudge

What it does:

- `BRICK_KINDS.bumper` (`O`), which never breaks, isn't needed and scores
  nothing, with a new trait, `bumps`, whose rule is empty: the travel reads
  it through `isBumper()` (`bricks.ts`), from a set of the kinds made once,
  as `isPlated()` reads its own (`kindsWith()`).
- The travel meets a bumper as a disc of `BUMPER_RADIUS` (0.5, in
  `tuning.ts`) at its cell's middle, through `@fz/core/sweep`'s
  `sweepPoint()` at the ball's radius and the disc's together
  (`noteDisc()`). Any ball, a fire ball too, turns there as off a circle,
  about the line from the disc's middle to the ball's, as it turns off a
  corner; the bumper takes no hit, the speed doesn't climb, a blast ball's
  hit doesn't reach around, and the field records `bumped` at the ball, with
  the bumper's cell. The list of plates met (`Contacts.plates`) is now the
  list of what is met unhurt (`unhurt`), a plate's underside or a bumper,
  each recording its own event (`unhurtBy()`).
- `isRound()` (`bricks.ts`): the travel reads the field's `solid` and
  `hardSolid` with a round brick's cell left open (`boxed` and `hardBoxed`
  in `travel.ts`), so the faces of the bricks beside it stay exposed
  (`exposureOf()`). `Field.solid` itself is as it was, holding the cell
  whole, so the seeker (`nearestInSight()`) and the autopilot
  (`chooseAim()`) take a bumper as blocking a line of sight (`inSight()`):
  a ball passes a lone one only through the cells beside it. This refines
  C16's wording, which has `Field.solid` and `hardSolid` leave the cell
  open: the travel does, and `field.ts` stays as it was.
- The lull's nudge (C19), brought here from the next commit: a set's
  `nudge` (`LevelSetData.nudge`, `Level.nudge`, one of `NUDGES` in
  `level.ts`, which `parseLevel()` checks) says where it turns a ball: at
  the walls alone, by default, or, as `machines.json` says, off anything
  that can't break (`unbreakable`), steel, a shut gate or a bumper. The
  travel notes a brick that can't break among what turned the ball
  (`Contacts.hard`), and nudges there after `LULL_BOUNCES` bounces
  (`nudgesHere()`). `fieldFrom()` takes a `nudge`.
- A bolt stops at a bumper's cell, which takes its hit as steel does
  (`hit`), as a blast's does: neither needed a change.
- A placeholder look: `roundPlaceholderArt()` in `brick_art.ts`, a disc of
  the bumper's radius at its cell's middle in tint 8, pink, on no slab, and
  How to play's picture in `PICTURED_BRICKS`. `EVENT_EFFECTS.bumped`, with
  no flourish and no sound; `VOICES_OF_KINDS.bumper` rings as steel, and
  `EVERY_KIND` holds a bumper.
- The levels spec's reach: a spec holds a bumper's cell to stopping the
  flood, as steel's does. Another holds each set to its nudge.
- `src/rules/levels/machines.json`, id `machines`, name `Machines`, place
  `arcade`, drops 0.14, nudge `unbreakable`, with Pinball, its `teaches`
  note and the set's `says` dropped, and its mark 5 by the rule, where the
  draft guessed 15: its middle best streak at Normal is 6. It follows
  Friends in `LEVEL_SETS`, and the levels spec's places name it.
- Pinball is redrawn: its lowest bumper is a row lower, in row 9 of its
  picture rather than row 8, as below.
- `AGENTS.md` (the geometry, the travel and its nudge, the bolts, the
  levels, the set's nudge, the reach, the placeholders), both skills'
  legends, the content skill's paces, a set's nudge, a round trait, the
  slab, and two bumpers that hold a ball; `README.md` and `index.html`:
  forty-one levels, and bumpers among the kinds.
- `docs/brick-breaker-uplift/levels/variants-k3.json` and its record,
  `report-k3-variants.txt`, played by K2's `play-variants.mjs`.

Why the nudge came here, and Pinball was redrawn: with the seeker and the
autopilot taking a bumper as blocking a line of sight, the report's 12 seeds played one
play at Relaxed that never cleared (`-`). Its ball bounced between the bumper
in row 6 at column 4 and the one below it in the middle, whose middles lie
on a line 18° from level, flatter than the flattest a ball travels, 20°: it
went back and forth at the flattest, off no wall, so the old nudge never
turned it. With C19's nudge it cleared, but after an endgame of 2:06: each
turn flatter is undone as the ball is held to the flattest, and the disc
sends it back into the line. The trap is the draft's, whatever the seeds:
over 300 seeds, with the nudge, as drafted one play at Fast didn't clear in
eight minutes, and one at Relaxed took 2:06 over its last bricks. With the
lowest bumper a row lower, the line 27° from level, none of 900 plays ran
past a minute over its last bricks, the longest 0:41; two rows lower ran
none either. The row lower is kept, the smaller change. It is still three
bumpers under a wall.

Choices where the plan was silent, and where it is departed from:

- The placeholder is a disc, not the slab §5.2 names, which is a departure
  from the plan: a slab would draw the bumper two units wide where a ball
  passes beside it, and the art kit's bumper stands on no slab either.
  `brick_art.spec.ts`' spec of the slab under every look leaves out a round
  kind, as it does a ghost.
- C19's nudge lands with the bumper, a commit before the integrator's
  order, since a level with bumpers can hold a ball without it.
- A set's `nudge` is data, where "from Machines on" could have been a level
  number: the four sets before Machines say nothing and nudge at the walls
  alone, so their plays, reports and marks don't move.
- The reach treats a bumper's cell as a wall, as the drafts' checker
  (`check-levels.mjs`) does: the disc is a cell high, and leaves 0.5 of a
  unit either side of it in its cell, less than a ball's width, 0.72, so a
  ball gets past a lone bumper only through the cells beside it. Two side
  by side leave a ball 1.0 between their discs, which the flood, the seeker
  and the autopilot take as shut, to be safe.
- A bolt's hit and a blast's on a bumper record `hit`, which rings as
  steel, and `bumped` is a ball's turn alone. F3b gives the bumper its
  voice, on either event.
- The saved game keeps nothing of a bumper, which play never changes, nor
  of the nudge, which is the level's.
- `BUMPER_RADIUS` is in `tuning.ts`, as K1's `FRIEND_SPREAD` is, as one
  kind is a bumper.

Added to other streams' files: `level.ts` (`NUDGES`,
`Nudge`, `Level.nudge`), `levels.ts` (`LevelSetData.nudge`, `nudgeOf()`, a
line of `parseLevel()`, the import of the set and `LEVEL_SETS`' last
member), `levels.spec.ts` (a spec of the reach, a line of its doc comment,
Machines' place, two specs of a set's nudge and one of each set's),
`field_picture.ts` (the `nudge` option), `events.ts` (`bumped`),
`tuning.ts` (`BUMPER_RADIUS`), `effects.ts` and its spec, `brick_art.ts`
(`roundPlaceholderArt()` and the bumper's entry) and its spec (the round
kinds left out of the slab's spec, the bumper's tint, and its frame's
spec), `art.ts` (`PICTURED_BRICKS.bumper`), `seeker.spec.ts` (a member of a
list), `bolts.spec.ts` (a spec), `README.md` and `index.html`.

Measured: `yarn report:levels --seeds 12` reads as `report-k2.txt` for
levels 1 to 40, line for line. Pinball takes 0:35 at Relaxed, 0:37 at Normal
and 0:27 at Fast, its longest endgame 0:19, no life lost, no `!` and no `+`.
`--marks` took 33 s.

The `sim` specs pass for all 41 levels in 7.5 s.

Checks: `yarn lint`, `yarn typecheck` and `yarn test --maxWorkers=6` (68
files, 2,865 specs, 14.2 s) in the workspace, the coverage of `pure` and
`dom` above its floor, and the root's `yarn lint` under the lock (1:11).

The review, and the answers:

1. The seeker and the autopilot looked through a bumper, since `solid` left
   its cell open, and a lent seeker could turn toward a brick behind one
   and meet the disc head on. Fixed, at first by a new `Field.blocksSight`
   they looked along, then, by the second review's first answer, by leaving
   `solid` as it was and the travel alone opening the cell; the seeker's
   spec holds a row of steel and bumpers to hiding a brick. This moved
   Pinball's plays, which found the trap above.
2. No spec held a blast ball turned off a bumper to setting off no reach.
   Fixed: a spec, as the plate has.
3. The spec of a face beside the bumper met the brick's corner, as no ball
   can meet that face before the disc. Fixed: it says "corner", and a spec
   of the bottom face of a brick above the bumper, which a ball rising
   beside the disc breaks, holds what `AGENTS.md` says.
4. The placeholder worked out the cell's middle by hand, and its spec sat
   under `brickColor`. Fixed: `pointAt()`, and a describe of its own.
5. `AGENTS.md` and the content skill still said every kind stands on the
   slab, the skill didn't name `isRound()`, and the log called the disc a
   choice where the plan was silent. Fixed: both name the round kind's
   disc, the skill's trait section says what a round trait takes, and the
   choice is called a departure.

The fixes reshaped the change, with the nudge brought in and Pinball
redrawn, so it had a second review, and the answers:

1. `field.ts`, `seeker.ts` and `autopilot.ts` were changed where the
   sharing rule allows only additions, and `solid` came to mean two things.
   Fixed: the three are as they were, and the travel reads `solid` and
   `hardSolid` through `boxed` and `hardBoxed`, its own, which leave a round
   brick's cell open; `blocksSight` and its specs in `field.spec.ts` are
   gone, and a spec of a fire ball meeting steel's corner beside a bumper
   holds `hardBoxed`. Logged above as refining C16's wording. Plays and
   the report don't move.
2. The seeker's spec and three docs said a bumper's disc leaves no room to
   pass, which two side by side do, 1.0 across. Fixed: the spec's row is
   steel and bumpers in turn, and `AGENTS.md`, the reach's doc comment and
   this log say a lone bumper is passed only beside it, and a pair is
   taken as shut, to be safe.
3. The skill's two-bumper trap left out distance, and its set section said
   the nudge frees a ball between bumpers. Fixed: the trap needs the pair
   near enough to meet at the flattest, Pinball's level pair named as too
   far apart, and the set section says the nudge frees a loop unless two
   bumpers hold the ball at the flattest.
4. The testing skill's list of `fieldFrom()` options left out `nudge`.
   Fixed: a line.
5. Nits, taken: a bad nudge names its set (`nudgeOf(set)`); the `solid`
   describe went with its specs; the disc's radius is
   `radius * scale.unit`, and its spec reads the bumper's radius by the
   frame's width.

These fixes move where the cell is opened without changing a play, a
correction rather than a reshaping, so no third review.

### 2026-11-14: the portal, with Wormhole (42 for now)

What it does:

- `BRICK_KINDS.portal`, drawn `@` for the first pair and `%` for the
  second, which never breaks, isn't needed and scores nothing, with a new
  trait, `jumps`, whose rule is empty: the travel reads it through
  `isPortal()` (`bricks.ts`), from a set of the kinds made once, and a
  portal is round (`ROUND`), so its cell is open to the travel, as a
  bumper's is.
- Its pair is the legend's (`BrickSpec.pair`), laid on the level's brick
  (`LevelBrick.pair`) and on the field's (`Brick.pair`). A portal finds its
  twin, the other of its pair, as a ball touches it (`twinOf()`, a look
  through the field's bricks), so nothing links the two, and a slider
  moving bricks can't unlink them.
- The travel meets a portal as a disc of `PORTAL_RADIUS` (0.5, in
  `tuning.ts`), by `noteDisc()`, as it meets a bumper, but the contact
  turns nothing: the ball goes on to the twin's middle, going as it went,
  and the field records `portalled` there, with the twin's cell. Then it
  passes over every portal (`Ball.portalled`) until it touches a brick,
  of any kind, or the paddle, which `meetPaddle()` says whether the ball
  fell on it or it was moved into the ball; a wall doesn't count. A ball
  that meets a brick as it touches a portal takes both: it turns and then
  jumps, turned. A ball coming out of a portal toward a brick in the row
  above or below it meets the brick 0.14 on, still within the disc, and
  goes straight back through, as C17's rule has it; a spec holds it, and
  the content skill says to leave a row between them.
- The jump sets the ball's last place to the twin's middle too, so the
  painters draw it from there that step, not across the field, and the
  step it jumped at (`Ball.jumpedAt`), by which `TailPainter` starts its
  tail afresh there (`startAtPortal()`): `Trail` starts afresh only past
  `TAIL_JUMP`, 9 units, and a ball falling through Wormhole's low portal
  comes out about 7 above it, which laid dots across the wall. A fire
  ball's embers start afresh past 3 units (`TRAIL_JUMP` in
  `ball_painter.ts`), nearer than Wormhole's portals stand, 8 apart; two
  portals nearer than 3 would strew embers between them, which is L's to
  weigh if K4 draws any.
- `releaseBall()`, `holdBall()` and `createBall()` let a ball meet portals,
  and `splitOff()` gives a copy the ball's `portalled` and `jumpedAt`, so a
  copy split inside a disc doesn't jump at once.
- `parseLevel()` refuses a portal in a level's own legend, which can't say
  its pair.
- `hitBrick()` takes no hit on a portal and records nothing: a bolt is
  spent at it, unheard, and a blast reaches past it.
- The levels spec's reach: where the flood comes to a portal it goes on
  from its twin's cell, and a portal's own cell is entered only from its
  twin, as a ball that touches one leaves the other. A spec holds every
  level to two portals of each pair or none, as C17 says, as the spec
  holds a gate to a key.
- A placeholder look: a disc of the portal's radius in tint 4, green,
  through K3's `roundPlaceholderArt()`, and How to play's picture in
  `PICTURED_BRICKS`. `EVENT_EFFECTS.portalled`, with no flourish and no
  sound; `VOICES_OF_KINDS.portal` rings as steel, as every kind that never
  breaks does in the table, though no hit is recorded on one, and
  `EVERY_KIND` holds a portal.
- Wormhole, from the draft, its `teaches` note dropped and its mark 5 by
  the rule, where the draft guessed 20, as its middle best streak at
  Normal is 9. It is level 42 for now, at the end of `machines.json`: the
  slider's commit puts Conveyor before it, which makes it 43, and plays
  and marks it again there.
- `AGENTS.md` (the round kinds, the travel's portal, the ball's
  `portalled` and `jumpedAt`, the tail, the bolts, the reach and the
  pairs), both skills' legends and levels specs, the content skill's level
  rules and round trait; `README.md` and `index.html`: forty-two levels,
  and portals among the kinds.

Choices where the plan was silent, and where it is departed from:

- One kind with a pair, rather than a kind for each pair, as §5.1 names
  one kind and two characters.
- A bolt and a blast pass a portal by, recording nothing, where the plan
  says nothing of them: a portal is no thing to hit, and a clank there
  would say it is.
- A portal blocks a line of sight, as a bumper does: `Field.solid` holds
  its cell whole, so the seeker and the autopilot take it as blocking.
- The placeholder is a disc, as the bumper's, a departure from §5.2's
  slab. Both pairs look alike until L7 draws them apart.
- The saved game keeps nothing new: a portal never breaks, and a ball's
  `portalled` isn't kept, as a saved run serves its ball afresh.

Added to other streams' files: `level.ts` (`LevelBrick.pair`), `balls.ts`
(`Ball.portalled` and `Ball.jumpedAt`, set in `createBall()`,
`holdBall()`, `releaseBall()` and `splitOff()`) and its spec (four specs),
`events.ts` (`portalled`), `tuning.ts` (`PORTAL_RADIUS`), `levels.ts` (the
refusal of a legend's portal), `effects.ts` and its spec, `brick_art.ts`
(the portal's entry, an import) and its spec (the portal's frame and
tint, the round kinds left out of the slab's spec, and, on the rebase
onto L3, a `pair` on the brick `cellFrame()`'s specs build), `art.ts`
(`PICTURED_BRICKS.portal`), `tail_painter.ts` (`Tail.jumpedAt`,
`startAtPortal()` and its call), `bricks_scene.spec.ts` (a spec),
`bolts.spec.ts` (a spec), `legend.spec.ts` (two specs), `levels.spec.ts`
(`isPortal()`, `twinOf()`, four lines of the flood and a sentence of its
doc comment, three specs of the reach, one of the pairs and a legend's
portal among the errors), `README.md` and `index.html`.

Measured: `yarn report:levels --seeds 12` reads as before for levels 1 to
41, line for line. Wormhole takes 0:47 at Relaxed, 0:26 at Normal and 0:25
at Fast, its longest endgame 0:13, no life lost, no `!` and no `+`. Its
balls go through the portal: in six plays at each speed, from the report's
seeds, between 2 and 23 times a play. `--marks` took 32 s.

The `sim` specs pass for all 42 levels in 7.6 s.

Checks: `yarn lint`, `yarn typecheck` and `yarn test --maxWorkers=6` (68
files, 2,950 specs, 14.7 s) in the workspace, the coverage of `pure` and
`dom` above its floor, and the root's `yarn lint` under the lock.

The review, and the answers:

1. A ball the paddle was moved into stayed `portalled`, as
   `liftOffPaddle()` reaches `meetPaddle()` past `turn()`. Fixed:
   `meetPaddle()` lets the ball meet portals again, and a spec moves the
   paddle into a `portalled` ball. The report reads as before.
2. The tail was laid across Wormhole's wall as a falling ball jumped, 7
   units, under `TAIL_JUMP`, and the log said it wasn't. Fixed:
   `Ball.jumpedAt` and `TailPainter`'s `startAtPortal()`, with a scene
   spec, and the log says what the embers do.
3. The spec's `twinOf()` checked only the row, so a flood at a side read a
   portal at the far end of the next row. Fixed: `inGrid()`, and a spec of
   it.
4. A level's own legend could draw a portal with no pair, which the field
   read as `@`'s and the specs as a pair of its own. Fixed: `parseLevel()`
   refuses one, with a spec among the errors.
5. Removing the unhurt contact's reset passed every spec, and nothing held
   a brick beside the twin. Fixed: the brick's reset spec runs for a
   bumper too, a spec holds a ball sent straight back by a brick beside
   the twin, and the content skill advises a row between.
6. The bumper's frame spec in `brick_art.spec.ts` was restyled into a
   round kinds' table. Fixed: it is as it was, and the portal's frame has
   a describe of its own beside it.
7. Nits: the pairs rule is in the content skill, under its checks' table,
   rather than in the table, which would have padded every row, and in the
   testing skill; `isPortal()` is a type predicate. `Map.groupBy()` is
   left, as the lib is ES2022's.

These fixes correct the change, as the review's own fixes have it, rather
than reshape it, so no second review.

### 2026-11-14: the slider, with Conveyor (42), and Wormhole to 43

The branch was rebased twice before this commit, at clean points, as the
integrator asked: onto L3 (a139c929), then onto L6 and F2 (6503c59c), each
commit typechecked and its specs run as it was replayed.

What it does:

- `BRICK_KINDS.slider`, drawn `>` heading right and `<` heading left,
  broken at a hit, needed, 50 points, with a new trait, `slides`, whose
  rule is empty: `src/rules/bricks/sliders.ts`, new, moves it. Its heading
  is the legend's (`BrickSpec.heading`), laid on the level's brick
  (`LevelBrick.heading`) and on the field's (`Brick.heading`), which turns.
- `stepSliders()`, which `stepBricks()` calls before the traits' step, on
  each step the beat divides (`SLIDER_BEAT_MS`, 800 ms, 96 steps): it finds
  every train first, row by row from the top and each row from the left,
  the unbroken sliders that touch and head the same way, then steps each in
  that order. A train whose lead's next cell is a wall or an unbroken brick
  turns and stands; one with a ball touching that cell (`isBallInCell()`,
  in `balls.ts`, which the regrowing brick's rule waits on too) waits,
  whole; any other steps a cell, each slider recording `slid` at its new
  cell, the lead's first, with its way (`FieldEvent.way`), and the brick
  broken in the cell stepped
  into, if any, takes the cell the tail left. Two trains that meet head on
  both turn. The lists it finds trains in are made once.
- `Field.bricks` is the list by cell it was, which the slider changes in
  place through a cast of its own (`cellsOf()`), the one thing that moves a
  brick: `Brick.cell` is where it stands now, no longer read-only, and
  `Brick.home`, new, the cell the level drew it in. `solid`, the travel,
  the seeker, the bolts, the autopilot and the painters read the list as
  before, so they find a slider where it stands; a spec holds a ball
  breaking a slider at the cell it stepped into.
- The saved game keeps each brick at its home, as before, with its cell and
  heading (`KEPT_OF_BRICK`), and `takeUpField()` puts each back in its
  cell (`placeBricks()`). `restoredPlace()` refuses a cell out of the
  brick's row or the grid, a whole brick away from home that neither slides
  nor regrows (a regrowing brick a train stepped over grows back where it
  was put, as a spec of the round trip holds), a slider heading other than
  1 or -1 and any other kind heading at all; `standApart()` refuses two
  bricks in one cell. A brick kept without a cell or a heading is refused,
  as C20 lets a save change shape without a second rise, so
  `SAVED_GAME_VERSION` stays 2. The round trip's crowd gains two trains,
  and `PLAYED_STATES` "a slider stepped" and "a slider turned", as the
  content skill asks; a describe of its own holds the refusals and a field
  taken up with each brick at its cell, which the crowd's round trip alone
  doesn't, as the save is by home.
- The slide: the scene hands `slid` to `BrickPainter.slide()`, with the
  event's way, and `place()` adds an x offset (`slideOffsetOf()`), from
  the cell it left, easing out over `SLIDE_MS` (120 ms, `timing.ts`), beside
  F2's drop-in, and keeps `placed` false while any slide runs
  (`isSliding()`). `GlowPainter` adds the same offset, so a glowing
  slider's frame slides with it. Where motion isn't welcome the flourish
  isn't played and the slider shows at its new cell at once; scene specs
  hold each.
- A placeholder look: a slab in tint 7, violet, through `placeholderArt()`,
  which L6 removed with its last user and this commit restores, from
  `0504165a`, as the integrator said, its `frameOf` taking no field; How to
  play's picture in `PICTURED_BRICKS`. `VOICES_OF_KINDS.slider` knocks and
  bloops as any brick that breaks; `EVENT_EFFECTS.slid` plays the new
  flourish, `slide`, with no sound; `EVERY_KIND` holds a slider, in a row
  of its own.
- `parseLevel()` refuses a slider in a level's own legend, which can't say
  its way, as it does a portal.
- Conveyor, from the draft, its `teaches` note dropped and its mark 5 by
  the rule, where the draft guessed 10, as its middle best streak at Normal
  is 9. It is level 42, before Wormhole, which is 43 now, plays from its
  new number's seeds and takes the mark 10 there (its middle best streak at
  Normal is 12).
- `AGENTS.md` (the sliders, `Brick.cell` and `Brick.home`, the saved game's
  places, the slide, `placeholderArt()`), both skills' legends, the content
  skill's level rules and a moving trait, the testing skill's states;
  `README.md` and `index.html`: forty-three levels, and sliders among the
  kinds.

Choices where the plan was silent, and where it is departed from:

- C18 turns a train at "a wall or another brick"; a broken brick doesn't
  turn one, as it is no longer in a ball's way, so the train steps into its
  cell and it takes the cell the tail left. A regrowing brick so moved
  grows back there.
- Trains are found before any steps and stepped in reading order, so of two
  heading into one empty cell the first found takes it and the other turns,
  rather than both turning.
- The placeholder's tint is violet, which no plain row of Conveyor wears:
  in orange, as first drawn, its sliders looked like its top row in the
  browser.
- A pop or a regrowth drawn on a slider stays with its cell's image, so one
  under way as the slider steps finishes at the cell it left; a pop lasts
  120 ms of the beat's 800.

Added to other streams' files: `level.ts` (`LevelBrick.heading`),
`events.ts` (`slid`, `FieldEvent.way`, a parameter of `add()`, a line of
`blankEvent()`) and its spec (`way` on its events, a spec), `balls.ts`
(`isBallInCell()`, an import) and its spec (a describe), `tuning.ts`
(`SLIDER_BEAT_MS`), `levels.ts` (the
refusal of a legend's slider) and its spec (an error), `legend.spec.ts`
(two specs), `saved_game.ts` (two members of `KEPT_OF_BRICK`, a line of
`takeUpField()`, `byHome()` in `savedField()`, a parameter and a line of
`restoredBrick()`, `standApart()` in `restoredField()`, `restoredPlace()`,
`byHome()` and `standApart()`, an import, a sentence of `SavedField`'s
doc and a phrase each of `restoredField()`'s and `restoredBrick()`'s) and its spec (a row of the crowd, two states, `DRAWN_HEADINGS`, two
lines of `statesOf()`, each brick's cell and heading in the save's spec, a
describe), `brick_painter.ts` (three fields, `slide()`, `slideOffsetOf()`,
`isSliding()`, two lines of `place()`, two of `still()`, two of the
constructor, a phrase of the class's doc, imports), `glow_painter.ts` (a
field, a parameter of the constructor, the offset in `draw()`, a phrase
of its doc, an import), `bricks_scene.ts` (a case, the glow's argument),
`bricks_scene.spec.ts` (`leftOfPlace()`, `stepSlider()`, four specs,
imports), `timing.ts`
(`SLIDE_MS`), `effects.ts` (a member of `Flourish`, a line of its doc, an
entry) and its spec, `brick_art.ts` (`placeholderArt()`, the slider's
entry) and its spec (a row of the placeholder tints, `home` and `heading`
on `cellFrame()`'s brick), `art.ts` (`PICTURED_BRICKS.slider`),
`README.md` and `index.html`.

Measured: `yarn report:levels --seeds 12` (1:35), saved as
`levels/report-k3.txt`, reads as `report-k2.txt` for levels 1 to 40, line
for line, and has no `!` or `+` for 41 to 43 (Lanterns' `+`, 18, is as
before). Middle times at Relaxed, Normal and Fast: Pinball 0:35, 0:37,
0:27; Conveyor 0:35, 0:36, 0:25, its longest endgame 0:19; Wormhole, as 43,
0:30, 0:31, 0:23, its longest endgame 0:15. No life lost. Conveyor's
sliders step 114 to 382 times a play, in six plays at each speed from the
report's seeds. `--marks` gives every level the mark its data holds, once
Conveyor's and Wormhole's are set.
The fixes below moved no play: the report reads the same after them.

The `sim` specs pass for all 43 levels (258 specs, 8.6 s).

Checks: `yarn lint`, `yarn typecheck` and `yarn test --maxWorkers=6` (76
files, 3,690 specs) in the workspace, the coverage of `pure` and `dom`
above its floor (statements 99.59%, branches 97.45%; `sliders.ts` 100% of
its statements and lines, its uncovered branches the `??` of an index
the compiler can't prove), and the root's `yarn lint` under the lock.

In the browser, on headless Chrome at 1280×720, from a page of my own on
port 9504, each level taken up from a kept run: Pinball's bumpers and
Wormhole's portals stand as discs; Conveyor's trains step a cell a beat,
turn at the walls and bunch there, and its How to play and level panels
picture the slider; a ball sent up through Wormhole's low portal came out
of the high one (`portalled` at cell 19), bounced off the top and broke the
wall from above. The page is closed and the server stopped.

The review, and the answers:

1. A glowing slider's frame stood at its new cell while the slider slid
   in. Fixed: `BrickPainter.slideOffsetOf()` is public, `GlowPainter`
   adds it, and a scene spec holds the frame on the sliding brick.
2. The scene read a slide's way from the field as it played the event,
   safe only while a frame's steps are far fewer than a beat's. Fixed: the
   event carries it (`FieldEvent.way`), and a scene spec slides a slider
   the way it stepped though it has turned since.
3. Two specs' names said more than they checked. Fixed: the broken
   slider's spec says the train steps over it, and the spec of a train
   that turns or waits is two, the waiting one with a ball ahead.
4. The ball-in-cell check was written twice. Fixed: `isBallInCell()` in
   `balls.ts`, beside `overlapsBox()`, which the sliders and the regrowing
   brick both call, with a spec; `bricks.ts`'s `isBallIn()` is gone.
5. Three doc comments left the sliders out. Fixed: `restoredField()`,
   `restoredBrick()` and `BrickPainter`'s.
6. Nits: `isSlider()` is no longer exported; the check of a cell past the
   grid is gone, the row's check refusing it, and its spec stays as the
   row's; `heading` stays a `number`, as a turn writes `-heading`, which
   TypeScript widens, so a `-1 | 0 | 1` type would ask a cast at each turn,
   while the legend's spec and the saved game's check hold the values.

These fixes correct the change rather than reshape it, so no second review.

## K4. Machines' other seven levels, 44 to 50

The branch held the integration tip (b76415ac, with K3) as the package
began. Stream L's L7 (Machines' art) and stream F's F3b (Machines' voices,
the gates' and the lost ball's flourishes) ran beside it.

### 2026-11-14: the report's longest time between two touches of the paddle

What it does:

- The autopilot's report gains `longestAway`: the most steps a play went
  between two touches of the paddle, a ball meeting it (`paddle`) or leaving
  it (`launched`, a serve or a caught ball let go), or from the last to the
  play's end. A ball held out of the paddle's reach, in a sealed room or
  above a wall, or circling what can't break for good, shows there, as
  `plan.md`'s "Risks" asks. Any ball's touch counts, so a ball away in a
  room while another is played isn't counted: the measure is how long the
  paddle has nothing to meet, as Nelson's check of a ball that vanishes
  for ten seconds is.
- `yarn report:levels` prints it in a column of its own, `away`: a play's,
  or, with `--seeds`, the longest of the plays at that speed. It marks one
  past a minute, as printed, with `^`, a play that hangs, says how many
  under the table, and fails on none, as the specs don't hold it. A play
  that hangs for good doesn't clear, and is `-` as before.
- Specs: the report's spec gives every play a time away and reads it in
  every table, and three specs hold the column with `--seeds`, the mark with
  and without, and the mark by the seconds printed on a taller field. The
  autopilot's spec holds the count from the serve to the play's end, and its
  starting afresh as the paddle meets a ball, and only then. Each fails with
  the serve's restart taken out, or with a restart at a wall put in.
- `AGENTS.md` (Development Commands' report), the content skill (what a
  level's `away` shows) and the testing skill (the column and its mark).

Choices where the plan was silent:

- The mark's minute: a stretch that long between two touches is no bounce
  but a loop. It is the endgame's limit on the least field too, and kept
  in seconds on a taller one, as a loop is no shorter there. Nelson's ten
  seconds is a question for a level's design, a second ball in play, not a
  sign that a play hangs: Castle's longest is 0:19.
- `src` and `tools` both: the autopilot is R's (`src/testing/autopilot.ts`,
  `tools/report-levels.mjs`), where this adds a field, a count, a column, a
  sign and a constant, restyling nothing.

Measured: `yarn report:levels --seeds 12` reads as `report-k3.txt` for
levels 1 to 43, line for line, with the new column beside: the autopilot's
count changes no play. The longest any play went between two touches of
the paddle is Castle's (10), 0:19 at Relaxed; Machines' three take 0:08 at
the most, and no play is marked `^`.

Checks: `yarn lint`, `yarn typecheck` and `yarn test --maxWorkers=6` (77
files, 3,706 specs, 19.2 s) in the workspace; the root's `yarn lint` under
the lock.

The review, and the answers:

1. The spec of the count started afresh would pass with it started afresh
   at any event, a wall's too. Fixed: it holds the longest stretch to at
   least the steps the paddle's touches share among the stretches they cut
   the play into, which a restart at the top wall halves. Checked: it fails
   so.
2. Nothing held the restart as a ball leaves the paddle: the count started
   at 0, the step the ball is served at. Fixed: it starts at the step
   before the first, as the ball waits on the paddle until the serve, so
   the first spec's 49 steps hold the serve's restart, and fail without it.
   No play's figure moves, as every play is served at its first step.
3. The docs said `away` shows a ball held in a sealed room, which it can't
   while another ball meets the paddle. Fixed: the autopilot's doc
   comment, `AGENTS.md`, the content skill and the report's header say it
   is the longest the paddle had no ball to meet, and a ball held out of
   reach shows only while no other is in play.
4. Nit, taken: `AGENTS.md`'s paragraph reflowed.
5. Nit, taken: the spec of the column with `--seeds` throws for a seed it
   has no time for, as `timedRules()` does.

### 2026-11-14: the friend's next ink in one place, and the lost ball's ink on its event

The two follow-ups L6 left for K (`worklog/L.md`, L6's review answers 2 of
each commit). The level drafts were set aside while it was made and
checked, so its checks ran on the 43 levels.

What it does:

- `nextFriendInk()` (`src/rules/paddle/balls.ts`, beside `OWN_INK`): the
  ink of the friend a level frees next, once it has freed so many, each of
  the `FRIEND_INKS` in turn. `freeFriend()` (`bricks.ts`) dresses a friend
  by it, and the view's `nextFriend()` (`brick_art.ts`), by which a cage
  shows the friend it frees, returns it, so the formula lives once.
- `FieldEvent.ink`: the ink a lost ball wore, `OWN_INK` for any other
  event, which `add()` takes last and `loseBall()` sets. The scene fades a
  lost ball in the ink its event keeps (`facedBallFrame(kind, event.ink)`),
  and `BallPainter.lostInk()`, which guessed the ball by its place among
  those the painter showed, is gone. The guess failed where a cage freed a
  friend into the lost ball's record in the step it was lost.
- Specs: `nextFriendInk()`'s turn of inks (`balls.spec.ts`); a lost ball's
  and a lost friend's inks on their events (`field.spec.ts`); the log
  recording the ink, and leaving no ink nor way of the oldest event in the
  record a new one takes (`events.spec.ts`); the events the effects spec
  builds whole; and a scene spec of a lost friend whose record is back in
  play, freed into it by a cage in another ink before its event plays,
  which fails with the guess. Two scene specs' names drop the guess's
  words, "by where it was lost" and "since out of sight".
- `AGENTS.md` (the events, the balls' inks, the cage's look, the
  effects painter's fade) and the content skill (a cage's look reads the
  rules' `nextFriendInk()`).

F3b, which changed the lost ball's fade beside this, landed first
(0fab9b28), and the commit was rebased onto it: the scene's `fade` case
keeps F3b's frame, `ballFrame(drawnKind, drawnStreak, …)`, with the event's
ink in place of `lostInk()`, which lost its last caller and is gone, and
`AGENTS.md`'s line on the fade keeps F3b's words with the event's ink. The
scene's fade specs read F3b's `ballFrame()`, the new one too.

F3b's note for K's rules, that a key whose hit clears the level records no
`opened`, so the gates vanish at once in the hold with no flourish, is
left: K1 chose it, so the announcer doesn't say the gates opened over the
clearing ("open the gates unsaid as the last key clears the level", in
`bricks.spec.ts`), and playing the flourish unsaid would ask the game
service to tell the two apart. No level reaches it, as each level with
gates needs a brick behind them, Machines' two included.

Added to other streams' files: `balls.ts` (`nextFriendInk()`, an import)
and its spec (a describe), `events.ts` (`FieldEvent.ink`, a parameter and
a line of `add()`, a line of `blankEvent()`, an import) and its spec (the
ink on each event, a spec, two arguments of one call), `field.ts` (the
ink's argument of `loseBall()`'s one call) and its spec (`lostInks()`, a
spec), `brick_art.ts` (`nextFriend()`'s body, an import), `bricks_scene.ts`
(the fade's ink), `ball_painter.ts` (`lostInk()` and an import taken out,
as the follow-up asks), `bricks_scene.spec.ts` (a spec, a spec's name),
`effects.spec.ts` (`eventOf()`'s event, an import).

Checks: `yarn lint`, `yarn typecheck` and `yarn test --maxWorkers=6` (77
files, 3,710 specs) in the workspace, the coverage of `pure` and `dom`
above its floor (statements 99.59%, branches 97.44% over all it measures),
and the root's `yarn lint` under the lock.

The review, and the answers:

1. The new scene spec put the lost friend's record back in play by hand,
   where the rules can: a cage freeing a friend takes the first record out
   of play. Fixed: the board starts on a cage beside a brick, and the spec
   breaks the cage through `hitBrick()` once the friend is lost, holding
   the record in play in the freed friend's ink and the fade in the lost
   one's. Checked: it fails with the guess.
2. `FieldEvent.ink`'s doc comment opened with two sentences. Fixed: the
   why is a paragraph of its own. `way`'s, above it, is another stream's
   and left.
3. `nextFriend()` is now an alias of `nextFriendInk()`, and L6's spec
   that ties the cage to the rules checks one against the other. Left, as
   both are stream L's (`brick_art.ts` and its spec): for L or Z1, the
   cage's look may call `nextFriendInk()` and drop `nextFriend()` and that
   spec.
4. A scene spec's name still named the guess ("since out of sight").
   Fixed: "not in that of another record lost at its place".
5. For Z1: `add()` takes eight arguments in turn, and `loseBall()` passes
   four placeholders to reach the ink. An options object would read
   better, but restyles `events.ts` and every caller, which §7.3 keeps
   from this package.
