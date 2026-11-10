# Work log: Brick Fuzz Pop, proof stream

The proof stream's packages as they are built, from
[`implementation-plan.md`](../implementation-plan.md): L2 and L7 in Part 1,
and R5, P1, R7, P2 and P3 in Part 2.

## Part 1

### L2: `phaserGameLayers({ exact })`, arithmetic every engine rounds alike

**2026-11-10.**

**What was built.**

- `deterministic(files, { exact = false } = {})` in
  `frontend/lib/dev/src/eslint.ts` keeps one list for each rule it sets.
  `no-restricted-properties` takes its three entries from
  `NONDETERMINISTIC_PROPERTIES`, and `no-restricted-syntax` adds
  `INEXACT_SYNTAX` to its two `Date` entries when `exact` is on.
- `INEXACT_SYNTAX` is the plan's allowlist, five selectors, each with a
  message saying why and naming the ten exact functions (`EXACT_MATH`):
  - every non-computed member of `Math` but the exact functions, `Math.PI`
    included;
  - a computed member of `Math`;
  - `VariableDeclarator[init.name="Math"]`;
  - `**`;
  - `**=`.
- `phaserGameLayers()` takes `exact` and splits the old
  `deterministic(["src/view/**/*.ts", ...held])` call. The view gets a block
  of its own, never exact. The rules and the held files share one block,
  exact when asked. No game turns it on.
- A private `rulesLayer(held, exact)` builds the rules' fence and that
  block. `gameRules()` is `rulesLayer([], false)`, and `phaserGameLayers()`
  ends with `rulesLayer(held, exact)`, so a Phaser game takes `gameRules()`'s
  blocks by construction.
- `frontend/lib/dev/AGENTS.md` names the option, says what it refuses and
  why its refusals join `deterministic()`'s lists. It also says that lint
  covers only the files it reads, so `@fz/core` keeps to exact arithmetic
  by its own review and specs.

**Choices the plan didn't make.**

1. **`Math.random` and `Math.imul` pass the allowlist's selector.**
   `no-restricted-properties` refuses them already, with a reason of their
   own. Without this, each would get a second message about exact
   arithmetic. The names come from the same list as the properties rule's
   entries (`MATH_LET_BY`), so the two can't drift apart.
2. **The first selector is limited to non-computed members**
   (`[computed=false]`). Otherwise `Math[name]` would match both it and the
   computed selector, and be reported twice. `Math["sqrt"]` is caught by
   `typescript()`'s `dot-notation` already, so the spec tests the computed
   form by a value (`Math[name]`).
3. **`gameRules()` and `phaserGameLayers()` share `rulesLayer()`.** Before,
   `phaserGameLayers()` called `gameRules()`. Calling it and then adding a
   complete exact block for the rules would lose nothing, but its first
   `deterministic()` block would be overridden for every rules file. Both
   now build from one helper. That moves the rules' fence after the other
   fences, which changes nothing for any game, since no other fence covers
   `src/rules/`.
4. **The view's block comes before the block for the rules and held files.**
   So a held file inside `src/view/` still keeps to exact arithmetic. The
   mutation pass found this needed a spec of its own (below).
5. **What the selectors don't catch.** These get past the plan's selectors:
   - `Math` passed as an argument (`f(Math)`);
   - `Math` assigned to a variable declared earlier (`M = Math`);
   - `Math` destructured in an assignment (`({ sin } = Math)`) or a default
     parameter (`function f({ sin } = Math)`).

   A rules file doing any of these would be odd, and the review would see
   it. A wrapper such as `Math!.sin(1)` or `(Math as typeof Math).sin(1)` is
   caught by `typescript()`'s `no-non-null-assertion` and
   `no-unnecessary-type-assertion`, checked by a throwaway spec.
   `Math.clz32()` is exact but refused, since the allowlist is the plan's:
   it stays refused until someone checks it in.

**Checks.**

- `@fz/dev`: `lint` and `typecheck` clean. `eslint.spec.ts` has 127 specs,
  46 of them new. Over the whole library, 522 specs pass. `test:coverage`
  gives 95.9% statements, 95.23% branches, 97.15% functions and 96.11%
  lines, against floors of 93, 95, 95 and 93. `eslint.ts` is at 98.55 /
  96.55 / 100 / 98.43, with only one line uncovered, as before: `angular()`'s
  throw for a missing processor.
- Each game's `lint` is clean and unchanged: Snake, Brick Breaker and
  Asteroid Breaker, which use `phaserGameLayers()`, and Minesweeper and
  Sudoku, which use `gameRules()`.
- The root's `yarn lint` passes.

**The mutation pass.** Twenty-one mutations to `eslint.ts`, each run against
`eslint.spec.ts`, and run again after the review's fixes. Each of these was
killed:

- each name dropped from or added to the allowlist;
- the regex left unanchored, killed by a made-up `Math.signbit()`;
- `[computed=false]` dropped, and the `:not()` dropped;
- each of the five selectors dropped;
- `random` and `imul` taken off the selector's let-by list;
- `exact` on by default, in `deterministic()` and in `phaserGameLayers()`;
- the exact entries always added, or added only without `exact`;
- the held files left with the view, or left out of the rules' layer;
- the view held to exact arithmetic;
- the rules' fence dropped;
- `gameRules()` made exact, killed by a spec added for it after the
  review's restructuring;
- exact as a later block of its own. That is the replacement bug, and the
  `new Date()` and `Date()` cases kill it.

On the first pass one mutation survived: the view's block placed after the
rules' block. The spec "holds a file held as the rules are to exact
arithmetic in the view's folder too" now kills it.

**Numbers.** `eslint.spec.ts` runs in about 5 s, at about 35 ms a case,
each linting the files it writes into a folder of its own. The five games'
`lint` took 8 to 21 s each.

**The review:**

1. **The "as before" spec checked only part of the table it copied.** Under
   `exact`, nothing checked the globals or the view. Fixed: the existing
   table, with a `Date()` row added, and the global `Phaser` case now run
   for the rules and the view under `describe.each`, once as every game has
   them and once with `exact`. The partial copy is gone.
2. **The doc comment on `PhaserGameLayers.exact` broke the doc rule.** It
   ended on a dangling "besides", and its first paragraph had two
   sentences. Fixed: one sentence, with the view in a paragraph of its own.
3. **`phaserGameLayers()` built the rules' blocks itself.** So "takes the
   same" held only by convention, and the log overstated the reason.
   Fixed: `rulesLayer()` is shared by both functions, the docs say "takes
   it within" again, and choice 3 above is corrected.
4. **`AGENTS.md` overstated what `exact` guarantees.** Fixed: a sentence
   saying lint covers only the files it reads, and what the rules call of
   `@fz/core` keeps to the same arithmetic by that library's review and
   specs. It doesn't name `@fz/core/sweep`, which L1 builds in another
   stream.
5. **The `AGENTS.md` diff was mostly reflow.** Fixed: the original line
   breaks are back. Only the bullet's first line changes, now 85 columns
   (the file has another of 85), with the new text added at the bullet's end
   and one sentence of "How a workspace uses it" rewrapped.

### L7: `@fz/dev/layout`, a deck's zones all or none

**2026-11-10.**

**What was built.**

- `PhaserDeck` in `frontend/lib/dev/src/board_page.ts` gains `allOrNone`.
  T1 sets it for Brick Fuzz Pop's DOM panels, which show only where the
  window has room for both.
- `inspectPhaserDeck()` skips its check for missing zones when the deck is
  shown all or none and lists nothing. Every other check runs as before:
  each zone listed once, on the canvas and in the window, clear of the
  board, each other and the bar's controls, and at least `least` across and
  down.
- Asteroid Breaker's check names no `allOrNone`, so its deck is held to
  every zone as before.
- `PhaserDeck`'s and `inspectPhaserDeck()`'s doc comments say so, and so
  does the deck's paragraph in `frontend/lib/dev/AGENTS.md`.

**Choices the plan didn't make.**

1. **"None" is a deck that lists no entry at all.** That is the empty
   attribute `@fz/phaser/layout`'s `namedRectsAttribute([])` writes, or one
   of blank entries only, which `readNamedRects()` leaves out. An entry the
   inspection can't read still counts as listed. Then the
   deck is held to every zone, and the unreadable entry is reported too.
   Counting only the zones read would let a deck whose one entry is garbled
   pass as showing none, with the garbled entry the only report.
2. **A missing attribute is still a problem.** A deck shown all or none
   must say so with an empty list, so a board that forgot to write its
   attribute is still caught.
3. **The message for a missing zone is unchanged.** When some zones are
   shown, it is "The deck shows no buttons zone.", once for each zone
   missing, as for a deck that always shows.
4. **`allOrNone` is typed `boolean`, not the literal `true`.** It is left
   out where it doesn't hold, as the repository's optional properties are.

**Checks.**

- `@fz/dev`: `lint` and `typecheck` clean. `board_page.spec.ts` has 104
  specs, 7 of them new: three decks shown all or none that pass (none
  listed, only blanks listed, all shown) and four that are reported (some
  shown, a lone unreadable entry, no attribute, a zone over the field).
  Over the whole library, 529 specs pass.
- `test:coverage` gives 95.91% statements, 95.27% branches, 97.15%
  functions and 96.12% lines, against floors of 93, 95, 95 and 93.
  `board_page.ts` stays at 100% on every measure.
- The root's `yarn lint` passes. No game's code or config changed, so no
  game's checks were run again.

**The mutation pass.** Nine mutations to the new condition and the attribute
check, each run against `board_page.spec.ts`, and all nine killed:

- `allOrNone` ignored;
- every deck treated as shown all or none;
- a deck shown all or none never held to every zone;
- `||` made `&&`;
- `allOrNone`'s sense flipped;
- "present" counted by the zones read, not the entries listed, killed by
  the case of a lone unreadable entry;
- "present" only past one entry, or always;
- the missing attribute let pass for a deck shown all or none.

No survivors.

**The review:**

1. **The `allOrNone` doc didn't say what the check gives up.** A board that
   never shows its panels passes the library's check at every shape, so
   only the game's own inspection can hold where they must show. Fixed: a
   second paragraph on `allOrNone` says so. `AGENTS.md` now says the game's
   inspection checks that the deck shows where there is room, and not
   elsewhere. T1's inspection already plans to: panels where 184 px a side
   are spare, and not where they aren't.
2. **A deck was still defined as thumb zones the canvas draws.** That
   contradicted the new option, which is for DOM panels. Fixed: a deck is
   now "the zones laid over a board's canvas beside the board, such as a
   touch screen's stick and buttons, or a wide room's panels". This is said
   in `PhaserDeck`, in `PhaserBoard.deck`, in `inspectPhaserDeck()` and in
   `AGENTS.md`. `least` is the least "such as a thumb needs".
3. **The new clause in `PhaserDeck`'s paragraph read badly.** Fixed: the
   paragraph is rewritten as the review proposed. The `before()` setting is
   now tied to a deck shown only on a touch screen.
4. **The log's choice 1 implied `namedRectsAttribute()` writes blanks.** It
   writes only the empty attribute. Fixed: choice 1 says the blank entries
   are what `readNamedRects()` leaves out.

All four are documentation only; the code and the specs are unchanged, so
the change had no second review.

## Part 2

### R5: the wall

**2026-11-10.**

**What was built.** `src/rules/wall/lower.ts`, beside K2's `wall.ts`:

- `lowerWall(wall, depth)`, the wall's step after a round, as plan.md's
  "The wall" orders it: moss grows back a hit (`regrow()`); the wall comes
  down a row, or a jump's rows once no brick the level needs stands below
  the jump line; each brick the level doesn't need that reaches the floor's
  row (field row 0 or under) sinks, a portal with its twin; and the level is
  lost if a brick it needs reaches that row. It returns a `LoweredWall`:
  the wall come down, `rowsDown`, `jumped`, the cells that sank (`sunk`)
  and `lost`.
- `isCleared(wall)`: no brick the level needs is left, in the field or
  waiting over the ceiling.
- `regrow(wall)`, the hook for moss, which returns the wall as it is until
  X3 catalogs moss.
- `lower.spec.ts`: walls drawn as rows of the legend's characters keyed by
  the field row they stand in, at every depth from 11 to 22: a step while a
  needed brick stands under the jump line, a jump once the lowest stands at
  it, a jump that never loses the level and lands it where a level opens,
  jumps following one another as each round after a jump clears the lower
  two-thirds, steel and portals below the line not stopping a jump, a jump
  while every needed brick waits over the ceiling, and a portal's twin
  waiting there sinking with it as the wall jumps. Then, on a field 11
  deep, the floor's row and the row over it for steel and for a needed
  brick, a twin that reaches the floor first as the wall steps, each sunk
  brick named once by cell, the cells kept, a
  cleared wall left standing, the input untouched, a depth refused, and
  every kind of the catalog cleared or not by whether a level needs it.
- The spec also brings each of K2's eleven hand-made rounds' walls down:
  the wall its flight leaves (its next wall, with each brick it didn't
  break back from its start) comes down to the next round's wall, rows
  down, jump and result the fixture has. All eleven agree.

**Choices the plan didn't make.**

1. **The functions have a file of their own,** `wall/lower.ts`, so K2's
   `wall.ts` stays the integrator's contract file, unedited.
2. **A cleared wall stays where it stands:** `lowerWall()` returns it as it
   is, with `rowsDown` 0 and no jump, as `RoundOutcome.rowsDown` says ("none
   once the level is cleared"). So the function is right for every wall,
   and R6 asks `isCleared()` only for the round's result.
3. **`lowerWall()` calls `regrow()` first,** once it knows the level isn't
   cleared, and reads the jump and what sinks from the wall it returns,
   since plan.md puts moss before the wall's coming down and nothing lowers
   a wall without it; R6 calls one function. `regrow()` is the identity: a body that read the `regrows`
   trait would be code no spec can reach until a kind has the trait, under
   the rules' 100% floor. X3 fills it in and specs it.
4. **A portal is a brick with a twin,** as `Brick.twin`'s contract says,
   not a kind: the portal isn't cataloged until X2. The specs stand steel
   with a twin in for a portal (`withPortals()`), and steel in for a bumper,
   which `lowerWall()` reads only as a kind the level doesn't need. X2 can
   draw them with their own characters once they are cataloged.
5. **`sunk` lists each cell once, by cell,** so a pair of portals
   reaching the floor together is named once each, and the order doesn't
   hang on the order a `Set` was filled in (§5.6).
6. **The jump is decided before the step,** by the lowest needed brick's
   field row against `thirdsOf(depth).jumpLine`, as the sketch's
   `lowestNeeded(s) >= s.D - jump` does; a lost level's wall still comes
   down and keeps its bricks in the floor's row, as K2's `lost` fixture has
   it.
7. **A depth no field has throws,** as `thirdsOf()` does, rather than
   lowering by a made-up third.
8. **The specs draw their own walls** (`wallOf()`), since R1's
   `src/testing/wall_picture.ts` isn't written yet; R6 or a later package
   can move them onto it.

**Checks.** The workspace's `lint`, `typecheck`, `test` and
`test:coverage` pass: 540 tests in 13 files, 113 of them new; the rules and
the view at 100% of statements, branches, functions and lines, `lower.ts`
among them. The root's `yarn lint` passes.

**The mutation pass.** 31 mutants of `lower.ts`, one at a time, each run
against `lower.spec.ts`: the jump line's bound (strict, a row low), the
step and the jump (two rows, a row short), the floor's row (a row lower, a
row higher, the clamp dropped), the twin left standing, `sunk` unsorted,
the level never lost or lost by a needed brick anywhere, `needed` flipped,
the cleared branch dropped or stepping or jumping, the lowest row found by
`ceil` or ignored or the highest needed brick's, needed bricks sinking,
empty cells sinking, the wall going up or staying, `jumped` never set,
sunk bricks kept, `isCleared()` inverted or always true, the rows dropped,
and `regrow()` skipped; then the review's three: the lowest needed brick
looked for only in the field's rows, a wall cleared when the field holds
none, and a twin over the ceiling kept. 30 were killed, the review's three
only by the specs it asked for. The one survivor, `regrow()` skipped, is
equivalent while `regrow()` returns the wall as it is; X3's moss specs
kill it.

**The review:**

1. **No spec brought down a wall whose needed bricks all wait over the
   ceiling,** so looking for them only in the field, or calling such a wall
   cleared, passed every spec where plan.md wants a jump. Fixed: a spec at
   every depth jumps such a wall, sinking the steel in row 1; the two
   mutants are killed.
2. **The twin spec at every depth was one check twelve times,** a step
   under every depth's jump line. Fixed: it now sinks a portal in row 1 and
   its twin waiting over the ceiling as the wall jumps; the step's twin is
   the spec on a field 11 deep.
3. **The doc comments didn't match the code.** `lowerWall()` read the jump
   from the wall before `regrow()`, against the order `regrow()`'s doc and
   plan.md give; its doc said it returns a wall; `sunk`'s said "the lowest
   first" for an order by cell. Fixed: `lowerWall()` asks `isCleared()`,
   then regrows, then reads the jump and the floor's row from the regrown
   wall; the docs say what it returns, and "by cell".
4. **The specs' bricks didn't match their pictures or the contract:** a
   lone steel brick had a hit, a portal stood in for a drawn tough brick,
   and `brickOf()` dropped the legend's plates. Fixed: `wholeBrick()` gives
   a kind its fewest hits, none for one that never breaks; the portals
   stand on cells drawn as steel; `brickOf()` hands the plates on.

### P1: the legend and Warm-up

**2026-11-10.**

**What was built.**

- `src/rules/levels/warm-up.json`: `docs/brick-fuzz-pop/levels/warm-up.json`,
  copied as it is: nine levels, each an id, a name, a boon and a picture of
  its wall, top row first.
- `levels/level.ts`: `Level`, a level ready to play (its boon, its wall's
  bricks by wall cell and its rows), and `levelStart(level, depth)`, the
  `RoundStart` a level opens with: its wall's lowest row on
  `thirdsOf(depth).opensOn`, the fuzzball at `FIRST_X`, no friend, no boon.
- `levels/levels.ts`, after Brick Breaker's: `LevelData`, `LevelSetData`,
  `LevelEntry`, `LEVEL_SETS` (Warm-up), `levelsOf()`, `LEVELS`, the rules'
  numbers (`WALL_ROWS`, 12 to 40; `MOST_AIR`, 2; `TWIN_ROWS`, 4) and
  `parseLevel(data)`. It refuses, naming the level and what is wrong: a key
  no level has (`unknownKey()`), a boon that isn't one, a wall of too few or
  too many rows, a row not nine long, a character the legend lacks, a
  highest or lowest row of air, three rows of air together, a portal mark
  used other than as one pair, a pair more than four rows apart, a second
  pair with no first, a row of steel from side to side that is neither the
  top row nor in the top course with a portal past it, and a kind no set
  has brought in yet. It lays the wall out from its lowest row up, each
  brick whole, a portal's twin the other cell of its pair.
- `levels/legend.ts` gains `PORTAL_MARKS`, `["@", "&"]`, a wall's first
  pair's character and its second's; `TINTS`, 8; and `tintOf(character,
wallRow)`, a brick's ink as answer 4 has it: a plain or tough brick its
  row's, the eight in turn from the wall's lowest row up, a portal its
  pair's mark, every other kind 0.
- `shot.ts` gains `isBoon()`, over a private record of every boon, so a boon
  added to `Boon` fails to compile until it is known. This adds a name to a
  K2 contract file.
- `levels.spec.ts`: `parseLevel()` laying out every cataloged character, the
  rows from the lowest up, the tints, the specials' own inks, every refusal
  by its message, and the portals' rules kept up to the refusal of their
  kind; `levelsOf()`; the reach check's own specs; and every level held to
  "The rules a level keeps": it parses, its id and name are its own (and
  each set's id), its wall is the draft's (rows, bricks needed and hits, as
  plan.md's table has them), no needed brick is sealed in, it holds no more
  than six cages, its lowest row needs nothing of more than 3 hits and isn't
  a row of plates facing the floor, and it uses no kind before the level
  that brings it in, each cataloged kind brought in at the level its
  `firstLevel` names. `level.spec.ts` holds `levelStart()` to plan.md's
  table at every depth, its level drawn with R1's `wallFrom()`.
  `legend.spec.ts` holds `tintOf()` for every character of the legend, the
  cases drawn from the legend by kind.
- **The reach check** (`sealedIn()`, in the spec, as Brick Breaker's
  `shutIn()` is): a fuzzball floods in from the open row under the wall, a
  cell at a time across or up and down, through every cell but a solid
  kind's that never breaks, over the wall's top row, and from a portal on out
  of its twin; then each zapper it reaches zaps the cells its pattern and
  reach give, through steel, setting off each zapper there in turn. A
  round's zaps all land in the field at once, so each chain is held to a
  window of 10 wall rows (`ZAP_ROWS`, 9, the most rows apart the row over
  the floor's and the row under the ceiling stand in the shallowest field),
  every window tried from the wall's lowest row up. A needed brick neither
  flooded nor zapped is sealed in. Its specs: a brick boxed in steel, one
  boxed with its corners open, one reached over the top row, one zapped
  into, one zapped into by a zapper a zap set off, a zapper boxed in with the
  brick it would zap, a brick a zap misses, a brick 9 rows over a column
  zapper reached and one 10 rows over sealed, and a brick a chain of zaps
  reaches only past the shallowest field's ceiling, sealed.
- **R5's `lower.spec.ts` draws its walls with `wallFrom()`,** as the
  integrator asked once R1 had landed: its `wallOf()`, which keys rows by
  the field row they stand in for the specs at every depth, now builds a
  picture for `wallFrom()`, its own `brickOf()` is gone, and it takes
  `cellAt()` and `fieldRowOf()` from `grid.ts`. `lowerWall()` reads the
  lowest needed brick's row with `fieldRowOf()`.

**Choices the plan didn't make.**

1. **No level legend of its own and no grid of tints.** plan.md's "The
   levels" allows both, as Brick Breaker's levels have them, but no draft of
   the 36 uses either, and the shared legend names every kind at every hit
   count the catalog allows (C12). `unknownKey()` refuses `legend` and
   `tints`, so a level that wants one fails loudly until the package that
   draws it adds them.
2. **`parseLevel()` holds the first four rules but for ids and names no
   other level has,** which one level can't show; `levels.spec.ts` holds
   those over every level. It also refuses a kind no set has brought in yet,
   as a `Brick`'s kind must be cataloged.
3. **The portals' rules are read from the picture's characters, before the
   kinds,** so they are specced now, though a wall with a portal is refused
   for its kind until X2 catalogs it, and X2 needs no change to
   `parseLevel()`. "Two pairs at most" is the legend's two marks; a mark
   used once or three times, or `&` with no `@`, is refused, so a wall's
   only pair always takes the first mark, as `Brick.tint` says.
4. **"A full row of steel only in a wall's top course: over everything, or
   with a portal past it"** reads as: the wall's top row, or a row with no
   air over it and a pair of portals, one under it and one over it.
   Wormhole and Bank vault, the two drafts with such a row, keep it.
5. **"No lowest row of plates facing the floor"** reads as: the lowest row's
   needed bricks are not all plated toward the floor. A lowest row with no
   needed brick, as Girder's of steel and air, passes, as it did the plan's
   check of the 36 drafts.
6. **Tints by kind:** the brick and the tough brick take their row's tint,
   as the art's `InkedKind` and the fixtures have it, rather than reading
   "no traits" off the catalog. `tintOf()` is the legend's, so the rules
   say it once; R1's `wallFrom()` still works it out for itself, with its
   own `TINTS`, and could take it from here.
7. **Errors name the picture's rows from the top,** as the file lists them,
   though the wall counts its rows from the lowest.
8. **The flood fill is the spec's own,** as Brick Breaker's is; the plan's
   check of the 36 drafts wasn't kept. It counts the row under the wall and
   the row over it as open, moves across or up and down only (a fuzzball
   can't pass between bricks that touch at a corner), runs a zap as far as
   its kind's `reach`, a chain within `ZAP_ROWS` of its lowest row, and a
   blast its eight ways. Only the row and column zappers are cataloged, so
   its portal hop, its cross, X and blast ways, and plated bricks (which it
   floods as any brick that breaks, whichever face is plated) are written
   but not yet specced: **X1 and X2 spec `sealedIn()` for the kinds they
   catalog,** blasts, X zaps, portals and plates.
9. **`levelStart()` is P1's,** since it says where a level opens; R7, the
   solver and the certificates start a level with it.
10. **The level file is a copy.** `levels/build.mjs` still writes the drafts
    beside itself; a level redrawn there is copied here again. Nothing holds
    the two alike.

**Checks.** The workspace's `lint`, `typecheck`, `test` and
`test:coverage` pass: 1,323 tests in 22 files, 173 of them new
(`levels.spec.ts` 124, `level.spec.ts` 15, `legend.spec.ts` 26,
`shot.spec.ts` 8); the rules and the view at 100% of statements, branches,
functions and lines, `levels.ts`, `level.ts` and `legend.ts` among them.
`levels.spec.ts` runs in about 0.3 s. The root's `yarn lint` passes. A
throwaway spec, not kept, parsed all 36 drafts in
`docs/brick-fuzz-pop/levels/`: Warm-up's nine parse, and each of the other
27 is refused only for its first kind no set has brought in yet, so every
draft keeps the picture's rules, the portals' and the steel's.

**The mutation pass.** 56 mutants on the first pass, one at a time: 47 of
`levels.ts` (the unknown key and the boon let through; each bound of the
rows, the air and the twins, and each made inclusive; long rows and stray
characters let through, air counted a stray, air never reset; the highest
and lowest air let through; a portal with no twin or three of one mark let
through; a twin left unset; the top row's exception moved, a row with any
steel taken for one of steel, the air over steel and the missing portal let
through, the portal's bounds and the rows over the steel moved; steel read
as any kind; an uncataloged kind let through; the picture read top first;
the rows, the full hits, the plates and the twin dropped; tints of seven,
from the top, the tough brick's own ink, every kind a row's tint, a
special's ink unclamped or its portal mark dropped; levels numbered from 0;
no sets; an error that doesn't name its level), 5 of `level.ts`, 2 of
`isBoon()` and 2 of `PORTAL_MARKS`. Two specs then killed 3 of the 10 left
(a row too long; air straight over a row of steel a portal passes). After
the review, 17 more on the code it changed: the second pair with no first
let through or never counted, each half of the portal past the steel
dropped, a twin unset, a stray let through, the twins' distance by cells,
the tints of seven, of nine and from the top, the tough brick's own ink,
every kind a row's tint, every special a portal, the portal's mark
dropped, and `lowerWall()`'s jump row read without the lowest needed
brick's, strictly, or from the highest; and 4 of the reach check itself
(`ZAP_ROWS` uncapped or a row short, no zaps, no row over the wall). After
the second review, 6 more: the reach check's windows made one, a row short
or a row long, and no zaps; and the moss and the cross zapper given their
row's tint. Every one is killed but 6, which no spec can kill yet or ever:

- **Until X2 catalogs the portal and the plated brick, 3:** the higher
  portal's twin left unset, the twin dropped and the plates dropped. No
  cataloged kind has a twin or a plate, so X2's specs of a parsed portal
  and plated brick kill them.
- **Equivalent for good, 3:** `wallRowOf(cell) < row` made `<=` and
  `wallRowOf(twin) > row` made `>=`, since a row of steel from side to side
  holds no portal; and the rows over a steel row counted with the row
  itself, which is never air.

**The review:**

1. **No spec had both portals under a row of steel,** so dropping
   `wallRowOf(twin) > row` passed. Fixed: that case is in the table of
   refusals, and the mutant is killed.
2. **The reach check ran a column zap past the shallowest field's ceiling,
   and its portal hop, its other zap patterns and plates were unspecced.**
   Fixed: a zap runs no more than `ZAP_ROWS` up or down, with a spec on
   each side of it. The rest waits on kinds not cataloged yet; choice 8
   puts it on X1 and X2.
3. **A wall whose only pair was `&` took tint 1,** against `Brick.tint`.
   Fixed: `&` with no `@` is refused, with a spec.
4. **`tintOf()` hid "not a portal, so 0" in a clamp.** Fixed: it reads
   `isOneOf(character, PORTAL_MARKS) ? PORTAL_MARKS.indexOf(character) :
0`, and takes the character alone, so it is specced for every kind of
   character, portals among them.
5. **The legend-to-brick conversion lived in three places** (`parseLevel()`,
   the fixtures and R1's `wallFrom()`). Partly fixed: `tintOf()` and
   `TINTS` moved to `legend.ts`, exported, for `wallFrom()` to take; that
   file is the rules stream's, so the change is the integrator's to ask
   for.
6. **The smaller points.** Fixed: `level.spec.ts`'s level is drawn with
   `wallFrom()` and its doc says a steel brick; it holds `levelStart()` to
   plan.md's table rather than to `thirdsOf()`; the lowest row's plates are
   asserted as a count against the needed bricks, with a comment; the
   picture is checked in a `for … of`; `charactersOf()` is
   `split("")`; `parseLevel()`'s doc points at plan.md's rules rather
   than listing them; the two specs of the portals' marks are one. Left:
   `AIR` and `BUILT` stay in each spec beside the pictures they draw.
7. **`isBoon()` is in a K2 contract file.** The rules for this work allow
   adding a name to one in the package's commit, named in the log and the
   report, which this is. The mutation summary now says which survivors
   wait on X2 and which are equivalent for good.

A second review read the answers, since moving `tintOf()` into the legend
and `lower.spec.ts` onto `wallFrom()` reshaped the change:

1. **A chain of zaps could carry past the shallowest field,** each zap held
   to 9 rows but the zapper it set off zapping 9 more, though one round's
   zaps all land in the field at once. Fixed: each chain is held to a window
   of 10 wall rows, every window tried, with the reviewer's wall (a zapper
   boxed 9 rows over another, a brick boxed over it) as a spec.
2. **The "own ink" spec listed characters by hand and missed the cross and
   X zappers, moss, the shell of 3 and the plates.** Fixed: both tint specs
   draw their characters from the legend by kind, and the moss and cross
   zapper mutants are killed. The spec of `TINTS` against 8 is gone: the
   view's `TILE_INKS`, which the art stream owns, is where the tiles' eight
   inks could be held to it.
3. **`wallFrom()` keeps its own `TINTS` and tint rule,** which already give
   `&` tint 0 where `tintOf()` gives 1. Left: `wall_picture.ts` is the rules
   stream's, so the one-line switch to `tintOf()` goes to the integrator in
   the report.
4. **`parseLevel()`'s shortened doc read two ways.** Fixed: the refusal of a
   kind no set has brought in yet is a sentence of its own.

### R7: the run

**2026-11-10.**

**What was built.** `src/rules/run/`, after Brick Breaker's, with Asteroid
Breaker's saved game, against the contracts and `flight_fixtures.ts`, since
`playRound()` still throws:

- `run/run.ts`: `Run`, an immutable record of a run from the level it
  started at to its end: its id, the last level, the first, the level in
  play, the depth that level began on and its par there, the level's rounds
  and jumps, the points banked by the levels cleared before it, the score,
  `ending` (how the round in flight ends the level as it lands, cleared or
  lost, or null) and `outcome: RunStage`. Where the next round starts
  (`RoundStart`) is the round's, and stays the view's. The moves, each
  returning the same run where it doesn't fit:
  - `createRun({ id, level, depth }, levels, pars?)`, waiting in `"ready"`;
  - `startLevel()`, ready to playing;
  - `takeRound(run, outcome)`, as a round is released: the round, its
    points and a jump counted, and the level's end held in `ending`;
  - `landRound()`, as its flight lands, playing only: a level cleared, its
    stars' points added, `"won"` on the last level, or a level lost,
    `"over"`; and `afterLanding()`, the same at any stage, which the saved
    game keeps;
  - `nextLevel(run, depth, levels, pars?)`, cleared to ready at the next
    level, its points banked;
  - `pause()`, a round in flight or not, and `resume()`, to playing, or to
    ready for a level with no round played, as Asteroid Breaker's does.

  `levelOf(run, levels)` parses the level in play, and
  `openingOf(run, level)` lays it out on the depth it began on.
  `levelsCleared()` is Brick Breaker's; `isInProgress()` holds a run that
  hasn't ended and has played a round or cleared a level.

- `run/stars.ts`: `PARS`, read from `src/rules/levels/par.json`;
  `parOf(id, depth, pars?)`, which throws for a level or a depth with none;
  `parFrom(rounds)`, par from a certificate's rounds, `ceil(1.5 × rounds)`,
  for P3's `certify:levels`; `MOST_STARS`; `starsFor(rounds, par)`, three
  within par, two within 3 more, else one; and `starsOf(run)`, none until
  the level is cleared.
- `levels/par.json`: **a stub, which P3 replaces.** Its shape is P3's to
  keep: each level's id, then each depth from 11 to 22 as a string, then
  par. Its numbers are the sketch's: each Warm-up level's most rounds over
  the twelve depths, from `docs/brick-fuzz-pop/sketch/results.md`, times
  1.5 rounded up, the same on every depth (8, 8, 9, 8, 9, 11, 12, 12, 15).
- `run/scoring.ts`: `streakTimes()`, the streak through `multiplierAt()`;
  `breakPoints(brick, streak)`, a break's points as plan.md scores them,
  for R6's flight to take if it likes; `starPoints()`; and `tallyOf(run)`,
  how the level in play's points add up for the Cleared card: its bricks,
  its jumps and its stars.
- `run/progress.ts`: `isOpen()` and `clearedOf()`, Brick Breaker's without
  the speeds.
- `run/stats.ts`: `Stats`, the runs, the best score and the furthest level,
  and `levels: CountsById<"points" | "rounds" | "stars">`; `statsOf()`,
  which also drops a level's records whose rounds are none or whose stars
  aren't one to three; `withRunStarted()`, `withRunEnded()` and
  `isNewBest()`, as Brick Breaker's without the speeds; `levelResultOf(run)`,
  a cleared level's own points (its stars' among them), rounds and stars,
  or null; and `withLevelCleared(stats, id, result)`, through
  `withHigherCount()` for the points and the stars and a private
  `withLowerCount()` for the rounds, whose doc names `withHigherCount()`.
- `run/saved_game.ts`, at `SAVED_GAME_VERSION` 1, whose doc says a key
  added later is read as optional:
  - `SavedGame`: the level by number and id, the first level, the depth
    begun on, the rounds, the jumps, the points banked, the score, `tuned`,
    and `start`, or null for a level with no round played.
  - `SavedStart`: each brick's hits left by wall cell, null where none
    stands; the wall's lowest row; the field's depth; where the fuzzball
    waits; the friends; the boon.
  - `saveGame(run, next, levels, { tuned })`, called with the round in
    flight's next start as it is released, keeps the run as it stands once
    the round lands: nothing of a run waiting at its first level or ended,
    a level cleared as the next not yet begun, on the field's depth.
  - `restoreGame(value, levels, id, pars?)` takes a run up paused under a
    new id, laying a level with no round played out afresh on the depth it
    began on.
  - Its checks are separate and exported, as Asteroid Breaker's finding 13
    asked: the run's `readRun()` over `hasKnownLevel()`, `hasDepth()`,
    `hasSoundRounds()` and `hasSoundScore()`; the round start's
    `readStart()` over `hasDepth()`, `hasSoundPlace()`, `hasSoundCrew()`,
    `hasEarnedBoon()` and `readWall()`.
- `run/describe.ts`, the announcer's words from plan.md's "Accessibility":
  `boonName()`; `describeBoon()`, the Ready card's sentence;
  `describeLevel()`; `describeShot()`, "62 degrees, charge 3";
  `describeRound(outcome, next)`, "Broke 4. The wall came down 1 row: 5
  rows from the floor, 7 bricks to a jump.", the jump's words and the next
  shot's boon, a friend freed, the danger and a brick at the floor;
  `describeRows(start)`, R's reading; `describeCleared()`, with the rounds,
  par and stars; `describePause()`, `describeResume()`, `describeTakenUp()`,
  `endTitle()` and `describeEnd()`, as Brick Breaker's.
- `levels/levels.ts` gains `levelEntryOf(levels, number)`, which throws for
  a number the game has no level of, and `wall/lower.ts` exports
  `isNeeded()`; both files are this stream's.
- **`tuning.ts` gains `FRIEND_INKS`, 8,** how many inks a friend may be
  freed in, which the saved game holds a crew's inks to: the view's
  `friendInk()` throws past `FUZZBALL_INKS`' eight. This adds a name to a
  K2 contract file.

**Choices the plan didn't make.**

1. **The run doesn't hold the wall.** §5.4's `RunState` lists "the run, the
   `RoundStart`, the `Round` in play" apart, so `Run` keeps the run's
   numbers and the view keeps where the next round starts. The saved game
   takes both, and `TakenUp` gives both back.
2. **A round is taken as it is released and lands once its flight has
   played.** plan.md keeps a round "as it is released, with its outcome",
   and U6 saves as `rounds()` changes, so the round's count and points move
   at the release. But the level's end waits in `ending` for `landRound()`,
   so the run stays `"playing"` through the flight of a level's last round,
   which can be paused, and Enter doesn't skip it to the next level.
   `saveGame()` keeps the run as `afterLanding()` has it, so a reload
   mid-flight, paused or not, comes back after the round, and the shell
   keeps the records from `afterLanding()` at the release too, as its doc
   says: the level cleared, its result, and the run ended, the new best
   asked before the stats change. The bar's score counts the round's points
   from its release.
3. **The depth a level began on is the field's as the level is laid out,**
   given to `createRun()` and `nextLevel()`, and kept though the room
   changes before the first shot. How to play already says par "is set for
   the depth the field had as the level began". `openingOf()` lays the
   level out on it, so the shell and the saved game lay a level out alike,
   and a level kept with no round played comes back on that depth, not the
   room's.
4. **The run keeps its level's par and jumps.** Par is worked out once, as
   the level begins, so the bar reads it and landing needs no levels; the
   saved game doesn't keep it, and `readRun()` works it out again, so a new
   `par.json` doesn't drop a kept game. The jumps are kept for the Cleared
   card's tally. The run, `nextLevel()` and the saved game's reader take the
   table of pars, `PARS` by default, as `parOf()` does.
5. **`banked` is the points of the levels before the level in play,** so it
   moves at `nextLevel()`, not as the level is cleared: Brick Breaker banks
   at the clearing. So `score − banked` is the level's own points, stars
   included, at every stage, which the tally and the stats' best points
   read.
6. **A level's best points are its own points, its stars' included.**
7. **`parOf()` throws for a level or depth `par.json` lacks,** rather than
   playing without stars, and `stars.spec.ts` holds every level in `LEVELS`
   to a par of a round or more on all twelve depths, and `par.json` to no
   other ids or depths. So a set added before `certify:levels` runs fails
   its specs first.
8. **The saved run is held to the states a run comes to:**
   - a boon kept must be the level's, and needs a jump in the level;
   - a level kept with rounds must keep its start, and one with none must
     not, nor any points of its own;
   - the banked points must be a star's for each level cleared, and none
     with none cleared;
   - the level's points must be at least its jumps';
   - each friend's ink must be under `FRIEND_INKS`.
9. **The saved wall is the level's wall with each brick's hits,** a brick
   kept whole being the level's own object. It is refused for:
   - a brick where the level has none;
   - hits a brick can't have: 0 for steel, 1 to its full hits for the
     rest;
   - a portal without its twin;
   - a brick on or under the floor's row;
   - nothing left the level needs;
   - a wall come down less than the run's rounds bring it from where the
     level opened on the depth it began on: a row a round at least, and the
     shallowest field's jump, 3 rows, for each jump.

   Plates aren't kept: no kind catalogs one yet, and X2 adds them as an
   optional key if play changes them.

10. **R reads the field's three lowest rows that hold a brick,** skipping a
    row of air, from row 0, each cell a kind's catalog name in lower case
    ("brick", "tough brick", "steel brick"), with its hits where it had more
    than one whole. "Rows from the floor" and "bricks to a jump" count only
    bricks the level needs; the danger is said when one stands in row 1.
11. **`tierWords()` isn't in `scoring.ts`:** `@fz/core/format` has it, and
    How to play (U5) already says the streak with it.
12. **`describeShot()` writes a quarter degree as a decimal,** "8.25
    degrees", which a screen reader says plainly.
13. **The endings are Brick Breaker's:** "Game over" for a level lost,
    "Every level cleared!" for the last cleared.
14. **A run on its first level with no round played isn't in progress,**
    under way or paused, as Asteroid Breaker's isn't: New game doesn't ask,
    and the saved game keeps nothing of it.

**Checks.** The workspace's `lint`, `typecheck`, `test` and
`test:coverage` pass: 2,670 tests in 32 files, 323 of them new
(`saved_game.spec.ts` 137, `run.spec.ts` 66, `describe.spec.ts` 33,
`stats.spec.ts` 33, `stars.spec.ts` 25, `scoring.spec.ts` 15,
`progress.spec.ts` 10, `levels.spec.ts` 4); every file of `run/` at 100% of
statements, branches, functions and lines. The root's `yarn lint` passes.

**The mutation pass.** 107 mutants on the first pass, one at a time:

- 20 of `run.ts`: each move let through at any stage, the in-progress and
  cleared counts, the rounds, jumps and points not counted, a level lost
  not ending the run, the stars read off the rounds before, `>=` made `>`
  on the last level, the next level not moved, nothing banked, a level with
  no round resuming to play, and par read at depth 11;
- 5 of `stars.ts`, 5 of `scoring.ts`, 13 of `stats.ts`, 18 of
  `describe.ts` and 1 of `levelEntryOf()`;
- 45 of `saved_game.ts`: each named check dropped or each bound moved, the
  cleared level kept on the run's depth, a start kept with no rounds, the
  tuned flag let through, a start's wall read on its own depth, each brick
  check, the floor's rows a row short, the hits kept as full.

Ten lived. Five specs then killed 5 of them: a run ended with no run
counted but the bests not beaten, R reading the floor's row, the danger not
said two rows up, a level with no round played laid out on its own depth,
and more cells kept than the level's. One led to simpler code: `parOf()`'s
`Object.hasOwn()`, which the prototype's names never get past anyway, is
gone.

After the review, 33 more on the code it changed:

- 15 of `run.ts`: a second round taken in flight, the ending dropped or
  made from "on", a round landed while paused, the ending left after
  landing, a new run's ending set, par read without the table or at depth
  11, the win at `>`, the stars read a round late, the round's jumps,
  rounds, points and loss;
- 12 of `saved_game.ts`: the landing skipped, the id's type, the points of
  a level with no round, each term of the wall's highest row, the friends'
  inks unbounded or at `<=`, the table of pars dropped twice, a kept run's
  ending set;
- 6 of `stats.ts`: the filter and each of its bounds and defaults.

One lived, the stars read a round late, which a spec of a level cleared in
just its par of rounds then killed. Par read at depth 11, which lived on the
first pass, is killed now that the specs hand the run a table that differs
by depth. After the second review, 10 more: `isInProgress()`'s three
terms, the opening's depth, in `run.ts` and as the saved game lays a level
out, and each number of the next level a cleared run is kept at. Its jumps
left as they were lived, and a cleared run kept with a jump killed it.
Three are left, equivalent for good:

- `parFrom()`'s `Math.ceil` made `Math.round`, since 1.5 × a whole number
  is whole or a half, which both round up;
- `describeRows()`'s loop bounded by a fixed row past the depth, since
  `brickAt()` gives nothing there;
- `hasSoundPlace()`'s `isFiniteNumber()` made `typeof x === "number"`,
  since NaN and the infinities fail its range anyway, and JSON holds none
  of them.

**The review:**

1. **An edited save could make the reader throw.** `hasKnownLevel()`
   compared `levels[level - 1]?.data.id` with the kept id, which a level
   past the last with no id passes, `undefined` being `undefined`, and
   `parOf()` then threw, though `keepSaved()` doesn't catch. Fixed: the id
   must be a string, with that spoil among the specs.
2. **Friends of any ink were read, though the view's `friendInk()` throws
   past eight.** Fixed: `tuning.ts` gains `FRIEND_INKS`, and the crew's
   inks are held under it, with a spoil.
3. **The reader took states no run comes to:** a wall that came down less
   than its rounds bring it, and points on a level with no round played.
   Fixed: `readWall()` takes the run's rounds and jumps and refuses a wall
   higher than they leave it, and `hasSoundScore()` takes the rounds and
   refuses points before the first, each with specs on both sides of the
   bound.
4. **The flight of a level's last round couldn't be paused,** since
   `takeRound()` moved the run to `"cleared"` or `"over"` as it was
   released, and Enter would have gone to the next level mid-flight. Fixed
   in the rules: the level's end waits in `ending` for `landRound()`, and
   `saveGame()` keeps the run as `afterLanding()` has it (choice 2).
5. **A spec passed with par read at the wrong depth,** the stub's par
   being the same on every depth. Fixed: `createRun()`, `nextLevel()`,
   `readRun()` and `restoreGame()` take the table of pars, and the specs
   hand them one that differs by depth.
6. **`statsOf()` kept stars of 7 or rounds of 0.** Fixed: a level's
   records are dropped where its rounds are none or its stars aren't one to
   three.
7. **A spec helper's doc said it made the run by moves.** Fixed: it says
   "as the moves would bring it there".

A second review read the answers, since holding the level's end until the
flight lands reshaped the run:

1. **A reload mid-flight lost the records,** since the save keeps the run
   at the release as it will stand once the round lands, while the records
   were kept only as it lands: the cleared level's id, its result, and an
   ended run's score. Fixed in the contract:
   `afterLanding()`'s doc and choice 2 tell the shell to keep the records
   from it at the release, the new best asked first.
2. **`FRIEND_INKS` changes a K2 contract file inside the stream, and nothing
   ties it to the view's `FUZZBALL_INKS`.** Left: the rules for this work
   let a stream add a name to a contract file in its package's commit,
   named in the log and the report, as `isBoon()` was in P1. A view spec
   holding both modes of `FUZZBALL_INKS` to its length is the view
   stream's, so it goes to the integrator in the report.
3. **The reader's wall bound assumed a layout no rules function made:** a
   shell that laid a level out on another depth than the run's would have
   its saves dropped and its par wrong. Fixed: `levelOf()` and
   `openingOf()` lay the level in play out from the run, and
   `restoreGame()` uses them.
4. **A run on its first level with no round played was kept,** under way
   or paused. Fixed: `isInProgress()` holds such a run not in progress
   (choice 14), so `saveGame()` keeps nothing of it, with specs.
5. **`saveGame()` worked out a par it threw away,** with the default pars,
   which levels of a caller's own lack. Fixed: it keeps the next level's
   numbers without `nextLevel()`, with a spec on levels with no par.
6. **A spec counted on the stub's par.** Fixed: it expects the stars the
   run's own par gives.
7. **The nits.** Fixed: `parOf()`'s doc and error no longer name a script
   that isn't written yet, and the specs' rounds are made with
   `Array.from()`.

### P2, first part: the measure of a wall

**2026-11-10.**

**What was built.** The part of P2 that doesn't wait on `playRound()`:
`src/testing/wall_score.ts`, which `eslint.config.js`'s `HELD_AS_RULES`
already lists, so it is held to the rules' fence and their exact
arithmetic from this commit. `wallScore(round, rounds)` is the sketch's
`score()` (C13), as §6 P2 spells it out:

- a lost level measures `LOST_SCORE`, −10⁹, and a cleared one
  `CLEARED_SCORE`, 10⁹, less `ROUND_COST`, 1,000, for each round it took;
- otherwise each brick the level needs takes away its hits left and
  `BRICK_WEIGHT`, 1.5, times 1 and `LOW_WEIGHT`, 14, over its row squared,
  its row the field's, counted from the floor;
- `DANGER_COST`, 500, more is taken away if a needed brick is in row 1 or
  lower, and `NEAR_DANGER_COST`, 60, if the lowest is in row 2;
- `FRIEND_WORTH`, 6, is added for each friend, and `BOON_WORTH`, 25, for a
  boon earned.

`wall_score.spec.ts` holds it on small walls drawn with `wallFrom()`, and on
K2's hand-made rounds.

**Choices the plan didn't make.**

1. **It reads a round played,** `MeasuredRound`, the part of a `Round` it
   needs (the outcome's result, and the next start's wall, crew and boon),
   and the level's rounds, this one among them, as the sketch's state
   counted them. So the solver and the careless player hand it what
   `playRound()` returns.
2. **The constants are named in the module and not exported.** Nothing
   outside it needs them: the sketch's solver and careless player called
   only `score()`. The specs hold each number through what it measures.
3. **A brick waiting over the ceiling counts,** as in the sketch, which
   weighed every needed brick the wall held; the measure knows no depth.
4. **The sum runs over the wall's cells in order,** where the sketch ran
   over a map in the order its bricks were laid. A total can differ from
   the sketch's in its last digit, but it is the same in every engine,
   which is what the certificates need.
5. **The row of the lowest needed brick isn't shared yet.** The danger
   reads it here, `lowerWall()` reads it for the jump, and the solver's
   margin (no needed brick in row 1) will need it too. A
   `lowestNeededRow(wall)` beside `isNeeded()` in `lower.ts`, read by all
   three, comes with the solver, its first caller besides these two.

**Checks.** The workspace's `lint`, `typecheck`, `test` and
`test:coverage` pass: 3,242 tests, 16 of them new in `wall_score.spec.ts`;
`wall_score.ts` at 100% of statements, branches, functions and lines. The
root's `yarn lint` passes.

**The mutation pass.** 31 mutants, one at a time: each of the nine
constants moved; the lost and cleared branches dropped or swapped; the
rounds not counted; a brick the level doesn't need weighed, or its row
taken for the lowest; the lowest taken as the last needed brick met, or as
the highest; the hits taken as one, or as the brick's when whole; the
square, the 1 and the danger dropped; both dangers taken in row 1; the
friends and the boon dropped or turned about, or only one boon counted;
the danger's bounds moved; and the row read off the wall alone. One lived,
equivalent for every round a level is left on by: the danger at
`lowest === 1` rather than `<= 1`, since a needed brick under row 1 loses
the level, which measures `LOST_SCORE` before the bricks are weighed.

**The review:**

1. The specs never held "hits left": `wallFrom()` makes every brick
   whole, and the one worn brick in reach, the plain fixture's, was only
   checked to measure a finite number. Fixed: a spec wears a brick by hand
   and measures it as one of a single hit, and the fixtures' spec measures
   the plain round exactly, as the wall it leaves pictured. Mutants reading
   `full` for `hits` now die.
2. The specs never held that the danger reads the lowest needed brick:
   every danger spec stood its needed bricks in one row, and the steel
   shared a row with the plain brick, so taking the last brick met, the
   highest, or a steel brick's row for the lowest lived, which the
   mutation note overstated. Fixed: needed bricks in rows 1 and 2 take 500
   once, not 60 or 560, and a needed brick over steel in row 1 takes
   nothing; those mutants are in the pass now, and die.
3. The nine constants were exported, and a spec only restated them, though
   no caller needs them and each is held by what it measures. Fixed: they
   are module-private, the spec is gone, and choice 2 says so.
4. The solver and the careless player will need the lowest needed brick's
   row too, which `lowerWall()` already finds its own way. Agreed, and
   left for the solver, its first new caller: choice 5.
5. Nits, all taken: `MeasuredRound` picks from `RoundOutcome` and
   `RoundStart`; the spec's `Left.friends` is `readonly number[]`, as
   `Crew`'s is; `BRICK_WEIGHT`'s doc says breaking a brick counts for more
   than wearing a hit off one; and the boon spec measures both boons.
