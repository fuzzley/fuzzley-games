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
| L0    | The spike and the Solitaire baselines       | to do |
| L1    | The `@fz/phaser` workspace                  | to do |
| L2    | The host and the pure entries               | to do |
| L3    | The scene helpers and the headless harness  | to do |
| L4    | The canvas component                        | to do |
| L5    | Build and lint                              | to do |
| L6    | Skills and docs                             | to do |
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
