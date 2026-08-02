---
name: phaser-core
description: Master skill for Phaser 4 canvas rendering, scene lifecycles, texture atlas creation, card drag mathematics, and canvas performance optimization in fSolitaire. Overview of all phaser-* skills.
---

# Phaser 4 Rendering & Scene Master Skill

This skill governs Phaser 4 canvas integration within fSolitaire. Phaser 4 is isolated in `src/engine/render/phaser` and `src/game/render` to ensure game logic remains framework-agnostic.

## Key Architectural Principles

1. **Decoupled Renderer**: Phaser 4 code MUST live exclusively under `src/engine/render/phaser` or `src/game/render`. Core card logic (`engine/core`), layout math (`engine/render`), and rules engine (`engine/tableau`) must NEVER import Phaser.
2. **Phaser Canvas Host**: `PhaserHost` (`src/engine/render/phaser/phaser_host.ts`) hosts Phaser scenes. The Angular application shell hands a board factory to `PhaserHost` without importing Phaser modules directly into UI components.
3. **Texture Atlas Management**:
   - Card graphics and UI textures are built into single texture atlas files via `tools/build-card-atlas.mjs`.
   - Run `yarn build:atlas` whenever SVG assets or card frame graphics in `assets/` are added or modified.

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

- **Card Sprites & Depth**: Maintain explicit z-index/depth ordering for cards on piles. Top card of a pile should always have the highest depth in its pile.
- **Batching & Draw Calls**: Batch card renders using containers or texture atlases to maintain 60 FPS performance on canvas.
- **Input Boundaries**: Derive card touch/click bounds directly from `engine/render` layout bounds rather than hardcoding canvas positions.
- **Clean Scene Teardown**: Ensure scene listeners, tweens, and texture allocations are cleaned up on scene destruction or variant change.
