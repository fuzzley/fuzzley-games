# @fz/style

The `@fz/style` library (`frontend/lib/style`): what the site and the games
share of how they look, with no framework, so a game written without Angular
can use it too. The repository's rules, which apply here too, are in
[.agents/AGENTS.md](../../../.agents/AGENTS.md). Paths are relative to
`frontend/lib/style/`.

## What it holds

- `src/themes.ts`: the palettes a player can choose between, the default for
  each system color scheme, and the localStorage key the choice is kept under,
  which the site and every game share, being served from one origin. An app
  imports it as `@fz/style/themes`.
- `src/vite.ts`: `fuzzleyStyle()`, the Vite plugins an app adds to its config.
  It writes `theme.js` into the build, at the top of the app's own base, and
  serves it from the dev server. The page loads it first, with a plain tag
  that Vite leaves alone (`<script src="theme.js" vite-ignore></script>`, or
  `/theme.js` for the site), and it picks the palette before anything paints.
  `src/theme_script.ts` writes the script itself.

## How an app uses it

- **From source, never built.** An app lists `"@fz/style": "workspace:*"` in
  its `package.json` and imports the entries `exports` names. Vite compiles
  the files into the app's own bundle, and TypeScript checks them as a package
  the app depends on.
- **Imports go one way.** This library imports no workspace but another
  library, and only by package name. `rootDir` in `tsconfig.json` fails a
  relative import that climbs out of the library.

## Rules

- **The strictest compiler options.** `tsconfig.json` holds the site's and the
  games' strict flags together, since each app compiles these files with its
  own.
- **Relative imports name the file** (`./themes.ts`), and the TypeScript is
  only the kind Node can strip (`erasableSyntaxOnly`). Vite leaves a package
  out of the config it bundles, so Node loads `src/vite.ts`, and what it
  imports, as it is; a spec in `src/vite.spec.ts` does the same.
- **An app's needs go in the app.** A token, palette or plugin belongs here
  only when the site and the games all mean the same thing by it.

## Checks

The root's `yarn lint`, `yarn typecheck` and `yarn test` run the library's
own, which `yarn workspace @fz/style <script>` runs alone.

- **`lint`** runs ESLint (`eslint.config.js`): typescript-eslint's strict and
  stylistic type-checked rules, explicit return types on exported functions,
  and `import type` for type-only imports.
- **`typecheck`** runs `tsc` over the sources, the specs and the Vitest
  config.
- **`test`** runs Vitest in Node. Each spec sits beside the file it tests; the
  plugin's specs run a real Vite dev server and build in a temporary folder.
