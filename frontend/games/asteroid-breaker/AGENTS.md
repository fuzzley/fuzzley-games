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
shows the game's name alone, and the site doesn't ship it:
`frontend/site/games.json` doesn't list it.

## Technology Stack

- **Field:** to be drawn with [Phaser 4](https://phaser.io/), through
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
the layers below it, as `eslint.config.js` fences them. Only the shell's,
`src/app/`, holds code yet.

| Layer | May import                                                                                                                 | May not import                                                      |
| ----- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| rules | `@fz/core`                                                                                                                 | Phaser, Angular, RxJS, any other `@fz/*`, the view, scene and shell |
| view  | the rules, `@fz/core`, `@fz/phaser/color`, `@fz/phaser/insets`, `@fz/phaser/layout`, `@fz/style/fuzzball`                  | Phaser, Angular, RxJS, the shell's libraries, the scene and shell   |
| scene | Phaser, `@fz/phaser`'s entries but the canvas, the view and the rules                                                      | Angular, RxJS, the shell's libraries, the shell                     |
| app   | Angular, every `@fz/*` library, the rules and the view; the scene and `@fz/phaser`'s host, scene helpers and sound by type | Phaser, and the scene or those three entries by a value import      |

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
- **Type Checking:** `yarn typecheck` (the app, the specs and the Vite
  config).

## Tests

The repository's rules for specs apply. A spec sits beside the file it
tests, named after it, and runs in jsdom; `src/test-setup.ts` installs
`@fz/phaser/testing`'s headless Phaser first, so a scene's spec runs real
Phaser. The repository's `angular-testing` skill covers the patterns every
Angular workspace's specs share, and `phaser-core` the harness.
