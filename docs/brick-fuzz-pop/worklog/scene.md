# Work log: Brick Fuzz Pop, scene stream

The scene stream's log of [`implementation-plan.md`](../implementation-plan.md)'s
S1 and S2, the scene that draws the field on Phaser, taken from the
integrator's wave 3: what each package built, where it went other than
planned and why, what the checks reported, each review comment and what
became of it, and the numbers worth keeping.

## Part 2

### S1: the scene, the atlas, the field and the wall

**2026-11-10.**

**What was built.** The scene, in `src/scene/`, after Brick Breaker's
`bricks_scene.ts`:

- `wall_scene.ts`: `WallScene`, `WallSceneOptions` and `makeWallScene()`.
  The options are §5.4's ten plain functions: `tick`, `view` (K2's
  `RoundView`), `guide`, `palette`, `shape`, `motion`, `sound`, `onLayout`
  (the whole `FieldMetrics`, so the board places the panels from
  `metrics.panels`), `command` and `onPictures`. `create()` measures the
  field, bakes the atlas, makes its layers and painters once, makes the
  sound player, tells the shell the layout, starts listening and says it is
  ready once its first frame is drawn (`onFirstFrame`). `update()` keeps
  Brick Breaker's order: lay out again if the canvas, the chrome or the
  shape moved (`viewportOf`, `canvasChanged`); hand the shell the frame's
  time; follow the player's sound; lay out again if the tick reshaped the
  field; bake again at a new scale or palette (`retakeFrames`, then
  `picturesWhenAsked` handed over anew); draw. Keys come through
  `onKeyDown`, a shortcut or a held key's repeat left alone, and become
  V2's commands (`commandOfKey()`). `tick` takes V2's `Steer`, the scene
  handing it the same one each frame (`UNSTEERED`: the aim straight up, no
  charge, nothing let fly) until S2 reads the player's hands.
- `atlas.ts`: `ATLAS`, `MOST_BAKED_UNIT` (128), `bakedScaleOf()` and
  `bakeWallAtlas()`, which bakes A2's `atlasFrames(palette, scale)`, the
  scene's own two dots and a picture of each kind into one atlas at whole
  device pixels.
- `field_art.ts`: `FIELD_FRAMES` and `fieldFrames()`, the scene's own
  frames: a dot of the grid in the field's line and a dot of the jump
  line's count in its color, each a CSS pixel wide at least.
- `layers.ts`: `LAYERS`, the field, the wall and the lines, back to front.
- `pictures.ts`: `PICTURE_LAYERS`, the frames a whole brick of each kind
  shows; `PICTURE_FRAMES`, a frame of its own for each kind's picture, in
  the `{ bricks }` U5's `HelpPictures` takes; `pictureFrames()`, which draws
  each from the art's frames, a whole brick's layers in one cell; and
  `Pictures`, for How to play and the panels.
- `stand_ins.ts`: `Guide`, the narrowest type the scene's `guide` option
  needs until S2 (below).
- `painters/painter.ts`: `PaintContext`, one record the scene writes over
  each frame, and `Painter`.
- `painters/field_painter.ts`: `FieldPainter`. Under the wall, one
  `Graphics` fills the cells in the field's color, the floor's band and the
  lintel at V1's `bandPixels()` and `lintelPixels()` in the band's wash,
  the ceiling along the lintel's foot, and the frame,
  `framePixels(FRAME_CSS_PX)` thick, outside them all, in the canvas's
  margin, as V1's second choice has it; and an image of the grid's dot
  stands at each corner the cells share (8 × 21, made once). Over the wall,
  a second `Graphics` draws the jump line under the top third and the
  danger line along the top of the floor's row, each `dashes()`' pairs
  filled as whole-pixel rectangles, the art's dash, gap and width in
  units; once nine or fewer bricks the level needs stand under the jump
  line, that many dots (9, made once) count them in from its end, in
  threes, and the line leaves off the dashes they would cover. Each line's
  dashes are worked out across the whole field once a layout. Every dot is
  a whole number of pixels wide, its edges on whole pixels. Both are drawn
  again only when the layout, the palette or the count changes.
- `painters/wall_painter.ts`: `WallPainter`, a pool of images, `MOST_DEPTH`
  × 9 cells × `MOST_LAYERS` (3) stacked frames, 594, made once, each cell's
  stack showing `brickLayers(brick)` from the bottom up at the cell's
  middle; the wall eases down by `RoundView.wallDrop`, the rows coming in
  over the ceiling cut off along it (`cutOver()`, `setCrop()`). It draws
  again only when the wall, how far it is eased, the layout or the depth
  changes.
- `wall_scene.spec.ts`: the scene through `runKeyedScene()` and a
  `FakeShell`, after Brick Breaker's scene spec, the `RoundView`s built
  from `src/testing/flight_fixtures.ts`' plain shot and zap.

**Choices the plan didn't make.**

1. **`wallDrop`'s meaning, as the scene reads it.** K2's `RoundView` gives
   the wall "as it looks at this moment" and `wallDrop` "0 to 1 through its
   ease", but not how far it comes down. So the scene keeps the row the
   wall's lowest row last stood still in, and draws it `(still −
lowestRow) × (1 − wallDrop)` rows over its place. That asks V3 for one
   rule, written on the `view` option: `wallDrop` is 1 while the wall
   stands still, and the wall that comes down is handed over at once, with
   `wallDrop` 0, easing to 1. A wall that rises, as a new level's may,
   stands where it is at once; one the scene starts on stands where it is,
   whatever `wallDrop` says; a `wallDrop` past 1 is taken as 1. Without
   motion the wall comes down at once, so the view needn't know the
   player's choice. A field `RoundView` could carry instead, the row it
   eases from, would be a contract change, the integrator's.
2. **The rows coming in from over the ceiling are cut off along it,** each
   image cropped (`setCrop()`, in its frame's own pixels, so at the scale it
   is shown at), rather than drawn over the lintel, the frame and the page
   or popping in once whole. A jump brings up to seven rows down through
   the ceiling.
3. **The atlas is baked at 128 device px a unit at most,** as `plan.md`'s
   "The field" says, and a larger unit shows its frames scaled up; so a
   unit past 128 that changes bakes nothing again. The detail rule is
   unchanged by it: 128 device px is 42.7 CSS px at the largest ratio, 3.
4. **The grid's dots are drawn.** `art/field.svg` draws a dot at each
   corner the cells share, and `WallPalette.line` names them, though §6
   doesn't list them. 168 circles in a live `Graphics` would be filled
   anew, unsmoothed, every frame, so each dot is an image of a frame the
   scene adds to the atlas, shown a whole number of pixels wide with its
   edges on whole pixels, since the board's game doesn't round its images'
   places.
5. **The jump line's count is a row of dots, one a brick, in from its
   end, in threes.** §6 gives the count to `FieldPainter`, at the line's
   end, but §8 allows no `Text`, and the art draws no numeral. Dots read
   as part of the line, count down as bricks break, and cover no brick,
   where a badge at the line's end would sit over the corners of the
   bricks either side; grouped in threes, a wider gap between groups, nine
   read at a glance as three threes. A numeral would need digit frames
   (K2's `FRAMES` and A2's art) or the board's DOM, placed from the layout
   `onLayout` hands over, as the lintel's "N rows waiting" will be; that is
   the integrator's to choose instead. Nothing is counted at none left, as
   the jump comes then. The dots are a frame of the scene's own too.
6. **The ceiling is a line along the lintel's foot,** `FRAME_CSS_PX` thick,
   in the field's line, as the art draws one, kept in the lintel so it
   never covers the top row's bricks.
7. **No `onContextRestored()` listener of the scene's own.** `bakeAtlas()`
   bakes through `bakeTexture()`, which draws the atlas again after a lost
   context by itself, and nothing else the scene draws is a texture of its
   own; a spec holds the atlas uploaded again once the context is restored.
8. **One stand-in, in `src/scene/stand_ins.ts`:** `Guide`, for R6's guide,
   `never`, so `guide()` returns null until S2's `GuidePainter`; the scene
   doesn't call it yet. V2's `Steer` and `FieldCommand` had landed by the
   commit, so the scene takes both: its keys become commands through
   `commandOfKey()`, and as S1 reads no input into steering, `tick` is
   handed `UNSTEERED` each frame, the aim straight up, no charge, nothing
   let fly, until S2 reads V2's `Steering` (with a `waitingX()` option, the
   integrator says).
9. **How to play's pictures are a frame of their own, one a kind,** a
   whole brick of it in the first tint, its layers drawn into one cell
   (`pictureFrames()`) and baked with the atlas, so `Pictures` is
   `{ bricks }` by kind, a `data:` URL each, as U5's `HelpPictures` takes
   it: the board hands it over whole.
10. **`MOST_LAYERS` is 3,** a tough brick's tile, pips and cracks, the most
    any look of the five kinds stacks; a spec holds it to every look the
    catalog allows (each tint, each count of hits whole and left), so a
    kind that stacks more, as X2's plates will, fails it until it is
    raised.
11. **The sound player is made in S1** and follows `sound()`, muting the
    game; it plays nothing until S2. The scene's spec holds `SOUNDS` to the
    sprite's map, as N1 asked.
12. **A canvas with no room keeps its layout,** as V1's ninth choice asks
    (`hasRoom()`), but the first: the scene lays out what it starts on,
    even at a pixel a unit, so it has something to draw.
13. **A new shape is a new value,** as Brick Breaker's palette is: the
    scene lays the field out again when `shape()` hands over another
    object, and the shell keeps the one it has between changes.
14. **The lines' dashes are filled rectangles, not lines.** §6 says
    `dashes()`' pairs are drawn as lines; a line of the art's width (2.4 of
    a cell of 40) is a pixel or two at a fractional place, which WebGL
    blurs across three, so each dash is filled at whole pixels, its
    thickness a CSS pixel at least. The dashes are laid across the whole
    field once a layout, and a count leaves off those it would cover,
    rather than `dashes()` fitting the line anew between its wall and the
    count, which would move every dash each time a brick breaks under it.
15. **No `outlineRoundRect()` reaches the screen in S1.** The field's frame
    is square, as the art's is, so it is four bars; the rounded outlines
    are A2's bricks', which the atlas bakes.
16. **`onPlayerAway()` and `onKeyUp()` wait for S2,** which drops a charge
    on the first and steers by both; S1's keys are only V2's commands,
    which act on a key's press.

**Not drawn yet, and whose:**

- the lintel's "N rows waiting" and its chevrons: text, the board's DOM
  (U1);
- the danger line brightening and the warning frame for a brick in the row
  over it ("The wall"): no frame in `FRAMES` names one, and the brightening
  is S2's or U1's to settle with the announcer's words;
- the fuzzball, the guide, the effects and the meter (S2).

**Checks.** The workspace's `lint` and `typecheck` are clean.
`test:coverage`: 3328 tests in 49 files, `wall_scene.spec.ts` 103 of them;
the scene's files at 100% of their statements (239), branches (80),
functions (52) and lines (221), over its floor of 98, 92, 100 and 99. The
root's `yarn lint` passes. Nothing mounts the scene yet (U1's board does),
so it hasn't been looked at in a browser.

**The mutation pass.** 94 mutants, one at a time, each run against the
scene's spec: in the scene, each check of `update()`'s and the layout's
(the canvas, the chrome, the shape, the room, the first layout, the
palette, the scale's unit and ratio), each call to the shell, the keys'
shortcut and repeat, the bake, the pictures, the retaken frames and the
sound; in the atlas, the largest unit, its `min()` and the ratio, and the
scene's frames left out; the dots' widths, colors and middles; in
`FieldPainter`, each condition it draws again on, the band, the lintel, the
ceiling and each bar of the frame, the grid's dots' rows, columns, depth and
scale, the jump line's height, gap, dash, width and end, the count's place,
pitch, scale, most and least, the bricks it counts and the rows it counts
in, and the danger line's height, dash and width; in `WallPainter`, the
motion, both clamps of `wallDrop`, the row it last stood still in, the
rising wall, the rounding and the way of the ease, each condition it draws
again on, the cell's top and middle, the scale, the crop's size and its
clearing, the frame set, the stack's depth and `cutOver()`'s bounds; and
the pictures' tint and hits.

- **Killed at once:** 76.
- **Survived, and specced:** ten. The time handed to `tick` (every frame
  was 16 ms), the pixel ratio a bake follows (a ratio changed at the same
  unit, through the scale's `displayScale`), the chrome (a spec's own
  `insets()`, which the harness fixes), the canvas alone and the field
  painted where it goes (a canvas resized mid-flight in the shape it has,
  every resize having brought a new shape), `motion()` read once (the
  player turning motion off), the ratio `bakedScaleOf()` keeps, the jump
  line's width, its count's pitch (both specs read the constants they
  held, and now hold numbers), and `wallDrop` under 0.
- **Equivalent:** six. The first of `update()`'s two layouts, since the
  second, after the tick, lays out what the first would have; S2 needs it,
  as its steering reads the layout before the tick. `FieldPainter`'s check
  of the shape and `WallPainter`'s of the depth, as the scene's every new
  shape makes new metrics, which each already checks. `FieldPainter`'s
  check of the wall before it counts, which saves the count only.
  `WallPainter`'s rising wall at `>=`, which sets the row it already has.
  A hidden image cut as it would be shown, which is cut again before it
  shows.
- **The bounds of a cell's wall row,** which survived, were equivalent
  too, as a row under the wall or over it lies past either end of its
  bricks: the check went, and the doc comment says why there is none.
- **After the review,** 25 more over what it changed: the pictures' layers,
  order, size, tint, names and bake; `UNSTEERED`'s aim and release; each
  dot's place on whole pixels, across and down, its scale, and the
  snapping itself; the count's groups, their size, their gap and where
  each starts; where the dashes stop; the bricks counted and the rows
  counted in; and the thirds worked out at each layout. 22 were killed,
  the pictures left out of the bake on a second try, as the first matched
  nothing once Prettier had moved the line. Two survived and were specced:
  a dot scaled up stood by its baked size (the scaled-up dots now hold
  their edges to whole pixels), and the thirds worked out only at the
  first layout (a field reshaped deeper draws its jump line lower). One
  was equivalent: the dashes stopping at the last dot's middle, as
  `dashes()` then fitted whole dashes a gap short of the end it was given,
  and a gap is more than half a dot (the second review's fix replaced that
  code).
- **After the second review,** 16 more over what it changed: where a count
  stops the dashes (ignored, at `<`, a whole pitch short, at the last dot's
  middle), the dashes laid out at each layout, each line's own, across the
  whole field and rounded; a dot's side rounded and set; the rows and the
  gaps the count skips; and `cellAt()`'s arguments. Eight were killed at
  once. Five survived and were specced: each line's dashes worked out only
  at the first layout, the jump's or the danger's (a field laid out anew
  draws its lines as one started there does), a dash's ends floored rather
  than rounded and the jump line as thick as the danger line (at 43 px a
  unit, where both differ), and the dashes stopping a whole pitch short
  (each count's spec now holds how many dashes it keeps). Three were
  equivalent: a dash kept only short of the reach rather than at it, its
  end a whole pixel and the reach a fraction; the count's skipping a gap
  without its own check, as `isNeeded()` takes a gap itself and the check
  is there for the type; and the dashes stopping at the last dot's middle,
  as no dash's end falls within half a pitch of a dot's: the dashes end
  0.55 of a unit apart from the left wall, and no dot's middle lies within
  0.12 of a unit after one.

**Numbers worth keeping.** At the specs' 400 × 400 canvas with a 12 px
margin, a unit is 31 device px, the field 11 deep; at 600 × 600, 47, where
a grid dot is 3 px and a count's dot 7. The scene makes 594 images for the
wall, 168 for the grid's dots and 9 for the count, once; the atlas holds
the art's frames, the two dots and five pictures, baked at 128 device px a
unit at most.

**The review:**

1. **The pictures didn't fit How to play.** U5's `HelpPictures` takes
   `{ bricks }`, a URL a kind, and the scene handed a list of layers a
   kind, so the board couldn't hand them over whole; choice 9 said nothing
   named the shape, which U5 had by then. Fixed: each kind's picture is a
   frame of the scene's own, its whole brick's layers drawn into one cell
   (`pictureFrames()`), baked with the atlas, and `PICTURE_FRAMES` is
   `{ bricks }`; specs hold the picture to its layers' drawing, the atlas
   to holding one a kind, and the pictures handed over to the atlas's.
2. **`Steer` was stood in for a type that exists.** V2's had landed, and
   the stand-in, an empty record, would have kept a board whose `tick`
   takes V2's from compiling against the options. Fixed: `tick` takes
   V2's `Steer`, and the scene hands it `UNSTEERED` until S2; a spec holds
   what it hands. `stand_ins.ts` keeps `Guide` alone, and choice 8 says so.
3. **The baked dots stood off whole pixels.** The board's game doesn't
   round its images' places, so an odd dot about a corner, or a count's
   dot at a fraction of a pitch, was smeared across a pixel more. Fixed:
   each dot is stood so its edges fall on whole pixels; a spec at 47 px a
   unit, where both dots are odd, holds every edge to a whole pixel; the
   dots scaled up came with the second review (9, below).
4. **The bricks under the jump line were counted by a third copy of
   `isNeeded()`,** beside `describe.ts`'s private `neededBelow()`, which
   gives the announcer's "N bricks to a jump"; and `thirdsOf()` made a
   record at each new wall. Fixed in part: the count takes the rules'
   `isNeeded()`, and the thirds are worked out once a layout. One
   `neededBelow()` for both would be the rules' to export, beside
   `isNeeded()`; the report asks. Both count the same bricks: those the
   level needs in the field's rows under the jump line.
5. **Two specs weighed little.** The end's spec counted the listeners of
   the game's blur and hidden events, which S1 doesn't take: dropped, until
   S2's `onPlayerAway()`, and the spec holds the keys to no command after
   the end. The cracks' spec didn't show the frame empty: it now holds the
   art's frame to no drawing at that unit. The sprite map's case stays in
   the scene's spec, as `tools/build-sounds.spec.ts`'s comment hands it
   over to the scene's ("once there is a scene"); that file is the shell
   stream's, so the report says its case can go.
6. **Choice 5's reason was weak:** the DOM could show the count, and nine
   dots can't be read at a glance. The dots stay, as §6 gives the count to
   `FieldPainter`, but in threes, a wider gap between groups, so nine read
   as three threes (a spec holds the gaps); choice 5 now says the DOM is
   the alternative, the integrator's to choose.

The fixes reshaped the pictures and added the count's groups, so the
change had a second review, which found the first's fixes right and:

7. **The jump line's dashes moved each time the count changed.** The line
   ended short of the count, and `dashes()` centres as many whole dashes
   as fit between its ends, so each brick broken under it moved every
   dash, about 5 px. Fixed: each line's dashes are worked out across the
   whole field once a layout, and the count leaves off those that would
   reach it; a spec holds the dashes drawn with a count of 1, 4 and 9 to
   the first 15, 14 and 11 of those drawn with none, and choice 14 says
   why.
8. **The scene did the rules' grid arithmetic again.** Fixed: a cell's
   brick is found by `cellAt()`, and the bricks under the jump line are
   counted by `fieldRowOf()`, as `describe.ts` counts them, in a plain
   loop, so a new wall makes nothing.
9. **A dot scaled up past 128 px a unit kept only its left and top edges
   on whole pixels,** its side scaled to a fraction. Fixed: each dot is
   shown a whole number of pixels wide and high; the scaled-up spec holds
   all four edges of the first dots to whole pixels and their sides to the
   baked sides scaled and rounded.
10. **Two specs weighed less than they read.** The groups' spec held a
    count of gaps that nine dots always have: it now holds the gaps
    themselves at 31 px a unit (7 or 8 in a group, 11 between). The
    pictures' spec held only the tough brick's look: it now holds each
    kind's, steel's at no hits among them.
