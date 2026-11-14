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

### Wave 1

- Ids up to "Wave 1's end" are as the commits had them then; the move
  onto `origin/main` gave each a new one, mapped there.
- The design landed as 79b1ed92. Five stream worktrees were cut from it,
  each on `bbu/<stream>` under `/home/dev/Projects/personal/bbu/`, with
  their dependencies installed (8 s each). The agents read a brief kept
  outside the repository, `/home/dev/Projects/personal/bbu/BRIEF.md`: where
  to work, the checks with the shared lock, the review, the sharing rule,
  the log, the ports, and what to report.
- Started L1 (the slab and the marks, lifted), P1 (the panels, lifted), R1
  (the thirty) and K1 (Friends' kinds). F1 waits for the first slot.

### P1 landed: 6ba08729, b59766c6, 919a061d

- The three lifts of the panels: `sidePanels()` in `@fz/phaser/layout`,
  `board-panel()` in `@fz/style`'s toolkit, and `PhaserDeck.spare` in
  `@fz/dev/board-page`, each taken up by Brick Fuzz Pop in its commit. Its
  panels' CSS compiles to the same bytes as before.
- The integration tip hadn't moved since the stream branched, so the
  rebase was a no-op and the commits landed as the agent checked them: each
  library's specs, Brick Fuzz Pop's 6,494, the root's lint, typecheck and
  test under the lock, and `check:layout` in Brick Fuzz Pop and Asteroid
  Breaker after a build. The integration tip fast-forwarded to 919a061d.
- Three reviews, every comment answered (`worklog/P.md`).
- For P2: a deck spare of 184 where the gap is kept from the same
  rectangle the board writes as `data-field`; a compact panel's parts must
  each be one element, since the rule hides children past the second that
  isn't an `<h2>`.

### R1 landed: bc520f6f to d839e569

- Layout numbers and bests kept by layout (C5), the four redraws at layout
  2, the seven pictures' tints, each set's place (C12), and the report's
  `+` for a level whose middle time at Relaxed is past 2:00.
- `report-r1-after.txt` matches the plan's `report-after.txt` byte for
  byte, so the redraws play as the plan measured and the tints and places
  change no play. No level's middle time at Relaxed passes 2:00 (Lanterns
  1:58).
- Rebased onto 919a061d (P1) cleanly. On the rebased branch: Brick
  Breaker's lint, typecheck and tests (2,021 specs, 17 s) and the root's
  lint, all passing. Fast-forwarded.
- Five reviews, every comment answered (`worklog/R.md`); three optional
  nits from the last were handed to R2.
- R added, outside its own files, a lookup in P's `StatsService`, the
  `place` in two specs' set literals, and the `was` bricks the plan's mock
  scripts now read from `revisions.json`.
- For K: Friends and Machines need a `place` (`garden`, `arcade`), and the
  levels spec's list of each set's place.

### K1 landed: 69eadc91, b14a0761, bfc1a8c8

- The cage with Hello (31), the plated brick with Mushroom (32), and keys
  and gates with Drawbridge (33), each with its placeholder look, its
  events, what the saved game keeps, field-picture specs, and the levels
  spec's reach. Middle times at Relaxed, Normal and Fast: Hello 0:26, 0:22,
  0:21; Mushroom 1:13, 1:31, 1:11; Drawbridge 0:54, 0:47, 0:39; no life
  lost, no redraw (`levels/report-k1.txt`, made before R1's redraws landed,
  so its Shelf still shows the old `!`).
- The rebase onto d839e569 (R1) collided in three places, each settled by
  keeping both sides: the `src/rules/levels/` paragraph of the workspace's
  `AGENTS.md` (R1's layout and place, K1's sets and reach), the content
  skill's table row and its set's paragraph, and the testing skill's line on
  the levels spec. R1 had made a set's `place` required, so the integrator
  added `place: "garden"` to `friends.json` and the levels spec's list of
  places (in K1's first commit), and to two set literals K1's last commit
  added to specs (`game.service.spec.ts`, `saved_game.spec.ts`). Each is a
  line in a list, so no commit was reviewed again.
- On the rebased branch: Brick Breaker's lint, typecheck and tests (2,133
  specs) and the root's lint, all passing. Fast-forwarded.
- Three reviews, every comment answered (`worklog/K.md`); one, that the
  cage's `releaseBall()` repeats the other balls' reset, was answered with a
  doc comment rather than a refactor of another stream's code. So every
  field a stream adds to `Ball` (R2's `seeks`, K3's `portalled`) must be set
  in `releaseBall()` too.

### L1 landed: the geometry, the bricks entry and the marks

- `@fz/phaser/bricks`, a pure entry: the slab (`SlabShares`, `TILE_SLAB`,
  `BRICK_SLAB`, `slabCommands()`), `topCap()`, `showsDetail()`, and the
  marks (`bombMark()`, `sproutMark()`, `scallopedCap()`, `rivets()`,
  `sheen()`, `portalMark()`, `bumperMark()`, `cagedFriend()`,
  `cageBars()`, `plateTeeth()`); the geometry into `@fz/phaser/shapes`
  (`bandAlong()`, `crispEdge()`, `crispOutline()`, `diePips()`,
  `pipRow()`, `pointAt()`, `turned()`, `diamond()`). Brick Fuzz Pop's
  tiles and seven kinds draw through them.
- Brick Fuzz Pop's look held still: a temporary spec hashed every frame of
  its atlas, 235,200 frames over four palettes, units 1 to 140 and six
  pixel ratios, after each commit and each round of fixes; none differed.
- The fences: `PURE_PHASER_ENTRIES`, and the view row of all four games'
  tables of layers, since Snake's and Asteroid Breaker's tables list the
  same fence's entries.
- Four reviews (the marks' commit had a second, since its widths reshaped
  the API), every comment taken but one nit, declined with a reason
  (`worklog/L.md`).
- The rebase onto bfc1a8c8 was clean, though P1 had edited the same skills
  and library docs. On the rebased branch: the root's lint, typecheck and
  tests, all passing. Fast-forwarded.

### Wave 1's end: onto `origin/main`

- `origin/main` had moved to eb560e1f, the other session's Brick Fuzz Pop
  work (26 files); the one file both touched is Brick Fuzz Pop's
  `AGENTS.md`. A trial rebase of the branch onto it, in a scratch worktree,
  was clean, and the root's lint, typecheck and tests all passed there, so
  `brick-breaker-uplift` was moved onto it (`git reset --keep`, which kept
  this log's edits). The tip is c5b2e82d.
- The rebase changed no patch, so a stream branch based on the old tip
  rebases onto the new one with a plain `git rebase brick-breaker-uplift`,
  git skipping the old copies as already applied; tried on a branch at the
  old tip, it came out at the new tip exactly.
- The new ids: the design 89797869; P1 a310417b, 29c2f6cf, 2844d057; R1
  007aeabd to 7ccc2cb8; K1 74db9c88, 1c4e8042, c0206dc4; L1 17474555,
  d8144499, c5b2e82d. The old bases 919a061d (P1), d839e569 (R1) and
  bfc1a8c8 (K1) are now 2844d057, 7ccc2cb8 and c0206dc4.
- Of Wave 1's end checks, only the root's lint, typecheck and tests ran,
  above. The build and `check:layout` did not; they waited for Wave 2's
  end, once P2 had changed the board, and both passed there.

### Wave 2

- Three of Wave 2's packages started during Wave 1, as slots opened: P2
  as P1 landed (from 919a061d), R2 as R1 landed (from d839e569), and F1 as
  K1 landed (from bfc1a8c8, F1 rebasing onto it as it began). L2 started
  after Wave 1's end, from c5b2e82d.
- As K1 landed, P2 and R2 each rebased themselves onto bfc1a8c8 in the
  middle of their packages, at a clean point, as the brief allows: each set
  its work aside in a temporary `wip:` commit (never `git stash`), rebased,
  and undid the commit with `git reset HEAD~1`. R2's rebase collided in
  `saved_game.ts`'s `restoredField()`, K1's gates and R2's `darePoints`,
  both kept (`worklog/R.md`). The integrator rebased no branch under a
  running agent.
- R2 was told to set `seeks` in K1's `releaseBall()`, and that its rise of
  `SAVED_GAME_VERSION` covers K1's gates too.
- P2, R2 and F1, already running, were told of the move onto
  `origin/main`; L2 rebased onto it before changing Brick Fuzz Pop's fur,
  since the other session's work changed Brick Fuzz Pop.

### P2 landed: f42eb857, 37f2eb3a, 9b0f4fed

- The board's application now sits on an inner `.play`, the cards beside
  it; the bench (level, lives, next life, the next level) and "In play"
  (streak, effects, kinds and capsules here) stand beside a wide room's
  field, compact on a short one; the Ready card names each kind new in the
  level (C9), and rises over the bricks where it is too tall for the gap,
  its foot held clear of the ball by a new check in `check-layout.mjs`.
- The stream had already rebased onto c5b2e82d, so the commits landed as
  the agent checked them: Brick Breaker's lint, typecheck and tests (62
  files, 2,222 specs), its build and `check:layout` at every shape, and the
  root's lint. Coverage over `pure` and `dom`: the panels whole; the rules'
  and view's floors held.
- Three reviews, every comment answered (`worklog/P.md`). Two left as
  follow-ups, both P's, for P3: `board-focus-ring()`'s
  `:host(:focus-visible)` can't match now that the application is inner,
  a change to `@fz/style` that Brick Fuzz Pop takes in the same commit; and
  `takePictures()` repeats Brick Fuzz Pop's board, to be lifted into
  `@fz/phaser/canvas`.
- P2 changed `onLayout`'s parameter in `bricks_scene.ts` (F's and L's
  painters' scene) to the whole `FieldMetrics`, so F and L meet it on their
  rebases.
- Nothing waits on P2 alone: L4 waits for L3 too, P3 for R3.

### R2 landed: 04d1638a, 230d4eb0, e4d98c05

- Double pay (C4) with the saved game's second version (C20), and the
  seeker (C1 to C3): the capsule from level 11 and the ball the paddle
  lends late, which turns, as it rises, toward the nearest needed brick it
  can see above it (the autopilot's sight test, now `inSight()` in
  `grid.ts`). The plain nearest brick sent balls into steel and plates'
  undersides and failed Mushroom's `sim` spec at Relaxed.
- The stream rebased onto 9b0f4fed (P2) itself, one collision in the
  cards' paragraph of `AGENTS.md`, both sides kept; P2's specs that count
  the spec levels now count the Dare level too. At the tip: Brick Breaker's
  lint, typecheck and tests (63 files, 2,300 specs), coverage at the floors,
  and the root's lint. Fast-forwarded.
- `report:levels --seeds 12`, before and after: the longest endgames,
  summed over 33 levels, 643/663/526 s → 595/607/453 s; the middle times,
  summed, 43:02/39:25/32:29 → 44:36/40:54/33:12 (+1:34, +1:29,
  +0:43). Hedge maze's
  longest endgame at Normal 0:46 → 0:25, as `plan.md` hoped. Mushroom at
  Normal now has one play with a 1:01 endgame, marked `!`: handed to K2.
- Three reviews, every comment answered (`worklog/R.md`).
- Left by R2: nothing yet shows a ball lent the seeker, and `seeking` has
  no flourish or sound. The ball's mark went to L3 (with L5), the cue to
  F3a.

### Wave 3

- K's branch rebased onto e4d98c05 cleanly, K1's old copies skipped.
- Started R3 (the best streak, marks and the stars record) and K2 (Friends'
  levels 34 to 40, and Mushroom's endgame). Whichever lands second marks
  levels 34 to 40 by R3's rule, so the integrator tells the one still
  running when the first lands. R3 was told the mark's ring beside the
  ball is stream F's, so it leaves the streak painter alone.

### L2 landed: 365ca045, 57b9848b

- `combedStrands()` and `sparkCommands()` in `@fz/phaser/fuzzball`, Brick
  Fuzz Pop's fur drawing through them; Brick Breaker's seven kinds drawn on
  `BRICK_SLAB` as the sheet's sections A, B and E show, K1's four
  placeholders on the new slab, and detail left out under 30 CSS px a
  brick. `@fz/phaser/bricks` gained `slabFace()` in review. Brick Fuzz
  Pop's atlas, 235,200 frames hashed, held byte for byte.
- The kit's numbers moved where they failed the contrast spec, each logged
  in `worklog/L.md`: steel's frame and rivets at 60% black (the kit's 34%
  gave 1.9:1), the shown ghost 12% toward white in light palettes.
- Rebased onto e4d98c05 (P2, R2) cleanly. On the rebased branch: Brick
  Breaker's tests (63 files, 2,508 specs, `sim` included), and the root's
  lint and typecheck under the lock. `@fz/phaser`'s and Brick Fuzz Pop's
  tests weren't run again at the landing (P2 and R2 touch neither); Wave
  2's `yarn verify` ran them. Fast-forwarded to 57b9848b.
- Two reviews, every comment answered (`worklog/L.md`); one lift asked for
  was declined with a reason.
- Left by L2: the ring of a brick growing back, which needs the brick
  painter; the agent read it as another stream's, but §7.3 gives stream L
  every painter except `effects_painter.ts` and `tail_painter.ts`, so it
  goes to L3.
  `brick_art.ts`'s header cites `docs/brick-breaker-uplift/art/`, which Z2's
  move must update.

### L3 and L5, as one package

- L5 (the gold lip on a bad capsule, the Seeker's symbol) was folded into
  L3: both redraw the capsules, and R2 has landed. Stream L runs its
  packages one at a time (L3, then L4 to L7), so the fold shortens stream
  L's queue by a package and the capsules are drawn once. It makes L3
  longer, so F2, which waits for L3, starts a little later.
- Started with L2's regrowing ring and a mark on a ball lent the seeker,
  which R2 left with nothing to show it.

### F1 landed: 6d7bacd5 to 586d482f

- The streak's notes up a major pentatonic to an octave and a fifth; the
  shards fading and dimming toward the field over 350 ms; a tail behind a
  ball in a streak (4, 6 and 8 dots at ×2, ×3 and ×4); a ring about the
  ball and the streak's count beside it at each step; the last brick's hit
  held 120 ms before the clear's chord. Without motion none of it plays,
  though the chord still waits 120 ms.
- The stream had rebased onto 9b0f4fed; the integrator rebased it onto
  57b9848b (R2, L2) cleanly. On the rebased branch: Brick Breaker's
  typecheck and tests (66 files, 2,632 specs, `sim` included), and the
  root's lint under the lock. Fast-forwarded.
- Five reviews, every comment answered (`worklog/F.md`). Outside its own
  files F1 added to `bricks_scene.ts` (and changed three lines of
  `update()` and `play()` for the hold), `art.ts`, `painter.ts`'s doc
  comment, and two new files in L's areas (`streak_art.ts`,
  `streak_painter.ts`); `layers.ts` and the new `tail_painter.ts` are its
  own. It copied Phaser's `phaser-text-and-bitmaptext` skill beside the
  others, since the count is a Phaser `Text`.
- Left for others: the mark's ring needs `Level.mark` (R3); F1's log says
  what the streak painter needs for it, which F2 builds rather than R3. So
  F2 waits for both L3 and R3, and K3's slider, whose painter rebases on
  F2's drop-in, waits for F2. The top note, 1900 cents, is past Phaser's
  documented ±1200: F3a checks it.

### Wave 2's end, and F3 split

- With F1 in, Wave 2 is whole. `origin/main` hadn't moved: fetched again,
  it was still eb560e1f.
- F3 split in two: F3a, Friends' voices (K1's kinds) and the seeker's cue,
  started now in F's free worktree while F2 waits for L3; F3b, Machines'
  voices, after K3.
- On the tip, 586d482f: `yarn verify` (every workspace's lint, typecheck
  and tests, and the build) passed in 2 min 56 s with four agents working,
  and `yarn check:layout` passed for every game, Brick Breaker's new deck
  and Ready card's foot included (1 min 19 s).

### The log's review

A fresh reviewer read this log, staged, against the commits, the streams'
logs and the plan. Its ten comments, all taken: P2's, R2's and F1's start
points and the two rebases P2 and R2 ran under themselves as K1 landed,
R2's collision with it; every id the move onto `origin/main` renamed,
mapped; that F2 now waits for R3 as well as L3; what the fold of L5 into
L3 shortens and what it delays; R2's middle times as figures; which of
F1's files are F's own; that the second to land marks levels 34 to 40;
that Wave 1's end ran no build or layout check, and that L2's landing ran
no library or Brick Fuzz Pop tests, both covered by Wave 2's `yarn
verify`; review tallies as "answered"; and four wordings.
