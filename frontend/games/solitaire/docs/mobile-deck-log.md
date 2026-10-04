# Mobile card deck: work log

This file tracks the work on a card deck drawn for phones: flat faces whose
rank and suit stay readable in the strip a fanned card leaves showing. It
records what was decided, what is done and what is next, so the work can stop
and restart at any commit.

**Branch:** `feature/mobile-card-deck`, cut from `main` at `3edd791`.

**Status:** in progress.

## How to pick this up

1. `git checkout feature/mobile-card-deck` and read [Progress](#progress).
2. Run `yarn tsc && yarn test` to confirm the tree is green before going on.
3. Take the first unchecked step. Each step is one commit, or a few, and adds
   an entry to [Log](#log) saying what changed and anything surprising.

## The problem

A face-up card in a column shows only its top 45 design units
(`TABLEAU_FACE_UP_OFFSET`), and a card in a fanned waste only its left 55
(`WASTE_FAN_OFFSET_X`), of a 220 x 307 frame. A seven-column board on a 390
CSS px phone draws a design unit at about 0.24 CSS px, so that strip is about
11 px tall; on a ten-column board, about 7.6 px. The current decks spend it on
a thin serif rank about 7 px tall, a corner pip about 5 px, and the tops of the
pip patterns and court artwork.

## Decisions

Settled with the project owner before any code changed.

1. **Offered everywhere, the default on a phone.** The deck is listed in the
   settings drawer at every size. A player who has not chosen a deck gets it
   when the viewport is compact; a stored choice always wins, and the deck is
   never swapped in automatically.
2. **Two suit colours.** Red and black, because the alternating-colour games
   build on them.
3. **Art first.** The fan offsets stay as they are. Once the deck is on a
   phone, decide whether the compact layout should open the fans wider.

## The plan

### Phase 1: make the atlas tool take more than one kind of deck

- **1.1** Move the half of `tools/build-card-atlas.mjs` that every deck
  shares (rasterizing, the card edge, shrinking to each density, packing and
  writing the manifest) into a module, so a deck can come from a sheet or be
  generated. Add `--deck <id>` to build one deck. Gate: `yarn build:atlas`
  leaves `git status` clean.

### Phase 2: generate the deck

- **2.1** A bundled open-licence font, so the output does not depend on the
  fonts of the machine that builds it.
- **2.2** `tools/card-atlas/mobile-deck.mjs`: one SVG per frame, rendered at
  the raster density. Rank and suit in both strips, one large pip on a number
  card, a large letter on a tinted panel on a court card, flat backs. Frame
  names unchanged, so the engine needs nothing new to draw it.
- **2.3** Checks that fail the build: every index glyph inside its strip, the
  suit colours legible against the paper, every frame present, every edge
  stamped.
- **2.4** `--preview`: a contact sheet of a fanned column and a fanned waste at
  phone scale, beside the `indexed` deck.

### Phase 3: offer it

- **3.1** Register the deck: `CardDeckId`, `CARD_DECKS`, the manifests in
  `card_deck_atlas.ts`, and a preview in the settings drawer.
- **3.2** Default to it on a compact viewport when nothing is stored.
- **3.3** Docs: `NOTICE` for the font, `.agents/AGENTS.md`, the
  `vite-bundle-optimization` skill, the tool's header.

### Phase 4: check it

- **4.1** Specs for the new deck id, the compact default and the drawer's
  preview.
- **4.2** On a phone-sized viewport in Chrome: Klondike draw three and Spider,
  beside the `indexed` deck.
- **4.3** `yarn verify`.

## Progress

- [x] 1.1 Shared atlas writer, `--deck`
- [x] 2.1 Bundled font
- [x] 2.2 Mobile deck generator
- [x] 2.3 Build checks
- [x] 2.4 Preview contact sheet
- [ ] 3.1 Register the deck
- [ ] 3.2 Compact default
- [ ] 3.3 Docs
- [ ] 4.1 Specs
- [ ] 4.2 Browser check
- [ ] 4.3 `yarn verify`

## Log

### Setup

The atlas build reproduces the committed pages and manifests byte for byte
(about 17 s for the three decks), so a refactor of the tool can be checked by
rebuilding and finding nothing changed.

### 1.1 Shared atlas writer

`tools/build-card-atlas.mjs` now only lists the decks, cuts the placeholders
and runs the build. The rest moved into `tools/card-atlas/`: `raster.mjs` (the
frame size, the densities, rasterizing, cutting, edge measuring),
`sheet-deck.mjs` (finding and cutting the cards on a sheet) and
`atlas-writer.mjs` (the card edge, shrinking, packing, the manifest). A deck is
an id, a `source` for the log line and a `cards()` that returns its frames at
the raster density. The code moved verbatim; a full rebuild leaves every page
and manifest byte for byte as it was. `--deck <id>` builds one deck, and an
unknown id fails with the list of ids. Files in `tools/card-atlas/` are
kebab-case like the rest of `tools/`.

### 2.1 Bundled font

Barlow Condensed Bold, from the Google Fonts repository, with its OFL licence
beside it in `tools/card-atlas/fonts/` and an entry in `NOTICE`. Compared with
Barlow Condensed ExtraBold, Fira Sans Condensed Bold and Roboto Condensed at
phone size: Barlow Bold kept its counters open and drew the narrowest 10. Its
cap height is 70% of the em, and the Q's tail drops a further 10%, which is
what limits the index (below). Roboto Condensed is a variable font, which
resvg drew at its default weight only; a static file is needed.

### 2.2 to 2.4 The generator, its checks and the preview

The deck's id is `mobile`. `tools/card-atlas/mobile-deck.mjs` draws one SVG
per frame and renders it with the bundled font only:

- **Index.** The rank at the top left, a pip under it and a pip at the top
  right. The rank's cap height is 36 units; the Q comes out at about 34,
  because its tail has to stay inside the 45 unit strip. Every rank and pip is
  rendered alone first and its ink measured, so the fitting and the checks
  work from what is actually drawn rather than from the boxes.
- **Body.** Everything else sits right of the waste's strip and below the
  column's, so the strips show nothing but the index: one large pip on a
  number card (a larger one on an ace), and on a court card the letter over a
  pip on a panel tinted by suit colour.
- **Backs.** A flat field, a white inset border and a quiet lattice; the 18
  units a face-down card shows are the border.
- **Checks.** The index stays inside both strips, nothing else enters them,
  no ink touches the frame's edge, and each suit colour has 4.5:1 contrast on
  the paper and on its court panel. Both checks were made to fail on purpose
  before being trusted. A check shared with the sheet decks fails any deck
  whose frames are not exactly the 52 faces and two backs.
- **Preview.** `yarn build:atlas --preview` writes
  `tools/card-atlas/.preview/decks.png` (gitignored): every deck's fanned
  column and draw-three waste at the size a seven-column and a ten-column board
  draw them on a 390 CSS px phone at 3x.

The 1x page is 334 KB against about 1.6 MB for the artwork decks, because flat
art compresses so well; GPU memory per page is unchanged.

Left as is: the diamond still reads a little lighter than the other suits at
index size, because a rhombus fills half its box. Growing it would cost the
clearance around the strip pip.
