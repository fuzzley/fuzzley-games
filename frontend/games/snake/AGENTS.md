# Snake

The `snake` workspace: Snake, its board drawn with Phaser 4 through
`@fz/phaser`, in an Angular shell on the shared libraries. What every game
keeps, in [frontend/games/AGENTS.md](../AGENTS.md), what every workspace
keeps, in [frontend/AGENTS.md](../../AGENTS.md), and the repository's rules,
in [.agents/AGENTS.md](../../../.agents/AGENTS.md), apply here too; this
workspace keeps its own for its code. The repository's `phaser-core` skill
says how any game here is drawn with Phaser. Paths are relative to
`frontend/games/snake/`.

## Technology Stack

- **Board:** [Phaser 4](https://phaser.io/), through `@fz/phaser`'s canvas,
  host and scene helpers
- **UI:** [Angular](https://angular.dev/) (standalone components, signals,
  zoneless change detection) on `@fz/style`, `@fz/ui` and `@fz/game-ui` (the
  `fuzzley-ui` skill), with `@fz/core`'s helpers in the rules
- **Build Toolchain:** [Vite](https://vitejs.dev/) + [AnalogJS Vite Angular Plugin](https://analogjs.org/)
- **Test Framework:** [Vitest](https://vitest.dev/) with jsdom, Testing
  Library, and real Phaser run headless
- **Language:** TypeScript / HTML / Sass

## Layers

Four folders under `src/`, each importing only the layers below it, as
`eslint.config.js` fences them:

| Folder       | May import                                                                                      | May not import                                                      |
| ------------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `src/rules/` | `@fz/core`                                                                                      | Phaser, Angular, RxJS, any other `@fz/*`, the view, scene and shell |
| `src/view/`  | the rules, `@fz/core`, `@fz/phaser/color`, `@fz/phaser/insets`, `@fz/phaser/layout`             | Phaser, Angular, RxJS, the shell's libraries, the scene and shell   |
| `src/scene/` | Phaser, `@fz/phaser`'s entries but the canvas, the view and the rules                           | Angular, RxJS, the shell's libraries, the shell                     |
| `src/app/`   | Angular, every `@fz/*` library, the rules and the view; the scene and `@fz/phaser/host` by type | Phaser, and the scene or the host by a value import                 |

The shell loads the scene with `import()`, which the fence doesn't see, so
Phaser stays out of the first download.

## Layout

- **`src/rules/`** — the game, with no framework. A `Run` (`run.ts`) is a
  run from its first direction to its end, a value each step replaces:
  `turn()` queues up to two turns, `step()` moves the snake a square, eats,
  crashes or fills the board, and `pause()` and `resume()` stop and start
  it. The board is `arena.ts`, 17 squares a side with walls round it, and
  squares and directions `geometry.ts`. `apples.ts` places each apple on a
  free square from the run's seed, through `@fz/core`'s random. `speed.ts`
  holds the three speeds, each step a little quicker for every apple eaten,
  and `stepper.ts` turns a frame's time into steps, two at most however long
  the frame. `describe.ts` puts what happened into the words the announcer
  says, and `saved_run.ts` turns a run into what storage keeps and back.
- **`src/view/`** — what the scene draws, worked out without Phaser, so its
  specs are plain: where the board lies on the canvas, in whole device
  pixels (`board_metrics.ts`, on `@fz/phaser/layout`'s `fitCells()`); the
  palette from the page's roles (`palette.ts`); the snake as a path of segments and corners, glided
  between steps (`snake_shapes.ts`, from a `SnakeFrame` in `frame.ts`); what
  a step sets off, the crumbs, the shake, the fade and the sound
  (`effects.ts`), and for how long (`timing.ts`); and the keys and swipes
  as commands (`controls.ts`, keys by `event.code`, so an AZERTY keyboard
  steers with Z, Q, S and D).
- **`src/scene/`** — the Phaser scene. `SnakeScene` (`snake_scene.ts`) is
  handed plain functions over the game (`SnakeSceneOptions`): each frame it
  hands the game the time, reads the frame and the palette, and has its
  painters draw: `BoardPainter` the checker and the wall, `ApplePainter` the
  apple, `SnakePainter` the snake, and `EffectsPainter` the crumbs, the
  shake and the fade. Its keys and swipes go back through `command()`.
  `textures.ts` bakes the apple and the crumb through `@fz/phaser`'s
  `bakeTexture()`, and `@fz/phaser/sound`'s `SpritePlayer` plays the sprite
  in `sounds/`, which `yarn build:sounds` writes.
- **`src/app/`** — the shell, one folder per feature, as in Minesweeper and
  Sudoku. `app.component` lays out the board, the arrows and the bar, with
  the `<fz-announcer>` the run is announced through; it hands the board the
  focus as each run begins and whenever the last dialog closes, keeps it in
  the room (the board and the arrows) through a press on what can't take
  it, and pauses the run when the page is hidden, the screen turns or the
  focus leaves the room.
  - `play/` — `GameService` holds the run and its clock, which the scene's
    frames drive through `tick()`, makes every command, says what happened,
    keeps the stats, and asks through `@fz/ui/confirm` before a new game or
    speed throws a run away; `SavedGameService`, which `main.ts` starts
    before the board shows, keeps the run under way and takes it up, paused,
    after a reload.
  - `board/` — `<fz-phaser-canvas>` with the scene, loaded with `import()`;
    the empty board drawn in CSS until the scene has drawn; the focus ring;
    and the cards that say how to start, that the run is paused, how to
    start again once an ended run's result is put away, that the board is
    still loading on a slow connection, or that it couldn't be drawn. The board is Phaser's keyboard target.
  - `arrows/` — the on-screen arrows, on a touch screen or as the settings
    say, which turn the snake and hand the focus back to the board, steer by
    the game's keys while one has the focus, and wait, dimmed, until the
    board is drawn.
  - `bar/` — `BarComponent` fills the libraries' `<fz-game-bar>` with the
    speed, a `<fz-bar-choice>` that starts a run at another through
    `GameService.changeSpeed()`, the score and the best, and the actions,
    Pause and Sound among them, and moves the actions into
    `<fz-bar-overflow>` on a compact screen.
  - `settings/` — the settings drawer (the speed, the movement, the arrows,
    the sound and the palette) and `SettingsService`, which keeps what the
    player chose.
  - `stats/` — `StatsService`, each speed's runs, best score and longest
    snake.
  - `result/` — the card over an ended run, which opens once the snake has
    faded. `help/` — How to play.
  - `styles/` — `global.scss`, loaded once from `main.ts`, and
    `_index.scss`, the toolkit every component `@use`s, which emits no CSS.

  A new feature gets a folder of its own, named for what it does, never for
  the kind of code in it.

- **`src/testing/`** — what specs share: `runFrom` (`run_picture.ts`) draws
  a run as rows of characters, an arrow on each square of the snake, and
  `pictureOf` draws one back; `play.ts` plays a game to its end, lost or
  won. The app's tsconfig leaves it out.
- **`tools/`** — the scripts run from the workspace. `build-sounds.mjs`
  synthesizes the sounds; `check-layout.mjs` checks the build's layout in
  headless Chrome; `capture-screenshots.mjs` makes the screenshots the site
  shows.

## The Board

- **The scene follows the game; it never leads.** Each frame it hands the
  game the time (`tick()`), so the run steps in the scene's time, and draws
  the frame the game hands back. A new run, or a run taken up, has a new id,
  which is how the scene knows to stop what the last one set off.
- **The board is an application** to assistive technology, focusable and
  named "Snake, 17 by 17", so a screen reader hands it the arrow keys; the
  canvas in it is hidden, and the announcer says what happens. The arrows,
  Pause and Sound keep the focus on the board when pressed with a mouse or
  a finger, so the keys go on working.
- **Phaser's input is the board's.** The keyboard's target is the board's
  element, so the keys reach the game only while it has the focus; Phaser's
  captures are global, which is why the scene takes only the keys the game
  uses, and ignores a held key and one pressed with Ctrl, Alt or Meta.
- **The run waits for the player.** It starts at the first direction, pauses
  when the focus leaves the room, the page is hidden or the screen turns,
  and goes on at once at a direction, Space or P; a run taken up after a
  reload starts paused. Once an ended run's result is put away, Enter or
  Space starts another; Enter pressed on a button over the board presses
  the button instead. Nothing starts or goes on until the board is drawn
  (`GameService.drawn`, which the board sets from its canvas), since a run
  nobody can see would be lost.
- **Its colors are the palette's.** `snakePalette()` takes the panel, the
  text, the accent and the danger from the page, which `ThemeService` reads,
  and `src/view/contrast.spec.ts` holds the snake, its head and the apple to
  3:1 against both shades of square in every palette.
- **The placeholder, the ring and the cards work out the board's square in
  CSS,** as `boardMetrics()` does, at the window's pixel ratio; the ring
  takes the scene's own rectangle once it has drawn, and the layout check
  holds the placeholder to it.
- **Motion follows the player's preference** (`GameViewportService`'s
  `allowsMotion`): without it the apple appears without its pop, the crumbs
  and the shake are left out, a crashed snake fades at once, and the result
  card opens without waiting.

## Styling

Every component stylesheet opens with `@use "../styles" as *;`, which
brings in `@fz/style`'s mixins and `@fz/game-ui`'s breakpoints, and nothing
else. The frontend's Angular and Sass rules apply; on top of them:

- **No color is written in a stylesheet.** The board's are the palette's,
  read by the scene, and the placeholder draws with the palette's tokens.
- **The sizes come from the stage,** a size container: the board takes the
  room it is given, and the arrows sit under it on a tall stage and beside
  it on a wide one, their keys shrinking from 64 to 44 CSS px where the
  stage is short upright or narrow on its side. On a small board the cards
  set smaller and sit in the middle, so they stay on it.
- **The pause, sound, sound-off and apple icons** were added to `@fz/ui`'s
  icons for the bar.

## What It Keeps

Each entry is in `localStorage`, versioned
(`LocalStorageService.writeVersioned()`), and its reader drops what it
can't trust rather than failing:

- `snake-settings`: the speed, the movement (gliding or stepping), when the
  arrows show, and the sound.
- `snake-stats`: each speed's runs, best score and longest snake.
- `snake-game`: the run under way, as `saved_run.ts` writes it. It is
  written as the run starts, pauses, goes on or eats, and as the page goes
  away, never at a mere step, and forgotten once the run ends.
  `restoreRun()` drops a snake that doesn't hold together or an apple under
  it.

## In This Repository

What every game keeps is in `frontend/games/AGENTS.md`. Here:

- **The site serves it at `/play/snake/`,** and its `game.json` names it
  Snake, as the site's catalog must.
- **Its screenshots** are in `public/docs/screenshots/snake/`, and
  `yarn capture:screenshots` makes them again.
- **The browser's toolbar takes the page's color** (`THEME_COLOR_ROLE` in
  `src/main.ts`), and the settings offer the palette.
- **Accessibility.** The rules are the repository's `web-game-accessibility`
  skill's. Every overlay is an `<fz-dialog>`, the board is the application
  above, and every start, pause, going on and end is announced.

## Development Commands

Run these from `frontend/games/snake/`, or as `yarn workspace snake
<script>` from `frontend/`. The root's `yarn lint`, `yarn typecheck`,
`yarn test` and `yarn build` run this workspace's with the others'.

- **Run Development Server:** `yarn dev` (at `http://localhost:9003/`; the
  Solitaire Collection's uses 9000, Minesweeper's 9001 and Sudoku's 9002).
  The site's dev server serves the build `yarn start` made when it started;
  `yarn dev:all`, from `frontend/`, serves this dev server there instead.
- **Production Build:** `yarn build`, into `dist/`, with Phaser in a chunk of
  its own, which the scene loads; `yarn preview` serves it.
- **Run Unit Tests:** `yarn test` (the whole suite once, with coverage,
  failing below the floor `vitest.config.ts` sets for `src/rules/` and
  `src/view/`), `yarn test:watch`, or `yarn vitest run <path>` for one
  spec, which leaves the floor alone.
- **Linting:** `yarn lint` (ESLint with `@fz/dev`'s blocks, the fences
  between the layers and the scripts' rules for `tools/`, then stylelint
  with `@fz/style`'s preset).
- **Type Checking:** `yarn typecheck` (the app, the specs, the Vite config,
  and the scripts in `tools/` from their JSDoc, with
  `tsconfig.scripts.json`).
- **Check the Layout:** `yarn check:layout` (runs
  `tools/check-layout.mjs` on the build `yarn build` made: in headless
  Chrome, at `@fz/dev/layout`'s shapes (a roomy window, and a large and a
  small phone, upright and on its side) and at 320 × 480, and turned from
  upright to its side and back, each at 2×, once with the arrows and once
  without, the page reports no error and doesn't scroll, the bar's controls
  lie in the window, the canvas draws at its size times the pixel ratio,
  the board is square with squares of 16 CSS px or more (12 at 320 × 480
  with the arrows), inside the window, where the placeholder drew it and
  inside the focus ring, its card lies on it, and the arrows lie in the
  window, off the board).
- **Make the Sounds:** `yarn build:sounds` (runs `tools/build-sounds.mjs`,
  which synthesizes the bite, the bump and the chime into
  `src/scene/sounds/sounds.wav` and their spritemap, `sounds.json`, the same
  bytes every run).
- **Capture Screenshots:** `yarn capture:screenshots` (runs
  `tools/capture-screenshots.mjs` against the running dev server in headless
  Chrome, through `@fz/dev/chrome`: a run kept as the game keeps one, twelve
  apples in at Normal, taken up paused, at 1280 × 720 and 2× on Soft
  pastel, written to `public/docs/screenshots/snake/` as the site's
  `preview.webp` (2560 × 1440) and `thumb.webp` (576 × 324, the board) by
  `@fz/dev/screenshots`; `--url` names another server, and
  `--chrome <path>` or `CHROME_PATH` picks the browser).

## Tests

The repository's rules for specs apply. A spec sits beside the file it
tests, named after it, and runs in jsdom; `src/test-setup.ts` installs
`@fz/phaser/testing`'s headless Phaser first, so the scene's specs run real
Phaser. This workspace's `snake-testing` skill, in `.agents/skills/`, covers
its setup and fixtures, the repository's `angular-testing` the patterns
every Angular workspace's specs share, and `phaser-core` the harness. The
rules' specs draw their runs with `runFrom`, rather than playing to a
position.
