---
name: phaser-canvas-performance
description: Canvas profiling, texture memory management, garbage collection reduction, frame-budgeting (60 FPS), object pooling, and WebGL batching in Phaser 4 for fSolitaire. Triggers on: canvas performance, 60fps, frame rate, profiling, garbage collection, memory leak, texture atlas, draw calls, object pool.
---

# Phaser 4 Canvas Performance & Profiling

> Keeping the board at 60 FPS: minimal texture swaps, no allocation in the hot
> path, and a clean teardown between variants.

## Measure First

Do not optimize from a hunch. Chrome DevTools MCP is configured for this project
— run the app with `yarn start`, take a performance trace while dragging a
stack, and look at the actual frame budget before changing anything. A "fix"
with no before-and-after number is a guess.

## 1. Minimize Texture Swaps

All card faces, backs and placeholders come from the generated card atlas
(`yarn build:atlas`). Keep new board artwork in that atlas rather than loading
loose images, and avoid interleaving atlas-backed sprites with
separately-textured ones in z-order, since each switch breaks the WebGL batch.

**The atlas can be multi-page, so "one draw call per frame" is not the target.**
Frames are packed into as few pages as fit inside `MAX_PAGE_PX` (4096). Each
deck's 2× set takes two pages (`card_assets-0.png`, `card_assets-1.png`) and its
1× set takes one. A frame touching both pages costs at least two draws. That is
expected, not a regression. The goal is _few and stable_ texture bindings, not
one.

**Draw from the cheapest atlas that does not enlarge the cards.** Each deck is
built at 1× and 2× (see
[vite-bundle-optimization](../vite-bundle-optimization/SKILL.md)). 2× costs
four times the GPU memory, about 62 MB against 16 MB. `BoardDeckLoader`
(`src/engine/render/phaser/deck/board_deck_loader.ts`) works like this:

- It loads 1× while the board's layout scale is at most 1. That covers phones in
  both orientations and most 1080p desktops.
- It moves to 2× once a resize enlarges the board past that.
- It never moves back down on a resize, so a board does not reload its atlas
  back and forth.

View state therefore carries the layout scale, and only
`PhaserTableRenderer` divides it by `PhaserSprites.cardArtScale`. Anything
measured in texels, such as the baked shadow's padding, must be multiplied by
the density. It must also be redrawn from `BoardScene.artScaleChanged` when the
density changes.

**Never give a per-card sprite a filter.** A filtered object is drawn through
framebuffers of its own, at its texture's full size, every frame: a shadow
filter on each card cost 156 framebuffer switches a frame in Klondike and 312
in Spider, which is what made dragging crawl on phones. Draw an effect every
card shares once into a `DynamicTexture` and give each card a plain sprite of
it, as `PhaserCardFactory.bakeCardShadow` does in
`src/engine/render/phaser/scene/phaser_card_factory.ts`.

## 2. Zero-Allocation Render Loop

Do not allocate objects, arrays, or closures inside `update()` or drag-move
handlers — at 60–120 pointer events a second, that is what turns into GC pauses
mid-drag.

```ts
// Bad: garbage on every pointer move
onPointerMove(pointer: Phaser.Input.Pointer) {
  const bounds = new Phaser.Geom.Rectangle(pointer.x, pointer.y, 80, 120);
}

// Good: reuse a pre-allocated scratch object
private readonly scratchBounds = new Phaser.Geom.Rectangle();

onPointerMove(pointer: Phaser.Input.Pointer) {
  this.scratchBounds.setTo(pointer.x, pointer.y, 80, 120);
}
```

## 3. Pool Victory & Particle Sprites

For win animations and particle bursts, reuse sprites from a `Group` pool rather
than creating and destroying them:

```ts
const cardSprite = this.victoryPool.getFirstDead(
  true,
  x,
  y,
  "card-atlas",
  frameKey,
);
if (cardSprite) {
  cardSprite.setActive(true).setVisible(true);
}
```

## 4. Depth Comes From `RenderLayer`

Order sprites with depth, never by removing and re-adding children to
containers. **Take the value from `depthFor(RenderLayer.X)`
(`src/engine/render/view/render_layers.ts`) rather than inventing a number.**
That enum is the board's whole z-order, back to front, and each layer owns a
band 1000 wide — which is what lets a card be ordered within its pile with no
risk of overtaking the layer above.

The bands exist for cases that are easy to get wrong: a card moved to a
foundation takes its new pile's low resting depth the instant the model moves
it, so it flies as `FLYING_CARD` and would otherwise spend the whole flight
drawn underneath the columns it crosses.

## 5. Clean Scene Teardown

When switching variants (Klondike → Spider), leaks compound across switches:

- `this.tweens.killAll()` — a tween holding a destroyed sprite keeps it alive.
- `this.input.off(...)` for every listener the board added.
- Destroy any render textures or temporary canvas textures the scene created.
  The card atlas itself is shared and must **not** be destroyed with the scene.
