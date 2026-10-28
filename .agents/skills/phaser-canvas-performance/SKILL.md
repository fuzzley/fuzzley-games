---
name: phaser-canvas-performance
description: Keeping a Phaser 4 game here at its frame rate — measuring first, few texture switches, no filters on many objects, nothing allocated per frame, pooled objects, depth from one list of layers, and a scene that lets go of everything when it ends. Triggers on: canvas performance, 60fps, frame rate, jank, profiling, garbage collection, memory leak, draw calls, texture swaps, object pool.
---

# Phaser 4 canvas performance

> Few texture switches, nothing allocated while the game runs, and a clean
> end to every scene.

What a game does about its own artwork is its own: the Solitaire
Collection's card atlases and their densities are in its `solitaire-phaser`
skill.

## Measure first

Do not optimize from a hunch. Run the game with `yarn start`, take a
performance trace in Chrome (its DevTools MCP server is configured for this
repository) while doing the slow thing, and read the frame budget before
changing anything. A fix with no number before and after is a guess.

## 1. Few texture switches

Every switch of texture between two objects drawn one after another breaks
WebGL's batch, so:

- **Keep artwork in an atlas,** or a few, rather than in loose images, and
  don't interleave objects from different textures in depth when they could
  sit together.
- **Few and stable bindings is the goal, not one.** An atlas too big for one
  page takes several, and a frame touching two pages costs at least two
  draws. That is expected.
- **Draw a run-time texture once,** with `bakeTexture()` from
  `@fz/phaser/scene`, rather than redrawing a `Graphics` every frame.

## 2. No filter on many objects

A filtered object is drawn through framebuffers of its own, at its texture's
full size, every frame. A shadow filter on each card cost the Solitaire
Collection 156 framebuffer switches a frame in Klondike, and dragging
crawled on phones. Draw an effect many objects share once, into a
`DynamicTexture`, and give each a plain sprite of it. A filter on a camera
or on one large object is fine.

## 3. Nothing allocated per frame

Allocate no objects, arrays or closures in `update()` or in a pointer-move
handler: at 60 to 120 events a second, that turns into pauses for garbage
collection mid-gesture. Keep a scratch object and reuse it.

```ts
// Bad: garbage on every pointer move
onPointerMove(pointer: Input.Pointer): void {
  const bounds = new Geom.Rectangle(pointer.x, pointer.y, 80, 120);
}

// Good: one scratch rectangle, reused
private readonly scratch = new Geom.Rectangle();

onPointerMove(pointer: Input.Pointer): void {
  this.scratch.setTo(pointer.x, pointer.y, 80, 120);
}
```

## 4. Pooled objects

For what comes and goes often, such as a burst of sprites, take them from a
`Group` and give them back rather than creating and destroying each
(`phaser-groups-and-containers`). A tween or a timer that runs again and
again is one object too, not a new one each time.

## 5. Depth from one list

Order objects by depth, never by removing and re-adding them to a
container. A game keeps its whole z-order in one place, back to front, and
every depth comes from it rather than from a number written where it is
used: the Solitaire Collection's is `RenderLayer`
(`frontend/games/solitaire/src/engine/render/view/render_layers.ts`).

## 6. A clean end

A scene runs in a game that outlives it, and what it leaves behind piles up
with every scene swapped in.

- Subscribe through `@fz/phaser/scene`'s helpers, or release through
  `whenSceneEnds()`, so nothing the scene followed outlives it.
- Stop its tweens and timers: one holding a destroyed object keeps it alive.
- Destroy the textures it made for itself, but never one another scene shares
  with it.
