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

## Part 2

### R1: the grid

- **Date.** 2026-11-10.
- **Built.**
  - `src/rules/grid.ts`: the field's names for `@fz/core/sweep`'s faces,
    `FLOORWARD` (`SIDE.top`), `CEILINGWARD` (`SIDE.bottom`), `LEFT` and
    `RIGHT`, typed `FieldFace`, and its corners, `FLOORWARD_LEFT`,
    `FLOORWARD_RIGHT`, `CEILINGWARD_LEFT` and `CEILINGWARD_RIGHT`, typed
    `FieldCorner`, the mapping said once, in the file's opening comment;
    the cells, `cellOf()`, `columnOf()`, `wallRowOf()`, `fieldRowOf()` and
    `cellAt()`; `brickAt()`, the brick in play in a field cell; `brickBox()`;
    `BrickShape`, `shapeOf()` and `brickShape()`, how a brick meets a
    fuzzball; and `boxesIn(wall, depth)`, the `Solid` that `exposureOf()`
    reads the wall through, the cells beyond the side walls solid and the
    waiting rows empty.
  - `src/testing/wall_picture.ts`: `wallFrom(picture, { lowestRow })`, a
    wall laid out from a picture in the legend's characters.
  - `src/rules/levels/legend.ts` takes `FLOORWARD`, `CEILINGWARD`, `LEFT`
    and `RIGHT` from `grid.ts`, its own gone, as K2's sixth choice asked.
  - `grid.spec.ts` and `wall_picture.spec.ts`. The mapping is pinned by
    pictures: of two bricks stacked, the lower shows the floor its
    `FLOORWARD` face and the higher the ceiling its `CEILINGWARD`, and a
    fuzzball rising from the floor meets `brickBox()`'s `FLOORWARD` face a
    quarter of the way through a move of 2, and never its `CEILINGWARD`.
- **Choices the plan didn't make.**
  1. **Rows under the floor count as empty,** as the waiting rows do: the
     plan names only the side walls and the ceiling. A brick stands there
     only once its level is lost, and a flight ends at the floor, so it
     never shows in play; `brickAt()` finds none there.
  2. **How a brick meets a fuzzball is a shape:** `"box"`, `"round"` for a
     solid kind that kicks (the bumper) and `"open"` for one that isn't
     solid (the portal), read from the catalog's `solid` and the `kicks`
     trait once, at load. Only a box stops a fuzzball in `exposureOf()`'s
     sense, so a bumper's and a portal's neighbours show their faces to
     them, and X2 adds those kinds without touching the grid. `shapeOf()` is
     specced with kinds made up in the spec, the catalog holding no round or
     open kind yet. R2's `cast()` will sweep by the shape.
  3. **`boxesIn()` returns a `Solid`, read as it is asked,** rather than an
     `exposureOf()` of the grid's own: `fly()` can make it once a flight,
     over a wall whose list of bricks it empties as they break, and the
     specs and R2's reference call `@fz/core/sweep`'s `exposureOf()` with
     it.
  4. **The corners are named too** (`FieldCorner`), for R2's contacts and
     for plates, where a corner is plated only where both its faces are.
  5. **`brickAt()` reads off the wall's list by index,** a row under the
     wall's lowest or over its highest falling off it, once the column is
     known to lie between the side walls, so no column wraps into the row
     beside.
  6. **`wallFrom()`** takes rows of exactly nine characters, top row first,
     its lowest standing in field row 1 unless `lowestRow` says otherwise,
     so a picture of depth − 1 rows is the field over the floor's row. Each
     brick is whole, with the fixtures' tints (a plain or tough brick's wall
     row modulo 8, any other kind's 0) and no twin, and a character no
     cataloged kind's brick stands for throws, as the fixtures' does.
  7. **No character is reserved for specs yet,** where the plan asks for
     `?`, a kind that splits. A `Brick`'s kind is a `BrickKindId`, so a kind
     that exists only in specs can't stand in a wall until R3 settles how
     `fly()` finds a brick's kind; R3 adds `?` to `wallFrom()` then. The
     portals' twins (`@`, `&`) wait for X2's portal the same way.
  8. **`eslint.config.js` is unchanged:** `wall_picture.ts` is on
     `HELD_AS_RULES`, and `HELD` holds it from this commit. Lint refused a
     `Math.PI` and an import of the shell written into it.
  9. **`grid.ts` is a file,** `src/rules/grid.ts`, as §5.2 and `plan.md`
     name it, where §7.3 writes `grid` among the stream's folders.
- **Checks.** The workspace's `lint`, `typecheck`, `test` and
  `test:coverage` pass: 481 tests in 14 files (46 in `grid.spec.ts`, 8 in
  `wall_picture.spec.ts`), the rules and the view at 100% of statements,
  branches, functions and lines, `wall_picture.ts` at 100% too. The root's
  `yarn lint` passes.
- **The mutation pass.** 46 mutants, one at a time, against the `pure`
  project: 33 of `grid.ts`, 12 of `wall_picture.ts` and 1 of `legend.ts`
  (the side plates on one side). 40 were killed at once.
  - Survived, then specced: `brickAt()`'s column bounds widened by one,
    either way. The spec looked beyond the side walls in the wall's lowest
    row, where the cell past column 0 is no cell; it now looks on a wall
    with bricks in both end columns, where column −1 would find the last
    brick of the row below and column 9 the first of the row above. And
    `brickBox()` returning a copy: the spec now holds it to the box handed
    in.
  - Equivalent while every cataloged kind is a box: `brickShape()`
    answering `"box"` for every brick, and `boxesIn()` taking any brick
    not open, or any brick, as solid. X2's bumper and portal tell them
    apart, so their specs should show the faces of a bumper's and a
    portal's neighbours exposed.
- **The review:** a fresh agent found no bug, tracing each spec's bits
  through `exposureOf()` by hand, and the API fit for R2's `cast()` and
  R3's `fly()`.
  1. **The picture-to-wall code is written twice,** in `wallFrom()` and in
     the fixtures' `wallOf()` and `brickOf()`, which could drift apart.
     Left: `flight_fixtures.ts` is K2's, the integrator's to change; the
     report asks for the fixtures to lay their walls out with `wallFrom()`.
  2. **The mapping is still said outside `grid.ts`,** in `Brick.plates`'
     doc comment (`wall.ts`) and a comment of `legend.spec.ts`. Left for
     the same reason, `wall.ts`' types being K2's and `legend.spec.ts` the
     levels' folder's; the report asks for `plates`' doc to name
     `FieldFace` and the legend's spec to use `grid.ts`' names.
  3. **`solidIn()` read as the catalog's `solid`,** where a bumper is solid
     and yet no box. Fixed: it is `boxesIn()`, its doc saying a bumper,
     though solid, and a portal hold none. The reviewer's `brickShape()`
     spec, pinning `"box"` for each kind, was left as it was: its contract
     is the kind's shape, which the spec states, and a pinned `"box"` would
     fail X2's bumper; its helper builds no hits it doesn't need.
  4. **`cellAt()`'s doc hid that a column beyond a side wall names a cell
     of the row beside.** Fixed: it says so.
  5. **Two doc comments opened with two sentences** (`boxesIn()`'s and
     `wallFrom()`'s), and `shapeOf()`'s restated its branches. Fixed.

### R2: `cast()`

- **Date.** 2026-11-10.
- **Built.**
  - `src/rules/flight/cast.ts`: `cast(field, x, y, dx, dy, limit, into)`
    writes into a `Contacts` record what a fuzzball flying from a place
    along a heading meets first, no farther than `limit`: the `distance`,
    where its middle is then (`x`, `y`), and each thing met as a `Met`:
    `what` (`events.ts`' `Contact`), its wall `cell` (−1 for the field's
    sides), its `side` (the face's or corner's `SIDE` bit, 0 for a bumper),
    the way out (`nx`, `ny`, a unit long) and its own `distance`.
    `createContacts()` makes the record once, to be reused, and
    `castField(wall, depth, kinds)` what every cast of a flight reads: the
    wall, read as it stands; each kind's shape; a round kind's reach, the
    fuzzball's radius and its `kicks` disc; the boxes `exposureOf()` reads;
    and the ceiling. It throws for a kind that kicks from a disc wider than
    its cell.
  - It walks moves of a unit (C10), move k starting k units on. Each sweeps
    the side walls, the ceiling and the floor, and the cells its disc
    overlaps or touches, nine at most: a box's exposed faces and corners
    through `sweepFace()` and `sweepCorner()`, a round brick through
    `sweepPoint()` at its reach, an open one not at all. A share t of
    move k is k + t × its length. Everything met within `AT_ONCE` of the
    earliest is gathered, each once, and listed by `Contact`'s order (so
    faces before corners, C1's), then by cell (from the floor up, then
    left to right), then by side. A corner's and a bumper's way out is the
    line from the point to the middle over its length as met (C5).
  - `src/testing/cast_reference.ts`: `castByScan()`, the same moves swept
    against every brick in play, each kind's shape, a bumper's reach and the
    boxes worked out from the kinds alone, everything found listed, then the
    earliest and those within `AT_ONCE` of it kept once and sorted;
    `castOf()`, a `Contacts` as plain values; and `randomField()`, a
    `RandomField` (a wall, its field's depth and the kinds), and
    `randomShot()`, seeded walls and shots.
  - `src/testing/stand_ins.ts`: `BUMPER` and `PORTAL`, kinds made up for
    specs, and `STAND_INS`, the catalog with them standing in for the row
    and column zappers, so a picture's `-` is a bumper and its `|` a portal.
  - `cast.spec.ts`: the plan's cases (a face, a seam, a corner, an inside
    corner, a brick over the ceiling passed by), C5's corner overlapped,
    the side walls, the ceiling and the floor, a bumper, a portal, the
    limit, a face met as one move ends and again as the next starts, the
    order of what is met at once, and the property spec.
  - `src/rules/flight/benchmarks/cast.spec.ts`, in `sim`, prints cast()'s
    median and 99th percentile beside a scan's.
- **Names added to files that aren't the stream's.**
  `src/rules/catalog/bricks.ts`: `BrickKinds`, the catalog's kinds by id as
  the rules are handed them. `vitest.config.ts`: `sim` covers
  `src/rules/flight/benchmarks`.
- **Choices the plan didn't make.**
  1. **The catalog is a parameter,** `BrickKinds`, the catalog's by default.
     A `Brick`'s kind is a `BrickKindId`, so a kind that exists only in
     specs stands in under a cataloged kind's id, in a catalog the spec
     hands the rules (`STAND_INS`). R2 needs it already: a bumper's reach
     comes from its `kicks` trait, and a portal's cell is open. `grid.ts`
     follows: `Shapes`, `shapesOf(kinds)` and `SHAPES` replace R1's
     `brickShape()`, which nothing used, and `boxesIn()` takes the shapes,
     with no default, so a bumper's and a portal's neighbours show them
     their faces in the specs now, which kills R1's three equivalent
     mutants. `grid.spec.ts`' box case names the five warm-up kinds rather
     than every cataloged one, since X2's bumper and portal won't be boxes.
  2. **Moves of a unit, from where the cast starts,** not from cell edge to
     cell edge: a move's disc overlaps 3 × 3 cells at most, and its start,
     k units on, is a number the reference can work out alike. A move
     sweeps the cells it only touches too (`ceil(least − r) − 1` to
     `floor(most + r)`), since a face's end or a corner lies on their edge,
     and a cast's last move may end touching it.
  3. **The gathering reaches into the next move** while that move starts
     within `AT_ONCE` of the earliest contact. Aimed at an inside corner
     from a unit off, a fuzzball can meet one face as its first move ends
     and the other only as the next starts (along aim 100, at
     0.9999999999999998 and at 1); the spec sets the two 3e-10 either side
     of the move's end, so it holds whatever the aim's numbers round to.
     Something met as one move ends and again as the next starts, the same
     what, cell and side, is noted once.
  4. **The fuzzball is placed at `x + dx × distance`,** whether it met
     something or flew to its limit, so one formula places it, whichever
     move met what it met.
  5. **A limit,** which `fly()` will set to the next yawn, zap or cap: past
     it a cast meets nothing, its count 0 and its distance the limit. A
     fuzzball in the field meets a wall within the field's diagonal anyway.
     What lies just past the limit isn't met, though it lies within
     `AT_ONCE` of something met at it: a caller that turns the fuzzball
     there meets it as the fuzzball flies on, a turn later. `cast()`'s doc
     says so, and R3 decides whether `fly()` minds.
  6. **The field's sides are boxes** reaching 1,000 units beyond it, as
     Brick Breaker's walls are; their contacts have cell −1 and the side
     of the face they show the field (the left wall's `RIGHT`, the
     ceiling's `FLOORWARD`, the floor's `CEILINGWARD`).
  7. **The order at one moment is total,** as one number from what, cell
     and side. Contacts are noted unsorted into records made once (132, the
     most the cells of two moves and the four sides hold) and sorted once a
     cast by adjacent swaps, those later than `AT_ONCE` after the earliest
     last and then cut off; the code reads no list item it hasn't narrowed,
     since `noUncheckedIndexedAccess` holds and lint refuses both `!` and
     `as`.
  8. **A portal's cell is passed through.** Its crossing, C3's, waits for
     R3's teleport hook, as §6 R2 lists only the walls, faces, corners and
     bumpers.
  9. **The property spec casts four shots at each of the 2,000 walls,**
     8,000 in all, a quarter from the floor, a third of the rest on quarter
     units, a quarter of the headings along an axis, and a quarter of the
     limits a whole number of units and a quarter less than one, as
     `fly()`'s will often be, so faces are touched at their ends, at seams
     and at corners, and moves are cut short. It takes about a second in
     `pure`. The reference keeps its own unit of move, and works each kind's
     shape and reach and the boxes out from the kinds, so a change to
     cast()'s moves, or a wrong table in `castField()`, shows there.
  10. **The benchmark prints and asserts nothing**, as §6 R2 asks; Vitest
      shows a passing spec's printing only with `--reporter=verbose`:
      `yarn vitest run --project sim --reporter=verbose`. It warms the scan
      up with a round too, so the two are timed alike.
  11. **A kind that kicks from a disc wider than its cell is refused:**
      `castField()` throws a `RangeError`, since a cast sweeps only the
      cells a fuzzball's disc overlaps, which holds a bumper only while its
      disc lies in its cell.
- **Checks.** The workspace's `lint`, `typecheck`, `test` and
  `test:coverage` pass: 1,179 tests in 21 files in `dom` and `pure` (30 in
  `cast.spec.ts`, 45 in `grid.spec.ts`), and the benchmark in `sim`; the
  rules and the view at 100% of statements, branches, functions and lines,
  `cast_reference.ts` and `stand_ins.ts` at 100% of statements. The root's
  `yarn lint` passes.
- **The mutation pass.** 60 mutants, one at a time, against the `pure`
  project: 57 of `cast.ts`, 3 of `grid.ts`' shapes. 48 were killed at once,
  among them `boxesIn()` taking any brick, or any brick not open, as a box,
  which R1 logged as equivalent.
  - Survived, then specced: a move's cells missing those it touches at its
    left, right and lower edges (a face met just as the limit ends, flying
    left, right and down: only the last move can't leave it to the next);
    the order's number without the kind's place (a face listed before a
    bumper met with it, though the bumper's cell is lower); and the boxes
    read through the catalog's shapes rather than the kinds handed in (the
    corner of a brick a bumper leaves bare, met before the bumper).
  - Survived, and made equivalent: the earliest taken at `<=` rather than
    `<`, which could move the fuzzball's place by an ulp where a contact is
    met again as the next move starts; the place now comes from the
    distance (the fourth choice). Its three mutants were killed.
  - Equivalent: the look into the next move at `>=` rather than `>` (a move
    starting exactly `AT_ONCE` after the earliest contact); the cells
    clamped to the field's columns and rows, which `brickAt()` answers null
    beyond anyway; a hidden face swept too, which a fuzzball outside every
    box reaches only through the box hiding it; the noting gate widened,
    since the gathering keeps only those within `AT_ONCE` at the end; and
    the order's number without the side, which only two contacts of one kind
    in one cell, two faces or two corners of one brick, would need, and no
    fuzzball outside a box meets those at once.
  - After the review, 9 more, all killed: the disc's bound at `>=`, and
    lifted; the move's start and length not written into the scratch; a
    contact's distance without the move's length; no look into the next
    move; and the boxes, the reaches and `boxesIn()` read through the
    catalog, the last three by the property spec alone too, now the
    reference works its tables out itself.
- **Numbers.**
  - cast(): median 2.7 µs, 99th percentile 20 to 24 µs, over 20,000 casts of
    2,000 seeded shots, a quarter of them shorter than a unit; a scan of
    every brick, the reference, warmed up too: 46 to 62 µs and 524 to 675 µs
    (three runs on this machine, Node 26).
  - The property spec's 8,000 shots: 5,564 met one thing, 31 two at once,
    and 2,405 nothing within their limits; 938 met something at once, at 0;
    2,190 had a limit under a unit, and 449 of those met something. They met
    2,180 side walls, 1,532 floors, 386 ceilings, 994 faces, 246 corners and
    288 bumpers.
- **The review:** a fresh agent found no bug in `cast()`, the walk's cells,
  the gathering, the order and C5's normal checked by hand, and the hand
  specs' numbers worked out again; its comments were on how independent and
  robust the specs are. No second review: the fixes correct the change, and
  `cast()`'s design stands.
  1. The property spec couldn't catch a wrong table in `castField()`, since
     the reference read the same field's shapes, reaches and boxes. Fixed:
     `randomField()` returns the wall, its depth and the kinds; the spec
     makes the cast's field with `castField()`, and the reference works out
     each kind's shape (`shapeOf()`, specced on its own), a bumper's reach
     and the boxes itself. The property spec alone now kills the boxes and
     the reaches read through the catalog.
  2. The gathering spec held only by how aim 100's numbers round. Fixed: it
     starts 3e-10 farther across and nearer up, so the face below is met at
     1 − 3e-10, in the first move, and the face beside at 1 + 3e-10, in the
     next.
  3. `boxesIn()`'s default shapes invited reading the catalog's for
     stand-ins. Fixed: `shapes` is required.
  4. The noting helpers took seven to nine numbers by position. Fixed in
     part: a move's start and length sit in the move scratch beside its
     place and heading, set once a move, which leaves the box, bumper and
     face helpers five parameters and `notePoint()` and `note()` seven.
     Left: those are a point, a share, what was met and its way out, named
     at a handful of private calls, and the property spec, independent
     now, catches a swap.
  5. No cast had a limit under a unit, as `fly()`'s often will. Fixed: a
     quarter of the property spec's limits are (2,190 shots, 449 of them
     meeting something).
  6. `SHAPES` was held to its own definition. Fixed: the spec pins the
     warm-up's five kinds to boxes.
  7. What lies just past the limit, within `AT_ONCE` of what is met at it,
     isn't gathered. Left to R3, which decides whether `fly()` minds;
     `cast()`'s doc says so (choice 5). Sweeping past the limit would report
     contacts beyond it and place the fuzzball there.
  8. `MOST_MET`'s doc opened with two sentences. Fixed. `AGENTS.md`'s line
     on `sim`, which names only the certificates' and the careless player's
     specs, is the integrator's to change, and the report asks for it.
  9. The smaller points. `STAND_INS` replacing both zappers is left: a spec
     wanting a bumper beside a zapper hands a catalog of its own, as R3's
     may. A kicking disc wider than its cell, which a cast would miss, is
     refused now (choice 11), specced at 0.5 and a hair over. The box case
     naming the warm-up's kinds is explained (choice 1). The scan in the
     benchmark is warmed up too.

### R2, after the rebase: one tint rule

- **Date.** 2026-11-10.
- **Built.** The integrator asked, once P1 put `tintOf()` in
  `src/rules/levels/legend.ts`, for `wallFrom()` to take its tints from it
  rather than keep its own rule, which gave a second pair's portal (`&`)
  tint 0 where `tintOf()` gives 1. `src/testing/wall_picture.ts` drops its
  `TINTS` and tints each brick with `tintOf(character, wallRow)`; its
  checks for a character the legend lacks and one whose kind the catalog
  lacks come apart, so the character is a legend character where
  `tintOf()` takes it, with the error made in one place. No wall a spec
  draws changes yet: the catalog holds no portal until X2, so `wallFrom()`
  still refuses `@` and `&`, and the cataloged kinds' tints are what they
  were.
- **For X2.** Once portals are cataloged, `wallFrom()` gives them their
  tints but `twin: null`: the pairing is `twinsOf()`'s, in `levels.ts`,
  which isn't exported, so a spec's portals would be unpaired until
  `wallFrom()` pairs them as a level does.
- **Checks.** On `brick-fuzz-pop` after the rebase, the workspace's `lint`,
  `typecheck`, `test` and `test:coverage` pass: 2,380 tests in 27 files in
  `dom` and `pure`, and the benchmark in `sim`; the rules and the view at
  100% of statements, branches, functions and lines. The root's `yarn lint`
  passes.
- **The mutation pass.** 4 mutants of `wallFrom()`, all killed: the tint
  taken for row 0 and taken as 0, and each check dropped.
- **The review:** a fresh agent found the change right, no tint changed for
  any wall a spec can draw, and the narrowing free of casts.
  1. The entry read as if the `&` tint changed a spec's wall. Fixed: it
     says none does yet.
  2. `brickOf()`'s doc named one of its two throws, and `uncataloged()`'s
     read awkwardly. Fixed: both reworded.
  3. Portals drawn by `wallFrom()` will be unpaired once cataloged. Noted
     above for X2, and in the report.

### R3: `fly()`, many fuzzballs from the start

- **Date.** 2026-11-10.
- **Built.**
  - `src/rules/flight/flight.ts`: `fly(start, rules)` flies a round's
    fuzzballs from the floor along an aim until the last lands, and returns
    the `Flight` with the wall it leaves (`Flown`), the wall handed in left
    as it was. `FlightStart` says how they leave (the wall, the depth, `x`,
    the aim, the charge, `hot`, `mates`, `friends`), and `FlightRules` what
    the flight is played by (`bored`, the kinds, the trait rules). It throws
    a `RangeError` for an aim that isn't one of the 657.
  - One clock. The player's fuzzball, its mates and its friends leave
    `LAUNCH_GAP` apart, the mates with its charge, the friends plain, and a
    hot shot charged to the most. Each fuzzball's next moment is planned by
    a cast to the moment it comes home; the soonest is played, a tie to the
    lower numbered (§5.6's order of fuzzballs), and a zap lands after every
    fuzzball at its moment, as K2 orders them. A break un-plans every
    fuzzball in flight.
  - At a moment, a fuzzball lands on the floor unless it has a hot shot's
    bounce left; strikes each brick it meets once, by plan.md's "Charge";
    then turns, as C5 says: each face as a mirror along its axis, and only
    where no face turns it, the corners and the discs, about the sum of
    their lines; a kick, the sum of every kick, overrides both. Splits leave
    last, from the heading it turned to.
  - It comes home at `min(idleFrom + bored, launchAt + 600)`, or after eight
    still turns: it yawns, counted in `capped` for the caps, and drops
    straight to the floor through what lies under it, landing `y − RADIUS`
    later.
  - `src/rules/flight/hooks.ts`: `Hooks`, what a brick's rules may do to a
    flight (`split`, `teleport`, `kick`, `zap`, `recharge`, `free`), each at
    the moments it names; `Struck`, a strike as a brick's rules see it
    before its hits are taken, which they may shield (`hurts`) or have earth
    the charge (`earths`); `TraitRule<T>`, a trait's rules at four moments
    (`struck`, `broken`, `met`, `entered`); and `TraitRules`, one for every
    trait kind, so a trait without one fails to compile.
  - `cast.ts`: crossings. `Contacts.entered` and `enteredAt` hold the first
    cell, of a brick in play a fuzzball flies into, whose side its middle
    crosses into from outside, and how far on. `cast()` takes `crosses`,
    true by default, and notes none when false, and `passing`, a cell it
    doesn't cross into, −1 by default. `castByScan()` crosses alike, and
    `randomShot()` draws `crosses`, false one time in four, and `passing`,
    one of the field's open cells one time in two.
  - `grid.ts`: `brickAt()` looks no negative index up, which halved fly()'s
    time in it.
  - `src/testing/stand_ins.ts`: `PRISM`, `WOOL` and `CAGE`, made up to stand
    in for the brick or the tough brick, and `STAND_IN_RULES`, rules made up
    for every trait the hooks serve.
  - `src/testing/random_flights.ts`: `randomFlight()`, a seeded wall of any
    kinds the hooks serve and a shot at it, and `clearanceProblemsOf()`,
    which finds a leg of a track nearer a brick's box than the radius, or a
    disc's middle than its reach; `random_flights.spec.ts` holds it to five
    cases.
  - `flight.spec.ts`: the hand fixtures replayed, each choice below, the
    sketch's two bugs, the corner just after a face, the re-entry after a
    contact, the seam struck with charge, and the random flights.
  - `src/rules/flight/benchmarks/fly.spec.ts`, in `sim`, prints fly()'s
    median and 99th percentile, for one fuzzball and for more.
- **Names added to files that aren't the stream's.** None.
- **Choices the plan didn't make.**
  1. **The trait rules are a parameter,** as the kinds are, with no default:
     R4 writes `TRAIT_RULES` and R6's `playRound()` hands it in. The specs
     hand `STAND_IN_RULES`.
  2. **The Charge rule is written in `fly()` for now:** a plain fuzzball
     takes one hit off a brick and turns; a charged one spends the least of
     its charge and the brick's hits, passing through what it breaks and
     turning off what it doesn't; steel's rules shield it (`hurts`) and
     earth the charge (`earths`), which a hot shot keeps. R4's `strike()`,
     in `bricks/bricks.ts`, takes the arithmetic out, as §6 R4 says, and
     `fly()` calls it.
  3. **Stand-ins stand under cataloged ids,** as R2's do: the prism, wool
     and cage replace the brick, the row zapper or the tough brick in a
     catalog a spec hands in. No `?` character.
  4. **A portal takes a fuzzball as its middle crosses into the cell** from
     outside, a middle on its side moving in crossing at once, one inside it
     never (C3), and sends it out of its twin's middle, flying the same way,
     if the twin is in play; it then crosses into no cell until it next
     turns. Out of the twin's middle, it lies clear of every neighbour's box
     by its radius, and of a bumper's middle by more than its reach. Sent
     out as far into the twin as it came into the portal, the random flights
     caught it starting over a neighbour's box by up to its radius, turning
     off that box's corner from inside it, and, once out over a side wall,
     turning at once and crossing back into the twin's cell from its side,
     each time. A fuzzball a portal doesn't send on passes through its cell,
     and doesn't cross into that cell again until it turns, though into any
     other.
  5. **A twin not in play leads nowhere:** sunk (null), under the floor or
     waiting over the ceiling, the fuzzball flies through the portal.
  6. **The contact just past the limit.** The cast reaches `AT_ONCE` past
     the moment a fuzzball comes home: what it meets at that moment or
     before, and what it meets at once with it, is met, though some lies
     past the moment; what it meets first only past it isn't, and it comes
     home then. A crossing just past it isn't either.
  7. **The yawn falls exactly at the bored distance or the 600 cap,** and a
     yawn at the cap is counted, as eight still turns are.
  8. **The drop home is a landing planned on the clock,** straight down
     through what lies under the fuzzball, which nothing that breaks
     meanwhile re-plans. `land.x` is where the middle touched the floor, as
     K2's choice 12 says; the plan's 0.5 from a side wall is R6's `next.x`.
  9. **Zaps:** each lands `ZAP_DELAY` after its break, those of one moment
     by cell, taking its hits off what its pattern reaches that the bricks'
     rules let it hurt (`Struck.by` is `"zap"` or `"blast"`, the charge 0).
     A row, column, cross or x zap reaches along its lines a cell at a time,
     `reach` cells each way; a blast every cell of its square. A zap's break
     runs the broken brick's rules with no fuzzball (−1), so a prism or wool
     a zap breaks splits and recharges nothing.
  10. **The 16 cap** counts every fuzzball not yet landed: waiting, flying
      or dropping. A split leaves from where the fuzzball turned, plain,
      with its own bored count and cap.
  11. **A kick overrides the faces and corners met with it,** a bumper
      sending the fuzzball along its kick wherever else it touched; kicks
      that cancel out kick nothing, so the discs turn the fuzzball as
      corners do, as a disc whose rules don't kick does.
  12. **Each hook is made only at its moments, and throws at any other:** a
      split or a kick for the fuzzball meeting what it meets, a teleport for
      the one crossing into a cell, a free as a brick breaks, and a zap or a
      recharge at any moment. A split, a kick or a recharge asked for no
      fuzzball, as for a brick a zap breaks, is ignored. So a rule written
      for a moment a hook can't serve fails its spec rather than doing
      nothing.
  13. **Events are sorted once,** as the flight ends, by moment, the
      fuzzballs' before the zaps', by fuzzball or zap cell, by kind, then by
      the order they happened in, so what a strike or a zap caused stays
      right after it: a total order, as §5.6 asks.
  14. **A flight's state is a class made once,** and its casts write into
      `Contacts` records kept in a pool and handed back as fuzzballs land,
      so a cast makes nothing.
  15. **The random flights run in four batches of 500,** seeds 20261111 to
      20261114, so each keeps well inside a spec's 5 s under coverage. They
      hold every flight to `orderProblemsOf()`, `trackProblemsOf()` and
      `clearanceProblemsOf()`, and its `capped` to 0. Every flight ends, as
      `fly()` returns. A third of the walls are the stand-ins', a third the
      catalog's, and a third the catalog's with the prism, wool and cage in.
- **Checks.** The workspace's `lint`, `typecheck`, `test` and
  `test:coverage` pass: 2,459 tests in 29 files in `dom` and `pure` (70 in
  `flight.spec.ts`, 34 in `cast.spec.ts`), and the two benchmarks in `sim`;
  the rules and the view at 100% of statements, functions and lines, and
  `flight.ts` at 98.8% of branches, the two left a brick re-read where it
  can't be gone (a portal entered, a zap's brick about to be worn). The
  root's `yarn lint` passes.
- **The mutation pass.** 92 mutants, one at a time, against the flight's and
  the helpers' specs: 88 of `flight.ts`, 3 of `cast.ts`' crossings and 1 of
  `grid.ts`. Before it, four equivalents found by reading were taken out:
  the kicked flag (a kick sums to more than nothing), the corner's
  `into < 0` (always, as met), the teleport's `crosses = false` (`enter()`
  set it then) and the event's sequence number (the sort is stable); the
  last two came back with the review's fixes (comments 2 and 4). 61 were
  killed at once.
  - Survived, then specced (21): only the player's fuzzball hot; a zap
    landing after the fuzzballs at its moment, and the zaps of one moment by
    cell; kicks summed on both axes; the first face and the first corner
    named as what turned it; a corner and a disc met at once, turning about
    their sum's own length; a disc's rules run only for a disc; a charged
    pass through a brick met at its face and corner at once; the strike's
    face, plates, charge and hotness, and a blast's cause, handed to the
    rules; a dropping fuzzball left alone by a break; a split's fuzzballs
    plain; no split event when none leaves; one waypoint for a fuzzball's
    still turns; a contact at the bored distance met; and a crossing just
    past it not.
  - Survived, and the code simplified (2): `contacts.count > 0` beside the
    limit (a cast that meets nothing stops past it) and `Math.min()` on a
    zap's hits (a brick worn past its hits breaks). The survivors and the
    changed lines were rerun, 33 mutants: all killed but the two not specced
    below.
  - Equivalent (6): the split hook's check for a fuzzball, as it was (a
    zap's split was cleared as the next fuzzball met something; the hooks'
    moments replaced it, below); `brickAt()`'s `cell < 0` (speed only); the
    blast's own cell (empty whenever a break sets a blast off); the corner's
    heading set a unit long (rounding only); and `Math.max()` on the moment
    it comes home and its limit, which only rounding could make it pass.
  - Not specced (2): an entry and a contact at one distance, and two
    fuzzballs' moments tying, taken in the other order: each needs two
    distances equal to the bit, which no aim's heading gives, and the first
    changes only whether the turn or the portal comes first, the second only
    two breaks' streaks.
  - After the review, 24 more of its fixes: the cell passed through, set and
    cleared; the teleport's blindness; each hook's moment, its checks and
    resets; and the sequence number. All were killed but the sequence
    number, equivalent while the sort is stable, kept for the total order.
    Two of them hung, a fuzzball crossing back into a cell at its side for
    ever, and were stopped.
- **Numbers.**
  - fly(): one fuzzball, median 38 to 41 µs and 99th percentile 1.3 to 1.4
    ms; with mates or friends, 161 to 170 µs and 3.0 to 3.4 ms; over 1,000
    seeded random flights, five rounds after one that warms the code up
    (three runs on this machine, Node 26). The long ones are walls where
    every brick is a prism, splitting to 16 fuzzballs at once and 44 in a
    flight; §9's budget is over the levels' opening walls, which R6 and Q2
    time.
  - The random flights' 2,000: 10,395 fuzzballs, 290 hot shots and 282
    triples; 33,216 strikes, 6,963 breaks by fuzzballs and 4,873 by 3,360
    zaps; turns off 32,999 side walls, 6,272 ceilings, 247 floors, 21,798
    faces, 5,699 corners and 2,882 bumpers; 2,274 portals, 959 splits, 986
    recharges and 963 frees; 1,650 yawns in 517 flights, none capped. They
    fly in 0.8 s, and the spec's four batches take 1.4 s with their checks.
- **The review:** a fresh agent found the Charge rule, C1 to C5, the clock
  and the event order right, and raised seven points. No second review: the
  fixes correct the change, and its design stands.
  1. A zap chain can outlast `Flight.length`, which `events.ts` makes the
     last landing's `at`: a fuzzball that breaks a row zapper one row off
     the floor lands before the zaps it set off do, so §5.5's skip to
     `flight.length` would cut them. Left: `fly()` keeps K2's contract, and
     changing what `length` means, in `events.ts` and `trackProblemsOf()`,
     is the integrator's. The report raises it, with the later of the last
     landing and the last event as the fix.
  2. A fuzzball through a portal that doesn't send it on was blind to every
     portal past it until it turned, though C3 blinds only one out of a
     portal. Fixed: it skips only the cell it passed into (`passing`, choice
     4), and only a teleport blinds it. Specced: a portal with no twin under
     a pair, a fuzzball out of a portal ignoring two portals in its way, and
     a cell crossed into again once it turns.
  3. A hook asked at a moment it can't serve did nothing, or the wrong
     thing. Fixed: `Hooks` says when each is made, and each throws at any
     other moment (choice 12), specced for each hook, after a turn and after
     a zap.
  4. `byMoment()` relied on a stable sort, where §5.6 asks for a total
     order. Fixed: the sequence number is back as its last key.
  5. The tie's docs said "the one that left first", where the code takes the
     lower numbered, as §5.6 orders fuzzballs; and the kick's override was
     only under "Built". Fixed: the docs say the lower numbered, and choice
     11 the override.
  6. `flight.ts` holds the Charge arithmetic, the turn and the zaps' reach.
     Left for R4, whose `strike()` §6 puts in `bricks/bricks.ts` (choice 2);
     the reach stays with the clock that lands the zaps.
  7. Nothing bounds fly()'s loop if a fuzzball turned over and over a hair
     apart, which C2's still turns, counted at one moment, wouldn't catch.
     Left: no case was found, the 2,000 random flights cap none, and a guard
     no spec reaches would hold a line no spec runs.

### R3, after the merge: a flight as long as its last event

- **Date.** 2026-11-10.
- **Built.** The integrator's change to K2's contract, made here at its
  request, for the first point of R3's review: a zap chain could outlast
  `Flight.length`, then the last landing's `at`, and §5.5's skip, which sets
  the clock to `flight.length`, would cut it short. `Flight.length` is now
  the last event's `at`: the last landing's, or the last zap's when a chain
  outlasts every fuzzball, so a flight skipped to its end skips none of it.
  `events.ts` says so, as does §5.3's `Flight` in the plan. `fly()` takes
  the latest `at` among its events, where it took its fuzzballs' landings,
  with a reduce rather than a spread, so a flight of many events passes no
  argument for each; `trackProblemsOf()` holds a flight to it, its problem
  now "not as long as its last event"; and `played()` gives each fixture its
  last event's `at`. `orderProblemsOf()` takes no length, so it stays as it
  was.
- **What changes.** No fixture's length: in each, the last event is the last
  landing. Nothing in the view, the scene or the app reads `length` yet.
- **For V3.** A skip to `flight.length` may now land zaps with no fuzzball
  in the air, a zap after the last landing being what can clear a level.
- **Checks.** On `brick-fuzz-pop` after the rebase, the workspace's `lint`,
  `typecheck`, `test` and `test:coverage` pass: 3,564 tests in 57 files in
  `dom` and `pure` (71 in `flight.spec.ts`), and the two benchmarks in
  `sim`; the rules and the view at 100% of statements, functions and lines,
  and `flight.ts` at 98.8% of branches, as before. The root's `yarn lint`
  passes.
- **New specs.** `fly()`'s shot up into a row zapper one row off the floor:
  the fuzzball lands at 1, the row zap breaks a column zapper then, and its
  zap lands at 1.5, the flight's length, with no order or track problem.
  `trackProblemsOf()` takes a flight as long as a zap after its last
  landing, and finds one only as long as that landing.
- **The mutation pass.** 11 mutants, against the flight's and the fixtures'
  specs: 9 killed, among them `fly()`'s length taken from its fuzzballs
  again and the check counting landings only. Two survivors, both
  equivalent: `played()` taking the length from the landings, since no
  fixture has a zap after its last landing; and `fly()`'s reduce starting
  from 1 rather than 0, since no flight is shorter than 1, a fuzzball having
  to rise from the floor to a wall whose bricks stand in field row 1 or
  higher, and come back.
- **Numbers.** The fixtures' lengths, unchanged: 12.73 for the plain shot,
  the zaps, Cleared and Lost; 15.56 for the punch, 29.70 through, 16.97 for
  the hot shot, 16.96 for the triple, 13.43 for the friend and 66.65 for the
  bored.
- **The review:** a fresh agent found the change right, every reader of
  `length` in step with it, and nothing else in the repository relying on
  the old meaning, and raised five points. No second review: the fixes
  correct the change.
  1. `fly()`'s `Math.max(...)` spread passed an argument for every event,
     where engines cap a call's arguments, and nothing caps a flight's
     events. Fixed: a reduce over the sorted events. The reviewer's
     `events.at(-1)?.at ?? 0` reads as the contract does, but its `?? 0` is
     a branch no flight reaches, every flight having a landing.
  2. `flight.ts`' header and `fly()`'s doc still ended the flight at the
     last landing. Fixed: both say the zaps land too; the header, which R3
     left wrapped short at one line, is rewrapped.
  3. `events.ts`' "skips none" said none of what. Fixed: "so no event comes
     later".
  4. `ZAP_AFTER` was written `as const satisfies FlightEvent`, where its
     neighbours take the file's `EventOf<K>`. Fixed.
  5. The new `fly()` spec could sit under `describe("fly")`, being about the
     flight. Left: it sits with the specs of when zaps land, under
     `describe("fly's hooks")`.

### R4: the first five kinds

- **Date.** 2026-11-10.
- **Built.**
  - `src/rules/bricks/bricks.ts`: `strike(hits, struck)` works out what a
    fuzzball's strike does to a brick with hits left and to the fuzzball
    (`Strike`: the hits it took, the hits left, the charge after, whether
    the brick earthed it, and whether the fuzzball passes through), as
    plan.md's "Charge" says, once the brick's rules have said in `Struck`
    whether the strike hurts it and whether it earths the charge. `fly()`'s
    strike calls it, where R3 worked the arithmetic out inline (R3's choice
    2).
  - `src/rules/bricks/traits/never.ts`, `earths.ts` and `zaps.ts`:
    `NEVER_RULE` shields its brick from every strike, a fuzzball's, a zap's
    or a blast's; `EARTHS_RULE` has it earth the charge; `ZAPS_RULE` sets
    off a zap of its pattern from its cell as it breaks, whatever broke it.
  - `src/rules/bricks/traits/not_until.ts`: `notUntil(what, level)`, the
    error for something played before the level that brings it in, and
    `comesAt(level)`, the rule of a trait whose kind comes in later, which
    throws it at each of the four moments.
  - `src/rules/bricks/trait_rules.ts`: `TRAIT_RULES`, typed `TraitRules`,
    K2's `{ readonly [K in TraitKind]: TraitRule<TraitOf[K]> }`: the three
    rules above, and `comesAt()` for `recharges` (14), `frees` (15), `kicks`
    (19), `splits` (20), `teleports` (21), `plated` (22), `shelled` (28) and
    `regrows` (29), each its first kind's level in plan.md's table of
    bricks.
  - `src/testing/stand_ins.ts`: `STAND_IN_RULES` takes steel's two rules
    from the bricks' own, and `struckOf()` makes a `Struck` for the specs.
  - `src/testing/flights.ts`, new: `flyPicture()` flies a shot at a wall
    drawn as a picture by the bricks' own rules, and `eventsOf()`, moved out
    of `flight.spec.ts`, picks a flight's events of a kind.
  - `src/testing/random_flights.ts`: the random walls of the catalog's own
    kinds are flown by `TRAIT_RULES`, the other two thirds by the stand-ins'
    rules, as before.
  - `flight.spec.ts` flies the hand fixtures by `TRAIT_RULES`.
- **Names added to files that aren't the stream's.** `TRAIT_RULES`, in
  `src/rules/bricks/trait_rules.ts`, a file the integrator owns, written
  here as §6 R4 and the integrator's go-ahead ask. `src/testing/flights.ts`
  is a new file of the specs' helpers.
- **Choices the plan didn't make.**
  1. **`strike()` reads the rules' verdict, and doesn't run them.** `fly()`
     runs a brick's `struck` rules for a fuzzball's strike and for a zap's
     alike (`struckBy()`), so `strike()` takes the strike as they left it.
     C1's order is `cast()`'s, which lists what a fuzzball meets at once
     with faces before corners, each from the floor up, then left to right;
     `fly()` strikes in that order, each strike spending the charge the last
     one left.
  2. **A strike makes one record,** `Strike`, alongside the strike's event,
     so `fly()` still makes records only as events are.
  3. **A brick that earths turns the fuzzball, though it breaks,** as
     "Charge" says an earthed fuzzball turns: one that is hurt and earths,
     which no kind is yet, takes its hits out of the charge, then the rest
     of it, and the fuzzball turns off it. A spec holds it.
  4. **A hot shot is kept from earthing by `strike()`,** not by each rule:
     `EARTHS_RULE` earths every strike, and `strike()` keeps a hot shot's
     charge, so the plate and the bumper won't need to look.
  5. **A trait to come throws at every moment,** so a brick with one throws
     at the first a flight reaches it at: a strike, a zap's reach, a
     crossing into its cell. Its message names the trait and the level.
  6. **The zaps' rule plays the row and the column,** and throws for the
     bomb's blast (10), the cross (11) and the X (13), as §6 R4 has it cover
     the row and column for now. `fly()` reaches every pattern already (R3's
     choice 9), and `STAND_IN_RULES`' zaps play every one, so X1 only drops
     the throw.
  7. **Each trait's rule is a constant, `<TRAIT>_RULE`,** in its own file,
     and `TRAIT_RULES` lists them, the later traits' levels beside them.
- **Specs.**
  - `bricks.spec.ts`, 12: `strike()` for a plain fuzzball, a charged one
    that breaks a brick with charge to spare, with none, and one that
    doesn't, a shielded strike, steel earthing a charge and earthing nothing
    of a plain fuzzball, a brick that is hurt and earths, and a hot shot
    through a brick, off one of six hits and unearthed.
  - `traits/never.spec.ts` and `earths.spec.ts`, 8: each rule on a
    `struckOf()`: steel shielded from a plain, charged or hot fuzzball, a
    zap and a blast, and a brick earthing each fuzzball.
  - `traits/zaps.spec.ts`, 7, flights by the catalog and `TRAIT_RULES`: a
    row zap half a unit after its zapper breaks, two hits off each brick in
    the row; a row zap and a column zap past steel, the steel left whole,
    the column's as far as the ceiling and not into the row waiting over it;
    a zap set off by a zapper a zap broke, half a unit later; and a zapper
    of the blast, the cross and the x throwing as it breaks, with their
    levels.
  - `traits/not_until.spec.ts`, 5: `notUntil()`'s message, and `comesAt()`
    throwing at each of its four moments.
  - `trait_rules.spec.ts`, 11: each later trait throwing with its level;
    then flights: steel earthing a charge of 3, and a hot shot unearthed on
    it twice, the second after its bounce; and C1's floor up, a shot at 45°
    into the pocket under one tough brick and beside another a row lower
    spending its charge of 2 on the lower and turning off the upper's face.
- **Checks.** On `brick-fuzz-pop` at 5f0e0c27 after the rebase, the
  workspace's `lint`, `typecheck`, `test` and `test:coverage` pass: 3,812
  tests in 68 files in `dom` and `pure` (43 in `src/rules/bricks/`, 71 in
  `flight.spec.ts`), and the two benchmarks in `sim`; the rules and the view
  at 100% of statements, functions and lines, `src/rules/bricks/` at 100% of
  branches, and `flight.ts` at 98.7%, the same two lines left as in R3. The
  root's `yarn lint` passes.
- **The mutation pass.** 54 mutants, one at a time, against
  `src/rules/bricks/`, `flight.spec.ts` and `src/testing/`'s specs: 21 of
  `strike()`, 4 of steel's two rules, 9 of the zaps' rule, 5 of
  `not_until.ts`, 12 of `TRAIT_RULES` (a rule swapped, emptied, or a level
  moved to a neighbour's) and 3 of `fly()`'s strike. All killed, one by
  hanging: `strike()` letting a fuzzball through a brick it took no hit off,
  which sends it through steel, met again at once, without end, so a flight
  that never ends can be made only by breaking the Charge rule. After the
  review, the 30 mutants of the trait rules and `TRAIT_RULES` ran again
  against the specs as they now stand, with four of `strike()`'s pass
  through, dropping the earthing check among them: all killed.
- **Numbers.** The random flights fly as R3's did, the catalog's third by
  `TRAIT_RULES` playing what the stand-ins' rules played. fly()'s benchmark,
  three runs under a load of about 11 from the other streams: one fuzzball,
  median 39 to 45 µs and 99th percentile 1.3 to 1.9 ms; with mates or
  friends, 163 to 193 µs and 3.1 to 3.8 ms, as R3's.
- **The review:** a fresh agent found `fly()`'s flights unchanged,
  `strike()` the same arithmetic as the code it replaces, the rules as
  plan.md's "Charge", "Boons" and "The bricks" and C1 say, and the levels as
  plan.md's table gives them, and raised five points. No second review: the
  fixes correct the change, and its design stands.
  1. A brick that is hurt and earths let a fuzzball through it, where
     "Charge" says an earthed fuzzball turns, and `EARTHS_RULE`'s doc said
     so too. Fixed: an earthed strike never passes (choice 3), its spec
     turned round.
  2. The column zap's spec said "as far as the ceiling" with nothing over
     it. Fixed: a brick waits over the ceiling, and the zap leaves it
     standing.
  3. The zaps' rule was specced by the calls it made of a fake, where a
     flight shows what it does. Fixed: `zaps.spec.ts` flies the catalog's
     zappers, the row and column flights moved there from
     `trait_rules.spec.ts`, and a made-up zapper of each later pattern;
     `NotedHooks` and `HookCall` are gone, and `comesAt()`'s spec hands it
     hooks that throw if asked.
  4. `TRAIT_RULES`' and `ZAPS_RULE`'s docs opened with more than one
     sentence, the first said `playRound()` hands `TRAIT_RULES` on, which
     waits for R6, and `strike()`'s restated the Charge rule. Fixed: each
     opens with one sentence, `playRound()` is gone, and `strike()`'s keeps
     only the hot shot.
  5. The never and earths specs built their strikes as the file was
     collected and the rule then changed them, a hot shot struck with no
     charge, `eventsOf()` was written in three specs, `3` and `3.5` sat
     beside `2.5 + ZAP_DELAY`, and the random flights would throw once a
     kind is cataloged before its rule. Fixed: each strike is built in its
     test, the hot shot charged to the most, `eventsOf()` in
     `src/testing/flights.ts` for the rules' specs
     (`flight_fixtures.spec.ts`' own takes a fixture, and is the
     integrator's), every moment a sum of `ZAP_DELAY`, and
     `random_flights.ts`' doc says a kind cataloged makes them throw until
     its rule lands.

### R6: the round and the guide

- **Date.** 2026-11-10.
- **Built.**
  - `src/rules/round/round.ts`: `playRound(start, shot, levelBoon, rules)`
    flies the shot by the catalog and `TRAIT_RULES`, the bored distance from
    `rules`, and returns the `Round`: the flight; what it came to, each
    break's points (the streak's multiplier already in them) and
    `JUMP_POINTS` for a jump, the bricks broken, the friends freed, the rows
    the wall came down and whether it jumped, and cleared, lost or on; and
    the next round's start. K2's throwing stand-in is gone. `playRoundBy()`
    flies by the kinds and the trait rules it is handed; `flightRulesOf()`
    says what a round's flight is played by, the catalog, `TRAIT_RULES` and
    the bored distance; and `flightStartOf()` how its fuzzballs leave: a hot
    shot or a triple shot's mates by the boon, the crew behind.
  - `src/rules/flight/guide.ts`: `guideOf(start, shot, pastTurn, rules)`
    returns the `Guide`, `{ dots, punched }`, `GuidePlace` its dots' places,
    the shape `src/scene/stand_ins.ts` stands in for in S2's branch, name
    for name; how far past the first turn it runs is handed to it (choice
    10).
  - `src/rules/flight/flight.ts`: `fly()` takes a stop, `FlightStop`,
    `{ stop: "first-turn", extra }`, as §6 R6 writes it, and `Flown.punched`
    lists the bricks the player's fuzzball punched through.
  - `src/rules/tuning.ts`: `GUIDE_DOT_GAP`, 0.5, how far apart the guide's
    dots lie; and `GUIDE_PAST_TURN`'s doc says it is what `guideOf()` is
    handed unless the debug menu retunes it.
  - `src/rules/wall/wall.ts`: `isDepth()`, whether a value is a depth a
    field has, a whole number from 11 to 22, as the integrator asked, which
    `thirdsOf()` now asks. It takes any value and narrows it to a number, as
    `isAim()` does, so `saved_game.ts`'s `hasDepth()` and the debug menu's
    depth checks, which each make the same check, can switch over to it;
    they are left as they are.
  - `src/testing/flights.ts` takes `near()` from `flight.spec.ts`, for the
    round's specs too, and `src/testing/timing.ts`, new, reads the
    benchmarks' times, which `cast.spec.ts` and `fly.spec.ts` each read for
    themselves before.
  - `frontend/games/brick-fuzz-pop/AGENTS.md`, as the integrator asked: the
    rules' section says what `src/rules/bricks/`, `fly()`, the hooks, the
    guide and the round hold now, the Tests section the benchmarks and the
    helpers R3 to R6 added, and the opening no longer lists R3, R4 and R6 as
    to come.
- **Names added to files that aren't the stream's.** `GUIDE_DOT_GAP` in
  `tuning.ts`, and a line on `GUIDE_PAST_TURN`'s doc; `isDepth()` in
  `wall.ts`; `playRoundBy()`, `flightRulesOf()` and `flightStartOf()` in
  `round.ts`, beside K2's types; and the workspace's `AGENTS.md`, at the
  integrator's request.
- **Choices the plan didn't make.**
  1. **The guide gives dots, not points for the view to space,** as S2's
     stand-in takes them, where §5.1 has the view's `guide.ts` turn points
     into dots: each `GUIDE_DOT_GAP` of flight from where the fuzzball
     waits, the first a gap out, as `positionAt()` finds them on the
     player's track, so a portal's jump has none across it.
  2. **The guide flies the player's fuzzball alone,** as the round flies it,
     by the rules a round is handed, so a bored distance the debug menu
     retunes shows too. Its mates and friends would only follow its path:
     one could change it before the stop only through a zap set off behind
     it that lands, within 1.5 of the turn, on a brick in its way, and
     flying a triple shot's two and six friends took 473 µs at the 99th
     percentile, past the plan's 0.2 ms. The specs hold the guide to the
     round's own flight, followers and all, on every level's opening wall.
  3. **A stopped flight ends `extra` past the player's first turn,** a
     mate's or a friend's turn not counting: nothing due after it happens, a
     zap due at it lands, each fuzzball out ends its track where it is then,
     and one yet to leave has none. A flight whose player's fuzzball never
     turns, as a bored distance retuned to almost nothing allows, flies to
     its end.
  4. **`punched` is the player's fuzzball's,** noted by `fly()` as
     `strike()` says it passes, rather than worked out again from the strike
     events.
  5. **A yawning fuzzball is headed straight down** as it drops, so a flight
     stopped mid-drop leaves it under its yawn; the heading was unread once
     it dropped.
  6. **`playRoundBy()` is exported** so a spec frees a friend: no cataloged
     kind frees one until X1, and the crew's growth would otherwise go
     unrun.
  7. **The next round starts** from the player's fuzzball's landing, held
     `SIDE_MARGIN` off a side wall; with the wall as it came down, or as the
     flight left it once cleared; the friends freed added to the crew in the
     order freed, with no cap, as a level holds six cages at most; the
     level's boon after a jump; and the depth as it was, which the view
     changes between rounds.
  8. **The result is the flight's wall's:** cleared when it holds nothing
     the level needs, lost when coming down brings a needed brick to the
     floor's row, else on.
  9. **The guide's time is held in `sim`,** to 1 ms at the 99th percentile,
     five times the plan's 0.2 ms, and printed, plain and hot.
     `playRound()`'s own benchmark, which §9 lists, isn't written: §6 R6
     doesn't ask for it, and `fly.spec.ts` times the flight, nearly all of a
     round.
  10. **The guide's length is handed to it,**
      `guideOf(start, shot, pastTurn, rules)`, where §5.5 and §6 R6 write
      `guideOf(start, shot)` and the guide reads `GUIDE_PAST_TURN`, as the
      integrator asked: the debug menu retunes the guide's length, and the
      rules are handed what it retunes rather than reading it. The caller
      passes `GUIDE_PAST_TURN` or the menu's number; the bored distance
      comes in `rules`, as `playRound()`'s does. A length below 0 isn't
      checked: the doc says not below 0, and the menu's slider starts at 0.
- **Specs.**
  - `round.spec.ts`, 29: each of the eleven hand-made rounds played whole as
    `flight_fixtures.ts` works it out, its flight, its outcome and its next
    start; the same shot played twice at each level's opening wall making
    the same round; what it is handed left as it was, against a deep clone;
    the next start held off each side wall; a retuned bored distance flown;
    a friend freed into the crew after those it had (`playRoundBy()`, with
    the stand-ins' cage); `flightRulesOf()`; and `flightStartOf()` for a
    triple shot with friends and for a hot shot.
  - `guide.spec.ts`, 80: at every level's opening wall 11 and 22 deep, four
    shots across the aims, plain, charged, a triple shot with two friends
    and a hot shot, the dots matching where the player's fuzzball is in the
    round's own flight at each gap, to its first turn and 1.5 past it or its
    landing; the dots running on as far past the turn as the guide is
    handed; the dots turning with it; the bricks a charged shot punches
    through and not the one it turns off, none for a plain shot, and every
    one a hot shot breaks; what it is handed left as it was; and a fuzzball
    that yawns before the guide ends dropping straight down. Those worked
    out by hand run their own 1.5 past the turn, so a `GUIDE_PAST_TURN`
    retuned in the debug menu and pasted in doesn't break them.
  - `flight.spec.ts`, 4 more: a stop ending every fuzzball's track where it
    is, a mate's turn not moving it and a friend yet to leave having none;
    no zap landing past it and one landing at it; and `punched` the player's
    alone, though a mate charged as it punches through a brick too.
  - `wall.spec.ts`, 9 more: `isDepth()` taking 11, 16 and 22, and refusing
    10, 23, 11.5, `NaN`, `"11"` and `null`.
  - `benchmarks/guide.spec.ts`, in `sim`: `guideOf()` at every level's
    opening wall at every depth, every eighth aim, the charges in turn,
    plain and as a hot shot.
- **Checks.** On `brick-fuzz-pop` at a2b95db9 after the rebase, the
  workspace's `lint`, `typecheck`, `test` and `test:coverage` pass: 4,199
  tests in 80 files in `dom` and `pure`, and the three benchmarks in `sim`;
  the rules and the view at 100% of statements, functions and lines,
  `round.ts` and `guide.ts` at 100% of branches, and `flight.ts` at 98.8%,
  the same two lines left as in R3. The root's `yarn lint` passes.
- **The mutation pass.** 40 mutants, one at a time, against
  `src/rules/flight/`, `src/rules/round/`, `src/rules/bricks/` and
  `src/testing/`'s specs: 14 of `fly()`'s stop, `punched` and the drop, 6 of
  `guideOf()` and 20 of `playRound()`, `flightStartOf()` and the scoring. 35
  killed at first. A zap landing at the stop itself survived, and is
  specced. 6 more, after the guide's length and `isDepth()` came, were all
  killed: the guide run 1.5 past its turn whatever it is handed; `isDepth()`
  taking a fraction, refusing 11 or 22, or asking one bound alone; and
  `thirdsOf()` not asking it. Four of the 40 are equivalent:
  1. `fly()`'s stop not handing back a fuzzball's `Contacts` record, which
     only makes the next flight make one;
  2. the guide's dots taken along every track rather than the player's,
     since every fuzzball behind it leaves at 0.7 or later, past the first
     dot, and its track gives none;
  3. the next start's `x` set first to 0 rather than `start.x`, since every
     flight lands the player's fuzzball, which sets it;
  4. the guide flying the player's fuzzball alone rather than with its mates
     and friends, since on no wall a spec flies does one behind it change
     its track before the stop. The review's point 3 made that the code, and
     its inverse, flying them, survives alike; of the 4 more mutants run
     after the review, of `flightRulesOf()` and the rules the guide and
     `playRound()` hand on, it is the one not killed.
- **Numbers.** `guideOf()`, in `sim`, over 26,892 guides each, plain and
  hot, over several runs under loads of 7 to 11: plain, median 12 to 16 µs
  and 99th percentile 44 to 53 µs; hot, median 12 to 16 µs and 99th
  percentile 69 to 87 µs; against the plan's 0.2 ms. A triple shot with six friends,
  flown whole, took 62 µs at the median and 473 µs at the 99th percentile.
  Every hand-made round replays through `playRound()` with no change to a
  fixture.
- **The review:** a fresh agent found no bug: a flight with no stop flies as
  before, the stop sound, `playRound()` as the fixtures and the plans have
  it, `Guide` the scene's stand-in name for name, and each spec's numbers
  right by hand; it raised seven points. No second review: the fixes correct
  the change.
  1. `AGENTS.md` said the guide flew the player's fuzzball alone, where it
     flew the whole round. Fixed, as the guide now does fly it alone (point
     3).
  2. `guideOf()` built the round's flight rules again, so its promise to fly
     as `playRound()` does rested on two copies. Fixed: `flightRulesOf()`,
     in `round.ts`, serves both.
  3. The guide's benchmark timed only openings with no boon or crew, and a
     triple shot with six friends, flown whole, took 473 µs at the 99th
     percentile, past the plan's 0.2 ms. Fixed: the guide flies the player's
     fuzzball alone (choice 2), and the benchmark times hot shots too.
     `playRound()`'s own benchmark, which §9 lists, is left: §6 R6 doesn't
     ask for it (choice 9), and the integrator asked for nothing past R6's
     list.
  4. The benchmarks' `quantile()` and their reading of times were written
     three times. Fixed: `src/testing/timing.ts`.
  5. `playRoundBy()` flies by the kinds it is handed, but the wall comes
     down and is judged cleared by the catalog's. Fixed: its doc says so.
  6. `fly()` reads a stop's `extra` but not its `stop`, so a second kind of
     stop would fly as "first-turn". Left: there is one kind, and the type
     admits no other; the one that adds a second switches on it.
  7. `near()`'s doc lacked an "of". Fixed.

  A second fresh agent reviewed the guide's length and `isDepth()`, which
  came after the first review at the integrator's request. It found no bug
  and raised four points; no third review, as the fixes correct the change.

  1. The specs worked out by hand passed `GUIDE_PAST_TURN` but expected what
     1.5 gives, so a length retuned in the debug menu and pasted into
     `tuning.ts` would break them with `guideOf()` unchanged. Fixed: they
     run their own `PAST_TURN`, 1.5; the openings, whose dots are worked out
     from the round, and the benchmark read `GUIDE_PAST_TURN` still.
  2. `isDepth()` took only a number, so `saved_game.ts`'s `hasDepth()`, the
     same check of a value kept, couldn't use it. Fixed: it takes any value
     and narrows it to a number, as `isAim()` and `isCharge()` do, and
     refuses `"11"` and `null` too. `hasDepth()` and the debug menu's checks
     are left as they are.
  3. This entry gave `guideOf(start, shot, rules)`, and didn't say it
     departs from the plan's `guideOf(start, shot)`. Fixed: choice 10.
  4. Nothing said or checked what `pastTurn` may be: below 0 the stop would
     move the fuzzballs back, and `NaN` would fly the whole round. Its doc
     says not below 0; it isn't checked, as the menu's slider runs from 0 to
     12 and `GUIDE_PAST_TURN` is 1.5.

### P3: certificates, the report and the `sim` specs

- **Date.** 2026-11-10.
- **Built.**
  - `tools/certify-levels.mjs` (`yarn certify:levels`): the solver,
    `solveLevel()`, for each level on each depth, a job each, on a pool of
    `worker_threads` as many as `os.availableParallelism()`, each thread
    loading `CERTIFY_API` through Vite and taking the next job as it
    finishes one. It writes `src/rules/levels/certificates/<set>.json`, each
    level's line on each depth, and `src/rules/levels/par.json`, `parFrom()`
    of each line's rounds, keys sorted, the same bytes every run; prints
    each level's rounds and how widely the solver searched, depth by depth;
    takes `--set`, `--level` and `--depth`, the last once for each depth;
    reads every set's certificates before it solves anything; stops every
    thread once one fails, naming the level and depth a job failed on; and
    exits with 1 where a level has no line.
  - `tools/report-levels.mjs` (`yarn report:levels`): `@fz/dev/report`'s
    table of the careless player's games, the depths in place of the speeds,
    40 games a level on fields 11, 13 and 22 deep, or on each `--depth`
    given, counting in rounds: how often it cleared each level, marked `!`
    under its set's floor, and the rounds and the jumps a game took at the
    mean. It fails where a level falls under its set's floor.
  - `src/testing/script_api.ts`, the scripts' types, importing nothing, and
    `certify_api.ts` (`CERTIFY_API`) and `report_api.ts` (`REPORT_API`),
    what each script loads, held to them, all three on `HELD_AS_RULES`
    already. `CERTIFY_API` replays each line the solver finds and throws for
    one that doesn't hold.
  - `src/testing/solver.ts`: `lineHolds()`, beside `replayLine()`, whether a
    line played holds as a certificate: cleared, in as many rounds as it has
    shots, every needed brick kept over `DANGER_ROW`, as the proof stream
    asked.
  - The `sim` specs: `src/rules/levels/every_level/`, a file a depth,
    twelve, each replaying every level's certificate through `replayLine()`
    and holding it with `lineHolds()`; and `every_floor/`, a file a set and
    depth, `warm-up_11`, `_13` and `_22` so far, each holding the careless
    player over 20 games to the set's floor. Each takes its variant from its
    name with `variantOfSpec()`, through `src/testing/every_level.ts`
    (`holdEveryCertificate()`, `holdEveryFloor()`), and
    `every_level.spec.ts`, in `pure`, holds both folders to a file for each.
    A missing or failed line says to run `yarn certify:levels`.
  - `src/rules/wall/wall.ts`: `DEPTHS`, every depth a field has, beside
    `isDepth()`.
  - `package.json`: `certify:levels` and `report:levels`, and
    `test:coverage`'s `sim` run without `--passWithNoTests`.
  - `frontend/games/brick-fuzz-pop/AGENTS.md`: the levels' certificates and
    their specs, `DEPTHS`, the two scripts and their commands, the `sim`
    project's new specs, the new helpers and the held files.
- **Names added to files that aren't the stream's.** `DEPTHS` in `wall.ts`;
  `lineHolds()` in P2's `solver.ts`, with its spec in `solver.spec.ts`;
  `script_api.ts`, `certify_api.ts` and `report_api.ts`, which
  `eslint.config.js` named; and the workspace's `AGENTS.md`.
- **Choices the plan didn't make.**
  1. **A job names a level by its number and a depth,** and each thread
     loads the rules and the solver for itself, as `report:levels` loads its
     API: a thread of the pool runs the script's own file, told from the
     script by what it is started with. A thread takes the next job as it
     finishes one, as the levels' costs differ several times over, so the
     lines come in another order each run; the script orders all it writes.
  2. **`--set`, `--level` and `--depth` certify only those,** keeping a
     set's other lines as they are written and dropping those of a level the
     set no longer has; `par.json` is written afresh from every set's
     certificates each run, so a par never outlives its line. `--level`
     takes a level's id or its number, and `--depth` is given once for each
     depth, as `report:levels` takes it.
  3. **A level with no line on a depth is left none there,** the lines found
     still written, and the script exits with 1, so a long run isn't lost to
     one level, and the specs fail for that level until it is redrawn.
  4. **The script writes the files as Prettier lays them out,** a shot a
     line but in a line of one shot, as `prettier:check` would otherwise
     fail on them; level ids sorted, depths in order.
  5. **It prints a level's line once it and every level before it are
     done:** its number and name, its lines' rounds, fewest to most, and the
     searches its lines took, narrowest first, each by its depths ("every
     4th aim, greedy on 12 to 22; every aim, a beam of 4 on 11"), or "no
     line on" them. It prints no time, so its output is the same each run.
  6. **The report plays 11, 13 and 22 deep by default,** the depths the
     specs hold the floors on, `--depth` given once for each other; 40 games
     a level, as plan.md's table was played, seeded
     `number × SEED_STRIDE + game` as `printReport()` seeds, so its first 20
     are the spec's; and the rounds and jumps at the mean, as that table has
     them. A game lost is counted under the table but fails nothing; a level
     under its floor fails it.
  7. **`every_floor/`'s files are named `<set>_<depth>.spec.ts`,** as a
     set's id holds hyphens.
  8. **The certificates are read by the specs' helper, `every_level.ts`
     (`CERTIFICATES`), a file a set imported,** as nothing in the game plays
     one yet; its spec holds it to a set's certificates for every set.
     `certificateOf()` takes the certificates, the game's by default, so its
     spec hands it shots of its own.
  9. **A replay checks the par too:** `par.json` against `parFrom()` of the
     line's rounds, beside `lineHolds()`, and its message says how the line
     played.
  10. **`DEPTHS` is the rules',** in `wall.ts`, where the debug menu,
      `stars.spec.ts` and the scripts' APIs can take it rather than build it
      again.
  11. **No `playRound()` benchmark,** as the integrator said.
- **Specs.**
  - `tools/certify-levels.spec.ts`, 39, over made-up levels in two sets,
    solved in the spec's own thread and written to files in memory: the
    command line; the jobs for each option, `--depth` given twice, and each
    mistake; the files' layout and order; each set's lines and every par
    written; the same bytes a second time; the levels, and each search's
    depths, printed in order however the jobs finish; a depth certified
    keeping the other lines and sets; a level's lines dropped once its set
    lacks it; the searches by depth, narrowest first, spans of three or
    more; no line on a depth and on every depth; a set's certificates that
    aren't JSON named before anything is solved; the usage and a misread
    certifying nothing; the pool, on a thread written in the spec, sharing
    jobs between two threads, and rejecting with what failed once a thread
    throws or stops; and, for real, a job solved on a thread of the pool,
    its line clearing the level with a row to spare, a failing job's level
    and depth named, and `CERTIFY_API` loaded through Vite.
  - `tools/report-levels.spec.ts`, 19, over made-up levels in sets held to
    90 and 40: the command line; its defaults the specs' depths and more
    than their games; the table; the depths `--depth` names, in order, once
    each; the seeds a thousand apart; the means and the games lost counted
    without failing; a level under its floor marked and failing, and one at
    its floor unmarked; a set with no floor refused before a game is played;
    the usage and a misread; and `REPORT_API` loaded through Vite, a game
    played as `playCasually()` plays it.
  - `src/testing/every_level.spec.ts`, 9: both folders a file for each and
    no more, a floor spec's name, `CERTIFICATES` a key a set, and
    `certificateOf()`'s shots, a depth it lacks, the game's certificates by
    default, and a shot that isn't a pair.
  - `wall.spec.ts`, 1 more: `DEPTHS`; and `solver.spec.ts`, 4 more:
    `lineHolds()` holding a line, and refusing one that doesn't clear,
    clears early or lets a needed brick into the danger row.
- **Checks.** On `brick-fuzz-pop` at de89ddbe after the rebase, with P2's
  solver and careless player, the workspace's `lint`, `typecheck`, `test`
  and `test:coverage` pass: 4,537 tests in 86 files in `dom` and `pure`, and
  138 in 18 files in `sim`, the 108 replays and 27 levels held to their
  floor among them, every line holding and every level inside its floor; the
  rules and the view at their floors. The root's `yarn lint` passes.
- **The mutation pass.** 32 mutants, one at a time, against the scripts'
  specs, `every_level.spec.ts` and `wall.spec.ts`: 23 of
  `certify-levels.mjs`'s jobs, merging, writing and printing, 8 of
  `report-levels.mjs`'s columns, floors and depths, and 1 of `DEPTHS`. 24
  killed at first. Two are equivalent, and the code is gone: sorting the
  jobs certified, which nothing reads in order, and sorting a level's
  depths, which JavaScript keeps in order as whole numbers. Six are specced:
  a level with no line on any depth, the beam's order where two searches
  share their aims, "no line" listed first, a set no job touched written
  again, `par.json`'s ids unsorted, and a level cleared exactly as often as
  its floor marked. `lineHolds()`'s 3 mutants, each of its three checks
  loosened, are killed. After the review, 7 more of the code it added: 6
  killed, and emptying the jobs' queue once a thread fails survived, as the
  threads are stopped at once, and is gone. The `sim` specs' helpers aren't
  mutated, as no spec plays them but the `sim` specs themselves; a
  certificate cut short and one taken away fail them, each saying to run
  `yarn certify:levels`.
- **Numbers.** `yarn certify:levels`, for real: Warm-up's 108 lines in 5.6 s
  of wall time on 24 threads, twice, the same bytes both times, under a load
  of 5 to 7; every line found by the first search, greedy at every fourth
  aim, of 2 to 10 rounds, Hello, wall's 2 to 5 and Gatehouse's 5 to 10, as
  plan.md's draft had them. The `sim` project on one worker: 13.3 s by
  Vitest's count, 15.0 s of wall time, against §11's 100 s for CI, the
  levels' 135 specs 8.4 s of it. `yarn report:levels`, 40 games a level on
  11, 13 and 22 deep: 10.2 s, every level 100 in 100 but Plumb line, 95 on
  11 and 13; over the other nine depths, the least was 98, Plumb line on 12
  and Gatehouse on 14, 16 and 17.
- **The review:** a fresh agent found nothing that breaks the change: P2's
  signatures used as given, the held files' fence kept, every check of the
  command line before anything is solved, a partial run's merge, the files
  the same bytes every run, the floor's arithmetic exact both ways and the
  seeds the spec's; it raised nine points. No second review: the fixes
  correct the change.
  1. `every_level.ts` imported `CertifiedShot`, the stand-in's own name,
     which P2 never gave. Fixed: a shot is `Line[number]`.
  2. Nothing specced the order a level's depths are printed in, which only
     the pool's order upsets. Fixed: a spec hands the jobs over backwards
     with three searches and reads the same spans.
  3. The pool's failures had no spec, a failing job named no level, and
     nothing stopped the other threads once one failed. Fixed:
     `solveOnThreads()` takes its pool, so a spec runs threads written in
     it, sharing jobs and failing by a throw and an exit; it stops every
     thread once one fails; and a thread names the level and depth a job
     failed on, which a spec of the real pool reads.
  4. A set's certificates that aren't JSON, as a merge conflict leaves them,
     failed only once every line was solved. Fixed: every set's file is read
     before anything is solved, and one that isn't JSON is named.
  5. The real thread's spec solved the line again in the spec's thread,
     under coverage, against its 30 s, and `holdEveryFloor()`'s 20 games had
     only the default 5 s. Fixed: the thread's line is replayed instead. The
     floors' time is checked against P2's careless player: Warm-up's 27
     floor specs take 5.3 s together on one worker, the slowest 0.31 s, so
     they keep the default.
  6. `report-levels.mjs`' doc called the report the stricter, but more games
     can clear a level more often. Fixed: the two can disagree either way.
  7. A set with no floor got 0 in the report, and a depth was parsed back
     out of its heading. Fixed: the report throws for a set with no floor
     before it plays, and finds a depth by its heading in a map.
  8. The mutation pass's counts by file didn't add up to 32. Fixed: 23, 8
     and 1.
  9. Four small things. `--depth` taken once by `certify:levels` but
     repeatedly by `report:levels`: fixed, both take it repeatedly.
     `stars.spec.ts` still builds its own depths: left, as that file isn't
     the stream's. `certificateOf()`'s spec would pass with its shots
     unchecked: fixed, it takes certificates, and its spec hands it its own.
     `AGENTS.md`'s Tests paragraph had an unwrapped line and said the
     replays go through `playRound()`: fixed, `replayLine()`.

### P3, after the merge: time for the `sim` tests

- **Date.** 2026-11-10.
- **Why.** The root's `yarn verify` failed on `fly.spec.ts`'s benchmark:
  "Test timed out in 5000ms", at 5,256 ms. The workspace's `test` runs `sim`
  beside `dom` and `pure`, and the root runs four workspaces at once on a
  quarter of the cores each, as CI does, so a test of 1.9 s alone passed
  Vitest's 5 s.
- **Built.**
  - `src/testing/timing.ts`: `SIM_TIMEOUT_MS`, 60 s, how long a `sim` test
    that can run past half a second alone may take, with why: `yarn test`
    runs it beside `dom`, `pure` and the other workspaces' tests.
  - It is handed to the suites of `fly.spec.ts`, `guide.spec.ts`,
    `cast.spec.ts`, `play_round.spec.ts` and `random_rounds.spec.ts`
    (`describe(name, { timeout }, …)`), and to `holdEveryFloor()`'s suite
    in `every_level.ts`. Neither `@fz/dev` nor `vitest.config.ts` changes.
  - `AGENTS.md`: `timing.ts`'s bullet names it.
- **Choices.**
  1. **A suite's options carry the timeout,** which Vitest hands its tests
     (checked with a suite of 100 ms over a test of 400 ms, which timed
     out), so each spec's tests stay as they were. `holdEveryFloor()`'s
     suite title moves into a `const`, as Prettier reflows the whole suite
     once the template and the options share the call.
  2. **The floors' tests take it though they run 0.32 s alone,** which
     reverses the last entry's review, item 5, where they kept the default:
     later sets' walls hold up to twice the hits of Warm-up's heaviest, 580
     against Plumb line's 282, and the careless player's rounds up to 29
     against 13 (plan.md's level table), which can take a floor past half a
     second. The certificates' replays, 20 ms at most, and
     `random_rounds.spec.ts`'s first test, 52 ms, which shares its suite's,
     need none.
- **The tests past 0.5 s alone,** on one worker under a load of 8 to 13:
  `fly.spec.ts`'s 2,034 ms, `guide.spec.ts`'s 1,584 ms, `cast.spec.ts`'s 695
  ms, `random_rounds.spec.ts`'s ten batches 404 to 615 ms, and
  `play_round.spec.ts`'s 504 ms; then the floors' 27, 124 to 316 ms.
- **Checks.** On `brick-fuzz-pop` at 4300da0f after the rebase: the
  workspace's `lint`, `typecheck` and `test:coverage` pass, 4,618 tests in
  87 files in `dom` and `pure` and 150 in 20 in `sim`, and the root's
  `yarn lint`. `yarn workspace brick-fuzz-pop test --maxWorkers=1`, with 36
  threads spinning beside it under a load of 46, passed its 4,768 tests in
  105 s, `fly.spec.ts`'s at 2,910 ms and `guide.spec.ts`'s at 2,154 ms.
- **The mutation pass.** None: the change gives time, which no spec sees on
  a machine that has it.
- **The review:** a fresh agent found no fault in what the change does: a
  suite's options reach its tests in Vitest 5.1.0, and every `sim` spec that
  can run long is covered. Three points, all taken.
  1. The floors took the timeout as `it.each`'s third argument, unlike the
     benchmarks, and the log's reason, a template title, isn't Vitest's.
     Fixed: their suite takes it in its options, its title in a `const`.
  2. The constant's doc said `sim`'s specs hold no time, which
     `guide.spec.ts`'s 1 ms at the 99th percentile belies and which doesn't
     say why, in four lines where one was asked for. Fixed: one line, what
     runs beside it and what 2 s alone has done.
  3. The second choice reversed the last entry's review, item 5, without
     saying so, and its nine times set the heaviest later wall against
     Warm-up's lightest. Fixed: it names the reversal, and sets 580 hits
     against Plumb line's 282 and 29 rounds against 13.

### X1, first piece: every zap's pattern, and wool's recharge

- **Date.** 2026-11-11.
- **Why two pieces.** The integrator's order: the art stream commits the
  bomb's, wool's, the cage's and the zappers' new art unwired; once it is
  merged, `sparks.ts` and `BRICK_ART`'s lines for the five land in one
  commit, as `BRICK_ART` is typed over the catalog's ids. The traits come
  first.
- **Built.**
  - `src/rules/bricks/traits/zaps.ts`: the rule hands every pattern to
    `hooks.zap()`, its throw for the blast, the cross and the X gone, as
    R4's choice 6 left it to do. `not_until.ts` now names only traits, its
    message written in `comesAt()`, and its spec's trait to come is the
    cage's.
  - `src/rules/bricks/traits/recharges.ts`: `RECHARGES_RULE`, wool charging
    the fuzzball that broke it to the most as it breaks; a zap's or a
    blast's break charges none, as the hook ignores no fuzzball.
    `TRAIT_RULES` takes it, and `trait_rules.spec.ts`' list of traits not
    played yet is the cage's alone.
  - `src/testing/stand_ins.ts`: `STAND_IN_RULES` zaps and recharges by the
    real rules, which its copies had been.
  - Specs: `zaps.spec.ts` flies the bomb's blast, about it, past steel,
    under it once a zap breaks it, none over the ceiling, and a bomb set
    off by a blast; the cross zapper's row and column, through steel, nine
    rows up to the ceiling; and the X zapper's four diagonals, three cells
    each way, through steel. `recharges.spec.ts` has a fuzzball punch on
    through two bricks with the charge wool gave it, a hot shot and a
    friend recharged, and a zap break wool, charging nothing.
    `src/testing/flights.ts`' `flyPicture()` takes friends.
  - `AGENTS.md`: the traits sentence. No contract's name is added or
    changed.
- **Choices.**
  1. **Stand-ins until the catalog has the kinds.** The specs fly the row
     zapper zapping as the bomb, the cross zapper and the X zapper will:
     a blast a cell each way, the cross as far as `MOST_DEPTH`, the X
     three cells. The catalog's commit flies the real ones.
  2. **Wool recharges whichever fuzzball breaks it,** a friend's, a mate's
     or a prism's two among them, as plan.md's "the fuzzball that broke
     it" says, and a hot shot, already full, still shows the recharge.
  3. **The cage waits.** `Hooks.free(cell, ink)` asks the cage's rule for
     its friend's ink, but a rule is handed only the cell, the fuzzball and
     the trait, and every cage's `tint` is 0, so no rule can give a level's
     six friends six inks without a change to a contract; the integrator
     decides how.
- **Checks,** on `brick-fuzz-pop` at 61307b90 after the rebase: the
  workspace's `lint` and `typecheck` pass; `test:coverage` passes 4,758
  tests in 97 files in `dom` and `pure`, at the floors, and 150 in 20 in
  `sim`; the root's `yarn lint` passes.
- **The mutation pass.** 15 mutants, all killed: 9 of `zaps.ts`, five
  swapping one new pattern for another, the blast dropped, the reach capped
  at 8 and at 2, and one hit for two; 6 of `recharges.ts`, no fuzzball
  recharged, the first for none, another cell, no recharge, and the
  player's fuzzball recharged alone, two ways.
- **The review:** a fresh agent found the code right, and every cell,
  moment and charge the specs expect what `fly()` gives. Its points, all
  taken:
  1. Choice 2 had no spec: a rule recharging the player's fuzzball alone
     passed. Fixed: a hot shot and a friend break wool, and the mutation
     pass's last two mutants are that rule.
  2. `not_until.spec.ts` still had wool's trait to come. Fixed: the cage's.
  3. The X zapper's spec reached only its diagonals toward the ceiling,
     and the bomb's "eight cells" held seven bricks, none under the bomb.
     Fixed: the X zapper stands in field row 4, reaching all four ways; the
     bomb's spec says bricks; and a bomb a zap breaks blasts the brick under
     it.
  4. Small things, all fixed: a comment's "beside" for two cells off; a
     title saying steel is blasted where its reaches are none; `AGENTS.md`'s
     stand-ins line; `notUntil()`'s one caller, folded into `comesAt()`; and
     the mutation pass's count. The proof stream's copies of its own rules
     in `STAND_IN_RULES` are the integrator's next ask.

### X1, the integrator's contract change: a cage's ink is its own

- **Date.** 2026-11-11.
- **Why.** `Hooks.free(cell, ink)` asks the cage's rule for its friend's
  ink, but a rule was handed only the cell, the fuzzball and the trait, and
  every cage's tint was 0. The integrator chose the cage owning its ink, as
  plan.md's "A cage holds one, in an ink of its own", its art's "a
  fuzzball behind them in a friend's ink" and "Six cages at most, one for
  each friend a crew can hold" read, and approved the change to the
  contracts, P1's files among them, in a commit of its own.
- **Built.**
  - `src/rules/levels/legend.ts`: `tintOf()` gives a wall cell's tint from
    the characters of its picture by wall cell, its lowest row first, and
    a cage its number among the wall's cages before it, from the lowest row
    up and left to right, so a level's six take inks 0 to 5. Every other
    kind keeps its tint. `parseLevel()` and `wallFrom()` hand it the cell,
    which is the parse's one line changed.
  - `src/rules/flight/hooks.ts`: `TraitRule.broken` is handed the brick's
    tint as a fifth argument, and `flight.ts`' `brokenRule()` passes it.
  - `src/rules/wall/wall.ts`: `Brick.tint`'s doc says a cage's is its
    friend's ink.
  - `src/testing/stand_ins.ts`: the stand-in cage frees its friend in its
    tint.
  - Specs: `legend.spec.ts` numbers cages from the lowest row up, past
    steel and a brick, six cages to six inks, leaves every other kind's
    tint as it was with two cages before it, and gives an empty cell or a
    character the legend lacks 0; `flight.spec.ts` frees a stand-in cage's
    friend in its tint; `not_until.spec.ts` hands a rule to come the tint.
  - `docs/brick-fuzz-pop/implementation-plan.md`: §5.3's `tint`, P1's
    tints and §6's X streams, which touched no `flight.ts`, say so.
- **Choices.**
  1. **`tintOf()` reads the cell from the picture,** rather than each
     caller counting cages as it lays bricks: the parse and `wallFrom()`
     number cages alike by one function, and the count is made only for a
     cage. Its old signature, a character and a wall row, had no other
     caller.
  2. **No cage is parsed in a spec yet,** as the parse and `wallFrom()`
     refuse a kind the catalog doesn't hold; `tintOf()`'s own spec numbers
     them, and the catalog's commit parses a level of cages.
  3. **Warm-up has no cage,** so no tint of it moves: every certificate
     replays and every floor holds as before.
- **Checks,** at be205f84: the workspace's `lint` and `typecheck` pass;
  `test:coverage` passes 4,762 tests in 97 files in `dom` and `pure`, at
  the floors, and 150 in 20 in `sim`; the root's `yarn lint` passes.
- **The mutation pass.** 11 mutants, all killed: in `tintOf()`, a cage
  numbered from 1, every brick counted, its own cell counted, no cage
  numbered, a plain brick tinted by its cell and an empty cell tinted 1;
  in `flight.ts`, the rule handed 0, the brick's hits and its tint plus 1;
  and the parse and `wallFrom()` reading the cell a row up.
- **The review:** a fresh agent found no fault in the numbering or the
  hand-off. Its points:
  1. The plan said no X stream touches `flight.ts`, and neither §5.3 nor
     P1 named the cage's tint; `tintOf()`'s doc gave it to answer 4.
     Fixed: the three lines of the plan and the doc.
  2. The plain, tough and portal tints were specced with no cage before
     them, so a cage count added to them passed. Fixed: two cages stand
     before every cell the specs tint.
  3. The picture's characters by wall cell are spelled in the parse and in
     `wallFrom()` alike. Left: the parse's one line was the integrator's
     ask, and `tintOf()`'s doc names the order.
  4. `Brick.tint`'s doc lacked "left to right", and the log's specs were
     short. Fixed. The tint after the trait, where `entered()` puts its
     twin before it, is left as the integrator approved it: a fifth
     argument.

### X1, second piece: the cage frees its friend

- **Date.** 2026-11-11.
- **Built.**
  - `src/rules/bricks/traits/frees.ts`: `FREES_RULE`, a cage freeing the
    friend it holds as it breaks, in its tint, by a fuzzball, a zap or a
    blast alike. `TRAIT_RULES` takes it, so every trait has its rule.
  - `traits/not_until.ts` and its spec are gone, with
    `trait_rules.spec.ts`' spec of the traits not played yet: nothing
    throws "not until level N" any more.
  - `src/testing/stand_ins.ts`: `STAND_IN_RULES` frees by the real rule.
  - Specs: `frees.spec.ts` frees a stand-in cage's friend in its tint as a
    fuzzball breaks it, none from one only struck, and one in its tint as a
    zap breaks it.
  - `AGENTS.md`: the traits sentence and the stand-ins' line;
    `random_flights.ts`' doc no longer says a kind cataloged before its
    rule makes the flights throw.
- **Choices.**
  1. **The rule frees whatever breaks the cage,** as plan.md's "A zapped
     cage frees its friend, as a broken one does" says; `fly()`'s hook
     throws for a free asked at any other moment.
  2. **The specs fly the stand-in cage,** a tough brick of two hits that
     frees, until the catalog's commit; the stand-in's tint is its row's,
     which the rule hands on whatever it is.
- **Checks,** at 44827624, the contract change: the workspace's `lint` and
  `typecheck` pass; `test:coverage` passes
  4,884 tests in 104 files in `dom` and `pure`, at the floors, and 150 in
  20 in `sim`; the root's `yarn lint` passes.
- **The mutation pass.** 6 mutants of `frees.ts`, all killed: no free, ink
  0, ink 0 for a zap's break, ink one more, the next cell, and no free for
  a zap's break.
- **The review:** a fresh agent found the rule right. Its points, all
  taken:
  1. The zapped cage stood in wall row 0, its tint 0, so a rule handing a
     zap's free ink 0 passed. Fixed: it stands in wall row 2 and frees in
     ink 2, and the mutation pass has that rule.
  2. `random_flights.ts`' doc promised the random flights caught a kind
     cataloged before its rule, which nothing throws for now. Fixed.
  3. The checks named the base, not the commit. Fixed.

### The proof stream's asks: real stand-in rules, portals drawn

- **Date.** 2026-11-11.
- **Built.**
  - `src/testing/stand_ins.ts`: `STAND_IN_RULES` flies the bumper, the
    prism and the portal by `KICKS_RULE`, `SPLITS_RULE` and
    `TELEPORTS_RULE`, whose copies it held, and moss by `REGROWS_RULE`, as
    it does steel, the zappers, wool and the cage; plates and shells still
    do nothing there.
  - `src/testing/wall_picture.ts`: `twinsIn()` pairs each portal mark's two
    cells of a picture as twins, refusing a mark used once or more than
    twice, and `wallFrom()` hands each portal its twin, so a spec draws
    real portals once Tricks catalogs them.
  - Specs: `wall_picture.spec.ts` pairs both marks, and a second with no
    first, twins nothing without a portal, refuses a lone mark and a
    third, and has `wallFrom()` refuse a lone portal before its kind, and a
    pair for its kind until Tricks catalogs it.
  - `AGENTS.md` and the `brick-fuzz-pop-testing` skill: the wall
    picture's and the stand-ins' lines.
- **Choices.**
  1. **Each mark pairs on its own,** with none of the parse's other rules
     for portals (a second pair only with a first, twins at most four rows
     apart): a spec may draw what no level may.
  2. **`twinsIn()` is exported** so its spec reads it on its own, as no
     portal is cataloged for `wallFrom()` to lay out yet.
  3. **It isn't shared with the parse's `twinsOf()`,** whose errors name
     the level and which keeps the portals' other rules; the two count
     cells alike, and `levels.ts` is P1's.
- **Checks,** at c678582e: the workspace's `lint` and `typecheck` pass;
  `test:coverage` passes 4,935 tests in 104 files in `dom` and `pure`, at
  the floors, and 150 in 20 in `sim`; the root's `yarn lint` passes.
- **The mutation pass.** 6 mutants of `wall_picture.ts`: a portal twinned
  with itself, one of a pair left untwinned, three of a mark allowed, the
  second mark unpaired and `wallFrom()` pairing none, all killed; and
  `wallFrom()` handing no twin, which survives until a portal is cataloged
  for a spec to lay out, where the spec of a pair refused for its kind
  says what it becomes.
- **The review:** a fresh agent found no bug: the real rules are the
  copies they replace, and the twins number cells as the parse does. Its
  points:
  1. The `brick-fuzz-pop-testing` skill still described the stand-ins as
     made up and `wallFrom()` without portals. Fixed.
  2. No spec held `wallFrom()` to pairing its portals. Fixed as far as an
     uncataloged portal allows: a lone portal refused before its kind, and
     a pair refused for its kind, with the spec it becomes.
  3. Choice 1 had no spec. Fixed: `&` pairs with no `@`.
  4. `twinsIn()` repeats the parse's pairing. Left, as choice 3 says.
  5. `twinsIn()`'s doc opened with two sentences, `wallFrom()` read the
     twins through a fallback never taken, and moss's do-nothing rule was
     its real one. Fixed: one sentence, the twins mapped, `REGROWS_RULE`.

### X1, last piece: Sparks' five kinds cataloged and drawn

- **Date.** 2026-11-11.
- **Built,** on the art stream's fed96fde, which drew the five unwired,
  rebased on a1cff1ba.
  - `src/rules/catalog/kinds/sparks.ts`: the bomb (a blast of reach 1,
    level 10), the cross zapper (its row and column as far as
    `MOST_DEPTH`, level 11), the X zapper (its diagonals, 3 cells each
    way, level 13), wool (`recharges`, level 14) and the cage (`frees`, 2
    hits, level 15), each needed and solid, 30 points for a hit, the
    cage's 25 a hit making plan.md's 50.
  - `src/view/art/art.ts`: their five `BRICK_ART` lines, the cage's art
    stacking `FRAMES.caged(tint)` under its bars, so its tint picks the
    friend's ink.
  - Specs:
    - `sparks.spec.ts` holds each kind to plan.md's table, what its first
      break scores (`breakPoints()`) and its words to its reach and hits;
    - `catalog.spec.ts` lists the twelve kinds in How to play's order;
    - `levels.spec.ts` numbers a parsed wall's cages as their tints, and
      its reach check meets a blast from a corner, a cross zapper's column
      and an X zapper's diagonal three cells out, and finds a brick past
      each one's reach;
    - `wall_picture.spec.ts` tints a picture's cages;
    - `art.spec.ts` shows a cage of each tint over its friend in that ink,
      whole and hit, its specs of every cataloged kind taking in the five;
    - `atlas_frames.spec.ts` lists their frames, its `WAITING_ART` and
      `everyFrame()` gone with nothing left waiting;
    - `cast.spec.ts` and `grid.spec.ts` give the five their shapes.
  - Wool and the cage fly as themselves: `zaps.spec.ts`,
    `recharges.spec.ts`, `frees.spec.ts`, `flight.spec.ts` and
    `random_flights.ts` draw the real kinds, and `round.spec.ts` plays a
    round through a real cage, its friend joining the crew in the cage's
    ink. `stand_ins.ts` loses `WOOL` and `CAGE`, keeping the prism, and
    gains `uncataloged()`, the legend's first character no cataloged
    kind's brick stands for.
  - `AGENTS.md` and the `brick-fuzz-pop-testing` skill: the packages
    still to come, and the catalog's, the art's and the stand-ins' lines.
- **Choices.**
  1. **Sparks' table is held in `sparks.spec.ts`,** beside its file;
     the shell's and moss's stay in `catalog.spec.ts`, where X3 put them.
  2. **The refusals of an uncataloged kind take `uncataloged()`,** the
     bumper now, in `levels.spec.ts` and `wall_picture.spec.ts`, so they
     hold whichever of X1 and X2 lands first, and fail saying so once
     every kind is cataloged.
  3. **A cage the specs break stands over cages out of the fuzzball's
     way,** in the lowest row, as many as make its tint differ from its
     row, since a cage's tint is its number among the wall's.
  4. **`playRoundBy()`'s spec flies a stand-in prism,** as the crew's
     spec moved to `playRound()` with the real cage.
  5. **`cast.spec.ts` and `grid.spec.ts` add the five lines,** as the
     shell and moss did, keeping `toEqual`.
- **Checks,** on the change rebased on a1cff1ba: the workspace's `lint`
  and `typecheck` pass; `test:coverage` passes 5,169 tests in 109 files in
  `dom` and `pure`, at the floors, and 150 in 20 in `sim`; the root's
  `yarn lint` passes.
- **The mutation pass.** 17 mutants, all killed:
  - in `sparks.ts`, the bomb's reach 2, the bomb a cross, the cross
    zapper's reach 9, the X zapper's 2 and 4, the X a cross, wool and the
    cage without their traits, the cage's points 50, its hits 1, and the
    cage and the X zapper a level early;
  - in `art.ts`, the cage drawn as a tough brick, the cross zapper as the
    X, and wool as a bomb;
  - the review's two: `FREES_RULE` freeing in the cage's row's ink, and
    `fly()` handing a broken brick its row as its tint, each killed by its
    own folder's specs alone.
- **The review:** a fresh agent found no bug in the catalog, which keeps
  plan.md's table and points. Its points:
  1. The frees and flight specs' cages took the ink of their rows, so a
     rule freeing in the row's ink passed them. Fixed: three cages under
     the freed one in `frees.spec.ts` (ink 3, row 2), two in
     `flight.spec.ts` (ink 2, row 3).
  2. The catalog's order spec restated `BRICK_KINDS`' spreads. Fixed:
     the twelve ids written out. The shell's and moss's checks stay where
     X3 put them, as choice 1 says.
  3. `AGENTS.md` still listed X1 and X3 to come. Fixed.
  4. `sparks.spec.ts` worked out a break's points itself. Fixed: through
     `breakPoints()`.
  5. Both specs computed the uncataloged character, and would fail
     astray once none is left. Fixed: `uncataloged()`, which throws
     saying so.
  6. `playRoundBy()`'s spec claimed the rules it is handed too, which fly
     a prism as the bricks' own do. Fixed: named for the kinds alone.
  7. Nits: `sparks.spec.ts`' box shapes repeated `grid.spec.ts`', and
     `flight.spec.ts` handed one wool spec the catalog needlessly, both
     fixed; the checks' line now says the change was rebased; and
     `SPELLED` beside `catalog.spec.ts`' `spelled()` is left, each a
     spec's own line.
