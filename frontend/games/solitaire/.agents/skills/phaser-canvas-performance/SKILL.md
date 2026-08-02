---
name: phaser-canvas-performance
description: Canvas profiling, texture memory management, garbage collection reduction, frame-budgeting (60 FPS), object pooling, and WebGL batching in Phaser 4 for fSolitaire. Triggers on: canvas performance, 60fps, frame rate, profiling, garbage collection, memory leak, texture atlas, draw calls, object pool.
---

# Phaser 4 Canvas Performance & Profiling

> Performance optimization guidelines for maintaining 60 FPS canvas rendering, minimal draw calls, zero garbage collection pauses during gameplay, and clean WebGL texture memory lifecycle in fSolitaire.

## Core Performance Rules

### 1. Maintain Single Texture Atlas Batching
- **One Draw Call per Frame:** All card faces, backs, foundation markers, and UI graphics MUST be packed into the card texture atlas via `yarn build:atlas`.
- **Texture Switching Penalty:** Avoid interleaving Game Objects that use separate textures (e.g. Sprite A from Atlas, Sprite B from loose image, Sprite C from Atlas), as this forces WebGL texture swaps.

### 2. Zero-Allocation Render Loop (Prevent GC Spikes)
- Do NOT allocate new objects, arrays, or anonymous function closures inside `update()` or drag-move event handlers.
- **Pre-allocate Vectors & Rectangles:** Reuse instance properties for scratch calculations:

```ts
// Bad: Creates garbage on every pointer move (60-120 times/sec)
onPointerMove(pointer: Phaser.Input.Pointer) {
  const bounds = new Phaser.Geom.Rectangle(pointer.x, pointer.y, 80, 120);
}

// Good: Reuse pre-allocated scratch objects
private readonly scratchBounds = new Phaser.Geom.Rectangle();

onPointerMove(pointer: Phaser.Input.Pointer) {
  this.scratchBounds.setTo(pointer.x, pointer.y, 80, 120);
}
```

### 3. Object Pooling for Particle & Victory Animations
- When spawning win animation cards or particle bursts, use Phaser `Group` object pools rather than creating and destroying sprites:

```ts
// Reuse dead sprites from pool instead of instantiation
const cardSprite = this.victoryPool.getFirstDead(true, x, y, 'card-atlas', frameKey);
if (cardSprite) {
  cardSprite.setActive(true).setVisible(true);
}
```

### 4. Explicit Depth Sorting vs. Canvas Re-parenting
- Use depth values (`card.setDepth(z)`) to control pile stack ordering rather than removing and re-adding children to containers.
- Depth sorting in Phaser 4 is WebGL batch-friendly and avoids DOM/tree array re-index overhead.

### 5. Clean Scene Shutdown & Memory Teardown
When switching solitaire variants (e.g., Klondike to Spider):
- Stop and remove all active tweens via `this.tweens.killAll()`.
- Remove custom pointer event listeners (`this.input.off(...)`).
- Destroy created render textures or temporary canvas textures to prevent memory leaks.
