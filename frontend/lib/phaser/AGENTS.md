# @fz/phaser

The `@fz/phaser` library (`frontend/lib/phaser`): what every game drawn with
Phaser shares. The frontend's rules are in
[frontend/AGENTS.md](../../AGENTS.md), and the repository's in
[.agents/AGENTS.md](../../../.agents/AGENTS.md). Paths are relative to
`frontend/lib/phaser/`.

## What it holds

One folder under `src/` per entry point, each with an `index.ts` that names
what it exports; an app imports it as `@fz/phaser/<folder>`. The entries
are split by what they import, so a game's code that knows no Phaser can
take the pure ones.

- `src/insets/`: `Insets` and `NO_INSETS`, how far an app's chrome lies over
  each edge of a canvas. It imports nothing.
- `src/color/`: `colorNumber()`, a palette role's hex as the number Phaser
  takes, and `cssHex()` back again, for a `Text`'s style, and
  `mixColors()`, two colors mixed as CSS's `color-mix(in srgb)` mixes them,
  for `@fz/style`'s washes. It imports nothing.
- `src/layout/`: `fitCells()`, which fits a field of square cells, any
  number across and down with a frame around them, inside a canvas's
  insets, each cell a whole number of device pixels and the field centered
  on whole pixels, with the `Viewport` it reads and the `CssRect` it gives
  back; `canvasPixelRatio()`, the pixel ratio a canvas renders at on a
  display, at least 1 and at most 3; `canvasSizeFor()`, the size and the
  pixel ratio the host makes a canvas that fills a box at: the display's
  ratio, but above 2 only as far as the canvas holds no more than 4.5
  million device pixels, and the device pixels the browser counted (a
  `DevicePixelSize`), where the canvas renders at the display's own ratio
  and the count agrees with the box and has pixels in it, or else the box
  in whole CSS pixels at the ratio; and
  `rectAttribute()`, a `CssRect` as a board's element writes it into an
  attribute for the layout check, "x y width height", and
  `namedRectsAttribute()`, a list of them by name, in the order given, as
  "stick 0 600 180 200, buttons 180 600 180 200", which throws for a name
  that isn't one word free of commas; `@fz/dev/board-page`'s `readRect()`
  and `readNamedRects()` read them back, as the spec holds them to; and
  `cssRectStyle()`, the inline styles that lay an element over a `CssRect`,
  its margin cleared, as a board lays its focus ring where the scene drew
  it. It imports nothing but `insets`.
- `src/measure/`: what reads the page for a canvas, as the host sizes it
  and a board's placeholder measures it: `watchDevicePixels()`, which
  counts an element's device pixels, through a `ResizeObserver` on the
  device-pixel box where the browser has one, or else on the CSS box;
  `watchDevicePixelRatio()`, which hears the display's ratio change
  through a `(resolution)` media query armed again for each new ratio,
  below 1 too, so what watches both hears every change of zoom or of
  display, one that leaves an element's device pixels as they were too;
  and `canvasInsetsOf()`, the insets an element declares for the canvas
  that fills it, in `CANVAS_INSET_PROPERTIES`, read through its own
  window. It imports nothing but `insets` and `layout`, and no game's view
  may import it, since it reads the page.
- `src/shapes/`: the vocabulary a game's art is drawn in, each shape of a
  frame as plain data in device pixels: `DrawCommand`, a rectangle, a
  rounded one, a circle, a ring, a line, a polyline or a polygon, each with
  its builder, which takes no size and no radius below nothing, as a canvas
  not yet laid out can give one. Every builder takes its geometry first, as
  an `Area`, a `Point` and a radius, or a list of `Point`s, and its style
  last, a `FillStyle` (`{ color }`) for what it fills and a `LineStyle`
  (`{ color, width }`) for what it strokes, so a line's style fills a dot
  too: `circle(ORIGIN, radius, { color })`,
  `ring(middle, radius, { color, width })`. `stroke()` draws a line through
  points with round ends and corners; `ArtFrame` is a frame of an atlas
  drawn in them; `extentOf()`, the `Area` a shape reaches over, short of a
  polyline's mitred corners, which a spec holds a drawing inside its frame
  by; `ArtScale` and `widthOf()`, a width in field units as whole device
  pixels, and `lineWidth()`, the art's own line at a scale. Beside them,
  `src/shapes/curves.ts` gives the points of an arc, an ellipse and a
  quadratic or cubic curve, to draw as a polyline or a polygon;
  `src/shapes/transforms.ts` moves (`shifted()`) and scales (`scaledBy()`)
  a shape, and places points (`placed()`), and frames a drawing about its
  origin (`centered()`) or about the middle of its own bounds
  (`bounded()`), in whole pixels, which is how a game frames its drawings;
  and `src/shapes/symbols.ts` draws in a square, as a pickup's or a
  capsule's symbol is, its places and sizes as shares of the square:
  `dotIn()` anywhere in it, `discIn()` and `rimIn()` about its middle, and
  the lines' `symbolLineStyle()`. `atlasSize()` is how big the atlas of a set of
  frames is, packed as `bakeAtlas()` packs them, in rows, tallest first,
  frames of one height in the order given (`src/shapes/packing.ts`), so a
  game's spec can hold it to a size without Phaser. It imports nothing.
- `src/fuzzball/`: `@fz/style`'s fuzzball in the shapes' commands, so
  every game draws the one fuzzball: its strands of fur, read from its path
  (`strandsOf()`, `FUZZBALL_STRANDS`), each a `Strand` about its body's
  middle on its grid (`FUZZBALL_GRID`, `aboutBody()`), and how far a fur
  reaches (`furReach()`); `fuzzballCommands()`, its body and fur, `by`
  device pixels to a unit of the grid, in a `FuzzballStyle`: a color, an
  outline beneath where a game wants one, and fur a game combs its own way;
  `eyesCommands()`, its eyes, with their glints where an `EyesStyle` gives
  them a color and each is half a device pixel or more, which a game bakes
  in a frame of their own; and `FUZZBALL_LOOK`, how far its scene moves
  that frame toward what the fuzzball looks at. It imports nothing but
  `shapes` and `@fz/style/fuzzball`.
- `src/host/`: the host a canvas runs its scenes in. Its index names only
  the types an app's scene and board take of it, `HostedScene`,
  `SceneSurroundings` and `HostOptions`, so no app builds a host past the
  canvas; the library takes the rest from its files.
  `src/host/phaser_host.ts`'s `PhaserHost` keeps one Phaser game, and so
  one WebGL context, for a canvas's whole life and swaps each scene it is
  handed into it, building the next before it lets go of the last, its
  `show()` settling once the scene is mounted or rejecting with what kept
  it from being (a scene that loads files first creates itself later,
  outside it), and `src/host/viewport_scaler.ts`'s `ViewportScaler` keeps
  the canvas at the size and pixel ratio `canvasSizeFor()` gives its box,
  each time `watchDevicePixels()` reports the box once it is laid out and
  each time `watchDevicePixelRatio()` hears the display's ratio change,
  reading it all through the box's own window: the window's `resize` comes
  before the app has moved what stands around it, so it sizes the canvas
  only where nothing can watch the box. It imports Phaser, never Angular.
- `src/scene/`: what a scene needs to live in a game that outlives it:
  `uniqueSceneKey()`, a key no other scene of the page shares, a prefix
  numbered from 1; `whenSceneEnds()`, and `onScaleResize()`,
  `onContextRestored()`, `onFirstFrame()` and `onPlayerAway()` (as the
  window loses the focus, the page is hidden or the focus leaves the
  keyboard's element), which let go of what they subscribe to when the
  scene ends; `onKeyDown()` and `onKeyUp()`, which hand a scene each key
  event its keyboard hears, once; `pixelRatioOf()`;
  `drawCanvasTexture()`, the canvas texture of a key drawn anew at a size,
  through the context it draws with, and uploaded once, drawn: the one there
  cleared at the size without its own `setSize()` and `clear()`, which
  upload it blank, or a new one drawn on a canvas of Phaser's pool before it
  is made, since making one uploads it; `bakeTexture()`, a texture drawn at
  run time with a `Graphics`, through it, and drawn again after a lost
  context; `bakeAtlas()`, many named frames drawn into one such texture,
  packed as `atlasSize()` measures them, after which every object showing
  one of its frames sets it again, as `retakeFrames()` has every image and
  sprite on a texture do; `picturesWhenAsked()`, which returns a function
  that, as it is first called, makes a `data:` URL of each frame that
  records and lists of names give, in records and lists of the same shape,
  for How to play, and returns the same pictures after, so a scene hands its
  shell a new one at each bake and encodes nothing a page doesn't show; and
  `atlasFrameOf()`, an `ArtFrame` as `bakeAtlas()` draws one, its shapes
  played into the `Graphics` in turn. It imports Phaser, never Angular.
- `src/sound/`: `SpritePlayer`, which loads a sound sprite (its key, its
  spritemap and its file's URL), made in `create()` so the scene never waits
  for it, and plays its sounds, named by the spritemap, once it has loaded
  while the player wants sound, muting the game while they don't;
  `playRisen()` plays one risen by some cents, through `play()`, made once
  for `@fz/core`'s `FrameSounds.playEach()` to take each frame; `hold()`
  loops a sound while a scene says it is held, as a key held down hums, and
  stops it once it is let go, sound is turned off or the scene ends. It
  imports Phaser, never Angular.
- `src/canvas/`: `<fz-phaser-canvas>`, the Angular component an app shows its
  scenes in, which makes the one host it keeps, through the
  `PHASER_CANVAS_HOST` token. Its `scene` input is a `SceneSource`, a function
  returning a scene's factory, which builds a `HostedScene` from its
  `SceneSurroundings`, or a promise of one; its `state` is `loading`,
  `ready` or `failed`, also on the element as `data-state`, and failed only
  when a minute passes, since a slow connection can take that long, or the
  source rejects or the scene it makes can't be built or mounted, whose error
  it hands to Angular's `ErrorHandler`; `slow` says, after 8 s, that it is
  still loading, for the app to say so (`data-slow`); `state` and `slow` are
  read-only to the app; and what the app projects as `[fzCanvasPlaceholder]`
  lies over the canvas until the scene is ready. It imports the host, and so
  Phaser, with `import()`, when it first shows a scene. `boardHostOptions()`
  gives the options a game's board shows its scene with, given the game's
  title and the board's element: the keys heard only on that element, the
  mouse and fingers, the browser's menu kept shut, nothing from a gamepad,
  and the page showing through until the scene draws. `<fz-canvas-cards>`
  (`CanvasCardsComponent`), handed the canvas (`[canvas]="canvas"`) and placed
  in the layer the board's own cards show in, a `board-card-layer()`, which it
  lays out in as its contents, draws the cards a board shows while the scene
  can't be: Still loading, once the canvas is slow, hidden from assistive
  technology, whose words a status region it keeps in the page from the start
  says instead, and couldn't be drawn, an alert, once it has failed, whose
  Reload reloads the page, keeping its keys from the board as `fzKeepKeys`
  keeps a card's buttons'; neither takes the focus. `canvasCardOf()` names
  which shows for a canvas (a `CanvasCard`, or null), as the cards' `card`
  does, so the board shows none of its own meanwhile; it reads the canvas's
  state, which needs the scene the canvas is given, so a board reads it after
  `<fz-phaser-canvas>` in its template. Each card is `@fz/style`'s
  `board-card()`, keeping the room the board keeps around its field
  (`--fz-canvas-card-room`, `--fz-space-6` unless the board sets it) and
  `--fz-canvas-card-drop` below the layer's middle, where the board sets one,
  on the element or around it; `board-card-small` there, in the board's own
  container query, sets them smaller. Beside them, `canvasRoom()`, called
  as a board is made, measures the canvas the board's element makes for the
  canvas that fills it, as the host sizes it (its size and the ratio the host
  renders it at, by `canvasSizeFor()`, and the insets the element declares),
  as the board is first drawn and then each time it changes size in CSS pixels
  or in device pixels, or the display's ratio changes, as a change of zoom or
  of display does, until the board is destroyed: its `viewport`, null until it
  is measured, and its `pixelRatio`, the display's until then, so a
  placeholder lays its board out as the scene will; and `fzKeepKeys`
  (`KeepKeysDirective`) stops key events on a button from reaching the element
  around it that Phaser's keyboard listens on, so the button takes the key
  rather than the scene, and Phaser's capture never cancels Space's keyup, at
  which the button clicks.
- `src/testing/`: what a spec runs a scene in. `installHeadlessPhaser()`,
  which a test setup calls, gives jsdom the 2D and WebGL contexts, drawing
  nothing, that Phaser needs, the 2D measuring text as a font whose every
  character is alike, at the size its `font` names, a canvas's picture as
  a `data:` URL that names its size, and answers its requests and decodes
  its images as a browser would, so nothing reaches the network; and
  `runScene()` runs a scene in a WebGL game on them whose frames, clock,
  keys, pointer, context and served files a spec drives, and
  `runBareScene()` one that does nothing of its own, to make game objects
  in. `runKeyedScene()` runs one as a board shows it, Phaser's keyboard
  listening on an element of the page that takes the focus, and lets go of
  both once the test that ran it finishes; `cacheSounds()` puts a sound
  sprite in a scene's audio cache, as a load that worked would, which the
  headless game never does. What a scene drew is read back:
  `commandsOf()` reads a `Graphics`'s command buffer, by Phaser's own
  numbers for its commands, which its spec pins against Phaser, into
  commands by name, `strokesOf()` the arcs it strokes, as WebGL draws
  them, each in the width set as it is drawn and the color set as its path
  is stroked, refusing one stroked in a gradient no one color describes,
  and `colorsOf()` the colors it fills and strokes in; `objectsIn()`
  counts a scene's game objects and `imagesIn()` finds its images, each
  looking into its layers, however deep; `watchUploads()` hands a spec each
  canvas the game uploads to the GPU, as it uploads it, until the test
  finishes. `provideFakePhaserCanvas()` gives an app's shell specs a canvas
  that loads no Phaser, whose hosts `FakePhaserCanvas` keeps, to settle
  each scene they were shown; `collectErrors()` gives them an
  `ErrorHandler` that keeps what it is handed rather than printing it, for
  a spec that fails a scene on purpose to read; and `FakeResizeObserver`,
  which `watchResizes()` stands in for jsdom's missing one through a
  describe, is told by `resize()` that an element was laid out at a size,
  and, where the spec gives them, the device pixels the browser counted.
  The library's own specs also take `src/testing/fake_display.ts`, a
  display whose pixel ratio a spec changes, telling the `(resolution)`
  queries asked of it, and `src/testing/served_files.ts`'s `pngOfSize()`,
  a PNG of a size to serve. `src/testing/pure/`, imported as
  `@fz/phaser/testing/pure`, holds what a game's specs in Node take, which
  can't load Phaser: `viewport()`, a canvas's `Viewport` from a CSS size, a
  pixel ratio and its chrome.

## Rules

- **Imports go one way.** The library imports Phaser, Angular and
  `@fz/style`, never a game or the site; its testing entry imports Vitest
  too, whose hooks and stubs `runKeyedScene()`, `watchResizes()`,
  `resize()` and `watchUploads()` use, and which `package.json` declares
  an optional peer, as `@fz/dev`'s does.
- **The pure entries import nothing but each other,** but `fuzzball`, which
  takes `@fz/style`'s fuzzball too, as ESLint checks, so a game's
  Phaser-free code can take them, and `@fz/dev`'s view fence lets them all
  in (`PURE_PHASER_ENTRIES`); and `src/testing/pure/` nothing
  but them, so a spec in Node can take it. What reads the page, a
  `ResizeObserver`, a media query, the display's ratio or a computed
  style, belongs in `src/measure/`, never in a pure entry, which a game's
  view takes; `measure` knows no Phaser and no framework, as ESLint checks,
  so the host and the canvas both take it.
- **`src/testing/` imports Phaser by type alone,** and the host, the
  scene helpers and the sound player, which load it, as ESLint checks,
  loading Phaser with `import()` where it needs a class, and tells a game
  object by its `type`, never by `instanceof`, since a test setup imports
  it before `installHeadlessPhaser()` has given Phaser the page it needs
  to load.
- **The host, the scene helpers and the sound player know no framework,**
  as ESLint checks, so a scene runs the same in any app, and in a spec.
- **Only the canvas makes a host,** and it imports
  `src/host/phaser_host.ts` with `import()`, past the entry's index, which
  names only the types an app takes: ESLint lets `src/canvas/` import
  Phaser, the host and the scene helpers only by type, so an app that loads
  its scene with `import()` keeps Phaser out of its first download.
- **Whatever a scene follows, it releases when it ends,** since the game it
  runs in outlives it: through `src/scene/`'s helpers, or
  `whenSceneEnds()` for anything else.
- **A texture drawn at run time with a `Graphics` goes through
  `bakeTexture()` or `bakeAtlas()`,** so it is drawn again after a lost
  context; one drawn otherwise, such as a filtered `DynamicTexture`,
  redraws itself through `onContextRestored()`. A canvas texture drawn by
  hand again under its own key goes through `drawCanvasTexture()` each
  time, so each drawing uploads once, drawn; a canvas drawn once, then
  added under a fresh key, as the Solitaire Collection's deck is
  (`DrawnDeckPainter`), uploads once already and needs none of it.
- **No code bends to its specs.** The harness runs the renderer a browser
  does, so the library's code has no branch for a game with none.
- **The canvas's stylesheet is unencapsulated,** to reach what an app
  projects into it, so every selector in it starts at `fz-phaser-canvas`.
- **Every line of the pure entries is covered,** and the floor in
  `vitest.config.ts` sits just under the figures and rises as they rise;
  coverage counts `src/testing/` too, as `frontend/AGENTS.md` asks of every
  library.

## Checks

The root's `yarn lint`, `yarn typecheck` and `yarn test` run the library's
own, which `yarn workspace @fz/phaser <script>` runs alone: ESLint and
stylelint, the Angular compiler's checks, and Vitest in jsdom, each spec
beside the file it tests. The specs run real Phaser, headless: the test
setup calls `installHeadlessPhaser()`, and the scene helpers' specs run
through `runScene()`, so the harness is checked by its own use. jsdom gets
no component styles, so what the canvas's and the cards' stylesheets do is
checked in a browser, through a game's screenshots.
