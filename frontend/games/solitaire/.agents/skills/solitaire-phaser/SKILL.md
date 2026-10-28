---
name: solitaire-phaser
description: How the Solitaire Collection draws its board with Phaser 4 — where Phaser may be imported in it, the board scene, the card atlases and their densities, keeping cards sharp on a phone, the drawn mobile deck, depth from RenderLayer, and why no card gets a filter. Read the repository's phaser-core skill first. Triggers on: Solitaire board, BoardScene, card atlas, card sprite, sharp cards, blurry cards, depth, RenderLayer, card shadow, drawn deck, build:atlas.
---

# The Solitaire Collection on Phaser

The repository's `phaser-core` skill says how any game here is drawn with
Phaser, and `phaser-canvas-performance` how to keep one fast. This one is
what the Solitaire Collection adds for cards.

## Where Phaser lives

Only `src/engine/render/phaser`, the adapter that draws the view contracts
of `src/engine/render`, and `src/engine/board`, which joins a table game to
it, import Phaser. The cards and rules (`src/engine/core`,
`src/engine/tableau`), the layout and the games know none, and ESLint
enforces it. `makeTableBoardScene` (`src/engine/board/table_board_scene.ts`)
builds a `BoardScene` for any table game, and the shell's provider joins a
game to it (`src/ui/app/provider/board_catalog.ts`), so a game never names
Phaser at all.

`GameCanvasComponent` (`src/ui/app/component/game_canvas/`) shows each board
in `<fz-phaser-canvas>`, with a skeleton of the board's own piles as its
placeholder. A board lives in a game that outlives it, so `BoardScene`
follows nothing but through `@fz/phaser/scene`'s helpers, and loads a deck
in `preload` only when none is resident.

## The card atlases

- Card faces, backs and placeholders are packed into a Phaser
  **multi-atlas**, a manifest and one or more PNG pages, by
  `tools/build-card-atlas.mjs`, into `src/engine/render/assets/sprites/atlas/`.
  Run `yarn build:atlas` whenever the card SVGs in
  `src/engine/render/assets/sprites/card/`, or the generated deck in
  `tools/card-atlas/mobile-deck.mjs`, change: the atlas is committed, so a
  stale one ships. The `solitaire-build` skill has the toolchain.
- **Pages:** frames are packed into as few as fit inside `MAX_PAGE_PX`
  (4096). Each deck's 2× set takes two, every less dense set one, so a frame
  may cost two draws.
- **Densities:** each deck is built at 0.5×, 0.75×, 1×, 1.5× and 2×. GPU
  memory grows with the square of the density, from about 5 MB at 0.5× and
  20 MB at 1× to 76 MB at 2×. `cardArtScaleFor`
  (`src/engine/render/deck/card_art_scale.ts`) picks the least dense atlas
  at least as dense as the board's layout scale, and `BoardDeckLoader`
  (`src/engine/render/phaser/deck/board_deck_loader.ts`) loads it when the
  board is made, moves to a denser one once a resize enlarges the board past
  it, and never moves back down, so a board doesn't reload back and forth.
  Klondike loads 0.5× on a 2× phone held upright, 0.75× on a 3× one, 1.5× on
  a 3× phone on its side, and 1× or 2× in a 1440 × 810 window at 1× or 2×.
- **Spacing:** each density is at most half as dense again as the one below,
  so no card is shrunk below two thirds of its atlas's size. The board
  samples without mipmaps, which WebGL1 allows only for power-of-two
  textures, and below about a half bilinear sampling skips texels and glyph
  edges step. Keep that spacing if a density is added or removed.

## Sharp cards

Five things keep a card sharp on a phone; keep them all when changing how
cards are drawn.

- `ViewportScaler` (`@fz/phaser/host`) sizes the canvas in device pixels at
  the display's ratio, up to 3, within a budget of device pixels above 2,
  and takes the browser's own count of them where it gives one, so a
  fractional ratio such as 2.625 lands on whole pixels.
- Phaser 4 rounds a sprite's corners to whole pixels only while it is
  unscaled, and a card is always scaled. So every sprite drawn from the card
  atlas takes `PhaserCardFactory.VERTEX_ROUND_MODE` (`fullAuto`), which
  rounds whenever the game's `roundPixels` is on. A new kind of atlas sprite
  should too.
- The board draws from the least dense atlas that need not enlarge its cards,
  under the spacing above.
- `DrawnDeckPainter` (`src/engine/render/phaser/deck/drawn_deck_painter.ts`)
  draws the mobile deck at exactly the board's layout scale, once that has
  held for `SETTLE_MS`, from the SVG `yarn build:atlas` writes, and the cards
  draw from it at a scale of exactly 1. Any change of size or deck puts the
  built atlas back. It sits beside the atlas it falls back to, about 10 MB
  more on a 3× phone, and paints only at a scale no built atlas matches,
  since painting takes a few dozen SVG decodes on the main thread.
- The felt's light is a Phaser `Gradient` beneath every layer (`TableLight`,
  `RenderLayer.TABLE_LIGHT`). Never darken the canvas in CSS: it falls on
  the cards too.

`BoardScene.drawCardsFrom` is the one place sprites change texture, for the
deck loader and the painter alike. View state carries the layout scale, and
only `PhaserTableRenderer` turns it into a sprite scale, through
`cardSpriteScale`, which scales each axis on its own, since a frame at a
fractional density is rounded to whole texels (`cardFrameTexels`). Anything
measured in texels, such as the shadow's padding, is multiplied by the
density, and redrawn from `BoardScene.artScaleChanged` when it changes.

## The card shadow

No card gets a filter: a shadow filter on each cost 156 framebuffer
switches a frame in Klondike and 312 in Spider, and dragging crawled on
phones. The shadow is drawn once into a `DynamicTexture`, with a filter, and
every card has a plain sprite of it (`PhaserCardFactory.bakeCardShadow`, in
`src/engine/render/phaser/scene/phaser_card_factory.ts`). It is not a
`bakeTexture()`, since it is filtered, so the board redraws it through
`onContextRestored()`. The card atlas is shared between boards, and is never
destroyed with a scene.

## Depth

Every depth comes from `depthFor(RenderLayer.X)`
(`src/engine/render/view/render_layers.ts`), the board's z-order back to
front; never invent a raw number. Each layer owns a band 1000 wide, which
lets a card be ordered within its pile with no risk of overtaking the layer
above. The bands are for what is easy to get wrong: a card moved to a
foundation takes its new pile's low depth the instant the model moves it,
so it flies as `FLYING_CARD` and would otherwise cross the columns drawn
beneath them.

## Input

Card bounds come from `src/engine/render`'s layout, never from positions on
the canvas, and `src/engine/render/input/` turns the pointer into intents.
