# Integration log

The integrator's log for the build of the Brick Breaker uplift, as
`../implementation-plan.md` §7.6 says: each package landed on
`brick-breaker-uplift`, its checks, what collided and how it was settled,
and the waves as they ran. Each stream keeps its own log beside this one.
The logs are deleted before the merge.

## 2026-11-14

### Setting up

- `main` stood at d5a82702. The main checkout held another session's work
  on Brick Fuzz Pop, staged and unstaged, so nothing is done there: the
  branch `brick-breaker-uplift` was cut from `origin/main` into a worktree
  of its own, `/home/dev/Projects/personal/bbu/integration`, with no
  upstream, so nothing pushes it by accident.
- That session's changed files, which no stream touches: Brick Fuzz Pop's
  `AGENTS.md`, `src/app/help/` (`help_words.ts` deleted),
  `src/rules/bricks/trait_rules.spec.ts`,
  `src/rules/bricks/traits/plated.spec.ts`, `src/rules/flight/flight.ts`,
  `src/rules/levels/` (the certificates, `par.json`, `sparks.json`,
  `levels.spec.ts`), `src/rules/tuning.ts`,
  `src/testing/flight_fixtures*.ts`, `src/view/effects/effects.spec.ts`,
  `tools/build-sounds.mjs`, `tools/sound-lab.ts`, and
  `docs/archive/brick-fuzz-pop/levels/`. Brick Fuzz Pop's `AGENTS.md` is
  the one file the lifts must also change; they change it as little as
  they can.
- `yarn install` in a fresh worktree took 8 s, so each stream gets a
  worktree of its own.
- Baseline at d5a82702, Brick Breaker: `pure` and `dom` 56 files, 1,820
  specs, 7.5 s with eight workers (14.5 s with Vitest's start); `sim` 3
  files, 180 specs, 8.7 s with six (10 s).

### The design

- Read `plan.md` whole, the art sheets rendered, the level drafts, Brick
  Breaker's rules end to end, and its view, scene and shell where the
  slices touch them.
- Two read-only surveys ran beside the reading: Brick Fuzz Pop's panels
  (how its rule, its look and its layout check work, and what could be
  lifted) and the two games' art kits (what Brick Fuzz Pop's slab and marks
  share with the uplift's kit, and the numbers the kit specifies). Their
  findings are in the implementation plan's §4 and §6.
- Wrote `../implementation-plan.md`: scope, twenty settled points, four
  lifts, the contracts, the packages, and the streams and waves the agents
  run in.

### The design's review

A fresh reviewer read the staged plan against the code and `plan.md`. Each
comment, and its answer:

1. **Ownership couldn't hold:** many packages must add an entry to another
   stream's keyed record (a capsule's art, an event's effects, a kind's
   look). Fixed: §7.3 now has a rule for files shared by necessity, add and
   restyle nothing, lists them, gives `saved_game.ts` to R, `layers.ts` to
   F, and orders F2 before K3 on `brick_painter.ts`.
2. **A kind can't be committed without a level:** `catalog.spec.ts` holds
   every kind to a level's use. Fixed: K is four packages, K1 and K3 a kind
   a commit with its teaching level, K2 and K4 the rest of each set.
3. **Lift 2's fences, and the games that use the lifted entries:** fixed.
   L1 adds `@fz/phaser/bricks` to `PURE_PHASER_ENTRIES`, the library's pure
   fence and both games' tables of layers; a commit that changes a library
   runs the root's `yarn typecheck` and `yarn test`.
4. **The saved game would lose the pay and the best streak:** fixed in C4
   and C8; R2 and R3 add `darePoints` and `bestStreak` to `SavedField`.
5. **A train of sliders would split** when its lead waits: fixed in C18,
   which now steps and waits a train as one, and says `Field.bricks`
   follows where a brick stands.
6. **The rules can't import `ENDGAME`:** fixed in C2 with `SEEKER_LEND` in
   `tuning.ts`, held to `ENDGAME` and `GLOW_BRICKS` by a spec; the lending
   now reads as `plan.md` does, the ball the paddle next touches.
7. **Missing events and a wrong claim:** fixed. `plated` and `bumped` are
   events, so a clank and a boing have something to hang on; a blast ball
   turned back by a plate sets off no blast; the announcer's word for a
   gate opened is K1's; §8 no longer says the compiler catches a missing
   sound or saved field.
8. **The integration as written wouldn't run:** fixed in §7.4 and §7.5.
   The integrator rebases a stream's branch in its own worktree, then
   fast-forwards; agents never push, touch `main` or use `git stash`;
   `brick-breaker-uplift` is rebased onto `origin/main` at each wave's end;
   `yarn verify` and `check:layout` run at each wave's end, and coverage at
   each package's last commit.
9. **Smaller points,** all taken: the root's `yarn lint` is each commit's
   check again, run one at a time under a shared lock; C3's weight is this
   plan's own call; "instead" is said only where there is a real choice;
   the lifts are four; the compact rule is new, with one user; R1's report
   must match `report-after.txt`, being seeded; `SAVED_GAME_VERSION` rises
   once for the branch.
