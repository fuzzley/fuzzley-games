---
name: phaser-core
description: Master skill for Phaser 4 canvas rendering, scene lifecycles, texture atlas creation, card drag mathematics, and canvas performance optimization in fSolitaire. Overview of all phaser-* skills.
---

# Phaser 4 Rendering & Scene Master Skill

This skill governs Phaser 4 canvas integration within fSolitaire. Phaser 4 is isolated in `src/engine/render/phaser` so that game logic stays framework-agnostic.

## Key Architectural Principles

1. **Decoupled Renderer**: Phaser 4 code MUST live under `src/engine/render/phaser`. Core card logic (`src/engine/core`), layout math (`src/engine/render`), and the rules runtime (`src/engine/tableau`) must NEVER import Phaser — ESLint enforces this. Games assemble their board through `src/games/common/board_scene_factory.ts` rather than reaching for Phaser directly.
2. **Phaser Canvas Host**: `PhaserHost` (`src/engine/render/phaser/phaser_host.ts`) hosts Phaser scenes. The Angular application shell hands a board factory to `PhaserHost` without importing Phaser modules directly into UI components.
3. **Texture Atlas Management**:
   - Card graphics are packed into a Phaser **multi-atlas** (a manifest plus one
     or more PNG pages) by `tools/build-card-atlas.mjs`, written to
     `src/engine/render/assets/sprites/atlas/`.
   - Run `yarn build:atlas` whenever the card SVGs in
     `src/engine/render/assets/sprites/card/` change. The atlas is a committed
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

- **Card Sprites & Depth**: Every depth comes from `depthFor(RenderLayer.X)` in `src/engine/render/layout/render_layers.ts` — that enum is the board's z-order, back to front. Never invent a raw depth number.
- **Input Boundaries**: Derive card touch/click bounds from the `engine/render` layout bounds rather than hardcoding canvas positions.
- **Clean Scene Teardown**: Clean up scene listeners, tweens and any textures the scene created on destruction or variant change.
- **Performance**: See the `phaser-canvas-performance` skill for batching, allocation and teardown detail — and measure before optimizing.
