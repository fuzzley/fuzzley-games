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

## Part 2

### A1: the palette, the inks and contrast

**2026-11-10.**

- **Built.**
  - `src/view/colors/inks.ts`: `TINT`, the tiles' eight inks by name, each
    its place in `TILE_INKS`; `inkAt(inks, at)`, the ink at a place in a
    list, such as a palette's tints by a brick's tint or its friends by a
    friend's ink, refusing with a `RangeError` a place the list hasn't; and
    `friendInk(ink, mode)`, a friend's ink as a number, which the shell
    writes as CSS with `cssHex()`, as §13 says.
  - `src/view/colors/palette.ts`: `PaletteRoles` and `FIELD_ROLES`, the
    page's roles the field is drawn in (the field, its line, text and muted
    text, the page, the accent, danger and warning); `KindInks`, a special
    kind's `body`, the `face` its glyph is drawn on, and its `glyph`;
    `InkedKind`, the thirteen kinds that keep one look's inks; and
    `wallPalette(roles, mode)`, which gives `WallPalette`: the field, its
    line, the floor's band, the marks, the tints (`TILE_INKS[mode]`), steel
    mixed from the palette (C11), each special kind's inks as the art gives
    them (answer 4), the portals' two pairs, a prism's three rays, the
    fuzzball, the hot shot, the sparks, the guide, the field's text, the
    jump and danger lines, the meter's pips and the friends (`FUZZBALL_INKS[mode]`,
    answer 5). The washes and shades are named constants (`STEEL_WASH`,
    `BAND_WASH`, `CAGE_WASH`, `GLASS_WASH`, `EDGE_WASH`, `SHELL_SHADE`,
    `MOSS_LIGHT`, `PORTAL_GLOW`).
  - `src/view/colors/contrast.spec.ts`, over all four palettes read from the
    stylesheet: against the field, every tint, each special kind's body,
    every fuzzball (the player's, the hot shot and each friend's ink), the
    sparks, the guide, the jump and danger lines and the meter's pips lit
    and unlit; each kind's glyph against its face, and against the field
    where it isn't cut out of it; the marks against every tint, body and
    fuzzball; each friend against the bar and a cage's inside; a prism's
    rays against its glass; a cross zapper's diamond against its tile; and
    the fuzzball, the hot shot and the meter against the floor's band.
  - `src/testing/roles.ts`: `PALETTES`, the game's palettes as its global
    stylesheet sets them, as the breakers have it.
- **Choices the plan didn't make.**
  1. **Every color a contrast rule covers is in `WallPalette`,** so the
     spec sees what the art will draw: each kind's body, face and glyph,
     the portals' pairs and the prism's rays. Shading only shades and is
     held to nothing, so it is left to A2's art, mixed from these: a tile's
     strip and lip, steel's sheen, the moss's shade, the bumper's lip and
     boss, the prism's triangle's fill.
  2. **The kinds are named by the catalog's ids before the catalog is
     here.** `InkedKind` is a union of its own of the thirteen: every kind
     of `plan.md`'s "The bricks" and "Look" but the brick and the tough
     brick, which take their row's tint, and the portal, whose two pairs
     each keep an ink (`portals`, a pair of `KindInks`). The names are the
     catalog's camel-case ids, so A2's `BRICK_ART`, typed over
     `BrickKindId`, indexes `kinds` with them. It stays a union of its own
     until X3: K2's catalog holds the first five kinds only, and the
     contrast spec needs every kind now. The four zappers share one
     `KindInks`.
  3. **"Each special kind's body and glyph against the field"** is held as:
     the body against the field; the glyph against its face, what it is
     drawn on; and the glyph against the field too unless it is cut out in
     the field's color, as then it is the field's own.
  4. **Where the art fails 3:1, the palette moves off it.** The art was
     drawn in Midnight blue and Classic felt only.
     - Steel's frame and rivets, the art's steel darkened by 0.34, keep
       about 2:1 against steel in every palette. They are cut out in the
       mark, as Brick Breaker's steel's rivets are.
     - A wool brick's stitches, its pink lightened by 0.52, keep 1.9 to
       2.3:1. They are cut out in the mark too.
     - The fuzzball's eyes, `@fz/style`'s `#14171b`, keep 2.74:1 against
       Soft pastel's accent. Every fuzzball's eyes are the mark, as Brick
       Breaker's balls' are, so they show light in a light palette and dark
       in a dark one. Whether the glints stay is A3's.
     - Steel takes 0.6 of the text, not Brick Breaker's 0.55: at 0.55 a
       cage's bars keep 2.98 and 2.85:1 against the art's inside (steel at
       0.21 over the field) in Classic felt and Soft pastel; at 0.6, 3.40
       and 3.24. The art's own fixed greys lie at about 0.56 to 0.65.
  5. **The field's roles are the field's own,** `field-line`, `field-text`
     and `field-muted`, as Asteroid Breaker reads them; the page's `line`
     differs from the field's in both dark palettes. `page` is read for a
     portal's middle, as the art draws it.
  6. **`FIELD_ROLES` sits in `palette.ts`,** beside `PaletteRoles`, not in
     `src/app/board/field_roles.ts` as in the breakers: the board is wave
     3's, and the contrast spec reads the stylesheet by it now. U1's board
     reads the page's roles by it from the view.
  7. **`src/testing/roles.ts` is new,** and §7.3 gives it to no stream. It
     holds `PALETTES` alone; S1's spec adds the fixed roles it needs.
  8. **Beyond the plan's list,** the spec holds the fuzzball, the hot shot
     and the meter against the floor's band, since the meter's pips arc into
     it under the waiting fuzzball; each friend against a cage's inside,
     where it waits; a prism's rays against its glass and a cross zapper's
     diamond against its tile, as `make-art.mjs`'s own check does.
- **Checks.** The workspace's `lint` and `typecheck` are clean. `test`: 4
  files, 522 tests (`contrast.spec.ts` 480, 120 in each palette;
  `palette.spec.ts` 25; `inks.spec.ts` 16; the shell's 1).
  `test:coverage`: 100% of the statements (37), branches (4), functions (6)
  and lines (35). The root's `yarn lint` passes.
- **The mutation pass.** Fifty-six changes, one at a time, each run
  against the three specs, on the code as the review left it:
  - killed: `TINT`'s red and orange swapped, or amber and green, or violet
    and pink renamed in their order; `inkAt()` never refusing; `friendInk()`
    ignoring the mode or reading the tiles' inks; the tints ignoring the
    mode; steel the muted text; each wash and shade moved (band, steel,
    cage, glass, edge, shell, the moss's in either mode, the portal's glow);
    the marks in the line; the line in the field; a zapper's tile, outline
    or bolt in another color; a portal's middle in the field, its pairs
    swapped, its arms in its ring's ink; the rays reordered; the shell's
    modes swapped; the meter's pips in another color, steel among them; a
    plate on steel; a cage's inside in the field; a prism's triangle cut
    out, its edge as its glass; the bumper, wool and moss in other inks, the
    moss's cap amber; the friends always one mode's; the hot shot, guide,
    field's text, sparks, jump line, danger line, fuzzball, band and meter
    each in another role; the bomb's glyph in the warning color; and
    `FIELD_ROLES` reading any role from another.
  - The contrast spec alone kills the art's own colors where they fail:
    steel's frame darker steel (6 cases), the wool's stitches pale (6), the
    marks in the eyes' ink (9), steel at 0.55 (2) or 0.45 (19), the prism's
    edge at 0.4 (4) and the cage's inside at 0.4 (22).
  - Four survived the first pass, before the review: `FIELD_ROLES` reading
    the field's text, muted text and line from the page's `text`, `muted`
    and `line`, and the page from the `bar`. The first, second and fourth
    are the same colors in every palette today, and the line is darker in
    both dark palettes without breaking a rule. A spec now pins
    `FIELD_ROLES`, which kills all four. The review found four more the
    first pass hadn't tried, each now killed, as below.
- **Numbers.** The tightest margins: a prism's red and blue rays against its
  glass in Midnight blue, 3.14:1; a cage's bars against its inside in Soft
  pastel, 3.24:1; the green friend against a cage's inside in Classic felt,
  3.40:1. Steel against the field is 4.13:1 at least (Soft pastel).
- **For the other streams.** A friend's ink can sit near the player's
  fuzzball or the hot shot: in CIE76, the coral friend is 6.4, 6.0 and 7.5
  from the hot shot in Classic felt, Casino night and Midnight blue, and
  the violet one 9.4 from Soft pastel's accent, where `FUZZBALL_INKS` keep
  27 or more apart from each other. Which inks the friends are handed is the
  rules' (the `free` event's `ink`), so this is left as it is, and noted.
- **The review:**
  1. The palette spec's roles couldn't tell its mixes apart: the muted text
     was the steel it expected, the field white and the text black, and the
     dark cases took the light roles. So steel read as the muted text, or
     the meter's unlit pips in steel, passed both specs. Fixed: each role
     differs from the others, from white and black and from every mix, and
     the dark cases take dark roles of their own.
  2. `TINT`'s names were pinned only by their order and by teal, and the
     palette spec found its inks through `TINT` itself, so amber and green
     swapped in name would draw the moss green under an amber cap. Fixed:
     each name is pinned to its literal ink in both modes.
  3. `tileInk(tint, mode)` and `friendInk(ink, mode)` took a mode the scene
     never has, which only gets the palette, and read the library's tables
     again. Fixed: `inkAt(inks, at)` is the one checked look-up, for a
     palette's tints and friends as for the library's tables, and
     `friendInk(ink, mode)` keeps it for the shell. Typing `InkedKind` over
     the catalog's ids is left for X3, as the second choice says: K2's
     catalog holds five kinds. A shard's color, by a brick's kind or its
     tint, is A2's, as Brick Breaker's `BRICK_ART`'s `colorOf` is.
  4. A cross zapper's diamond would have been drawn in the guide's color.
     Fixed: `WallPalette.text` is the field's text, which the guide, a
     prism's triangle and the diamond take, and the spec holds the diamond
     by it.
  5. The fuzzball has no outline, and in Classic felt the accent is about
     1.03:1 against the green tint and the bumper is the accent itself.
     Left for A3, which draws the fuzzball: Brick Breaker outlines its balls
     in the field's color, which the marks already are, and which is held
     3:1 against every ink and fuzzball here, so no new color is needed.
  6. `InkedKind`'s comment read as if the portal were one of them, and the
     interfaces' comments opened with a noun rather than "Describes".
     Fixed, both.
