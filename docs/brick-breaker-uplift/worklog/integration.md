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

### R3 landed: 0a644447, 9589287f, d11a2092

- `Field.bestStreak`, kept by the saved game (its version stays 2), in the
  autopilot's report and `report:levels`' new column; `--marks` and each
  level's `mark` (C7), required in the level data; the stars record's rules
  in `src/rules/run/stars.ts` (C6), with `isCleanClear()` shared by the
  clean clear's bonus and the clean star.
- The marks: 20 of 33 at the floor of 5; the highest Fuse 30, Low bridge
  and Storm 20 (`levels/report-r3-marks.txt`). They are the autopilot's
  streaks, not a player's: to be played by hand (the plan's risk table
  says so).
- `report:levels --seeds 12` printed R2's report exactly but for the new
  column (`levels/report-r3.txt`).
- The rebase onto 009b350a (this log) was trivial; the agent's checks at
  its tip stand: Brick Breaker's lint, typecheck and tests (64 files, 2,383
  specs), coverage at the floors, the root's lint. Fast-forwarded.
- Four reviews (the stars' commit a second time, its fixes having added
  API), every comment answered (`worklog/R.md`). R3 left the
  `brick-breaker-stars` key out of `AGENTS.md`, since nothing writes it
  yet: P3's.
- K2 told: rebase, and mark levels 34 to 40 (now required to compile).

### P3 started, K2 and L3 still running

- P's branch fast-forwarded to d11a2092. Started P3 (the stars in the
  shell) with P2's two follow-ups: `board-focus-ring()` on an inner
  application, and `takePictures()` lifted into `@fz/phaser`.
- Running: K2, L3 (with L5), F3a, P3. Waiting: F2 (for L3), L4, L6 and L7
  (stream L's queue), K3 (after K2), F3b (after K3), K4.

### F3a landed: f8b3b546

- Five new sounds from `tools/build-sounds.mjs`: a plate's clank (the
  underside only, so a player hears whether a ball did harm), a cage's
  rattle, a key's chime, the gates' rising sweep, and a soft flutter as the
  paddle lends the seeker. None is louder than the brick's hit, measured
  on the built file. `VOICES` in `effects.ts` gives a kind a sound of its
  own; the effects spec keeps every event's and kind's sound in records
  the compiler holds whole, so K3's kinds must add theirs. A new
  `build-sounds.spec.ts` holds the committed sprite to what the script
  writes.
- The streak's top note: Phaser's Web Audio path clamps no detune (the
  ±1200 is only in its doc comments); at 1900 cents the player asked Web
  Audio for a rate of 2.9966, and the offline render played 1762 Hz for
  1759 expected. Nothing to fix.
- The rebase onto d11a2092 (R3) collided in the content skill's
  description, where R3 and F3a each added triggers: both kept. On the
  rebased branch: Brick Breaker's typecheck and tests (68 files, 2,753
  specs), the root's lint. Fast-forwarded.
- One review, every comment answered (`worklog/F.md`); one left as a
  follow-up: `withBurst()` is now copied in two games' `build-sounds.mjs`,
  a lift into `@fz/dev/sounds` for F3b.

### L4 in a worktree of its own

- Nothing in the queues was free to start: F2 waits for L3, K3 for K2,
  and L4 to L7 queue behind L3 in stream L's worktree. L4 touches little
  that L3 does (L3's rim and gutter are in `field_painter.ts`, so L4 tiles
  the place in a new painter), so it was split off into a sixth worktree,
  `/home/dev/Projects/personal/bbu/L4` on `bbu/L4`, port 9114, its log
  `worklog/L4.md`. Started L4 (`svgOf()` lifted, the places' art, the
  field's tile and the page's mask).
- Running: K2, L3 (with L5), P3, L4.

### K2 landed: ba3a3056, 2c1368ed, 2213ea2a

- Friends' levels 34 to 40, each with its mark (the agent rebased onto R3
  when told, and put each mark in the commit that adds its level), and
  Mushroom's cap with plain tips. No `!` or `+` in Friends at twelve seeds
  (`levels/report-k2.txt`). Redrawn: Walled garden (2:22 at Relaxed in the
  draft; its floor now gates from wall to wall, 0:57), Trellis (no plate
  against a side wall: long endgames 15 in 900 → 3). Mushroom's mark fell
  from 15 to 10.
- Mushroom isn't wholly fixed: about 1% of its plays still have an
  endgame past a minute, in every version tried, since neither the
  autopilot nor a seeking ball aims at a plate. The fix would be in R's
  `autopilot.ts` or `seeker.ts`; the twelve-seed report is within budget,
  so it is left as a point for the user.
- Seen beyond Friends, all points for the user: Lanterns (18) shows `+`
  (2:01 at Relaxed), since R2's seeker moved it from 1:58, not K2; a level
  of the thirty, not a new one, so §9's leave to mark a long new level
  doesn't cover it. With twenty seeds, Spiral (27) and Finale (30) each
  have one play at Relaxed past the endgame's limit (`!`), a breach of the
  budget that the twelve-seed report doesn't reach
  (`levels/report-k2-seeds20.txt`). On the tallest field, Mushroom has one
  play at Relaxed of 2:11 over its last bricks (`!`), the only one in the
  forty levels (`levels/report-k2-tallest.txt`).
- `play-variants.mjs` and `variants-k2.json` in `levels/` measure a level's
  redraws over many seeds, for K4 too. README and `index.html` now say
  forty levels.
- The rebase onto f8b3b546 (F3a) was clean. On the rebased branch: Brick
  Breaker's typecheck and tests (68 files, 2,825 specs, `sim` included),
  the root's lint. Fast-forwarded.
- Four reviews, every comment answered (`worklog/K.md`).

### K3 started

- Machines' kinds, in a changed order: the bumper with Pinball (41), the
  portal and the nudge with Wormhole (43), then the slider with Conveyor
  (42) last, after a rebase, so its painter change (an offset where a
  brick is drawn) lands on L3's brick painter and on F2's drop-in, as
  §7.1 and §7.3 order. K3 has since rebased itself twice, onto 98d22048
  and onto 6503c59c (F2 and L6 in), at clean points; the nudge came with
  the bumper (48fb439c on its branch), not with Wormhole.
- Running: L3 (with L5), P3, L4, K3.

### L3 (with L5) landed: 1cd5ee0b, 24cda60c, ab7d7e05, a139c929

- The paddle as the kit draws it, with velcro hooks while it catches and
  cannons while it fires; the capsules as pills, a bad one notched on a
  gold lip, the Seeker's symbol a sight; the ball's fur lifting with the
  streak's tier, and a sight under a seeking ball (`FieldView.seeking`);
  the rim on three sides, capped so it never reaches under a panel
  (`src/view/field/rim.ts`), the gutter under the paddle with chevrons, and
  the ring of a regrowing brick as it grows back (`cellFrame()`).
- The rebase onto 2213ea2a collided with F1 in five places: `art.ts`'s
  imports (both), and three paragraphs of the workspace's `AGENTS.md` (the
  view's art and the scene's painters: F1's streak art, tail and streak
  painters kept beside L3's paddle and sight), and the scene spec's helpers
  (both sets kept). Each side was kept whole, nothing of either rewritten,
  so no commit was reviewed again. The first try ran Prettier over a file still holding
  conflict markers, which mangled them, and staged it; the rebase was
  aborted at once, back to L3's own tip, and done again with each commit
  typechecked before going on, and every rebased commit searched for
  markers (none). On the rebased branch: Brick Breaker's tests (70 files,
  3,001 specs, `sim` included), and the root's lint. Fast-forwarded.
- Four reviews, every comment answered (`worklog/L.md`). Left: the
  board's focus ring could widen to `rimWidth()` (P's, done in P4);
  `outlinedWith` could be lifted, which touches Brick Fuzz Pop (L8);
  Friends' inks are L6's; and a ball lost in a streak fades in its flat
  faced frame, so fur standing on end snaps flat as it goes (the fur's
  review, item 1): the lost ball's fade is the effects painter's, so F3b's.
- K3 told to rebase onto it before its slider. Started F2 (the squash and
  the dip, the drop-in, the mark's ring), its branch at a139c929.
- Running: P3, L4 (finishing its last commit's review), K3, F2.

### P3 landed: ca8e676b, b5f94b08, 8b21590d, 0504165a

- `board-focus-ring()` now shows its ring while the inner application has
  the focus, Brick Fuzz Pop's board taking it in the same commit;
  `settledPictures()` lifted into `@fz/phaser/canvas`, both boards using
  it; `StarsService` keeping `brick-breaker-stars` (C6) and `GameService`'s
  `mark`, `starsHeld`, `bestStreak` and `newStars`; `<app-stars>` on the
  bench (in its first part, so a compact bench keeps them), the Ready card
  and the cleared card, those just won marked New; the Levels dialog's
  small stars with one text alternative a level, a count by each set and
  the total held; How to play's paragraph; the announcer saying the stars
  won after a clear (`describeStarsWon()`). Outside P's files: an outline
  star icon in `@fz/ui`, since an unwon star must differ by shape.
- The rebase onto a139c929 was clean. On the rebased branch: the root's
  lint, typecheck and tests (every workspace; Brick Breaker 3,044 specs),
  under the lock, 2 min 35 s; Brick Breaker's and Brick Fuzz Pop's builds
  and `check:layout`, both holding at every shape. (A first try at the
  builds ran a yarn held in a shell variable, which zsh doesn't split, so
  nothing built; the layout checks it ran read the agent's earlier builds.
  Run again with the shell function, both built and held.) Fast-forwarded.
- Four reviews, every comment answered (`worklog/P.md`). Follow-ups: at
  568 × 320 a cleared card with a "Double pay" line runs about 13 px past
  the field's wall (on the board still; `check:layout` looks only at the
  Ready card); the "a, b and c" join repeated from Brick Fuzz Pop could go
  into `@fz/core/format`; the last level's stars aren't on the result
  card, which the plan doesn't ask for.
- L's branch fast-forwarded to 0504165a. Started L6 (Friends' art and the
  friends' inks). Running: K3, F2, L4 (finishing), L6. Waiting: L7 (after
  K3), F3b (after K3), K4 (after K3), a P package for P3's and L3's
  follow-ups, Z1 and Z2.

### L4 landed: d5a29412, dd617d8b, 98d22048

- `svgOf()` in `@fz/phaser/shapes`; `src/view/places/`, each place's tile
  of motifs drawn as the places sheet scatters them, a record keyed by
  `Place`; the scene's `PlacePainter` washing the set's tile over the field
  at about 4.5% (baked at full strength, drawn at the place's alpha, so the
  net and the gutter take only a tint), and the board's `.backdrop`, a
  layer in the text's color masked by the same tile, a little stronger,
  past the field. A
  greyscale busy moment, three balls in play on the workshop's tile, showed
  the balls first in all four palettes.
- The agent stopped at its time with the third commit staged and its
  review unanswered; resumed, it answered the review (the tile had cut
  gaps in the net; the canvas renderer kept the first bake's frame; four
  specs tied the drawing to the right place) and committed.
- The rebase onto 0504165a collided in seven places, each settled by
  keeping both sides: the palette's `text` beside L3's paddle inks, three
  paragraphs of the workspace's `AGENTS.md` (L3's contrast paragraph and
  field painter with L4's `text` sentence, places bullet and
  `PlacePainter`), the testing skill's line on the shell's levels (P3's
  Dare mark and L4's `TWO_PLACES`), and an import each in the board's and
  the scene's specs. Each commit was typechecked as the rebase went, and
  every commit searched for markers. On the rebased branch: the root's
  lint, typecheck and tests (every workspace; Brick Breaker 3,213 specs)
  under the lock, Brick Breaker's build and `check:layout`. Fast-forwarded.
- Three reviews, every comment answered (`worklog/L4.md`); left with
  reasons: the place's layer sits second in F's `layers.ts`, not at the
  end, since a layer's depth is its place in the list; the page's tile is
  rebuilt at each layout, 0.8 to 1.7 ms.
- Started P4, a package of the integrator's for stream P's follow-ups: the
  Cleared card fitted to a small board and held there by `check:layout`,
  the "a, b and c" join lifted into `@fz/core/format` for both games, and
  the board's focus ring and placeholder at the rim's width. Running: K3,
  F2, L6, P4.

### F2 landed: b406e555, 94c630e3, c80f614b

- The ball squashed (the kit's 1.28 by 0.7) and the pad dipped in whole
  pixels for 90 ms as they meet, in the picture only; the bricks dropped in
  a column after a column, 160 ms each, 20 ms apart, landing at 400 ms, at
  once at any key but a shortcut or a repeat; and the ring and count at a
  level's mark, written once as each field starts (33 of the 40 marks fall
  on a step already). Without motion, none of it plays and the bricks
  stand in place from the first frame.
- The rebase onto 98d22048 collided once, the brick painter's line in the
  workspace's `AGENTS.md` (L4's `PlacePainter` and F2's drop-in, both
  kept). On the rebased branch: Brick Breaker's typecheck and tests (75
  files, 3,267 specs), the root's lint. Fast-forwarded.
- Three reviews, every comment answered (`worklog/F.md`). For K3: the
  slide adds its offset beside `dropInHeight()` and keeps `placed` false
  while a brick slides.

### L6 landed: eccb7b2c, 6503c59c

- Friends' kinds drawn for real: the plated brick in the tough tints, cut
  away round its steel plate in the marks' color so it reads against every
  tint (K2's note on Trellis), with nine teeth; the cage over the friend it
  frees next (`nextFriend()`, matching the rules' count), bent and cracked
  once hit; the key in gold; the gate, steel between gold ends. Friends
  fly in their inks, their tails, rings and counts too, and fade in their
  ink when lost. `cagedFriend()` in `@fz/phaser/bricks` takes an optional fur,
  Brick Fuzz Pop's unchanged.
- The rebase onto c80f614b (F2) collided in the ball painter (F2's squash
  and L6's inks: imports, two doc comments, and `lostInk()` beside F2's
  reset), the streak painter's doc comment (F2's mark and L6's colors),
  and the ball painter's line in `AGENTS.md`; each kept both, whole, so no
  commit was reviewed again. Every commit typechecked and searched for
  markers. On the rebased branch: the
  root's lint, typecheck and tests (Brick Breaker 3,493 specs).
  Fast-forwarded.
- Two reviews, every comment answered (`worklog/L.md`). Left, for K4: a
  rules-side `nextFriendInk()` for `freeFriend()` and the art to share;
  and, for K4 too, a `FieldEvent.ink` set at a loss to replace
  `BallPainter.lostInk()`'s guess by place. For F3b: an opening flourish
  for the gates. L6's own log records no coverage run at its last commit;
  the coverage at Waves 3 and 4's end below covers it. L6 removed
  `placeholderArt()` with its last user, so K3 was told to restore it.
- Two small lifts the integrator added, for the user's ask to share code
  between the games, while the queues wait on K3: L8, the fur's outline
  with its sparks (`outlinedWith()`, Brick Fuzz Pop's, repeated in Brick
  Breaker's art) into `@fz/phaser/fuzzball`, each game's atlas hashed
  before and after; F4, `withBurst()`, copied in both games'
  `build-sounds.mjs`, into `@fz/dev/sounds`, each game's sprite held to
  the byte. L8 runs in `bbu/L` and F4 in `bbu/F`, both from 6503c59c;
  L4's worktree is done with. Running: K3, P4, L8, F4.

### P4 landed: 650f6677, 12afd0eb, 9a1b88ab

- The Cleared card set smaller over a field under 380 CSS px tall, its
  stars across, its words kept for a screen reader (262 px, inside the
  field at every shape; it was 299 over a 285 px field at 568 × 320), and
  `check:layout` checking it at every shape over a kept run on Fuse that
  clears itself at double pay (`tools/stored_run.mjs`), failing with the
  old layout; `listed()` in `@fz/core/format`, which Brick Breaker, Brick
  Fuzz Pop and Sudoku (a third copy the review found) all call; the
  placeholder's rim as wide and round as the scene's (`--rim-width`,
  `--rim-corner`), and the focus ring laid outside it, `board-focus-ring()`
  unchanged.
- The rebase onto 6503c59c was clean. On the rebased branch: the root's
  lint, typecheck and tests (Brick Breaker 3,504 specs) under the lock,
  Brick Breaker's build and `check:layout`. Fast-forwarded.
- Three reviews, every comment answered (`worklog/P.md`); left: the
  layout check's `CLEARED_AT` rebuilds `@fz/dev/layout`'s private
  `PHASER_SHAPES` (a library export for one line).

### For Z2's move to `docs/archive/`

- Code that cites `docs/brick-breaker-uplift/art/` in a comment, to point
  at `docs/archive/brick-breaker-uplift/art/` after the move:
  `src/view/art/brick_art.ts`, `art.ts` and `paddle_art.ts`, and
  `src/view/places/places.ts` and `motifs.ts` (`git grep
docs/brick-breaker-uplift -- frontend` finds them all).
- `levels/play-variants.mjs` imports `../../../frontend/...`, which breaks
  one folder deeper; its imports and `@import`s gain a `../`. The plan's
  own mock scripts and `art/` generators may hold relative paths too: run
  each once after the move.

### The log's second review

A fresh reviewer read the log's additions since Wave 2's end against the
commits, the streams' logs and the plan. Its eight comments, all taken:
the ends of Waves 3 and 4 weren't recorded (run and recorded below, and a
heading that read as Wave 4's start renamed); K3's order put the slider
before F2's drop-in, against §7.1, and missed K3's own rebases and where
the nudge landed; nothing had checked coverage with L6's code in (run
below); K2's budget points were miscalled (Lanterns' `+` is R2's and not
a new level's, Spiral's and Finale's `!` at twenty seeds are breaches,
and Mushroom's `!` on the tallest field was missing); two follow-ups lost
(the lost ball's flat fur, now F3b's) or unclear (both L6 items K4's);
what Z2's move breaks (above); why no rebase that kept two sides of code
was reviewed again; and four wordings.

### F4 landed: 7718f774

- `withBurst()` in `@fz/dev/sounds` (the two copies were the same, doc
  comment and all), both brick games' `build-sounds.mjs` calling it; both
  sprites written again byte for byte (15 sounds, 189,804 bytes; 20,
  267,244). Its specs fail with each of six faults put in.
- The rebase onto 9a1b88ab (P4) was clean; the commit touches no file P4
  did, so its own checks (each game's tests, the library's coverage, the
  root's lint, typecheck and tests) stand, and the waves' end checks
  below ran over it. Fast-forwarded.
- One review, every comment answered (`worklog/F.md`). Follow-ups, none
  taken: Asteroid Breaker's sounds write the burst out by hand, with no
  spec holding its sprite; all four games' scripts print the same closing
  line; a helper for two clashing tones; a library helper for the sound
  spec both brick games now repeat byte for byte.

### Waves 3 and 4's end

- Wave 3 ended with L3 (a139c929) and Wave 4 with L6 (6503c59c); neither
  end's checks ran then. They ran on 7718f774, which holds both and P4 and
  F4 since.
- `origin/main`, fetched: still eb560e1f, so no rebase.
- `yarn verify:full` (every workspace's lint, typecheck, tests with their
  coverage floors, and the build) passed in 4 min, Brick Breaker's `pure`
  and `dom` at 99.59% statements and 97.63% branches over 3,264 specs,
  every floor held; then `yarn check:layout`, every game holding at every
  shape, Brick Breaker's Cleared card too.
- A first run, on 9a1b88ab, stopped at the root's lint: this log, edited
  while it ran, wasn't formatted. The layout check after it read Brick
  Breaker's build from Wave 2's end, which has no cleared card for P4's new
  check to find, and failed there. Nothing is edited in the integration
  worktree while its checks run now.

### L8 landed: a20e0d82

- `fuzzballWearing(by, style, worn)` in `@fz/phaser/fuzzball`: the
  fuzzball outlined as one with what it wears, building the outline itself
  rather than each game cutting it off `fuzzballCommands()`, which is now
  it wearing nothing; and `wornSparks()` beside `sparkCommands()`. Brick
  Fuzz Pop's `outlinedWith()` and its helpers, and Brick Breaker's
  `streakBallCommands()`, are gone. Every atlas frame hashed the same
  before and after (Brick Fuzz Pop's 235,200, Brick Breaker's 846,720).
- The rebase onto f31d1cbd was clean, git merging both games' `AGENTS.md`,
  which P4 and F4 changed too. On the rebased branch: the root's lint,
  typecheck and tests under the lock. Fast-forwarded.
- One review, every comment answered (`worklog/L.md`). Follow-ups, left for
  the user: cutting a slab below a line across it (Brick Breaker's
  `plateCut()`, Brick Fuzz Pop's plated `outlineOf()` and `cutAt()`, the
  mirror of `topCap()`), which would move Brick Fuzz Pop's numbers; the
  crack cut out of a brick, likely too thin to lift.
- Running: K3 alone, whose slider waits on nothing more. L7, F3b and K4
  wait on K3; Z1 and Z2 on them.

### K3 landed: beae5f5c, 20269873, b76415ac

- The bumper with Pinball (41) and the nudge off anything that can't break
  from Machines on (C19); the portal with Wormhole; the slider with
  Conveyor (42), Wormhole moved to 43 and its mark set again by the rule
  (10). Bumpers and portals are discs, not slabs (a departure from §5.2,
  in `worklog/K.md`); the travel alone opens a round cell, so the seeker
  and the autopilot still take it as blocking their sight. A broken brick
  doesn't stop a train; the saved game keeps each brick by its home with
  its cell and heading (`SAVED_GAME_VERSION` still 2). The brick and glow
  painters add a slide's offset (`slideOffsetOf()`) beside F2's drop-in,
  its way on the event (`FieldEvent.way`). The slider is drawn by
  `placeholderArt()`, restored, and the bumper and the portal by a new
  `roundPlaceholderArt()`.
- No `!` or `+` on 41 to 43 (`levels/report-k3.txt`, levels 1 to 40 line
  for line as K2's); middle times at Relaxed, Normal and Fast: Pinball
  0:35, 0:37, 0:27; Conveyor 0:35, 0:36, 0:25; Wormhole 0:30, 0:31, 0:23.
- K3 had rebased itself onto 6503c59c; the integrator's rebase onto
  a20e0d82 (L8) was clean, git merging `art.ts` and the testing skill by
  itself. Each rebased commit typechecked and was searched for markers. On
  the rebased branch: Brick Breaker's typecheck and tests (77 files, 3,701
  specs, 258 of them `sim`), the root's lint. Fast-forwarded.
- Four reviews (the bumper's twice), every comment answered
  (`worklog/K.md`). Left: a pop or regrowth drawn on a slider stays on the
  cell it left (L7's, the brick painter's); trains bunch at the walls on
  Conveyor (K4 watches for it).

### Wave 5's rest

- L's and F's branches fast-forwarded to b76415ac. Started L7 (Machines'
  art, and drawings that follow a slide), F3b (the boing and the whoosh,
  the slider's step if any, the gates' opening flourish, and a lost ball
  fading in the frame it flew in) and K4 (Machines' levels 44 to 50, the
  report's longest time between touches of the paddle, and L6's two rules
  follow-ups for K: `nextFriendInk()` and `FieldEvent.ink`). Running: L7,
  F3b, K4. Then Z1 and Z2.

### F3b landed: 9325eb47, 0fab9b28

- The bumper's boing (also at a bolt's or a blast's hit, which rang as
  steel) and a pop as it kicks the ball; the portal's whoosh; the slider's
  step left silent, a metronome no player started. Both new sounds are
  quieter than the brick's hit, measured; the sprite's first fifteen sounds
  are byte for byte as before. The gates open with a flourish, each thinning
  to its middle and fading over 360 ms, the sweep's length; a lost ball
  fades in the frame it flew in, its kind, ink and the streak's fur, with
  its eyes (`BallPainter.drawnStreak`, since the rules reset the streak as
  the last ball goes).
- It sat on the tip already, so it landed as the agent checked it: Brick
  Breaker's lint, typecheck and tests (77 files, 3,715 specs), coverage at
  the floors, the root's lint. Fast-forwarded.
- Two reviews, every comment answered (`worklog/F.md`). Left:
  `facedBallFrame()` is used only by specs now, and friends' faced frames
  by nothing (How to play still uses `FACED_BALL_FRAMES`), for Z1;
  `withGates()` in the scene spec could fold onto `GATED`; if a key's hit
  clears the level no `opened` is recorded, so its gates vanish during the
  hold (no level reaches it), told to K4 with where `lostInk()` now sits.

### L7 landed: 6f2cec81, 1b71cd8e

- The bumper through `bumperMark()` in the accent; the portal through
  `portalMark()`, `@` violet with a dot and `%` teal with a hollow diamond,
  the two pairs held apart by hue (`deltaE()`, new in `@fz/style/testing`,
  27 at least, as the fuzzballs' inks are) as well as by badge; the slider
  its tint's body with the kit's three chevrons pointing the way it heads,
  the front one in the marks' color. `roundPlaceholderArt()` and
  `placeholderArt()` gone. The brick painter carries a move under way along
  a slide (`carryMove()`): a slider breaks at its one hit and never
  regrows, so in play this keeps a broken brick's leftover swell off the
  slider that steps into its cell.
- Nothing is left out of the three under 15 CSS px a unit, against the
  brief: a portal's badge must show at every size, and a slider without its
  chevrons can't be told from a plain brick; drawn at 11 and 12 px in every
  palette, each read whole. The trail chevrons at 45% of the tint, not the
  kit's 55%, which fell under 2:1. In Soft pastel the bumper and the first
  portal pair are both violet, told apart by shape. The `%` pair is in no
  level yet (K4's drafts may use it).
- The rebase onto 0fab9b28 (F3b) collided once, the brick painter's line
  in `AGENTS.md` (F3b's bumper swell and L7's carried move), both kept,
  whole. Each commit typechecked and was searched for markers. On the
  rebased branch: the root's lint, typecheck and tests (Brick Breaker 3,828
  specs) under the lock. Fast-forwarded.
- Two reviews, every comment answered (`worklog/L.md`).

### Z1: the browser pass and the docs read through

- The screenshots captured again on the uplift's look
  (`yarn capture:screenshots --url 'http://[::1]:9014/'`, since the dev
  server binds `::1` on this machine).
- A pass in a browser over the sets, the palettes and the shapes, from runs
  the rules kept (`tools/stored_run.mjs`) for a level of each set but
  Basics: Drawbridge (33) in Classic felt at 1280 × 720, Conveyor (42) in
  Casino night on a phone on its side (844 × 390), Wormhole (43) in
  Midnight blue on an upright phone (390 × 844), Pinball (41) in Soft
  pastel at 1280 × 720, Hedge maze (22) in Classic felt at 568 × 320, and
  Shelf (12) in Midnight blue on a tablet (1024 × 768). Basics shows in the
  screenshots, Rocket (9) in Midnight blue at 1280 × 720. Nothing was
  wrong: no page scrolled, every panel, card and badge sat where it should,
  and each place's motif read faintly under the bricks, the playroom's
  under Rocket's too. One point for the user: "In this level" draws each
  kind in How to play's picture, so a plain brick is red there whatever
  the level's tints.
- Two fresh audits read the docs the branch changed against the code: Brick
  Breaker's `AGENTS.md`, `README.md` and two skills (nine definite
  findings, twelve possible, and one count K4 changes), and the shared
  docs (two definite, four possible). All were fixed in a docs commit but
  the deck's example spare, 184, which is right as an example. Among them:
  `--marks` prints marks and writes none; the saved game keeps a brick's
  cell and heading; history wording and the plan's decisions cited by
  number, both dropped; `settledPictures()` named for the boards that use
  it; Pinball's lowest bumper three rows below the others, not one.
- F3b's follow-ups done in a refactor commit: a friend's faced frame, drawn
  into the atlas and shown by nothing, and `facedBallFrame()`, called only
  by specs, are gone; the art spec holds each ball's picture to its frame at
  ×1 with the eyes over it, and fails if the picture's fur is changed; the
  scene spec's gates take `GATED` and `openGates()`. One review, every
  comment taken.
- The docs commit's review: every comment taken. It found the fixes half
  carried through: dropping "the uplift's places sheet" left "as the sheet
  does" pointing at nothing, while "the kit" stayed elsewhere. So the
  game's docs keep citing the uplift's art kit and places sheet, as Brick
  Fuzz Pop's cite its plan, and Z2 points them at the archive with the move;
  the libraries cite no game's plan. Also taken: the app's stylesheet as
  the one without the toolkit in two more places, history wording in two
  code comments, the testing skill's triggers, the friends' inks, and
  ragged lines. Left for after K4, which changes the same lines: the
  report's singular "the spec" in `AGENTS.md` and `report-levels.mjs`.
- Both commits waited on `bbu/z1`, branched from the tip in L4's worktree,
  which L4 was done with, as 13fdd55c and 22c7d406, ids from before its
  rebase onto K4. They landed after K4, below.

### K4 landed: c9056bb4, 30255fec, 00e61ecd, 4244da14

- The report's `away` column, the longest a play goes between two touches
  of the paddle, marked `^` past a minute and failing on none; L6's two
  follow-ups, `nextFriendInk()`, the one rule a freed friend's ink and the
  cage's picture take, and `FieldEvent.ink` on a lost ball, so
  `BallPainter.lostInk()` is gone; and Machines' levels 44 to 50: Tilt,
  Typewriter, Two rooms, Clockwork, Switchyard, Pachinko and Grand machine,
  each with its mark (all 5). Middle times at Relaxed, Normal and Fast run
  from Two rooms' 0:32, 0:25, 0:18 to Switchyard's 0:50, 0:38, 0:34.
- Redrawn from the drafts: Two rooms has a blast over each portal (the
  draft's endgames past a minute, 52 in 300, fell to none); Switchyard's
  shafts hold one key each, at the walls, its strongroom near the top (the
  draft showed `+` and `^`, a ball held in the pocket over the strongroom);
  Pachinko's cups take one hit (`u`), not two (21 long endgames in 900 to
  2). Tilt and Grand machine kept as drafted, 10 and 12 in 900, like
  Stepping stones' 11.
- At twelve seeds, nothing marked on 44 to 50, and levels 1 to 43 as K3's
  report but for the new column (`levels/report-k4.txt`); Lanterns' `+`
  stays. At twenty seeds, Grand machine has a `!` at Relaxed (1:31), beside
  Spiral's and Finale's; on the tallest field, a `!` too (2:12), beside
  Mushroom's (`levels/report-k4-seeds20.txt`, `report-k4-tallest.txt`).
  Its long endgames leave the roof bricks over the strongrooms. Both of its
  `!`s breach §9's budget for the last bricks, and no variant of its roofs
  and strongrooms did better by more than chance (`worklog/K.md`): a point
  for the user, with Spiral's and Finale's.
- No level lays a two-hit plated brick now: the kind takes one or two hits
  (`U` two), and every plate in a level is a one-hit `u`. How to play, the
  Ready card and "In this level" picture it at two hits, and its line says
  "one or two hits", so a player on any of the five levels with plates
  (Mushroom, Stepping stones, Trellis, Tilt and Pachinko) is shown a plate
  unlike the level's: a point for the user, draw a level with `U` or
  picture the kind at one hit.
- Two handoffs closed: K3's trains bunching at the walls, since
  Typewriter's and Clockwork's stand a beat there as Conveyor's do but no
  endgame waits on them, and Grand machine's two ran a cell apart in the
  browser, none of its long endgames waiting on a slider; and L7's `%`
  pair, which Two rooms and Switchyard lay.
- F3b's note, that a key whose hit clears the level records no `opened`,
  so its gates vanish during the hold: left, as K1 chose and no level
  reaches it.
- It sat on the tip, 1b71cd8e, so it landed as the agent checked it: Brick
  Breaker's lint, typecheck and tests (77 files, 3,916 specs, 300 of them
  `sim`, all fifty levels at every speed), coverage at the floors (99.57%
  statements, 97.35% branches), and the root's lint; the integrator ran
  Brick Breaker's typecheck at the tip again. Fast-forwarded. A browser
  check by the agent drew Switchyard, Pachinko and Grand machine at
  1280 × 720 with nothing in the console.
- Five reviews (48 to 50 twice, its fixes having redrawn Switchyard), every
  comment answered (`worklog/K.md`). Left: `nextFriend()` in the view, now
  only `nextFriendInk()` again (gone in Z1); `events.add()`'s eight
  arguments in a row, kept, since the log's ring is filled in place and an
  options object would allocate at every event.

### Z1 landed: 193c7baf, c997ddc0, a3d6af34

- The rebase onto 4244da14 (K4) collided once, in Brick Breaker's
  `AGENTS.md`: the report's paragraph, where K4 had added the `away` column
  and the docs commit had made "the spec" the specs in `every_level/`; both
  kept, and the change held back for K4 made there: the report's specs,
  plural, in `AGENTS.md`, `report-levels.mjs` and its spec. The commit's
  message amended to match. That delta went unreviewed till after it had
  landed; its review found "the specs" put on `endgameOf()`'s `!`, which
  marks any field's limit, "they" left far from the specs in the
  paragraph, and the paragraph ragged, all fixed in a follow-up on
  `bbu/z2`. Then a third commit removed `nextFriend()`, K4's leftover: the
  cage's frame takes the rules' `nextFriendInk()` itself, and its spec
  holds the frame's friend ink to the ball the cage's next hit frees. One
  review, every comment taken.
- Brick Breaker's tests ran on the branch's tip (77 files, 3,914 specs, two
  fewer with `facedBallFrame()` gone); its lint and typecheck and the
  root's lint ran before the spec's last edit, and again on the tip once it
  had landed, all passing. Fast-forwarded; the tip holds no conflict
  markers.
- The screenshots were committed on `bbu/z2` as 1f37d02d, to land with Z2.
  A review found the thumbnail, cropped around the field alone, cut
  through both panels, and a crop around the panels too took in part of
  the game bar, so the thumbnail is the whole page, as the preview is; the
  plan's picture of the game before is kept beside it as `before.webp`.
- Left for the end, on the final tip with Z2's move: `yarn verify:full`,
  `yarn check:layout` and a fetch of `origin/main`, still eb560e1f now.
