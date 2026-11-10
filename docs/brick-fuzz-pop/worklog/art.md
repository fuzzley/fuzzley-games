# Work log: Brick Fuzz Pop, art stream

The art stream's log of [`implementation-plan.md`](../implementation-plan.md):
what each of its packages built, where it went other than planned and why,
what the checks reported, each review comment and what became of it, and
the numbers worth keeping.

## Part 1

### L4: `@fz/phaser/color` inks

**2026-11-10.**

- **Built.**
  - `frontend/lib/phaser/src/color/inks.ts`: `ModeInks`, a set of inks for
    each mode, `{ light, dark }`, each a `readonly number[]`; `TILE_INKS`,
    Brick Breaker's eight `LIGHT_INKS` and `DARK_INKS`; and `FUZZBALL_INKS`,
    Asteroid Breaker's eight `LIGHT_PILOT_INKS` and `DARK_PILOT_INKS`, as
    numbers. Both are exported from `@fz/phaser/color`.
  - Brick Breaker's `src/view/colors/inks.ts` and its spec are gone.
    `bricksPalette()` takes `TILE_INKS[mode]`; its spec holds the tints to
    the inks of each mode and, from the old `inks.spec.ts`, to `TINTS` in
    number.
  - Asteroid Breaker's `inks.ts` keeps only the rocks' inks. `beltPalette()`
    takes `FUZZBALL_INKS[mode]` for the pilots, and `pilotInk()` hands the
    shell `cssHex()` of it; the private `pilotInks()` is gone. Its palette
    spec holds the pilots to `PILOT_COLORS` in number, and `pilotInk()` to
    six-digit CSS hex (the teal pilot, `#0f8378`, has a leading zero).
  - Docs: `lib/phaser/AGENTS.md`'s `src/color/`, both games' `AGENTS.md`,
    `frontend/AGENTS.md`'s line on where a canvas game keeps its colors,
    and the `phaser-core` and `fuzzley-ui` skills.
- **Choices the plan didn't make.**
  - **`FUZZBALL_INKS` are numbers, not CSS hex.** Asteroid Breaker wrote its
    pilots' inks in CSS hex for its shell. In the library both sets share
    one type, the numbers Phaser takes, and the one place a shell needs
    CSS, `pilotInk()`, writes it with `cssHex()`. The strings it gives are
    the same as before.
  - **`ModeInks` keys on `"light"` and `"dark"`, not `ColorMode`,** since a
    pure entry imports nothing from `@fz/style`. `TILE_INKS[mode]` takes a
    `ColorMode` all the same.
  - **The pilots' CIE76 spec moved to the library.** "27 or more apart" is a
    property of the inks themselves, so `inks.spec.ts` beside them holds it
    for `FUZZBALL_INKS`, with the eyes (`FUZZBALL.ink`) at 3:1 against each
    ink, which `FUZZBALL_INKS`'s doc comment claims. `TILE_INKS` isn't held
    to it: its light inks' nearest pair is 26.2 apart, and a tile is told
    apart by its shape and marks first, as its doc comment says.
  - **Each game's contrast spec is untouched,** as the plan asks: Brick
    Breaker's holds the tints against its `panel`, Asteroid Breaker's the
    pilots against its field, a stray's bubble and the bar, and the eyes
    against each pilot.
- **Checks.**
  - `@fz/phaser`: lint and typecheck clean; 51 files, 648 tests (from 50
    and 626); coverage 99.17% of statements, 95.74% of branches, 99.72% of
    functions and 99.55% of lines, the floor held, `src/color/` at 100%.
  - Brick Breaker: lint and typecheck clean; `test`, `sim` included, 59
    files and 2022 tests in 16 s.
  - Asteroid Breaker: lint and typecheck clean; `test`, `sim` included, 98
    files and 5242 tests in 47 s.
  - The root's `yarn lint` passes.
- **The mutation pass.** Ten changes, each killed: a light tile ink made
  another's; a dark tile ink dropped; a light fuzzball ink moved near
  another (CIE76); a dark fuzzball ink too dark for the eyes; a ninth light
  fuzzball ink; Brick Breaker's tints always the light ones; Asteroid
  Breaker's pilots always the dark ones; `pilotInk()` ignoring the mode,
  never refusing, or dropping the leading zero. A light tile ink made too
  light for 3:1 passes the library's specs, as it should, since the library
  knows no field, and fails 9 of Brick Breaker's contrast specs.
- **Numbers.** Brick Breaker's `src/view/colors/` is 33 lines shorter
  (`inks.ts`'s 32 and one of `palette.ts`), Asteroid Breaker's 40 (35 of
  `inks.ts` and 5 of `palette.ts`); the library's `inks.ts` is 74.
- **The review:**
  1. `FUZZBALL_INKS`'s doc comment, `lib/phaser/AGENTS.md` and the
     `phaser-core` skill called them the inks of fuzzballs "that aren't the
     player's", which is Brick Fuzz Pop's friends only: Asteroid Breaker
     draws the pilot at the controls in one too. Fixed: they are the inks
     that tell fuzzballs apart where several show at once, in all three.
  2. `inks.ts`'s header said only a canvas draws them, though Asteroid
     Breaker's shell draws its pilots in the DOM. Fixed: it says they are
     the numbers Phaser takes, and a shell writes one with `cssHex()`.
  3. "Each is a mid-tone" held for the light inks only. Fixed: the light
     ones are mid-tones, dark enough for a light field and light enough for
     the eyes.
  4. The eyes' cases were named by an index over both modes. Fixed: each
     is named by its mode and its place, 1 to 8.
  5. The `fuzzley-ui` skill still said both games' inks were their own.
     Fixed: the bricks and the pilots take `@fz/phaser/color`'s, and
     Asteroid Breaker's rocks keep their own.
  6. Three paragraphs of prose wrapped badly (`frontend/AGENTS.md`, Brick
     Breaker's `AGENTS.md`, the `phaser-core` skill). Rewrapped.

### L5: `@fz/phaser/shapes` areas

**2026-11-10.**

- **Built.**
  - `frontend/lib/phaser/src/shapes/areas.ts`, exported from
    `@fz/phaser/shapes`: Brick Breaker's `within()`, `share()`, `inset()`,
    `middleSquare()`, `frameAround()` and `star()`, moved as they were, and
    two new builders:
    - `outlineRoundRect(area, radius, style)`, the outline of the rounded
      rectangle `roundRect()` fills over an area, its line's middle along
      the edge, as SVG strokes a `<rect rx>`, so `make-art.mjs`'s numbers
      port as they are. It is drawn as a band filled in one polygon, round
      the outer edge clockwise and back round the inner edge, the two joined
      by a line each way that adds nothing. The outer corners round by the
      radius and half the line, square where the radius is nothing, as a
      mitred join's are; the inner ones by the radius less half the line,
      square once that is nothing. A line as wide as the area's shorter
      side leaves no hole, so it fills the rounded rectangle it reaches
      over instead. It returns the one command, a `PolygonCommand` or that
      `RoundRectCommand`, as `roundRect()` and `polygon()` do.
    - `dashes(from, to, dash, gap)`, the dashes of a straight line, each a
      `Dash` (`{ from, to }`), as many as fit with a gap clear of each end,
      the room left shared between the ends, as `make-art.mjs`'s
      `dashedLine()` lays the jump and danger lines. A dash of no length
      draws none, and a gap below nothing is none.
  - Brick Breaker's `src/view/art/shapes.ts` is gone; `art.ts`,
    `brick_art.ts` and `symbols.ts` take the helpers from
    `@fz/phaser/shapes`. `brick_art.ts`'s private `dashes()`, a ghost
    brick's dashed outline, is renamed `dashedOutline()`, so it isn't
    mistaken for the library's. Its art specs pass unchanged.
  - Docs: `lib/phaser/AGENTS.md`'s `src/shapes/`, Brick Breaker's
    `AGENTS.md` and the `phaser-core` skill.
- **Choices the plan didn't make.**
  - **`outlineRoundRect()` is a filled polygon, not a new `DrawCommand`.** A
    stroked rounded rectangle would need a new kind in the union, in
    `atlasFrameOf()`, the transforms, `edgesOf()` and `@fz/phaser/testing`'s
    readers, and its corners would hang on the renderer's joins, as
    `stroke()`'s doc comment says of a polyline. A polygon needs none of it,
    and `extentOf()` bounds it exactly. It is one polygon, not two halves,
    as the review found: `bakeAtlas()` draws through `generateTexture()`,
    a 2D canvas filling each path antialiased, so two halves meeting
    across the band would leave a lighter row where they meet. A canvas
    fills nonzero, so the inner edge run backwards leaves the hole empty,
    and Earcut takes a hole joined to its outline the same way. It is for
    an atlas alone: a WebGL `Graphics` drops each point of a path within
    `render.pathDetailThreshold` of the one before, a pixel by default,
    which can cut across the band where the edges join, as its doc comment
    says.
  - **`dashes()` returns geometry, not commands,** as the plan's signature
    has no style: Brick Fuzz Pop's `FieldPainter` draws its lines with a
    `Graphics`, and the art's dashes are round-ended (`stroke()`), so the
    caller chooses how a dash is drawn.
  - **Asteroid Breaker's `dashedRing()` stays.** Its dashes are arcs round a
    closed ring, as many as round to fit with the gaps stretched evenly,
    and none of `dashes()`' ends. Over `dashes()` it would map each dash
    back to angles and keep its own count, so it would be no shorter, and
    its rings would change. Brick Breaker's ghost brick's dashes stay too:
    they start at a corner, as long as their gaps, and are cut short at the
    end, so `dashes()` would change the art.
- **Checks.**
  - `@fz/phaser`: lint and typecheck clean; 52 files, 695 tests (from 51
    and 648 after L4); coverage 99.2% of statements, 95.82% of branches,
    99.73% of functions and 99.56% of lines, the floor held, `areas.ts` at
    100%.
  - Brick Breaker: lint and typecheck clean; `test`, `sim` included, 59
    files and 2022 tests, the same as before, in 17 s, its art specs
    unchanged; `test:coverage` holds its floors (99.57%, 97.88%, 99.82%
    and 99.95% overall).
  - Asteroid Breaker, which takes `@fz/phaser/shapes` too: `test`, `sim`
    included, 98 files and 5242 tests, in 46 s.
  - The root's `yarn lint` passes.
- **The mutation pass.** Thirty-five changes, one at a time, against
  `areas.spec.ts`, on the outline as first built in two halves. Every
  change to a moved helper was killed: `within()`'s share across by the
  height, `share()`'s down by the width or its width by the share tall,
  `inset()` taking the inset once, `middleSquare()` not halving,
  `frameAround()`'s right bar outside or its bottom bar too high, `star()`
  starting straight down, its points swapped or one short. Four survived:
  - Either half's inner edge not reversed. Its joining lines lay along the
    cut, so an even-odd test still saw a band, though the polygon crossed
    itself. A spec now holds the band's area, by the shoelace formula, to
    the outer rounded rectangle's less the inner's, which only a polygon
    that never crosses itself gives (438.2 against 438.8, the arcs' chords
    short of it).
  - The cut a third of the way down, not half. It tiled the band all the
    same while the sides were straight there, so the coverage spec now
    counts how many polygons cover each point (`timesCovered()`) and has a
    pill among its cases, whose sides are all corner. The cut went with the
    halves.
  - `dashes()` without its count clamped to nothing, an equivalent change,
    as `Array.from()` takes a negative length as none. The clamp went, then
    came back at review, which found it says the intent; it is the one
    survivor, and no spec can tell it apart.

  After the reviews reshaped the outline, nineteen changes to it, one at a
  time, were each killed: the band's half width, `>=` as `>` at the closed
  hole, the outer radius rounded at nothing or not grown, the inner radius
  unclamped, the path's or square, the inner and outer edges' insets, the
  inner edge not reversed, a ring not closed or closed on its second
  point, both rings started at another corner, each corner's quarter or
  middle moved, and the shorter side taken as the longer. The first pass
  killed `dashes()` with a dash of nothing drawn, a negative gap kept, the
  gap not left at the ends, the start not centered, the dash ending a gap
  on, and the slant's `y` read from its `x`.

- **Numbers.** Brick Breaker's art is 83 lines shorter (`shapes.ts`'s 91,
  less 8 lines of imports). The library's `areas.ts` is 196 lines long and
  its spec 336. `outlineRoundRect()` gives one polygon of 90 points: two
  rings of four corners of 11 points, each closed.
- **The review:**
  1. Two halves sharing an edge across the band leave a lighter row in the
     baked atlas, since `generateTexture()` fills each path on a 2D canvas,
     antialiased; and the log's reason for two, that a polygon with a hole
     can't be filled, was wrong. Fixed: one polygon, the inner edge run
     backwards from where the outer one closes, as above, with its spec
     holding the whole band's area. A reshape, so the change had a second
     review.
  2. A radius of nothing rounded the outer corners by half the line, where
     SVG's mitred join squares them, though the doc comment claimed SVG's
     stroke. Fixed: square, with a spec of a point just inside the outer
     corner and one just inside the hole's.
  3. With its clamp gone, `dashes()` leant on `Array.from()` taking a
     negative length as none. Fixed: the clamp is back.
  4. Brick Breaker's `brick_art.ts` kept a private `dashes()` of its own
     meaning. Fixed: renamed `dashedOutline()`, and this entry says why it
     can't take the library's.
  5. A line of this entry was unwrapped. Fixed.
- **The second review,** of the outline in one polygon, found it fills
  rightly on a 2D canvas and through Earcut, at a radius of nothing and with
  square inner corners too:
  1. A WebGL `Graphics` thins a path's points before Earcut
     (`pathDetailThreshold`, a pixel at least), which can drop the point
     where the edges join and cut a sliver across the band; nothing draws
     one live today, as every command reaches the screen through
     `bakeAtlas()`. Fixed: the doc comment and this entry say it is for an
     atlas, and why. The specs couldn't see where the edges join, which
     Earcut needs inside the band, so a spec now holds the polygon's first
     point to the top of the outer edge's left side and its last to the
     inner edge's.
  2. `outlineRoundRect()` still returned an array, left from the two
     halves. Fixed: it returns its one command, and the spec's helpers take
     one.
  3. A short line in `lib/phaser/AGENTS.md`'s paragraph on the shapes.
     Rewrapped.
