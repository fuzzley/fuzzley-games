# Shared UI work log

The running record of [the shared UI plan](shared-ui-plan.md): what is done,
what was found, and where to pick up. The newest entry is last. Delete this
file in the commit that finishes the plan; it stays in that commit's parent.

## Where things stand

- **Branch:** `shared-ui`, from `main` at `70f3d97`. Not pushed: a push to
  `main` deploys, so each shipping point waits for the user's go-ahead.
- **Phase:** 2, tokens and theme. Phase 1 scaffolded `lib/style` only;
  `lib/ui` comes with its first component, in Phase 3.
- **Next step:** move the site's palettes, base styles and Sass toolkit into
  `lib/style` with the `fz-` prefix. Drafts of the toolkit's first files
  were parked outside the repository during the spike and are easy to redo.

| Phase                             | State       |
| --------------------------------- | ----------- |
| 0. Spike                          | done        |
| 1. Scaffold the libraries         | done        |
| 2. Tokens and theme; site moves   | in progress |
| 3. Components; site moves         | to do       |
| 4. Plumbing in Solitaire          | to do       |
| 5. Solitaire follows the theme    | to do       |
| 6. Solitaire's pieces move to lib | to do       |
| 7. The game bar                   | to do       |
| 8. Retire Solitaire's token names | to do       |
| 9. Light chrome                   | to do       |
| 10. Skills, and the next consumer | to do       |

## How to check the work

From `frontend/`: `yarn verify` runs every check; on `main` before this work
it took under five minutes, with 177 site specs and 6940 Solitaire specs. On this machine, Docker is
usually off and port 4200 is taken (see the dev-environment notes in Claude's
memory); start Vite with `--port <n> --strictPort`.

## Log

### 2026-10-24: the plan agreed

- The user confirmed every decision in the plan, and added: a library may be
  split further where something fits neither `lib/style` nor `lib/ui`
  cleanly, and everything is built to be reused and extended by future games,
  for accessibility, reuse, extensibility, maintainability and testability.
- `.agents/AGENTS.md` now lets the site and the games import `lib/`, one way.
- The libraries are named `@fz/style` and `@fz/ui`, not the bare folder names.
  A scope marks an import as a library's at a glance, and keeps clear of the
  public `style` and `ui` packages on npm. `yarn.config.cjs` needs to allow it
  (Phase 1).

### 2026-10-24: the spike (Phase 0)

A throwaway `lib/ui` with one component and service, and a `lib/style` with
one mixin and the `theme.js` plugin, used by both the site and Solitaire. It
passed every check in the plan, and was removed once done. What it showed:

- **Angular components compile from source.** Analog's Vite plugin compiles a
  library component the app imports, ahead of time, in the build, the dev
  server (with hot reload) and Vitest, with no extra configuration. No
  `@angular/compiler` reaches the bundle.
- **Solitaire's `rootDir` can stay.** TypeScript reads a linked package as an
  external one, so its files don't count against the app's `rootDir`. The
  plan said it had to go; it no longer does.
- **A library's own `rootDir`** (its folder) catches a relative import that
  climbs out of it (TS6059), which keeps imports one way without an ESLint
  rule.
- **Sass needs no `pkg:`.** `@use "@fz/style" as fz;` resolves through Vite's
  own Sass importer, from the package's `exports` under the `sass`
  condition, and `url()`s are rebased. So `fuzzleyStyle()` only has
  `theme.js` to do for now.
- **`@fz/style/vite` loads in a Vite config.** (Corrected in Phase 1: Vite 8
  bundles none of a package into the config, linked or not, so Node loads the
  plugin as it is. The spike's plugin had no relative imports, which hid that
  Node needs them to name their `.ts` file.)
- **`@fz/ui` will need `@angular/router` and `postcss` as devDependencies**:
  Yarn warned about both peers during the spike.
- The plan is corrected to match.

### 2026-10-24: Phase 1, `@fz/style` scaffolded

- `frontend/lib/style` is the `@fz/style` workspace. It took the palette list
  (`themes.ts`, from the site's `provider/`) and the `theme.js` plugin (from
  the site's `tools/vite-plugins.ts`), with their specs, so it holds something
  real from the start. The plugin imports the list instead of parsing the
  site's file, and serves `theme.js` at the top of any base, which Solitaire
  will need at `/play/solitaire/`.
- Its specs run a real Vite dev server on a free port and a real build. A
  middleware called directly never reaches the plugin: Vite's own request
  checks run first.
- The site imports `@fz/style/themes` and adds `fuzzleyStyle()` to its Vite
  config.
- `yarn.config.cjs` names a library `@fz/<folder>`, and fails a library that
  depends on a workspace outside `lib/` (tried by hand: it does).
- The root's `test`, `typecheck` and `lint` include `lib/*`.
- `lib/ui` waits for Phase 3, so it is never an empty package.
