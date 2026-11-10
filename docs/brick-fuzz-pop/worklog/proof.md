# Work log: Brick Fuzz Pop, proof stream

The proof stream's packages as they are built, from
[`implementation-plan.md`](../implementation-plan.md): L2 and L7 in Part 1.

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
