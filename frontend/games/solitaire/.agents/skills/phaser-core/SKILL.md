---
name: phaser-core
description: Master skill for Phaser 4 canvas rendering, scene lifecycles, texture atlas creation, card drag mathematics, and canvas performance optimization in fSolitaire. Overview of all phaser-* skills.
---

# Phaser 4 Rendering & Scene Master Skill

This skill governs Phaser 4 canvas integration within fSolitaire. Phaser 4 is isolated in `src/engine/render/phaser` so that game logic stays framework-agnostic.

## Key Architectural Principles

1. **Decoupled Renderer**: Phaser 4 code MUST live under `src/engine/render/phaser`. Core card logic (`src/engine/core`), layout math (`src/engine/render`), and the rules runtime (`src/engine/tableau`) must NEVER import Phaser — ESLint enforces this. Games never name Phaser at all: `src/engine/board/table_board_scene.ts` builds the board scene for any table game, and the shell's provider joins a game to it.
2. **Phaser Canvas Host**: `PhaserHost` (`src/engine/render/phaser/host/phaser_host.ts`) keeps one Phaser game, and so one WebGL context, for the life of the canvas, and swaps each board scene into it with `show`. The Angular application shell hands a board factory to `PhaserHost` without importing Phaser modules directly into UI components. Because the game outlives every board, a `BoardScene` releases what it subscribed to on `SHUTDOWN` or `DESTROY`, whichever comes first (Phaser destroys a removed scene without shutting it down), and loads a deck in `preload` only when none is resident.
3. **Texture Atlas Management**:
   - Card graphics are packed into a Phaser **multi-atlas** (a manifest plus one
     or more PNG pages) by `tools/build-card-atlas.mjs`, written to
     `src/engine/render/assets/sprites/atlas/`.
   - Run `yarn build:atlas` whenever the card SVGs in
     `src/engine/render/assets/sprites/card/`, or the generated deck in
     `tools/card-atlas/mobile-deck.mjs`, change. The atlas is a committed
     build artifact, so a stale one ships.
   - See the `vite-bundle-optimization` skill for the toolchain in full.

## Core Phaser 4 Sub-topics & Reference Map

Specialized Phaser 4 skills are accessible directly under `.agents/skills/phaser-*`. Each entry below maps to a top-level skill directory (e.g. `phaser-tweens/SKILL.md`). Some also carry a `references/REFERENCE.md` with the full API surface.

- **Scene Management & Config**: `phaser-game-setup-and-config/`, `phaser-scenes/`
- **Asset Loading & Textures**: `phaser-loading-assets/`, `phaser-sprites-and-images/`, `phaser-render-textures/`
- **Input & Drag Mathematics**: `phaser-input-keyboard-mouse-touch/`, `phaser-geometry-and-math/`
- **Groups & Scene Hierarchy**: `phaser-groups-and-containers/`, `phaser-game-object-components/`
- **Animations & Tweens**: `phaser-animations/`, `phaser-tweens/`, `phaser-time-and-timers/`
- **Drawing & Text**: `phaser-graphics-and-shapes/`, `phaser-text-and-bitmaptext/`, `phaser-curves-and-paths/`
- **Audio & Visual Effects**: `phaser-audio-and-sound/`, `phaser-filters-and-postfx/`, `phaser-particles/`
- **Cameras & Display**: `phaser-cameras/`, `phaser-scale-and-responsive/`
- **State & Events**: `phaser-data-manager/`, `phaser-events-system/`, `phaser-actions-and-utilities/`
- **Phaser 4 Migration & Features**: `phaser-v3-to-v4-migration/`, `phaser-v4-new-features/`

Also bundled but unused by a card game: `phaser-physics-arcade/`, `phaser-physics-matter/`,
`phaser-tilemaps/`. Reach for them only if a task genuinely calls for physics or tile
maps.

## Phaser 4 Best Practices for Solitaire

- **Card Sprites & Depth**: Every depth comes from `depthFor(RenderLayer.X)` in `src/engine/render/view/render_layers.ts` — that enum is the board's z-order, back to front. Never invent a raw depth number.
- **Input Boundaries**: Derive card touch/click bounds from the `engine/render` layout bounds rather than hardcoding canvas positions.
- **Sharp Cards**: Five things keep a card sharp on a phone; keep them all when changing how cards are drawn.
  - `ViewportScaler` (`src/engine/render/phaser/host/viewport_scaler.ts`) sizes the canvas in device pixels at the display's pixel ratio, up to 3. Above 2 it keeps the canvas within `MAX_BUDGETED_DEVICE_PIXELS`, which suits a phone but not a laptop, so the browser never has to stretch a phone's canvas. Where the browser counts the parent's device pixels (`watchDevicePixels`, a `ResizeObserver` on the `device-pixel-content-box`) and the canvas renders at the display's own ratio, it takes that count, so a fractional ratio such as 2.625 lands on whole pixels; a count that disagrees with the CSS size, as Chrome's device emulation gives, is ignored. It then calls `scale.refresh()`, because Phaser measured the canvas for pointer input before its CSS size was pinned.
  - Phaser 4 rounds a sprite's corners to whole pixels only while it is unscaled (`vertexRoundMode` `safeAuto`), and a card is always scaled. So every sprite drawn from the card atlas takes `PhaserCardFactory.VERTEX_ROUND_MODE` (`fullAuto`), which rounds whenever the game config's `roundPixels` is on. A new kind of atlas sprite should too.
  - The board draws from the least dense atlas that need not enlarge its cards, and the densities are close enough that none is shrunk below two thirds (see `phaser-canvas-performance`).
  - `DrawnDeckPainter` (`src/engine/render/phaser/deck/drawn_deck_painter.ts`) draws the mobile deck at exactly the board's layout scale once it has held for `SETTLE_MS`, from the SVG `yarn build:atlas` writes, and the cards draw from it at a scale of exactly 1. Any change of size or deck puts the built atlas back. `BoardScene.drawCardsFrom` is the one place sprites change texture, for the deck loader and the painter alike.
  - The felt's light is a Phaser `Gradient` beneath every layer (`TableLight`, `RenderLayer.TABLE_LIGHT`). Never lay a darkening over the canvas in CSS: it falls on the cards too.
- **Clean Scene Teardown**: Clean up scene listeners, tweens and any textures the scene created on destruction or variant change.
- **Performance**: See the `phaser-canvas-performance` skill for batching, allocation and teardown detail — and measure before optimizing.
