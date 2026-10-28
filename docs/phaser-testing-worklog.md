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
| W3    | Loads served as a browser serves them                          | to do |
| W4    | The library's own fakes of a game                              | to do |
| W5    | The Solitaire Collection's setup, and a board run for real     | to do |
| W6    | `TableLight`, `PhaserCardFactory` and `DrawnDeckPainter` specs | to do |
| W7    | `PhaserTableRenderer` and `BoardInputManager` specs            | to do |
| W8    | `BoardScene` spec                                              | to do |
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
