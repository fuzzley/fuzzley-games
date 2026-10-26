# @fz/dev

The `@fz/dev` library (`frontend/lib/dev`): what every workspace shares to
check itself and script its chores, which no app's own code imports. The
repository's rules, which apply here too, are in
[.agents/AGENTS.md](../../../.agents/AGENTS.md). Paths are relative to
`frontend/lib/dev/`.

## What it holds

- `src/eslint.ts`, `@fz/dev/eslint`: the blocks a workspace's
  `eslint.config.js` is made of, each given the files it covers:
  - `typescript()`: typescript-eslint's strict and stylistic type-checked
    rules, with the repository's own on top (explicit return types on what a
    module exports, `import type` for type-only imports, `@deprecated` APIs
    an error), and the fence around every library's testing entry point,
    such as `@fz/ui/testing`. It needs the workspace's folder (`root`), whose
    `tsconfig.json` its project service starts from.
  - `angular()`: angular-eslint's rules for the TypeScript, and the prefix
    every component and directive selector carries (`fz` in a library,
    `app` in an app).
  - `templates()`: angular-eslint's rules for the templates, accessibility's
    among them.
  - `tests()`: what the specs, and the helpers only they use, may do that
    other code may not: assert with `!`, stub with an empty function, let a
    mock's type be what it builds, and import the libraries' testing helpers.
  - `scripts()`: the `.mjs` scripts' rules, which require JSDoc types on
    every parameter and returned value.
- `tsconfig/`, `@fz/dev/tsconfig/*.json`: the compiler options a
  workspace's `tsconfig.json` extends.
  - `base.json`: the strict flags every workspace's TypeScript is checked
    with. An app compiles the libraries' sources into its own program, with
    its own options, so one set for all of them is what lets a library's code
    pass in every app.
  - `angular.json`: the base, with Angular's decorators and the Angular
    compiler's strictest checks, every extended diagnostic an error. Its
    `outDir` and `rootDir` are the extending workspace's own folder
    (`${configDir}`).
  - `scripts.json`: the `.mjs` scripts, type-checked from their JSDoc.
- `src/chrome.ts`, `@fz/dev/chrome`: what a script that drives a headless
  Chrome needs. `withChrome()` starts Chrome on a throwaway profile and
  hands over a `DevToolsConnection`; `withPage()` opens a `Page` in a
  browser context of its own at a viewport, which navigates, reloads, runs
  a function in the page before or after it loads, and takes a screenshot.
  `findChrome()` picks the Chrome to run: the one asked for, `CHROME_PATH`,
  or the first installed in a usual place. The games' screenshot scripts
  are built on it.

## How a workspace uses it

- **A workspace's configs extend it, and add only what is their own.** Its
  `package.json` lists `"@fz/dev": "workspace:*"` beside `eslint` and
  `typescript`, which it runs. Its `eslint.config.js` passes the blocks to
  `defineConfig()`, then its own fences, such as Minesweeper's around its
  rules, and its `tsconfig.json` extends `@fz/dev/tsconfig/angular.json`
  (`base.json` without Angular), as `frontend/games/minesweeper/` shows. A
  rule raised here is raised everywhere at once.
- **A workspace's own import fences use
  `@typescript-eslint/no-restricted-imports`**, so that they add to the
  testing fence, which uses ESLint's own `no-restricted-imports`, rather
  than replace it.
- **A loosening stays in the workspace, with its reason.** The Solitaire
  Collection's Phaser adapter, whose types claim more than Phaser keeps, is
  one.

## Rules

- **It runs in Node as it is.** An app's ESLint config and scripts import
  these files, so relative imports name the file (`./eslint.ts`) and the
  TypeScript is only the kind Node can strip (`erasableSyntaxOnly`), as in
  `@fz/style`.
- **Nothing here reaches an app's bundle.** It holds only what checks or
  scripts a workspace; what an app runs belongs in the other libraries.

## Checks

The root's `yarn lint`, `yarn typecheck` and `yarn test` run the library's
own, which `yarn workspace @fz/dev <script>` runs alone.

- **`lint`** runs ESLint with its own blocks (`eslint.config.js`).
- **`typecheck`** runs `tsc` over the sources, the specs and the Vitest
  config.
- **`test`** runs Vitest in Node. `src/eslint.spec.ts` lints files written
  into a folder of their own with the blocks, so a block that stops catching
  what it should fails here; `src/chrome.spec.ts` drives the DevTools
  helpers against a fake browser. Starting a real Chrome is left to the
  screenshot scripts, so the coverage floor in `vitest.config.ts` sits
  under it.
