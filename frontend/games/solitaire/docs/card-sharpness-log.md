# Card sharpness: work log

This file tracks the work on making cards sharper on phones: a pixel budget in
place of the fixed pixel ratio cap, card vertices rounded to whole pixels, and
more atlas densities drawn straight from the SVG. It records what was decided,
what is done and what is next, so the work can stop and restart at any commit.
The research and every option considered are in
[card-sharpness.md](card-sharpness.md).

**Branch:** `feature/card-sharpness`, cut from `main` at `393d9e0`.

**Status:** in progress.

## How to pick this up

1. `git checkout feature/card-sharpness` and read [Progress](#progress).
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

## Progress

### 1. Pixel budget

- [x] 1.1 `ViewportScaler` picks the ratio from the budget; specs.

### 2. Whole-pixel cards

- [ ] 2.1 Card, shadow and placeholder sprites round their vertices; specs.

### 3. Atlas densities

- [ ] 3.1 The atlas tool draws every density from the SVG, still at 1× and 2×;
      atlases rebuilt and compared.
- [ ] 3.2 0.5×, 0.75× and 1.5× added to the tool and the runtime, with the
      renderer scaling each axis; atlases rebuilt; specs.
- [ ] 3.3 Skills and agent instructions describe the densities and the budget.

### 4. Verify

- [ ] 4.1 `yarn verify`, then the phone and desktop checks above, with before
      and after screenshots.
- [ ] 4.2 [card-sharpness.md](card-sharpness.md) says what shipped; open
      questions listed for the owner.

## Log

### 2026-10-10

- Researched and measured; wrote [card-sharpness.md](card-sharpness.md) and the
  comparison images in `docs/card-sharpness/`.
- Confirmed by experiment, since reverted, that a ratio of 3 with vertices
  rounded sharpens Klondike at DPR 3, and that drawing a 0.5× frame from the SVG
  matches a Lanczos shrink without its halos.
- 1.1: `ViewportScaler` renders up to 3x, above 2x only within
  `MAX_BUDGETED_DEVICE_PIXELS` (4.5 million). `pixelRatio` now reports the
  ratio the canvas was last sized at, since the ratio depends on the size; only
  the specs read it.
