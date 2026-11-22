---
name: phaser-core
description: How a game here is drawn with Phaser 4 on @fz/phaser — which piece of the library to reach for, where Phaser may be imported, how the shell and a scene talk, input, a scene's end, headless specs, and where Phaser's own skills are. Triggers on: Phaser, scene, canvas, fz-phaser-canvas, @fz/phaser, bakeAtlas, shapes, SpritePlayer, runScene, headless, WebGL.
---

# Phaser games here

A game drawn with Phaser 4 keeps Phaser to the code that draws, and builds on
`@fz/phaser` (`frontend/lib/phaser/`), which holds what every such game shares.
The library's own rules are in
[its AGENTS.md](../../../frontend/lib/phaser/AGENTS.md).

Snake (`frontend/games/snake/`) is the small game to read first. Its board
(`frontend/games/snake/src/app/board/board.component.ts`, with its template)
shows a scene, and its scene (`frontend/games/snake/src/scene/snake_scene.ts`)
does most of what this skill asks of one. Brick Breaker, Asteroid Breaker and
Brick Fuzz Pop are laid out as Snake is, and bake their art into one atlas at
run time (`frontend/games/brick-breaker/src/scene/atlas.ts`). The Solitaire
Collection is laid out its own way, which its `add-solitaire-game` skill
covers.

## The library

An entry is `@fz/phaser/<folder>`. Its `index.ts`, in
`frontend/lib/phaser/src/<folder>/`, lists all it holds, and each piece's doc
comment says how to call it. This list names what to reach for before
writing a piece, not all an entry holds: its `index.ts` has the rest. A piece
named here that is renamed, or one added that a game would write for itself
without knowing of it, changes its line in the same change, as
`frontend/AGENTS.md` asks.

- **`canvas` shows a scene in a page.** `<fz-phaser-canvas>` takes a `scene`
  (a `SceneSource`: a function returning the scene's factory, or a promise of
  it), `options`, read once, which a board takes from
  `boardHostOptions(title, element)`, and a `label` where the canvas is to be
  named as an image. Each new `scene` swaps into the same game. What the app
  projects as `[fzCanvasPlaceholder]` lies over the canvas until the scene is
  ready. Its `state` is `loading`, `ready` or `failed`, and `slow` says a load
  is taking long. `<fz-canvas-cards [canvas]="canvas">`, in the board's own
  card layer, tells the player the board is still loading or couldn't be
  drawn, and `canvasCardOf(canvas)` names the card it shows, so the board
  shows none of its own meanwhile. `canvasRoom()` gives a board the canvas's
  size and pixel ratio as signals, so its placeholder lays the board out as
  the scene will. `fzKeepKeys` keeps a button's keys from the board.
  `settledPictures(hand)` hands on the pictures of each bake of the scene's
  atlas, a later one only once a resize has stopped.
- **`host` holds types alone:** `HostedScene`, `SceneSurroundings` and
  `HostOptions`. Only the canvas makes a host, which keeps one Phaser game,
  and so one WebGL context, for the canvas's whole life.
- **`scene` holds a scene's helpers,** which Input, Phaser 4's surprises and
  A scene ends, below, name.
- **`sound` plays a sound sprite.** `SpritePlayer`, made in a scene's
  `create()` so the scene never waits for its sprite, plays the sprite's
  sounds by name (`play()`), mutes the game while the player wants no sound
  (`follow()`), sums the two ears into one while they want mono
  (`followMono()`) and loops a sound while a scene holds it (`hold()`). Its
  `playRisen()` and `playAt()` are functions made once, for a scene to hand
  `@fz/core/frame_sounds`'s `FrameSounds.playEach()` each frame. Handed a mix
  (`@fz/core/sound_mix`'s `SoundMix`), it varies, pans, limits and ducks its
  sounds by it. `LayerPlayer` loops layers of sound on one bar line, such as
  a bed and the layers over it. A game's `tools/build-sounds.mjs` makes its
  sprite with `@fz/dev/sounds`.
- **`shapes` is what a game's art is drawn in:** each shape of a frame as
  plain data (`DrawCommand`, `ArtFrame`), so the art and its specs need no
  Phaser, and `scene`'s `atlasFrameOf()` plays a frame into `bakeAtlas()`. A
  builder takes the geometry first and the style last:
  `ring(ORIGIN, radius, { color, width })` strokes, `{ color }` fills, and an
  `alpha` draws one shape at part strength. A drawing at part strength as a
  whole is baked at full strength, and its image shown with `setAlpha()`.
  Look here before writing a helper: the art's line (`lineWidth()`,
  `stroke()`), the points of curves (`arcPoints()` and the rest), what moves,
  scales and frames a drawing (`shifted()`, `scaledBy()`, `centered()`,
  `bounded()`, `turned()`), what lays a frame out in an area (`within()`,
  `pointAt()`, `share()`, `inset()`, `middleSquare()`, `frameAround()`),
  outlines (`outlineRoundRect()`, `crispOutline()`), `star()`, `diamond()`,
  `dashes()`, the area a command covers (`extentOf()`), a line as a band
  (`bandAlong()`), a brick's pips (`diePips()`,
  `pipRow()`) and a symbol's dots and rims (`dotIn()`, `discIn()`,
  `rimIn()`). `svgOf()` writes a drawing as an SVG document, so a page shows
  what a scene bakes, as an image or a CSS mask. A wash (`wash()`), an
  ellipse filled with a radial gradient, is a `PaintCommand` and no
  `DrawCommand`, since a `Graphics` draws no gradient: only `svgOf()` and
  `scene`'s `paintCommands()` and `paintTexture()` take one.
- **`fuzzball` draws `@fz/style`'s fuzzball in `shapes`'s commands:**
  `fuzzballCommands()` its body and fur, `eyesCommands()` its eyes at any
  face, baked as a frame of their own where a scene moves them as the
  fuzzball looks, `combedStrands()` and `sparkCommands()` its fur on end and
  the sparks about it, `fuzzballWearing()` its outline as one with what it
  wears (`wornSparks()`), and `staticSparkCommands()` static's sparks.
- **`bricks` draws a brick game's brick:** the slab it stands on
  (`slabCommands()`, with its `slabBody()`, `slabFace()` and `slabRadius()`,
  laid out by a `SlabShares`: `TILE_SLAB` for a square tile, `BRICK_SLAB` for
  a brick twice as wide as tall), `topCap()`, `showsDetail()`, and the marks
  over a slab, their inks handed in: `bombMark()`, `sproutMark()`, `sheen()`,
  `portalMark()`, `bumperMark()`, `scallopedCap()`, `rivets()`,
  `cagedFriend()`, `cageBars()` and `plateTeeth()`.
- **`color` reads a palette's roles as the numbers Phaser takes**
  (`colorNumber()`, and `cssHex()` back), mixes them (`mixColors()`), and
  holds the inks the games share, for light palettes and for dark: the tiles'
  (`TILE_INKS`) and those that tell fuzzballs apart (`FUZZBALL_INKS`). A game
  takes them rather than its own copies, and holds them to 3:1 against its
  own field in its own contrast spec.
- **`layout` lays a field out on a canvas, in whole device pixels.**
  `fitCells()` fits a field of cells inside a canvas's insets, an `Insets`
  from `insets`. A field that isn't cells lays itself out with its steps,
  `roomInside()`, `framePixels()` and `cssRectOf()`, so its insets and frame
  round as every board's do. `sidePanels()` stands a panel either side of a
  field where the room spares one. `canvasPixelRatio()` is the ratio a canvas
  renders at on a display, for a placeholder drawn in CSS. `rectAttribute()`
  and `namedRectsAttribute()` write where the scene drew a board, or a deck's
  zones, into the board's attributes, where the layout check reads them, and
  `cssRectStyle()` lays the board's focus ring there.
- **`measure` reads the page for a canvas,** for the host and `canvasRoom()`.
  A game's view can't import it.
- **`testing` holds the headless harness and the fake canvas,** under Testing,
  below.

## Where Phaser may be imported

Only in the folders that draw.

- **In a game, only `src/scene/` imports Phaser.** The rules (`src/rules/`)
  and the view (`src/view/`) are plain TypeScript, so their specs run in
  Node. Of `@fz/phaser`, the view takes only the entries with no Phaser and
  no framework in them: `bricks`, `color`, `fuzzball`, `insets`, `layout` and
  `shapes`.
- **The shell (`src/app/`) never imports Phaser.** It imports
  `@fz/phaser/canvas`, takes the scene and `@fz/phaser/host`, `scene` and
  `sound` by type alone, and loads the scene with `import()` in its
  `SceneSource`, which keeps Phaser out of the first download.
- **`phaserGameLayers()` holds both,** from `@fz/dev/eslint`
  (`frontend/lib/dev/src/eslint.ts`). The Solitaire Collection's fences are
  its own.
- **A folder that draws is named in `phaser({ files })`,** in its workspace's
  `eslint.config.js`, which turns `no-unnecessary-condition` off there.
  Phaser types a scene's systems as always there, though they aren't before
  it boots or after it ends, so the guards on them stay.
- **Import Phaser from `phaser`, never the global `Phaser`.** Only the build
  the specs load sets the global, so code that reads it passes its specs and
  throws in the game. Lint refuses it.
- **In `@fz/phaser`,** the `host`, `scene` and `sound` folders import Phaser.
  The `canvas` and `testing` folders take it by type, or with `import()`
  where they need a class.

## How the shell and a scene talk

- **A scene is built with what it needs.** Its factory is handed its
  `SceneSurroundings`, `insets()` and `ready()`, and takes the game's own
  ports beside them as plain functions over the game, as
  `makeSnakeScene(options)` does, so its specs hand it a fake shell.
- **A game that runs in time takes the scene's.** The scene hands the game
  each frame's time in `update()`, and the game steps the run and hands back
  the frame to draw, so the run never steps without being drawn, and stops
  when Phaser does. A game of fixed steps keeps them with `@fz/core/clock`,
  and its scene reads what each step did from an `@fz/core/event_log`, as
  Brick Breaker's does.
- **A scene says when it has drawn,** with `ready()`, once its first frame is
  up: `onFirstFrame()` calls it at the right time. The canvas uncovers the
  scene then.
- **The canvas's state is read once the canvas has its scene:** in the
  board's template after `<fz-phaser-canvas>`, or in an `afterRenderEffect()`,
  never in a host binding. `canvasCardOf()` reads it too.
- **The chrome over the canvas is declared on the board's element,** as
  `--fz-canvas-inset-top`, `-right`, `-bottom` and `-left`. A scene reads it
  with `insets()`, a board's placeholder with `canvasRoom()`. Chrome that
  moves without the canvas changing size calls the canvas's
  `refreshInsets()`.
- **Every scene is a `HostedScene`,** a Phaser scene with a `key` no other
  shares, since Phaser throws on a key in use:
  `uniqueSceneKey("snake-scene")` numbers the scenes of a prefix as they are
  built.

## Input

- **The keyboard listens on the board's element.** `boardHostOptions()` sets
  it as Phaser's `input.keyboard.target`, so the keys reach the scene only
  while the board has the focus, and a dialog or the bar keeps its own.
- **Hear the keys through `onKeyDown()` and `onKeyUp()`,** from
  `@fz/phaser/scene`, not the keyboard's own key events. From the third key
  of a frame on, Phaser hands every key before it over again; the helpers
  hand over each once.
- **A captured key's default is cancelled only on the keyboard's target,**
  pressed there or on anything inside it. The captures are the game's, shared
  by every scene. Capture only the keys the game uses, and ignore a held
  key's repeats and a key pressed with Ctrl, Alt or Meta (`@fz/core/keys`'s
  `isShortcut()`), so the browser's shortcuts still work.
- **Hold the keys a scene steers by with `HeldKeys`,** from `@fz/core/keys`,
  made with what each `event.code` steers. Two keys held for one way hold it
  until both are let go, and `axis()` takes the way pressed last while both
  ways are held. The scene hands it each key pressed and let go, and reads it
  every frame. Its `letGo()` is safe to repeat.
- **Let go as the player looks away.** A scene that holds a key or a finger
  while it is down lets go of it through `onPlayerAway()`, since the release
  may never reach it. One look-away may call the listener more than once, so
  letting go must be safe to repeat.
- **A button over the board keeps its keys with `fzKeepKeys`.** Without it, a
  key pressed on the button reaches the scene too, which acts on Enter or
  Space besides the button, and Phaser cancels Space's keyup, at which a
  browser clicks a button.
- **Phaser's mouse prevents the default of `mousedown`,** which keeps the
  focus off the board. An element that should take the focus at a click
  focuses itself on `pointerdown`, as Snake's board does.

## Phaser 4's surprises

- **A `Grid`'s `cellPadding` is 0.5 unless set,** which leaves a hairline
  between its cells. Its `setSize()` is missing from the typings, so set
  `width` and `height`. Its alternate cells are those where x + y is odd.
- **A sound's `play(marker, config)` writes the config into the marker's
  own,** so a later play of that marker without one keeps it. `SpritePlayer`
  puts the marker back before each play, so play a sprite through it.
- **`tweens.killAll()` stops every tween a scene runs,** for a new run that
  must not inherit the last one's.
- **A WebGL `Graphics` drops points that lie close.** Before it fills or
  strokes a path, it drops each point within `render.pathDetailThreshold` of
  the last one it kept: a pixel unless the game's config sets it lower, since
  a `Graphics`' own `pathDetailThreshold` can only raise it, whatever
  Phaser's doc says. So `outlineRoundRect()`'s band drawn live, its line no
  wider than that, can lose the point where its two edges join, which cuts a
  wedge across it. A 2D canvas drops none, so such a shape is baked into an
  atlas.
- **A `CanvasTexture` uploads its canvas more often than it looks.** Its
  `setSize()` uploads the canvas blank, its `clear()` reads it back and
  uploads it unless its last argument is `false`, and `createCanvas()`
  uploads a new one blank. So a canvas texture drawn again under its own key
  goes through `drawCanvasTexture()`, from `@fz/phaser/scene`, which uploads
  once: `bakeTexture()` and `paintTexture()` draw through it. A `Graphics`
  draws there with `generateTexture(context.canvas, width, height)`. Its
  `generateTexture()` of the key would upload again, and on a first drawing
  make a texture of its own, for which `drawCanvasTexture()` throws. A canvas
  drawn once, then added under a fresh key with `addCanvas()`, uploads once
  already.

## A scene ends; its game doesn't

The host swaps scenes into one game, so a scene lets go of everything it
follows when it ends, or the game keeps it alive. Phaser destroys a removed
scene without shutting it down first, so the end is whichever comes first.

- **`whenSceneEnds(scene, release)` runs `release` then.** `onScaleResize()`,
  `onContextRestored()`, `onFirstFrame()`, `onPlayerAway()`, `onKeyDown()` and
  `onKeyUp()` subscribe until the scene ends.
- **A texture drawn at run time goes through `bakeTexture()`,** or
  `bakeAtlas()` for many frames in one texture, so the objects showing them
  draw in one batch. Each draws it again after a lost WebGL context, which
  Phaser restores only for the textures it loaded. Anything else drawn at run
  time redraws itself through `onContextRestored()`.
- **After an atlas is baked again, every object on it sets its frame again.**
  `retakeFrames(scene, key)` has every image and sprite on the texture do
  it, in layers and containers too. An object takes a frame's new size and
  origin only then (`setFrame()`, or `setTexture()` for a `NineSlice`), and
  one left on a frame the new bake dropped throws as it draws. A particle
  emitter needs nothing.
- **A gradient is painted once, never drawn each frame.** `paintTexture()`
  paints paint commands, washes among them, into a canvas texture, and again
  after a lost context. `softDisc()` paints a white disc fading to nothing,
  which a scene shows as a halo: an image tinted, scaled and faded under
  plain alpha. An additive blend would show nothing on a white field.
- **A baked frame shown in the page,** as How to play shows one, comes from
  `picturesWhenAsked()`, which encodes the frames only once they are asked
  for. A scene hands its shell a new one at each bake. A board takes it as it
  comes or, where its panels show the pictures as they come, through
  `@fz/phaser/canvas`'s `settledPictures()`, so a resize under way encodes
  none.
- **A scene lays itself out in device pixels,** on
  `viewportOf(scene, insets)`, and again once `canvasChanged(scene, last)`
  says the canvas has a new size or pixel ratio. The chrome, and anything
  else it lays out by, are the scene's to compare. `pixelRatioOf()` is the
  ratio Phaser maps the pointer by.
- **`strokeShareArc(graphics, x, y, radius, share)` strokes a share of a
  circle,** clockwise from its top: a ring that empties or fills.

## Testing

Specs assert on a scene's game objects, never on pixels. Pixels are for a
browser, through a game's screenshots and its `check:layout`. A game's own
testing skill has its fixtures.

- **The test setup calls `installHeadlessPhaser()` before anything imports
  Phaser,** which tests for WebGL as it loads, as
  `frontend/games/snake/src/test-setup.ts` does.
- **A shell's specs take `provideFakePhaserCanvas()` among their
  providers,** which loads no Phaser. `TestBed.inject(FakePhaserCanvas)`
  keeps the hosts the canvases made: `host` is the latest, with the `options`
  it was made with, and `host.latest` the scene it was last shown. A scene is
  ready as soon as it is shown, but only after the `show()` that asked has
  returned, as a real host's is, so a spec that needs the board drawn awaits
  `fixture.whenStable()` after rendering it. Under
  `provideFakePhaserCanvas({ readyAtOnce: false })`, a scene waits for the
  spec: `host.latest.ready()` readies it, and
  `host.latest.fail()` fails it.
- **A spec that fails a scene calls `collectErrors()` before it renders.** It
  returns what the canvas hands Angular's `ErrorHandler`, kept rather than
  printed, for the spec to assert on.
- **A board that watches its size is specced inside a describe that calls
  `watchResizes()`,** since jsdom has no `ResizeObserver`.
  `resize(element, width, height)` lays the board out at a size in CSS px
  and tells it, with the device pixels the browser counted where the spec
  gives them as a fourth argument. A change of zoom reaches the board through
  `@fz/game-ui/testing`'s fake viewport (`setPixelRatio()`).
- **A scene's specs run real Phaser in jsdom,** its WebGL renderer included,
  on a context that draws nothing. `runScene(make, options)` runs the scene
  a factory makes in a game of 400 × 400 pixels, or the `width` and `height`
  given, under the `insets` given, and resolves to a run: its `scene`, its
  `game`, whether the scene has said it is `ready`, and `destroy()`, which
  the spec calls when it is done. The run draws no frame until the spec
  steps one: `advance(ms)` steps the game on, a frame of 16 ms at a time or
  of the `frameMs` given, and moves the clock Phaser's tweens read, so a spec
  fakes no `Date`. Filters, dynamic textures and gradients work as in a
  browser, and a 2D context measures text as a font whose every character is
  alike.
- **A scene run as a board shows it takes `runKeyedScene(make, options)`,**
  which resolves to `{ run, keys }`: `keys` is the element of the page
  Phaser's keyboard listens on, which takes the focus. It destroys the run
  and removes the element once the test finishes, so a spec needs no
  `afterEach`. A board's own spec runs the scene its fake canvas was shown
  through `runShownScene(fake, board)`, its keyboard on the board's element,
  the run destroyed as the test finishes too. Code that only needs a scene,
  such as a factory of sprites, runs in `runBareScene()`.
- **Input is a browser's,** sent through the run, and Phaser hit-tests and
  raises its own events. `key("keydown", code)`, or `"keyup"`, sends a key
  to the keyboard's target with the `keyCode` a browser gives it, and the
  keys sent before one `advance()` are one frame's.
  `pointer("down", x, y)`, `"move"` or `"up"`, sends the mouse at a point in
  the canvas's pixels, with its main button or, given `{ button }`, another.
  Given `{ on }`, it goes to an element of the page over the canvas, and
  reaches Phaser through the window, which Phaser raises as
  `pointerdownoutside`, not `pointerdown`.
  `wheel(deltaY, x, y)` turns the wheel over the canvas.
  `touch("start", x, y)`, `"move"` or `"end"`, sends a finger, and
  `"cancel"` takes it away, which Phaser raises as a `pointerup` whose
  `wasCanceled` is true.
- **`advance()` a frame before the first press.** An object made interactive
  answers only from the next frame, when Phaser takes it in. Phaser's drag
  thresholds are 0, so a press on a draggable object starts its drag at once.
- **user-event's keys carry no `keyCode`,** which Phaser's capture reads, so
  Phaser cancels nothing user-event presses. A spec of a capture, such as
  Space kept from the board by a button's `fzKeepKeys`, sends the key with
  `fireEvent` and `browserKey("Space", " ")`. Phaser also drops a key event
  whose key code, type and time match those of the one before it, so two
  keydowns in a row from user-event in one millisecond, as under fake timers,
  reach the scene as one.
- **An error a handler throws while Phaser hears a browser's event** reaches
  the window's `error` event, not the spec, so a spec that expects one
  listens for it there while it acts.
- **A spec of what a scene draws again** loses and restores the context as a
  browser may, with `await loseContext()` and `await restoreContext()`.
- **What a scene drew is read through the harness,** never by hand.
  `objectsIn()` and `imagesIn()` count and find its game objects, in its
  layers too. A `Graphics` is read with `commandsOf()`, its commands by name,
  `strokesOf()`, the arcs it strokes, and `colorsOf()`, the colors it fills
  and strokes in: no spec reads its command buffer by Phaser's numbers
  itself. `canvasTexture()` finds a texture painted on a canvas.
- **A spec of a sound played puts the sprite in the cache itself,** with
  `cacheSounds(scene, key)`, since the harness's game loads no audio, and
  watches `Sound.NoAudioSound.prototype.play`, since a sound's `play()` there
  returns false and plays nothing.
- **What a scene loads is served.** `runScene()`'s `serve` is a function from
  the URL to the file's text or bytes, or to nothing, which is a 404 that
  fails the load. `await loaded()` waits out a load the scene starts once it
  runs, and `prepare` readies the game before the scene is added, such as
  with textures loaded. An image decodes at the size its PNG header gives, so
  a spec serves a real one from disk. Nothing reaches the network.
- **A spec in Node, of a game's view, takes `@fz/phaser/testing/pure`,**
  which loads no Phaser: `viewport()` makes a canvas's `Viewport`, and
  `frameNamed()` and `drawnIn()` read the frames of a game's atlas.
- **In `@fz/phaser` itself, code that takes a game,** such as the host and
  the scaler, is checked on a real one, which its specs start with
  `src/testing/start_game.ts`. The harness's own specs
  (`frontend/lib/phaser/src/testing/run_scene.spec.ts`, and
  `graphics_commands.spec.ts` beside it) check what it relies on in Phaser,
  so an upgrade that breaks it fails there first.
- **The worked examples are the games' scene specs:** Snake's, played with
  keys (`frontend/games/snake/src/scene/snake_scene.spec.ts`); Brick
  Breaker's, its atlas baked at run time, played with keys and the pointer
  (`frontend/games/brick-breaker/src/scene/bricks_scene.spec.ts`); Asteroid
  Breaker's, played with keys, the mouse and a deck drawn on the canvas
  (`frontend/games/asteroid-breaker/src/scene/belt_scene.spec.ts`); Brick
  Fuzz Pop's, aimed with keys, the mouse, the wheel and fingers
  (`frontend/games/brick-fuzz-pop/src/scene/wall_scene.spec.ts`); and the
  Solitaire Collection's, its atlases served and loaded
  (`frontend/games/solitaire/test/engine/render/phaser/scene/board_scene.spec.ts`).

## Phaser's own skills

Phaser's package ships a skill for each part of Phaser, with its API and its
pitfalls: `frontend/node_modules/phaser/skills/<name>/SKILL.md`, the installed
version's own, so none is copied here. List the folder, and read the one for
the part a task touches (`scenes`, `tweens`, `render-textures`,
`input-keyboard-mouse-touch`) before writing against that part from memory.
Where one has a `references/REFERENCE.md` beside it, that holds its tables.
`v4-new-features` and `v3-to-v4-migration` say where Phaser 4 differs from
Phaser 3.

They are written for a plain JavaScript game: their examples use the global
`Phaser` and Phaser's own key events. Where one differs from this skill,
this skill holds. Keeping a game here fast is the
`phaser-canvas-performance` skill's.
