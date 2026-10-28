# Work log: Snake on Phaser

The log of [the Snake plan](snake-plan.md), kept so the work can pause and
resume. Newest entries last. It is deleted when the work is done; git
history keeps it.

## How to resume

- Part 1, the `@fz/phaser` lift (L0 to L7), is on the branch `phaser-lift`,
  cut from `main` at `8353bda`, with the plan and this log as its first
  commit. Part 2, Snake (S0 to S12), is on `snake`, cut from `phaser-lift`,
  so `phaser-lift` can be merged to `main` on its own first (decision 19).
  A push to `main` deploys. On 2026-10-27, during S5, the user said: "When
  done, merge to main and push." So once S12 and the QA of both games pass,
  both branches merge to `main` and are pushed; not before.
- The user answered the plan's decisions on 2026-10-27. They took the
  recommendation everywhere but three places, which "The user's answers" in
  the plan lists: Phaser's own input for keys and swipes (5), walls only
  (9), and a new Arcade category (16). On decision 3 they asked that
  headless Phaser in jsdom be tried for Snake, and compared with the
  Solitaire Collection's mocks before that game's specs change.
- They also asked for regular commits, this log, and QA of both games, the
  Solitaire Collection above all, once the work is done.
- S0's mock is not made, as with Sudoku: the user asked for the game itself.
  The design is the plan's, checked in the browser as each phase lands.
- Each phase ends with `yarn verify` green from `frontend/`, and a commit.
- The status table says where things stand; the entries below it say what
  was found on the way.

## Status

| Phase | What                                        | State     |
| ----- | ------------------------------------------- | --------- |
| L0    | The spike and the Solitaire baselines       | done      |
| L1    | The `@fz/phaser` workspace                  | done      |
| L2    | The host and the pure entries               | done      |
| L3    | The scene helpers and the headless harness  | done      |
| L4    | The canvas component                        | done      |
| L5    | Build and lint                              | done      |
| L6    | Skills and docs                             | done      |
| L7    | Nothing changed in the Solitaire Collection | done      |
| S0    | The spike                                   | folded in |
| S1    | The Snake workspace                         | done      |
| S2    | The rules                                   | done      |
| S3    | The view                                    | done      |
| S4    | The scene                                   | done      |
| S5    | The play and the board                      | done      |
| S6    | The controls                                | done      |
| S7    | The icons, the bar and the dialogs          | done      |
| S8    | Sound                                       | done      |
| S9    | Storage                                     | done      |
| S10   | The checks                                  | done      |
| S11   | Screenshots and docs                        | done      |
| S12   | Ship, and QA of both games                  | to do     |

## Entries

### 2026-10-27: start

- Branch `phaser-lift` created from `main` at `8353bda`.
- The plan records the user's answers, and this log starts.

### 2026-10-27: L0, the spike and the baselines

- **The Solitaire Collection's baseline,** built from `main` before any
  change, is kept in the session's scratchpad (`baseline/solitaire-dist`):
  `index` 790,707 bytes, `phaser` 1,367,180, `vectors` 176,578.
- **Its screenshots can be compared pixel for pixel.** Its own screenshot
  script deals at random, so a scratch script (`solitaire-shots.mjs`, in the
  scratchpad) serves the build with `vite preview`, seeds `Math.random` with
  Mulberry32 before the page loads, hides the clock's `m:ss`, and captures
  Klondike, Spider, FreeCell, Pyramid, TriPeaks, Montana and Yukon at
  1440 × 810 at 2×, an upright phone (390 × 844 at 3×) and one on its side
  (844 × 390 at 3×), in the default palette and in Midnight blue: 42 shots.
  A second run of the same build matched the first in 18 of 21 shots, and
  differed by at most 5 pixels in the other three, which is the noise floor.
- **Phaser's own input works headless.** With the keyboard aimed at an
  element (`input.keyboard.target`), a `keydown` on that element reached the
  scene's `this.input.keyboard`, and one on the document didn't. Pointer
  events on the canvas reached the scene, at `Infinity` until the canvas was
  given a size: jsdom measures every element as 0 × 0. With
  `getBoundingClientRect()` returning the game's size and
  `game.scale.refresh()`, `pointerdown` and `pointerup` carried the right
  coordinates, `downX` and `downY` included. So the harness gives its canvas
  a size, and decision 5 can be specced on real Phaser.

### 2026-10-27: L1, the workspace (and L5, early)

- `frontend/lib/phaser`, shaped as `@fz/game-ui`, with its pure entries
  `insets` and `color` and full specs. Its ESLint fences: the pure entries
  import nothing; the host and the scene helpers no Angular; the canvas
  imports Phaser's entries only by type.
- L5 came first, since the library's lint needs `phaser()`: `@fz/dev/eslint`
  gained it, and `@fz/dev/vite`'s `gameConfig()` gained `PHASER_CHUNK`.
  Vite 8 marks `rollupOptions` deprecated, and Rolldown's `manualChunks`
  with it, so the chunk is a `codeSplitting` group under `rolldownOptions`.
  The Solitaire Collection dropped its own `manualChunks` and lint
  loosening, and its build came out byte for byte the same as the baseline:
  the same chunk names and hashes.
- `lint:styles` and the stylelint config wait for L4's stylesheet, since
  stylelint fails on a workspace with none.

### 2026-10-27: L2, the host

- `PhaserHost` and `ViewportScaler` moved to `@fz/phaser/host`, with their
  specs. The host takes its title and background as options, and a game's
  own config (`HostOptions.config`) over the defaults: `AUTO`, `autoFocus`,
  antialiasing and round pixels. A scene is handed its `SceneSurroundings`
  (its insets, and `ready()`), and `show()` takes an `onReady` it calls only
  while that scene is still the one shown.
- The insets' custom properties are `--fz-canvas-inset-*` now, for any game,
  and the Solitaire Collection's canvas stylesheet follows. Its `Insets` and
  `NO_INSETS` re-export `@fz/phaser/insets`'s.
- **The Solitaire Collection's fences matched the library.** They listed
  `"phaser"`, a gitignore-style pattern, which matches `@fz/phaser/insets`
  too. Anchored as `"/phaser"`, they still refuse `phaser` and `phaser/...`
  (checked with a probe import) and let the library through.
- The host's spec keeps its fake game to itself rather than exporting it from
  `testing`, since no game's spec needs one.
- Build: the `phaser` chunk is byte for byte the baseline's; `index` grew by
  270 bytes, to 790,977. All 6,861 specs pass.

### 2026-10-27: L3, the scene helpers and the headless harness

- `@fz/phaser/scene`: `whenSceneEnds()`, `onScaleResize()`,
  `onContextRestored()`, `onFirstFrame()` and `pixelRatioOf()`, lifted from
  `BoardScene`, which now uses them, and `bakeTexture()`, new, for Snake.
  The board's card shadow is a filtered `DynamicTexture`, not a baked
  `Graphics`, so it keeps its own redraw, through `onContextRestored()`.
  `boardScenePhaserMock()` gained `Scale.Events.RESIZE` for it.
- `@fz/phaser/testing`: `installHeadlessPhaser()` and `runScene()`, specced
  on a probe scene: frames, tweens, timers, insets, `ready()`, keys aimed at
  an element and at the window, the pointer, and `destroy()`.
- **What headless Phaser in jsdom needed,** beyond L0's spike:
  - Tweens time themselves by `Date.now()`, not by the loop's time, so
    `advance()` moves a clock of its own under `Date.now` while it steps,
    and puts the real one back after. A spec fakes no `Date`.
  - Key events wait for the next frame; mouse events are handled at once.
  - A game is torn down on its next frame, which only a step brings while
    the loop sleeps, so `destroy()` steps once.
  - `CanvasTexture.setSize()` and `refresh()` throw in a HEADLESS game:
    `TextureSource.update()` reads `renderer.gl`, with no renderer. And
    `Graphics.generateTexture()` throws there too. So `bakeTexture()` leaves
    a blank texture of the size when headless, made anew each time, and its
    spec stands in for `generateTexture()` to take the drawing path.
  - `runScene()` imports Phaser itself, with `import()`, so a test setup can
    import `testing` and install the stand-ins before Phaser loads.
- The library's coverage floor is 98 / 93 / 98 / 98 (statements, branches,
  functions, lines), under its 98.5 / 94.2 / 98.6 / 98.8. A scene that never
  starts, which only a broken scene causes, isn't specced: the spec waited
  out the five seconds, and was flaky under load.
- All 6,861 Solitaire specs pass, above its coverage floor; the library's
  120 pass.

### 2026-10-27: L4, the canvas component

- `<fz-phaser-canvas>` in `@fz/phaser/canvas`, with the plan's inputs
  (`scene`, `options`, `label`), `state` and `data-state`, the 8 second
  timeout, `refreshInsets()` and the `[fzCanvasPlaceholder]` slot. Its state
  is a `linkedSignal` of the scene, so a new scene starts it at `loading`
  without a write during change detection. A scene that is ready after the
  timeout turns it `ready` after all; the Solitaire Collection's own left it
  failed.
- **The placeholder is styled by the canvas, unencapsulated.** An emulated
  stylesheet can't reach projected content, and a wrapper that faded would
  be a backdrop root, which would blank the Solitaire Collection's glass
  overlay as it faded. So the component has `ViewEncapsulation.None`, every
  selector starting at `fz-phaser-canvas`, and fades the projected element
  itself, as the overlay faded itself before. Reduced motion is `@fz/style`'s
  page-wide rule. The library has a stylesheet now, so `lint:styles` and
  `stylelint.config.js` are back.
- **jsdom gets no component styles** in these specs, so the fade is checked in
  the browser, by the screenshots, and the specs check `data-state`.
- `PHASER_CANVAS_HOST` makes the host. Its default loads `@fz/phaser/host`
  with `import()` when the canvas first shows a scene, and drops a slow
  source that a later one overtook. Its spec runs real Phaser, headless.
  `provideFakePhaserCanvas()` is in `@fz/phaser/testing`, with
  `FakePhaserCanvas` to read its hosts and settle each scene they were shown
  (`ready()`, `fail()`).
- **The Solitaire Collection** wraps the canvas: its board is a `computed`
  `SceneSource` of the session and the game, the skeleton overlay is the
  placeholder, and `isInitializing` and `hasInitializationFailed` read the
  canvas's state. The board's `onReady` is the surroundings' `ready()`. The
  board is now built outside the effect, after the host's import, so the
  `untracked()` that kept the board's settings out of the effect went.
  `configureUiTestBed`, `routes.spec.ts` and `game_catalog.service.spec.ts`
  provide the fake canvas in place of their four `vi.mock`s of the host.
- Build: the `phaser` chunk is byte for byte the baseline's. `index` is
  788,701 bytes, 2,006 under the baseline, and the host is a chunk of its
  own, 4,351 bytes (1.75 kB gzipped), loaded once the canvas first shows a
  board: one small request more before the first deal.
- **The screenshots match.** The 42 seeded shots of the new build, against
  L0's: 18 of 21 identical in each palette, the rest at 1 to 7 pixels. The 7
  (a glyph's edge on a Yukon card, on a phone on its side) differ between
  two runs of the new build too, and a second run matched the baseline in
  20 of 21, the last at 4 pixels: noise.
- 6,864 Solitaire specs pass, above its floor; the library's 153, above its
  own.

### 2026-10-27: L6, skills and docs

- The Phaser skills moved from the Solitaire Collection's `.agents/skills/`
  to the repository's, with `git mv`, so every workspace loads them, and five
  more were copied in from Phaser's package for Snake: `phaser-tweens`,
  `phaser-time-and-timers`, `phaser-particles`, `phaser-audio-and-sound` and
  `phaser-groups-and-containers`. Renamed as the earlier copies were, their
  related skills that weren't copied in dropped as the earlier copies' were,
  and one line in `phaser-groups-and-containers` that pointed to
  `physics-arcade` reworded to name Phaser's package, since the reference
  check reads a bare `../<skill>/SKILL.md` as a link.
- `phaser-core` rewritten for any game: the library, where Phaser may be
  imported, how the shell and a scene talk, a scene's lifetime, testing, and
  the skills for each part of Phaser. It describes the code that exists, so
  Snake goes into it once Snake is built. `phaser-canvas-performance` keeps
  what holds for any game. What both said of cards went to a new
  `solitaire-phaser` skill in the Solitaire Collection.
- `.prettierignore` and `check-skill-references.mjs` follow the move. The
  link script doesn't remove links that lead nowhere, so the Solitaire
  Collection's fourteen old `phaser-*` junctions were removed by hand
  (`rmdir`, gitignored).
- Docs: `@fz/phaser` is listed in `.agents/AGENTS.md`, `frontend/AGENTS.md`,
  the `fuzzley-ui` skill and the `angular-testing` skill; `@fz/dev`'s
  `AGENTS.md` gained `phaser()` and `PHASER_CHUNK`; the library's own
  `AGENTS.md` is complete. The Solitaire Collection's `AGENTS.md`,
  `solitaire-build`, `solitaire-testing` and `add-solitaire-game` follow the
  library. Two stale passages from L1 and L2 were caught here: its
  `AGENTS.md` still named the `host/` folder L2 removed, and
  `solitaire-build` still showed the `manualChunks` L1 removed.
- `yarn lint` from `frontend/` passes, the reference check with it.

### 2026-10-27: L7, nothing changed in the Solitaire Collection

- `yarn verify` from `frontend/` passes: lint, typecheck, every
  workspace's specs and the build, the site's included.
- **Its suite:** 6,864 specs pass, at 98.5 / 92.8 / 98.9 / 99.3 against a
  floor of 95 / 88 / 96 / 96, which stays where it was.
- **Its compiled styles,** pulled out of both builds' bundles rule by rule:
  the global stylesheet is byte for byte the same file, and of some 300
  component rules only `GameCanvasComponent`'s differ: the insets' names,
  the canvas element's rule, which moved to the library's, and the
  overlay's fade, which moved to the library's four rules.
- **Its screenshots,** in L4's entry, match L0's. With the stock on the left,
  which L0's shots didn't cover, the new build and the baseline match too:
  the one difference, 22 pixels of the New Game button's icon on the rail,
  shows between two runs of the baseline as well.
- **Its `phaser` chunk** is the same file, by its hash.
- **By hand,** in the browser pane, on the built game: a draw from the stock
  and a drag in Klondike; Klondike to FreeCell, through the leave guard's
  question, and on to Spider, one canvas throughout, its label following
  the game; Spider on an upright phone and on its side; the stock moved to
  the left, which moved the rail to the right edge and the insets with it,
  with no resize; and the desktop deck changed in a running board.
- **A late scene recovers now.** With the pane hidden, the page ran as a
  background tab, drew no frame, and the canvas failed the board after
  eight seconds, as the old component did; fronted, the board drew and the
  canvas turned `ready`, where the old one stayed failed.
- **`phaser-lift` is ready to merge,** on the user's go-ahead: nothing is
  merged or pushed yet. Part 2 goes on `snake`, cut from it.

### 2026-10-27: S0, folded into the phases

- No mock, as the log's start says, and no spike of its own: L0 answered
  the questions about headless Phaser, and the rest are checked where they
  are built: the speeds, the glide and the queue by hand in S5 and S10, the
  first frame and the canvas renderer's fallback in S10. A screen reader
  can't be listened to here, so the board's role is decided by reasoning in
  S5 and left for the user to hear.

### 2026-10-27: S1, the workspace

- `frontend/games/snake/`, on the branch `snake` cut from `phaser-lift`,
  shaped as Sudoku: `gameConfig({ port: 9003, name: "Snake" })`,
  `angularTests()` with the rules and the view held near 100%, the
  tsconfig solution, `stylelint.config.js`, `index.html` and an empty
  shell. `src/test-setup.ts` installs headless Phaser before anything
  imports it. `tools/` and `tsconfig.scripts.json` wait for the first
  script, since ESLint and `tsc` both fail on an empty folder.
- **The fences,** one block for each layer, from the plan's table, with
  Phaser anchored as `/phaser`. The shell may import the scene and
  `@fz/phaser/host` only by type, since a value import of the host would
  pull Phaser into the first download. A probe file in each layer: every
  forbidden import refused, every allowed one let through.
- `games.json` doesn't list it yet.

### 2026-10-27: S2, the rules

- `src/rules/`: `geometry.ts`, `arena.ts` (walls only, decision 9),
  `speed.ts`, `apples.ts`, `run.ts`, `stepper.ts`, `describe.ts` and
  `saved_run.ts`, each with a spec, and `runFrom` and `pictureOf` in
  `src/testing/run_picture.ts`. 97 specs; 100% of statements, functions
  and lines, and 99% of branches, the one left a `?? 0` that can't be
  reached.
- **Where it differs from the plan, and why:**
  - A `Run` carries its board's `size`, always 17 in play (`createRun`,
    and `restoreRun` refuses anything else), so a spec can draw a whole
    board, a full one included, as a 3 × 3 picture.
  - What a step did is one `StepKind`: `moved`, `ate` (an apple eaten and
    another laid, so no `laid` of its own), `crashed` or `won`.
  - No `restart()` move: a new run is `createRun()` with a new id and seed.
  - `stepper.ts` takes the run and steps it, rather than only counting the
    steps, since each apple eaten shortens the next step within one frame.
  - The first apple lies four squares ahead of the snake, as the plan says;
    the seed lays every apple after it.
  - The head may move onto the tail's square. The plan's "unless the snake
    grows on that step" can't happen, since an apple is never under the
    snake, so it has no spec.
- Each apple shortens a step by 2 ms, down to the speed's fastest, which
  Slow reaches at 30 apples, Normal at 28 and Fast at 18.

### 2026-10-27: S3, the view

- `src/view/`, plain TypeScript tested in jsdom without Phaser: `frame.ts`
  (`SnakeFrame`), `board_metrics.ts`, `snake_shapes.ts`, `palette.ts`,
  `effects.ts`, `timing.ts`, and `controls.ts`, which decision 5 adds: the
  key map, by `event.code`, and `SwipeReader`, which turns once a finger
  has moved 24 CSS px and measures again from there. The scene hears the
  keys and the pointer through Phaser and asks these what they mean.
- **The contrast spec passes in every palette:** the snake, its head and
  the apple at 3:1 or more on both shades of square, from `snakePalette()`
  and `@fz/style/testing`. The checker equals what `paint()` resolves
  `--fz-wash-1` to. So the apple keeps `danger`, and there is no
  `_inks.scss`.
- **Where it differs from the plan, and why:**
  - `SnakeFrame` carries `newBest`, so the scene plays the new best's
    sound at a crash that set one, without asking the shell.
  - A crashed snake fades by its color, from `snake` toward `faded`
    (`fadeTo()`), not by an alpha for each segment: the body is lines and
    circles that overlap, and translucent ones would show their seams.
  - No wrap-around drawing, by decision 9.
- **`snakeShapes()` allocates nothing:** it writes into a `SnakeShapes`
  the painter keeps, folds the points of a straight run into one, and reads
  the snake by index, since destructuring takes an iterator. The one throw
  that reading needs, for a square the snake must have, can't be reached,
  so the view's statement floor is 99, its branches 95, the rest 100.
- 189 specs.

### 2026-10-27: S4, the scene

- `src/scene/`: `SnakeScene` and `makeSnakeScene(options)`, with four
  painters, each in a `Layer` of its own: `BoardPainter` (a `Grid` and the
  wall's `Graphics`), `ApplePainter` (an `Image` of a baked apple, which
  pops up), `SnakePainter` (one `Graphics` drawn again each frame from
  `snakeShapes()`) and `EffectsPainter` (the crumbs' emitter, the camera's
  shake and the fade's counter tween). `textures.ts` bakes the apple and
  the crumb with `bakeTexture()`, at the squares' size in device pixels.
- **Each frame** the scene hands the shell the frame's delta (`tick`), then
  pulls the `SnakeFrame` and the palette and draws them. It follows the run
  by its id and its steps: a new id kills every tween and resets the
  effects; a new step count plays `effectsOf()` once, so a frame that shows
  the same step again plays nothing. Sound waits for S8.
- **Keys and swipes are Phaser's** (decision 5): `input.keyboard`'s
  `keydown`, ignoring a held key and one pressed with Ctrl, Alt or Meta, so
  the browser keeps its shortcuts, and capturing the arrows and Space. The
  pointer's down, move and up feed a `SwipeReader` with 24 CSS px in device
  pixels. Both reach the shell as `BoardCommand`s.
- **Where it differs from the plan, and why:**
  - The layout is checked each frame, not on the scale manager's resize:
    the host's `refreshInsets()` only reads the insets again, with no
    event, so a rail that moves without the canvas changing size would go
    unseen. The check compares four numbers and the insets object, which
    changes only when read again, so it allocates nothing.
  - Phaser 4's `Grid` pads every cell by half a pixel (`cellPadding`, new
    in 4.0), which would show the page through a 1 px gutter, so the board
    sets it to 0. Its `setSize()` is private in the typings, so the painter
    sets `width` and `height`.
  - `makeSnakeScene()` returns a function giving a `SnakeScene`, which a
    `MakeScene` takes, so a spec reaches the painters without a cast. The
    painters are public fields of the scene, for the specs to read.
- **Decision 3, headless Phaser in jsdom, so far:** the 22 scene specs ran
  real Phaser on the first try, through `runScene()`, asserting on game
  objects: the grid's place and colors, the apple's place and scale, the
  snake's `Graphics` commands, live crumbs, the camera's shake, the fade.
  Breaking the scene on purpose (no effects, no reset on a new run, no pop,
  no filter on held keys) failed the spec meant to catch each break. What
  they can't reach is the drawing of a baked texture, which HEADLESS skips,
  so `textures.ts` stays half covered; the layout check (S10) and the hand
  QA see that. The scene has no coverage floor of its own.
- 211 specs.

### 2026-10-27: S5, the play and the board

- `src/app/play/game.service.ts`: the run, the new best and the result card
  in signals; `tick()` runs `advance()` and keeps the glide's progress in a
  field; `frame()` hands the scene one object, written again each call;
  `command()`, `turn()`, `pause()`, `resume()`, `toggle()`, `newGame()` and
  `changeSpeed()` (both asking first while a run is under way), `takeUp()`
  for S9, and `closeResult()`. A run counts as started at its first
  direction, and its end keeps the score and the length in the stats.
- `src/app/board/`: `BoardComponent` around `<fz-phaser-canvas>`, loading
  the scene with `import()`; the empty board drawn in CSS until the scene
  is ready; the start, pause and failure cards; `data-board` from
  `onLayout`, and `data-outcome`. `app.component` puts it in the stage.
- **Pulled forward from S9:** `SettingsService` (`snake-settings`: speed,
  movement, arrows, sound) and `StatsService` (`snake-stats`: runs, best
  and longest for each speed), since the game reads the speed, the movement
  and the best. S9 keeps `SavedGameService`.
- **Decisions made here, and why:**
  - **The board is `role="application"`**, named "Snake, 17 by 17" and
    described by its keys. In browse mode a screen reader keeps the arrow
    keys to read with, and an application hands them to the page, which a
    game steered by arrows needs. The canvas in it is hidden. Not yet
    heard with NVDA or Narrator; S10's hand QA does that.
  - **It pauses when the focus leaves the board,** not only on a dialog or
    a hidden page: with Phaser's keyboard on the board's element, keys
    stop steering once the focus is elsewhere, whether a dialog, the bar or
    another window took it. A hidden page pauses it too, from the app.
  - **The board takes the focus on a press:** Phaser's mouse prevents the
    default of `mousedown`, which is what would focus it.
  - **The result card's wait is counted in `tick()`,** the scene's time,
    not a timer, so it stops with the loop on a hidden page, and specs
    drive it.
  - **The cards sit in the lower half of the board,** a quarter of its side
    below the middle, since the middle row is where the snake and the apple
    start.
  - `advance()` returns a small object each frame. The rules hand back
    values by design; this one is all `tick()` allocates, and it is left.
- **The placeholder matches the scene's board:** at 1280 × 800 the scene
  put it at 197, 33, 629 × 629 and the CSS at 197.5, 33, 629 × 629.
- **Decision 3, again:** jsdom's `getComputedStyle()` reads custom
  properties set on the root's inline style, so three of the board's specs
  run the real scene the board loads, on headless Phaser: a key on the
  board reaches the game through Phaser's keyboard, the scene's time steps
  the run, and the layout reaches `data-board`. The shell's other specs use
  `provideFakePhaserCanvas()`.
- **Played in headless Chrome** (`snake-play.mjs` in the scratchpad, on
  `@fz/dev/chrome`), at 1280 × 800 and an upright phone in Soft pastel:
  the board takes the focus on load, an arrow starts the run, Space pauses
  and goes on, Escape pauses, an apple is eaten, and the crash shakes,
  fades and is announced with the new best. No errors. The browser pane
  can't time a game while it is hidden, and the session had no window.
- 277 specs.

### 2026-10-27: S6, the controls

- **What is left of S6 after decision 5:** the plan's `board_keys.ts` and
  `SwipeDirective` are the view's key map and `SwipeReader`, which the scene
  hears through Phaser (S3, S4). S6 is `<app-arrows>`, four DOM buttons in a
  cross, and when they show.
- **The arrows turn on `pointerdown`,** as a finger lands, and prevent its
  default, so the focus stays on the board and the keys go on steering;
  they also hand the focus back to the board, for a press made while it was
  elsewhere. A press from the keyboard, a `click` reporting no clicks,
  turns too. Each is named for its way, in a group named "Arrows". The
  chevron icon, turned, draws them, so they need no new icon.
- **When they show:** the setting's `touch` (the default) on a touch
  screen, `always`, or `never`. On an upright stage they sit under the
  board; on a wide one, beside it, by a container query on the stage.
- **`@fz/game-ui` gained `isTouchScreen`,** `pointer: coarse`, on
  `GameViewportService`, and `installFakeViewport()` answers the pointer
  query as a mouse's until `setCoarsePointer(true)`. The fake threw on a
  query it didn't know, so the app couldn't ask any other way under it.
  Both have specs, and its `AGENTS.md` says so.
- **Played on emulated touch phones** (`snake-touch.mjs`), upright and on
  its side: the arrows start and turn the run with the focus left on the
  board, a swipe down the board turns the snake down, and nothing scrolls.
- The root's lint, type-check and every workspace's tests pass. 287 specs
  in Snake.

### 2026-10-28: S7, the icons, the bar and the dialogs

- **`@fz/ui`'s icons gained `pause` (filled, beside `play`), `sound`,
  `sound-off` and `apple`,** each in `ICON_NAMES` and the template, with
  the icon spec's cases. `apple` wasn't in decision 18: the bar first drew
  the score with `plus`, the same icon as New Game beside it, and an apple
  says what the score counts.
- **`<app-bar>`:** the link home, "Snake" (the page's `<h1>`) with the
  speed as a badge, the score and the best, then Pause (Resume while
  paused, dimmed with `aria-disabled` while there is no run), Sound
  (`aria-pressed`), New Game, How to play and Settings. On a compact screen
  Pause and New Game stay, and Sound ("Turn sound off" or "on"), How to play
  and Settings go in the overflow menu.
- **Pause and Sound keep the focus through a pointer press:** the board
  pauses the run whenever it loses the focus, so a Pause pressed with a
  mouse would pause the run by taking the focus and then resume it with
  its click. Resume hands the board the focus back, for a press from the
  keyboard.
- **`<app-settings>`:** the speed (a new run, after the question), the
  movement (Glide or Step), the on-screen arrows (On a touch screen,
  Always, Never), Play sounds, and the palette; Sudoku's drawer styles.
- **`<app-result>`:** "Game over", or "You filled the board!", with why and
  at what speed, the score, the best and the length, "New best", New Game
  first, the other two speeds, and Close. It follows `resultOpen`, which
  the game opens once the fade has run.
- **`<app-help>`:** the rules, starting and queued turns, the speeds,
  pausing, and the controls.
- **The board takes the focus whenever the last dialog closes,** from one
  effect in the app rather than from each dialog, so after "Start a new
  game?" is answered no, a direction goes on with the run. Its spec fails
  when that effect is broken.
- **Layout:** on a phone, the board's area is capped at a square, so the
  board and the arrows sit together in the middle of the stage rather than
  apart; and the arrows hand the focus back without a focus ring.
- `src/testing/play.ts` shares `playToTheEnd()`, `endedGame()`,
  `wonGame()` and `ALMOST_FULL`, a 3 × 3 board one apple from full.
- **Driven in headless Chrome** (`snake-bar.mjs`): Pause and Resume with
  the mouse keep the focus on the board; the result card opens on New Game
  after a crash; settings and How to play hand the focus back as they
  close; New Game during a run asks first. On touch phones the compact bar
  sits along the bottom upright and as a rail on its side.
- 330 specs in Snake, 177 in `@fz/ui`.

### 2026-10-28: S8, sound

- **`tools/build-sounds.mjs`** (`yarn build:sounds`) synthesizes the three
  sounds at 16 kHz, mono, 16-bit, the same bytes every run: a bite (two
  rising blips, 0.13 s), a bump (a falling low tone and a knock of seeded
  noise, 0.34 s) and a chime (three notes of a major chord, 0.62 s). It
  writes `src/scene/sounds/sounds.wav` (41 kB, 1.29 s) and `sounds.json`,
  the spritemap, both committed. The workspace gained `tools/`,
  `tsconfig.scripts.json` and `@fz/dev`'s `scripts()` lint block back.
- **`SoundPlayer`** (`src/scene/sound_player.ts`) loads the sprite with
  `load.audioSprite()` from `create()`, not `preload()`, so the board never
  waits for its sounds; it plays a step's sound only once the sprite is in
  the cache, so a sprite that fails to load leaves the game silent, not
  broken; and it mutes Phaser's sound manager as the setting says,
  setting `mute` only when the setting changes. `SnakeSceneOptions` gained
  `sound()`, which the board reads from the settings.
- **The spritemap travels in the scene's chunk:** Phaser reads an object
  passed as the JSON's URL as the map itself, which its typings don't
  allow, so the one cast says so. Only the WAV is fetched.
- **Where it differs from the plan:** a WAV of 41 kB rather than about
  30 kB, since the chime rings for 0.62 s; and no shrink tween when an apple
  is eaten, since the crumbs say it.
- **Checked in headless Chrome** (`snake-sound.mjs`), which counts the Web
  Audio sources started: the sprite loads, an apple starts the bite and a
  crash that set a new best the chime, and with the sound off nothing
  starts. The scene's specs check the spritemap holds the view's `SOUNDS`
  in order, the muting, and that a board whose sounds can't load (headless
  Phaser has no audio) plays on.
- 334 specs.

### 2026-10-28: S9, storage

- `SettingsService` and `StatsService` came in S5. S9 adds
  `SavedGameService` (`snake-game`, version 1), which `main.ts` starts with
  `provideAppInitializer()`, as Sudoku's is, so a run is taken up before
  the board first shows.
- **When it writes:** as the run starts, pauses, goes on or eats an apple,
  and on `pagehide`, from an effect on the outcome, the score and the runs
  begun; never at a mere step, which comes ten or so times a second. A
  hidden page pauses the run, which writes it where it stands. A run
  waiting for its first direction, or ended, is forgotten.
- **Taking up:** `restoreRun()` checks what was kept and returns it paused,
  under the id after the run in hand, and `GameService.takeUp()` begins it
  and says so.
- **Checked in headless Chrome** (`snake-reload.mjs`): a run started and
  reloaded comes back paused where it stood as the page went away, with
  the board focused and the announcement made.
- 346 specs.

### 2026-10-28: S10, the checks

- **`tools/check-layout.mjs`** (`yarn check:layout`), on Sudoku's, opens
  the build at each of `@fz/dev/layout`'s shapes at 2×, twice: as a mouse
  finds it, and with the arrows shown, set up by a check's new `before()`,
  which `@fz/dev/layout` gained (a function run in the page ahead of its
  own scripts, through `Page.beforeLoad()`, with two specs). At each: no
  error and no scrolling, the canvas `ready` at its CSS size times the
  pixel ratio, the board square with squares of 16 CSS px or more, inside
  the window, where the placeholder drew it and inside the focus ring, and
  the arrows inside the window and off the board.
- **What it found:** at 2× the scene's squares are whole device pixels
  (39.5 CSS px at the roomy shape) and the stylesheet's whole CSS pixels
  (39), so the placeholder and the focus ring sat 8.5 px off the board.
  The board now hands its stylesheet `--pixel-ratio`, so the placeholder
  rounds as the scene does, and the ring takes the scene's rectangle once
  it has drawn, with a spec. The placeholder's squares also took the wall
  inside them (`border-box`); they now sit inside it, as the scene's do.
- **The check was broken on purpose** three ways, in the built bundle: the
  placeholder without its room, without its wall, and the ring and the
  rounding as before. Each failed it, at the shapes where the difference
  shows.
- **Sizes, gzipped:** the entry 77.7 kB (260.5 kB raw) and its CSS 2.8 kB;
  the scene 4.0 kB; `@fz/phaser`'s host 1.8 kB; the `phaser` chunk 351.7 kB
  (1,367 kB raw), the same file as the Solitaire Collection's; the sounds
  41 kB. The entry holds no Phaser: it reaches the host and the scene only
  through `import()`, and only they import the `phaser` chunk.
- **QA against the build** (`vite preview`), with the scripts from S5 to S9
  and one more (`snake-qa10.mjs`): play by keyboard, eating and crashing, a
  new best; the bar, the result card, settings, help and the confirm, with
  the focus back on the board each time; the arrows and swipes on a touch
  phone upright and on its side; the sounds, and none with the sound off; a
  reload taking the run up paused. Then: Z and Q, as an AZERTY keyboard
  sends them (`KeyW`, `KeyA`), steer up and left; the WebGL context lost
  and restored mid-run (`WEBGL_lose_context`), after which the board, the
  apple's baked texture and the snake draw again and the run goes on; Soft
  pastel and a dark palette. No page reported an error. Tabs switched
  mid-run pause it, as a spec checks; headless Chrome can't hide a page.
  Not done: a real phone, Lighthouse and a performance trace.
- **Decision 3, headless Phaser against mocks.** Snake's 26 scene specs run
  real Phaser in jsdom through `runScene()`, in 410 lines, with no stand-in
  for Phaser at all, in about 3 s with jsdom's start-up; `@fz/phaser`'s
  harness is 270 lines, shared. The Solitaire Collection's 200 scene specs
  run on `test/support/phaser_mocks.ts`, 961 lines of hand-made Phaser, in
  about the same time. What headless gave: the scene's specs caught real
  mistakes the mocks would have taken on trust (Grid's `cellPadding` of
  0.5, its private `setSize`, which cells it washes, the keyboard's global
  captures), and an upgrade of Phaser is checked against Phaser itself.
  What it costs: no pixels (a headless game draws nothing, so the specs
  read the game objects' state, as the mocks do), no audio, and a spec
  drives frames and the clock by hand. The recommendation, for the user to
  decide: move the Solitaire Collection's scene specs to the harness file
  by file when each is next touched, starting with `table_light.spec.ts`,
  and retire the mocks once nothing imports them; not as part of this
  work.
- 347 specs.

### 2026-10-28: S11, screenshots and docs

- **`tools/capture-screenshots.mjs`** (`yarn capture:screenshots`) stores a
  run as the game keeps one (`snake-game`), twelve apples in at Normal and
  bent across the upper half of the board, with stats for a best of 21,
  and opens the page, which takes it up paused: the card sits clear of the
  snake. It differs from the plan's scripted route, which steered a live
  run by timed keys; a stored run gives the same picture every time.
  Soft pastel draws the snake in its purple accent, so the link preview's
  alt text in `index.html` says so.
- **Docs:** Snake's `AGENTS.md` (the layout, the board's rules, styling,
  storage, commands, tests) and `README.md`; a `snake-testing` skill, linked
  with the script; `phaser-core` revisited with what Snake taught (Snake as
  the smaller example, its layers, a scene that hands the game its time,
  input, Phaser 4's surprises, and the harness's worked example); and the
  lists that name the games: `.agents/AGENTS.md`, `frontend/AGENTS.md`,
  `frontend/games/AGENTS.md` (9003 is Snake's, so the next game takes
  9004), `frontend/lib/dev/AGENTS.md`, `docs/operations.md`, the root
  `README.md`, `fuzzley-ui`, `web-game-accessibility` (a board that moves by
  itself) and `angular-testing`.
- The log stays until S12 and the QA are done, then goes before the merge.
