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

### S1b: the danger shown, the run's keys specced, and the sprite's map handed over

**2026-11-10.**

S1's open items, as the integrator asked once S1 was merged.

**What was built.**

- The danger, as `plan.md`'s "The wall" asks: a brick the level needs in
  the row over the floor's takes a warning frame, and the danger line
  brightens. `danger.ts` says when: `DANGER_ROW` (1), along whose foot the
  line runs, `endangers()`, for a cell, and `inDanger()`, for the wall,
  each counting the floor's row too, which a needed brick reaches only on
  the step that loses the level.
  - `field_art.ts`: `FIELD_FRAMES.warning`, a frame of the scene's own
    baked into the atlas with the dots: a cell, a band of the danger line's
    color in along its edge and a seam of the field's color inside it,
    each an `outlineRoundRect()`.
  - `WallPainter.warnings`: 18 images, made once, a cell each of the
    floor's row and the row over it, after every brick's stack in the
    wall's layer, so over it, each shown over a brick the level needs
    there, coming down with the wall as it eases.
  - `FieldPainter`: while one stands there, the danger line is solid across
    the field and twice as thick as its dashes, drawn again as the danger
    comes and goes, though the count stays.
- The scene's spec holds the run's other keys, P, X, R and the keypad's
  Enter, to V2's commands.
- `tools/build-sounds.spec.ts` drops its case of the sprite's map, which
  its comment handed to the scene's spec, which holds it.

**Choices the plan didn't make.**

1. **The warning frame is the scene's own, baked.** `FRAMES` names none,
   and no tint recolors A2's `guide-punch` outline, drawn in the field's
   text, near black in the light palettes; so the scene bakes one with
   `outlineRoundRect()` into the atlas, as it does its dots, and A2 needs
   no new frame.
2. **It is in the danger color, not the warning color,** with a seam of
   the field's inside it. The zappers are drawn in the warning color, so a
   frame of it would run into their bodies; the danger color is near the
   red tile's, so the seam keeps the band apart from any tile; and the
   frame is told by its shape too, as "Accessibility" asks ("the danger by
   a line, a frame and words"). W11's bomb, a tile in the danger color,
   will have only the seam, a CSS pixel, between band and tile: its
   package should look at the frame over it.
3. **"Brightens" is met by the line's weight,** solid and twice as thick,
   in the same color, for the integrator to accept. A brighter red would
   lower its contrast on the light fields, where the danger is dark; and a
   role for it would be new to `WallPalette`, V1's contract, and to
   `contrast.spec.ts`.
4. **Danger is a brick the level needs in field row 1,** as R7's words have
   it ("the next step down loses the level" once the lowest such brick
   stands there), or in the floor's row, where only the step that loses
   the level brings one, so the frames stay on the bricks and the line
   stays lit through it. Steel, which the level doesn't need, sinks at the
   floor, so it takes no frame. R7's `describe.ts` holds the same rule as
   `lowest === 1`, and the view's `"danger"` beat will need it too, which
   the view can't take from the scene: one rule beside `isNeeded()` in
   `src/rules/wall/`, the proof stream's, would serve all three; the
   report asks.
5. **The line lights at the start of the step that brings a brick into the
   row over the floor's,** as the wall is handed over, a step's ease
   before the brick gets there, while the frames come down with the
   bricks: `FieldPainter` doesn't follow the ease.
6. **No commit to `@fz/phaser/testing`.** `browserKey()` gives a letter's
   or a digit's `keyCode` from its code (`Key[A-Z]`, `Digit\d`), so `KeyP`,
   `KeyX` and `KeyR` were never missing: S1's report was wrong, having
   read the table and not the function. The scene's spec only gains the
   cases. `frontend/lib/phaser/AGENTS.md` and `phaser-core` list no keys,
   so they are unchanged, but their words, that `browserKey()` throws "for
   a code its table lacks", are what misled S1: the report suggests they
   say letters and digits come by their code.

**Checks.** The workspace's `lint` and `typecheck` are clean.
`test:coverage`: 3499 tests in 55 files, `wall_scene.spec.ts` 121 of them
(18 new) and `tools/build-sounds.spec.ts` one fewer; the scene's files at
100% of their statements, branches, functions and lines. The root's
`yarn lint` passes.

**The mutation pass.** 18 mutants over the first draft: the danger's row,
the bricks it counts and the columns it looks in; the line's early return
on the danger, its width, length and place lit, and the danger kept; the
frames' scale, ease, place, row and order in the layer; and the warning
frame's band color, corners, seam and width. 16 were killed at once. Two
survived and were specced: the last column left out of the danger (a brick
there alone brightens the line), and the frames left at their baked size
(past 128 px a unit they scale with the wall's). After the review, 11 more
over what it changed (the rows the danger counts, the frames' second row,
their place, ease, scale and order, and the lit line's width and place),
all killed at once.

**The review:**

1. **The danger rule is a second copy, and `danger.ts` is no painter.** It
   moved to `src/scene/danger.ts`; the rule belongs beside `isNeeded()` in
   the rules, which aren't the scene's to change, so choice 4 and the
   report ask for it there.
2. **The cue went out on the step that loses the level,** whose wall
   already has the brick in the floor's row: the frame left the brick
   sliding over the line, and the line went back to dashes. Fixed: the
   danger counts the floor's row too, the frames stand in both rows, and a
   spec holds frames and line through a losing step's ease; choice 5's
   words say when the line lights.
3. **A closure was made on every eased frame,** by the frames' `forEach()`.
   Fixed: a plain loop, as the stacks' is.
4. **No spec hid a frame again.** Added: a brick broken in the row over the
   floor's loses its frame.
5. **"Twice as thick" wasn't twice:** the lit line's width and the dashes'
   were rounded apart, 3 px against 2 at 31 px a unit. Fixed: the lit line
   is twice the dashes' width, and its constant went.
6. **The log's reasons.** Choice 3 now gives the contrast and the contract
   as its reason and asks the integrator to accept weight for brightness;
   choice 6 says what in the library's words misled S1; choice 2 notes the
   bomb for W11.
7. **Nits.** `atlas.ts`' doc names the warning frame; the radii lost their
   `Math.max(0, …)`, as `roundRect()` clamps them; `WARNING_FRAME` is no
   longer exported, and `LIT_DANGER_WIDTH` went; the layer order's spec
   compares places with no conditional; and `endangers()` is one line on
   `isNeeded()`.

### S2: the fuzzball, the guide, the flourishes and the meter

**2026-11-10.**

§6's S2, against V2's `Steering`, V3's `RoundPlay`, V4's effects, A3's
fuzzballs, N1's sprite and L8's drivers, as the integrator asked once S1b
was merged, then rebased onto the fix to V3's view, which hands the wall
over as S1's painters read it, and onto R6, whose `Guide` the scene now
takes from `src/rules/flight/guide.ts`.

**What was built.**

- **The steering.** `WallScene` owns a `Steering`, made with the field's
  metrics and the canvas and measured again at each layout, and reads it
  every frame, from where the fuzzball waits, before handing the shell the
  tick: the keys (the arrows and Space captured from the page), the mouse,
  its wheel and two fingers (`addPointer()` up to `MOST_FINGERS`), a
  pointer let go past the canvas (`POINTER_UP_OUTSIDE`), and `letGo()` as
  the player looks away. A key the steering doesn't take is a command, as
  before. The `UNSTEERED` stand-in went.
- **Four scene options, as additions:** `waitingX()` (`RoundPlay`'s), which
  the steering aims a pointer from, kept while the fuzzball flies; `boon()`,
  the boon the waiting fuzzball wears; `crew()`, whose friends' inks the
  friends fly in; and `aimings()`, the settings' `PointerAimings`, handed to
  `aimWith()` as they change. The `view` option's doc says how the view
  hands the wall over: `wallDrop` 1 while it stands still, the wall that
  comes down at once, and another wall each frame a brick changes.
- **The round's events and beats,** each played once, from the view's two
  logs: each event's sound, risen by `detuneOf()`, and each beat's
  (`beatEffectsOf()`), gathered by `createFrameSounds()` and played through
  the `SpritePlayer` once a frame; the notch as the charge rises or falls,
  but to none, while a plain fuzzball waits; and each flourish
  `flourishesOf()` gives where motion is welcome. A log the scene meets is
  taken up at its latest, so what the view reached before the scene began
  goes unplayed; one `RoundPlay` hands the same two logs on through the
  game.
- **`BallPainter`:** a pool of 16 bodies, each with its eyes over it. Each
  fuzzball in the air at its middle, in `fuzzball-<charge>`, `hot-shot` or
  `friend-<ink>`, its eyes moved by `FUZZBALL_LOOK` along its heading (its
  launch's, its turns', down as it yawns); and the player's waiting on the
  floor at `waitingX()`, its fur combed by the charge, looking along the
  aim, as the hot shot or with a triple shot's two mates beside it, the
  boon's look flaring in (`flareScale()`) at the jump.
- **`MeterPainter`:** five pips in an arc under the waiting fuzzball, lit
  from the left as far as the charge, all five for a hot shot, hidden while
  it flies.
- **`GuidePainter`:** 128 dots and 31 outlines, made once, drawn again only
  as the guide, the wall or the layout changes: a dot at each of the
  guide's places, on whole pixels, and `guide-punch` over each brick the
  shot would punch through, but over the ceiling. A spec draws the guide
  `guideOf()` casts for the shot steered.
- **`EffectsPainter`:** a broken brick's shards, tinted as it was drawn, in
  a particle emitter of 216, made once, scaled as the atlas's frames are; a punch's streak, a zap's bolt and a blast's ring,
  each through `@fz/core/turns`; a freed friend's hop to the floor
  (`hopHeight()`); the jump line's flash; and the shake, the camera moved
  by `shakeOf()` and back.
- **`WallPainter`:** a struck brick's swell (`swellScale()`), and the wall
  drawn the frame before (`drawnWall()`), which the flourishes are placed
  on. It eases the wall as S1 did, which the fix to V3's view now hands
  over that way.
- **The scene's frames,** baked with its dots (`flightFrames()` in
  `field_art.ts`): `meter-on`, `meter-off`, `guide-dot` and `guide-punch`,
  which `FRAMES` names but no art draws, after the art's sheet; and
  `FLIGHT_FRAMES`' shard, streak, bolt and ring.
- `LAYERS` gains `guide`, `bursts` and `balls`; `src/scene/stand_ins.ts`
  only names R6's `Guide` again, for `GameService`'s import, until the
  shell takes it from the rules and the file goes;
  `placeDot()` moved to `painters/dots.ts`.

**Choices the plan didn't make.**

1. **A pointer lost is the player looking away.** Phaser names no lost
   pointer: a mouse let go past the canvas is `POINTER_UP_OUTSIDE`, which
   lets the shot fly, as V2's sixth choice says; a touch the browser takes
   away is a `POINTER_UP` with `wasCanceled`, which `pointerUp()` calls
   off; and the window's blur, the page hidden and the board's focus lost
   are `onPlayerAway()`, whose `letGo()` calls the shot off.
2. **`boon()` and `crew()` are options,** as neither `RoundView` nor
   `waitingX()` says them. The boon is the aimed round's while it aims,
   the next round's once the flight lands, which is when the jump that
   earns it is heard, and none in flight, so the boon's look flares in with
   the jump and not before. The friends' inks are the crew's in the order
   they were freed, and a friend is the next of them as it launches, since
   neither the launch nor `BallView` names a friend's ink.
3. **The eyes follow the events,** each fuzzball's heading set at its
   launch and its turns, and straight down at its yawn, rather than worked
   out from where it moved between frames, which a pause or a slow frame
   leaves at nothing.
4. **A split is drawn as the player's fuzzball at its charge, 0,** as A3's
   eighth choice left to S2, whatever fuzzball it split from.
5. **The triple shot's mates wait beside the fuzzball, toward the floor's
   middle,** `LAUNCH_GAP` and twice that from it, so both fit by either
   side wall; the boon look flares in on them.
6. **The fuzzball waits where `waitingX()` says, at once:** a fuzzball that
   lands against a side wall moves up to a radius as it lands (V3's
   eighth choice), uneased.
7. **The notch ticks as the charge rises or falls, but to none,** while a
   plain fuzzball waits: a hot shot's charge is always full, and a charge
   keyed in flight shows on no meter.
8. **The bolt runs from the zapper's middle to the furthest cell it reaches
   each way, a piece a cell,** through cells it passes over without hitting
   (steel, a gap), so it is one line; a piece whose middle lies over the
   ceiling or under the floor isn't drawn, as nothing else is there. A zap
   reaches only bricks in play, so only a view made by hand reaches there.
9. **The flourishes are placed on the wall drawn the frame before,** where
   the bricks still show, as the frame that reaches a flight's last events
   hands over the wall that comes down, a step or a jump lower, drawn where
   the flight's stood. The shards take the color of the brick it held, as
   the view hands over the wall without it in the frame that breaks it, and
   writes over a wall only two walls later; a brick no wall drawn held
   throws none.
10. **A swell is kept by field cell,** and let go as the wall that comes
    down is handed over, when each field row shows another of the wall's.
11. **The flash is a rectangle along the jump line,** a quarter of a unit
    thick, fading from 0.8 over `FLASH_MS`, in the jump line's color; the
    ring is baked at its widest, round the eight cells about the bomb's.
12. **The guide's pools are 128 dots** and **31 outlines,** the cells a
    straight line crosses on the deepest field. R6's dots lie
    `GUIDE_DOT_GAP`, half a unit, apart: about 72 along the longest first
    segment, about 24 units, and the 12 the debug menu runs the guide past
    its turn at most. A guide of more would show its first 128.

**Checks.** The workspace's `lint`, `typecheck` and `test:coverage` pass,
after the review, 4,293 tests in 80 files, and 3 in `sim`;
`wall_scene.spec.ts` has 215. The scene's own files stand at 100% of
statements, functions and lines and 98.8% of branches (the wall a
flourish falls back on before the first frame), the painters at 99.6%,
91.8% (the fallbacks of indexed reads the pools never miss), 100% and
100%, within the scene's floors. The root's `yarn lint` passes.

**The mutation pass.** 101 mutants of the eight files S2 touched, each
run against the scene's specs: 80 were killed. Of the 21 that survived, 14
were given specs and killed on a second run: the swell let go as the rows
shift, a jump's warning frames, a triple shot's mates flaring, a fuzzball
seen to fly off by no launch looking up, a yawn's look across, the guide
drawn again for a new wall, the meter's angles (now checked at a large
unit), the meter hidden as the fuzzball flies off, a hop's rise, a bolt
under the floor, a ring's fade, and the events and beats a log held before
the scene began. Two showed dead code: the swell's and the flare's ease
end on exactly 1, so the branch for a hair off it went. Five are
equivalent: the pool's break, which `drawOne()` guards anyway; a bolt's
`step < reach` against `<=`, as each step is a half; the shake's flag,
whose camera rests at 0 once it is over either way; and the cut over and
under a cell, and the swell's guard, both of the wall painter the rebase
replaced. After the rebase, 10 mutants of the wall painter's swell and its
drawn brick: 8 killed, and 2 equivalent, the swell's end not reset, which
sets the scale it already has, and its guard, as a `Float64Array` drops a
write past its ends. After the review, 7 mutants of its fixes: the
flourishes placed on the view's wall, the shards unscaled, unreserved and
uncapped, and the flared eyes' offset three ways: all killed.

**The review:**

1. **A flight's last flourishes were placed a step or a jump under their
   bricks,** on the wall the view hands over in the frame that reaches
   them, which the wall painter draws where the flight's stood. Fixed: they
   are placed on the wall drawn the frame before (choice 9), and a spec
   plays a bolt and a ring in that frame.
2. **The shards weren't scaled up past the atlas's largest unit.** Fixed:
   the emitter scales them as each layout's baked scale has it, specced on
   a large canvas.
3. **The shards weren't a pool made once:** Phaser makes a particle when
   none is spare. Fixed: 216 are reserved, and no more fly at once; a spec
   breaks 38 bricks at once, and the 600 frames' spec counts the
   particles too.
4. **Nits.** Fixed: the friends' frames are named once, in the ball
   painter; its frames are `FrameName`s; what only its own file reads is
   no longer exported; `stand_ins.ts` names `Guide` alone; and a boon's
   eyes flare in with it, as far from the middle as its size, specced.

### S2b: the workspace's AGENTS.md says what the scene does

**2026-11-10.**

The integrator asked, once S2 was merged, for the game's `AGENTS.md` to
say the scene as it now is, touching only the scene's lines.

**What was built.** In `frontend/games/brick-fuzz-pop/AGENTS.md`:

- **The `src/scene/` entry, rewritten** as a bullet for each part, as the
  shell's entry is: `wall_scene.ts`, what it hands the steering, then each
  frame: the steering read, the events and beats played, each fuzzball's
  look and a friend's ink set by them, their sounds with motion or without
  and their flourishes where it is welcome, placed on the wall drawn the
  frame before, and the `SpritePlayer`; `atlas.ts`, with the frames the
  scene bakes that no art draws; `painters/`, with `painter.ts` and
  `dots.ts`, the four new painters and S1b's danger shown; `danger.ts`;
  and `stand_ins.ts`, which names `Guide` only for `GameService`'s import.
  Gone: the unsteered shot, the guide the scene didn't draw and the sprite
  that played nothing.
- **The packages still to come** no longer list S2.

**Choices the plan didn't make.**

1. **Each pool is named by its size and its constant,** as the file names
   a field's depths (`LEAST_DEPTH`, `MOST_DEPTH`), so a reader can find
   either.

**Checks.** The workspace's `lint`, `typecheck` and `test:coverage` pass,
4,315 tests in 80 files, and 3 in `sim`; the root's `yarn lint`, which
checks the file's paths and its formatting, passes.

**The mutation pass.** None: no code changed.

**The review:**

1. **The danger S1b built went unsaid,** and "the danger line in dashes"
   was wrong while a needed brick stands low. Fixed: the warning frame,
   the lit line, the wall painter's frames and `danger.ts` are named.
2. **Motion's condition stood in the wrong places:** after the ease's "1
   while the wall stands still", and only on the effects painter's
   flourishes, though the swell and the flare are flourishes too. Fixed:
   it is said once, where the scene plays the events, and the ease's
   order is S1's again.
3. **The steering's hands read as the steer's parts,** "two fingers" as a
   gesture, and the fuzzball's last place kept in flight went unsaid.
   Fixed: two sentences, what the steering is handed, then what each frame
   reads and hands on; the second finger calls the shot off.
4. **The notch was overstated.** Fixed: as it rises or falls, but to none,
   while a fuzzball waits, but a hot shot (as the second review put it).
5. **One 47-line bullet, a frame's work split up, `painter.ts` and
   `dots.ts` unnamed.** Fixed: a bullet each for the scene, the atlas, the
   painters, `danger.ts` and `stand_ins.ts`, as the shell's entry has,
   which earned the second review below.
6. **Pools named by bare numbers.** Fixed: each by its size and its
   constant (choice 1).
7. **"Until the shell takes it and the file goes" stated a plan.** Fixed:
   it says only that `GameService` still imports `Guide` from it.
8. **Nit.** A painter draws in its layers, as two draw in two. Fixed.

The second review:

1. **"While a plain fuzzball waits" said the notch plays only uncharged,**
   as "plain" means elsewhere, and left out the triple shot. Fixed: while
   a fuzzball waits, but a hot shot, whose charge is always full.
2. **The steering takes every key, not the arrows and Space,** which only
   the capture is. Fixed.
3. **The steering's sentence didn't parse, and restated its rules,** a
   charge or a shot called off, which will go stale as the steering
   changes. Fixed: it says only what the scene hands the steering, and
   that it calls `letGo()`.
4. **The events steer `BallPainter`** (S2's choice 3), which went unsaid.
   Fixed: each launch, turn and yawn sets where its fuzzball looks, and a
   friend's ink comes from `crew()`.
5. **The pictures go to the panels too.** Fixed.
6. **The hops go through `@fz/core/turns` too.** Fixed: each but the
   shards.
7. **Smaller points.** Fixed: the atlas's bullet led by `atlas.ts`; `'s`
   after a name ending in s, as the file writes it; `endangers()` for a
   field row and column; a sound "with motion or without"; and this list
   for what the second review found.

### S2c: the danger read from the rules

**2026-11-10.**

The integrator asked, once P2 was merged, for the scene to read the danger
from the rules `src/rules/wall/lower.ts` now shares, dropping what
duplicates them, its look unchanged.

**What was built.**

- **`src/scene/danger.ts` went.** `FieldPainter` lights the danger line by
  the rules' `inDanger()`, along the foot of their `DANGER_ROW`, and counts
  the bricks under the jump line by `neededBelow()`, its own
  `neededUnder()` gone; `WallPainter`, as it is handed another wall, hides
  every warning frame, then shows the one over each of the rules'
  `dangerCells()`, and places them as it lays the wall out.
- **The game's `AGENTS.md`** says the scene's danger and count are the
  rules', in its `painters/` bullet, and drops its `danger.ts` bullet.

**Choices the plan didn't make.**

1. **A needed brick under the floor shows no frame,** and the danger line,
   which the rules' `inDanger()` reads by `lowestNeededRow()`, would now
   light for one, where the scene's own looked at the floor's row and the
   one over it alone. No wall the game hands over holds one: the step that
   brings a needed brick to the floor's row loses the level, a jump waits
   on none under the jump line, and a saved wall with one is refused.
2. **The warning frames are shown again only as another wall is handed
   over,** not as the wall eases, so `dangerCells()`, which makes an array,
   runs a frame a brick changes, not every frame; `neededBelow()` and
   `inDanger()` run as `FieldPainter` reads another wall too.

**Checks.** The workspace's `lint`, `typecheck` and `test:coverage` pass,
4,465 tests in 83 files, and 3 in `sim`, the scene's 215 unchanged and
its files within their floors; the root's `yarn lint` passes.

**The mutation pass.** 6 mutants of the change: every warning frame shown,
none shown, a danger cell's column and row each lost, the count's line a
row higher, and the line never lit. All were killed by the danger's and
the count's specs, which hold the look as it was. After the review, 6 of
the frames shown only for another wall: 4 killed, and 2 equivalent, the
frames shown again at every layout, which only costs the array, and the
guard on a row under the floor, whose frame no wall the game hands over
asks for and whose index names none.

**The review:**

1. **`dangerCells()` made an array every frame of the wall's ease,** as
   the wall painter lays the wall out again as it moves, and choice 2 said
   otherwise. Fixed: the frames are shown again only as another wall is
   handed over (choice 2), a row under the floor guarded.
2. **Choice 1 told half the difference under the floor:** the line, read
   by the rules, would light for such a brick too. Fixed: choice 1 says
   so, and why no wall holds one.
3. **Nit.** The `AGENTS.md` lines named `lower.ts` again, which the rules'
   bullet does. Fixed: each is "the rules'".

### S2d: the guide's dots clear of the jump line's count

**2026-11-10.**

The Q3 browser check found the guide's dots over the jump line's count
where a shot passed the line's end (its finding 7, shots 16 and 41); the
integrator asked for the simplest way that keeps both readable: the count
drawn over the guide, the guide's dots left out where they would cover the
count's, or the count moved.

**What was built.**

- **The count is drawn over the guide,** in a layer of its own, `count`,
  after `guide` in `LAYERS` and under `bursts`, so an outline round a brick
  at the line's end passes under its dots and leaves them whole.
  `FieldLayers` names it.
- **The guide leaves out a dot that would crowd the count's.**
  `FieldPainter.crowdsCount()` says whether a dot some pixels wide about a
  place would stand nearer a dot of the count than the count's groups
  stand apart, 0.22 of a unit edge to edge; `GuidePainter`, handed it as a
  `CountClearance`, hides such a dot. It draws again as the count does, as
  the wall or the layout changes, after `FieldPainter`, which draws first.
- **The game's `AGENTS.md`** says the count is drawn over the guide and
  the guide's dots keep clear of it.

**Choices the plan didn't make.**

1. **Two of the three ways, not one.** Drawn over the guide alone, a
   guide's dot, 0.115 of a unit wide, would peek out from under a count's,
   0.14, unless their middles stood within 0.0125 of a unit; left out
   alone, the guide's dots would clear the count, but an outline's stroke,
   0.0225 of a unit in from its cell's edge, would still cross the count's
   dots over a brick just under the line. Moving the count would take it
   from the line's end, where `plan.md` puts it.
2. **The clearance is the gap between the count's groups,** not between
   its dots, so a guide's dot never reads as one more of a group. A guide
   crossing the count loses a dot or two of its dots, half a unit apart.

**Names added,** none in a contract file: `LAYERS`' `count`,
`FieldLayers.count`, `FieldPainter.crowdsCount()`, `CountClearance` and
`GuidePainter`'s third argument, the clearance.

**Checks.** The workspace's `lint`, `typecheck` and `test:coverage` pass,
4,621 tests in 87 files, and 150 in `sim`, the scene's 218 with three new
ones; the root's `yarn lint` passes.

**The mutation pass.** 18 mutants of the change. 16 were killed: the count
under the guide or in the lines' layer, the clearance dropped, doubled or
cut to the gap between dots, each half of the reach dropped, the count's
hidden dots crowding, the guide ignoring the count or taking its own width
as nothing, and a dot with no place left showing. The guide's dot's width
as nothing first survived, at offsets of 8 and 16 pixels, so the spec's
middle dot stands 9 pixels off, inside the reach by its own half-width
alone, and kills it. 2 are equivalent: `<=` for `<` at the reach, which no
two dots on whole pixels stand exactly apart, and the guide's place before
it stands on whole pixels, half a pixel off at most.

**In the browser.** On level 1 at a count of six, a guide crossing the
count between its groups leaves out the two dots that would have stood on
it, the count whole (`bfp-q3-shots/45-fix-guide-clear-of-count.png`).

**The review:** no bugs; it traced every input of the count to one the
guide draws again on, and the field drawn first.

1. **The order the guide's dots rest on was written only here:** the field
   drawn before the guide, and the count changing only with what the guide
   draws again on. Fixed: `CountClearance`'s doc says both, the painters'
   list says the field goes before the guide, and the guide's doc no longer
   reads as if the count were what it draws again on.
2. **Nit.** The spec's `countPlace()` spelled `COLUMNS` and
   `JUMP_LINE.gap` as numbers. Fixed: it takes both, the pitch and the
   groups' gap, which the painter keeps to itself, left as numbers.
3. **Nit.** `CountClearance`'s doc said where the count stands, and the
   guide's field `count` read as a number. Fixed: the doc says whether a
   dot would crowd it, and the field is `countClearance`.

### X3a: the shell's and the moss's art, unwired

**2026-11-11.**

The integrator moved this ahead of the testing skill: the X streams can't
catalog a kind until its art exists, and X3's view stream waits on the
shell's and the moss's. `BRICK_ART` satisfies a record of the catalog's
kinds, which refuses art for a kind the catalog hasn't as firmly as a
cataloged kind without art, so the art is committed unwired: the view
stream adds the two lines to `BRICK_ART` with its catalog commit.

**What was built.**

- **`src/view/art/kinds/shell.ts`:** `SHELL_ART`, after `shell()` in
  `make-art.mjs`. Its body (`shell-body`) is the chunky tile in the shell's
  body color, a core in its face's, its edges on whole pixels, and a
  bolt cut out of the core in its glyph's; its pips (`shell-2`,
  `shell-3`) a row of them under the bolt. A shell shows its body, and its
  pips while it has two hits left or more; its shards take its body.
- **`src/view/art/kinds/moss.ts`:** `MOSS_ART`, after `moss()`. Its cap
  (`moss-cap`) covers the tile's top, round its corners, to a foot of six
  scallops, flush with the tile's edges, each over a shadow in the green
  darkened, with a sprout cut out of it, a stem round at its ends and two
  leaves; its pips (`moss-2`, `moss-3`) a die's face under the cap. A
  moss brick shows the plain brick's tile in amber (`MOSS_TINT`), which is
  the moss's body in every palette, its cap, and its pips while it has two
  hits left or more.
- **`src/view/art/kinds/brick.ts`:** `tileRadius()`, the tile's corners,
  which the cap follows, exported from what `tileCommands()` used.
- **`src/view/art/symbols.ts`:** `turned()`, a point turned about the
  origin, moved from `fuzzball_art.ts`, where it was the fuzzball's own,
  so the moss's leaves share it.
- **`src/view/art/frames.ts`,** a contract file, gains two names and three
  docs: `FRAMES.shellBody` (`shell-body`), in `FRAME_NAMES` before the
  shells' pips, and `THICK_HITS`, exported as `PIPS` and `CRACKS` are; docs
  on `FRAMES.shell` and `FRAMES.moss`, which say their frames are the pips;
  and `ThickHits`' doc reworded to say its counts are the hits left. No
  name changed.
- **Specs:** `shell.spec.ts` and `moss.spec.ts` beside them, and
  `atlas_frames.spec.ts` holds the art waiting for its kinds
  (`WAITING_ART`) to the atlas's rules (within its cell, sized as a cell,
  lines a CSS pixel wide, nothing below nothing, the atlas packed under
  2048, every frame named once), passing over each once `BRICK_ART` takes
  it up. `src/testing/art_frames.ts` gains `everyScale()`, every whole unit
  from 24 CSS px to 128 device px at a pixel ratio, which both specs check
  the art at.

**Choice 1: the pips count the hits left, the frames' counts from 2.** The
plan gives `shell-<2|3>` and `moss-<2|3>`, and `ThickHits`'s doc calls 2
and 3 the hits a shell or moss has whole, which its art shows. Shown as
whole hits, a hit taken would read only by a crack, and the cracks drop
under 30 CSS px, so a shell's damage and a moss's regrowth wouldn't read at
the smallest fields. So each count is the pips for the hits left, as a
tough brick's die shows them, none at the last hit, as the tough brick
shows none ("the tile alone says one more breaks it"); a moss's grown-back
hit reads as a pip come back at every scale. `ThickHits`' doc, which said
the hits when whole, now says the hits left; only `FRAMES.shell()` and
`FRAMES.moss()` take one, and only this art calls them.

**Choice 2: the shell's body is a frame of its own, `shell-body`,** a name
added: with the pips frames by count, a shell at its last hit needs a frame
with none. Its tile is its own, as steel's is, rather than the plain teal
tile under a frame, as a dark palette lightens the shell past its ink. The
design's larger bolt at the last hit is left out: the bolt stays put.

**Choice 3: no cracks on either.** The design draws one crack through a
shell; with the pips counting down, a crack says nothing more, and a tough
brick's cracks would cross the shell's bolt and the moss's pips.

**Choice 4: the moss's die sits a little higher and tighter** than the
design's (middle 0.637 down rather than 0.645, a step of 0.14 rather than
0.155), so each pip keeps a device pixel off the tile's lip and the
scallops' shadows at every whole unit from 24 CSS px to 128 device px at
each pixel ratio; at the design's, the lowest pip came 0.46 px from the lip
at 24 CSS px and a ratio of 1.

**Choice 5: the moss's tile is the plain brick's,** in amber, under the
cap, as the plan's "the moss cap [is a frame] over a tile" has it; a spec
holds the amber tile's ink to the moss's body in each of the four
palettes, so the tile and the shards agree.

**Choice 6: the moss's sprout sits a little lower** than the design's: its
leaves' middles 0.141 down rather than 0.132, and its stem's top with them,
0.179 rather than 0.17, so each leaf keeps a device pixel under the tile's
top at every whole unit from 24 CSS px to 128 device px at each pixel
ratio; at the design's, a leaf came 0.80 px from it at a cell of 24 px and
0.85 px at 38, where the tile's gap rounds up to 2 px.

**Names added,** in a contract file: `FRAMES.shellBody`, `THICK_HITS`
(exported). Elsewhere: `SHELL_ART`, `MOSS_ART`, `MOSS_TINT`,
`tileRadius()`, `turned()` (exported from `symbols.ts`, no longer
`fuzzball_art.ts`'s own), and the specs' `everyScale()`.

**For the view stream's catalog commit:** add `shell: SHELL_ART` and
`moss: MOSS_ART` to `BRICK_ART` in the catalog's order, which `art.spec.ts`
holds its keys to; `atlas_frames.spec.ts`'s `WAITING_ART` then passes over
them, and can drop them; its list of the atlas's frames gains
`shell-body`, `shell-2`, `shell-3`, `moss-cap`, `moss-2` and `moss-3` in
the catalog's order, and that spec's title its count of them; and the
workspace's `AGENTS.md` names `shell.ts` and `moss.ts` among the kinds'
art.

**Checks.** The workspace's `lint`, `typecheck` and `test:coverage` pass,
4,816 tests in 92 files, the shell's 39 and the moss's 45 among them, and
150 in `sim`; the root's `yarn lint` passes. Looked at in a sheet of every
frame in the four palettes at three scales, beside a tough brick, drawn
from the frames' commands as SVG and kept out of the tree.

**The mutation pass.** 58 mutants of the change, all killed. 44 of the
first 47 were at once: each of the shell's core, bolt and pips moved,
resized or uncentred, its edges left off whole pixels one at a time, each
part drawn in another's ink, its layers off by one or with no body at the
last hit, its shards in its face, the pips always 3; the moss's tint, cap
foot, scallops (five, larger, spread past the tile, not flush), shadows
(lower, lighter, of amber), stem (moved, wider), a leaf turned the other
way, the die moved, spread or resized, each part in another's ink, its
layers off by one or with no cap at the last hit, its shards in its face,
the pips always 3; the tile's corners doubled; and `shell-body` left out
of `FRAME_NAMES`. Three survived: a leaf longer, the leaves turned by a
shear rather than a turn, and the cap's corners square. Two specs were
added: every point of the cap lies on the tile's rounded edge, and every
point of each leaf on its ellipse, turned; they kill those three, and two
more, the cap's corners half as round and a leaf thinner. The review's
fixes brought 9 more, all killed: `turned()` turning either way wrong, each
leaf and the stem's top back at the design's height, a leaf not turned or
placed a little large, and `everyScale()` one short or from the unit under
24 CSS px, which first survived, as 24 CSS px is a whole unit at every ratio
`PIXEL_RATIOS` lists, until its spec took a ratio of 1.1 too.

**The review:** no functional bug; the numbers match `make-art.mjs` but
for the choices named, and the art wires into `BRICK_ART` with the two
lines.

1. **`ThickHits`' doc still said the hits when whole,** beside docs saying
   the frames count the hits left, so the catalog's stream might hand
   `FRAMES.moss()` a brick's `full`. Fixed: it says the hits left (a doc,
   not a name, and only this art calls the two builders), and Choice 1
   says so; `FRAMES.moss`' pips lie "below" the cap, not "under" it, as
   "over" and "under" say how frames stack.
2. **No spec kept the leaves a pixel under the tile's top,** as Choice 4
   does the pips: a leaf came 0.80 px from it at a cell of 24 px and 0.85
   at 38. Fixed: a spec at every scale and ratio, and the sprout lowered
   to clear it (Choice 6).
3. **`turned()` copied the fuzzball art's.** Fixed: it lives in
   `symbols.ts`, which the fuzzball's sparks and tongues and the moss's
   leaves share, the leaves placed with `@fz/phaser/shapes`' `placed()`.
   The zapper's `aboutMiddle()` is left as it is: it turns by a cosine and
   a sine written out, so its quarter turn is exact.
4. **Nits.** The specs' own scales and `everyScale()`: fixed, `ART_SCALE`
   and `everyScale()` from `src/testing/art_frames.ts`; `framesAt()` stays
   in each, as each reads its own kind's art. The `hits as 2 | 3` casts:
   fixed, the tables `as const` and the lists `THICK_HITS`. The moss's
   `SHADOW`, a share: fixed, `SHADOW_DARK`.
5. **The handoff notes:** fixed, `BRICK_ART`'s two lines go in the
   catalog's order, and the atlas spec's title counts the new frames.
