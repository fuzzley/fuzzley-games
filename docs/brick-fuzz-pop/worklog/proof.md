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
