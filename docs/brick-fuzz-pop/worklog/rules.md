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
