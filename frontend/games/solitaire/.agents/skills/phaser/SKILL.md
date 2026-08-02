---
name: phaser
description: Master skill for Phaser 4 canvas rendering, scene lifecycles, texture atlas creation, card drag mathematics, and canvas performance optimization in fSolitaire.
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

This directory bundles specialized reference modules for detailed Phaser 4
features. They are reference material, not skills of their own: no agent
discovers a `SKILL.md` nested this deep, so read the file directly when a task
touches its topic.

Each entry below is a directory beside this file containing a `SKILL.md` — for
example `tweens/SKILL.md`. Some also carry a `references/REFERENCE.md` with the
full API surface.

- **Scene Management & Config**: `game-setup-and-config/`, `scenes/`
- **Asset Loading & Textures**: `loading-assets/`, `sprites-and-images/`, `render-textures/`
- **Input & Drag Mathematics**: `input-keyboard-mouse-touch/`, `geometry-and-math/`
- **Groups & Scene Hierarchy**: `groups-and-containers/`, `game-object-components/`
- **Animations & Tweens**: `animations/`, `tweens/`, `time-and-timers/`
- **Drawing & Text**: `graphics-and-shapes/`, `text-and-bitmaptext/`, `curves-and-paths/`
- **Audio & Visual Effects**: `audio-and-sound/`, `filters-and-postfx/`, `particles/`
- **Cameras & Display**: `cameras/`, `scale-and-responsive/`
- **State & Events**: `data-manager/`, `events-system/`, `actions-and-utilities/`
- **Phaser 4 Migration & Features**: `v3-to-v4-migration/`, `v4-new-features/`

Also bundled but unused by a card game: `physics-arcade/`, `physics-matter/`,
`tilemaps/`. Reach for them only if a task genuinely calls for physics or tile
maps.

## Phaser 4 Best Practices for Solitaire

- **Card Sprites & Depth**: Maintain explicit z-index/depth ordering for cards on piles. Top card of a pile should always have the highest depth in its pile.
- **Batching & Draw Calls**: Batch card renders using containers or texture atlases to maintain 60 FPS performance on canvas.
- **Input Boundaries**: Derive card touch/click bounds directly from `engine/render` layout bounds rather than hardcoding canvas positions.
- **Clean Scene Teardown**: Ensure scene listeners, tweens, and texture allocations are cleaned up on scene destruction or variant change.
