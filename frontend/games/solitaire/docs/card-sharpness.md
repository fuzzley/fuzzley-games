# Card sharpness on phones

Cards look soft on a phone. This note follows a card from the atlas to the
screen, measures where it loses sharpness, and sets out the options, from the
atlas tool through Phaser to the canvas itself. The owner chose options 1 to 3
on 2026-10-10; the work is tracked in
[card-sharpness-log.md](card-sharpness-log.md).

The images in [`card-sharpness/`](card-sharpness/) are crops of Chrome
screenshots taken under phone emulation, enlarged with nearest-neighbour scaling
so each screen pixel shows as a block.

## What shipped

Built on `feature/card-sharpness`, options 1 to 3 as planned:

- **The canvas renders at a phone's own pixel ratio,** up to 3, as long as it
  holds no more than 4.5 million device pixels; any canvas may still render
  at 2. A 3× phone's canvas is no longer stretched, and desktops render as
  before.
- **Cards, shadows and placeholders round their corners to whole pixels**
  (`vertexRoundMode` `fullAuto`), so `roundPixels` finally applies to them.
- **Every deck is built at 0.5×, 0.75×, 1×, 1.5× and 2×,** each drawn from the
  SVG. A board loads the least dense that need not enlarge its cards, so none is
  shrunk below two thirds. A frame at a fractional density is rounded to whole
  texels, and the renderer scales each axis on its own.

[klondike-shipped.png](card-sharpness/klondike-shipped.png) shows Klondike at
DPR 3 on `main`, after options 1 and 2, and after all three. Which atlas each
screen loads, and the costs, are in the [log](card-sharpness-log.md#log).

One more thing dims the cards, found while checking this work and left for the
owner: see [option 6](#6-lift-the-vignette-off-the-cards).

## How a card reached the screen

Before this work, on `main` at `393d9e0`:

1. `yarn build:atlas` rasterizes every deck at 2 texels per design unit (2×) and
   shrinks those frames with Lanczos to 1×. A card is 220 × 307 design units, so
   a 1× frame is 220 × 307 texels.
2. The board picks the least dense atlas that draws cards without enlarging them
   (`cardArtScaleFor`): 1× whenever the layout scale is 1 or less, which is
   every phone.
3. Phaser draws each card as a quad scaled by `layoutScale / artScale`, sampled
   with bilinear filtering and no mipmaps, at wherever the layout puts it.
4. `ViewportScaler` sizes the canvas at the display's pixel ratio, capped at 2,
   and the browser scales the canvas to fill its box on the screen.

Each step can resample the card: once when shrinking to 1×, once in the GPU, and
once more in the browser.

## Measurements

Emulated in Chrome at 390 × 844 CSS px, Klondike and Spider on their default
phone grids, `main` at `393d9e0`.

| Board            | DPR | Canvas   | Stretched by browser | Card on canvas | Atlas | GPU shrink |
| ---------------- | --- | -------- | -------------------- | -------------- | ----- | ---------- |
| Klondike, 7 cols | 3   | 780×1688 | 1.5×                 | ~107 px        | 1×    | 0.49       |
| Spider, 10 cols  | 2   | 780×1688 | none                 | ~74 px         | 1×    | 0.34       |

With the pixel ratio allowed to reach 3, Klondike's canvas is 1170×2532 (no
stretch) and its cards are ~160 px, shrunk 0.73 from the 1× atlas.

## What blurs the cards

1. **The pixel ratio cap.** `ViewportScaler.MAX_PIXEL_RATIO` was 2. Most iPhones
   and many Androids are 3 (others 2.625, 2.75), so the browser stretched the
   canvas 1.3 to 1.5 times, softening every edge.
   [klondike-dpr3.png](card-sharpness/klondike-dpr3.png), panel 1 against
   panel 2.
2. **`roundPixels` never applied to cards.** The game config sets it, but Phaser
   4 rounds a sprite's vertices only under its `vertexRoundMode`, whose default
   `safeAuto` skips any sprite that is scaled or rotated
   (`GameObject.willRoundVertices`, `TransformerImage.js`). Cards are always
   scaled, so they sat at fractional positions with fractional sizes, and
   bilinear sampling smeared each edge over two pixels.
3. **Shrinking without mipmaps.** Below a shrink of about 0.5, bilinear
   filtering skips texels and the edges of glyphs and pips step.
   [spider-dpr2.png](card-sharpness/spider-dpr2.png) shows it against the same
   card shrunk offline to its exact size.
4. **A fractional backing store.** `ViewportScaler` floors the CSS size and
   multiplies by the ratio, and Phaser floors that again. A 412 px wide phone at
   DPR 2.625 asks for 1081.5 device px and gets 1081, so the browser stretches
   it slightly.

Once the cards are sharp, size is the limit: on Spider on a 390 px phone the
index rank is about 6 CSS px tall.

## Options

Ranked by value for effort. The first three are the chosen ones.

### 1. A pixel budget instead of a fixed ratio cap (chosen)

Allow a ratio above 2, up to 3, while the canvas stays within a budget of device
pixels; never go below today's 2. A phone at 3× draws 3 to 4 million pixels,
fewer than a laptop at 2× (about 6 million), so phones get their native ratio
while large screens stay as they are.

- **Where:** `src/engine/render/phaser/host/viewport_scaler.ts`.
- **Cost:** about 2.25 times the pixels on a DPR 3 phone. A phone's layout scale
  rises by half, so a phone on its side may cross 1 and want a denser atlas;
  option 3's 1.5× density keeps that affordable.
- **Possible offset:** `antialiasGL: false`. Multisampling only smooths the
  highlight borders, the one thing drawn as geometry.

### 2. Round card vertices to whole pixels (chosen)

`setVertexRoundMode("fullAuto")` on the card, shadow and placeholder sprites
rounds each corner of their quads to a whole pixel whenever the camera has
`roundPixels` on, which the game config already asks for. Card widths may differ
by a pixel between columns, which does not show.

- **Where:** `src/engine/render/phaser/scene/phaser_card_factory.ts`.

### 3. More atlas densities, each drawn from the SVG (chosen)

Build 0.5×, 0.75× and 1.5× beside 1× and 2×, so the GPU never shrinks a card
below about 0.67, where bilinear filtering stays clean. Klondike on a DPR 2
phone (0.49) and on a DPR 3 one (0.73) then draws almost texel for texel.
Smaller densities also cost less GPU memory, at four bytes a texel: about 5 MB
at 0.5× against about 20 MB at 1× and 76 MB at 2×.

Draw every density straight from the SVG rather than shrinking the 2× frames.
[direct-vs-shrunk.png](card-sharpness/direct-vs-shrunk.png) compares the three
ways of making a 0.5× frame: drawing it from the SVG is as sharp as a Lanczos
shrink without the light halos Lanczos leaves around dark strokes, and sharper
than Mitchell.

- **Where:** `tools/card-atlas/` and `src/engine/render/deck/card_art_scale.ts`,
  with the manifests in `src/engine/render/phaser/deck/card_deck_atlas.ts`.
- **Catches:**
  - 307 × 0.5 is 153.5, so a frame at a fractional density is rounded to whole
    texels and the renderer scales each axis on its own.
  - The stamped card edge is 2 design units: 4 texels at 2× but 1 at 0.5×. It
    has to be drawn per density, and the check that it is present has to measure
    at a depth that suits its width.
  - The card sheets are 1.7 MB SVGs, about 140 ms to draw one frame, so frames
    are drawn in parallel with resvg's `renderAsync`.

### 4. Size the canvas in exact device pixels

A `ResizeObserver` reading `devicePixelContentBoxSize` gives the canvas box in
whole device pixels, so the backing store matches the screen exactly at any
ratio. Chromium and Firefox report it; Safari does not, so today's calculation
stays as the fallback.

- **Where:** `src/engine/render/phaser/host/viewport_scaler.ts`.

### 5. Draw the cards at their exact size at runtime

Every card on a board is drawn at one scale (`metrics.scale`). When that scale
changes, the 56 card SVGs could be rasterized at exactly `round(220 × scale)` px
into one canvas texture and drawn unscaled, so one texel is one screen pixel and
the default `roundPixels` handling applies by itself.

It needs:

- per-card SVGs written by `build:atlas`, with text converted to paths, since an
  SVG drawn as an image cannot load fonts;
- the 1.7 MB desktop sheets split at build time;
- every card packed into one texture, since Phaser defaults to one texture per
  batch on mobile (`autoMobileTextures`);
- the current atlas kept on screen while the new one is drawn.

After options 1 to 3 the remaining gain is modest: compare panels 2 and 3 of
[klondike-dpr3.png](card-sharpness/klondike-dpr3.png).

### 6. Lift the vignette off the cards

Found while checking options 1 to 3. The grey wash on some face-up cards is the
vignette `game_canvas.component.scss` lays over the whole canvas
(`:host::after`), which darkens towards `--table-vignette`, 38% black, at the
edges. It is meant to light the felt, but it falls on the cards too, and on a
phone most cards sit near an edge: Klondike's first column, Spider's first two,
the whole bottom row of piles. Their white turns grey and their contrast drops.

- **Draw it under the cards.** Paint the same gradient inside the canvas as the
  board's background, beneath every sprite. The felt keeps its light and the
  cards keep their white.
- **Or soften it on a phone,** where the board fills the screen, through the
  `compact` mixin and a weaker token.

A design choice, so not made here.

### Not recommended

- **Mipmaps** (`render.mipmapFilter`). Phaser 4.2.1 creates a WebGL1 context,
  where mipmaps need power-of-two textures, and the atlas pages are sized to
  their contents (3876 × 1260, 4032 × 3732). Padding them costs memory, the
  smaller levels blur, and the 8 px gutter between frames is gone by the fourth
  level, so cards would bleed into their neighbours.
- **`pixelArt` and `smoothPixelArt`.** They are for enlarging pixel art, not for
  shrinking vector cards.
- **Compressed textures** (ASTC, ETC). Their blocks show around text.

## Beyond sharpness

Once the cards are sharp, the physical size of the index decides how well they
read. The open questions from the mobile deck still apply: whether a phone
should open the fans wider, so the index can be larger, and whether ranks should
be set in a wider, heavier face than Barlow Condensed.
