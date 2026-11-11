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
