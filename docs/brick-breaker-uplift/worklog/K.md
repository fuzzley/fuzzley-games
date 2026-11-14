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
