# Work log: Phaser specs on the real thing

The log of moving every spec that stands in for Phaser onto real Phaser, and
of building `@fz/phaser/testing` out into what every game's Phaser specs
share. Newest entries last. It is deleted when the work is done; git
history keeps it.

## How to resume

- Asked 2026-10-28: "Let's upgrade the rest of phaser related tests to use
  the real thing. Keep a detailed work log and make regular commits", and
  then, as the work began: "As you go see if we can build out and
  consolidate phaser testing infrastructure across their project more too."
- It follows decision 3 of the Snake plan (`docs/archive/snake-plan.md`):
  Snake's scene specs ran real Phaser headless, and the Solitaire
  Collection's still stood in for it with `test/support/phaser_mocks.ts`.
- The work is on the branch `solitaire-headless`, cut from `main` at
  `cdaf382`. Nothing is merged or pushed until the user says so.
- Each phase ends with its workspaces' lint, typecheck and tests green, and
  a commit; the last with `yarn verify` from `frontend/`.

## Status

| Phase | What                                                           | State |
| ----- | -------------------------------------------------------------- | ----- |
| W0    | The spike: what the Solitaire Collection's calls need          | done  |
| W1    | A WebGL context that draws nothing, in `@fz/phaser/testing`    | done  |
| W2    | No HEADLESS branches left in the library's code                | done  |
| W3    | Loads served as a browser serves them                          | done  |
| W4    | The library's own fakes of a game                              | done  |
| W5    | The Solitaire Collection's setup, and a board run for real     | done  |
| W6    | `TableLight`, `PhaserCardFactory` and `DrawnDeckPainter` specs | done  |
| W7    | `PhaserTableRenderer` and `BoardInputManager` specs            | done  |
| W8    | `BoardScene` spec                                              | done  |
| W9    | `table_board_scene`, the catalog and the game contract specs   | to do |
| W10   | `phaser_mocks.ts` gone, the docs, and `yarn verify`            | to do |

## Where things start

- **The Solitaire Collection's specs run in Node** (`vitest.config.ts`,
  `environment: "node"`), each spec of the shell in jsdom by a
  `@vitest-environment` comment. Ten files touch Phaser:
  `test/support/phaser_mocks.ts` (961 lines), and the specs of
  `TableLight`, `PhaserCardFactory`, `DrawnDeckPainter`,
  `PhaserTableRenderer`, `BoardInputManager`, `BoardScene`,
  `table_board_scene`, the catalog and the game contract, which mock the
  `phaser` module (`boardScenePhaserMock()`, `geomPhaserMock()`) or hand
  the code mock sprites, textures, inputs and loaders.
- **`@fz/phaser/testing`** runs a scene in a HEADLESS game
  (`runScene()`), after `installHeadlessPhaser()` gives jsdom a blank 2D
  context and `data:` images that load. Snake's scene specs run on it.
- **The library's own code bends to HEADLESS:** `bakeTexture()` leaves a
  blank texture in a HEADLESS game, and `onContextRestored()` skips a game
  with no renderer, both only for specs.

## Entries

### 2026-10-28: W0, the spike

- **A HEADLESS game can't run the Solitaire Collection's board.** A probe
  scene in jsdom tried each Phaser call its drawing code makes. Sprites on
  atlas frames, `setTexture`, `setVertexRoundMode`, input (interactive,
  draggable, cursor, poll rate), the camera and graphics work. The table
  light's `Gradient`, `enableFilters()` and the card shadow's
  `addDynamicTexture()` throw: each needs the WebGL renderer, which a
  HEADLESS game hasn't got (`scene.renderer` is undefined). A load of a
  file jsdom can't fetch errors and then completes, as in a browser.
- **Phaser's WebGL renderer boots on a WebGL context that draws nothing.**
  Given a context whose every call does nothing, answering only what Phaser
  reads (the limits, shader and program status, a complete framebuffer, no
  extensions, no active uniforms), a WEBGL game booted in jsdom and drew
  frames without error, and every call above worked: the gradient with the
  table light's own config, the shadow filter and its padding override, a
  dynamic texture drawn, erased, rendered and resized, and sprites on it.
  Dispatching `webglcontextlost` and `webglcontextrestored` on the canvas
  made the renderer raise its own `losewebgl` and `restorewebgl`.
- **What it needs:** the real WebGL constants, since Phaser keys tables by
  their numbers (`0x1404` for `INT`), taken from TypeScript's
  `lib.dom.d.ts` (297, the WebGL 1 set Phaser asks for), and the stand-in
  installed before Phaser loads, since Phaser tests for WebGL as its module
  loads (`window.WebGLRenderingContext`, then `getContext("webgl")`).
- **Phaser's own tests** (`node_modules/phaser/tests/`) boot HEADLESS games
  too; their WebGL stand-in only answers the feature test, so this is new.
- **So the plan:** `@fz/phaser/testing` runs scenes in a WEBGL game on that
  context, rather than a HEADLESS one. Then the library's HEADLESS branches
  can go, the Solitaire Collection's board runs whole, filters and context
  loss included, and Snake's baked textures draw for real.

### 2026-10-28: W1 and W2, the harness on WebGL, and the library unbent

- **`blankWebGLContext()`** (`frontend/lib/phaser/src/testing/blank_webgl.ts`)
  is a Proxy: every call does nothing but those Phaser reads an answer
  from. It answers the limits (4096 textures, 16 units), compiles every
  shader and links every program with nothing active, calls every
  framebuffer complete and every call a success, and offers no extension
  but `WEBGL_lose_context`. Its constants are WebGL's own numbers, in
  `webgl_constants.ts`, generated once from `lib.dom.d.ts`; a name outside
  WebGL 1, such as `TEXTURE_3D`, gets a number of its own from
  `0x7fff0000`, the same each time.
- **Its `WEBGL_lose_context` raises the browser's events on the canvas**,
  `webglcontextlost` (cancelable) and `webglcontextrestored`, at once
  rather than on a later task, so a spec needs no waiting. Losing twice or
  restoring a live context does nothing, as in a browser.
- **`installHeadlessPhaser()`** now hands a canvas that context for
  `webgl` and `experimental-webgl`, one per canvas (a `WeakMap`), so
  whoever asks again loses and restores the one Phaser drew with. It
  defines `window.WebGLRenderingContext` where jsdom lacks it, since
  Phaser's feature test reads it: a function that throws, as a browser's
  constructor does, since ESLint rejects an empty class and Phaser only
  needs it for `instanceof`, which the blank context fails, so Phaser
  takes it for WebGL 2 and folds no WebGL 1 extensions in.
- **`runScene()`** runs a `WEBGL` game, steps it with `game.step()`, which
  renders, and gains `loseContext()` and `restoreContext()`, through the
  canvas's own extension.
- **W2: the library's code has no branch for specs any more.**
  `bakeTexture()` always draws with its `Graphics` into a canvas texture
  (the HEADLESS branch that left a blank texture is gone), and
  `onContextRestored()` subscribes to `scene.renderer` without asking
  whether there is one. `bake_texture.spec.ts` lost `pretendToRender` (a
  `CANVAS` render type and a spy on `generateTexture`) and the fake
  renderer emitter: its specs check the canvas texture's size, that a
  second bake draws over the first, that a texture of another kind is
  replaced, that the `Graphics` is destroyed, and the redraws after a real
  lost context. `scene_lifetime.spec.ts` lost `giveRenderer`.
- **New specs:** `blank_webgl.spec.ts` (13), the WebGL half of
  `headless.spec.ts` (the context, one per canvas, null for other kinds,
  the window's `WebGLRenderingContext`), and `run_scene.spec.ts`'s
  renderer, filters, dynamic texture and gradient, and lost context as
  Phaser hears it.
- **Snake's 347 specs pass on the WebGL harness unchanged**, so its baked
  textures now draw for real in its specs.
- **The docs:** `frontend/lib/phaser/AGENTS.md` (the harness, the
  `bakeTexture()` rule, and a new rule that no code bends to its specs)
  and `phaser-core`'s Testing section.
- **Checks:** `@fz/phaser` lint, typecheck and 172 tests (coverage 98.6 %
  statements, 93.1 % branches, over the 93 % floor); Snake's tests.
- **Left for W4:** `phaser_host.spec.ts` and `canvas_host.spec.ts` still
  make HEADLESS games of their own.

### 2026-10-28: W3, loads served as a browser serves them

- **What the Solitaire Collection's board loads:** `loadCardAtlas()` hands
  Phaser's `multiatlas` a parsed manifest, so the only requests are the
  atlas's PNG pages, at the URLs Vite's `?url` gives them. Phaser fetches
  each with `XMLHttpRequest` (`responseType` `blob`), then decodes it
  through `URL.createObjectURL()` and an `Image`; a 4xx or 5xx fails the
  file, and the loader completes all the same.
- **What jsdom under Vitest gives:** `URL.createObjectURL()` is Node's,
  which an image can't read back, and `XMLHttpRequest` is jsdom's, which
  would really go to `http://localhost:3000/` (jsdom's page URL) and fail
  only once the connection is refused.
- **`served_files.ts`** (`frontend/lib/phaser/src/testing/`), installed by
  `installHeadlessPhaser()`:
  - `ServedRequest` takes `XMLHttpRequest`'s place, on `globalThis` and
    `window`. It is an `EventTarget` whose `on…` handlers hear its events
    too, so Phaser's handlers and any listener work. It resolves the URL
    against the page's, asks the server, and answers on a later task:
    200 with the file read as `responseType` asks (text, JSON, an
    `ArrayBuffer` or a `Blob`), or 404. `abort()` stops the answer.
  - `URL.createObjectURL()` and `revokeObjectURL()` keep the blob behind
    each `blob:headless/<n>` URL.
  - An `<img>` whose `src` is a `data:` URL or an object URL of a served
    file loads on a later task, its `naturalWidth` and `naturalHeight`
    read from the PNG header (bytes 16 to 23), or 0 × 0 for bytes that are
    no PNG. Phaser's default textures now have their real sizes (32 × 32,
    4 × 4) too. Any other address loads as jsdom loads it: not at all.
- **`runScene({ serve })`** sets the server for the run and clears it on
  `destroy()`; without one every request is a 404. A `FileServer` is a
  function from the URL to a file's text or bytes, or undefined, so a spec
  can change its answers mid-run by closure (a deck that fails to load).
- **`pngOfSize(width, height)`**, exported, is the PNG signature and header
  of a size, for a spec to serve an image without reading one from disk.
- **Specs:** `served_files.spec.ts` (14: served, 404, nothing serving,
  resolved URLs, each response type, text, listeners, abort, headers,
  images decoded from object and `data:` URLs, no PNG, revoked, other
  addresses); `headless.spec.ts` lost its image specs to it and gained a
  request to a remote address answered with a 404; `run_scene.spec.ts`
  gained a scene that loads an image: served, failed as a 404, and nothing
  served after `destroy()`.
- **Checks:** `@fz/phaser` lint, typecheck, 188 tests (99.2 % statements,
  94.3 % branches); Snake's 347.

### 2026-10-28: W4, the library's own fakes of a game

- **The blank context's events now come on a later task,** as the WebGL
  spec has them: `loseContext()` marks it lost at once and raises
  `webglcontextlost` on a later task; `restoreContext()` restores it, and
  raises `webglcontextrestored`, on a later task, once however often it is
  asked. It matters to `PhaserHost`: it loses the context from Phaser's
  `DESTROY`, which Phaser raises before the renderer stops listening; a
  browser's event comes once the renderer has gone, so it warns of nothing.
  `run.loseContext()` and `run.restoreContext()` now resolve once the
  canvas has heard, so the specs `await` them.
- **A canvas is laid out at its CSS size** at the page's top left (or the
  size of its backing store, where its CSS size is not in pixels), by
  `installHeadlessPhaser()`'s `getBoundingClientRect()`, since jsdom lays
  nothing out and Phaser maps the pointer, and measures for input, through
  it. `runScene()` lost its own stand-in for that.
- **`startGame()` and `stopGame()`** (`src/testing/start_game.ts`, not
  exported) start a WebGL game on a parent in the page, resolve once it has
  booted with its loop asleep, and tear it down with a step. `runScene()`
  is built on them.
- **The scaler's spec runs on a real game.** `ScalableGame`, the slice of
  `Phaser.Game` it took "so a test need not boot a real game", is gone: it
  takes a `Game`, and the spec's 41 specs read the canvas's backing size,
  the scale manager's zoom and `canvasBounds`, where they read a recording
  fake. Two findings: a canvas holds whole pixels, so the budgeted size is
  2828 where the fake kept 2828.43 (the spec says so now); and swapping
  the scaler's `refresh()` before it pins the CSS size now fails "measures
  the canvas for input only once its CSS size is pinned", which the fake
  only mimicked (checked by hand, then restored).
- **The host's spec runs on real games.** `HostedGame` is gone too;
  `CreateGame` stays, as the host's dependency, and returns a `Game`. The
  spec's factory makes a real game and records its config and when it
  booted and was torn down. Scenes record their own life (create,
  shutdown, destroy), so "shuts the scene it replaces down before removing
  it" checks what Phaser does with them. The destroy specs read the canvas
  leaving the page and the context lost only once Phaser tears the game
  down. A game drawn without WebGL needed `window.CanvasRenderingContext2D`,
  which Phaser's feature test reads and jsdom lacks; the harness defines it
  beside `WebGLRenderingContext`, both as a constructor that throws.
  `PhaserHost.destroy()` now asks `instanceof WebGLRenderer` rather than
  reading `gl` off a renderer of either kind.
- **`canvas_host.spec.ts`** runs its games on the harness's WebGL rather
  than HEADLESS; `HEADLESS` is named nowhere in the library now.
- **A flaky Snake spec, found and fixed in the harness.** "turn a key into
  a command" failed one run in three: Space after ArrowUp in one frame
  went unheard. Phaser drops a key event whose `keyCode`, `timeStamp` and
  type match the one before it; the harness's `KeyboardEvent`s had
  `keyCode` 0, and jsdom stamps to the millisecond. `run.key()` now gives
  the `keyCode` a browser gives (letters, digits, arrows, Space, Enter and
  the rest) and a stamp to a fraction of a millisecond, strictly rising.
  Snake passed three runs in a row after. Phaser handles its whole key
  queue on each DOM event and clears it each frame, so a third key in one
  frame has it send the first two again, in a browser as here; the specs,
  and `phaser-core`, press at most two a frame.
- **Checks:** `@fz/phaser` lint, typecheck, 194 tests (98.9 % statements,
  94.2 % branches); Snake's 347, three runs; Snake's and the Solitaire
  Collection's typecheck.

### 2026-10-28: W5, the Solitaire Collection's setup, and a board run for real

- **Where the stand-ins are:** six specs mock the `phaser` module with
  `test/support/phaser_mocks.ts` (`board_scene`, `phaser_table_renderer`,
  `board_input_manager`, `table_board_scene`, the catalog and the game
  contract); three hand the code a fake scene or textures with only type
  imports of Phaser (`table_light`, `phaser_card_factory`,
  `drawn_deck_painter`); and three shell specs (`game_canvas.component`,
  `routes`, `game_catalog.service`) mock the board catalog beside
  `provideFakePhaserCanvas()`, which is the shell's to keep.
- **The test setup** (`test/test-setup.ts`) calls `installHeadlessPhaser()`
  beside the dialog polyfill wherever there is a window, so every jsdom spec
  has it before anything imports Phaser. The whole suite (171 files, 6867
  tests) passed with it installed and nothing else changed: no shell spec
  leaned on jsdom's network, canvas or object URLs.
- **The atlas pages are served from disk.** Under Vitest an atlas page's
  `?url` import is `/src/engine/render/assets/sprites/atlas/<deck>/<n>x/card_assets-0.png`
  (about 900 KB at 1x), a path in the workspace, as Vite's server gives it.
  `test/support/workspace_files.ts`'s `serveWorkspace` reads a URL's path
  from the workspace, once per file per worker, or answers nothing (a 404).
- **`runFakeTableBoard(game, presentation, options)`**
  (`test/support/fake_table/scene.ts`) runs the fake game's real
  `BoardScene` through `runScene()`, made as the shell makes a board, its
  `onReady` and `insets` the harness's surroundings, on a canvas of the
  design size and served from the workspace unless the options say
  otherwise.
- **The board runs whole:** its `preload` loads the atlas through Phaser's
  loader from the served page, `create` makes its collaborators, the table
  light's gradient, the shadow's filtered dynamic texture and a sprite on a
  frame of the atlas for every card, and its first frame says it is ready.
  On the harness's default 400 × 400 canvas it took the 0.5x atlas, as it
  should on a board that small, which is why the fixture sizes the canvas
  to the design.
- **Specs:** `test/support/fake_table/scene.spec.ts` (3).
- **Checks:** the Solitaire Collection's lint, typecheck and 6867 tests, the 3 new among them.

### 2026-10-28: W6, the table light, the card factory and the deck painter

- **`runBareScene()`** joins `@fz/phaser/testing`: a scene with nothing of
  its own, for a spec to make game objects in. The library's
  `bake_texture.spec.ts` uses it in place of its own bare scene.
- **`runSceneWithAtlases(atlases)`** (`test/support/atlas_scene.ts`) runs
  a scene whose `preload` loads card atlases through `loadCardAtlas()`, as
  a board loads its deck, served from the workspace.
- **`table_light.spec.ts`** makes the light in a bare scene and reads the
  real `Gradient`: its depth, position, size and display origin after
  `fit()`, its colour ramp's bands (`ramp.bands`, each colour read as GL
  fractions), its shape and repeat modes and dither, and that destroying
  the light takes it off the display list. A new spec draws frames with it.
- **`phaser_card_factory.spec.ts`** runs on the indexed deck's real 2x and
  1x atlases. Sprites are read as Phaser made them (texture, frame,
  origin, `input.cursor` for the hand, `vertexRoundMode`, no `filters`).
  The shadow is drawn through a filter into a `DynamicTexture`, whose
  strokes leave no trace once rendered, so `recordStrokes()` wraps the
  real `DynamicTexture.prototype.draw` and `erase`, still calling them,
  to note each sprite drawn or erased and the shadow filters on it then
  (`Filters.Shadow` in its internal or external list, and its padding
  override). Phaser erases by drawing, so a call inside another is no
  stroke of its own. The sprites the shadow was drawn with are checked
  destroyed through a spy on `make.sprite` (the old spec checked a
  display list they never join).
- **Found: a dynamic texture's sides are even.** Phaser rounds a
  `DynamicTexture`'s width and height up to even numbers unless told not
  to (`forceEven`), so the 1x shadow texture is 252 × 356, not the
  252 × 355 the mock kept. Harmless: the extra row is empty, and a shadow
  sprite is anchored by the padding at its top left. The spec says so.
- **Found and fixed: a missing frame.** `phaserDrawnDeckTextures().frame()`
  said it returned null for a frame a texture lacks; Phaser's `getFrame()`
  warns and returns the texture's first frame instead, which the mock
  never did. No caller reached it (each slot is named from the atlas's own
  frames), but it now asks `Texture.has()` first.
- **`drawn_deck_painter.spec.ts`** runs the painter on its real browser
  services (`browserDrawnDeckServices`) in a scene with the mobile deck's
  real 0.75x atlas: the real vectors, a jsdom canvas with the blank 2D
  context, each SVG decoded from a blob URL, and Phaser's texture cache.
  Failures are still injected through the services (no canvas, an SVG that
  will not decode). The loads are counted as they go, and `settle()` waits
  for them, so a spec of a drawing thrown away knows it was finished. New
  specs: every frame with vectors drawn from them (54 SVGs), and each
  frame drawn at the board's size. `phaserDrawnDeckTextures` is checked
  against the real cache, frames and page; the case of no document is a
  Node spec of its own (`drawn_deck_painter.node.spec.ts`), since jsdom
  will not let a spec remove `document`.
- **The harness, for the painter:** jsdom has no
  `HTMLImageElement.decode()`, so the harness's resolves once the image
  has loaded; an image of an object URL the page made itself (an SVG blob)
  loads, at 0 × 0; and a canvas keeps the one context it was first asked
  for (a browser hands back the same 2D context, and none of another
  kind), which `createBrowserCanvas()`'s new spec found.
- **Left for W8:** `BoardSceneOptions.drawnDeckServices`, documented as
  "which a spec stands in for", is passed by no spec.
- **Checks:** the Solitaire Collection's lint, typecheck and 6873 tests;
  `@fz/phaser`'s lint, typecheck and 200; Snake's 347.

### 2026-10-28: W7, the renderer and the input manager

- **`phaser_table_renderer.spec.ts`** keeps the `PhaserSprites` seam the
  board scene implements, filled from a real scene with the indexed deck
  at 0.5x, 1x and 2x (one scene for the file, its objects cleared after
  each spec): real sprites on real frames, `setDraggable` as Phaser's own
  (read back as `input.draggable`), and real `Graphics` for the borders,
  with call-through spies on `strokeRoundedRect` and `strokePath`, since
  a stroke leaves nothing to read. The placeholder's cursor specs start
  from the hand cursor the board gives it, where the mock started from
  `"default"`. All 30 passed as first written.
- **`board_input_manager.spec.ts`** drives real input: the mouse
  (`run.pointer()`), a finger (`run.touch()`), and presses on an element
  over the canvas; Phaser hit-tests real interactive sprites and raises
  its own over, out, down, drag and dragend events, with the pointer
  objects it really builds (`downElement`, `wasTouch`), where the mock
  spec emitted hand-made ones. The double click's clock is the
  controller's own injected `now`, rather than faked timers, which the
  harness needs real.
- **What real input taught the spec:**
  - An object made interactive is taken into the input plugin's list on
    the scene's next frame, so a spec steps a frame before its first
    press (the board makes its sprites in `create()`, long before a
    player's first press).
  - A press on the page's chrome over the canvas still hit-tests the
    sprites beneath and raises their `pointerdown`, with the chrome as
    `downElement`, and raises `pointerdownoutside` on the scene: exactly
    what `pressedCanvas()` guards against, now checked for real.
  - Phaser's drag thresholds are 0, so a press on a draggable card is a
    drag start, and its release a drop where it began: every click on a
    draggable card offers it to the pile beneath it, which the model
    turns down. Harmless, and the spec of the double click's release now
    says only its own release must not drop.
  - An error thrown in a pointer handler reaches the window's `error`
    event, not the spec, so `errorsDuring()` catches it there (a card in
    no pile, pressed or picked up).
  - "snaps back on dragend when the sprite is not a card" had a card's
    drag ended by another object, which Phaser never does; it became
    "lets go of a sprite that is not a card without a drop".
- **The harness, for input:** `pointer()` takes an element to press on
  instead of the canvas; `touch("start" | "move" | "end", x, y)` sends one
  finger (jsdom has no `Touch`, so the event carries plain lists, which is
  all Phaser reads); `startGame()` turns on Phaser's touch input, which it
  otherwise enables only where the device seems to have touch; and
  `document.elementFromPoint()`, which Phaser asks of a moving finger,
  answers the canvas laid out under the point, or else the body.
- **Checks:** the Solitaire Collection's lint, typecheck and 6871 tests;
  `@fz/phaser`'s lint, typecheck and 203; Snake's 347.

### 2026-10-28: W8, the board scene

- **`board_scene.spec.ts`** runs the fake game's board through
  `runFakeTableBoard()`, a fresh game for each of its 79 specs: the mock
  spec's 80 but one, by intent, the four switching to a deck already
  loaded now under a `describe` of their own. A spec drives the board as
  the shell and a player do: the presentation's setters, real presses,
  double clicks and hovers, `game.scale.resize()`, a stop or removal
  through the scene manager, a lost and restored context, and frames.
  What it reads is the board's real state: the sprites' textures, frames,
  origins, depths and positions, the textures left loaded, the camera's
  colour, the canvas's cursor, the light and the borders among the
  scene's objects.
- **Loads are real.** The board loads its atlases from the workspace,
  through a server that notes each atlas asked for (by its first page)
  and refuses the ones a spec names, which fails the load as a 404 does.
  A board starts with the atlases an earlier board left, loaded by
  `loadAtlases()` in the run's `prepare`, and then the record is cleared;
  a board laid out at 2 runs on a canvas twice its CSS size, through
  Phaser's `zoom`, as a display of that pixel ratio shows it.
- **What a redraw of the shadow is:** the context draws nothing, so the
  spec counts the shadow texture's `render()`s, with a call-through spy on
  `DynamicTexture`'s prototype, where the mock counted its own.
- **What real Phaser changed in the spec:**
  - A scene's own `scene.stop()` is queued for the next step; the
    manager's `stop(key)` acts at once, which the spec uses for a
    shutdown. Run first with the queued stop, every shutdown spec failed,
    which showed they catch a scene still listening.
  - A destroyed scene's objects are destroyed by its display list, the
    light with them, so "takes the light off the felt" reads the light's
    `scene` as gone.
  - After a shutdown the camera is gone, so the table background's "stops
    following the setting once the scene shuts down" could no longer
    fail: dropped, since "once the scene ends … stops following the
    presentation" counts the same listener.
  - `emptyBoard()` leaves every card on no pile, and those sprites stay
    where they were made, at (0,0), over the stock's slot and the
    pointer's first position, which the mock never hit-tested. The empty
    slot is now a real position: every stock card drawn to the waste.
  - "stops listening for the canvas to resize" reads whether a resize
    reaches the deck loader's `refit()` or the light's `fit()`, through
    spies on their prototypes, since the scale manager has listeners of
    Phaser's own.
- **The harness, for loads:**
  - `prepare(game)` readies the game before the scene is added, as an
    earlier scene may have left it, such as with textures loaded.
  - `await loaded()` waits for the scene's loader to finish what it was
    given, stepping a frame on each wait: Phaser takes the pages of a
    multi-atlas into the pass that started the load, but a file queued
    while it loads waits for the scene's update, which a sleeping loop
    never sends. Its spec timed out without the frames.
  - A served request asks the server as it is sent, and is answered on a
    later task as before, so a server that notes requests knows at once.
- **Gone:** `BoardSceneOptions.drawnDeckServices`, which no spec passed;
  the board draws its deck with the browser's services, as the painter's
  own spec does.
- **Checks:** the Solitaire Collection's lint, typecheck and 6870 tests;
  `@fz/phaser`'s lint, typecheck and 207; Snake's 347.
