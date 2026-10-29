---
name: phaser-core
description: How a game here is drawn with Phaser 4 — the @fz/phaser library (the canvas component, the host, the scene helpers, the headless test harness), where Phaser may be imported, how the Angular shell and a scene talk, how a scene lets go of what it follows, how its specs run, and which phaser-* skill covers each part of Phaser in use. Start here for any Phaser work. Triggers on: Phaser, scene, canvas, fz-phaser-canvas, PhaserHost, @fz/phaser, WebGL, game object, headless, runScene.
---

# Phaser games here

A game drawn with Phaser 4 keeps Phaser to the code that draws, and builds on
`@fz/phaser` (`frontend/lib/phaser/`), which holds what every such game
shares. Its rules are in
[its AGENTS.md](../../../frontend/lib/phaser/AGENTS.md). Two games are
built this way: the Solitaire Collection, whose card-specific rules are in
its own `solitaire-phaser` skill, and Snake (`frontend/games/snake/`), the
smaller one to start from.

## The library

- **`@fz/phaser/canvas`**: `<fz-phaser-canvas>`, the one place an app shows
  Phaser. Its `scene` is a `SceneSource`, a function returning a `MakeScene`
  or a promise of one, and each new one swaps into the same game; `options`
  are the host's (`title`, `background`, Phaser's `config`), read once;
  `label`, if given, names the canvas to assistive technology as an image.
  Its `state` is `loading`, `ready` or `failed`, also as `data-state` on the
  element. It fails a scene whose source rejects, or that isn't ready in a
  minute, and after 8 seconds `slow` (`data-slow`) says it is still
  loading, which the app says to the player. What the app
  projects as `[fzCanvasPlaceholder]` lies over the canvas until the scene
  is ready. It loads the host, and Phaser with it, with `import()` when it
  first shows a scene (`frontend/lib/phaser/src/canvas/`).
- **`@fz/phaser/host`**: `PhaserHost`, which keeps one Phaser game, and so
  one WebGL context, for the canvas's whole life, and `ViewportScaler`,
  which keeps the canvas at its box's size in device pixels. Only the canvas
  makes a host.
- **`@fz/phaser/scene`**: the helpers below, for a scene that lives in a game
  that outlives it.
- **`@fz/phaser/sound`**: `SpritePlayer`, made in a scene's `create()` so
  the scene never waits for its sprite, which plays the sprite's sounds,
  named by its spritemap, while the player wants sound, muting the game
  while they don't; a sprite that fails to load leaves the
  game silent, not broken. `@fz/dev/sounds` synthesizes the sprite.
- **`@fz/phaser/testing`**: the headless harness and the fake canvas, below.
- **`@fz/phaser/insets`**, **`@fz/phaser/color`** and
  **`@fz/phaser/layout`** import nothing but each other, so a game's code
  without Phaser can take them. `fitCells()` in `layout` fits a field of
  cells, across by down, inside a canvas's insets, each cell whole device
  pixels.
- **`@fz/dev`** builds and lints a Phaser game: `gameConfig()` puts Phaser in
  a `phaser` chunk of its own, and `phaser({ files })` from `@fz/dev/eslint`
  lets the folders that draw off `no-unnecessary-condition`, since Phaser
  types a scene's systems as always there, though they aren't before it
  boots or after it ends.

## Where Phaser may be imported

Only in the folders that draw. A game's `eslint.config.js` fences its rules
and its layout off from `/phaser`, anchored, so `@fz/phaser`'s pure entries
still pass: the Solitaire Collection's `src/engine/render/phaser` and
`src/engine/board` draw, and its cards, rules, layout and games are fenced.
Snake keeps four layers (`frontend/games/snake/AGENTS.md`): its rules, a
view that works out what to draw without Phaser, so its specs are plain,
the scene, the one folder that imports Phaser, and the shell.
The Angular shell imports `@fz/phaser/canvas` and a scene source, never
Phaser itself; a source that loads the scene with `import()` keeps Phaser
out of the first download.

## How the shell and a scene talk

- **A scene is built with what it needs.** `MakeScene` is handed the
  scene's `SceneSurroundings`, `insets()` and `ready()`, and the game's own
  ports go in beside them, as the Solitaire Collection's
  `makeBoardScene(gameId, game, { presentation, onReady, insets })` does
  (`frontend/games/solitaire/src/ui/app/provider/board_catalog.ts`).
  Snake's `makeSnakeScene(options)` takes only plain functions over the
  game (`frontend/games/snake/src/scene/snake_scene.ts`), so its specs hand
  it a fake shell.
- **A game that runs in time takes the scene's.** Snake's scene hands the
  game each frame's time in `update()`, and the game steps the run and
  hands back the frame to draw, so the run never steps without being drawn
  and stops when Phaser does.
- **A scene says when it has drawn,** with `ready()`, once its first frame
  is up: `onFirstFrame()` calls it at the right time. The canvas uncovers
  the scene then.
- **The chrome over the canvas** is declared on the canvas's parent, as
  `--fz-canvas-inset-top`, `-right`, `-bottom` and `-left`, and a scene
  reads it with `insets()`. Chrome that moves without the canvas changing
  size calls the canvas's `refreshInsets()`.
- **Every scene is a `HostedScene`,** a Phaser scene with a key no other
  shares, since Phaser throws on a key in use.

## Input

- **The keyboard listens where the game says.** Set Phaser's
  `input.keyboard.target` to the board's element, so the keys reach the
  scene only while it has the focus, and a dialog or the bar keeps its own.
- **Phaser's key captures are global,** whatever the target: a captured key
  has its default prevented everywhere. Capture only the keys the game
  uses, and ignore a held key and one pressed with Ctrl, Alt or Meta, so the
  browser's shortcuts still work.
- **Phaser's mouse prevents the default of `mousedown`,** which keeps the
  focus off the canvas; an element that should take the focus at a click
  focuses itself on `pointerdown`.

## Phaser 4's surprises

- A `Grid`'s `cellPadding` is 0.5 unless set, which leaves a hairline
  between its cells; its `setSize()` is private in the typings, so set
  `width` and `height`; and its alternate cells are those where
  x + y is odd.
- `load.audioSprite()` takes the spritemap itself where its typings ask
  for the JSON's URL, which needs a cast (`SpritePlayer` makes it); under
  `noAudio`, as the test harness's game has, it loads nothing, so a scene
  plays a sound only once the cache has it, and a spec that wants one
  played adds the sprite to `cache.audio` itself.
- `tweens.killAll()` stops every tween a scene runs, for a new run that
  must not inherit the last one's.

## A scene ends; its game doesn't

The host swaps scenes into one game, so a scene lets go of everything it
follows when it ends, or the game keeps it alive. Phaser destroys a removed
scene without shutting it down first, so the end is whichever comes first.

- `whenSceneEnds(scene, release)` runs `release` then.
- `onScaleResize()`, `onContextRestored()` and `onFirstFrame()` subscribe
  until the scene ends, for the game's scale manager, its renderer and the
  scene's first frame.
- `bakeTexture()` draws a texture at run time, with a throwaway `Graphics`,
  and draws it again after a lost WebGL context, which Phaser restores only
  for textures it loaded. `bakeAtlas()` does the same for many frames in
  one texture, packed in rows with a gutter, each a named frame of it, so
  the objects showing them draw in one batch; baked again, it moves its
  frames and keeps their objects. Anything else drawn at run time redraws
  itself through `onContextRestored()`.
- `pixelRatioOf()` is the ratio Phaser maps the pointer by, to lay out in
  device pixels.

## Testing

Specs assert on a scene's game objects, never on pixels; pixels are for a
browser, through a game's screenshots and its `check:layout`.

- **A shell's specs** take `provideFakePhaserCanvas()`, which loads no
  Phaser; `FakePhaserCanvas` keeps the hosts it made, and readies or fails
  each scene they were shown.
- **A scene's specs** run real Phaser in jsdom, its WebGL renderer
  included, on a context that draws nothing. The test setup calls
  `installHeadlessPhaser()` before anything imports Phaser, which tests for
  WebGL as it loads, and `runScene()` runs the scene in a WebGL game whose
  frames, clock, input, context and loads the spec drives. `advance()`
  moves the clock Phaser's tweens read, so a spec fakes no `Date`. Filters,
  dynamic textures and gradients work as in a browser, a canvas is laid
  out at its CSS size, and `await loseContext()` and
  `await restoreContext()` lose and restore the context as a browser may,
  its events on a later task, for a spec of what a scene draws again.
- **Input is a browser's.** `key()` sends a key with the `keyCode` a
  browser gives it, which Phaser hears on the next frame, so `advance()`
  after one; press at most two keys a frame, since with a third Phaser
  sends the earlier ones again, in a browser too. `pointer()` presses,
  moves and lets go with the mouse, on the canvas or on an element of the
  page over it (which Phaser hears through the window, raising
  `pointerdownoutside`), and `touch()` with a finger; Phaser hit-tests and
  raises its own events. An object made interactive answers from the next
  frame, when Phaser takes it in, so `advance()` a frame before the first
  press. Phaser's drag thresholds are 0, so a press on a draggable object
  starts its drag at once.
- **An error a handler throws** while Phaser hears a browser's event
  reaches the window's `error` event, not the spec. jsdom reads its
  stack, and the first stack through Phaser in a file is mapped through
  the source map Vitest makes of Phaser's whole bundle, half a second
  alone and past a spec's timeout under a busy suite, so a spec that
  expects one sets `Error.stackTraceLimit` to 0 while it acts.
- **Code that takes a game,** such as the host and the scaler, is checked
  on a real one: `@fz/phaser`'s own specs start one with its
  `src/testing/start_game.ts`, so Phaser's own writes to the canvas and
  its scale manager are part of what they check.
- **Code that only needs a scene,** such as a factory of sprites, runs in
  `runBareScene()`, a scene with nothing of its own, and the spec makes
  its objects there and reads them back, as Phaser made them.
- **What a scene loads is served.** The harness answers every request
  itself, from `runScene()`'s `serve`, a function from the URL, resolved
  against the page's, to the file's text or bytes, or to nothing, which
  is a 404 that fails the load as a server's would. It asks `serve` as a
  request is sent and answers on a later task, so a server that notes
  what it is asked for knows at once. An image decodes at the size its
  PNG header gives, so a spec serves a real one from disk or
  `pngOfSize()`; an image from an object URL the page made itself loads
  too, at 0 × 0, and `decode()` resolves once an image has loaded. A
  canvas keeps the one context it was first asked for. `await loaded()`
  waits out a load the scene starts once it runs, stepping frames as a
  browser's go on, since Phaser takes in a file queued during a load
  only on a frame; `prepare` readies the game before the scene is added,
  as an earlier scene may have left it, such as with textures loaded.
  Nothing reaches the network. The harness's own specs
  (`frontend/lib/phaser/src/testing/run_scene.spec.ts`) check what it
  relies on in Phaser, so an upgrade that breaks it fails there first.
- Snake's scene specs are the worked example of a scene played with keys
  (`frontend/games/snake/src/scene/snake_scene.spec.ts`, and its
  `snake-testing` skill), and the Solitaire Collection's of a board whose
  atlases are served and loaded, played with the mouse
  (`frontend/games/solitaire/test/engine/render/phaser/scene/board_scene.spec.ts`,
  and its `solitaire-testing` skill).

## The parts of Phaser in use

One skill for each, with its API and pitfalls:

- **Setting up and running:** `phaser-game-setup-and-config`,
  `phaser-scenes`, `phaser-scale-and-responsive`
- **Assets and textures:** `phaser-loading-assets`,
  `phaser-sprites-and-images`, `phaser-render-textures`
- **Drawing:** `phaser-game-object-components`,
  `phaser-graphics-and-shapes`, `phaser-groups-and-containers`
- **Motion and time:** `phaser-tweens`, `phaser-time-and-timers`,
  `phaser-particles`
- **Input:** `phaser-input-keyboard-mouse-touch`
- **Sound:** `phaser-audio-and-sound`
- **Cameras and effects:** `phaser-cameras`, `phaser-filters-and-postfx`
- **Events:** `phaser-events-system`
- **Phaser 4 itself:** `phaser-v3-to-v4-migration`, `phaser-v4-new-features`
- **Performance:** `phaser-canvas-performance`

All but this one and `phaser-canvas-performance` are copies of the
`skills/` folder Phaser's package ships, in
`frontend/node_modules/phaser/skills/`, which also covers animations, text,
curves, geometry, the data manager, actions, physics and tile maps. When a
game starts using one of those, copy its folder into `.agents/skills/` as
`phaser-<name>`, with its `name` and its `../<skill>/` paths prefixed the
same way, and leave the rest as copied, which `.prettierignore` does. Then
run `node .agents/link-claude-skills.mjs`.
