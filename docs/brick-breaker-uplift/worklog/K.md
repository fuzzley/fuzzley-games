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
