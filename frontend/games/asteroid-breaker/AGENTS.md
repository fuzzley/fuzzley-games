# Asteroid Breaker

The `asteroid-breaker` workspace: Asteroid Breaker, its field to be drawn
with Phaser 4 through `@fz/phaser`, in an Angular shell on the shared
libraries, laid out as Brick Breaker's is. What every game keeps, in
[frontend/games/AGENTS.md](../AGENTS.md), what every workspace keeps, in
[frontend/AGENTS.md](../../AGENTS.md), and the repository's rules, in
[.agents/AGENTS.md](../../../.agents/AGENTS.md), apply here too; this
workspace keeps its own for its code. The repository's `phaser-core` skill
says how any game here is drawn with Phaser. Paths are relative to
`frontend/games/asteroid-breaker/`.

The game is being built from `docs/asteroid-breaker-execution-plan.md`, step
by step, each logged in `docs/asteroid-breaker-worklog.md`. So far the shell
shows the bar, with Pause, New game, the speed and the settings, and the
board, with its cards, a first settings drawer and the result card over an
ended run, and keeps the records and the sectors reached ("What It Keeps"). The site serves it all the same, badged "In development"
(`inDevelopment` in `frontend/site/src/app/provider/games.ts`), and a
production build offers the debug menu at `?debug`, as the user asked.

## Technology Stack

- **Field:** drawn with [Phaser 4](https://phaser.io/), through
  `@fz/phaser`
- **UI:** [Angular](https://angular.dev/) (standalone components, zoneless
  change detection), on `@fz/style`'s global stylesheet so far, with
  `@fz/ui`, `@fz/game-ui` and `@fz/core` among its dependencies (the
  `fuzzley-ui` skill)
- **Build Toolchain:** [Vite](https://vitejs.dev/) + [AnalogJS Vite Angular Plugin](https://analogjs.org/)
- **Test Framework:** [Vitest](https://vitest.dev/) with jsdom, Testing
  Library, and real Phaser run headless
- **Language:** TypeScript / HTML / Sass

## Layers

Four layers, each a folder under `src/` named for it, each importing only
the layers below it, as `eslint.config.js` fences them: the rules',
`src/rules/`, the view's, `src/view/`, the scene's, `src/scene/`, which
draws the field on Phaser, and the shell's, `src/app/`, whose board loads
the scene with `import()`.

| Layer | May import                                                                                                                     | May not import                                                      |
| ----- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| rules | `@fz/core`                                                                                                                     | Phaser, Angular, RxJS, any other `@fz/*`, the view, scene and shell |
| view  | the rules, `@fz/core`, `@fz/phaser/color`, `@fz/phaser/insets`, `@fz/phaser/layout`, `@fz/phaser/shapes`, `@fz/style/fuzzball` | Phaser, Angular, RxJS, the shell's libraries, the scene and shell   |
| scene | Phaser, `@fz/phaser`'s entries but the canvas, the view and the rules                                                          | Angular, RxJS, the shell's libraries, the shell                     |
| app   | Angular, every `@fz/*` library, the rules and the view; the scene and `@fz/phaser`'s host, scene helpers and sound by type     | Phaser, and the scene or those three entries by a value import      |

## Development Commands

Run these from `frontend/games/asteroid-breaker/`, or as
`yarn workspace asteroid-breaker <script>` from `frontend/`. The root's
`yarn lint`, `yarn typecheck`, `yarn test` and `yarn build` run this
workspace's with the others'.

- **Run Development Server:** `yarn dev` (at `http://localhost:9005/`; the
  Solitaire Collection's uses 9000, Minesweeper's 9001, Sudoku's 9002,
  Snake's 9003 and Brick Breaker's 9004).
- **Production Build:** `yarn build`, into `dist/`; `yarn preview` serves it.
- **Run Unit Tests:** `yarn test` (the whole suite once, with coverage,
  failing below the floor `vitest.config.ts` sets for the rules and the
  view), `yarn test:watch`, or `yarn vitest run <path>` for one spec, which
  leaves the floor alone.
- **Linting:** `yarn lint` (ESLint with `@fz/dev`'s blocks and the fences
  between the layers, then stylelint with `@fz/style`'s preset).
- **Type Checking:** `yarn typecheck` (the app, the specs, the Vite
  config, and the scripts under `tools/` from their JSDoc).
- **Report the Waves:** `yarn report:waves` (runs `tools/report-waves.mjs`:
  the autopilot in `src/testing/autopilot.ts` plays every wave at every
  speed on the narrowest field, or the widest with `--field wide` on its
  side or `--field tall` upright, from the wave's number as the seed, as
  the autopilot's spec does, through `playWave()`. It prints the game time
  each took and the strays it brought home, flown with nothing able to
  take the ship, and the ships each cost as the spec plays it, and fails
  if any play didn't clear its wave in time (`-`), which makes it stricter
  than the spec). It is how the climb from wave to wave is tuned;
  `--seeds <n>` plays each wave from that many seeds of its own, since one
  seed's rocks and pickups can make a wave look far easier or harder than
  it is.

## Tests

The repository's rules for specs apply. A spec sits beside the file it
tests, named after it, and runs in jsdom; `src/test-setup.ts` installs
`@fz/phaser/testing`'s headless Phaser first, so a scene's spec runs real
Phaser. The repository's `angular-testing` skill covers the patterns every
Angular workspace's specs share, and `phaser-core` the harness.

## What It Keeps

Each entry is in `localStorage`, versioned
(`LocalStorageService.writeVersioned()`), and its reader drops what it
can't trust rather than failing:

- `asteroid-breaker-stats`: for each speed, the runs, the best run's score,
  the furthest wave reached and the strays brought home; and for each
  sector's id, the score of the best run started there at each speed. Ids
  no sector has any more are dropped.
- `asteroid-breaker-progress`: the ids of the sectors reached, at any
  speed, which a run may start at. Ids no sector has any more are dropped.

A run flown on numbers the debug menu tuned, its field stepped with them,
keeps none of either. A field added to an entry later is read as optional,
so a reader never drops a player's records for lacking it.
