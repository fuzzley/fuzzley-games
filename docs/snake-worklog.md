# Work log: Snake on Phaser

The log of [the Snake plan](snake-plan.md), kept so the work can pause and
resume. Newest entries last. It is deleted when the work is done; git
history keeps it.

## How to resume

- Part 1, the `@fz/phaser` lift (L0 to L7), is on the branch `phaser-lift`,
  cut from `main` at `8353bda`, with the plan and this log as its first
  commit. Part 2, Snake (S0 to S12), is on `snake`, cut from `phaser-lift`,
  so `phaser-lift` can be merged to `main` on its own first (decision 19).
  Nothing is merged to `main` or pushed until the user says so: a push to
  `main` deploys.
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

| Phase | What                                        | State |
| ----- | ------------------------------------------- | ----- |
| L0    | The spike and the Solitaire baselines       | done  |
| L1    | The `@fz/phaser` workspace                  | done  |
| L2    | The host and the pure entries               | done  |
| L3    | The scene helpers and the headless harness  | done  |
| L4    | The canvas component                        | done  |
| L5    | Build and lint                              | done  |
| L6    | Skills and docs                             | done  |
| L7    | Nothing changed in the Solitaire Collection | to do |
| S0    | The spike                                   | to do |
| S1    | The Snake workspace                         | to do |
| S2    | The rules                                   | to do |
| S3    | The view                                    | to do |
| S4    | The scene                                   | to do |
| S5    | The play and the board                      | to do |
| S6    | The controls                                | to do |
| S7    | The icons, the bar and the dialogs          | to do |
| S8    | Sound                                       | to do |
| S9    | Storage                                     | to do |
| S10   | The checks                                  | to do |
| S11   | Screenshots and docs                        | to do |
| S12   | Ship, and QA of both games                  | to do |

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
