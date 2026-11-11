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

### A2: the bricks' art

**2026-11-10.**

- **Built.**
  - `src/view/art/art.ts`: `KindArt`, how a kind of brick is drawn: the
    frames a brick shows as it stands, stacked in its cell from the bottom
    up (`layersOf`), the color its shards take (`colorOf`), and the frames
    the kind brings to the atlas (`frames`); `BRICK_ART`, typed over the
    catalog's `BrickKindId`, so a kind cataloged without art fails to
    compile; `BrickLook`, what the art reads of a `Brick`; and
    `brickLayers()` and `brickColor()`, which the scene calls.
  - `src/view/art/atlas_frames.ts`: `atlasFrames(palette, scale)`, every
    frame the atlas holds, each kind's in the catalog's order: 21 so far.
  - `src/view/art/symbols.ts`: `detailed()`, the 30 CSS px rule; `cellOf()`
    and `cellFrame()`, a brick's cell in whole device pixels, one at least,
    which each of its frames fills; `itemAt()`, a checked look-up in a list
    made once; `crispEdge()` and `crispOutline()`, a band about an area's
    edge with both its edges on whole pixels; `diePips()`, a die's face;
    and `bandAlong()`, a line through points drawn as one polygon, its
    corners mitred, its ends cut square or its first along a way given.
  - `src/view/art/kinds/brick.ts`: the chunky tile, `chunky()` in
    `make-art.mjs`, as a darker lip, the body and a lighter strip along the
    top that follows its corners, three flat shapes; `tileBody()`, a whole
    number of pixels in from the cell; `PLAIN_ART`, which brings the eight
    tiles; and `INKS`, the tints.
  - `src/view/art/kinds/tough.ts`: `TOUGH_ART`, the row's tile under a pips
    frame for 2 to 6 hits left and a cracks frame for 1 to 5 taken;
    `pipsFrame()` and `cracksFrame()`.
  - `src/view/art/kinds/steel.ts`: `STEEL_ART`, the tile in steel, its
    bevelled frame as `crispOutline()`, a rivet in each corner and two
    strokes of sheen half white, round at their ends as the art's are
    (`stroke()`).
  - `src/view/art/kinds/zapper.ts`: `zapperArt()` for the row's and the
    column's: the tile in the field's line, outlined in the warning color,
    and the bolt, a zigzag band and two arrowheads, turned by a cosine and
    a sine so a quarter turn is exact.
  - `src/testing/art_frames.ts`: the specs' palette, a light one whose
    roles differ from each other, their scale (31 CSS px at 2 device pixels
    to one) and the frames drawn so; `PIXEL_RATIOS`; `billionths()` and
    `inBillionths()`, which round away what a curve's arithmetic leaves;
    and `distanceToSegment()` and `pastRoundRect()`, with a spec of their
    own.
  - Specs beside each: 232 tests.
- **Choices the plan didn't make.**
  1. **A kind brings its frames, and the plain brick brings the tiles,**
     which the tough brick, and later plates, the shell and the moss, stack
     over. A tough brick shows no pips at its last hit, as `Pips` runs from
     2: the tile alone says one more breaks it.
  2. **Five cracks, redrawn.** The art's two each overlap a pip of a four,
     five or six, the first its top left and the second its bottom right,
     so the five are new: each a zigzag in from an edge, the top twice and
     each other edge once, in the order a brick gathers them. A spec holds
     each a device pixel clear of all seven places a pip can sit, and
     within the tile, round its corners, at every whole unit from 30 CSS px
     to 128 device px at each pixel ratio.
  3. **A crack is a band, not a polyline,** drawn with `bandAlong()`,
     mitred as the art's `join: "miter"` asks, since a canvas joins a
     polyline's corners past the width `extentOf()` allows for. Its path is
     given in shares of the tile's body, so it starts on the body's edge
     whatever the rounding, rather than past it as the art's do (3 and 97
     of 100), and its outer end is cut along that edge rather than square,
     so it notches the tile as the art does and paints nothing outside it;
     its inner end is cut square, as the art's `cap: "butt"` is.
  4. **Detail drops by frame, not by layer.** Under 30 CSS px the cracks'
     frames are drawn empty and steel's frame leaves out its rivets, so
     `brickLayers()` needs no scale and the atlas holds the same names at
     every scale. A plate's fewer teeth are X2's, with the plates.
  5. **A tile's body keeps a pixel.** `tileBody()` insets by a twenty-fifth
     of the cell, a pixel at least, but leaves a pixel wide at least, so a
     cell of 1 or 2 px, as a canvas has before it is laid out, bakes
     without a body below nothing.
  6. **The bake is checked purely:** at every unit from 1 to 16 device px
     at each pixel ratio, no command has a size below nothing and
     `atlasSize()` packs the frames. Baking them with Phaser is S1's.
     Within their cells, in whole pixels, with every line a CSS pixel wide
     at least and the atlas within 2048 × 2048, the frames are held at the
     layout check's least unit, 24 CSS px, at each ratio, at 29 and 31, and
     at 128 device px at ratios 1 and 3. The ratios are 1, 1.25 (a browser
     zoomed to 125%), 1.5, 2, 2.625 and 3.
  7. **`atlas_frames.ts` is apart from `art.ts`,** so A3 adds the
     fuzzball's frames beside the bricks' without touching how a brick is
     drawn.
  8. **`BrickLook` holds `plates`,** which nothing reads yet, so X2's
     plated brick needs no new shape. The zappers' and steel's `tint` is
     read by nothing.
  9. **`src/testing/art_frames.ts` is new,** as `roles.ts` was in A1.
  10. **Straight edges lie on whole pixels.** A band about an edge
      (`crispEdge()`) has its outer edges moved in to whole pixels, so one
      an odd number of pixels wide sits half a pixel in on every side
      alike, stays centred in its cell and reaches no further than it
      would have; a zapper's face is filled about its outline's edge, so
      the two stay concentric; a zapper's tile is inset by whole pixels;
      and a tile's lip and strip are whole pixels deep, so none blurs a
      row.
  11. **A brick's layers are made once,** a list for each look, as Brick
      Breaker's frames' names are, so the scene finding a brick's makes
      nothing; a look no brick takes, such as more hits left than whole,
      throws.
  12. **The lists of tints, pips and cracks are the kinds' own,** typed by
      K2's `Ink`, `Pips` and `Cracks`, rather than exported from
      `frames.ts`, a contract file, which keeps its own private copies.
- **Checks.** The workspace's `lint` and `typecheck` are clean. `test`: 1180
  tests; the art's specs 232 of them (`atlas_frames.spec.ts` 55,
  `tough.spec.ts` 50, `symbols.spec.ts` 35, `brick.spec.ts` 25,
  `art.spec.ts` 23, `zapper.spec.ts` 23, `steel.spec.ts` 11, and
  `src/testing/art_frames.spec.ts` 10). `test:coverage`: the art's nine
  files, K2's `frames.ts` and the specs' `art_frames.ts` among them, at
  100% of the statements (190), branches (28), functions (90) and lines
  (184). The root's `yarn lint` passes. A sheet of every look, drawn from
  the commands as SVG at 31, 29 and 128 px in a light and a dark palette,
  looks as the art does.
- **The mutation pass.** Ninety-five changes, one at a time, each run
  against the art's specs, on the code as both reviews left it. 94 were
  killed:
  - the detail rule at 29, or above 30 alone; the cell rounded up or
    without its floor;
  - `itemAt()`, `diePips()` or `bandAlong()` never refusing, the band
    taking a first cut along its line; `crispOutline()` not moving, or
    `crispEdge()` rounding any edge out or half up; the six's middle pips
    upright;
  - a band unmitred, its right side unreversed, its legs taken a place
    early or late, its first cut ignored, taken square to the way given or
    made at every point;
  - the tile's gap, corner, strip, lip and shade each moved, its lip
    lightened, its lip or strip unrounded, its gap unclamped or clamped to
    nothing, its strip shallower at one end;
  - a plain brick's layers made at each call, or its layers or shards in
    tint 0;
  - a tough brick's table from 2, read hits first, or holding more hits
    left than whole; the pips from 3, the cracks from 2 taken, either frame
    a place off (both of which stop the module loading, as the table is
    made then); the die lower or wider, its pips larger or in the text;
  - a crack wider, half as wide again, without the CSS pixel floor, in the
    cell rather than the tile, cut square or across at its edge, starting
    inside its edge or in the corner's arc, the second ending on a pip,
    the third longer, the fifth back near its pip, one too many, or drawn
    at every scale;
  - steel's layers made at each call; its bevel moved, rounder, wider,
    without the floor or in the steel; its rivets moved, larger or always
    drawn; its sheen wider, darker, moved, one stroke short or without its
    round ends;
  - a zapper's layers made at each call; its gap, corner, outline, shaft,
    zigzag or arrowheads changed; its outline without the floor; its tile
    in its outline's color, inset by a share, or filled about the tile
    rather than the outline's edge; the column turned the other way or
    mirrored; its shards the face or the row's; every zapper in the row's
    inks;
  - `brickLayers()` reading the tough brick's art for every kind,
    `brickColor()` the plain brick's; the column drawn as the row; and the
    atlas without the plain tiles.

  One is equivalent: a band's first cut squared the other way changes
  nothing, as the reach turns with it, so the code picks no way. Eight
  survived the first pass, before the first review, and a spec now pins
  each: the strip's right end, the die's place and step, the bevel's
  corners, the sheen's place, the shaft's width and zigzag, and each kind's
  layers. Snapping the bevel's area before `crispEdge()` survived the last
  pass, as `crispEdge()` already puts both its edges on whole pixels, so
  the snap and `snapped()` went.

- **Numbers.** The atlas at 128 device px a unit is 518 × 778, 21 frames of
  83 shapes; at 31 CSS px and 2 device px to one, 254 × 382. Under 30 CSS
  px it draws 19 shapes fewer: 15 crack bands and 4 rivets. A brick shows
  one to three frames. The nearest a crack comes to a pip is 1.25 px, the
  third crack at 38 device px a unit and 1.25 to one, where the tile's gap
  steps from 1 px to 2 and the floor makes a crack 2 px wide.
- **For the other streams.**
  - S1 bakes `atlasFrames(palette, scale)` and stacks `brickLayers(brick)`
    in each cell, which is `cellOf(scale)`, the unit rounded to whole
    device pixels; a brick's shards take `brickColor()`. Below 30 CSS px a
    crack frame has no shapes, which the bake must take as an empty frame.
  - X1 adds the cross's and the X's to `zapper.ts`'s `ZAPPERS`, which a
    turn of a cosine and a sine draws.
  - X2's plates go over the tile as tough's pips do, with `BrickLook`'s
    `plates`, and keep no field-colored box outside the tile.
- **The review:** two rounds, the first by one reviewer, the second by the
  same one and a fresh one.
  1. Lines centred on a snapped edge blurred where `widthOf()` came out
     odd (a zapper's outline 3 px wide at 72 px a unit ran 2.5 to 5.5), the
     zapper's tile was snapped as an area, so its gaps could differ by a
     pixel, and the tile's lip and strip ended off whole pixels. Fixed:
     `crispOutline()` for steel's bevel and the zapper's outline, the
     zapper's tile inset by whole pixels, the lip and strip rounded.
  2. No spec held the bands' widths, which are polygons, to a CSS pixel,
     so `Math.round` in place of `widthOf()` passed. Fixed: specs hold the
     bevel at 3 px at 72 px a unit and 3 to one, a crack at 2 px at 45 and
     1.5 to one, and the zapper's outline at 2 px at 36 and 1.5 to one,
     where a share of the unit would be thinner, and every crack a CSS
     pixel wide at least wherever cracks are drawn.
  3. `layersOf` made a new list at each call, which the scene would do for
     every brick. Fixed: every kind's lists are made once, tough's as a
     table by tint, hits whole and hits left, read with `itemAt()`; a spec
     holds each kind to the same list each time.
  4. A crack's square outer end reached past its tile, by 1.3 px at 128 px
     a unit, and the log said cracks came in from five edges, when two
     share the top. Fixed: `bandAlong()` cuts a band's first end along a
     way given, each crack's along its edge, and the log is corrected.
  5. Steel's looks were tried with a hit, which the rules never give it;
     both zappers were held to the row's inks, which the palette shares;
     and the cracks were held clear of the pips at one scale. Fixed: steel
     is tried with none; a palette with inks of each zapper's own holds
     each to its own; the clearance is held wherever cracks are drawn.
  6. Names exported but used nowhere else, scales spelled out in the specs,
     and `frameAt()` repeating `inkAt()`. Fixed: the cracks' paths and the
     detail rule's 30 are the modules' own, `INKS` is used by the tough
     brick's table, the specs take `ART_SCALE` and `ART_FRAMES`, and
     `frameAt()` is `itemAt()`, for any list. `inkAt()` stays A1's: the
     colors are typed by it and don't import the art.
  7. (Second round, both reviewers.) `crispOutline()` rounded the band's
     outer edges half up, so a band an odd number of pixels wide sat a
     pixel off-centre: the zapper's outline at 72 px a unit, 3 to one, had
     gaps of 3 and 2, steel's bevel 9 and 8. Fixed: `crispEdge()` moves
     each outer edge in to a whole pixel, so the gaps match; specs hold
     the zapper's four gaps equal at 25, 62 and 72 px and steel's left and
     right at 72; the zapper's face is filled about the outline's edge, so
     none shows past it at a 1 px line.
  8. (Second round, the fresh reviewer.) The fifth crack came 0.98 px from
     a pip at 38 px a unit and 1 to one, and 0.91 px at 1.25 to one, where
     the tile's gap steps from 1 px to 2, which the specs' few scales
     missed. Fixed: the specs try every whole unit from 30 CSS px to 128
     device px at each ratio, 1.25 among them; the second, third and fifth
     cracks moved, so each clears every pip by 1.25 px at least.
  9. (Second round, the fresh reviewer.) The spec holding the cracks
     within the tile tried its square, not its rounded corners. Fixed: it
     measures with `pastRoundRect()`, in the specs' helpers with
     `distanceToSegment()`, each with a spec.
  10. (Second round, the fresh reviewer.) The tints', pips' and cracks'
      lists repeat `frames.ts`'s, and `art.spec.ts` had a fourth copy.
      `art.spec.ts` now takes `INKS`; the others stay, as the twelfth
      choice says, and the integrator may export `frames.ts`'s instead.
  11. (Second round, the first reviewer.) Nothing refused a first cut along
      the band's first leg, which would reach forever. Fixed:
      `bandAlong()` throws a `RangeError` for one, with a spec. Long lines
      in `symbols.ts`'s header and the log are wrapped.

### A3: the fuzzball's art

**2026-11-10.**

- **Built.**
  - `src/view/art/fuzzball_art.ts`: `fuzzballFrames(palette, scale)`, the
    fuzzballs' 16 frames, each about its body's middle: the player's at
    each charge, 0 to 5, sparking at 5 alone; the hot shot under a crown of
    flame; a friend in each of the eight inks; and the eyes every one
    wears. `furOf(charge)`, the fur combed for a charge, a table made once,
    and `fuzzballGrid(scale)`, the device pixels to a unit of the
    fuzzball's grid, which the scene moves the eyes by.
  - `src/view/art/atlas_frames.ts`: `atlasFrames()` adds the fuzzballs'
    frames after the bricks', 37 frames in all.
  - **Contract additions, K2's `src/view/art/frames.ts`:** `INKS`, `PIPS`,
    `CRACKS` and `CHARGES`, the lists of the frames' arguments, exported;
    `FRAMES.eyes`, `"fuzzball-eyes"`, added; and `FRAME_NAMES` lists it
    after the friends, 60 names. `frames.spec.ts` holds the count, the
    name and each list.
  - `src/view/art/kinds/brick.ts` and `tough.ts` take `INKS`, `PIPS` and
    `CRACKS` from `frames.ts`, their copies gone; tough's cracks' paths are
    renamed `CRACK_PATHS`, as `CRACKS` is now the counts.
  - `src/view/art/fuzzball_art.spec.ts`: 90 tests.
- **Choices the plan didn't make.**
  1. **The fuzzball is drawn as the art draws it,** its grid 0.8 units
     wide, a fortieth of a cell to a unit of the grid: its body 0.26 units
     round, about a fuzzball's `RADIUS` of 0.25, and its fur past that, to
     0.37 units relaxed and 0.42 at a full charge. Brick Breaker's
     `ballGrid()` fits the outlined fur within the ball's radius instead,
     which would shrink the body to 0.18 units. A triple shot's three, 0.7
     units apart, overlap at the tips of their fur, which the outline
     parts.
  2. **The fur is combed in proportion to the charge,** a fifth of the way
     a charge, after the art's three looks: each strand turned from its
     own way toward straight out from the body's middle through its root
     (half way at 2.5, as the art's half-charged look; all the way at 5,
     as its charged one), 6% longer a charge to the art's 30%, and its bend
     eased out by charge 3, as the art's half-charged strands are straight.
     Every strand keeps its root, as the art's spikes do, where Brick
     Breaker's `spike()` sets a strand along its tip's line.
  3. **A full charge's sparks are the art's five zigzags,** in the
     palette's spark, drawn with `stroke()`, round at their ends and
     corners as the art's are, a unit of the fuzzball's grid wide and a CSS
     pixel at least. A spec holds them clear of the fur at the layout
     check's least unit at every pixel ratio, at 31 CSS px and at 128
     device px.
  4. **Every fuzzball is outlined in the mark,** as A1's review asked and
     Brick Breaker's balls are: the field's own color, so it shows only
     where a fuzzball crosses a brick, a line or another fuzzball. It is
     0.03 units wide and a CSS pixel at least, half Brick Breaker's
     `lineWidth()`, as this fur's strands are 0.07 units wide and their tips
     about as far apart, so an outline nearly a strand wide would fill the
     notches between them and round the fuzzball off over a brick.
  5. **A fuzzball is outlined as one with what it wears** (`outlinedWith()`,
     which takes what it wears as one record and orders it itself): its
     outline, then the outlines of its sparks or flames, then the flames,
     then its body and fur, then the sparks over all. The fuzzball's outline
     round its fur on end hid the bases of the art's four tongues of flame,
     leaving their tips, so every tongue goes over it, the red-hot body over
     them, and the flames show between the strands, as the art's do; each
     tongue's outline is a closed line round it twice the outline's width. A
     spark's is a line along it the outline wider either side, under the
     fuzzball's body, so it never notches the fur. The sparks come within a
     brick a charged fuzzball touches, and the warning color they take is a
     zapper's own and close to a bomb's danger, so they need it as the body
     does. The hot shot has no sparks, as the art's has none.
  6. **A friend is the relaxed fuzzball in its ink,** as friends carry no
     charge.
  7. **The eyes are one frame for every fuzzball,** in the mark without
     glints, as Brick Breaker's are, about the body's middle, so the eyes
     sit a unit of the grid right of it and a fifth of one up, as the mark
     has them. The scene draws the frame over a fuzzball's, moved by
     `FUZZBALL_LOOK` times `fuzzballGrid(scale)` along the way it looks; a
     spec holds the eyes on the body whichever way that is.
  8. **The triple shot has no frame.** Its mates are the player's
     fuzzball, in its ink and at its charge, so the scene draws three
     `fuzzball-<charge>` frames `LAUNCH_GAP` apart. The art's sheet drew
     them small only to fit one picture. A prism's splits carry no charge,
     so `fuzzball-0` would draw them, which is S2's to choose.
  9. **The frames' names need no look-up.** `FRAMES.fuzzball(charge)` and
     `FRAMES.friend(ink)` are the contract's builders; only the fur is a
     table, read with `itemAt()`.
  10. **Each frame is `centered()`,** in whole even pixels about the body's
      middle, so the frame's middle is the fuzzball's, the hot shot's too,
      though its flames make it taller; the atlas spec holds the bricks'
      frames to a cell and the fuzzballs' to whole even sizes.
- **Checks.** The workspace's `lint` and `typecheck` are clean. `test`: 2718
  tests; the art's specs 410 of them (`fuzzball_art.spec.ts` 90,
  `frames.spec.ts` 78, `atlas_frames.spec.ts` 65, `tough.spec.ts` 50,
  `symbols.spec.ts` 35, `brick.spec.ts` 25, `art.spec.ts` 23,
  `zapper.spec.ts` 23, `steel.spec.ts` 11, and
  `src/testing/art_frames.spec.ts` 10). `test:coverage` passes its floors:
  the art's nine files and the specs' `art_frames.ts` at 100% of the
  statements (257), branches (33), functions (111) and lines (246). The
  root's `yarn lint` passes. A sheet of every fuzzball, drawn from the
  commands as SVG at 200, 128, 31 and 24 CSS px in a light and a dark
  palette, over bricks and on the field, looks as the art's `fuzzball/`
  does, the outline showing only over a brick.
- **The mutation pass.** Sixty-eight changes on the code as both reviews
  left it, one at a time, each run against the art's specs. 67 were killed:
  the grid wider or narrower, the growth less or none; the fur straight from
  charge 2 or 4, bent to the end or never straight, turned half out or only
  across, its turn unnormalised, mirrored, its control at the middle or
  about the body's, its tip about the middle, charged in sixths; the outline
  gone, wider, in the text or without its floor; a fuzzball's body also
  under what it wears, or gone; what it wears over drawn before the
  outlines, the outlines over what lies beneath, or that over the body; the
  sparks four, turned, in the fur, all as near, flattened or mirrored,
  wider, without their floor, unoutlined, outlined no wider than the
  outline, at charge 4, never, or their outlines alone from charge 1; a
  tongue under the body, hidden in the fur, taller or wider, the flames
  rising from the fur, in four steps, narrowing straight, leaning straight,
  unreversed, open, red-hot, over the body or with outlines half as wide;
  the hot shot relaxed or sparking; the player relaxed or red-hot at every
  charge, or relaxed or on end between; the friends charged or all in ink 0;
  the eyes with glints, larger or gone; the atlas without the fuzzballs; and
  `frames.ts` with five charges, seven inks or no eyes. One is equivalent:
  the grid taken from a rounded unit, as the field's unit is whole device
  pixels. Before the first review, 20 of a first 59 survived, and a spec now
  pins each: the sparks' width, turns, distances and zigzag; the tongues'
  tips, roots, swell, lean, steps and order; the fur's length at each
  charge; the hot shot's outline, and each tongue's; and the outline's CSS
  pixel floor.
- **Numbers.** The atlas at 128 device px a unit is 712 × 892, 37 frames of
  15,629 shapes; at 31 CSS px and 2 to one, 352 × 440. The fuzzballs' 16
  frames, as many as Asteroid Breaker's pilots, draw 15,546 of the shapes,
  as `fuzzballCommands()` draws each strand as 8 lines and 9 dots, and again
  for its outline: 1,022 shapes a fuzzball, 1,092 with the sparks and their
  outlines, and 1,166 the hot shot. At 128 px a unit the relaxed fuzzball's
  frame is 94 × 102, a full charge's 142 × 126 with its sparks, the hot
  shot's 104 × 160 and the eyes' 46 × 22. The sparks reach 0.53 units from
  the middle and the flames 0.59 above it.
- **For the other streams.**
  - S1 bakes the 16 new frames with the bricks'; the bake draws about
    15,630 shapes, so it is worth baking once a unit, as Brick Breaker's
    does.
  - S2 draws a fuzzball's frame at its middle, `FRAMES.fuzzball(charge)`,
    `FRAMES.hotShot` or `FRAMES.friend(ink)`, and `FRAMES.eyes` over it,
    moved by `FUZZBALL_LOOK.across * fuzzballGrid(scale) * dx` and
    `FUZZBALL_LOOK.down * fuzzballGrid(scale) * dy` for a unit heading in
    the canvas's directions; a triple shot as three of the player's.
- **The review:** two rounds, each by a fresh reviewer: nine comments in
  the first, three in the second.
  1. No spec tied the `fuzzball-<charge>` frames to `furOf()` for charges 1
     to 4, so drawing them relaxed or on end passed. Fixed: a spec holds
     each charge's frame to `furOf(charge)`'s fur, every line's ends within
     a billionth of a pixel.
  2. Nothing held the hot shot to having no sparks. Fixed: a spec holds it
     to no line or dot in the spark color.
  3. `scaled()` repeated `@fz/phaser/shapes`'s `placed()`. Fixed: it is
     `placed()`.
  4. A full charge's sparks were the one part of a fuzzball without the
     mark's outline, though they come within a brick it touches, in the
     zapper's warning color and near a bomb's danger. Fixed: each spark is
     outlined beneath the fuzzball's body (the fifth choice), and every
     fuzzball is drawn by `outlinedWith()`, so the outline is laid one way
     for all of them; specs hold the spark's outline along it, under the
     body.
  5. A spec's title said a fiftieth of a strand's length a charge, where it
     holds 6%. Fixed.
  6. `fuzzballFrames()`'s comment said the eyes were outlined, and
     `Flame.width` had no comment. Fixed: every fuzzball is outlined; the
     width says what it scales, 0.7 of it at the root, swelling to about
     five sixths.
  7. The log said the outline was as Brick Breaker's, which is twice as
     wide. Fixed: the fourth choice gives the reason for half.
  8. The spec's `inBillionths(strand)` shared its name with the helpers'
     `inBillionths(area)`. Fixed: `strandInBillionths()`.
  9. The plan's §5.4 table of frame names lacks `fuzzball-eyes`, for the
     integrator, as the plan is not this stream's.
  10. (Second round.) No spec held a spark over its own outline, which
      covers it, so drawing the outlines last passed. Fixed: a spec holds
      every mark command of a full charge before every spark, and the spec
      of the sparks' outlines reads their color.
  11. (Second round.) `outlinedWith()` promised an order its callers had
      to keep, and the sparks' gate was tested twice, so the outlines alone
      could spread to charges 1 to 4. Fixed: it takes what a fuzzball wears
      as one record, `Worn`, its outlines, what lies beneath and what lies
      over, and orders them itself; the sparks are one record under one
      test; a spec holds charges 0 to 4 to nothing in the mark but the
      outline.
  12. (Second round.) `outlinesOf()`'s parameters were named `edges` and
      `within`, for a spark's line and a width, and the fifth choice's
      order read ambiguously. Fixed: `lines` and `width`, with a plainer
      comment, and the choice says the flames.

### U1's panels: Coming next and In this wall

**2026-11-10.** A piece of the integrator's U1, split off for this stream.

- **Built.**
  - `src/app/panels/coming_next.component.ts`, `.html` and `.scss`:
    Coming next, left of a wide room's field. It shows the level's number
    and name, the rows waiting over the ceiling and how many there are,
    and the jump in a sentence.
  - `src/app/panels/in_this_wall.component.ts`, `.html` and `.scss`: In
    this wall, right of the field. It shows each kind of brick the wall
    holds, the crew and the boon's badge.
  - `src/app/panels/panels.ts`: `waitingRows()`, a wall's rows over the
    ceiling, the furthest first; and `kindsIn()`, the kinds a wall holds,
    in How to play's order.
  - `src/app/panels/_panel.scss`: the look both share.
  - Specs: `panels.spec.ts` (7 tests), `coming_next.component.spec.ts`
    (9) and `in_this_wall.component.spec.ts` (12).
  - `implementation-plan.md` §5.4's table of frame names gains
    `fuzzball-eyes`, as A3's review asked.
- **Choices the plan didn't make.**
  1. **The board places them, not the panels.** Each panel's host is
     `position: absolute` and takes no size of its own, and the board
     binds `[style]="cssRectStyle(metrics.panels.left)"` (or `right`) on
     it, inside an `@if` for a room with panels, as it lays its ring.
     The panels then take no layout input, and the board, which holds the
     metrics, places everything over the canvas in one place.
  2. **Narrow inputs, all from the rules and the view.**
     - Both take `start`, the `RoundStart` of the round in play, and
       `palette`, the `WallPalette` the field is drawn in.
     - Both take `boon`, the level's `Boon`, which the board holds parsed.
     - Coming next takes `level`, the `LevelEntry`.
     - In this wall takes `pictures`, How to play's `HelpPictures`, null
       until the scene has drawn, and `lit`, whether the shot being aimed
       carries the boon.

     They show the round's start, which a flight doesn't change: a row
     over the ceiling can't be struck.

  3. **A square takes its brick's `brickColor()`,** the color A2's art
     gives its shards, so it matches the brick's body, steel's grey and a
     zapper's included. A friend takes `palette.friends[ink]`. Both are
     written with `cssHex()`, as `--ink` on a square and `color` on a
     fuzzball.
  4. **As many rows as fit, by CSS alone.** Every waiting row is drawn,
     at most a wall's 40 rows of nine squares. The rows sit at the foot of
     the height the words leave, and what doesn't fit is cut off at the
     top, so nothing measures. The top row shown may be cut part way.
  5. **Every row over the ceiling counts as waiting,** rows of air among
     them, since each comes down a round's step: "2 rows wait over the
     ceiling."
  6. **The jump's sentence is the rules' `describeBoon()`,** as the Ready
     card and the announcer say it. The picture of the jump isn't drawn,
     since the scene's pictures don't hold one yet.
  7. **In this wall lists the kinds the wall holds now,** in the field or
     waiting, so a kind broken out drops off. The list is `@fz/game-ui`'s
     `helpEntries()`, as How to play builds its own: each kind's name, the
     catalog's `about` and its picture. The picture is an `<img alt="">`,
     since the name beside it says what it shows, bounded as How to play
     bounds it, so it keeps its shape. Before the pictures
     arrive, the words keep their column, so nothing moves when they do.
     The `<ul>` is `role="list"`, as Safari's VoiceOver drops a list's
     role with its markers.
  8. **The crew shows once a friend is freed:** a `<fz-fuzzball>` for each
     friend in its ink, hidden from assistive technology, and "2 friends
     fly with you." A level with no cages never shows it.
  9. **The badge always names the level's boon,** and the board lights
     it. It is a `.fz-badge` saying "A jump earns a hot shot". While
     `lit`, it lights (`fz-badge-accent`) and says "Next shot: hot shot",
     so the words change with the light and color doesn't carry it
     alone. The round's start can't light it: its `boon` stays set
     through the flight that spends the boon.
  10. **The boon always shows.** The kinds take the height the crew and
      the badge leave, and a kind that doesn't fit is cut off; How to
      play lists every kind.
  11. **The look is `board-card()` and `board-card-small`,** from the
      toolkit, with no colors of their own: only tokens and the inks
      handed in. Each heading is the card's `.card-title`. The card's
      most width is lifted, as the board sizes each panel, 172 to
      320 px, and its text starts at the left. Its glass is off
      (`backdrop-filter: none`): behind a panel lies only the canvas's
      spare room, flat, so a blur redone every frame of a drag or a
      flight would cost the frame (F1) and show nothing.
  12. **The helpers live in `src/app/panels/`,** the folder this stream
      owns. `waitingRows()`, or a count of the rows waiting, belongs in
      `rules/wall/wall.ts` once the lintel or the bar wants it too.
- **Checks.**
  - The workspace's `lint` and `typecheck` are clean.
  - `test`: 3394 tests, 28 of them the panels'.
  - `test:coverage` passes its floors. The panels' three TypeScript files
    are at 100% of their statements (47), branches (10), functions (17)
    and lines (41).
  - The root's `yarn lint` passes.
  - In a real Chrome, from the dev server at 9136, a harness put in
    `app.component` for the look and taken out again showed:
    - both panels at 172, 200 and 320 px wide, over 18 rows waiting;
    - the rows cut off at the top in a short panel;
    - the crew and the badge kept in sight under five kinds.

    That was before the reviews, whose changes to the look are only the
    glass turned off, the headings' size taken from `.card-title`, and
    the kinds' pictures bounded rather than sized.
- **The mutation pass.** Twenty-nine changes, each run against the
  panels' specs, after the first review's fixes, and the three the second
  review's touched again. 28 were killed:
  - `waitingRows()`: the rows unclamped under the ceiling, one row too
    few, the next row first, the rows mirrored;
  - `kindsIn()`: every kind, or the kinds in the wall's order;
  - Coming next: every square the text's color, air inked, the squares
    not hidden; none waiting said as a count, one row as many, the
    sentence grown; the jump of the wrong boon; the level unnamed; the
    region unnamed;
  - In this wall: no pictures, a picture named, every kind named a
    brick; no words; the friends all in ink 0, one friend as many, the
    crew always shown; the badge's words inverted, always lit, never
    lit, always "A jump earns", or of the wrong boon; the region named
    as the other.

  One is equivalent: the count of rows unclamped, as `Array.from()`
  makes no rows of a negative length. On the first pass two survived:
  the rows mirrored, as every fixture's row was symmetrical, so one now
  isn't; and the badge naming the carried boon rather than the level's,
  which were the same boon. The wrong boon in the jump and the badge
  dies now only because the review's `"triple"` cases name the other.

- **For the integrator.** U1's core places the panels, with each style a
  `computed()` (`leftPanelStyle()`, `rightPanelStyle()`) so the template
  only binds:

  ```text
  @if (leftPanelStyle(); as style) {
    <app-coming-next [style]="style" … />
  }
  @if (rightPanelStyle(); as style) {
    <app-in-this-wall [style]="style" [lit]="aimingBoon()" … />
  }
  ```

  - The panels must sit outside the element with `role="application"`:
    the board's host can stay the size container, with the role on an
    inner wrapper around the canvas, or the panels can be its siblings.
    Inside it, a screen reader's browse mode never reaches their
    regions.
  - `lit` is true while the player aims a shot carrying the boon, false
    once it flies.
  - In this wall takes the scene's pictures as they come, the same
    `HelpPictures` How to play takes. `data-panels` is the board's.

- **The review:** a fresh agent read the change against §5's contracts
  and §8's practices, with nine comments and five nits, each answered:
  1. VoiceOver drops the kinds' list role with its markers: the `<ul>` is
     `role="list"`, as the levels and How to play's catalog do, and the
     spec finds the list by role inside the region.
  2. The kinds were built by hand where `helpEntries()` builds them, and
     `PanelPictures` copied How to play's type: the panel uses both of
     How to play's.
  3. The badge stayed lit through the flight that spends the boon, as the
     round's start still carries it: the board lights it with `lit`.
  4. Inside the board's `role="application"` the panels' regions are out
     of browse mode's reach: a note for the integrator says to place them
     outside it.
  5. The snippet called `cssRectStyle()` in a template: it binds
     `computed()` styles now.
  6. `waitingRows()` is the rules' kind of question: it stays here, the
     folder this stream owns, and a note says it belongs in
     `rules/wall/wall.ts` once another part wants it.
  7. The glass blurred a flat room each frame: it is off, and choice 11
     says why.
  8. "The next to come in lowest" told the eye what the squares show: the
     sentence ends at the ceiling.
  9. The jump's sentence and the badge were tried with the hot shot alone,
     so a hard-coded boon would pass: both run over `"hot"` and
     `"triple"`.

  The nits: the headings take `.card-title`, keeping their `margin: 0`;
  the shared look drops `align-content: start`, and the panels their
  `stretch`; a missing brick is `brick === null ? null : …`; a count no
  longer shares the name `rows`; and "Level 3: Pips" is a `title`
  computed.

  A second fresh agent read the change as it stood, and found nothing
  blocking. Its three comments, each answered:
  1. `@if (crew().length > 0)` compared in the template: `crewWords` is
     null before a friend is freed, and the template binds
     `@if (crewWords(); as words)`.
  2. Three spec helpers branched where they needn't: the level is
     `levelEntryOf(LEVELS, 3)`, a square's ink comes from a helper that
     throws for a row with no brick, and a friend's from `inkAt()`. A
     doc comment that said "before the wall" names `WALL`.
  3. The kinds' pictures were sized square, stretching one that isn't:
     they are bounded with `max-width` and `max-height`, as How to
     play's are.

### U2's menu: the tuning and the debug section

**2026-11-10.** The part of the integrator's U2 that stands alone, while
U1's core and S2 are built: the numbers the debug menu tunes and its
section of the settings drawer, on L3's `@fz/game-ui/debug_menu`. The
wiring to `GameService` and the site's listing come with U2's last commit.

- **Built.**
  - `src/view/debug/debug_tuning.ts`: the numbers the menu tunes
    (`TunedNumbers`, the game's own as `TUNED_NUMBERS`), their sliders
    (`TUNING_SLIDERS`), each read in its unit (`formatTuning()`), the
    lines they would replace (`tuningLines()`), the pace and the rules'
    numbers they come to (`paceOf()`, `rulesOf()`), and whether they
    leave the certificates stale (`staleCertificates()`).
  - `src/app/debug/debug.service.ts`: `DebugService`, which holds what
    the menu sets: the numbers (`createTuning()`), the field's depth over
    the room's, every level open, whether the certificates are stale,
    and whether the run under way keeps no records (`runOffRecord`, set
    afresh by `startRun()` as each run begins).
  - `src/app/debug/debug_menu.component.*`: `<app-debug-menu>`, which
    shows `<fz-debug-tuning>` with the sliders and the lines, and projects
    into it the game's own controls: a status line, the field's depth,
    Open every level and Play the certificate.
  - `src/app/settings/settings.component.*`: the drawer shows the menu
    below the theme where `DEBUG_MENU` says so, as the breakers' do, and
    passes it `certificate` and hands on `playCertificate`.
  - Specs: `debug_tuning.spec.ts` (28 tests), `debug.service.spec.ts`
    (20), `debug_menu.component.spec.ts` (18), and four more in
    `settings.component.spec.ts`, whose renders now provide `DEBUG_MENU`
    as false unless a spec asks, as a build for players does.
- **Choices the plan didn't make.**
  1. **Seven numbers.** `FLIGHT_PACE`'s five (Normal's and Fast's units
     a second, fast-forward's multiplier, the 8 s before a long flight
     speeds up and the speed-up itself), the guide past its first turn
     and the bored distance. Each slider's range spans the shipped
     number on its steps, which a spec holds.
  2. **The lines name their files.** `FLIGHT_PACE` lives in
     `round_play.ts` and the other two in `tuning.ts`, so Copy the
     numbers writes each block under a comment naming its file. A spec
     holds the shipped numbers' lines to each file's text (`?raw`), as
     Asteroid Breaker's does.
  3. **Only the bored distance leaves the certificates stale.** They are
     stale once `rulesOf()` gives other numbers than `RULES`, which
     `playRound()` reads, so a number added to `RoundRules` stales them
     with no list to keep. The guide's length shows a shot and plays
     none, and the pace only plays a round back, so neither is in it:
     R6's `guideOf()` takes its length as a parameter of its own.
  4. **What keeps no records:** a run with a number retuned at any
     moment since it began, as `plan.md` says and Asteroid Breaker does,
     the numbers put back or not; and a run begun at a level the player
     hadn't opened, which every level open allows, as it would clear a
     locked level into the progress. Opening every level mid-run costs
     the run nothing, as `nextLevel()` goes on to the next level, locked
     or not; nor does a depth set, as a window of that size gives the
     same field. `runOffRecord` latches as a number is tuned, and
     `startRun()` sets it afresh, given whether the run starts locked or
     storage kept it off the record.
  5. **The menu's state is a root service,** not inputs through
     `<app-settings>`, as the game reads it from more than one place:
     the numbers each frame, the depth between rounds, and every level
     open in the Levels dialog. Only the certificate passes through the
     drawer, an input and an output, since only the game knows the level
     in play and can play a line.
  6. **None of it is kept,** the depth and the levels included, so a
     reload gives the player's own game back, as the menu says of the
     numbers.
  7. **The depth is a native `<select>`:** the room's, then 11 to 22
     rows. Thirteen choices are too many for a choice list, and a slider
     has no place for "the room's". It is styled with tokens alone.
  8. **One status line says it all,** empty while the game is the one
     that ships and the run was played on it: "This run keeps no
     records.", from `runOffRecord`, with "The certificates are stale
     while the rules are retuned." before it while the bored distance
     has moved. It stays in place, empty, so a screen reader hears it
     change.
  9. **Play the certificate shows only with a certificate to play,**
     described by what it plays ("Plays level 3 from its start on a
     field 14 deep, its certificate's 6 rounds one at a time."). With
     none, a sentence says so in its place.
  10. **`setDepth()` throws a `RangeError`** for a depth no field has, as
      `levelEntryOf()` does for a level.
  11. **Reset the numbers resets the numbers,** as it says; the depth and
      the open levels stay, and their descriptions say so, so a depth can
      be kept while the numbers are tried.
  12. **The depth list's text is 16 px at least,** as Safari on a phone
      zooms into a list it focuses with smaller text.
- **For U2's wiring.**
  - `GameService` hands `paceOf(debug.tuning.tuning())` to `RoundPlay`
    and `rulesOf(…)` to `playRound()`, hearing each change through
    `debug.tuning.onTune()` where a frame steps on them.
  - The guide takes its length as a number, not from `tuning.ts`, whose
    header says the menu retunes only what the rules are handed: R6's
    `guideOf()` needs a parameter for it.
  - The depth is `debug.depth() ?? the room's`, taken between rounds.
  - `GameService` calls `debug.startRun({ locked })` as each run
    begins, `locked` being `!progress.isOpen(level)`, and
    `debug.startRun({ kept: saved.tuned })` as it takes one up, so
    `KeptGame.tuned` is `debug.runOffRecord()`, whose docs in the saved
    game and the records' services then read "played off the record"
    rather than "on retuned numbers". A run that plays a certificate
    keeps no records either.
  - The Levels dialog opens every level while `debug.everyLevelOpen()`.
  - The certificates: once P3 writes `src/rules/levels/certificates/`,
    a loader of `import.meta.glob()` over its JSON files, each loaded
    lazily as its own chunk, only when the menu asks, so a player's
    bundle carries none; a reader for P3's format on `@fz/core/json`;
    `certificate` on `<app-settings>`, the level in play's line on the
    field's depth, or null; and `(playCertificate)`, which plays the
    line from the level's start, a round at a time, on `RULES`, whatever
    the menu's rules, so Q4 watches the proof itself.
  - A whole depth from `LEAST_DEPTH` to `MOST_DEPTH` is now checked in
    three places: `thirdsOf()`, `saved_game.ts`'s `hasDepth()` and
    `setDepth()`. An `isDepth()` beside `thirdsOf()` would serve all
    three, a change to the rules stream's files.
  - `AGENTS.md` gains `src/view/debug/`, `src/app/debug/` and the
    drawer's debug section.
- **Checks.**
  - The workspace's `lint` and `typecheck` are clean.
  - `test`: 3886 tests, 70 of them new.
  - `test:coverage` passes its floors. `src/view/debug/` is at 100% of
    its statements (14), branches (7), functions (7) and lines (13);
    `src/app/debug/` at 100% of its 52, 23, 18 and 48; the settings at
    100% of their 37, 6, 10 and 31.
  - The root's `yarn lint` passes.
  - In a real Chrome, from the dev server at 9136, a harness put in
    `app.component` for the look and taken out again showed the drawer
    open at 1920 by 1080 and at 375 by 740: the seven sliders, the
    status line once the bored distance moved, the depth list at 16
    rows, the checkbox and Play the certificate with its sentence, with
    nothing wider than the drawer and no error in the console.
- **The mutation pass.** Fifty-two changes, after both reviews' fixes,
  each run against the specs of `src/view/debug/`, `src/app/debug/` and
  the settings. All were killed:
  - the numbers: Normal's pace started at Fast's, the boredom off the
    rules', a slider dropped, a range that misses its own number, a
    step that misses it;
  - the words: a pace's unit, the seconds off by ten, the multiplier
    written otherwise, the value text unitless;
  - the lines: the speeds swapped, the guide written as the boredom, the
    wrong file named, one place kept, the lines untuned;
  - `paceOf()` and `rulesOf()`: fast-forward from the speed-up, the
    rules untuned;
  - the certificates: nothing leaves them stale, the guide does, the
    test inverted, never stale;
  - the records: the run's latch letting go, a retune never latching it,
    opening the levels or setting a depth latching it, a run taken up
    forgetting storage's word, a locked start keeping them, a run
    started on the record whatever the numbers;
  - the depth: 11 or 22 refused, half a row allowed, the room's missing,
    22 missing, the depth set unshown, the room's read as a number;
  - the menu: the stale or the records unsaid, the status reading the
    numbers now rather than the run's latch, the status not a live
    region, Reset or a slider doing nothing, the levels' box doing
    nothing or never shutting, its words shortened, the rounds
    miscounted, the offer's or the none's words changed, the button
    always shown, undescribed or not handed on;
  - the drawer: the menu always offered, the certificate not passed, Play
    dropped.
- **The review:** a fresh agent read the change against §5's contracts
  and §8's practices, with seven comments and three nits, each
  answered:
  1. The status line read the game's state now, so putting the numbers
     back emptied it while the run under way still kept no records:
     `runOffRecord` latches for the run, and the status and
     `KeptGame.tuned` read it (choice 4).
  2. `RULES_NUMBERS` was a second list beside `rulesOf()`, so a number
     added to the rules could leave the certificates sound: a spec over
     every slider holds the two together (choice 3).
  3. The log didn't say which rules Play the certificate plays on: on
     `RULES`, the note for U2's wiring says.
  4. The spec of the lines could pass on a file's comment renamed, as
     its helper then read no lines: the helper throws.
  5. The depth's range is checked a third time: an `isDepth()` belongs
     beside `thirdsOf()`, in the rules stream's files, so the note for
     U2's wiring names it rather than this change making it.
  6. Reset the numbers left the depth and the open levels as set: it
     resets the numbers it names, and the two controls' descriptions say
     it leaves them (choice 11).
  7. Safari on a phone would zoom into the depth list: its text is 16 px
     at least (choice 12).

  The nits: the drawer's doc says the debug menu can cost a run its
  records; "cleared or not" is "locked or not"; and the certificate's
  depth and rounds and the menu's `everyLevelOpen` have doc comments.

  A second fresh agent read the change as it stood, with five comments,
  each answered:
  1. `RULES_NUMBERS` and its new spec contradicted each other, the spec
     ruling out the one case the list was kept for: staleness is worked
     out from `rulesOf()` against `RULES`, the list and the spec gone,
     with one case each for the boredom, the pace and the guide
     (choice 3).
  2. Every level open took the run under way off the record, though it
     can't change that run, and any run begun while it stayed open:
     only a run begun at a locked level keeps no records, as
     `startRun({ locked })` says (choice 4), and the checkbox's words say
     so.
  3. The pace's five sliders cost a run its records, though they only
     play it back: kept, as `plan.md` says a run on retuned numbers keeps
     none, with the question left to the integrator.
  4. `startRun(offRecord)` named its argument after the signal it was
     combined with: it takes `{ kept, locked }`.
  5. The status specs read the library's own status line by its place:
     they find the game's line by its words and check its role.

### U1's board: the canvas, the room, the panels and the cards

**2026-11-10.** U1's `board/` bullet, on the view stream's `GameService`:
the board that holds the canvas and its placeholder, measures itself and
hands the game the room before the scene's first layout, lays the panels
and the shell's cards over and beside the field, and publishes what T1's
check reads; and `<app-board>` in the app's slot for it, rebased onto the
view stream's wiring.

- **Built.**
  - `src/app/board/board.component.*`: `<app-board>`, after Asteroid
    Breaker's. Its `.play` element is the application, named for the
    level ("Brick Fuzz Pop, level 1: Hello, wall") and described by its
    keys, around `<fz-phaser-canvas>`, the placeholder and the ring; the
    panels, `<app-board-card>` with `<fz-canvas-cards>` projected into
    it, and the keys' paragraph are its siblings. The scene's options are
    `GameService`'s: `tick()`, `view()`, `waitingX()`, `boon()`,
    `crew()`, `guide()`, `aimings`, `palette`, `shape`, `motion()`,
    `sound()`, `onLayout()`, `fieldCommand()` as `command`, and
    `onPictures()`, the pictures waiting for the atlas to settle. It sets
    `setDrawn()` from the canvas's state, hands `setRoom()` each measure,
    shows `boardCard()`, and hands the card's four outputs to `resume()`,
    `nextLevel()`, `tryAgain()` and `newGame()`, taking the focus back
    first.
  - `src/app/app.component.*`: `<app-board>` in the slot inside `.room`;
    `refocusWhenUncovered()` hands it the focus as each run begins, as
    the page loads and as a dialog over it closes, and the bar's Resume
    hands it back too. The app's spec renders on the fake canvas and
    waits for it to be drawn, paints the palette's roles, and gains six
    specs of the board's focus, its landmark spec now finding the board;
    its "no picture while shut" plays the level first (choice 15).
  - For T1, on `app-board`: `data-field` (the lintel's top to the band's
    bottom), `data-room`, `data-panels`, `data-outcome`, `data-wall`,
    `data-depth` (choice 16), `--across`, `--down` and `--pixel-ratio`;
    and `--margin`, `--frame`,
    `--lintel`, `--band` and `--band-ink` for the placeholder and the
    cards. The stylesheet declares the margin as the canvas's insets
    (`--fz-canvas-inset-*`), as Brick Breaker's does.
  - `src/view/field/field_metrics.ts`, a contract file, gains a name:
    `FieldMetrics.framed`, the field from the lintel's top to the band's
    bottom in CSS pixels, which `fieldMetrics()` already worked out for
    the panels; `field_metrics.spec.ts` gains two specs and its first
    spec's whole record the new field.
  - `board.component.spec.ts`, 73 tests: by role on the fake canvas, then
    on the real scene through `runShownScene()`, the rounds from
    `src/testing/play.ts`.
- **Choices the plan didn't make.**
  1. **The application is an element inside the board,** around the
     canvas and the ring, so the panels and the cards read as a page
     does. Phaser hears the keys on the board's own element, which the
     application's keys reach, and the cards' buttons keep theirs, as
     the board card's `[fzKeepKeys]` does; a press on the board and
     `focus()` focus the application, and the ring shows while it has
     the focus from the keyboard.
  2. **The room goes to the game at each measure, and again as the scene
     is made:** an effect hands each measure, and the scene's source,
     once its import is in, hands the last one before it makes the
     scene, so its first layout is on the board's room whichever comes
     first. The page shifts 0.0007 on an upright phone and 0.0001 at 1600
     by 900, against Asteroid Breaker's 0.38.
  3. **One rectangle from the lintel's top to the band's bottom** is the
     placeholder's field, the ring, the card's layer and `data-field`:
     `FieldMetrics.framed`, of the game's `metrics()` once the scene has
     laid the field out, and of the placeholder's own `fieldMetrics()`
     until then. The placeholder draws the lintel and the band as its top
     and bottom borders in the band's ink, their thickness the difference
     between `framed` and the cells, the ceiling as an inset shadow in the
     field's line, and the frame as an outline, so its left border, the
     check's wall, is nothing.
  4. **`--down` is the field's height in units as drawn,** the lintel and
     the band in their whole device pixels, so the height is the unit
     times `--down` exactly, where the shape's fractions would be off by
     up to a device pixel.
  5. **The panels show from the placeholder's layout too,** so they are in
     place before the scene draws. What the check reads (`data-field`,
     `data-room`, `data-panels`, `--across`, `--down`) is the scene's
     layout alone, absent before it; once laid out, `data-panels` is
     empty where the room spares no panels, as the deck check needs the
     attribute.
  6. **`data-room` is the room the board last measured,** inside its
     insets: the room it handed the game, whose shape the field takes
     between rounds; the scene reports no room of its own. A board with
     no room, as a hidden one, publishes none.
  7. **`data-wall` is the wall's lowest row as the round aimed or in play
     started,** the wall the scene draws until it settles.
  8. **The pictures wait for the atlas to settle, and are read only where
     they show:** the scene's first bake's go to the game at once, each
     later bake's `PICTURES_SETTLE_MS`, 250 ms, after the last, so a
     resize under way encodes nothing, as U1 asks; and the board reads
     them, which has the scene encode them, only while the panels show or
     the Ready card shows a kind of brick new to its level. How to play
     reads them from the game as it opens.
  9. **The card, the boon and the crew are `GameService`'s**
     (`boardCard()`, `boon()`, `crew()`), as the view stream's wiring
     gave them; the board's own, drafted before, went at the rebase, and
     its specs of each card and of the waiting fuzzball's boon and the
     friends' inks stay, read through the board and the scene.
  10. **A card's button gives the board the focus before the game
      moves,** as the button goes with its card.
  11. **The keys' paragraph says what ends a run's result:** Enter or P
      try the lost level again, or start a new game after the last, as
      `GameService` does.
  12. **The palette is `GameService`'s;** the board's own
      `field_palette.ts`, drafted before it landed, was dropped.
  13. **Looking away needs nothing of the board:** the scene lets go of
      its keys and its press itself, through `@fz/phaser`'s
      `onPlayerAway()`, as the window blurs, the page hides or the focus
      leaves the board's element, Phaser's keyboard target; so the app's
      `(away)` pausing the game is all the rest. A spec holds F on the
      board in flight and moves the focus away.
  14. **The bar's Resume hands the board the focus back** from the app,
      as this bar has no `handBack` output, unlike Asteroid Breaker's;
      Pause and Resume, like Fast-forward, Skip and Sound, take no focus
      from a click, so its spec presses Resume from the keys.
  15. **How to play's "no picture while shut" spec plays the level
      first,** as the board's Ready card at level 1, which brings a kind
      in, asks for the pictures; what it checks, that How to play asks
      for none while shut, is as it was.
  16. **`data-depth` is how many rows deep the scene laid the field
      out,** its cells' height over the unit, both in device pixels, so
      exact: `plan.md`'s T1 holds the depth to the one the room's shape
      asks for, which neither `--down`, with the band's and the
      lintel's fractions in it, nor `data-field` gives back. Absent, as
      the rest, until the scene lays the field out.
- **For other streams.**
  - The view stream: `app.component.*` gains the board in its slot, the
    focus wiring and its specs (choices 14 and 15); the board needs
    nothing more of `GameService`, nor calls the scene on looking away
    (choice 13).
  - T1: as above, `data-depth` beyond what was asked; `data-panels` is
    absent until the scene lays the field out, then `""` where no
    panels show; the frame is an outline, as Asteroid Breaker's is, not
    a border.
  - The integrator: the game's `AGENTS.md` is behind the board in three
    places: its opening (the shell places "not yet the board"), the app's
    entry (the board's place "a marked slot until `<app-board>` is
    built") and `board/`, which names the cards alone; `<app-board>` is
    new, and `FieldMetrics.framed` with it. `FieldPainter.drawGround()`
    could take the field's height from `metrics.framed`.
  - The shell stream: `board_card.component.ts`'s class doc says the app
    hands the board back the focus; the board does, before the game
    moves (choice 10).
  - The view stream: `GameService.onPictures()`'s doc says it takes the
    pictures each time the scene bakes them; the board hands a later
    bake's on only once the atlas settles (choice 8).
- **Checks.**
  - The workspace's `lint` and `typecheck` are clean.
  - `test:coverage`, rebased: 4,511 tests in 81 files, 81 of them new
    (the board's 73, the app's six and the metrics' two), and its
    floors; `board.component.ts` and `app.component.ts` are at 100% of
    their statements, branches, functions and lines.
  - The root's `yarn lint` passes.
  - In a real Chrome, from the dev server at 9136, before the rebase,
    with a harness put in `app.component` and taken out again: at 1600
    by 900 the panels flush with the field from the lintel to the band,
    the Ready card over the wall and the placeholder where the scene
    drew, the margin read through `var()` as the canvas's insets; at 390
    by 844 the compact margin and no panels; a resize while aiming laid
    the field out anew. On S2's scene, a shot let fly from the keys
    broke a brick and brought the wall down a row (`data-wall` 5), P
    paused it under the Paused card, and its Resume went on with the
    focus back on the board, with no error in the console.
  - Again after the rebase, the real app with `<app-board>` in its slot,
    headless at 1600 by 900: the application has the focus as the page
    loads, with no ring; How to play opened from the keys shows five
    pictures, and Escape hands the board the focus with the ring on;
    Space lets a shot fly, P pauses under the Paused card, the bar's
    Resume pressed from the keys goes on with the focus on the board,
    and Tab from the board to the card's Resume and Enter does the same;
    `data-depth` 11, `data-panels` both sides; at 390 by 844,
    `data-panels` `""` and `data-depth` 17. No error or warning in the
    console.
- **The mutation passes.** The first, sixty-nine changes, each run
  against the board's spec. Sixty-six were killed:
  - the room and the layout: a room with none laid out, the placeholder
    shaping the room afresh, the placeholder over the scene's layout,
    the room never handed, the scene made without it, the lintel in
    device pixels, the band as the lintel, the field from the ceiling or
    without its band, the margins swapped;
  - what the check reads: `data-field` from the placeholder, `data-room`
    before the scene or without its insets or in device pixels, the
    panels' names swapped, `data-panels` dropped or empty before the
    scene, `--across` before it, the wall's row of the next start;
  - the cards: each card's numbers, Ready's level, boon and new kind (and
    one of an earlier level), Cleared before its wait, its friends of the
    start, its tally, score and rounds, Ended while the result is open,
    lost or won, its level's name;
  - the scene's options: the tick, the sound, the layout kept or handed
    on, the run's commands for the field's, the pictures, the drawn gate
    both ways;
  - the focus and the buttons: the host focused, a press taking none,
    each button not moving the game or not taking the focus back;
  - the pictures: the first waiting too, none waiting, the timer kept past
    the board;
  - the template: the boon unlit, the panels' boon, the press and the
    description unbound, the card and the ring unplaced, no pictures for
    the panels or the card, the keys heard elsewhere.

  Three survived, each a gap now given a spec and killed: `--down` from
  the shape's fractions, which a room that the field fills makes whole,
  so the spec lays out a field of the most rows, whose band and lintel
  aren't; the Paused card while the level is played, which the spec's
  look for Ready's title missed, so it finds the card's layer empty; and
  a later bake leaving the earlier's timer to run, so a spec bakes twice
  within the wait, on the specs' own timers.

  The second, over the review's fixes: twenty-three changes, against the
  board's spec or the metrics'. Twenty were killed: the room ungated, the
  placeholder shaping the room afresh or over the scene's layout, the
  lintel from the canvas's top, the band as the lintel, `data-field` from
  the placeholder or the cells, the ring and the cards on the cells,
  `--down` of the cells, the layout not handed on, no boon or the
  start's, no crew, no waiting x, the pictures always read, never read
  or read for any Ready card, and `framed` from the ceiling, without its
  band or in device pixels. Three survived. `--down` without the ratio:
  in jsdom the real scene lays out at one device pixel to one, so a spec
  now hands the game a layout at two on the fake canvas, and it dies.
  The pictures not read for the panels: the panels' spec is at level 1,
  whose Ready card asks for them too, so a spec at level 2 on a wide
  board, and it dies. No boon only in flight: `GameService`'s `boon()`
  now, whose specs hold it. Over the app's wiring, three more: the
  refocus dropped dies in four specs; the bar's Resume handing no focus
  survived a click, as the bar's buttons take none from one, so its spec
  presses Resume from the keys, and it dies; the focus asked before
  `resume()` rather than after is the same, as the board takes it after
  the next render.

  After the second review, four more, each killed: the run count never
  changing, by the spec of a run begun from the bar; `data-depth` a row
  short, unbound, or the shape's depth before the scene has laid the
  field out.

- **Numbers worth keeping.** At 1600 by 900, less a 73 px bar, the field
  is 576 by 779 CSS px, a 64 px unit, 11 rows, `--down` 12.17, with both
  panels 320 wide; at 390 by 844, a 12 px margin, a 40 px unit, 17 rows,
  `--down` 18.675 and no panels. A mutant of the board's spec takes about
  13 s on the shared machine.
- **The review:** no bug; six comments, each taken.
  1. The board's own scene options, `boon` and `crew`, had no spec that
     failed: two now read what the scene draws, the waiting fuzzball
     wearing the boon a jump earned from the jump's landing, and a freed
     friend flying in its ink, and the mutants die. Since the rebase both
     are `GameService`'s.
  2. The pictures were encoded wherever the board was: now read only
     while the panels show or the Ready card shows a new kind (choice
     8), with spies on the scene's `getBase64` at level 1 and level 2
     upright, and a wide board at level 2.
  3. The field's framed height was worked out again in the board, beside
     a second copy of the metrics paired with the shape afterwards:
     `fieldMetrics()` now gives `framed`, the board reads `metrics()`
     alone, and `Laid` and its pairing are gone; the specs hold
     `data-field` against the panels and the room an eleven-row field
     fills. The painter's copy is the integrator's to point at `framed`.
  4. `roomRect`'s doc said the scene's room: now the board's last
     measure, handed the game, and gated on `hasRoom()`, with a spec of a
     hidden board publishing none.
  5. The placeholder had no ceiling: now an inset shadow a frame thick in
     the field's line under the lintel, the total height and the left
     border as they were.
  6. The nits: `picturesTimer`'s doc says it is a timer; `pictures`' says
     they are those of the bake once its atlas settled; and `AGENTS.md`'s
     `board/` entry is the integrator's to update, as it was for the
     panels.
- **The second review,** after the rebase: no bug; the six answers hold;
  ten comments, each taken.
  1. The spec of a run begun from a lost run's result passed with a run
     count that never changed, the dialog handing the focus back itself:
     a spec now begins a run from the bar's New game, which takes the
     focus from a click and asks nothing, and the mutant dies there.
  2. T1 couldn't read the depth `plan.md` holds it to: `data-depth`
     (choice 16).
  3. The rebased wiring hadn't run in a browser: it has (Checks).
  4. A paragraph of the log broke mid-line: rewrapped.
  5. Choice 14 said every bar button refuses the focus from a click:
     Pause and Resume, Fast-forward, Skip and Sound do; it says so.
  6. Choice 10's and `takeFocusBack()`'s question New game asks never
     comes, a won run being no run in progress: both keep the reason
     that holds, the button going with its card.
  7. Docs a little off: `pictures`' and `takePictures()`' are reworded;
     the card's class doc and `GameService.onPictures()`'s are the shell
     and view streams' (For other streams).
  8. More of `AGENTS.md` is behind than the `board/` entry: the three
     places are named for the integrator.
  9. The spec drew the scene until a condition in three hand-rolled
     loops: `advanceSceneUntil()` now, failing past the flight's limit.
  10. The ring mixin's `:host(:focus-visible)` rule never matches: a
      comment says `.play` holds the focus.

### The board in the workspace's AGENTS.md

**2026-11-10.** The integrator's docs package after U1's board merged:
`frontend/games/brick-fuzz-pop/AGENTS.md` brought up to the board, only
where it was behind, and `GameService`'s two docs of the pictures.

- **Changed.**
  - The opening: the shell places the board too, so a run can be played
    in the page, where it said the board wasn't there yet.
  - `src/view/field/`: `fieldMetrics()` gives `framed`, the field from the
    lintel's top to the band's bottom in CSS pixels, with the cells and
    the panels.
  - `src/app/`: `app.component` places the board, and hands it the focus
    as the page loads, as each run begins, as the last dialog over it
    closes (`refocusWhenUncovered()`) and after the bar's Resume, where the
    entry said the board's place was a marked slot.
  - `board/`: `<app-board>` first, what it holds, how it measures and
    hands the game the room before the scene's first layout, the drawn
    gate, the pictures handed once the atlas settles and read only where
    shown, the application and its focus, and the attributes it publishes
    for T1's layout check, still to come; then the cards as they were,
    their margin set by the board.
  - `src/app/play/game.service.ts`: `pictures`' doc and `onPictures()`'s
    say the board hands the pictures on, the first bake's at once and a
    later one's once the atlas settles, where they said each bake's.
- **For the integrator.** `bfp/view`'s tip, the certificate loader,
  finished and rebased onto the board, edits this `AGENTS.md`'s opening
  (dropping "the rest of U2") and `app.component`'s sentence (the settings
  drawer "handed the debug menu's certificate"), so whichever merges
  second conflicts there; the merged text keeps both edits. Its
  `game.service.ts` changes leave the two docs' lines alone. Whether
  anything of U1 is left for the opening's "the rest of U1" is the
  integrator's to say; the line is as it was.
- **Checks.** The root's `yarn lint`, which checks every `AGENTS.md`'s
  paths and links and the formatting, and the workspace's `lint` and
  `typecheck` pass. Only docs changed, two of them comments, so no specs
  and no mutation pass.
- **The review:** nine comments, each taken but the eighth.
  1. The `board/` entry spoke of the layout check as if it ran: it is T1,
     still to come, and the entry says so; the custom properties now say
     what each is for, `--margin` the canvas's insets and `--frame` the
     ring's too.
  2. `bfp/view`'s tip is finished, not set aside, and edits this file
     too: `GameService`'s docs are changed here, as its commit leaves
     their lines alone, and the overlap in `AGENTS.md` is named for the
     integrator.
  3. `fieldMetrics()`'s list hung off "mid-flight": reworded.
  4. "`GameService`'s options": plain functions over it
     (`WallSceneOptions`).
  5. The app's "the last dialog over it" read as the page's: "over the
     board"; the log's "where it said" too.
  6. The board's "It takes the focus" could have meant the card: the
     board puts it on `.play`, and the game "moves on".
  7. "The card reads" after "the cards are": `<app-board-card>` reads,
     and "shows no card of its own".
  8. "The rest of U1" may be stale: left to the integrator, as the brief
     touched only the four places.
  9. "the board …, the bar": "then the bar".

### The lintel's count of the rows waiting

**2026-11-10.** A bug the scene stream's Q3 browser check found: the
lintel never said how many rows wait, as `plan.md`'s decision 6 has it,
an empty band on every shape; the scene leaves the words to the board's
page over the canvas, placed from the layout, as the panels are. On an
upright phone the bar shows only the rounds and the score and the panels
are hidden, so the count showed nowhere.

- **Built.**
  - `<app-board>` gains a paragraph on the lintel (`.lintel`), its words
    from `GameService.rowsLeft()`: "5 rows waiting", "1 row waiting", "No
    rows waiting". Placed from the layout as the field is (the scene's, or
    the placeholder's until then) and as tall as the lintel less the
    ceiling's line, in the field's text, centered, taking no pointer.
  - The Ready card's layer lies under the lintel, from the ceiling to the
    band's bottom (`cardStyle`), so the card, a margin from the layer's
    top, never covers the count; every other card, centered, keeps the
    whole field.
  - `wallRow`'s doc says what T1 holds the wall to: the row a level opens
    on at the field's depth while it waits for its first shot.
  - `board.component.spec.ts`, eleven tests more: the other cards' layer
    over the whole field, the words, the last row
    waiting and none, the place, nothing before the board is
    measured, read on a phone, on a roomy screen whose bar can't count the
    rows and on a short screen as wide as the bar's labels, and hidden,
    its words still there, where the bar or Coming next count them.
  - `src/view/colors/contrast.spec.ts` holds the field's text at 4.5:1
    against the band's ink, the lintel's, in every palette.
  - The game's `AGENTS.md`: the `board/` entry says what the lintel says,
    the Ready card under it, what `--lintel` and `--frame` size, and that
    the check reads `--lintel` and `--band` once the board is measured,
    and names the layout check, merged, where it said T1 was still to
    come; the
    `src/view/colors/` entry, the field's text held to 4.5:1 against it.
- **Choices the plan didn't make.**
  1. **"No rows waiting" once none wait,** rather than an empty lintel:
     the bar's Rows left shows 0 then and Coming next says no rows wait,
     and an empty lintel is what read as the bug.
  2. **The count is the bar's,** the rows waiting as the round aimed or in
     play started, so it changes once the wall is at rest and the next
     round is aimed; on a losing step it keeps the last count until the
     result's card, as the bar and Coming next do.
  3. **As large as the lintel holds, no larger than the page's small
     text:** 0.8 of the lintel less the frame, at most `--fz-font-sm`, a
     line as tall as the type, so it never reaches the ceiling's line.
  4. **Read as the page is where nothing else says it, and not a live
     region:** the bar's Rows left shows from the width the bar's actions
     keep their labels at, unless the window is compact, and Coming next
     counts the rows where the panels show; where either shows, the
     lintel is hidden from assistive technology. The announcer is the
     page's one voice for what changes, and its words for a round never
     count the rows waiting; a status of the board's own would change in
     the same render as the announcer's round words and could have one
     of them dropped on a phone's screen reader. To hear the count as it
     changes, the announcer's step and jump words would say it (For
     other streams).
  5. **Outside the application, with the panels and the card, and the
     Ready card under it:** the Ready card stood a margin from the
     lintel's top, its edge through the words on a phone; its layer
     starts at the ceiling instead. The centered cards keep the whole
     field, as a Cleared card with its crew nearly fills it on a phone on
     its side, and covers the count only then. A spec holds the count
     outside the application.
  6. **The words keep still through a lost level's shake,** as the panels
     and the cards do, while the scene's camera moves the drawn lintel up
     to 6 CSS px for 300 ms.
- **For other streams.**
  - Whoever keeps `src/rules/run/describe.ts`: the step's and the jump's
    words could end with the rows waiting ("…, 3 bricks to a jump, 6 rows
    waiting."), from one count the rules give, which `waitingRows()` in
    `src/app/panels/panels.ts` and `GameService.rowsLeft` would share.
    The lintel stays read where nothing else in the page counts the
    rows, as the announcer's words come and go.
  - The shell stream: the lintel's hiding mirrors the bar's
    `fitsEveryFigure` (`!isCompact() && fitsActionLabels()`); a change to
    when the bar shows Rows left wants the same change in the board's
    `lintelHidden`.
- **Checks.**
  - The workspace's `lint` and `typecheck` are clean, and the root's
    `yarn lint` passes.
  - `test:coverage`, rebased onto T1: 4,721 tests in 90 files, fifteen of
    them new (the board's eleven, and the contrast's one in each of four
    palettes), then the 150 of the simulation, and its floors;
    `board.component.ts` stays at 100% of its statements, branches,
    functions and lines.
  - In a real Chrome, headless, from the dev server at 9136, the
    screenshots saved outside the repository, in the scene stream's
    folder of Q3's shots, as `lintel-desktop-1600x900.png`,
    `lintel-phone-upright-375x812.png` and
    `lintel-phone-on-side-812x375.png`, each with the Ready card under the
    lintel:
    - at 1600 by 900, "11 rows waiting" on a lintel of 32 CSS px, 14 px
      type, hidden from assistive technology as the bar and the panels
      count the rows; after a shot, "10 rows waiting";
    - at 375 by 812, "7 rows waiting" on a 23 px lintel, 14 px type, not
      hidden, the panels and the bar's count not shown;
    - at 812 by 375, "11 rows waiting" on a 15 px lintel, 10.4 px type,
      hidden, as the panels show;
    - at 360 by 800, where the review saw it, the words end at 27.7 px
      and the Ready card begins at 43; it began at 24, through them,
      before the cards' layer moved under the lintel;
    - at 568 by 320, a small phone on its side, units of 24 px: a 12 px
      lintel, 8 px type in its 10 px; no error or warning in the console.
- **The mutation passes.** The first, fifteen changes, each run against
  the board's spec; fourteen were killed, and the compact window ignored
  survived, as no spec had a compact window as wide as the bar's labels:
  a short screen 1300 by 450 now, and it dies. The second, over the
  review's fixes, sixteen: the lintel over the ceiling's line, at the
  canvas's top or narrower than the field; no "No rows", none as a
  number, no singular, a count off the run; the panels not hiding it, the
  compact window or the bar's labels ignored, never or always hidden, the
  hiding unbound; unplaced, not drawn beside the panels, the bare count.
  All sixteen were killed. After the second review, four more, each
  killed: the cards over the lintel, from its top, or as tall as the
  field, and the count inside the application. After the third look,
  two more, each killed: every card under the lintel, and only Ready
  over the field.
- **Numbers worth keeping.** At the layout check's least unit, 24 CSS
  px, the lintel is 12 px at its thinnest, half a unit, so the count's
  type is 8 px there; 14 px from a lintel of 19.5 px up.
- **The review:** ten comments, each taken but the fourth and the
  seventh.
  1. A status of the board's own changes in the same render as the
     announcer's round words, and could have one dropped on a phone's
     screen reader, where the page's rules give what changes to the
     announcer alone: the lintel is a plain paragraph now, read as the
     page is where nothing else says the count, hidden where something
     does (choice 4); the announcer's counting the rows is proposed for
     the describe words' keeper (For other streams).
  2. The hidden cases passed with no lintel at all: each now finds it,
     hidden, with its words.
  3. The first spec took its count from the signal the board reads, and
     matched a part of the words: seven, the specs' first level's on an
     upright phone, matched whole, as every case's words are now.
  4. On a losing step the count keeps the last until the result's card:
     left as the bar and Coming next have it, and said in choice 2.
  5. The class doc names the lintel's count, beside the panels and the
     card as a page reads.
  6. `lintelHidden`'s doc says "Whether", and it follows `panelStyles`.
  7. The hiding's condition copies the bar's: left, as the bar is the
     shell stream's, and named for it.
  8. The log's choices 2 and 4 say when the count changes and why the
     lintel is no live region.
  9. "is read as a status as the rows come in": "is read".
  10. The lintel's text against its ink had no contrast spec: the
      palette's spec holds the field's text at 4.5:1 against the band in
      every palette, 8.75:1 at the least.
- **The second review:** no bug; eleven comments, each taken.
  1. Nothing held the count outside the application: the spec of what
     reads as a page finds no count inside it, and a mutant that moves it
     in dies.
  2. The Ready card's edge crossed the words on a phone: the cards' layer
     lies under the lintel now (choice 5), seen in Chrome at 360 by 800.
  3. The log miscounted the first review's answers: the fourth and the
     seventh were left.
  4. The hand-off had the lintel hidden everywhere once the announcer
     counts the rows, against choice 4: it stays read where nothing else
     in the page says the count.
  5. The specs found the count by its class: by its words now, which also
     find it hidden.
  6. `AGENTS.md`'s colors entry says the field's text keeps 4.5:1 against
     the lintel.
  7. A lost level's shake leaves the words still: choice 6.
  8. `lintelHidden`'s doc names `BarComponent`'s `fitsEveryFigure`.
  9. The specs' details: no viewport where none counts, the default
     rounds, the desktop named (1280 by 800), "says one row waits once
     the rest have come in", and `isInaccessible` from
     `@testing-library/angular`.
  10. The docs: the class doc reflowed and its "read as a page does"
      true of the count only where it is read; the template's comment
      one sentence, saying the announcer doesn't count the rows; the
      stylesheet's comments name the count; `.lintel`'s margin, which
      `cssRectStyle()` sets, gone; `AGENTS.md` says `--frame` sizes the
      count too.
  11. The log: the least lintel at the layout check's least unit, and the
      screenshots outside the repository.
- **The third look,** at the second review's fixes alone: no bug; six
  comments, each taken.
  1. A Cleared card with its crew, about 346 CSS px at 812 by 375, would
     have run past a layer 336 tall under the lintel: only the Ready card,
     held at its layer's top, lies under the lintel now; the centered
     cards keep the whole field (choice 5), with a spec of the Paused
     card's layer.
  2. `fieldStyle`'s doc: every card but Ready.
  3. `shown`'s and `frameCss`'s docs name the count and the Ready card's
     layer.
  4. `AGENTS.md`'s "the cards lying under it, read as the page is" read
     as the cards': the sentence is the count's, and the Ready card lies
     under it.
  5. `AGENTS.md` lists `--lintel` and `--band` among what the check
     reads, once the board is measured.
  6. The spec of what lies outside the application finds one count in
     the page too.

### X1's art: the bomb, wool, the cage, and the cross and X zappers

**2026-11-11.** The art of Sparks' five kinds, drawn ahead of X1, which
catalogs them. As the integrator settled it, the art lands unwired: each
kind's file and its specs, none of it in `BRICK_ART`, whose `satisfies`
over the catalog's ids refuses art for a kind not yet cataloged as it
refuses a cataloged kind without art. X1 adds the five lines to
`BRICK_ART` with its catalog commit.

- **Built.**
  - `src/view/art/kinds/zapper.ts`: the cross's and the X's patterns. A
    zapper is drawn from a list of bolts, each turned by a cosine and a
    sine and drawn longer by a factor: the row's and the column's one
    zigzag bolt; the cross's two straight ones along its row and its
    column, with a diamond in the field's text on a rim of its face where
    they cross; the X's two straight ones an eighth of a turn either way,
    1.2 times as long and as wide, toward the tile's corners.
    `ZapperKind` is the palette's four zappers (`InkedKind`) rather than
    the catalog's ids, so `zapperArt("crossZapper")` and
    `zapperArt("xZapper")` build before X1 catalogs them.
  - `src/view/art/kinds/bomb.ts`: `BOMB_ART`, the tile in the danger
    color, seven dots toward the bricks around it, the round bomb, its
    neck and its fuse cut out in the mark, a shine of the tile's color on
    the bomb, and a spark in the sparks' color on a star cut out at the
    fuse's end.
  - `src/view/art/kinds/wool.ts`: `WOOL_ART`, the tile in pink, three rows
    of five V stitches in a yarn of the pink half white, and a disc cut
    out of its top right corner with a lightning bolt on it in the sparks'
    color.
  - `src/view/art/kinds/cage.ts`: `CAGE_ART`, a cage as two layers. The
    lower, `caged-<ink>`, a frame for each of the friends' eight inks: the
    tile in steel, its darker inside, and the friend it holds in the ink
    its tint picks, its eyes cut out in the mark. The upper, `cage-whole`
    or `cage-hit`: four steel bars, and once hit the third broken, its two
    ends bent aside, and a crack down the frame's top.
  - `src/view/art/frames.ts` gains `FRAMES.caged(ink)`, `caged-0` to
    `caged-7`, in `FRAME_NAMES` before the cages' bars.
  - `src/view/art/art.ts`: `KindLook`, a brick's look but its kind, which
    `KindArt`'s `layersOf` and `colorOf` read, so a kind's art can be
    asked before `BrickKindId` names the kind. `BRICK_ART` is as it was.
  - `src/view/art/symbols.ts`: `CRACK_WIDTH` and the edges' ways
    (`ACROSS`, `DOWN`), moved from `tough.ts` for the cage's crack;
    `EIGHTH`, the cosine of an eighth of a turn, for the bomb's neck and
    the X's bolts; `pointAt()`, a point at shares of an area; and
    `boltMark()`, the lightning bolt, which the shell's art draws too.
  - The specs take the tile's corner from `brick.ts`'s `tileRadius()`,
    which the scene stream's shell and moss brought, rather than copy it.
  - `src/testing/art_frames.ts`: `pastRoundRect()` measures a point inside
    a rounded rectangle as far in as its nearest edge, rather than up to
    its radius, and `reachPastRoundRect()` says how far any command
    reaches past one.
  - Specs: `bomb.spec.ts`, `wool.spec.ts` and `cage.spec.ts`, each
    reading its kind's frames from its art; the cross's and the X's in
    `zapper.spec.ts`; the new symbols' and the helper's. In
    `atlas_frames.spec.ts` every check of the atlas's frames, within the
    cell, lines a CSS pixel wide, the size under 2048², the bakes at
    units 1 to 16, the detail at 29 and 31 CSS px and the frames' names,
    runs over the unwired art's frames too, the five kinds in the scene
    stream's `WAITING_ART` beside the shell and moss, and a new one holds
    every brick's frame but the zappers' within the chunky tile's rounded
    square, the shell's and the moss's among them; 81 tests more.
  - The game's `AGENTS.md`: the art's entry names the four zappers and
    the five files unwired, the scene stream's two among them, which
    `BRICK_ART` takes in as the catalog takes in their kinds; the testing
    entry, `reachPastRoundRect()`.
- **Choices the plan didn't make.**
  1. **A cage's friend is a frame for each ink, under its bars,** as the
     integrator settled that each cage owns its ink, which the rules give
     it as its tint, 0 to 5 from the wall's lowest cage up, and its friend
     keeps as it is freed. Tinting a white friend as it is drawn would
     want the scene to tint one of a brick's layers, which no layer is
     now; eight frames more fit the atlas (Numbers), and a cage stacks two
     layers, where the wall's painter holds three. The frames run to the
     friends' eight inks, as the `friend-<ink>` frames do, though six
     cages at most hold one.
  2. **Under 30 CSS px the bomb's dots drop,** as steel's rivets do,
     being smaller (0.027 of a cell against 0.04), **and so does the
     cage's crack,** a crack; its broken bar stays, the mark of its hit.
  3. **The cage's crack starts on its tile's top edge,** cut along it, as
     a tough brick's cracks are, where the art's starts above the tile.
  4. **The cage's inside and bars lie on whole pixels,** each bar a whole
     number of pixels wide and a CSS pixel at least, the right side
     mirroring the left and the bottom the top, so the cage stays centered
     at every unit; the broken bar bends from the middle of the bar it
     was.
  5. **The art's round lines are `stroke()`:** the fuse, the shine and the
     stitches, round at their ends and bends as the art's polylines are;
     its mitred ones, the broken bar's ends and the crack, are bands.
  6. **The yarn is mixed in the art,** the wool's ink 52% white, as
     steel's sheen is, not a palette ink: 1.9:1 to 2.3:1 against the
     pink, a texture; the wool's mark is its disc and bolt, which the
     palette's spec holds.
  7. **The specs hold the unwired art as the atlas's,** through
     `atlas_frames.spec.ts`'s `WAITING_ART`, by the id each kind will
     take, which passes over a kind once `BRICK_ART` holds it.
- **Checks.** The workspace's lint, typecheck and `test:coverage`, on
  `brick-fuzz-pop` at `53ffd3bd`: 4,971 tests in 107 files, and 150 in
  `sim`, the floors held; the root's lint.
- **The mutation pass,** run again over each version: 49 mutants at the
  last, from each kind's numbers, inks, widths, order, detail and layers
  to the symbols and the specs' helper. Three lived across the passes,
  and die now: the bomb's tile in its face's color, as the specs' palette
  gives the bomb one ink for both, so the bomb's and the wool's tile
  specs draw in inks of the kind's own; the cage's feet rounded on their
  own, as the cage's symmetry spec held it across only, which holds it
  down too now; and the crack 0.028 of a cell wide, which rounds as 0.032
  does at 128 device px, so the spec draws it at 110. The bomb's neck had
  no spec until the pass was planned.
- **Numbers.** At 128 device px a unit the atlas's 37 frames, the shell's
  and the moss's 6 and the five kinds' 14 pack into 908 × 1042, and with
  the scene's frames and a picture of each of the 16 kinds 1140 × 1448,
  under 2048 × 2048. The friends' inks against a cage's inside: 3.40:1 at
  the least, in Classic felt; the field's text against the cross's tile:
  9.82:1 to 13.11:1.
- **For other streams.**
  - X1, wiring the art with its catalog commit: `bomb: BOMB_ART`,
    `crossZapper: zapperArt("crossZapper")`,
    `xZapper: zapperArt("xZapper")`, `wool: WOOL_ART` and
    `cage: CAGE_ART` in `BRICK_ART`, in the catalog's order; in
    `atlas_frames.spec.ts`, the fourteen frames (`bomb`, `zapper-cross`,
    `zapper-x`, `wool`, `caged-0` to `caged-7`, `cage-whole` and
    `cage-hit`, as the kinds come) in the list of what the atlas holds,
    and its title, and the kinds' entries in `WAITING_ART` dropped, which
    passes over them once `BRICK_ART` holds them; `art.spec.ts`'s cases of
    each kind's layers and shards may take them too. A cage shows
    `cage-hit` once it has fewer hits than whole.
  - The rules stream, numbering a wall's cages: the art reads a cage's
    `tint` as its friend's ink, and throws a `RangeError` for one past 7.
  - The scene stream, for the shell and moss, left to it as its own: the
    shell's `BOLT` is `boltMark()`'s bolt placed at 0.5 across and 0.4
    down, half 0.15 of the cell tall, as `make-art.mjs` draws both with
    one helper, so `bodyCommands` may draw it with
    `boltMark(pointAt(cell, 0.5, 0.4), 0.15 * cell.width, …)`; and since
    `KindArt` reads a `KindLook`, which has no kind, `shell.spec.ts`'s and
    `moss.spec.ts`'s looks need no `kind: "tough"`, nor the docs saying
    why.
- **The rebase,** onto `brick-fuzz-pop` at `53ffd3bd`, past the scene
  stream's shell and moss (`1a3b96d0`), met in five files, each keeping
  both: `symbols.ts` holds its `turned()` and this change's `pointAt()`,
  `EIGHTH` and `boltMark()`; `FRAME_NAMES` counts 69, the shell's body and
  the cages' insides both; `brick.ts` keeps its corner to itself, the
  specs reading it through the scene's `tileRadius()` rather than this
  change's `TILE_CORNER`; and `atlas_frames.spec.ts` keeps one way of
  holding the unwired art, the scene's `WAITING_ART` and `everyFrame()`,
  which reads better than this change's `UNWIRED` and `drawnFrames()`: a
  kind's art under the id it will take, passed over once `BRICK_ART`
  holds it, so wiring a kind doubles no frame. The five kinds join it, and
  the rounded-square check and the detail spec run over it, the shell's
  and the moss's frames passing both. The names check and the detail spec
  sit in `describe("atlasFrames")` again, as the scene had them, titled
  for the waiting art, which undoes the split the second review's fourth
  comment brought; what X1 changes there is still under For other
  streams.
- **The review,** of the change as first staged, with the art wired into
  `BRICK_ART` through a table of every kind's art that the atlas baked:
  no bug; four comments, each answered.
  1. That table's keys were held to the catalog's and the palette's ids
     by a spec alone, which a portal drawn before X2 would fail: the
     table is gone, as the art lands unwired.
  2. The frames held to the tile's rounded square were listed by hand,
     so a new one on the tile went unchecked, and the spec copied the
     tile's corner: every brick's frame but the zappers' is held now, and
     the spec takes the corner from `brick.ts`, as `tough.spec.ts` does
     too, through `tileRadius()` since the rebase.
  3. `reachPastRoundRect()`'s doc promised a bound a polyline's mitred
     corners break: it says so now, as `extentOf()`'s does.
  4. The small points, each taken but one: `EIGHTH` in `symbols.ts`,
     not in the bomb's and the zapper's files both; the zapper's middles
     by `pointAt()`; the stitches by `placed()`; `DOTS` and `NECK` typed
     read-only; the docs of `Shares` and `ZapperKind`. The cage's
     `onWholePixels()` stayed its own, until a second kind wanted it; the
     mirrored inside and bars (choice 4) have since replaced it.
- **The second review,** of the change unwired: no bug in the art; five
  comments, each answered.
  1. The specs held the new lines' widths only to the CSS pixel, which
     every width rounds to at the specs' scale, and the bomb's fuse and
     shine and the cross's rim by their being there, not their order: at
     128 device px a unit the fuse is held to 5 px, the shine to 4 and the
     yarn to 5, and at 110 the crack to 4; the bomb's marks after its dots
     are one list in order; and the cross's rim and core are the last it
     draws.
  2. Each edge of the cage rounded on its own, so a half pixel left it a
     pixel off center at some units: the right side mirrors the left
     (choice 4), and a spec at 50, 75, 100 and 128 device px holds both.
  3. The caged friend in the first friend's coral rather than the
     sheet's pink: answered by the integrator's ruling, each cage in its
     own ink (choice 1).
  4. The atlas spec's names would go stale as X1 wires the kinds: its
     block is split, the atlas's own list and the art's, and the log
     tells X1 what to change and delete.
  5. The small points, each taken: `BROKEN_ENDS`' doc, the wool's
     header, the bolt sized by the cell's width, the symbols' header, and
     "two bolts".
- **The third look,** at the cage as two layers: no bug; five comments,
  each taken.
  1. No spec saw the bars' ink, the specs' palette giving the cage's
     body, glyph and steel one color: the bars are drawn in the cage's own
     inks, and a mutant drawing them in its body's dies.
  2. "Half as large again as the art's fuzzball" was true of the sheet's
     fuzzball, not the game's: the friend's doc and spec say 1.5 of the
     design's 100 units to a unit of the fuzzball's grid, 0.6 of the
     fuzzball in play.
  3. The symmetry spec fell back to `NaN`, which `toEqual` takes as equal:
     it takes the inside as a slice and counts the five shapes.
  4. The log: choice 4 says the bottom mirrors the top, and the first
     review's answer that `onWholePixels()` was since replaced.
  5. The small points: `FRAME_NAMES` lists the `caged-<ink>` frames before
     the bars, as they stack; `CAGE_ART`'s doc opens with one sentence;
     and `DETAIL_CSS`'s doc names the bomb's dots. `TOUGH_ART`'s doc,
     A2's, has two sentences in its first paragraph too, and is left.
- **The fourth review,** of the rebase: no bug, and nothing of either side
  lost; four comments, each answered.
  1. The shell's bolt is a copy of `boltMark()`'s: the shell is the scene
     stream's, so its file is left as it is, and the point is under For
     other streams, with the log's line on `boltMark()` set right.
  2. `shell.spec.ts` and `moss.spec.ts` still give their looks a kind,
     which `KindLook` made needless: the scene stream's too, and under For
     other streams.
  3. The log: the tests are 81 more on this base, counted by running the
     touched specs at `53ffd3bd` and now; the `caged-<ink>` frames come
     before the bars, in `FRAME_NAMES` and in `frames.spec.ts`'s count;
     the rebase bullet says the atlas spec's split is undone, and that
     wiring a kind doubles no frame rather than breaks nothing; and the
     lines the rebase left uneven are wrapped again.
  4. `symbols.spec.ts` holds `boltMark()` after `turned()`, as the file
     defines them.

### X2's art: the bumper, the prism, the portal's two and the plated brick

**2026-11-11.** The art of Tricks' four kinds, drawn ahead of X2, which
catalogs them, unwired as X1's was: each kind's file and its specs, held
in `atlas_frames.spec.ts`'s `WAITING_ART` till `BRICK_ART` takes it in
with its kind. A plated brick is drawn as the integrator approved, a
contract change: two layers, the orange tile under one frame of its plates
and pips for its plating and hits left, `plated-<plating>-<hits>`, in
place of a frame for each face's plate.

- **Built.**
  - `src/view/art/kinds/bumper.ts`: `BUMPER_ART`, after `bumper()`: four
    ticks kicking out toward the cell's corners in its body's color, round
    at their ends, then its disc in its face's on a shadow 28% black, its
    ring cut out in its glyph's, the field's color, and a cap 52% white.
  - `src/view/art/kinds/prism.ts`: `PRISM_ART`, after `prism()`: its
    glass, the chunky tile's own shape in its face's color, outlined
    inside the tile's edge in its body's; three rays, each in the
    palette's ray of its place, round at their ends; and its triangle,
    filled in the field's text 30% over the field, outlined in its glyph's
    with round joins, and faceted by three lines that meet in a dot.
  - `src/view/art/kinds/portal.ts`: `PORTAL_ART`, after `portal()`: a
    frame for each pair, in that pair's inks, as its tint, the pair's
    place, picks: its dark middle, three arms spiralling out of it, each
    a line through 15 points round at its ends and bends, its ring, and a
    badge cut out of the ring toward the cell's top right corner, with a
    dot on the first pair's and a diamond on the second's.
  - `src/view/art/kinds/plated.ts`: `PLATED_ART`, after `plated()` and
    `plate()`: for each of the levels' three platings, toward the floor
    (`v`, `V`), toward the floor and both side walls (`U`) and toward the
    ceiling (`^`), at each of 1 to 3 hits left, its pips, moved clear of
    its plates as the art moves them, then each plate: a gap of the field
    over the tile from the plate's inner edge to the tile's, round its
    corners, a steel bar on whole pixels, six teeth pointing out and two
    rivets. A plate is drawn toward the floor and turned a quarter at a
    time for the others. The sides' plates come before the floorward one,
    whose gap cuts their ends, as the art's sheet draws `U`. Any other
    plating, or hits past 3, throws a `RangeError`.
  - `src/view/art/frames.ts` (contract, approved): `FRAMES.plate(face)`
    and `PlateFace` give way to `FRAMES.plated(plating, hits)`, `Plating`,
    `PlatedHits`, `PLATINGS` and `PLATED_HITS`; `FRAME_NAMES` lists the
    nine where the four plates were, 74 frames. `FrameName` reads a
    builder of any number of arguments.
  - `src/view/art/symbols.ts`: `diamond()`, a diamond's corners about a
    middle, which the zapper's cross took from a function of its own and
    the portal's second mark takes too.
  - `docs/brick-fuzz-pop/implementation-plan.md`: the frames table's row
    names `plated-<floorward|floorward-sides|ceilingward>-<1–3>`.
  - Specs: `bumper.spec.ts`, `prism.spec.ts`, `portal.spec.ts` and
    `plated.spec.ts`, each reading its kind's frames from its art and
    handing it looks typed as a `KindLook`; in `atlas_frames.spec.ts` the
    four kinds join `WAITING_ART`, the plated frames lose their rivets and
    half their teeth under 30 CSS px in the detail spec, the plates'
    steel joins the zappers as the only marks past the chunky tile's
    rounded square, and every polygon is held to three points or more at
    every unit from 1 to 16 device px, as a `Graphics` needs one to start
    from; 97 tests more.
  - The game's `AGENTS.md`: the art's entry names the four new files.
- **Choices the plan didn't make.**
  1. **A plated brick is two layers,** as approved: its pips move with
     its plating, so a frame for each face's plate would still want pips
     for each plating, and `U` would stack five layers where the wall's
     painter holds three. It shows no cracks, as the shell and moss show
     none and the art's `plated()` draws none.
  2. **A plate's gap stays on the tile,** as A2's rule asks, where the
     art's box runs to the cell's edges: the tile's rounded outline cut
     at the plate's inner edge, so the grid's dots and the flourishes
     show past it, and none where a cell of a few pixels leaves no room;
     its steel stands out of the tile, as the art's does. A side's plate
     in `U` reaches only to the floorward plate's gap, which is drawn
     over its end: its teeth are cut there, along their own sides, since
     their tips lie outside the tile, where no gap covers them; its
     rivet past it is left out, which the floorward plate covers anyway,
     as the art's box does; and its bar runs on under the gap by its
     corners' radius, so the gap cuts it square, as the art's does.
     Where the gap's edge meets the tile's round a corner, two
     antialiased edges leave a faint hairline of the tile, as the moss's
     cap does.
  3. **The prism's glass is the chunky tile's shape,** its outline inside
     the tile's edge, as the art's is at 100 units, so a line held to a
     CSS pixel at least never pushes it past the tile, which a gap of its
     own did at 24 CSS px and 2.625 to one.
  4. **Under 30 CSS px the plates' rivets drop and their teeth halve,**
     three across the same span: the rivets as steel's do, being smaller
     still (0.032 of a cell), and the teeth as the plan asks. A plated
     brick shows no pip at its last hit, as tough's doesn't.
  5. **A plate's parts keep their whole-pixel relations,** where rounding
     each alone broke them: its bar keeps a pixel of its gap over it,
     which at 24 device px a unit both round to one edge, and its teeth
     stand 0.01 of a cell inside the bar's foot, rounded with it, as the
     art overlaps them, where at 28 they fell 0.2 px past it.
  6. **The art's round lines are `stroke()`**, as X1's are: the bumper's
     ticks, the prism's rays and the portal's arms; the prism's outline is
     a line along each side and a dot at each corner, and its facets
     three lines and the dot where they meet, their corner ends under the
     outline's dots.
  7. **The bumper's shadow and cap and the prism's triangle are mixed in
     the art,** as the yarn is: the cap 1.42:1 to 2.95:1 against the
     disc, and the triangle 1.47:1 to 1.78:1 against the glass, each a
     shade, the triangle told by its outline in the field's text, which
     the palette's spec holds to 3:1 against the glass, and 5.23:1 to
     8.71:1 against the triangle's fill.
- **Checks.** The workspace's lint, typecheck and `test:coverage`, on
  `brick-fuzz-pop` at `a1cff1ba`: 5,138 tests in 112 files, and 150 in
  `sim`, the floors held; the root's lint.
- **The mutation pass:** 58 mutants, from each kind's numbers, inks,
  widths, order, turns and detail to its layers, the plated layers'
  lookup, `diamond()` and the atlas spec's exceptions. Four lived, and
  are answered: the prism's facets 0.02 of a cell wide and its glass's
  outline 0.04, which round alike at the specs' units, so the facets are
  held at 100 device px and the outline at 128; the plates' gap 0.25 of
  a cell deep, which rounds alike at 62, so the gaps are held at 50, 75,
  100 and 128; and the portals let past the tile's rounded square, which
  they never reach, so they are held to it. After the review, 36 more on
  the plates, their gap, cut, bars, teeth, rivets and the atlas spec's
  narrower exception; two lived and are answered: a cut tooth's crossing
  on its slanted side moved, now held by the sides' teeth lying on the
  floorward teeth's outlines turned, and the bar's top let under its
  foot, which only a cell of a few pixels reaches, now held by a spec
  keeping the bars in their cells at every unit from 1 to 16 device px.
  After the second review, 9 more on the gap's outline, its cut and the
  guards on thin polygons, all killed.
- **Numbers.** At 128 device px a unit the atlas's 43 frames, X1's
  fourteen and these thirteen pack into 1038 × 1172, and with the scene's
  frames and a picture of each of the 16 kinds 1214 × 1528, under
  2048 × 2048.
- **For other streams.**
  - X2, wiring the art with its catalog commit: `bumper: BUMPER_ART`,
    `prism: PRISM_ART`, `portal: PORTAL_ART` and `plated: PLATED_ART` in
    `BRICK_ART`, in the catalog's order; in `atlas_frames.spec.ts`, the
    thirteen frames (`bumper`, `prism`, `portal-1`, `portal-2`, and the
    nine `plated-<plating>-<hits>`) in the list of what the atlas holds,
    and the four entries in `WAITING_ART` dropped.
  - The art reads a portal's `tint` as its pair's place, 0 or 1, as
    `tintOf()` gives it, and a plated brick's `plates` as one of the
    legend's three platings.
- **The review:** two rounds, each by a fresh reviewer, the second on
  the plates the first reshaped.
  1. The plates' gap was a field-colored box past the tile, which A2's
     rule and its word to X2 rule out, and the log called it a choice the
     plan didn't make. Fixed: the gap is the tile's rounded square past
     the plate's inner edge, a side's plate in `U` is cut at the
     floorward gap, and the atlas spec lets only the plates' steel past
     the tile; choice 2 says how.
  2. The plates kept six teeth under 30 CSS px, where the plan asks for
     fewer, and the log didn't say why a plated brick shows no pip at its
     last hit. Fixed: three teeth across the same span, and choice 4
     says both.
  3. Rounding a plate's parts each alone left no gap over its bar at 24
     device px a unit and a seam between the bar and its teeth at 28, 29
     and 39. Fixed: the bar keeps a pixel of gap over it and the teeth
     stand in it, held at every unit from 24 CSS px to 128 device px at
     each pixel ratio.
  4. A spec passed with the rivets' turn taken out: the ceilingward
     spec left its rivets off and `U`'s only counted them. Fixed: the
     ceilingward frame is held to the floorward one turned a half turn,
     all of it, and each side's rivet where it lies.
  5. Second round: the gap's spec held where its points lay but not
     their order, so an arc reversed or stopped short passed. Fixed: the
     gap's area is held to the tile's past its edge, within a square
     pixel the corners' chords cut.
  6. At cells of 1, 3, 4, 5, 8 and 9 device px the gap's ends lay past
     the tile's corners, or its outline doubled back. Fixed: the gap is
     the tile's whole outline cut at the plate's edge, right at any
     depth and left out where nothing is left; a spec holds the gaps to
     the tile at every unit from 1 to 16 device px, and the atlas spec
     every polygon to three points or more there, since an empty one
     would throw in the bake.
  7. The log said a side's rivet was left out because no gap covers it
     outside the tile, but it lies on the tile, under the floorward
     plate. Fixed: choice 2 says so.
  8. The tiny bars' spec said a bar's top never fell under its foot
     while checking only its bounds, which `turnedAreaIn()` would turn
     right way up. Fixed: it holds the floorward bar's foot where it
     belongs. The nit, that it ran alike at each pixel ratio, is taken:
     it runs once, as nothing under 30 CSS px reads the ratio.

### The tidy after the catalogs: badges by the legend, one `looksOf()`

**2026-11-11.** With every kind cataloged, on `brick-fuzz-pop` at
`829f8003`, three things the integrator asked for: the portal's badges
drawn by the legend's names for them, one list of every look a kind
takes for the specs that need it, and the art's specs' roles held to
the stylesheet.

- **Built.**
  - `src/view/art/kinds/portal.ts`: each pair's badge is the one
    `PORTAL_BADGES` in `src/rules/levels/legend.ts` names, the words R
    reads a portal by ("portal with a dot"), drawn from `BADGE_MARKS`, a
    record over those names, so a badge the legend gains has no picture
    till one is drawn for it, and the typecheck says so.
  - `src/testing/art_frames.ts`: `looksOf(kind)`, every look a brick of
    a kind takes, which `art.spec.ts` and `wall_scene.spec.ts` each
    worked out alike before; and its roles exported as `ART_ROLES`.
  - Specs: `portal.spec.ts` ties each tint's badge to `PORTAL_BADGES`
    through the frame its layers name, in place of the spec that named
    the dot and the diamond itself, and its frames to the legend's count
    of badges; `art_frames.spec.ts` holds `looksOf()`, and holds
    `ART_ROLES` to Classic felt's roles as `PALETTES.rolesIn()` reads
    them from the stylesheet, as `brick_colors.spec.ts` reads them, but
    the page, and each to a color of its own; 8 tests more.
- **Choices the integrator's ask left open.**
  1. **The roles stay written out, held to the stylesheet.**
     `rolesIn("classic")` gives the page as the field's white, so a spec
     could no longer tell a portal's middle, which is the page's, from
     the field, and reading the stylesheet as `art_frames.ts` loads
     compiles it, 0.15 s as measured, in each of the 21 spec files that
     import it, 19 of which compiled none before. So the roles are
     written out, Classic felt's with Soft pastel's page, and one spec
     reads the stylesheet and holds them to it.
  2. **`looksOf()` is the two made one.** It gives a kind that never
     breaks each plating the legend gives it, as the scene's did; for
     every kind cataloged the two gave the same looks, the scene's hits
     counting down where the art's count up.
     `art.spec.ts`'s whole brick is the first whole one of its looks.
- **Checks.** The workspace's lint, typecheck and `test:coverage`: 5,651
  tests in 116 files, and 420 in `sim`, the floors held; the root's
  lint.
- **The mutation pass:** 11 mutants, the badges' marks swapped or one
  pair's for both, `looksOf()`'s tints, platings, fulls and hits, and
  the roles drifted from the stylesheet or their page the field's. One
  lived: `art.spec.ts`'s whole brick taken as any
  look, which leaves its claim, that no two kinds look alike, still
  true of a brick hit once, so there is nothing more to hold.
- **The review:** one round, by a fresh reviewer.
  1. Reading the roles from the stylesheet at load compiled it in every
     spec file that imports `art_frames.ts`, most of which read no
     palette. Fixed: choice 1.
  2. The badge spec claimed R in its title but only checks the art's
     half, and R maps a tint to its badge by its own expression, which
     `describe.spec.ts` pins to the words themselves. The art's spec now
     claims only the art, and takes in the one that named the dot and
     the diamond itself. Left: R's half, a spec in `describe.spec.ts`
     reading each `PORTAL_BADGES` name by its tint, is the proof
     stream's file, outside the art's, and goes to the integrator.
  3. `Math.max(mostHits, fewest)` could change nothing, as the catalog's
     spec holds `mostHits` to `hits` at least. Fixed: taken out, and
     choice 2 no longer claims it.
  4. The distinct-roles spec compared the roles' words, where `#fff`
     and `#ffffff` are one color. Fixed: it compares their numbers.
  5. The game's `AGENTS.md` and its testing skill describe
     `art_frames.ts` without `looksOf()` or `ART_ROLES`. Left: the
     view stream is changing `AGENTS.md`, so the lines go to the
     integrator; the log's count of importers is fixed in choice 1.
