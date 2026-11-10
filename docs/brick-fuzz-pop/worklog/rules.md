# Work log: Brick Fuzz Pop, rules stream

The rules stream's log of
[`implementation-plan.md`](../implementation-plan.md)'s packages: what each
built, where it went other than planned and why, what the checks reported,
its review and the numbers worth keeping.

## Part 1

### L1: `@fz/core/sweep`

- **Date.** 2026-11-10.
- **Built.** `frontend/lib/core/src/sweep.ts`, from Brick Breaker's
  `src/rules/sweep.ts` (`Move`, `MISSED`, `sweepFace()`, `sweepCorner()`)
  and the part of its `src/rules/grid.ts` that knows no grid (`Box`, `SIDE`,
  `ALL_SIDES`, `Face`, `Corner`, `FACES`, `CORNERS`, `FACE_NORMAL`,
  `CORNER_AT`, `Solid`, `exposureOf()`), its arithmetic unchanged, and
  `sweepPoint()` exported for the bumper. `package.json` gains the
  `./sweep` entry and says what it holds in its `description`, and core's
  `AGENTS.md` lists the entry and gains a rule, beside Mulberry32's, that
  the sweep's shares never change. `frontend/games/AGENTS.md`'s copy of
  core's list names it too.
  - Brick Breaker's `grid.ts` keeps its cells and `brickBox()`. `grid.ts`,
    `travel.ts`, `field.ts`, `bricks.ts`, `capsules.ts`, `paddle.ts`,
    `balls.ts`, `paddle.spec.ts` and `grid.spec.ts` import from
    `@fz/core/sweep`; its `sweep.ts` and `sweep.spec.ts` are gone.
  - The doc comments name no game. What `Solid`'s comment said of Brick
    Breaker's grid, that the columns beside it are the walls and that the
    field checks `inGrid()` before it looks in its bricks, moved to the
    comment on `Field.solid`, which does that, and `Field.hardSolid`'s says
    it does the same off the grid. The file's header no longer names bricks,
    walls and paddles.
  - The header says the sweep is exact because it was read to be: `+`,
    `-`, `*`, `/` and `Math.sqrt()` alone, no lint holding it to that, and
    the spec pins its shares to the bit; a sweep that must round otherwise
    is a new function, not an edit.
  - Brick Breaker's `AGENTS.md` says the geometry is `@fz/core/sweep`'s, and
    `brick-breaker-content` names the move `travel.ts` sweeps where it named
    "the sweep".
- **Choices the plan didn't make.**
  - **`sweepPoint(move, x, y, reach)` takes its reach as an argument,** and
    its move as `Omit<Move, "r">`, so the type says the move's radius isn't
    read. Brick Breaker's private `sweepPoint()` was already the disc swept
    against a point, at the move's own radius. `sweepCorner()` now hands it
    `move.r`, so Brick Breaker's arithmetic is the same to the bit, as a
    scratch comparison of the old and new code on the pinned table showed.
    Brick Fuzz Pop's bumper sweeps the fuzzball's own move with a reach of
    `RADIUS + 0.38`, with no second `Move` to keep. Its discriminant, which
    was called `reach`, is now `discriminant`, since `reach` names the
    argument.
  - **The bit-identity spec** ("the shares") holds twelve shares to the
    bit: a face of each side, a corner of each, and four points, three at a
    reach of 0.74 and one at the ball's radius. Each move's numbers are no
    sums of powers of two, so they round. A scratch run of seven rewrites
    of `sweepPoint()` through `Math.hypot()` changed 4 to 6 of its 8 point
    and corner shares each.
  - **`solidFrom(width, rows)`** takes the grid's width, 9 in every case,
    rather than `COLUMNS`; the right wall's case is at column 8.
  - **Specs the move added:** a face's line reached beside its left end
    (only its right end was specced, which left a branch uncovered under
    core's 100%), `FACES` and `CORNERS` in their order with their normals
    and edges, `ALL_SIDES`, and `sweepPoint()`'s own cases.
- **Checks.**
  - `@fz/core`: lint and typecheck clean; 357 tests in 15 files (64 in
    `sweep.spec.ts`: Brick Breaker's 40 moved, 24 new); coverage 100% of
    statements (286), branches (149), functions (91) and lines (241).
  - `brick-breaker`: lint and typecheck clean; `test:coverage` passes its
    floor, `dom` and `pure` 1,802 tests in 56 files (40 fewer, as they
    moved, and one file fewer), and `sim` 180 in 3, every level cleared as
    before.
  - The root's `yarn lint` passes.
- **The mutation pass.** 40 mutants of `sweep.ts`, one at a time, against
  core's `sweep.spec.ts`: 33 killed at once.
  - Survived, then specced: `approach >= 0` made `> 0` (a ball within reach
    of a point, moving across it, now misses it); `t <= 1` made `< 1` in
    `sweepPoint()` (a point reached just as the move ends); `MISSED` made
    -1 (it comes after every share).
  - Survived, and equivalent: `outside <= 0` made `< 0` (at exactly the
    reach the root is `(-a - √(a²)) / l`, which is 0, since the root of a
    rounded square rounds back to the number squared); `gap <= 0` made
    `< 0` (`0 / -toward` is 0); `Math.sqrt(d)` made
    `Math.hypot(Math.sqrt(d))` (one argument's hypot is its size);
    `(across - line) * facing` made `across * facing - line * facing`
    (`facing` is 1 or -1, so each product is exact).
  - The three new specs then killed their mutants.
- **The review.** A fresh agent found the moved arithmetic the same as
  Brick Breaker's, line by line, and nothing blocking.
  1. `frontend/games/AGENTS.md` keeps a copy of core's `description`, which
     lacked the sweep. Fixed: it names it. The `fuzzley-ui` skill's
     `@fz/core` row is left to L9, as the plan has it.
  2. The note on cells off the grid moved only to `Field.solid`, though
     `hardSolid` does the same, and Brick Breaker's `AGENTS.md` said
     `exposureOf()` reads only `solid`. Fixed: `hardSolid`'s comment says
     it, and `AGENTS.md` names both.
  3. In `sweep.spec.ts`: a case named for "a reach wider than its own
     radius" built a move with no radius; a case held `sweepPoint()` to
     `sweepCorner()`, which calls it, so it would pass with it broken; and
     the lone box's exposure was checked as a number, not the sides' names.
     Fixed: the first is renamed for a ball's center coming within reach,
     the second is dropped, as the pinned corners hold `sweepCorner()` to
     the ball's radius, and the third reads the names again.
  4. The rule that the shares never change gave no way to change one, and
     "nothing but a reader keeps it so" sat beside a spec that does. Fixed:
     the header and core's `AGENTS.md` say no lint holds it, and that a
     sweep that must round otherwise is a new function, not an edit, as
     Mulberry32's rule says.

### L6: `variantOfSpec()` in `@fz/core/testing`

- **Date.** 2026-11-10.
- **Built.** `variantOfSpec(file, variants, folder)` in
  `frontend/lib/core/src/testing.ts`: the variant a spec file is named for,
  `<variant>.spec.ts` in the folder that keeps one for each, read from the
  path `import.meta.filename` gives by splitting it at `/` or `\`, with no
  `node:path`, which core can't import. It throws for a file named for none
  of the variants, a file that is no spec, or one in another folder, and
  its message names the variants, the folder and the file.
  - Brick Breaker's private `speedOfSpec()` and its `FOLDER` go, and
    `holdEveryLevel()` reads its speed with `variantOfSpec()`, over
    `PRESET_SPEEDS` in `every_level/`: `src/testing/every_level.ts` falls
    from 76 lines to 57, and imports no `node:path`.
  - Asteroid Breaker's `src/testing/speed_specs.ts` (17 lines) goes;
    `every_wave.ts` and `every_layout.ts` call `variantOfSpec()` with
    `SPEEDS` and their folders, a line of imports more between them.
  - Core's `AGENTS.md` describes `src/testing.ts` as what a game's specs
    share, the frame loop and the variant; its `package.json` description
    names it. Brick Breaker's and Asteroid Breaker's `AGENTS.md` say their
    holders read the speed with it, and the `angular-testing` skill lists it
    in `@fz/core/testing`. The `fuzzley-ui` skill's line on that entry is
    left to L9.
- **Choices the plan didn't make.**
  - **A third argument, the folder.** The plan names
    `variantOfSpec(file, variants)`. Both games' functions also checked
    that the file sits in its folder, and Asteroid Breaker's three folders
    (`every_wave`, `every_endless_wave`, `every_layout`) share the speeds'
    names, so without it a holder called from another folder's spec would
    play the wrong thing without a word. It is required, not optional, so
    the function has no mode; Brick Fuzz Pop's `every_level/` and
    `every_floor/` (P3) pass theirs. `every_floor/`'s files, one for each
    set and depth, can be named for both (`warm-up-13.spec.ts`), their
    variants listed as those names and looked up again.
  - **The message** is new, the same for both games: "Expected a spec
    named for one of relaxed, normal, fast in every_wave/, not <file>."
  - **The type of a variant** is the list's own, a string or a number
    (`V extends string | number`), so Asteroid Breaker's `isSpeed()` is no
    longer needed here, Brick Breaker's `holdEveryLevel()` gets a `Speed`
    from `PRESET_SPEEDS`, and Brick Fuzz Pop's `every_level/` can name its
    files for its depths, `13.spec.ts`, and get the number back.
- **Checks.**
  - `@fz/core`: lint and typecheck clean; 367 tests in 15 files (10 new in
    `testing.spec.ts`); coverage 100% of statements (292), branches (153),
    functions (93) and lines (246).
  - `brick-breaker`: lint and typecheck clean; `test:coverage` passes its
    floor, `dom` and `pure` 1,802 tests in 56 files, and `sim` 180 in 3.
  - `asteroid-breaker`: lint and typecheck clean; `test:coverage` passes its
    floors, `dom` and `pure` 3,624 tests in 89 files, and `sim` 1,620 in 9.
  - The root's `yarn lint` passes.
  - With Brick Breaker's folder misnamed `every_levels`, its `fast` spec
    fails at once, naming the file.
- **The mutation pass.** 10 mutants of `variantOfSpec()`, one at a time,
  against `testing.spec.ts`: 9 killed at once.
  - Survived, then specced: the folder checked with `file.includes(folder)`
    rather than as the file's own folder; a spec in a folder inside the one
    named (`every_wave/old/fast.spec.ts`) is now refused, and kills it.
  - Two more the review found surviving, a name and a folder matched by
    their ends, are killed by its specs (item 2 below), and the first ten
    still are.
- **The review.** A fresh agent found the function right on POSIX and
  Windows paths, both games' behaviour kept but for the message, and the
  folder argument justified and no mode.
  1. P3's `every_level/` is named for depths, which are numbers, and
     `V extends string` would make it map them to strings and back. Fixed:
     `V extends string | number`, with a spec over a list of numbers, and
     the entry above says how `every_floor/` names its files.
  2. No refusal had a name or folder that only ends in a valid one, so a
     mutant matching by `endsWith()` would survive. Fixed:
     `every_wave/breakfast.spec.ts` and `old_every_wave/fast.spec.ts` are
     refused in specs, which kill both mutants.
  3. The variant's type wasn't pinned in core, as `keysOf()`'s and
     `listOf()`'s are. Fixed: an `expectTypeOf` spec holds it to the list's
     union.
  4. The `angular-testing` skill lists `@fz/core/testing`'s helpers without
     it, and L9's list doesn't name that skill. Fixed: it lists it. The
     `fuzzley-ui` skill's line is left to L9, as this entry now says.
  5. The doc comment didn't say `folder` is a name, not a path, and its
     `@throws` said "outside the folder" where a file in a folder inside it
     is refused too. Fixed: it says both.
