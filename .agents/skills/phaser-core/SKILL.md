---
name: phaser-core
description: How a game here is drawn with Phaser 4 — the @fz/phaser library (the canvas component, the host, the scene helpers, the headless test harness), where Phaser may be imported, how the Angular shell and a scene talk, how a scene lets go of what it follows, how its specs run, and which phaser-* skill covers each part of Phaser in use. Start here for any Phaser work. Triggers on: Phaser, scene, canvas, fz-phaser-canvas, PhaserHost, @fz/phaser, WebGL, game object, headless, runScene.
---

# Phaser games here

A game drawn with Phaser 4 keeps Phaser to the code that draws, and builds on
`@fz/phaser` (`frontend/lib/phaser/`), which holds what every such game shares.
Its rules are in [its AGENTS.md](../../../frontend/lib/phaser/AGENTS.md). Four
games are built this way: the Solitaire Collection, whose card-specific rules
are in its own `solitaire-phaser` skill; Snake (`frontend/games/snake/`), the
smaller one to start from; Brick Breaker (`frontend/games/brick-breaker/`),
which draws every brick, ball and capsule from one atlas baked at run time
(`bakeAtlas()`); and Asteroid Breaker (`frontend/games/asteroid-breaker/`),
which does the same for its rocks, ship and pickups, on a field that wraps,
beside a deck of controls for a touch screen.

## The library

- **`@fz/phaser/canvas`**: `<fz-phaser-canvas>`, the one place an app shows
  Phaser. Its `scene` is a `SceneSource`, a function returning a scene's
  factory, `(surroundings: SceneSurroundings) => HostedScene`, or a promise
  of one, and each new one swaps into the same game; `options`
  are the host's (`title`, `background`, Phaser's `config`), read once;
  `label`, if given, names the canvas to assistive technology as an image. Its
  `state` is `loading`, `ready` or `failed`, also as `data-state` on the
  element. It fails a scene that isn't ready in a minute, or whose source
  rejects or that can't be built or mounted, handing that error to Angular's
  `ErrorHandler`, and after 8 seconds `slow` (`data-slow`) says it is still
  loading. What the app projects as `[fzCanvasPlaceholder]` lies over the
  canvas until the scene is ready. It loads the host, and Phaser with it,
  with `import()` when it first shows a scene
  (`frontend/lib/phaser/src/canvas/`). `<fz-canvas-cards [canvas]="canvas">`,
  placed in the board's own card layer, says both to the player in Snake,
  Brick Breaker and Asteroid Breaker: Still loading, its words in a status
  region it keeps in the page, the card itself hidden from assistive
  technology, and couldn't be drawn, an alert with Reload.
  `canvasCardOf(canvas)` says which shows, as the cards' `card` does, so the
  board shows none of its own meanwhile, read after `<fz-phaser-canvas>` in
  the board's template, since the canvas's state needs the scene it is
  given. The board sets them as it sets its own, through
  `--fz-canvas-card-room`, `--fz-canvas-card-drop` and `@fz/style`'s
  `board-card-small`, on the element or around it.
  Beside them, `canvasRoom()`, called as a board is made, gives the board the
  canvas it makes, as the host sizes it, and the ratio it renders at, as
  signals (`viewport`, `pixelRatio`), measured as it is first drawn and each
  time its size, the zoom or the display changes, so its placeholder lays the
  board out as the scene will, and `fzKeepKeys` keeps a button's keys from the
  board around it.
- **`@fz/phaser/host`**: the types a scene and a board take of the host,
  and nothing else: `HostedScene`, `SceneSurroundings` and `HostOptions`.
  The host itself, `PhaserHost`, which keeps one Phaser game, and so one
  WebGL context, for the canvas's whole life, and its `ViewportScaler`,
  which keeps the canvas at its box's size in device pixels, are the
  library's own: only the canvas makes a host, so no app can load Phaser
  past it.
- **`@fz/phaser/scene`**: the helpers below, for a scene that lives in a game
  that outlives it.
- **`@fz/phaser/sound`**: `SpritePlayer`, made in a scene's `create()` so
  the scene never waits for its sprite, which plays the sprite's sounds,
  named by its spritemap, while the player wants sound, muting the game
  while they don't, plays one risen by some cents (`playRisen()`), which a
  scene hands to `@fz/core`'s `FrameSounds.playEach()`, and loops one while
  a scene holds it (`hold()`); a sprite that fails to load leaves the game
  silent, not broken. `@fz/dev/sounds` synthesizes the sprite.
- **`@fz/phaser/measure`**: what reads the page for a canvas, as the host
  sizes it and `canvasRoom()` measures it: `watchDevicePixels()` counts an
  element's device pixels, `watchDevicePixelRatio()` hears the display's
  ratio change, as a zoom that leaves the device pixels as they were
  changes it, and `canvasInsetsOf()` reads the insets an element declares
  for the canvas through its own window. It knows no Phaser and no
  framework, and a game's view can't take it, since it reads the page.
- **`@fz/phaser/testing`**: the headless harness and the fake canvas, below.
- **`@fz/phaser/insets`**, **`@fz/phaser/color`**, **`@fz/phaser/layout`**
  and **`@fz/phaser/shapes`** import nothing but each other, so a game's
  code without Phaser can take them. `fitCells()` in `layout` fits a field
  of cells, across by down, inside a canvas's insets, each cell whole device
  pixels, `canvasPixelRatio()` is the ratio a canvas renders at on a
  display, `canvasSizeFor()` the size the host makes a canvas of a box, in
  the device pixels the browser counted where it can, and the ratio it
  renders it at, past 2× only within a budget of device pixels, which a
  placeholder drawn in CSS sizes its cells by, and `rectAttribute()` and
  `namedRectsAttribute()` write where the scene drew a board, or a deck's
  zones, into the board's attributes, as `@fz/dev/layout`'s layout check
  reads them (`readRect()`, `readNamedRects()`). `shapes` is
  the vocabulary a game's art is drawn in, each shape of a frame as plain
  data (`DrawCommand`, `ArtFrame`), so the art and its specs need no
  Phaser; `atlasFrameOf()` in `scene` plays a frame into `bakeAtlas()`.
  Its builders take the geometry first, an `Area`, a `Point` and a radius,
  or a list of `Point`s, and the style last, `{ color }` to fill and
  `{ color, width }` to stroke (`ring(ORIGIN, radius, { color, width })`),
  and `extentOf()` gives back an `Area`. The art's line (`lineWidth()`),
  round-ended lines (`stroke()`), the points of curves (`arcPoints()` and
  the rest), what moves, scales and frames a drawing (`shifted()`,
  `scaledBy()`, `centered()`, `bounded()`) and a symbol's dots and rims in
  a square (`dotIn()`, `discIn()`, `rimIn()`) are there too, so a game draws
  with them rather than its own copies.
- **`@fz/dev`** builds and lints a Phaser game: `gameConfig()` puts Phaser in
  a `phaser` chunk of its own, `phaser({ files })` from `@fz/dev/eslint`
  lets the folders that draw off `no-unnecessary-condition`, since Phaser
  types a scene's systems as always there, though they aren't before it
  boots or after it ends, and `phaserGameLayers()` fences the four layers
  of a game laid out in them and keeps its rules and view off the clock,
  unseeded numbers and the page.

## Where Phaser may be imported

Only in the folders that draw. A game's `eslint.config.js` fences its rules
and its layout off from `/phaser`, anchored, so `@fz/phaser`'s pure entries
still pass: the Solitaire Collection's `src/engine/render/phaser` and
`src/engine/board` draw, and its cards, rules, layout and games are fenced.
Snake keeps four layers (`frontend/games/snake/AGENTS.md`): its rules, a
view that works out what to draw without Phaser, so its specs are plain,
the scene, the one folder that imports Phaser, and the shell. Brick
Breaker keeps the same four (`frontend/games/brick-breaker/AGENTS.md`),
its physics in its rules, and so does Asteroid Breaker
(`frontend/games/asteroid-breaker/AGENTS.md`); all three take their fences
from `@fz/dev`'s `phaserGameLayers()` (`frontend/lib/dev/AGENTS.md`).
The Angular shell imports `@fz/phaser/canvas` and a scene source, never
Phaser itself; a source that loads the scene with `import()` keeps Phaser
out of the first download.

## How the shell and a scene talk

- **A scene is built with what it needs.** A scene's factory is handed its
  `SceneSurroundings`, `insets()` and `ready()`, and the game's own ports go
  in beside them, as the Solitaire Collection's
  `makeBoardScene(gameId, game, { presentation, onReady, insets })` does
  (`frontend/games/solitaire/src/ui/app/provider/board_catalog.ts`).
  Snake's `makeSnakeScene(options)` takes only plain functions over the
  game (`frontend/games/snake/src/scene/snake_scene.ts`), so its specs hand
  it a fake shell.
- **A game that runs in time takes the scene's.** Snake's scene hands the
  game each frame's time in `update()`, as Brick Breaker's hands its game
  the time and the steering, and the game steps the run and hands back the
  frame to draw, so the run never steps without being drawn and stops
  when Phaser does. A game of fixed steps keeps them with `@fz/core/clock`,
  and its scene reads what each step did from an `@fz/core/event_log`, as
  Brick Breaker's does (the `fuzzley-ui` skill).
- **A scene says when it has drawn,** with `ready()`, once its first frame
  is up: `onFirstFrame()` calls it at the right time. The canvas uncovers
  the scene then.
- **The chrome over the canvas** is declared on the canvas's parent, as
  `--fz-canvas-inset-top`, `-right`, `-bottom` and `-left`, and a scene
  reads it with `insets()`, a board's placeholder with `canvasRoom()`.
  Chrome that moves without the canvas changing size calls the canvas's
  `refreshInsets()`.
- **Every scene is a `HostedScene`,** a Phaser scene with a key no other
  shares, since Phaser throws on a key in use:
  `uniqueSceneKey("snake-scene")` numbers the scenes of a prefix as they
  are built.

## Input

- **The keyboard listens where the game says.** Set Phaser's
  `input.keyboard.target` to the board's element, so the keys reach the
  scene only while it has the focus, and a dialog or the bar keeps its own.
- **Hear the keys through `onKeyDown()` and `onKeyUp()`,** from
  `@fz/phaser/scene`, not the keyboard's own key events. Phaser runs
  through the frame's whole queue of key events as each new one comes,
  dropping only one that repeats the event just before, so from the third
  key of a frame on, every key before it is handed over again; the helpers
  hand over each once.
- **A captured key's default is cancelled only on the keyboard's target,**
  pressed there or on anything inside it. The captures are the game's,
  shared by every scene. Capture only the keys the game uses, and ignore a
  held key and one pressed with Ctrl, Alt or Meta (`@fz/core/keys`'s
  `isShortcut()`), so the browser's shortcuts still work.
- **Let go as the player looks away.** A scene that holds a key or a
  finger while it is down lets go of it through `onPlayerAway()`, as the
  window loses the focus, the page is hidden or the focus leaves the
  keyboard's target for anything outside it, since the key's or the
  finger's release may never reach it. One look-away may call the listener
  more than once, so letting go must be safe to repeat.
- **A button over the board keeps its keys with `fzKeepKeys`,** from
  `@fz/phaser/canvas`. Without it, a key pressed on the button reaches the
  scene too, which acts on Enter or Space besides the button, and Phaser
  cancels Space's keyup, at which a browser clicks a button, so the focus is
  left on a button that goes.
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
  played adds the sprite there itself, with `@fz/phaser/testing`'s
  `cacheSounds()`.
- `tweens.killAll()` stops every tween a scene runs, for a new run that
  must not inherit the last one's.
- A `CanvasTexture`'s `setSize()` uploads its canvas, blank, whenever the
  size changes; its `clear()` reads the canvas back and uploads it, unless
  its last argument is `false`; and `createCanvas()` uploads a new one
  blank and reads it back. So a canvas texture drawn again under its own
  key, as a bake is, goes through `drawCanvasTexture()`, from
  `@fz/phaser/scene`, each time: it sizes the canvas, its source and its
  whole frame by hand at a new size, clears it with `clear(…, false)` at
  the same one, and draws a new texture on a canvas of Phaser's pool
  before making it, so each drawing uploads once. The drawing touches
  nothing but the context it is handed, which is saved before it and
  restored after, so no transform or clip it leaves narrows the next
  clear. A `Graphics` draws there with
  `generateTexture(context.canvas, width, height)`: its
  `generateTexture()` of the key would upload the texture again, as its
  `refresh()` would, and on a first drawing, where the key has no texture
  yet, make one of its own, for which `drawCanvasTexture()` throws.
  `bakeTexture()` draws through it, and so do Asteroid Breaker's points. A
  canvas drawn once, then added under a fresh key with `addCanvas()`, as
  the Solitaire Collection's deck is
  (`frontend/games/solitaire/src/engine/render/phaser/deck/drawn_deck_painter.ts`),
  uploads once already, and needs none of it.

## A scene ends; its game doesn't

The host swaps scenes into one game, so a scene lets go of everything it
follows when it ends, or the game keeps it alive. Phaser destroys a removed
scene without shutting it down first, so the end is whichever comes first.

- `whenSceneEnds(scene, release)` runs `release` then.
- `onScaleResize()`, `onContextRestored()`, `onFirstFrame()` and
  `onPlayerAway()` subscribe until the scene ends, for the game's scale
  manager, its renderer, the scene's first frame drawn, and the window,
  the page and the keyboard's target.
- `bakeTexture()` draws a texture at run time, with a throwaway `Graphics`,
  and draws it again after a lost WebGL context, which Phaser restores only
  for textures it loaded. `bakeAtlas()` does the same for many frames in
  one texture, each a named frame of it, so the objects showing them draw
  in one batch. It packs them in rows with a gutter, tallest first, so a
  game hands them over in any order. Baked again, it moves its
  frames and keeps their objects, but an object showing one takes its new
  size and origin only once it sets the frame again (`setFrame()`, or
  `setTexture()` for a `NineSlice`), and one left on a frame the new bake
  dropped throws as it draws: a scene sets every frame again after a
  bake, as `retakeFrames(scene, key)` has every image and sprite on the
  texture do, in layers and containers too; a particle emitter reads its
  frames as it emits and needs nothing. `picturesOf()` encodes the frames
  that records and lists of names give, as How to play shows them, each
  time it is called. Anything else drawn at run time redraws itself through
  `onContextRestored()`.
- `pixelRatioOf()` is the ratio Phaser maps the pointer by, to lay out in
  device pixels.

## Testing

Specs assert on a scene's game objects, never on pixels; pixels are for a
browser, through a game's screenshots and its `check:layout`.

- **A shell's specs** take `provideFakePhaserCanvas()`, which loads no
  Phaser; `FakePhaserCanvas` keeps the hosts it made, and readies or fails
  each scene they were shown. A scene it readies at once is ready only
  after the `show()` that asked has returned, as a real host's is, so a
  spec that needs the board drawn awaits `fixture.whenStable()` after
  rendering it. A spec that fails a scene calls `collectErrors()` before
  it renders, which keeps what the canvas hands Angular's `ErrorHandler`
  rather than printing it, and asserts on it. jsdom has no
  `ResizeObserver`, so a board that watches its size is specced inside a
  describe that calls `watchResizes()`, which stands `FakeResizeObserver`
  in, and `resize()` lays the board out at a size and tells it, with the
  device pixels the browser counted where the spec gives them. A change of
  zoom that leaves those as they were reaches the board through a
  `(resolution)` query, which `@fz/game-ui/testing`'s fake viewport answers
  and changes (`setPixelRatio()`).
- **A scene's specs** run real Phaser in jsdom, its WebGL renderer
  included, on a context that draws nothing. The test setup calls
  `installHeadlessPhaser()` before anything imports Phaser, which tests for
  WebGL as it loads, and `runScene()` runs the scene in a WebGL game whose
  frames, clock, input, context and loads the spec drives. `advance()`
  moves the clock Phaser's tweens read, so a spec fakes no `Date`. Filters,
  dynamic textures and gradients work as in a browser, a canvas is laid
  out at its CSS size, its 2D context measures text as a font whose every
  character is alike, at the size its `font` names, and
  `await loseContext()` and `await restoreContext()` lose and restore the
  context as a browser may, its events on a later task, for a spec of what
  a scene draws again.
- **Input is a browser's.** `key()` sends a key with the `keyCode` a browser
  gives it, which Phaser hands the scene at once and keeps with the frame's
  other keys until the frame ends, so the keys sent before one `advance()` are
  one frame's. A scene that hears them through `onKeyDown()` and `onKeyUp()`
  takes any number a frame; Phaser's own key events hand the earlier ones over
  again from the third on, in a browser too. `pointer()` presses, moves and
  lets go with the mouse, on the canvas or on an element of the page over it
  (which Phaser hears through the window, raising `pointerdownoutside`), and
  `touch()` with a finger; Phaser hit-tests and raises its own events. An
  object made interactive answers from the next frame, when Phaser takes it
  in, so `advance()` a frame before the first press. Phaser's drag thresholds
  are 0, so a press on a draggable object starts its drag at once.
- **user-event's keys carry no `keyCode`,** which Phaser's capture reads, so
  Phaser cancels nothing user-event presses. A spec of a capture, such as
  Space kept from the board by a button's `fzKeepKeys`, sends the key with
  `fireEvent` and its `keyCode`, as `key()` does. Phaser also drops a key
  event whose key code, type and time match those of the one before it, so
  two keydowns in a row from user-event in one millisecond, as under fake
  timers, reach the scene as one.
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
- **A scene run as a board shows it** takes `runKeyedScene()`, whose
  keyboard listens on an element of the page that takes the focus, as a
  board's does, and which destroys the run and removes the element once
  the test finishes, so a spec's helper that starts the board needs no
  `afterEach`.
- **What a scene drew is read through the harness,** never by hand:
  `objectsIn()` and `imagesIn()` count and find its game objects,
  in its layers too, and a `Graphics` is read with `commandsOf()`, its
  command buffer as commands by name, `strokesOf()`, the arcs it strokes,
  as WebGL draws them, each in the width set as it is drawn and the color
  set as its path is stroked, and `colorsOf()`, the colors it fills and
  strokes in. Phaser doesn't export the numbers it writes for each
  command, so `commandsOf()` keeps its own, and its spec
  (`frontend/lib/phaser/src/testing/graphics_commands.spec.ts`) draws every
  command and reads it back, so a release that numbers them anew fails
  there first, and no spec reads a buffer by those numbers itself.
- **A spec in Node,** of a game's view, takes `@fz/phaser/testing/pure`,
  which loads no Phaser: `viewport()` is a canvas's `Viewport` from a CSS
  size, a pixel ratio and its chrome.
- **What a scene loads is served.** The harness answers every request
  itself, from `runScene()`'s `serve`, a function from the URL, resolved
  against the page's, to the file's text or bytes, or to nothing, which
  is a 404 that fails the load as a server's would. It asks `serve` as a
  request is sent and answers on a later task, so a server that notes
  what it is asked for knows at once. An image decodes at the size its
  PNG header gives, so a spec serves a real one from disk (the library's
  own make theirs with `pngOfSize()`, in
  `frontend/lib/phaser/src/testing/served_files.ts`); an image from an
  object URL the page made itself loads too, at 0 × 0, and `decode()`
  resolves once an image has loaded. A canvas keeps the one context it
  was first asked for. `await loaded()` waits out a load the scene starts
  once it runs, stepping frames as a browser's go on, since Phaser takes
  in a file queued during a load only on a frame; `prepare` readies the
  game before the scene is added, as an earlier scene may have left it,
  such as with textures loaded. Nothing reaches the network. The
  harness's own specs (`frontend/lib/phaser/src/testing/run_scene.spec.ts`)
  check what it relies on in Phaser, so an upgrade that breaks it fails
  there first.
- Snake's scene specs are the worked example of a scene played with keys
  (`frontend/games/snake/src/scene/snake_scene.spec.ts`, and its
  `snake-testing` skill); Brick Breaker's, of one whose atlas is baked at
  run time, played with keys and the pointer
  (`frontend/games/brick-breaker/src/scene/bricks_scene.spec.ts`, and its
  `brick-breaker-testing` skill); Asteroid Breaker's, of one played with
  keys, the mouse and a deck drawn on the canvas
  (`frontend/games/asteroid-breaker/src/scene/belt_scene.spec.ts`, and its
  `asteroid-breaker-testing` skill); and the Solitaire Collection's of a board
  whose atlases are served and loaded, played with the mouse
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
