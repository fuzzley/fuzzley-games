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
| `src/view/`  | the rules, `@fz/core`, `@fz/phaser/color`, `@fz/phaser/insets`                                  | Phaser, Angular, RxJS, the shell's libraries, the scene and shell   |
| `src/scene/` | Phaser, `@fz/phaser`'s entries but the canvas, the view and the rules                           | Angular, RxJS, the shell's libraries, the shell                     |
| `src/app/`   | Angular, every `@fz/*` library, the rules and the view; the scene and `@fz/phaser/host` by type | Phaser, and the scene or the host by a value import                 |

The shell loads the scene with `import()`, which the fence doesn't see, so
Phaser stays out of the first download.

## Checks

The root's `yarn lint`, `yarn typecheck` and `yarn test` run the
workspace's own, which `yarn workspace snake <script>` runs alone. Specs sit
beside the files they test, and run in jsdom; `src/test-setup.ts` installs
`@fz/phaser/testing`'s headless Phaser first, so the scene's specs run real
Phaser. `vitest.config.ts` holds the rules and the view to a floor near
100%.
