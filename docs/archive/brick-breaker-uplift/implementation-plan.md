# Brick Breaker uplift: the implementation plan

Written 2026-11-14, as a companion to [`plan.md`](plan.md). That file is the
design: what the uplift adds, its seventeen decisions and its ten slices.
This file is how to build it:

- what is in scope, and the points the design leaves open, settled (§2, §3);
- what to lift into the shared libraries, so Brick Breaker and Brick Fuzz
  Pop draw and lay out alike from one copy of the code (§4);
- the contracts the parts share: types, state, events and storage (§5);
- each package of work, with its files, its specs and when it is done (§6);
- how the packages run side by side as streams of AI agents, each in a
  worktree of its own, each commit reviewed before it is made (§7);
- the practices, budgets and risks that hold for the build (§8 to §10);
- how it ends: the checks, the archive and the merge (§11).

Where this file and `plan.md`'s "Phases" disagree, this file is the newer.
§12, "As built", says where the build left this plan, what its work logs
decided, and what it left for the user.

**What it was written from:**

- `plan.md`, read whole, and the five art sheets, the level drafts
  (`levels/`) and the mocks.
- Brick Breaker's rules from end to end: the field, the travel, the
  bricks, the capsules, scoring, the levels, the stats, the saved game and
  the autopilot; and its view, scene and shell where the slices touch them.
- Brick Fuzz Pop's panels, art kit, colors and stars, read for what can be
  shared, and `docs/archive/brick-fuzz-pop/implementation-plan.md` for how
  its build ran.
- Every library's entries, for what exists already.
- Timings on this machine, in §9.

Paths are relative to `frontend/games/brick-breaker/` unless they start with
`frontend/` or `docs/`.

---

## 1. Summary

- **Nine of the plan's ten slices are built.** The tenth, the Attic, is
  "designed when Machines has shipped" (`plan.md`, "Phases"), so it stays a
  sketch.
- **Four lifts go into the libraries** (§4), the first three taken up by
  Brick Fuzz Pop in the same commit, so the two brick games share one copy:
  - the panel rule, the panel's look, and the layout check's test that
    panels show exactly where they fit;
  - the slab brick and the marks both games draw;
  - the fuzzball's combed fur;
  - a drawing's commands written out as SVG.
- **Twenty settled points** (C1 to C20) fill what the design leaves open.
  Each is the plan's own call, made so that the build can go on without
  waiting, and says what it could be instead where there is a real choice.
- **Five streams run side by side,** each an agent at a time in a worktree
  of its own:
  - L, the look;
  - P, the panels and the cards;
  - F, feel and sound;
  - R, the rules of the thirty levels, the seeker, double pay and stars;
  - K, the new kinds of brick with their levels.
- **An integrator,** the session that runs the build, rebases each finished
  package onto the branch `brick-breaker-uplift`, checks the tip, and keeps
  the integration log.
- **The critical path is the rules:** the thirty (R1), then the seeker and
  double pay (R2), then Friends (K1, K2) and Machines (K3, K4). Each needs
  the autopilot to clear every level. The look, the panels and the feel run
  beside it from the first hour.

---

## 2. Scope

| `plan.md` slice          | Built here | Packages                |
| ------------------------ | ---------- | ----------------------- |
| 1. The look              | yes        | L1, L2, L3              |
| 2. Places                | yes        | L4                      |
| 3. Wide screens          | yes        | P1, P2                  |
| 4. Feel and sound        | yes        | F1, F2, and F3's voices |
| 5. The thirty            | yes        | R1                      |
| 6. Seeker and double pay | yes        | R2, and L5's gold lip   |
| 7. Stars                 | yes        | R3, P3                  |
| 8. Friends               | yes        | K1, K2, L6, F3          |
| 9. Machines              | yes        | K3, K4, L7, F3          |
| 10. The Attic            | no         | stays a sketch          |

The order of slices is the plan's, as dependencies allow: no star is won
under a mark a later slice moves, since R3 sets the marks only once R1 and
R2 have settled the thirty's layouts and rules.

---

## 3. Settled before code

The design leaves these open, or says them in words that admit two builds.
None changes a decision the user kept. Where there is a real choice, each
says what it could be instead.

**C1. The seeker turns a rising ball only.** A seeking ball turns toward
the middle of the nearest unbroken brick the level needs, by up to 45° a
second, only while it rises (`dy < 0`), and is then settled as every turn
is, no flatter than `FLATTEST`. A falling ball is left alone, so the paddle
still has to meet it where its line says, and the autopilot's landing,
which reads only falling balls, needs no change. _Instead:_ turn it both
ways, which saves a ball the paddle would have missed.

**C2. A seeker is a ball's state, and the capsule is a group of its own.**
`Ball.seeks` marks a ball lent the seeker by the paddle. The Seeker capsule
is a new effect group, `seek`, so it runs beside a fire or blast ball
rather than replacing it; while it is in play every ball in flight seeks.
`Field.dryBounces` counts the balls that have left the paddle (a bounce, a
serve or a caught ball let go) since the last needed brick broke. When the
paddle next meets a ball, while the level needs `SEEKER_LEND.needed` (3)
bricks or fewer and `dryBounces` is at least `SEEKER_LEND.bounces` (3),
that ball seeks until it breaks a needed brick or is lost. `SEEKER_LEND` is
in `tuning.ts`, since the rules' fence keeps out the autopilot's `ENDGAME`,
and a spec holds its `needed` to `ENDGAME` and the view's `GLOW_BRICKS`.
_Instead:_ make Seeker a ball kind, which would end a fire ball.

**C3. The Seeker capsule** falls from level 11 (the Steel set on), is good
and lasts 12 s, as the plan's table says; it weighs 4, as Fire ball and
Blast ball do, which is this plan's own call.

**C4. Double pay is a capsule's own number.** `Capsule.pays`, 2 for Narrow
paddle and Fast ball and absent for the rest. `Field.pay` is the highest
`pays` among the effects in play, 1 with none, so two at once still double.
A hit scores its points times the streak's multiplier times the pay. What
the pay added is kept apart (`Field.darePoints`), and the cleared card's
tally gains a line for it, "Double pay", shown only when it is not nothing.
The saved game keeps `darePoints`, as it keeps `streakPoints`, so a reload
doesn't count the pay as the bricks' own. _Instead:_ fold it into the
bricks' line, which hides why a level paid more.

**C5. A level's layout is a number in its data.** `LevelData.layout`, a
whole number from 1, 1 where it is left out; the four redrawn levels are 2.
The stats gain `layouts`, the layout each level's bests were made on,
missing for one made before this slice and so read as 1. `statsOf()` drops
a level's bests made on another layout than its own. The stored entry keeps
its version, since an older entry reads correctly as layout 1.

**C6. Stars are a record of their own,** `brick-breaker-stars`, version 1:
each level's id and the stars it has won, as bits (clear 1, clean 2,
streak 4), so each is kept for good once won, in any play and at any speed.
The reader keeps only ids the game has, and gives every level the progress
has cleared its first star, so a level cleared before stars shows one.

**C7. A level's mark is in its data,** `LevelData.mark`, and so in
`Level.mark`, where the view reads it for the count beside the ball. The
rule that sets it is the report's: `yarn report:levels --marks` plays each
level from twelve seeds at Normal and prints the middle of its best
streaks, rounded down to a five, never under 5. The levels spec holds every
mark to a multiple of 5 of at least 5. The `sim` specs don't recompute it,
which would add twelve plays a level to every run.

**C8. The best streak is the field's.** `Field.bestStreak` is the longest
streak the level's play reached, across its lives; a clear with it at the
mark or past wins the third star. The saved game keeps it, so a streak
reached before a reload still counts. The autopilot's report gains it.

**C9. A kind is new at the first level that holds it.** The Ready card and
the right panel name a kind "new here" by the levels' order, worked out
from the level data, with nothing stored. _Instead:_ a record of the kinds
a player has met, which a player who starts at level 12 would read wrongly
anyway.

**C10. The panels change on events.** Their figures are signals the game
service writes when the field comes to something: a brick, a capsule, a
life, and an effect's whole seconds left, so an effect's ring steps once a
second and nothing in a panel moves between. The ring is drawn by its
share, with no CSS animation.

**C11. The next level is drawn as an SVG,** its cells in their tints from
the palette, in the left panel. No frame of the atlas is needed for it.

**C12. A place belongs to a set.** `LevelSetData.place`: `playroom`,
`workshop`, `funfair`, `garden`, `arcade`. Its motifs are drawn once, as
`@fz/phaser/shapes` commands, in `src/view/places/`. The scene bakes them
into a texture it tiles under the bricks at about 5%; the page shows the
same commands written as SVG (§4, lift 4) as a CSS mask over a palette
token, a little stronger. Neither moves.

**C13. A plate's underside is its bottom face and its bottom corners, met
by a rising ball.** There a ball of any kind, a fire ball too, turns and the
brick takes no hit, and a bolt is spent. A blast ball turned back there
sets off no blast around the brick, and the field records `plated`, for its
sound. A blast's hit, from a blast brick, reaches it from any side. `u` is a
plated brick of one hit and `U` of two.

**C14. A cage frees its friend upward.** Its second hit breaks it and puts a
ball in play at its middle, heading up within 20° of straight up, by the
field's next draw. A friend wears an ink of `@fz/phaser/color`'s
`FUZZBALL_INKS`, the next for each friend the level frees
(`Ball.ink`, -1 for the player's own), and a ball split from it keeps its
ink. With `MAX_BALLS` in play the cage still breaks, and frees nobody.

**C15. Gates open as one.** `Field.keysLeft` counts the keys unbroken; the
hit that breaks the last marks every gate broken, out of the balls' way,
and records `opened`, which the announcer says. A gate is steel until then:
it never takes a hit and a level doesn't need it. The levels spec refuses a
gate in a level with no key.

**C16. A bumper is a disc** of radius 0.5 at its cell's middle, which a ball
meets by `@fz/core/sweep`'s `sweepPoint()` at its radius and the disc's,
turning as off a circle, and the field records `bumped`. It is no box, so
`solid` leaves its cell open and the faces of the bricks beside it stay
exposed. A bolt stops at its cell.

**C17. A portal is met as a disc too,** of radius 0.5. The ball moves to its
twin's middle, going as it went, and is `portalled` until it next touches a
brick or the paddle, passing over every portal till then. A level holds two
of each pair's character or none.

**C18. Sliders step on the field's beat, a train as one.** Every 800 ms
(`SLIDER_BEAT_MS`) the sliders of a row that touch and head the same way
step as a train, a cell its way. A train whose lead's next cell is a wall
or another brick turns and stays; a train with a ball overlapping any cell
it would move into waits, whole. `Field.bricks` follows where each brick
stands now, so the travel, `solid`, `exposureOf()` and the autopilot read
it as they do; `Brick.cell` is that place and `Brick.home` the cell the
level drew it in, by which the saved game keeps each brick, with its place
and a slider's heading. A step records `slid`, which the scene eases over
120 ms.

**C19. The lull's nudge, from Machines on,** turns a ball at any bounce off
what can't break, not only at a wall, so a ball circling a room walled in
steel is nudged out of its loop.

**C20. A saved run from before the uplift is dropped.** The branch ships
once, so `SAVED_GAME_VERSION` rises once, in R2, the first package that
changes the rules; a run kept by `main`'s build is let go rather than played
by rules it wasn't played by. Later packages change what a saved run holds
without a second rise, since no build between them ships.

---

## 4. Lifts into the shared libraries

The user asked for library code to be shared between the games as the work
goes. A lift here meets the bar the last build set: it is generic, it has
two users from its first commit, and Brick Fuzz Pop adopts it in the same
commit with every one of its specs unchanged, so its look and layout stay as
they are. A number the two games differ by is a parameter, never a change to
either game. Lift 4 and the panels' compact rule are the exceptions, each
with one user, kept in the library because they are plainly its own.

Asteroid Breaker and Snake use some of the entries changed (`fuzzball`,
`shapes`, `layout` and the layout check's deck), so a commit that changes a
library runs the root's `yarn typecheck` and `yarn test`, not only its own
workspaces' (§9).

**Lift 1, the side panels (P1).**

- `@fz/phaser/layout` gains `sidePanels()`: given the room inside the
  canvas's insets, the field's rectangle and the pixel ratio, the two panels'
  rectangles, or null where 184 CSS px aren't spare a side. Its numbers are
  exported: `PANEL_GAP_CSS_PX` (12) and `PANEL_WIDTH_CSS_PX` (172 to 320).
  They come from Brick Fuzz Pop's `field_metrics.ts`, which then calls it.
- `@fz/style`'s toolkit gains `board-panel()`, beside `board-card()`, from
  Brick Fuzz Pop's `_panel.scss`, with a compact rule Brick Fuzz Pop doesn't
  have, as an option Brick Breaker takes: a panel under 400 px tall keeps
  only its first two parts.
- `@fz/dev/board-page`'s `PhaserDeck` gains `spare`, the CSS pixels a side
  that must show the zones, and the attribute that names the room, so the
  check that a game shows panels exactly where they fit is the library's.
  Brick Fuzz Pop's `tools/check-layout.mjs` gives up its own copy of it.

**Lift 2, the slab and the marks (L1).** A new entry, `@fz/phaser/bricks`,
holds what both games draw a brick with, in `@fz/phaser/shapes`' commands:

- `SlabShares` and `slabCommands(cell, ink, shares)`: the body, the lip
  along its foot and the strip along its top. Every share is of the cell's
  short side, so a square tile and a brick of two by one take the same
  code. `TILE_SLAB` is Brick Fuzz Pop's shares and `BRICK_SLAB` the uplift
  kit's.
- `topCap()`, the polygon under a slab's top corners that the strip, a
  moss cap and a shown ghost's body are cut from.
- `showsDetail(scale, sidePx)`, whether a brick is large enough for cracks,
  rivets and sheen, measured across the side given.
- The marks both games draw, each in an area or about a middle, its inks
  handed in: `bombMark()`, `sproutMark()`, `scallopedCap()`, `rivets()`,
  `sheen()`, `portalMark()`, `bumperMark()`, `cageMark()` (its bar count
  given) and `plateMark()`. Brick Fuzz Pop's turned plates keep their own
  layout and draw through `plateMark()`.
- `@fz/phaser/shapes` gains the geometry they use: `bandAlong()`,
  `crispOutline()`, `diePips()`, `pipRow()`, `turned()` and `diamond()`.
- The new entry is pure, importing nothing but `shapes`, `color` and
  `fuzzball`, so a game's view may take it: it joins `PURE_PHASER_ENTRIES`
  in `frontend/lib/dev/src/eslint.ts`, the pure entries' fence in
  `frontend/lib/phaser/eslint.config.js`, and the view's row in both games'
  `AGENTS.md` tables of layers.

**Lift 3, the combed fur (L2).** `@fz/phaser/fuzzball` gains
`combedStrands(share)` and `sparkCommands()`, from Brick Fuzz Pop's charge.
Brick Breaker's fur lifts with the streak by the same comb: flat, half,
full, and full with sparks.

**Lift 4, a drawing as SVG (L4).** `@fz/phaser/shapes` gains `svgOf()`,
which writes a list of commands as an SVG document, so the page's backdrop
is the same drawing the scene bakes.

**Not lifted, and why:**

- **Stars.** Brick Fuzz Pop's are a count from its rounds against par, kept
  as the most a level earned; Brick Breaker's are three separate stars, each
  kept once won. They share `@fz/ui`'s `star` icon and nothing else.
- **The streak's scale.** Brick Fuzz Pop's rises by semitones over a
  round; changing it would change that game. Brick Breaker's pentatonic
  steps stay in its own `effects.ts`.
- **The panels' contents,** the meter, the rings and the bench, which no
  other game shows.
- **Brick Fuzz Pop's die-face pips and five cracks,** which are its layout.
  Brick Breaker draws its pips in a row and three cracks, through the
  shared `pipRow()` and `bandAlong()`.

---

## 5. Contracts

What the streams agree on before their packages meet. Each is written by
the first package named, and read by the others. A name here may be
refined by its package, which then says so in its log.

### 5.1 Rules

| What                                                                                                                 | Where                          | Written by             |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ---------------------- |
| `LevelData.layout`, `LevelData.mark`; `Level.layout`, `Level.mark`                                                   | `levels/levels.ts`, `level.ts` | R1 (layout), R3 (mark) |
| `LevelSetData.place`, the `Place` ids                                                                                | `levels/levels.ts`             | R1                     |
| `Stats.layouts`; `statsOf()` dropping another layout's bests                                                         | `run/stats.ts`                 | R1                     |
| `Capsule.pays`; `Field.pay`, `Field.darePoints`; `LevelTally.dares`                                                  | catalog, field, scoring        | R2                     |
| The `seek` effect group and the `seeker` capsule                                                                     | `catalog/capsules.ts`          | R2                     |
| `Ball.seeks`, `Field.dryBounces`, `SEEKER_LEND`, the `seeking` event; `SavedField.darePoints`                        | balls, field, tuning, saved    | R2                     |
| `Field.bestStreak`, kept by the saved game; the autopilot's `bestStreak`                                             | field, saved, autopilot        | R3                     |
| `StarsRecord`, `starsWon()`, `withStars()`, `starsRecordOf()`                                                        | `run/stars.ts`                 | R3                     |
| The kinds `plated`, `cage`, `key`, `gate`; their characters                                                          | catalog, `levels/legend.ts`    | K1                     |
| `Ball.ink`, `Field.keysLeft`, the `plated`, `freed` and `opened` events                                              | balls, field, events           | K1                     |
| The kinds `bumper`, `portal`, `slider`; their characters                                                             | catalog, legend                | K3                     |
| `Brick.home`, a mutable `Brick.cell`, `Brick.heading`; `Ball.portalled`; the `bumped`, `slid` and `portalled` events | bricks, balls, events          | K3                     |

The new characters are `plan.md`'s: `u` and `U` plated, `c` cage, `k` key,
`=` gate, `@` and `%` portal pairs, `O` bumper, `>` and `<` sliders.

### 5.2 View and scene

- **Art frames.** Bricks stay one flattened frame a look, as now, named by
  `brickFrame()`: the slab and its marks baked together, one per kind, tint
  and state. The atlas grows by the new kinds' looks, and the specs hold it
  inside `@fz/phaser/shapes`' 4096 px side.
- **Placeholder art.** K1 and K3 give each new kind a plain slab in a fixed
  tint, so the compiler's `BRICK_ART` and `PICTURED_BRICKS` hold; L6 and L7
  draw the real art.
- **The ball's fur** is chosen by the streak's tier, from the frame
  `FieldView.streak` gives, in `ballFrame()`; a friend's ink is a frame too.
- **The places** are a `PlaceArt` per place in `src/view/places/`: a tile of
  commands and how strongly it shows over the field and the page.
- **Effects.** `effects.ts` keeps saying what each event calls for, in
  `EVENT_EFFECTS`, a record keyed by the event's kind, so the compiler asks
  each new event (`seeking`, `plated`, `freed`, `opened`, `bumped`, `slid`,
  `portalled`) for an entry. Its package gives it one with no sound, and F3
  gives it its voice. A kind's sound hangs on its events, so the compiler
  doesn't ask a new kind for one: F3's checklist does.

### 5.3 Shell

- **`GameService` signals** for the panels: `streak`, `bestStreak`,
  `effectsInPlay` (each effect's capsule, its share left and its whole
  seconds left), `livesWaiting`, `nextLifeAt`, `kindsHere` (the level's
  kinds, each with whether it is new here), `capsulesHere`, `nextLevel` and,
  with R3, `starsHeld` and `mark`.
- **The board** lays the panels out from `fieldMetrics()`'s `panels`, through
  lift 1, writes `data-panels` and `data-room` for the layout check, and
  moves the application role from its host onto an inner `.play`, as Brick
  Fuzz Pop's board does, so the panels sit beside the application and not
  inside it.
- **Storage keys,** beside the four the workspace's `AGENTS.md` lists:
  `brick-breaker-stars` (C6). `brick-breaker-stats` gains `layouts` (C5).

---

## 6. Work packages

Each package is one agent's run, in its stream's worktree, as §7 says. It
ends with its commits made, each reviewed, its checks passing, and its
stream's log written. Every package changes the workspace's `AGENTS.md` and
skills where they describe what it changed, in the same commit, as
`.agents/AGENTS.md` asks.

### L: the look

**L1. The slab and the marks, lifted (lift 2).**

- New `frontend/lib/phaser/src/bricks/` (`index.ts`, `slab.ts`,
  `marks.ts`, specs), and the geometry into `src/shapes/`.
- Brick Fuzz Pop's `src/view/art/` draws through them: `kinds/brick.ts`,
  `steel.ts`, `bomb.ts`, `moss.ts`, `portal.ts`, `bumper.ts`, `cage.ts`,
  `plated.ts` and `symbols.ts`.
- **Done when** Brick Fuzz Pop's art specs pass unchanged, and the
  library's specs cover each export at both shapes of cell.

**L2. The fur lifted (lift 3), and the seven kinds in the slab.**

- `combedStrands()` and `sparkCommands()` into `@fz/phaser/fuzzball`, Brick
  Fuzz Pop's `fuzzball_art.ts` drawing through them.
- Brick Breaker's `src/view/art/brick_art.ts` draws every kind and state in
  `BRICK_SLAB`, as `art/bricks.svg` sections A, B and E show: pips in a row
  that a hit cuts out, three cracks, steel's frame, rivets and sheen, the
  blast's bomb and dots, the gift's parcel and bow, the ghost's dashes and
  faint eyes, moss over earth, and the ring of a brick growing back. Under
  15 CSS px a unit (a brick under 30 px wide) it leaves out cracks, rivets
  and sheen.
- `src/view/colors/palette.ts` gains the roles the kit's mixes read, and
  `contrast.spec.ts` holds each mark against its brick in all four
  palettes.
- **Done when** the art, palette, contrast and scene specs pass, and the
  game, looked at in a browser at 1280 × 720 and at 844 × 390, draws as the
  sheet does.

**L3. The paddle, the capsules, the ball and the field's edge.**

- The paddle (`art.ts`, `paddle_painter.ts`): a bar in the accent with a
  pale pad, a lip and a cap at each end; velcro hooks while it catches,
  cannons while it fires.
- The capsules (`CAPSULE_ART`): a good one is a pill, a bad one notched at
  each end. Their symbols are as now.
- The ball's fur by the streak's tier (`fuzzball_art.ts`, `ballFrame()`,
  `ball_painter.ts`): flat, lifted at ×2, standing at ×3, on end and
  sparking at ×4.
- The rim on three sides and the gutter under the paddle, with chevrons
  pointing down (`field_painter.ts`).
- **Done when** the same specs pass and a browser shows each mode, both
  tones of capsule and each tier of fur.

**L4. Places (after P2).**

- `svgOf()` into `@fz/phaser/shapes` (lift 4).
- `src/view/places/`: five places' tiles, as `art/places.svg` draws them,
  in mixes of the palette's own colors.
- The scene tiles the set's place under the bricks (`field_painter.ts`); the
  board's stylesheet masks the page with the same tile.
- **Done when** a spec holds every set to a place, the place's commands
  inside its tile, and a greyscale screenshot of a busy moment, three balls
  in play, shows the ball first in all four palettes.

**L5. The gold lip and the seeker's symbol (after R2).** A bad capsule sits
on a gold lip, now that it pays; the Seeker's symbol, which R2 drew as a
plain mark, gets the kit's.

**L6. Friends' art (after K1).** Plated (one and two hits, each state),
cage (whole, bent, with its friend), key and gate, from `art/bricks.svg`
section C, through lift 2's marks; the friends' balls in their inks.

**L7. Machines' art (after K3).** Bumper, portal (two pairs, told apart by a
dot and a diamond as well as by ink) and slider (each heading).

### P: the panels and the cards

**P1. The panel rule, the panel's look and the check (lift 1).**

- `sidePanels()` into `@fz/phaser/layout`, `board-panel()` into
  `@fz/style`'s toolkit, `spare` into `@fz/dev/board-page`'s deck.
- Brick Fuzz Pop's `field_metrics.ts`, `app/panels/_panel.scss` and
  `tools/check-layout.mjs` use them.
- **Done when** Brick Fuzz Pop's specs and `check:layout` pass unchanged.

**P2. Brick Breaker's two panels.**

- `src/view/field/field_metrics.ts` returns `panels` through `sidePanels()`.
- `src/app/panels/`: `bench.component` (the level, its set and its pips; the
  lives waiting as fuzzballs on a plank and the score of the next; the next
  level, drawn as C11 says) and `in_play.component` (the streak, large, the
  bricks since the paddle and a meter ticked at 5, 10 and 20; the effects in
  play, each a ring with its name and seconds left; the kinds here, each
  drawn with its line; the capsules that can fall). The compact form keeps
  the first two parts of each. No stars yet.
- The board places them as Brick Fuzz Pop's does, with the application role
  moved to `.play`, `data-panels` and `data-room`.
- The Ready card names a kind new here, drawn with its line (C9).
- `tools/check-layout.mjs` gains the deck, through lift 4.
- **Done when** the shell's specs cover each panel's parts and the compact
  form, `check:layout` passes at every shape, and a browser shows the panels
  at 1280 × 720, at 844 × 390 and none at 1000 × 1000.

**P3. Stars in the shell (after R3).**

- `src/app/stats/stars.service.ts` keeps the record (C6).
- The left panel's stars, each with what it asks, the third naming its
  mark, lit where held; the Ready card's stars; the cleared card's stars
  over its tally, the ones just won marked; three small stars under each
  level in the Levels dialog and a count by each set, and a line saying
  what they are for; How to play's word on them.
- The announcer says each star won (`describe.ts`).
- **Done when** specs cover each place a star shows, and the record's
  reading of what was stored.

### F: feel and sound

**F1. The flourishes that need no new art.**

- The streak's notes go up a major pentatonic, one step a brick, to an
  octave and a fifth (`detuneOf()`).
- A broken brick's shards fade and dim as they fall, over 350 ms.
- A streak's step, and its mark once R3 sets marks, plays a ring about the
  ball and shows its count beside it, over 300 ms.
- The ball in a streak draws a tail, longer at each step, eight dots at most
  (a new `tail_painter.ts`).
- The last brick's hit holds 120 ms before the clear's chord.
- **Done when** the effects' specs hold each timing and the scene's spec
  plays each flourish, and none plays where motion isn't welcome.

**F2. The paddle and the drop-in (after L3).** The ball squashes and the pad
dips a tenth of a unit as they meet, over 90 ms, in the picture only; the
bricks drop in a column after a column over 400 ms, which a key skips.

**F3. Voices (after K1, then K3).** A clank for a plate, a rattle for a cage,
a chime for a key, a low sweep for the gates, a whoosh for a portal and a
boing for a bumper, synthesized by `tools/build-sounds.mjs`, each named in
`SOUNDS` and called for in `effects.ts`.

### R: the thirty, the seeker, double pay and stars

**R1. The thirty.**

- The four redraws from `levels/revisions.json`, each at layout 2, and the
  seven pictures' tints (`plan.md`, "Pictures get their tints").
- `layout` and `place` in the level data (C5, C12); the stats keep bests by
  layout.
- The report marks a level whose middle time at Relaxed is past 2:00.
- `report:levels --seeds 12` run before and after, the reports saved in
  `docs/archive/brick-breaker-uplift/levels/`.
- **Done when** every level spec and `sim` spec passes, and the report,
  being seeded, matches `levels/report-after.txt` for the four redraws.

**R2. The seeker and double pay.**

- The `seek` group and the Seeker capsule (C2, C3), the lent seeker, the
  turn (C1) in `stepField()`, and its events.
- `pays` and the pay (C4); the tally's line; `describe.ts`'s words.
- The Seeker capsule's art, a pill with a plain mark L5 replaces.
- `SAVED_GAME_VERSION` rises, once for the branch (C20), and the saved
  game keeps `darePoints`.
- `SEEKER_LEND` in `tuning.ts`, held to `ENDGAME` and `GLOW_BRICKS` (C2).
- `report:levels --seeds 12` again, saved, since both rules touch every
  level.
- **Done when** field-picture specs hold the seeker's turn, its lending
  and its end, and the pay with one bad capsule and two; and every `sim`
  spec passes.

**R3. Stars and marks.**

- `Field.bestStreak` (C8), kept by the saved game; the autopilot's report
  and `report:levels`' column of it; `--marks` (C7).
- Each level's `mark`, set by the report's rule.
- `src/rules/run/stars.ts` (C6).
- **Done when** specs cover the record's reading and its merging, and the
  levels spec holds every mark.

### K: new kinds, with their levels

The catalog spec holds every kind to being used by a level, so a kind lands
with the level that teaches it, never alone. Each of K1 and K3 is three
commits, a kind or a pair a commit, each with its teaching level, cleared
by the autopilot at every speed.

**K1. Friends' kinds, with levels 31 to 33.**

1. The cage (C14) and the friends it frees (`Ball.ink`, `freed`), with
   Hello (31).
2. The plated brick (C13) in the travel, with Mushroom (32).
3. Keys and gates (C15), with Drawbridge (33), and the announcer's words
   for a gate opened.

Each kind comes with its placeholder look (§5.2), its `EVENT_EFFECTS`
entries, what the saved game keeps of it, field-picture specs of its rule,
and the levels spec's reach learning it: a needed brick is reachable from
above or the sides of a plate, and past a gate only once the keys are.
`friends.json` starts here, from `levels/friends.json`, its drafts' notes
(`teaches`, `mark`) dropped or made data.

**K2. Friends' other seven levels, 34 to 40.** Each cleared by the
autopilot at every speed, redrawn where the report says so, its report
saved; marks by R3's rule where R3 has landed, or else R3 sets them.

**K3. Machines' kinds, with levels 41 to 43.**

1. The bumper (C16), with Pinball (41).
2. The slider (C18) and the bricks that move (`Brick.home`, `Brick.cell`),
   which `exposureOf()`'s reading, the saved game and the brick painter all
   learn, with Conveyor (42). Its painter change rebases on F2's drop-in.
3. The portal (C17), with Wormhole (43), and the nudge at any bounce off
   what can't break (C19).

**K4. Machines' other seven levels, 44 to 50,** as K2's. The report gains
the longest time between two touches of the paddle, and shows no play that
hangs (`plan.md`, "Risks").

**Done when,** for each: every `sim` spec passes with the levels so far, the
report is saved in `docs/archive/brick-breaker-uplift/levels/`, and the
coverage floor holds.

### Z: finishing (the integrator)

- **Z1.** The screenshots again (`yarn capture:screenshots`), the
  workspace's `AGENTS.md` and both skills read through against the code,
  `yarn verify:full` and `yarn check:layout`, and a pass in a browser over
  every set, palette and shape.
- **Z2.** The plan and this file moved to `docs/archive/brick-breaker-uplift/`
  with an "As built" section; the work logs deleted; the merge (§11).

---

## 7. Running it in parallel

### 7.1 The dependencies

```text
L1 ─ L2 ─ L3 ─┬─ L4 (also after P2)
              ├─ F2 ─ K3's slider (its painter)
              ├─ L5 (also after R2)
              ├─ L6 (also after K1)
              └─ L7 (also after K3)
P1 ─ P2 ─ P3 (also after R3)
F1 ─ F3 (after K1, again after K3)
R1 ─ R2 ─ R3
K1 ─ K2 (also after R2) ─ K3 ─ K4
```

Nothing in Wave 1 waits on anything. The longest chain is K1 to K4, each
package's levels cleared by the autopilot after every rule that changes how
it plays, R2's among them.

### 7.2 Streams and waves

A stream is a worktree, a branch and the files it owns. A package is one
agent's run in it; the stream's next package is a fresh agent, so no agent
carries one package's context into the next.

| Wave | Starts              | Waits on           |
| ---- | ------------------- | ------------------ |
| 1    | L1, P1, R1, K1      | nothing            |
| 2    | F1, L2, P2, R2      | a slot; L1, P1, R1 |
| 3    | L3, R3, K2          | L2; R2; K1, R2     |
| 4    | L4, F2, L5, L6, P3  | L3, P2, R2, R3, K1 |
| 5    | K3, then K4, L7, F3 | K2, F2; K3         |
| 6    | Z1, Z2              | everything         |

At most four packages run at once; the next waits for a slot. Each runs
its workspaces' lint, typecheck and tests, and ESLint's type-aware rules and
Angular's compiler take a gigabyte or more each, so four at once is what
the machine's 24 cores and 23 GB hold (§9). F1 is the lightest and the
least on the critical path, so it waits for the first slot.

### 7.3 Who owns what

A stream changes its own files freely. Two never restyle one file side by
side.

| Stream | Owns                                                                                                                                                                                                                                                                 |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L      | `src/view/art/`, `src/view/colors/`, `src/view/places/`, the painters but `effects_painter.ts` and `tail_painter.ts`, `frontend/lib/phaser/src/{bricks,shapes,fuzzball}/`, Brick Fuzz Pop's `src/view/art/` and `src/view/colors/`, and, in L1, the fences of lift 2 |
| P      | `src/app/`, `src/view/field/field_metrics.ts`, `tools/check-layout.mjs`, `frontend/lib/phaser/src/layout/`, `frontend/lib/style/src/toolkit/`, `frontend/lib/dev/src/board_page.ts`, Brick Fuzz Pop's panels, board and layout check                                 |
| F      | `src/view/effects/`, `effects_painter.ts`, `tail_painter.ts`, `src/view/field/layers.ts`, `tools/build-sounds.mjs`, `src/scene/sounds/`; in F2, `paddle_painter.ts`, `ball_painter.ts` and `brick_painter.ts`, after L3                                              |
| R      | `src/rules/levels/` but `friends.json` and `machines.json`, `src/rules/run/` (`saved_game.ts` among them), `src/rules/field/scoring.ts`, `src/rules/catalog/capsules.ts`, `src/rules/bricks/capsules.ts`, `src/testing/autopilot.ts`, `tools/report-levels.mjs`      |
| K      | `src/rules/catalog/bricks.ts`, `src/rules/levels/legend.ts`, `friends.json`, `machines.json`, `src/rules/bricks/bricks.ts`, `src/rules/field/travel.ts`                                                                                                              |

**Shared by necessity: add, restyle nothing.** Many packages must touch
another stream's file, mostly a record the compiler holds whole: a kind's
look in `BRICK_ART` and `PICTURED_BRICKS`, a capsule's in `CAPSULE_ART` and
`SYMBOLS`, an event's entry in `EVENT_EFFECTS`, what the saved game keeps,
the autopilot's reading of a new kind, the cleared card's line for the
pay. Such a package may add to another stream's file, and only add: an
entry, a field, a member at the end of a list, a placeholder, a function of
its own, a line of an `AGENTS.md` or skill. It renames, moves and restyles
nothing there, and says in its log what it added where. The files every
stream adds to are `field.ts`, `balls.ts`, `events.ts`, `levels.ts`,
`describe.ts`, `saved_game.ts`, the scene (`bricks_scene.ts`, as a painter
joins it), `GameService`, and every `AGENTS.md` and skill. The integrator
settles what collides as it rebases (§7.5). The one place two packages
would restyle one file, `brick_painter.ts` in F2 and K3, is ordered: K3's
slider rebases on F2.

### 7.4 How an agent works

Each package's agent is a fresh `general-purpose` agent, briefed with this
file, its package, its stream's worktree and log, and the files it owns. It:

1. starts from the integration branch's tip, to which the integrator has
   rebased its stream's branch;
2. reads the `AGENTS.md` files and skills of what it touches, and the
   design's sections for its package;
3. builds in small commits, each one whole: its code, its specs, its docs;
4. checks each commit (§9's list), then has it reviewed by the
   `commit-review-process` skill: it stages the change and launches a
   fresh reviewer, which reads the staged diff with only the project's and
   the package's context; it answers every comment, fixing it or saying why
   not, and commits in the repository's form with no attribution lines;
5. writes its stream's log as it goes (§7.6);
6. reports to the integrator what it made, what it checked, what the
   reviews found and how each was answered, and what it left.

An agent that can't launch a reviewer stops with its change staged, and the
integrator runs the review. An agent that finds a design point unsettled
takes the choice §3's spirit gives, notes it in its log, and goes on.

The checkout is shared with another session, so an agent works only in its
own worktree. It never pushes, never touches `main` or another stream's
branch, and never uses `git stash`, whose stack every worktree shares.

Two agents never share a dev server or a browser page: L serves the game on
port 9104, P on 9204, F on 9304, R on 9404 and K on 9504, each in a
headless Chrome page of its own, closed when it is done. `check:layout`
serves on a free port of its own, so two can run at once.

### 7.5 How the work comes together

The integrator owns `brick-breaker-uplift`, in its own worktree, and no
stream commits to it. A stream's branch is checked out in the stream's
worktree, where git rebases it. When a package reports done, the
integrator:

1. rebases the stream's branch onto the integration tip, in the stream's
   worktree (`git -C <worktree> rebase brick-breaker-uplift`);
2. settles what collides, sending anything beyond a list or a paragraph back
   to the stream's next agent;
3. runs the checks on the rebased branch: every touched workspace's lint,
   typecheck and tests, and the root's `yarn lint`;
4. fast-forwards the integration branch to it, in its own worktree
   (`git merge --ff-only bbu/<stream>`);
5. rebases the streams still at work onto the new tip, between their
   agents, never under one;
6. starts the packages that waited on it.

**At each wave's end,** the integrator runs `yarn verify`, and `yarn
check:layout` after the build, on the tip; and where `origin/main` has
moved, as the other session's work may move it, rebases
`brick-breaker-uplift` onto it then, not only at the merge.

History stays linear, as the repository's is: no merge commits, no squashes.
Every commit on the branch was reviewed as it was made; a commit the
integrator's rebase changed beyond a list or a paragraph is reviewed again.

### 7.6 The work logs

Each stream keeps `docs/brick-breaker-uplift/worklog/<stream>.md`, written in
its own commits: what each package did, commit by commit, what each review
found and how it was answered, the choices it made, the figures it
measured, and what it left. The integrator keeps `worklog/integration.md`:
each package landed, its checks, what collided and how it was settled, and
the waves as they ran. A log is never edited by another stream, so the
logs never collide. They are deleted before the merge (§11), and git keeps
them.

---

## 8. Practices

The repository's and the workspace's `AGENTS.md` hold, and the skills for
what each package touches (`brick-breaker-content`, `brick-breaker-testing`,
`phaser-core`, `fuzzley-ui`, `angular-testing`, `web-game-accessibility`).
On top of them:

- **The rules stay the autopilot's.** Every new rule is deterministic from
  the seed, reads no clock and draws only through `nextDraw()`, so the
  autopilot plays it as a player's field plays it. A step makes nothing:
  new state lives on records made once.
- **A kind is whole when the compiler and the specs say so.** Its art
  (`BRICK_ART`, `PICTURED_BRICKS`) and its traits' rules (`TRAIT_RULES`) are
  records keyed by its id, and its events' entries (`EVENT_EFFECTS`) by
  theirs, so a missing one fails to compile. What the saved game keeps is a
  list (`KEPT_OF_BRICK`) and a kind's sound hangs on its events, so neither
  is the compiler's to catch: the saved game's round trip and F3's list of
  voices hold them.
- **Specs draw the field rather than play to it** (`fieldFrom()`,
  `throwBall()`), and check state through the rules' own reading, as the
  testing skill shows.
- **The shell binds, it doesn't compute:** every panel's figures are
  `computed()` view models over the game's signals.
- **Accessibility:** the panels are regions with headings, never live
  regions and never in the keys' order; the announcer says a star won and a
  gate opened; every flourish is off where motion isn't welcome.
- **Nothing ships unseen.** A package that changes what a player sees looks
  at it in a browser before its last commit, and says what it saw.

---

## 9. Budgets and checks

**Each commit's checks,** from `frontend/`, before its review, as the
`commit-review-process` skill asks:

- each touched workspace's `lint`, `typecheck` and `test`, the tests with
  `--maxWorkers=6`, so four streams at once hold the machine;
- the root's `yarn lint`, which checks the skills' and `AGENTS.md`
  references, the constraints, the lockfile and the formatting, and runs
  every workspace's lint at once; it runs under a lock all the streams
  share (`flock /tmp/bbu-root-checks.lock`), so no two run it together;
- where the commit changes a library, the root's `yarn typecheck` and
  `yarn test`, under the same lock, since other games use the entry;
- at a package's last commit that touches the rules or the view, the
  workspace's coverage, held to its floor.

To format, never `yarn prettier`, which rewrites the whole repository, but
`node_modules/.bin/prettier --write` over the files changed. The
integrator runs the root's `yarn lint` again on each rebased branch, and
`yarn verify` and `yarn check:layout` at each wave's end (§7.5).

**Budgets:**

- **The simulations.** Brick Breaker's `sim` specs took 8.7 s for the
  thirty levels at the start, with six workers (10 s with Vitest's start),
  and its `pure` and `dom` specs 7.5 s with eight. Fifty levels may take two
  thirds again. Past 20 s for `sim`, the package that crossed it says why in
  its log.
- **A level's time.** The autopilot clears every level in eight minutes and
  its last three bricks in one, at every speed, as now; a new level's middle
  time at Relaxed stays under 2:00, or the report marks it.
- **The atlas** stays inside 4096 px a side at a unit of 54 device pixels,
  which the art spec holds.
- **The coverage floor** holds: 100% of statements, functions and lines and
  95% of branches over the rules and the view.

---

## 10. Risks to the build, and what answers them

| Risk                                                         | What answers it                                                                                                                                    |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| The autopilot can't clear a draft level in time              | The level is redrawn, and the redraw measured; a kind it can't be taught at all is dropped rather than shipped unproven, as `plan.md` says         |
| Lifting Brick Fuzz Pop's art changes its look                | Its art specs pass unchanged; numbers the games differ by are parameters                                                                           |
| Two streams edit one shared file                             | §7.3's ownership, small additions in their own places, the integrator's rebase                                                                     |
| Another session's work sits uncommitted in the main checkout | Nothing is done there; the branch lives in its own worktree, and the merge touches the main checkout only by a fast-forward that its changes allow |
| A sealed room holds a ball for good                          | C19's nudge, and K4's report of the longest time between two touches of the paddle                                                                 |
| The marks are the autopilot's, not a player's                | They are set by one rule, and noted for the user to play by hand                                                                                   |
| Four agents at once starve the specs                         | Six workers each, the root's checks one at a time under a lock, and the integrator holds a fifth package until a slot frees                        |
| `main` moves under the branch                                | The integrator rebases onto `origin/main` at each wave's end, and again before the merge                                                           |

---

## 11. Finishing and merging

The user asked for the work log to be deleted, the work merged into `main`
and pushed, once it is done. So, after Z1:

1. The plan, this file and the folder's assets move to
   `docs/archive/brick-breaker-uplift/`, with an "As built" section here
   saying what the build decided that the sections above don't, and what
   it left for the user.
2. `docs/brick-breaker-uplift/worklog/` is deleted.
3. The `merge-to-main` skill: `yarn verify:full` and `yarn check:layout` on
   the tip, the change's own code covered, then a fast-forward push to
   `main`, the local `main` brought up to it where its checkout allows, and
   the stream branches and worktrees removed.

---

## 12. As built (2026-11-14)

Built on 2026-11-14, on the branch `brick-breaker-uplift`, cut from `main`,
in a day: twenty-five packages in five waves and the finish, up to four
agents at a time, each in a worktree of its own; every commit reviewed by a
fresh agent before it was made, but for one delta of Z1's rebase, reviewed
after it landed; and each package rebased onto the tip and checked there,
by its agent or the integrator, before the branch fast-forwarded to it. The
sections above are the plan as it was written; the design in `plan.md` is
as it was when the build began. This section holds what neither says:
where the build left the packages, what the work logs decided that a later
change could trip on, the numbers, and what was left for the user. The
logs were deleted before the merge, as the user asked; they are in git's
history under `docs/brick-breaker-uplift/worklog/`, at the commit before
the one that moved this folder here. Like the rest, this describes the code
as it was, so check a path against the tree before following one.

### Where the build left the packages

- **Four packages more than §6 planned, and one fewer.**
  - L5 (the bad capsule's gold lip and the Seeker's symbol) was folded into
    L3, since both redraw the capsules and R2 had landed.
  - F3 split in two: F3a, Friends' voices and the seeker's cue, while F2
    waited on L3; and F3b, Machines' voices, after K3.
  - The integrator added P4, for P3's and L3's follow-ups: the Cleared
    card fitted to a small field and held there by `check:layout`, the
    placeholder's rim and the focus ring at the rim's width, and the
    "a, b and c" join lifted.
  - The integrator added L8 and F4, lifts for the user's ask to share code
    between the games: `fuzzballWearing()` and `wornSparks()`, and
    `withBurst()`.
- **L4 ran in a worktree of its own beside L3,** since nothing else was
  free to start and it touched little L3 did.
- **Z1 dropped the friends' faced frames,** which the atlas held and
  nothing showed, and `facedBallFrame()`, which only specs called. Its read
  through the docs was two fresh audits against the code, one of Brick
  Breaker's `AGENTS.md`, `README.md` and skills, one of the shared docs the
  branch changed; every finding was fixed but one, the deck's example
  spare, right as an example. It took the site's screenshots again on the
  uplift's look, the thumbnail now the whole page, as the preview is, since
  a crop of its shape around the field and the panels would take in part of
  the game bar; the screenshot `plan.md` shows of the game before is kept
  beside it, as `before.webp`.
- **The art kept here is as it was drawn.** `art/make-art.mjs` draws
  `field.svg`'s next level from the game's level data as it is now, which
  the build changed, so running it again changes that sheet.
- **K3 ran in another order:** the bumper with Pinball (41), the nudge off
  anything that can't break coming with it, then the portal with Wormhole,
  then the slider with Conveyor (42) last, so its offset landed on L3's
  brick painter and F2's drop-in. Wormhole moved to 43.
- **Bumpers and portals are discs, not slabs,** against §5.2. The travel
  alone opens a round cell, so the seeker and the autopilot still take one
  as blocking their sight.
- **The lifts beyond §4's four:** `slabFace()` in `@fz/phaser/bricks` (L2);
  `settledPictures()` in `@fz/phaser/canvas`, both boards' pictures taken
  through it (P3); `board-focus-ring()` showing while an inner application
  has the focus, Brick Fuzz Pop's board taking it too (P3); an outline star
  icon in `@fz/ui`, since an unwon star must differ by shape (P3);
  `listed()` in `@fz/core/format`, called by Brick Breaker, Brick Fuzz Pop
  and Sudoku (P4); `withBurst()` in `@fz/dev/sounds` (F4);
  `fuzzballWearing()` and `wornSparks()` in `@fz/phaser/fuzzball`, Brick
  Fuzz Pop's `outlinedWith()` and Brick Breaker's `streakBallCommands()`
  gone (L8); `cagedFriend()` taking an optional fur (L6); and `deltaE()` in
  `@fz/style/testing` (L7). L1's, L2's and L8's lifts, which touched Brick
  Fuzz Pop's drawing, were each held by hashing every frame of its atlas
  before and after, 235,200 frames over four palettes, units 1 to 140 and
  six pixel ratios; none differed. Brick Breaker's 846,720 held the same
  through L8. L6's fur is an optional argument, which Brick Fuzz Pop's
  calls don't pass, so they draw as before.
- **The kit's numbers moved where they failed the contrast spec,** among
  them steel's frame and rivets at 60% black (the kit's 34% gave 1.9:1), the
  shown ghost 12% toward white in light palettes, and the slider's trail
  chevrons at 45% of its tint (55% fell under 2:1).
- **Nothing of Machines' three kinds is left out under 15 CSS px a unit,**
  against the brief: a portal's badge must show at every size, and a slider
  without its chevrons can't be told from a plain brick. Drawn at 11 and
  12 px in every palette, each reads whole.
- **The slider's step is silent,** a metronome no player started.
- **The Cleared card is set smaller over a field under 380 CSS px tall**
  (P4): its stars across, its words kept for a screen reader, 262 px
  inside the field at every shape, where it was 299 over a 285 px field at
  568 × 320.
- **The place's tile is a layer second in `layers.ts`,** not last, since a
  layer's depth is its place in the list; the page's tile is rebuilt at
  each layout, in 0.8 to 1.7 ms.
- **Phaser's Web Audio path clamps no detune,** so the streak's top note,
  1900 cents, plays as asked (1762 Hz for 1759), past the ±1200 its doc
  comments give.
- **Phaser's `phaser-text-and-bitmaptext` skill** was copied in beside the
  others, as the streak's count is a Phaser `Text`.

### What the logs decided

- **Every field a stream adds to `Ball` is set in the cage's
  `releaseBall()` too** (`seeks`, `portalled`), which repeats the other
  balls' reset, with a doc comment saying so.
- **The seeker turns toward the nearest needed brick it can see above it**
  (`inSight()` in `grid.ts`, the autopilot's sight test), not the plain
  nearest, which sent balls into steel and plates' undersides and failed
  Mushroom's `sim` spec at Relaxed.
- **`SAVED_GAME_VERSION` rose once, to 2,** for the whole branch: the pay
  (`darePoints`), the gates, the best streak, and each slider by its home
  with its cell and heading.
- **A level's `mark` is required in its data,** set by R3's rule from the
  autopilot's streaks.
- **A broken brick doesn't stop a train of sliders,** and the brick painter
  carries a move under way along a slide (`carryMove()`).
- **A plate clanks only when struck from below,** so a player hears whether
  a ball did harm.
- **`VOICES` in `effects.ts` gives a kind a sound of its own,** and the
  effects spec keeps every event's and kind's sound in records the
  compiler holds whole, so a new kind adds its sound. `build-sounds.spec.ts`
  holds the committed sprite to what the script writes.
- **A lost ball fades in the frame it flew in,** its kind, its ink and the
  streak's fur (`BallPainter.drawnStreak`, since the rules reset the streak
  as the last ball goes).
- **The last brick's hit is held 120 ms before the clear's chord,** with
  motion reduced too; none of the other flourishes plays without motion,
  and the bricks stand in place from the first frame.
- **The bricks drop in at once at any key but a shortcut or a repeat.**
- **Stars are won at any speed,** Custom and the debug menu's scales among
  them, as a run's records are at any of them.
- **The Ready card rises over the bricks where it is too tall for the
  gap,** its foot held clear of the ball by `check-layout.mjs`; a compact
  panel's parts are each one element, since the rule hides children past
  the second that isn't an `<h2>`.

### The numbers

- **What the game holds:** fifty levels in five sets, where it had thirty in
  three; fourteen kinds of brick, the cage, plated brick, key, gate,
  bumper, portal and slider among them; twelve capsules, the Seeker new;
  and seventeen sounds, where it had ten, each new one quieter than the
  brick's hit, measured on the built file, and those before them written
  again byte for byte.
- **Specs:** Brick Breaker's 1,820 in `pure` and `dom` and 180 in `sim`
  before; 3,914 after, 300 of them `sim`, which plays all fifty levels at
  every preset speed. Coverage, `dom` and `pure` together, at the tip
  before the merge: 99.57% of statements, 97.34% of branches, 99.78% of
  functions and 99.93% of lines.
- **The levels at twelve seeds** (`report:levels --seeds 12`,
  [`levels/report-k4.txt`](levels/report-k4.txt)): every level cleared in every
  play, no endgame past the limit (`!`), and no play gone a minute between
  two touches of the paddle (`^`); Lanterns (18) alone is marked `+`, its
  middle time at Relaxed 2:01. The twenty new levels' middle times at
  Relaxed run from 0:25 (Reunion, 40) to 1:37 (Mushroom, 32).
- **The marks** (`report:levels --marks`): 35 of the fifty at the floor of
  5; the highest Fuse's (13), 30, then Low bridge's and Storm's, 20.

### What was left for the user

- **No one has played the uplift by hand.** The autopilot and scripted
  input have played every level; the marks are the autopilot's streaks,
  not a player's, and the flourishes' times and the sounds' levels are
  first choices. Play it, and set the marks again where they feel wrong.
- **Mushroom (32):** about 1% of its plays still have an endgame past a
  minute, in every version tried, since neither the autopilot nor a seeking
  ball aims at a plate; the fix would be in `autopilot.ts` or `seeker.ts`.
  On the tallest field, one play at Relaxed spent 2:11 over its last bricks
  (`!`, [`levels/report-k4-tallest.txt`](levels/report-k4-tallest.txt)).
- **Grand machine (50) breaches §9's budget for the last bricks:** one
  play at Relaxed past the endgame's limit at twenty seeds (1:31) and one
  on the tallest field (2:12), the roof bricks over its strongrooms left
  last; 7 of its 300 plays at Relaxed ran an endgame past a minute. It was
  kept as drafted, as no variant of its roofs and strongrooms did better by
  more than chance.
- **Spiral (27) and Finale (30)** each have one play at Relaxed past the
  endgame's limit at twenty seeds (`!`,
  [`levels/report-k4-seeds20.txt`](levels/report-k4-seeds20.txt)), which the
  twelve-seed report doesn't reach.
- **Lanterns (18) shows `+`,** 2:01 at Relaxed, since R2's seeker moved it
  from 1:58: a level of the thirty, so §9's leave to mark a long new level
  doesn't cover it.
- **No level lays a two-hit plated brick:** Pachinko, the only draft to
  lay one, dragged its endgames with cups of two hits. The kind still takes
  one or two (`U` two), and How to play, the Ready card and "In this level"
  picture it at two hits, its line saying "one or two hits", so a player on
  any of the five levels with plates (Mushroom, Stepping stones, Trellis,
  Tilt and Pachinko) is shown a plate unlike the level's. Draw a level with
  `U`, picture the kind at one hit, or drop `U` from the legend.
- **A key whose hit clears its level records no `opened`,** so its gates
  vanish during the last brick's hold rather than opening; no level comes
  to it.
- **In Soft pastel the bumper and the first portal pair are both violet,**
  told apart by shape.
- **The panel's "In this level" shows each kind in How to play's picture,**
  so a plain brick is red there whatever the level's tints.
- **The last level's stars aren't on the result card,** which the plan
  doesn't ask for.
- **Follow-ups not taken, among them:** a library export of
  `@fz/dev/layout`'s `PHASER_SHAPES`, which the layout check's `CLEARED_AT`
  rebuilds; a lift of cutting a slab below a line (Brick Breaker's
  `plateCut()`, Brick Fuzz Pop's plated `outlineOf()` and `cutAt()`), which
  would move Brick Fuzz Pop's numbers; the crack cut out of a brick, likely
  too thin to lift; Asteroid Breaker's sounds, which write the burst out by
  hand with no spec on its sprite; a library helper for the sound spec both
  brick games repeat; and `FieldEventLog.add()`'s eight arguments in a row,
  kept, as the log's ring is filled in place and an options object would
  make one at every event.
