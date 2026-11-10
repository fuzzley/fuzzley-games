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
