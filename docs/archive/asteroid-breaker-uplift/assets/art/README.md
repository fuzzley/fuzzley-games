# The uplift's art, as assets

The art of the Asteroid Breaker uplift, written out as files a game can load:
geometry as JSON, atlases as PNG with their maps, sprites as SVG, and
backdrops as WebP. [`../../art/make-assets.mjs`](../../art/make-assets.mjs)
writes every file here but this one, from the kit in `../../art/lib/`, so
change the kit and run the script; don't edit a file here by hand.
[`../../art/README.md`](../../art/README.md) is the art's direction, and
[`../../plan.md`](../../plan.md) says what the game would do with it.

The game draws its art at run time, in the palette on the page, from polygons
in flat colors. So the **geometry** is what it would take. The atlases and the
sprites are the same art as pictures, for anything that wants pictures, and to
see what the geometry should draw.

## What is here

| Folder       | What it holds                                              |
| ------------ | ---------------------------------------------------------- |
| `geometry/`  | A JSON file a group: shapes, with roles in place of colors |
| `atlas/`     | Three atlases as PNG, each in layers that share one map    |
| `sprites/`   | Each piece alone as SVG, in `dark/`, `light/` or `tint/`   |
| `backdrops/` | Each sector's backdrop as a WebP picture, wide and tall    |

## Units and axes

- **A field unit** is the field's short side over 40. Sizes are in field units
  unless a file says otherwise.
- **x runs right and y runs down,** as the screen's do. An angle of 0 points
  right, and a quarter turn points down.
- **What points, points along x.** A pod's nose, the comet, a shot and the
  muzzle's flash point right; a flame reaches left from its root.
- **A piece is drawn about its own middle:** a rock about its center, a pod
  about the middle it turns about (its canopy's), the comet and a shot about
  the middle each hits with.
- **A rock** is in units of its own radius; `radius` is that radius in field
  units.
- **The fuzzball** is on the brand mark's grid of 32 units, about its body's
  middle. A pod and a bubble each say how wide that grid is drawn in them, in
  field units (`pilot` in `pods.json`, `fuzzball` in `bubbles.json`).
- **A pickup's symbol** is in shares of its square, and **the burr** in shares
  of its radius.
- **Numbers** are rounded to four places.

## Geometry

Every file opens with an `about` string that says how to read it. No file
holds a color: a part names the palette's role, the ink or the tone it takes,
and `../../art/lib/palettes.mjs` has what those are in each palette. The
geometry serves all four palettes.

| File             | What it holds                                             |
| ---------------- | --------------------------------------------------------- |
| `rocks.json`     | 102 rocks, six a kind and size: facets, marks and cracks  |
| `pods.json`      | Three pods: facets, engines, tow hook, canopy and pilot   |
| `fuzzball.json`  | The fur at each tier of static, nine faces, a small form  |
| `bubbles.json`   | Two bubbles, the Shield's shell and a tow line at rest    |
| `pickups.json`   | The orb's measures, the eight symbols and their groups    |
| `hazards.json`   | The comet's head and tail, its warning, and the burr      |
| `energy.json`    | The four weapons' shots, the sparks' sizes, a halo's fade |
| `backdrops.json` | Four sectors, each for a field 72 by 40 and one 40 by 72  |

A facet has a `normal`: the way it faces, x right, y down and z toward the
viewer. `light` is the way from the field to its one light: up, left and
toward the viewer. A facet's brightness is the dot of its normal, turned with
the piece, and that light; `litBy()` and `toneAt()` in
`../../art/lib/rocks.mjs` turn it into one of an ink's four tones (`lit`,
`ink`, `shade`, `deep`).

## Atlases

Each atlas is packed once and written in layers, and a frame has the same
place in every layer, so one map serves them all. A field unit takes 24 pixels
(`meta.unit`), and every frame has 2 clear pixels around it.

- **`rocks`** holds the 102 rocks, each named `<kind>-<size>-<1 to 6>`, in
  seven layers: `ink-dark`, `ink-light`, `normal`, `glow-dark`, `glow-light`,
  `lit-dark` and `lit-light`.
- **`hulls`** holds what else is cut in facets and lit: `pod-bumble`,
  `pod-dart`, `pod-crescent` and `comet-head`, each the hull alone, with no
  pilot, canopy or flame, in five layers: `ink-dark`, `ink-light`, `normal`,
  `lit-dark` and `lit-light`.
- **`things`** holds the 56 sprites listed under Sprites, in two layers:
  `dark` and `light`.

A layer's file is `<atlas>-<layer>.png`, and the map is `<atlas>.json`.

### The layers

- **ink:** each part in its own ink, flat and unlit, with its marks and with
  nothing it gives off. This is the texture a lit sprite takes.
- **normal:** the normal map of the same picture at no turn: red is how far a
  facet faces right, green how far up and blue how far toward the viewer,
  each from -1 at 0 to 1 at 255. It is clear where there is no facet.
- **glow:** only what a rock gives off, its halos and its glowing seams, which
  no light falls on. The hulls have no such layer: the comet's glow is two
  sprites in `things`.
- **lit:** the piece already lit by the field's light, at no turn. It is for
  anything that doesn't light at run time, and it is what the other layers
  should come to.

A renderer with lights draws the ink layer with the normal layer as its normal
map, so that each facet shows its ink times the light on it, and then draws
the glow layer over that, unlit. As a piece turns its normals turn with it and
the light stays where it is. The kit doesn't multiply: it picks between an
ink's four tones by the same dot product, which is what the lit layers show,
and a multiply only comes near that.

**No outline is baked,** in any picture here. The game draws its own, in the
field's color of the palette on the page. Nothing else in the field's color is
baked either: where the kit lays that color under a piece (the glass of a
bubble, the edge of an orb, a shot or the burr), the picture leaves it out, so
a bubble's glass is only its faint wash.

### The maps

A map is Phaser's JSON hash, as `this.load.atlas(key, png, json)` reads it:
`frames` by name, each with its `frame` in pixels, none rotated and none
trimmed. Load a layer with its atlas's map. Beside what Phaser needs:

- `meta.images` lists the atlas's layers, and `meta.unit` is the pixels a
  field unit takes.
- A rock's frame has its `kind`, its `size` and its `radius` in field units.
  Its picture is square, with the rock's middle at its middle.
- A frame of `hulls` or `things` has:
  - `group`: the group of assets it is one of, which names its geometry file.
  - `units`: what its sizes are in. `field` is field units; `grid` is the
    fuzzball's grid of 32; `radius` is its own radius, for the soft disc
    (where its fade ends) and the ring (the middle of its line).
  - `px`: the pixels one of those units takes in the atlas. To draw a frame
    where a field unit takes `u` pixels, scale it by `u / px`, times how many
    field units one of its units is to take if they are not field units.
  - `size`: the frame's width and height in those units.
  - `anchor`: where the piece's own middle lies in the frame, as shares of
    its width and height. Phaser reads it as the frame's pivot, so a sprite's
    origin is there unless it is set. It is the frame's middle unless the
    piece has another: a shot's is the middle it hits with, a flame's its
    root, the flash's the muzzle, and the comet's tail's and edge's the
    comet's middle.
  - `tint`: true for a white sprite, which is the same in both palettes.
  - `reach`, in `hulls` only: how far the hull reaches from its middle.

## Sprites

`sprites/<dark|light|tint>/<group>/<name>.svg` is each piece alone, a whole
SVG file with its own `defs`, drawn where a field unit takes 32 pixels (and a
unit of the fuzzball's grid 32/12). `tint/` also holds `soft-disc.png` and
`ring.png`, each 256 pixels across. Every sprite but the pods' hulls and the
comet's head is in the `things` atlas too, under the same name; those four are
in `hulls`, and their SVG is the lit layer.

By group, in `dark/` and `light/` unless said to be white, which are in
`tint/`:

- **`pods`:** `pod-bumble`, `pod-dart` and `pod-crescent`.
- **`fuzzball`:** `eyes-<face>` for the nine faces (`rest`, `blink`, `set`,
  `eep`, `happy`, `dizzy`, `sleepy`, `plead`, `squeeze`), and the small form's
  `eyes-small`, as at 12 pixels, and `eyes-tiny`, as at 8. White:
  `fuzz-tier-0` to `fuzz-tier-3`, `fuzz-small` and `fuzz-sparks`.
- **`bubbles`:** `bubble-stray`, `bubble-tow` and `shell`.
- **`pickups`:** `orb-<id>` for the eight pickups (`spread`, `rapid`,
  `shield`, `ship`, `lance`, `magnet`, `slow`, `nova`). White: `symbol-<id>`
  for the same eight.
- **`hazards`:** `comet-head`, `comet-tail`, `comet-edge`, `warning-bar`,
  `warning-chevron`, `warning-chevron-lit` and `burr`.
- **`energy`:** `shot-<weapon>` for the four weapons (`gun`, `spread`,
  `rapid`, `lance`), `muzzle-flash-1` and `-2`, `flame-1` to `-3`, and
  `spark-small`, `-medium` and `-large`. White: `soft-disc` and `ring`.

### Which palette

Every picture in `dark` is drawn in **Casino night** and every one in `light`
in **Classic felt**. Midnight blue and Soft pastel have no pictures; the
geometry draws them.

### The white sprites

A white sprite is white on nothing, to be tinted by whatever draws it, so one
picture serves every palette and every ink:

- **`fuzz-tier-0` to `fuzz-tier-3` and `fuzz-small`** are the fuzzball's body
  and fur with no eyes: tint them with a pilot's ink. `fuzz-sparks` is a full
  charge's sparks, to go over `fuzz-tier-3` in the same ink.
- **`symbol-<id>`** is a pickup's symbol alone, the size it is in its orb.
- **`soft-disc`** is the kit's halo: white at its middle, fading to nothing at
  its radius, as `halo` in `energy.json` says. Tint it with a thing's own
  color, scale it to the halo's radius, and set its alpha to the halo's
  strength, under plain alpha, never an additive blend.
- **`ring`** is a thin white ring, for a ring that spreads and fades.

The eyes are not white: `eyes-<face>` is a face in the mark's own eye ink and
glint, the same in every palette, and so the same file in `dark/` and
`light/`. Every face's frame holds its eyes at the same place, so one swaps
for another.

### Putting pieces together

- **A fuzzball** is a `fuzz-tier` sprite, tinted, with an `eyes` sprite over
  it, both by their anchors, which are the body's middle.
- **A pod** is its hull, with the fuzzball upright at its middle whatever way
  the hull turns.
- **The comet** is `comet-tail`, which also holds the halo around its head,
  then `comet-head`, then `comet-edge`, all by the same middle and turned
  together.
- **The warning** is `warning-bar` on the field's edge and three chevrons at
  the places and sizes `hazards.json` gives, one of them lit.
- **An orb** already holds its symbol and its halo.

## Backdrops

`backdrops/<sector>-<dark|light>.webp` is a sector's backdrop for a field 72
by 40 units, 1440 by 800 pixels, and `<sector>-<dark|light>-tall.webp` for one
40 by 72, 800 by 1440: 20 pixels a unit, at quality 95. The sectors are
`inner-belt`, `iron-reach`, `storm` and `endless`. Each is the backdrop's
still form, from seed 1, over the field's own color, so it has no clear
pixels. `backdrops.json` holds the same eight as marks, which is what the game
would draw, since its stars and its air follow the run's seed and the field's
size.

## Making it all again

```bash
node docs/archive/asteroid-breaker-uplift/art/make-assets.mjs
```

It takes a few seconds and writes the same bytes every run, with the `sharp`
that `frontend/` installs: nothing in it is drawn from a clock or an unseeded
random. Name groups to write only those (`rocks`, `pods`, `fuzzball`,
`bubbles`, `pickups`, `hazards`, `energy`, `backdrops`). `pods` writes the
`hulls` atlas, and the `things` atlas is packed again whenever one of the five
groups in it is written. The script stops if a sprite reaches the edge of its
frame, or if the kit's drawing of a piece no longer has the backing it leaves
out.

## What is not here

- **Animation.** Nothing here moves. The flash's two frames and the flame's
  three are the only sequences; how fur bends, a bubble bobs or a rock turns
  is the kit's and the plan's to say.
- **The effects.** A break, a blast, a zap, a dash, the Shield bursting and
  the rest are functions of time in `../../art/lib/fx.mjs`, drawn from this
  geometry, and no frame of them is written out.
- **The game's own atlas.** The game bakes its art when it starts, in the
  palette on the page, from shapes; these atlases are not that one.
- **An outline,** as said above, and anything else in the field's color.
- **Whole scenes.** A pilot in its pod, a stray in its bubble and a line in
  tow are put together by the game from the pieces here.
- **The canopy's glass,** its rim and its glint, which the kit draws only as
  part of a whole pod; `pods.json` has its radius. The same goes for a pod's
  guard ring, its dash gauge and the arcs of a full charge.
- **The bar's crew and face cam,** which are laid out in CSS pixels, not in
  field units (`../../art/lib/crew.mjs`).
- **The rocks as SVG.** They are in their atlas and their geometry only.
