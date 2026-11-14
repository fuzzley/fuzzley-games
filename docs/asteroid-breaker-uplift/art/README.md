# The art of the uplift: direction and kit

What the uplift's art looks like, and how the scripts here draw it. The plan,
[`../plan.md`](../plan.md), says why; this page is what anyone drawing a
piece of it keeps to.

## The direction: cut stone, soft fuzz, bright sparks

Three materials, each drawn one way, so a glance tells them apart.

1. **Stone is cut.** Every rock is a low dome of flat facets. One light falls
   on the whole field from the upper left (`LIGHT` in `lib/rocks.mjs`), and
   each facet takes one flat tone of its ink for how it faces that light:
   lit, ink, shade or deep (`tonesOf()` in `lib/palettes.mjs`). A rock turns
   and the light stays where it is, so its faces brighten and darken as it
   spins. No gradient is drawn on anything hard.
2. **Fuzz is soft.** The fuzzballs are the only soft things on the field, and
   the only ones with eyes. A fuzzball keeps the brand mark's geometry
   (`@fz/style/fuzzball`: a round body, thirty strands with round caps, two
   tall eyes with glints) and is never faceted. It acts with its fur and its
   eyes, and it stays upright whatever it rides in.
3. **Energy glows.** Shots, thrust, static, a crystal's gems, a volatile
   rock's seams, pickups and comets give off light: a bright middle and a
   soft halo that fades to nothing. A halo is the thing's own color under
   plain alpha, never an additive blend, so on a white field it shows as a
   tint of that color where an additive glow would vanish.

The rest follows from those:

- **Shape says what a thing is before color does.** Round is a friend: a
  fuzzball, a bubble, a pickup. Cut and angular is a rock. Pointed with a
  tail is fast and deadly: a comet. Spiky clings: a burr. Each kind of rock
  has a silhouette and a mark of its own, and none is told by its ink alone.
- **The field stays quiet.** Nothing in the backdrop is as bright, as sharp
  or as saturated as anything that plays. A backdrop's tones are mixes of
  the field's color with at most a tenth of another color in a dark palette
  and a twentieth in a light one, and nothing in it moves faster than a
  slow drift.
- **Only the palette's colors.** Every tone is a role of the palette in use,
  one of the game's own inks (the rocks', the pilots'), or a mix of two of
  them. The uplift adds no new hex. Anything that matters to play keeps 3:1
  against the field, in all four palettes.
- **A light palette is ink on paper.** Space is white there. Rocks are dark
  cut stones, glows are tints, stars are small dark specks, and the
  backdrop is a pale wash.
- **Everything reads small.** A field unit is 6 CSS px on a small phone and
  about 22 on a laptop, so the ship is 14 px long at its smallest. Each
  piece says what it leaves out under 10 px a unit: rivets, fractures,
  glints and fine marks go first; silhouette, facets and eyes stay.
- **Overlapping things read apart.** Everything on the play layer keeps an
  outline in the field's color, as the game has now.
- **Everything has a still form.** Where motion isn't welcome the art
  holds one pose, and nothing is told by motion alone.

## The kit

`lib/` holds the drawing, as functions that return SVG, each about its own
middle, in pixels, given a palette and how many pixels a field unit takes
(`unit`). Nothing here is the game's code: the game would redraw this art in
`@fz/phaser/shapes`'s commands, from the geometry `make-assets.mjs` writes
out.

| File               | What it draws                                                              |
| ------------------ | -------------------------------------------------------------------------- |
| `lib/core.mjs`     | The seeded random, vectors, colors and SVG helpers                         |
| `lib/palettes.mjs` | The site's four palettes, the game's inks and a lit thing's tones          |
| `lib/rocks.mjs`    | The seven kinds of rock, cut and lit, their cracks and their normal maps   |
| `lib/fuzzball.mjs` | The fuzzball as an actor: its faces, its look, its fur by force and static |
| `lib/ship.mjs`     | The three pods and their states, and the bail-out                          |
| `lib/strays.mjs`   | A stray's bubble, and the tow line                                         |
| `lib/crew.mjs`     | The bar's crew and its face cam                                            |
| `lib/backdrop.mjs` | The four places: wash, stars, landmark, air and vignette                   |
| `lib/fx.mjs`       | Energy (halos, shots, arcs) and every effect as a function of time         |
| `lib/things.mjs`   | The pickups' orbs, sparks, the comet and its warning, the burr             |
| `lib/strips.mjs`   | An effect drawn as a strip of frames, for the sheets                       |
| `lib/sheet.mjs`    | How every sheet is laid out                                                |
| `lib/atlas.mjs`    | Pictures packed into an atlas, and its map                                 |
| `lib/raster.mjs`   | An SVG written as a PNG or a WebP, with sharp                              |

`make-art.mjs` draws every sheet again (`sheets/<name>.mjs` each draws
one), and `make-assets.mjs` writes the art out as the game could use it,
into `../assets/art/`. Both write the same bytes every run.

```bash
node docs/asteroid-breaker-uplift/art/make-art.mjs
```

Rules for a new piece of the kit:

- **Field units in, pixels out.** A piece's sizes are written in field
  units and multiplied by `unit`. The ship is 2.4 units long, a large rock
  2.8 units in radius, a stray's bubble 1.15.
- **Seeded, never random.** Anything varied is drawn from `seeded()`, so a
  sheet is the same bytes every run.
- **Geometry apart from drawing.** A piece is made as plain data first
  (points, facets, marks), then drawn from it for a palette, so the same
  data can be written out for the game.
- **Vector first.** Polygons, circles, lines and paths in solid colors. A
  soft halo is a radial gradient from a color to nothing. No filters, no
  blend modes and no masks on the play layer, since the game's renderer
  would have to match them.
- **Check it by eye.** Write the sheet as a PNG with `writeRaster()` and
  look at it, in a dark palette and a light one, at 22 px a unit and at 6.
