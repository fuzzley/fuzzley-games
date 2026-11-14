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
