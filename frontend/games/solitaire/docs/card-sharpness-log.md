# Card sharpness: work log

This file tracks the work on making cards sharper on phones. Options 1 to 3: a
pixel budget in place of the fixed pixel ratio cap, card vertices rounded to
whole pixels, and more atlas densities drawn straight from the SVG. Then options
4 to 6: the canvas sized in exact device pixels, the mobile deck drawn at its
exact size at runtime, and the felt's vignette moved under the cards. It records
what was decided, what is done and what is next, so the work can stop and
restart at any commit. The research and every option considered are in
[card-sharpness.md](card-sharpness.md).

**Branches:** options 1 to 3 on `feature/card-sharpness`, cut from `main` at
`393d9e0` and merged as `8e03d47`. Options 4 to 6 on
`feature/card-sharpness-4-6`, cut from `main` at `22cbcd4`.

**Status:** options 1 to 3 merged; options 4 to 6 in progress. What is left for
the owner is under [Open questions](#open-questions).

## How to pick this up

1. `git checkout feature/card-sharpness-4-6` (or `main`, once it is merged)
   and read [Progress](#progress) and [Open questions](#open-questions).
2. Run `yarn tsc && yarn test` to confirm the tree is green before going on.
3. Take the first unchecked step. Each step is one commit, or a few, and adds an
   entry to [Log](#log) saying what changed and anything surprising.
4. Check a visible change in Chrome's phone emulation against `yarn start` (port
   9000): 390 × 844 at DPR 3 and at DPR 2, 844 × 390 at DPR 3, and 412 × 915 at
   DPR 2.625, plus a desktop window at DPR 1 and 2. A reload restores the saved
   game, so before and after screenshots show the same deal. Close every page
   the DevTools MCP opened, and `yarn stop`, when done.

## Decisions

The owner chose options 1 to 3 of [card-sharpness.md](card-sharpness.md) on
2026-10-10, asking for regular commits and this log.

### Implementation choices

Made while planning, within that decision. Each is easy to revisit.

- **The budget never lowers a ratio below today's.** The canvas renders at the
  display's ratio up to 2 whatever its size, as before. Above 2 it may go up to
  3 while the canvas holds no more than 4.5 million device pixels, which a large
  phone at 3× does (a 440 × 956 phone is 3.8 million) and a laptop at 2× does
  not. So desktops render exactly as they did.
- **`fullAuto`, not `full`.** The cards round their vertices only while the
  camera has `roundPixels` on, so the game config's one setting still governs.
- **Densities 0.5×, 0.75×, 1×, 1.5× and 2×.** Each is at most 1.5 times the one
  below, so the GPU never shrinks a card below about 0.67. 1.5× is there because
  a phone on its side at DPR 3 may now cross a layout scale of 1, which would
  otherwise load the 76 MB 2× atlas.
- **Frames are whole texels.** A frame at density _d_ is `round(220d)` ×
  `round(307d)` texels, the artwork stretched to fill it, and the renderer
  scales each axis by the design size over the frame's size. The stretch is at
  most a third of a percent.
- **The card edge is drawn per density,** `max(1, round(2d))` texels wide, which
  is 2 design units as before wherever that is a whole texel.
- **Every density is drawn from the SVG,** in parallel through resvg's
  `renderAsync`. The sheet decks still find their cards on a 2× render, once per
  sheet, and check the crops there; every density cuts the same boxes in design
  units.

### Options 4 to 6

The owner asked on 2026-10-10 for options 4 to 6 as well ("phase 4-6 from the
original plan"), again with regular commits and this log kept up to date.
Choices made while planning:

- **Option 4: the browser's own count of device pixels.** A `ResizeObserver`
  watching the canvas's parent with `box: "device-pixel-content-box"` reports
  its size in whole device pixels. The scaler uses it only while the canvas
  renders at the display's own ratio (not one held down by the budget), and only
  when it agrees with the parent's CSS size to within a pixel, so a report from
  before a resize never sizes the canvas. The canvas's CSS size is then the
  parent's own, unrounded. Where the browser has no such box (Safari), the
  canvas is sized as before.
- **Option 4 also refreshes Phaser's scale manager after sizing.** Phaser
  measures the canvas, to convert pointer positions, before the scaler pins its
  CSS size; on a DPR 2.625 phone that left input about a pixel off at the far
  edge. A refresh after pinning measures the final size.
- **Option 6: draw the light under the cards.** The first of the two ways
  option 6 offered. A Phaser 4 `Gradient` (radial, dithered) fills the canvas
  beneath every layer, at a new `RenderLayer.TABLE_LIGHT`, with the CSS
  vignette's geometry: an ellipse 125% × 105% of the board, centred at 50% and
  32%, clear to 38% of the way out and 38% black at the rim. The CSS overlay and
  its `--table-vignette` token go.
- **Option 5: the mobile deck only.** Its faces and plain backs are generated
  SVG, a few kilobytes each once resvg has turned the ranks into paths, so the
  browser can draw them at any size. The desktop decks' cards live in three
  1.7 MB Inkscape sheets with shared patterns; drawing them at runtime would mean
  splitting the sheets by hand and downloading about 1.7 MB more per deck, for
  cards the built densities already draw within two thirds of their size on
  screens where they are larger anyway.
- **Option 5: what the drawn deck holds.** Every frame the atlas has, so a
  sprite keeps its frame name across the swap. Faces and plain backs are drawn
  from SVG at `round(220s)` × `round(307s)` texels for layout scale _s_, and
  given the card edge as the tool stamps it. The artwork's two backs and the
  placeholders are copied from the built atlas on the table, with the browser's
  best smoothing.
- **Option 5: when it is drawn.** Once the layout scale has held for 250 ms,
  when it is not already a built density, and when every frame fits one 4096
  page. Sprites then draw from it at a scale of exactly 1. Any change of scale
  switches them back to the built atlas until it is drawn again, so a resize
  never enlarges it; a change of deck or the scene ending releases it.

## Progress

### 1. Pixel budget

- [x] 1.1 `ViewportScaler` picks the ratio from the budget; specs.

### 2. Whole-pixel cards

- [x] 2.1 Card, shadow and placeholder sprites round their vertices; specs.

### 3. Atlas densities

- [x] 3.1 The atlas tool draws every density from the SVG, still at 1× and 2×;
      atlases rebuilt and compared.
- [x] 3.2 0.5×, 0.75× and 1.5× added to the tool and the runtime, with the
      renderer scaling each axis; atlases rebuilt; specs.
- [x] 3.3 Skills and agent instructions describe the densities and the budget.

### 4. Verify

- [x] 4.1 `yarn verify`, then the phone and desktop checks above, with before
      and after screenshots.
- [x] 4.2 [card-sharpness.md](card-sharpness.md) says what shipped; open
      questions listed for the owner.

### 5. Exact canvas size (option 4)

- [ ] 5.1 `ViewportScaler` sizes the canvas from the device pixel box where the
      browser reports one, and refreshes Phaser's scale after sizing; specs.

### 6. The light under the cards (option 6)

- [ ] 6.1 The board paints the felt's light inside the canvas, beneath every
      layer; the CSS overlay and its token go; specs.

### 7. The mobile deck drawn at its exact size (option 5)

- [ ] 7.1 `yarn build:atlas` writes the mobile deck's faces and plain backs as
      SVG, ranks as paths.
- [ ] 7.2 Planning and painting a drawn deck: frame layout, SVG sizing, copied
      frames, the card edge; specs.
- [ ] 7.3 The board draws from a drawn deck once its scale settles, sharing one
      way of repointing sprites with the deck loader; specs.

### 8. Verify options 4 to 6

- [ ] 8.1 `yarn verify`, then the phone and desktop checks above.
- [ ] 8.2 [card-sharpness.md](card-sharpness.md) and the skills say what shipped.

## Open questions

- **The vignette dims the cards at the board's edges.** The grey wash on some
  face-up cards, on `main` too, is the CSS vignette that
  `game_canvas.component.scss` lays over the canvas (`:host::after`, up to
  `--table-vignette`, 38% black, at the edges). It is meant to light the felt
  but falls on the cards as well, which on a phone sit near the edges:
  Klondike's column 1, Spider's columns 1 and 2, the bottom row of piles.
  Drawing it under the cards, inside the canvas, or weakening it on a phone
  would give the cards back their contrast. A design choice, so left for the
  owner; written up as option 6 in [card-sharpness.md](card-sharpness.md).
- **Memory on a phone on its side.** At 3× it now loads 1.5× (about 46 MB of
  texture) where it loaded 1× (about 20 MB). Worth watching on an older phone;
  lowering `MAX_BUDGETED_DEVICE_PIXELS` or `MAX_PIXEL_RATIO` would trade it
  back.

## Log

### 2026-10-10

- Researched and measured; wrote [card-sharpness.md](card-sharpness.md) and the
  comparison images in `docs/card-sharpness/`.
- Confirmed by experiment, since reverted, that a ratio of 3 with vertices
  rounded sharpens Klondike at DPR 3, and that drawing a 0.5× frame from the SVG
  matches a Lanczos shrink without its halos.
- 1.1: `ViewportScaler` renders up to 3x, above 2x only within
  `MAX_BUDGETED_DEVICE_PIXELS` (4.5 million). `pixelRatio` now reports the ratio
  the canvas was last sized at, since the ratio depends on the size; only the
  specs read it.
- 2.1: `PhaserCardFactory.VERTEX_ROUND_MODE` (`fullAuto`) on card, shadow and
  placeholder sprites. Phaser's camera takes `roundPixels` from the game config
  (`CameraManager`), so the existing setting switches it on. The mock sprite
  gained `vertexRoundMode`. 6860 tests pass.
- 3.1: `raster.mjs` draws through `renderAsync`, eight frames at a time
  (`drawEach`); `frameSize(artScale)` replaces `FRAME_W`/`FRAME_H`.
  `sheet-deck.mjs` still finds the cards and checks the crops on a whole 2×
  render, then draws every other density from the same boxes in user units; at
  2× it reuses the cuts, which are the same pixels. Placeholders draw per cell.
  The card edge is stamped per density, `max(1, round(2d))` texels, and checked
  at depth `min(1, width - 1)`. A full build takes 28 s.
- Rebuilt: 2× page 0 is byte-identical; 2× page 1 differs by at most 16 levels
  in the placeholders (drawn per cell rather than as one strip). 1× changed as
  intended: the edge is now two clean texels (114, 114, then white) where the
  Lanczos shrink gave 112, 122, 247, and glyphs lose their halos. The contact
  sheet looks right for all four decks.
- 3.2: `CARD_ART_SCALES` and `ART_SCALES` are `[0.5, 0.75, 1, 1.5, 2]`.
  `cardFrameTexels` (mirrored by `frameSize` in the tool) rounds a frame to
  whole texels: 110 × 154 at 0.5×, 165 × 230 at 0.75×, 330 × 461 at 1.5×.
  `cardSpriteScale` scales each axis by the design size over the frame's, and
  the renderer keeps the last result, since every sprite in a frame shares it
  and working it out per sprite would allocate. Shadow padding stays whole at
  every density (8 × 12 up to 32 × 48 texels). The preview reads the density
  each board would load. Atlases on disk went from about 13 MB to 19 MB; the new
  1× pages are half their old size, as the directly drawn frames compress
  better. A full build takes 58 s.
- Checked in Chrome: Klondike at 390 × 844 and DPR 3 loads `mobile/0.75x` on a
  1170 × 2532 canvas; Spider at DPR 2 loads `mobile/0.5x`. Both draw cleanly. A
  grey wash on the left of some top cards shows in every run, `main` included,
  so it predates this work (see [Open questions](#open-questions)).
- 3.3: `phaser-core` gained a "Sharp Cards" practice (budget, vertex rounding,
  density spacing); `phaser-canvas-performance` and `vite-bundle-optimization`
  describe five densities, rounded frames and per-axis scaling. Fixed
  `BoardDeckLoader`'s note on 2× memory (76 MB, not sixty).
- Measured which atlas each screen loads (Klondike, reload in each state):

  | Screen             | DPR   | Canvas    | Atlas loaded |
  | ------------------ | ----- | --------- | ------------ |
  | 390 × 844 upright  | 3     | 1170×2532 | 0.75×        |
  | 390 × 844 (Spider) | 2     | 780×1688  | 0.5×         |
  | 412 × 915 upright  | 2.625 | 1081×2401 | 0.75×        |
  | 844 × 390 on side  | 3     | 2532×1170 | 1.5×         |
  | 1440 × 810 window  | 1     | 1440×810  | 1×           |
  | 1440 × 810 window  | 2     | 2880×1620 | 2×           |

  A phone on its side at 3× now loads 1.5× (about 46 MB) where it loaded 1×
  (about 20 MB) at a ratio of 2; without 1.5× it would have taken 2× (76 MB).

- Found the grey wash's cause: the vignette over the canvas; see
  [Open questions](#open-questions).
- 4.1: `yarn verify` passes (lint, types, build, 6870 tests); coverage stays
  above the floor (98.5% of lines). The build emits 21 atlas pages, not 24,
  because every deck's second 2× page (two classic backs and the placeholders)
  is identical and Vite stores it once. In Chrome at 390 × 844 and DPR 3, a tap
  on the stock at CSS coordinates draws three, so input still maps through the
  new ratio; the waste fan and a 1440 × 810 desktop at DPR 2 draw correctly.
- 4.2: [card-sharpness.md](card-sharpness.md) has a "What shipped" section,
  `docs/card-sharpness/klondike-shipped.png` (main, options 1 and 2, all three),
  and option 6, the vignette.
