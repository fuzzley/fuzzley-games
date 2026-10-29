# Brick Breaker

The `brick-breaker` workspace: Brick Breaker, its field to be drawn with
Phaser 4 through `@fz/phaser`, in an Angular shell on the shared libraries. What
every game keeps, in [frontend/games/AGENTS.md](../AGENTS.md), what every
workspace keeps, in [frontend/AGENTS.md](../../AGENTS.md), and the
repository's rules, in [.agents/AGENTS.md](../../../.agents/AGENTS.md), apply
here too; this workspace keeps its own for its code. The repository's
`phaser-core` skill says how any game here is drawn with Phaser. Paths are
relative to `frontend/games/brick-breaker/`.

It is being built, step by step, as `docs/brick-breaker-execution-plan.md`
lays out, which also describes the game as it will be; this file describes
the code that exists.

## Technology Stack

- **Field:** [Phaser 4](https://phaser.io/), through `@fz/phaser`'s canvas,
  host and scene helpers
- **UI:** [Angular](https://angular.dev/) (standalone components, signals,
  zoneless change detection) on `@fz/style`, `@fz/ui` and `@fz/game-ui` (the
  `fuzzley-ui` skill), with `@fz/core`'s helpers in the rules
- **Build Toolchain:** [Vite](https://vitejs.dev/) + [AnalogJS Vite Angular Plugin](https://analogjs.org/)
- **Test Framework:** [Vitest](https://vitest.dev/) with jsdom, Testing
  Library, and real Phaser run headless
- **Language:** TypeScript / HTML / Sass

## Layers

`eslint.config.js` fences four folders under `src/`, as Snake's, each
importing only the layers below it: the rules, with no framework and no
library but `@fz/core`, physics included; the view, which will work out
what to draw without Phaser, with `@fz/phaser`'s pure entries; the scene,
the only code that will import Phaser; and the shell, in Angular, which
may take the scene and `@fz/phaser/host` only by type. So far the rules
and the shell exist.

## Layout

- **`src/rules/`** — the game, with no framework, physics included.
  `tuning.ts` holds the numbers that set its feel, in field units (the
  field is 26 wide and 30 tall); `speed.ts` the three speeds, each a base
  and a top the ball climbs to, and `ballSpeed()`; and `stepper.ts` the
  clock that turns a frame's time into fixed steps of 1/120 s, twelve at
  most a frame. `grid.ts` is the bricks' grid, 13 by 16: a cell's index,
  `brickBox()`, the one place a brick's box is worked out, and
  `exposureOf()`, which faces and corners of a brick a ball can touch, so
  bricks side by side make one face and a corner is only where nothing
  touches it. `sweep.ts` finds the first moment a moving circle touches a
  face pushed out by its radius, or a corner, as a share of its move, so
  however fast a ball goes it can't pass through a brick.
- **`src/rules/catalog/`** — what the game can hold, each a readonly object
  written `as const satisfies`, so its ids survive as a type: `bricks.ts`
  (`BRICK_KINDS`, each kind's hits, whether a level needs it, its points
  and its traits), `balls.ts` (`BALL_KINDS`, each kind's damage, whether it
  passes through what it breaks and reaches the bricks around) and
  `capsules.ts` (`CAPSULES`, each capsule's tone, weight, first level and
  effect, whose kind is its group). Each has its ids in How to play's order
  and a function that returns an entry as the shape every entry has.
  `src/rules/catalog.spec.ts` holds every entry to the catalogs' rules.
- **`src/app/`** — the shell: for now `app.component`, which shows the
  game's name, and `styles/`, `global.scss`, loaded once from `main.ts`, and
  `_index.scss`, the toolkit every component `@use`s, which emits no CSS.

## Development Commands

Run these from `frontend/games/brick-breaker/`, or as
`yarn workspace brick-breaker <script>` from `frontend/`. The root's
`yarn lint`, `yarn typecheck`, `yarn test` and `yarn build` run this
workspace's with the others'.

- **Run Development Server:** `yarn dev` (at `http://localhost:9004/`; the
  Solitaire Collection's uses 9000, Minesweeper's 9001, Sudoku's 9002 and
  Snake's 9003).
- **Production Build:** `yarn build`, into `dist/`; `yarn preview` serves it.
- **Run Unit Tests:** `yarn test` (the whole suite once, with coverage,
  failing below the floor `vitest.config.ts` sets for the rules and the
  view), `yarn test:watch`, or `yarn vitest run <path>` for one
  spec, which leaves the floor alone.
- **Linting:** `yarn lint` (ESLint with `@fz/dev`'s blocks and the fences
  between the layers, then stylelint with `@fz/style`'s preset).
- **Type Checking:** `yarn typecheck` (the app, the specs and the Vite
  config).

## Tests

The repository's rules for specs apply. A spec sits beside the file it
tests, named after it, and runs in jsdom; `src/test-setup.ts` installs
`@fz/phaser/testing`'s headless Phaser first, for the scene's specs to come.
