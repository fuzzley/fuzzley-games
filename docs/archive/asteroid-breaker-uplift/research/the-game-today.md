# Asteroid Breaker as it is today

This note was read from the game's own code on 2026-11-14, at commit `eb560e1f`.
It is an inventory, not a review: what the game draws, plays, sounds and counts,
with the file and the name each fact comes from, so it can be checked. Paths are
from `frontend/games/asteroid-breaker/` unless they start with `frontend/`,
`.agents/` or `docs/`. Lengths are in field units (u): the field's short side is
40 u and its long side up to 88 u (`src/rules/tuning.ts`, `FIELD_SHORT_SIDE`,
`FIELD_LONGEST_SIDE`); the layout check holds a unit to 6 CSS px or more. Colors
are named by the role they take from the palette; section 7 gives their hex in
each palette.

## 1. The art, piece by piece

No picture on the field comes from an image file. Code draws every one at run
time into three textures: the field's atlas (`belt-atlas`, 157 named frames,
`src/view/art/art.ts`, `atlasFrames()`), the deck's (`belt-deck-atlas`, 11
frames, `deckFrames()`) and the points' letters (`belt-points`,
`src/scene/points_atlas.ts`). A frame is a list of flat shapes, each in one
opaque color, drawn back to front.

Three things hold for every frame:

- **Lines.** The art's line is 0.06 u (`lineWidth()` in
  `frontend/lib/phaser/src/shapes/shapes.ts`) and the outline 0.12 u
  (`outlineWidth()` in `src/view/art/shapes.ts`), each rounded to whole device
  pixels and never under a CSS pixel.
- **The outline is the field's color.** `palette.outline` is the field's own
  color (`src/view/colors/palette.ts`). A rock, the ship, a pickup and the
  comet's head are each filled once, grown outward by the outline's width
  (`outward()`), in that color, then filled in their ink; a shot is edged the
  same way by one art line. On the flat field the outline can't be seen; it only
  shows as a gap where two things overlap.
- **Marks are the field's color too.** `palette.mark` is the field's color, so a
  crater, a crack, a rivet or a band reads as a hole through the rock to the
  field.

| Frames                                            | Count | What                                                                            |
| ------------------------------------------------- | ----- | ------------------------------------------------------------------------------- |
| `rock-<kind>-<size>-<0..5>`                       | 102   | Each kind in each size it comes in, in six outlines                             |
| `rock-<kind>-<size>-taken-<n>`                    | 9     | The cracks or dents over a rock that has taken `n` hits and holds               |
| `ship`, `flame`, `guard`, `shield`                | 4     | The ship, its flame at full thrust, and its two rings                           |
| `pilot-seated-<0..7>`, `pilot-adrift-<0..7>`      | 16    | The fuzzball's body and fur in each of the eight pilot inks, at two sizes       |
| `eyes-seated`, `eyes-adrift`                      | 2     | The fuzzball's eyes, apart, so the scene can move and squash them               |
| `pickup-<id>`                                     | 8     | Each pickup: a hexagon and its symbol                                           |
| `tag-<id>`                                        | 6     | The symbol alone, for the six pickups whose effect lasts                        |
| `shot`, `bubble`, `comet`, `warning`              | 4     | A shot, a stray's bubble, the comet, its warning                                |
| `speck`, `shard`, `spark`, `puff`                 | 4     | White shapes the scene tints: a star speck, a shard, a spark, a puff            |
| `stray-picture`, `comet-picture`                  | 2     | How to play's pictures of a stray and the comet                                 |
| Deck: stick base, ring, rest, thrust, knob        | 5     | The touch stick, white, sized in CSS px                                         |
| Deck: Fire and Dash, each a disc, ring and symbol | 6     | The touch buttons, white                                                        |
| `points-<char>-<step>`, `points-<char>-outline-…` | 104   | Thirteen characters, filled and outlined, at four quarter-pixel pen places each |

### The rocks

`src/view/art/rock_art.ts` draws them; `src/rules/tuning.ts` sizes them
(`ROCK_RADIUS`, to the outline's farthest point; a rock is hit within 90% of it,
`ROCK_HIT_SHARE`).

| Size    | Radius | Across |
| ------- | ------ | ------ |
| Boulder | 4.6 u  | 9.2 u  |
| Large   | 2.8 u  | 5.6 u  |
| Medium  | 1.6 u  | 3.2 u  |
| Small   | 0.9 u  | 1.8 u  |

**The six outlines.** Each kind and size has six outlines (`ROCK_OUTLINES` in
`src/rules/rocks/rocks.ts`), each drawn once from a seed of its own (`seedOf()`,
`outlineOf()`), and a rock is given one of the six at random as it is laid. An
outline is a closed polygon of points set round the middle at nearly even angles
(each strays up to 27.5% of the gap between two, `ANGLE_STRAY`), each at a
random share of the radius, then scaled so the farthest point is at the whole
radius. Three styles (`OutlineStyle`):

| Style     | Kinds                              | Points  | Each point lies at | Corners                                                 |
| --------- | ---------------------------------- | ------- | ------------------ | ------------------------------------------------------- |
| `ROUNDED` | stone, crystal, boulder, lodestone | 9 to 12 | 0.78 to 1.0 R      | Rounded: each corner a curve between its sides' middles |
| `SMOOTH`  | iron, volatile                     | 9 to 12 | 0.90 to 1.0 R      | Rounded the same way, so nearly a circle                |
| `ANGULAR` | ice                                | 7 to 9  | 0.74 to 1.0 R      | Sharp                                                   |

Sizes differ only in scale and in which seeds drew them: a small stone is drawn
by the same recipe as a large one. A mark scales with the radius, but a line
never gets thinner than the art's line, so marks crowd on a small rock.

**Body and marks, by kind** (`ROCK_ART`). The body is the outline filled in the
kind's ink (section 7), over the same shape grown by the outline's width in the
field's color. Marks all lie within 0.6 R of the middle (`MARK_REACH`).

| Kind      | Body ink  | Marks                                                                                                                                         | A hit it holds shows as |
| --------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Stone     | stone     | 2 or 3 craters: filled dots of the field's color, radius 0.10 to 0.18 R, placed at random                                                     | (takes one hit)         |
| Crystal   | stone's   | One gem: a four-cornered kite about 0.74 R wide and 0.96 R tall in the crystal ink, edged by one line of the field's color; no craters        | (takes one hit)         |
| Ice       | ice       | Facets: straight lines, one line wide, from a point just off the middle ((−0.08, −0.12) R) toward every other corner, ending at 0.6 R         | (takes one hit)         |
| Boulder   | boulder   | 5 craters, as stone's                                                                                                                         | A crack for each hit    |
| Iron      | iron      | 4 rivets: dots of radius 0.085 R, evenly round a circle just inside 0.6 R, turned at random                                                   | A dent for each hit     |
| Volatile  | volatile  | A core: a filled circle of radius 0.38 R in the core ink (a pale yellow); three zigzag cracks out from it, 0.46 R to 0.6 R, one in each third | (takes one hit)         |
| Lodestone | lodestone | Two level bands of the field's color, 0.14 R tall, 0.28 R above and below the middle, ending 0.1 R short of the outline                       | A crack (large only)    |

**Damage.** A rock that has taken hits and holds gets a second image over its
body, turned with it (`takenFrame()`): one zigzag line in the field's color for
each hit taken, one art line wide, each turned 2.4 radians from the last
(`HIT_TURN`). A crack (`CRACK`) runs from 0.1 R out to 0.6 R; iron's dent
(`DENT`) runs from 0.6 R in to 0.3 R. Only three kinds ever show one: the
boulder (1 to 5), large iron (1 to 2) and medium iron (1), and large lodestone
(1). The six outlines of a kind and size share the same overlay. Nothing else
about a rock changes with damage: no color change, no chips off its outline.

**In play** a rock turns at 6 to 30 degrees a second either way (`ROCK_SPIN`)
and does nothing else: no shading, no highlight, no glow, no animation of the
volatile's core, no sign of a lodestone's pull.

### The ship

`src/view/art/ship_art.ts`. The ship is 2.4 u from nose to fin tips
(`SHIP_LENGTH`); it is hit within 0.7 u of its middle (`SHIP_HIT_RADIUS`).

- **Hull** (`hullOutline()`): one closed shape of three cubic curves, a rounded
  pod. Its nose is 1.27 u ahead of the middle, its rounded tail 0.96 u behind,
  and it is 1.40 u across at its widest. Filled in the accent, outlined in the
  field's color.
- **Fins** (`finOutline()`): two swept fins, rooted on the hull's sides a little
  behind the middle, their tips 1.13 u behind the middle and 1.01 u out to each
  side (2.03 u tip to tip). Accent, outlined, drawn under the hull.
- **Window**: a circle of radius 0.405 u, its middle 0.385 u ahead of the ship's
  (`WINDOW`), filled with the field's color: a hole, with no rim, glass or
  glint. The pilot is drawn over it.
- **Flame** (frame `flame`): a pointed teardrop in the warning color with no
  outline, 0.61 u wide at its base, which sits 0.86 u behind the middle
  (`FLAME_BEHIND`). It is 1.62 u long at full thrust and stretched along its
  length by the thrust (`flameShare()`: 34% at none, 100% at full); it shows
  only while the ship thrusts. Keys thrust all or nothing; the stick thrusts by
  how far it is pushed.
- **Guard ring** (frame `guard`): a dashed ring of radius 1.75 u, 0.12 u wide,
  dashes 0.35 u long with gaps of 0.3 u, in the accent, drawn at 50% opacity
  (`GUARD_ALPHA` in `src/scene/painters/ship_painter.ts`). It shows while
  nothing can touch the ship: a ship waiting for its first move, 2 s after a new
  ship first moves, 320 ms from a dash's start, 1 s after its Shield is spent, 1
  s after a pause that stretched the field. The ship itself blinks 2.5 times a
  second inside it.
- **Shield ring** (frame `shield`): a solid ring of radius 1.65 u, 0.14 u wide,
  in the accent, while the Shield is held.
- **Dash**: there is no dash ring or dash frame. A dash shows as three fading
  copies of the `ship` frame along its path (section 3), and its recharge shows
  only on the touch deck's Dash button.
- **Weapons**: the ship looks the same whichever weapon it holds.

Back to front the ship's layer holds: guard ring, shield ring, flame, hull,
pilot, eyes.

### The pilot: how the fuzzball is built

The mark's geometry is `FUZZBALL` in `frontend/lib/style/src/fuzzball.ts`,
copied from fuzzley.info's icon, on a grid of 32 by 32:

| Part   | Geometry on the 32-unit grid                                                                                                                                      |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Body   | A circle, middle (16, 17.2), radius 10.4: 65% of the grid across                                                                                                  |
| Fur    | 30 strands, each a quadratic curve stroked 2.8 wide with round ends, in the body's color                                                                          |
| Eyes   | Two upright ellipses, 2.3 across by 3.0 down in radius, middles (13.4, 17) and (20.6, 17): 7.2 apart, 0.2 above the body's middle; ink `#14171b` in every palette |
| Glints | Two circles of radius 0.85 at (14.2, 15.8) and (21.4, 15.8), up and right of each eye's middle; `#ffffff`                                                         |

Measured from the path (`fur.d`): every strand starts 8.2 from the body's
middle, inside the body, and ends 11.1 to 13.4 from it (11.7 on average), so its
tip pokes 0.7 to 3.0 past the body's edge. The strands are 3.5 to 5.6 long and
uneven, all swept the same way round (clockwise on screen), and the longest
stand at the top. With the stroke's half width the fur reaches 14.8 from the
middle (`furReach()`), so the whole mark is about 29.6 of the grid's 32 across.
Each eye is 29% of the body's width tall and 22% wide. There is no mouth, no
limb, no brow and no second color: the mark is one flat color with two dark
eyes.

The game draws it through `frontend/lib/phaser/src/fuzzball/fuzzball.ts` and
`src/view/art/pilot_art.ts`:

- `fuzzballCommands()` draws the body as a circle and each strand as a
  round-ended line of eight straight pieces, all in the pilot's ink. The library
  can draw an outline under it and take fur "combed" another way
  (`FuzzballStyle.outline`, `.fur`); Asteroid Breaker passes neither.
- `eyesCommands()` draws the eyes as a frame of their own, with the glints only
  where each is half a device pixel or more in radius, which is where the
  fuzzball is about 19 device pixels across or more.
- It comes in two sizes (`PILOT_SIZES`), measured across the grid: **seated**,
  0.81 u, as wide as the ship's window (its body about 0.53 u across, its fur
  about 0.75 u); and **adrift**, 1.78 u (body about 1.16 u, fur about 1.65 u),
  in a bubble 2.3 u across.
- At 6 CSS px to a unit, the least a field gets, the seated pilot is under 5 CSS
  px across. The archived plan
  (`docs/archive/asteroid-breaker-execution-plan.md`, "Fuzzley flavor") puts the
  window at about 7 CSS px on a phone, "a dab of its color with two dark eyes",
  and about 14 on a desktop.

What moves: the eyes' frame slides toward what the pilot looks at, by up to 4.1%
of its size across and 2.8% down (`LOOK`, from `FUZZBALL_LOOK` 1.3 and 0.9 on
the grid), and squashes to a tenth of its height in a blink (section 3). The
body and fur never change.

### A stray's bubble

Frame `bubble` (`bubbleCommands()` in `art.ts`): a filled circle of radius 1.15
u (`STRAY_RADIUS`) in a faint wash (the field's text at 6% over the field), a
rim 0.11 u wide (the field's text at 50%), and one glint: a white arc 0.10 u
wide, at 78% of the radius, on the upper left. The pilot sits 5% of the radius
below the middle (`STRAY_DROP`). `stray-picture`, for How to play, is the same
bubble with a fuzzball in the accent, not a pilot's ink.

### The pickups and the symbols

A pickup (`pickupArt()`) is a hexagon with a corner at top and bottom, 0.95 u
from middle to corner, its corners rounded at 0.27 u, in the accent with the
field-colored outline, and its symbol in a square of 1 u in the color the
palette sets on its accent. All eight are the same shape and color; only the
symbol tells them apart. Symbols are drawn in lines 14% of their square wide
(`src/view/art/symbols.ts`, `SYMBOLS`):

| Pickup     | Symbol                                                                                |
| ---------- | ------------------------------------------------------------------------------------- |
| Spread     | Three lines fanning up from one point                                                 |
| Rapid      | Two chevrons pointing up, one above the other                                         |
| Shield     | A ring with a dot in its middle                                                       |
| Extra ship | A filled disc with the fuzzball's shape on it in the pickup's own color, with no eyes |
| Lance      | A small ring with a level line through it and an arrowhead at its right               |
| Magnet     | A horseshoe, its ends up                                                              |
| Slow       | An hourglass: two filled triangles                                                    |
| Nova       | Eight rays                                                                            |
| Fire       | (deck) A ring with four rays, as a crosshair                                          |
| Dash       | (deck) Two chevrons pointing right                                                    |

### The comet and its warning

Frame `comet` (`cometCommands()`): a head, a circle of radius 1.1 u in the
danger color with the field-colored outline, over a tail of the same flat color,
2 u wide at the head and tapering on two inward curves to a point 2.8 u behind
the head's middle. No gradient, no glow, no trail of particles. Frame `warning`:
two chevrons pointing the way the comet will fly, in the danger color, lines
0.32 u wide, the larger 1.6 u tall and the smaller 1.1 u; it is drawn 1.5 u
inside the edge the comet waits beyond (`src/view/field/warning.ts`).

### Shots

Frame `shot`: a capsule 0.72 u long and 0.30 u wide in the field's text color,
the clearest color on the field, with one art line of the field's color around
it. Every weapon fires the same capsule; a Lance's shot looks like any other. A
shot has no trail and no muzzle flash, and nothing marks where one lands but
what the rock does.

### Specks, and the scene's white shapes

- `speck`: a white circle of radius 0.18 u, tinted to the field's muted text at
  a third over the field. There are 36 for each 1,600 u²
  (`src/view/field/specks.ts`): 36 on a field of 40 by 40, 79 on 88 by 40. They
  are strewn from the run's seed, all one size and one tint, and stand still;
  they are the same in every wave and sector of a run.
- `shard`: a white, uneven triangle that fits a square of 0.5 u
  (`FLOURISH.shard`), its sides about 0.54, 0.53 and 0.44 u.
- `spark`: a white four-pointed star, 0.6 u tip to tip.
- `puff`: a white circle of radius 0.4 u, used for dust and, at 40% size, for
  exhaust.

### Endless's constellation

In an Endless wave (31 on) the field draws 17 more specks (`CONSTELLATION` in
`pilot_art.ts`, `FieldPainter.drawStars()`): 15 at the tips of every other
strand of the fuzzball's fur, tinted as the other specks, and 2 at its eyes,
tinted the field's muted text, which is brighter. It is 10 u across the
fuzzball's grid (`CONSTELLATION_SIZE`), lies somewhere new each wave
(`constellationAt()`), stands still, and has no lines between its dots.

### The effect tags

While an effect lasts, its tag shows at the field's bottom left, under
everything that moves (`src/view/field/tags.ts`,
`src/scene/painters/tag_painter.ts`): the pickup's symbol, 1.2 u square, in the
accent, inside a ring of radius 1.1 u one art line wide. The ring is drawn in
the field's line color with an arc of the accent over it that empties clockwise
as the time runs out; the Shield's stays full. The first tag's middle is 1.9 u
in from the left and the bottom, and each next one 2.7 u to its right, in the
order weapon, Shield, Magnet, Slow. Spread, Rapid and Lance share one place, as
only one weapon is held.

### The touch deck

Drawn off the field, in CSS pixels, white frames the scene tints
(`deckFrames()`, `src/scene/painters/deck_painter.ts`, sizes in
`src/view/steering/stick.ts` and `deck.ts`):

- **Stick**: a base of radius 48 px, a knob of radius 20 px, a dashed ring at
  the base's edge while it rests and a dashed ring at half its radius that the
  knob thrusts past (dashes and gaps 5 px, lines 2 px). At rest the dashed ring
  is the muted color at 40% and the knob at 25%. Held, the base is a faint wash,
  its edge the line color (the accent at full push), the thrust ring the accent
  while thrusting, and the knob the accent.
- **Fire**, radius 32 px, and **Dash**, radius 24 px: a disc in the faint wash,
  a ring in the line color and the symbol in the muted color; pressed, the disc
  and ring are the accent and the symbol the color on the accent. Dash's
  recharge is an arc 3 px wide, 4 px outside the button, in the accent, filling
  clockwise over 2.5 s.

### The points' lettering

`src/view/art/points_art.ts`, `src/scene/points_atlas.ts`. The points scored are
written in the page's font at weight 700, 0.95 u tall, filled in the field's
text color and outlined in the field's color with a line 0.28 u wide, round at
its joins (`POINTS_TEXT`). The characters are the ten digits, `+`, `,`, `×` and
the space. Unlike the rest of the art they are drawn by a canvas's own
`fillText()` and `strokeText()`, into an atlas of their own, at the field's
whole unit with no cap, so they stay sharp on a large screen. A label reads
"+40", or "+40 ×2" where the chain multiplied it.

## 2. What the renderer has

### The drawing vocabulary

A frame is a list of `DrawCommand`s
(`frontend/lib/phaser/src/shapes/shapes.ts`). There are seven, and each takes
exactly one color, a number `0xrrggbb`:

| Command     | Builder       | Draws                                                 |
| ----------- | ------------- | ----------------------------------------------------- |
| `rect`      | `rect()`      | A filled rectangle                                    |
| `roundRect` | `roundRect()` | A filled rectangle with rounded corners               |
| `circle`    | `circle()`    | A filled circle                                       |
| `ring`      | `ring()`      | A circle's outline of a width                         |
| `line`      | `line()`      | A straight line of a width, its ends cut square       |
| `polyline`  | `polyline()`  | A line through points as one path, its corners mitred |
| `polygon`   | `polygon()`   | A filled polygon                                      |

`stroke()` builds a round-ended line from `line`s and `circle`s. Curves are
flattened to points first (`frontend/lib/phaser/src/shapes/curves.ts`):
`arcPoints()` and `ellipsePoints()` at 40 pieces a turn, `quadraticPoints()` and
`cubicPoints()` at 8 pieces a curve. `transforms.ts` moves, scales and frames a
drawing (`shifted()`, `scaledBy()`, `placed()`, `centered()`, `bounded()`);
`areas.ts` and `symbols.ts` lay shapes out in an area or a square (`within()`,
`share()`, `inset()`, `middleSquare()`, `frameAround()`, `outlineRoundRect()`,
`star()`, `dashes()`, `dotIn()`, `discIn()`, `rimIn()`, `symbolLineStyle()`).
The game adds `outward()` and `dashedRing()` (`src/view/art/shapes.ts`).

**There is no gradient, no alpha, no clip or mask, no blur or shadow, no blend
mode, no texture or pattern, and no hole** in this vocabulary. Every shape is
opaque and one color; a "hole", such as the ship's window, is a shape painted in
the field's color; a soft edge is only what the canvas's anti-aliasing gives.

### How the atlas is baked

- `bakeBeltAtlas()` (`src/scene/atlas.ts`) hands the frames to `bakeAtlas()`
  (`frontend/lib/phaser/src/scene/bake_atlas.ts`), which packs them in rows,
  tallest first, with a gutter of 2 px (`pack()`, at most 4,096 px a side), and
  to `bakeTexture()`, which plays the commands into a throwaway Phaser
  `Graphics` (`atlasFrameOf()` in `shapes_frame.ts`: `fillRect`,
  `fillRoundedRect`, `fillCircle`, `strokeCircle`, `lineBetween`,
  `strokePoints`, `fillPoints`) and rasterizes it with
  `graphics.generateTexture(canvas, …)`, that is, with the Canvas 2D API, onto a
  canvas texture uploaded once. It is drawn again after a lost WebGL context.
- The `phaser-graphics-and-shapes` skill notes that `generateTexture` "uses
  Canvas API", so a `Graphics` gradient fill "will NOT appear in generated
  textures".
- The points' atlas does not go through `DrawCommand`s: `drawCanvasTexture()`
  (`frontend/lib/phaser/src/scene/canvas_texture.ts`) hands it a raw 2D canvas
  context, which it writes text on. That is the one place the game draws with
  the full Canvas 2D API today.
- **The baked scale** (`bakedScale()` in `src/view/art/shapes.ts`): the field's
  unit in device pixels, rounded down to a whole pixel, at least 1 and at most
  **32** (`MOST_BAKED_UNIT`). The scene scales every image by `zoom`, the true
  unit over the baked one (`BeltScene.zoom()`), so past 32 device pixels to a
  unit the art is stretched. At 32 a large rock is 179 px across and a boulder
  294 px. `src/view/art/art.spec.ts` holds the whole atlas inside 2,048 by 2,048
  px at every scale.
- **It bakes again** on a new palette, a new pixel ratio, or as the field's unit
  passes a whole device pixel (`BeltScene.update()`, `isBakedForLayout()`), then
  has every image take up its frame anew (`retakeFrames()`). The palette's
  colors are baked into the frames, so a color in a frame can't change at run
  time; only the white frames are tinted. The deck's atlas bakes again on a new
  pixel ratio; the points' on a new palette, font or whole unit.

### What the scene uses of Phaser, and what it doesn't

From `src/scene/` (`belt_scene.ts` and `painters/`):

| Uses                                                                                                                                                                | Does not use                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `Image`s on the atlases, each made once; a wrapping thing is four images (`Copies`)                                                                                 | `Sprite`s, animations, `Container`s, `Text`, `BitmapText`       |
| Tint: the default multiply on white frames (specks, shards, puffs, sparks, the deck), and `TintModes.FILL` in white for a held hit's flash (`Copies.setTintFill()`) | Blend modes: everything is `NORMAL`                             |
| Alpha, scale and rotation, set each frame from the scene's time                                                                                                     | Tweens, timers: nothing is tweened                              |
| Two `ParticleEmitter`s: shards (`DebrisPainter`) and exhaust (`ExhaustPainter`)                                                                                     | Filters (glow, blur, bloom, shadow), `enableFilters()`          |
| Four live `Graphics`: the field's frame, the tags' rings, the sweeping rings, Dash's recharge                                                                       | Lighting, normal maps, masks                                    |
| One `DynamicTexture`, the sheet each points label is stamped on (`PointsPainter`)                                                                                   | `Gradient`, `Noise`, `Shader`, `CaptureFrame`, `SpriteGPULayer` |
| 13 `Layer`s and two cameras; the field's camera's viewport, scroll and background color                                                                             | The cameras' own `shake()`, `flash()`, `fade()`, zoom or follow |
| `load.audioSprite()` for the sounds, the only file loaded                                                                                                           | `load.image()`, `load.atlas()`, any image file                  |

The game's renderer settings are `boardHostOptions()`'s
(`frontend/lib/phaser/src/canvas/board_host_options.ts`): WebGL where there is
any (`type: AUTO`), `antialias: true`, `roundPixels: false`,
`powerPreference: "low-power"`, a transparent canvas, and `fps.smoothStep`.

### The layer order

`LAYERS` in `src/view/field/layers.ts`, back to front. The field's camera draws
all but the last two; the deck's camera draws those, over the whole canvas, so
they stand still while the field kicks and shakes. The field's camera's viewport
is the field's rectangle, so anything past an edge is cut off there.

| #   | Layer     | Holds                                                                                            |
| --- | --------- | ------------------------------------------------------------------------------------------------ |
| 1   | `field`   | The specks and the constellation; the field's flat color is the camera's background              |
| 2   | `tags`    | The effect tags                                                                                  |
| 3   | `rocks`   | The rocks and the hits they show                                                                 |
| 4   | `pickups` | The pickups                                                                                      |
| 5   | `strays`  | The stray adrift and a pilot bailing out                                                         |
| 6   | `hazards` | The comets and their warnings                                                                    |
| 7   | `shots`   | The shots                                                                                        |
| 8   | `ship`    | The ship, its flame, pilot and rings                                                             |
| 9   | `flash`   | A held hit's flash                                                                               |
| 10  | `effects` | Back to front: a dash's trail, the exhaust, the shards, the dust, the sparks, the sweeping rings |
| 11  | `points`  | The points rising                                                                                |
| 12  | `frame`   | The field's frame, 2 CSS px in the field's line color                                            |
| 13  | `deck`    | The touch deck                                                                                   |

### The performance rules the repository states

`.agents/skills/phaser-canvas-performance/SKILL.md`:

1. Measure first: a fix with no number before and after is a guess.
2. Few texture switches: keep artwork in an atlas, or a few; "few and stable
   bindings is the goal, not one"; draw a run-time texture once with
   `bakeTexture()` or `bakeAtlas()`.
3. No filter on many objects: a filtered object is drawn through framebuffers of
   its own every frame (a shadow filter on each card cost the Solitaire
   Collection 156 framebuffer switches a frame). Draw a shared effect once into
   a `DynamicTexture`. "A filter on a camera or on one large object is fine."
4. Nothing allocated per frame.
5. Pooled objects (`@fz/core/turns`'s `Turns` for a flourish).
6. Depth from one list of layers.
7. A scene lets go of everything when it ends.

`.agents/skills/phaser-core/SKILL.md` adds that a texture drawn at run time goes
through `bakeTexture()`, `bakeAtlas()` or `drawCanvasTexture()` so it uploads
once and survives a lost context; that after a bake every image sets its frame
again, while "a particle emitter reads its frames as it emits and needs
nothing"; and that a WebGL `Graphics` drawn live drops path points closer than a
pixel, so fine shapes are baked rather than drawn live.

The archived plan's bar ("Performance"): a frame's work under 4 ms at the median
with the CPU throttled six times, at the busiest moment, and nothing allocated
per step or frame. Its "As built" figures at that throttle: Tempest at Fast on
the widest field 1.61 ms at the median, 4.48 ms at the 95th hundredth and 15.43
ms at worst. The game's own caps, all made as the scene is created: 128 shards
flying, 16 exhaust specks, 12 dust puffs, 12 sparks, 12 rings, 12 points labels,
one flash, three trail outlines; and in the rules, 48 rocks on 40 by 40 (105 on
the widest field), 42 shot slots, 8 pickups, 3 comets and 1 stray.

### Does any game here load art from image files?

Asteroid Breaker does not: its only loader call is `load.audioSprite()`, in
`frontend/lib/phaser/src/sound/sprite_player.ts`. `phaser-core` says Brick
Breaker, Asteroid Breaker and Brick Fuzz Pop each bake one atlas at run time,
and that the Solitaire Collection's board is one "whose atlases are served and
loaded". It also says the Solitaire Collection draws a deck on a canvas
(`DrawnDeckPainter`). A search of the games' folders for Phaser's loader and
texture-adding calls, listing file names only (no other game's source was read),
matched three files, all in
`frontend/games/solitaire/src/engine/render/phaser/deck/`. So by the skill's
account one game here loads card art from files, and the skills name no game
that loads a normal map.

### What the Phaser skills say about lighting and normal maps

- **The component** (`phaser-game-object-components`, "Lighting (v4, WebGL
  only)"): `lighting` (off by default), `setLighting(enable)`, and
  `selfShadow { enabled, penumbra, diffuseFlatThreshold }` with
  `setSelfShadow(enabled?, penumbra?, diffuseFlatThreshold?)`, where `null`
  takes the game's default.
- **Where it works** (`phaser-v4-new-features`, "Lighting Component"): it
  replaces Phaser 3's `setPipeline("Light2D")` and is supported on BitmapText,
  Blitter, Graphics, Shape, Image, Sprite, Particles, SpriteGPULayer, Stamp,
  Text, TileSprite, Video, TilemapLayer and TilemapGPULayer. Self-shadow
  "simulates surface shadows from texture brightness".
- **Cost**: "Lighting changes the shader, which breaks batches. Group lit
  objects together and unlit objects together for best performance."
- **Limits** (`phaser-game-setup-and-config`): `render.maxLights` is 10 by
  default, the "max lights visible per camera"; `render.selfShadow` is off by
  default. WebGL only.
- **Lights** (`phaser-v3-to-v4-migration`, "Lighting"): "Lights now have a `z`
  value to set height explicitly". `phaser-scenes` lists `this.lights` as the
  scene's `LightsManager`.
- **How a texture gets a normal map**: the one way the skills write down is the
  loader, `this.load.image('brick', ['assets/brick.png', 'assets/brick_n.png'])`
  (`phaser-loading-assets`). The Noise game objects can output one
  (`noiseNormalMap: true`), and the `NormalTools` filter manipulates one. An
  `ImageLight` filter does image-based lighting from a panorama and a normal
  map, apart from the core lighting; its `PanoramaBlur` is "very slow".
- **Not in the skills**: how a light is added or the ambient light set (no call
  on `this.lights` is shown); how a texture made at run time, as this game's
  baked atlas is, is given a normal map; what a lit object with no normal map
  looks like; and any measured cost beyond the broken batches.

### What they say about blend modes, glow, bloom and particles

- **Blend modes** (`phaser-game-object-components`,
  `phaser-sprites-and-images`): WebGL has `NORMAL`, `ADD`, `MULTIPLY`, `SCREEN`
  and `ERASE`. "Changing blend mode breaks WebGL batches. Group objects by blend
  mode when possible". The other canvas blend modes need the `Blend` filter and
  a capture.
- **Tint modes** (`phaser-sprites-and-images`): `MULTIPLY`, `FILL`, `ADD`,
  `SCREEN`, `OVERLAY`, `HARD_LIGHT`.
- **Glow** (`phaser-filters-and-postfx`): `sprite.enableFilters()`, then
  `filters.internal.addGlow(color, outerStrength, innerStrength, scale, knockout, quality, distance)`;
  cameras have filters without enabling. `quality` and `distance` can't be
  changed once made.
- **Bloom**: there is no bloom filter in Phaser 4. It is built from
  `addParallelFilters()` with a threshold and a blur on one path, blended back
  with `ADD`, or with `Phaser.Actions.AddEffectBloom`.
- **Filters' cost**: "Each object with active filters creates extra draw calls
  (one for the base render plus one per active filter). Use sparingly and
  performance test early." Internal filters cover only the object's region and
  are cheaper; external ones are full-screen. With the repository's own rule
  above, that leaves a filter on a camera or one large object, or an effect
  drawn once into a texture.
- **Particles** (`phaser-particles`): an emitter takes a `blendMode`, has the
  Lighting and BlendMode components, and should `reserve()` its particles
  "avoiding GC spikes"; `maxAliveParticles` caps those alive. The game's two
  emitters already do both.
- **GPU-drawn objects** (`phaser-v4-new-features`): a `Gradient` game object
  draws linear and radial gradients on the GPU, and the `Noise` objects draw
  noise; both are WebGL only. The game uses neither.

## 3. Flourishes and feel

`effectsOf()` in `src/view/effects/effects.ts` says what each event of the field
calls for; `FlourishPlayer` (`src/scene/flourish_player.ts`) plays it on a
painter or the camera; `src/view/effects/timing.ts` and `flourish.ts` hold the
numbers. Nothing is tweened: each painter works out where a flourish is from the
scene's time, every frame.

### What each event calls for

| Event                                   | Sound                            | Flourishes, where motion is welcome                 |
| --------------------------------------- | -------------------------------- | --------------------------------------------------- |
| `fired`, a pull of the weapon           | `fired`                          | none                                                |
| `dashed`                                | `dashed`                         | trail                                               |
| `shielded`, the Shield spent            | `rung`                           | ring, accent, to 3 u                                |
| `nova`                                  | `blast`                          | ring, accent, to 12 u                               |
| `warned`, a comet's warning begins      | `warned`                         | none (the chevron is drawn from the field's state)  |
| `cleared`                               | `cleared`                        | none                                                |
| `hit`, a boulder or a large lodestone   | its size's break sound           | flash, spark                                        |
| `hit`, iron                             | none (its `rung` plays for both) | none                                                |
| `rung`, iron holds a hit                | `rung`                           | flash, spark                                        |
| `broken`, small or medium               | `small` or `medium`              | shards, dust                                        |
| `broken`, large or boulder              | `large`                          | shards, dust, kick                                  |
| `blast`, a volatile goes off            | `blast`                          | ring, warning color, to 6 u (large) or 4 u (medium) |
| `dropped`, a pickup let go              | none                             | none                                                |
| `caught`                                | `caught`                         | none                                                |
| `faded`, a pickup's time ran out        | none                             | none                                                |
| `lost`, a ship taken                    | `lost`                           | burst, ring (accent, to 5 u), shake, bail-out       |
| `strayed`, a stray comes in             | none                             | none                                                |
| `home`, a stray brought home            | `home`                           | none                                                |
| `gained`, a ship gained                 | `gained`                         | none                                                |
| `scored`, points for a break or a stray | none                             | points                                              |

### Each flourish

| Flourish | Draws                                                                                                                                                                      | Count and pool                                                               | Time and curve                                                |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Shards   | `shard` particles in the rock's body color (a crystal's are stone's), thrown every way at 5 to 11 u/s, each at a random turn                                               | 4 to 7 a break, by the event's serial, whatever the rock's size; 128 at once | 500 ms; opacity 1 to 0, straight                              |
| Dust     | One `puff` in the rock's color, growing to the rock's radius                                                                                                               | 1 a break; 12 at once                                                        | 400 ms; size eases out (cubic); opacity 0.45 to 0, straight   |
| Kick     | The field's camera shifts 2 CSS px the way the blow travelled                                                                                                              | the latest only                                                              | 100 ms; settles as (1 − t)²                                   |
| Flash    | The rock's own frame, filled white, over it                                                                                                                                | one rock at a time                                                           | 60 ms; opacity 0.7 to 0, straight                             |
| Spark    | One `spark` in the warning color, flying from the rock's edge 1.2 u outward, a new way each time (the golden angle times the serial)                                       | 1 a held hit; 12 at once                                                     | 200 ms; eases out; opacity 1 to 0                             |
| Ring     | A circle stroked 0.25 u wide, live, sweeping out to its reach, in the accent or the warning color                                                                          | 12 at once                                                                   | 300 ms; radius eases out; opacity 0.9 to 0                    |
| Points   | The label, where it was scored, rising 1 u, kept whole inside the field                                                                                                    | 12 at once                                                                   | 600 ms; rise and fade both straight                           |
| Trail    | Three copies of the `ship` frame along the dash, 0, 2.5 and 5.0 u from its start, laid as the ship passes each (0, 73 and 147 ms in), at 17%, 33% and 50% opacity          | 3                                                                            | each fades over 250 ms, straight                              |
| Burst    | 12 `shard` particles in the accent, as a break's                                                                                                                           | from the shards' 128                                                         | 500 ms                                                        |
| Bail-out | The lost ship's pilot in a bubble, floating off at 2.2 u/s in a direction set by the event's serial, its eyes the way it goes; it blinks 2.5 times a second from 700 ms on | 1                                                                            | 1,400 ms; it is cut off at the field's edge and does not wrap |
| Shake    | The field's camera shakes up to 6 CSS px on each axis, at 13 turns a second across and 17 down                                                                             | the latest only                                                              | still for 80 ms, then 300 ms dying away, straight             |

- **The flash limiter** (`FLASH_GAP_MS`, `flashDue()`): the field flashes no
  sooner than 340 ms after its last flash, so under three times a second; a hit
  held sooner sparks alone.
- **The exhaust** (`ExhaustPainter`): while the ship thrusts, 40 specks a second
  at full thrust, each a `puff` at 40% size in the warning color, streaming
  straight back from the flame's tip within 18 degrees at 6 u/s, fading from 0.8
  over 300 ms. It follows the field's steps, so it stops in a pause.
- **Shards and exhaust do not wrap**: particles are drawn once and cut off at
  the field's edge. Dust, sparks, rings and the trail are drawn on both sides of
  an edge.
- **The cards wait**: Cleared opens 800 ms after the last rock goes
  (`CLEARED_MS`); the result opens 500 ms after the last ship is lost
  (`resultDelayMs()`: the longer of the burst's 500 ms and the shake's 380 ms),
  which is before the pilot's 1,400 ms bail-out ends.
- **Haptics** (`src/view/effects/haptics.ts`): a ship lost buzzes 80 ms; a wave
  cleared buzzes 30, rests 60, buzzes 30. Nothing else buzzes.

### Ambient motion

| What                     | Motion                                                                           | Where motion isn't welcome |
| ------------------------ | -------------------------------------------------------------------------------- | -------------------------- |
| A rock                   | Turns 6 to 30 degrees a second                                                   | the same                   |
| A pickup                 | Breathes ±5% in size, 0.64 times a second, each slot out of step                 | still                      |
| A pickup's last 2 s      | Blinks 2.5 times a second                                                        | the same                   |
| A stray's pilot          | Bobs ±12% of the bubble's radius, 0.35 times a second; the bubble itself doesn't | still                      |
| A stray's eyes           | Look at the ship                                                                 | the same                   |
| The pilot's eyes, seated | Look the way the ship heads; the pilot stays upright as the ship turns round it  | the same                   |
| Any pilot's eyes         | Blink every 4 s, over 0.16 s, each color 0.7 s after the one before              | open                       |
| A comet's warning        | Pulses between 60% and 100% opacity, 0.8 times a second, for its 1.5 s           | steady                     |
| The flame                | Flickers between 85% and 100% of its length, 7.5 times a second                  | steady                     |
| A guarded ship           | Blinks 2.5 times a second in its ring                                            | the same                   |
| The specks, the field    | Nothing: no drift, no twinkle, no parallax                                       | the same                   |

**Where motion isn't welcome** (`GameViewportService.allowsMotion`,
`flourishesOf()`): every flourish but the points is left out, and the points
show without rising; there is no still stand-in for a ring, a flash or a burst.
The exhaust stops, the idle motions above hold still, and both cards open at
once. Sounds and haptics play as before.

## 4. Sounds

Fourteen sounds, in one sprite, in the order of `SOUNDS` in
`src/view/effects/effects.ts`. `tools/build-sounds.mjs` synthesizes them with
`@fz/dev/sounds` (`frontend/lib/dev/src/sounds.ts`): `glide()` is a sine that
slides between two pitches, with a share of its second harmonic;
`envelope(attack, decay)` rises over the attack and then falls to about a third
every `decay`; `thud()` is seeded noise through a one-pole low-pass;
`arpeggio()` strikes a chord a note at a time. Each sound is scaled to its peak
and faded out over its last 10 ms.

| Sound     | Length | Peak | Recipe                                                                                 | Played by                                                                    |
| --------- | ------ | ---- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `fired`   | 0.06 s | 0.18 | A sine sliding 1,400 to 900 Hz in 30 ms, 12 ms decay: a soft tick                      | Each pull of the weapon                                                      |
| `small`   | 0.14 s | 0.45 | A tone falling 520 to 312 Hz with a 40 ms decay, under a knock of noise half as long   | A small rock broken                                                          |
| `medium`  | 0.20 s | 0.50 | The same from 330 to 198 Hz, 60 ms decay                                               | A medium rock broken                                                         |
| `large`   | 0.30 s | 0.60 | The same from 180 to 108 Hz, 90 ms decay: a low thump                                  | A large rock or a boulder broken; a hit a boulder or a large lodestone holds |
| `rung`    | 0.36 s | 0.35 | Two steady sines, 980 Hz (120 ms decay) and 1,531 Hz at 0.6 (70 ms)                    | Iron holding a hit; the Shield spent                                         |
| `blast`   | 0.46 s | 0.80 | A sine falling 150 to 38 Hz over 0.3 s, under a burst of noise                         | A volatile's blast; the Nova                                                 |
| `caught`  | 0.18 s | 0.50 | Two quick rising notes: 600 to 900 Hz, then 900 to 1,350 Hz 60 ms later                | A pickup caught                                                              |
| `dashed`  | 0.26 s | 0.40 | Noise swelling and falling over about 0.12 s, with a faint sine sweeping 300 to 900 Hz | A dash                                                                       |
| `warned`  | 0.42 s | 0.35 | Two soft notes, 880 Hz then 659 Hz 0.18 s later                                        | A comet's warning starting                                                   |
| `lost`    | 0.62 s | 0.65 | A sine falling 440 to 90 Hz over 0.45 s, under a short burst of noise                  | A ship lost                                                                  |
| `cleared` | 0.78 s | 0.50 | Four notes of a major chord, 523, 659, 784 and 1,047 Hz, 80 ms apart                   | A wave cleared                                                               |
| `gained`  | 0.62 s | 0.45 | Three notes, 784, 988 and 1,175 Hz, 70 ms apart                                        | A ship gained                                                                |
| `home`    | 0.30 s | 0.45 | Two notes, 587 Hz then 988 Hz 90 ms later                                              | A stray brought home                                                         |
| `thrust`  | 0.50 s | 0.20 | A loop: sines at 120 and 360 Hz with their second harmonics, over a rumble of noise    | Held while the ship thrusts                                                  |

**How they play.**

- `BeltScene.update()` gathers a frame's sounds in `@fz/core/frame_sounds`'s
  `FrameSounds`: each sound plays **once a frame at most**, at the highest pitch
  any event asked of it, so a dozen breaks in one frame sound as one.
- `SpritePlayer` (`frontend/lib/phaser/src/sound/sprite_player.ts`) plays each
  on pooled sound objects, **at most four of one sound at once**
  (`MOST_AT_ONCE`); a fifth starts the oldest over. The only thing a play is
  given is a `detune` in cents. There is no volume, no pan, no variation from
  play to play, no ducking and no limiter; every sound plays at the loudness it
  was baked at.
- **Pitch** (`detuneOf()`): a broken rock's sound rises a semitone for each
  break before it in its chain (`CHAIN_STEP_CENTS` 100), up to a fifth
  (`CHAIN_MOST_CENTS` 700), which the eighth break reaches. Nothing else is ever
  raised, and a rock a comet smashes counts in no chain.
- **The thrust** is held with `hold()`: the 0.5 s loop plays while the ship
  thrusts and stops when it doesn't. It is the same at any thrust.
- **Mute**: the Sound setting mutes the whole game (`follow()`); there is no
  volume setting. The browser keeps sound locked until the first key or tap.

**The sprite** (`src/scene/sounds/`): `sounds.wav`, a WAV of 16-bit mono PCM at
**16,000 samples a second**, 6.50 s long with 0.1 s of silence between sounds,
**208,044 bytes**; and `sounds.json`, its spritemap, 1,152 bytes, which ships
inside the scene's chunk.

**The sound lab** (`tools/sound-lab.ts`, served only by the dev server at
`sound-lab/`): it holds a candidate designed with ZzFX for six of the fourteen,
`fired`, `small`, `medium`, `large`, `blast` and `thrust`, and none for `rung`,
`caught`, `dashed`, `warned`, `lost`, `cleared`, `gained` or `home`. None of the
candidates is in the sprite. Its five scenes are "Hold fire", "A chain of
breaks", "A boulder to rubble", "A blast in a crowd" and "Thrust and fire". The
lab can vary each play (up to ±60 cents and ±1.5 dB), pan by place and limit the
mix; the game does none of those. Its notes
(`frontend/lib/dev/src/sound_lab_notes.ts`) say why the synth falls short:
nothing above 8 kHz, sines alone, one dull noise smoothed to about 700 Hz, no
effects, one take of each, and recipes tuned without an ear; "the sounds need
designing again".

## 5. The fuzzball, everywhere it appears

| Where                         | What the player sees                                                                               | When                                                    | How big                               |
| ----------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------- |
| The ship's window             | The pilot at the controls, in its ink, upright, its eyes glancing the way the ship heads, blinking | Whenever a ship is on the field                         | 0.81 u across the grid                |
| The bar's Ships figure        | A fuzzball for each ship, the one at the controls first; on a narrow bar, that one and a number    | Always                                                  | 20 CSS px each; 15 px on a narrow bar |
| A stray adrift                | A fuzzball in a color no crew member wears, in a bubble, bobbing, its eyes on the ship             | From wave 3, one at a time                              | 1.78 u in a bubble 2.3 u across       |
| A bail-out                    | The lost ship's pilot floating off in a bubble, blinking out                                       | For 1.4 s after a ship is lost, where motion is welcome | as a stray                            |
| The Paused card               | The strays waiting at home, in a row, with "2 fuzzballs waiting at home"                           | While paused, if any wait                               | 20 CSS px each                        |
| The result card               | Every stray the run brought home, in a row, with "3 fuzzballs brought home"                        | After the run ends, if any                              | 20 CSS px each                        |
| The Extra ship pickup         | The fuzzball's shape, with no eyes, on the pickup's disc                                           | On the pickup, and in How to play                       | 1.3 u across the grid                 |
| How to play, "Stray fuzzball" | A fuzzball in the accent in a bubble                                                               | In the dialog                                           | a picture                             |
| Endless's constellation       | 15 specks and 2 brighter ones in its shape                                                         | Each Endless wave                                       | 10 u across the grid                  |
| The page's icon               | The fuzzball in the palette's accent, as on every page of the site (`@fz/ui`'s `ThemeService`)     | Always                                                  | the tab's icon                        |

The shell draws its fuzzballs with `<app-pilot>`
(`src/app/pilot/pilot.component.ts`), which is `@fz/ui`'s `<fz-fuzzball>`, an
inline SVG of the same shapes, in the ink `pilotInk()` gives. They stand still.
The Ready and Cleared cards show no fuzzball, and the bar does not show the
strays at home.

### What it changes in play

From `src/rules/ship/pilots.ts`, `src/rules/hazards/strays.ts`,
`src/rules/field/field.ts` and `src/rules/field/scoring.ts`:

- **The crew** (`Crew`) is three lists: `flying`, the pilots of the run's ships,
  the one at the controls first; `home`, the strays brought home, in the order
  they came; and `lastGiven`, the color last handed out. A pilot is only a
  color's number, 0 to 7 (`PILOT_COLORS`). A run starts with three ships flown
  by colors 0, 1 and 2 (coral, orange, gold) and no one at home.
- **A pilot does nothing in play.** Every pilot flies the same; its color only
  tells it apart.
- **When strays come.** Waves 1 and 2 send none; every later written wave sends
  one on a field of 40 by 40, and wave 26 three (`STRAYS_FROM`, the waves'
  data); Endless sends one, and two from wave 50. A larger field sends more by
  its area: two on the widest, seven in wave 26. The first comes 6 s after the
  wave's first move on 40 by 40, later by the field's area (13.2 s on the
  widest, `STRAY_FIRST_MS`), and each next one 8 s after the last has gone
  (`STRAY_NEXT_MS`). Only one is adrift at a time.
- **How it crosses.** It comes in off a random edge, 15% to 85% of the way along
  it, heading across within 20 degrees, at **3.2 u/s** (`STRAY_SPEED`), on a
  gentle curve of 2 to 5 degrees a second. It does not wrap. It takes about 13 s
  to cross 40 u and about 28 s to cross 88 u, then it is gone for good. Shots,
  rocks and comets pass through it; nothing can harm it.
- **Bringing one home.** The ship brings a stray home by coming within 2 u of
  its middle (`STRAY_CATCH_REACH`), guarded or not. That does exactly three
  things: it scores **500 points times the chain's multiplier**
  (`STRAY_POINTS`), without counting in the chain or keeping it alive; it adds
  the stray to `crew.home`; and it logs `home`, which plays the `home` sound,
  shows the points, and has the announcer say "Brought home: 2 waiting."
- **What a stray at home does.** It **flies the next ship the run gains**, in
  place of a new pilot (`gainShip()`). That is all. It is **not a ship**: it
  does not add one, does not replace a ship that is lost, and the run ends when
  no one is flying, however many wait at home. It gives no power, no points
  later and no change to the ship it flies. With no one at home, a gained ship
  gets a new pilot in the next color no one wears, so the player sees only a
  different color in the bar.
- **Ships are gained** at 10,000 points and every 20,000 after
  (`FIRST_SHIP_POINTS`, `SHIP_POINTS`), and by the Extra ship pickup, up to six
  (`MAX_SHIPS`). At six, a ship due is not gained, though its mark moves on, and
  the stray stays home.
- **When a ship is lost** (`loseShip()`): the pilot at the controls leaves the
  crew for good (the bail-out is only a flourish; it does not go home), the next
  in line takes the controls, the chain ends, every effect ends, and the
  floating pickups vanish. The stray adrift stays. The next ship comes 1 s
  later, where it is safest, and can't be touched until it moves and for 2 s
  after.
- **The Magnet** draws a stray within 14 u of the ship, the straight way, never
  across an edge, toward it at 10 u/s in place of its own drift (`pullIn()`).
  Without the Magnet nothing draws a stray; the 3 u pull near the ship is the
  pickups' alone.
- **A stray missed** logs no event and costs nothing. One adrift as the wave is
  cleared is let go, and strays the wave had not yet sent never come.
- **Records** (`src/rules/run/stats.ts`): the strays brought home are counted
  for each speed, all told, and stored; no screen of the game shows the count.

## 6. The field's HUD and cards

**On the field** there is no score, no ship count, no chain meter and no wave
banner. What the canvas draws of the game's state is: the effect tags at the
bottom left; the points popping up where they are scored; a comet's warning at
its edge; the guard and Shield rings round the ship; and, on a touch screen,
Dash's recharge on the deck. With a mouse the pointer is a crosshair.

**The bar** (`src/app/bar/`), in HTML above or beside the field: the game's
name, the speed as a menu, then the figures. Where there is room: Wave (a flag
icon and the number), Score (an asteroid icon, grouped in thousands), Ships (a
fuzzball for each), and Chain ("×2", "×3" or "×4"), which shows only while the
chain multiplies. On a narrow bar: Score and Ships alone, the ships as one
fuzzball and a number. Then Pause, Sound, Sectors, New game, How to play and
Settings.

**The cards** over the field (`src/app/board/board_card.component.*`,
`src/app/result/`), all HTML:

| Card    | Shows                                                                                                                                                                                                                                                        |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Ready   | "Wave 4: Thaw" and how to fly ("Arrows or W A D to fly, Space to fire.", or the pads' words on a touch screen); while a wave waits for the first move                                                                                                        |
| Paused  | "Paused", "Score 4,250", the strays at home with their count, and Resume                                                                                                                                                                                     |
| Cleared | "Wave 4 cleared" (or a trophy and "Storm cleared. Endless begins."), the tally, "Score 4,250", "Move or fire for wave 5.", and Next wave                                                                                                                     |
| Result  | A dialog: "Game over", "Lost on wave 12, at Normal speed", badges "New best" (with a trophy) and "Cleared all thirty", the figures Score, Best, Wave and Cleared, the strays brought home, and Try again from the run's first sector, Choose a sector, Close |
| Ended   | Once the result is put away: "Lost on wave 12", the score, and New game                                                                                                                                                                                      |

The Cleared card's tally (`src/view/tally.ts`) has five lines, always all five:
Rocks, Chains, Strays brought home, Wave cleared, No ship lost. The numbers
appear at once; nothing counts up.

**The announcer** (`src/rules/run/describe.ts`), for a screen reader: "Wave 4,
Thaw. 4 rocks."; "A stray fuzzball drifts in."; "Brought home: 2 waiting.";
"Extra ship, flown by a fuzzball brought home. 4 ships."; "Ship lost. 2 ships
left."; a pickup's name as it is caught; "Wave 4 cleared! Score 4,250."; "Storm
cleared! Endless begins."; "Paused, with a score of …"; "Going on."; "Game over.
Score …, on wave 12. A new best!". A pilot's color is never said.

## 7. Palettes

`frontend/lib/style/src/themes.ts` (`THEMES`) and
`frontend/lib/style/src/tokens/_palettes.scss`. There are four; a light system
starts on Classic felt and a dark one on Casino night. `FIELD_ROLES`
(`src/app/board/field_roles.ts`) names the eight roles the field takes:

| Id         | Name          | Mode  | `field`   | `field-line` | `field-text` | `field-muted` | `accent`  | `on-accent` | `danger`  | `warning` |
| ---------- | ------------- | ----- | --------- | ------------ | ------------ | ------------- | --------- | ----------- | --------- | --------- |
| `classic`  | Classic felt  | light | `#ffffff` | `#e2e5e9`    | `#1b1f24`    | `#5d6672`     | `#2f7d4f` | `#ffffff`   | `#c62828` | `#a84b06` |
| `pastel`   | Soft pastel   | light | `#ffffff` | `#e2dcf0`    | `#2b2240`    | `#6a6080`     | `#6d3fc8` | `#ffffff`   | `#c0265a` | `#964a00` |
| `casino`   | Casino night  | dark  | `#1c2329` | `#2a333b`    | `#eceff1`    | `#9aa5af`     | `#e0b13a` | `#1a1300`   | `#f47c74` | `#f39a4b` |
| `midnight` | Midnight blue | dark  | `#172741` | `#24395c`    | `#e6edf7`    | `#93a4bd`     | `#4cc3ff` | `#062033`   | `#ff8080` | `#fbbf24` |

The page behind the field and the bar are `#ffffff`, `#f4f1fb`, `#101418` and
`#0e1a2b` in the same order.

What each role paints (`beltPalette()` in `src/view/colors/palette.ts`):

| Role            | Paints                                                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `field`         | The field; every outline; every rock's marks and damage; the ship's window                                                                        |
| `field-line`    | The frame, the tags' rings, the deck's rings at rest                                                                                              |
| `field-text`    | The shots and the points; mixed over the field, a stray's bubble (6%), its rim (50%) and the deck's discs (5%)                                    |
| `field-muted`   | The specks (at a third over the field), the constellation's eyes, the deck's symbols at rest                                                      |
| `accent`        | The ship, every pickup, the guard and Shield rings, the tags' symbols, the rings of the Nova, a spent Shield and a lost ship, a lost ship's burst |
| `on-accent`     | A pickup's symbol                                                                                                                                 |
| `danger`        | The comet and its warning                                                                                                                         |
| `warning`       | The flame, the exhaust, a held hit's spark, a blast's ring                                                                                        |
| white `#ffffff` | A held hit's flash, the glint on a bubble and in the eyes                                                                                         |

The mixed colors come to:

| Palette  | Speck     | Bubble    | Bubble's rim | Deck's discs |
| -------- | --------- | --------- | ------------ | ------------ |
| classic  | `#c9ccd0` | `#f1f2f2` | `#8d8f92`    | `#f4f4f4`    |
| pastel   | `#cdcad5` | `#f2f2f4` | `#9591a0`    | `#f4f4f5`    |
| casino   | `#464e56` | `#282f35` | `#84898d`    | `#262d33`    |
| midnight | `#40516a` | `#23334c` | `#7f8a9c`    | `#21314a`    |

**The pilots' inks**, by a pilot's number (`FUZZBALL_INKS` in
`frontend/lib/phaser/src/color/inks.ts`); the eyes are `#14171b` on every one:

| #   | Color  | Light palettes | Dark palettes |
| --- | ------ | -------------- | ------------- |
| 0   | Coral  | `#d33f37`      | `#ff7b70`     |
| 1   | Orange | `#c05a0c`      | `#ff9b45`     |
| 2   | Gold   | `#957000`      | `#f2cb45`     |
| 3   | Green  | `#2c8a3a`      | `#72d36a`     |
| 4   | Teal   | `#0f8378`      | `#3fd2c2`     |
| 5   | Blue   | `#2c72d6`      | `#72adff`     |
| 6   | Violet | `#8b55dc`      | `#b892ff`     |
| 7   | Pink   | `#c83a8e`      | `#ff7dc3`     |

**The rocks' inks** (`src/view/colors/inks.ts`), the game's own, one set for
light palettes and one for dark:

| Kind            | Light palettes | Dark palettes |
| --------------- | -------------- | ------------- |
| Stone           | `#8b7f70`      | `#a99d8e`     |
| Ice             | `#3f88ad`      | `#86cdee`     |
| Crystal's gem   | `#7a4fd0`      | `#b99cff`     |
| Iron            | `#4d5866`      | `#8e9cab`     |
| Volatile        | `#c4452c`      | `#f0886a`     |
| Lodestone       | `#9a3456`      | `#e57d9c`     |
| Boulder         | `#6e6255`      | `#c4b6a3`     |
| Volatile's core | `#ffd27a`      | `#ffe6a8`     |

**What `src/view/colors/contrast.spec.ts` holds**, in every palette, at 3:1 or
more (WCAG's bar for graphics): each rock's ink, the ship, a pickup, the comet,
the shots, the flame and a bubble's rim against the field; the outline against
each thing it outlines; the marks against every rock; a pickup's symbol against
the pickup; each pilot's ink against the field, a stray's bubble and the bar;
the eyes against each pilot's ink; and the deck's symbols and knob against the
deck. Any new color for one of these must pass the same in all four palettes,
light and dark.

## 8. Rules and numbers a designer needs

### Tuning

`src/rules/tuning.ts`; lengths in u, speeds in u/s. The field steps 120 times a
second.

| What                    | Value                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Ship: thrust, top speed | 24 u/s², 15 u/s                                                                                                                             |
| Ship: coasting          | Its speed halves every 1.5 s                                                                                                                |
| Ship: turning           | 300°/s by keys; up to 600°/s toward the stick or the mouse                                                                                  |
| Dash                    | 34 u/s for 220 ms (about 7.5 u); untouchable for 320 ms; recharges in 2.5 s; leaves 4 u/s more along the heading                            |
| Shots                   | 32 u/s plus the ship's own speed; they live 0.8 s; radius 0.18 u                                                                            |
| Gun                     | A shot every 140 ms, 6 in flight                                                                                                            |
| Rock speeds, by size    | Boulder 1.5 to 2.5; large 2.5 to 4; medium 4 to 6; small 5.5 to 8.5; times its kind's, the wave's pace and the speed's                      |
| A broken rock's pieces  | Turned 25 to 50° off its travel, pushed 1.5 u/s along the blow                                                                              |
| Rock cap                | 48 on 40 by 40, more by the field's area (105 on 88 by 40)                                                                                  |
| Fair start              | No rock starts within 12 u of the ship, or comes within 5 u in its first 3 s                                                                |
| Pickups                 | Drift 2 u/s; live 8 s, blinking the last 2; drawn in from 3 u at 10 u/s; caught within 2 u; chance lets no more go once 2 float on 40 by 40 |
| Drought                 | After 25 s with no pickup, the next large rock broken lets one go                                                                           |
| Ships                   | 3 to start, 6 at most; the next comes 1 s after a loss, untouchable 2 s after it moves                                                      |
| Strays                  | From wave 3; first at 6 s, next 8 s after the last; 3.2 u/s; bubble 1.15 u; caught within 2 u                                               |
| Comets                  | Warned for 1.5 s; 26 u/s times the pace; meets things within 1 u; comes in up to 30° off straight across                                    |
| Chain                   | The next break must come within 1.5 s; ×2 from the 5th break, ×3 from the 10th, ×4 from the 20th                                            |
| Points                  | Stray 500; wave cleared 500; no ship lost 500 more; a ship at 10,000 and every 20,000 after                                                 |

### The rocks (`src/rules/catalog/rocks.ts`)

| Kind      | Hits (L, M, S) | Breaks into                                                 | Speed | Points (L, M, S) | What else                                                                                                 |
| --------- | -------------- | ----------------------------------------------------------- | ----- | ---------------- | --------------------------------------------------------------------------------------------------------- |
| Stone     | 1, 1, 1        | 2 of itself, a size down                                    | ×1    | 10, 20, 40       |                                                                                                           |
| Crystal   | 1, 1, none     | 2 stones                                                    | ×1    | 20, 40           | Always lets a pickup go                                                                                   |
| Ice       | 1, 1, 1        | 3 of itself                                                 | ×1.25 | 15, 30, 50       |                                                                                                           |
| Boulder   | 6 (one size)   | 3 large rocks of the wave's kind: stone, or iron in wave 20 | ×1    | 200              | Ends each sector                                                                                          |
| Iron      | 3, 2, 1        | 2 of itself                                                 | ×0.75 | 30, 60, 90       | Rings a shot off while it holds                                                                           |
| Volatile  | 1, 1, none     | nothing                                                     | ×0.9  | 40, 60           | 90 ms after it breaks, every rock within 6 u (large) or 4 u (medium) takes a hit; it never hurts the ship |
| Lodestone | 2, 1, 1        | 2 of itself                                                 | ×1    | 25, 50, 80       | Drifts toward the ship, 1 u/s faster each second, up to its size's top speed                              |

### The pickups and the weapons (`src/rules/catalog/pickups.ts`, `weapons.ts`)

| Pickup     | Weight | From wave | Group    | Effect                                                                                      |
| ---------- | ------ | --------- | -------- | ------------------------------------------------------------------------------------------- |
| Spread     | 10     | 2         | `weapon` | Three shots a pull, 12° apart, 18 in flight, for 12 s                                       |
| Rapid      | 9      | 2         | `weapon` | A shot every 70 ms, 12 in flight, for 12 s                                                  |
| Shield     | 7      | 2         | `guard`  | The next rock or comet to touch the ship breaks a size down instead; lasts until it is used |
| Extra ship | 1      | 5         | `ship`   | One more ship, at once                                                                      |
| Lance      | 6      | 6         | `weapon` | A shot flies on through up to three rocks it breaks, for 10 s                               |
| Magnet     | 5      | 6         | `pull`   | Pickups and strays are drawn in from 14 u, for 15 s                                         |
| Slow       | 5      | 8         | `pace`   | Rocks and comets at half speed, for 8 s                                                     |
| Nova       | 4      | 9         | `nova`   | Every rock within 12 u of the ship takes a hit, at once                                     |

One effect of each group runs at a time; catching another of the group replaces
it. Five of the eight are timed, the Shield lasts until used, and two are over
as they start. Every effect ends, and every floating pickup goes, when a ship is
lost or the wave is cleared. A broken rock lets a pickup go by the sector's
chance (4%, 5%, 6%, section 9), a crystal always, drawn by weight from the
wave's pool.

### The events the field logs (`src/rules/field/events.ts`)

Every `FieldEvent` has a `serial`, a `kind` and a place (`x`, `y`); the scene
and the shell each read the log from the last event they read. A new kind must
be given its effects in `EVENT_EFFECTS` or the game won't compile.

| Kind       | Logged when                                          | What else it carries                                                                      |
| ---------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `fired`    | The ship fires a pull (one event for Spread's three) |                                                                                           |
| `dashed`   | A dash starts                                        | `wayX`, `wayY`: its heading                                                               |
| `shielded` | A rock or comet touches the shielded ship            |                                                                                           |
| `nova`     | The Nova goes off, at the ship                       | `reach`                                                                                   |
| `warned`   | A comet's warning begins, at the edge                |                                                                                           |
| `cleared`  | The last rock goes, at the field's middle            |                                                                                           |
| `hit`      | A rock takes a hit and holds                         | `rock`, `size`, `slot`                                                                    |
| `rung`     | Iron takes a hit and holds (with its `hit`)          | `rock`, `size`, `slot`                                                                    |
| `broken`   | A rock breaks                                        | `rock`, `size`, `slot`, `chain` (0 if a comet smashed it), `wayX`, `wayY`: the blow's way |
| `blast`    | A broken volatile goes off                           | `rock`, `size`, `slot`, `reach`                                                           |
| `dropped`  | A broken rock lets a pickup go                       | `pickup`                                                                                  |
| `caught`   | The ship catches a pickup                            | `pickup`, `ships`, `waiting`                                                              |
| `faded`    | A pickup's 8 s run out                               | `pickup`                                                                                  |
| `lost`     | A rock or comet takes the ship                       | `pilot`, `ships` left, `waiting`                                                          |
| `strayed`  | A stray comes in, at the edge                        | `pilot`, `ships`, `waiting`                                                               |
| `home`     | The ship brings a stray home                         | `pilot`, `ships`, `waiting`                                                               |
| `gained`   | The crew gains a ship                                | `pilot`, `fromHome`, `ships`, `waiting`                                                   |
| `scored`   | A break or a stray scores                            | `points` before the multiplier, `times`                                                   |

**Nothing is logged** when: a stray leaves unrescued or is let go as the wave
clears; a comet comes onto the field after its warning, or leaves; an effect
ends; pickups vanish as a ship is lost; the next ship arrives; a guard ends; the
dash is charged again; a chain reaches a new multiplier, or runs out; a
volatile's 90 ms fuse starts; a shot fades; the wave starts.

### Formations, speeds, scoring, the debug menu

- **Formations** (`src/rules/field/spawn.ts`): `scatter`, each rock at a random
  place and heading; `ring`, evenly round an ellipse about the ship, all flying
  along it one way; `wall`, a line across the short side, half the long side
  from the ship, all flying one way at one speed; `cluster`, packed on a spiral
  half the long side away, all flying one heading. Every wave starts with the
  ship in the middle, waiting, and holds still until the player's first move.
- **Speeds** (`src/rules/speed.ts`): Relaxed, rocks and comets at ×0.8, comets
  half as often, pickups ×1.25 as likely; Normal, ×1; Fast, rocks and comets at
  ×1.2. The ship, its shots and the strays are the same at every speed.
- **Scoring** (`src/rules/field/scoring.ts`): a break scores its rock's points
  times the chain's multiplier, counted from the break itself; the chain ends
  when a ship is lost; a comet's smash scores nothing and lets no pickup go;
  clearing adds 500, and 500 more with no ship lost.
- **The debug menu** (`src/view/debug_tuning.ts`, at `?debug`): eight sliders,
  thrust (8 to 60), top speed (6 to 30), coasting's half-life (0.3 to 6 s),
  turning by keys (120 to 600°/s), turning toward a heading (180 to 1,440°/s),
  shot speed (16 to 60), a shot every (60 to 400 ms) and the rocks' speed (×0.5
  to ×2), and a switch for whether shots carry the ship's speed. A run flown on
  tuned numbers keeps no records.

## 9. The waves

`src/rules/waves/inner-belt.json`, `iron-reach.json` and `storm.json`. Counts
are for a field of 40 by 40; a larger field lays more by its area (×2.2 on 88 by
40, `src/rules/field/fill.ts`). L, M and S are large, medium and small. The
formation is a scatter unless the table says. A sector's chance of a pickup from
each broken rock is 4% in the Inner belt, 5% in the Iron reach and 6% in the
Storm. "First three" is Spread, Rapid and Shield; "all" is all eight.

| #   | Name             | Sector     | Rocks                                                                  | Formation | Pace  | Pickups                 | Strays | Comets every |
| --- | ---------------- | ---------- | ---------------------------------------------------------------------- | --------- | ----- | ----------------------- | ------ | ------------ |
| 1   | First light      | Inner belt | 3 stone L                                                              |           | 1.00  | none                    | 0      |              |
| 2   | Gem              | Inner belt | 3 stone L, 1 crystal L                                                 |           | 1.01  | first three             | 0      |              |
| 3   | Adrift           | Inner belt | 4 stone L                                                              |           | 1.02  | first three             | 1      |              |
| 4   | Thaw             | Inner belt | 2 ice L, 2 stone L                                                     |           | 1.03  | first three             | 1      |              |
| 5   | Hail             | Inner belt | 4 ice L                                                                |           | 1.04  | first three, Extra ship | 1      |              |
| 6   | Scatter          | Inner belt | 14 stone M, 2 crystal M                                                |           | 1.05  | Lance, Magnet only      | 1      |              |
| 7   | Crossing         | Inner belt | 4 stone L, 2 ice L                                                     | wall      | 1.06  | all but Slow, Nova      | 1      |              |
| 8   | Frost            | Inner belt | 4 ice L, 1 crystal L                                                   |           | 1.065 | Slow only               | 1      |              |
| 9   | Crowd            | Inner belt | 9 stone L                                                              |           | 1.07  | Nova only               | 1      |              |
| 10  | Boulder          | Inner belt | 1 boulder, 4 stone L, 2 ice L                                          |           | 1.08  | all                     | 1      |              |
| 11  | Ore              | Iron reach | 3 iron L, 5 stone L                                                    |           | 1.08  | all                     | 1      |              |
| 12  | Powder           | Iron reach | 4 volatile M, 9 stone L                                                | cluster   | 1.09  | all                     | 1      |              |
| 13  | Streak           | Iron reach | 9 stone L                                                              |           | 1.095 | all                     | 1      | 14 to 18 s   |
| 14  | Anvil            | Iron reach | 7 iron L, 1 crystal L                                                  |           | 1.10  | all                     | 1      |              |
| 15  | Fuse             | Iron reach | 8 volatile L, 5 ice L                                                  | ring      | 1.11  | all                     | 1      |              |
| 16  | Shower           | Iron reach | 5 ice L                                                                |           | 1.12  | all                     | 1      | 9 to 12 s    |
| 17  | Foundry          | Iron reach | 4 volatile M, 8 iron L                                                 | cluster   | 1.13  | all                     | 1      |              |
| 18  | Rush             | Iron reach | 8 stone M, 7 ice M, 7 iron M                                           |           | 1.14  | all                     | 1      |              |
| 19  | Tinder           | Iron reach | 3 volatile L, 8 stone L, 2 iron L, 2 ice L                             |           | 1.15  | all                     | 1      | 12 to 15 s   |
| 20  | Iron heart       | Iron reach | 1 boulder (breaks into iron), 6 iron L, 2 stone L                      |           | 1.16  | all                     | 1      |              |
| 21  | Lodestar         | Storm      | 5 lodestone L, 5 stone L                                               |           | 1.16  | all                     | 1      |              |
| 22  | Whiteout         | Storm      | 6 ice L                                                                |           | 1.17  | all                     | 1      | 10 to 13 s   |
| 23  | Gauntlet         | Storm      | 5 iron L, 4 lodestone L                                                |           | 1.18  | all                     | 1      |              |
| 24  | Wildfire         | Storm      | 7 volatile L, 7 ice L                                                  |           | 1.19  | all                     | 1      |              |
| 25  | Swarm            | Storm      | 22 stone S, 22 ice S                                                   |           | 1.20  | all                     | 1      |              |
| 26  | Lost and found   | Storm      | 4 stone L, 2 ice L, 2 iron L, 2 lodestone L                            |           | 1.21  | all                     | 3      |              |
| 27  | Pull             | Storm      | 7 lodestone L                                                          |           | 1.22  | all                     | 1      | 8 to 11 s    |
| 28  | Bulwark          | Storm      | 8 iron L, 2 crystal L                                                  |           | 1.23  | all                     | 1      |              |
| 29  | Tempest          | Storm      | 3 stone L, 1 crystal L, 3 ice L, 3 iron L, 2 volatile L, 1 lodestone L |           | 1.24  | all                     | 1      | 9 to 12 s    |
| 30  | Eye of the storm | Storm      | 2 boulders, 2 stone L, 2 ice L, 2 iron L, 3 volatile L, 2 lodestone L  |           | 1.25  | all                     | 1      | 10 to 13 s   |

Seven of the thirty have comets, four are not scattered, and no wave differs
from another in anything but these columns: no wave or sector has art, color or
sound of its own.

**Endless** (`src/rules/waves/endless.ts`), from wave 31, made from the run's
seed and the wave's number:

- A budget of rocks worth 10 large stones at wave 31, half a stone more each
  wave, up to 24 at wave 59; one large crystal always; the rest drawn alike from
  large stone, large ice, two medium volatiles, large lodestone and large iron,
  iron taking at most a third.
- Boulders every tenth wave: one at 40, two at 50, three at 60 and every tenth
  after.
- The pace climbs from 1.25 by 0.015 a wave to 1.6 (wave 55). Comets come in
  every wave, every 12 to 15 s at wave 31, closing to every 6 to 8 s by wave 60.
- One stray, two from wave 50; all eight pickups at 6%; the formation drawn from
  the four, but a scatter or a wall for boulders or more than 13 rocks.
- It holds at wave 60's numbers and never ends. Its only art of its own is the
  constellation.

## 10. The autopilot's figures

Run on 2026-11-14 from `frontend/games/asteroid-breaker/`; both exited with 0.
The autopilot (`src/testing/autopilot.ts`) plays each wave once at each speed,
from the wave's number as its seed. `time` is the game time to clear it with
nothing able to take the ship; `lost` is the ships lost when the same play is
flown for real; `home` is the strays brought home of those sent. A person aims
worse and takes longer.

`yarn report:waves` (the narrowest field, 40 by 40):

```text
                      relaxed             normal              fast
                       time  lost  home    time  lost  home    time  lost  home
 1 First light         0:07     0   0/0    0:07     0   0/0    0:07     0   0/0
 2 Gem                 0:11     0   0/0    0:08     0   0/0    0:12     0   0/0
 3 Adrift              0:11     0   1/1    0:09     0   1/1    0:10     0   1/1
 4 Thaw                0:14     0   1/1    0:11     0   1/1    0:10     0   1/1
 5 Hail                0:12     0   1/1    0:16     0   1/1    0:14     0   1/1
 6 Scatter             0:14     0   1/1    0:15     0   1/1    0:16     0   1/1
 7 Crossing            0:14     0   1/1    0:20     0   1/1    0:15     0   1/1
 8 Frost               0:17     0   1/1    0:19     0   1/1    0:19     0   1/1
 9 Crowd               0:16     0   1/1    0:20     0   1/1    0:17     0   1/1
10 Boulder             0:16     0   1/1    0:22     0   1/1    0:22     0   1/1
11 Ore                 0:19     0   1/1    0:18     0   1/1    0:21     0   1/1
12 Powder              0:18     0   1/1    0:18     0   1/1    0:14     0   1/1
13 Streak              0:14     0   1/1    0:20     0   1/1    0:13     0   1/1
14 Anvil               0:15     0   1/1    0:19     0   1/1    0:16     0   1/1
15 Fuse                0:12     0   1/1    0:11     0   1/1    0:21     0   1/1
16 Shower              0:21     0   1/1    0:13     0   1/1    0:21     0   1/1
17 Foundry             0:13     1   1/1    0:17     0   1/1    0:20     0   1/1
18 Rush                0:17     0   1/1    0:20     0   1/1    0:21     0   1/1
19 Tinder              0:20     0   1/1    0:27     0   1/1    0:26     0   1/1
20 Iron heart          0:18     0   1/1    0:16     0   1/1    0:19     0   1/1
21 Lodestar            0:18     0   1/1    0:24     0   1/1    0:22     1   1/1
22 Whiteout            0:18     0   1/1    0:20     0   1/1    0:21     1   1/1
23 Gauntlet            0:18     0   1/1    0:22     0   1/1    0:30     0   1/1
24 Wildfire            0:21     0   1/1    0:23     0   1/1    0:31     0   1/1
25 Swarm               0:13     0   1/1    0:12     0   1/1    0:12     0   1/1
26 Lost and found      0:23     0   2/2    0:29     0   3/3    0:27     0   2/2
27 Pull                0:15     0   1/1    0:13     0   1/1    0:14     0   1/1
28 Bulwark             0:23     0   1/1    0:24     0   1/1    0:29     0   1/1
29 Tempest             0:22     0   1/1    0:16     0   1/1    0:23     1   1/1
30 Eye of the storm    0:21     0   1/1    0:20     0   1/1    0:25     0   1/1
```

`yarn report:waves --field wide` (the widest field, 88 by 40):

```text
                      relaxed             normal              fast
                       time  lost  home    time  lost  home    time  lost  home
 1 First light         0:20     0   0/0    0:24     0   0/0    0:23     0   0/0
 2 Gem                 0:24     0   0/0    0:25     0   0/0    0:25     0   0/0
 3 Adrift              0:20     0   1/1    0:21     0   1/1    0:23     0   1/1
 4 Thaw                0:24     0   1/1    0:35     0   2/2    0:24     0   1/1
 5 Hail                0:39     0   2/2    0:43     0   2/2    0:44     0   2/2
 6 Scatter             0:37     0   2/2    0:32     0   2/2    0:39     0   2/2
 7 Crossing            0:39     0   2/2    0:41     0   2/2    0:41     0   2/2
 8 Frost               0:51     0   2/2    0:55     0   2/2    0:54     0   2/2
 9 Crowd               0:41     0   2/2    0:40     0   2/2    0:48     0   2/2
10 Boulder             0:46     0   2/2    0:47     0   2/2    0:47     1   2/2
11 Ore                 0:42     0   2/2    0:32     0   2/2    0:35     0   2/2
12 Powder              0:33     0   2/2    0:32     0   2/2    0:40     1   2/2
13 Streak              0:37     0   2/2    0:37     0   2/2    0:46     0   2/2
14 Anvil               0:42     0   2/2    0:48     0   2/2    0:40     0   2/2
15 Fuse                0:37     0   2/2    0:38     0   2/2    0:39     0   2/2
16 Shower              0:36     0   2/2    0:42     0   2/2    0:40     0   2/2
17 Foundry             0:41     1   2/2    0:45     0   2/2    0:52     0   2/2
18 Rush                0:42     0   2/2    0:51     0   2/2    0:44     0   2/2
19 Tinder              0:56     0   2/2    0:58     0   2/2    0:54     0   1/2
20 Iron heart          0:45     0   2/2    0:56     0   2/2    0:51     0   2/2
21 Lodestar            0:41     0   2/2    0:39     0   2/2    0:51     0   2/2
22 Whiteout            0:52     0   2/2    0:43     0   2/2    0:33     0   2/2
23 Gauntlet            0:46     0   2/2    0:45     0   2/2    0:49     0   2/2
24 Wildfire            0:43     0   2/2    0:51     0   2/2    0:54     0   2/2
25 Swarm               0:39     0   2/2    0:36     0   2/2    0:36     0   2/2
26 Lost and found      0:52     0   4/4    1:03     0   5/5    0:50     0   4/4
27 Pull                0:29     0   2/2    0:30     0   2/2    0:32     0   2/2
28 Bulwark             0:52     0   2/2    0:53     0   2/2    0:50     0   2/2
29 Tempest             0:43     0   2/2    0:56     0   2/2    0:57     0   2/2
30 Eye of the storm    1:03     0   2/2    0:53     1   2/2    1:01     0   2/2
```

What stands out. Waves are short: on the narrowest field every one is cleared in
7 to 31 s, the shortest First light (0:07 at every speed) and the longest
Wildfire at Fast (0:31); on the widest they take 0:20 (First light and Adrift at
Relaxed) to 1:03 (Lost and found at Normal, Eye of the storm at Relaxed), about
twice as long for 2.2 times the rocks. The climb is uneven: Swarm (0:12 to 0:13)
and Pull (0:13 to 0:15) on the narrow field take about half the time of the
waves beside them, and Fuse at Normal (0:11) is as short as Thaw; on the wide
field Pull (0:29 to 0:32) is the shortest wave after the first four, Frost (0:51
to 0:55) stands well above the waves beside it, and Tinder (0:54 to 0:58) is the
longest of the Iron reach. Ships are rarely lost: 4 of 90 plays on each field
lose one, none loses two, and they fall where they like (Foundry at Relaxed on
both fields; Lodestar, Whiteout and Tempest at Fast on the narrow; Boulder and
Powder at Fast and Eye of the storm at Normal on the wide). Strays are no
challenge to the autopilot: it brings home every stray sent in all but one play
(Tinder at Fast on the wide field, 1 of 2). But many are never sent, because the
wave is cleared first: Lost and found sends 2 or 3 of its 3 on the narrow field
and 4 or 5 of its 7 on the wide, and Adrift and Thaw mostly send 1 of the wide
field's 2. These are one seed each; the script's `--seeds` plays more, and the
archived plan's figures are the middle of twelve.

## 11. What stands out as weak or missing

Observations from the code, not opinions about taste.

**Events with nothing of their own.**

- `dropped`, `faded` and `strayed` play no sound and no flourish. A pickup
  appears and vanishes silently; a stray drifts in with no cue but the
  announcer's words, which only a screen reader says.
- `fired`, `caught`, `home`, `gained`, `warned` and `cleared` play a sound and
  no flourish. A pickup caught just goes; a stray brought home just goes, with
  its points; a gained ship shows only as one more fuzzball in the bar; a
  cleared wave shows nothing on the field before its card.
- Nothing at all marks: an effect ending (the tag's ring empties and the weapon
  is the gun again), the dash charged again (off the deck there is no sign), the
  next ship arriving, a guard ending, a chain reaching ×2, ×3 or ×4 or running
  out, a volatile's fuse, a stray leaving, or a run's last ship as against any
  other.

**Sounds shared by unrelated events.**

- `rung` is both iron holding a hit and the Shield being spent (the code's own
  comment: "The plan's sounds name none for it").
- `blast` is both a volatile's blast and the Nova.
- `large` is a large rock, a boulder (six hits, 200 points) and every hit a
  boulder holds, so the five hits before a boulder breaks sound the same as its
  breaking.
- A rock a comet smashes sounds as one the player broke. A comet itself makes no
  sound once its warning has played. The game's end sounds as any ship lost.
- A chain's pitch stops rising at its 8th break, before the ×3 at the 10th and
  the ×4 at the 20th.
- No play is varied, panned or limited, and the gun's tick is one sample
  repeated seven times a second. Six ZzFX candidates sit in the sound lab
  unused.

**Things drawn the same everywhere.**

- The field is one flat color with the same specks in every wave and sector; the
  three sectors and Endless differ only in their rocks and numbers (Endless adds
  the constellation).
- Every shot is the same capsule, whatever the weapon; the ship looks the same
  with any weapon; all eight pickups are the same hexagon in the same color.
- Shards are 4 to 7 of one triangle for any rock, from a small stone to a
  boulder; a boulder's break has the same sound, kick and shards as a large
  rock's.
- Every rock is one flat ink with marks in the field's color; nothing on the
  field has shading, a gradient, a glow or a shadow, as the drawing vocabulary
  has none.

**Mechanics with little or no feedback.**

- The Magnet and Slow show only as a tag at the bottom left; nothing on the
  ship, the pickups or the rocks changes. A lodestone's pull and a Lance's
  piercing show nothing.
- A comet's smash scores nothing and shows as any break.
- The chain shows only in the bar (and not on a narrow bar) and in the "×2" of a
  points label.
- Haptics are two buzzes. Where motion isn't welcome, a blast, the Nova and a
  lost ship play no flourish at all.
- The result card opens 0.5 s after the last ship is lost, over the pilot's 1.4
  s bail-out (the archived plan lists it as left open).

**Where the fuzzball could react and doesn't.**

- The mark has one face. The pilot's eyes follow the heading and blink on a
  clock; they do not react to firing, a dash, a hit, a near miss, the Shield
  going, a pickup, a chain, a stray nearby or a wave cleared.
- A stray watches the ship and bobs; it does not react to the ship coming near,
  the Magnet's pull, being caught or being missed, and its bubble never changes
  or pops.
- The crew in the bar are still icons; they do not react to a ship lost or
  gained. The strays at home are seen only on the Paused card.
- A stray brought home changes nothing in the wave it is caught in but 500
  points, and afterward only the color of the next ship's pilot.
- The seated pilot is 5 to 14 CSS px across, so on a phone it is a dot with two
  eyes.

**Numbers that look untuned** (the archived plan's "As built" says the feel is
"settled 'for now'" on first guesses, and that "sound and haptics are untried by
ear and hand"):

- First guesses nothing else settled: the speeds' factors, the dash's carry (4
  u/s), a lodestone's pull (1), a rock's spin and a piece's push, the Shield's 1
  s and the comet's reach.
- Five waves dip under the climb (Scatter, Powder, Fuse, Swarm, Pull), which the
  tables above still show for Fuse, Swarm and Pull.
- The strays a larger field grows to mostly go unsent; clusters pack close on a
  phone.
- A comment in `art.ts` calls `FLOURISH.speck` a speck's size "at its largest",
  but every speck is drawn at that one size.

## 12. Where a later progression system could attach

Facts only.

- **Numbers that are already values of a field, not constants.** The debug
  menu's `Feel` (`src/view/debug_tuning.ts`) is nine of them: `thrust`,
  `topSpeed`, `coastHalfLifeMs`, `keyTurnRate`, `headingTurnRate` (the field's
  `flight`), `shotSpeed`, `gunEveryMs`, `carryShip` (its `gunnery`) and
  `rockSpeed`. A wave's setup can hand them in (`WaveSetup.flight`, `.gunnery`,
  `.rockSpeed` in `src/rules/field/field.ts`) and `tuneField()` changes them in
  play. Today a run flown on any but `tuning.ts`'s is marked `tuned` and keeps
  no records.
- **Other state a field already changes in play**: `weapon` (a `WeaponId`),
  `shielded`, `pullReach` (3, or the Magnet's 14), `pace` (the wave's, or half
  under Slow), and `effects`, one slot for each of the six groups.
- **What a wave's setup carries** (`FieldSetup`): its size, rock cap, seed,
  pace, the kind its boulders break into, its chance and pool of pickups, how
  many float at once, its strays and when the first comes, its comets' timing,
  and from the run its crew, points banked and next ship's mark.
- **Still constants read straight from `tuning.ts`**: everything about the dash,
  the ship's hit radius, a shot's life and radius, the pickups' life, pull and
  catch, the strays' speed, reach and points, the comets, the chain's ladder and
  window, the points for clearing, the ships to start and at most, and every
  guard's length.
- **The catalogs** (`src/rules/catalog/`), each a typed table whose ids are
  types: `WEAPONS` (four, each `count`, `spreadDeg`, `everyMs`, `inFlight`,
  `breaks`); `PICKUPS` (eight, each a `weight`, a first wave and an `effect`
  whose `kind` is its group, with what each kind does as it starts and ends in
  `EFFECT_RULES`); `ROCK_KINDS` (seven, each with hits, pieces, speed, points
  and traits, four traits in `TRAIT_RULES`: `blasts`, `gives`, `drawn`,
  `rings`). A kind without its rule fails to compile. The game's
  `asteroid-breaker-content` skill
  (`.agents/skills/asteroid-breaker-content/SKILL.md`) says what adding each
  takes.
- **A `Run`** (`src/rules/run/run.ts`) carries: `id`, `seed`, `speed`,
  `firstWave`, `wave`, `banked`, `score`, `crew`, `nextShipAt`, `straysBanked`,
  `strays` and `outcome`. It has no inventory, level, currency or choice of any
  kind. Each wave's field is made afresh from the run and the wave; nothing but
  the crew, the points and the next ship's mark passes from one wave to the
  next.
- **The crew** holds only colors: who flies, who waits at home, and the color
  last given.
- **A saved game** (`SavedGame`, version 1, `src/rules/run/saved_game.ts`) keeps
  the run's fields above, the crew's three lists, each stray brought home,
  `tuned`, and the wave's field (its sizes, rocks and counts). It does not keep
  the stray adrift, the comets, the pickups, the shots, the effects in play or
  the chain. A reader drops what it can't trust, and a field added later is read
  as optional.
- **The records** (`src/rules/run/stats.ts`): for each speed, runs, best score,
  furthest wave, strays brought home and whether all thirty were cleared; for
  each sector, its best at each speed; and the sectors reached, which a run may
  start at. The shell shows only the bests, on the result card and in the
  Sectors dialog; the runs, the furthest wave and the strays are stored and
  shown nowhere. Nothing a player earns carries from one run into the next but
  which sectors are open.
- **Between waves** there is already a stop: the Cleared card, with its tally
  and a Next wave button, and the Ready card before each wave's first move.
- **Events** are the one channel from the rules to the scene and the shell; a
  new thing that should be seen or heard is a new event kind or a new field on
  one.
