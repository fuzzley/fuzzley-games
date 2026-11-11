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
