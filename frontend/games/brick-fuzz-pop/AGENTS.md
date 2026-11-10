# Brick Fuzz Pop

The `brick-fuzz-pop` workspace: Brick Fuzz Pop, its field to be drawn with
Phaser 4 through `@fz/phaser`, in an Angular shell on the shared libraries,
laid out as Brick Breaker's and Asteroid Breaker's are. What every game
keeps, in [frontend/games/AGENTS.md](../AGENTS.md), what every workspace
keeps, in [frontend/AGENTS.md](../../AGENTS.md), and the repository's rules,
in [.agents/AGENTS.md](../../../.agents/AGENTS.md), apply here too; this
workspace keeps its own for its code. The repository's `phaser-core` skill
says how any game here is drawn with Phaser. Paths are relative to
`frontend/games/brick-fuzz-pop/`.

The game is being built from `docs/brick-fuzz-pop/implementation-plan.md`,
package by package, the design in `docs/brick-fuzz-pop/plan.md`, each
stream's work logged under `docs/brick-fuzz-pop/worklog/`. So far the shell
shows the game's name alone, its settings drawer written but opened by
nothing yet, and the site doesn't ship it: `frontend/site/games.json`
doesn't list it.

## Technology Stack

- **Field:** to be drawn with [Phaser 4](https://phaser.io/), through
  `@fz/phaser`
- **UI:** [Angular](https://angular.dev/) (standalone components, zoneless
  change detection), on `@fz/game-ui`'s global stylesheet so far, with
  `@fz/ui`, `@fz/game-ui` and `@fz/core` among its dependencies (the
  `fuzzley-ui` skill)
- **Build Toolchain:** [Vite](https://vitejs.dev/) + [AnalogJS Vite Angular Plugin](https://analogjs.org/)
- **Test Framework:** [Vitest](https://vitest.dev/), in Node for the rules
  and the view, and in jsdom, with Testing Library and real Phaser run
  headless, for the scene and the shell
- **Language:** TypeScript / HTML / Sass

## Layers

Four layers, each a folder under `src/` named for it, each importing only
the layers below it, as `@fz/dev`'s `phaserGameLayers()` fences them in
`eslint.config.js`: the rules, the view, the scene, which draws the field
on Phaser, and the shell, `src/app/`, whose board will load the scene with
`import()`. The scene holds nothing yet. The rules and the view hold the
contracts the game is built against: the rules' types, a module for each
part of a round, `src/rules/tuning.ts`'s numbers, the aims' headings in
`src/rules/aims.ts`, which `tools/build-aims.mjs` writes, the kinds of
brick in `src/rules/catalog/`, the warm-up's so far, the levels' legend in
`src/rules/levels/legend.ts`, `thirdsOf()` and `positionAt()`, with
`playRound()` throwing until it is written; and the view's types, frame
names and sound names.

Beyond the contracts, `src/rules/grid.ts` is the field's grid: its cells,
the box a brick stands in, how a brick meets a fuzzball, and a brick's
faces and corners named for this field (`FieldFace`, `FieldCorner`), whose
y grows up from the floor where `@fz/core/sweep`'s grows down a screen. It
is the one place that says which of `SIDE`'s bits each face is; the rest
of the code names a face by it. `src/rules/wall/lower.ts` brings the wall
down after a round, a row or a jump, sinking what the level doesn't need
at the floor and losing the level on what it does (`lowerWall()`), and
says whether a level is cleared (`isCleared()`). The view's
`src/view/colors/` holds the field's colors: the page's roles it is drawn
in (`FIELD_ROLES`), the tiles' eight inks by name (`TINT`), and
`wallPalette()`, which gives a palette's colors from those roles and its
mode's tile and fuzzball inks: every color a rule of contrast covers,
though not the shading the art mixes from them. The shell's
`src/app/settings/` holds the settings drawer: how the player aims, the
flight's speed, long flights sped up, the aim guide, sound and the palette.

| Layer | May import                                                                                                                                                  | May not import                                                                          |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| rules | `@fz/core`                                                                                                                                                  | Phaser, Angular, RxJS, any other `@fz/*`, the view, scene and shell, the specs' helpers |
| view  | the rules, `@fz/core`, `@fz/phaser/color`, `@fz/phaser/fuzzball`, `@fz/phaser/insets`, `@fz/phaser/layout`, `@fz/phaser/shapes`; `@fz/style/themes` by type | Phaser, Angular, RxJS, any other `@fz/*`, the scene and shell                           |
| scene | Phaser, `@fz/core`, `@fz/phaser`'s entries but the canvas, the view and the rules                                                                           | Angular, RxJS, the shell's libraries, the shell                                         |
| app   | Angular, every `@fz/*` library, the rules and the view; the scene and `@fz/phaser`'s host, scene helpers and sound by type                                  | Phaser, and the scene or those three entries by a value import                          |

The rules and the view, but their specs, read only what they are handed:
no clock or timer, no number drawn from no seed, no seed mixed by hand,
nothing of the page and nothing stored or fetched. The rules keep to
arithmetic every engine rounds alike besides (`exact: true`): `+`, `-`,
`*`, `/` and only the functions of `Math` whose every digit the standard
fixes, `Math.sqrt()` among them, with no `**` and no constant such as
`Math.PI`, so a certificate found in Node holds in every browser. The
specs' helpers the solver, the careless player and the scripts run are held
as the rules are, from the commit that writes each: `eslint.config.js`
lists them.

## What It Keeps

Each entry is in `localStorage`, versioned, through `@fz/ui/storage`'s
`storedSignal()`, and its reader drops what it can't trust rather than
failing:

- `brick-fuzz-pop-settings`: how the player aims, the flight's speed,
  whether long flights speed up, the aim guide and sound.

## Development Commands

Run these from `frontend/games/brick-fuzz-pop/`, or as
`yarn workspace brick-fuzz-pop <script>` from `frontend/`. The root's
`yarn lint`, `yarn typecheck`, `yarn test`, `yarn test:coverage` and
`yarn build` run this workspace's with the others'.

- **Run Development Server:** `yarn dev` (at `http://localhost:9006/`; the
  Solitaire Collection's uses 9000, Minesweeper's 9001, Sudoku's 9002,
  Snake's 9003, Brick Breaker's 9004 and Asteroid Breaker's 9005).
- **Production Build:** `yarn build`, into `dist/`; `yarn preview` serves it.
- **Write the Aims:** `yarn build:aims` (writes `src/rules/aims.ts`, each
  aim's heading as two numbers, from `tools/build-aims.mjs`;
  `src/rules/aims.spec.ts` fails while the file isn't what the script
  writes, so change the script and run it rather than edit the file).
- **Run Unit Tests:** `yarn test` (the whole suite once, without coverage),
  `yarn test:coverage` (with coverage, failing below the floors
  `vitest.config.ts` sets, then the simulations without it),
  `yarn test:watch`, or `yarn vitest run --project <project> <path>` for one
  spec, which leaves the floors alone.
- **Linting:** `yarn lint` (ESLint with `@fz/dev`'s blocks and the fences
  between the layers, then stylelint with `@fz/style`'s preset).
- **Type Checking:** `yarn typecheck` (the app, the specs, the Vite and
  Vitest configs, and the lint configs from their JSDoc).

## Tests

The repository's rules for specs apply. A spec sits beside the file it
tests, named after it. `vitest.config.ts` runs them in three projects: `pure`,
in Node, for the rules, the view, the specs' helpers and the scripts; `sim`,
in Node too and without coverage, for the specs that will replay every
level's certificates and hold the careless player to its floors; and `dom`,
in jsdom, for every other spec under `src/`, the scene's and the shell's.
`src/test-setup.ts` installs `@fz/phaser/testing`'s headless Phaser first,
so a scene's spec runs real Phaser, and stubs `document.fonts`, which jsdom
lacks. The rules and the view are held to 100% of statements, functions and
lines and 95% of branches, the scene to 98, 92, 100 and 99, and the shell to
98, 97, 97 and 98. The repository's `angular-testing` skill covers the
patterns every Angular workspace's specs share, and `phaser-core` the
harness.

What the specs share is in `src/testing/`:

- `src/testing/flight_fixtures.ts` holds rounds made by hand to build the
  view, the scene and the shell against, and `orderProblemsOf()` and
  `trackProblemsOf()`, which hold a flight to the order and the paths
  `src/rules/flight/events.ts` describes.
- `src/testing/wall_picture.ts` lays a wall out from a picture in the
  legend's characters (`wallFrom()`), as the fixtures' walls are, so a
  spec draws the wall it plays. The solver's and the careless player's
  specs will draw theirs with it too, so it is held as the rules are, to
  their fence and their exact arithmetic.
- `src/testing/roles.ts` reads the game's palettes from its global
  stylesheet (`PALETTES`), which `src/view/colors/contrast.spec.ts` holds
  the field's inks to contrast in, each of the four.
