# Rickashay: the implementation plan

Written 2026-11-22, as a companion to [`design.md`](design.md), and built by
2026-11-25: [As built](#as-built-2026-11-25) says what the build decided. The
design says what the game is: its 27 decisions, its rules, its numbers, its
levels and the seven choices you settled on 2026-11-10. This file says how to
build it:

- your answers to the questions settled before any code, and the plan's
  own calls (§2);
- what moves out of Brick Fuzz Pop into a shared library first, and what
  stays (§3);
- the game's architecture and the contracts its parts share (§4);
- each package of work, its commits, what it owns and when it is done (§5);
- how the packages run side by side: branches, slots, ports, ownership,
  briefs, reviews (§6);
- the work log that lets the build stop and start again (§7);
- the practices each layer keeps (§8), the checks and budgets (§9), the
  risks (§10), and the finish (§11).

Where this file and the design disagree, this file is the newer, and §2
says why at each point. The build runs by the `multi-agent-build` skill,
every commit reviewed by the `commit-review-process` skill, and the merge
into `main` by the `merge-to-main` skill, once you ask.

Paths are relative to `frontend/` unless they start with `docs/`,
`.agents/` or `.github/`.

**What it was written from:**

- `design.md`, read whole, and the sketch's README and outline. The sketch
  wasn't run again: its numbers are the design's.
- Brick Fuzz Pop's code, end to end, in three surveys: its rules, specs'
  helpers and tools; its view, scene and shell; and the libraries around it,
  with how a game is wired into the site, CI and the image.
- The archive's plans for Brick Fuzz Pop
  ([`implementation-plan.md`](../archive/brick-fuzz-pop/implementation-plan.md)
  and its "As built"), its
  [tune-up](../archive/brick-fuzz-pop-tune-up/plan.md), and the
  [bug-reports build](../archive/bug-reports-and-aimed-serve/implementation-plan.md),
  the first run by the `multi-agent-build` skill.
- The `.agents/` rules and skills, the libraries' `AGENTS.md` files, and the
  agent-efficiency plan's notes on the last build
  ([stage 6](../agent-efficiency-audit/plan.md)).
- The account's week, read with `/measure limits`: 73% used, resetting Wed
  Nov 25, 02:00 UTC.

## As built (2026-11-25)

Built from 2026-11-22 to 25 to this plan, by packages in worktrees of their
own (§6), each commit reviewed. Part 1 merged into `main` on 2026-11-24, at
8496d2a0. Part 2 through the feel gate (Q3), with its fixes (M2 and Q4),
followed on 2026-11-25, at cbabc893, behind "In development". X1 to X4, Z1, Y1
to Y3, D1, a fix to the skills and F1 then landed on `rickashay`. The work log
(§7) is not merged. This plan describes the code as it was, so check a path
against the tree before following one.

What the build decided that the sections below don't say:

- **The levels:** all thirty-six certified, and every set played on its
  certified marks, listed once in `LEVEL_MARKS`. Warm-up's pars moved onto
  them on 78 of its 108 level-depths, its rally marks on 103. Springboard was
  redrawn (C17), no ceiling raised, as aims drawn blind cleared its draft 90
  times in 100. The course it lays twice lost a spring brick and gained three
  tough ones, and blind now clears it 43 times at most. The table gives each
  set's nearest over `report:levels`' 40 games, against its floor, a blind
  ceiling of 75 and a least sweet spot of 0.75°, and its `CHECK_DEPTHS`.

  | Set          | Floor | Careless, least     | Blind, most      | Sweet spot, least   | Checks on |
  | ------------ | ----- | ------------------- | ---------------- | ------------------- | --------- |
  | Warm-up      | 90    | 95, Attic           | 45, First bounce | 1.25°, First bounce | 18 deep   |
  | Angles       | 85    | 88, Slalom          | 73, Bounce house | 1.25°, Launcher     | 21 deep   |
  | Tricks       | 80    | 88, Shutters        | 40, Kaleidoscope | 0.75°, Kaleidoscope | 21 deep   |
  | Long rallies | 50    | 73, The long way up | 15, Greenhouse   | 0.83°, Greenhouse   | 12 deep   |

- **The contracts,** beyond §4: every trait has its rule, so Rickashay's
  stand-ins (`STAND_INS`) are gone. `BRICK_ART` and `HELP_KINDS` are whole
  records over `KindId`, so a kind without art or words fails to compile. The
  hatch's dots and the lock's bolts, which a flight changes, are tints that
  `RoundPlay`'s `leftBy()` writes into the wall drawn. Their files stay out of
  the art, so the main chunk doesn't take it:
  `games/rickashay/src/view/art/hatch_tint.ts` and `lock_tint.ts`.
- **Z1** lifted what the games wrote alike: the levels' list,
  `CertificateLine`, Fast-forward, the benchmarks' times, a brick's cell, the
  dot, the shard, the hot shot's flames, `itemAt()`, `ordinal()`,
  `waitForTurn()` and the specs' held load. Drop and Skip stay each game's, as
  they say different things.
- **The bundle,** measured at 3dcdc140, as no commit body has these
  figures after F1: the main chunk is 419.86 kB against Brick Fuzz Pop's
  418.72, over §9's bar by 1.14 kB; the owner accepted an overshoot. The
  page preloads two chunks beside it: the rules' 29.77 kB, preloaded at F1
  too, and the effects' 17.59 kB, split out of the main chunk since F1
  measured it at 436.33. The main chunk with its preloads is 467.22 kB,
  against Brick Fuzz Pop's 452.74 with its rules' 34.02. The difference is
  the game's own code and levels, which every page plays or shows. The
  scene's chunk is 72.34 kB, under Brick Fuzz Pop's 72.54, and the
  certificates load only at `?debug`.
- **The times,** over all four sets, are within §9: `fly()` a median of
  31.9 µs and a p99 of 629 µs, `sim` 53.9 to 54.5 s on one worker (about 59 to
  79 on CI's runner), the replays 2.3 s and the suite 64.7 s. `guideOf()`'s
  p99 to the fifth turn is over §9's 0.2 ms, at 217 µs plain, but under 1 ms.
- **The frame** of level 36's longest flight at ×6, 0.2 ms faster after F1,
  has a median of 3.75 to 3.77 ms in a full trace at 500×1400, under §9's 4.
  At 1280×800 it is 4.04 to 4.07, as change detection and layout run in 29% of
  frames. A window's drag stays at 88 ms a frame at ×6.
- **Accessibility:** a load shifts nothing, and F1's input pass held for keys,
  the mouse, a phone and the roles. Lighthouse scores 100 for accessibility and
  best practices, and 92 for SEO, as `vite preview` answers `/robots.txt` with
  the page.
- **Left:** for `@fz/brick-wall`'s wall painter, which moves no brick it bakes
  and hands a kind no neighbors, the hatch's dip and swing, a lock's bolt
  sliding back, and a hatch bar's cut ends, drawn square. For Brick Fuzz Pop,
  its last level's words, which say the score twice. And the lifts packages
  named for later, which Z1 left: Brick Fuzz Pop's copies of the plated
  brick's plates, the moss's cap, the pips and cracks, the guide's dots, the
  cards' delay, the board's rows waiting and cards, the debug menu and
  `check:layout`'s inspection; `portalInks()`, in Brick Breaker too;
  `mediaMatches()`; `ladderCentsOf()`; and a helper for the folders `@fz/dev`'s
  specs make.

**Left for the owner,** beside §11's "What Z2 leaves for you":

- The calls still open: an aim's precision, the hot shot's frequency, the
  Ready card's size, "Rows left" against "rows waiting", and the last level's
  Cleared card, which both games skip through the shared `RoundDriver`.
- The catalog's blurb, which doesn't set Rickashay apart from Brick Fuzz Pop,
  and the loose "them" in How to play's "clear them all".
- A flight fixture whose moment closes with two of a floor bounce spent, the
  hatches opening and a bolt drawn, so a spec runs the sort of those events.
- The trademark search, before the game leaves "In development".

---

## 1. Summary

- **Two parts, as Brick Fuzz Pop was built, and a dedupe pass inside the
  second.**
  - **Part 1, the lifts (§3):** about 45 commits in nine packages, on the
    branch `rickashay-lift`. What both games need moves out of Brick Fuzz
    Pop into a new library, `@fz/brick-wall`, laid out in the same four
    layers as a game (rules, view, scene, shell), plus six small pieces into
    the libraries that already hold their kind. Brick Fuzz Pop adopts each
    piece in the commit that lifts it and plays bit for bit as before, which
    a new spec of its flights proves. Part 1 can merge into `main` on its
    own (question 5).
  - **Part 2, the game (§5.2):** about 120 commits in twenty-eight
    packages, on the branch `rickashay`, in `games/rickashay`. It writes
    only what is Rickashay's: the flight with its cut corners, the eleven
    kinds, the rally and its floor bounces, the levels and their proof, the
    art, the sounds and the words. Everything else is the library's.
  - **Z1, the dedupe pass,** once both games have a shell: it reads the two
    side by side and lifts whatever both still hold.
- **No Part 2 package but Z1 touches `lib/`, and no two packages at work
  at once own one file.** That is what lets four agents work at once without
  colliding (§6.4).
- **A contracts package (K2) fixes the types the game's streams share,**
  with hand-made flights, so the view, the scene and the shell are built
  against the rules before `fly()` exists.
- **The rules are open from the start.** `fly()` is built with every face
  shape and every hook a kind needs, tested with kinds that exist only in
  the specs, so the eight later kinds add only their own trait rules, art,
  words and catalog entries, four streams side by side.
- **A feel gate (Q3)** comes once Warm-up plays end to end with sound. The
  design's numbers are first guesses for real screens, and the gate is
  where you play it (question 4). Six of the eight later kinds are built
  while you play; the moss, the lock and the last three sets wait for your
  word on the numbers.
- **The longest chain** runs L0 → L1 → L4 → A1 → A2 → S1 → U1 → U2: the
  library, the view's lifts, the art, the scene, then the shell. After U2
  it takes one of two tails, whichever is slower: X1 → Z1 → X4 → Y3 → F1
  → Z2, or the gate, Q3 → X4 → Y3 → F1 → Z2, when your play takes longer
  than X1 and Z1 do. The proof of Warm-up, L0 → L1 → K2 → R1 → R2 → R3 →
  P2 → P3, runs beside it, and the gate waits for it too.
- **What it costs:** about 165 commits. The `multi-agent-build` skill
  puts a commit at about 0.6% of a week, which would be the whole of one;
  that figure is from the builds before reviews ran in the background. The
  last build cost $338 and landed 63 commits, $5.37 each (the ledger counts
  89, of which 26 were work-log commits dropped before the merge). It took
  12% of the week by `/measure limits`, where the ledger estimates 19%:
  about 0.2 to 0.3% a commit. At that rate this build is $890, half a week
  by the ledger's estimate of a week ($1,812), or a third by what the last
  build measured (about $2,800). The plan budgets by the
  last build, and reads the week again once L0 and LP land: a commit over
  0.4% means three workers in place of four, and the 85% stop of §6.1 may
  fall before Z2. It starts after the reset of Wed Nov 25, and §7 lets it
  stop and start across days.

```text
Part 1, on rickashay-lift
  L0 ── L1 ──┬── L2 ──────┬── L6 ──┬── L7 ── Q1
             ├── L4 ──┬───┘        │
             │        └── L5       │
             └── L3 ───────────────┘
  LP, beside L0: L2, L5 and L6 also wait on it

Part 2, on rickashay
  K1 (after L0) ── K2 (after L1) ──┬── R1 ── R2 ── R3 ── P2 (also after L3) ──┬── P3 ── Q2
                                   ├── P1 ─────────────────────────────────────┘
                                   ├── R4 (after L2)
                                   ├── A1 (after L4) ── A2 (after LP)
                                   ├── V1, V2 (after L4)
                                   └── N1
  S1 (after A2, V1, V2, N1, L5) ── U1 (after R3, R4, L7) ──┬── U2 ──┬── Q3, the gate (also after P3)
                                                           └── T1 ──┘
  X1, X2, X3 (after R2, A2, U2) ── Z1 ──┬── D1
                                        └── X4 (also after Q3) ── Y3
  Y1 (after X1, X2, Q3) · Y2 (after X1–X3, Q3)
  F1 (after Y1–Y3, D1) ── Z2, the finish
```

---

## 2. Settled before code

### 2.1 Your answers

Each of these changes what a player sees, how the rules play, or how the
work reaches `main`, so each was yours to answer. On 2026-11-22 you went
with the recommendations, so each answer below is yours.

1. **Where the shared code goes.** About half of what Rickashay needs is in
   Brick Fuzz Pop: the wall, the field, the round played back, the aim, the
   proof's tooling, the panels, the board and the driver of a round. It can
   go into one new library laid out in a game's four layers, or be spread
   over `@fz/core`, `@fz/phaser`, `@fz/game-ui` and `@fz/dev` by kind.
   Spread, the rules' pieces go into `@fz/core`, which every game imports
   and which lacks the exact-arithmetic lint a game's rules keep.
   - **Yours, as recommended: one new library, `@fz/brick-wall`,** in
     `lib/brick-wall/`, whose `rules/`, `view/`, `scene/` and `app/` folders
     keep the fences a game's do, and whose layers a game's same layers may
     import. It holds what the two wall games mean alike and nothing else,
     so no other game is reached by it. Pieces any game could use (the
     slab's cut corner, `dynamicTexture()`, `onDemand()`, an icon,
     `withLowerCount()`, the queue) still go into the libraries that hold
     their kind.
2. **Fast-forward.** The design has it held, and F held too ("Controls",
   decision 22). Since the tune-up of 2026-11-15, Brick Fuzz Pop's is a
   switch, kept with the settings and live while aiming, and F switches it,
   as you asked there ("a toggle for speed generally").
   - **Yours, as recommended: a switch, as Brick Fuzz Pop's,** four times the
     speed on top of Normal or Fast. The design defers to Brick Fuzz Pop's feel
     where the two share a control, and one bar should behave alike in both.
3. **Skip or Drop.** The design's Skip lands a flight at once with
   everything it would have done (decision 22, "Accessibility"). Brick Fuzz
   Pop replaced its Skip with Drop on 2026-11-15: the fuzzball comes
   straight down, and the round keeps only what it had done by then.
   - **Yours, as recommended: Skip, as the design has it,** on the bar and X,
     and no Drop. Here a long flight is the prize: Drop would throw away the
     rally a player was watching, and the dash home already cuts the tail of a
     flight with nothing left to strike.
4. **The feel gate.** The design's numbers are first guesses for real
   screens, and its first risk is whether an aim alone is enough to do. Q3
   comes when Warm-up plays end to end with sound. You follow builds from a
   phone, which can't reach the devbox.
   - **Yours, as recommended: play it on the live site, behind "In
     development".** At Q3, at your word, the work so far is merged into `main`
     and deployed, the game's tile marked "In development" until Z2. You play on
     a phone and a desktop and say what to change. Meanwhile six more kinds are
     built; the sets wait for your word on the numbers.
5. **Part 1 on its own.** The lifts change a live game, Brick Fuzz Pop, and
   touch nothing of Rickashay.
   - **Yours, as recommended: merge Part 1 into `main` alone once Q1 passes, at
     your word,** as Brick Fuzz Pop's lifts were. It ships the refactor while it
     is fresh, and keeps later rebases of the game's branch small.

`design.md` takes your answers and the calls below where they belong, so the
design and the build agree. That is the first commit on `rickashay-lift`, made
by the orchestrator before L0 starts, so it reaches `main` with Part 1.

### 2.2 The plan's own calls

These fill what the design leaves open, or settle where it and Brick Fuzz
Pop's code have parted since 2026-11-10. None reopens a choice you settled.
Each can be overturned without unpicking the rest.

**C1. The cards are Brick Fuzz Pop's.** The design says every overlay is an
`<fz-dialog>` ("Cards, the bar and the panels"); Brick Fuzz Pop's Ready,
Paused, Cleared and Ended are in-board cards (`role="group"`), and only
Levels and the result are dialogs. The design also says "As Brick Fuzz
Pop's", so this follows the code.

**C2. Boredom stays at 60 units without a strike.** Brick Fuzz Pop moved to
180, with any touch on a breakable brick counting, in its tune-up. Here a
flight that still strikes never yawns, the dash home flies the bored tail
at three times the speed, and the design's floors, sweet spots and marks
were measured at 60. A strike is a turn off a brick that takes a hit:
steel, a ramp, a hatch's bar, a plated face and a shut lock don't count.
The yawn is an event at exactly 60.0 units. The debug menu's slider tunes
it, and the feel gate is where to try 120 if flights end too soon.

**C3. One moment, one turn.** Every contact within `AT_ONCE` of the soonest
is gathered first. Flats turn the fuzzball, a long 45° face then turns it
if it still flies into one, and a corner's cut only where nothing else did
(the design's "The flight"). Every brick met in that moment is met once,
in the order floor up, then left to right, which is the order hits,
breaks, events and points are written in.

**C4. What counts as a turn,** for the locks and the guard against turning
in place: each moment the heading changes, once, whatever met it. A floor
bounce and a hatch's hold count; passing a portal doesn't.

**C5. The floor bounce ladder** is written as a rule, not a list: the first
at a rally of 10, each next one 5 dearer than the gap before it (10, 25,
45, 70, 100, 135 …). One earned while three are held is lost, and still
announced. A spring brick's bounce counts as earned for the points; a hot
shot's first doesn't.

**C6. Portals.** A fuzzball is taken as its middle crosses into the eye,
the middle half-unit square of the cell, and set down at the same place in
its twin's eye, flying the same way. It ignores every portal until it next
turns. A portal whose twin waits over the ceiling is air.

**C7. Hatches.** The bar is a flat along the top of its cell, met only
flying down. Its ends are cut where nothing stands beside them, and a turn
off an end is a hold too. The bricks about a hatch are faced as if it
weren't there. The three holds are the flight's, and at the third every
hatch opens until the fuzzball lands.

**C8. Exact arithmetic is Brick Fuzz Pop's lint, unchanged.**
`phaserGameLayers({ exact: true })` counts `Math.sqrt` among the functions
it allows. Rickashay's flight needs none, and R1's review checks that it
uses none; a stricter lint for one game would be a mode flag. The 45°
faces' stand-off, a quarter of a unit times the square root of 2, is
written out in `tuning.ts`, as the sketch's `H` is.

**C9. The aims are Brick Fuzz Pop's 657,** lifted whole (L1): aim `i` is
8° + i/4°, written out as numbers by a script. A shot is an aim and
nothing else.

**C10. Records are kept as a flight lands,** as Brick Fuzz Pop's have been
since its tune-up, through the shared driver. A page hidden mid-flight
lands the flight at once, as it would have flown.

**C11. Stars are three flags,** each kept once earned in any game that
clears the level: cleared; within par, where par is the certificate's
rounds and half as many again, rounded up; and a flight at the level's
rally mark for the depth played. Brick Fuzz Pop's tiers stay its own.

**C12. Points,** per "The feel, in numbers": 10 a strike times the rally's
step, which is `@fz/core/math`'s `multiplierAt()` over the tiers 5 from
45, 4 from 25, 3 from 10 and 2 from 5; 100 for each floor bounce earned,
100 for a jump, and 200 a star. A rally of 7 pays 100 and of 33 pays 950,
as the design says.

**C13. The guide is the rules' own flight,** stopped 1.5 units past its
Nth turn (N is 1, 3 or 5 by the setting, 3 by default), with each brick it
strikes and each place it turns. It is cast again only when the aim, the
start or the hot shot changes. A floor bounce in hand shows in it, since
it is the same flight.

**C14. The solver tries every fourth aim first,** then every aim, as Brick
Fuzz Pop's does, and certificates keep aim indices alone.

**C15. The "Rickashay!" call** is a line of text over the field, drawn by
the shell, since the scene draws no text, and hidden from assistive
technology while the announcer says it. It moves only where motion is
welcome. There is no recorded voice: the game's sounds are synthesized,
and the call's sound is a chord of its own, a twenty-fifth sound beside
the design's twenty-four (N1).

**C16. The levels' letters are Rickashay's own legend.** `x`, `y` and `z`
are locks, where Brick Fuzz Pop's `x` is a zapper; the library's level
parser takes a game's legend.

**C17. The level files are the source.** The drafts are copied into the
game's `src/rules/levels/` as they are. A level redrawn because it fails a
check is edited there, and the reason goes in its commit.
`docs/rickashay/levels/build.mjs` stays with the design, as the tool that
drew them.

**C18. Names and numbers:** port 9007; storage keys `rickashay-settings`,
`rickashay-stats`, `rickashay-progress` and `rickashay-game`, each at
version 1; the bug report's tag `rk1`; the board's name "Rickashay, level
12: Trapdoor".

**C19. X4, the moss and the lock, waits for the feel gate.** The design's
ninth risk names the lock as the kind to cut if one must go, and the moss
shares its package and its set. The other six later kinds don't wait.

---

## 3. Part 1: the lifts

### 3.1 The bar for a lift

As `docs/archive/shared-lib-plan.md` set it, and as Brick Fuzz Pop's lifts
kept it, a piece is lifted when:

- both games use it and mean the same by it;
- its API is small, with no mode flags: what differs is data or a function
  handed in, never a boolean that picks a code path;
- every adopter gets shorter, Brick Fuzz Pop now and Rickashay in Part 2;
- it keeps the layers' fences;
- it is built in one game and adopted by the other. Here it is lifted from
  Brick Fuzz Pop, whose code it was, and its second user's case is specced
  at the lift from the design, so the shape fits both before Part 2 starts.

A piece that fails the bar once written stays in Brick Fuzz Pop, its
package says so in its report, and Z1 looks at it again once Rickashay's
twin of it exists.

### 3.2 `@fz/brick-wall`

```text
lib/brick-wall/
  src/rules/    imports only @fz/core; exact arithmetic
  src/view/     plain TypeScript; @fz/core and the pure @fz/phaser entries
  src/scene/    Phaser
  src/app/      Angular, on @fz/ui and @fz/game-ui
  src/testing/  the proof's players (held as rules) and the specs' helpers
  tools/        build-aims.mjs
```

- **Its `package.json` exports `./rules/*`, `./view/*`, `./scene/*`,
  `./app/*` and `./testing/*`,** so a path names its layer:
  `@fz/brick-wall/rules/wall`.
- **A game's layer imports the same layer of the library,** and what is
  below it as the game's own fences allow (the view may take the rules,
  the shell the view and the scene by type). L0 gives `phaserGameLayers()`
  an option for such a library (`layered: ["@fz/brick-wall"]`), specced
  with a case it catches and a case it lets by for each layer, as
  `lib/dev/AGENTS.md` asks. The fences that already refuse `**/view/**`
  from the rules refuse `@fz/brick-wall/view/*` from them too. The option
  is written with `regex` patterns, which name each layer's entries
  exactly, as the fence's own package rule is, rather than with the
  gitignore-style groups the view's fence lets entries back in with.
- **Its own lint is a game's,** `phaserGameLayers()` with `exact` on, so
  its rules keep exact arithmetic where `@fz/core`'s are not held to it.
  Of its `src/testing/`, the solver and the careless player, which the
  scripts load and which take only `@fz/core`, are held as the rules are,
  each named by the package that writes it (L3): `heldAsRules` takes no
  glob, and refuses a file that isn't there yet. The rest take the
  libraries' testing entries, as Brick Fuzz Pop's do.
- **Its coverage floors are Brick Fuzz Pop's,** layer by layer:
  statements, branches, functions and lines 100/95/100/100 for the rules
  and the view, 98/92/100/99 for the scene, 98/97/97/98 for the shell.
- **Nothing in it names a game.** Doc comments speak of "a wall game", its
  specs use kinds made up for them, and its `AGENTS.md` says so.
- **The `fuzzley-ui` skill gains a section for it,** beside `@fz/core`'s,
  and each package adds the rows of what it lifts, as
  `frontend/AGENTS.md` asks.

### 3.3 The packages

Every lift is adopted by Brick Fuzz Pop in the commit that makes it, and
its own copy is deleted there. Brick Fuzz Pop's files that a lift empties
go; its specs move with the code they test, rewritten over spec-only kinds
where they leaned on Brick Fuzz Pop's.

**L0. The library and its fences** (after nothing; 5 commits):

1. _Brick Fuzz Pop's flights, held._ A spec in
   `games/brick-fuzz-pop/src/rules/levels/golden/`, a folder added to the
   `sim` project's list in its `vitest.config.ts`, and
   `games/brick-fuzz-pop/tools/golden-flights.mjs`, which writes its
   `golden.json` through a typed API: for every certificate on
   every depth, and for 50 shots drawn from a seed at each level's opening
   on every depth, a hash of each round's flight, outcome and next start.
   Every later lift keeps it passing. Q1 removes it, since the
   certificates' replays hold the game from then on.
2. _The fence._ `@fz/dev/eslint`'s `layered` option, in `regex` patterns
   (§3.2), with its cases in `lib/dev/src/eslint.spec.ts`, including how a
   library's `testing/*` entries reach a game's `src/testing/` and its
   scripts' APIs.
3. _The library._ `lib/brick-wall/`: `package.json`, with every dependency
   its layers will take declared now (Phaser, the Angular packages,
   `@fz/core`, `@fz/phaser`, `@fz/style`, `@fz/ui`, `@fz/game-ui`), so the
   lifts that run side by side never edit it; the ESLint, Vitest and
   TypeScript configs; a module a layer with a spec each; its `AGENTS.md`
   and `CLAUDE.md`; the `fuzzley-ui` skill's section; and Brick Fuzz Pop's
   dependency and `layered` option.
4. _The queue for scripts._ `@fz/dev/queue`, a new entry for
   `lib/dev/src/queue.ts`, with `queueFolder()` beside `waitInQueue()`:
   the queue's folder under the git common dir, which `verify.ts` keeps to
   itself now and takes from there. A script that takes the whole machine,
   as certification and the mutants do, waits its turn in the queue
   `yarn verify:changed` keeps. The spec's own helper of that name is
   renamed, and the module's opening comment names every user.
5. _The mutants' script._ Its logic in `lib/dev/src/mutants.ts`, with its
   spec, and `frontend/tools/mutants.mjs` a thin call to it, as
   `tools/verify-changed.mjs` is to `lib/dev/src/verify.ts` (§6.6); each
   pass waits in the queue; the `brick-fuzz-pop-testing` skill's mutation
   pass pointed at it.

**LP. Primitives, into the libraries that hold their kind** (after nothing;
5 commits, each its own library, so each check reaches every app):

1. `@fz/phaser/bricks`: a `cut` share on `SlabShares` beside its `corner`
   radius, the length of a 45° corner, so a slab is drawn from its
   numbers alone; and `bodyOutline()`, which the overlays that follow a tile's
   edge take instead of `tileRadius` (Brick Fuzz Pop's plated, prism and
   moss). Brick Fuzz Pop's frames are pixel for pixel the same, which its
   art specs hold.
2. `@fz/phaser/scene`: `dynamicTexture()`, from Brick Fuzz Pop's
   `src/scene/painters/dynamic_texture.ts`, as its archived plan's
   leftovers asked.
3. `@fz/ui/on_demand`: `onDemand()`, from Brick Fuzz Pop's
   `src/app/on_demand.ts`, the hand-written `import()` that keeps a piece
   out of the first download without `@defer`'s runtime.
4. `@fz/ui/icon`: `skip` (question 3), and, where `chevron` can't be turned
   to point left and right by what the icon component already takes,
   `nudge-left` and `nudge-right`.
5. `@fz/core/json`: `withLowerCount()` beside `withHigherCount()`, from
   Brick Fuzz Pop's `src/rules/run/stats.ts`.

**L1. The wall's rules** (after L0; 6 commits):

1. `rules/field`: `COLUMNS`, `LEAST_DEPTH`, `MOST_DEPTH`, `RADIUS`,
   `SIDE_MARGIN`, `FIRST_X` and `AT_ONCE`, out of Brick Fuzz Pop's
   `src/rules/tuning.ts`, which keeps its own numbers, and `DEPTHS` and
   `isDepth()`, out of its `src/rules/wall/wall.ts`.
2. `rules/aims`: the 657 aims, `AIMS` from Brick Fuzz Pop's
   `src/rules/aims.ts` with `AIM_COUNT`, `FIRST_AIM_DEGREES` and
   `AIMS_PER_DEGREE` from its `tuning.ts` and `isAim()` from its
   `shot.ts`, written by `tools/build-aims.mjs`, which moves to the
   library with its `build:aims` script; the spec holds the file to what
   the script writes.
3. `rules/grid`: the cell arithmetic (`cellOf`, `columnOf`, `wallRowOf`,
   `fieldRowOf`, `cellAt`, `brickAt`, `brickBox`) and the y-up names for
   `@fz/core/sweep`'s sides, with the doc comment that says so once.
4. `rules/wall`: `Brick<K>`, `Wall<K>`, `thirdsOf()`, the danger row and
   its helpers, and `lowerWall(wall, depth, rules)`, where `WallRules<K>`
   holds `needed(kind)` and `betweenRounds(wall)` (moss, in both games). A
   brick with a twin sinks with it.
5. `rules/level_picture`, from Brick Fuzz Pop's `levels/levels.ts`,
   `levels/level.ts` and `src/testing/{wall_picture,level_picture}.ts`: a
   level's picture read against a legend and held to a game's
   `PictureRules<K>` (rows, the most air together, the
   twins' distance), `wallFrom()`, and a level's opening (the wall's foot
   on `opensOn`, the fuzzball at `FIRST_X`). Each game's own checks stay
   its own.
6. `rules/track`: `Waypoint`, `BallTrack`, `positionAt()` and the total
   order of moments, the part of a flight that playback reads.

**L2. The run and its records** (after L1 and LP, whose fifth commit
changes Brick Fuzz Pop's `stats.ts`; 5 commits):

1. `rules/progress` and `rules/par`: `isOpen()`, `clearedOf()`,
   `parFrom()` and `parOf()` over a generated table.
2. `rules/run`: the run's stages, levels, rounds, points and depth, over
   `@fz/core/run`'s `RunStage`, generic over what a game tallies for a level
   and handed the function that gives its stars.
3. `rules/stats`: a run started and ended, a new best, a level's result
   and a level cleared, over a level's record and the function that
   merges two.
4. `rules/saved_wall`: a kept wall read back against its level (every cell
   one the level has, twins whole, nothing cleared or on the floor, the
   foot no higher than a jump leaves it), and the saved run's frame, a
   game's own fields read by a function it hands in.
5. `rules/reported`: a reported game's record, trim and replay, over a
   game's codec for a shot.

**L3. The proof** (after L1; 5 commits):

1. `testing/solver`: the beam search over a game's `LinePlay` (its
   opening, its shots, a shot played, a key for a state), greedy, then a
   beam of 4 over every fourth shot, then over every shot; `replayLine()`
   and `lineHolds()`.
2. `testing/careless`: the careless player, sixteen looks drawn from a
   seed, the best by a wall's score the game hands in.
3. `testing/holders`: `holdEveryCertificate()` and `holdEveryFloor()`,
   over a certificate's codec, a spec file's depth or set read from its
   name by `variantOfSpec()`.
4. `@fz/dev/certify`: the pool of workers that certifies levels through a
   game's typed API, with `--set`, `--level` and `--depth`, writing sorted
   files, and waiting its turn in the queue. Brick Fuzz Pop's
   `tools/certify-levels.mjs` becomes a call to it, and writes the same
   bytes for a set it certifies again.
5. Brick Fuzz Pop's `tools/report-levels.mjs` over the same pieces, printing
   the same bytes as before.

**L4. The view** (after L1; 6 commits):

1. `view/field_metrics`: the field fitted to a room (`fieldShape()`,
   `fieldMetrics()`, `toCanvas()`, `toField()`, `hasRoom()`), the lintel
   and the band, the margins, and the side panels' room.
2. `view/timing` and `view/easing`: the wall's step and jump (260 and
   480 ms), the cards' delays, and the flourishes' curves (`easeOutBack`,
   `swellScale`, `flareScale`, `ringScale`, `shakeOf`).
3. `view/palette` and `view/inks`: the colors both walls draw in
   (`WallPalette`'s shared fields, `wallPalette(roles, mode)`, `TINT`,
   `inkAt()`), which a game spreads into its own, and `testing/contrast`,
   which holds a game's list of pairs in every palette.
4. `view/aiming`: the aim, out of Brick Fuzz Pop's `Steering`: point and
   hold, pull back, a call off by the right button or a second finger, the
   wheel, keys a degree at a time or a quarter with Shift, presses at the
   screen's edge let by, a release on lifting or by a button, and a nudge.
   Brick Fuzz Pop's charge is laid over it in its own steering, and its
   steering specs pass unchanged. Rickashay's Release button and nudge are
   specced here.
5. `view/playback`: a decided round played back. One moment, in units
   flown, drives the track and the events; a pace turns units into time,
   as marks by distance and by time played; fast-forward multiplies it;
   `landAtOnce()` reaches the end with one landing sound; the wall settles
   by a step or a jump. A game hands in what each event does to its view.
6. Brick Fuzz Pop's `RoundPlay` over it, its specs passing, with its
   speed-up after a long flight as a mark by time, and its taking a round
   flown again for Drop kept in its own file. Rickashay's pace, a
   speed by the rally and a dash from the last strike, is specced in the
   library over a spec-only track.

**L5. The scene** (after L4, LP; 4 commits):

1. `scene/painter` (`Painter` and its paint context, generic over a game's
   view record), `scene/atlas` (a wall's atlas over `@fz/phaser/scene`'s
   `bakeAtlas()`, from a game's frames) and `scene/camera` (framing and
   shake).
2. `scene/field_painter`: the band, the lintel, the frame, the jump and
   danger lines, the counting dots, with a place in the band a game draws
   into (Rickashay's springs).
3. `scene/wall_painter`: the baked wall, a brick's swell and warning, the
   step and the jump, over a function that gives a brick's layers.
4. `scene/effects` and `scene/guide`: shards, a flash, a ring, a streak;
   the guide's dots along a path and the marks on the bricks it strikes.

**L6. The shell's pieces** (after L2, L4, LP; 5 commits):

1. `app/stored`: what keeps a game's records, progress and run in play,
   over `@fz/ui/storage`, by key and version, so Brick Fuzz Pop's stats,
   progress and saved-game services shrink to their keys and readers.
2. `app/certificates`: the debug menu's certificates, over the files a
   game hands in (its `import.meta.glob` stays its own) and the shot's
   codec.
3. `app/panels`: Coming next (the rows waiting, drawn small, their count,
   the jump in a sentence) and In this wall (each kind's picture, name and
   words), with a place for a game's own lines; `waitingRows()` and
   `kindsIn()`.
4. `app/levels` and `app/result`: the Levels dialog (the sets, each
   level's stars and a figure the game names, Locked) and the result
   dialog with its words.
5. `app/board`: the board's frame: an application named by the label a
   game gives and described by its keys, the canvas hidden in it, the
   placeholder, the lintel's count, the panels' places, the layout check's
   `data-*` attributes, the pause when the WebGL context is lost, and the
   focus; the cards come in as content.

**L7. The driver of a round** (after L2, L3, L6; 5 commits):

1. _Brick Fuzz Pop's `GameService` split_ inside the game, with no change
   in behavior: the round's driver, the records, the reported game's
   replay, the certificate's line, and the cards and words, a file each.
2. `app/round_driver`: a round driven from release to the next aim (the
   frame played, a flight landed at once, the drawn gate, the reshaping and
   the depth catching up between rounds), over a game's adapter (its
   `playRound`, `guideOf`, words and saved game). Brick Fuzz Pop's Drop,
   which flies the round again from the moment it is pressed, stays its
   own, beside the driver.
3. `app/records`: records kept as a flight lands, over `rules/run` and
   `rules/stats`.
4. `app/reported`: the bug report's state and its replay at `?debug`, over
   `rules/reported`.
5. _The docs:_ the `fuzzley-ui` and `phaser-core` rows; Brick Fuzz Pop's
   `AGENTS.md` and its two skills cut to what is still its own; the
   library's own testing skill, `brick-wall-testing`, if what Brick Fuzz
   Pop's held about the shared helpers earns one.

An adapter that would need a mode flag leaves that piece in Brick Fuzz Pop,
and Rickashay writes its own until Z1 looks again.

**Q1. Part 1 checked** (the orchestrator, after L7): `yarn verify:changed`
with no `--base` on the branch's tip; `yarn check:layout`; Brick Fuzz Pop's
`report:levels` the same bytes as on `main`; the golden flights passing,
then removed; its screenshots retaken without `--force`, keeping every
image; a certificate played in headless Chrome at `?debug` in a production
build; its main and scene chunks within 1% of `main`'s, from the build's
own report. Then, at your word, `merge-to-main` (question 5), with
`yarn verify:full`.

### 3.4 Not lifted

- **The flight, the cast and the events.** Round corners against cut ones,
  many fuzzballs against one, a charge against none: each game's flight is
  its own. So are their trait rules and kinds' data, which share a scheme
  (`TraitRule`'s four moments) and nothing else.
- **The words** (`describe.ts`), the scoring, the stars, the tuning
  numbers, the sounds' recipes, the art of each kind and the fuzzball's
  looks.
- **The scene class, the bar and the board's cards,** which hold more of
  each game than of both. Z1 reads them side by side once both exist.
- **`@fz/core/sweep`.** Rickashay's 45° faces are its own geometry, and
  only it has them.

---

## 4. The game's architecture and contracts

### 4.1 Folders

```text
games/rickashay/src/
  rules/
    tuning.ts, shot.ts
    catalog/        kinds.ts, kinds/<kind>.ts            the eleven kinds' data
    bricks/         strike.ts, trait_rules.ts, traits/<trait>.ts
    flight/         faces.ts, cast.ts, events.ts, hooks.ts, flight.ts, guide.ts, benchmarks/
    round/          round.ts
    run/            scoring.ts, stars.ts, run.ts, saved_game.ts, reported_game.ts, describe.ts
    levels/         legend.ts, level_rules.ts, levels.ts, <set>.json, marks/<set>.json,
                    certificates/<set>.json, lines/<set>.json, every_level/, every_floor/, every_check/
  view/
    colors/, art/ (kinds/<kind>.ts, fuzzball_art.ts, frames.ts), field/, steering/,
    play/ (pace.ts, round_play.ts), effects/, debug/, run_state.ts
  scene/            rickashay_scene.ts, layers.ts, painters/, sounds/
  app/              play/, board/, bar/, panels/, help/ (kinds/<kind>.ts), levels/,
                    settings/, stats/, debug/, bug_report/, tokens.ts, app.component.*
  testing/          flight_fixtures.ts, cast_reference.ts, line_play.ts, wall_score.ts,
                    blind.ts, sweet_spot.ts, every_level.ts, kept_run.ts, wall_picture.ts,
                    certify_api.ts, report_api.ts, script_api.ts, screenshot_api.ts
tools/              certify-levels.mjs, report-levels.mjs, build-sounds.mjs, sound-lab.ts,
                    check-layout.mjs, capture-screenshots.mjs, stored_run.mjs
```

- **The fences** are Brick Fuzz Pop's, with the library let in:
  `phaserGameLayers()` with `exact` on, `layered` naming `@fz/brick-wall`,
  and every file in `src/testing/` that the scripts load held as the rules
  are, each named by the package that writes it, in the same commit (§6.4);
  `tools/eslint_config.spec.ts` holds the config, as Brick Fuzz Pop's does.
- **One file a kind** in the catalog, the traits, the art and How to play,
  so the X packages add a file each and a line to each list.
- **No folder inside a layer is named `view`, `scene`, `app` or
  `testing`,** which the fences match anywhere in a path; the playback is
  `view/play/`.

### 4.2 Coordinates

The library's, from Brick Fuzz Pop's: field units, x across from 0 to 9, y
up from the floor; rows counted from the floor, row 0 the floor's; the wall
counting its own rows from its foot, `Wall.lowestRow` the field row its
foot stands in. The wall knows no depth, so the depth changes between
rounds without touching it.

### 4.3 The rules' contracts (K2 writes them)

- **`FlightRules`,** every number the debug menu may tune, handed in and
  never read from a module: the bored distance, the guards (4,000 units, 8
  turns without flying between), the floor bounces' first cost and step
  and the most held, the hot shot's hits and bounces, the hatches' holds,
  a bolt's turns, and the guide's turns and its length past the last.
- **`RoundStart`:** the wall, the depth, the x the fuzzball waits at, and
  whether the shot is hot.
- **`Face`,** what `cast()` meets: a flat (across or up, its line, its
  span, the way it faces), a 45° face (its line `x ± y = c`, its span),
  the floor, a hatch's bar, or a portal's eye; each with what it belongs to
  (a brick's cell, a side wall, the ceiling).
- **`FlightEvent`,** a union, each with its moment in units flown: `turn`
  (what turned it: wall, ceiling, floor, brick, bar), `strike` (the cell,
  the hits taken, whether it broke, the rally after it), `shielded` (a
  plated face or a shut lock met), `bounce-earned`, `bounce-spent`, `hold`
  (the holds left), `hatches-open`, `bolt` (bolts drawn so far),
  `teleport` (from, to), `bored`, `guard`, `land` (the x it waits at).
- **`Flight`:** the library's `BallTrack`, the events in order, its
  length, its rally, its turns, the moments of its 10th, 25th and 45th
  strikes, and the moment of its last strike, which the pace reads.
- **`Round`:** the flight, the outcome (the rally, bricks broken, floor
  bounces earned, jumped, rows down, lost, cleared, points) and the next
  `RoundStart`.
- **The catalog:** `KIND_IDS`, the eleven as a list, with `KindId`
  derived from it (`as const satisfies`), and each kind's data (name,
  hits, whether a level needs it, its letters, its first level, its
  traits), all eleven from K2 on. Its rules, art and words come later.

### 4.4 The view's contracts

- **`RunState`,** one record of the run as the shell shows it, replaced
  whole, and `RoundView`, the record of a frame of the flight, reused.
- **The frames' names and the sounds' names,** each an `as const` list,
  so the art, the scene and the sound script can't disagree.
- **`src/testing/flight_fixtures.ts`:** a hand-made flight for each event,
  so the view, the scene and the shell can play a round before `fly()`
  exists. Once R2 lands, a spec holds each fixture to what `fly()` makes
  of its wall and aim, or names why it is hand-made.

### 4.5 How a round runs, end to end

1. **The player aims.** The steering, on the library's aiming, turns keys,
   the mouse or a finger into an aim, and a nudge moves it a quarter of a
   degree.
2. **The guide is cast** each time the aim, the start or the hot shot
   changes, not every frame: the rules' `guideOf()`, to the third turn.
3. **The player releases.** `playRound()` runs once and returns the whole
   `Round`.
4. **The round is saved at once,** with its outcome, so a reload mid-flight
   comes back after it, paused.
5. **The view plays it** on the library's playback: 14 units a second, 17
   from the 10th strike, 20 from the 25th, 24 from the 45th (22, 26, 30
   and 36 at Fast), three times that from the last strike, and four times
   all of it with fast-forward on. Skip lands it at once.
6. **It lands.** The records are kept, and the wall settles by a row
   (260 ms) or a jump (480 ms); then the next aim, or Cleared, or Lost.
7. **The depth catches up,** if the window changed during the flight.

### 4.6 Determinism, written into the rules

- The flight adds, subtracts, multiplies and divides, and nothing else. A
  mirror is a change of sign, a 45° face a swap.
- The rules read no clock and draw no number.
- Every order is written down: within a moment (C3), the strikes floor up
  then left to right, and the events by moment, then by that order.
- No result depends on the order a `Map` or `Set` was filled in, and every
  comparator is a total order.
- `fly()` keeps its working state in typed arrays and scratch records in
  its module, allocates per event and never per cast, and returns a
  `Flight` nothing may change.

---

## 5. Work packages

Each package is a fresh worker's run, ending with its commits made, every
review in and answered, its checks passing and its report written (§6).
"After" lists what must have landed first. A package that changes what a
skill or an `AGENTS.md` describes changes it in the same commit. The
commit counts are a guide: a package keeps to three to nine.

### 5.1 Part 1

§3.3 has them: L0, LP, L1 to L7, and Q1.

### 5.2 Part 2

#### K: the start

**K1. The workspace** (after L0; 3 commits):

1. `games/rickashay/`, a copy of Snake's workspace as
   `frontend/games/AGENTS.md` says, with Brick Fuzz Pop's configs in place
   of Snake's: the fences of §4.1, the three Vitest projects (`pure`,
   `sim`, `dom`) and their floors (§9), `tools/eslint_config.spec.ts`;
   `gameConfig({ port: 9007, name: "Rickashay" })`; a page that names the
   game.
2. The site: `site/games.json`, the catalog's entry in Arcade beside Brick
   Fuzz Pop's with `inDevelopment: true`, and the lists in `README.md` and
   `docs/operations.md`.
3. `src/main.ts`'s providers, with the bug report's source tagged `rk1`.

**K2. The contracts** (after K1, L1; 4 commits): §4.3 and §4.4.

1. `src/rules/tuning.ts` and `FlightRules`: the design's "The feel, in
   numbers", the 45° stand-off written out.
2. The catalog: the eleven kinds' data, the legend, and the first three
   kinds' rules (the brick, the tough brick and steel).
3. `src/rules/flight/faces.ts` and `events.ts`, `Flight`, `Round` and
   `RoundStart`.
4. The view's contracts and `src/testing/flight_fixtures.ts`.

#### R: the rules

**R1. The faces and the cast** (after K2; 6 commits). For a ball at a point,
moving a step, `cast()` returns every contact at the soonest moment within
`AT_ONCE`, each with its face and what owns it, walking the grid a cell at a
time.

1. Flats: a brick's open faces a quarter of a unit out, bricks side by
   side making one face, the side walls and the ceiling, and the floor.
2. Cut corners: a 45° face across each corner where two open faces meet
   and nothing touches it; the faces closing round every clump.
3. Long 45° faces: a ramp's, with its short sides flats and its points cut
   square; a gem's four, its points cut.
4. A hatch's bar (C7), and hatches open as air.
5. A portal's eye (C6).
6. `src/testing/cast_reference.ts`, a cast by scanning every face, and the
   property specs: the cast agrees with it over random fields and aims;
   no move ends with the middle inside a standing brick or nearer a wall
   than the radius; a flight's legs keep to its aim's eight directions.

**R2. `fly()`** (after R1; 7 commits):

1. One fuzzball from its start to the floor: mirrors and swaps, one turn a
   moment (C3), the track's waypoints.
2. Strikes: a hit, two for a hot shot; the rally; what takes nothing;
   `TraitRule`'s moments (struck, broken, met, entered), every one tried
   with kinds made up in the specs.
3. Floor bounces (C5): earned, held, spent at the floor; the hot shot's;
   the hook a spring brick will give one through.
4. Boredom (C2), the two guards, and the landing, no nearer a side wall
   than half a unit.
5. The flight's own state, through hooks: the hatches' holds (C7) and the
   locks' bolts (C4), with spec-only kinds until X2 and X4.
6. Portals through a hook (C6).
7. The benchmarks in `sim`, and each hand-made fixture held to `fly()`.

**R3. The round and the guide** (after R2; 3 commits):

1. `playRound()`: the flight, the wall lowered by the library's
   `lowerWall()` with Rickashay's `WallRules` (moss grows back between
   rounds), the outcome and the next start (where it landed; hot after a
   jump).
2. `guideOf()` (C13).
3. The specs that hold its inputs unchanged and its answers the same for
   the same start and aim, and the guide's bound (§9).

**R4. The run, its points and its records** (after K2, L2; 6 commits; runs
beside R1 to R3 against K2's `Round`):

1. Points (C12), and the round's tally.
2. Stars (C11), par and the rally mark, read from `marks/<set>.json`,
   which P3 and the Ys write; R4's specs read a fixture of it.
3. The run on the library's, with a level's record: its best points, its
   fewest rounds, its best rally and its stars.
4. The saved game, version 1: the library's frame with Rickashay's start,
   and the round kept as it is released, with its outcome.
5. The reported game: a shot's codec (the aim, and the depth where it
   changed).
6. `describe.ts`, by the `player-text` skill: the aim ("62 degrees"); what
   G reads of the guide ("62 degrees. A brick in row 7, the right wall, a
   tough brick in row 8, 2 hits."); a floor bounce earned; a round's end;
   a jump; the danger line; a level begun, with its par and mark; a level
   cleared, with its stars; what R reads of the wall's three lowest rows.

#### P: the levels and their proof

**P1. Warm-up and the rules a level keeps** (after K2, L1; 3 commits):

1. `level_rules.ts`: "The rules a level keeps", on the library's picture
   checks: 13 to 33 rows, no air at the top or the foot, never two rows of
   air together, one new kind a level at most and its first level built
   round it, a workable lowest row, no steel in a row with a hatch,
   portals in twos no more than three rows apart and two pairs at most.
2. `levels.ts` and Warm-up's `warm-up.json`, from `docs/rickashay/levels/`.
3. The spec that holds every level of every set listed to the rules.

**P2. The players and the checks the design adds** (after R3, L3; 4
commits):

1. `line_play.ts` and `wall_score.ts`: Rickashay's `LinePlay` for the
   library's solver and careless player, its shots the 657 aims (C14), and
   the sketch's measure of a wall with its constants named.
2. `blind.ts`: aims drawn blind, and the ceiling: no level cleared more
   than 75 times in 100 on any depth.
3. `sweet_spot.ts`: room for a hand: as a level opens, with the fuzzball at
   the left, the middle and the right, the widest run of neighbouring aims
   that each rally 8 or more is 0.75° or more at the mean of the three.
4. The rally mark (the middle of the careless player's best rallies on a
   depth) and the rally line, a line of shots that reaches it, kept to be
   replayed.

**P3. Warm-up proved** (after P1, P2; 3 commits):

1. `tools/certify-levels.mjs` over `@fz/dev/certify`: the certificates,
   the marks (each level's par and rally mark on each depth) and the rally
   lines, a file a set each, written sorted.
2. Warm-up's files, and the `sim` specs: `every_level/<depth>.spec.ts`
   (twelve), `every_floor/<set>_<depth>.spec.ts` at depths 11, 13 and 22
   (the careless floors: Warm-up 90, Angles 85, Tricks 80, Long rallies
   50), and `every_check/` (the blind ceiling, the sweet spot, the rally
   lines).
3. `tools/report-levels.mjs`, printing the design's table of the drafts,
   so a level that falls short can be judged and redrawn.

#### A: art and color

**A1. The palette, the contrast and the fuzzball** (after K2, L4; 6
commits):

1. Rickashay's palette on the library's: the springs unlit and lit, the
   rally's pill, the guide's rings, the hot shot, the streak.
2. `view/colors/brick_colors.ts`, the colors the shell needs, kept apart
   from the art (Brick Fuzz Pop's `AGENTS.md` rule, which Rickashay's gains
   in D1).
3. `contrast.spec.ts` over the library's helper, with the design's
   additions.
4. The fuzzball's five looks by the rally (waiting and to 9; from 10; from
   25; from 45, its fur on end with sparks) on `@fz/phaser/fuzzball`.
5. The hot shot, red-hot under a crown of flame, and the yawn.
6. Its eyes, looking the way it flies.

**A2. Warm-up's bricks** (after A1, LP; 4 commits):

1. The tile, Brick Fuzz Pop's slab with its corners cut (`@fz/phaser/bricks`).
2. The tough brick: a die's pips for the hits left, a crack for each taken.
3. Steel: the frame, a rivet in each corner, two strokes of sheen.
4. Small bricks dropping detail under 30 CSS px a unit; the atlas's size.

#### V: the view

**V1. The field and the aim** (after K2, L4; 5 commits):

1. The field on the library's metrics, the band holding three springs at
   its right end.
2. The aim on the library's: point and hold by default; pull back as a
   setting, its dead zone half a unit; a call off by a right click or a
   second finger; the mouse's guide following it unpressed.
3. Nudge, by the two buttons and the wheel, and Release with a button.
4. Keys, by `event.code`: Left and Right or A and D a degree, a quarter
   with Shift; Space releases; F fast-forward (question 2); X Skip; G
   reads the guide; R reads the rows.
5. Its specs, the screen's edge among them.

**V2. The flight played back** (after K2, L4; 5 commits):

1. `view/play/pace.ts`: §4.5's speeds as the library's marks, from the
   flight's moments.
2. `round_play.ts` on the library's playback: what each event does to the
   frame (a cell's hits, the rally, the bounces in hand, the holds, the
   bolts, a portal).
3. Skip (question 3), and a page hidden mid-flight landing it.
4. The effects: each event's flourishes and sounds (a struck brick's swell,
   a break's shards, a ramp's flash, a hatch's dip and swing, a portal
   drawing in and letting out, a bolt's slide, a plate's spark, a ring at
   10, 25 and 45, a spring's kick, the dash's streak, the call at the
   mark), and only where motion is welcome.
5. The rally's note: a step of a five-note scale a strike, two octaves up
   and then holding, and a chord on the note reached for a bounce earned.

#### N: sound

**N1. The sounds** (after K2; 3 commits): the design's twenty-four and
the call's chord (C15), over
`@fz/dev/sounds`, in one sprite (`tools/build-sounds.mjs`, its spec); the
sound lab at the dev server; the five-note scale's pitches checked by ear
there and named in the commit's body.

#### S: the scene

**S1. The scene** (after A2, A1, V1, V2, N1, L5; 6 commits):

1. `rickashay_scene.ts` on the library's painters: the atlas, the field
   with its springs, the wall.
2. The fuzzball (its look by the rally, its eyes, the hot shot) and the
   rally's pill beside it.
3. The guide: dots to its last turn, a ring at each turn, the bricks it
   strikes marked, fading for a unit and a half past the last.
4. The effects' painters, fed V2's flourishes.
5. The sounds, through `SpritePlayer` and the frame's sounds.
6. Its specs in the headless harness, pools sized for the worst case and
   nothing made in a frame.

#### U: the shell

**U1. A level played** (after S1, R3, R4, L6, L7; 6 commits):

1. `GameService` on the library's driver, with Rickashay's adapter, the
   saved game and the records.
2. The board on the library's frame, and the cards, worded by the
   `player-text` skill: Ready (number, name, what the wall is built round,
   par, the rally mark, a new kind's picture and sentence), Paused,
   Cleared (the three stars, each named as the design's "Cleared", "Within
   9 rounds" and "A rally of 24" are, the best rally, the points added up,
   Next level) and Ended; the result dialog.
3. The bar on `@fz/game-ui`'s: the level, the rounds against par, the rows
   left, the best rally against the mark, the score; Nudge and Release
   while aiming; Fast-forward and Skip; Pause, Sound, Levels, New game,
   How to play and Settings.
4. The announcer, through the driver, with R4's words, G and R.
5. The bug report's source and its state loaded back at `?debug`.
6. The `dom` specs of a level played through, by keys, the mouse and a
   finger.

**U2. The rest of the shell** (after U1; 6 commits):

1. The panels on the library's: Coming next; This flight (the rally,
   large, the springs in hand, a bar toward the next and the rally it
   comes at, the flight's turns); In this wall.
2. Levels, with each level's best rally and stars, and progress.
3. How to play, loaded on demand: the aim, that every strike turns, the
   cut corner and the eight directions with the art's picture, the bank
   drawn as pool players learn it, the rally and its floor bounces, the
   step and the jump, the hot shot, and each kind with its picture.
4. Settings on `<fz-settings-drawer>`: aiming, Release with a button, the
   guide (to the first, third or fifth turn), the speed, fast-forward
   (question 2), sound, the palette.
5. The debug menu on `@fz/game-ui`'s: the sliders (the speeds, the guide's
   length, the bored distance, the floor bounces' first cost and step, the
   hatches' holds), the depth, any level open, Play the certificate and
   Play the rally line, and the line that says the certificates are stale
   while the rules are retuned. A run on retuned numbers keeps no records.
6. The stats.

#### T: checks in a browser

**T1. The layout check and the scripts** (after U1; 3 commits), on
`@fz/dev`'s, as Brick Fuzz Pop's are, each script with the API it loads:

1. `tools/check-layout.mjs` (port 9007, from the config), over
   `src/testing/script_api.ts`.
2. `tools/stored_run.mjs`, over `src/testing/kept_run.ts`.
3. `tools/capture-screenshots.mjs`, over `src/testing/screenshot_api.ts`.

**Q2. Warm-up's proof measured** (the orchestrator, after P3): how long
the game's suite and its `sim` project take as CI runs them, measured on
the devbox with `CI=true`, one worker and four cores (`taskset -c 0-3`),
since a run on CI itself needs a branch pushed, which waits for your word;
the suite moved, in a reviewed commit, into one of `verify.yml`'s pairs of
heavy suites if it is one (the `github-actions-ci-cd` skill, and `bash -n`
on each `run:` block changed); the benchmarks recorded against §9.

**Q3. The feel gate** (after U2, T1 and P3): Warm-up played end to end,
with sound, every setting tried, the screenshots of each shape sent to you
as a page; then you play it as question 4 has it. What you ask for is
written into this plan as a decision, and into a package if it is code.
Retuned numbers mean certifying Warm-up again, which takes minutes.

#### X: the other eight kinds

Each brings its kinds' catalog files' rules, traits, art, sounds as wired,
How to play's entries, `In this wall`'s words and specs. None touches
`cast.ts` or `flight.ts`: R1 and R2 built every face and hook. The only
files they share are the one-line lists of kinds, traits, frames and help
entries.

| #   | Kinds              | After      | Size      |
| --- | ------------------ | ---------- | --------- |
| X1  | the ramp, the gem  | R2, A2, U2 | 4 commits |
| X2  | the hatch, spring  | R2, A2, U2 | 4 commits |
| X3  | the portal, plated | R2, A2, U2 | 4 commits |
| X4  | moss, the lock     | Q3, Z1     | 4 commits |

#### Y: the other three sets

Each copies its JSON from `docs/rickashay/levels/`, certifies it, and holds
it to its set's floor and the design's three checks. A level that falls
short is redrawn (C17), and its commit says what moved. Certification takes
the whole machine, so the queue gives the three their turns (L0's fourth
commit).

Each writes its own `certificates/`, `lines/` and `marks/` file, so two
can run at once.

- **Y1, Angles (levels 10–18),** after X1, X2 and Q3; 3 commits.
- **Y2, Tricks (19–27),** after X1, X2, X3 and Q3; 3 commits.
- **Y3, Long rallies (28–36),** after X1 to X4; 3 commits.

#### D, F, Z: finishing

**D1. Docs and skills** (after Z1; 3 commits): `games/rickashay/AGENTS.md`
and its `CLAUDE.md`, holding only its rules; its skills, by the rule for
skills in `.agents/AGENTS.md`, sharing `brick-wall-testing` where L7 made
one; the lists that name the games (`README.md`, `docs/operations.md`, the
`player-text` skill's references, the `github-actions-ci-cd` skill).

**Z1. The dedupe pass** (after X1, X2 and X3; 3 to 5 commits, while no X runs,
so that nothing it lifts is being added to): a fresh agent reads Brick Fuzz
Pop's and Rickashay's trees side by side, module by module (the scene classes,
the bars, the cards, the steering, the effects' tables, the scripts), and lifts
what both hold where the bar of §3.1 is met, both games adopting it in the same
commit. What stays twice is named in its report, with why.

**F1. Performance and accessibility** (after Y1 to Y3 and D1, alone in
the game; 4 commits): the suite's and `sim`'s times measured again as Q2
measured them, over all four sets; a trace of
level 36's longest flight at six times CPU throttle (§9), and of a window
dragged; the bundle against §9; the input pass by the
`web-game-accessibility` skill, by keys, the mouse, a finger and a screen
reader's roles; Lighthouse at 100 for accessibility.

**Z2. The finish** (the orchestrator): §11.

---

## 6. Running it

### 6.1 Before it starts

- **Your answers** to §2.1, given on 2026-11-22.
- **The week.** It starts after Wed Nov 25, 02:00 UTC, when the week
  resets. No new package starts once `/measure limits` reads 85%.
- **Measure it,** with `/measure stop` after Z2:

  ```text
  /measure start rickashay --trying layered-library,committed-work-log
  ```

- **Reviews:** `commit-reviewer` is among the agent types offered to a
  session started in `~/Projects/personal` or in the repository, so every
  commit is reviewed as `commit-review-process` says, at `high`, each
  reviewer's description opening `[review pkg=<id>]`.
- **The branches,** each in its own worktree under `.claude/worktrees/`,
  and moved only by the orchestrator. The two that hold code are installed
  (`yarn install --immutable` from `frontend/`, then
  `node .agents/link-claude-skills.mjs`):
  - `rickashay-lift`, cut from `origin/main`, where Part 1 lands;
  - `rickashay`, cut from `rickashay-lift` when K1 starts, where Part 2
    lands, and moved onto each later lift as §6.7 says;
  - `rickashay-log`, which holds the work log and nothing else (§7). It is
    an orphan branch, sharing no history with the code, made from the main
    checkout with
    `git worktree add --orphan -b rickashay-log .claude/worktrees/rickashay-log`,
    which leaves that checkout as it is. It has no `frontend/` and is not
    installed.

### 6.2 Slots and order

Four at once, five only when five are ready and none waits on another.
When a slot frees, the orchestrator lands what finished and starts the
first ready package in this order: what most packages wait on, then the
longest chains, then the rest.

1. **First:** L0 and LP.
2. **Then, in this order:** L1, K1, L4, K2, L2, R1, L3, L5, A1, V2, V1, R4,
   P1, N1, L6, R2, A2, L7, R3, P2, S1, P3, U1, U2, T1, X1, X2, X3, Z1, D1,
   X4, Y1, Y2, Y3, F1.
3. **The orchestrator's own steps** come as their waits end: Q1 after L7,
   Q2 after P3, Q3 after U2, T1 and P3, and Z2 after F1.

- **Two slots are idle at the start on purpose:** everything else waits on
  L0. LP and L0 take about the same time.
- **Part 2 starts beside Part 1.** K1 needs only the library to exist; R1
  to R4, P1, A1, V1, V2 and N1 need only L1, L2 and L4 of the lifts. A Part 2
  package starts only once every lift it names has landed, so it never
  builds on an API still moving.
- **The gate doesn't stop the build.** X1 to X3, then Z1 and D1, run
  while you play; X4 starts after the gate and Z1, and the sets after the
  gate.

### 6.3 Ports

Each package that opens a page serves its game on its own port
(`yarn dev --port <n> --strictPort` from the game's folder) and stops it
before its report.

- **Part 1:** LP 9201, L4 9202, L5 9203, L6 9204, L7 9205, and Q1 9206 for
  the orchestrator. Each serves Brick Fuzz Pop.
- **Part 2:** A1 9210, A2 9211, V1 9212, V2 9213, N1 9214 (the sound lab),
  S1 9215, U1 9216, U2 9217, T1 9218, X1 to X4 9221 to 9224, Z1 9225 and
  F1 9226.
- **The orchestrator's own looks** (Q3, Z2) use the game's port, 9007.

### 6.4 Who owns what

A package changes what it owns freely and only adds to the rest: an entry,
a field, a line, an import of a lifted module in place of a deleted one. It
renames, moves and restyles nothing it doesn't own.

- **L0** owns `lib/brick-wall/`'s configs and `package.json`, the `layered`
  option in `lib/dev/src/eslint.ts`, `lib/dev/src/{queue,mutants}.ts` and the
  queue's folder in `verify.ts`, `lib/dev/package.json`'s exports while it runs,
  and `frontend/tools/mutants.mjs`, and Brick Fuzz Pop's `golden/` and
  `tools/golden-flights.mjs`. It adds to the `fuzzley-ui` skill, and to Brick
  Fuzz Pop's `package.json`, `eslint.config.js`, `vitest.config.ts` and testing
  skill.
- **LP** owns what it lifts into each library, and Brick Fuzz Pop's copies
  it deletes. It adds to the `fuzzley-ui` and `phaser-core` rows and to
  Brick Fuzz Pop's imports.
- **L1** owns `lib/brick-wall/src/rules/{field,aims,grid,wall,level_picture,track}.ts`
  and `lib/brick-wall/tools/build-aims.mjs`, and the Brick Fuzz Pop files
  they empty (`aims.ts`, `grid.ts`, `wall/`, `levels/level.ts`,
  `src/testing/{wall_picture,level_picture}.ts`, `tools/build-aims.mjs`).
  It adds to Brick Fuzz Pop's `tuning.ts`, `shot.ts`, `levels/levels.ts`
  and `flight/events.ts`; takes `wall_picture.ts` off its `HELD_AS_RULES`
  in `eslint.config.js` in the commit that deletes it, since lint refuses
  a held file that is gone; and repoints its testing skill's paragraph on
  drawing a wall.
- **L2** owns `lib/brick-wall/src/rules/{progress,par,run,stats,saved_wall,reported}.ts`
  and Brick Fuzz Pop's `src/rules/run/` but for `describe.ts`, `scoring.ts`
  and the tiers in `stars.ts`.
- **L3** owns `lib/brick-wall/src/testing/{solver,careless,holders}.ts`,
  `lib/dev/src/certify.ts`, and Brick Fuzz Pop's
  `src/testing/{solver,casual,every_level}.ts`, `tools/certify-levels.mjs`
  and `tools/report-levels.mjs`. It adds the `./certify` entry to
  `lib/dev/package.json` and the library's two held files to
  `lib/brick-wall/eslint.config.js`, and keeps Brick Fuzz Pop's
  `HELD_AS_RULES` to the files it keeps there, each one it deletes taken
  off in the same commit.
- **L4** owns `lib/brick-wall/src/view/`,
  `lib/brick-wall/src/testing/contrast.ts`, and Brick Fuzz Pop's
  `src/view/{field,steering}/`, `effects/{timing,flourish}.ts`,
  `colors/{palette,inks}.ts` and `round_play.ts`.
- **L5** owns `lib/brick-wall/src/scene/` and Brick Fuzz Pop's
  `src/scene/{atlas,field_camera}.ts` and
  `painters/{painter,field_painter,wall_painter,dots}.ts`. It adds to
  `wall_scene.ts`, `effects_painter.ts` and `guide_painter.ts`.
- **L6** owns `lib/brick-wall/src/app/` but for its `round_driver`,
  `records` and `reported`, and Brick Fuzz Pop's
  `src/app/{panels,levels,result,stats}/`, `play/saved_game.service.ts`,
  `debug/certificates.service.ts` and `board/board.component.*`. It adds to
  `app.component.*`.
- **L7** owns `lib/brick-wall/src/app/{round_driver,records,reported}/` and
  Brick Fuzz Pop's `play/game.service.ts` and `bug_report/`, and adds to its
  `AGENTS.md` and skills.
- **K1** owns `games/rickashay/`'s configs, `index.html` and `main.ts`, and
  adds to `site/games.json`, the site's catalog, `README.md` and
  `docs/operations.md`.
- **K2** owns `src/rules/{tuning,shot}.ts`, `catalog/`,
  `levels/legend.ts`, `flight/{faces,events}.ts`, `src/view/run_state.ts`, the lists of frames
  and sounds, and `src/testing/flight_fixtures.ts`.
- **R1 to R3** own `src/rules/flight/{cast,hooks,flight,guide}.ts`,
  `flight/benchmarks/`, `bricks/`, `round/` and
  `src/testing/cast_reference.ts`, one after another, and add to
  `flight_fixtures.ts`. **R4** owns `src/rules/run/`.
- **P1 to P3** own `src/rules/levels/` but `legend.ts` and the other sets'
  files, `src/testing/{line_play,wall_score,blind,sweet_spot,every_level,certify_api,report_api}.ts`
  and `tools/{certify,report}-levels.mjs`. P2 and P3 add each file of
  theirs that a script loads to `HELD_AS_RULES` in
  `games/rickashay/eslint.config.js`, and to its spec, in the commit that
  writes it.
- **A1 and A2** own `src/view/{colors,art}/`, and add to the list of
  frames.
- **V1** owns `src/view/{field,steering}/`; **V2** owns
  `src/view/{play,effects}/` and adds to the list of sounds.
- **N1** owns `src/scene/sounds/`, `tools/build-sounds.mjs` and
  `tools/sound-lab.ts`. **S1** owns the rest of `src/scene/`.
- **U1 and U2** own `src/app/`, one after the other. **T1** owns
  `tools/{check-layout,stored_run,capture-screenshots}.mjs` and
  `src/testing/{kept_run,script_api,screenshot_api}.ts`, adds those three
  to `HELD_AS_RULES` as P2 does, and adds to `package.json`'s scripts.
- **Each X** owns, from K2 and R2, which made them, its kinds'
  `catalog/kinds/<kind>.ts`,
  `bricks/traits/<trait>.ts`, `art/kinds/<kind>.ts` and
  `app/help/kinds/<kind>.ts`, and adds to the lists of kinds, traits,
  frames, sounds and help entries, and to `contrast.spec.ts`.
- **Each Y** owns its set's JSON, certificates, rally lines and marks, and
  adds to `levels.ts`'s list of sets, `every_level.ts`'s certificates, the
  list of marks R4's stars read, and the floors' list.
- **Z1** owns what it lifts, in both games and the library, while no X
  runs.
- **D1** owns `games/rickashay/AGENTS.md`, its `CLAUDE.md` and
  `games/rickashay/.agents/skills/`, and adds to the lists that name the
  games.
- **F1** runs alone in the game, once every other package has landed, and
  may change any of its files, each change a reviewed commit of its own.

No two packages that own files in one game's `src/app/` or `src/scene/`
run at once: §5's waits keep S1, U1, U2, Z1 and F1 apart. The Xs, which
run together, each add a file of their own there and an entry to its
lists.

### 6.5 The briefs

Each brief follows the `multi-agent-build` skill's §3: its package's
section of this plan quoted whole, with the parts of `design.md` and of §2
and §4 it cites quoted too, the reports of the packages before it, the
files to read first by line, the skills it needs, and the rules that bear,
quoted. Each brief is kept on the log's branch (§7), so a package can be
started again from it.

The skills, by package:

- `fuzzley-ui` ("Changing a library") for every L and LP; `phaser-core`
  for L5 and S1, and for LP's first two commits.
- `brick-fuzz-pop-testing` and `brick-fuzz-pop-content` for every L that
  edits Brick Fuzz Pop's rules or specs.
- `angular-testing` and `angular-developer` for L6, L7, U1 and U2.
- `phaser-canvas-performance` for S1 and F1.
- `web-game-accessibility` for V1, U1, U2 and F1.
- `player-text` for R4, U1, U2, every X and D1.
- `github-actions-ci-cd` for K1 and Q2.

The rules a brief quotes, beside the `AGENTS.md` of a workspace it edits,
which the harness loads:

- From `frontend/games/AGENTS.md`: "Saved games outlive the code" (whole),
  for L2, L6, L7, R4, U1 and U2; "In a game drawn with Phaser, work goes in
  the lowest layer that can hold it" (whole), for every L and every Part 2
  package; "A color the player must tell from what it lies on joins the
  game's `contrast.spec.ts`", for A1, A2, S1 and every X; "A change to a
  game's layout is checked in a browser", for L6, U1, U2 and T1; "A new
  game starts as a copy of one", for K1.
- From `frontend/AGENTS.md`: "The libraries' pieces first", "Visible state
  is announced state" and "An icon-only button has one name", for L6, U1
  and U2; "Before changing a library, read the `fuzzley-ui` skill's
  'Changing a library'", for every L and LP; "What a browser stores
  outlives the code", for L2, L6, R4 and U2.
- From `.agents/AGENTS.md`: "Writing for Players" (whole), for R4, U1, U2,
  every X and D1; "A union of ids is derived from its list" and "An
  optional property is left out, not set to `undefined`", for K2.
- From `lib/dev/AGENTS.md`: "A rule or a fence added to a preset gets two
  cases", for L0 (it edits `lib/dev`, whose own `AGENTS.md` the harness
  loads, so the brief names it only where L0's work starts elsewhere).

### 6.6 Mutants

The `multi-agent-build` skill runs mutants only where the plan asks, from
the one script it gives. This plan gives `frontend/tools/mutants.mjs`
(L0's fifth commit), and asks for a pass at the last commit of L1, L2, L4,
R1, R2, R3, R4, V1, V2 and each X, over that package's rules and view code:

- **It reads a list of mutants** a worker writes outside the tree: each a
  file, a text that must match once, its replacement, and the Vitest
  project and folder that should kill it.
- **It applies one at a time,** runs `yarn vitest run` with the project and
  folder in the workspace, and puts the file's bytes back whether the run
  passed, failed or was stopped, on a signal too.
- **It stops a mutant at two minutes and the pass at 20,** and names what
  it never ran.
- **It prints the table for the commit's body:** each mutant, killed,
  survived, timed out or matched nothing. Every survivor gets a spec that
  kills it, or is named as equivalent, as `brick-fuzz-pop-testing` asks.

### 6.7 Landing

As the `multi-agent-build` skill's §6 has it. These are this build's own:

- **`rickashay` follows `rickashay-lift` by the tip it was last on.** The
  lift branch is rewritten when it is rebased onto `origin/main`, as the
  skill does every few landings and `merge-to-main` does at Q1, so a plain
  rebase onto it would replay old lift commits. Before it starts a package
  that needs a newer lift, the orchestrator logs both tips and runs, in
  `rickashay`'s own worktree,
  `git rebase --onto rickashay-lift <the lift tip rickashay was on>`,
  then `yarn install --immutable` from `frontend/` and
  `yarn verify:changed --base rickashay-lift`, as
  the skill checks a rebase onto `origin/main`.
  Once Part 1 is on `main`, `rickashay` moves the same way onto
  `origin/main`, and follows it from then on. A Part 2 package cut from an
  older `rickashay` lands by `git rebase --onto`, as the skill says.
- **What Part 2 shares with Part 1** is `frontend/yarn.lock`, which L0, K1
  and any lift that adds a dependency change. A collision there is settled
  by `yarn install` from `frontend/`, never by hand, and the rebase's
  `range-diff` is reviewed as the skill's step 2 says. Nothing else of
  Part 1's is a Part 2 file.
- **A push of `rickashay` at Q3,** if you choose it, goes through
  `merge-to-main` on the branch itself. Packages cut before it land by
  `git rebase --onto` as above.
- **A contract changes only in a commit of its own,** by the orchestrator
  or a package the orchestrator starts for it, and every package in flight
  that reads it is told before it lands.

---

## 7. The work log

You asked for a detailed log, kept from the build's start, so the build
can stop and start again at any point, and deleted once it is done. It
never enters `main`: Part 1's merge at Q1, and a push at Q3 if you choose
one, carry none of it. It is the one log the `multi-agent-build` skill's
§7 keeps, moved out of the ignored `.claude/build-log.md` onto a branch,
so it is committed, survives the session and can be read from any
worktree.

### 7.1 Where it is, and how it is committed

- **On `rickashay-log`, a branch of its own,** in its own worktree,
  `.claude/worktrees/rickashay-log`: `work-log.md` and `briefs/<id>.md`,
  and nothing else. It shares no history with the code, so it is never
  rebased, never merged and never reaches `main`, and writing it never
  touches a worktree where a check runs. The last build kept its log on
  the integration branch and dropped those commits before the merge; with
  two integration branches, each rebased often and checked in its own
  worktree, a branch apart is the simpler way to the same end.
- **Each entry is its own commit,** `docs(work-log): <what happened>`.
  Log commits aren't reviewed: they never land.
- **It is written at every event:** a package started (with its brief
  saved), landed, handed back or failed; a review that changed a
  package's course; a collision and how it was settled; each rebase, with
  the tips before and after; each decision; each check of the week; each
  pause and resume; each answer of yours.
- **It is deleted at Z2,** at your word, with the build's other branches.
  Until then it stays local: pushing it to GitHub, to read on a phone,
  waits for you to ask.

### 7.2 What it holds

The top of the file is rewritten at every entry, so it always says where
things stand; the entries below it only grow.

```markdown
# Rickashay: the work log

On its own branch; never merged (implementation-plan.md §7).

## Now

- Tips: rickashay-lift <sha>, rickashay <sha> (on lift tip <sha>); origin/main <sha> (fetched <time> UTC)
- Landed: L0, LP, L1, K1 (4 of 37 packages; 19 of about 165 commits)
- In flight:

  | Package | Worktree                | Branch | Cut from               | Agent      | Since       | Commits | Reviews out |
  | ------- | ----------------------- | ------ | ---------------------- | ---------- | ----------- | ------- | ----------- |
  | L4      | .claude/worktrees/rk-l4 | rk-l4  | rickashay-lift @ <sha> | <agent id> | 11-25 09:40 | 3 of 6  | 1 (<sha>)   |

- Ready next, in order: L2, R1, …
- Waiting on you: —
- The week: 31% used at 11-25 12:00 UTC
- To resume: §7.3, then <the one next step>

## Entries

### 2026-11-25 09:12 UTC: L0 started

Brief: briefs/L0.md. Worktree .claude/worktrees/rk-l0, branch rk-l0, cut from rickashay-lift @ <sha>.
```

### 7.3 Starting again

A session that picks the build up, the same one resumed or a new one, does
this before anything else:

1. **Reads `Now`,** in the log's worktree or with
   `git show rickashay-log:work-log.md` from any.
2. **Compares it with the repository:** `git worktree list`, the tips of
   `rickashay-lift` and `rickashay` against those logged, and for each
   package in flight `git log --oneline <its base>..<its branch>` and
   `git status` in its worktree.
3. **Takes each package in flight as it finds it:**
   - its report arrived and wasn't landed: lands it (§6.7);
   - its agent's run ended without a report, or the session that ran it is
     gone: starts a fresh worker in the same worktree, with the saved brief
     and a paragraph saying which commits are made and reviewed, which
     reviews to start again, and what is left;
   - its worktree holds changes no commit has: the fresh worker's brief
     says so, and it keeps or discards them by reading them, and says which.
4. **Starts every review that was out again,** as `commit-review-process`
   says for one that never reported.
5. **Checks the queue,** `<git common dir>/fz-verify-queue/`: a place left
   by a run that died is unmarked and leaves by itself within a minute.
6. **Reads the week** (`/measure limits`), and `/measure status` for the
   run's state, then writes a "resumed" entry and goes on in §6.2's order.

---

## 8. Practices, layer by layer

The repository's rules (`.agents/AGENTS.md`, `frontend/AGENTS.md`,
`frontend/games/AGENTS.md`, each workspace's) and the skills hold most of
what follows; this section is what they mean for this build, and what is
its own.

### TypeScript (6, checked by `tsc7`), everywhere

- Strict, with `exactOptionalPropertyTypes`: an optional field is left out.
- Google's TypeScript style; an explicit return type on every exported
  function and public method; doc comments of one sentence, in the third
  person for a function.
- A discriminated union for every kind of thing (faces, events, contacts,
  cards, settings), each `switch` ending in `never`.
- `as const satisfies` for every catalog, list of names and art record, so
  a missing entry fails to compile; a union of ids derived from its list.
- `readonly` on what a function is handed; no `as any`; unknown input
  read with `@fz/core/json`'s readers and a type guard.

### `@fz/brick-wall`

- No mode flags. What differs between the games is data, a function or a
  type parameter (`K extends string` for a kind's id).
- Every rule it holds is a pure function; retunable numbers are handed in.
- Nothing in it names a game; its specs use kinds made up for them.
- A change to it is checked against both games, which
  `yarn verify:changed` does by itself.

### The rules

- Pure functions over values nothing may change; scratch only inside
  `fly()`, in its module, never escaping it; inputs never changed, and
  specs that say so.
- §4.6's determinism; the exact lint holds the arithmetic, and the review
  holds the order.
- Specs draw walls as pictures (`wallFrom()`) and read events back;
  asserting state over asserting calls.

### The view

- Deterministic, as `phaserGameLayers()` holds it, and frame-rate free:
  everything moves by the frame's milliseconds, and playback by units.
- Nothing allocated per frame on the playback path: `RoundView` is one
  record, reused.

### Phaser 4 (the `phaser-core` and `phaser-canvas-performance` skills)

- Every game object made once in `create()`, in pools sized for the worst
  case (the 9 × 22 field's cells and layers, the effects' most at once).
- One atlas, baked at whole device pixels, baked again only when the
  palette or the unit changes, and after a lost context.
- No `Text`: words live in the DOM. Keys through `onKeyDown()` and
  `onKeyUp()`. What a scene holds let go in `whenSceneEnds()`.
- The scene knows nothing of Angular; it is handed plain functions.

### Angular (22) and Sass

- Standalone, zoneless and signal-driven: `input()`, `output()`,
  `computed()`, `inject()`. Templates bind and never compute; a `@switch`
  over a union ends in `@default never;`.
- The libraries' pieces first: `<fz-dialog>`, `ConfirmService.ask()`,
  `<fz-icon>`, `.fz-button`, the announcer, `<fz-settings-drawer>`.
- What looks selected says so (`aria-pressed` on Fast-forward,
  `aria-current` on the level in play); an icon-only button has one name.
- A piece a page may never show (How to play, the debug menu) loads with
  `onDemand()`; the shell takes nothing by value from the art or the
  steering, whose code only the scene's chunk carries.
- Sass modules, `@fz/style`'s tokens by name, breakpoints by name, three
  levels of nesting at most, `//` comments.

### Specs (Vitest 5, Testing Library)

- Arrange, act, assert; one behavior a case; by role; real objects over
  fakes; the public API only; no code bending to its specs.
- `pure` for the rules, the view, the helpers and the tools; `sim` for the
  replays, the floors, the checks and the benchmarks, never with coverage;
  `dom` for the scene and the shell. A line only `sim` reaches counts as
  untested.
- A helper in `src/testing/` whose answer a spec trusts has a spec of its
  own.

### Scripts (Node 26)

- `.mjs` with every type in JSDoc; logic exported as functions and run
  only as the file Node started (`import.meta.main`).
- They load the game's code only through typed `*_api.ts` entries; they
  read their arguments with `readArgs()`, exiting with 2 on a misuse; their
  output is the same bytes every run.

---

## 9. Checks and budgets

- **A commit's check** is `yarn verify:changed --base <branch>`, the
  package's integration branch, from `frontend/` in its worktree, after its
  last edit, with `--coverage` at a package's last commit that touches code a
  floor holds. A lift reaches every app that depends on the library it
  changes, about three minutes; a commit inside Rickashay, about one and a
  half. Nothing else that takes the machine runs beside it: `yarn verify`,
  `yarn verify:full` and the whole `yarn test` join no queue, while
  certification and the mutants join it (L0).

| What                                                 | Budget                                                                                            | Held by                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Coverage floors                                      | rules and view 100/95/100/100; scene 98/92/100/99; shell 98/97/97/98, in the game and the library | each `vitest.config.ts`                 |
| Brick Fuzz Pop through Part 1                        | every golden flight the same; `report:levels` the same bytes; no screenshot pixel moved           | L0's spec, Q1                           |
| `fly()` over the levels' openings and random aims    | median ≤ 100 µs, p99 ≤ 2 ms (the sketch: 0.7 ms on the largest draft)                             | R2's benchmark, printed, recorded at Q2 |
| `guideOf()` to the fifth turn                        | p99 ≤ 0.2 ms                                                                                      | R3's spec, with a generous bound        |
| Replaying all 432 certificates and their rally lines | under 5 s                                                                                         | `every_level/`                          |
| The floors and the checks in CI                      | `sim` under 100 s on CI's runner with one worker                                                  | Q2 and F1; if over, fewer seeds on 13   |
| The game's whole suite in CI                         | no more than Asteroid Breaker's 195 s                                                             | Q2 and F1                               |
| Certifying a set                                     | a few minutes on the pool; a round of 657 flights took the sketch half a second                   | P3, Y1–Y3                               |
| A frame of a flight, six times CPU throttle          | median ≤ 4 ms, as Brick Fuzz Pop's F1 held it                                                     | F1's trace                              |
| The atlas                                            | ≤ 2048 × 2048 at 128 px a unit                                                                    | A2's spec                               |
| Layout shift on load                                 | 0                                                                                                 | F1's Lighthouse run                     |
| The bundle                                           | Rickashay's main and scene chunks no larger than Brick Fuzz Pop's; certificates only at `?debug`  | F1, from the build's report             |
| Brick Fuzz Pop's bundle after Part 1                 | its main and scene chunks within 1% of `main`'s                                                   | each L that touches its shell, Q1       |

---

## 10. Risks to the build, and what answers them

| Risk                                                                          | What answers it                                                                                                                                                                         |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A lift changes how Brick Fuzz Pop plays                                       | L0's golden flights on every certificate and 50 shots a level and depth; its suite and replays; Q1's report, screenshots and a certificate played in Chrome; Part 1 merged alone        |
| A lift's shape fits Brick Fuzz Pop and not Rickashay                          | Rickashay's case specced at the lift, from the design; the bar of §3.1; a piece that would need a flag stays put for Z1                                                                 |
| Part 2 builds on a lift still moving                                          | A Part 2 package starts only once its lifts have landed (§6.2); a contract changes only in its own commit (§6.7)                                                                        |
| The faces leave a hole a fuzzball flies through, as the sketch's did twice    | R1's brute-force reference and its property specs over random fields; the design's check that no flight ends inside a brick, run over every certificate and the careless player's games |
| A set's floors or checks fail once the rules move from the sketch to the game | `report:levels` first; a level redrawn and certified again (C17); Tricks and Long rallies were near their floors in the sketch                                                          |
| The feel gate changes the numbers                                             | They are `FlightRules`, handed in; the debug menu says the certificates are stale; certifying is minutes a set; the sets wait for the gate                                              |
| The lock, or another kind, is cut at the gate                                 | X4 waits for the gate (C19); one file a kind, so a kind leaves as it came                                                                                                               |
| Two packages edit one file                                                    | §6.4; the lists are one line each; the rebase settles them; a review of anything more                                                                                                   |
| The devbox runs out of memory                                                 | One queued check at a time; certification and the mutants queued too (L0); workers run single spec files as they go                                                                     |
| The week's allowance runs short, or the build stops for days                  | It starts after the reset; no package starts past 85%; the work log (§7), on its own branch, to start again from any point                                                              |
| `main` moves under the build                                                  | Part 1 merged early; the skill's rebase onto `origin/main` every few landings, reviewed by `range-diff`                                                                                 |
| CI's time grows past its budget                                               | `sim` uncovered and split by depth and set; the floors' seeds a knob; Q2 measures before the sets are built on it                                                                       |
| What only hands, eyes and devices can judge                                   | Q3, and Z2's list (§11)                                                                                                                                                                 |

---

## 11. Finishing

**Z2, the orchestrator's finish,** once F1, the last package, has landed:

1. The screenshots,
   `games/rickashay/public/docs/screenshots/rickashay/preview.webp` and
   `thumb.webp`, by T1's script, and, at your word, the catalog's entry
   out of development.
2. `rickashay` rebased onto `origin/main`; `yarn verify:changed` with no
   `--base`, then `yarn check:layout`; `node tools/check-report.mjs` over
   every game; the image built and served as `docs/operations.md` shows,
   the console read for "Refused to load".
3. "As built" written into this file, its figures taken from the commits'
   bodies, not from the work log.
4. The work log's last entry, and its branch kept until you say it can
   go (§7.1).
5. `merge-to-main` once you ask: `yarn verify:full`, the push, which
   deploys, and the branches deleted. This folder moves to
   `docs/archive/rickashay/` at your word.

**What Z2 leaves for you:**

- The game on a phone and a desktop: whether an aim is enough to do, the
  guide's three turns, the flight's speeds, the dash home, the floor
  bounces' costs, the bored distance, the hot shot (the design's risks 1
  to 7).
- A screen reader through a level; Safari, and Firefox's blur behind a
  dialog; a screen at 120 Hz.
- The name: the design's thirteenth risk asks for a trademark search before
  the game leaves "In development".
