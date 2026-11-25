---
name: phaser-canvas-performance
description: Keeping a Phaser 4 game here at its frame rate, by measuring first, few texture switches, no filter on many objects, nothing allocated per frame, pooled objects, depth from one list and a clean end to every scene. Triggers on: canvas performance, frame rate, jank, profiling, garbage collection, memory leak, draw calls, object pool, filter.
---

# Phaser 4 canvas performance

> Few texture switches, nothing allocated while the game runs, and a clean
> end to every scene.

What a game does about its own artwork is its own: the Solitaire
Collection's card atlases and their densities are in
`frontend/games/solitaire/docs/card-sharpness.md`.

## Measure first

Do not optimize from a hunch. Run the game with `yarn start`, take a
performance trace in Chrome's Performance panel, or through a Chrome DevTools
MCP server where your client has one, while doing the slow thing, and read the frame budget before changing anything. A
fix with no number before and after is a guess.

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
  `@fz/phaser/scene`, rather than redrawing a `Graphics` every frame, and
  many small ones into one with `bakeAtlas()`, so what shows them is one
  binding.

## 2. No filter on many objects

A filtered object is drawn through framebuffers of its own, at its texture's
full size, every frame. A shadow filter on each card made the Solitaire
Collection's dragging crawl on phones. Draw an effect many objects share
once, into a `DynamicTexture`, and give each a plain sprite of it. A filter
on a camera or on one large object is fine.

## 3. Nothing allocated per frame

Allocate no objects, arrays or closures in `update()` or in a pointer-move
handler: at 60 to 120 events a second, that turns into pauses for garbage
collection mid-gesture. Keep a scratch object, such as one `Geom.Rectangle`,
and write to it each time.

## 4. Pooled objects

- **Pool what comes and goes often.** Take a burst of sprites from a `Group`
  and give them back, rather than creating and destroying each (Phaser's
  own `groups-and-containers` skill, found as `phaser-core` says). A
  flourish played a set number at a time takes `@fz/core/turns`'s `Turns`
  instead, made with its game objects, each taken in turn, as the breakers',
  Brick Fuzz Pop's and Rickashay's painters do. A tween
  or a timer that runs again and again is one object too, not a new one each
  time.
- **A pooled object that hides still costs a frame while it lies in a
  `Layer`.** The layer's render asks each of its children whether it renders,
  hidden or not, every frame, and a painter that sets each hidden one's
  frame, tint and place pays for that too. Where a pool is large and mostly
  hidden, take what hides out of its layer and put it back as it shows,
  setting its state then, its depth keeping its place among the rest.
  Asteroid Breaker's `Copies` does
  (`frontend/games/asteroid-breaker/src/scene/painters/copies.ts`), each
  object's depth its place in the order it first joined its layer
  (`keepJoinOrder()` in
  `frontend/games/asteroid-breaker/src/scene/layer_order.ts`).
- **An object out of every list is the scene's to destroy as it ends,** since
  Phaser destroys only what its lists hold. `keepJoinOrder()` does it for the
  objects it placed.

## 5. Depth from one list

Order objects by depth, never by removing and re-adding them to a
container. A game keeps its whole z-order in one place, back to front, and
every depth comes from it rather than from a number written where it is
used: the Solitaire Collection's is `RenderLayer`
(`frontend/games/solitaire/src/engine/render/view/render_layers.ts`), and
Asteroid Breaker's is its `layer_order.ts`.

## 6. A clean end

A scene runs in a game that outlives it, and what it leaves behind piles up
with every scene swapped in.

- **Subscribe through `@fz/phaser/scene`'s helpers,** or release through
  `whenSceneEnds()`, so nothing the scene followed outlives it (the
  `phaser-core` skill).
- **Stop its tweens and timers:** one holding a destroyed object keeps it
  alive.
- **Destroy the textures it made for itself,** but never one another scene
  shares with it.
